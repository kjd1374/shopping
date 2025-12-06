-- Products Table (상품 정보: 랭킹 및 요청 상품 통합 관리 가능)
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  
  -- 랭킹 정보
  rank integer null,
  
  -- 기본 정보
  title text not null,
  brand text,
  image text,
  origin_url text,
  
  -- 구분값 ('ranking', 'curation' 등)
  product_type text default 'ranking',
  
  -- 메타데이터
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- 중복 방지 (origin_url 기준)
  constraint products_origin_url_key unique (origin_url)
);

-- RLS 설정 (누구나 읽기 가능)
alter table public.products enable row level security;
create policy "Enable read access for all users" on public.products for select using (true);
create policy "Enable insert/update for service role only" on public.products for all using (true) with check (true); -- 개발 편의상 일단 모두 허용

