-- =====================================================================
-- Olho na Brasa · LP Premium
-- Checkout Mercado Pago + rastreamento de sessões + endurecimento de segurança
--
-- Projeto Supabase: pwpfpseatkwluahjqclc (o mesmo de src/lib/supabase.ts)
-- Rodar no SQL Editor do Supabase (ou `supabase db push`). Idempotente.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. ADMINS
-- Só quem está nesta tabela lê leads, sessões, pedidos e edita preços.
-- Antes, qualquer usuário autenticado lia os leads.
-- ---------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists admin_users_self on public.admin_users;
create policy admin_users_self on public.admin_users
  for select to authenticated using (user_id = auth.uid());
grant select on public.admin_users to authenticated;

-- Os cadastros já existentes são a equipe (signup está desligado).
-- REVISE esta lista depois de rodar: select * from public.admin_users;
insert into public.admin_users (user_id, email)
select id, coalesce(email, '') from auth.users
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------
-- 2. LEADS: RLS só para admin + save_lead endurecido
-- ---------------------------------------------------------------------
alter table public.leads add column if not exists cep text;
alter table public.leads add column if not exists session_id uuid;
alter table public.leads add column if not exists visitor_id uuid;
alter table public.leads enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'leads' loop
    execute format('drop policy %I on public.leads', p.policyname);
  end loop;
end $$;

revoke all on public.leads from anon;
grant select, update, delete on public.leads to authenticated;
create policy leads_admin_select on public.leads for select to authenticated using (public.is_admin());
create policy leads_admin_update on public.leads for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy leads_admin_delete on public.leads for delete to authenticated using (public.is_admin());

create index if not exists leads_session_idx on public.leads (session_id);
create index if not exists leads_visitor_idx on public.leads (visitor_id);

