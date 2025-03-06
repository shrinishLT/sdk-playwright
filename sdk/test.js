const { Builder } = require('selenium-webdriver');
const {smartuiSnapshot} = require('@lambdatest/selenium-driver');
const chrome = require('selenium-webdriver/chrome');


const baseUrls = [
    // // { url: "https://www.amazon.de", name: "amazon" },
    // // { url: "https://www.autodesk.com/in", name: "autodesk" },
    // { url: "https://ipinfo.io/", name: "ipinfo" },
    { url: "https://lambdatest.com", name: "lambdatest-home"},
    // // { url: "https://www.microsoft.com/nb-no/", name: "microsoft" },
    { url: "https://www.oracle.com/in/", name: "oracle" },
    // // // { url: "https://www.salesforce.com/in/", name: "salesforce" },
    // // // { url: "https://www.vmware.com/in.html", name: "vmware" },
    { url: "https://www.whatsapp.com/?lang=it", name: "whatsapp"},
    { url: "https://www.uber.com/de/en/", name: "uber"},
    { url: "https://www.netflix.com/in-hi/", name: "netflix"},
    { url: "https://www.airbnb.co.in/", name: "airbnb"},
    // { url: "https://www.tripadvisor.ca/", name: "tripadvisor"},
    { url: "https://www.mercedes-benz.de/", name: "mercedes"},
    { url: "https://www.mcdonalds.com/us/en-us.html", name: "mcdonalds"},
    // // { url: "https://www.lacoste.com/de/",name: 'lacoste'},
    // { url: "https://hillcrest.oxfordgiftcardplus.ca/", name: 'hillcrest'},
];
  
  const compUrls = [
    // { url: "https://www.amazon.in/", name: "amazon" },
    // { url: "https://www.autodesk.com/fr", name: "autodesk"},
    // { url: "https://ipinfo.io/", name: "ipinfo" },
    { url: "https://lambdatest.com", name: "lambdatest-home"},
    // { url: "https://www.microsoft.com/ro-ro/", name: "microsoft" },
    { url: "https://www.oracle.com/mx/", name: "oracle" },
    // { url: "https://www.salesforce.com/fr/", name: "salesforce" },
    // { url: "https://www.vmware.com/fr.html", name: "vmware" },
    { url: "https://www.whatsapp.com/?lang=en", name: "whatsapp"},
    { url: "https://www.uber.com/de/de/", name: "uber"},
    { url: "https://www.netflix.com/in/", name: "netflix"},
    { url: "https://www.airbnb.co.uk/", name: "airbnb"},
    // { url: "https://www.tripadvisor.be/", name: "tripadvisor"},
    { url: "https://www.mercedes-benz.co.in/", name: "mercedes"},
    { url: "https://www.mcdonalds.com/us/es-us.html", name: "mcdonalds"},
    // { url: "https://www.lacoste.com/in/",name: 'lacoste'},
    // { url: "https://www.apple.com/it/", name: "apple"},
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
  
(async function example() {
    const chromeOptions = new chrome.Options();
    chromeOptions.addArguments("--headless"); 
    let driver = await new Builder().forBrowser("chrome").setChromeOptions(chromeOptions).build();
  
    try {
      const options = {
        ignoreType : ['layout']
      }

      for ( const { url, name } of compUrls ){
        await driver.get(url);
        await driver.executeScript(scrollToBottomAndBackToTop);
        await smartuiSnapshot(driver, name,options);
      }
      
    } finally {
      await driver.quit();
    }
})();