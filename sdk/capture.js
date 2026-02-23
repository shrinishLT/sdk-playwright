const { chromium, webkit } = require('playwright');

async function smoothScrollToBottom(
    page,
    {
      step = 250,
      delay = 300,
      maxScrolls = 50,
      jumpBackToTop = true,
    } = {}
  ) {
    if (!page) {
      throw new Error(
        'smoothScrollToBottom: page is undefined. ' +
        'Make sure you pass Playwright\'s { page } fixture.');
    }

    await page.evaluate(
      async ({ step, delay, maxScrolls, jumpBackToTop }) => {
        let totalHeight = document.body.scrollHeight;
        let currentScroll = window.scrollY;
        let scrollCount = 0;

        await new Promise((resolve) => {
          function scroll() {
            if (
              currentScroll + window.innerHeight >= totalHeight ||
              scrollCount >= maxScrolls
            ) {
              if (jumpBackToTop) {
                window.scrollTo(0, 0);
              }
              resolve();
              return;
            }

            window.scrollBy(0, step);
            scrollCount++;

            setTimeout(() => {
              currentScroll = window.scrollY;
              totalHeight = document.body.scrollHeight;
              scroll();
            }, delay);
          }

          scroll();
        });
      },
      { step, delay, maxScrolls, jumpBackToTop }
    );
  }

async function captureScreenshot() {
  const browser = await webkit.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // 1. Go to the page
    await page.goto("https://test.renuityhome.com/1/7-kitchens/", {
      waitUntil: 'networkidle'
    });

    // 2. Scroll to load lazy content
    await smoothScrollToBottom(page, {
      step: 300,
      delay: 750,
      maxScrolls: 40,
      jumpBackToTop: true,
    });

    // 3. Handle AVIF images
    await page.evaluate(() => {
      document.querySelectorAll('img[src$=".avif"]').forEach(img => {
        img.decoding = 'sync';
      });
    });

    await page.evaluate(async () => {
      const avifs = Array.from(document.querySelectorAll('img[src$=".avif"]'));
      for (const img of avifs) {
        try {
          const canvas = document.createElement('canvas');
          const response = await fetch(img.src);
          const blob = await response.blob();
          const bitmap = await createImageBitmap(blob);
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          canvas.getContext('2d').drawImage(bitmap, 0, 0);
          img.src = canvas.toDataURL('image/png');
        } catch {}
      }
    });

    // 4. Wait for images to settle
    await page.waitForTimeout(100000);

    // 5. Take screenshot
    await page.screenshot({
      path: 'screenshots/kitchens.png',
      fullPage: true
    });

    console.log('Screenshot saved to screenshots/kitchens.png');
  } finally {
    await browser.close();
  }
}

captureScreenshot().catch(console.error);
