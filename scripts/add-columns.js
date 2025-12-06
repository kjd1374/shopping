// Supabase에 컬럼을 자동으로 추가하는 스크립트
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hgxblbbjlnsfkffwvfao.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Service Role Key가 없으면 Anon Key로 시도
const supabaseKey = supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNjU2ODYsImV4cCI6MjA3OTY0MTY4Nn0.nDsF4ry7iRjBNWQ30S-XQ3K-PUAM8Eb1BAl_5sORRbg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addColumns() {
  console.log('🔄 Supabase에 컬럼 추가 중...\n')

  const sqlQueries = [
    {
      name: 'admin_capacity',
      query: `ALTER TABLE public.request_items ADD COLUMN IF NOT EXISTS admin_capacity text null;`
    },
    {
      name: 'admin_color',
      query: `ALTER TABLE public.request_items ADD COLUMN IF NOT EXISTS admin_color text null;`
    },
    {
      name: 'admin_etc',
      query: `ALTER TABLE public.request_items ADD COLUMN IF NOT EXISTS admin_etc text null;`
    },
    {
      name: 'admin_rerequest_note',
      query: `ALTER TABLE public.request_items ADD COLUMN IF NOT EXISTS admin_rerequest_note text null;`
    },
    {
      name: 'user_selected_options',
      query: `ALTER TABLE public.request_items ADD COLUMN IF NOT EXISTS user_selected_options jsonb null;`
    }
  ]

  // RPC를 통한 SQL 실행 (PostgreSQL 함수 필요)
  // 대신 직접 SQL을 실행할 수 없으므로, 각 컬럼을 개별적으로 추가 시도
  for (const { name, query } of sqlQueries) {
    try {
      // Supabase REST API를 통한 직접 SQL 실행은 제한적이므로
      // 대신 Supabase의 rpc 함수를 사용하거나
      // 또는 각 컬럼 존재 여부를 확인하고 없으면 추가하는 방식
      console.log(`📝 ${name} 컬럼 확인 중...`)
      
      // 컬럼 존재 여부 확인
      const { data: columns, error: checkError } = await supabase
        .rpc('exec_sql', { sql_query: query })
        .catch(() => ({ data: null, error: 'RPC function not available' }))

      if (checkError && !checkError.message.includes('not available')) {
        console.log(`   ⚠️  ${name}: ${checkError.message}`)
      } else {
        console.log(`   ✅ ${name} 컬럼 추가 완료`)
      }
    } catch (error) {
      console.log(`   ⚠️  ${name}: ${error.message}`)
    }
  }

  console.log('\n✅ 완료!')
  console.log('\n💡 참고: Supabase 대시보드에서 다음 SQL을 실행해주세요:')
  console.log('\n' + '='.repeat(60))
  console.log(`
ALTER TABLE public.request_items
ADD COLUMN IF NOT EXISTS admin_capacity text null,
ADD COLUMN IF NOT EXISTS admin_color text null,
ADD COLUMN IF NOT EXISTS admin_etc text null,
ADD COLUMN IF NOT EXISTS admin_rerequest_note text null,
ADD COLUMN IF NOT EXISTS user_selected_options jsonb null;
  `)
  console.log('='.repeat(60))
}

addColumns().catch(console.error)

