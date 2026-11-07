import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {execute,commands} from './experiments.mjs';
import {compare,analyse} from './lib/analysis.mjs';
import {parseCsv} from './lib/csv.mjs';
import {page,table,loadBrand} from './lib/render.mjs';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'experiment-review-'));
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL||'';process.env.DATA_DIR=path.join(tmp,'db');process.env.OUTPUT_DIR=tmp;
const called=new Set();let checks=0;
const ok=(value)=>{assert.ok(value);checks++;};
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const date=(n)=>new Date(Date.now()+86400000*n).toISOString().slice(0,10);
let db=await getDb();
const run=async(c,o={},a=[])=>{called.add(c);return execute(db,c,o,a);};
const fails=async(c,o,a,pattern)=>{await assert.rejects(()=>run(c,o,a),pattern);checks++;};
try{
 if(process.env.TEST_DATABASE_URL){const tables=await db.query("select tablename from pg_tables where schemaname='public'");assert.equal(tables.length,0,'TEST_DATABASE_URL must be an empty disposable database');}
 eq((await migrate(db)).ran.length,1);eq((await migrate(db)).ran.length,0);await seed(db);await seed(db);
 eq((await run('portfolio')).length,4);eq((await run('help')).length,commands.length);
 for(const c of ['attention','review-queue','workload','compliance'])ok((await run(c)).length>0);
 ok((await run('weekly-review')).attention.length>0);
 const good=await run('results',{ref:'checkout'});ok(good.eligible);eq(good.metrics[0].delta_pp>3.99,true);
 const bad=await run('results',{ref:'DELIVERY'});ok(bad.blocks.includes('sample ratio mismatch'));ok(bad.guardrails[0].breach);
 ok((await run('results',{ref:'SIGNUP'})).blocks.includes('planned full period not covered'));
 ok((await run('sample-check',{ref:'DELIVERY'}))[0].srm_chi2>10.82);
 eq((await run('guardrails',{ref:'CHECKOUT'}))[0].breach,false);
 eq((await run('show',{ref:'shorter'})).experiment.code,'CHECKOUT');
 const eid=(await run('show',{ref:'CHECKOUT'})).experiment.id;eq((await run('show',{ref:eid.slice(0,8)})).experiment.code,'CHECKOUT');
 await fails('show',{ref:'e'},[],/Ambiguous.*Candidates/);
 eq((await run('reports',{ref:'CHECKOUT'})).length,1);
 await fails('decide',{ref:'DELIVERY',actor:'Reviewer',outcome:'adopt',rationale:'Looks good'},[],/Adoption blocked/);
 const decision=await run('decide',{ref:'CHECKOUT',actor:'Reviewer',outcome:'adopt',rationale:'Reviewed full period and guardrails'});eq(decision.outcome,'adopt');
 eq((await run('decisions',{ref:'CHECKOUT'})).length,1);
 const plan={ref:'CHECKOUT',actor:'Reviewer',hypothesis:'Changed after results',goal:'purchase',control:'A',start:date(-30),end:date(-2),'min-users':'1000',binary:'confirmed',randomisation:'Test'};
 await fails('plan',plan,[],/Locked analysis plan/);
 await fails('add-guardrail',{ref:'CHECKOUT',actor:'Reviewer',goal:'refund',direction:'lower','tolerance-pp':'2'},[],/Locked plan/);
 await run('assign',{ref:'SEARCH',actor:'Reviewer',owner:'Mia'});
 await run('privacy-review',{ref:'SEARCH',actor:'Reviewer',purpose:'Review experiment decisions','retention-review':date(90),'access-review':date(30)});
 eq((await run('compliance')).filter(x=>x.code==='SEARCH').length,0);
 await run('log',{ref:'SEARCH',actor:'Reviewer',note:'Awaiting export'});ok((await run('activity',{ref:'SEARCH'})).length>=3);
 const add=await run('add',{code:'NEW','external-id':'new-301',name:'New funnel',owner:'Mia',actor:'Reviewer'});eq(add.code,'NEW');
 await run('plan',{...plan,ref:'NEW',hypothesis:'Shorter copy improves completion',start:date(1),end:date(15)});
 await run('add-guardrail',{ref:'NEW',actor:'Reviewer',goal:'support',direction:'lower','tolerance-pp':'1'});
 const locked=await run('lock-plan',{ref:'NEW',actor:'Reviewer'});eq(locked.retrospective,false);eq(locked.plan_locked,true);
 await run('close',{ref:'NEW',actor:'Reviewer'});eq((await run('show',{ref:'NEW'})).experiment.status,'closed');
 const fixture=path.join(REPO_ROOT,'fixtures/convert-aggregated.csv'),imp={file:fixture,actor:'Importer',start:date(-30),end:date(-2),segment:'all'};
 eq((await run('import',{...imp,'dry-run':true},['convert-experiences'])).rows,4);
 eq((await db.query("select count(*) as n from experiments where external_id='fixture-201'"))[0].n,0);
 const imported=await run('import',imp,['convert-experiences']);eq(imported.rows,4);
 eq((await run('import',imp,['convert-experiences'])).unchanged,true);
 await fails('import',{...imp,ref:'CHECKOUT'},['convert-experiences'],/does not match/);
 const importedPlan={...plan,ref:imported.code};await run('plan',importedPlan);await run('lock-plan',{ref:imported.code,actor:'Reviewer'});
 await fails('decide',{ref:imported.code,actor:'Reviewer',outcome:'adopt',rationale:'Historical result'},[],/retrospective/);
 await run('decide',{ref:imported.code,actor:'Reviewer',outcome:'hold',rationale:'New confirmation experiment needed'});
 const original=fs.readFileSync(fixture,'utf8');
 const replacement=path.join(tmp,'replacement.csv');fs.writeFileSync(replacement,original.replace('10000,1400','10000,1050'));
 await run('import',{...imp,file:replacement},['convert-experiences']);
 eq((await run('reports',{ref:imported.code})).length,2);
 const current=await run('results',{ref:imported.code});eq(current.metrics[0].variant_users,10000);ok(current.metrics[0].delta_pp<1);
 const oldDecision=(await run('decisions',{ref:imported.code}))[0];ok(oldDecision.report_id!==current.report_id);ok(oldDecision.evidence.analysis.metrics[0].delta_pp>3.99);
 for(const [name,content,pattern] of [
 ['duplicate',original+original.split('\n')[1]+'\n',/Duplicate/],
 ['population',original.replace('Original,support,Support requests,10000','Original,support,Support requests,9999'),/Users differ/],
 ['negative',original.replace('10000,1000','10000,-1'),/Invalid integer/],
 ['mixed',original.replace('fixture-201,Delivery wording,B','other,Delivery wording,B'),/One experience/],
 ['daily',original.replace('experience_id,','date,experience_id,').replaceAll('fixture-201,','2026-01-01,fixture-201,'),/not Daily/]
 ]){
  const file=path.join(tmp,name+'.csv');fs.writeFileSync(file,content);await fails('import',{...imp,file},['convert-experiences'],pattern);
 }
 eq((await run('reports',{ref:imported.code})).length,2);
 await fails('import',{...imp,start:'2026-02-30'},['convert-experiences'],/Invalid calendar date/);
 await fails('import',{...imp,end:date(1)},['convert-experiences'],/future/);
 eq(parseCsv('\uFEFFa,b\r\n"x,y","z""w"\r\n')[0],{a:'x,y',b:'z"w'});
 assert.throws(()=>parseCsv('a,a\n1,2'),/unique/);assert.throws(()=>parseCsv('a,b\n"x,y'),/unclosed/);
 const c=compare({users:10000,conversions:1000},{users:10000,conversions:1400});ok(c.ci_low_pp>3&&c.ci_high_pp<5);eq(compare({users:10,conversions:11},{users:10,conversions:1}).valid,false);
 const symmetric=compare({users:10000,conversions:1400},{users:10000,conversions:1000});ok(Math.abs(c.ci_low_pp+symmetric.ci_high_pp)<1e-10);
 const e=(await run('show',{ref:'CHECKOUT'})).experiment,r=(await db.query('select * from reports where experiment_id=$1',[e.id]))[0],rows=await db.query('select * from observations where report_id=$1',[r.id]);
 ok(analyse(e,{...r,segment:'mobile'},rows,[]).blocks.includes('segmented report is exploratory'));
 ok(analyse(e,{...r,end_on:date(-1)},rows,[]).blocks.includes('planned full period not covered'));
 ok(analyse(e,r,rows,[{goal_id:'missing',direction:'lower',tolerance_pp:1}]).blocks.some(x=>x.includes('missing')));
 ok(analyse(e,r,rows.filter(x=>x.variation_id==='A'),[]).blocks.some(x=>x.includes('exactly two arms')));
 const nonbinary=rows.map(x=>x.goal_id==='purchase'&&x.variation_id==='B'?{...x,conversions:20000}:x);ok(!analyse(e,r,nonbinary,[]).eligible);
 const draft=await run('draft-readout',{ref:'CHECKOUT'});ok(fs.readFileSync(draft.file,'utf8').includes('Human review required'));
 const exported=await run('export',{file:path.join(tmp,'all.json')});eq(JSON.parse(fs.readFileSync(exported.file)).experiments.length,6);
 await fails('export',{file:exported.file},[],/EEXIST/);
 ok(page({title:'<script>bad</script>',sections:[{title:'Rows',html:table([{name:'<img src=x onerror=x>'}])}],brand:loadBrand()}).includes('&lt;script&gt;'));
 assert.throws(()=>page({title:'Bad',brand:{...loadBrand(),primary:'red; bad'}}),/hex/);
 eq([...called].sort(),[...commands].sort());
 await db.close();db=null;
 for(const script of ['view.mjs','docs.mjs']){const child=spawnSync(process.execPath,['scripts/'+script],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(child.status,0);}
 ok(fs.readFileSync(path.join(tmp,'docs-out/readout/CHECKOUT.html'),'utf8').includes('Reviewed full period'));
 for(const args of [['help','--json'],['results','--ref=CHECKOUT','--json'],['attention']]){const child=spawnSync(process.execPath,['scripts/experiments.mjs',...args],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(child.status,0);if(args.includes('--json'))JSON.parse(child.stdout);}
 const ambiguous=spawnSync(process.execPath,['scripts/experiments.mjs','show','--ref=e'],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(ambiguous.status,1);ok(ambiguous.stderr.includes('Candidates'));
 console.log(`PASS: ${checks} assertions; all ${commands.length} CLI commands; ${process.env.TEST_DATABASE_URL?'PostgreSQL':'PGlite'}; imports, decisions, statistics, documents and CLI exits.`);
}finally{if(db)await db.close();fs.rmSync(tmp,{recursive:true,force:true});}
