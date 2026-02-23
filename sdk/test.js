const { Builder } = require('selenium-webdriver');
const {smartuiSnapshot} = require('@lambdatest/selenium-driver');
const chrome = require('selenium-webdriver/chrome');


const baseUrls = [
    // { url: "https://www.amazon.de", name: "amazon" },
    // { url: "https://www.autodesk.com/in", name: "autodesk" },
    // { url: "https://ipinfo.io/", name: "ipinfo" },
    // { url: "https://lambdatest.com", name: "lambdatest-home"},
    { url: "https://ltqa-frontend.lambdatestinternal.com/layout1", name: "ltqa-1"},
    { url: "https://ltqa-frontend.lambdatestinternal.com/layout2", name: "ltqa-2"},
    { url: "https://ltqa-frontend.lambdatestinternal.com/layout3", name: "ltqa-3"},
    // { url: "https://www.microsoft.com/nb-no/", name: "microsoft" },
    { url: "https://www.oracle.com/in/", name: "oracle" },
    // // // { url: "https://www.salesforce.com/in/", name: "salesforce" },
    // // // { url: "https://www.vmware.com/in.html", name: "vmware" },
    { url: "https://www.whatsapp.com/?lang=it", name: "whatsapp"},
    { url: "https://www.uber.com/de/en/", name: "uber"},
    { url: "https://www.netflix.com/in-hi/", name: "netflix"},
    { url: "https://www.airbnb.co.in/", name: "airbnb"},
    // // { url: "https://www.tripadvisor.ca/", name: "tripadvisor"},
    // // { url: "https://www.mercedes-benz.de/", name: "mercedes"},
    { url: "https://www.mcdonalds.com/us/en-us.html", name: "mcdonalds"},
    // // { url: "https://www.lacoste.com/de/",name: 'lacoste'},
    { url: "https://www.apple.com/de/", name: 'apple'},
    // {url : "https://www.twitch.tv/", name : "twitch"},
];
  
  const compUrls = [
    // { url: "https://www.amazon.in/", name: "amazon" },
    // { url: "https://www.autodesk.com/fr", name: "autodesk"},
    // { url: "https://ipinfo.io/", name: "ipinfo" },
    // { url: "https://ltqa-frontend.lambdatestinternal.com/layout3", name: "lambdatest-home-2"},
    // { url: "https://ltqa-frontend.lambdatestinternal.com/dynamic-colour-testing", name: "ltqa-1"},
    // { url: "https://ltqa-frontend.lambdatestinternal.com/layout3", name: "ltqa-2"},
    // { url: "https://ltqa-frontend.lambdatestinternal.com/layout1", name: "ltqa-3"},
    // // // { url: "https://www.microsoft.com/ro-ro/", name: "microsoft" },
    { url: "https://www.oracle.com/mx/", name: "ltqa-1" },
    // // // { url: "https://www.salesforce.com/fr/", name: "salesforce" },
    // // // { url: "https://www.vmware.com/fr.html", name: "vmware" },
    // { url: "https://www.whatsapp.com/?lang=en", name: ""},
    // { url: "https://www.uber.com/de/de/", name: "uber"},
    // { url: "https://www.netflix.com/in/", name: "netflix"},
    // { url: "https://www.airbnb.co.uk/", name: "airbnb"},
    // // // { url: "https://www.tripadvisor.be/", name: "tripadvisor"},
    // // // { url: "https://www.mercedes-benz.co.in/", name: "mercedes"},
    // { url: "https://www.mcdonalds.com/us/es-us.html", name: "mcdonalds"},
    // // // { url: "https://www.lacoste.com/in/",name: 'lacoste'},
    // { url: "https://www.apple.com/it/", name: "apple" },
    //  {url : "https://www.twitch.tv/directory/all/tags/France?lang=fr", name : "twitch"},
    // {url : "https://www.epicurious.com/", name : "condenast"},
];

function scrollToBottomAndBackToTop({
  frequency = 100,
  timing = 8,
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
                      remoteWindow.scrollTo(0, 0)
                      resolve();
                  }, timing);
              }
          }, timing);
      })();
  });
}

