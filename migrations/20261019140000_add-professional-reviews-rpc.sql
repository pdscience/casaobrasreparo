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
    coalesce((rating->>'stars')::int, 0) as stars,
    coalesce(rating->>'comment', '') as comment,
    nullif(rating->>'date', '')::date as review_date
  from public.service_requests
  where professional_id = p_id
    and rating is not null
    and (rating->>'stars') is not null
  order by nullif(rating->>'date', '')::date desc nulls last
  limit 10;
$$;

grant execute on function public.get_professional_reviews(text) to anon, authenticated;
