import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = new URL("./", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const errors = [];
const results = [];
const check = (n, ok, extra = "") => {
  results.push(`${ok ? "PASS" : "FAIL"} ${n}${extra ? " — " + extra : ""}`);
  if (!ok) process.exitCode = 1;
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
try {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByText("Treino de hoje").waitFor();
  await page.getByRole("button", { name: "Mais" }).click();
  await page.getByRole("menu").waitFor();
  await page.screenshot({ path: OUT + "10-mais-menu.png" });
  const items = await page.getByRole("menuitem").allTextContents();
  check("menu Mais lista Exercícios, Progressão e Perfil", items.join(",").includes("Exercícios") && items.join(",").includes("Progressão") && items.join(",").includes("Perfil"), items.join(","));
  await page.getByRole("menuitem", { name: "Exercícios" }).click();
  await page.waitForURL(/\/exercicios/);
  await page.getByRole("heading", { name: "Exercícios" }).waitFor();
  const menuGone = (await page.getByRole("menu").count()) === 0;
  check("navega para Exercícios e fecha o menu", menuGone);
  await page.screenshot({ path: OUT + "11-exercicios-mobile.png" });
  await page.getByRole("button", { name: "Mais" }).click();
  await page.getByRole("menuitem", { name: "Perfil" }).click();
  await page.waitForURL(/\/perfil/);
  check("navega para Perfil pelo menu", true);
} catch (e) {
  check("fluxo sem exceções", false, e.message);
} finally {
  await browser.close();
}
check("sem erros de console", errors.length === 0, errors.join(" | ").slice(0, 300));
console.log(results.join("\n"));