-- Grava/atualiza o lead a partir da LP. Só aceita as colunas conhecidas,
-- corta tamanhos, e só permite editar um lead nas primeiras 48h.
drop function if exists public.save_lead(uuid, jsonb);
create function public.save_lead(p_id uuid, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created timestamptz;
  function_limit int := 500;
begin
  if p_id is null or p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'invalid payload';
  end if;
  if length(p_data::text) > 8000 then
    raise exception 'payload too large';
  end if;

  select created_at into v_created from public.leads where id = p_id;
  if v_created is not null and v_created < now() - interval '48 hours' then
    raise exception 'lead locked';
  end if;

  insert into public.leads as l (
    id, nome, whatsapp, email, cidade, estado, cep, estagio, tipo_projeto, foto_url,
    origem_captura, clicked_whatsapp, clicked_whatsapp_at, user_agent, page_url,
    utm_source, utm_medium, utm_campaign, utm_content, session_id, visitor_id
  ) values (
    p_id,
    left(p_data->>'nome', 120),
    left(p_data->>'whatsapp', 30),
    left(p_data->>'email', 160),
    left(p_data->>'cidade', 80),
    left(p_data->>'estado', 2),
    left(p_data->>'cep', 9),
    left(p_data->>'estagio', 200),
    left(p_data->>'tipo_projeto', 200),
    left(p_data->>'foto_url', function_limit),
    coalesce(left(p_data->>'origem_captura', 30), 'formulario'),
    coalesce((p_data->>'clicked_whatsapp')::boolean, false),
    (p_data->>'clicked_whatsapp_at')::timestamptz,
    left(p_data->>'user_agent', 400),
    left(p_data->>'page_url', function_limit),
    left(p_data->>'utm_source', 120),
    left(p_data->>'utm_medium', 120),
    left(p_data->>'utm_campaign', 200),
    left(p_data->>'utm_content', 200),
    case when p_data->>'session_id' ~* '^[0-9a-f-]{36}$' then (p_data->>'session_id')::uuid end,
    case when p_data->>'visitor_id' ~* '^[0-9a-f-]{36}$' then (p_data->>'visitor_id')::uuid end
  )
  on conflict (id) do update set
    nome          = case when p_data ? 'nome'          then excluded.nome          else l.nome end,
    whatsapp      = case when p_data ? 'whatsapp'      then excluded.whatsapp      else l.whatsapp end,
    email         = case when p_data ? 'email'         then excluded.email         else l.email end,
    cidade        = case when p_data ? 'cidade'        then excluded.cidade        else l.cidade end,
    estado        = case when p_data ? 'estado'        then excluded.estado        else l.estado end,
    cep           = case when p_data ? 'cep'           then excluded.cep           else l.cep end,
    estagio       = case when p_data ? 'estagio'       then excluded.estagio       else l.estagio end,
    tipo_projeto  = case when p_data ? 'tipo_projeto'  then excluded.tipo_projeto  else l.tipo_projeto end,
    foto_url      = case when p_data ? 'foto_url'      then excluded.foto_url      else l.foto_url end,
    origem_captura= case when p_data ? 'origem_captura' then excluded.origem_captura else l.origem_captura end,
    clicked_whatsapp    = l.clicked_whatsapp or excluded.clicked_whatsapp,
    clicked_whatsapp_at = coalesce(l.clicked_whatsapp_at, excluded.clicked_whatsapp_at),
    session_id    = coalesce(l.session_id, excluded.session_id),
    visitor_id    = coalesce(l.visitor_id, excluded.visitor_id);

  -- liga a sessão rastreada ao lead
  if p_data->>'session_id' ~* '^[0-9a-f-]{36}$' then
    update public.lp_sessions set lead_id = p_id where id = (p_data->>'session_id')::uuid and lead_id is null;
  end if;
  if p_data->>'visitor_id' ~* '^[0-9a-f-]{36}$' then
    update public.lp_visitors set lead_id = p_id where id = (p_data->>'visitor_id')::uuid and lead_id is null;
  end if;
end;
$$;
revoke all on function public.save_lead(uuid, jsonb) from public;
grant execute on function public.save_lead(uuid, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. STORAGE: fotos de clientes deixam de ser LISTÁVEIS por anônimos
-- (antes qualquer pessoa listava e baixava as ~140 fotos do bucket).
-- O link público individual continua funcionando (o CRM usa).
-- ---------------------------------------------------------------------
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd in ('SELECT', 'ALL')
      and coalesce(qual, '') ilike '%churrasqueira-fotos%'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

drop policy if exists fotos_admin_select on storage.objects;
create policy fotos_admin_select on storage.objects
  for select to authenticated using (bucket_id = 'churrasqueira-fotos' and public.is_admin());

update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif']
 where id = 'churrasqueira-fotos';

-- ---------------------------------------------------------------------
-- 4. CATÁLOGO, PREÇOS E CONFIGURAÇÕES DA LOJA (leitura pública)
-- ---------------------------------------------------------------------
create table if not exists public.catalog_items (
  id text primary key,
  name text not null,
  summary text not null default '',
  uses_depth boolean not null default false,   -- preço depende do comprimento (B)?
  in_kit boolean not null default true,        -- aparece no "Monte o seu"
  size_kind text not null default 'L' check (size_kind in ('boca','LxC','L','comp')),
  active boolean not null default true,
  sort int not null default 0
);

alter table public.catalog_items add column if not exists size_kind text not null default 'L';

create table if not exists public.price_table (
  item_id text not null references public.catalog_items (id) on delete cascade,
  width_cm int not null check (width_cm between 20 and 300),
  depth_cm int not null default 0 check (depth_cm between 0 and 300),
  price_cents int not null check (price_cents > 0),
  updated_at timestamptz not null default now(),
  primary key (item_id, width_cm, depth_cm)
);

create table if not exists public.store_settings (
  id int primary key default 1 check (id = 1),
  pix_discount_pct numeric(5,2) not null default 5,
  max_installments int not null default 10,
  production_days int not null default 10,
  free_shipping_ufs text[] not null default array['PR','SC','RS','SP','RJ','MG','ES'],
  shipping_cents_by_uf jsonb not null default '{}'::jsonb,  -- {"BA": 29000}; ausente = finaliza no WhatsApp
  checkout_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.store_settings (id) values (1) on conflict (id) do nothing;

alter table public.catalog_items enable row level security;
alter table public.price_table enable row level security;
alter table public.store_settings enable row level security;

drop policy if exists catalog_read on public.catalog_items;
drop policy if exists catalog_admin on public.catalog_items;
create policy catalog_read on public.catalog_items for select to anon, authenticated using (active or public.is_admin());
create policy catalog_admin on public.catalog_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists prices_read on public.price_table;
drop policy if exists prices_admin on public.price_table;
create policy prices_read on public.price_table for select to anon, authenticated using (true);
create policy prices_admin on public.price_table for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_read on public.store_settings;
drop policy if exists settings_admin on public.store_settings;
create policy settings_read on public.store_settings for select to anon, authenticated using (true);
create policy settings_admin on public.store_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.catalog_items, public.price_table, public.store_settings to anon, authenticated;
grant insert, update, delete on public.catalog_items, public.price_table to authenticated;
grant update on public.store_settings to authenticated;

-- Tamanho das peças avulsas = variações do Wbuy:
--   kit: medida da boca (A x B) | grelhas: L x C da peça | suporte: L | espetos: comprimento total
insert into public.catalog_items (id, name, summary, uses_depth, in_kit, size_kind, sort) values
  ('kit_premium',        'Kit Premium completo',     'Suporte suspenso, grelha uruguaia, grelha de descanso e espetos', true,  false, 'boca', 0),
  ('suporte_suspenso',   'Suporte Suspenso',         'Fixado no fundo, frente livre, níveis de altura (35 cm de altura)', false, true, 'L',    1),
  ('grelha_uruguaia',    'Grelha Uruguaia Premium',  'Barras em V que escoam a gordura',                                true,  true, 'LxC',  2),
  ('grelha_descanso',    'Grelha de Descanso',       'Mantém a carne aquecida sem passar do ponto',                    true,  true, 'LxC',  3),
  ('espeto_barra_chata', 'Espeto Barra Chata',       'Barra maciça, ideal para cortes grandes',                        false, true, 'comp', 4),
  ('espeto_v',           'Espeto Simples em V',      'Perfil em V, segura linguiça e frango',                          false, true, 'comp', 5)
on conflict (id) do update set name = excluded.name, summary = excluded.summary, uses_depth = excluded.uses_depth,
  in_kit = excluded.in_kit, size_kind = excluded.size_kind, sort = excluded.sort;

-- Preços do Kit Premium coletados do site (olhonabrasa.com.br) em 25/09/2026:
-- as 70 combinações Largura A (50-95) x Comprimento B (40-70) do produto no Wbuy.
insert into public.price_table (item_id, width_cm, depth_cm, price_cents) values
  ('kit_premium', 50, 40, 345529), ('kit_premium', 50, 45, 348946), ('kit_premium', 50, 50, 350975), ('kit_premium', 50, 55, 353371), ('kit_premium', 50, 60, 353371), ('kit_premium', 50, 65, 353371), ('kit_premium', 50, 70, 353371),
  ('kit_premium', 55, 40, 352761), ('kit_premium', 55, 45, 356178), ('kit_premium', 55, 50, 358207), ('kit_premium', 55, 55, 360603), ('kit_premium', 55, 60, 360603), ('kit_premium', 55, 65, 360603), ('kit_premium', 55, 70, 360603),
  ('kit_premium', 60, 40, 369117), ('kit_premium', 60, 45, 376688), ('kit_premium', 60, 50, 385431), ('kit_premium', 60, 55, 394539), ('kit_premium', 60, 60, 394539), ('kit_premium', 60, 65, 394539), ('kit_premium', 60, 70, 394539),
  ('kit_premium', 65, 40, 373213), ('kit_premium', 65, 45, 380784), ('kit_premium', 65, 50, 389527), ('kit_premium', 65, 55, 398635), ('kit_premium', 65, 60, 398635), ('kit_premium', 65, 65, 398635), ('kit_premium', 65, 70, 398635),
  ('kit_premium', 70, 40, 382930), ('kit_premium', 70, 45, 390501), ('kit_premium', 70, 50, 399244), ('kit_premium', 70, 55, 408352), ('kit_premium', 70, 60, 408352), ('kit_premium', 70, 65, 408352), ('kit_premium', 70, 70, 408352),
  ('kit_premium', 75, 40, 387025), ('kit_premium', 75, 45, 394596), ('kit_premium', 75, 50, 403339), ('kit_premium', 75, 55, 412447), ('kit_premium', 75, 60, 412447), ('kit_premium', 75, 65, 412447), ('kit_premium', 75, 70, 412447),
  ('kit_premium', 80, 40, 436848), ('kit_premium', 80, 45, 445865), ('kit_premium', 80, 50, 455936), ('kit_premium', 80, 55, 466358), ('kit_premium', 80, 60, 466358), ('kit_premium', 80, 65, 466358), ('kit_premium', 80, 70, 466358),
  ('kit_premium', 85, 40, 440940), ('kit_premium', 85, 45, 449957), ('kit_premium', 85, 50, 460028), ('kit_premium', 85, 55, 470450), ('kit_premium', 85, 60, 470450), ('kit_premium', 85, 65, 470450), ('kit_premium', 85, 70, 470450),
  ('kit_premium', 90, 40, 457949), ('kit_premium', 90, 45, 464990), ('kit_premium', 90, 50, 479119), ('kit_premium', 90, 55, 490541), ('kit_premium', 90, 60, 490541), ('kit_premium', 90, 65, 490541), ('kit_premium', 90, 70, 490541),
  ('kit_premium', 95, 40, 469175), ('kit_premium', 95, 45, 476216), ('kit_premium', 95, 50, 490345), ('kit_premium', 95, 55, 491741), ('kit_premium', 95, 60, 491741), ('kit_premium', 95, 65, 491741), ('kit_premium', 95, 70, 491741)
on conflict (item_id, width_cm, depth_cm) do nothing;

-- Peças avulsas (variações do Wbuy, coletadas em 25/09/2026). Grelhas: L x C da peça; suporte: L; espetos: comprimento.
insert into public.price_table (item_id, width_cm, depth_cm, price_cents) values
  ('suporte_suspenso', 45, 0, 103617),
  ('suporte_suspenso', 50, 0, 107713),
  ('suporte_suspenso', 55, 0, 111808),
  ('suporte_suspenso', 60, 0, 115896),
  ('suporte_suspenso', 65, 0, 119992),
  ('suporte_suspenso', 70, 0, 124084),
  ('suporte_suspenso', 75, 0, 128179),
  ('suporte_suspenso', 80, 0, 134024),
  ('suporte_suspenso', 85, 0, 138116),
  ('suporte_suspenso', 90, 0, 142211),
  ('suporte_suspenso', 95, 0, 148461),
  ('suporte_suspenso', 100, 0, 154711),
  ('suporte_suspenso', 105, 0, 160961),
  ('suporte_suspenso', 110, 0, 167211),
  ('suporte_suspenso', 115, 0, 173461),
  ('suporte_suspenso', 120, 0, 179711),
  ('suporte_suspenso', 125, 0, 185961),
  ('suporte_suspenso', 130, 0, 192211),
  ('grelha_uruguaia', 22, 35, 68157),
  ('grelha_uruguaia', 22, 40, 69000),
  ('grelha_uruguaia', 22, 45, 70000),
  ('grelha_uruguaia', 22, 50, 70500),
  ('grelha_uruguaia', 22, 55, 71000),
  ('grelha_uruguaia', 27, 35, 72025),
  ('grelha_uruguaia', 27, 40, 73890),
  ('grelha_uruguaia', 27, 45, 76967),
  ('grelha_uruguaia', 27, 50, 80824),
  ('grelha_uruguaia', 27, 55, 84680),
  ('grelha_uruguaia', 32, 35, 72025),
  ('grelha_uruguaia', 32, 40, 73890),
  ('grelha_uruguaia', 32, 45, 76967),
  ('grelha_uruguaia', 32, 50, 80824),
  ('grelha_uruguaia', 32, 55, 84680),
  ('grelha_uruguaia', 37, 35, 77135),
  ('grelha_uruguaia', 37, 40, 79000),
  ('grelha_uruguaia', 37, 45, 82800),
  ('grelha_uruguaia', 37, 50, 87321),
  ('grelha_uruguaia', 37, 55, 91834),
  ('grelha_uruguaia', 40, 35, 81103),
  ('grelha_uruguaia', 40, 40, 82969),
  ('grelha_uruguaia', 40, 45, 85781),
  ('grelha_uruguaia', 40, 50, 92331),
  ('grelha_uruguaia', 40, 55, 97344),
  ('grelha_uruguaia', 50, 35, 90178),
  ('grelha_uruguaia', 50, 40, 92043),
  ('grelha_uruguaia', 50, 45, 96012),
  ('grelha_uruguaia', 50, 50, 103834),
  ('grelha_uruguaia', 50, 55, 109999),
  ('grelha_descanso', 27, 20, 45000),
  ('grelha_descanso', 32, 20, 47000),
  ('grelha_descanso', 37, 20, 49984),
  ('grelha_descanso', 40, 20, 52472),
  ('grelha_descanso', 44, 20, 54960),
  ('grelha_descanso', 50, 20, 58097),
  ('grelha_descanso', 54, 20, 60585),
  ('grelha_descanso', 64, 20, 66210),
  ('espeto_barra_chata', 60, 0, 23430),
  ('espeto_barra_chata', 65, 0, 24287),
  ('espeto_barra_chata', 70, 0, 25149),
  ('espeto_barra_chata', 75, 0, 25999),
  ('espeto_barra_chata', 80, 0, 26857),
  ('espeto_v', 60, 0, 23429),
  ('espeto_v', 65, 0, 24287),
  ('espeto_v', 70, 0, 25149),
  ('espeto_v', 75, 0, 25999),
  ('espeto_v', 80, 0, 26857)
on conflict (item_id, width_cm, depth_cm) do nothing;

-- ---------------------------------------------------------------------
-- 5. RASTREAMENTO DA LP (visitante → sessões → eventos)
-- Escrita só pela função track() (security definer, com limites).
-- ---------------------------------------------------------------------
create table if not exists public.lp_visitors (
  id uuid primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  sessions_count int not null default 0,
  lead_id uuid,
  order_id uuid
);

create table if not exists public.lp_sessions (
  id uuid primary key,
  visitor_id uuid not null references public.lp_visitors (id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  landing_url text,
  referrer text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  gclid text, fbclid text,
  device text, os text, browser text,
  screen_w int, screen_h int, viewport_w int, viewport_h int,
  lang text, tz text,
  page_h int,
  max_scroll_pct int not null default 0,
  active_ms bigint not null default 0,
  clicks int not null default 0,
  events int not null default 0,
  sections jsonb not null default '{}'::jsonb,   -- {"configurador": 12400, ...} ms visível
  furthest_section text,
  configured boolean not null default false,
  checkout_started boolean not null default false,
  purchased boolean not null default false,
  whatsapp_clicked boolean not null default false,
  lead_id uuid,
  order_id uuid,
  ended_at timestamptz
);
create index if not exists lp_sessions_started_idx on public.lp_sessions (started_at desc);
create index if not exists lp_sessions_visitor_idx on public.lp_sessions (visitor_id);
create index if not exists lp_sessions_lead_idx on public.lp_sessions (lead_id);

create table if not exists public.lp_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.lp_sessions (id) on delete cascade,
  ts timestamptz not null,
  t_ms int,                       -- ms desde o início da sessão
  type text not null,
  section text,
  scroll_pct smallint,
  x real, y real,                  -- clique: x relativo à largura (0-1), y em px do documento
  data jsonb
);
create index if not exists lp_events_session_idx on public.lp_events (session_id, ts);
create index if not exists lp_events_type_idx on public.lp_events (type, ts desc);

alter table public.lp_visitors enable row level security;
alter table public.lp_sessions enable row level security;
alter table public.lp_events enable row level security;
revoke all on public.lp_visitors, public.lp_sessions, public.lp_events from anon;
grant select, delete on public.lp_visitors, public.lp_sessions, public.lp_events to authenticated;

drop policy if exists lpv_admin on public.lp_visitors;
drop policy if exists lps_admin on public.lp_sessions;
drop policy if exists lpe_admin on public.lp_events;
create policy lpv_admin on public.lp_visitors for select to authenticated using (public.is_admin());
create policy lps_admin on public.lp_sessions for select to authenticated using (public.is_admin());
create policy lpe_admin on public.lp_events for select to authenticated using (public.is_admin());
drop policy if exists lpv_admin_del on public.lp_visitors;
drop policy if exists lps_admin_del on public.lp_sessions;
drop policy if exists lpe_admin_del on public.lp_events;
create policy lpv_admin_del on public.lp_visitors for delete to authenticated using (public.is_admin());
create policy lps_admin_del on public.lp_sessions for delete to authenticated using (public.is_admin());
create policy lpe_admin_del on public.lp_events for delete to authenticated using (public.is_admin());

create or replace function public.track(p_session jsonb, p_events jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sid uuid;
  v_vid uuid;
  v_count int;
  v_existing int;
  e jsonb;
  v_clicks int := 0;
  v_type text;
begin
  if jsonb_typeof(p_session) <> 'object' or jsonb_typeof(p_events) <> 'array' then
    raise exception 'invalid payload';
  end if;
  if length(p_events::text) > 60000 or length(p_session::text) > 6000 then
    raise exception 'payload too large';
  end if;
  if not (p_session->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
     or not (p_session->>'visitor_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    raise exception 'invalid ids';
  end if;
  v_sid := (p_session->>'id')::uuid;
  v_vid := (p_session->>'visitor_id')::uuid;
  v_count := jsonb_array_length(p_events);
  if v_count > 80 then
    raise exception 'too many events';
  end if;

  select events into v_existing from public.lp_sessions where id = v_sid;
  if v_existing is not null and v_existing > 6000 then
    return; -- teto por sessão: ignora silenciosamente
  end if;

  insert into public.lp_visitors (id) values (v_vid)
  on conflict (id) do update set last_seen_at = now();

  if v_existing is null then
    insert into public.lp_sessions (
      id, visitor_id, landing_url, referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      gclid, fbclid, device, os, browser, screen_w, screen_h, viewport_w, viewport_h, lang, tz
    ) values (
      v_sid, v_vid,
      left(p_session->>'landing_url', 600), left(p_session->>'referrer', 600),
      left(p_session->>'utm_source', 120), left(p_session->>'utm_medium', 120),
      left(p_session->>'utm_campaign', 200), left(p_session->>'utm_content', 200), left(p_session->>'utm_term', 200),
      left(p_session->>'gclid', 200), left(p_session->>'fbclid', 200),
      left(p_session->>'device', 20), left(p_session->>'os', 40), left(p_session->>'browser', 40),
      nullif(p_session->>'screen_w', '')::int, nullif(p_session->>'screen_h', '')::int,
      nullif(p_session->>'viewport_w', '')::int, nullif(p_session->>'viewport_h', '')::int,
      left(p_session->>'lang', 20), left(p_session->>'tz', 60)
    ) on conflict (id) do nothing;
    update public.lp_visitors set sessions_count = sessions_count + 1 where id = v_vid;
  end if;

  for e in select * from jsonb_array_elements(p_events) loop
    v_type := left(e->>'type', 40);
    if v_type is null then continue; end if;
    if v_type = 'click' then v_clicks := v_clicks + 1; end if;
    insert into public.lp_events (session_id, ts, t_ms, type, section, scroll_pct, x, y, data)
    values (
      v_sid,
      least(now(), coalesce((e->>'ts')::timestamptz, now())),
      nullif(e->>'t', '')::int,
      v_type,
      left(e->>'section', 60),
      least(100, greatest(0, coalesce(nullif(e->>'scroll', '')::int, 0)))::smallint,
      nullif(e->>'x', '')::real,
      nullif(e->>'y', '')::real,
      case when jsonb_typeof(e->'data') = 'object' and length((e->'data')::text) < 2000 then e->'data' end
    );
  end loop;

  update public.lp_sessions s set
    last_seen_at     = now(),
    page_h           = coalesce(nullif(p_session->>'page_h', '')::int, s.page_h),
    max_scroll_pct   = greatest(s.max_scroll_pct, least(100, coalesce(nullif(p_session->>'max_scroll_pct', '')::int, 0))),
    active_ms        = greatest(s.active_ms, least(86400000, coalesce(nullif(p_session->>'active_ms', '')::bigint, 0))),
    sections         = case when jsonb_typeof(p_session->'sections') = 'object' and length((p_session->'sections')::text) < 3000
                            then p_session->'sections' else s.sections end,
    furthest_section = coalesce(left(p_session->>'furthest_section', 60), s.furthest_section),
    configured       = s.configured or coalesce((p_session->>'configured')::boolean, false),
    checkout_started = s.checkout_started or coalesce((p_session->>'checkout_started')::boolean, false),
    whatsapp_clicked = s.whatsapp_clicked or coalesce((p_session->>'whatsapp_clicked')::boolean, false),
    ended_at         = case when coalesce((p_session->>'ended')::boolean, false) then now() else s.ended_at end,
    clicks           = s.clicks + v_clicks,
    events           = s.events + v_count
  where s.id = v_sid;
end;
$$;
revoke all on function public.track(jsonb, jsonb) from public;
grant execute on function public.track(jsonb, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. PEDIDOS (escritos só pelas Edge Functions com service role)
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  public_token text not null default encode(gen_random_bytes(18), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento','pago','em_producao','enviado','entregue','cancelado','reembolsado','recusado','em_analise')),
  mode text not null check (mode in ('kit','custom')),
  width_cm int not null,
  depth_cm int not null,
  tier_width_cm int not null,
  tier_depth_cm int not null,
  items jsonb not null,
  subtotal_cents int not null,
  shipping_cents int not null default 0,
  total_cents int not null,
  pix_total_cents int not null,
  paid_cents int,
  payment_method text,
  installments int,
  mp_payment_id text,
  mp_status text,
  mp_status_detail text,
  pix_qr text,
  pix_qr_base64 text,
  pix_expires_at timestamptz,
  boleto_url text,
  customer jsonb not null,          -- nome, email, cpf, whatsapp
  address jsonb not null,           -- cep, rua, numero, complemento, bairro, cidade, uf
  notes text,
  admin_notes text,
  tracking_code text,
  session_id uuid,
  visitor_id uuid,
  utm jsonb,
  ip_hash text
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_mp_idx on public.orders (mp_payment_id);

create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null,
  detail jsonb
);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at);

alter table public.orders enable row level security;
alter table public.order_events enable row level security;
revoke all on public.orders, public.order_events from anon;
grant select, update on public.orders to authenticated;
grant select, insert on public.order_events to authenticated;

drop policy if exists orders_admin_select on public.orders;
drop policy if exists orders_admin_update on public.orders;
drop policy if exists oe_admin_select on public.order_events;
drop policy if exists oe_admin_insert on public.order_events;
create policy orders_admin_select on public.orders for select to authenticated using (public.is_admin());
create policy orders_admin_update on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy oe_admin_select on public.order_events for select to authenticated using (public.is_admin());
create policy oe_admin_insert on public.order_events for insert to authenticated with check (public.is_admin());

-- Status público do pedido (tela do Pix consulta até aprovar). Exige o token.
create or replace function public.get_order_public(p_id uuid, p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id, 'number', o.number, 'status', o.status, 'payment_method', o.payment_method,
    'total_cents', o.total_cents, 'pix_total_cents', o.pix_total_cents, 'paid_cents', o.paid_cents,
    'mp_status', o.mp_status, 'mp_status_detail', o.mp_status_detail,
    'pix_qr', o.pix_qr, 'pix_qr_base64', o.pix_qr_base64, 'pix_expires_at', o.pix_expires_at,
    'boleto_url', o.boleto_url
  )
  from public.orders o
  where o.id = p_id and o.public_token = p_token;
$$;
revoke all on function public.get_order_public(uuid, text) from public;
grant execute on function public.get_order_public(uuid, text) to anon, authenticated;

-- Limite simples por IP para criação de pedidos (usado pela Edge Function)
create table if not exists public.rate_limits (
  bucket text not null,
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (bucket, key, window_start)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.hit_rate_limit(p_bucket text, p_key text, p_limit int, p_window_minutes int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := date_trunc('minute', now()) - make_interval(mins => (extract(minute from now())::int % p_window_minutes));
  v_hits int;
begin
  insert into public.rate_limits (bucket, key, window_start, hits) values (p_bucket, p_key, v_window, 1)
  on conflict (bucket, key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return v_hits <= p_limit;
end;
$$;
revoke all on function public.hit_rate_limit(text, text, int, int) from public, anon, authenticated;

-- updated_at automático
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

-- Retenção: eventos brutos com mais de 180 dias podem ser apagados com
-- delete from public.lp_events where ts < now() - interval '180 days';
