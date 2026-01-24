CREATE OR REPLACE VIEW v_today_menu_cards AS
SELECT
    tm.today_id,
    tm.family_id,
    tm.menu_id,
    tm.target_date,

    m.menu_name,
    m.source_type,
    m.created_by,

    u.nickname           AS creator_nickname,
    fm.role              AS creator_role,
    fm.is_active AS creator_is_active,

    fi.ingredient_name,
    (fi.storage_type = 'NEED') AS is_need_ingredient

FROM today_menus tm
JOIN menus m
  ON tm.menu_id = m.menu_id

JOIN users u
  ON m.created_by = u.user_id

LEFT JOIN family_members fm
  ON fm.family_id = m.family_id
 AND fm.user_id   = m.created_by

LEFT JOIN menu_ingredients mi
  ON mi.menu_id = m.menu_id

LEFT JOIN fridge_ingredients fi
  ON fi.ingredient_id = mi.ingredient_id