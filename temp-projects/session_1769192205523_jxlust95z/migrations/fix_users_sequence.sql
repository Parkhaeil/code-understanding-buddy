-- users 테이블의 user_id sequence를 최신 상태로 동기화
-- 이 SQL은 users 테이블에 이미 존재하는 최대 user_id 값보다 1 큰 값으로 sequence를 설정합니다

-- users_user_id_seq sequence가 존재하지 않으면 생성
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'users_user_id_seq') THEN
        CREATE SEQUENCE users_user_id_seq;
    END IF;
END $$;

-- sequence를 현재 테이블의 최대 user_id 값 + 1로 설정
SELECT setval('users_user_id_seq', COALESCE((SELECT MAX(user_id) FROM users), 0) + 1, false);