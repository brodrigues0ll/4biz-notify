import { launchBrowser, createPage } from "../playwrightConfig.js";
import { scrapeTickets } from "./scraper.js";
import { FOURBIZ_URLS, SELECTORS } from "./config.js";

export async function login4Biz(email, password, onProgress = null) {
  let browser;
  let page;

  const reportProgress = (percent, message) => {
    if (onProgress) onProgress(percent, message);
  };

  try {
    reportProgress(0, "Iniciando processo de login...");

    browser = await launchBrowser();
    reportProgress(5, "Navegador iniciado");

    page = await createPage(browser);
    reportProgress(10, "Página criada");

    reportProgress(15, "Navegando para página inicial...");
    await page.goto(FOURBIZ_URLS.HOME, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    reportProgress(20, "Página inicial carregada");

    reportProgress(25, "Procurando botão de login...");

    let popupPage = null;
    let buttonClicked = false;

    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);

    try {
      reportProgress(27, "Procurando botão de login com seletores...");
      const loginButton = await page.locator(SELECTORS.LOGIN_BUTTON).first();

      const isVisible = await loginButton
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isVisible) {
        reportProgress(30, "Botão de login encontrado, clicando...");

        const popupPromise = page
          .context()
          .waitForEvent("page", { timeout: 2000 });

        await loginButton.click();
        buttonClicked = true;
        reportProgress(35, "Aguardando janela de login...");

        try {
          popupPage = await popupPromise;
          reportProgress(37, "Janela de login aberta");
          page = popupPage;
        } catch (err) {
          await page
            .waitForLoadState("networkidle", { timeout: 5000 })
            .catch(() => {});
        }
      }
    } catch (error) {}

    if (!buttonClicked) {
      const popupPromise = page
        .context()
        .waitForEvent("page", { timeout: 15000 })
        .catch(() => null);

      const result = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button, a"));
        const loginBtn = buttons.find((btn) => {
          const text = btn.textContent
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
          return (
            text.includes("entra") &&
            (text.includes("ziva") || text.includes("id"))
          );
        });

        if (loginBtn) {
          loginBtn.click();
          return { found: true };
        }
        return { found: false };
      });

      if (result.found) {
        buttonClicked = true;
        popupPage = await popupPromise;
        if (popupPage) {
          page = popupPage;
        } else {
          await page
            .waitForLoadState("networkidle", { timeout: 5000 })
            .catch(() => {});
        }
      }
    }

    if (!buttonClicked) {
      throw new Error(
        'Não foi possível encontrar ou clicar no botão "Entra ID Ziva"'
      );
    }

    await page.waitForTimeout(1500);
    await page.waitForLoadState("domcontentloaded").catch(() => {});

    reportProgress(40, "Procurando campo de email...");

    const emailInput = await page.locator(SELECTORS.EMAIL_INPUT).first();

    await emailInput.waitFor({ state: "visible", timeout: 15000 });
    reportProgress(45, "Preenchendo email...");

    await emailInput.clear();
    await emailInput.fill(email);
    await emailInput.press("Tab");
    await page.waitForTimeout(1000);
    reportProgress(50, "Email preenchido");

    reportProgress(55, "Clicando em próximo...");
    const nextButton = await page.locator(SELECTORS.SUBMIT_BUTTON).first();
    await nextButton.waitFor({ state: "visible", timeout: 5000 });
    await nextButton.click();

    await page.waitForTimeout(2000);
    await page.waitForLoadState("networkidle");

    reportProgress(60, "Aguardando campo de senha...");
    const passwordInput = await page.locator(SELECTORS.PASSWORD_INPUT).first();

    await passwordInput.waitFor({ state: "visible", timeout: 15000 });

    reportProgress(65, "Preenchendo senha...");
    await passwordInput.clear();
    await passwordInput.fill(password);
    await passwordInput.press("Tab");
    await page.waitForTimeout(1000);
    reportProgress(70, "Senha preenchida");

    reportProgress(75, "Fazendo login...");
    const signInButton = await page.locator(SELECTORS.SIGN_IN_BUTTON).first();
    await signInButton.waitFor({ state: "visible", timeout: 5000 });
    await signInButton.click();

    await page.waitForTimeout(1500);

    try {
      reportProgress(77, "Verificando opção 'Permanecer conectado'...");
      const staySignedInButton = await page
        .locator(SELECTORS.STAY_SIGNED_IN)
        .first();

      if (await staySignedInButton.isVisible({ timeout: 2000 })) {
        reportProgress(78, "Confirmando 'Permanecer conectado'...");
        await staySignedInButton.click();
        await page.waitForTimeout(1500);
      }
    } catch (error) {}

    reportProgress(79, "Aguardando redirecionamento...");
    try {
      await page.waitForLoadState("networkidle", { timeout: 3000 });
    } catch (error) {}

    if (popupPage && !popupPage.isClosed()) {
      await popupPage.waitForEvent("close", { timeout: 3000 }).catch(() => {});
    }

    await page.waitForTimeout(1500);

    reportProgress(80, "Login bem-sucedido, navegando para chamados...");

    await page.goto(FOURBIZ_URLS.TICKETS, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    reportProgress(85, "Página de chamados carregada");

    await page.waitForTimeout(2000);

    reportProgress(87, "Aguardando lista de chamados...");

    try {
      await page.waitForSelector(SELECTORS.TICKET_ITEM, {
        state: "visible",
        timeout: 10000,
      });

      await page.waitForTimeout(1000);

      const ticketCount = await page.locator(SELECTORS.TICKET_ITEM).count();
      reportProgress(90, `${ticketCount} chamados encontrados`);
    } catch (error) {
      reportProgress(90, "Nenhum chamado encontrado");
    }

    reportProgress(91, "Extraindo cookies de sessão...");
    const context = page.context();
    const cookies = await context.cookies();

    if (cookies.length === 0) {
      throw new Error("Nenhum cookie foi capturado. Login pode ter falhado.");
    }

    const cookieString = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    const finalHtml = await page.content();

    reportProgress(92, "Extraindo dados dos chamados...");

    const tickets = await scrapeTickets(page);
    reportProgress(95, `${tickets.length} chamados extraídos`);

    reportProgress(98, "Finalizando...");

    reportProgress(100, "Concluído!");

    return {
      cookies: cookieString,
      html: finalHtml,
      tickets,
    };
  } catch (error) {
    console.error("Erro durante login:", error);
    throw error;
  }
}
