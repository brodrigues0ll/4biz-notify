import { launchBrowser, createPage } from "./playwrightConfig.js";

/**
 * Extrai dados dos chamados da página
 * @param {Page} page - Página do Playwright
 * @returns {Promise<Array>} Array com dados dos chamados
 */
export async function scrapeTickets(page) {
  console.log("📊 Extraindo dados dos chamados...");

  try {
    const tickets = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[name="list-item"]'));

      return items.map((item) => {
        // Extrair ticketId do atributo data-request ou do ID
        const ticketId = item.getAttribute("data-request") || item.id.replace("list-item-", "");

        // Extrair número do chamado
        const numero = item.querySelector(".tableless-td.numero .request-id")?.textContent.trim() || ticketId;

        // Extrair título/solicitação
        const title = item.querySelector(".tableless-td.solicitacao div")?.textContent.trim() || "";

        // Extrair prioridade
        const priority = item.querySelector(".tableless-td.prioridade .badge")?.textContent.trim() || "";

        // Extrair status/situação
        const status = item.querySelector(".tableless-td.situacao .badge")?.textContent.trim() || "";

        // Extrair data de criação
        const dataCriacao = item.querySelector(".tableless-td.dataCriacao div")?.textContent.trim() || "";

        // Extrair responsável
        const responsavel = item.querySelector(".tableless-td.responsavel div")?.textContent.trim() || "";

        // Extrair solicitante
        const solicitante = item.querySelector(".tableless-td.solicitante span")?.textContent.trim() || "";

        // Extrair SLA
        const sla = item.querySelector(".tableless-td.SLA div")?.textContent.trim() || "";

        // Extrair data limite
        const dataLimite = item.querySelector(".tableless-td.dataLimite div")?.textContent.trim() || "";

        // Extrair serviço
        const servico = item.querySelector(".tableless-td.servico div")?.textContent.trim() || "";

        // Extrair descrição
        const descricao = item.querySelector(".tableless-td.ellipsisDescricao div, .tableless-td.descricao div")?.textContent.trim() || "";

        return {
          ticketId,
          numero,
          title,
          priority,
          status,
          dataCriacao,
          responsavel,
          solicitante,
          sla,
          dataLimite,
          servico,
          descricao,
        };
      });
    });

    console.log(`✅ Extração concluída: ${tickets.length} chamados encontrados.`);
    return tickets;
  } catch (error) {
    console.error("❌ Erro ao extrair chamados:", error.message);
    return [];
  }
}

/**
 * Faz login na 4Biz usando Playwright
 * Segue o fluxo de autenticação federada com Entra ID Ziva
 * @param {string} email - Email da 4Biz
 * @param {string} password - Senha da 4Biz
 * @param {Function} onProgress - Callback para reportar progresso (opcional)
 * @returns {Promise<string>} Cookies de sessão
 */
