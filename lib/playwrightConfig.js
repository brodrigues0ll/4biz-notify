"use server";

import { chromium as playwrightChromium } from "playwright";
import chromium from "@sparticuz/chromium";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export async function launchBrowser() {
  const isLocal = process.env.NODE_ENV !== "production";

  if (isLocal) {
    return playwrightChromium.launch({
      headless: false,
      slowMo: 50,
    });
  } else {
    const { chromium: playwrightCore } = await import("playwright-core");

    return playwrightCore.launch({
      args: [
        ...chromium.args,
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
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

  return page;
}
