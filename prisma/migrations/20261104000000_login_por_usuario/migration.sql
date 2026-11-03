-- Login por nome de usuário (sem e-mail); e-mail opcional; telefone do jogador obrigatório.
-- Preserva os dados: o usuário é gerado a partir do e-mail (parte antes do @).

-- Gera um nome de usuário a partir do e-mail: minúsculas, só [a-z0-9._-].
CREATE FUNCTION pg_temp.usuario_de(email TEXT, padrao TEXT) RETURNS TEXT AS $$
  SELECT COALESCE(NULLIF(regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9._-]', '', 'g'), ''), padrao)
$$ LANGUAGE SQL IMMUTABLE;

-- Gerentes ---------------------------------------------------------------
ALTER TABLE "gerentes" ADD COLUMN "usuario" TEXT;
UPDATE "gerentes" SET "usuario" = pg_temp.usuario_de("email", 'gerente' || "id");
-- se dois gerentes gerarem o mesmo usuário, os seguintes recebem o id no final
UPDATE "gerentes" g SET "usuario" = g."usuario" || g."id"
  WHERE EXISTS (SELECT 1 FROM "gerentes" o WHERE o."usuario" = g."usuario" AND o."id" < g."id");
ALTER TABLE "gerentes" ALTER COLUMN "usuario" SET NOT NULL;
DROP INDEX "gerentes_email_key";
ALTER TABLE "gerentes" DROP COLUMN "email";
CREATE UNIQUE INDEX "gerentes_usuario_key" ON "gerentes"("usuario");

-- Mestres ----------------------------------------------------------------
ALTER TABLE "mestres" ADD COLUMN "usuario" TEXT;
UPDATE "mestres" SET "usuario" = pg_temp.usuario_de("email", 'mestre' || "id");
UPDATE "mestres" m SET "usuario" = m."usuario" || m."id"
  WHERE EXISTS (SELECT 1 FROM "mestres" o WHERE o."usuario" = m."usuario" AND o."id" < m."id");
-- não pode coincidir com o usuário de um gerente (o login procura primeiro o gerente)
UPDATE "mestres" m SET "usuario" = m."usuario" || m."id"
  WHERE EXISTS (SELECT 1 FROM "gerentes" g WHERE g."usuario" = m."usuario");
ALTER TABLE "mestres" ALTER COLUMN "usuario" SET NOT NULL;
DROP INDEX "mestres_email_key";
ALTER TABLE "mestres" ALTER COLUMN "email" DROP NOT NULL;
CREATE UNIQUE INDEX "mestres_usuario_key" ON "mestres"("usuario");

-- Jogadores --------------------------------------------------------------
ALTER TABLE "jogadores" ALTER COLUMN "email" DROP NOT NULL;
-- jogadores antigos sem telefone ficam com o campo vazio até a próxima edição
UPDATE "jogadores" SET "telefone" = '' WHERE "telefone" IS NULL;
ALTER TABLE "jogadores" ALTER COLUMN "telefone" SET NOT NULL;
