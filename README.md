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
11. [Notificações de fim de descanso](#11-notificações-de-fim-de-descanso)
12. [Erros comuns](#12-erros-comuns)

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
| `npm run vapid` | Gera o par de chaves VAPID para as notificações push (uma vez por projeto) |

## 3. Variáveis de ambiente

Copie `.env.example` para `.env.local`. Nenhuma variável é obrigatória.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | não | URL do projeto Supabase. Ativa o modo nuvem quando presente junto da chave. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | não | Chave pública **anon**. Nunca use a `service_role` no frontend. |
| `NEXT_PUBLIC_ALLOW_LOCAL_MODE` | não | Com o Supabase configurado a conta é obrigatória. `true` volta a oferecer "Usar modo local neste dispositivo" na tela de login. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | não | Chave pública VAPID (Web Push). Ativa a notificação de fim de descanso com a tela bloqueada. Ver [seção 11](#11-notificações-de-fim-de-descanso). |
| `VAPID_PRIVATE_KEY` | não | Chave privada VAPID. **Só no servidor** (sem prefixo `NEXT_PUBLIC_`): é usada pela rota `/api/rest-timer` para assinar os pushes. |
| `VAPID_SUBJECT` | não | Contato do responsável exigido pelo protocolo (`mailto:...` ou `https://...`). |

Chaves privadas nunca chegam ao navegador: a `service_role` do Supabase não é usada em lugar nenhum e a `VAPID_PRIVATE_KEY` só é lida pela rota de API. Toda a segurança de dados no Supabase vem das políticas RLS (ver migrations).

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
3. (Opcional) Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` para os ambientes Production/Preview. Para notificações com a tela bloqueada, adicione também `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` ([seção 11](#11-notificações-de-fim-de-descanso)).
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
- **Treino ao vivo:** tempo decorrido, progresso, séries com carga / repetições / RIR, concluir série, cronômetro de descanso configurável (iniciar, pausar, pular, ±15s, som + vibração ao zerar, notificação em segundo plano e com a tela bloqueada — ver [seção 11](#11-notificações-de-fim-de-descanso)), tela mantida acesa durante o treino (Wake Lock, desligável em Perfil), histórico da última execução, sugestão de carga (aceitar, ajustar ou ignorar), observações por exercício, adicionar/remover séries e exercícios, ignorar exercício, salvamento automático contínuo, confirmação para descartar, finalizar com resumo e séries incompletas registradas como tal.
- **Progressão:** gráfico de carga máxima e 1RM estimado por exercício, tabela de sessões consecutivas com deltas, sugestões para os próximos treinos, volume semanal ponderado por grupo muscular, recordes pessoais.
- **Recuperação:** por músculo: último estímulo (direto/indireto), próxima sessão programada, séries e tonelagem dos últimos 7 dias, faixa de tempo desde o estímulo, avisos de sessões exigentes em dias consecutivos (histórico e rotina), aviso explícito de que são estimativas.
- **Histórico:** calendário mensal, lista com filtros por período, exercício e grupo muscular, detalhes da sessão com edição de observações (sessão e exercício), exclusão de sessão, gráficos de volume semanal e frequência, comparação semana a semana, duração média, séries efetivas, recordes e exportação CSV.
- **Exercícios:** biblioteca com ~50 exercícios (nome, músculo principal, auxiliares, equipamento, tipo de movimento, faixa de repetições, séries, descanso, técnica), busca e filtros, criar/editar/excluir personalizados, ajustar músculos e prescrição dos padrões, histórico e recordes por exercício.
- **Exemplos de execução:** cada exercício padrão tem o botão "Ver execução" (no treino ao vivo e na biblioteca) com duas fotos (posição inicial e final) e passos em português. As fotos vêm do dataset em domínio público [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense) e foram copiadas para `public/exercise-media/`, então funcionam offline e sem API. Exercícios personalizados podem escolher o exemplo mais parecido no formulário. O mapeamento exercício → exemplo fica em `data/exercises.ts` e o catálogo traduzido em `data/exercise-demos.ts`.
- **Perfil:** nome, objetivo, nível, dias de treino, duração prevista, RIR padrão, descanso padrão, incrementos de carga (superiores/inferiores), som do cronômetro, manter tela acesa, notificações de descanso (por dispositivo, com botão de teste), unidade kg/lb, tema, primeiro dia da semana, exportar/importar backup JSON, restaurar rotina, excluir dados com confirmação digitada.

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
  api/rest-timer/       agenda/cancela o push de fim de descanso (responde e segue viva até o envio)
components/
  layout/               AppShell (sidebar/bottom nav), AuthScreen, ServiceWorkerRegister
  ui/                   primitivos: Button, Card, Field, Dialog, Toast, Badge, Stat…
  dashboard/ week/ workout/ history/ progression/ recovery/ exercises/ settings/
  charts/               Recharts (LoadProgress, WeeklyVolume, Frequency, MuscleVolume)
lib/
  store/AppProvider.tsx estado global + ações + salvamento automático por chave
  storage/              StorageAdapter, LocalStorageAdapter, SupabaseStorageAdapter, repository (load/validate)
  validation/           esquemas Zod (entidades, formulários, backup)
  push/                 notificações: shared (regras), client (navegador), server (núcleo testável da rota)
  hooks/                useWakeLock, useRestPush
  supabase/             client (navegador, chave anon) e server (cliente por requisição com o JWT do usuário)
  volume.ts progression.ts recovery.ts stats.ts records.ts session.ts csv.ts backup.ts
types/                  tipos do domínio
data/                   biblioteca de exercícios e rotina inicial
public/sw.js            service worker: só notificações (sem cache de páginas)
supabase/migrations/    SQL + políticas RLS (0001 documentos; 0002 cronômetro de descanso)
tests/                  Vitest
```

**Persistência:** o `AppProvider` guarda o `AppData` em memória e, a cada alteração, salva somente as chaves que mudaram (debounce de 400 ms; 120 ms para a sessão ativa). Também salva em `pagehide`/`visibilitychange`. Falhas de gravação aparecem em um banner com botão de tentar novamente; dados corrompidos são substituídos pelo padrão e reportados.

## 10. Testes e verificações

```bash
npm run typecheck   # TypeScript strict, noUncheckedIndexedAccess
npm run lint        # ESLint
npm run test        # 58 testes: volume, progressão, recordes, estatísticas, recuperação, persistência, backup, CSV, demos, push
npm run build       # build de produção
```

**Smoke test de ponta a ponta (opcional):** `scripts/e2e-smoke.mjs` percorre o fluxo real no navegador (iniciar treino, registrar séries, recarregar e conferir persistência, finalizar, histórico, progressão, recuperação, criar exercício, editar semana, trocar tema) e falha se houver erros de console. Requer o Playwright e um Edge/Chrome instalado:

```bash
npm run dev                       # em um terminal
npm i -D playwright               # uma vez (sem baixar navegadores)
BASE_URL=http://localhost:3000 node scripts/e2e-smoke.mjs
```

No Windows (PowerShell): `$env:BASE_URL="http://localhost:3000"; node scripts/e2e-smoke.mjs`. O script usa o canal `msedge`; troque por `chrome` em `chromium.launch` se preferir. Há também `scripts/e2e-nav.mjs` (navegação mobile), `scripts/e2e-auth.mjs` (tela de login obrigatória) e `scripts/e2e-push.mjs` (service worker, card de notificações, Wake Lock e respostas da rota `/api/rest-timer`).

## 11. Notificações de fim de descanso

Quando o cronômetro zera, o app avisa em três camadas. Cada uma cobre um cenário diferente; nenhuma substitui a outra.

| Camada | Quando funciona | O que precisa |
|---|---|---|
| **Som + vibração** no cronômetro | App aberto na tela | Nada (vibração não existe no iPhone; o som exige um toque prévio na página) |
| **Tela acesa** (Wake Lock) | Durante todo o treino ao vivo | Ligado por padrão em Perfil → "Manter a tela acesa". Evita que o aparelho bloqueie e congele timer/som. É a forma mais confiável no iPhone. |
| **Notificação local** | App em segundo plano (outra aba/app), enquanto o navegador mantiver a página viva | Permissão de notificações (Perfil → Notificações do descanso) |
| **Push agendado pelo servidor** | Tela bloqueada ou app fechado | Permissão + conta Supabase + chaves VAPID + migration `0002_rest_timers.sql`. No iPhone/iPad: app instalado na Tela de Início |

### Como funciona o push

1. Ao concluir uma série, o navegador envia `POST /api/rest-timer` com a inscrição de push e o horário em que o descanso termina.
2. A rota valida o JWT do usuário (cliente Supabase com a chave **anon** + o token do usuário; as políticas RLS continuam valendo), grava um token na tabela `rest_timers`, responde `202` na hora e **continua executando** com `after()` do Next até o fim do descanso.
3. Pular, pausar, ajustar ou terminar o descanso com o app aberto apaga/substitui o token (`DELETE` ou novo `POST`). Ao acordar, a função relê o token: se mudou, não envia nada.
4. O service worker (`public/sw.js`) mostra a notificação "Descanso finalizado — bora para a próxima série!". Se o app estiver visível, não mostra (o cronômetro já avisou). Tocar na notificação abre `/treino`.

Por que esse desenho: a Web não tem API de notificação agendada no cliente; `setTimeout` morre com a aba suspensa; o Push é a única entrega que acorda o aparelho bloqueado. Manter a função viva até o envio dispensa filas externas e cron (que têm granularidade de 1 minuto). O limite é a duração máxima da função: **300 s no plano Hobby da Vercel com Fluid Compute** (`maxDuration = 300` na rota), então descansos acima de 4min50s não são agendados no servidor (as outras camadas seguem funcionando). Em projetos antigos da Vercel sem Fluid Compute o limite cai para 60 s: ative em Project Settings → Functions.

### Configurando

```bash
npm run vapid          # imprime publicKey / privateKey
```

1. Na Vercel (Environment Variables) e no `.env.local`: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:seu@email`. Depois, redeploy (a chave pública entra no build).
2. No Supabase (SQL Editor): execute `supabase/migrations/0002_rest_timers.sql`.
3. No aparelho: Perfil → **Notificações do descanso** → ativar → "Enviar notificação de teste (5 s)" e bloquear a tela.

**iPhone/iPad:** o Safari só permite notificações para apps instalados. Compartilhar → "Adicionar à Tela de Início", abrir pelo ícone e então ativar em Perfil. O app já envia os metadados necessários (`manifest` com `display: standalone`, `apple-touch-icon`, `apple-mobile-web-app-capable`). Vibração não é suportada no iOS; o som da notificação segue o sistema.

**Android (Chrome/Edge/Samsung):** funciona no navegador normal ou instalado. A economia de bateria agressiva de algumas marcas pode atrasar pushes; coloque o navegador como "sem restrição" se os avisos atrasarem.

A preferência é por dispositivo (a permissão também é) e fica no `localStorage`, não em Settings. O service worker **não** faz cache de páginas, para nunca servir uma versão antiga do app.

## 12. Erros comuns

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
| Card de notificações diz "faltam as chaves VAPID" | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` ausente no build | Gere com `npm run vapid`, configure as três variáveis na Vercel e faça redeploy |
| Teste de notificação: "Aplique a migration 0002" | Tabela `rest_timers` não existe | Execute `supabase/migrations/0002_rest_timers.sql` no SQL Editor |
| Notificação não chega com a tela bloqueada no iPhone | App aberto no Safari, não instalado | Compartilhar → Adicionar à Tela de Início e abrir por lá; ative as notificações de novo |
| Push chega só depois de ~1 min ou não chega | Função encerrada antes do envio (sem Fluid Compute) ou descanso > 290 s | Ative Fluid Compute em Project Settings → Functions; descansos longos usam só som/notificação local |
| Notificação duplicada (local + push) | Aba voltou a ficar visível no mesmo instante em que o push chegou | Comportamento raro e inofensivo; o service worker suprime o push quando o app está visível |
| Porta 3000 ocupada | Outro processo | `npm run dev -- -p 3001` |

---

Dados exibidos são sempre os registros reais do usuário. Nenhum gráfico usa valores inventados; estados vazios orientam o que fazer primeiro.
