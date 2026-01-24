/**
 * Supabase에 SQL 마이그레이션을 실행하는 스크립트
 * 
 * 사용법:
 * 1. .env.local에 DATABASE_URL 설정 (Supabase Connection String)
 * 2. npx tsx scripts/run-migration.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';

// .env.local 파일 로드
config({ path: resolve(process.cwd(), '.env.local') });

import pool from '../lib/db';

async function runMigration() {
  try {
    // DATABASE_URL 확인
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL이 설정되어 있지 않습니다.');
      console.error('   .env.local 파일에 DATABASE_URL을 설정해주세요.');
      process.exit(1);
    }
    
    console.log('마이그레이션 시작...');
    console.log(`연결 정보: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}`); // 비밀번호 숨김
    
    // SQL 파일 읽기
    const sqlPath = join(process.cwd(), 'migrations', '001_initial_schema.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    // SQL 실행 (여러 문장을 세미콜론으로 분리)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`총 ${statements.length}개의 SQL 문장 실행 중...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await pool.query(statement);
          console.log(`✓ 문장 ${i + 1}/${statements.length} 완료`);
        } catch (err: any) {
          // DROP TABLE IF EXISTS는 에러가 나도 무시
          if (err.message?.includes('does not exist') && statement.toUpperCase().includes('DROP TABLE')) {
            console.log(`⚠ 문장 ${i + 1}: ${err.message} (무시됨)`);
          } else {
            console.error(`❌ 문장 ${i + 1} 실패:`, err.message);
            console.error(`   SQL: ${statement.substring(0, 100)}...`);
            throw err;
          }
        }
      }
    }
    
    console.log('✅ 마이그레이션 완료!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

