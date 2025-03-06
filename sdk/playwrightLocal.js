const { chromium } = require("playwright");
const {smartuiSnapshot} = require("@lambdatest/playwright-driver");

(async () => {
  // Launch a local browser instance
  const browser = await chromium.launch({
    headless: true, // Set to false to see the browser UI
  });

  const page = await browser.newPage();

  options = {
    ignoreType : ['layout']
  }
  
  await page.goto("https://ipinfo.io/");
  await smartuiSnapshot(page, "ipinfo",options);

  // Close the browser
  await browser.close();
})();