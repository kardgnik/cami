import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.ADMIN_PASSWORD;
  if (!email || !senha) throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env");
  if (senha.length < 8) throw new Error("ADMIN_PASSWORD precisa ter ao menos 8 caracteres");

  const senhaHash = await bcrypt.hash(senha, 12);
  await prisma.gerente.upsert({
    where: { email },
    update: { senhaHash },
    create: { email, senhaHash },
  });
  console.log(`Gerente pronto: ${email}`);

  // Cadastros iniciais, sem taxa. O gerente ajusta as taxas pelo painel.
  // `update: {}` garante que rodar o seed de novo não sobrescreve ajustes feitos.
  for (const nome of ["Pix", "Cartão de crédito", "Boleto"]) {
    await prisma.metodoPagamento.upsert({ where: { nome }, update: {}, create: { nome } });
  }
  await prisma.plataforma.upsert({ where: { nome: "Venda direta" }, update: {}, create: { nome: "Venda direta" } });
  console.log("Métodos de pagamento e plataforma padrão garantidos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
