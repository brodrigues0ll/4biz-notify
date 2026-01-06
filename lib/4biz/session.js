import { launchBrowser, createPage } from "../playwrightConfig.js";
import { FOURBIZ_URLS } from "./config.js";

export async function validateSession(cookies) {
  if (!cookies) return false;

  let browser;
  let page;
  let context;

  try {
    browser = await launchBrowser();

    const cookieObjects = cookies.split("; ").map((cookie) => {
      const [name, value] = cookie.split("=");
      return {
        name,
        value,
        domain: ".4biz.one",
        path: "/",
      };
    });

    const pageData = await createPage(browser, cookieObjects);
    page = pageData.page;
    context = pageData.context;

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
    // Fecha o browser completamente
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error("Erro ao fechar browser:", e);
      }
    }
  }
}
