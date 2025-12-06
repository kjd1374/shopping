-- request_items 테이블에 세부 옵션 컬럼 추가
ALTER TABLE public.request_items
ADD COLUMN IF NOT EXISTS admin_capacity text null,
ADD COLUMN IF NOT EXISTS admin_color text null,
ADD COLUMN IF NOT EXISTS admin_etc text null,
ADD COLUMN IF NOT EXISTS admin_rerequest_note text null,
ADD COLUMN IF NOT EXISTS user_selected_options jsonb null;

-- 기존 admin_options 컬럼은 유지 (하위 호환성)

