# Gestão de Mesas

Sistema para administrar mesas de RPG por assinatura: jogadores, assinaturas, mesas, mestres, sessões e pagamentos.

## Como funciona

- **Jogadores** são os assinantes. Um jogador pode ter **uma ou mais assinaturas**.
- **Assinatura**: plano + plataforma de origem + método de pagamento. Cada assinatura cobre **até N mesas**, conforme o plano (campo "mesas incluídas").
- **Mesas** são de um **tipo** (VIP ou Especial). Cada mesa tem um **mestre**, vários jogadores (capacidade padrão de 6) e uma previsão de sessões por mês (padrão 2).
- **Mestres** recebem por sessão conduzida. O valor por sessão é definido no **tipo de mesa** (padrão R$ 35,00) e pode ser **personalizado em cada mesa**.
- **Sessões**: o mestre registra no **painel do mestre** e a sessão já entra como "a receber". O valor é gravado no momento do registro, então mudanças de preço posteriores não alteram o histórico. O gerente **marca como paga** em "Sessões e pagamentos", uma por uma ou todas de um mestre no mês.
- **Plataformas** e **métodos de pagamento** têm taxa percentual e/ou fixa, descontada de cada cobrança.
- **Visão geral** mostra **entrada e saída**: receita líquida das assinaturas (já sem taxas), custo previsto e real com mestres, valor a pagar aos mestres e o resultado do mês.

Há dois acessos, pela mesma tela de login:

| Perfil | Acesso |
|---|---|
| Gerente | Painel completo. Criado pelo `npm run db:seed` com `ADMIN_EMAIL` e `ADMIN_PASSWORD`. |
| Mestre | `/mestre`: registra sessões, vê as próprias mesas e quanto tem a receber, troca a senha. O gerente cria o acesso em "Mestres". Não vê nenhum dado financeiro da empresa. |

## Como o valor líquido é calculado

Para cada cobrança de uma assinatura:

```
taxa da plataforma = valor do plano × % da plataforma + valor fixo da plataforma
taxa do método     = valor do plano × % do método     + valor fixo do método
líquido            = valor do plano − taxa da plataforma − taxa do método
```

Exemplo: plano de R$ 100,00 vendido pela plataforma com taxa de 4,99% + R$ 0,40 e pago via Pix (sem taxa). A taxa é R$ 5,39 e o líquido fica em **R$ 94,61**. Se esse jogador está numa mesa VIP com 2 sessões por mês a R$ 35,00, o custo com o mestre é R$ 70,00 por mês.

Regras do cálculo:

- O percentual é arredondado ao centavo a cada cobrança.
- Na visão geral, planos não mensais são convertidos para o equivalente mensal. Um plano anual, por exemplo, é dividido por 12.
- Custo previsto com mestres por mês = Σ (valor por sessão da mesa × sessões por mês) das mesas ativas que têm mestre.
- Resultado previsto = receita líquida mensal − custo previsto com mestres.
- As taxas usam sempre a configuração atual. Se a taxa de uma plataforma mudar, o líquido de todas as assinaturas dela muda junto. O sistema não guarda histórico de cobranças dos jogadores (só das sessões dos mestres).

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

5. Crie o login do gerente. O seed também cadastra Pix, Cartão de crédito, Boleto e a plataforma "Venda direta" (todos sem taxa) e os tipos de mesa VIP e Especial (R$ 35,00 por sessão).

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
  schema.prisma        modelos: Gerente, Mestre, Jogador, Assinatura, Mesa, TipoMesa, Sessao, Plano, Plataforma, MetodoPagamento
  migrations/          migrações SQL
  seed.ts              gerente + cadastros iniciais
src/
  proxy.ts             redireciona para /login quem não tem sessão e separa gerente/mestre
  lib/
    finance.ts         cálculo de taxas e valor líquido (funções puras)
    format.ts          moeda, percentual e leitura de números em pt-BR
    validations.ts     schemas Zod dos formulários
    datas.ts           mês atual e intervalos no fuso de Brasília
    session.ts, dal.ts sessão e verificação de gerente/mestre em páginas e actions
  app/
    login/             tela de login
    (admin)/           painel do gerente (visão geral, jogadores, mesas, mestres, sessões, planos...)
    mestre/            painel do mestre
```

Valores monetários ficam no banco em **centavos** e percentuais em **pontos-base** (4,99% = 499), sempre como inteiros, para evitar erros de arredondamento.
