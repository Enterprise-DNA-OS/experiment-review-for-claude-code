// Fixed-horizon, two-arm binary outcome review. No traffic delivery or sequential inference.
export function compare(c, t) {
 const n0=Number(c.users),n1=Number(t.users),x0=Number(c.conversions),x1=Number(t.conversions);
 const valid=[n0,n1].every(x=>Number.isSafeInteger(x)&&x>0)&&[x0,x1].every(x=>Number.isSafeInteger(x)&&x>=0)&&x0<=n0&&x1<=n1;
 if(!valid)return {valid:false,reason:'Counts are not binary outcomes'};
 const p0=x0/n0,p1=x1/n1,delta=p1-p0;
 // Agresti-Caffo: add one success and one failure to each arm (NIST).
 const a=(x0+1)/(n0+2),b=(x1+1)/(n1+2),se=Math.sqrt(a*(1-a)/(n0+2)+b*(1-b)/(n1+2));
 return {valid:true,control_rate_pct:p0*100,variant_rate_pct:p1*100,delta_pp:delta*100,
 ci_low_pp:Math.max(-1,b-a-1.959963984540054*se)*100,ci_high_pp:Math.min(1,b-a+1.959963984540054*se)*100,
 sufficient:[x0,x1,n0-x0,n1-x1].every(x=>x>=10)};
}
export function analyse(e,r,rows,guards,today=new Date().toISOString().slice(0,10)) {
 const blocks=[];const metrics=[];
 if(!e.plan_locked)blocks.push('plan not locked');
 if(e.retrospective)blocks.push('retrospective analysis: independent confirmation required');
 if(!e.binary_confirmed)blocks.push('unique binary outcomes not confirmed');
 if(!e.randomisation_evidence)blocks.push('randomisation evidence missing');
 if(!r)return {code:e.code,name:e.name,report_id:null,eligible:false,blocks:[...blocks,'no report'],metrics,guardrails:[]};
 if(r.segment!=='all')blocks.push('segmented report is exploratory');
 if(!e.start_on||!e.end_on||r.start_on!==e.start_on||r.end_on!==e.end_on||today<e.end_on)blocks.push('planned full period not covered');
 if(r.end_on>today)blocks.push('future report date');
 const variants=[...new Set(rows.map(x=>x.variation_id))];
 if(variants.length!==2||!variants.includes(e.control_id))blocks.push('exactly two arms including planned control required');
 const treatment=variants.find(x=>x!==e.control_id);
 const goals=[...new Set(rows.map(x=>x.goal_id))];
 for(const goal of goals){
  const c=rows.find(x=>x.goal_id===goal&&x.variation_id===e.control_id),t=rows.find(x=>x.goal_id===goal&&x.variation_id===treatment);
  if(!c||!t){blocks.push(`missing arm for goal ${goal}`);continue;}
  metrics.push({goal_id:goal,goal:c.goal_name,control_users:c.users,variant_users:t.users,...compare(c,t)});
 }
 const main=metrics.find(m=>m.goal_id===e.primary_goal);
 if(!main)blocks.push('primary goal absent');
 let srm_chi2=null;
 if(main){
  const n=Number(main.control_users)+Number(main.variant_users),expected=n*Number(e.expected_control);
  srm_chi2=(main.control_users-expected)**2/expected+(main.variant_users-(n-expected))**2/(n-expected);
  // df=1 chi-square threshold p<0.001; conservative review block, not causality proof.
  if(srm_chi2>10.827566)blocks.push('sample ratio mismatch');
  if(Math.min(main.control_users,main.variant_users)<e.min_users)blocks.push('planned sample size not reached');
  if(!main.valid)blocks.push('primary goal is not binary');
  else if(!main.sufficient)blocks.push('fewer than ten successes or failures in an arm');
  if(!(main.ci_low_pp>0))blocks.push('primary interval does not show a positive effect');
 }
 const guardrails=guards.map(g=>{
  const m=metrics.find(m=>m.goal_id===g.goal_id),delta=m?.delta_pp;
  const breach=!m?.valid||(g.direction==='lower'?delta>Number(g.tolerance_pp):delta< -Number(g.tolerance_pp));
  if(breach)blocks.push(`guardrail ${g.goal_id}: ${m?'tolerance exceeded or invalid counts':'missing'}`);
  return {goal_id:g.goal_id,direction:g.direction,tolerance_pp:Number(g.tolerance_pp),delta_pp:delta??null,breach};
 });
 return {code:e.code,name:e.name,report_id:r.id,segment:r.segment,period:`${r.start_on} to ${r.end_on}`,eligible:blocks.length===0,srm_chi2,blocks,metrics,guardrails};
}
