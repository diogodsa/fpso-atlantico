import { z } from 'zod';
import type { Inspection } from './inspection-data';
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'Data inválida');
export const markInput=z.object({label:z.string().trim().min(5).max(140),severity:z.enum(['baixa','moderada','alta']),box:z.tuple([z.number(),z.number(),z.number(),z.number()]).refine(([x,y,w,h])=>x>=0&&y>=0&&w>=.01&&h>=.01&&x+w<=1.001&&y+h<=1.001,'Área fora da fotografia'),note:z.string().trim().max(700).optional()}).strict();
export const createInput=z.object({id:z.string().uuid(),equipmentId:z.string().max(40),date:date.refine(v=>v<=new Date().toISOString().slice(0,10),'A inspeção não pode estar no futuro'),notes:z.string().trim().min(8).max(2500),photoId:z.string().uuid()}).strict();
export const changeInput=z.discriminatedUnion('action',[
z.object({action:z.literal('review'),version:z.number().int().min(0),markId:z.string().max(80),review:z.enum(['confirmada','descartada']),note:z.string().trim().max(700).optional()}).strict(),
z.object({action:z.literal('annotate'),version:z.number().int().min(0),mark:markInput}).strict(),
z.object({action:z.literal('complete'),version:z.number().int().min(0)}).strict(),
]);
export const taskInput=z.object({id:z.string().uuid(),inspectionId:z.string().max(80),title:z.string().trim().min(5).max(160),description:z.string().trim().min(8).max(2000),responsible:z.string().trim().min(2).max(120),dueDate:date}).strict();
export const taskUpdateInput=z.object({version:z.number().int().min(1),status:z.enum(['aberta','planejada','concluida']),resolution:z.string().trim().max(1500)}).strict().refine(v=>v.status!=='concluida'||v.resolution.length>=8,'Descreva o resultado antes de concluir');
export function canCreateMaintenance(record:Inspection){return record.marks.some(m=>m.review==='confirmada');}
export function applyRecordChange(record:Inspection,input:z.infer<typeof changeInput>,actor:string,at:string,newId:string):Inspection{
 const next=structuredClone(record);let text='';
 if(input.action==='review'){const mark=next.marks.find(m=>m.id===input.markId);if(!mark)throw Error('Marcação não encontrada.');mark.review=input.review;mark.reviewedBy=actor;mark.reviewedAt=at;if(input.note!==undefined)mark.note=input.note;text=`Marcação ${input.review}: ${mark.label}.`;next.completed=!next.marks.some(m=>m.review==='pendente');}
 if(input.action==='annotate'){next.marks.push({...input.mark,id:newId,review:'pendente',origin:'manual'});next.completed=false;text=`Anotação manual adicionada: ${input.mark.label}.`;}
 if(input.action==='complete'){if(next.marks.some(m=>m.review==='pendente'))throw Error('Revise todas as marcações antes de concluir.');next.completed=true;text='Revisão visual concluída. Não substitui avaliação de aptidão operacional.';}
 next.version=record.version+1;next.history.push({actor,at,text});return next;
}
