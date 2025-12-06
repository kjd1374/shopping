import { createClient } from '@supabase/supabase-js'

// 개발용 하드코딩 (배포 시에는 반드시 환경변수로 변경해야 함)
const supabaseUrl = 'https://hgxblbbjlnsfkffwvfao.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNjU2ODYsImV4cCI6MjA3OTY0MTY4Nn0.nDsF4ry7iRjBNWQ30S-XQ3K-PUAM8Eb1BAl_5sORRbg'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase 설정이 누락되었습니다.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
