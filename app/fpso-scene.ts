import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildFPSO, OFFLOADING_POINTS } from "./fpso-model";
import { systems, type CameraView, type SceneSettings, type SystemId } from "./fpso-data";
import { buildSupplyLayer, SUPPLY_CAMERAS } from "./supply-model";
import { PRODUCTION_RISER } from "./subsea-model";
import { equipment } from "./inspection-data";
import type { SupplyCameraView, SupplySceneState } from "./supply-data";

export type SceneHandle = { inspect: (id: string | null) => void; update: (settings: SceneSettings) => void; camera: (view: CameraView) => void; focus: (id: SystemId) => void; supply: (state: SupplySceneState|null) => void; supplyCamera: (view: SupplyCameraView) => void; dispose: () => void };
type Callbacks = { inspection?: boolean; onInspect?: (id: string) => void; onSelect: (id: SystemId | null) => void; onStats: (stats: { fps: number; triangles: number }) => void };

export function createScene(container: HTMLElement, callbacks: Callbacks): SceneHandle {
  let settings: SceneSettings = { explosion: 0, night: false, playing: true, rotate: false, wireframe: false, flow: false, waves: 35, selected: null };
  let alive = true, animationId = 0, time = 0, night = 0, exploded = 0, underwater = 0;
  let view: CameraView = "perspective";
  let supplyState:SupplySceneState|null=null,supplyLayer:ReturnType<typeof buildSupplyLayer>|null=null,supplyView:SupplyCameraView="network",supplyFollow=false;
  const scene = new T.Scene();
  scene.background = new T.Color(0x123344);
  scene.fog = new T.FogExp2(0x123344, .00065);
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1.4 : 1.75));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const canvas = renderer.domElement; canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "FPSO 3D. Arraste para girar, role para aproximar e use as setas para mover a câmera. No celular, use um dedo para girar e dois para aproximar.");
  container.appendChild(canvas);
  const camera = new T.PerspectiveCamera(40,1,.3,4000);
  camera.position.set(280,190,375);
  const controls = new OrbitControls(camera,canvas);
  controls.enableDamping = true; controls.dampingFactor = .065; controls.target.set(3,15,0); controls.minDistance = 35; controls.maxDistance = 3000; controls.maxPolarAngle = Math.PI*.49; controls.autoRotateSpeed = .38; controls.rotateSpeed=.6; controls.panSpeed=.7; controls.zoomSpeed=.8; controls.listenToKeyEvents(canvas);
  const model = buildFPSO();scene.add(model.vessel);scene.add(model.parts.subsea.group);
  const inspectionPins = new T.Group(); inspectionPins.visible = Boolean(callbacks.inspection); model.vessel.add(inspectionPins);
  let inspectedId: string | null = null;
  if(callbacks.inspection) equipment.forEach((asset,index)=>{
    const pin = new T.Group(); pin.position.set(...asset.point); pin.position.y += 10; pin.userData.inspectionId=asset.id;
    const stem = new T.Mesh(new T.CylinderGeometry(.22,.22,10,8),new T.MeshBasicMaterial({color:0x8ae8d4,depthTest:false}));stem.position.y=-5;stem.renderOrder=10;pin.add(stem);
    const label=document.createElement('canvas');label.width=96;label.height=96;const ctx=label.getContext('2d');
    if(ctx){ctx.fillStyle='#0b2a34';ctx.beginPath();ctx.arc(48,48,39,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#89e8d4';ctx.lineWidth=5;ctx.stroke();ctx.font='bold 40px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#dcfff5';ctx.fillText(String(index+1).padStart(2,'0'),48,50);}
    const sprite=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(label),depthTest:false}));sprite.scale.set(13,13,1);sprite.renderOrder=12;pin.add(sprite);inspectionPins.add(pin);
  });
  const daySky=new T.Color(0x14394c),nightSky=new T.Color(0x050e20);
  const hemi = new T.HemisphereLight(0xc4e8ff,0x294354,2.2);scene.add(hemi);
  const sun = new T.DirectionalLight(0xffeccb,4.0);sun.position.set(-100,250,180);sun.castShadow=true;sun.shadow.mapSize.setScalar(window.innerWidth<700?1024:2048);sun.shadow.camera.left=-230;sun.shadow.camera.right=230;sun.shadow.camera.top=170;sun.shadow.camera.bottom=-170;sun.shadow.camera.near=1;sun.shadow.camera.far=650;sun.shadow.normalBias=.11;sun.shadow.bias=-.00012;scene.add(sun);
  const rim = new T.DirectionalLight(0x85bfe5,1.6);rim.position.set(100,70,-180);scene.add(rim);
  const workLights=new T.Group();
  for(const x of [-120,-35,80]){const light=new T.PointLight(0xffd391,0,95,2);light.position.set(x,33,0);workLights.add(light);}model.vessel.add(workLights);
  model.materials.forEach(m=>{m.userData.originalColor=m.color.clone();m.userData.originalEmissive=m.emissive.clone();m.userData.originalEmissiveIntensity=m.emissiveIntensity;});

  const oceanMaterial = new T.ShaderMaterial({
    transparent:true,depthWrite:false,side:T.DoubleSide,
    uniforms:{uTime:{value:0},uWaves:{value:.35},uNight:{value:0},uAlpha:{value:1},uSky:{value:daySky.clone()}},
    vertexShader:`
      uniform float uTime; uniform float uWaves; varying vec3 vWorld; varying vec3 vNormal; varying vec2 vXZ;
      void main(){
        vec3 p=position; float t=uTime; float a=uWaves;
        float q1=p.x*.042+p.z*.028+t*.8, q2=p.x*.081-p.z*.057+t*1.1, q3=p.x*.18+p.z*.11-t*1.45;
        p.y=a*(sin(q1)*1.6+sin(q2)*.65+sin(q3)*.2);
        float dx=a*(cos(q1)*.0672+cos(q2)*.05265+cos(q3)*.036);
        float dz=a*(cos(q1)*.0448-cos(q2)*.03705+cos(q3)*.022);
        vNormal=normalize(vec3(-dx,1.,-dz)); vWorld=(modelMatrix*vec4(p,1.)).xyz; vXZ=p.xz;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,
    fragmentShader:`
      uniform float uTime; uniform float uNight; uniform float uAlpha; uniform vec3 uSky;
      varying vec3 vWorld; varying vec3 vNormal; varying vec2 vXZ;
      void main(){
        vec3 view=normalize(cameraPosition-vWorld);
        vec3 n=normalize(vNormal+vec3(sin(vXZ.x*.9+vXZ.y*.46+uTime)*.032,0.,cos(vXZ.y*.8-vXZ.x*.52-uTime)*.032));
        float fresnel=pow(1.-max(dot(n,view),0.),3.);
        vec3 deep=mix(vec3(.025,.16,.205),vec3(.012,.036,.074),uNight);
        vec3 shallow=mix(vec3(.06,.265,.3),vec3(.015,.07,.105),uNight);
        vec3 col=mix(deep,shallow,.34+n.x*.8+n.z*.8);
        col=mix(col,uSky,fresnel*.7);
        vec3 light=normalize(vec3(-.3,.85,.5)); vec3 halfV=normalize(light+view);
        float glint=pow(max(dot(n,halfV),0.),190.);
        float wave=sin(vXZ.x*.39+vXZ.y*.24+uTime)*sin(vXZ.x*.11-vXZ.y*.41-uTime*.8);
        col+=vec3(.19,.39,.43)*glint*(1.-uNight*.65)+vec3(.015,.023,.025)*wave;
        float d=length(cameraPosition-vWorld);col=mix(col,uSky,1.-exp(-d*.0005));
        gl_FragColor=vec4(col,uAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const oceanGeometry=new T.PlaneGeometry(3200,3200,190,190);oceanGeometry.rotateX(-Math.PI/2);
  const ocean=new T.Mesh(oceanGeometry,oceanMaterial);ocean.renderOrder=1;scene.add(ocean);
  const bedMaterial=new T.MeshStandardMaterial({color:0x173c4c,roughness:1,transparent:true,opacity:0});
  const bed=new T.Mesh(new T.CircleGeometry(620,96),bedMaterial);bed.rotation.x=-Math.PI/2;bed.position.y=-220.5;bed.visible=false;scene.add(bed);
  const grid=new T.GridHelper(900,30,0x3e6d7d,0x274957);grid.position.y=-220.3;const gridMat=grid.material as T.LineBasicMaterial;gridMat.transparent=true;gridMat.opacity=0;grid.visible=false;scene.add(grid);
  let seed=42;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const starPositions:number[]=[];for(let i=0;i<260;i++){const a=random()*Math.PI*2,h=.18+random()*.8,r=1500;starPositions.push(Math.cos(a)*r,250+h*1100,Math.sin(a)*r);}
  const starGeo=new T.BufferGeometry();starGeo.setAttribute("position",new T.Float32BufferAttribute(starPositions,3));
  const starMat=new T.PointsMaterial({color:0xc4deef,size:2.7,transparent:true,opacity:0,sizeAttenuation:true,depthWrite:false,fog:false});const stars=new T.Points(starGeo,starMat);scene.add(stars);

  const selectionBox = new T.Box3Helper(new T.Box3(),0x84e4d0);selectionBox.visible=false;(selectionBox.material as T.LineBasicMaterial).transparent=true;(selectionBox.material as T.LineBasicMaterial).opacity=.35;scene.add(selectionBox);
  const flowRoot=new T.Group();scene.add(flowRoot);flowRoot.visible=false;
  type Flow = { curve:T.CatmullRomCurve3; line:T.Line<T.BufferGeometry,T.LineBasicMaterial>; particles:T.InstancedMesh; mode:number; count:number };
  const flows:Flow[]=[];const flowBall=new T.SphereGeometry(.95,8,6);
  for(const [i,color]of [0x66edc4,0xffc859,0x68d5ee,0xf1a455].entries()){
    const curve=new T.CatmullRomCurve3([new T.Vector3(),new T.Vector3(1,1,1),new T.Vector3(2,2,2),new T.Vector3(3,3,3)]);
    const geo=new T.BufferGeometry();geo.setAttribute("position",new T.BufferAttribute(new Float32Array(65*3),3));
    const line=new T.Line(geo,new T.LineBasicMaterial({color,transparent:true,opacity:.75,depthTest:false}));line.renderOrder=3;flowRoot.add(line);
    const particles=new T.InstancedMesh(flowBall,new T.MeshBasicMaterial({color,depthTest:false}),14);particles.renderOrder=4;particles.frustumCulled=false;flowRoot.add(particles);flows.push({curve,line,particles,mode:i,count:14});
  }
  const matrix=new T.Matrix4();
  function point(id:SystemId,p:[number,number,number]){return model.parts[id].group.localToWorld(new T.Vector3(...p));}
  function updateFlow(){
    model.vessel.updateMatrixWorld(true);
    const curves=[
      [...[...PRODUCTION_RISER].reverse().map(p=>point("subsea",p)),point("process",[-31,23,0]),point("process",[25,23,0])],
      [point("process",[25,22,0]),point("process",[44,25,7]),point("hull",[0,23,14]),point("hull",[2,15,0])],
      [point("process",[-20,21,0]),point("gas",[-28,29,1]),point("gas",[35,32,0]),point("hull",[106,26,-1]),point("flare",[47,53,0])],
      OFFLOADING_POINTS.map(p=>point("offloading",p))
    ];
    for(const f of flows){f.curve.points=curves[f.mode];const attr=f.line.geometry.getAttribute("position") as T.BufferAttribute;for(let i=0;i<=64;i++){const p=f.curve.getPoint(i/64);attr.setXYZ(i,p.x,p.y,p.z);}attr.needsUpdate=true;f.line.geometry.computeBoundingSphere();for(let i=0;i<f.count;i++){const p=f.curve.getPoint((time*.065+i/f.count)%1);matrix.makeTranslation(p.x,p.y,p.z);f.particles.setMatrixAt(i,matrix);}f.particles.instanceMatrix.needsUpdate=true;}
  }

  const desiredPosition=camera.position.clone(),desiredTarget=controls.target.clone();let transitioning=false;
  function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.clearViewOffset();if(!supplyState&&!callbacks.inspection){if(w>900)camera.setViewOffset(w,h,-w*.105,-h*.025,w,h);else camera.setViewOffset(w,h,0,-h*.07,w,h);}camera.updateProjectionMatrix();if(supplyState)goSupply(supplyView);else if(inspectedId)inspect(inspectedId);else go(view);}
  function supplyTarget(next:SupplyCameraView){
    const framing=Math.max(1,(next==="network"?1.55:1.2)/camera.aspect);
    if(supplyLayer&&(next==="air"||next==="sea")){
      desiredTarget.copy(next==="air"?supplyLayer.helicopter.position:supplyLayer.boat.position).add(new T.Vector3(0,next==="air"?3:10,0));
      desiredPosition.copy(desiredTarget).add(new T.Vector3(...(next==="air"?[57,35,65]:[110,90,160]) as [number,number,number]).multiplyScalar(framing));
    }else{const preset=SUPPLY_CAMERAS[next];desiredTarget.set(...preset.target);desiredPosition.set(...preset.eye).sub(desiredTarget).multiplyScalar(framing).add(desiredTarget);}
  }
  function goSupply(next:SupplyCameraView){supplyView=next;supplyFollow=next==="air"||next==="sea";supplyTarget(next);transitioning=true;}
  function supply(next:SupplySceneState|null){
    const changed=Boolean(supplyState)!==Boolean(next);supplyState=next;
    if(next&&!supplyLayer){supplyLayer=buildSupplyLayer();scene.add(supplyLayer.root);}
    if(supplyLayer){supplyLayer.root.visible=Boolean(next);if(next)supplyLayer.update({...next,hours:next.readHours?.()??next.hours},time);}
    model.parts.offloading.group.visible=!next;model.parts.subsea.group.visible=!next;
    if(next){selectionBox.visible=false;flowRoot.visible=false;controls.autoRotate=false;}
    if(changed)resize();
  }
  function go(next:CameraView){
    view=next;const e=settings.explosion/100;const framing=container.clientWidth<=900?Math.max(1.15,1.1/(container.clientWidth/container.clientHeight)):1;
    const positions:Record<CameraView,[number,number,number]>={perspective:[280,190+e*100,375+e*150],deck:[0,475+e*120,28],side:[45,48+e*70,430+e*80],subsea:[640,300,790],offloading:[-70,500,1050]};
    const targets:Record<CameraView,[number,number,number]>={perspective:[3,15+e*22,0],deck:[0,8+e*25,0],side:[0,14+e*25,0],subsea:[0,-100,85],offloading:[-206,13,-15]};
    desiredPosition.set(...positions[next]);desiredTarget.set(...targets[next]);
    desiredPosition.sub(desiredTarget).multiplyScalar(framing).add(desiredTarget);
    transitioning=true;
  }
  function inspect(id:string|null){
    inspectedId=id;const asset=equipment.find(e=>e.id===id);
    inspectionPins.children.forEach(pin=>{const selected=pin.userData.inspectionId===id;const sprite=pin.children.find(c=>c instanceof T.Sprite) as T.Sprite|undefined;if(sprite){sprite.material.color.set(selected?0xffca7c:0xffffff);sprite.scale.setScalar(selected?17:13);}});
    if(!asset){go('perspective');return;}
    desiredTarget.set(...asset.point);desiredPosition.copy(desiredTarget).add(new T.Vector3(70,55,100).multiplyScalar(Math.max(1,1/camera.aspect)));transitioning=true;
  }
  function focus(id:SystemId){
    if(id==="offloading"){go("offloading");return;}
    model.vessel.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model.parts[id].group);const center=box.getCenter(new T.Vector3());const size=box.getSize(new T.Vector3());
    desiredTarget.copy(center);const distance=Math.max(size.x,size.y,size.z)*1.55+55;desiredPosition.copy(center).add(new T.Vector3(.55,.7,1).normalize().multiplyScalar(distance*(container.clientWidth<=900?Math.max(1.15,1.1/(container.clientWidth/container.clientHeight)):1)));view=id==="subsea"?"subsea":"perspective";transitioning=true;
  }
  const cancelTransition=()=>{transitioning=false;supplyFollow=false;};controls.addEventListener("start",cancelTransition);
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);resize();go("perspective");camera.position.copy(desiredPosition);controls.target.copy(desiredTarget);transitioning=false;
  const raycaster=new T.Raycaster(),pointer=new T.Vector2(),down=new T.Vector2();let pressed=false;
  function pointerDown(event:PointerEvent){pressed=event.isPrimary&&event.button===0;down.set(event.clientX,event.clientY);}
  function pointerUp(event:PointerEvent){if(!pressed||!event.isPrimary)return;pressed=false;if(supplyState||down.distanceTo(new T.Vector2(event.clientX,event.clientY))>5)return;const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);if(callbacks.inspection){const pins=raycaster.intersectObject(inspectionPins,true);if(pins.length){let p:T.Object3D|null=pins[0].object;while(p&&!p.userData.inspectionId)p=p.parent;if(p?.userData.inspectionId){callbacks.onInspect?.(p.userData.inspectionId);return;}}}const hits=raycaster.intersectObjects([model.vessel,...(view==="subsea"?[model.parts.subsea.group]:[])],true);if(hits.length){let object:T.Object3D|null=hits[0].object;while(object&&!object.userData.system)object=object.parent;const id=object?.userData.system as SystemId|undefined;if(id)callbacks.onSelect(settings.selected===id?null:id);}else callbacks.onSelect(null);}
  function pointerCancel(){pressed=false;}
  canvas.addEventListener("pointerdown",pointerDown);canvas.addEventListener("pointerup",pointerUp);canvas.addEventListener("pointercancel",pointerCancel);

  function update(next:SceneSettings){
    const selectedChanged=next.selected!==settings.selected,wireChanged=next.wireframe!==settings.wireframe,expandChanged=next.explosion!==settings.explosion;
    settings={...next};controls.autoRotate=settings.rotate&&settings.playing&&!supplyState;flowRoot.visible=settings.flow&&!supplyState;
    if(selectedChanged||wireChanged){
      for(const [id,part]of Object.entries(model.parts))part.group.traverse(o=>{if(!(o instanceof T.Mesh))return;const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms)if(m instanceof T.MeshStandardMaterial){m.wireframe=settings.wireframe;const active=settings.selected===id;const original=m.userData.originalColor as T.Color|undefined;if(original)m.color.copy(original).multiplyScalar(settings.selected && !active ? .68 : 1);if(!model.lamps.includes(m)){m.emissive.copy(active?new T.Color(systems.find(s=>s.id===id)!.color):new T.Color(0));m.emissiveIntensity=active ? .24 : 0;}}});
      selectionBox.visible=Boolean(settings.selected)&&settings.selected!=="subsea"&&settings.selected!=="offloading";
      if(settings.selected)(selectionBox.material as T.LineBasicMaterial).color.set(systems.find(s=>s.id===settings.selected)!.color);
    }
    if(expandChanged&&view!=="subsea")go(view);
  }
  let last=performance.now(),lastStats=last,frames=0;
  function frame(now:number){
    if(!alive)return;animationId=requestAnimationFrame(frame);
    if(document.visibilityState==="hidden"){last=now;lastStats=now;frames=0;return;}
    const dt=Math.min((now-last)/1000,.05);last=now;
    if(settings.playing)time+=dt;
    const smooth=1-Math.exp(-dt*5),cameraSmooth=1-Math.exp(-dt*3.4);
    exploded=T.MathUtils.lerp(exploded,settings.explosion/100,smooth);night=T.MathUtils.lerp(night,settings.night?1:0,smooth);underwater=T.MathUtils.lerp(underwater,view==="subsea"?1:0,smooth);
    for(const p of Object.values(model.parts))p.group.position.copy(p.base).addScaledVector(p.offset,exploded);
    model.vessel.position.y=supplyState?0:Math.sin(time*.5)*.35*settings.waves/100;model.vessel.rotation.z=supplyState?0:Math.sin(time*.37)*.004*settings.waves/100;model.vessel.rotation.x=supplyState?0:Math.cos(time*.3)*.006*settings.waves/100;
    if(supplyState&&supplyLayer){supplyLayer.update({...supplyState,hours:supplyState.readHours?.()??supplyState.hours},time);if(supplyFollow){supplyTarget(supplyView);transitioning=true;}}
    for(let i=0;i<model.cranes.length;i++)model.cranes[i].rotation.y=model.cranes[i].userData.rest+Math.sin(time*.18+i)*.14;
    model.flame.material.uniforms.uTime.value=time;model.flame.scale.set(1+Math.sin(time*9)*.12,1+Math.sin(time*12)*.15,1+Math.cos(time*10)*.12);
    for(const mat of model.lamps)mat.emissiveIntensity=.25+night*2.5;
    workLights.children.forEach(l=>{(l as T.PointLight).intensity=night*140;});
    hemi.intensity=2.2-night*1.5;sun.intensity=4-night*3.65;rim.intensity=1.6-night*.4;
    const sky=(scene.background as T.Color).copy(daySky).lerp(nightSky,night);(scene.fog as T.FogExp2).color.copy(sky);
    oceanMaterial.uniforms.uTime.value=time;oceanMaterial.uniforms.uWaves.value=settings.waves/100;oceanMaterial.uniforms.uNight.value=night;oceanMaterial.uniforms.uAlpha.value=1-underwater*.86;oceanMaterial.uniforms.uSky.value.copy(sky);
    starMat.opacity=night*.75;bed.visible=grid.visible=underwater>.01;bedMaterial.opacity=underwater;gridMat.opacity=underwater*.38;
    if(selectionBox.visible&&settings.selected){model.vessel.updateMatrixWorld(true);selectionBox.box.setFromObject(model.parts[settings.selected].group);selectionBox.updateMatrixWorld(true);}
    if(settings.flow&&!supplyState)updateFlow();
    if(transitioning){camera.position.lerp(desiredPosition,cameraSmooth);controls.target.lerp(desiredTarget,cameraSmooth);if(camera.position.distanceToSquared(desiredPosition)<.05&&controls.target.distanceToSquared(desiredTarget)<.05)transitioning=false;}
    controls.update(dt);renderer.render(scene,camera);frames++;
    if(now-lastStats>1100){callbacks.onStats({fps:Math.round(frames*1000/(now-lastStats)),triangles:renderer.info.render.triangles});lastStats=now;frames=0;}
  }
  animationId=requestAnimationFrame(frame);
  return {inspect,update,camera:go,focus,supply,supplyCamera:goSupply,dispose(){alive=false;cancelAnimationFrame(animationId);resizeObserver.disconnect();controls.removeEventListener("start",cancelTransition);controls.dispose();canvas.removeEventListener("pointerdown",pointerDown);canvas.removeEventListener("pointerup",pointerUp);canvas.removeEventListener("pointercancel",pointerCancel);const geos=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();scene.traverse(o=>{if(o instanceof T.Sprite){materials.add(o.material);if(o.material.map)textures.add(o.material.map);}if(o instanceof T.Mesh||o instanceof T.Line||o instanceof T.Points){geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);}}});geos.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();}};
}
