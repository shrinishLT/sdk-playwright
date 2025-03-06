import { Builder, By, Key, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js'
import { webkit, chromium, firefox as playwrightFirefox } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import scrollToBottom from 'scroll-to-bottomjs';
import { request } from 'http';
import mime from 'mime-types';
import fetch from 'node-fetch';
// import { decode } from 'he';

const MAX_RESOURCE_SIZE = 5 * (1024 ** 2); // 5MB
const ALLOWED_RESOURCES = ['document', 'stylesheet', 'image', 'media', 'font', 'other', 'script', 'xhr'];
const ALLOWED_STATUSES = [200, 201];


async function makeDirectRequest(request) {
    let headers = { ...request.headers() };
    const username = 'lambdatest';
    const password = 'lambdatest';
    let token = Buffer.from(`${username}:${password}`).toString('base64');
    headers.Authorization = `Basic ${token}`;
  
    const response = await fetch(request.url(), { 
      method: request.method(),
      headers: headers,
    });
  
    return response.arrayBuffer();
}

function scrollToBottomAndBackToTop({
    frequency = 100,
    timing = 50,
    remoteWindow = window 
} = {}) {
	console.log("Started scrolltobottm")
    return new Promise(resolve => {
        let scrolls = 1;
        let scrollLength = remoteWindow.document.body.scrollHeight / frequency;

		console.log(`Total scroll height: ${remoteWindow.document.body.scrollHeight}`);
        console.log(`Scroll length per step: ${scrollLength}`);
    
        (function scroll() {
            let scrollBy = scrollLength * scrolls;

			console.log(`Scrolling to: ${scrollBy}`);

            remoteWindow.setTimeout(() => {
                    remoteWindow.scrollTo(0, scrollBy);
            
                    if (scrolls < frequency) {
                        scrolls += 1;
                        scroll();
                    }
            
                    if (scrolls === frequency) {
                        remoteWindow.setTimeout(() => {
							console.log('Scrolling back to top');
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
  
		// resolve the pending  once we've finished scrolling the page
		if (scrolls === frequency) resolve(true);
	  }, timing);
	}
  
	scroll();
  
	return deferred;
  }

async function smartuiSnapshot(driver, snapshotName) {
    try {
        // Execute the dom-serializer.js script in the browser context
        await driver.executeScript(readFileSync('dom-serializer.js', 'utf-8').toString());

        // Serialize the DOM and get the current URL
        let { dom, url } = await driver.executeScript(options => ({
            dom: SmartUIDOM.serialize(options),
            url: document.URL
        }), {});
		

        // Store the serialized DOM in a file
        writeFileSync(`${snapshotName}-dom-smartui.html`, dom.html);

        // Log the URL to the console
        console.log(`Snapshot captured from URL: ${url}`);

        return { dom, url }
    } catch (error) {
        throw new Error(error);
    }
}


(async function() {
	let driver;
	let browser;
	let context;
	let firefoxOptions = new firefox.Options();
	firefoxOptions.setPreference('network.proxy.type', 1);
    firefoxOptions.setPreference('network.proxy.http', '3.214.241.254');
    firefoxOptions.setPreference('network.proxy.http_port', 28687);
    firefoxOptions.setPreference('network.proxy.ssl', '3.214.241.254');
    firefoxOptions.setPreference('network.proxy.ssl_port', 28687);
	// firefoxOptions.headless();
	// firefoxOptions.setAcceptInse 
	// firefoxOptions.setPreference('security.enterprise_roots.enabled', true);
	// firefoxOptions.setPreference('security.insecure_field_warning.contextual.enabled', false);
	// firefoxOptions.setPreference('security.insecure_password.ui.enabled', false);

	try {
		// let snapshot = { url: 'https://www.3ds.com/insights/do-not-delete-panel-of-media', name: '3ds-do-not-delete-panel-of-media'};
		let snapshot = { url: 'https://www.momondo.de/about', name: 'momondo_about'};
		let allowedHostnames = [];
		let enableJavaScript = true;
		let clienabaleJavascript = true;
		let fullPage = true;
		

		driver = await new Builder()
			.forBrowser('firefox').build();

		await driver.manage().window().setRect({ width: 1280, height: 1080 });

		driver.get(snapshot.url),
		await new Promise(r => setTimeout(r, 20000));
		await driver.executeScript(scrollToBottom1);
		let { dom, url } = await smartuiSnapshot(driver, snapshot.name);
		snapshot.dom = dom;
		snapshot.url = url;

		console.log("Cookies")
		console.log(dom.cookies)

		browser = await chromium.launch({
			headless: false,
		});
		context = await browser.newContext({
			javaScriptEnabled: clienabaleJavascript
		});

		const url12 = new URL(snapshot.url);

		// Extract the domain (hostname)
		const domain12 = url12.hostname;

		console.log('Domain:', domain12);

		const cookieArray = dom.cookies.split('; ').map(cookie => {
			const [name, value] = cookie.split('=');
			return {
				name: name.trim(),
				value: value.trim(),
				domain: domain12, // Adjust this to the correct domain
				path: '/' // Common path for all cookies
			};
		});
		
		// Add the parsed cookies to Playwright's context
		await context.addCookies(cookieArray);

		await context.tracing.start({ screenshots: true, snapshots: true });
		const page = await context.newPage();
		page.on('console', msg => console.log(msg.text()));
		page.on('requestfailed', request => {
			console.log(`Failed request: ${request.url()} ${request.failure().errorText}`);
		});
		page.on('pageerror', error => {
			console.log(`Page error: ${error.message}`);
		});
		page.on('response', response => {
			if (!response.ok()) {
				console.log(`Request failed: ${response.url()}`);
			}
		});
	
		// Initialize an empty cache object
		const cache = {};
	
		// Use route to intercept network requests
		await page.route('**/*', async (route, request) => {
			const requestUrl = request.url();
			const snapshotHostname = new URL(snapshot.url).hostname;
			const requestHostname = new URL(requestUrl).hostname;
			let requestOptions = { timeout: 10000 }
		
			try {
				// abort audio/video media requests
				if (request.resourceType() === 'media' && /\.(mp3|mp4|wav|ogg|webm)$/i.test(request.url())) {
					throw new Error('resource type mp3/mp4/wav/ogg/webm');
				}
		
				// handle discovery config
				allowedHostnames.push(snapshotHostname);
				if (enableJavaScript) ALLOWED_RESOURCES.push('script');


				if (0) {
					console.log(`Adding basic authorization to the headers for root url`);
					let token = Buffer.from(`${"username"}:${"password"}`).toString('base64');
					requestOptions.headers = {
						...request.headers(),
						Authorization: `Basic ${token}`
					};
				}

				// get response
				let response, body;
				if (requestUrl === snapshot.url) {
					response = {
						status: () => 200,
						headers: () => ({ 'content-type': 'text/html' })
					}
					body = snapshot.dom.html;
				} else if (cache[requestUrl]) {
					response = {
						status: () => 200,
						headers: () => ({ 'content-type': `${cache[requestUrl].type}` })
					}
					body = cache[requestUrl].body;
				} else {
					response = await page.request.fetch(request, requestOptions);
					body = await response.body();
				}

				if (!body) {
					console.log(`Handling request ${requestUrl}\n - skipping no response`);
				} else if (!body.length) {
					console.log(`Handling request ${requestUrl}\n - skipping empty response`);
				} else if (requestUrl === snapshot.url) {
					console.log(`Handling request ${requestUrl}\n - skipping root resource`);
				} else if (!allowedHostnames.includes(requestHostname)) {
					console.log(`Handling request ${requestUrl}\n - skipping remote resource`);
				} else if (cache[requestUrl]) {
					console.log(`Handling request ${requestUrl}\n - skipping already cached resource`);
				} else if (body.length > MAX_RESOURCE_SIZE) {
					console.log(`Handling request ${requestUrl}\n - skipping resource larger than 5MB`);
				} else if (!ALLOWED_STATUSES.includes(response.status())) {
					console.log(`Handling request ${requestUrl}\n - skipping disallowed status [${response.status()}]`);
				} else if (!ALLOWED_RESOURCES.includes(request.resourceType())) {
					console.log(`Handling request ${requestUrl}\n - skipping disallowed resource type [${request.resourceType()}]`);
				} else {
					console.log(`Handling request ${requestUrl}\n - content-type ${response.headers()['content-type']}`);
					// const directBody = await makeDirectRequest(request);
					// body = directBody
					cache[requestUrl] = {
						body: body.toString('base64'),
						type: response.headers()['content-type']
					};
				}
				// Continue the request with the fetched response
				if (response.status() === 304) {
					console.log(`Handling redirect for ${requestUrl}`);
					await route.continue();
				} else {
					await route.fulfill({
						status: response.status(),
						headers: response.headers(),
						body: body,
					});
				}
			} catch (error) {
				console.log(`Handling request ${requestUrl} - aborted due to ${error}`);
				await route.abort();
			}
		});
		
		
		// Navigate to a page as an example
		
		await page.setViewportSize({ width: 1280, height: 1080 });
		await page.goto(snapshot.url, { waitUntil: "domcontentloaded"});
		await page.waitForTimeout(5000);


		// await page.evaluate(snapshot.dom);

		console.log(`Navigated to ${snapshot.url}`);
		if (fullPage && clienabaleJavascript) await page.evaluate(scrollToBottomAndBackToTop);

		// let l = await page.locator("body > div.paddedBody > div > div.css-h13m6j > div.css-19ig0ef").all()
        //     if (l.length === 0) {
        //         throw new Error(`for snapshot  viewport , no element found for selector body > div.paddedBody > div > div.css-h13m6j > div.css-19ig0ef`);
        //     } else if (l.length > 1) {
        //         throw new Error(`for snapshot  viewport , multiple elements found for selector body > div.paddedBody > div > div.css-h13m6j > div.css-19ig0ef`);
        //     } else if (l.length === 1) {
		// 		console.log("css selector found")
		// 	}
		
		await page.screenshot({path: 'ss/ss.png', fullPage: true});
		await new Promise(r => setTimeout(r, 1000));
        
		// add dom resources to cache
		if (snapshot.dom.resources.length) {
			for (let resource of snapshot.dom.resources) {
				cache[resource.url] = {
					body: resource.content,
					type: resource.mimetype
				}
			}	
		}
		
		// Use the cached responses as needed
		writeFileSync(`${snapshot.name}.json`, JSON.stringify({
			name: snapshot.name,
			url: snapshot.url,
			dom: Buffer.from(snapshot.dom.html).toString('base64'),
			resources: cache
		}));

		// const html = Buffer.from(Buffer.from(snapshot.dom.html, 'utf8').toString('base64'), 'base64').toString('utf8');
        writeFileSync(`${snapshot.name}-dom-smartui-utf8.html`, snapshot.dom.html,  'utf8');

	
	} catch (error) {
		console.log(error);
	} finally {
		// await context.tracing.stop({ path: 'trace.zip' });
		await browser?.close();
		await driver?.quit();
	}
})();