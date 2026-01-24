import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 클라이언트 사이드용 (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 서버 사이드용 (service role key - RLS 우회)
// 서비스 역할 키가 있으면 사용, 없으면 anon key 사용
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (supabaseServiceKey) {
  console.log("✅ 서비스 역할 키 사용 중");
} else {
  console.warn("⚠️ 서비스 역할 키가 없습니다. anon key를 사용합니다.");
}
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;

// 서버 사이드에서 직접 SQL을 실행하기 위한 PostgreSQL 연결
// Supabase는 직접 SQL 쿼리를 지원하지 않으므로, 
// 복잡한 쿼리를 실행하기 위해 PostgreSQL 연결을 유지합니다
// Supabase 프로젝트 설정에서 Connection String을 가져와서 DATABASE_URL에 설정하세요
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 기존 코드와의 호환성을 위한 query 함수
export async function query(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res;
}

// 기존 코드 호환성을 위해 pool도 export
export { pool };
export default supabase;