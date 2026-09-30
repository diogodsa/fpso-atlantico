import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildFPSO } from './fpso-model';
import { buildSubseaField } from './subsea-model';
import { SubseaSoftwareRenderer } from './subsea-software-renderer';
import { defaultSubseaState, subseaAssets, subseaViews, FLOOR_Y as F, type SubseaState, type SubseaView } from './subsea-data';

export type SubseaHandle={update:(state:SubseaState)=>void;focus:(id:string)=>void;view:(view:SubseaView)=>void;dispose:()=>void};
type Callbacks={onSelect:(id:string)=>void;onReady:(compatible:boolean)=>void;onStats:(fps:number)=>void};
export function createSubseaScene(container:HTMLElement,callbacks:Callbacks):SubseaHandle{
 let state:SubseaState={...defaultSubseaState,visible:{...defaultSubseaState.visible}};
 const scene=new T.Scene();scene.background=new T.Color(0x092331);scene.fog=new T.FogExp2(0x092331,.00046);
 let gpu:T.WebGLRenderer|null=null;let renderer:T.WebGLRenderer|SubseaSoftwareRenderer;
 // Probe on a separate canvas so a context failure never poisons the 2D fallback.
 const probe=document.createElement('canvas');const context=probe.getContext('webgl2',{antialias:true});
 if(context){gpu=new T.WebGLRenderer({canvas:probe,context,antialias:true,powerPreference:'high-performance'});gpu.setPixelRatio(Math.min(devicePixelRatio,1.65));gpu.outputColorSpace=T.SRGBColorSpace;gpu.toneMapping=T.ACESFilmicToneMapping;gpu.toneMappingExposure=1.3;renderer=gpu;}else renderer=new SubseaSoftwareRenderer();
 const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Campo submarino 3D. Arraste para orbitar, use a roda ou dois dedos para aproximar. Selecione equipamentos na cena ou na lista.');container.appendChild(canvas);
 const camera=new T.PerspectiveCamera(43,1,.5,4000);const first=subseaViews[0];camera.position.set(...first.eye);
 const controls=new OrbitControls(camera,canvas);controls.target.set(...first.target);controls.enableDamping=true;controls.dampingFactor=.1;controls.minDistance=18;controls.maxDistance=1900;controls.maxPolarAngle=Math.PI*.93;controls.autoRotateSpeed=.28;controls.listenToKeyEvents(canvas);
 scene.add(new T.HemisphereLight(0xb8e5f2,0x304543,2.9));for(const [color,intensity,pos] of [[0xffe5b3,3,[-160,190,280]],[0x65ceec,2,[230,-110,-140]]] as [number,number,number[]][]){const light=new T.DirectionalLight(color,intensity);light.position.set(...pos as [number,number,number]);scene.add(light);}
 const field=buildSubseaField();scene.add(field.root);
 let surface:T.Group;let vessel:ReturnType<typeof buildFPSO>|null=null;
 if(gpu){vessel=buildFPSO({subsea:false});surface=vessel.vessel;vessel.parts.offloading.group.visible=false;scene.add(surface);}else{
  // A lighter topside context leaves the CPU budget for the full subsea assembly.
  surface=new T.Group();scene.add(surface);const add=(p:number[],s:number[],c:number)=>{const m=new T.Mesh(new T.BoxGeometry(...s as [number,number,number]),new T.MeshStandardMaterial({color:c}));m.position.set(...p as [number,number,number]);surface.add(m);return m;};
  add([0,-4,0],[315,23,60],0x334a52);add([0,9,0],[313,2,58],0x7a9a9e);for(let x=-75;x<120;x+=35){add([x,22,0],[28,23,48],0x7e9aa4);for(const z of [-23,23])add([x,34,z],[30,1,1],0xe9ba54);for(const z of [-16,16])add([x,37,z],[9,6,10],0xc3cfc8);}
  add([-123,29,0],[38,38,47],0xd2e3e1);for(let y=18;y<50;y+=7)for(const z of [-24,24])add([-123,y,z],[34,1.5,.6],0x376177);add([-148,42,0],[40,1,48],0x4c9c83);const tower=add([144,55,0],[3,88,3],0xebbb58);tower.rotation.z=-.3;
 }
 const water=new T.Mesh(new T.PlaneGeometry(1250,1050,16,16),new T.MeshBasicMaterial({color:0x2b7181,transparent:true,opacity:.075,depthWrite:false,side:T.DoubleSide}));water.rotateX(-Math.PI/2);water.userData.skipSoftware=true;scene.add(water);
 // The opening in the seabed exposes the didactic completion without moving the well.
 const shape=new T.Shape();shape.moveTo(-570,-465);shape.lineTo(570,-465);shape.lineTo(570,465);shape.lineTo(-570,465);shape.closePath();const hole=new T.Path();hole.absarc(-145,-245,20,0,Math.PI*2,true);shape.holes.push(hole);
 const groundMat=new T.MeshStandardMaterial({color:0x345456,roughness:1,metalness:0,side:T.DoubleSide});const ground=new T.Mesh(new T.ShapeGeometry(shape,48),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=F-.25;ground.userData.softwareBackground=true;scene.add(ground);
 const plug=new T.Mesh(new T.CylinderGeometry(20,20,.45,48),groundMat);plug.position.set(-145,F-.6,245);plug.userData.softwareBackground=true;scene.add(plug);
 const strata=new T.Group();scene.add(strata);for(let i=0;i<4;i++){const m=new T.Mesh(new T.CylinderGeometry(20,20,26,32,1,true,Math.PI*.73,Math.PI*1.3),new T.MeshStandardMaterial({color:[0x655f51,0x4a5f5c,0x616652,0x405351][i],side:T.DoubleSide}));m.position.set(-145,F-13-i*26,245);strata.add(m);}
 const grid=new T.GridHelper(1100,44,0x537c80,0x41676b);grid.position.y=F+.06;(grid.material as T.Material).transparent=true;(grid.material as T.Material).opacity=.25;scene.add(grid);
 const halo=new T.Mesh(new T.TorusGeometry(1,.027,5,60),new T.MeshBasicMaterial({color:0x88e2d4,transparent:true,opacity:.75}));halo.rotateX(Math.PI/2);halo.userData.skipSoftware=true;scene.add(halo);
 const labels=document.createElement('div');labels.className='subsea-labels';labels.setAttribute('aria-hidden','true');container.appendChild(labels);
 const labelIds=['anm-p01','anm-p02','anm-p03','anm-p04','anm-i01','anm-i02','man-prod','man-inj','suta','sdu','anchor','rov'];
 const labelNodes=labelIds.map(id=>{const asset=subseaAssets.find(a=>a.id===id)!;const el=document.createElement('span');el.className='subsea-pin';el.textContent=asset.tag;labels.appendChild(el);return {asset,el};});
 const selectedLabel=document.createElement('span');selectedLabel.className='subsea-pin subsea-pin-selected';labels.appendChild(selectedLabel);
 let desiredEye=camera.position.clone(),desiredTarget=controls.target.clone(),transition=false,alive=true,raf=0,last=performance.now(),lastRender=0,time=0,frames=0,statsAt=last;
 const stopTransition=()=>{transition=false;};controls.addEventListener('start',stopTransition);
 let width=1,height=1;const resize=()=>{width=container.clientWidth;height=container.clientHeight;camera.aspect=width/Math.max(height,1);camera.updateProjectionMatrix();renderer.setSize(width,height);};const observer=new ResizeObserver(resize);observer.observe(container);resize();
 function go(view:SubseaView){const def=subseaViews.find(x=>x.id===view)!;desiredTarget.set(...def.target);desiredEye.set(...def.eye);if(view==='field'||view==='anchors')desiredEye.sub(desiredTarget).multiplyScalar(Math.max(1.18,1.18/camera.aspect)).add(desiredTarget);transition=true;}
 function focus(id:string){const asset=subseaAssets.find(x=>x.id===id);if(!asset)return;desiredTarget.set(...asset.position);const direction=new T.Vector3(.9,.52,asset.view==='trees'?-1:1).normalize();desiredEye.copy(desiredTarget).addScaledVector(direction,asset.distance);transition=true;}
 function update(next:SubseaState){state=next;surface.visible=next.surface;water.visible=next.surface;groundMat.transparent=next.foundations;groundMat.opacity=next.foundations?.12:1;groundMat.depthWrite=!next.foundations;plug.visible=!next.visible.well;strata.visible=next.visible.well;controls.autoRotate=next.rotate&&next.playing;
  if(!gpu)for(const [id,g] of field.groups)if(id==='anchor'||id.startsWith('anchor-'))g.traverse(o=>{if(o instanceof T.Mesh)o.userData.softwareClipY=next.foundations?undefined:F;});
 }
 const pointer=new T.Vector2(),ray=new T.Raycaster();let down:[number,number]|null=null;
 const onDown=(e:PointerEvent)=>{down=[e.clientX,e.clientY];};const onUp=(e:PointerEvent)=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5){down=null;return;}down=null;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);for(const hit of ray.intersectObjects(field.root.children,true)){let visible=true;for(let p:T.Object3D|null=hit.object;p;p=p.parent)if(!p.visible)visible=false;if(!visible)continue;const id=field.findAsset(hit.object);if(id){callbacks.onSelect(id);break;}}};const onCancel=()=>{down=null;};canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onCancel);
 const proj=new T.Vector3();
 function place(el:HTMLElement,p:readonly number[],show:boolean){proj.set(p[0],p[1]+10,p[2]).project(camera);const x=(proj.x*.5+.5)*width,y=(-proj.y*.5+.5)*height;el.style.display=show&&proj.z>-1&&proj.z<1&&x>40&&x<width-40&&y>20&&y<height-20?'block':'none';el.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;}
 function frame(now:number){if(!alive)return;raf=requestAnimationFrame(frame);const dt=Math.max(0,Math.min((now-last)/1000,.1));last=now;if(state.playing)time+=dt;if(transition&&!gpu){camera.position.copy(desiredEye);controls.target.copy(desiredTarget);transition=false;}if(transition){camera.position.lerp(desiredEye,.09);controls.target.lerp(desiredTarget,.09);if(camera.position.distanceTo(desiredEye)<.08&&controls.target.distanceTo(desiredTarget)<.08)transition=false;}controls.update(dt);
  if(!gpu&&now-lastRender<110)return;lastRender=now;
  field.update(state,time);if(vessel)vessel.flame.material.uniforms.uTime.value=time;
  const asset=subseaAssets.find(x=>x.id===state.selected);if(asset){halo.visible=state.visible[asset.layer];halo.position.set(asset.position[0],asset.position[1]-7,asset.position[2]);halo.scale.setScalar(Math.min(34,Math.max(8,asset.distance*.2)));selectedLabel.textContent=asset.tag;place(selectedLabel,asset.position,state.labels&&state.visible[asset.layer]);}
  for(const {asset:a,el}of labelNodes){el.style.setProperty('--pin-color',a.layer==='injection'?'#8dd2f6':a.layer==='control'?'#c6b8f5':a.layer==='mooring'?'#bdcfd2':'#e7c889');place(el,a.position,state.labels&&a.id!==state.selected&&state.visible[a.layer]&&camera.position.distanceTo(new T.Vector3(...a.position))<1050);}
  renderer.render(scene,camera);frames++;if(now-statsAt>1500){callbacks.onStats(Math.round(frames*1000/(now-statsAt)));frames=0;statsAt=now;}
 }
 update(state);go('field');camera.position.copy(desiredEye);controls.target.copy(desiredTarget);transition=false;raf=requestAnimationFrame(frame);callbacks.onReady(!gpu);
 return {update,focus,view:go,dispose(){alive=false;cancelAnimationFrame(raf);observer.disconnect();controls.removeEventListener('start',stopTransition);controls.dispose();canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointerup',onUp);canvas.removeEventListener('pointercancel',onCancel);const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();if(gpu)gpu.forceContextLoss();canvas.remove();labels.remove();}};
}