async function slowFullPageScroll(driver, { stepSize = 100, delay = 200 } = {}) {
    try {
        // Log start of scroll
        console.log("Starting slow full-page scroll...");

        // Get total scroll height using JavaScript executor
        const scrollHeight = await driver.executeScript('return document.body.scrollHeight');
        console.log(`Total scroll height: ${scrollHeight}`);
        console.log(`Step size: ${stepSize}`);

        // Current scroll position
        let currentPosition = 0;

        // Scroll incrementally
        while (currentPosition < scrollHeight) {
            // Scroll by step size
            await driver.executeScript(`window.scrollBy(0, ${stepSize})`);

            // Update current position
            currentPosition += stepSize;
            console.log(`Scrolled to: ${currentPosition}`);

            // Wait between scroll steps
            await driver.sleep(delay);
        }

        console.log("Reached the bottom of the page.");
    } catch (error) {
        console.error("Error during slow scroll:", error);
    }
}

  
(async function example() {
    const chromeOptions = new chrome.Options();
    chromeOptions.addArguments("--headless"); 
    let driver = await new Builder().forBrowser("chrome").setChromeOptions(chromeOptions).build();

  
    try {
      const options = {
        ignoreType : ['layout'],
        // loadDomContent : true,
        // customCSS: './snapshot.css',
        // ignoreDOM: {
        //   id: ['api-requests']
        // }
      }


      let mobile_dom_options =
        {
          "mobile": {
                "devices": [
                    "iPhone 14",
                ],
                "fullPage": true,
                "orientation": "portrait"
            },
          ignoreDOM: {
                class: ["nextAvailDate"],
          },
          ignoreType : ['layout']
        };

        let web_dom_options =
        {
            "web": {
                "browsers": [
                    "chrome",
                ],
                "viewports": [[1920]],
            },
            ignoreType : ['layout']
        };


      console.log(compUrls.length);
      let i = 0;
      const customCSSOptions = {
        customCSS: 'NewDeviceConfig.json'
      }

      const renderErrors = {
        ignoreType : ['layout']
      }
      for ( const { url, name } of compUrls ){
        await driver.get(url);
        // const sleep = ms => new Promise(r => setTimeout(r, ms));
        // await sleep(2000);
        // console.log(`Taking snapshot of ${name}`);
        // await slowFullPageScroll(driver);
        // await driver.executeScript(slowFullPageScroll(driver));
        if (i % 2 === 0) {
            await smartuiSnapshot(driver, name);
        }
        else {
          console.log('reaches')
          await smartuiSnapshot(driver, name, renderErrors);
        }
        // await smartuiSnapshot(driver, name, renderErrors);
        // driver.sleep(10000);
        i++;
      }

      // console.log('Driver started');
      // await driver.get("https://www.3rdcoastsightcast.com/texas-fishing-charter-rates");
      // await driver.executeScript(scrollToBottomAndBackToTop);
      // await smartuiSnapshot(driver, "3rdcoastsightcast",layout);

      // // await driver.get("https://www.3rdcoastsightcast.com/texas-fishing-charter-rates");
      // // await driver.navigate().refresh();
      // // await driver.executeScript(scrollToBottomAndBackToTop);
      // // await driver.manage().window().setSize(1920, 1024);
      // // await smartuiSnapshot(driver, "3rdcoastsightcast", web_dom_options);
        
      // await driver.manage().window().setSize(380, 3080);
      // await driver.navigate().refresh();
      // await driver.get("https://www.3rdcoastsightcast.com/texas-fishing-charter-rates");
      // await driver.executeScript(scrollToBottomAndBackToTop);
      // await smartuiSnapshot(driver, "3rdcoastsightcast", mobile_dom_options);

      // const options = {
      //   loadDomContent : true
      // }
      
    //   await driver.get("http://localhost:8000/");
    //   await slowFullPageScroll(driver, {
    //     stepSize: 100,  // Pixels to scroll each steps
    //     delay: 200      // Milliseconds between steps
    // });
    //   await smartuiSnapshot(driver, "iframe-video",options);

    //   let options = {
        // ignoreDOM: {
        //   cssSelector: [".wrapper section:nth-child(1)"],
        // }
    //     ignoreDOM: {
    //       cssSelector: ['api-requests'],
    //     }
    // }

    // await driver.get("https://ipinfo.io/");
    // await new Promise(r => setTimeout(r, 900));
    // await driver.executeScript(scrollToBottomAndBackToTop);
    // await smartuiSnapshot(driver, "lambdatest", options);


      
    } finally {
      await driver.quit();
    }
})();

