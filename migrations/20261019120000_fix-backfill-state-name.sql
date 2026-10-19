-- Correcao do backfill da migration 20261019103000.
-- O contrato do app e: `state` guarda o NOME do estado (ex.: "Sao Paulo") e a
-- coluna legada `uf` guarda a SIGLA (ex.: "SP"). O backfill anterior gravou a
-- sigla em `state`, o que deixava os perfis antigos em desacordo com o app.
-- Idempotente: so reescreve quando `state` ainda e uma sigla conhecida.

UPDATE public.users AS u
SET state = m.name
FROM (VALUES
  ('AC', 'Acre'),
  ('AL', 'Alagoas'),
  ('AP', 'Amapá'),
  ('AM', 'Amazonas'),
  ('BA', 'Bahia'),
  ('CE', 'Ceará'),
  ('DF', 'Distrito Federal'),
  ('ES', 'Espírito Santo'),
  ('GO', 'Goiás'),
  ('MA', 'Maranhão'),
  ('MT', 'Mato Grosso'),
  ('MS', 'Mato Grosso do Sul'),
  ('MG', 'Minas Gerais'),
  ('PA', 'Pará'),
  ('PB', 'Paraíba'),
  ('PR', 'Paraná'),
  ('PE', 'Pernambuco'),
  ('PI', 'Piauí'),
  ('RJ', 'Rio de Janeiro'),
  ('RN', 'Rio Grande do Norte'),
  ('RS', 'Rio Grande do Sul'),
  ('RO', 'Rondônia'),
  ('RR', 'Roraima'),
  ('SC', 'Santa Catarina'),
  ('SP', 'São Paulo'),
  ('SE', 'Sergipe'),
  ('TO', 'Tocantins')
) AS m(code, name)
WHERE upper(u.state) = m.code;

UPDATE public.professionals AS p
SET state = m.name
FROM (VALUES
  ('AC', 'Acre'),
  ('AL', 'Alagoas'),
  ('AP', 'Amapá'),
  ('AM', 'Amazonas'),
  ('BA', 'Bahia'),
  ('CE', 'Ceará'),
  ('DF', 'Distrito Federal'),
  ('ES', 'Espírito Santo'),
  ('GO', 'Goiás'),
  ('MA', 'Maranhão'),
  ('MT', 'Mato Grosso'),
  ('MS', 'Mato Grosso do Sul'),
  ('MG', 'Minas Gerais'),
  ('PA', 'Pará'),
  ('PB', 'Paraíba'),
  ('PR', 'Paraná'),
  ('PE', 'Pernambuco'),
  ('PI', 'Piauí'),
  ('RJ', 'Rio de Janeiro'),
  ('RN', 'Rio Grande do Norte'),
  ('RS', 'Rio Grande do Sul'),
  ('RO', 'Rondônia'),
  ('RR', 'Roraima'),
  ('SC', 'Santa Catarina'),
  ('SP', 'São Paulo'),
  ('SE', 'Sergipe'),
  ('TO', 'Tocantins')
) AS m(code, name)
WHERE upper(p.state) = m.code;

-- Normaliza telefones legados para E.164 canonico (sem pontuacao).
UPDATE public.users
SET phone = '+' || regexp_replace(phone, '\D', '', 'g')
WHERE phone <> '' AND phone <> '+' || regexp_replace(phone, '\D', '', 'g');

UPDATE public.professionals
SET phone = '+' || regexp_replace(phone, '\D', '', 'g')
WHERE phone <> '' AND phone <> '+' || regexp_replace(phone, '\D', '', 'g');
