import type { Alcohol, Cocktail, Mood, MoodTheme, Strength } from '../types'
import { supabase } from './supabase'

export type CloudState = {
  themeId: MoodTheme
  mood: Mood
  available: Alcohol[]
  strength: Strength
  resultId: number
  favorites: Cocktail[]
  dark: boolean
  animations: boolean
}

type MemoRow = { id: number; text: string }

let memoId: number | null = null

export async function loadCloudState(): Promise<CloudState | null> {
  if (!supabase) throw new Error('Supabase 환경 변수가 설정되지 않았어요.')
  const { error: authError } = await supabase.auth.signInAnonymously()
  if (authError) throw authError
  const { data, error } = await supabase
    .from('memos')
    .select('id, text')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle<MemoRow>()
  if (error) throw error
  if (!data?.text) return null
  memoId = data.id
  try { return JSON.parse(data.text) as CloudState } catch { return null }
}

export async function saveCloudState(state: CloudState) {
  if (!supabase) throw new Error('Supabase 환경 변수가 설정되지 않았어요.')
  const text = JSON.stringify(state)
  if (memoId) {
    const { error } = await supabase.from('memos').update({ text }).eq('id', memoId)
    if (!error) return
    memoId = null
  }
  const { data, error } = await supabase.from('memos').insert({ text }).select('id').single<{ id: number }>()
  if (error) throw error
  memoId = data.id
}
