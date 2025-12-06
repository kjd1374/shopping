'use server'

import { createClient } from '../lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function signIn(email: string, password: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function signUp(email: string, password: string) {
  const supabase = createClient()

  // 회원가입만 수행 (자동 로그인 없음)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: undefined, // 이메일 확인 비활성화
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  if (data.user) {
    return { success: true, message: '회원가입이 완료되었습니다. 로그인해주세요.' }
  }

  return { success: false, error: '회원가입에 실패했습니다.' }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function getCurrentUser() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch profile for role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    ...user,
    role: profile?.role || 'user', // Default to user if no profile
  }
}

