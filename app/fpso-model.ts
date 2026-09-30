import * as T from "three";
import { buildSubseaField } from "./subsea-model";
import type { SystemId } from "./fpso-data";

type V3 = [number, number, number];
export const OFFLOADING_POINTS:V3[]=[[-159,20,19],[-178,5,22],[-195,1.15,25],[-244,1.1,29],[-300,1.15,6],[-347,1.4,-31],[-375,10,-45]];
type Bucket = { parent: T.Group; geometry: T.BufferGeometry; material: T.MeshStandardMaterial; matrices: T.Matrix4[] };
export type ModelPart = { group: T.Group; base: T.Vector3; offset: T.Vector3 };
export type FPSOModel = { vessel: T.Group; parts: Record<SystemId, ModelPart>; cranes: T.Group[]; flame: T.Mesh<T.ConeGeometry, T.ShaderMaterial>; lamps: T.MeshStandardMaterial[]; materials: T.MeshStandardMaterial[] };
const C = { hull: 0x293840, rust: 0xa95038, deck: 0x56676c, steel: 0xb9c9cb, frame: 0x869a9c, yellow: 0xeab647, pipe: 0xc4ccbd, teal: 0x438f91, white: 0xe0e9e7, dark: 0x263d46, orange: 0xf17e35, rail: 0xedc45b, glass: 0x1b4857 };

