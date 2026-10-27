// Verifica a infraestrutura de notificações de descanso sem depender de um serviço de push real:
// service worker servido e registrado, card em Perfil, ativação com permissão concedida,
// Wake Lock no treino ao vivo e respostas da rota /api/rest-timer.
// Uso: BASE_URL=http://localhost:3000 node scripts/e2e-push.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = new URL("./", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const results = [];
const errors = [];
const check = (n, ok, extra = "") => {
  results.push(`${ok ? "PASS" : "FAIL"} ${n}${extra ? " — " + extra : ""}`);
  if (!ok) process.exitCode = 1;
};

// ── Rota de API (sem navegador) ──
const sw = await fetch(BASE + "/sw.js");
check("sw.js servido", sw.status === 200 && /push/.test(await sw.text()));
const manifest = await (await fetch(BASE + "/manifest.webmanifest")).json();
check("manifest com ícones PNG e standalone", manifest.display === "standalone" && manifest.icons.some((i) => i.src === "/icon-512.png"));
for (const f of ["/icon-192.png", "/icon-512.png", "/icon-512-maskable.png", "/apple-touch-icon.png", "/badge-96.png"]) {
  const r = await fetch(BASE + f);
  check(`ícone ${f}`, r.status === 200 && r.headers.get("content-type")?.includes("image/png"));
}
const status = await (await fetch(BASE + "/api/rest-timer")).json();
check("GET /api/rest-timer responde diagnóstico", typeof status.pushConfigured === "boolean", JSON.stringify(status));
const post = await fetch(BASE + "/api/rest-timer", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
if (status.pushConfigured) check("POST sem token → 401", post.status === 401, String(post.status));
else check("POST sem VAPID → 503", post.status === 503, String(post.status));
const del = await fetch(BASE + "/api/rest-timer", { method: "DELETE" });
check("DELETE sem token → 401", del.status === 401, String(del.status));
if (status.pushConfigured) {
  const bad = await fetch(BASE + "/api/rest-timer", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer abc.def.ghi" }, body: "{}" });
  const badBody = await bad.json().catch(() => ({}));
  // Sem Supabase no ambiente de teste a rota responde 503 (supabase-nao-configurado) antes de validar o JWT.
  check("POST com JWT inválido → 401 (ou 503 sem Supabase)", bad.status === 401 || (bad.status === 503 && badBody.error === "supabase-nao-configurado"), `${bad.status} ${badBody.error ?? ""}`);
}

// ── Navegador ──
const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR", permissions: ["notifications"] });
const page = await ctx.newPage();
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`[console] ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

try {
  await page.goto(BASE + "/perfil", { waitUntil: "networkidle" });
  const loginVisible = (await page.getByLabel("E-mail").count()) > 0;
  if (loginVisible) {
    check("ambiente exige conta; script roda só em modo local", false, "rode sem NEXT_PUBLIC_SUPABASE_* ou com NEXT_PUBLIC_ALLOW_LOCAL_MODE=true");
    throw new Error("login obrigatório");
  }

  const reg = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    return { scope: r.scope, hasPush: "pushManager" in r };
  });
  check("service worker registrado na raiz", reg.scope === BASE + "/" || reg.scope.endsWith("/"), reg.scope);

  await page.getByText("Notificações do descanso").waitFor({ timeout: 15000 });
  const toggle = page.getByRole("switch", { name: /Avisar quando o descanso terminar/ });
  await toggle.waitFor({ timeout: 10000 });
  check("switch de notificações presente e desligado", (await toggle.getAttribute("aria-checked")) === "false");
  await toggle.click();
  await page.waitForFunction(() => document.querySelector('[role="switch"][aria-checked="true"]') !== null, null, { timeout: 10000 });
  check("ativação concedida grava preferência", await page.evaluate(() => localStorage.getItem("ironlog:rest-notifications") === "1"));
  const body = await page.textContent("body");
  check("card explica o estado do push com tela bloqueada", /Tela bloqueada/.test(body ?? "") && /(faltam as chaves VAPID|Exige estar conectado|Pronto)/.test(body ?? ""));
  await page.screenshot({ path: OUT + "14-notificacoes.png", fullPage: true });

  // Treino ao vivo: Wake Lock + integração do cronômetro
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const start = page.getByRole("button", { name: /Iniciar treino|Treino livre|Iniciar/ }).first();
  await start.click();
  await page.waitForURL(/\/treino/, { timeout: 15000 });
  await page.getByRole("timer").waitFor({ timeout: 15000 });
  // Navegadores headless expõem a API mas costumam negar o pedido; só exigimos o aviso quando o pedido é aceito.
  const wakeGranted = await page.evaluate(async () => {
    if (!("wakeLock" in navigator)) return false;
    try {
      const s = await navigator.wakeLock.request("screen");
      await s.release();
      return true;
    } catch {
      return false;
    }
  });
  const wakeText = (await page.textContent("body"))?.includes("Tela mantida acesa");
  check("Wake Lock sinalizado quando concedido", !wakeGranted || Boolean(wakeText), wakeGranted ? "concedido" : "negado/indisponível no navegador de teste");
  check("link para ativar notificações some quando já ativadas", !(await page.textContent("body"))?.includes("Ativar notificação de fim de descanso"));

  // Concluir uma série dispara o cronômetro; pular cancela. Sem conta, nenhuma chamada remota deve ocorrer.
  const calls = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/rest-timer")) calls.push(r.method());
  });
  await page.getByLabel("Carga da série 1").first().fill("40");
  await page.getByLabel("Repetições da série 1").first().fill("10");
  await page.getByRole("button", { name: "Concluir série 1" }).first().click();
  await page.waitForTimeout(600);
  check("cronômetro começou a contar", /Descansando/.test((await page.textContent('[role="timer"]')) ?? ""));
  await page.getByRole("button", { name: "Pular descanso" }).click();
  await page.waitForTimeout(400);
  check("sem conta não há chamadas à API de push", calls.length === 0, calls.join(","));
  await page.screenshot({ path: OUT + "15-treino-notificacoes.png", fullPage: false });

  // Descartar para não deixar sessão pendente
  await page.getByRole("button", { name: "Descartar sessão" }).click();
  await page.getByRole("button", { name: "Descartar treino" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/treino"), { timeout: 10000 });
} catch (e) {
  check("fluxo sem exceções", false, e.message);
  await page.screenshot({ path: OUT + "99-push-fail.png", fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

// O contexto do Playwright é anônimo: o Chromium recusa a Push API ali e avisa no console (não é erro do app).
const relevant = errors.filter((e) => !/favicon|ERR_CONNECTION_REFUSED|Push API in incognito/.test(e));
check("sem erros de console", relevant.length === 0, relevant.slice(0, 3).join(" | "));
console.log(results.join("\n"));
