-- 재료 사용 횟수 증감을 위한 RPC 함수들

-- usage_count 증가 함수
CREATE OR REPLACE FUNCTION increment_usage_count(
  p_ingredient_id BIGINT,
  p_family_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE fridge_ingredients
  SET usage_count = usage_count + 1
  WHERE ingredient_id = p_ingredient_id
    AND family_id = p_family_id
    AND is_active = TRUE;
END;
$$;

-- usage_count 감소 함수 (0 이하로 내려가지 않음)
CREATE OR REPLACE FUNCTION decrement_usage_count(
  p_ingredient_id BIGINT,
  p_family_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE fridge_ingredients
  SET usage_count = GREATEST(usage_count - 1, 0)
  WHERE ingredient_id = p_ingredient_id
    AND family_id = p_family_id
    AND is_active = TRUE;
END;
$$;

