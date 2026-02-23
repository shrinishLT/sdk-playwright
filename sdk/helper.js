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
  module.exports = {
    smoothScrollToBottom,
  };