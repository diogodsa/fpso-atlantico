import * as T from 'three';
import { buildFPSO } from './fpso-model';
import { buildSubseaField } from './subsea-model';
import { defaultSubseaState } from './subsea-data';
import { SYSTEM_ORIGIN, PUMP_ORIGIN, SHAFT_Y, BEARING_X, components, levelIndex, type MultiscaleState, type ComponentId, type V3 } from './multiscale-data';
const palette={steel:0xbac8cb,dark:0x314c59,body:0x4e9198,water:0x77b8d1,gold:0xe3ba67,bronze:0xc39553,deck:0x45616c,white:0xdde6df,rubber:0x182d37,chip:0x45887a,piezo:0xe1c6a3};
export const pumpWorld = new T.Vector3(...SYSTEM_ORIGIN).add(new T.Vector3(...PUMP_ORIGIN));
export function buildMultiscaleModel(){
 const root=new T.Group(),system=new T.Group(),pump=new T.Group(),coarse=new T.Group();
 root.name='Campo Atlântico';system.name='SI-4100 · Injeção de água';system.position.set(...SYSTEM_ORIGIN);root.add(system);pump.name='P-4101A';pump.position.set(...PUMP_ORIGIN);system.add(pump);pump.add(coarse);pump.userData.msPick='equipamento';system.userData.msPick='sistema';
 const materialCache=new Map<string,T.MeshStandardMaterial>(),geoCache=new Map<string,T.BufferGeometry>();
 const vesselMaterials=new Map<T.Material,{opacity:number;transparent:boolean;depthWrite:boolean}>();
 const parts=new Map<ComponentId,T.Group>(),partBases=new Map<ComponentId,T.Vector3>();
 const microHidden:T.Object3D[]=[],baseMeshes:T.Object3D[]=[];let mountingSurface:T.Mesh|null=null;
 const covers:T.Object3D[]=[],shells:T.MeshStandardMaterial[]=[],rotating:T.Object3D[]=[],stages:T.Group[]=[],innerBearing:{group:T.Group;base:T.Vector3;offset:V3}[]=[],sensorExploded:{group:T.Group;base:T.Vector3;offset:V3}[]=[];
 let vessel:ReturnType<typeof buildFPSO>|null=null,field:ReturnType<typeof buildSubseaField>|null=null,mechanical:T.Group|null=null,sensor:T.Group|null=null;
 function material(color:number,key:string){const id=`${key}:${color}`;if(!materialCache.has(id))materialCache.set(id,new T.MeshStandardMaterial({color,roughness:.42,metalness:.48}));return materialCache.get(id)!;}
 function geometry(key:string,make:()=>T.BufferGeometry){if(!geoCache.has(key))geoCache.set(key,make());return geoCache.get(key)!;}
 function mesh(g:T.Group,geo:T.BufferGeometry,c:number,p:V3,key='context'){const m=new T.Mesh(geo,material(c,key));m.position.set(...p);g.add(m);return m;}
 function box(g:T.Group,p:V3,s:V3,c:number,key='context'){const m=mesh(g,geometry('box',()=>new T.BoxGeometry()),c,p,key);m.scale.set(...s);return m;}
 function cyl(g:T.Group,p:V3,r:number,len:number,c:number,axis:'x'|'y'|'z'='y',key='context',segments=24){const m=mesh(g,geometry(`cylinder${segments}`,()=>new T.CylinderGeometry(1,1,1,segments)),c,p,key);m.scale.set(r,len,r);if(axis==='x')m.rotation.z=-Math.PI/2;if(axis==='z')m.rotation.x=Math.PI/2;return m;}
 function sphere(g:T.Group,p:V3,r:number,c:number,key='context'){const m=mesh(g,geometry('sphere',()=>new T.SphereGeometry(1,12,8)),c,p,key);m.scale.setScalar(r);return m;}
 function rod(g:T.Group,a:V3,b:V3,r:number,c:number,key='context'){const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av);const m=cyl(g,av.add(bv).multiplyScalar(.5).toArray() as V3,r,delta.length(),c,'y',key,10);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
 function pipe(g:T.Group,points:V3[],r:number,c:number,key='context'){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal');return mesh(g,new T.TubeGeometry(curve,Math.max(12,points.length*6),r,8,false),c,[0,0,0],key);}
 function ring(g:T.Group,p:V3,outer:number,inner:number,width:number,c:number,key:string,start=0,angle=Math.PI*2){
  const cacheKey=`ring:${outer}:${inner}:${width}:${start}:${angle}`;
  const geo=geometry(cacheKey,()=>{const sh=new T.Shape();if(angle>6.28){sh.absarc(0,0,outer,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);sh.holes.push(hole);}else{sh.moveTo(outer*Math.cos(start),outer*Math.sin(start));sh.absarc(0,0,outer,start,start+angle,false);sh.lineTo(inner*Math.cos(start+angle),inner*Math.sin(start+angle));sh.absarc(0,0,inner,start+angle,start,true);sh.closePath();}const geo=new T.ExtrudeGeometry(sh,{depth:width,bevelEnabled:false,curveSegments:24});geo.translate(0,0,-width/2);geo.rotateY(Math.PI/2);return geo;});
  return mesh(g,geo,c,p,key);
 }
 function shell(g:T.Group,p:V3,r:number,inner:number,width:number,c:number,key:string,front=true){const m=ring(g,p,r,inner,width,c,key+':shell',Math.PI*1.3,Math.PI*1.25);shells.push(m.material as T.MeshStandardMaterial);const cover=ring(g,p,r,inner,width,c,key+':cover',Math.PI*.55,Math.PI*.75);shells.push(cover.material as T.MeshStandardMaterial);if(front)covers.push(cover);return m;}
 function flange(g:T.Group,p:V3,r:number,key='context',axis:'x'|'y'='y'){const f=new T.Group();f.position.set(...p);g.add(f);const m=ring(f,[0,0,0],r,r*.6,r*.2,palette.steel,key);if(axis==='y')m.rotation.z=Math.PI/2;for(let i=0;i<8;i++){const a=i*Math.PI/4;const bp:V3=axis==='y'?[Math.cos(a)*r*.8,.02,Math.sin(a)*r*.8]:[.02,Math.cos(a)*r*.8,Math.sin(a)*r*.8];cyl(f,bp,r*.085,r*.27,palette.dark,axis,key,6);}return f;}
 function valve(g:T.Group,p:V3,r:number){cyl(g,p,r*1.3,r*2.3,palette.body,'x');rod(g,[p[0],p[1],p[2]],[p[0],p[1]+r*2.9,p[2]],r*.18,palette.steel);const m=ring(g,[p[0],p[1]+r*3,p[2]],r*1.6,r*1.4,r*.12,palette.gold,'context');m.rotation.z=Math.PI/2;for(const s of [-1,1])rod(g,[p[0]-r*s,p[1]+r*3,p[2]],[p[0]+r*s,p[1]+r*3,p[2]],r*.1,palette.gold);}
 function smallPump(parent:T.Group,selectable=false){const g=new T.Group();parent.add(g);if(selectable)g.userData.msPick='equipamento';box(g,[-1.5,.12,0],[12,.24,3.4],palette.dark);cyl(g,[0,SHAFT_Y,0],.78,5.4,palette.body,'x');cyl(g,[-6.1,SHAFT_Y,0],.88,2.6,palette.body,'x');cyl(g,[-4.3,SHAFT_Y,0],.26,1.1,palette.steel,'x');for(const x of [-2.3,2.3]){cyl(g,[x,2.75,0],.35,1.4,palette.water);flange(g,[x,3.4,0],.5);}for(const x of [-3.4,3.4]){cyl(g,[x,SHAFT_Y,0],.43,.55,palette.dark,'x');box(g,[x,.58,0],[.7,1.1,.8],palette.dark);}return g;}
 smallPump(coarse,true);
 // The module sits in the gap between process equipment and the utility area.
 const context=new T.Group();system.add(context);context.name='Coletores, filtragem e estrutura';
 box(context,[0,0,0],[28,.32,22],palette.deck);
 for(const x of [-13,13])for(const z of [-10,10]){box(context,[x,-.5,z],[.35,1,.35],palette.steel);box(context,[x,2.4,z],[.14,4.7,.14],palette.steel);}
 for(const z of [-10.5,10.5])for(const y of [1.1,1.65])rod(context,[-13.5,y,z],[13.5,y,z],.045,palette.gold);
 for(let x=-13.5;x<=13.5;x+=3)for(const z of [-10.5,10.5])rod(context,[x,.2,z],[x,1.7,z],.045,palette.gold);
 const spare=new T.Group();spare.position.set(-2,.5,-4);context.add(spare);smallPump(spare);
 for(const z of [-7,0,7]){cyl(context,[10,3.1,z],1.1,5.3,palette.steel);sphere(context,[10,5.7,z],1.1,palette.steel);for(const dx of [-.8,.8])box(context,[10+dx,.6,z],[.14,1.2,.2],palette.dark);flange(context,[10,6.7,z],.35);}
 for(const z of [4,-4]){
  pipe(context,[[10,3,z>0?7:0],[7,3,z>0?7:0],[7,3,z+2.2],[-4.3,3,z+2.2],[-4.3,3.9,z]],.21,palette.water);
  pipe(context,[[.3,3.9,z],[.3,5,z],[5,5,z],[5,5,8.8],[13.8,5,8.8]],.22,palette.water);
  valve(context,[2,5,z],.22);
 }
 for(const z of [-8.8,8.8]){pipe(context,[[-12,2,z],[12,2,z]],.25,palette.water);for(let x=-12;x<=12;x+=4)box(context,[x,1,z],[.25,2,.35],palette.dark);}
 pipe(context,[[13.8,5,8.8],[17,5,8.8],[17,1,17]],.25,palette.water);
 // A precise hit volume supplements thin pipes at the ship scale.
 const systemHit=box(system,[0,3,0],[28,7,22],palette.body,'hit');(systemHit.material as T.MeshStandardMaterial).visible=false;systemHit.userData.msPick='sistema';systemHit.userData.msHit=true;
 function ensureField(){if(field)return;field=buildSubseaField();field.update({...defaultSubseaState,playing:false,labels:false,visible:{...defaultSubseaState.visible,well:false,rov:false}},0);root.add(field.root);}
 function ensureVessel(){if(vessel)return;vessel=buildFPSO({subsea:false});vessel.vessel.userData.msPick='fpso';vessel.parts.offloading.group.visible=true;vessel.vessel.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])vesselMaterials.set(m,{opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite});});root.add(vessel.vessel);}
 function part(id:ComponentId){const g=new T.Group();g.name=components.find(p=>p.id===id)!.name;g.userData.msPick=id;mechanical!.add(g);parts.set(id,g);return g;}
 function ensureMechanical(){
  if(mechanical)return;mechanical=new T.Group();mechanical.name='Conjunto mecânico detalhado';pump.add(mechanical);
  baseMeshes.push(box(mechanical,[-1.65,.09,0],[11.9,.18,3.2],palette.dark,'base'));for(const z of [-1.35,1.35])baseMeshes.push(box(mechanical,[-1.65,.25,z],[11.9,.28,.2],palette.steel,'base'));
  const casing=part('casing');shell(casing,[0,SHAFT_Y,0],.81,.71,5.4,palette.body,'casing');
  for(const x of [-2.72,2.72]){shell(casing,[x,SHAFT_Y,0],.99,.21,.22,palette.body,'casing');for(let i=0;i<16;i++){const a=i*Math.PI/8;cyl(casing,[x,SHAFT_Y+Math.sin(a)*.9,Math.cos(a)*.9],.045,.36,palette.steel,'x','casing',6);}}
  for(const x of [-2.1,2.1]){box(casing,[x,.45,0],[.6,.7,1.35],palette.body,'casing');for(const z of [-.6,.6])cyl(casing,[x,.18,z],.065,.25,palette.steel,'y','casing',6);cyl(casing,[x,SHAFT_Y+1.02,0],.32,.7,palette.body,'y','casing');flange(casing,[x,SHAFT_Y+1.39,0],.49,'casing');}
  const shaft=part('shaft');cyl(shaft,[0,SHAFT_Y,0],.092,8.25,palette.steel,'x','shaft');for(const x of [-3.46,3.46,-2.9,2.9])cyl(shaft,[x,SHAFT_Y,0],.108,.24,palette.steel,'x','shaft');
  const im=part('impellers'),imSpin=new T.Group();imSpin.position.y=SHAFT_Y;im.add(imSpin);rotating.push(imSpin);
  const df=part('diffusers');df.position.y=SHAFT_Y;
  for(let i=0;i<6;i++){
   const x=-2.05+i*.82,stage=new T.Group();stage.position.x=x;stage.userData.baseX=x;imSpin.add(stage);stages.push(stage);
   ring(stage,[-.07,0,0],.57,.125,.04,palette.bronze,'impellers');ring(stage,[.15,0,0],.57,.22,.035,palette.bronze,'impellers');ring(stage,[.01,0,0],.17,.092,.29,palette.steel,'impellers');
   for(let j=0;j<7;j++){const a=j*Math.PI*2/7;const pts:V3[]=[];for(let k=0;k<=7;k++){const r=.19+k*.05,t=a-k*.075;pts.push([.04,Math.sin(t)*r,Math.cos(t)*r]);}const blade=pipe(stage,pts,.034,palette.bronze,'impellers');blade.scale.x=2.6;}
   const diffuser=new T.Group();diffuser.position.x=x+.33;df.add(diffuser);ring(diffuser,[0,0,0],.70,.20,.045,palette.steel,'diffusers');ring(diffuser,[.12,0,0],.70,.61,.24,palette.steel,'diffusers');
   for(let j=0;j<9;j++){const a=j*Math.PI*2/9;const pts:V3[]=[];for(let k=0;k<=5;k++){const r=.60-k*.075,t=a+k*.06;pts.push([.08,Math.sin(t)*r,Math.cos(t)*r]);}pipe(diffuser,pts,.018,palette.steel,'diffusers');}
  }
  const seal=part('seal');for(const x of [-2.98,2.98]){ring(seal,[x,SHAFT_Y,0],.29,.11,.19,palette.dark,'seal');ring(seal,[x-.08,SHAFT_Y,0],.23,.1,.1,palette.bronze,'seal');for(let i=0;i<8;i++){const a=i*Math.PI/4;cyl(seal,[x,SHAFT_Y+Math.sin(a)*.25,Math.cos(a)*.25],.025,.28,palette.steel,'x','seal',6);}}
  function bearing(id:'bearing-de'|'bearing-nde',x:number){
   const g=part(id);g.position.set(x,SHAFT_Y,0);shell(g,[0,0,0],.46,.33,.62,palette.body,id);
   box(g,[0,-.73,0],[.8,.55,.83],palette.body,id);box(g,[0,-1.03,0],[.93,.12,1.06],palette.steel,id);
   const mountingPad=mesh(g,geometry('mounting-pad',()=>new T.BoxGeometry(.26,.04,.25,16,2,16)),palette.dark,[0,.45,0],id);for(const zz of [-.44,.44])for(const xx of [-.28,.28])cyl(g,[xx,-.94,zz],.043,.14,palette.steel,'y',id,6);
   for(const xx of [-.35,.35]){shell(g,[xx,0,0],.45,.13,.055,palette.dark,id);for(let i=0;i<6;i++){const a=i*Math.PI/3;cyl(g,[xx,Math.sin(a)*.38,Math.cos(a)*.38],.027,.10,palette.steel,'x',id,6);}}
   const outer=new T.Group(),inner=new T.Group(),rolling=new T.Group();g.add(outer,inner,rolling);
   ring(outer,[0,0,0],.32,.261,.17,palette.steel,id);ring(inner,[0,0,0],.189,.094,.17,palette.steel,id);
   for(let i=0;i<14;i++){const a=i*Math.PI*2/14;sphere(rolling,[0,Math.sin(a)*.225,Math.cos(a)*.225],.036,palette.steel,id);}
   for(const xx of [-.067,.067])ring(rolling,[xx,0,0],.248,.204,.011,palette.bronze,id);
   rotating.push(rolling);
   if(id==='bearing-de')for(const [group,offset]of [[outer,[.45,0,0]],[inner,[-.4,0,0]],[rolling,[.9,0,0]]] as [T.Group,V3][])innerBearing.push({group,base:group.position.clone(),offset});
   if(id==='bearing-de'){mountingSurface=mountingPad;microHidden.push(...g.children.filter(c=>c!==mountingPad));}
   return g;
  }
  const driveBearing=bearing('bearing-de',BEARING_X);bearing('bearing-nde',3.45);
  const coupling=part('coupling');for(const x of [-4.1,-4.7])cyl(coupling,[x,SHAFT_Y,0],.24,.28,palette.steel,'x','coupling');cyl(coupling,[-4.4,SHAFT_Y,0],.28,.36,palette.dark,'x','coupling');shell(coupling,[-4.4,SHAFT_Y,0],.5,.47,1.0,palette.gold,'coupling');
  const motor=part('motor');cyl(motor,[-6.16,SHAFT_Y,0],.74,2.3,palette.body,'x','motor');for(let i=0;i<18;i++){const a=i*Math.PI/9;const m=box(motor,[-6.16,SHAFT_Y+Math.sin(a)*.77,Math.cos(a)*.77],[2.2,.10,.09],palette.body,'motor');m.rotation.x=-a;}
  for(const x of [-7.4,-4.96]){cyl(motor,[x,SHAFT_Y,0],.78,.18,palette.dark,'x','motor');for(let i=0;i<12;i++){const a=i*Math.PI/6;cyl(motor,[x,SHAFT_Y+Math.sin(a)*.68,Math.cos(a)*.68],.03,.24,palette.steel,'x','motor',6);}}
  box(motor,[-6.1,SHAFT_Y+.9,0],[.75,.48,.72],palette.dark,'motor');for(const x of [-6.95,-5.35])for(const z of [-.55,.55])box(motor,[x,.5,z],[.55,.7,.2],palette.body,'motor');for(let i=-5;i<=5;i++)rod(motor,[-7.51,SHAFT_Y+i*.1,-.55],[-7.51,SHAFT_Y+i*.1,.55],.013,palette.steel,'motor');
  sensor=new T.Group();sensor.name='ACC-4101A-DE · Acelerômetro radial';sensor.position.set(0,.47,0);sensor.userData.msPick='sensor';driveBearing.add(sensor);
  cyl(sensor,[0,-.006,0],.003,.012,palette.steel,'y','sensor',12);for(let i=0;i<7;i++){const thread=ring(sensor,[0,-.011+i*.0015,0],.0034,.0026,.0006,palette.dark,'sensor');thread.rotation.z=Math.PI/2;}
  cyl(sensor,[0,.004,0],.014,.008,palette.steel,'y','sensor',6);cyl(sensor,[0,.009,0],.013,.003,palette.dark,'y','sensor');
  const shellGroup=new T.Group();sensor.add(shellGroup);const wall=shell(shellGroup,[0,.029,0],.014,.012,.037,palette.steel,'sensor');wall.rotation.z=Math.PI/2;const cover=covers.at(-1)!;cover.rotation.z=Math.PI/2;
  const cap=new T.Group();cap.position.y=.049;sensor.add(cap);cyl(cap,[0,0,0],.014,.005,palette.steel,'y','sensor');cyl(cap,[0,.007,0],.007,.010,palette.dark,'y','sensor');cyl(cap,[0,.014,0],.006,.006,palette.steel,'y','sensor');
  const element=new T.Group();element.position.y=.025;sensor.add(element);cyl(element,[0,-.004,0],.003,.017,palette.steel,'y','sensor');const piezo=ring(element,[0,-.001,0],.006,.0033,.007,palette.piezo,'sensor');piezo.rotation.z=Math.PI/2;const mass=ring(element,[0,-.001,0],.010,.0063,.010,palette.bronze,'sensor');mass.rotation.z=Math.PI/2;const preload=ring(element,[0,.006,0],.011,.006,.002,palette.steel,'sensor');preload.rotation.z=Math.PI/2;
  box(sensor,[0,.041,0],[.016,.002,.013],palette.chip,'sensor');for(const x of [-.004,.004])box(sensor,[x,.043,0],[.003,.002,.004],palette.dark,'sensor');
  pipe(sensor,[[0,.066,0],[0,.076,0],[.03,.079,0],[.07,.053,0],[.085,.015,-.025],[.11,-.04,-.05]],.0026,palette.rubber,'sensor');
  sensorExploded.push({group:cap,base:cap.position.clone(),offset:[0,.026,0]},{group:shellGroup,base:shellGroup.position.clone(),offset:[.035,0,0]},{group:element,base:element.position.clone(),offset:[-.025,0,0]});
  for(const [id,g]of parts)partBases.set(id,g.position.clone());
 }
 const offsets:Record<ComponentId,V3>={casing:[0,2.2,-1.8],shaft:[0,0,0],impellers:[0,0,1.4],diffusers:[0,1.3,-1.1],seal:[0,0,2],"bearing-de":[-1.2,0,0],"bearing-nde":[1.2,0,0],coupling:[-2.0,0,0],motor:[-2.7,0,0]};
 function update(state:MultiscaleState,time=0,transitionFrom?:number){
  const index=levelIndex(state.level),environment=transitionFrom===undefined?index:Math.min(index,transitionFrom);if(environment<=1)ensureField();if(environment<=2)ensureVessel();if(index>=3)ensureMechanical();
  if(field)field.root.visible=environment===0;
  if(vessel)vessel.vessel.visible=environment<=1||(environment===2&&state.context);
  for(const [m,base]of vesselMaterials){const ghost=environment===2;m.opacity=ghost?Math.min(base.opacity,.13):base.opacity;m.transparent=ghost||base.transparent;m.depthWrite=ghost?false:base.depthWrite;}
  context.visible=environment<=2;const showMechanical=index>=3||(transitionFrom!==undefined&&transitionFrom>=3);coarse.visible=!mechanical||!showMechanical;if(mechanical)mechanical.visible=showMechanical;
  systemHit.visible=index===1;
  const explode=state.explosion/100;
  for(const [id,g]of parts){g.visible=index===5?id==='bearing-de':index<4||state.context||id===state.component;g.position.copy(partBases.get(id)!);if(index===3)g.position.addScaledVector(new T.Vector3(...offsets[id]),explode);}
  for(const x of innerBearing)x.group.position.copy(x.base).addScaledVector(new T.Vector3(...x.offset),index===4&&state.component==='bearing-de'?explode:0);
  for(const x of sensorExploded)x.group.position.copy(x.base).addScaledVector(new T.Vector3(...x.offset),index===5?explode:0);
  for(const s of stages)s.position.x=Number(s.userData.baseX)*(1+(index===3?explode*.32:0));
  for(const o of rotating)o.rotation.x=time*(o.parent?.userData.msPick==='impellers'?.6:.23);
  for(const c of covers)c.visible=!state.cut;
  // At centimetre scale retain the same mounting pad; large surrounding faces
  // are culled so they cannot cover the sensor in the CPU projection.
  for(const o of microHidden)o.visible=index!==5&&(!covers.includes(o)||!state.cut);
  for(const o of baseMeshes)o.visible=index<4||(index===4&&state.context);
  if(mountingSurface)mountingSurface.visible=index!==5||state.context;
  for(const [key,m]of materialCache){let opacity=1;if(index>=4&&state.context){const owner=key.split(':')[0];if((components.some(c=>c.id===owner)&&owner!==state.component&&owner!=='sensor')||owner==='base')opacity=.12;}
   if(state.transparent&&(key.includes(':shell:')||key.includes(':cover:')))opacity=Math.min(opacity,.18);
   m.opacity=opacity;m.transparent=opacity<1;m.depthWrite=opacity>=1;
  }
  // In sensor close-up the parent stays a solid mounting surface, preserving location.
  if(sensor)sensor.visible=index>=3;
  if(vessel)vessel.flame.material.uniforms.uTime.value=time;
  root.updateMatrixWorld(true);
 }
 function target(state:MultiscaleState){
  if(state.level==='campo')return new T.Vector3(-20,-85,65);
  if(state.level==='fpso')return new T.Vector3(0,20,0);
  if(state.level==='sistema')return new T.Vector3(...SYSTEM_ORIGIN).add(new T.Vector3(0,2.5,0));
  if(state.level==='equipamento')return pumpWorld.clone().add(new T.Vector3(-1.5,SHAFT_Y,0));
  if(state.level==='sensor'&&sensor)return sensor.localToWorld(new T.Vector3(0,.034,0));
  const c=components.find(c=>c.id===state.component)!;const g=parts.get(c.id);if(g&&(c.id==='bearing-de'||c.id==='bearing-nde'))return g.localToWorld(new T.Vector3(0,-.23,0));
  return pumpWorld.clone().add(new T.Vector3(...c.center)).addScaledVector(new T.Vector3(...offsets[c.id]),0);
 }
 function pick(object:T.Object3D){for(let o:T.Object3D|null=object;o;o=o.parent)if(o.userData.msPick)return String(o.userData.msPick);return null;}
 return {root,system,pump,parts,update,target,pick,ensureMechanical,get sensor(){return sensor;},get detailed(){return !!mechanical;},get vessel(){return vessel;},get field(){return field;},materials:materialCache};
}
