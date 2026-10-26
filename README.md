# IronLog — Treino e progressão muscular

Aplicativo web para gerenciar treinos de musculação com foco em hipertrofia: rotina semanal editável, execução de treino ao vivo com registro de séries, progressão dupla de carga, estatísticas, histórico, recuperação estimada por grupo muscular e biblioteca de exercícios.

- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS · Lucide · Recharts · Zod · React Hook Form · Vitest
- **Persistência:** modo local (localStorage) por padrão; Supabase (auth + Postgres com RLS) opcional, via variáveis de ambiente
- **Deploy:** Vercel

---

## Sumário

1. [Rodando localmente](#1-rodando-localmente)
2. [Scripts](#2-scripts)
3. [Variáveis de ambiente](#3-variáveis-de-ambiente)
4. [Modo local vs. Supabase](#4-modo-local-vs-supabase)
5. [Configurando o Supabase](#5-configurando-o-supabase)
6. [Deploy na Vercel](#6-deploy-na-vercel)
7. [Funcionalidades](#7-funcionalidades)
8. [Convenções de cálculo](#8-convenções-de-cálculo)
9. [Arquitetura](#9-arquitetura)
10. [Testes e verificações](#10-testes-e-verificações)
11. [Erros comuns](#11-erros-comuns)

---

## 1. Rodando localmente

Requisitos: Node.js 18.18+ (recomendado 20 ou 22) e npm.

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Sem configurar nada, o app roda em **modo local**: os dados ficam no `localStorage` do navegador e não são sincronizados.

## 2. Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (inclui checagem de tipos) |
| `npm run start` | Serve o build de produção |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (regras `next/core-web-vitals` + `next/typescript`) |
| `npm run test` | Testes unitários com Vitest (cálculos, persistência, backup) |
| `npm run check` | typecheck + lint + test + build |

## 3. Variáveis de ambiente

Copie `.env.example` para `.env.local`. Nenhuma variável é obrigatória.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | não | URL do projeto Supabase. Ativa o modo nuvem quando presente junto da chave. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | não | Chave pública **anon**. Nunca use a `service_role` no frontend. |
| `NEXT_PUBLIC_ALLOW_LOCAL_MODE` | não | Com o Supabase configurado a conta é obrigatória. `true` volta a oferecer "Usar modo local neste dispositivo" na tela de login. |

Chaves privadas nunca são lidas pelo app. Toda a segurança de dados no Supabase vem das políticas RLS (ver migration).

## 4. Modo local vs. Supabase

| | Modo local | Supabase |
|---|---|---|
| Quando | Variáveis ausentes (ou `NEXT_PUBLIC_ALLOW_LOCAL_MODE=true` e o usuário escolheu "Usar modo local") | Variáveis presentes; login obrigatório |
| Onde salva | `localStorage` com prefixo `ironlog:v1:` | Tabela `public.user_documents` (uma linha por chave) |
| Sincroniza entre dispositivos | **Não** (o app deixa isso explícito na interface) | Sim |
| Backup | Exportar/importar JSON em Perfil | Idem, além da nuvem |

A camada de persistência é isolada (`lib/storage/`): ambos os modos salvam os mesmos seis documentos JSON (`settings`, `exercises`, `routine`, `sessions`, `activeSession`, `restLogs`). Migrar do local para a nuvem é exportar o backup e importar após entrar na conta.

## 5. Configurando o Supabase

1. Crie um projeto em https://supabase.com.
2. Em **SQL Editor**, execute o conteúdo de `supabase/migrations/0001_init.sql`. Ele cria a tabela `user_documents`, habilita RLS e cria políticas para que cada usuário leia/escreva somente as próprias linhas. Alternativamente, com a CLI: `supabase db push`.
3. Em **Authentication → Providers**, mantenha **Email** habilitado. Para testes rápidos, desative "Confirm email" (opcional).
4. Em **Project Settings → API**, copie a **URL** e a chave **anon public** para `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
5. Reinicie `npm run dev`. A tela inicial passa a pedir login (ou permite continuar em modo local).

## 6. Deploy na Vercel

### Pelo painel

1. Suba o projeto para um repositório Git (GitHub, GitLab ou Bitbucket).
2. Em https://vercel.com/new, importe o repositório. O framework **Next.js** é detectado automaticamente (`vercel.json` já define `npm run build`).
3. (Opcional) Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` para os ambientes Production/Preview.
4. Clique em **Deploy**. Cada push na branch principal gera um novo deploy.

### Pela CLI

```bash
npm i -g vercel
vercel login
vercel            # primeiro deploy (preview)
vercel --prod     # produção
```

Para variáveis: `vercel env add NEXT_PUBLIC_SUPABASE_URL production` (repita para a chave e para `preview`).

### Supabase + Vercel

Em **Authentication → URL Configuration** no Supabase:

- **Site URL:** a URL de produção (ex.: `https://ironlog.vercel.app`). É para onde o link de confirmação de e-mail leva por padrão; se ficar em `http://localhost:3000`, o usuário cai no localhost após confirmar.
- **Redirect URLs:** adicione a URL de produção, `http://localhost:3000/**` (desenvolvimento) e, se quiser previews, `https://*.vercel.app/**`.

O app envia `emailRedirectTo` com a origem em que o cadastro foi feito, mas o Supabase só respeita origens presentes em Redirect URLs.

## 7. Funcionalidades

- **Dashboard:** saudação e data, treino do dia com botão de iniciar/retomar, treinos e frequência da semana, volume semanal, tempo médio, sequência, último treino, evolução de cargas, próximos treinos e recuperação estimada.
- **Minha semana:** agenda de segunda a domingo com a rotina inicial (Push / Pull / Pernas A / Descanso / Superior B / Pernas B e Braços / Descanso). Editar nome, foco e tipo do dia; adicionar, remover, reordenar, substituir exercícios; alterar séries, faixa de repetições e descanso; trocar dias entre si; restaurar rotina original. Dias de descanso registram caminhada, mobilidade e observações sem obrigatoriedade.
- **Treino ao vivo:** tempo decorrido, progresso, séries com carga / repetições / RIR, concluir série, cronômetro de descanso configurável (iniciar, pausar, pular, ±15s, aviso sonoro), histórico da última execução, sugestão de carga (aceitar, ajustar ou ignorar), observações por exercício, adicionar/remover séries e exercícios, ignorar exercício, salvamento automático contínuo, confirmação para descartar, finalizar com resumo e séries incompletas registradas como tal.
- **Progressão:** gráfico de carga máxima e 1RM estimado por exercício, tabela de sessões consecutivas com deltas, sugestões para os próximos treinos, volume semanal ponderado por grupo muscular, recordes pessoais.
- **Recuperação:** por músculo: último estímulo (direto/indireto), próxima sessão programada, séries e tonelagem dos últimos 7 dias, faixa de tempo desde o estímulo, avisos de sessões exigentes em dias consecutivos (histórico e rotina), aviso explícito de que são estimativas.
- **Histórico:** calendário mensal, lista com filtros por período, exercício e grupo muscular, detalhes da sessão com edição de observações (sessão e exercício), exclusão de sessão, gráficos de volume semanal e frequência, comparação semana a semana, duração média, séries efetivas, recordes e exportação CSV.
- **Exercícios:** biblioteca com ~50 exercícios (nome, músculo principal, auxiliares, equipamento, tipo de movimento, faixa de repetições, séries, descanso, técnica), busca e filtros, criar/editar/excluir personalizados, ajustar músculos e prescrição dos padrões, histórico e recordes por exercício.
- **Exemplos de execução:** cada exercício padrão tem o botão "Ver execução" (no treino ao vivo e na biblioteca) com duas fotos (posição inicial e final) e passos em português. As fotos vêm do dataset em domínio público [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense) e foram copiadas para `public/exercise-media/`, então funcionam offline e sem API. Exercícios personalizados podem escolher o exemplo mais parecido no formulário. O mapeamento exercício → exemplo fica em `data/exercises.ts` e o catálogo traduzido em `data/exercise-demos.ts`.
- **Perfil:** nome, objetivo, nível, dias de treino, duração prevista, RIR padrão, descanso padrão, incrementos de carga (superiores/inferiores), unidade kg/lb, tema, primeiro dia da semana, exportar/importar backup JSON, restaurar rotina, excluir dados com confirmação digitada.

## 8. Convenções de cálculo

Implementadas em `lib/volume.ts`, `lib/progression.ts`, `lib/recovery.ts` e `lib/stats.ts`, com testes em `tests/`.

- **Série válida:** concluída e com repetições (ou segundos) > 0.
- **Volume (tonelagem):** carga × repetições das séries válidas. Carga ausente conta 0 kg, mas a série ainda é "efetiva". Exercícios por tempo (prancha) não geram tonelagem.
- **Exercícios unilaterais:** uma série registrada representa os dois lados; carga e repetições são **por lado**; a tonelagem é multiplicada por 2.
- **Volume por grupo muscular:** cada série válida conta **1,0** para o músculo principal (participação direta) e **0,5** para cada auxiliar (indireta). Ex.: supino conta 1,0 peito + 0,5 tríceps + 0,5 deltoide.
- **Progressão dupla:** quando a última execução atingiu o teto da faixa em todas as séries prescritas, com a mesma carga e RIR ≥ RIR padrão, o app sugere `+incremento` (2,5 kg superiores / 5 kg inferiores, configuráveis). Caso contrário sugere manter; se a maioria das séries ficou abaixo do mínimo, sugere reduzir. Sugestões nunca são apresentadas como obrigatórias.
- **1RM estimado:** Epley, `carga × (1 + reps/30)`.
- **Recordes:** maior carga em série válida, maior 1RM estimado e maior volume em uma sessão por exercício.
- **Recuperação:** faixas por tempo desde o último estímulo registrado (<24h, 24–48h, 48–72h, >72h). O app explicita que isso é uma estimativa e não uma medição fisiológica. "Sessão exigente" = ≥ 4 séries diretas no dia.
- **Sequência:** dias de treino programados pela rotina cumpridos consecutivamente; dias de descanso não quebram; hoje só conta se já houver sessão.
- **Cargas** são sempre armazenadas em kg; a conversão para lb acontece apenas na interface.
- **Datas** em ISO 8601 (UTC) para instantes; `YYYY-MM-DD` local para registros de descanso.

## 9. Arquitetura

```
app/                    rotas (App Router) — páginas finas que montam componentes
components/
  layout/               AppShell (sidebar/bottom nav), AuthScreen
  ui/                   primitivos: Button, Card, Field, Dialog, Toast, Badge, Stat…
  dashboard/ week/ workout/ history/ progression/ recovery/ exercises/ settings/
  charts/               Recharts (LoadProgress, WeeklyVolume, Frequency, MuscleVolume)
lib/
  store/AppProvider.tsx estado global + ações + salvamento automático por chave
  storage/              StorageAdapter, LocalStorageAdapter, SupabaseStorageAdapter, repository (load/validate)
  validation/           esquemas Zod (entidades, formulários, backup)
  volume.ts progression.ts recovery.ts stats.ts records.ts session.ts csv.ts backup.ts
types/                  tipos do domínio
data/                   biblioteca de exercícios e rotina inicial
supabase/migrations/    SQL + políticas RLS
tests/                  Vitest
```

**Persistência:** o `AppProvider` guarda o `AppData` em memória e, a cada alteração, salva somente as chaves que mudaram (debounce de 400 ms; 120 ms para a sessão ativa). Também salva em `pagehide`/`visibilitychange`. Falhas de gravação aparecem em um banner com botão de tentar novamente; dados corrompidos são substituídos pelo padrão e reportados.

## 10. Testes e verificações

```bash
npm run typecheck   # TypeScript strict, noUncheckedIndexedAccess
npm run lint        # ESLint
npm run test        # 39 testes: volume, progressão, recordes, estatísticas, recuperação, persistência, backup, CSV
npm run build       # build de produção
```

**Smoke test de ponta a ponta (opcional):** `scripts/e2e-smoke.mjs` percorre o fluxo real no navegador (iniciar treino, registrar séries, recarregar e conferir persistência, finalizar, histórico, progressão, recuperação, criar exercício, editar semana, trocar tema) e falha se houver erros de console. Requer o Playwright e um Edge/Chrome instalado:

```bash
npm run dev                       # em um terminal
npm i -D playwright               # uma vez (sem baixar navegadores)
BASE_URL=http://localhost:3000 node scripts/e2e-smoke.mjs
```

No Windows (PowerShell): `$env:BASE_URL="http://localhost:3000"; node scripts/e2e-smoke.mjs`. O script usa o canal `msedge`; troque por `chrome` em `chromium.launch` se preferir.

## 11. Erros comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Tela de login aparece mas eu queria usar sem conta | Supabase configurado | Clique em "Usar modo local neste dispositivo" ou remova as variáveis do `.env.local` |
| `Invalid login credentials` | E-mail/senha incorretos ou e-mail não confirmado | Confirme o e-mail ou desative a confirmação no Supabase durante testes |
| `Forbidden use of secret API key in browser` ou aviso de "chave SECRETA" no topo | A chave `service_role`/`sb_secret_` foi colocada em `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Em Project Settings → API Keys, use a chave **Publishable** (`sb_publishable_...`) ou a **anon** legada (`eyJ...` com role `anon`). Atualize a variável na Vercel e faça redeploy. O app detecta a chave secreta e cai no modo local por segurança |
| Dados não aparecem em outro navegador | Modo local não sincroniza | Exporte o backup JSON e importe no outro dispositivo, ou configure o Supabase |
| `new row violates row-level security policy` | Migration não aplicada ou usuário sem sessão | Execute `supabase/migrations/0001_init.sql` e faça login novamente |
| Banner "Armazenamento local cheio" | Cota do `localStorage` excedida | Exporte um backup e exclua sessões antigas |
| Aviso de múltiplos lockfiles no build | Outro `package-lock.json` em pasta superior | Já tratado com `outputFileTracingRoot`; pode remover o lockfile estranho |
| Build falha com erro de tipo | TypeScript strict | Rode `npm run typecheck` e corrija; o build não ignora erros de tipo por decisão de projeto |
| Som do cronômetro não toca no celular | Navegador bloqueia áudio sem interação | Toque em qualquer botão do timer uma vez; ou desative o som em Perfil |
| Porta 3000 ocupada | Outro processo | `npm run dev -- -p 3001` |

---

Dados exibidos são sempre os registros reais do usuário. Nenhum gráfico usa valores inventados; estados vazios orientam o que fazer primeiro.
