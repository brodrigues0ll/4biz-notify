"use server";

import { launchBrowser } from "./playwrightConfig.js";

/**
 * Pool de browsers para reutilização
 * Reduz overhead de criar nova instância a cada requisição
 */
class BrowserPool {
  constructor() {
    this.browser = null;
    this.isLaunching = false;
    this.lastUsed = null;
    this.maxIdleTime = 5 * 60 * 1000; // 5 minutos
    this.startIdleChecker();
  }

  async getBrowser() {
    // Se já tem browser ativo, retorna
    if (this.browser && this.browser.isConnected()) {
      this.lastUsed = Date.now();
      return this.browser;
    }

    // Se está lançando, aguarda
    if (this.isLaunching) {
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isLaunching) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
      return this.browser;
    }

    // Lança novo browser
    this.isLaunching = true;
    try {
      console.log("[BrowserPool] Criando nova instância do browser...");
      this.browser = await launchBrowser();
      this.lastUsed = Date.now();
      console.log("[BrowserPool] Browser criado com sucesso");
      return this.browser;
    } catch (error) {
      console.error("[BrowserPool] Erro ao criar browser:", error);
      throw error;
    } finally {
      this.isLaunching = false;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      try {
        console.log("[BrowserPool] Fechando browser...");
        await this.browser.close();
        this.browser = null;
        console.log("[BrowserPool] Browser fechado");
      } catch (error) {
        console.error("[BrowserPool] Erro ao fechar browser:", error);
      }
    }
  }

  /**
   * Verifica periodicamente browsers idle e fecha para economizar memória
   */
  startIdleChecker() {
    setInterval(() => {
      if (
        this.browser &&
        this.lastUsed &&
        Date.now() - this.lastUsed > this.maxIdleTime
      ) {
        console.log(
          "[BrowserPool] Browser idle por muito tempo, fechando..."
        );
        this.closeBrowser();
      }
    }, 60 * 1000); // Verifica a cada 1 minuto
  }
}

// Singleton global
const browserPool = new BrowserPool();

export async function getBrowserFromPool() {
  return browserPool.getBrowser();
}

export async function closeBrowserPool() {
  return browserPool.closeBrowser();
}
