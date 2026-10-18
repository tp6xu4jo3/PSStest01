-- 北科圖書館閱覽室座位預約系統：Supabase schema
-- 在 Supabase SQL Editor 以專案管理員手動執行。不要把 service_role key 放進前端。
create extension if not exists pgcrypto;

create table if not exists public.seat_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seat_code text not null check (seat_code ~ '^[A-D](0[1-8])$'),
  reservation_date date not null check (reservation_date >= current_date and reservation_date <= current_date + 13),
  time_slot text not null check (time_slot in ('morning','afternoon','evening')),
  status text not null default 'active' check (status in ('active','cancelled')),
  created_at timestamptz not null default now()
);

-- 核心競態條件保護：資料庫唯一索引，而非只依賴前端檢查。
create unique index if not exists seat_reservations_one_active_seat
on public.seat_reservations (reservation_date, time_slot, seat_code)
where status = 'active';
create index if not exists seat_reservations_user_created
on public.seat_reservations (user_id, created_at desc);

alter table public.seat_reservations enable row level security;
revoke all on public.seat_reservations from anon;
grant select, insert, update on public.seat_reservations to authenticated;

 drop policy if exists "Users can read own reservations" on public.seat_reservations;
create policy "Users can read own reservations" on public.seat_reservations
for select to authenticated using (auth.uid() = user_id);
 drop policy if exists "Users can create own reservations" on public.seat_reservations;
create policy "Users can create own reservations" on public.seat_reservations
for insert to authenticated with check (auth.uid() = user_id and status = 'active');
 drop policy if exists "Users can cancel own active reservations" on public.seat_reservations;
create policy "Users can cancel own active reservations" on public.seat_reservations
for update to authenticated using (auth.uid() = user_id and status = 'active')
with check (auth.uid() = user_id and status = 'cancelled');

-- 只回傳座位代碼，不暴露其他使用者的 user_id 或預約紀錄。
create or replace function public.get_reserved_seats(p_date date, p_slot text)
returns table(seat_code text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.seat_code
  from public.seat_reservations as r
  where r.reservation_date = p_date
    and r.time_slot = p_slot
    and r.status = 'active';
$$;
revoke all on function public.get_reserved_seats(date, text) from public;
grant execute on function public.get_reserved_seats(date, text) to anon, authenticated;
