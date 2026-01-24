CREATE OR REPLACE VIEW v_family_active_members AS
SELECT
    f.family_id,
    f.family_name,
    u.user_id,
    u.nickname,
    fm.role,
    u.created_at AS user_created_at

FROM families f
JOIN family_members fm
  ON fm.family_id = f.family_id
  AND fm.is_active = TRUE
JOIN users u
  ON u.user_id = fm.user_id;