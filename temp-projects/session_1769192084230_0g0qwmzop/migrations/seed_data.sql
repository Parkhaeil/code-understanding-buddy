-- USERS
INSERT INTO users (email, password_hash, nickname)
VALUES 
    ('01@test.com', 'test01', '테스트1'),
    ('02@test.com', 'test02', '테스트2'),
    ('03@test.com', 'test03', '테스트3');

-- FAMILIES
INSERT INTO families (family_name, created_by)
VALUES 
    ('테스트1 메뉴판', 1),  
    ('테스트2 메뉴판', 2);

-- FAMILY_MEMBERS
INSERT INTO family_members (family_id, user_id, role)
VALUES
    (1, 1, 'PARENT'),
    (1, 2, 'CHILD'),
    (1, 3, 'FOLLOWER'),
    (2, 2, 'PARENT'),
    (2, 1, 'FOLLOWER'),
    (2, 3, 'CHILD');

-- INVITATION_CODES
INSERT INTO invitation_codes (family_id, code, created_by)
VALUES
    (1, 'FAM67JUMNU', 1),
    (2, 'FAMUOLO2EF', 2);

-- FRIDGE_INGREDIENTS
INSERT INTO fridge_ingredients (family_id, ingredient_name, storage_type, created_by)
VALUES
    -- 가족 1
    (1, '계란',     'FRIDGE', 1),
    (1, '대파',     'FRIDGE', 1),
    (1, '김치',     'FRIDGE', 1),
    (1, '돼지고기', 'FREEZER', 1),
    (1, '버섯',     'FRIDGE', 1),
    (1, '양배추',   'FRIDGE', 1),
    (1, '치즈',     'FRIDGE', 1),

    -- 가족 2
    (2, '감자',       'ROOM',    2),
    (2, '어묵',       'FRIDGE',  2),
    (2, '닭가슴살',   'FREEZER', 2),
    (2, '양파',       'ROOM',    2),
    (2, '당근',       'ROOM',    2),
    (2, '파프리카',   'ROOM',    2);

-- MENUS
INSERT INTO menus (
    family_id, created_by, menu_name, status, source_type, created_at, updated_at
)
VALUES
    -- 가족 1
    (1, 1, '김치볶음밥',      'POSSIBLE', 'HOME', TIMESTAMP '2025-12-01 11:00:00', TIMESTAMP '2025-12-01 11:00:00'),
    (1, 1, '부대찌개',        'WISH',     'HOME', TIMESTAMP '2025-12-02 12:00:00', TIMESTAMP '2025-12-02 12:00:00'),
    (1, 2, '떡볶이',          'POSSIBLE', 'EAT_OUT', TIMESTAMP '2025-12-03 18:00:00', TIMESTAMP '2025-12-03 18:00:00'),
    (1, 3, '겨울샐러드',      'WISH',     'HOME', TIMESTAMP '2025-12-04 09:00:00', TIMESTAMP '2025-12-04 09:00:00'),
    (1, 2, '치즈라면',        'POSSIBLE', 'HOME', TIMESTAMP '2025-12-05 10:30:00', TIMESTAMP '2025-12-05 10:30:00'),
    (1, 1, '김치라면',        'POSSIBLE', 'HOME', TIMESTAMP '2025-12-06 11:30:00', TIMESTAMP '2025-12-06 11:30:00'),
    (1, 2, '참치마요덮밥',    'WISH',     'HOME', TIMESTAMP '2025-12-07 12:00:00', TIMESTAMP '2025-12-07 12:00:00'),
    (1, 3, '스팸계란볶음밥',  'POSSIBLE', 'HOME', TIMESTAMP '2025-12-08 18:30:00', TIMESTAMP '2025-12-08 18:30:00'),
    (1, 1, '돼지고기김치전골','WISH',     'HOME', TIMESTAMP '2025-12-09 19:00:00', TIMESTAMP '2025-12-09 19:00:00'),

    -- 가족 2
    (2, 2, '감자조림',        'POSSIBLE', 'HOME', TIMESTAMP '2025-12-01 10:10:00', TIMESTAMP '2025-12-01 10:10:00'),
    (2, 2, '어묵볶음',        'POSSIBLE', 'HOME', TIMESTAMP '2025-12-02 10:20:00', TIMESTAMP '2025-12-02 10:20:00'),
    (2, 3, '닭가슴살스테이크','WISH',     'HOME', TIMESTAMP '2025-12-03 12:30:00', TIMESTAMP '2025-12-03 12:30:00'),
    (2, 1, '피자',            'WISH',     'EAT_OUT', TIMESTAMP '2025-12-04 19:00:00', TIMESTAMP '2025-12-04 19:00:00'),
    (2, 2, '크림파스타',      'WISH',     'EAT_OUT', TIMESTAMP '2025-12-05 19:30:00', TIMESTAMP '2025-12-05 19:30:00'),
    (2, 2, '감자튀김',        'POSSIBLE', 'HOME', TIMESTAMP '2025-12-06 11:00:00', TIMESTAMP '2025-12-06 11:00:00'),
    (2, 2, '어묵국',          'POSSIBLE', 'HOME', TIMESTAMP '2025-12-07 12:30:00', TIMESTAMP '2025-12-07 12:30:00'),
    (2, 3, '닭가슴살샐러드볼','WISH',     'HOME', TIMESTAMP '2025-12-08 13:00:00', TIMESTAMP '2025-12-08 13:00:00'),
    (2, 1, '야채볶음',        'POSSIBLE', 'HOME', TIMESTAMP '2025-12-09 18:00:00', TIMESTAMP '2025-12-09 18:00:00');

-- MENU_INGREDIENTS
INSERT INTO menu_ingredients (menu_id, ingredient_id)
VALUES
    -- 가족 1
    (1, 3), (1, 1),
    (2, 3), (2, 4),
    (3, 2),
    (4, 1), (4, 4),
    (5, 1), (5, 2),
    (6, 1), (6, 3), (6, 2),
    (7, 1), (7, 2),
    (8, 1), (8, 2),
    (9, 4), (9, 3),

    -- 가족 2
    (10, 8), (10, 11),
    (11, 9), (11, 11),
    (12, 10),
    (13, NULL),
    (14, NULL),
    (15, 8),
    (16, 9), (16, 11),
    (17, 10), (17, 11);

-- MENU_LIKES
INSERT INTO menu_likes (menu_id, user_id)
VALUES
    (1,1),(1,2),
    (2,3),
    (3,2),
    (5,1),
    (10,2),
    (11,3),
    (12,1),
    (13,2),
    (14,3),
    (15,2),
    (16,1),
    (17,3),
    (18,1);

-- TODAY_MENUS
INSERT INTO today_menus (family_id, menu_id, target_date, selected_by)
VALUES
    -- 가족 1
    (1,1,'2025-12-01',1),
    (1,2,'2025-12-02',1),
    (1,3,'2025-12-03',2),
    (1,4,'2025-12-04',3),
    (1,5,'2025-12-05',2),
    (1,6,'2025-12-06',1),
    (1,7,'2025-12-07',2),
    (1,8,'2025-12-08',3),
    (1,9,'2025-12-09',1),
    (1,5,'2025-12-10',2),

    -- 가족 2
    (2,10,'2025-12-01',2),
    (2,11,'2025-12-02',3),
    (2,13,'2025-12-03',1),
    (2,12,'2025-12-04',3),
    (2,14,'2025-12-05',2),
    (2,15,'2025-12-06',2),
    (2,16,'2025-12-07',3),
    (2,17,'2025-12-08',1),
    (2,18,'2025-12-09',3),
    (2,14,'2025-12-10',2);