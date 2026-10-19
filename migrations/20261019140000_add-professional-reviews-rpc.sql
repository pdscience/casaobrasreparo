-- Avaliacoes publicas de um profissional sem expor dados do cliente.
-- `service_requests` tem SELECT publico (inclui nome/telefone/endereco do
-- cliente); esta funcao expoe somente nota, comentario e data.
create or replace function public.safe_review_date(p text)
returns date
language plpgsql
immutable
as $$
begin
  if p is null or p !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then
    return null;
  end if;
  return left(p, 10)::date;
exception
  when others then
    return null;
end;
$$;

create or replace function public.get_professional_reviews(p_id text)
returns table (stars int, comment text, review_date date)
language sql
security definer
set search_path = public
as $$
  select
    reviews.stars,
    reviews.comment,
    reviews.review_date
  from (
    select
      case
        when (rating->>'stars') ~ '^[0-9]{1,2}$'
          then least(5, greatest(1, (rating->>'stars')::int))
        else 0
      end as stars,
      coalesce(rating->>'comment', '') as comment,
      public.safe_review_date(rating->>'date') as review_date
    from public.service_requests
    where professional_id = p_id
      and rating is not null
  ) as reviews
  where reviews.stars >= 1
  order by reviews.review_date desc nulls last
  limit 10;
$$;

grant execute on function public.get_professional_reviews(text) to anon, authenticated;
