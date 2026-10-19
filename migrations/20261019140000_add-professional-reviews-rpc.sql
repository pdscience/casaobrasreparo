-- Avaliacoes publicas de um profissional sem expor dados do cliente.
-- `service_requests` tem SELECT publico (inclui nome/telefone/endereco do
-- cliente); esta funcao expoe somente nota, comentario e data.
create or replace function public.get_professional_reviews(p_id text)
returns table (stars int, comment text, review_date date)
language sql
security definer
set search_path = public
as $$
  select
    least(5, greatest(1, round((rating->>'stars')::numeric)))::int as stars,
    coalesce(rating->>'comment', '') as comment,
    case
      when (rating->>'date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
        then left(rating->>'date', 10)::date
    end as review_date
  from public.service_requests
  where professional_id = p_id
    and rating is not null
    and (rating->>'stars') ~ '^[0-9]+$'
    and (rating->>'stars')::numeric >= 1
  order by review_date desc nulls last
  limit 10;
$$;

grant execute on function public.get_professional_reviews(text) to anon, authenticated;
