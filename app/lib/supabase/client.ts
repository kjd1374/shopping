import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = 'https://hgxblbbjlnsfkffwvfao.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNjU2ODYsImV4cCI6MjA3OTY0MTY4Nn0.nDsF4ry7iRjBNWQ30S-XQ3K-PUAM8Eb1BAl_5sORRbg'

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

