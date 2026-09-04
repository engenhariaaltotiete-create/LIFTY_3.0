import { db } from './db/database'
import type { AppSettings, BodyGoal, BodyMeasurement, ExerciseDefinition, ExerciseResult, IntervalWorkoutSession, IntervalWorkoutTemplate, ProfileRecord, ReadyWorkoutTemplate, WorkoutSession, WorkoutTemplate } from './types'

export const uid = () => crypto.randomUUID()
export const localDate = (iso:string) => new Date(iso).toLocaleDateString('sv-SE')
export const startOfWeek = (d=new Date()) => { const x=new Date(d); const day=(x.getDay()+6)%7; x.setHours(0,0,0,0); x.setDate(x.getDate()-day); return x }
export const inSameMonth=(iso:string,d=new Date())=>{const x=new Date(iso);return x.getFullYear()===d.getFullYear()&&x.getMonth()===d.getMonth()}
export const inSameYear=(iso:string,d=new Date())=>new Date(iso).getFullYear()===d.getFullYear()
export const periodStart=(period:'week'|'month'|'year',now=new Date())=>{const d=new Date(now);d.setHours(0,0,0,0);if(period==='week')return startOfWeek(d);if(period==='month'){d.setDate(1);return d}d.setMonth(0,1);return d}

export async function lastExerciseResult(exerciseId:number,beforeId?:number):Promise<ExerciseResult|undefined>{
 const sessions=(await db.sessions.where('status').equals('completed').toArray()).sort((a,b)=>(b.completedAt||b.startedAt).localeCompare(a.completedAt||a.startedAt))
 for(const s of sessions){if(beforeId&&s.id===beforeId)continue;const found=s.results.find(r=>r.exerciseId===exerciseId);if(found)return structuredClone(found)}
}
export function cardioProgress(goal:NonNullable<AppSettings['cardioGoals']>[number],sessions:WorkoutSession[]){
 const start=periodStart(goal.period)
 return sessions.filter(s=>s.status==='completed'&&new Date(s.completedAt||s.startedAt)>=start).flatMap(s=>s.results)
  .filter(r=>goal.activityId?r.exerciseId===goal.activityId:r.exerciseName.toLowerCase()===goal.activity.toLowerCase())
  .reduce((a,r)=>a+(goal.metric==='distance'?(r.distanceKm||0):(r.minutes||0)),0)
}

export function navyBodyFatPct(sex:ProfileRecord['sex'],heightCm?:number,neckCm?:number,waistCm?:number,hipCm?:number){
 if(!heightCm||!neckCm||!waistCm||heightCm<=0||neckCm<=0||waistCm<=0)return undefined
 let density:number|undefined
 if(sex==='male'&&waistCm>neckCm)density=1.0324-0.19077*Math.log10(waistCm-neckCm)+0.15456*Math.log10(heightCm)
 if(sex==='female'&&hipCm&&waistCm+hipCm>neckCm)density=1.29579-0.35004*Math.log10(waistCm+hipCm-neckCm)+0.22100*Math.log10(heightCm)
 if(!density||density<=0)return undefined
 const pct=495/density-450
 return Number.isFinite(pct)&&pct>0&&pct<75?Math.round(pct*10)/10:undefined
}

