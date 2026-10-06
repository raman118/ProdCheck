create table public.users (
  id uuid primary key,
  email text unique not null
);
alter table public.users enable row level security;
create policy own_user on public.users for all using (id = auth.uid());
create index users_email_idx on public.users (email);