export async function login4Biz(email, password, onProgress = null) {
  let browser;
  let page;

  const reportProgress = (percent, message) => {
    console.log(`[${percent}%] ${message}`);
    if (onProgress) onProgress(percent, message);
  };

  try {
    reportProgress(0, "Iniciando processo de login...");

    // Iniciar navegador
    browser = await launchBrowser();
    reportProgress(5, "Navegador iniciado");

    // Criar página
    page = await createPage(browser);
    reportProgress(10, "Página criada");

    reportProgress(15, "Navegando para página inicial...");
    await page.goto("https://nav.4biz.one/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    reportProgress(20, "Página inicial carregada");

    reportProgress(25, "Procurando botão de login...");

    // Preparar para capturar popup
    let popupPage = null;
    let buttonClicked = false;

    // Aguardar página carregar completamente
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);

    // Tentar encontrar e clicar no botão de login federado
    try {
      reportProgress(27, "Procurando botão de login com seletores...");
      console.log("[Login 4Biz] Procurando botão com seletores Playwright...");

      // Primeiro tentar encontrar pelo texto e classe específica
      const loginButton = await page
        .locator(
          'button.gsi-material-button, button:has-text("Entra ID Ziva"), button:has-text("entra id ziva"), a:has-text("Entra ID Ziva")'
        )
        .first();

      const isVisible = await loginButton
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isVisible) {
        reportProgress(30, "Botão de login encontrado, clicando...");

        // Aguardar popup abrir quando clicar no botão
        const popupPromise = page
          .context()
          .waitForEvent("page", { timeout: 2000 });

        await loginButton.click();
        buttonClicked = true;
        reportProgress(35, "Aguardando janela de login...");

        console.log("[Login 4Biz] Aguardando popup/nova janela abrir...");
        try {
          popupPage = await popupPromise;
          reportProgress(37, "Janela de login aberta");
          console.log("[Login 4Biz] ✓ POPUP ABERTO! URL:", popupPage.url());
          page = popupPage;
        } catch (err) {
          console.log(
            "[Login 4Biz] Popup não detectado, verificando se navegou na mesma página..."
          );
          await page
            .waitForLoadState("networkidle", { timeout: 5000 })
            .catch(() => {});
        }
      }
    } catch (error) {
      console.log("[Login 4Biz] Seletor Playwright falhou:", error.message);
    }

    // Se não encontrou, tentar buscar manualmente via JavaScript
    if (!buttonClicked) {
      console.log("[Login 4Biz] Tentando encontrar botão via JavaScript...");

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
          console.log("Botão encontrado:", loginBtn.textContent);
          loginBtn.click();
          return { found: true, text: loginBtn.textContent };
        }
        return { found: false };
      });

      if (result.found) {
        console.log(
          "[Login 4Biz] ✓ Botão clicado via JavaScript! Texto:",
          result.text
        );
        buttonClicked = true;

        // Aguardar popup
        popupPage = await popupPromise;
        if (popupPage) {
          console.log("[Login 4Biz] ✓ Popup capturado! URL:", popupPage.url());
          page = popupPage;
        } else {
          console.log("[Login 4Biz] Verificando se navegou na mesma página...");
          await page
            .waitForLoadState("networkidle", { timeout: 5000 })
            .catch(() => {});
        }
      } else {
        console.log(
          '[Login 4Biz] ✗ ERRO: Botão "Entra ID Ziva" NÃO ENCONTRADO!'
        );
        console.log("[Login 4Biz] Listando todos os botões disponíveis:");
        const allButtons = await page.evaluate(() => {
          return Array.from(document.querySelectorAll("button, a"))
            .map((btn) => btn.textContent.trim())
            .slice(0, 10);
        });
        console.log("[Login 4Biz] Botões encontrados:", allButtons);
      }
    }

    if (!buttonClicked) {
      throw new Error(
        'Não foi possível encontrar ou clicar no botão "Entra ID Ziva"'
      );
    }

    // Aguardar página carregar completamente
    await page.waitForTimeout(1500);
    await page.waitForLoadState("domcontentloaded").catch(() => {});

    reportProgress(40, "Procurando campo de email...");

    // Aguardar campo de email (agora no popup)
    const emailInput = await page
      .locator(
        'input[type="email"], input[name="loginfmt"], input[name="username"], input[name="email"]'
      )
      .first();

    await emailInput.waitFor({ state: "visible", timeout: 15000 });
    reportProgress(45, "Preenchendo email...");

    await emailInput.clear();
    await emailInput.fill(email);
    await emailInput.press("Tab");
    await page.waitForTimeout(1000);
    reportProgress(50, "Email preenchido");

    // Clicar em próximo/continuar
    reportProgress(55, "Clicando em próximo...");
    const nextButton = await page
      .locator(
        'input[type="submit"], button[type="submit"], button:has-text("Next"), button:has-text("Próximo"), button:has-text("Avançar"), #idSIButton9'
      )
      .first();
    await nextButton.waitFor({ state: "visible", timeout: 5000 });
    await nextButton.click();

    // Aguardar transição
    await page.waitForTimeout(2000);
    await page.waitForLoadState("networkidle");

    // Aguardar campo de senha
    reportProgress(60, "Aguardando campo de senha...");
    const passwordInput = await page
      .locator(
        'input[type="password"], input[name="passwd"], input[name="password"]'
      )
      .first();

    await passwordInput.waitFor({ state: "visible", timeout: 15000 });

    reportProgress(65, "Preenchendo senha...");
    await passwordInput.clear();
    await passwordInput.fill(password);
    await passwordInput.press("Tab");
    await page.waitForTimeout(1000);
    reportProgress(70, "Senha preenchida");

    // Clicar em entrar
    reportProgress(75, "Fazendo login...");
    const signInButton = await page
      .locator(
        'input[type="submit"], button[type="submit"], button:has-text("Sign in"), button:has-text("Entrar"), button:has-text("Iniciar sessão"), #idSIButton9'
      )
      .first();
    await signInButton.waitFor({ state: "visible", timeout: 5000 });
    await signInButton.click();

    // Aguardar um pouco
    await page.waitForTimeout(1500);

    // Verificar se há opção "Permanecer conectado" ou "Sim"
    try {
      reportProgress(77, "Verificando opção 'Permanecer conectado'...");
      console.log('[Login 4Biz] Procurando opção "Permanecer conectado"...');
      const staySignedInButton = await page
        .locator(
          'button:has-text("Sim"), button:has-text("Yes"), input[type="submit"], #idSIButton9'
        )
        .first();

      if (await staySignedInButton.isVisible({ timeout: 2000 })) {
        reportProgress(78, "Confirmando 'Permanecer conectado'...");
        console.log(
          '[Login 4Biz] Botão "Permanecer conectado" encontrado! Clicando em "Sim"...'
        );
        await staySignedInButton.click();
        await page.waitForTimeout(1500);
        console.log('[Login 4Biz] Clicou em "Sim" com sucesso!');
      } else {
        console.log(
          '[Login 4Biz] Botão "Permanecer conectado" não apareceu (pode não ser necessário)'
        );
      }
    } catch (error) {
      console.log(
        '[Login 4Biz] Opção "Permanecer conectado" não encontrada ou não necessária'
      );
    }

    // Aguardar redirecionamento de volta para 4Biz
    reportProgress(79, "Aguardando redirecionamento...");
    console.log("[Login 4Biz] Aguardando redirecionamento para 4Biz...");
    try {
      await page.waitForLoadState("networkidle", { timeout: 3000 });
    } catch (error) {
      console.log(
        "[Login 4Biz] Timeout aguardando navegação, mas isso pode ser normal"
      );
    }

    // Se estamos no popup, aguardar ele fechar e voltar para página principal
    if (popupPage && !popupPage.isClosed()) {
      console.log("[Login 4Biz] Popup ainda aberto, aguardando fechar...");
      await popupPage.waitForEvent("close", { timeout: 3000 }).catch(() => {
        console.log("[Login 4Biz] Popup não fechou, mas continuando...");
      });
    }

    // Aguardar um pouco mais para garantir que estamos na página certa
    await page.waitForTimeout(1500);

    // Verificar se login foi bem-sucedido
    const currentUrl = page.url();
    console.log("[Login 4Biz] URL atual:", currentUrl);

    reportProgress(80, "Login bem-sucedido, navegando para chamados...");

    // Navegar diretamente para a página de chamados (conteúdo do iframe)
    const ticketsUrl = "https://nav.4biz.one/4biz/pages/serviceRequestIncident/serviceRequestIncident.load?iframe=true";

    await page.goto(ticketsUrl, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    reportProgress(85, "Página de chamados carregada");

    // Aguardar um pouco para a página carregar completamente
    await page.waitForTimeout(2000);

    reportProgress(87, "Aguardando lista de chamados...");

    // Aguardar os chamados aparecerem
    try {
      await page.waitForSelector('[name="list-item"]', {
        state: "visible",
        timeout: 10000,
      });

      // Aguardar mais um pouco para o AngularJS popular completamente
      await page.waitForTimeout(1000);

      // Contar chamados
      const ticketCount = await page.locator('[name="list-item"]').count();
      reportProgress(90, `${ticketCount} chamados encontrados`);
    } catch (error) {
      reportProgress(90, "Nenhum chamado encontrado");
    }

    // Extrair cookies
    reportProgress(91, "Extraindo cookies de sessão...");
    console.log("[Login 4Biz] Extraindo cookies...");
    const context = page.context();
    const cookies = await context.cookies();

    console.log("[Login 4Biz] Total de cookies:", cookies.length);

    if (cookies.length === 0) {
      // Salvar HTML para debug
      const html = await page.content();
      console.error(
        "[Login 4Biz] Nenhum cookie capturado. Primeiros 500 chars do HTML:"
      );
      console.error(html.substring(0, 500));
      throw new Error("Nenhum cookie foi capturado. Login pode ter falhado.");
    }

    // Converter cookies para string formato HTTP
    const cookieString = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    console.log(
      "[Login 4Biz] Cookies capturados:",
      cookieString.substring(0, 200) + "..."
    );

    // Capturar HTML final renderizado (com AngularJS executado)
    const finalHtml = await page.content();
    console.log("[Login 4Biz] Tamanho HTML final:", finalHtml.length, "bytes");

    reportProgress(92, "Extraindo dados dos chamados...");

    // Extrair dados dos chamados
    const tickets = await scrapeTickets(page);
    reportProgress(95, `${tickets.length} chamados extraídos`);

    // Se houver chamados, mostrar o primeiro como exemplo
    if (tickets.length > 0) {
      console.log("[Login 4Biz] Exemplo do primeiro chamado:");
      console.log(JSON.stringify(tickets[0], null, 2));
    }

    reportProgress(98, "Finalizando...");

    console.log("[Login 4Biz] Navegador permanecerá ABERTO para visualização...");
    console.log("[Login 4Biz] IMPORTANTE: Feche manualmente ou pare o servidor para encerrar");

    // await browser.close(); // Comentado para manter navegador aberto

    // Não fechar o navegador para permitir visualização
    // O navegador será fechado automaticamente quando o processo Node terminar

    reportProgress(100, "Concluído!");

    return {
      cookies: cookieString,
      html: finalHtml,
      tickets, // Retornar os chamados extraídos
    };
  } catch (error) {
    console.error("[Login 4Biz] ✗ Erro durante login:", error);

    // Manter navegador aberto mesmo em caso de erro para debug
    console.log(
      "[Login 4Biz] Navegador permanecerá ABERTO para você ver o erro"
    );

    // if (browser) {
    //   await browser.close();
    // }

    throw error;
  }
}

/**
 * Verifica se os cookies de sessão ainda são válidos
 * @param {string} cookies - Cookies de sessão (string formato HTTP)
 * @returns {Promise<boolean>} True se válidos
 */
export async function validateSession(cookies) {
  if (!cookies) return false;

  let browser;
  let page;

  try {
    browser = await launchBrowser();

    // Converter string de cookies para formato que Playwright aceita
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

    await page.goto("https://nav.4biz.one/", {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    const html = await page.content();
    const ticketCount = await page.locator('[name="list-item"]').count();

    // await browser.close(); // Comentado para não fechar navegador

    // Verificar se está logado (tem chamados ou não tem campo de login)
    return ticketCount > 0 || !html.includes("j_username");
  } catch (error) {
    console.error("[Validate Session] Erro ao validar sessão:", error);
    // if (browser) await browser.close(); // Comentado para não fechar navegador
    return false;
  }
}
