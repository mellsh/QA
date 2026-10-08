-- QA : 문장 저장 테이블
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  book_id text not null,
  book_title text not null,
  book_authors text,
  book_thumbnail text,
  content text not null,
  page int,
  memo text,
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.quotes enable row level security;

drop policy if exists "own quotes" on public.quotes;
create policy "own quotes" on public.quotes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
