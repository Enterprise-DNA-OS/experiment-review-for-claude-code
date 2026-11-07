do $$declare e uuid;r uuid;i integer;begin
 if exists(select 1 from experiments where code='CHECKOUT') then return;end if;
 for i in 1..4 loop
 insert into experiments(code,external_id,name,owner,hypothesis,primary_goal,control_id,start_on,end_on,min_users,binary_confirmed,randomisation_evidence,purpose,retention_review_on,access_review_on,retrospective)
 values((array['CHECKOUT','DELIVERY','SIGNUP','SEARCH'])[i],(array['demo-101','demo-102','demo-103','demo-104'])[i],(array['Shorter checkout','Delivery promise','Member signup','Search wording'])[i],(array['Aroha','Ben','Aroha',''])[i], 'The revised wording increases completed actions without increasing support requests','purchase','A',current_date-30,current_date-2,1000,true,'Fictional demo: independent random assignment, one outcome per person','Fictional aggregated demo review',current_date+90,case when i=4 then current_date-3 else current_date+30 end,false) returning id into e;
 insert into guardrails(experiment_id,goal_id,direction,tolerance_pp) values(e,'support','lower',1);
 if i<>4 then
 insert into reports(experiment_id,source_hash,source_file,start_on,end_on,segment,actor) values(e,'demo-'||i,'fictional-demo.csv',current_date-30,case when i=3 then current_date-10 else current_date-2 end,'all','Demo') returning id into r;
 insert into observations(report_id,variation_id,variation_name,goal_id,goal_name,users,conversions) values
 (r,'A','Original','purchase','Completed action',10000,1000),
 (r,'B','New wording','purchase','Completed action',case when i=2 then 7000 else 10000 end,case when i=3 then 1040 else 1400 end),
 (r,'A','Original','support','Support request',10000,200),
 (r,'B','New wording','support','Support request',case when i=2 then 7000 else 10000 end,case when i=2 then 500 else 220 end);
 end if;
 update experiments set plan_locked=(i<>4) where id=e;
 end loop;
end$$;
