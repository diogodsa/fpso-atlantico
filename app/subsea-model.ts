import * as T from 'three';
import { FLOOR_Y as F, wells, subseaAssets, anchorPositions, type V3, type SubseaLayer, type SubseaState } from './subsea-data';

const v=(p:V3)=>new T.Vector3(...p);
const C={steel:0xb0c9cf,dark:0x213d49,frame:0x718f9c,yellow:0xeebc5e,blue:0x66bce7,purple:0xb09ced,green:0x77c5a5,orange:0xeb9768,black:0x182c36,white:0xdcebe9};
export type SubseaRoute={id:string;layer:SubseaLayer;from:string;to:string;points:V3[];radius:number;reverse?:boolean};
export const PRODUCTION_RISER:V3[]=[[-55,15,34],[-57,-48,43],[-78,-161,56],[-120,-136,70],[-156,-159,88],[-164,F+12,91],[-175,F+2,105],[-175,F+2,123]];
export const INJECTION_RISER:V3[]=[[-35,15,34],[-15,-65,60],[30,-174,85],[85,-134,95],[135,-185,112],[145,F+8,118],[150,F+2,115],[150,F+2,105]];
export const UMBILICAL:V3[]=[[-80,12,34],[-85,-60,95],[-10,-170,130],[30,F+5,145],[60,F+5,140]];
export const ANCHOR_POINTS=anchorPositions;
export const subseaRoutes:SubseaRoute[]=[
 ...wells.filter(w=>w.id[0]==='p').flatMap((w,i)=>{const [x,,z]=w.position;const end:V3=[-3+i*12,F+5,182];return [
 {id:'jumper-'+w.id,layer:'production' as const,from:'anm-'+w.id,to:'tie-'+w.id,points:[[x,F+10,z-11],[x,F+10,z-16],[x,F+7,z-20],[x,F+3,z-24]] as V3[],radius:.65},
 {id:'well-line-'+w.id,layer:'production' as const,from:'tie-'+w.id,to:'man-prod',points:[[x,F+3,z-24],[x,F+2,z-34],[end[0],F+2,204+i*3],end] as V3[],radius:.7}];}),
 {id:'export-jumper',layer:'production',from:'man-prod',to:'plet',points:[[-12,F+8,165],[-26,F+8,165],[-30,F+6,160],[-45,F+4,160]],radius:.95},
 {id:'flowline',layer:'production',from:'plet',to:'touchdown',points:[[-45,F+4,160],[-65,F+2,160],[-115,F+2,145],[-155,F+2,145],[-175,F+2,138],[-175,F+2,123]],radius:1},
 {id:'riser-prod',layer:'production',from:'touchdown',to:'fpso-production',points:[...PRODUCTION_RISER].reverse(),radius:1.1},
 {id:'riser-inj',layer:'injection',from:'fpso-injection',to:'inj-touchdown',points:INJECTION_RISER,radius:.85},
 {id:'inj-feed',layer:'injection',from:'inj-touchdown',to:'man-inj',points:[[150,F+2,105],[150,F+4,95],[150,F+4,86],[147,F+3,64],[147,F+8,45]],radius:.85},
 ...wells.filter(w=>w.id[0]==='i').map((w,i)=>({id:'inj-line-'+w.id,layer:'injection' as const,from:'man-inj',to:'anm-'+w.id,points:[[114+i*12,F+5,28],[114+i*12,F+2,16],[w.position[0],F+2,w.position[2]-25],[w.position[0],F+8,w.position[2]-17],[w.position[0],F+10,w.position[2]-11]] as V3[],radius:.65})),
 {id:'umbilical',layer:'control',from:'fpso-control',to:'suta',points:UMBILICAL,radius:.85},
 {id:'suta-sdu',layer:'control',from:'suta',to:'sdu',points:[[60,F+5,140],[60,F+2,151],[70,F+2,170],[70,F+5,190]],radius:.45},
 ...wells.map((w,i)=>({id:'lead-'+w.id,layer:'control' as const,from:'sdu',to:'scm-'+w.id,points:[[70+i*.45,F+5,190],[86+i*3,F+2,201],[w.position[0]+20,F+2,w.position[2]+10],[w.position[0]+12,F+4,w.position[2]+9],[w.position[0]+9,F+9,w.position[2]]] as V3[],radius:.22})),
 ...[{id:'man-prod',x:15,z:165},{id:'man-inj',x:120,z:45}].map(m=>({id:'lead-'+m.id,layer:'control' as const,from:'sdu',to:m.id,points:[[70,F+5,190],[92,F+2,179],[m.x+21,F+2,m.z+18],[m.x+21,F+9,m.z]] as V3[],radius:.24})),
];
export type SubseaModel=ReturnType<typeof buildSubseaField>;
export function buildSubseaField(){
 const root=new T.Group();root.name='Campo submarino conceitual';root.userData.system='subsea';
 const groups=new Map<string,T.Group>(),materials:T.MeshStandardMaterial[]=[],buckets=new Map<string,{parent:T.Group;geometry:T.BufferGeometry;material:T.MeshStandardMaterial;matrices:T.Matrix4[]}>();
 const shared={box:new T.BoxGeometry(1,1,1),cyl:new T.CylinderGeometry(1,1,1,12),sphere:new T.SphereGeometry(1,10,6),bolt:new T.CylinderGeometry(1,1,1,6)};
 const d=new T.Object3D(),up=new T.Vector3(0,1,0),mats=new Map<string,T.MeshStandardMaterial>();
 const explosion:{g:T.Group;base:T.Vector3;offset:T.Vector3}[]=[];
 const propellers:T.Group[]=[];
 function group(id:string,layer:SubseaLayer,p:V3=[0,0,0]){if(groups.has(id))return groups.get(id)!;const g=new T.Group();g.name=id;g.userData.subseaId=id;g.userData.layer=layer;g.position.set(...p);root.add(g);groups.set(id,g);return g;}
 function mat(g:T.Group,color:number){const k=g.uuid+color;let m=mats.get(k);if(!m){m=new T.MeshStandardMaterial({color,roughness:.55,metalness:.42});m.userData.subseaId=g.userData.subseaId;m.userData.layer=g.userData.layer;m.userData.baseColor=m.color.clone();mats.set(k,m);materials.push(m);}return m;}
 function add(g:T.Group,kind:keyof typeof shared,p:V3,s:V3,c:number,q=new T.Quaternion()){const key=g.uuid+kind+c;let b=buckets.get(key);if(!b){b={parent:g,geometry:shared[kind],material:mat(g,c),matrices:[]};buckets.set(key,b);}d.position.set(...p);d.scale.set(...s);d.quaternion.copy(q);d.updateMatrix();b.matrices.push(d.matrix.clone());}
 function box(g:T.Group,p:V3,s:V3,c=C.frame){add(g,'box',p,s,c);}
 function rod(g:T.Group,a:V3,b:V3,r:number,c=C.steel,kind:'cyl'|'bolt'='cyl'){const va=v(a),vb=v(b),diff=vb.clone().sub(va);add(g,kind,va.add(vb).multiplyScalar(.5).toArray() as V3,[r,diff.length(),r],c,new T.Quaternion().setFromUnitVectors(up,diff.normalize()));}
 function cyl(g:T.Group,p:V3,r:number,h:number,c=C.steel){add(g,'cyl',p,[r,h,r],c);}
 function mesh(g:T.Group,geo:T.BufferGeometry,c:number,p:V3=[0,0,0],q?:T.Quaternion){const m=new T.Mesh(geo,mat(g,c));m.position.set(...p);if(q)m.quaternion.copy(q);g.add(m);return m;}
 function ring(g:T.Group,p:V3,r:number,t:number,c=C.steel,q=new T.Quaternion()){return mesh(g,new T.TorusGeometry(r,t,5,18),c,p,q);}
 function flange(g:T.Group,p:V3,r=2,axis:V3=[0,1,0]){const n=v(axis).normalize(),q=new T.Quaternion().setFromUnitVectors(up,n),pa=v(p);rod(g,pa.clone().addScaledVector(n,-.4).toArray() as V3,pa.clone().addScaledVector(n,.4).toArray() as V3,r,C.steel);for(let i=0;i<8;i++){const a=i*Math.PI/4,off=new T.Vector3(Math.cos(a)*r*.78,0,Math.sin(a)*r*.78).applyQuaternion(q);const b=pa.clone().add(off);rod(g,b.clone().addScaledVector(n,-.55).toArray() as V3,b.clone().addScaledVector(n,.55).toArray() as V3,.16,C.dark,'bolt');}}
 function tube(g:T.Group,points:V3[],r:number,c:number,segments=48){
  class RoutedCurve extends T.CatmullRomCurve3 { override getPoint(t:number,target=new T.Vector3()){const point=super.getPoint(t,target);if(points.every(p=>p[1]>=F))point.y=Math.max(F+r,point.y);return point;} }
  const curve=new RoutedCurve(points.map(v),false,'centripetal');mesh(g,new T.TubeGeometry(curve,segments,r,6,false),c);return curve;}
 function frame(g:T.Group,w:number,l:number,h:number){for(const x of [-w/2,w/2])for(const z of [-l/2,l/2]){box(g,[x,h/2,z],[.6,h,.6],C.yellow);ring(g,[x,h+.3,z],.6,.18,C.yellow);}for(const y of [1,h]){for(const z of [-l/2,l/2])box(g,[0,y,z],[w,.5,.5],C.yellow);for(const x of [-w/2,w/2])box(g,[x,y,0],[.5,.5,l],C.yellow);}for(const x of [-w/2,w/2])rod(g,[x,1,-l/2],[x,h,l/2],.18,C.frame);}
 function mudmat(g:T.Group,w:number,l:number){box(g,[0,.3,0],[w,.6,l],C.dark);for(let x=-w/2+1;x<w/2;x+=3)box(g,[x,.7,0],[.23,.5,l],C.frame);for(let z=-l/2+1;z<l/2;z+=3)box(g,[0,.9,z],[w,.25,.23],C.frame);}
 function panel(g:T.Group,p:V3,color=C.purple){box(g,p,[3.2,3.5,.7],C.dark);for(let i=0;i<6;i++){const x=p[0]+(i%3-1)*.85,y=p[1]+(i<3?.8:-.6);rod(g,[x,y,p[2]],[x,y,p[2]+.7],.22,color);}}
 function valve(g:T.Group,p:V3,axis:'z'|'x'='z',color=C.yellow){const [x,y,z]=p;box(g,p,[2.2,2.4,2.2],color);rod(g,[x,y,z],[x,y+3.3,z],.58,C.steel);cyl(g,[x,y+3.8,z],1.3,1.1,C.dark);cyl(g,[x,y+4.5,z],.35,.5,C.yellow);flange(g,axis==='z'?[x,y,z+1.6]:[x+1.6,y,z],1.65,axis==='z'?[0,0,1]:[1,0,0]);}
 function explode(g:T.Group,offset:V3){explosion.push({g,base:g.position.clone(),offset:v(offset)});}
 for(const w of wells){
  const [x,,z]=w.position,inj=w.id[0]==='i',layer:SubseaLayer=inj?'injection':'production',color=inj?C.blue:C.yellow,isMain=w.id==='p01';
  const shell=group('anm-'+w.id,layer,w.position);mudmat(shell,23,23);frame(shell,20,20,18);
  const wh=isMain?group('wellhead',layer,w.position):shell;
  cyl(wh,[0,2,0],3.1,4,C.steel);for(const y of [1,3.5])flange(wh,[0,y,0],3.6);cyl(wh,[0,4.5,0],2.6,1,C.dark);
  for(const dx of [-6,6])for(const dz of [-6,6]){cyl(shell,[dx,4.5,dz],.42,8,C.steel);mesh(shell,new T.ConeGeometry(.7,1.2,10),C.yellow,[dx,9,dz]);}
  const vg=isMain?group('valves',layer,w.position):shell;
  box(vg,[0,9,0],[4.2,8,4.2],color);cyl(vg,[0,14.2,0],2.3,2.5,C.steel);flange(vg,[0,15.4,0],2.7);box(vg,[0,16.2,0],[3.2,.7,3.2],C.yellow);
  rod(vg,[0,8,0],[5,8,0],1.1,C.dark);rod(vg,[5,8,0],[6,8,0],1.5,C.steel);flange(vg,[4.1,8,0],1.8,[1,0,0]);
  rod(vg,[0,10,0],[0,10,-7],.8,C.steel);valve(vg,[0,10,-4],'z',color);
  tube(vg,[[-2,6,1],[-4,6,1],[-4,12,1],[-2,12,1]],.3,C.steel,16);
  const cg=isMain?group('choke',layer,w.position):shell;box(cg,[0,10,-9],[3,3,3],C.dark);cyl(cg,[0,13,-9],1.4,3,C.steel);flange(cg,[0,10,-11],1.7,[0,0,1]);rod(cg,[0,10,-6],[0,10,-11],.85,color);
  const scm=group(isMain?'scm':'scm-'+w.id,'control',w.position);cyl(scm,[9,9,0],1.7,5,C.purple);flange(scm,[9,11.5,0],2);panel(scm,[8.5,7,3]);for(let i=0;i<3;i++)tube(scm,[[9,8,i*.5],[7,7,i*.5],[6,8+i,1],[4,9+i,1]],.1,C.purple,14);
  panel(shell,[-6,8,-9],color);for(const y of [4,6,8])rod(shell,[-8,y,-10],[-5,y,-10],.18,C.steel);
  if(isMain){explode(vg,[0,17,0]);explode(cg,[0,14,-15]);explode(scm,[13,10,0]);explode(shell,[0,27,0]);}
 }
 const mm=group('mudmat','production',[15,F,165]);mudmat(mm,61,37);
 function manifold(id:string,pos:V3,branches:number,inj=false){const g=group(id,inj?'injection':'production',pos),col=inj?C.blue:C.yellow; if(inj)mudmat(g,58,35);frame(g,54,29,17);rod(g,[-27,8,0],[27,8,0],1.4,col);for(const x of [-27,27])flange(g,[x,8,0],2.2,[1,0,0]);for(let i=0;i<branches;i++){const x=branches===4?-18+i*12:-6+i*12,z=inj?-17:17;rod(g,[x,8,0],[x,8,z*.7],.85,C.steel);rod(g,[x,8,z*.7],[x,5,z],.85,C.steel);valve(g,[x,8,z*.45],'z',col);flange(g,[x,5,z],1.7,[0,0,1]);rod(g,[x,8,-2],[x,12,-2],.16,C.steel);box(g,[x,12.5,-2],[1.6,1.2,1.6],C.dark);}panel(g,[21,9,0]);for(const z of [-14,14])for(let x=-20;x<23;x+=7){box(g,[x,2,z],[5,1.5,2],C.frame);}return g;}
 manifold('man-prod',[15,F,165],4);manifold('man-inj',[120,F,45],2,true);
 function termination(id:string,layer:SubseaLayer,pos:V3,col:number){const g=group(id,layer,pos);mudmat(g,16,13);frame(g,14,11,9);rod(g,[-9,4,0],[8,4,0],1.2,col);for(const x of [-9,8])flange(g,[x,4,0],2.2,[1,0,0]);panel(g,[0,5,5],col);return g;}
 termination('plet','production',[-45,F,160],C.yellow);termination('plet-inj','injection',[150,F,95],C.blue).rotation.y=Math.PI/2;
 for(const [id,pos] of [['suta',[60,F,140]],['sdu',[70,F,190]]] as [string,V3][]){const g=group(id,'control',pos);mudmat(g,16,13);frame(g,14,11,10);box(g,[0,5,0],[10,6,6],C.dark);for(const x of [-4,0,4])panel(g,[x,5,3.3]);cyl(g,[0,9,0],1.8,1.5,C.purple);}
 const curves:{curve:T.CatmullRomCurve3;layer:SubseaLayer;count:number;offset:number}[]=[];
 const layerColor={production:C.yellow,injection:C.blue,control:C.purple,mooring:C.frame,well:C.green,rov:C.orange};
 for(const r of subseaRoutes){const id=r.id==='jumper-p01'?'jumper':r.id.startsWith('well-line')?'well-lines':r.id.startsWith('lead-')||r.id==='suta-sdu'?'flying-leads':r.id.startsWith('inj-line')||r.id==='inj-feed'?'injection-lines':r.id==='export-jumper'?'flowline':r.id;
 const g=group(id,r.layer);const curve=tube(g,r.points,r.radius,layerColor[r.layer],r.id.includes('riser')?100:40);curves.push({curve,layer:r.layer,count:Math.max(2,Math.min(10,Math.ceil(curve.getLength()/38))),offset:curves.length*.127});}
 // Distributed buoyancy on the suspended lazy-wave sections, clamped around each flexible riser.
 for(const [id,points,layer,color] of [['buoyancy',PRODUCTION_RISER,'production',C.yellow],['buoyancy-inj',INJECTION_RISER,'injection',C.blue]] as [string,V3[],SubseaLayer,number][]){const g=group(id,layer),curve=new T.CatmullRomCurve3(points.map(v),false,'centripetal');for(let i=0;i<14;i++){const t=(2.3+i*1.3/13)/(points.length-1),p=curve.getPoint(t),n=curve.getTangent(t);rod(g,p.clone().addScaledVector(n,-1.55).toArray() as V3,p.clone().addScaledVector(n,1.55).toArray() as V3,2.6,color);for(const a of [-1.1,1.1])rod(g,p.clone().addScaledVector(n,a-.12).toArray() as V3,p.clone().addScaledVector(n,a+.12).toArray() as V3,2.72,C.dark);}}
 const hang=group('hangoff','production');for(const x of [-55,-35,-80]){box(hang,[x,12,34],[8,1.4,8],C.frame);box(hang,[x,7,37],[.6,11,.6],C.frame);rod(hang,[x,2,29],[x,12,38],.4,C.frame);flange(hang,[x,15,34],2.3);}
 const stiff=group('stiffener','production');for(const x of [-55,-35])mesh(stiff,new T.CylinderGeometry(2.5,1.1,13,14),C.black,[x,-1,35]);
 const td=group('touchdown','production');const tdr=ring(td,[-175,F+.15,123],13,.18,C.yellow,new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2));tdr.scale.set(1.5,1,1);
 const moor=group('mooring','mooring');
 ANCHOR_POINTS.forEach((p,i)=>{const x=i<4?-135:123,z=i%4<2?-27:27,dir=Math.sign(p[0]);const curve=tube(moor,[[x,4,z],[x+dir*45,-52,z*2.4],[p[0]*.80,-160,p[2]*.76],[p[0]-dir*5.7,F-12,p[2]]],.48,C.frame,70);
  const q=group(i===0?'anchor':'anchor-'+i,'mooring',[p[0],F,p[2]]);mesh(q,new T.CylinderGeometry(6,6,30,20,1,true),C.steel,[0,-13,0]);cyl(q,[0,2,0],6.2,1,C.dark);flange(q,[0,3,0],2);rod(q,[0,3,0],[0,5,0],.65,C.yellow);box(q,[-dir*5.7,-12,0],[1.1,4,4],C.yellow);for(let k=0;k<6;k++){const a=k*Math.PI/3;box(q,[Math.cos(a)*4.5,3.2,Math.sin(a)*4.5],[.45,1.3,1.8],C.frame);}
  // Short chain segments at both ends, synthetic rope represented by the middle tube.
  for(const [a,b] of [[0,.12],[.85,1]])for(let t=a;t<b;t+=.009){const pos=curve.getPoint(t),tan=curve.getTangent(t);const quat=new T.Quaternion().setFromUnitVectors(up,tan);const link=ring(moor,pos.toArray() as V3,.72,.18,C.steel,quat);link.scale.y=1.45;if(Math.round(t/.009)%2)link.rotateY(Math.PI/2);}
  const top=v([x,4,z]);rod(moor,top.clone().add(new T.Vector3(0,-2,0)).toArray() as V3,top.clone().add(new T.Vector3(0,2,0)).toArray() as V3,2,C.dark);
 });
 // A deliberately shortened completion cutaway. Partial cylinders expose nested annuli.
 const casing=group('casing','well',[-145,F,245]);for(const [radius,height,color] of [[5.5,100,0x596b72],[4.8,99,0x989185],[4.1,103,0x8eaaaf],[3.5,102,0xaaa28c]] as number[][]){mesh(casing,new T.CylinderGeometry(radius,radius,height,28,1,true,Math.PI*.73,Math.PI*1.3),color,[0,-height/2,0]);}
 const tubing=group('tubing','well',[-145,F,245]);cyl(tubing,[0,-51,0],1.15,103,C.green);for(let y=-8;y>-100;y-=12){cyl(tubing,[0,y,0],1.36,.65,C.steel);}
 const hanger=group('hanger','well',[-145,F,245]);cyl(hanger,[0,1,0],2.1,3,C.green);flange(hanger,[0,2.5,0],2.4);explode(hanger,[0,6,0]);
 const pk=group('packer','well',[-145,F,245]);for(const y of [-61,-67])cyl(pk,[0,y,0],3.05,1.5,C.steel);cyl(pk,[0,-64,0],3,4.2,C.black);for(const y of [-62.5,-64,-65.5])cyl(pk,[0,y,0],3.14,.55,C.green);
 const sv=group('sssv','well',[-145,F,245]);cyl(sv,[0,-24,0],1.9,6,C.yellow);flange(sv,[0,-21,0],2.1);flange(sv,[0,-27,0],2.1);rod(sv,[2,1,0],[2,-24,0],.12,C.purple);rod(sv,[2,-24,0],[1.8,-24,0],.12,C.purple);
 // Work-class ROV: flotation blocks, thruster ducts, camera pods, lamps and two articulated manipulators.
 const rov=group('rov','rov',[-110,F+20,270]);frame(rov,12,15,8);for(const x of [-4,4])box(rov,[x,9,0],[4,4,14],C.orange);box(rov,[0,3,0],[9,2,11],C.dark);for(const x of [-6.5,6.5])for(const z of [-4,4]){const duct=mesh(rov,new T.CylinderGeometry(1.9,1.9,2.3,16,1,true),C.dark,[x,4,z]);duct.rotateX(Math.PI/2);const rotor=new T.Group();rotor.position.set(x,4,z);rov.add(rotor);mesh(rotor,new T.BoxGeometry(3.1,.25,.25),C.steel);mesh(rotor,new T.BoxGeometry(.25,3.1,.25),C.steel);propellers.push(rotor);}
 for(const x of [-3,3]){mesh(rov,new T.CylinderGeometry(1.6,1.6,2.2,16,1,true),C.dark,[x,5,0]);const rotor=new T.Group();rotor.position.set(x,5,0);rov.add(rotor);mesh(rotor,new T.BoxGeometry(2.7,.2,.3),C.steel);mesh(rotor,new T.BoxGeometry(.3,.2,2.7),C.steel);rotor.userData.vertical=true;propellers.push(rotor);rod(rov,[x,6,-7],[x,6,-8.3],1,C.steel);rod(rov,[x,6,-8.3],[x,6,-8.6],.8,C.white);
 tube(rov,[[x,2,-5],[x*1.8,1,-10],[x*1.5,2,-16]],.6,C.yellow,16);for(const p of [[x,2,-5],[x*1.8,1,-10],[x*1.5,2,-16]] as V3[])add(rov,'sphere',p,[1,1,1],C.dark);for(const dx of [-.5,.5])rod(rov,[x*1.5,2,-16],[x*1.5+dx,2,-18],.22,C.steel);}
 rod(rov,[0,6,-7],[0,6,-9],1.1,C.dark);rod(rov,[0,6,-9],[0,6,-9.2],.7,0x6ed5e5);
 const tms=group('tms','rov',[-115,-120,270]);frame(tms,13,12,13);const drum=mesh(tms,new T.CylinderGeometry(4.4,4.4,8,20),C.dark,[0,6,0]);drum.rotateZ(Math.PI/2);for(const x of [-4.3,4.3]){const disc=mesh(tms,new T.CylinderGeometry(5.2,5.2,.5,20),C.orange,[x,6,0]);disc.rotateZ(Math.PI/2);}for(let x=-3.8;x<4;x+=.6)ring(tms,[x,6,0],4.5,.18,C.orange,new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2));
 const tether=group('tether','rov');tube(tether,[[-115,-114,270],[-130,-146,284],[-123,-183,283],[-110,F+26,270]],.25,C.orange,70);tube(tether,[[-130,20,27],[-145,-45,140],[-125,-90,250],[-115,-107,270]],.5,C.black,70);
 for(const b of buckets.values()){const m=new T.InstancedMesh(b.geometry,b.material,b.matrices.length);b.matrices.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.computeBoundingSphere();b.parent.add(m);}
 const flowGroup=new T.Group();flowGroup.name='Partículas ilustrativas';root.add(flowGroup);
 const particleSets=new Map<SubseaLayer,T.InstancedMesh>();for(const layer of ['production','injection','control'] as SubseaLayer[]){const n=curves.filter(c=>c.layer===layer).reduce((a,c)=>a+c.count,0);const pm=new T.MeshBasicMaterial({color:layerColor[layer]});const particles=new T.InstancedMesh(new T.SphereGeometry(1,6,4),pm,n);particles.frustumCulled=false;flowGroup.add(particles);particleSets.set(layer,particles);}flowGroup.visible=false;
 let lastSelected='',lastWire=false;
 function update(state:SubseaState,time:number){
  for(const g of groups.values())g.visible=state.visible[g.userData.layer as SubseaLayer];
  for(const e of explosion)e.g.position.copy(e.base).addScaledVector(e.offset,state.explosion/100);
  if(lastSelected!==state.selected||lastWire!==state.wireframe){for(const m of materials){m.wireframe=state.wireframe;m.emissive.set(m.userData.subseaId===state.selected?0x69cbd0:0x000000);m.emissiveIntensity=.28;}lastSelected=state.selected;lastWire=state.wireframe;}
  flowGroup.visible=state.flow;for(const [layer,particles] of particleSets){particles.visible=state.visible[layer]&&(state.circuit==='all'||state.circuit===layer);let index=0;for(const c of curves.filter(c=>c.layer===layer))for(let i=0;i<c.count;i++){const point=c.curve.getPointAt(T.MathUtils.euclideanModulo(time*.055+i/c.count+c.offset,1));d.position.copy(point);d.scale.setScalar(layer==='control'?.45:.9);d.quaternion.identity();d.updateMatrix();particles.setMatrixAt(index++,d.matrix);}particles.instanceMatrix.needsUpdate=true;}
  for(const p of propellers){if(p.userData.vertical)p.rotation.y=time*8;else p.rotation.z=time*8;}
 }
 function findAsset(object:T.Object3D){let o:T.Object3D|null=object;while(o&&o!==root){if(o.userData.subseaId){let id=o.userData.subseaId as string;if(subseaAssets.some(a=>a.id===id))return id;if(id.startsWith('scm-'))return 'scm';if(id.startsWith('anchor-'))return 'anchor';if(id.includes('inj'))return id.includes('riser')||id.includes('buoyancy')?'riser-inj':'man-inj';if(id.startsWith('jumper-'))return 'well-lines';if(id==='tether')return 'tms';}o=o.parent;}return null;}
 return {root,groups,materials,curves,update,findAsset};
}
