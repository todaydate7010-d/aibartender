-- Supabase Dashboard > SQL Editor에서 프로젝트당 한 번 실행하세요.
-- 익명 로그인 사용자는 auth.uid()가 있는 authenticated 역할로 동작합니다.

alter table public.memos enable row level security;

drop policy if exists "Enable read access for all users" on public.memos;
create policy "Enable read access for all users"
on public.memos for select
to anon, authenticated
using (true);

drop policy if exists "Enable insert for authenticated users only" on public.memos;
create policy "Enable insert for authenticated users only"
on public.memos for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "Enable update for authenticated users only" on public.memos;
create policy "Enable update for authenticated users only"
on public.memos for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

grant usage on schema public to anon, authenticated;
grant select on table public.memos to anon, authenticated;
grant insert, update on table public.memos to authenticated;
