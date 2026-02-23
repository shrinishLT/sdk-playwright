const { chromium } = require("playwright");
const { expect } = require("@playwright/test");
const {smartuiSnapshot} = require("@lambdatest/playwright-driver");


// username: Username can be found at automation dashboard
const USERNAME = process.env.LT_USERNAME || "<USERNAME>";

// AccessKey:  AccessKey can be generated from automation dashboard or profile section
const KEY = process.env.LT_ACCESS_KEY || "<ACCESS_KEY>";
(async () => {
  const capabilities = {
    browserName: "Chrome",
    browserVersion: "latest",
    "LT:Options": {
      platform: "Windows 10",
      build: "Playwright SmartUI Build",
      name: "Playwright SmartUI Test",
      user: USERNAME,
      accessKey: KEY,
      network: true,
      video: true,
      console: true,
    },
  };

  const githubURL = process.env.GITHUB_URL;
  if (githubURL) {
    capabilities["LT:Options"]["github"] = {
      url: githubURL,
    };
  }

  const browser = await chromium.launch({});

  const context = await browser.newContext();
  const page = await context.newPage();

  const urls = [
    'https://renuityhome.com/',
    'https://renuityhome.com/home-storage/'
];

for (const url of urls) {
    console.log(`Navigating to: ${url}`);

    // 1. Go to Renuity website
    await page.goto(url, { waitUntil: 'load' });

    // 2. Wait for 2000 ms
    await page.waitForTimeout(2000);

    // 3. Emulate mouse movement (visible interaction)
    await page.mouse.move(100, 100);
    await page.waitForTimeout(300);
    await page.mouse.move(300, 200);
    await page.waitForTimeout(300);
    await page.mouse.move(500, 300);

    // 4. Wait for 2000 ms so user can observe loaded assets
    await page.waitForTimeout(2000);
    await smartuiSnapshot(page, url);
}

// 5. Close browser
await browser.close();
})();
