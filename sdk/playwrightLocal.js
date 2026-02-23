const { chromium } = require("playwright");
const {smartuiSnapshot} = require("@lambdatest/playwright-driver");

(async () => {
  // Launch a local browser instance
  const browser = await chromium.launch({
    headless: true, // Set to false to see the browser UI
  });

  const page = await browser.newPage();

  const options = {
    ignoreDOM: {
      cssSelector : ['.wrapper section:nth-child(1)'],
    }
  }

  await page.goto("https://ltqa-frontend.lambdatestinternal.com/dynamic-element-testing");
  await smartuiSnapshot(page, "floating-regions");

  await page.goto("https://ltqa-frontend.lambdatestinternal.com/dynamic-colour-testing");
  await smartuiSnapshot(page, "ignore-colors");

  await browser.close();
})();