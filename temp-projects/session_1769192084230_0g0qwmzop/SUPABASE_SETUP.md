# Supabase 연결 및 테이블 설정 가이드

## 1. 환경 변수 설정 (.env.local)

`.env.local` 파일에 다음 변수들을 설정하세요:

```env
# Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase Anon Key (공개 키)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase Database Connection String
# Supabase Dashboard > Settings > Database > Connection string > URI
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

### Supabase에서 Connection String 가져오는 방법:
1. Supabase Dashboard 접속
2. Settings > Database 메뉴
3. Connection string 섹션에서 "URI" 선택
4. 비밀번호를 입력하여 전체 연결 문자열 복사

## 2. SQL 스키마 적용 방법

### 방법 1: Supabase Dashboard SQL Editor 사용 (추천)

1. Supabase Dashboard 접속
2. SQL Editor 메뉴 클릭
3. `migrations/001_initial_schema.sql` 파일의 내용을 복사하여 붙여넣기
4. "Run" 버튼 클릭

### 방법 2: 마이그레이션 스크립트 사용

```bash
# tsx 패키지 설치 (아직 없다면)
npm install -D tsx

# 마이그레이션 실행
npx tsx scripts/run-migration.ts
```

## 3. 연결 확인

설정이 완료되면 다음 명령어로 확인할 수 있습니다:

```bash
npm run dev
```

API 라우트(`/api/users`, `/api/login` 등)가 정상적으로 작동하면 연결이 성공한 것입니다.

## 4. 주의사항

- `DATABASE_URL`에는 실제 비밀번호가 포함되어 있으므로 절대 Git에 커밋하지 마세요
- `.env.local`은 `.gitignore`에 포함되어 있어야 합니다
- Supabase의 Row Level Security (RLS) 정책이 필요하면 별도로 설정해야 합니다

