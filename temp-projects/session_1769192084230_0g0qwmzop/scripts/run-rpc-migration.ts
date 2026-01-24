/**
 * RPC 함수 마이그레이션 스크립트
 * 
 * 사용법:
 * 1. .env.local에 DATABASE_URL 설정 (Supabase Connection String)
 * 2. npx tsx scripts/run-rpc-migration.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

// .env.local 파일 로드
config({ path: resolve(process.cwd(), '.env.local') });

async function runRPCMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // DATABASE_URL 확인
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL이 설정되어 있지 않습니다.');
      console.error('   .env.local 파일에 DATABASE_URL을 설정해주세요.');
      process.exit(1);
    }
    
    console.log('RPC 함수 마이그레이션 시작...');
    console.log(`연결 정보: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}`); // 비밀번호 숨김
    
    // SQL 파일 읽기
    const sqlPath = join(process.cwd(), 'migrations', '002_delete_family_transaction.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    console.log('RPC 함수 생성 중...');
    
    try {
      await pool.query(sql);
      console.log('✅ RPC 함수 생성 완료!');
      console.log('   함수명: delete_family_transaction');
      console.log('   파라미터: p_family_id (INTEGER)');
    } catch (err: any) {
      console.error('❌ RPC 함수 생성 실패:', err.message);
      throw err;
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runRPCMigration();

