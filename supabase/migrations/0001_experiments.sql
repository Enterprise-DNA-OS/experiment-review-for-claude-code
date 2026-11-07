create table experiments (
 id uuid primary key default gen_random_uuid(), code text not null unique check(code ~ '^[A-Za-z0-9_-]+$'),
 external_id text not null unique, name text not null check(length(trim(name))>0), owner text not null default '',
 hypothesis text not null default '', primary_goal text not null default '', control_id text not null default '',
 start_on date, end_on date, min_users integer not null default 1000 check(min_users>=20),
 expected_control numeric not null default 0.5 check(expected_control>0 and expected_control<1),
 binary_confirmed boolean not null default false, randomisation_evidence text not null default '',
 plan_locked boolean not null default false, retrospective boolean not null default true,
 purpose text not null default '', retention_review_on date, access_review_on date,
 status text not null default 'review' check(status in ('review','closed','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(end_on is null or start_on is null or end_on>=start_on)
);
create table guardrails (
 id uuid primary key default gen_random_uuid(), experiment_id uuid not null references experiments(id),
 goal_id text not null, direction text not null check(direction in ('higher','lower')),
 tolerance_pp numeric not null check(tolerance_pp>=0 and tolerance_pp<=100),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(experiment_id,goal_id)
);
create table reports (
 id uuid primary key default gen_random_uuid(), sequence bigint generated always as identity unique,
 experiment_id uuid not null references experiments(id), source_hash text not null, source_file text not null,
 start_on date not null, end_on date not null, segment text not null check(length(trim(segment))>0),
 actor text not null check(length(trim(actor))>0), note text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(experiment_id,source_hash,start_on,end_on,segment), check(end_on>=start_on)
);
create table observations (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references reports(id),
 variation_id text not null, variation_name text not null, goal_id text not null, goal_name text not null,
 users integer not null check(users>0), conversions integer not null check(conversions>=0),
 source_data jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(report_id,variation_id,goal_id)
);
create table decisions (
 id uuid primary key default gen_random_uuid(), sequence bigint generated always as identity unique,
 experiment_id uuid not null references experiments(id), report_id uuid not null references reports(id),
 outcome text not null check(outcome in ('adopt','reject','hold')), actor text not null check(length(trim(actor))>0),
 rationale text not null check(length(trim(rationale))>0), evidence jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table activity (
 id uuid primary key default gen_random_uuid(), sequence bigint generated always as identity unique,
 experiment_id uuid references experiments(id), action text not null, actor text not null,
 details jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index reports_experiment on reports(experiment_id,sequence desc);
create index observations_report on observations(report_id);
create index decisions_experiment on decisions(experiment_id,sequence desc);
create function touch_updated() returns trigger language plpgsql as $$begin new.updated_at=clock_timestamp();return new;end$$;
create function protect_plan() returns trigger language plpgsql as $$begin
 if old.plan_locked and (to_jsonb(new)-array['name','owner','status','purpose','retention_review_on','access_review_on','updated_at']) is distinct from (to_jsonb(old)-array['name','owner','status','purpose','retention_review_on','access_review_on','updated_at']) then
 raise exception 'Locked analysis plan cannot change. Register a new experiment for a new hypothesis.';
 end if; return new;end$$;
create trigger protect_plan before update on experiments for each row execute function protect_plan();
create function protect_guardrail() returns trigger language plpgsql as $$begin
 if exists(select 1 from experiments where id=coalesce(new.experiment_id,old.experiment_id) and plan_locked) then raise exception 'Locked plan guardrails cannot change';end if;
 if tg_op='DELETE' then return old;end if;return new;end$$;
create trigger protect_guardrail before insert or update or delete on guardrails for each row execute function protect_guardrail();
do $$declare t text;begin foreach t in array array['experiments','guardrails','reports','observations','decisions','activity'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_updated()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
end loop;end$$;
create view v_latest_reports with (security_invoker=true) as select distinct on(experiment_id,segment) * from reports order by experiment_id,segment,sequence desc;
create view v_attention with (security_invoker=true) as
 select code,name,owner,'analysis plan incomplete' as issue,end_on as due_on from experiments where status='review' and not plan_locked
 union all select code,name,owner,'review overdue',end_on from experiments e where status='review' and end_on<current_date and not exists(select 1 from decisions d join v_latest_reports r on d.report_id=r.id where d.experiment_id=e.id and r.segment='all')
 union all select code,name,owner,'no full-population report',end_on from experiments e where status='review' and not exists(select 1 from reports r where r.experiment_id=e.id and r.segment='all')
 union all select code,name,owner,'report older than seven days',r.end_on from experiments e join v_latest_reports r on r.experiment_id=e.id and r.segment='all' where status='review' and r.end_on<current_date-7
 union all select code,name,owner,'owner missing',end_on from experiments where status<>'archived' and owner='';
create view v_compliance with (security_invoker=true) as
 select code,name,'NZ-IPP1' as rule,'Record a purpose for retained review material' as issue from experiments where status<>'archived' and purpose=''
 union all select code,name,'NZ-IPP9','Retention review missing or due' from experiments where status<>'archived' and (retention_review_on is null or retention_review_on<=current_date)
 union all select code,name,'NZ-IPP5','Access review missing or due' from experiments where status<>'archived' and (access_review_on is null or access_review_on<=current_date);
create view v_portfolio with (security_invoker=true) as
 select e.id,e.code,e.name,e.owner,e.status,e.end_on,e.plan_locked,e.retrospective,
 (select count(*) from reports r where r.experiment_id=e.id) as reports,
 (select count(*) from v_attention a where a.code=e.code) as issues
 from experiments e;
create view v_workload with (security_invoker=true) as
 select coalesce(nullif(owner,''),'Unassigned') as owner,count(*) as experiments,count(*) filter(where end_on<current_date and status='review') as overdue from experiments where status<>'archived' group by owner;
