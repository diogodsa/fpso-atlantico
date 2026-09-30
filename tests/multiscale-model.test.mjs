import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildSync} from 'esbuild';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
mkdirSync('.sites-runtime',{recursive:true});
const out=path.resolve('.sites-runtime/multiscale-validation.mjs');
buildSync({stdin:{contents:'export * from "./app/multiscale-model.ts"; export * from "./app/multiscale-data.ts";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:out});
const {buildMultiscaleModel,defaultMultiscaleState,components,levels,multiscaleSources,nextLevel,SENSOR_BASE,pumpWorld}=await import(pathToFileURL(out));
const model=buildMultiscaleModel();
const state=(level,changes={})=>nextLevel({...defaultMultiscaleState,...changes},level);
test('a continuous physical hierarchy retains the sensor mounting point through all six scales',()=>{
 assert.equal(model.detailed,false);
 model.update(state('equipamento'));
 assert.equal(model.parts.size,components.length);
 assert.equal(model.sensor.parent,model.parts.get('bearing-de'));
 assert.equal(model.pump.parent,model.system);
 const expected=pumpWorld.clone().add(new T.Vector3(...SENSOR_BASE));
 for(const level of levels){
  model.update(state(level.id));
  assert.ok(model.sensor.getWorldPosition(new T.Vector3()).distanceTo(expected)<1e-10,level.id);
  assert.ok(model.target(state(level.id)).toArray().every(Number.isFinite));
 }
});
test('explosion and reassembly do not drift parts, rotors or the sensor installation',()=>{
 model.update(state('equipamento'));
 const positions=new Map();model.pump.traverse(o=>positions.set(o.uuid,o.position.clone()));
 for(let i=0;i<3;i++)for(const level of ['equipamento','componente','sensor']){
  model.update({...state(level),explosion:100},0);
  model.update({...state(level),explosion:0},0);
  model.pump.traverse(o=>assert.ok(o.position.distanceTo(positions.get(o.uuid))<1e-10,o.name||o.uuid));
 }
 const rotor=model.parts.get('impellers').children[0];
 const fixed=model.parts.get('diffusers');
 const fixedMatrix=fixed.matrixWorld.clone();
 model.update({...state('equipamento'),playing:true},5);
 assert.notEqual(rotor.rotation.x,0);
 assert.deepEqual(fixed.matrixWorld.elements,fixedMatrix.elements);
 assert.equal(rotor.children.length,6);
 assert.equal(fixed.children.length,6);
});
test('component isolation and sensor close-up keep only the selected physical detail',()=>{
 for(const component of components){
  model.update(state('componente',{component:component.id,context:false}));
  for(const [id,part]of model.parts)assert.equal(part.visible,id===component.id);
  assert.equal(model.pick(model.parts.get(component.id).children[0]),component.id);
 }
 model.update(state('sensor',{component:'motor',context:false}));
 assert.equal(model.parts.get('bearing-de').visible,true);
 assert.equal(model.parts.get('motor').visible,false);
 assert.equal(model.sensor.visible,true);
 assert.equal(model.pick(model.sensor.children[0]),'sensor');
 model.root.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite),o.name));
});
test('technical identifiers and reference links remain resolvable',()=>{
 assert.equal(new Set(components.map(c=>c.id)).size,components.length);
 assert.equal(new Set(components.map(c=>c.tag)).size,components.length);
 for(const level of levels)for(const id of level.sourceIds)assert.ok(multiscaleSources.some(s=>s.id===id));
});
