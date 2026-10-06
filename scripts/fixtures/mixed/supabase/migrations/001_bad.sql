create table public.users (id uuid primary key, email text);
create policy open_users on public.users for select using (true);
drop table public.legacy_users;
delete from public.audit_events;
