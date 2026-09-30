import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SubseaSoftwareRenderer } from './subsea-software-renderer';
import { buildMultiscaleModel, pumpWorld } from './multiscale-model';
import { components, defaultMultiscaleState, formatScale, levelIndex, levels, SYSTEM_ORIGIN, type ComponentId, type MultiscaleState, type ScaleLevel, type V3 } from './multiscale-data';
export type MultiscaleHandle={update:(s:MultiscaleState)=>void;reset:()=>void;dispose:()=>void};
type Callbacks={onPick:(level:ScaleLevel,component?:ComponentId)=>void;onReady:(cpu:boolean)=>void;onScale:(label:string,width:number)=>void};
export function createMultiscaleScene(container:HTMLElement,callbacks:Callbacks):MultiscaleHandle{
 let state={...defaultMultiscaleState};const scene=new T.Scene();scene.background=new T.Color(0x092331);
 const model=buildMultiscaleModel();model.update(state);scene.add(model.root);
 const probe=document.createElement('canvas');let gpu:T.WebGLRenderer|null=null;let renderer:T.WebGLRenderer|SubseaSoftwareRenderer;
 try{const context=probe.getContext('webgl2',{antialias:true});if(context){gpu=new T.WebGLRenderer({canvas:probe,context,antialias:true,powerPreference:'high-performance'});gpu.setPixelRatio(Math.min(window.devicePixelRatio,1.6));gpu.toneMapping=T.ACESFilmicToneMapping;gpu.toneMappingExposure=1.2;gpu.outputColorSpace=T.SRGBColorSpace;}}catch{gpu=null;}
 renderer=gpu??new SubseaSoftwareRenderer();const canvas=renderer.domElement;container.appendChild(canvas);canvas.tabIndex=0;canvas.setAttribute('aria-label','Cena 3D multiescala. Arraste para girar, use a roda ou dois dedos para aproximar. Os níveis e componentes também podem ser escolhidos pelos botões.');
 const camera=new T.PerspectiveCamera(42,1,.05,16000);const direction=new T.Vector3(.92,.59,1.12).normalize();camera.position.copy(model.target(state)).addScaledVector(direction,1550);
 const controls=new OrbitControls(camera,canvas);controls.target.copy(model.target(state));controls.enableDamping=true;controls.dampingFactor=.14;controls.screenSpacePanning=true;controls.maxPolarAngle=Math.PI*.94;controls.listenToKeyEvents(canvas);
 scene.add(new T.HemisphereLight(0xd0ecf6,0x4b686e,2.6));for(const [color,intensity,p]of [[0xfff0d6,3.0,[-200,500,350]],[0x8ad9ef,2.0,[300,150,-280]]] as [number,number,V3][]){const l=new T.DirectionalLight(color,intensity);l.position.set(...p);scene.add(l);}
 const seabed=new T.Mesh(new T.PlaneGeometry(1200,1080,8,8),new T.MeshStandardMaterial({color:0x254551,roughness:1,side:T.DoubleSide}));seabed.rotation.x=-Math.PI/2;seabed.position.y=-220.5;seabed.userData.softwareBackground=true;scene.add(seabed);
 const water=new T.Mesh(new T.PlaneGeometry(1160,1050,6,6),new T.MeshBasicMaterial({color:0x4c98a5,transparent:true,opacity:.08,depthWrite:false,side:T.DoubleSide}));water.rotation.x=-Math.PI/2;water.userData.skipSoftware=true;scene.add(water);
 const grid=new T.GridHelper(1100,44,0x466e7c,0x2b4b59);grid.position.y=-220.3;(grid.material as T.Material).transparent=true;(grid.material as T.Material).opacity=.4;scene.add(grid);
 const highlight=new T.Box3Helper(new T.Box3(new T.Vector3(-14,-.1,-11),new T.Vector3(14,7,11)),0xa5e6cf);highlight.position.set(...SYSTEM_ORIGIN);scene.add(highlight);
 const overlay=document.createElement('div');overlay.className='ms-labels';container.appendChild(overlay);
 const labels:{el:HTMLButtonElement;position:()=>T.Vector3;level:ScaleLevel;component?:ComponentId}[]=[];
 function addLabel(text:string,position:()=>T.Vector3,level:ScaleLevel,component?:ComponentId){const el=document.createElement('button');el.type='button';el.className='ms-pin';el.textContent=text;el.addEventListener('click',()=>callbacks.onPick(level,component));overlay.appendChild(el);labels.push({el,position,level,component});}
 function makeLabels(){for(const l of labels)l.el.remove();labels.length=0;
  if(state.level==='campo')addLabel('FPSO ATLÂNTICO',()=>new T.Vector3(0,60,0),'fpso');
  else if(state.level==='fpso')addLabel('SI-4100 · INJEÇÃO DE ÁGUA',()=>new T.Vector3(...SYSTEM_ORIGIN).add(new T.Vector3(0,9,0)),'sistema');
  else if(state.level==='sistema')addLabel('P-4101A · EXPLORAR',()=>pumpWorld.clone().add(new T.Vector3(-1,4,0)),'equipamento');
  else if(state.level==='equipamento')for(const id of ['motor','bearing-de','impellers','bearing-nde'] as ComponentId[]){const c=components.find(c=>c.id===id)!;addLabel(id==='bearing-de'?'MANCAL · DE':id==='bearing-nde'?'MANCAL · NDE':id==='impellers'?'ESTÁGIOS':'MOTOR',()=>{const g=model.parts.get(id);const p=pumpWorld.clone().add(new T.Vector3(...c.center));if(g&&id.startsWith('bearing'))p.copy(g.getWorldPosition(new T.Vector3()));p.y+=id==='motor'?1:.65;return p;},'componente',id);}
  else if(state.level==='componente'&&state.component==='bearing-de')addLabel('ACC-4101A-DE · SENSOR',()=>model.sensor!.localToWorld(new T.Vector3(0,.077,0)),'sensor');
 }
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const savedViews=new Map<string,{eye:T.Vector3;target:T.Vector3}>();
 let width=1,height=1,alive=true,raf=0,last=performance.now(),time=0,lastRender=0,lastScale='',dirty=true;
 let transition:null|{started:number;duration:number;fromTarget:T.Vector3;toTarget:T.Vector3;fromDistance:number;toDistance:number;fromDir:T.Vector3;toDir:T.Vector3;fromIndex:number}=null;
 const key=()=>`${state.level}:${state.level==='componente'?state.component:''}`;
 function distance(){const i=levelIndex(state.level);const base=[1550,490,63,21,components.find(c=>c.id===state.component)!.distance,.18][i];return base*Math.max(1,.95/Math.max(.4,camera.aspect))*(state.explosion>0?1.3:1);}
 function go(reset=false,fromIndex=levelIndex(state.level)){
  const target=model.target(state),saved=reset?null:savedViews.get(key());const toTarget=saved?.target.clone()??target;
  const fromDir=camera.position.clone().sub(controls.target).normalize(),toDir=saved?saved.eye.clone().sub(saved.target).normalize():direction.clone();
  const toDistance=saved?saved.eye.distanceTo(saved.target):distance();
  transition={started:performance.now(),duration:reduced?0:1250,fromTarget:controls.target.clone(),toTarget,fromDistance:Math.max(.03,camera.position.distanceTo(controls.target)),toDistance,fromDir,toDir,fromIndex};
  controls.minDistance=.00004;controls.maxDistance=16000;dirty=true;
 }
 function update(next:MultiscaleState){const oldIndex=levelIndex(state.level),changed=next.level!==state.level||next.component!==state.component;
  if(changed){savedViews.set(key(),{eye:camera.position.clone(),target:controls.target.clone()});state={...next};model.update(state,time,oldIndex);makeLabels();go(false,oldIndex);}else{const wasExploded=state.explosion>0;state={...next};model.update(state,time,transition?.fromIndex);if(wasExploded!==(next.explosion>0))go(true);dirty=true;}
 }
 const onControls=()=>{transition=null;dirty=true;};controls.addEventListener('start',onControls);controls.addEventListener('change',()=>{dirty=true;});
 const resize=()=>{width=Math.max(1,container.clientWidth);height=Math.max(1,container.clientHeight);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);dirty=true;};const observer=new ResizeObserver(resize);observer.observe(container);resize();
 const pointer=new T.Vector2(),raycaster=new T.Raycaster();let down:[number,number]|null=null;
 const onDown=(e:PointerEvent)=>{down=[e.clientX,e.clientY];};
 const onUp=(e:PointerEvent)=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6){down=null;return;}down=null;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  for(const hit of raycaster.intersectObjects(model.root.children,true)){let visible=true;for(let p:T.Object3D|null=hit.object;p;p=p.parent)if(!p.visible)visible=false;if(!visible)continue;const id=model.pick(hit.object);if(state.level==='campo'&&id==='fpso'){callbacks.onPick('fpso');break;}if(state.level==='fpso'&&id==='sistema'){callbacks.onPick('sistema');break;}if(state.level==='sistema'&&(id==='equipamento'||components.some(c=>c.id===id))){callbacks.onPick('equipamento');break;}if(state.level==='equipamento'&&components.some(c=>c.id===id)){callbacks.onPick('componente',id as ComponentId);break;}if(state.level==='componente'&&id==='sensor'){callbacks.onPick('sensor');break;}}
 };
 const onCancel=()=>{down=null;};canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onCancel);
 function positionLabels(){const projection=new T.Vector3();for(const l of labels){projection.copy(l.position()).project(camera);const x=(projection.x*.5+.5)*width,y=(-projection.y*.5+.5)*height;const show=state.labels&&!(width<580&&state.level==='equipamento'&&l.component!=='bearing-de')&&!transition&&projection.z>-1&&projection.z<1&&x>70&&x<width-70&&y>(width<580?165:115)&&y<height-75;l.el.hidden=!show;l.el.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;}}
 function frame(now:number){if(!alive)return;raf=requestAnimationFrame(frame);const dt=Math.max(0,Math.min((now-last)/1000,.1));last=now;if(state.playing&&!reduced){time+=dt;dirty=true;}
  if(transition){const p=transition.duration?Math.min(1,(now-transition.started)/transition.duration):1,e=p*p*(3-2*p);controls.target.copy(transition.fromTarget).lerp(transition.toTarget,e);const d=Math.exp(T.MathUtils.lerp(Math.log(transition.fromDistance),Math.log(transition.toDistance),e));const dir=transition.fromDir.clone().lerp(transition.toDir,e).normalize();camera.position.copy(controls.target).addScaledVector(dir,d);if(p===1){controls.minDistance=transition.toDistance*.32;controls.maxDistance=transition.toDistance*3;transition=null;}dirty=true;}
  const d=camera.position.distanceTo(controls.target);camera.near=Math.max(.00004,d/1300);camera.far=Math.max(6,d*9);camera.updateProjectionMatrix();controls.update();if(!dirty)return;if(!gpu&&now-lastRender<95)return;lastRender=now;
  const index=levelIndex(state.level),environment=transition?Math.min(index,transition.fromIndex):index;model.update(state,time,transition?.fromIndex);seabed.visible=grid.visible=environment===0;water.visible=environment<=1;highlight.visible=index===1&&!transition;
  renderer.render(scene,camera);positionLabels();const metersPerPixel=2*d*Math.tan(T.MathUtils.degToRad(camera.fov/2))/height,desired=metersPerPixel*95,power=10**Math.floor(Math.log10(desired)),number=[1,2,5,10].find(n=>n*power>=desired)??10,scale=number*power;const label=formatScale(scale),pixels=Math.min(160,scale/metersPerPixel);if(`${label}:${Math.round(pixels)}`!==lastScale){lastScale=`${label}:${Math.round(pixels)}`;callbacks.onScale(label,pixels);}dirty=!!transition||state.playing;
 }
 makeLabels();camera.position.copy(model.target(state)).addScaledVector(direction,distance());controls.target.copy(model.target(state));controls.minDistance=distance()*.32;controls.maxDistance=distance()*3;raf=requestAnimationFrame(frame);callbacks.onReady(!gpu);
 return {update,reset:()=>go(true),dispose(){alive=false;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointerup',onUp);canvas.removeEventListener('pointercancel',onCancel);const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);const map=(m as T.MeshStandardMaterial).map;if(map)textures.add(map);}}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();gpu?.forceContextLoss();canvas.remove();overlay.remove();}};
}
