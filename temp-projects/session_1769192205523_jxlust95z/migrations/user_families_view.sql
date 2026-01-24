create or replace view user_families_view as
select
    fm.user_id,
    f.family_id,
    f.family_name,
    fm.role,
    count(distinct fm2.user_id) as member_count,
    coalesce(m.menu_name, null) as today_menu
from family_members fm
join families f on f.family_id = fm.family_id
left join family_members fm2 on fm2.family_id = f.family_id
left join today_menus tm
    on tm.family_id = f.family_id
   and tm.target_date = current_date
left join menus m
    on m.menu_id = tm.menu_id
group by
    fm.user_id,
    f.family_id,
    f.family_name,
    fm.role,
    m.menu_name
order by f.family_id;
