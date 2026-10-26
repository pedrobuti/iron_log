import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = new URL("./", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const results = [];
const check = (n, ok, extra = "") => {
  results.push(`${ok ? "PASS" : "FAIL"} ${n}${extra ? " — " + extra : ""}`);
  if (!ok) process.exitCode = 1;
};
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
try {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Entrar|Criar conta/ }).or(page.getByLabel("E-mail")).first().waitFor({ timeout: 15000 });
  const hasLocalBtn = (await page.getByRole("button", { name: /modo local/i }).count()) > 0;
  check("tela de login sem botão de modo local", !hasLocalBtn);
  const text = await page.textContent("body");
  check("texto explica que a conta é obrigatória", /preciso uma conta/i.test(text ?? ""));
  await page.screenshot({ path: OUT + "13-login-obrigatorio.png" });
} catch (e) {
  check("fluxo sem exceções", false, e.message);
} finally {
  await browser.close();
}
console.log(results.join("\n"));