export function buildFPSO(options: { subsea?: boolean } = {}): FPSOModel {
  const vessel = new T.Group(); vessel.name = "FPSO Atlântico — 320 × 60 m";
  const buckets = new Map<string, Bucket>();
  const mats = new Map<string, T.MeshStandardMaterial>();
  const geometries: Record<string, T.BufferGeometry> = { box: new T.BoxGeometry(1,1,1), cylinder: new T.CylinderGeometry(1,1,1,12), sphere: new T.SphereGeometry(1,12,8), cone: new T.ConeGeometry(1,1,12) };
  const dummy = new T.Object3D();
  const lamps: T.MeshStandardMaterial[] = [];
  const cranes: T.Group[] = [];
  const parts = {} as Record<SystemId, ModelPart>;
  const v = (p: V3) => new T.Vector3(...p);
  function part(id: SystemId, position: V3, offset: V3) { const group = new T.Group(); group.name = id; group.userData.system = id; group.position.copy(v(position)); vessel.add(group); parts[id] = { group, base: v(position), offset: v(offset) }; return group; }
  function material(parent: T.Group, color: number, glow = false) {
    const key = `${parent.uuid}:${color}:${glow}`;
    if (!mats.has(key)) { const mat = new T.MeshStandardMaterial({ color, roughness: .52, metalness: .22, ...(glow ? { emissive: color, emissiveIntensity: .25 } : {}) }); mats.set(key, mat); if (glow) lamps.push(mat); }
    return mats.get(key)!;
  }
  function add(parent: T.Group, kind: string, color: number, position: V3, scale: V3, quaternion?: T.Quaternion, glow = false) {
    const key = `${parent.uuid}:${kind}:${color}:${glow}`;
    if (!buckets.has(key)) buckets.set(key, { parent, geometry: geometries[kind], material: material(parent,color,glow), matrices: [] });
    dummy.position.set(...position); dummy.scale.set(...scale); dummy.quaternion.copy(quaternion || new T.Quaternion()); dummy.updateMatrix(); buckets.get(key)!.matrices.push(dummy.matrix.clone());
  }
  function box(g:T.Group,x:number,y:number,z:number,sx:number,sy:number,sz:number,c:number,ry=0,glow=false){add(g,"box",c,[x,y,z],[sx,sy,sz],new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),ry),glow);}
  function sphere(g:T.Group,p:V3,s:V3,c:number,glow=false){add(g,"sphere",c,p,s,undefined,glow);}
  function rod(g:T.Group,a:V3,b:V3,r:number,c:number){const av=v(a),bv=v(b),dir=bv.clone().sub(av);add(g,"cylinder",c,av.add(bv).multiplyScalar(.5).toArray() as V3,[r,dir.length(),r],new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize()));}
  function pipe(g:T.Group,points:V3[],r:number,c:number){for(let i=1;i<points.length;i++)rod(g,points[i-1],points[i],r,c);for(let i=1;i<points.length-1;i++)sphere(g,points[i],[r,r,r],c);}
  function rail(g:T.Group,a:V3,b:V3,height=1.6){const av=v(a),bv=v(b);for(const h of [.6,height])rod(g,[a[0],a[1]+h,a[2]],[b[0],b[1]+h,b[2]],.09,C.rail);const n=Math.ceil(av.distanceTo(bv)/4);for(let i=0;i<=n;i++){const p=av.clone().lerp(bv,i/n);rod(g,p.toArray() as V3,[p.x,p.y+height,p.z],.085,C.rail);}}
  function platform(g:T.Group,x:number,y:number,z:number,l:number,w:number){box(g,x,y,z,l,.55,w,C.frame);for(const dz of [-w/2,w/2])rail(g,[x-l/2,y+.3,z+dz],[x+l/2,y+.3,z+dz]);for(const dx of [-l/2,l/2])rail(g,[x+dx,y+.3,z-w/2],[x+dx,y+.3,z+w/2]);}
  function frame(g:T.Group,l:number,w:number,h:number){platform(g,0,1,0,l,w);platform(g,0,h,0,l,w);for(let x=-l/2+1;x<=l/2;x+=l/4){for(const z of [-w/2+1,w/2-1]){box(g,x,h/2,z,.65,h,.65,C.frame);if(x+l/4<=l/2)rod(g,[x,1,z],[x+l/4,h,z],.14,C.frame);}}for(const y of [h/2,h])for(const z of [-w/2,w/2])box(g,0,y,z,l,.4,.4,C.frame);}
  function stairs(g:T.Group,x:number,y:number,z:number,rise:number,run:number,width=2){
    const n=Math.ceil(rise/.32);for(let i=0;i<n;i++)box(g,x+run*(i+.5)/n,y+rise*(i+1)/n,z,Math.abs(run/n+.08),.13,width,C.frame);
    for(const dz of [-width/2,width/2]){rod(g,[x,y,z+dz],[x+run,y+rise,z+dz],.13,C.frame);rail(g,[x,y,z+dz],[x+run,y+rise,z+dz],1.3);}
  }
  function moduleFrame(g:T.Group,x:number,l:number,w:number,h:number){
    for(const y of [1,12,h]){
      for(const z of [-w/2,w/2]){box(g,x,y,z,l,.55,2.2,C.frame);rail(g,[x-l/2,y+.3,z],[x+l/2,y+.3,z]);}
      for(const dx of [-l/2,l/2])box(g,x+dx,y,0,2,.55,w,C.frame);
      for(let dx=-l/2;dx<=l/2;dx+=l/3)box(g,x+dx,y,0,.4,.6,w,C.frame);
    }
    for(const dx of [-l/2,-l/6,l/6,l/2])for(const z of [-w/2,w/2])box(g,x+dx,h/2,z,.6,h,.6,C.steel);
    for(const z of [-w/2,w/2])for(let dx=-l/2;dx<l/2-.1;dx+=l/3)for(const y of [1,12]){
      const top=y===1?12:h;rod(g,[x+dx,y,z],[x+dx+l/3,top,z],.18,C.frame);rod(g,[x+dx,top,z],[x+dx+l/3,y,z],.18,C.frame);
    }
    stairs(g,x-l/2,1,-w/2-2,11,l*.7);stairs(g,x+l/2,12,w/2+1.5,h-12,-l*.7);
  }
  function cooler(g:T.Group,x:number,y:number,z:number,l:number,w:number){
    box(g,x,y,z,l,2.2,w,C.dark);for(let dx=-l/2+1;dx<l/2;dx+=1.1)box(g,x+dx,y+1.2,z,.12,.12,w-.5,C.steel);
    for(const dx of [-l*.24,l*.24]){add(g,"cylinder",C.frame,[x+dx,y+1.6,z],[w*.38,.55,w*.38]);for(let k=0;k<3;k++)box(g,x+dx,y+1.94,z,w*.67,.08,.45,C.dark,k*Math.PI/3);}
  }
  function vesselTank(g:T.Group,x:number,y:number,z:number,length:number,r:number,c:number){rod(g,[x-length/2,y,z],[x+length/2,y,z],r,c);sphere(g,[x-length/2,y,z],[r*.6,r,r],c);sphere(g,[x+length/2,y,z],[r*.6,r,r],c);for(const dx of [-length*.32,length*.32]){box(g,x+dx,y-r-.8,z,1.5,1.6,r*1.5,C.dark);}}
  function tower(g:T.Group,x:number,z:number,h:number,r:number,c:number){rod(g,[x,1,z],[x,h,z],r,c);sphere(g,[x,h,z],[r,r*.65,r],c);for(let y=5;y<h;y+=6){rod(g,[x-r-1,y,z],[x+r+1,y,z],.13,C.steel);box(g,x,y,z,r*2+2,.18,r*2+2,C.frame);}for(let y=1;y<h;y+=.8)rod(g,[x+r+.4,y,z-.6],[x+r+.4,y,z+.6],.055,C.steel);for(const dz of [-.7,.7])rod(g,[x+r+.4,1,z+dz],[x+r+.4,h,z+dz],.085,C.steel);}
  function textLabel(g:T.Group,text:string,p:V3,width:number,height:number,rotationY=0,color="#e9eddd"){
    if(typeof document==="undefined")return;
    const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=128;const ctx=canvas.getContext("2d");if(!ctx)return;ctx.fillStyle=color;ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="600 74px Arial";ctx.fillText(text,512,64);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const m=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});const mesh=new T.Mesh(new T.PlaneGeometry(width,height),m);mesh.position.set(...p);mesh.rotation.y=rotationY;g.add(mesh);
  }
  const hull=part("hull",[0,0,0],[0,0,0]);
  const sections=[[-160,.73],[-155,.88],[-144,.98],[-122,1],[-80,1],[-30,1],[25,1],[78,1],[113,.95],[139,.69],[153,.32],[160,.015]];
  function hullBand(low:number,high:number,lowerWidth:number,upperWidth:number,color:number,parent=hull,lengthScale=1,beamScale=1){
    const pos:number[]=[],indices:number[]=[];
    for(const [x,w]of sections){const upper=30*w*upperWidth*beamScale,lower=30*w*lowerWidth*beamScale;for(const [y,z]of [[high,-upper],[low+1,-lower],[low,-lower*.83],[low,lower*.83],[low+1,lower],[high,upper]])pos.push(x*lengthScale,y,z);}
    for(let i=0;i<sections.length-1;i++)for(let j=0;j<6;j++){const a=i*6+j,b=i*6+(j+1)%6,c=(i+1)*6+j,d=(i+1)*6+(j+1)%6;indices.push(a,c,b,b,c,d);}
    for(let j=1;j<5;j++){indices.push(0,j,j+1);const k=(sections.length-1)*6;indices.push(k,k+j+1,k+j);}
    const geo=new T.BufferGeometry();geo.setAttribute("position",new T.Float32BufferAttribute(pos,3));geo.setIndex(indices);geo.computeVertexNormals();
    const mat=material(parent,color);mat.side=T.DoubleSide;const mesh=new T.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
  }
  hullBand(-17,-2,.66,.94,C.rust);hullBand(-2,11.4,.94,1,C.hull);hullBand(11.4,12,1,1,C.deck);
  // Deck walks, pipe racks and storage access repeat parametrically along the hull.
  for(const z of [-28.8,28.8]){box(hull,-14,12.35,z,261,.18,1.3,C.rail);rail(hull,[-145,12.5,z],[113,12.5,z]);for(let x=-134;x<113;x+=8)box(hull,x,12.8,z,1.8,.55,.65,C.dark);}
  for(let i=1;i<sections.length;i++){const [x0,w0]=sections[i-1],[x1,w1]=sections[i];if(x0>=113)for(const s of [-1,1])rail(hull,[x0,12.5,29.5*w0*s],[x1,12.5,29.5*w1*s]);}
  for(let x=-98;x<113;x+=16){box(hull,x,12.3,0,8,.35,5,C.dark);add(hull,"cylinder",C.steel,[x,13.1,0],[1.6,1.2,1.6]);box(hull,x,12.8,24,4,.8,2,C.white);}
  for(const y of [18,27,36])for(let i=0;i<8;i++){const z=-5.2+i*1.4;pipe(hull,[[-104,y,z],[105,y,z],[112,y-4,z]],i%3===0?.44:.25,i%4===0?C.teal:C.pipe);}
  for(let x=-104;x<=108;x+=14){for(const z of [-7,7])box(hull,x,24,z,.5,24,.5,C.frame);for(const y of [18,27,36])box(hull,x,y-.8,0,.5,.65,15,C.frame);for(const z of [-7,7]){rod(hull,[x,13,z],[x+14,26,z],.16,C.frame);rod(hull,[x,26,z],[x+14,35,z],.16,C.frame);}}
  for(const z of [-7.6,7.6]){box(hull,2,36,z,212,.25,1.4,C.frame);rail(hull,[-104,36,z],[108,36,z]);}
  for(let x=-141;x<=118;x+=22)for(const z of [-28,28]){box(hull,x,15.2,z,.15,6,.15,C.frame);box(hull,x,18.2,z,.5,.4,.5,0xffd399,0,true);}
  textLabel(hull,"FPSO ATLÂNTICO",[-27,5.7,30.12],69,6);textLabel(hull,"FPSO ATLÂNTICO",[-27,5.7,-30.12],69,6,Math.PI);
  for(const z of [-29,29]){box(hull,119,7,z,5,1.3,.2,C.white);for(let y=1;y<11;y+=2)box(hull,109,y,z,1.5,.18,.3,C.white);}
  const process=part("process",[-48,13,15],[0,50,44]);
  for(const x of [-36,-3,30]){
    moduleFrame(process,x,30,20,25);vesselTank(process,x,6,0,23,3.4,C.pipe);vesselTank(process,x,17,0,21,2.8,C.steel);
    cooler(process,x,26.5,0,21,8);
    for(const dx of [-8,7]){pipe(process,[[x+dx,6,0],[x+dx,10,-5],[x+dx,21,-5],[x+dx+4,21,-5],[x+dx+4,17,0]],.4,C.teal);add(process,"cylinder",C.dark,[x+dx,9.7,0],[.7,.6,.7]);sphere(process,[x+dx,21,-5],[.75,.55,.75],C.orange);}
    for(let i=0;i<4;i++){vesselTank(process,x-10+i*6,3,8,4,1,C.teal);pipe(process,[[x-10+i*6,3,8],[x-10+i*6,10,8],[x+11,10,8]],.18,C.pipe);}
    for(const z of [-8,8])for(const y of [8,20,23])pipe(process,[[x-14,y,z],[x+14,y,z]],.18,C.pipe);
  }
  for(const x of [50,59]){tower(process,x,0,x===50?34:28,2.3,C.steel);pipe(process,[[x,26,0],[x,30,8],[30,30,8]],.35,C.pipe);}
  const gas=part("gas",[-13,13,-16],[9,74,-43]);
  for(const x of [-67,-36,-5,26]){
    moduleFrame(gas,x,28,20,29);box(gas,x,5,0,20,7,10,C.teal);
    for(let dx=-8;dx<=8;dx+=2)box(gas,x+dx,8.7,0,.22,.2,9,C.steel);
    vesselTank(gas,x,17,0,18,2.6,C.steel);cooler(gas,x,30.5,0,22,8);
    for(const z of [-7,7]){pipe(gas,[[x-10,5,z],[x-10,24,z],[x+10,24,z],[x+10,17,0]],.44,C.pipe);for(const dx of [-5,5]){add(gas,"cylinder",C.orange,[x+dx,24.5,z],[.7,.6,.7]);pipe(gas,[[x+dx,24,z],[x+dx,27,z],[x+dx,27,z+2]],.18,C.teal);}}
  }
  for(const [x,h,r]of [[47,38,3.1],[57,32,2.5],[66,24,2]])tower(gas,x,0,h,r,C.steel);
  const utilities=part("utilities",[79,13,1],[43,36,20]);
  frame(utilities,58,48,5);
  for(const z of [-13,13]){box(utilities,-5,11,z,31,10,15,C.white);for(let x=-17;x<11;x+=3)box(utilities,x,14,z+(z>0?7.6:-7.6),1.4,3,.18,C.dark);for(const x of [-14,4]){rod(utilities,[x,16,z],[x,37,z],1.75,C.steel);rod(utilities,[x,20,z],[x,25,z],2.25,C.dark);add(utilities,"cylinder",C.dark,[x,37.2,z],[1.6,.4,1.6]);}platform(utilities,-5,18,z,33,16);for(const x of [-22,12])for(const dz of [-7,7])box(utilities,x,17,z+dz,.5,26,.5,C.frame);for(const dz of [-7,7]){box(utilities,-5,29,z+dz,35,.5,.5,C.frame);rod(utilities,[-22,18,z+dz],[12,29,z+dz],.2,C.frame);}for(let x=-16;x<15;x+=5)box(utilities,x,16.15,z,3,.3,11,C.dark);}
  for(const z of [-22,22])for(const y of [8,21])pipe(utilities,[[-26,y,z],[25,y,z],[25,y+4,z]],.3,C.pipe);
  stairs(utilities,-27,5,0,13,23,2.3);
  for(const z of [-15,0,15])tower(utilities,23,z,17,3.7,z===0?C.teal:C.pipe);
  function crane(x:number,z:number,direction:number){
    const g=new T.Group();g.position.set(x,0,z);utilities.add(g);add(g,"cylinder",C.dark,[0,4,0],[4,8,4]);add(g,"cylinder",C.yellow,[0,9,0],[4.7,3,4.7]);
    const pivot=new T.Group();pivot.position.y=10;pivot.rotation.y=direction;pivot.userData.rest=direction;g.add(pivot);cranes.push(pivot);box(pivot,-1,3,0,10,6,8,C.yellow);box(pivot,1,4,4.1,3,2,.2,C.glass);box(pivot,-6,2,0,5,4,8,C.dark);
    const start:V3[]=[[1,3,-2],[1,3,2],[1,7,0]],end:V3[]=[[38,19,-1],[38,19,1],[38,21,0]];
    for(let i=0;i<3;i++)rod(pivot,start[i],end[i],.26,C.yellow);
    for(let j=0;j<10;j++){const t=j/10,tn=(j+1)/10;for(let i=0;i<3;i++){const a=v(start[i]).lerp(v(end[i]),t),b=v(start[(i+1)%3]).lerp(v(end[(i+1)%3]),tn);rod(pivot,a.toArray() as V3,b.toArray() as V3,.12,C.yellow);}}
    rod(pivot,[-3,7,0],[8,22,0],.25,C.yellow);rod(pivot,[8,22,0],[38,20,0],.07,C.dark);rod(pivot,[38,19,0],[38,2,0],.09,C.dark);add(pivot,"cylinder",C.yellow,[38,1.5,0],[.9,1.8,.9]);rod(pivot,[38,1,0],[38,-.5,0],.2,C.dark);
  }
  crane(-48,26,Math.PI*.24);crane(-129,-26,Math.PI*1.16);
  const living=part("living",[-128,13,0],[-47,36,-8]);
  box(living,0,3,0,40,6,48,C.white);box(living,1,18,0,35,24,44,C.white);box(living,-1,32,0,39,4,47,C.white);box(living,3,36,0,26,4,35,C.white);platform(living,3,38.3,0,28,37);
  for(let y=8;y<=28;y+=4){for(const z of [-22.12,22.12]){box(living,1,y-2,z,35,.35,.3,C.frame);for(let x=-13;x<=15;x+=4)box(living,x,y,z,2,1.35,.25,C.glass);}for(const x of [-16.65,18.65])for(let z=-18;z<=18;z+=4)box(living,x,y,z,.25,1.35,2,C.glass);}
  for(const z of [-23.65,23.65]){box(living,-1,32.6,z,35,1.5,.23,C.glass);rail(living,[-20,34.3,z],[19,34.3,z]);}
  for(const x of [-20.65,18.65])box(living,x,32.6,0,.2,1.5,43,C.glass);
  for(const z of [-25,25]){platform(living,1,6,z,40,4);for(let floor=0;floor<6;floor++){const y=6+floor*4;platform(living,22,y,z,5,5);stairs(living,floor%2===0?18:25,y,z,4,floor%2===0?7:-7,2.3);}for(const x of [19.5,24.5])box(living,x,18,z,.4,25,.4,C.frame);}
  for(const z of [-13,0,13]){box(living,9,40,z,7,3,7,C.white);for(let i=0;i<5;i++)box(living,12.55,40,z-2+i,.12,2.4,.24,C.dark);}
  const heli=new T.Mesh(new T.CylinderGeometry(22,22,.7,8),material(living,0x2f8879));heli.position.set(-31,29,0);heli.rotation.y=Math.PI/8;heli.receiveShadow=true;heli.castShadow=true;living.add(heli);
  const ring=new T.Mesh(new T.TorusGeometry(16,.3,5,72),material(living,C.white));ring.rotation.x=Math.PI/2;ring.position.set(-31,29.42,0);living.add(ring);
  box(living,-36,29.45,0,1.3,.08,12,C.white);box(living,-26,29.45,0,1.3,.08,12,C.white);box(living,-31,29.45,0,9,.08,1.3,C.white);
  for(let i=0;i<16;i++){const a=i*Math.PI/8;box(living,-31+20.1*Math.cos(a),29.42,20.1*Math.sin(a),1.8,.1,.4,C.white,-a);sphere(living,[-31+21.5*Math.cos(a),29.6,21.5*Math.sin(a)],[.24,.24,.24],0x78ffb6,true);}
  for(const z of [-13,13]){rod(living,[-15,10,z],[-40,28.5,z],.7,C.frame);rod(living,[-18,20,z],[-48,28.5,z],.6,C.frame);}
  for(const z of [-29,29])for(const x of [-9,6]){sphere(living,[x,8,z],[6.6,2.7,2.9],C.orange);box(living,x,9.2,z,4.8,2,3.6,C.orange);box(living,x,9.9,z+(z>0?1.9:-1.9),3.2,.9,.15,C.glass);for(const dx of [-4,4]){rod(living,[x+dx,1,z*.85],[x+dx,12,z*.85],.25,C.frame);rod(living,[x+dx,12,z*.85],[x+dx,12,z],.25,C.frame);}}
  rod(living,[-4,38,0],[-4,52,0],.3,C.white);rod(living,[-9,46,0],[1,46,0],.17,C.white);rod(living,[-4,47,-5],[-4,47,5],.17,C.white);sphere(living,[-4,41,12],[2.6,2.6,2.6],C.white);sphere(living,[-4,41,-12],[2,2,2],C.white);box(living,-4,52,0,.6,.7,.6,0xff6251,0,true);
  const flare=part("flare",[137,13,0],[48,52,0]);
  const base:V3[]=[[0,0,-4],[0,0,4],[0,7,0]],tip:V3[]=[[47,48,-1],[47,48,1],[46,51,0]];
  for(let k=0;k<3;k++)rod(flare,base[k],tip[k],.5,C.yellow);
  for(let j=0;j<12;j++)for(let k=0;k<3;k++){const a=v(base[k]).lerp(v(tip[k]),j/12),b=v(base[(k+1)%3]).lerp(v(tip[(k+1)%3]),(j+1)/12);rod(flare,a.toArray() as V3,b.toArray() as V3,.17,C.yellow);}
  rod(flare,[0,2,0],[47,51,0],.9,C.dark);rod(flare,[47,51,0],[47,55,0],1.2,C.dark);
  const flameMat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,uniforms:{uTime:{value:0}},vertexShader:`uniform float uTime; varying float vH; void main(){ vec3 p=position; vH=(p.y+5.0)/10.0; p.x+=sin(p.y*1.4+uTime*9.0)*.45*vH; p.z+=cos(p.y*1.1+uTime*7.0)*.4*vH; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,fragmentShader:`varying float vH; void main(){ vec3 c=mix(vec3(1.,.95,.48),vec3(1.,.23,.025),smoothstep(.1,1.,vH)); float a=.85*(1.-smoothstep(.65,1.,vH)); gl_FragColor=vec4(c,a); }`});
  const flame=new T.Mesh(new T.ConeGeometry(2.4,10,14,8),flameMat);flame.position.set(47,59.5,0);flare.add(flame);
  const glow=new T.PointLight(0xff8c32,100,35,2);glow.position.set(47,57,0);flare.add(glow);
  const subsea=part("subsea",[0,0,0],[0,-7,0]);
  function tube(g:T.Group,pts:V3[],r:number,c:number){const geo=new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(v)),48,r,6,false);const mesh=new T.Mesh(geo,material(g,c));g.add(mesh);}
  // Conceptual tandem offloading: stern station, floating hose, hawser and shuttle tanker.
  const offloading=part("offloading",[0,0,0],[0,0,0]);
  platform(offloading,-149,13,18,17,18);box(offloading,-145,16,17,7,6,6,C.white);
  for(const z of [11,21]){const reel=new T.Mesh(new T.TorusGeometry(7.4,.45,6,48),material(offloading,C.frame));reel.position.set(-153,23,z);offloading.add(reel);for(let i=0;i<10;i++){const a=i*Math.PI/5;rod(offloading,[-153,23,z],[-153+7.4*Math.cos(a),23+7.4*Math.sin(a),z],.17,C.frame);}rod(offloading,[-159,13,z],[-153,23,z],.45,C.frame);rod(offloading,[-146,13,z],[-153,23,z],.45,C.frame);}
  for(let z=12;z<=20;z+=1){const coil=new T.Mesh(new T.TorusGeometry(6.9,.55,6,48),material(offloading,C.orange));coil.position.set(-153,23,z);offloading.add(coil);}
  rod(offloading,[-153,23,10],[-153,23,22],1.3,C.dark);
  const hosePoints=OFFLOADING_POINTS;
  tube(offloading,hosePoints,.85,C.dark);const hoseCurve=new T.CatmullRomCurve3(hosePoints.map(v));
  for(let i=8;i<69;i+=2){const t=i/72,p=hoseCurve.getPoint(t),d=hoseCurve.getTangent(t);rod(offloading,p.clone().addScaledVector(d,-1.2).toArray() as V3,p.clone().addScaledVector(d,1.2).toArray() as V3,1.35,C.orange);}
  tube(offloading,[[-158,15,-13],[-210,3,-22],[-293,2,-36],[-375,10,-49]],.18,C.rail);
  const tanker=new T.Group();tanker.position.set(-482,0,-45);offloading.add(tanker);
  hullBand(-12,-1,.68,.94,0xa74332,tanker,.67,.66);hullBand(-1,8.8,.94,1,0x24343c,tanker,.67,.66);hullBand(8.8,9.3,1,1,0x795f54,tanker,.67,.66);
  box(tanker,-75,16,0,25,14,31,C.white);box(tanker,-77,25,0,30,4,34,C.white);box(tanker,-79,29,0,16,4,25,C.white);box(tanker,-72,34,0,8,7,10,C.orange);box(tanker,-72,38,0,8,1,10,C.dark);
  for(const z of [-17.15,17.15])box(tanker,-77,25,z,27,1.5,.2,C.glass);
  for(const z of [-15.6,15.6])for(const y of [13,17,21])for(let x=-84;x<-65;x+=4)box(tanker,x,y,z,1.8,1.2,.15,C.glass);
  for(const z of [-18,18]){rail(tanker,[-96,9.8,z],[73,9.8,z]);sphere(tanker,[-63,13,z],[5,2,2],C.orange);}
  for(const x of [-43,-22,-1,20,41,62]){add(tanker,"cylinder",C.frame,[x,10.1,0],[2.2,1.6,2.2]);for(const z of [-11,11]){add(tanker,"cylinder",C.pipe,[x,10,z],[1.5,1,1.5]);pipe(tanker,[[x,10,z],[x,12,z],[x,12,0]],.22,C.pipe);}}
  for(const z of [-3,-1,1,3])pipe(tanker,[[-51,11,z],[77,11,z],[91,10,z]],.3,C.pipe);
  for(const x of [-94,84]){rod(tanker,[x,10,0],[x,29,0],.25,C.white);rod(tanker,[x,23,-4],[x,23,4],.14,C.white);box(tanker,x,29,0,.6,.6,.6,0xffd399,0,true);}
  for(const z of [-3,3]){box(tanker,97,10,z,6,1.4,3,C.frame);rod(tanker,[100,10,z],[102,12,z],.7,C.dark);}
  const field=options.subsea===false?null:buildSubseaField();
  if(field)subsea.add(field.root);
  for(const b of buckets.values()){const mesh=new T.InstancedMesh(b.geometry,b.material,b.matrices.length);b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();b.parent.add(mesh);}
  return {vessel,parts,cranes,flame,lamps,materials:[...mats.values(),...(field?.materials||[])]};
}
