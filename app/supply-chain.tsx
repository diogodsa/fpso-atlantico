"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Clock3, Focus, GitBranch, Helicopter, LoaderCircle, Package, Paintbrush, Pause, Play, RotateCcw, Ship, Users, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CREW, HORIZON, MATERIALS, PAINT_JOB, SUPPLY_SCENARIOS, clock, duration, supplySnapshot, type SupplyScenarioId, type SupplyCameraView } from "./supply-data";
import type { SceneHandle } from "./fpso-scene";
import "./supply-chain.css";

export default function SupplyChain() {
  const mount=useRef<HTMLDivElement>(null), scene=useRef<SceneHandle|null>(null), playhead=useRef(0);
  const [scenario,setScenario]=useState<SupplyScenarioId>("aligned");
  const [hours,setHours]=useState(0), [playing,setPlaying]=useState(false), [speed,setSpeed]=useState(1);
  const [ready,setReady]=useState(false), [error,setError]=useState(false), [view,setView]=useState<SupplyCameraView>("network");
  const latest=useRef({hours,scenario,playing});latest.current={hours,scenario,playing};
  const s=supplySnapshot(scenario,hours), baselineEnd=PAINT_JOB.targetStart+PAINT_JOB.duration;
  useEffect(()=>{
    let disposed=false;let instance:SceneHandle|null=null;
    import("./fpso-scene").then(({createScene})=>{
      if(disposed||!mount.current)return;
      instance=createScene(mount.current,{onSelect:()=>{},onStats:()=>{}});scene.current=instance;
      instance.update({explosion:0,night:false,playing:latest.current.playing,rotate:false,wireframe:false,flow:false,waves:25,selected:null});
      instance.supply({hours:latest.current.hours,scenario:latest.current.scenario,readHours:()=>playhead.current});setReady(true);
    }).catch(()=>{if(!disposed)setError(true);});
    return()=>{disposed=true;instance?.dispose();scene.current=null;};
  },[]);
  useEffect(()=>{scene.current?.supply({hours,scenario,readHours:()=>playhead.current});},[hours,scenario]);
  useEffect(()=>{scene.current?.update({explosion:0,night:false,playing,rotate:false,wireframe:false,flow:false,waves:25,selected:null});},[playing]);
  useEffect(()=>{
    if(!playing)return;let id=0,last=performance.now(),buffer=0;
    const advance=(now:number)=>{const dt=Math.min((now-last)/1000,.2);last=now;if(document.visibilityState!=="hidden"){playhead.current=Math.min(HORIZON,playhead.current+dt*.2*speed);buffer+=dt;if(buffer>=.08||playhead.current>=HORIZON){buffer=0;setHours(playhead.current);}}id=requestAnimationFrame(advance);};
    id=requestAnimationFrame(advance);return()=>cancelAnimationFrame(id);
  },[playing,speed]);
  useEffect(()=>{if(hours>=HORIZON)setPlaying(false);},[hours]);
  function chooseScenario(id:SupplyScenarioId){setScenario(id);jump(0);}
  function focus(next:SupplyCameraView){setView(next);scene.current?.supplyCamera(next);}
  function toggle(){if(playing){setHours(playhead.current);setPlaying(false);}else{if(playhead.current>=HORIZON){playhead.current=0;setHours(0);}setPlaying(true);}}
  function jump(to:number){setPlaying(false);playhead.current=Math.min(HORIZON,Math.max(0,to));setHours(playhead.current);}
  const segments=[
    {id:"people",label:"Equipe",icon:Users,color:"mint",pieces:[{from:s.airDeparture-.5,to:s.airDeparture,name:"Embarque"},{from:s.airDeparture,to:s.airArrival,name:"Voo"},{from:s.airArrival,to:s.crewReady,name:"Desembarque e integração"}]},
    {id:"cargo",label:"Materiais",icon:Package,color:"amber",pieces:[{from:0,to:1,name:"Carregamento"},{from:s.seaDeparture,to:s.seaArrival,name:"Navegação"},{from:s.seaArrival,to:s.materialReady,name:"Içamento e conferência"}]},
    {id:"work",label:"Pintura",icon:Paintbrush,color:"blue",pieces:s.start!==null?[{from:s.start,to:s.end!,name:"Execução da pintura"}]:[]},
  ];
  return <main className="sc-shell">
    <header className="sc-header">
      <Link href="/" className="sc-brand"><Waves size={26}/><span>OFFSHORE <b>/ EXPLORER</b></span></Link>
      <nav aria-label="Áreas do explorador"><Link href="/"><ArrowLeft size={15}/> FPSO 3D</Link><span aria-current="page"><GitBranch size={16}/> Supply chain</span><Link href="/multiescala">Multiescala</Link><Link href="/inspecoes">Inspeções</Link><Link href="/submarino">Submarino</Link></nav>
      <span className="sc-demo">CENÁRIO ILUSTRATIVO</span>
    </header>
    <div className="sc-main">
      <aside className="sc-sidebar" aria-label="Atividade e recursos">
        <div className="sc-task-heading"><span className="sc-eyebrow">ORDEM DE MANUTENÇÃO · {PAINT_JOB.id}</span><h1>Pintura offshore<span>.</span></h1><p>{PAINT_JOB.name}</p><div className="sc-task-facts"><span><Users size={15}/>8 profissionais</span><span><Clock3 size={15}/>4 h de execução</span></div></div>
        <div className="sc-scenario">
          <label id="scenario-label">Cenário logístico</label>
          <Select value={scenario} onValueChange={value=>chooseScenario(value as SupplyScenarioId)}><SelectTrigger aria-labelledby="scenario-label" className="sc-select"><SelectValue/></SelectTrigger><SelectContent>{SUPPLY_SCENARIOS.map(item=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
          <p>{s.scenario.description}</p>
        </div>
        <Tabs defaultValue="people" className="sc-resources">
          <TabsList className="sc-resource-tabs" aria-label="Recursos da pintura"><TabsTrigger value="people"><Users size={15}/>Equipe</TabsTrigger><TabsTrigger value="materials"><Package size={15}/>Materiais</TabsTrigger></TabsList>
          <TabsContent value="people">
            <div className="sc-resource-route mint"><Helicopter size={19}/><div><b>Transporte aéreo</b><span>Base → heliponto do FPSO</span></div><Button variant="ghost" size="icon" onClick={()=>focus("air")} aria-label="Acompanhar helicóptero" disabled={!ready}><Focus size={17}/></Button></div>
            <ul className="sc-manifest">{CREW.map(item=><li key={item.name}><span>{item.name}</span><b>{item.quantity}</b></li>)}</ul>
            <div className="sc-resource-total"><span>Pessoas a bordo</span><strong>{s.crewOnboard?8:0}<small> / 8</small></strong></div>
            <p className="sc-resource-note">Após o pouso, a simulação reserva tempo para desembarque e integração da equipe.</p>
          </TabsContent>
          <TabsContent value="materials">
            <div className="sc-resource-route amber"><Ship size={19}/><div><b>Embarcação de apoio · PSV</b><span>Porto → área de recebimento</span></div><Button variant="ghost" size="icon" onClick={()=>focus("sea")} aria-label="Acompanhar embarcação de apoio" disabled={!ready}><Focus size={17}/></Button></div>
            <div className="sc-manifest-caption">Item<span>{hours<1?"Planejado":"Embarcado"} / necessário</span></div>
            <ul className="sc-manifest sc-materials">{MATERIALS.map(item=>{const loaded=item.id==="paint"&&!s.scenario.fullCargo?3:item.quantity;return <li key={item.id} className={loaded<item.quantity?"shortage":""}><span>{item.name}<small>{item.unit}</small></span><b>{loaded} / {item.quantity}{loaded<item.quantity&&<CircleAlert size={14}/>}</b></li>;})}</ul>
            <p className="sc-resource-note">O kit fica disponível após o içamento e a conferência. A carga incompleta mantém a pintura bloqueada.</p>
          </TabsContent>
        </Tabs>
        <div className="sc-assumptions">Tempos, quantidades e distâncias ilustrativos. As condições reais de execução e segurança não são modeladas.</div>
      </aside>
      <section className="sc-stage" aria-label="Supply chain em três dimensões">
        <div ref={mount} className="sc-canvas"/>
        <div className="sc-stage-title"><span>PINTURA · DA BASE À EXECUÇÃO</span><div><i className="mint"/>Pessoas por helicóptero<i className="amber"/>Materiais por embarcação</div></div>
        <div className="sc-mobile-play"><Button onClick={toggle} aria-label={playing?"Pausar simulação":"Executar simulação"}>{playing?<Pause size={16}/>:<Play size={16}/>} {playing?"Pausar":"Simular"}</Button><span>{clock(hours)}</span></div>
        <div className="sc-focus" role="group" aria-label="Câmeras do supply chain">{([{id:"network",name:"Visão geral",icon:GitBranch},{id:"base",name:"Base",icon:Package},{id:"air",name:"Helicóptero",icon:Helicopter},{id:"sea",name:"PSV",icon:Ship},{id:"work",name:"Pintura",icon:Paintbrush}] as const).map(item=><Button key={item.id} variant="ghost" className={view===item.id?"active":""} aria-pressed={view===item.id} onClick={()=>focus(item.id)} disabled={!ready}><item.icon size={16}/><span>{item.name}</span></Button>)}</div>
        {!ready&&!error&&<div className="sc-loading" role="status"><LoaderCircle className="spin"/>Preparando a operação 3D</div>}
        {error&&<div className="sc-loading" role="alert"><CircleAlert/><p>Não foi possível carregar a cena 3D. O planejamento continua disponível abaixo.</p><Button onClick={()=>window.location.reload()}>Recarregar cena</Button></div>}
      </section>
      <section className="sc-readiness" aria-label="Dependências da atividade">
        <div className={`sc-dependency ${s.crewAvailable?"satisfied":""}`}><span className="sc-dependency-icon mint">{s.crewAvailable?<Check size={19}/>:<Users size={19}/>}</span><div><strong>Equipe</strong><p>{s.airStatus}</p></div><span className="sc-eta">Disponível às <b>{clock(s.crewReady)}</b></span></div>
        <span className="sc-plus">+</span>
        <div className={`sc-dependency ${s.materialsAvailable?"satisfied":""} ${s.cargoOnboard&&!s.scenario.fullCargo?"blocked":""}`}><span className="sc-dependency-icon amber">{s.materialsAvailable?<Check size={19}/>:<Package size={19}/>}</span><div><strong>Materiais</strong><p>{s.seaStatus}</p></div><span className="sc-eta">{s.scenario.fullCargo?<>Disponíveis às <b>{clock(s.materialReady)}</b></>:<b>Faltam 3 galões</b>}</span></div>
        <ArrowRight className="sc-join" size={21}/>
        <div className={`sc-job-state ${s.started?"started":""}`} aria-live="polite"><Paintbrush size={20}/><div><strong>{s.status}</strong><p>{s.started?`${Math.round(s.paintProgress*100)}% executado`:`Depende de: ${s.critical.toLowerCase()}`}</p></div></div>
      </section>
    </div>
    <section className="sc-timeline" aria-label="Linha do tempo da operação">
      <div className="sc-playback">
        <Button className="sc-play" onClick={toggle} aria-label={playing?"Pausar simulação":"Executar simulação"}>{playing?<Pause size={18}/>:<Play size={18}/>}<span>{playing?"Pausar":"Simular"}</span></Button>
        <Button variant="ghost" size="icon" onClick={()=>jump(0)} aria-label="Reiniciar simulação"><RotateCcw size={17}/></Button>
        <div className="sc-clock"><span>HORÁRIO SIMULADO</span><strong>{clock(hours)}</strong></div>
        <Button variant="outline" className="sc-speed" onClick={()=>setSpeed(speed===1?2:1)} aria-label={`Velocidade atual: ${speed===1?12:24} minutos simulados por segundo. Alterar velocidade.`}>{speed===1?"12":"24"} min/s</Button>
        <div className="sc-metric"><span>Início da pintura</span><strong>{clock(s.start)}</strong></div>
        <div className="sc-metric"><span>Conclusão prevista</span><strong>{clock(s.end)}{s.end!==null&&s.end>baselineEnd&&<small> +{duration(s.end-baselineEnd)}</small>}</strong></div>
        <div className="sc-metric wait"><span>Equipe em espera</span><strong>{s.waitingPersonHours.toLocaleString("pt-BR",{maximumFractionDigits:1})}<small> pessoa-hora</small></strong><span>{duration(s.waitingHours)} × {PAINT_JOB.crew} pessoas</span></div>
      </div>
      <div className="sc-time-scrub"><span>06:00</span><Slider min={0} max={HORIZON} step={.05} value={[hours]} onValueChange={values=>jump(values[0])} aria-label="Horário da simulação"/><span>22:00</span></div>
      <div className="sc-lanes">{segments.map(row=><div className={`sc-lane ${row.color}`} key={row.id}><span className="sc-lane-label"><row.icon size={14}/>{row.label}</span><div className="sc-track">{row.pieces.map(piece=><button key={piece.name} className="sc-segment" style={{left:`${piece.from/HORIZON*100}%`,width:`${(piece.to-piece.from)/HORIZON*100}%`}} onClick={()=>jump(piece.from)} title={`${piece.name}: ${clock(piece.from)}–${clock(piece.to)}`} aria-label={`${piece.name}, ${clock(piece.from)} até ${clock(piece.to)}. Ir para o início.`}>{piece.to-piece.from>=1.5&&<span>{piece.name}</span>}</button>)}{row.id==="work"&&s.start===null&&<span className="sc-blocked-label">Tinta pendente · atividade sem início previsto</span>}<span className="sc-time-cursor" style={{left:`${hours/HORIZON*100}%`}}/></div></div>)}</div>
    </section>
  </main>;
}
