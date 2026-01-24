CREATE OR REPLACE FUNCTION delete_family_transaction(p_family_id INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  DELETE FROM today_menus WHERE family_id = p_family_id;

  DELETE FROM menu_likes 
  WHERE menu_id IN (SELECT menu_id FROM menus WHERE family_id = p_family_id);
  
  DELETE FROM menu_ingredients 
  WHERE menu_id IN (SELECT menu_id FROM menus WHERE family_id = p_family_id);
  
  DELETE FROM menus WHERE family_id = p_family_id;
  
  DELETE FROM fridge_ingredients WHERE family_id = p_family_id;
  
  DELETE FROM invitation_codes WHERE family_id = p_family_id;
  
  DELETE FROM family_members WHERE family_id = p_family_id;
  
  DELETE FROM families WHERE family_id = p_family_id;
  
  v_result := json_build_object(
    'success', true,
    'message', '가족이 삭제되었습니다.'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '가족 삭제 실패: %', SQLERRM;
END;
$$;

