"use server";

import { chromium as playwrightChromium } from "playwright";
import chromium from "@sparticuz/chromium";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export async function launchBrowser() {
  const isLocal = process.env.NODE_ENV !== "production";

  if (isLocal) {
    return playwrightChromium.launch({
      headless: true,
      slowMo: 50,
    });
  } else {
    const { chromium: playwrightCore } = await import("playwright-core");

    return playwrightCore.launch({
      args: [
        ...chromium.args,
        // Otimizações de performance e memória
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        // Reduzir uso de memória
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-breakpad",
        "--disable-component-extensions-with-background-pages",
        "--disable-extensions",
        "--disable-features=TranslateUI,BlinkGenPropertyTrees",
        "--disable-ipc-flooding-protection",
        "--disable-renderer-backgrounding",
        "--enable-features=NetworkService,NetworkServiceInProcess",
        "--force-color-profile=srgb",
        "--hide-scrollbars",
        "--metrics-recording-only",
        "--mute-audio",
        // Limites de recursos
        "--max-old-space-size=512",
        "--renderer-process-limit=2",
      ],
      ignoreDefaultArgs: ["--enable-automation"],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true,
      timeout: 30000,
    });
  }
}

export async function createPage(browser, cookies = null) {
  const context = await browser.newContext({
    userAgent: DEFAULT_USER_AGENT,
    locale: "pt-BR",
    viewport: { width: 1280, height: 800 },
    // Desabilitar recursos desnecessários para economizar memória
    javaScriptEnabled: true, // Necessário para o scraping
    bypassCSP: true,
    ignoreHTTPSErrors: true,
    // Reduzir uso de recursos
    hasTouch: false,
    isMobile: false,
    deviceScaleFactor: 1,
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "languages", {
      get: () => ["pt-BR", "pt", "en-US", "en"],
    });
    Object.defineProperty(navigator, "plugins", {
      get: () => [{ name: "Chrome PDF Plugin" }, { name: "Chrome PDF Viewer" }],
    });

    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) =>
      parameters.name === "notifications"
        ? Promise.resolve({ state: "denied" })
        : originalQuery(parameters);

    window.chrome = window.chrome || { runtime: {}, app: {} };

    try {
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter) {
        if (parameter === 37445) return "Intel Inc.";
        if (parameter === 37446) return "Intel Iris OpenGL Engine";
        return getParameter.call(this, parameter);
      };
    } catch (e) {}
  });

  const page = await context.newPage();

  if (cookies) {
    await context.addCookies(cookies);
  }

  await page.waitForTimeout(100 + Math.floor(Math.random() * 100));

  return { page, context };
}
