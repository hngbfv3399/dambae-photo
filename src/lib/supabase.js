import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL과 Key가 없네요❤️ 오빠 .env 파일은 만들었어?❤️')
}

export const supabase = createClient(supabaseUrl, supabaseKey) 