const blobToDataURL=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(blob)})
const dataURLToBlob=async(data:string)=>(await fetch(data)).blob()
async function encodeBlobs(v:unknown):Promise<unknown>{if(v instanceof Blob)return{__blob:true,data:await blobToDataURL(v)};if(Array.isArray(v))return Promise.all(v.map(encodeBlobs));if(v&&typeof v==='object'){const o:Record<string,unknown>={};for(const[k,x]of Object.entries(v))o[k]=await encodeBlobs(x);return o}return v}
async function decodeBlobs(v:unknown):Promise<unknown>{if(Array.isArray(v))return Promise.all(v.map(decodeBlobs));if(v&&typeof v==='object'){const x=v as Record<string,unknown>;if(x.__blob===true&&typeof x.data==='string')return dataURLToBlob(x.data);const o:Record<string,unknown>={};for(const[k,y]of Object.entries(x))o[k]=await decodeBlobs(y);return o}return v}
export async function compressImage(blob:Blob,maxPx=1280,quality=.82):Promise<Blob>{try{const b=await createImageBitmap(blob);const s=Math.min(1,maxPx/Math.max(b.width,b.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(b.width*s));c.height=Math.max(1,Math.round(b.height*s));const ctx=c.getContext('2d');if(!ctx){b.close();return blob}ctx.drawImage(b,0,0,c.width,c.height);b.close();return await new Promise<Blob>(r=>c.toBlob(x=>r(x||blob),'image/jpeg',quality))}catch{return blob}}

function downloadJson(data:unknown,name:string){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}
export function exportWorkoutJson(workout:WorkoutTemplate){const copy=structuredClone(workout);delete copy.id;downloadJson({app:'LIFTY',kind:'workout',formatVersion:4,exportedAt:new Date().toISOString(),workout:{...copy,formatVersion:4}},`${workout.name.toLowerCase().replace(/[^a-z0-9]+/gi,'-')||'treino'}.lifty.json`)}
export async function importWorkoutJson(file:File){const raw=JSON.parse(await file.text());if(raw.app!=='LIFTY'||raw.kind!=='workout'||raw.formatVersion!==4||!raw.workout?.name||!Array.isArray(raw.workout.blocks))throw new Error('Arquivo de treino LIFTY inválido ou incompatível.');const w=structuredClone(raw.workout) as WorkoutTemplate;delete w.id;w.name=`${w.name} (importado)`;w.createdAt=new Date().toISOString();w.updatedAt=w.createdAt;w.blocks=w.blocks.map((b,bi)=>({...b,id:uid(),order:bi,exercises:(b.exercises||[]).map((e,ei)=>({...e,id:uid(),order:ei}))}));return db.workouts.add(w)}

export async function exportBackup(){const payload={app:'LIFTY',version:4,exportedAt:new Date().toISOString(),exercises:await db.exercises.toArray(),workouts:await db.workouts.toArray(),sessions:await db.sessions.toArray(),readyWorkouts:await db.readyWorkouts.toArray(),profile:await db.profile.toArray(),measurements:await db.measurements.toArray(),goals:await db.goals.toArray(),settings:await db.settings.toArray(),legacyIntervalWorkouts:await db.intervalWorkouts.toArray(),legacyIntervalSessions:await db.intervalSessions.toArray()};downloadJson(await encodeBlobs(payload),`lifty-backup-${localDate(new Date().toISOString())}.json`)}
export async function importBackup(file:File){const raw=JSON.parse(await file.text());if(raw.app!=='LIFTY')throw new Error('Arquivo de backup inválido.');const d=await decodeBlobs(raw) as Record<string,unknown[]>;await db.transaction('rw',[db.exercises,db.workouts,db.sessions,db.intervalWorkouts,db.intervalSessions,db.readyWorkouts,db.profile,db.measurements,db.goals,db.settings],async()=>{await Promise.all([db.exercises.clear(),db.workouts.clear(),db.sessions.clear(),db.intervalWorkouts.clear(),db.intervalSessions.clear(),db.readyWorkouts.clear(),db.profile.clear(),db.measurements.clear(),db.goals.clear(),db.settings.clear()]);if(d.exercises?.length)await db.exercises.bulkPut(d.exercises as ExerciseDefinition[]);if(d.workouts?.length)await db.workouts.bulkPut(d.workouts as WorkoutTemplate[]);if(d.sessions?.length)await db.sessions.bulkPut(d.sessions as WorkoutSession[]);if(d.readyWorkouts?.length)await db.readyWorkouts.bulkPut(d.readyWorkouts as ReadyWorkoutTemplate[]);if(d.profile?.length)await db.profile.bulkPut(d.profile as ProfileRecord[]);if(d.measurements?.length)await db.measurements.bulkPut(d.measurements as BodyMeasurement[]);if(d.goals?.length)await db.goals.bulkPut(d.goals as BodyGoal[]);if(d.settings?.length)await db.settings.bulkPut(d.settings as AppSettings[]);if(d.legacyIntervalWorkouts?.length)await db.intervalWorkouts.bulkPut(d.legacyIntervalWorkouts as IntervalWorkoutTemplate[]);if(d.legacyIntervalSessions?.length)await db.intervalSessions.bulkPut(d.legacyIntervalSessions as IntervalWorkoutSession[])})}
