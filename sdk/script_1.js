const { chromium } = require("playwright");
const smartuiSnapshot = require("@lambdatest/playwright-driver");

(async () => {
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const takeSnapshot = async (url, snapshotName) => {
    await page.goto(url);
    await smartuiSnapshot.smartuiSnapshot(page, snapshotName);
  };
  

  const urls = [
    { url: 'https://fast.com', name: 'Snapshot-1' },
    { url: 'https://google.com', name: 'Snapshot-2' },
    { url: 'https://demo.testim.io/', name: 'Snapshot-3' },
    { url: 'https://flipkart.com', name: 'Snapshot-4' },
    { url: 'https://amazon.com', name: 'Snapshot-5' },
    { url: 'https://lambdatest.com', name: 'Snapshot-6' },
    { url: 'https://smartui.lambdatest.com', name: 'Snapshot-7' },
    { url: 'https://ipinfo.io', name: 'Snapshot-8' },
  ];
  
  // Navigate to each URL and take snapshots
  for (const { url, name } of urls) {
    await takeSnapshot(url, name);
  }
  
  await browser.close();
})();