-- 이미 있으면 덮어쓰기
create or replace function add_menu_with_ingredients(
  family_id     bigint,
  user_id       bigint,
  menu_name     text,
  source_type   text,   -- 'HOME' 또는 'EAT_OUT'
  status        text,   -- 'POSSIBLE' 또는 'WISH'
  ingredients   jsonb,  -- 예: [{ "name": "김치", "storage": "FRIDGE" }, ...]
  to_buy        jsonb default '[]'::jsonb  -- 예: ["대파", "고추장"]
)
returns bigint
language plpgsql
as $$
declare
  new_menu_id bigint;
  ing jsonb;
  tobuy text;
  v_ingredient_id bigint;
begin
  -- 1) 메뉴 생성
  insert into menus (
    family_id,
    created_by,
    menu_name,
    source_type,
    status
  )
  values (
    family_id,
    user_id,
    menu_name,
    source_type,
    status
  )
  returning menu_id into new_menu_id;

  -- 2) 재료 처리 (FRIDGE / FREEZER / ROOM)
  -- ingredients: [{ "name": "...", "storage": "FRIDGE" }, ...]
  for ing in
    select * from jsonb_array_elements(coalesce(ingredients, '[]'::jsonb))
  loop
    -- 같은 가족 + 같은 이름 + 같은 storage_type 재료 있으면 재사용
    select ingredient_id
      into v_ingredient_id
    from fridge_ingredients
    where family_id = family_id
      and ingredient_name = ing->>'name'
      and storage_type   = ing->>'storage'
    limit 1;

    if not found then
      insert into fridge_ingredients (
        family_id,
        ingredient_name,
        storage_type,
        usage_count,
        created_by
      )
      values (
        family_id,
        ing->>'name',
        ing->>'storage',
        0,
        user_id
      )
      returning ingredient_id into v_ingredient_id;
    end if;

    -- 메뉴-재료 매핑
    insert into menu_ingredients (
      menu_id,
      ingredient_id
    )
    values (
      new_menu_id,
      v_ingredient_id
    );
  end loop;

  -- 3) 장 봐야 할 것 (to_buy: ["대파", "고추장", ...])
  for tobuy in
    select value::text from jsonb_array_elements_text(coalesce(to_buy, '[]'::jsonb))
  loop
    insert into fridge_ingredients (
      family_id,
      ingredient_name,
      storage_type,
      usage_count,
      created_by
    )
    values (
      family_id,
      tobuy,
      'NEED',   -- 사야하는 재료
      0,
      user_id
    );
  end loop;

  return new_menu_id;
end;
$$;
