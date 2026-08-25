import { chromium, expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const here = dirname(fileURLToPath(import.meta.url)),
  extensionPath = resolve(here, "../../dist");
test("loads the packaged onboarding page in Chrome", async () => {
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  try {
    let workers = context.serviceWorkers();
    if (!workers.length)
      workers = [await context.waitForEvent("serviceworker")];
    const id = new URL(workers[0].url()).host,
      page = await context.newPage();
    await page.goto(`chrome-extension://${id}/options.html`);
    await expect(
      page.getByRole("heading", { name: "Resume Toner" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Gemini BYOK" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
