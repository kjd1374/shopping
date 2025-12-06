-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Requests Table (견적 요청서)
create table public.requests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid null, -- 로그인 기능이 있다면 auth.uid() 사용, 없다면 null 허용
  status text default 'pending' check (status in ('pending', 'reviewed', 'ordered')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Request Items Table (요청한 개별 상품)
create table public.request_items (
  id uuid default uuid_generate_v4() primary key,
  request_id uuid references public.requests(id) on delete cascade not null,
  original_url text not null,
  og_image text,
  og_title text,
  admin_price numeric null,       -- 관리자가 입력할 가격
  admin_options text null,        -- 관리자가 입력할 옵션 목록 (예: "Red, Blue")
  user_selected_option text null, -- 고객이 나중에 선택할 옵션
  user_quantity integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security) 설정 (선택사항: 누구나 쓰기 가능하게 하려면 아래 정책 추가)
alter table public.requests enable row level security;
alter table public.request_items enable row level security;

-- 개발용: 누구나 읽고 쓸 수 있는 정책 (실서비스 시에는 인증된 유저만 허용하도록 수정 필요)
create policy "Enable all access for all users" on public.requests for all using (true) with check (true);
create policy "Enable all access for all users" on public.request_items for all using (true) with check (true);

