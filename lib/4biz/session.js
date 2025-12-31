import { createPage } from "../playwrightConfig.js";
import { getBrowserFromPool } from "../browserPool.js";
import { FOURBIZ_URLS } from "./config.js";

export async function validateSession(cookies) {
  if (!cookies) return false;

  let browser;
  let page;
  let context;

  try {
    browser = await getBrowserFromPool();

    const cookieObjects = cookies.split("; ").map((cookie) => {
      const [name, value] = cookie.split("=");
      return {
        name,
        value,
        domain: ".4biz.one",
        path: "/",
      };
    });

    page = await createPage(browser, cookieObjects);
    context = page.context();

    await page.goto(FOURBIZ_URLS.HOME, {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    const html = await page.content();
    const ticketCount = await page.locator('[name="list-item"]').count();

    return ticketCount > 0 || !html.includes("j_username");
  } catch (error) {
    console.error("Erro ao validar sessão:", error);
    return false;
  } finally {
    // Fecha o contexto/página mas mantém o browser no pool
    if (context) {
      try {
        await context.close();
      } catch (e) {
        console.error("Erro ao fechar contexto:", e);
      }
    }
  }
}
