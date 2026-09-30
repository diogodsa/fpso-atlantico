import {identity,json,failure,guard,ApiError,db,getRecord,saveChange} from '../../../db/inspection-store';
import {taskInput,canCreateMaintenance} from '../../inspection-rules';
import type {MaintenanceTask} from '../../inspection-data';
export async function POST(request:Request){
 try{
  guard(request);const user=(await identity())!;const input=taskInput.parse(await request.json());
  const same=await db().prepare('SELECT payload FROM maintenance_tasks WHERE id = ? AND owner = ?').bind(input.id,user.id).first<{payload:string}>();
  if(same){const task=JSON.parse(same.payload) as MaintenanceTask;return json({task,record:(await getRecord(task.inspectionId,user.id)).record});}
  let {record,stored}=await getRecord(input.inspectionId,user.id);
  if(!canCreateMaintenance(record))throw new ApiError(400,'Confirme ao menos uma observação antes de encaminhar.');
  const prior=await db().prepare('SELECT payload FROM maintenance_tasks WHERE owner = ? AND inspection_id = ?').bind(user.id,record.id).first<{payload:string}>();if(prior)return json({task:JSON.parse(prior.payload)});
  const at=new Date().toISOString();
  if(!stored){record=await saveChange(record,{...structuredClone(record),version:1,history:[...record.history,{at,actor:user.name,text:'Cópia do exemplo salva para acompanhamento de manutenção.'}]},user.id,false);}
  const task:MaintenanceTask={...input,inspectionId:record.id,equipmentId:record.equipmentId,status:'aberta',resolution:'',createdAt:at,updatedAt:at,version:1};
  await db().prepare('INSERT INTO maintenance_tasks (id, owner, inspection_id, equipment_id, payload, version, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(task.id,user.id,record.id,record.equipmentId,JSON.stringify(task),1,at).run();return json({task,record},201);
 }catch(e){return failure(e);}
}
