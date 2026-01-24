import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase URL과 ANON KEY가 환경 변수에 설정되어 있지 않습니다.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);