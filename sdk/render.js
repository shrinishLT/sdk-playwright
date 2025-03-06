import { webkit, chromium, firefox } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import scrollToBottom from 'scroll-to-bottomjs';
import { request } from 'http';
import { createRequire } from 'module';
// import { init, getChromeContext, getFirefoxContext, getWebkitContext, getEdgeContext} from './browser.js';
const require = createRequire(import.meta.url);
const BROWSER_CHROME = 'chrome';
const BROWSER_SAFARI = 'safari';
const BROWSER_FIREFOX = 'firefox';
const BROWSER_EDGE = 'edge';
const BROWSER_WEBKIT = 'webkit';
const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.107 Safari/537.3';
const FIREFOX_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:112.0) Gecko/20100101 Firefox/112.0';
const SAFARI_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15';
const EDGE_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.35';
const enableJavaScript = false;
const testName = 'ip';
const snapshot = require(`./${testName}.json`);
snapshot.dom = Buffer.from(snapshot.dom, 'base64').toString('utf8');
if (!enableJavaScript) {
    snapshot.dom = snapshot.dom.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, match => {
        if (match.includes(`id="__smartui_shadowdom_helper"`)) {
            return match;
        } else {
            return '';
        }
    });
}
if (!snapshot.dom.includes('<meta charset="UTF-8">')) {
    console.log("Adding <meta charset='UTF-8'> immediately after <head>");
    snapshot.dom = snapshot.dom.replace(
        /<head>/i, // Match the first <head> tag
        `<head>\n<meta charset="UTF-8">` // Add <meta charset="UTF-8"> right after it
    );
}
writeFileSync(`new_dom-smartui-utf.html`, snapshot.dom);
const freezeAnimations = () => {
    // Freeze all SVGs animated using animate and animateTransform tag
    // SVGs animated through CSS or JS will require custom solutions
    const allSVGs = document.getElementsByTagName('svg');
    let allSVGAnimations = [];
    for (let svg of allSVGs) {
        const svgAnimation = [...svg.getElementsByTagName('animate'), ...svg.getElementsByTagName('animateTransform')];
        allSVGAnimations = allSVGAnimations.concat(svgAnimation);
    }
    allSVGAnimations.forEach(animation => {
      const duration = animation.getAttribute('dur');
      animation.setAttribute('begin', '0s');
      animation.setAttribute('dur', '0s');
    });
}
function scrollToBottomAndBackToTop({
    frequency = 100,
    timing = 200,
    remoteWindow = window 
} = {}) {
    return new Promise(resolve => {
        let scrolls = 1;
        let scrollLength = remoteWindow.document.body.scrollHeight / frequency;
    
        (function scroll() {
            let scrollBy = scrollLength * scrolls;
            remoteWindow.setTimeout(() => {
                    remoteWindow.scrollTo(0, scrollBy);
            
                    if (scrolls < frequency) {
                        scrolls += 1;
                        scroll();
                    }
            
                    if (scrolls === frequency) {
                        remoteWindow.setTimeout(() => {
                            remoteWindow.scrollTo(0,0)
                            resolve();
                        }, timing);
                    }    
            }, timing);
        })();
    });
}
function scrollToBottom1({
    frequency = 100,
    timing = 50,
    remoteWindow = window
  } = {}) {
    let resolve;
    let scrolls = 1;
    let deferred = new Promise(r => (resolve = r));
    let totalScrolls = remoteWindow.document.body.scrollHeight / frequency;
  
    function scroll() {
      let scrollBy = totalScrolls * scrolls;
      remoteWindow.setTimeout(() => {
        remoteWindow.scrollTo(0, scrollBy);
  
        if (scrolls < frequency) {
          scrolls += 1;
          scroll();
        }
  
        // resolve the pending once we've finished scrolling the page
        if (scrolls === frequency) resolve(true);
      }, timing);
    }
  
    scroll();
  
    return deferred;
  }
(async () => {
    const browser = await webkit.launch({headless: false});
    let contextOptions = { viewport: { width: 1280, height: 1080 }};
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
        ...contextOptions
    });
    const page = await context.newPage();
    let pageGotoOptions = { timeout: 30000 }
    // const cachedResources = new Set();
    // page.on('request', async request => {
    //     const url = request.url();
    //     if (cachedResources.has(url)) {
    //         return;
    //     }
    //     cachedResources.add(url);
    // });
    await page.route('**/*', async (route, request) => {
        const url = request.url();
        let options = {
            headers: { ...await request.allHeaders() }
        }
        // headless is added to sec-ch-ua which can be a problem 
        // need to delete each separately because `--disable-features=UserAgentClientHint` launch argument doesn't seem to work
        delete options.headers['sec-ch-ua'];
        delete options.headers['sec-ch-ua-mobile'];
        delete options.headers['sec-ch-ua-platform'];
        
        if (url == snapshot.url) {
            // fulfill the request with serialized dom for root resource i.e snapshot url
            await route.fulfill({
                status: 200,
                headers: { 
                    'Content-Type': 'text/html; charset=UTF-8',
                },
                body: snapshot.dom,
            });
        } else if (url.includes('/static/media/') && 
            (url.endsWith('.ttf') || url.endsWith('.woff') || url.endsWith('.woff2'))) {
            if (resources[url]) {
                return route.fulfill({
                    status: 200,
                    body: Buffer.from(resources[url].body, 'base64')
                });
            }
            return route.abort();
        } else if (snapshot.resources[url]) {
            const cachedResource = snapshot.resources[url];
            // decode the Base64 encoded body to binary
            const bodyBuffer = Buffer.from(cachedResource.body, 'base64');
            console.log(`Handling request ${url}\n - response from cache`);
            // fulfill the request with the cached response
            await route.fulfill({
                status: 200,
                headers: { 'Content-Type': `${cachedResource.type}; charset=UTF-8` },
                body: bodyBuffer,
            });
        } else if (request.resourceType() === 'script' && !enableJavaScript) {
            await route.abort();
        } else if (request.resourceType() === 'media' && /\.(mp3|mp4|wav|ogg|webm)$/i.test(url)) {
            await route.abort();
        } else {
            await route.continue(options);
        }
    });
    let resources = []
    resources = snapshot.resources
    console.log(Object.keys(resources));
    console.log("first")
    if (1) {
        await page.goto(snapshot.url, pageGotoOptions);
    } else {
        await page.setContent(snapshot.dom, {waitUntil: "domcontentloaded"});
    }
    
    console.log(`Page loaded`)
    // await page.waitForTimeout(3000);
    await page.evaluate(scrollToBottomAndBackToTop);
    await page.evaluate(async (freezeAnimationsFnAsString) => {
        window.freezeAnimations = new Function('return' + freezeAnimationsFnAsString)();
    }, freezeAnimations.toString());
    // await page.waitForTimeout(3000);
    await page.evaluate(() => window.freezeAnimations());
    // Take screenshot
    await page.screenshot({path: `./ss/new_chrome-${testName}.png`, fullPage: true, timeout: 60000 });
    // await page.screenshot({path: `./ss/firefox2-${testName}.png`, fullPage: true});
    console.log(`SS taken`);
    await page.waitForTimeout(1000);
    await browser.close();
})();