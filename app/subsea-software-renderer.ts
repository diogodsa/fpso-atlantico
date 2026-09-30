import * as T from 'three';

// Projection of the same procedural geometry when WebGL is unavailable. This is a
// CPU compatibility renderer, not a second schematic or a pre-rendered image.
export class SubseaSoftwareRenderer {
 readonly domElement=document.createElement('canvas');
 private ctx:CanvasRenderingContext2D;
 private width=1;private height=1;
 private cache=new Map<string,{vertices:Float32Array;normals:Float32Array}>();
 constructor(){const ctx=this.domElement.getContext('2d');if(!ctx)throw new Error('Canvas indisponível');this.ctx=ctx;}
 setSize(w:number,h:number){this.width=Math.round(w);this.height=Math.round(h);this.domElement.width=this.width;this.domElement.height=this.height;}
 render(scene:T.Scene,camera:T.PerspectiveCamera){
  const ctx=this.ctx,w=this.width,h=this.height;ctx.fillStyle='#092331';ctx.fillRect(0,0,w,h);
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const vp=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  const faces:{points:number[];depth:number;fill:string;alpha:number;wire:boolean;background:boolean}[]=[];
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3(),world=new T.Matrix4(),im=new T.Matrix4(),pm=new T.Matrix4(),nm=new T.Matrix3();
  const sun=new T.Vector3(-.4,.85,.6).normalize();
  const color=new T.Color(); const shadeCache=new Map<string,string>(); const center=new T.Vector3(); const sphere=new T.Sphere(); const frustum=new T.Frustum().setFromProjectionMatrix(vp);
  scene.traverseVisible(o=>{
   if(!(o instanceof T.Mesh)||o.userData.skipSoftware)return;
   const material=(Array.isArray(o.material)?o.material[0]:o.material) as T.MeshStandardMaterial;
   if(!material.visible||material.opacity<.12)return;
   let cached=this.cache.get(o.geometry.uuid);
   if(!cached){const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry;cached={vertices:new Float32Array(geo.attributes.position.array as ArrayLike<number>),normals:new Float32Array((geo.attributes.normal?.array||[]) as ArrayLike<number>)};this.cache.set(o.geometry.uuid,cached);if(geo!==o.geometry)geo.dispose();}
   const count=o instanceof T.InstancedMesh?o.count:1,arr=cached.vertices;
   for(let k=0;k<count;k++){
    if(o instanceof T.InstancedMesh){o.getMatrixAt(k,im);world.multiplyMatrices(o.matrixWorld,im);}else world.copy(o.matrixWorld);
    if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();
    sphere.copy(o.geometry.boundingSphere!).applyMatrix4(world);
    if(!frustum.intersectsSphere(sphere))continue;
    const pixelRadius=sphere.radius*h/(Math.max(camera.near,camera.position.distanceTo(sphere.center))*Math.tan(camera.fov*Math.PI/360)*2);
    if(pixelRadius<.65)continue;
    pm.multiplyMatrices(vp,world);nm.getNormalMatrix(world);
    if(o.userData.softwareBackground){
     const viewWorld=new T.Matrix4().multiplyMatrices(camera.matrixWorldInverse,world);
     const baseFill=(material.color||new T.Color(0x345456)).getStyle();
     for(let i=0;i<arr.length;i+=9){
      const polygon=[new T.Vector3(arr[i],arr[i+1],arr[i+2]),new T.Vector3(arr[i+3],arr[i+4],arr[i+5]),new T.Vector3(arr[i+6],arr[i+7],arr[i+8])].map(p=>p.applyMatrix4(viewWorld));
      const clipped:T.Vector3[]=[];
      for(let j=0;j<polygon.length;j++){const p=polygon[j],q=polygon[(j+1)%polygon.length],pin=p.z<=-camera.near,qin=q.z<=-camera.near;if(pin)clipped.push(p);if(pin!==qin){const t=(-camera.near-p.z)/(q.z-p.z);clipped.push(p.clone().lerp(q,t));}}
      if(clipped.length<3)continue;
      const points:number[]=[];for(const p of clipped){p.applyMatrix4(camera.projectionMatrix);points.push((p.x+1)*w/2,(1-p.y)*h/2);}
      faces.push({points,depth:1,fill:baseFill,alpha:material.opacity,wire:false,background:true});
     }
     continue;
    }
    for(let i=0;i<arr.length;i+=9){
     a.set(arr[i],arr[i+1],arr[i+2]).applyMatrix4(pm);b.set(arr[i+3],arr[i+4],arr[i+5]).applyMatrix4(pm);c.set(arr[i+6],arr[i+7],arr[i+8]).applyMatrix4(pm);
     if(a.z<-1||b.z<-1||c.z<-1||a.z>1||b.z>1||c.z>1)continue;
     if((a.x<-1.1&&b.x<-1.1&&c.x<-1.1)||(a.x>1.1&&b.x>1.1&&c.x>1.1)||(a.y<-1.1&&b.y<-1.1&&c.y<-1.1)||(a.y>1.1&&b.y>1.1&&c.y>1.1))continue;
     const area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);if(material.side!==T.DoubleSide&&area<=0)continue;
     if(Math.abs(area)*w*h<.18)continue;
     normal.set(cached.normals[i]||0,cached.normals[i+1]||1,cached.normals[i+2]||0).applyMatrix3(nm).normalize();
     const shade=Math.round((.55+Math.max(0,normal.dot(sun))*.5)*20)/20;
     const shadeKey=material.uuid+shade;
     let fill=shadeCache.get(shadeKey);
     if(!fill){color.copy(material.color||new T.Color(0x83a6ad)).multiplyScalar(shade);if(material.emissive)color.add(material.emissive.clone().multiplyScalar(material.emissiveIntensity||0));fill=color.getStyle();shadeCache.set(shadeKey,fill);}
     if(o.userData.softwareClipY!==undefined){center.set((arr[i]+arr[i+3]+arr[i+6])/3,(arr[i+1]+arr[i+4]+arr[i+7])/3,(arr[i+2]+arr[i+5]+arr[i+8])/3).applyMatrix4(world);if(center.y<o.userData.softwareClipY)continue;}
     faces.push({points:[(a.x+1)*w/2,(1-a.y)*h/2,(b.x+1)*w/2,(1-b.y)*h/2,(c.x+1)*w/2,(1-c.y)*h/2],depth:(a.z+b.z+c.z)/3,fill,alpha:material.opacity,wire:Boolean(material.wireframe),background:Boolean(o.userData.softwareBackground)});
    }
   }
  });
  faces.sort((x,y)=>Number(y.background)-Number(x.background)||y.depth-x.depth);
  for(const f of faces){ctx.globalAlpha=f.alpha;ctx.beginPath();ctx.moveTo(f.points[0],f.points[1]);for(let i=2;i<f.points.length;i+=2)ctx.lineTo(f.points[i],f.points[i+1]);ctx.closePath();ctx.fillStyle=f.fill;ctx.strokeStyle=f.fill;if(f.wire){ctx.lineWidth=.65;ctx.stroke();}else{ctx.fill();if(!f.background&&f.alpha>.99){ctx.lineWidth=.35;ctx.stroke();}}}ctx.globalAlpha=1;
 }
 dispose(){this.cache.clear();this.domElement.remove();}
}
