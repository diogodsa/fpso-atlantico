export type SupplyScenarioId = "aligned" | "air-delay" | "sea-delay" | "partial-cargo";
export type SupplyCameraView = "network" | "base" | "air" | "sea" | "work";
export type SupplySceneState = { hours: number; scenario: SupplyScenarioId; readHours?: () => number };
export const HORIZON = 16;
export const PAINT_JOB = { id: "MNT-014", name: "Pintura do módulo de processo", crew: 8, duration: 4, targetStart: 6 };
export const CREW = [{ name: "Pintores", quantity: 6 }, { name: "Encarregado", quantity: 1 }, { name: "Inspetor de pintura", quantity: 1 }];
export const MATERIALS = [
  { id: "primer", name: "Primer anticorrosivo", quantity: 4, unit: "galões" },
  { id: "paint", name: "Tinta de acabamento", quantity: 6, unit: "galões" },
  { id: "airless", name: "Equipamento airless", quantity: 1, unit: "conjunto" },
  { id: "ppe", name: "Proteção individual", quantity: 8, unit: "kits" },
];
export const SUPPLY_SCENARIOS: { id: SupplyScenarioId; name: string; airDelay: number; seaDelay: number; fullCargo: boolean; description: string }[] = [
  { id: "aligned", name: "Chegadas sincronizadas", airDelay: 0, seaDelay: 0, fullCargo: true, description: "A embarcação sai antes; o voo aproxima a chegada da equipe da disponibilidade dos materiais." },
  { id: "air-delay", name: "Voo com atraso de 2 h", airDelay: 2, seaDelay: 0, fullCargo: true, description: "Os materiais chegam no horário, mas a pintura aguarda a equipe." },
  { id: "sea-delay", name: "PSV com atraso de 3 h", airDelay: 0, seaDelay: 3, fullCargo: true, description: "A equipe chega primeiro e espera a descarga e a conferência dos materiais." },
  { id: "partial-cargo", name: "Carga de tinta incompleta", airDelay: 0, seaDelay: 0, fullCargo: false, description: "Apenas 3 dos 6 galões de acabamento são embarcados. Chegar ao FPSO não basta para completar o kit." },
];
export const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
export function clock(hours: number | null) {
  if (hours === null) return "Sem previsão";
  const minutes = Math.round((6 + hours) * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
export function duration(hours: number) {
  const minutes = Math.round(Math.max(0, hours) * 60), h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")} min` : `${h} h`;
}
export function supplyPlan(id: SupplyScenarioId) {
  const scenario = SUPPLY_SCENARIOS.find(s => s.id === id)!;
  const airDeparture = 4.5 + scenario.airDelay, airArrival = airDeparture + 1, crewReady = airArrival + .5;
  const seaDeparture = 1 + scenario.seaDelay, seaArrival = seaDeparture + 4, materialReady = seaArrival + .75;
  const start = scenario.fullCargo ? Math.max(PAINT_JOB.targetStart, crewReady, materialReady) : null;
  const end = start === null ? null : start + PAINT_JOB.duration;
  const critical = !scenario.fullCargo ? "Tinta de acabamento" : materialReady > crewReady ? "Entrega dos materiais" : "Chegada da equipe";
  return { scenario, airDeparture, airArrival, crewReady, seaDeparture, seaArrival, materialReady, start, end, critical };
}
export function supplySnapshot(id: SupplyScenarioId, value: number) {
  const plan = supplyPlan(id), hours = clamp(Number.isFinite(value) ? value : 0, 0, HORIZON);
  const crewOnboard = hours >= plan.airArrival, crewAvailable = hours >= plan.crewReady;
  const cargoOnboard = hours >= plan.materialReady, materialsAvailable = cargoOnboard && plan.scenario.fullCargo;
  const started = plan.start !== null && hours >= plan.start;
  const paintProgress = started ? clamp((hours - plan.start!) / PAINT_JOB.duration) : 0;
  const completed = paintProgress >= 1;
  const waitingHours = Math.max(0, Math.min(hours, plan.start ?? hours) - plan.crewReady);
  const airStatus = hours < plan.airDeparture - .5 ? "Equipe na base" : hours < plan.airDeparture ? "Embarque" : hours < plan.airArrival ? "Em voo" : hours < plan.crewReady ? "Desembarque e integração" : "Equipe disponível";
  const seaStatus = hours < 1 ? "Separação e carregamento" : hours < plan.seaDeparture ? "Aguardando saída" : hours < plan.seaArrival ? "Em navegação" : hours < plan.materialReady ? "Içamento e conferência" : plan.scenario.fullCargo ? "Materiais disponíveis" : "Tinta insuficiente";
  const status = completed ? "Pintura concluída" : started ? "Pintura em execução" : cargoOnboard && !plan.scenario.fullCargo ? "Pintura bloqueada: falta tinta" : crewAvailable && !materialsAvailable ? "Equipe aguardando materiais" : materialsAvailable && !crewAvailable ? "Materiais aguardando equipe" : "Aguardando equipe e materiais";
  const airProgress = clamp((hours - plan.airDeparture) / (plan.airArrival - plan.airDeparture));
  const seaProgress = clamp((hours - plan.seaDeparture) / (plan.seaArrival - plan.seaDeparture));
  const unloadProgress = clamp((hours - plan.seaArrival) / (plan.materialReady - plan.seaArrival));
  return { ...plan, hours, crewOnboard, crewAvailable, cargoOnboard, materialsAvailable, started, completed, paintProgress, waitingHours, waitingPersonHours: waitingHours * PAINT_JOB.crew, airStatus, seaStatus, status, airProgress, seaProgress, unloadProgress };
}
