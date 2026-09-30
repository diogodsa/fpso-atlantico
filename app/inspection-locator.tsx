'use client';
import {useEffect,useRef,useState} from 'react';
import {Crosshair,Map,RotateCcw} from 'lucide-react';
import {equipment} from './inspection-data';
import type {SceneHandle} from './fpso-scene';
export default function InspectionLocator({selected,onSelect}:{selected:string;onSelect:(id:string)=>void}){
 const mount=useRef<HTMLDivElement>(null),scene=useRef<SceneHandle|null>(null),latest=useRef(selected),callback=useRef(onSelect);latest.current=selected;callback.current=onSelect;
 const [failed,setFailed]=useState(false),[ready,setReady]=useState(false),[map,setMap]=useState(false);
 useEffect(()=>{let disposed=false,instance:SceneHandle|null=null;import('./fpso-scene').then(({createScene})=>{if(disposed||!mount.current)return;instance=createScene(mount.current,{inspection:true,onInspect:id=>callback.current(id),onSelect:id=>{const e=equipment.find(e=>e.system===id);if(e)callback.current(e.id);},onStats:()=>{}});scene.current=instance;instance.update({explosion:0,night:false,playing:false,rotate:false,wireframe:false,flow:false,waves:0,selected:null});instance.inspect(latest.current);setReady(true);}).catch(()=>setFailed(true));return()=>{disposed=true;instance?.dispose();scene.current=null;};},[]);
 useEffect(()=>{scene.current?.inspect(selected);},[selected]);
 const plan=map||failed;
 return <section className="iv-locator" aria-label="Localização dos equipamentos"><div className="iv-section-label"><span><Crosshair size={15}/> LOCALIZAÇÃO NA UNIDADE</span><button className="iv-icon" title="Alternar mapa do convés" aria-label="Alternar mapa do convés" aria-pressed={plan} onClick={()=>setMap(!map)} disabled={failed}><Map size={15}/></button></div>
 <div className="iv-mini-scene" ref={mount} style={{visibility:plan?'hidden':'visible'}}/>
 {plan&&<div className="iv-deck-map"><svg viewBox="0 0 360 165" role="img" aria-label="Diagrama conceitual do convés do FPSO"><path d="M30 34H292Q331 41 341 82Q331 121 292 129H30Z" fill="#173848" stroke="#527482"/><rect x="58" y="46" width="50" height="70" rx="3" fill="#52717b"/><path d="M120 42H280V119H120Z M120 81H280 M169 42V119 M226 42V119" fill="#214854" stroke="#608078"/><path d="M31 82H54M282 82H333" stroke="#e3bb7b" strokeWidth="4"/><text x="59" y="147" fill="#98b6c3" fontSize="10">CASARIO</text><text x="152" y="147" fill="#98b6c3" fontSize="10">ÁREA OPERACIONAL</text></svg>{equipment.map((e,i)=><button key={e.id} title={`${e.tag} · ${e.name}`} aria-label={`Localizar ${e.tag}`} aria-pressed={selected===e.id} className={`iv-map-pin ${selected===e.id?'active':''}`} style={{left:`${e.map[0]}%`,top:`${e.map[1]}%`}} onClick={()=>onSelect(e.id)}>{String(i+1).padStart(2,'0')}</button>)}</div>}
 {!ready&&!failed&&<span className="iv-scene-loading">Carregando modelo 3D…</span>}
 <div className="iv-locator-footer"><small>{failed?'Mapa disponível · 3D indisponível neste navegador':plan?'Mapa conceitual do convés':'Arraste para girar · clique nos marcadores'}</small>{!plan&&<button className="iv-icon" aria-label="Enquadrar unidade completa" title="Enquadrar unidade" onClick={()=>scene.current?.inspect(null)}><RotateCcw size={14}/></button>}</div>
 </section>;
}
