import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = new URL("./", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const errors = [];
const results = [];

function check(name, ok, extra = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) process.exitCode = 1;
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
const page = await ctx.newPage();
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`[console] ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

try {
  // 1. Dashboard
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByText("Treino de hoje").waitFor({ timeout: 15000 });
  const todayName = await page.locator("h2").filter({ hasText: /Push|Pull|Pernas|Superior|Descanso/ }).first().textContent();
  check("dashboard renderizou treino do dia", Boolean(todayName), todayName ?? "");
  await page.screenshot({ path: OUT + "01-dashboard.png", fullPage: true });

  // 2. Iniciar treino
  const start = page.getByRole("button", { name: /Iniciar treino|Treino livre/ }).first();
  await start.click();
  await page.waitForURL(/\/treino/);
  await page.getByRole("heading", { level: 1 }).waitFor();
  const h1 = await page.getByRole("heading", { level: 1 }).textContent();
  check("tela de treino aberta", Boolean(h1), h1 ?? "");

  // 2b. Exemplo de execução
  await page.getByRole("button", { name: "Ver execução" }).first().click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(800);
  const imgOk = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('[role="dialog"] img')];
    return imgs.length === 2 && imgs.every((i) => i.complete && i.naturalWidth > 0);
  });
  check("diálogo de execução mostra 2 fotos carregadas", imgOk);
  const steps = await page.locator('[role="dialog"] ol li').count();
  check("passos em português no diálogo", steps >= 3, String(steps));
  await page.screenshot({ path: OUT + "02b-execucao.png", fullPage: false });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached" });

  // 3. Preencher série 1
  await page.getByLabel("Carga da série 1").first().fill("60");
  await page.getByLabel("Repetições da série 1").first().fill("10");
  await page.getByLabel("RIR da série 1").first().fill("2");
  await page.getByRole("button", { name: "Concluir série 1" }).first().click();
  await page.getByText(/Descansando/).waitFor({ timeout: 5000 });
  check("série concluída inicia descanso", true);
  const pressed = await page.getByRole("button", { name: "Desmarcar série 1" }).first().getAttribute("aria-pressed");
  check("série marcada como concluída", pressed === "true");
  await page.screenshot({ path: OUT + "02-treino.png", fullPage: true });

  // 4. Persistência após reload
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1 }).waitFor();
  const w = await page.getByLabel("Carga da série 1").first().inputValue();
  const pressed2 = await page.getByRole("button", { name: "Desmarcar série 1" }).first().getAttribute("aria-pressed");
  check("valores persistem após reload", w === "60" && pressed2 === "true", `carga=${w} pressed=${pressed2}`);

  // 5. Série 2 com herança de valores + série extra
  await page.getByLabel("Repetições da série 2").first().fill("9");
  await page.getByRole("button", { name: "Concluir série 2" }).first().click();
  await page.getByRole("button", { name: "Adicionar série" }).first().click();
  const setCount = await page.getByRole("button", { name: /Concluir série|Desmarcar série/ }).count();
  check("série extra adicionada", setCount > 3, String(setCount));

  // 6. Finalizar
  await page.getByRole("button", { name: "Finalizar" }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "Salvar treino" }).click();
  await page.waitForURL(/\/historico\?sessao=/);
  await page.getByRole("dialog").waitFor();
  const dlg = await page.getByRole("dialog").textContent();
  check("histórico abre detalhes da sessão", /60/.test(dlg ?? ""), (dlg ?? "").slice(0, 80));
  await page.screenshot({ path: OUT + "03-historico-detalhe.png", fullPage: true });
  await page.getByRole("dialog").getByText("Fechar", { exact: true }).click();
  await page.getByText("1 sessões concluídas").waitFor();
  check("lista de histórico com 1 sessão", true);
  await page.screenshot({ path: OUT + "04-historico.png", fullPage: true });

  // 7. Dashboard atualizada
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByText("Treino de hoje concluído").waitFor({ timeout: 10000 });
  check("dashboard mostra treino concluído", true);

  // 8. Progressão e recuperação
  await page.goto(BASE + "/progressao", { waitUntil: "networkidle" });
  await page.getByText("Recordes pessoais").waitFor();
  check("progressão renderiza", true);
  await page.screenshot({ path: OUT + "05-progressao.png", fullPage: true });
  await page.goto(BASE + "/recuperacao", { waitUntil: "networkidle" });
  await page.getByText(/Último estímulo direto/).first().waitFor();
  check("recuperação mostra estímulo", true);

  // 9. Exercícios: criar personalizado
  await page.goto(BASE + "/exercicios", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Novo exercício" }).click();
  await page.getByLabel("Nome").fill("Remada baixa teste");
  await page.getByRole("button", { name: "Criar exercício" }).click();
  await page.getByText("Exercício criado.").waitFor();
  check("exercício personalizado criado", true);

  // 10. Semana: adicionar exercício ao dia + editar prescrição
  await page.goto(BASE + "/semana", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Adicionar exercício" }).first().click();
  await page.getByPlaceholder("Pesquisar…").fill("teste");
  await page.getByRole("button", { name: /Remada baixa teste/ }).click();
  await page.getByText(/adicionado\./).waitFor();
  check("exercício adicionado ao dia", true);
  await page.screenshot({ path: OUT + "06-semana.png", fullPage: true });

  // 11. Perfil: tema claro
  await page.goto(BASE + "/perfil", { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: "Claro" }).click();
  await page.waitForTimeout(300);
  const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  check("tema claro aplicado", !isDark);
  await page.screenshot({ path: OUT + "07-perfil-claro.png", fullPage: true });
  await page.reload({ waitUntil: "networkidle" });
  const isDark2 = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  check("tema claro persiste após reload", !isDark2);

  // 12. Desktop viewport
  const desk = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  desk.on("pageerror", (e) => errors.push(`[desktop pageerror] ${e.message}`));
  await desk.goto(BASE + "/", { waitUntil: "networkidle" });
  await desk.getByText("Treino de hoje").waitFor();
  await desk.screenshot({ path: OUT + "08-desktop.png" });
  await desk.close();
} catch (e) {
  check("fluxo e2e sem exceções", false, e.message);
  await page.screenshot({ path: OUT + "99-fail.png", fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

const filtered = errors.filter((e) => !/favicon|Download the React DevTools/.test(e));
check("sem erros de console/page", filtered.length === 0, filtered.join(" | ").slice(0, 600));
console.log(results.join("\n"));
