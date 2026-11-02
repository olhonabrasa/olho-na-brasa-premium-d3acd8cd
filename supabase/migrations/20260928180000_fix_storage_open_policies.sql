-- Correção da migração 20260925200000: ela só removia políticas de storage que
-- citavam o bucket 'churrasqueira-fotos'. Sobraram duas políticas genéricas,
-- criadas pelo painel do Supabase, que valem para TODOS os buckets:
--   " Allow public read 1ecfcfv_0"   SELECT anon  using (true)       -> qualquer um lista/baixa as fotos
--   "Allow public uploads 1ecfcfv_0" INSERT anon  with check (true)  -> qualquer um envia arquivo p/ qualquer bucket
-- O envio de fotos da LP continua coberto pelas políticas restritas ao bucket
-- ("Allow public uploads" / "anon upload churrasqueira-fotos"), e o link público
-- de cada foto continua abrindo (bucket público não depende de SELECT).

drop policy if exists " Allow public read 1ecfcfv_0" on storage.objects;
drop policy if exists "Allow public uploads 1ecfcfv_0" on storage.objects;

-- Rede de segurança: qualquer outra política anônima sem restrição de bucket.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and 'anon' = any (roles)
      and (
        (cmd in ('SELECT', 'ALL', 'UPDATE', 'DELETE') and coalesce(qual, 'true') = 'true')
        or (cmd in ('INSERT', 'ALL', 'UPDATE') and coalesce(with_check, 'true') = 'true')
      )
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;
