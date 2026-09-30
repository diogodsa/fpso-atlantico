import * as T from "three";
import { clamp, supplySnapshot, type SupplyCameraView, type SupplySceneState } from "./supply-data";

type Point = [number, number, number];
export const AIR_ROUTE: Point[] = [[-690,15.4,-105],[-670,85,-116],[-510,133,-170],[-330,119,-112],[-180,75,-30],[-159,46.3,0]];
export const SEA_ROUTE: Point[] = [[-631,2,129],[-529,2,197],[-290,2,181],[-40,2,130],[30,2,88]];
export const SUPPLY_CAMERAS: Record<SupplyCameraView, { eye: Point; target: Point }> = {
  network: { eye: [-130,650,1000], target: [-340,24,15] },
  base: { eye: [-455,255,340], target: [-699,14,0] },
  air: { eye: [-320,205,285], target: [-166,55,0] },
  sea: { eye: [191,160,293], target: [20,24,56] },
  work: { eye: [-122,118,191], target: [-55,28,24] },
};

export function buildSupplyLayer() {
  const root = new T.Group(); root.name = "Supply chain — pintura";
  const C = { white: 0xe4ece8, dark: 0x17333e, steel: 0x849b9d, deck: 0x596f78, orange: 0xf5a34d, mint: 0x71e6cd, blue: 0x448fac, glass: 0x144553, rail: 0xe9c566 };
  const geometries = { box: new T.BoxGeometry(1,1,1), sphere: new T.SphereGeometry(1,12,8), cylinder: new T.CylinderGeometry(1,1,1,12) };
  const materials = new Map<number,T.MeshStandardMaterial>();
  const buckets = new Map<string,{ parent:T.Group; kind:keyof typeof geometries; color:number; matrices:T.Matrix4[] }>();
  const dummy = new T.Object3D(), up = new T.Vector3(0,1,0);
  const vec = (p:Point) => new T.Vector3(...p);
  function material(color:number) { if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.57,metalness:.16}));return materials.get(color)!; }
  function add(g:T.Group,kind:keyof typeof geometries,color:number,p:Point,s:Point,q=new T.Quaternion()) {
    const key=`${g.uuid}:${kind}:${color}`;if(!buckets.has(key))buckets.set(key,{parent:g,kind,color,matrices:[]});
    dummy.position.set(...p);dummy.scale.set(...s);dummy.quaternion.copy(q);dummy.updateMatrix();buckets.get(key)!.matrices.push(dummy.matrix.clone());
  }
  function box(g:T.Group,p:Point,s:Point,c:number,ry=0) { add(g,"box",c,p,s,new T.Quaternion().setFromAxisAngle(up,ry)); }
  function ellipsoid(g:T.Group,p:Point,s:Point,c:number) { add(g,"sphere",c,p,s); }
  function rod(g:T.Group,a:Point,b:Point,r:number,c:number) { const delta=vec(b).sub(vec(a));add(g,"cylinder",c,vec(a).lerp(vec(b),.5).toArray() as Point,[r,delta.length(),r],new T.Quaternion().setFromUnitVectors(up,delta.normalize())); }
  function group(p:Point,parent=root) { const g=new T.Group();g.position.set(...p);parent.add(g);return g; }
  function rail(g:T.Group,a:Point,b:Point) { rod(g,[a[0],a[1]+1.7,a[2]],[b[0],b[1]+1.7,b[2]],.13,C.rail);const n=Math.max(1,Math.ceil(vec(a).distanceTo(vec(b))/5));for(let i=0;i<=n;i++){const p=vec(a).lerp(vec(b),i/n);rod(g,p.toArray() as Point,[p.x,p.y+1.7,p.z],.12,C.rail);} }
  function container(g:T.Group,p:Point,color:number,length=12) { box(g,[p[0],p[1]+3,p[2]],[length,6,6],color);for(let x=-length/2+1;x<length/2;x+=1.2)for(const z of [-3.03,3.03])box(g,[p[0]+x,p[1]+3,p[2]+z],[.16,5.6,.16],C.steel); }
  function person(g:T.Group,x:number,z:number) { box(g,[x,1.5,z],[.8,1.05,.5],C.orange);ellipsoid(g,[x,2.4,z],[.34,.34,.34],0xc49c80);ellipsoid(g,[x,2.61,z],[.4,.17,.4],C.white);for(const s of [-1,1]){rod(g,[x+s*.22,.1,z],[x+s*.22,1,z],.17,C.dark);rod(g,[x+s*.62,.85,z],[x+s*.5,1.9,z],.14,C.orange);}box(g,[x,1.65,z+.27],[.83,.16,.06],C.rail); }
  function label(text:string,p:Point,color:string,width=116) {
    if(typeof document==="undefined")return;
    const canvas=document.createElement("canvas");canvas.width=768;canvas.height=112;const ctx=canvas.getContext("2d");if(!ctx)return;
    ctx.fillStyle="rgba(6,25,36,.94)";ctx.fillRect(0,0,768,112);ctx.fillStyle=color;ctx.fillRect(0,0,8,112);ctx.font="600 36px Arial";ctx.textBaseline="middle";ctx.textAlign="center";ctx.fillText(text,390,57,724);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthWrite:false,depthTest:false}));sprite.position.set(...p);sprite.scale.set(width,width*112/768,1);sprite.renderOrder=4;root.add(sprite);
  }

  const base=group([-700,0,0]);
  box(base,[0,1,0],[270,15,326],0x354d57);box(base,[0,9,0],[263,1,319],0x687b80);
  box(base,[110,10,65],[55,2,136],0xb4bdb2);box(base,[72,10,127],[120,2,22],C.steel);
  for(let z=10;z<137;z+=18)box(base,[139,7,z],[2,7,5],C.dark);
  for(const z of [-38,22]){box(base,[-40,10,z],[160,.2,13],C.dark);for(let x=-110;x<70;x+=20)box(base,[x,10.2,z],[9,.1,.7],C.rail);}
  for(const x of [-88,-6]){box(base,[x,25,77],[64,30,68],C.white);box(base,[x,41,77],[68,3,72],C.deck);for(let z=54;z<=100;z+=23){box(base,[x+32.1,20,z],[.2,17,15],C.dark);for(let y=13;y<27;y+=3)box(base,[x+32.3,y,z],[.12,.25,15],C.steel);} }
  for(let i=0;i<8;i++)container(base,[-100+(i%4)*38,10,-15+Math.floor(i/4)*20],i%2?C.blue:C.orange,27);
  box(base,[-80,17,-113],[56,15,51],C.white);for(let z=-130;z<-92;z+=9)box(base,[-51.8,18,z],[.15,3,5],C.glass);
  const helipad=group([10,11,-105],base);add(helipad,"cylinder",0x307d79,[0,0,0],[27,1,27]);
  const ring=new T.Mesh(new T.TorusGeometry(20,.5,5,56),material(C.white));ring.rotation.x=Math.PI/2;ring.position.y=.7;helipad.add(ring);
  for(const x of [-6,6])box(helipad,[x,.75,0],[1.7,.1,16],C.white);box(helipad,[0,.75,0],[12,.1,1.7],C.white);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;ellipsoid(helipad,[26*Math.cos(a),.8,26*Math.sin(a)],[.5,.5,.5],C.mint);}
  for(const z of [44,100]){rod(base,[105,11,z],[105,52,z],.8,C.orange);rod(base,[105,52,z],[152,52,z],.6,C.orange);rod(base,[105,38,z],[152,52,z],.4,C.orange);rod(base,[150,52,z],[150,21,z],.09,C.dark);}
  const shorePeople=group([-738,10.5,-91]);for(let i=0;i<8;i++)person(shorePeople,(i%4)*3.5,Math.floor(i/4)*4);

  const helicopter=group(AIR_ROUTE[0]);helicopter.name="Helicóptero de transporte da equipe";
  ellipsoid(helicopter,[0,0,0],[9,2.9,3.1],C.white);ellipsoid(helicopter,[6,.15,0],[3.8,2.55,2.85],C.glass);
  box(helicopter,[-.7,-.7,0],[10,1.6,6.2],C.blue);
  for(const z of [-3.04,3.04])for(const x of [-4,-1,2])box(helicopter,[x,.8,z],[2.1,1.5,.12],C.glass);
  rod(helicopter,[-7,.3,0],[-19,2,0],.75,C.white);box(helicopter,[-18.5,3.6,0],[2.6,6,.5],C.orange);box(helicopter,[-16,1.6,0],[3.5,.3,8],C.white);
  for(const z of [-1.3,1.3]){ellipsoid(helicopter,[-2,2.8,z],[4,1.05,.8],C.dark);rod(helicopter,[-4,-2,z*1.8],[-4,-3.9,z*1.8],.18,C.steel);rod(helicopter,[4,-2,z*1.8],[4,-3.9,z*1.8],.18,C.steel);rod(helicopter,[-6,-3.9,z*1.8],[6,-3.9,z*1.8],.18,C.dark);}
  rod(helicopter,[-2,2.7,0],[-2,5.2,0],.3,C.steel);
  const rotor=group([-2,5.4,0],helicopter);for(let i=0;i<5;i++)box(rotor,[0,0,0],[28,.13,.64],C.dark,i*Math.PI/5);
  const tailRotor=group([-19,3,1],helicopter);for(let i=0;i<4;i++){const a=i*Math.PI/4;rod(tailRotor,[-2.7*Math.cos(a),-2.7*Math.sin(a),0],[2.7*Math.cos(a),2.7*Math.sin(a),0],.13,C.dark);}
  ellipsoid(helicopter,[-17,6.4,0],[.23,.23,.23],C.orange);

  const boat=group(SEA_ROUTE[0]);boat.name="PSV — materiais de pintura";
  const shape=new T.Shape();shape.moveTo(-42,-12);shape.lineTo(21,-12);shape.quadraticCurveTo(44,-10,47,0);shape.quadraticCurveTo(44,10,21,12);shape.lineTo(-42,12);shape.closePath();
  const hullGeometry=new T.ExtrudeGeometry(shape,{depth:7,bevelEnabled:false,curveSegments:8});hullGeometry.rotateX(Math.PI/2);hullGeometry.translate(0,5,0);
  const hull=new T.Mesh(hullGeometry,material(C.blue));hull.castShadow=true;boat.add(hull);
  box(boat,[-8,5,0],[67,.55,22],C.deck);for(const z of [-12,12]){box(boat,[-7,1.4,z],[68,.9,.7],C.dark);rail(boat,[-41,5.4,z],[24,5.4,z]);}
  box(boat,[26,11,0],[23,12,20],C.white);box(boat,[27,18,0],[27,3,23],C.white);for(const z of [-11.6,11.6])box(boat,[27,18.3,z],[23,1.6,.2],C.glass);box(boat,[40.6,18.3,0],[.2,1.6,20],C.glass);
  box(boat,[21,23,-6],[5,8,4],C.orange);box(boat,[21,27.1,-6],[5,1,4],C.dark);rod(boat,[31,20,0],[31,34,0],.25,C.white);rod(boat,[31,29,-4],[31,29,4],.15,C.white);
  const cargoGroups:T.Group[]=[];for(let i=0;i<3;i++){const g=group([-28+i*15,5.3,0],boat);container(g,[0,0,0],i===0?C.orange:C.blue);cargoGroups.push(g);}
  for(const z of [-10,10])for(const x of [-38,-20,1])add(boat,"cylinder",C.dark,[x,5.8,z],[.65,.7,.65]);

  const airCurve=new T.CatmullRomCurve3(AIR_ROUTE.map(vec)),seaCurve=new T.CatmullRomCurve3(SEA_ROUTE.map(vec));
  const routeParticles:{curve:T.CatmullRomCurve3;mesh:T.InstancedMesh}[]=[];
  for(const [curve,color] of [[airCurve,C.mint],[seaCurve,C.orange]] as const){
    const line=new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(128)),new T.LineDashedMaterial({color,dashSize:7,gapSize:5,transparent:true,opacity:.68,depthTest:false}));line.computeLineDistances();line.renderOrder=3;root.add(line);
    const points=new T.InstancedMesh(geometries.sphere,new T.MeshBasicMaterial({color,depthTest:false}),10);points.frustumCulled=false;points.renderOrder=4;root.add(points);routeParticles.push({curve,mesh:points});
  }
  label("BASE LOGÍSTICA",[-710,84,-150],"#dbe9ed",136);
  label("EQUIPE · HELICÓPTERO",[-400,159,-160],"#77e5cf",151);
  label("MATERIAIS · PSV",[-352,25,201],"#f5b665",127);
  label("FPSO ATLÂNTICO",[23,106,0],"#dbe9ed",133);

  const destination=group([0,0,0]);box(destination,[39,13,29],[25,1,13],C.steel);
  const delivered=group([36,14,29]);container(delivered,[0,0,0],C.orange,9);container(delivered,[0,0,-7],C.blue,9);
  const disembarking=group([-174,42.8,3]);for(let i=0;i<8;i++)person(disembarking,(i%4)*3,Math.floor(i/4)*3);
  const workers=group([-65,14,28]);for(let i=0;i<8;i++)person(workers,(i%4)*5,Math.floor(i/4)*3);
  box(destination,[-54,14,28],[37,.3,7],0x985c3a);
  const painted=new T.Mesh(new T.BoxGeometry(37,.35,7),new T.MeshStandardMaterial({color:C.mint,roughness:.65,emissive:0x215b4d,emissiveIntensity:.3}));painted.position.set(-54,14.2,28);root.add(painted);
  const workOutline=new T.Box3Helper(new T.Box3(new T.Vector3(-76,14,21),new T.Vector3(-29,36,35)),C.mint);root.add(workOutline);
  const movingCargo=group([16,8,88]);container(movingCargo,[0,0,0],C.orange,8);
  const craneBase:Point=[30,30,27];rod(root,[30,13,27],craneBase,1.5,C.orange);box(root,[30,30,27],[7,6,7],C.orange);
  const beams=[0,1,2].map(()=>{const mesh=new T.Mesh(geometries.cylinder,material(C.rail));mesh.castShadow=true;root.add(mesh);return mesh;});
  const rope=new T.Line(new T.BufferGeometry().setFromPoints([vec(craneBase),vec(craneBase)]),new T.LineBasicMaterial({color:C.dark}));root.add(rope);
  for(const bucket of buckets.values()){const mesh=new T.InstancedMesh(geometries[bucket.kind],material(bucket.color),bucket.matrices.length);bucket.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();bucket.parent.add(mesh);}
  const particleMatrix=new T.Matrix4();
  function place(vehicle:T.Group,curve:T.CatmullRomCurve3,t:number){vehicle.position.copy(curve.getPoint(t));const tangent=curve.getTangent(clamp(t,.002,.998));vehicle.rotation.y=Math.atan2(-tangent.z,tangent.x);}
  function update(state:SupplySceneState,seconds:number) {
    const s=supplySnapshot(state.scenario,state.hours);
    place(helicopter,airCurve,s.airProgress);place(boat,seaCurve,s.seaProgress);
    if(s.airProgress>0&&s.airProgress<1)helicopter.rotation.z=Math.sin(s.airProgress*Math.PI)*.025;
    else helicopter.rotation.z=0;
    const rotorActive=state.hours>=s.airDeparture-.2&&state.hours<s.airArrival+.12;
    rotor.rotation.y=rotorActive?seconds*31:0;tailRotor.rotation.z=rotorActive?seconds*42:0;
    if(s.seaProgress>0&&s.seaProgress<1){boat.position.y+=Math.sin(seconds*1.1)*.2;boat.rotation.x=Math.sin(seconds*.8)*.008;}else boat.rotation.x=0;
    shorePeople.visible=state.hours<s.airDeparture;disembarking.visible=s.crewOnboard&&!s.crewAvailable;workers.visible=s.crewAvailable;
    if(workers.visible){const walk=clamp((state.hours-s.crewReady)/.15);workers.position.set(-110+45*walk,14,28);}
    delivered.visible=s.cargoOnboard;cargoGroups.forEach((g,i)=>g.visible=state.hours>=(i+1)/3&&(s.unloadProgress===0||s.unloadProgress<i/3));
    movingCargo.visible=s.unloadProgress>0&&s.unloadProgress<1;
    const t=(s.unloadProgress*3)%1,liftIndex=Math.min(2,Math.floor(s.unloadProgress*3)),pickup=vec([2+15*liftIndex,7.3,88]),high=vec([2+15*liftIndex,51,88]),across=vec([39,51,29]),drop=vec([39,14,29]);
    const cargo=t<.28?pickup.clone().lerp(high,t/.28):t<.72?high.clone().lerp(across,(t-.28)/.44):across.clone().lerp(drop,(t-.72)/.28);
    movingCargo.position.copy(cargo);
    const tip=movingCargo.visible?new T.Vector3(cargo.x,58,cargo.z):new T.Vector3(39,52,32);
    beams.forEach((beam,i)=>{const a=vec(craneBase).add(new T.Vector3(0,i===2?3:0,i===0?-1:i===1?1:0));const b=tip.clone().add(new T.Vector3(0,i===2?1:0,i===0?-.6:i===1?.6:0));const delta=b.clone().sub(a);beam.position.copy(a).lerp(b,.5);beam.scale.set(.3,delta.length(),.3);beam.quaternion.setFromUnitVectors(up,delta.normalize());});
    const attr=rope.geometry.getAttribute("position") as T.BufferAttribute;attr.setXYZ(0,tip.x,tip.y,tip.z);attr.setXYZ(1,cargo.x,cargo.y+6,cargo.z);attr.needsUpdate=true;rope.geometry.computeBoundingSphere();rope.visible=movingCargo.visible;
    painted.visible=s.paintProgress>0;painted.scale.x=Math.max(.001,s.paintProgress);painted.position.x=-72.5+18.5*s.paintProgress;
    workOutline.visible=!s.completed;
    for(const route of routeParticles){for(let i=0;i<10;i++){const p=route.curve.getPoint((seconds*.027+i/10)%1);particleMatrix.compose(p,new T.Quaternion(),new T.Vector3(1.5,1.5,1.5));route.mesh.setMatrixAt(i,particleMatrix);}route.mesh.instanceMatrix.needsUpdate=true;}
  }
  update({hours:0,scenario:"aligned"},0);
  return { root, update, helicopter, boat, workers, movingCargo, painted };
}
