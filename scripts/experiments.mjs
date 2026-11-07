#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv} from './lib/csv.mjs';
import {table} from './lib/format.mjs';
import {analyse} from './lib/analysis.mjs';
export const commands=['help','portfolio','show','attention','review-queue','workload','reports','results','guardrails','sample-check','compliance','weekly-review','decisions','activity','add','plan','add-guardrail','lock-plan','assign','privacy-review','close','import','decide','log','export','draft-readout'];
const need=(o,k)=>{const v=o[k];if(typeof v!=='string'||!v.trim())throw Error(`--${k}= is required`);return v.trim();};
const integer=(v,min=0)=>{if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(+v)||+v<min||+v>2147483647)throw Error(`Invalid integer: ${v}`);return +v;};
const decimal=(v,min,max)=>{if(String(v).trim()===''||!Number.isFinite(+v)||+v<min||+v>max)throw Error(`Invalid number: ${v}`);return +v;};
const day=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error(`Invalid calendar date: ${v}`);return v;};
const today=()=>new Date().toISOString().slice(0,10);
async function resolve(db,ref,lock=false){
 if(!ref)throw Error('--ref= is required');
 const exact=await db.query('select * from experiments where lower(code)=lower($1) or id::text=$1 or external_id=$1',[ref]);
 if(exact.length===1){ if(lock) return (await db.query('select * from experiments where id=$1 for update',[exact[0].id]))[0]; return exact[0]; }
 const rows=exact.length?exact:await db.query("select * from experiments where position(lower($1) in lower(name))>0 or starts_with(id::text,lower($1)) order by code",[ref]);
 if(rows.length!==1)throw Error(rows.length?`Ambiguous reference. Candidates: ${rows.map(r=>`${r.code} ${r.name} ${r.id}`).join('; ')}`:`No experiment matches ${ref}`);
 return lock?(await db.query('select * from experiments where id=$1 for update',[rows[0].id]))[0]:rows[0];
}
async function audit(db,e,action,actor,details){await db.query('insert into activity(experiment_id,action,actor,details) values($1,$2,$3,$4)',[e?.id||null,action,actor,JSON.stringify(details)]);}
export async function review(db,e,segment='all'){
 const [r]=await db.query('select * from v_latest_reports where experiment_id=$1 and segment=$2',[e.id,segment]);
 const rows=r?await db.query('select * from observations where report_id=$1 order by goal_id,variation_id',[r.id]):[];
 const guards=await db.query('select * from guardrails where experiment_id=$1 order by goal_id',[e.id]);
 return analyse(e,r,rows,guards);
}
async function importReport(db,o,args){
 if(args[0]!=='convert-experiences')throw Error('Use import convert-experiences');
 const actor=need(o,'actor'),filename=path.resolve(need(o,'file')),raw=fs.readFileSync(filename,'utf8'),rows=parseCsv(raw);
 const start=day(need(o,'start')),end=day(need(o,'end')),segment=need(o,'segment');
 if(start>end||end>today())throw Error('Report range must be ordered and not in the future');
 if(!rows.length)throw Error('CSV has no records');
 const headers=Object.keys(rows[0]),required=['experience_id','experience_name','variation_id','variation_name','goal_id','goal_name','users','conversions'];
 for(const k of required)if(!headers.includes(k))throw Error(`Missing Convert Aggregated Tabular column: ${k}`);
 if(headers.includes('date'))throw Error('Use Aggregated Tabular, not Daily: daily unique users cannot be summed safely');
 const experiences=new Set(rows.map(r=>r.experience_id));if(experiences.size!==1)throw Error('One experience per report');
 const seen=new Set(),populations=new Map(),variantNames=new Map(),goalNames=new Map();
 for(const r of rows){
  for(const k of required)if(!String(r[k]).trim())throw Error(`Blank ${k}`);
  r.users=integer(r.users,1);r.conversions=integer(r.conversions);
  const key=JSON.stringify([r.variation_id,r.goal_id]);if(seen.has(key))throw Error('Duplicate variation and goal');seen.add(key);
  if(populations.has(r.variation_id)&&populations.get(r.variation_id)!==r.users)throw Error('Users differ across goals for the same variation');populations.set(r.variation_id,r.users);
  if(variantNames.has(r.variation_id)&&variantNames.get(r.variation_id)!==r.variation_name)throw Error('Conflicting variation names');variantNames.set(r.variation_id,r.variation_name);
  if(goalNames.has(r.goal_id)&&goalNames.get(r.goal_id)!==r.goal_name)throw Error('Conflicting goal names');goalNames.set(r.goal_id,r.goal_name);
  if(r.experience_name!==rows[0].experience_name)throw Error('Conflicting experience names');
 }
 const hash=createHash('sha256').update(raw).digest('hex');
 let e=o.ref?await resolve(db,o.ref,true):(await db.query('select * from experiments where external_id=$1 for update',[rows[0].experience_id]))[0];
 if(e&&e.external_id!==rows[0].experience_id)throw Error('Experience ID does not match the destination');
 if(e?.status==='archived')throw Error('Archived experiment: import declined');
 const code=o.code||`CONVERT-${rows[0].experience_id}`;if(!e&&!/^[A-Za-z0-9_-]+$/.test(code))throw Error('Provide --code= with letters, digits, underscore or hyphen');
 if(!e&&(await db.query('select id from experiments where code=$1',[code])).length)throw Error('Code already belongs to another experience');
 const existing=e?(await db.query('select id from reports where experiment_id=$1 and source_hash=$2 and start_on=$3 and end_on=$4 and segment=$5',[e.id,hash,start,end,segment]))[0]:null;
 if(existing)return {unchanged:true,report_id:existing.id,rows:rows.length};
 if(o['dry-run'])return {dry_run:true,code:e?.code||code,rows:rows.length,variations:populations.size,goals:goalNames.size,non_binary:rows.some(r=>r.conversions>r.users),source_hash:hash};
 if(!e)[e]=await db.query('insert into experiments(code,external_id,name,owner) values($1,$2,$3,$4) returning *',[code,rows[0].experience_id,rows[0].experience_name,o.owner||'']);
 const [r]=await db.query('insert into reports(experiment_id,source_hash,source_file,start_on,end_on,segment,actor,note) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[e.id,hash,path.basename(filename),start,end,segment,actor,o.note||'']);
 for(const x of rows)await db.query('insert into observations(report_id,variation_id,variation_name,goal_id,goal_name,users,conversions,source_data) values($1,$2,$3,$4,$5,$6,$7,$8)',[r.id,x.variation_id,x.variation_name,x.goal_id,x.goal_name,x.users,x.conversions,JSON.stringify(x)]);
 await audit(db,e,'import',actor,{report_id:r.id,source_hash:hash,rows:rows.length,segment});
 return {code:e.code,report_id:r.id,rows:rows.length,source_hash:hash};
}
export async function execute(db,command,o={},args=[]){
 if(!commands.includes(command))throw Error(`Unknown command ${command}. Use help.`);
 if(command==='help')return commands.map(command=>({command}));
 if(command==='portfolio')return db.query('select code,name,owner,status,end_on,plan_locked,retrospective,reports,issues from v_portfolio order by code');
 if(command==='attention')return db.query('select * from v_attention order by due_on nulls first,code,issue');
 if(command==='compliance')return db.query('select * from v_compliance order by code,rule');
 if(command==='workload')return db.query('select * from v_workload order by overdue desc,owner');
 if(command==='review-queue'){
  const out=[];for(const e of await db.query("select * from experiments where status='review' order by code")){const r=await review(db,e);out.push({code:e.code,owner:e.owner,eligible:r.eligible,blocks:r.blocks.join('; ')});}return out;
 }
 if(command==='weekly-review')return {portfolio:await execute(db,'portfolio'),attention:await execute(db,'attention'),review_queue:await execute(db,'review-queue'),compliance:await execute(db,'compliance')};
 if(command==='export'){
  const out={format:'experiment-review-v1',exported_at:new Date().toISOString()};
  for(const table of ['experiments','guardrails','reports','observations','decisions','activity'])out[table]=await db.query(`select * from ${table} order by id`);
  const file=path.resolve(o.file||path.join(REPO_ROOT,'exports',`review-${Date.now()}.json`));fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n',{flag:'wx',mode:0o600});return {file,experiments:out.experiments.length};
 }
 const writes=['add','plan','add-guardrail','lock-plan','assign','privacy-review','close','import','decide','log'];
 const writing=writes.includes(command);if(writing)await db.exec('BEGIN');
 try {
 let result,e;
 if(command==='import')result=await importReport(db,o,args);
 else if(command==='add'){
  const actor=need(o,'actor'),code=need(o,'code');
  if(!/^[A-Za-z0-9_-]+$/.test(code))throw Error('Invalid code');
  [e]=await db.query('insert into experiments(code,external_id,name,owner) values($1,$2,$3,$4) returning *',[code,need(o,'external-id'),need(o,'name'),need(o,'owner')]);
  await audit(db,e,'add',actor,{code});result=e;
 }else{
  e=await resolve(db,need(o,'ref'),writing);
  if(command==='show')result={experiment:e,reports:await db.query('select id,sequence,start_on,end_on,segment,source_file,source_hash from reports where experiment_id=$1 order by sequence desc',[e.id]),analysis:await review(db,e,o.segment||'all')};
  else if(command==='reports')result=await db.query('select id,sequence,start_on,end_on,segment,source_file,source_hash from reports where experiment_id=$1 order by sequence desc',[e.id]);
  else if(command==='decisions')result=await db.query('select * from decisions where experiment_id=$1 order by sequence desc',[e.id]);
  else if(command==='activity')result=await db.query('select action,actor,details,created_at from activity where experiment_id=$1 order by sequence desc',[e.id]);
  else if(['results','sample-check','guardrails'].includes(command)){
   const r=await review(db,e,o.segment||'all');
   result=command==='results'?r:command==='guardrails'?r.guardrails:[{code:e.code,srm_chi2:r.srm_chi2??null,eligible:r.eligible,blocks:r.blocks.join('; ')}];
  }else if(command==='draft-readout'){
   const r=await review(db,e,o.segment||'all');const file=path.join(process.env.OUTPUT_DIR||REPO_ROOT,'drafts',`${e.code}-${Date.now()}.md`);
   fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
   fs.writeFileSync(file,`# Draft: ${e.name}\n\nOwner: ${e.owner||'Unassigned'}\n\n${human(r)}\n\nHuman review required. No website change or message has been sent.\n`,{flag:'wx',mode:0o600});result={file};
  }else{
   const actor=need(o,'actor');if(e.status==='archived')throw Error('Archived experiment cannot be changed');
   if(command==='plan'){
    const start=day(need(o,'start')),end=day(need(o,'end'));if(start>end)throw Error('Plan end precedes start');
    const [count]=await db.query('select count(*) as n from reports where experiment_id=$1',[e.id]);
    const retrospective=start<today()||Number(count.n)>0;
    result=(await db.query('update experiments set hypothesis=$2,primary_goal=$3,control_id=$4,start_on=$5,end_on=$6,min_users=$7,expected_control=$8,binary_confirmed=$9,randomisation_evidence=$10,retrospective=$11 where id=$1 returning *',[e.id,need(o,'hypothesis'),need(o,'goal'),need(o,'control'),start,end,integer(need(o,'min-users'),20),decimal(o['control-share']??0.5,0.001,0.999),o.binary==='confirmed',need(o,'randomisation'),retrospective]))[0];
   }else if(command==='add-guardrail'){
    const direction=need(o,'direction');if(!['higher','lower'].includes(direction))throw Error('Direction must be higher or lower');
    result=(await db.query('insert into guardrails(experiment_id,goal_id,direction,tolerance_pp) values($1,$2,$3,$4) on conflict(experiment_id,goal_id) do update set direction=excluded.direction,tolerance_pp=excluded.tolerance_pp returning *',[e.id,need(o,'goal'),direction,decimal(need(o,'tolerance-pp'),0,100)]))[0];
   }else if(command==='lock-plan'){
    if(!e.hypothesis||!e.primary_goal||!e.control_id||!e.start_on||!e.end_on||!e.binary_confirmed||!e.randomisation_evidence)throw Error('Complete the binary analysis plan before locking');
    const [count]=await db.query('select count(*) as n from reports where experiment_id=$1',[e.id]);
    result=(await db.query('update experiments set plan_locked=true,retrospective=$2 where id=$1 returning *',[e.id,e.retrospective||e.start_on<today()||Number(count.n)>0]))[0];
   }else if(command==='assign')result=(await db.query('update experiments set owner=$2 where id=$1 returning *',[e.id,need(o,'owner')]))[0];
   else if(command==='privacy-review')result=(await db.query('update experiments set purpose=$2,retention_review_on=$3,access_review_on=$4 where id=$1 returning *',[e.id,need(o,'purpose'),day(need(o,'retention-review')),day(need(o,'access-review'))]))[0];
   else if(command==='close')result=(await db.query("update experiments set status='closed' where id=$1 returning *",[e.id]))[0];
   else if(command==='decide'){
    if(e.status!=='review')throw Error('Decision requires an open review');
    const outcome=need(o,'outcome'),rationale=need(o,'rationale');if(!['adopt','reject','hold'].includes(outcome))throw Error('Outcome must be adopt, reject or hold');
    const r=await review(db,e,o.segment||'all');if(!r.report_id)throw Error('A decision requires an imported report');
    if(outcome==='adopt'&&!r.eligible)throw Error(`Adoption blocked: ${r.blocks.join('; ')}`);
    result=(await db.query('insert into decisions(experiment_id,report_id,outcome,actor,rationale,evidence) values($1,$2,$3,$4,$5,$6) returning *',[e.id,r.report_id,outcome,actor,rationale,JSON.stringify({plan:e,analysis:r})]))[0];
   }else if(command==='log')result={note:need(o,'note')};
   await audit(db,e,command,actor,command==='log'?result:{before:e,after:result});
  }
 }
 if(writing)await db.exec('COMMIT');return result;
 }catch(error){if(writing)await db.exec('ROLLBACK');throw error;}
}
export function human(v){
 if(Array.isArray(v)){if(!v.length)return '(none)';const rows=v.map(r=>Object.fromEntries(Object.entries(r).map(([k,x])=>[k,typeof x==='object'?JSON.stringify(x):typeof x==='number'&&!Number.isInteger(x)?x.toFixed(4):x])));return table(rows,Object.keys(rows[0]).map(key=>({key,label:key,width:90})));}
 if(v?.metrics){return `${v.code}: ${v.eligible?'Ready for human decision':'Hold for review'}\n${v.period||''}\n${v.blocks.length?'Checks: '+v.blocks.join('; '):'All configured checks passed.'}\n${human(v.metrics.map(m=>({goal:m.goal,control_users:m.control_users,variant_users:m.variant_users,delta_pp:m.delta_pp??null,ci_low_pp:m.ci_low_pp??null,ci_high_pp:m.ci_high_pp??null})))}\nGuardrails:\n${human(v.guardrails)}`;}
 if(v&&typeof v==='object')return Object.entries(v).map(([k,x])=>`${k}: ${typeof x==='object'?'\n'+human(x):x}`).join('\n');return String(v);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const a=process.argv.slice(2),command=a.shift()||'help',o={},args=[];
 for(const s of a){if(s.startsWith('--')){const i=s.indexOf('=');const k=s.slice(2,i<0?undefined:i);if(Object.hasOwn(o,k))throw Error(`Duplicate --${k}`);o[k]=i<0?true:s.slice(i+1);}else args.push(s);}
 let db;try{db=await getDb();const result=await execute(db,command,o,args);console.log(o.json?JSON.stringify(result,null,2):human(result));}catch(e){console.error(o.json?JSON.stringify({error:e.message}):e.message);process.exitCode=1;}finally{if(db)await db.close();}
}
