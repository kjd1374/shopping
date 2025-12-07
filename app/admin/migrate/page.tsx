'use client'

import { useState } from 'react'

export default function MigratePage() {
  const [copied, setCopied] = useState(false)

  const sql = `-- 1. 프로필 테이블 생성
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- 2. RLS 정책 설정 (선택사항, 필요시 활성화)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING ( true );

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING ( auth.uid() = id );

-- 3. 새 유저 가입 시 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. 배송 배치 테이블 생성
CREATE TABLE IF NOT EXISTS public.shipment_batches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_name text,
  tracking_no text,
  status text DEFAULT 'shipped',
  created_at timestamptz DEFAULT now()
);

-- 5. 요청 테이블에 컬럼 추가 (배치ID, 현지송장번호)
ALTER TABLE public.requests
ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.shipment_batches(id),
ADD COLUMN IF NOT EXISTS local_tracking_no text;

-- 6. 기존 마이그레이션 (아이템 테이블)
ALTER TABLE public.request_items
ADD COLUMN IF NOT EXISTS admin_capacity text null,
ADD COLUMN IF NOT EXISTS admin_color text null,
ADD COLUMN IF NOT EXISTS admin_etc text null,
ADD COLUMN IF NOT EXISTS admin_rerequest_note text null,
ADD COLUMN IF NOT EXISTS user_selected_options jsonb null;

-- 7. Legacy Tables RLS Security Fix (보안 경고 해결)
-- 사용하지 않는 테이블들이지만 보안 경고 제거를 위해 RLS 활성화 및 잠금 처리

-- Category
ALTER TABLE IF EXISTS "Category" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access" ON "Category";
CREATE POLICY "Public read access" ON "Category" FOR SELECT USING (true);

-- CategoryOption
ALTER TABLE IF EXISTS "CategoryOption" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access" ON "CategoryOption";
CREATE POLICY "Public read access" ON "CategoryOption" FOR SELECT USING (true);

-- User (Legacy) - Lock down
ALTER TABLE IF EXISTS "User" ENABLE ROW LEVEL SECURITY;
-- No active policy means only service role can access

-- Request (Legacy) - Lock down
ALTER TABLE IF EXISTS "Request" ENABLE ROW LEVEL SECURITY;
-- No active policy means only service role can access

-- RequestOptionValue (Legacy) - Lock down
ALTER TABLE IF EXISTS "RequestOptionValue" ENABLE ROW LEVEL SECURITY;
-- No active policy means only service role can access`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="mb-6">
            <a
              href="/admin"
              className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-flex items-center gap-1"
            >
              ← 관리자 페이지로
            </a>
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              데이터베이스 마이그레이션 (Updated)
            </h1>
            <p className="text-sm text-slate-500">
              아래 SQL을 실행하면 누락된 테이블(profiles)이 생성됩니다.
            </p>
          </div>

          <div className="bg-slate-900 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-sm">실행할 SQL (복사 후 실행하세요)</h2>
              <button
                onClick={copyToClipboard}
                className="text-xs text-slate-300 hover:text-white px-3 py-1.5 bg-slate-800 rounded transition-colors flex items-center gap-2"
              >
                {copied ? '✅ 복사됨!' : '📋 복사'}
              </button>
            </div>
            <pre className="text-green-400 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
              {sql}
            </pre>
          </div>

          <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-slate-900 text-sm">실행 방법</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
              <li>
                <a
                  href="https://supabase.com/dashboard/project/hgxblbbjlnsfkffwvfao/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Supabase SQL Editor 열기
                </a>
                (새 창에서 열림)
              </li>
              <li>위의 SQL을 복사 (📋 복사 버튼 클릭)</li>
              <li>SQL Editor에 붙여넣기</li>
              <li>"Run" 버튼 클릭 (또는 Ctrl+Enter)</li>
              <li>성공 메시지 확인 후 관리자 페이지로 돌아가기</li>
            </ol>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 flex gap-3">
            <a
              href="/admin"
              className="flex-1 md:flex-none px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors text-center"
            >
              취소
            </a>
            <a
              href="https://supabase.com/dashboard/project/hgxblbbjlnsfkffwvfao/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-center"
            >
              SQL Editor 열기 →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
