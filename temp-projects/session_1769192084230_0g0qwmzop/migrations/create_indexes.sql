-- users 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- family_members 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_family_members_family_active ON family_members(family_id, is_active);
CREATE INDEX IF NOT EXISTS idx_family_members_family_role_active ON family_members(family_id, role, is_active);
CREATE INDEX IF NOT EXISTS idx_family_members_user_active ON family_members(user_id, is_active);

-- families 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_families_created_by ON families(created_by);
CREATE INDEX IF NOT EXISTS idx_families_is_active ON families(is_active);

-- invitation_codes 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_invitation_codes_family ON invitation_codes(family_id);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_family_active ON invitation_codes(family_id, is_active);

-- menus 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_menus_family ON menus(family_id);
CREATE INDEX IF NOT EXISTS idx_menus_created_by ON menus(created_by);
CREATE INDEX IF NOT EXISTS idx_menus_family_status ON menus(family_id, status);
CREATE INDEX IF NOT EXISTS idx_menus_created_at ON menus(created_at);

-- menu_ingredients 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_menu_ingredients_menu ON menu_ingredients(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_ingredients_ingredient ON menu_ingredients(ingredient_id);

-- menu_likes 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_menu_likes_user ON menu_likes(user_id);

-- today_menus 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_today_menus_family_date ON today_menus(family_id, target_date);
CREATE INDEX IF NOT EXISTS idx_today_menus_menu ON today_menus(menu_id);
CREATE INDEX IF NOT EXISTS idx_today_menus_selected_by ON today_menus(selected_by);

-- fridge_ingredients 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_fridge_ingredients_family ON fridge_ingredients(family_id);
CREATE INDEX IF NOT EXISTS idx_fridge_ingredients_family_active ON fridge_ingredients(family_id, is_active);
CREATE INDEX IF NOT EXISTS idx_fridge_ingredients_storage_type ON fridge_ingredients(storage_type);
	