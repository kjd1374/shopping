'use client'

import { useState } from 'react'

export default function MigratePage() {
  const [copied, setCopied] = useState(false)

  const sql = `ALTER TABLE public.request_items
ADD COLUMN IF NOT EXISTS admin_capacity text null,
ADD COLUMN IF NOT EXISTS admin_color text null,
ADD COLUMN IF NOT EXISTS admin_etc text null,
ADD COLUMN IF NOT EXISTS admin_rerequest_note text null,
ADD COLUMN IF NOT EXISTS user_selected_options jsonb null;`

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
              데이터베이스 마이그레이션
            </h1>
            <p className="text-sm text-slate-500">
              컬럼 추가만 실행하면 됩니다 (테이블 생성 불필요)
            </p>
          </div>

          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 font-bold mb-2">
              ⚠️ 주의사항
            </p>
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              <li><code className="bg-red-100 px-1 rounded">CREATE TABLE</code> 쿼리는 실행하지 마세요!</li>
              <li>아래 <code className="bg-red-100 px-1 rounded">ALTER TABLE</code> 쿼리만 실행하세요.</li>
              <li>이미 테이블이 존재하므로 컬럼만 추가하면 됩니다.</li>
            </ul>
          </div>

          <div className="bg-slate-900 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-sm">실행할 SQL (이것만 실행하세요!)</h2>
              <button
                onClick={copyToClipboard}
                className="text-xs text-slate-300 hover:text-white px-3 py-1.5 bg-slate-800 rounded transition-colors flex items-center gap-2"
              >
                {copied ? '✅ 복사됨!' : '📋 복사'}
              </button>
            </div>
            <pre className="text-green-400 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`ALTER TABLE public.request_items
ADD COLUMN IF NOT EXISTS admin_capacity text null,
ADD COLUMN IF NOT EXISTS admin_color text null,
ADD COLUMN IF NOT EXISTS admin_etc text null,
ADD COLUMN IF NOT EXISTS admin_rerequest_note text null,
ADD COLUMN IF NOT EXISTS user_selected_options jsonb null;`}
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
              관리자 페이지로
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
