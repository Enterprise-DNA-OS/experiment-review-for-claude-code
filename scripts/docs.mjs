#!/usr/bin/env node
import {getDb} from './lib/db.mjs';
import {page,table,record,writeOut} from './lib/render.mjs';
import {review} from './experiments.mjs';
const db=await getDb();let count=0;
try{
 await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 for(const e of await db.query("select * from experiments where status<>'archived' order by code")){
  const r=await review(db,e);
  const decisions=await db.query('select outcome,actor,rationale,report_id,created_at from decisions where experiment_id=$1 order by sequence desc',[e.id]);
  const rules=await db.query('select * from v_compliance where code=$1',[e.code]);
  const plan={code:e.code,owner:e.owner,hypothesis:e.hypothesis,primary_goal:e.primary_goal,control_id:e.control_id,start_on:e.start_on,end_on:e.end_on,min_users:e.min_users,expected_control:e.expected_control,plan_locked:e.plan_locked,retrospective:e.retrospective};
  writeOut('docs-out/brief',e.code,page({title:'Experiment brief',subtitle:e.name,sections:[{title:'Analysis plan',html:record(plan)},{title:'Privacy checks',html:table(rules)}]}));
  writeOut('docs-out/readout',e.code,page({title:'Experiment decision readout',subtitle:e.name,sections:[
   {title:r.eligible?'Ready for a human decision':'Hold for review',note:r.period||'No report imported',html:table(r.blocks.map(issue=>({issue})))},
   {title:'Conversion differences',note:'Two-arm binary outcomes. Adjusted Wald 95% intervals. Other goals are exploratory. Percentage points, not relative percentages.',html:table(r.metrics.map(m=>({goal:m.goal,control_users:m.control_users,variant_users:m.variant_users,delta_pp:m.delta_pp,ci_low_pp:m.ci_low_pp,ci_high_pp:m.ci_high_pp})))},
   {title:'Guardrails',note:'Observed changes against configured tolerances. These are not statistical proof of safety.',html:table(r.guardrails)},
   {title:'Decision history',html:table(decisions)},
   {title:'Evidence reference',html:record({report_id:r.report_id,segment:r.segment,srm_chi2:r.srm_chi2,retrospective:e.retrospective})}
  ]}));count+=2;
 }
 console.log(`${count} branded documents rendered`);
}finally{await db.exec('ROLLBACK');await db.close();}
