create table public.posts (
  id uuid primary key,
  slug text not null,
  owner_id uuid not null
);
alter table public.posts enable row level security;
create policy owner_posts on public.posts for all using (owner_id = auth.uid());
