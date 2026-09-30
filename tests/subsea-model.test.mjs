import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildSync} from 'esbuild';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
mkdirSync('.sites-runtime',{recursive:true});
const out=path.resolve('.sites-runtime/subsea-validation.mjs');
buildSync({stdin:{contents:'export * from "./app/subsea-model.ts"; export * from "./app/subsea-data.ts";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:out});
const {buildSubseaField,subseaRoutes,ANCHOR_POINTS,subseaAssets,subseaSources,defaultSubseaState,FLOOR_Y,wells}=await import(pathToFileURL(out));
const model=buildSubseaField();
function reaches(start,end,layer){const seen=new Set(),queue=[start];while(queue.length){const id=queue.shift();if(id===end)return true;if(seen.has(id))continue;seen.add(id);queue.push(...subseaRoutes.filter(r=>r.layer===layer&&r.from===id).map(r=>r.to));}return false;}
test('all producers reach the FPSO; injection and control stay separate',()=>{
 for(const w of wells.filter(w=>w.id[0]==='p'))assert.ok(reaches('anm-'+w.id,'fpso-production','production'),w.id);
 for(const w of wells.filter(w=>w.id[0]==='i')){assert.ok(reaches('fpso-injection','anm-'+w.id,'injection'),w.id);assert.equal(reaches('anm-'+w.id,'fpso-production','production'),false);}
 for(const w of wells)assert.ok(reaches('fpso-control','scm-'+w.id,'control'),w.id);
 assert.equal(reaches('fpso-injection','man-prod','injection'),false);
});
test('connected route endpoints meet at the riser touchdown and producer tie-ins',()=>{
 const end=id=>subseaRoutes.find(r=>r.id===id).points.at(-1),start=id=>subseaRoutes.find(r=>r.id===id).points[0];
 assert.deepEqual(end('flowline'),start('riser-prod'));
 assert.deepEqual(end('riser-inj'),start('inj-feed'));
 for(const w of wells.filter(w=>w.id[0]==='p'))assert.deepEqual(end('jumper-'+w.id),start('well-line-'+w.id));
 for(const c of model.curves)for(let i=0;i<=100;i++){const p=c.curve.getPointAt(i/100);assert.ok([p.x,p.y,p.z].every(Number.isFinite));assert.ok(p.y>=FLOOR_Y-.1,`route penetrates seabed: ${p.y}`);}
});
test('each catalog identity resolves to geometry and a valid technical reference',()=>{
 assert.equal(new Set(subseaAssets.map(a=>a.id)).size,subseaAssets.length);
 assert.equal(new Set(subseaAssets.map(a=>a.tag)).size,subseaAssets.length);
 for(const a of subseaAssets){assert.ok(model.groups.has(a.id),a.id);for(const s of a.sources)assert.ok(subseaSources.some(r=>r.id===s),s);const g=model.groups.get(a.id);assert.equal(model.findAsset(g),a.id);}
 assert.equal(ANCHOR_POINTS.length,8);
});
test('exploding and reassembling the tree preserves the original positions and finite animation matrices',()=>{
 const bases=new Map([...model.groups].map(([id,g])=>[id,g.position.clone()]));
 model.update({...defaultSubseaState,explosion:100},0);
 assert.ok(model.groups.get('valves').position.y>bases.get('valves').y);
 model.update(defaultSubseaState,0);
 for(const [id,g]of model.groups)assert.ok(g.position.equals(bases.get(id)),id);
 for(const time of [-.1,0,.001,1,30,600,30000]){model.update(defaultSubseaState,time);model.root.traverse(o=>{if(o instanceof T.InstancedMesh)assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite));});}
});
