import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/**
 * ADMIN_USUARIO do .env. Instalações antigas tinham ADMIN_EMAIL: nesse caso usa a
 * parte antes do @ (o mesmo que a migração login_por_usuario fez com o gerente).
 */
function usuarioDoGerente() {
  const usuario = process.env.ADMIN_USUARIO?.trim().toLowerCase();
  if (usuario) {
    if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) {
      throw new Error("ADMIN_USUARIO inválido: use de 3 a 40 letras minúsculas, números, ponto, hífen ou sublinhado.");
    }
    return usuario;
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (email) {
    const derivado = email.split("@")[0].replace(/[^a-z0-9._-]/g, "");
    if (derivado) return derivado;
  }
  throw new Error("Defina ADMIN_USUARIO no .env");
}

async function main() {
  const usuario = usuarioDoGerente();
  const senha = process.env.ADMIN_PASSWORD;
  if (!senha) throw new Error("Defina ADMIN_USUARIO e ADMIN_PASSWORD no .env");
  if (senha.length < 8) throw new Error("ADMIN_PASSWORD precisa ter ao menos 8 caracteres");

  const senhaHash = await bcrypt.hash(senha, 12);
  const existente = await prisma.gerente.findUnique({ where: { usuario } });
  const todos = await prisma.gerente.findMany({ select: { id: true, usuario: true } });
  if (existente) {
    await prisma.gerente.update({ where: { id: existente.id }, data: { senhaHash } });
  } else if (todos.length === 1) {
    // ADMIN_USUARIO mudou no .env: renomeia o gerente em vez de criar um segundo
    await prisma.gerente.update({ where: { id: todos[0].id }, data: { usuario, senhaHash } });
    console.log(`Usuário do gerente alterado de "${todos[0].usuario}" para "${usuario}".`);
  } else {
    await prisma.gerente.create({ data: { usuario, senhaHash } });
  }
  console.log(`Gerente pronto: usuário "${usuario}"`);

  // Cadastros iniciais, sem taxa. O gerente ajusta as taxas pelo painel.
  // `update: {}` garante que rodar o seed de novo não sobrescreve ajustes feitos.
  for (const nome of ["Pix", "Cartão de crédito", "Boleto"]) {
    await prisma.metodoPagamento.upsert({ where: { nome }, update: {}, create: { nome } });
  }
  await prisma.plataforma.upsert({ where: { nome: "Venda direta" }, update: {}, create: { nome: "Venda direta" } });
  for (const nome of ["VIP", "Especial"]) {
    await prisma.tipoMesa.upsert({ where: { nome }, update: {}, create: { nome, valorSessaoCentavos: 3_500 } });
  }
  console.log("Métodos de pagamento, plataforma e tipos de mesa (VIP, Especial) padrão garantidos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
