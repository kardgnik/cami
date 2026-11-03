# Gestão de Assinaturas

Painel web para o gerente de uma empresa controlar assinaturas:

- **Planos**: nome, valor por cobrança e periodicidade (mensal, trimestral, semestral ou anual).
- **Plataformas**: de onde vêm os assinantes, cada uma com taxa percentual e/ou valor fixo por cobrança.
- **Métodos de pagamento**: Pix, cartão, boleto etc., com uma taxa própria que se soma à da plataforma.
- **Assinantes**: plano, plataforma de origem, método de pagamento e status. Mostra o valor bruto, as taxas e o **valor líquido** de cada assinante.
- **Visão geral**: receita bruta, taxas e receita líquida por mês, separadas por plataforma, plano e método.

Só o gerente tem acesso, com login por e-mail e senha.

## Como o valor líquido é calculado

Para cada cobrança de um assinante:

```
taxa da plataforma = valor do plano × % da plataforma + valor fixo da plataforma
taxa do método     = valor do plano × % do método     + valor fixo do método
líquido            = valor do plano − taxa da plataforma − taxa do método
```

Exemplo: plano de R$ 100,00 vendido pela plataforma com taxa de 4,99% + R$ 0,40 e pago via Pix (sem taxa). A taxa é R$ 5,39 e o líquido fica em **R$ 94,61**.

Regras do cálculo:

- O percentual é arredondado ao centavo a cada cobrança.
- Na visão geral, planos não mensais são convertidos para o equivalente mensal. Um plano anual, por exemplo, é dividido por 12.
- As taxas usam sempre a configuração atual. Se a taxa de uma plataforma mudar, o líquido de todos os assinantes dela muda junto. O sistema não guarda histórico de cobranças.

A regra está em [`src/lib/finance.ts`](src/lib/finance.ts) e é coberta por testes em [`src/lib/finance.test.ts`](src/lib/finance.test.ts).

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions, Cache Components) + TypeScript
- Tailwind CSS 4
- PostgreSQL + [Prisma 7](https://www.prisma.io)
- Sessão em cookie JWT assinado ([jose](https://github.com/panva/jose)) e senha com bcrypt
- Zod para validação e Vitest para testes

## Rodando localmente

Requisitos: Node.js 20.9 ou mais recente e Docker (ou um PostgreSQL já instalado).

1. Suba o banco:

   ```bash
   docker compose up -d
   ```

2. Copie o arquivo de ambiente e ajuste os valores. Defina pelo menos `SESSION_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

   ```bash
   cp .env.example .env
   ```

3. Instale as dependências. Isso também gera o cliente Prisma.

   ```bash
   npm install
   ```

4. Crie as tabelas:

   ```bash
   npm run db:migrate
   ```

5. Crie o login do gerente. O seed também cadastra Pix, Cartão de crédito, Boleto e a plataforma "Venda direta", todos sem taxa.

   ```bash
   npm run db:seed
   ```

6. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

Acesse http://localhost:3000 e entre com o `ADMIN_EMAIL` e o `ADMIN_PASSWORD` do `.env`.

Para trocar a senha do gerente, altere `ADMIN_PASSWORD` no `.env` e rode `npm run db:seed` de novo. Rodar o seed outra vez não sobrescreve taxas que você já ajustou.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm test` | Testes unitários (cálculo, formatação e validação) |
| `npm run typecheck` | Checagem de tipos |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Cria ou aplica migrações em desenvolvimento |
| `npm run db:deploy` | Aplica migrações em produção |
| `npm run db:seed` | Cria ou atualiza o gerente e os cadastros iniciais |

## Publicando

Funciona em qualquer hospedagem de Next.js com um PostgreSQL acessível. Por exemplo, Vercel com Neon ou Supabase:

1. Crie o banco e configure `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` nas variáveis de ambiente da hospedagem.
2. Rode `npm run db:deploy` e `npm run db:seed` apontando para o banco de produção.
3. Faça o deploy. O `postinstall` gera o cliente Prisma durante o build.

Em produção o cookie de sessão é marcado como `Secure`, então o site precisa estar em HTTPS.

## Estrutura

```
prisma/
  schema.prisma        modelos: Gerente, Plano, Plataforma, MetodoPagamento, Assinante
  migrations/          migrações SQL
  seed.ts              gerente + cadastros iniciais
src/
  proxy.ts             redireciona para /login quem não tem sessão
  lib/
    finance.ts         cálculo de taxas e valor líquido (funções puras)
    format.ts          moeda, percentual e leitura de números em pt-BR
    validations.ts     schemas Zod dos formulários
    session.ts, dal.ts sessão e verificação do gerente em páginas e actions
  app/
    login/             tela de login
    (admin)/           painel (visão geral, assinantes, planos, plataformas, métodos)
```

Valores monetários ficam no banco em **centavos** e percentuais em **pontos-base** (4,99% = 499), sempre como inteiros, para evitar erros de arredondamento.
