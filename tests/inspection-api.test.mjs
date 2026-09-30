import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
test('inspection lifecycle persists photographs, isolates users and rejects stale edits',async()=>{
 const root=path.resolve('dist/server');const files=readdirSync(root,{recursive:true}).filter(p=>/\.m?js$/.test(p)).sort((a,b)=>a==='index.js'?-1:b==='index.js'?1:a.localeCompare(b));
 const mf=new Miniflare({modules:files.map(p=>({type:'ESModule',path:path.join(root,p)})),modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET']});
 try{
  const db=await mf.getD1Database('DB');for(const sql of readFileSync('drizzle/0000_glossy_greymalkin.sql','utf8').split('--> statement-breakpoint').filter(s=>s.trim()))await db.prepare(sql.trim()).run();
  async function req(url,{method='GET',body,user='inspection-test-a',email='a@example.test',origin}={}){const headers={};if(user){headers['oai-authenticated-user-id']=user;headers['oai-authenticated-user-email']=email;}if(origin)headers.origin=origin;if(body&&!(body instanceof FormData))headers['content-type']='application/json';const request=new Request('https://inspection.example.test'+url,{method,headers,body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});return mf.dispatchFetch(request.url,{method,headers:Object.fromEntries(request.headers),body:body===undefined?undefined:await request.arrayBuffer()});}
  let r=await req('/api/inspections',{user:null});assert.equal(r.status,200);assert.equal((await r.json()).user,null);
  r=await req('/api/inspections',{method:'POST',user:null,body:{}});assert.equal(r.status,401);
  r=await req('/api/inspections',{method:'POST',origin:'https://other.example.test',body:{}});assert.equal(r.status,403);
  let fd=new FormData();fd.set('photo',new File(['<svg/>'],'not-photo.svg',{type:'image/svg+xml'}));r=await req('/api/inspections/photos',{method:'POST',body:fd});assert.equal(r.status,400);
  const png=readFileSync('public/inspection/pump-flange.png');fd=new FormData();fd.set('photo',new File([png],'qa-illustrative.png',{type:'image/png'}));r=await req('/api/inspections/photos',{method:'POST',body:fd});assert.equal(r.status,201,await r.clone().text());const photo=await r.json();
  r=await req(photo.url,{user:'inspection-test-b',email:'b@example.test'});assert.equal(r.status,404);
  r=await req(photo.url);assert.equal(r.status,200);assert.equal((await r.arrayBuffer()).byteLength,png.byteLength);
  const id=crypto.randomUUID(),input={id,equipmentId:'p-2101a',date:'2026-09-27',notes:'Visual inspection test record, synthetic photo.',photoId:photo.id};
  r=await req('/api/inspections',{method:'POST',body:input,user:'inspection-test-b',email:'b@example.test'});assert.equal(r.status,400);
  r=await req('/api/inspections',{method:'POST',body:input});assert.equal(r.status,201);let record=(await r.json()).record;assert.equal(record.demo,false);
  r=await req('/api/inspections',{method:'POST',body:input});assert.equal((await r.json()).record.id,id);
  r=await req('/api/inspections/'+id,{method:'PATCH',body:{action:'annotate',version:1,mark:{label:'Paint deterioration',severity:'moderada',box:[.2,.2,.3,.3]}}});assert.equal(r.status,200);record=(await r.json()).record;assert.equal(record.marks.length,1);
  r=await req('/api/inspections/'+id,{method:'PATCH',user:'inspection-test-b',email:'b@example.test',body:{action:'complete',version:2}});assert.equal(r.status,404);
  const taskInput={id:crypto.randomUUID(),inspectionId:id,title:'Evaluate coating',description:'Evaluate confirmed visual observation in field.',responsible:'QA maintenance',dueDate:'2026-10-01'};
  r=await req('/api/maintenance',{method:'POST',body:taskInput});assert.equal(r.status,400);
  r=await req('/api/inspections/'+id,{method:'PATCH',body:{action:'complete',version:2}});assert.equal(r.status,400);
  const review={action:'review',version:2,markId:record.marks[0].id,review:'confirmada',note:'Confirmed for assessment.'};r=await req('/api/inspections/'+id,{method:'PATCH',body:review});assert.equal(r.status,200);record=(await r.json()).record;assert.equal(record.version,3);
  r=await req('/api/inspections/'+id,{method:'PATCH',body:review});assert.equal(r.status,409);
  r=await req('/api/maintenance',{method:'POST',body:taskInput});assert.equal(r.status,201);let task=(await r.json()).task;assert.equal(task.inspectionId,id);
  r=await req('/api/maintenance',{method:'POST',body:taskInput});assert.equal((await r.json()).task.id,task.id);
  r=await req('/api/maintenance/'+task.id,{method:'PATCH',body:{version:1,status:'concluida',resolution:''}});assert.equal(r.status,400);
  r=await req('/api/maintenance/'+task.id,{method:'PATCH',body:{version:1,status:'concluida',resolution:'Assessed in field; maintenance completed.'}});assert.equal(r.status,200);assert.equal((await r.json()).task.status,'concluida');
  r=await req('/api/inspections');const persisted=await r.json();assert.equal(persisted.records[0].id,id);assert.equal(persisted.records[0].history.length,3);assert.equal(persisted.tasks[0].status,'concluida');
  r=await req('/api/inspections',{user:'inspection-test-b',email:'b@example.test'});const isolated=await r.json();assert.equal(isolated.records.length,0);assert.equal(isolated.tasks.length,0);
  r=await req('/api/maintenance',{method:'POST',body:{...taskInput,id:crypto.randomUUID(),inspectionId:'demo-pipe'}});assert.equal(r.status,201);const copied=await r.json();assert.notEqual(copied.record.id,'demo-pipe');assert.equal(copied.record.demo,true);assert.equal(copied.task.inspectionId,copied.record.id);
 }finally{await mf.dispose();}
});
