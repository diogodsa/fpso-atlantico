"use client";
import { useEffect, useRef, useState } from "react";
import { Anchor, ArrowDownToLine, ArrowUpRight, Box, ChevronDown, ChevronRight, Code2, Compass, Expand, Focus, GitBranch, Layers3, LoaderCircle, Moon, Move3D, Pause, Play, RotateCcw, Rotate3D, Settings2, Ship, Sun, Waves, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { systems, type CameraView, type SceneSettings, type SystemId } from "./fpso-data";
import { equipment } from "./inspection-data";
import type { SceneHandle } from "./fpso-scene";

const defaults: SceneSettings = { explosion: 0, night: false, playing: true, rotate: false, wireframe: false, flow: false, waves: 35, selected: null };
export default function Explorer() {
  const mount = useRef<HTMLDivElement>(null);
  const scene = useRef<SceneHandle | null>(null);
  const [settings, setSettings] = useState<SceneSettings>(defaults);
  const latest = useRef(settings); latest.current = settings;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState(false);
  const [view, setView] = useState<CameraView>("perspective");
  const [stats, setStats] = useState({ fps: 0, triangles: 0 });
  const [full, setFull] = useState(false);
  const selected = systems.find(s => s.id === settings.selected);
  const set = <K extends keyof SceneSettings>(key: K, value: SceneSettings[K]) => setSettings(s => ({ ...s, [key]: value }));
  useEffect(() => {
    let disposed = false;
    let instance: SceneHandle | null = null;
    import("./fpso-scene").then(({ createScene }) => {
      if (disposed || !mount.current) return;
      instance = createScene(mount.current, { onSelect: (id: SystemId | null) => setSettings(s => ({ ...s, selected: id })), onStats: setStats });
      scene.current = instance;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) setSettings(s => ({ ...s, playing: false, rotate: false }));
      instance.update({ ...latest.current, ...(reduced ? { playing: false, rotate: false } : {}) });
      setReady(true);
    }).catch(() => setError("Não foi possível iniciar a cena 3D."));
    const onFull = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFull);
    return () => { disposed = true; instance?.dispose(); scene.current = null; document.removeEventListener("fullscreenchange", onFull); };
  }, []);
  useEffect(() => { scene.current?.update(settings); }, [settings]);
  function camera(next: CameraView) { setView(next); scene.current?.camera(next); }
  function reset() { setSettings(defaults); setView("perspective"); scene.current?.camera("perspective"); }
  async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { setError("Seu navegador não oferece tela cheia. A exploração 3D continua disponível."); } }

  return <main className={`explorer ${settings.night ? "is-night" : ""}`}>
    <div ref={mount} className="scene-mount" aria-label="Modelo tridimensional interativo de um FPSO. Use os controles de câmera e a lista de sistemas para explorar." />
    <div className="vignette" />
    <header className="topbar">
      <a className="brand" href="/" aria-label="FPSO Atlântico, início"><span className="brand-icon"><Waves size={25} /></span><span>OFFSHORE<span className="brand-divider">/</span><b>EXPLORER</b></span></a>
      <div className="topbar-right"><a className="supply-entry" href="/multiescala"><Layers3 size={16}/><span>Multiescala</span></a><a className="supply-entry" href="/submarino"><Anchor size={16}/><span>Submarino</span></a><a className="supply-entry" href="/inspecoes"><Focus size={16}/><span>Inspeções</span></a><a className="supply-entry" href="/supply-chain"><GitBranch size={16}/><span>Supply chain</span></a><span className="concept"><span /> MODELO CONCEITUAL</span><button className="icon-button fullscreen" onClick={fullscreen} aria-label={full ? "Sair da tela cheia" : "Tela cheia"} title="Tela cheia"><Expand size={18} /></button></div>
    </header>
    <section className="identity">
      <div className="eyebrow">ENGENHARIA EM MOVIMENTO <span>01 / FPSO</span></div>
      <h1>FPSO <span>Atlântico</span><span className="title-point">.</span></h1>
      <p>Uma indústria inteira. Sobre o oceano.</p>
      <div className="identity-meta"><span><Ship size={14} /> 320 m</span><span>60 m de boca</span><span>{systems.length} sistemas</span></div>
    </section>
    <button className="mobile-panel-toggle" onClick={() => setPanel(!panel)} aria-expanded={panel}><Settings2 size={16} /> Explorar sistemas <ChevronDown size={16} /></button>
    <aside className={`control-panel ${panel ? "mobile-open" : ""}`} aria-label="Controles do FPSO">
      <div className="panel-heading"><span>SISTEMAS DA UNIDADE</span><button className="mobile-close icon-button" onClick={() => setPanel(false)} aria-label="Fechar controles"><X size={17} /></button><span className="tiny-label">{String(systems.length).padStart(2, "0")}</span></div>
      <div className="systems-list">{systems.map(s => <button key={s.id} className={`system-row ${settings.selected === s.id ? "selected" : ""}`} onClick={() => { set("selected", settings.selected === s.id ? null : s.id); if(s.id === "offloading") camera("offloading"); setPanel(false); }} aria-pressed={settings.selected === s.id}><span className="system-index" style={{ color: s.color }}>{s.index}</span><span>{s.name}</span><ChevronRight size={14} /></button>)}</div>
      <div className="panel-section">
        <div className="label-row"><span><Layers3 size={16} /> Vista explodida</span><span className="numeric">{Math.round(settings.explosion)}<small>%</small></span></div>
        <Slider aria-label="Separação dos módulos" value={[settings.explosion]} onValueChange={v => set("explosion", v[0])} max={100} step={1} className="explosion-slider" />
        <div className="slider-captions"><span>Montado</span><button onClick={() => set("explosion", settings.explosion > 50 ? 0 : 100)}>{settings.explosion > 50 ? "Reagrupar" : "Desmontar"}<ArrowUpRight size={12} /></button></div>
      </div>
      <div className="panel-section switch-section">
        <label className="toggle-row" htmlFor="flow"><span><Move3D size={16} /> Fluxo de processo</span><Switch id="flow" checked={settings.flow} onCheckedChange={v => set("flow", v)} /></label>
        <label className="toggle-row" htmlFor="structure"><span><Box size={16} /> Estrutura em linhas</span><Switch id="structure" checked={settings.wireframe} onCheckedChange={v => set("wireframe", v)} /></label>
      </div>
      <div className="panel-footer"><Code2 size={14} /><span>Geometria 100% gerada em código</span></div>
    </aside>
    <div className="environment-panel">
      <label htmlFor="night" className="night-control"><Sun size={17} /><Switch id="night" checked={settings.night} onCheckedChange={v => set("night", v)} aria-label="Iluminação noturna" /><Moon size={16} /></label>
      <div className="wave-control"><label htmlFor="wave-slider"><Waves size={17} /><span>Mar</span></label><Slider id="wave-slider" aria-label="Intensidade das ondas" value={[settings.waves]} onValueChange={v => set("waves", v[0])} max={100} className="wave-slider" /></div>
    </div>
    {selected && <section className="system-detail" aria-live="polite" style={{ "--system-color": selected.color } as React.CSSProperties}>
      <div className="detail-top"><span>SISTEMA {selected.index}</span><button className="icon-button" onClick={() => set("selected", null)} aria-label="Fechar detalhes"><X size={17} /></button></div>
      <h2>{selected.name}</h2><p className="detail-subtitle">{selected.subtitle}</p><p>{selected.description}</p>
      {selected.id === "hull" && <a className="source-link" href="https://petrobras.com.br/pt/quem-somos/vida-na-plataforma" target="_blank" rel="noreferrer">Sobre FPSOs · Petrobras</a>}
      {selected.id === "subsea" && <a className="focus-button" href="/submarino"><Anchor size={16}/> Explorar campo submarino <ArrowUpRight size={16}/></a>}
      <div className="part-tags">{selected.parts.map(p => <span key={p}>{p}</span>)}</div>
      <button className="focus-button" onClick={() => { scene.current?.focus(selected.id); setView(selected.id === "subsea" ? "subsea" : selected.id === "offloading" ? "offloading" : "perspective"); setPanel(false); }}><Focus size={16} /> Aproximar sistema <ArrowUpRight size={16} /></button>
      <a className="focus-button" href={`/inspecoes?equip=${equipment.find(e=>e.system===selected.id)?.id||equipment[0].id}`}><Focus size={16}/> Inspecionar equipamentos <ArrowUpRight size={16}/></a>
    </section>}
    {settings.flow && <div className="flow-legend"><span><i style={{ background: "#fac256" }} /> Óleo</span><span><i style={{ background: "#64deed" }} /> Gás</span><span><i style={{ background: "#60e6bf" }} /> Fluidos produzidos</span><span><i style={{ background: "#f1a455" }} /> Offloading</span><small>Fluxo ilustrativo</small></div>}
    <div className="viewport-label"><span className="crosshair">+</span><span>{settings.explosion > 0 ? "VISTA EXPLODIDA" : view === "subsea" ? "CONEXÕES SUBMARINAS" : view === "offloading" ? "OFFLOADING EM TANDEM" : "PERSPECTIVA DA UNIDADE"}</span><span className="label-line" /></div>
    <footer className="bottom-bar">
      <div className="render-info"><span className="render-status" /><span>{ready ? `${stats.fps || "—"} FPS` : "PREPARANDO"}</span><span className="render-divider" /><span>THREE.JS <span className="muted">/</span> TYPESCRIPT</span><small>Dimensões e operação ilustrativas</small></div>
      <div className="camera-toolbar" role="group" aria-label="Controles da cena">
        <button className={view === "perspective" ? "active" : ""} onClick={() => camera("perspective")} title="Perspectiva" aria-label="Câmera em perspectiva"><Compass size={18} /><span>Perspectiva</span></button>
        <button className={view === "deck" ? "active" : ""} onClick={() => camera("deck")} title="Vista do convés" aria-label="Câmera acima do convés"><ArrowDownToLine size={18} /><span>Convés</span></button>
        <button className={view === "side" ? "active" : ""} onClick={() => camera("side")} title="Vista lateral" aria-label="Câmera lateral"><Ship size={18} /><span>Lateral</span></button>
        <button className={view === "subsea" ? "active" : ""} onClick={() => camera("subsea")} title="Sistemas submarinos" aria-label="Câmera dos sistemas submarinos"><Anchor size={18} /><span>Submarino</span></button>
        <button className={view === "offloading" ? "active" : ""} onClick={() => camera("offloading")} title="FPSO, mangote e navio aliviador" aria-label="Câmera do offloading"><Move3D size={18} /><span>Offloading</span></button>
        <span className="toolbar-separator" />
        <button onClick={() => set("playing", !settings.playing)} title={settings.playing ? "Pausar animação" : "Retomar animação"} aria-label={settings.playing ? "Pausar animação" : "Retomar animação"}>{settings.playing ? <Pause size={17} /> : <Play size={17} />}</button>
        <button className={settings.rotate ? "active" : ""} onClick={() => set("rotate", !settings.rotate)} aria-label="Rotação automática" aria-pressed={settings.rotate} title="Rotação automática"><Rotate3D size={18} /></button>
        <button onClick={reset} title="Restaurar cena" aria-label="Restaurar cena"><RotateCcw size={17} /></button>
      </div>
      <div className="interaction-hint"><span>ARRASTE PARA GIRAR</span><span>SCROLL PARA APROXIMAR</span></div>
    </footer>
    {!ready && !error && <div className="loading-scene" role="status"><LoaderCircle className="spin" size={24} /><span>Construindo o FPSO</span><small>Casco, módulos e oceano ganhando forma.</small></div>}
    {error && <div className="error-message" role="alert"><p>{ready ? error : "Não foi possível iniciar a cena 3D. Verifique se o WebGL está habilitado no navegador e recarregue a página."}</p><button onClick={() => ready ? setError("") : window.location.reload()}>{ready ? "Fechar" : "Tentar novamente"}</button></div>}
  </main>;
}
