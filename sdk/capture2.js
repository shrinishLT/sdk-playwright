/* Minimal Playwright capture: Chromium @ 1920x1080, headless: false */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  argv.slice(2).forEach(arg => {
    const [k, ...rest] = arg.split('=');
    const key = k.replace(/^--/, '');
    const value = rest.join('=');
    args[key] = value === undefined || value === '' ? true : value;
  });
  return args;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

(async () => {
  const args = parseArgs(process.argv);
  const url = (args.url || process.env.URL || 'https://webscanner.lambdatest.com/webscan/builds#visualUI').trim();
  if (!url) {
    console.error('Missing required --url');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const beforeNavigationScript = "await page.goto('https://www.saucedemo.com/'); await page.waitForTimeout(5000); await page.locator('#user-name').fill('standard_user'); await page.locator('#password').fill('secret_sauce'); await page.locator('#login-button').click(); await page.waitForTimeout(5000);"

  const wrappedScript = new Function('page', `
    return (async () => {
        ${beforeNavigationScript}
    })();
`);

  await wrappedScript(page);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(url, { waitUntil: 'load' });

  // Optional: simple wait to allow page to settle
  await page.waitForTimeout(10000);

  const outDir = path.join('screenshots', 'basic');
  ensureDir(outDir);
  const ssPath = path.join(outDir, 'chrome-1920x1080.png');
  await page.screenshot({ path: ssPath, fullPage: false });
  console.log(`Saved: ${ssPath}`);

  await context.close();
  await browser.close();
})();
