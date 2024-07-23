// https://www.digitalocean.com/community/tutorials/how-to-scrape-a-website-using-node-js-and-puppeteer#step-2-mdash-setting-up-the-browser-instance

const puppeteer = require('puppeteer');


const browserObject = require('./browser');
const scraperController = require('./pageController');

//Start the browser and create a browser instance
let browserInstance = browserObject.startBrowser();

// Pass the browser instance to the scraper controller
scraperController(browserInstance, 'https://geokeo.com/database/state/za');

// https://geokeo.com/database/suburb/za
// maximum pagess 526


// https://geokeo.com/database/town/za
// maximum: 80

// https://geokeo.com/database/city/za
// maximum: 4

// https://geokeo.com/database/state/za/
// maximum: 2
