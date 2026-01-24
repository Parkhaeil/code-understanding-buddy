-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE today_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE fridge_ingredients ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 정보만 조회 가능
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- 가족 구성원은 자신의 가족 정보만 조회 가능
CREATE POLICY "Members can view own family" ON families
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.family_id
      AND family_members.user_id::text = auth.uid()::text
      AND family_members.is_active = TRUE
    )
  );

-- 부모 역할만 가족 정보 수정 가능
CREATE POLICY "Parents can update family" ON families
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.family_id
      AND family_members.user_id::text = auth.uid()::text
      AND family_members.role = 'PARENT'
      AND family_members.is_active = TRUE
    )
  );