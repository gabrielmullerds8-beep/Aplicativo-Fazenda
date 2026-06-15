create table if not exists public.harvests (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billings (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.storage_returns (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crop_plans (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.costs (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.directories (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
`r`n
create table if not exists public.deleted_items (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.harvests enable row level security;
alter table public.billings enable row level security;
alter table public.contracts enable row level security;
alter table public.storage_returns enable row level security;
alter table public.crop_plans enable row level security;
alter table public.costs enable row level security;
alter table public.directories enable row level security;
alter table public.deleted_items enable row level security;

drop policy if exists "permitir leitura anonima harvests" on public.harvests;
drop policy if exists "permitir insercao anonima harvests" on public.harvests;
drop policy if exists "permitir atualizacao anonima harvests" on public.harvests;
drop policy if exists "permitir exclusao anonima harvests" on public.harvests;
drop policy if exists "permitir leitura anonima billings" on public.billings;
drop policy if exists "permitir insercao anonima billings" on public.billings;
drop policy if exists "permitir atualizacao anonima billings" on public.billings;
drop policy if exists "permitir exclusao anonima billings" on public.billings;
drop policy if exists "permitir leitura anonima contracts" on public.contracts;
drop policy if exists "permitir insercao anonima contracts" on public.contracts;
drop policy if exists "permitir atualizacao anonima contracts" on public.contracts;
drop policy if exists "permitir exclusao anonima contracts" on public.contracts;
drop policy if exists "permitir leitura anonima storage_returns" on public.storage_returns;
drop policy if exists "permitir insercao anonima storage_returns" on public.storage_returns;
drop policy if exists "permitir atualizacao anonima storage_returns" on public.storage_returns;
drop policy if exists "permitir exclusao anonima storage_returns" on public.storage_returns;
drop policy if exists "permitir leitura anonima crop_plans" on public.crop_plans;
drop policy if exists "permitir insercao anonima crop_plans" on public.crop_plans;
drop policy if exists "permitir atualizacao anonima crop_plans" on public.crop_plans;
drop policy if exists "permitir exclusao anonima crop_plans" on public.crop_plans;
drop policy if exists "permitir leitura anonima costs" on public.costs;
drop policy if exists "permitir insercao anonima costs" on public.costs;
drop policy if exists "permitir atualizacao anonima costs" on public.costs;
drop policy if exists "permitir exclusao anonima costs" on public.costs;
drop policy if exists "permitir leitura anonima directories" on public.directories;
drop policy if exists "permitir insercao anonima directories" on public.directories;
drop policy if exists "permitir atualizacao anonima directories" on public.directories;
drop policy if exists "permitir exclusao anonima directories" on public.directories;
drop policy if exists "permitir leitura anonima deleted_items" on public.deleted_items;
drop policy if exists "permitir insercao anonima deleted_items" on public.deleted_items;
drop policy if exists "permitir atualizacao anonima deleted_items" on public.deleted_items;
drop policy if exists "permitir exclusao anonima deleted_items" on public.deleted_items;

drop policy if exists "permitir leitura autorizada harvests" on public.harvests;
drop policy if exists "permitir gravacao autorizada harvests" on public.harvests;
drop policy if exists "permitir atualizacao autorizada harvests" on public.harvests;
drop policy if exists "permitir exclusao autorizada harvests" on public.harvests;
drop policy if exists "permitir leitura autorizada billings" on public.billings;
drop policy if exists "permitir gravacao autorizada billings" on public.billings;
drop policy if exists "permitir atualizacao autorizada billings" on public.billings;
drop policy if exists "permitir exclusao autorizada billings" on public.billings;
drop policy if exists "permitir leitura autorizada contracts" on public.contracts;
drop policy if exists "permitir gravacao autorizada contracts" on public.contracts;
drop policy if exists "permitir atualizacao autorizada contracts" on public.contracts;
drop policy if exists "permitir exclusao autorizada contracts" on public.contracts;
drop policy if exists "permitir leitura autorizada storage_returns" on public.storage_returns;
drop policy if exists "permitir gravacao autorizada storage_returns" on public.storage_returns;
drop policy if exists "permitir atualizacao autorizada storage_returns" on public.storage_returns;
drop policy if exists "permitir exclusao autorizada storage_returns" on public.storage_returns;
drop policy if exists "permitir leitura autorizada crop_plans" on public.crop_plans;
drop policy if exists "permitir gravacao autorizada crop_plans" on public.crop_plans;
drop policy if exists "permitir atualizacao autorizada crop_plans" on public.crop_plans;
drop policy if exists "permitir exclusao autorizada crop_plans" on public.crop_plans;
drop policy if exists "permitir leitura autorizada costs" on public.costs;
drop policy if exists "permitir gravacao autorizada costs" on public.costs;
drop policy if exists "permitir atualizacao autorizada costs" on public.costs;
drop policy if exists "permitir exclusao autorizada costs" on public.costs;
drop policy if exists "permitir leitura autorizada directories" on public.directories;
drop policy if exists "permitir gravacao autorizada directories" on public.directories;
drop policy if exists "permitir atualizacao autorizada directories" on public.directories;
drop policy if exists "permitir exclusao autorizada directories" on public.directories;
drop policy if exists "permitir leitura autorizada deleted_items" on public.deleted_items;
drop policy if exists "permitir gravacao autorizada deleted_items" on public.deleted_items;
drop policy if exists "permitir atualizacao autorizada deleted_items" on public.deleted_items;
drop policy if exists "permitir exclusao autorizada deleted_items" on public.deleted_items;

create policy "permitir leitura anonima harvests"
on public.harvests for select
to anon
using (true);

create policy "permitir insercao anonima harvests"
on public.harvests for insert
to anon
with check (true);

create policy "permitir atualizacao anonima harvests"
on public.harvests for update
to anon
using (true)
with check (true);

create policy "permitir exclusao anonima harvests"
on public.harvests for delete
to anon
using (true);

create policy "permitir leitura anonima billings"
on public.billings for select
to anon
using (true);

create policy "permitir insercao anonima billings"
on public.billings for insert
to anon
with check (true);

create policy "permitir atualizacao anonima billings"
on public.billings for update
to anon
using (true)
with check (true);

create policy "permitir exclusao anonima billings"
on public.billings for delete
to anon
using (true);

create policy "permitir leitura anonima contracts"
on public.contracts for select
to anon
using (true);

create policy "permitir insercao anonima contracts"
on public.contracts for insert
to anon
with check (true);

create policy "permitir atualizacao anonima contracts"
on public.contracts for update
to anon
using (true)
with check (true);

create policy "permitir exclusao anonima contracts"
on public.contracts for delete
to anon
using (true);

create policy "permitir leitura anonima storage_returns"
on public.storage_returns for select
to anon
using (true);

create policy "permitir insercao anonima storage_returns"
on public.storage_returns for insert
to anon
with check (true);

create policy "permitir atualizacao anonima storage_returns"
on public.storage_returns for update
to anon
using (true)
with check (true);

create policy "permitir exclusao anonima storage_returns"
on public.storage_returns for delete
to anon
using (true);

create policy "permitir leitura anonima crop_plans"
on public.crop_plans for select
to anon
using (true);

create policy "permitir insercao anonima crop_plans"
on public.crop_plans for insert
to anon
with check (true);

create policy "permitir atualizacao anonima crop_plans"
on public.crop_plans for update
to anon
using (true)
with check (true);

create policy "permitir exclusao anonima crop_plans"
on public.crop_plans for delete
to anon
using (true);

create policy "permitir leitura anonima costs"
on public.costs for select
to anon
using (true);

create policy "permitir insercao anonima costs"
on public.costs for insert
to anon
with check (true);

create policy "permitir atualizacao anonima costs"
on public.costs for update
to anon
using (true)
with check (true);

create policy "permitir exclusao anonima costs"
on public.costs for delete
to anon
using (true);

create policy "permitir leitura anonima directories"
on public.directories for select
to anon
using (true);

create policy "permitir insercao anonima directories"
on public.directories for insert
to anon
with check (true);

create policy "permitir atualizacao anonima directories"
on public.directories for update
to anon
using (true)
with check (true);

create policy "permitir exclusao anonima directories"
on public.directories for delete
to anon
using (true);




create policy "permitir atualizacao anonima deleted_items"
on public.deleted_items for update
to anon
using (true)
with check (true);

create policy "permitir exclusao anonima deleted_items"
on public.deleted_items for delete
to anon
using (true);

