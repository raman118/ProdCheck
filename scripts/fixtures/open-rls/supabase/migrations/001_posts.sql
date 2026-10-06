create table public.posts (id uuid primary key, title text not null);
alter table public.posts enable row level security;
create policy public_posts on public.posts for select using (true);
