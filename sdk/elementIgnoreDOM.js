const { chromium } = require("playwright");
const { smartuiSnapshot } = require("@lambdatest/playwright-driver");

// TE-23020: element screenshot with an ignoreDOM region nested inside the captured element.
const target = { url: "https://ltqa-frontend.lambdatestinternal.com/layout1", name: "ltqa-1" };

// 375 and 1920 place the ignored card at very different offsets inside the element, which is what exercises the rebasing.
const web = {
  browsers: ["chrome"],
  viewports: [[1920], [1366], [375]],
};

const cases = [
  {
    name: `${target.name}-element-baseline`,
    options: {
      web,
      element: { cssSelector: "#features-section" },
    },
  },
  {
    name: `${target.name}-element-ignore-inner-card`,
    options: {
      web,
      element: { cssSelector: "#features-section" },
      ignoreDOM: { cssSelector: ["#visual-regression-card"] },
    },
  },
  {
    name: `${target.name}-element-ignore-inner-multi`,
    options: {
      web,
      element: { id: "benefits-section" },
      ignoreDOM: { id: ["cross-browser-feature", "breakpoint-feature"] },
    },
  },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    for (const { name, options } of cases) {
      await page.goto(target.url, { waitUntil: "networkidle" });
      await smartuiSnapshot(page, name, options);
    }
  } finally {
    await browser.close();
  }
})();
