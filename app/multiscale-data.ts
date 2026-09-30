export type ScaleLevel = 'campo' | 'fpso' | 'sistema' | 'equipamento' | 'componente' | 'sensor';
export type ComponentId = 'casing' | 'shaft' | 'impellers' | 'diffusers' | 'seal' | 'bearing-de' | 'bearing-nde' | 'coupling' | 'motor';
export type V3 = [number, number, number];
export const SYSTEM_ORIGIN: V3 = [30, 14, 14];
export const PUMP_ORIGIN: V3 = [-2, .5, 4];
export const SHAFT_Y = 1.45;
export const BEARING_X = -3.45;
export const SENSOR_BASE: V3 = [BEARING_X, SHAFT_Y + .47, 0];
export const multiscaleSources = [
 { id:'injection', title:'Sulzer · Bombas para injeção de água', url:'https://www.sulzer.com/en/shared/applications/offshore-production---water-injection' },
 { id:'stages', title:'KSB · Estágios de uma bomba centrífuga', url:'https://www.ksb.com/en-global/centrifugal-pump-lexicon/article/multistage-pump-1116614' },
 { id:'housing', title:'SKF · Monitoramento na carcaça do mancal', url:'https://evolution.skf.com/en/smart-housing-the-integrated-sensor-solution/' },
 { id:'accelerometer', title:'PCB · Acelerômetros e montagem', url:'https://www.pcb.com/vibration-quickreferenceguide' },
];
export const levels: { id:ScaleLevel; label:string; title:string; tag:string; description:string; focus:string; next:string; extent:string; sourceIds:string[] }[] = [
 { id:'campo',label:'Campo',title:'Campo Atlântico',tag:'CAMPO CONCEITUAL',description:'A unidade de produção e sua malha submarina, em uma única visão espacial. O percurso começa no FPSO.',focus:'FPSO Atlântico',next:'Explorar FPSO',extent:'Campo e malha submarina',sourceIds:[] },
 { id:'fpso',label:'FPSO',title:'FPSO Atlântico',tag:'UNIDADE FLUTUANTE',description:'Casco, módulos de processo e utilidades. O conjunto destacado no convés é o sistema de injeção de água.',focus:'Sistema de injeção de água',next:'Entrar no sistema',extent:'320 m de comprimento ilustrativo',sourceIds:['injection'] },
 { id:'sistema',label:'Sistema',title:'Injeção de água',tag:'SI-4100',description:'Recorte didático do bombeamento de água tratada. Duas bombas se conectam aos coletores de sucção e descarga. A P-4101A é o percurso detalhado. Ative o contexto para localizar o módulo no convés.',focus:'Bomba P-4101A',next:'Explorar bomba',extent:'Módulo no convés',sourceIds:['injection'] },
 { id:'equipamento',label:'Equipamento',title:'Bomba de injeção',tag:'P-4101A',description:'Bomba centrífuga horizontal de seis estágios, acionada por motor elétrico. Abra a carcaça para ver impulsores, difusores e o eixo comum.',focus:'Mancal do lado do acionamento',next:'Explorar mancal',extent:'Conjunto bomba e motor',sourceIds:['stages','injection'] },
 { id:'componente',label:'Componente',title:'Mancal instrumentado',tag:'BRG-P-4101A-DE',description:'O mancal apoia o eixo. O acelerômetro está instalado na carcaça estacionária e acompanha a vibração transmitida até esse ponto.',focus:'Acelerômetro radial',next:'Aproximar do sensor',extent:'Componente mecânico',sourceIds:['housing','accelerometer'] },
 { id:'sensor',label:'Sensor',title:'Sensor de vibração',tag:'ACC-4101A-DE',description:'Acelerômetro piezoelétrico com eletrônica IEPE. Montagem radial por prisioneiro na carcaça do mancal, com cabo para aquisição do sinal.',focus:'Elemento piezoelétrico',next:'',extent:'Instrumentação no ponto de instalação',sourceIds:['accelerometer'] },
];
export const components: {id:ComponentId;name:string;tag:string;description:string;details:string[];center:V3;distance:number}[] = [
 {id:'bearing-de',name:'Mancal · lado do acionamento',tag:'BRG-P-4101A-DE',description:'Conjunto de apoio do eixo próximo ao acoplamento. Carcaça, rolamento e base aparecem no corte.',details:['DE: drive end, lado do acionamento.','Acelerômetro radial fixado na carcaça estacionária.','Rolamento representativo; seleção e arranjo dependem do projeto.'],center:[BEARING_X,SHAFT_Y-.23,0],distance:2.8},
 {id:'casing',name:'Carcaça da bomba',tag:'P-4101A / CARCAÇA',description:'Envolve os estágios hidráulicos e forma o limite de contenção do fluido no conjunto.',details:['Bocais de sucção e descarga na parte superior.','Corte visual remove um setor da parede para revelar os estágios.','Geometria conceitual, sem classe de pressão especificada.'],center:[0,SHAFT_Y,0],distance:8},
 {id:'shaft',name:'Eixo da bomba',tag:'P-4101A / EIXO',description:'Transmite torque do acionamento ao conjunto de impulsores montados em série.',details:['Eixo comum aos seis estágios.','Apoios nas duas extremidades.','Posição axial preservada na vista montada.'],center:[0,SHAFT_Y,0],distance:8.5},
 {id:'impellers',name:'Impulsores · seis estágios',tag:'P-4101A / IMPULSORES',description:'Elementos rotativos que transferem energia ao líquido em cada estágio.',details:['Palhetas curvas entre discos.','Seis impulsores sobre o eixo comum.','Rotação exibida em velocidade didática.'],center:[0,SHAFT_Y,0],distance:6.8},
 {id:'diffusers',name:'Difusores e canais de retorno',tag:'P-4101A / DIFUSORES',description:'Elementos estacionários que recebem o escoamento de um impulsor e conduzem o fluido ao estágio seguinte.',details:['Palhetas fixas ao redor dos impulsores.','Os difusores permanecem parados durante a animação.','Passagens simplificadas para leitura do conjunto.'],center:[.25,SHAFT_Y,0],distance:7},
 {id:'seal',name:'Selos mecânicos',tag:'P-4101A / SELOS',description:'Conjuntos de vedação nas passagens do eixo pelas extremidades da carcaça.',details:['Faces, luva e alojamento representativos.','O circuito auxiliar de selagem não é detalhado neste recorte.'],center:[-2.85,SHAFT_Y,0],distance:2.3},
 {id:'bearing-nde',name:'Mancal · lado oposto',tag:'BRG-P-4101A-NDE',description:'Apoio do eixo na extremidade oposta ao acionamento.',details:['NDE: non-drive end, lado oposto ao acionamento.','Sem sensor detalhado neste primeiro percurso.'],center:[3.45,SHAFT_Y-.23,0],distance:2.8},
 {id:'coupling',name:'Acoplamento e proteção',tag:'P-4101A / ACOPLAMENTO',description:'Interliga o eixo do motor ao eixo da bomba. A proteção envolve as partes girantes.',details:['Dois cubos e elemento de ligação.','A proteção pode ser aberta pelo controle de corte.'],center:[-4.4,SHAFT_Y,0],distance:2.8},
 {id:'motor',name:'Motor elétrico',tag:'M-4101A',description:'Acionamento do conjunto, com carcaça aletada, caixa de ligação e cobertura de ventilação.',details:['Representação externa do motor.','As características elétricas não foram dimensionadas.'],center:[-6.25,SHAFT_Y,0],distance:5.5},
];
export type MultiscaleState = {level:ScaleLevel;component:ComponentId;cut:boolean;transparent:boolean;explosion:number;playing:boolean;labels:boolean;context:boolean};
export const defaultMultiscaleState:MultiscaleState={level:'campo',component:'bearing-de',cut:false,transparent:false,explosion:0,playing:false,labels:true,context:true};
export function levelIndex(level:ScaleLevel){return levels.findIndex(l=>l.id===level);}
export function nextLevel(state:MultiscaleState, level:ScaleLevel):MultiscaleState {
 return {...state,level,context:level==='sistema'||level==='componente'?false:level==='sensor'?true:state.context,component:level==='sensor'?'bearing-de':state.component,cut:level==='componente'?true:level==='sensor'?false:state.cut,explosion:0,transparent:false};
}
export function sensorReading(time:number){return .18+.018*Math.sin(time*.6)+.006*Math.sin(time*2.1);}
export function formatScale(meters:number){if(meters>=1000)return `${Number((meters/1000).toPrecision(2))} km`;if(meters>=1)return `${Number(meters.toPrecision(2))} m`;if(meters>=.01)return `${Number((meters*100).toPrecision(2))} cm`;return `${Number((meters*1000).toPrecision(2))} mm`;}
