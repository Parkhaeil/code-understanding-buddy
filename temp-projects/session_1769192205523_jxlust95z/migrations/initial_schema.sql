-- 기존 테이블 삭제
DROP TABLE IF EXISTS today_menus CASCADE;
DROP TABLE IF EXISTS menu_likes CASCADE;
DROP TABLE IF EXISTS menu_ingredients CASCADE;
DROP TABLE IF EXISTS menus CASCADE;
DROP TABLE IF EXISTS fridge_ingredients CASCADE;
DROP TABLE IF EXISTS invitation_codes CASCADE;
DROP TABLE IF EXISTS family_members CASCADE;
DROP TABLE IF EXISTS families CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- USERS : 전체 사용자
CREATE TABLE users (
    user_id        BIGSERIAL PRIMARY KEY,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    nickname       VARCHAR(50)  NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE
);

-- FAMILIES : 가족 그룹
CREATE TABLE families (
    family_id    BIGSERIAL PRIMARY KEY,
    family_name  VARCHAR(100) NOT NULL,
    created_by   BIGINT REFERENCES users(user_id),
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active    BOOLEAN   NOT NULL DEFAULT TRUE
);

-- FAMILY_MEMBERS : 가족 구성원 & 역할
CREATE TABLE family_members (
    family_id  BIGINT NOT NULL REFERENCES families(family_id),
    user_id    BIGINT NOT NULL REFERENCES users(user_id),
    role       VARCHAR(20) NOT NULL
        CHECK (role IN ('PARENT', 'CHILD', 'FOLLOWER')),
    joined_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active  BOOLEAN   NOT NULL DEFAULT TRUE,
    PRIMARY KEY (family_id, user_id)
);

-- INVITATION_CODES : 가족 초대 코드
CREATE TABLE invitation_codes (
    invite_id   BIGSERIAL PRIMARY KEY,
    family_id   BIGINT NOT NULL REFERENCES families(family_id),
    code        VARCHAR(20) NOT NULL UNIQUE,
    created_by  BIGINT REFERENCES users(user_id),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- FRIDGE_INGREDIENTS : 가상 냉장고 재료
CREATE TABLE fridge_ingredients (
    ingredient_id    BIGSERIAL PRIMARY KEY,
    family_id        BIGINT NOT NULL REFERENCES families(family_id),
    ingredient_name  VARCHAR(100) NOT NULL,
    storage_type     VARCHAR(20)  NOT NULL
        CHECK (storage_type IN ('ROOM', 'FRIDGE', 'FREEZER', 'NEED')),
    usage_count      INT           NOT NULL DEFAULT 0,
    created_by       BIGINT REFERENCES users(user_id),
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active        BOOLEAN   NOT NULL DEFAULT TRUE
);

-- MENUS : 가족 메뉴 (WISH/POSSIBLE, 집밥/외식)
CREATE TABLE menus (
    menu_id      BIGSERIAL PRIMARY KEY,
    family_id    BIGINT NOT NULL REFERENCES families(family_id),
    created_by   BIGINT REFERENCES users(user_id),
    menu_name    VARCHAR(100) NOT NULL,
    status       VARCHAR(20)  NOT NULL
        CHECK (status IN ('WISH', 'POSSIBLE')),
    source_type  VARCHAR(20)  NOT NULL
        CHECK (source_type IN ('HOME', 'EAT_OUT')),
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- MENU_INGREDIENTS : 메뉴에 쓰인 재료
CREATE TABLE menu_ingredients (
    menu_ingredient_id  BIGSERIAL PRIMARY KEY,
    menu_id             BIGINT NOT NULL REFERENCES menus(menu_id),
    ingredient_id       BIGINT REFERENCES fridge_ingredients(ingredient_id)
);

-- MENU_LIKES : 메뉴 좋아요
CREATE TABLE menu_likes (
    menu_id     BIGINT NOT NULL REFERENCES menus(menu_id),
    user_id     BIGINT NOT NULL REFERENCES users(user_id),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (menu_id, user_id)
);

-- TODAY_MENUS : 오늘의 최종 메뉴
CREATE TABLE today_menus (
    today_id     BIGSERIAL PRIMARY KEY,
    family_id    BIGINT NOT NULL REFERENCES families(family_id),
    menu_id      BIGINT NOT NULL REFERENCES menus(menu_id),
    target_date  DATE   NOT NULL,
    selected_by  BIGINT REFERENCES users(user_id),
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_today_menu UNIQUE (family_id, target_date)
);