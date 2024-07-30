const pageScraper = require('./pageScraper');
const fs = require('fs');
const path = require('path');
const {mkdir,writeFile, appendFile} = require("fs/promises");

async function scrapeAll(browserInstance, url){
	let browser;
	try{
		browser = await browserInstance;

        const results2 = await pageScraper.wazeTest(browser);

        console.log('JSON ITEMS:', results2);

        //browser.close();

        return;

		const results = await pageScraper.scraper(browser, url);

        console.log('JSON ITEMS:', results.length);
        console.log('EXAMPLE ITEM FIRST:', results[0]);
        console.log('EXAMPLE ITEM LAST:', results[results.length-1]);

        if (!fs.existsSync("data")) await mkdir("data"); //Optional if you already have downloads directory
        const destination = path.resolve("./data", 'states_za.json');

        // WRITE EACH OBJ TO A JSON FILE
        await appendFile( destination, '[', 'utf8' );
        for (let index = 0; index < results.length; index++) {
            const element = results[index];

            await appendFile( destination, JSON.stringify(element), 'utf8' );

            if( results[index + 1] !== undefined ) {
                await appendFile( destination, ',', 'utf8' );
            } else {
                await appendFile( destination, ']', 'utf8' );
            }
        }

        browser.close();

        //await appendFile( destination, JSON.stringify(results), 'utf8' );

        /** /
        fs.writeFile("data/suburbs_za_page1.json", JSON.stringify(results), 'utf8', function(err) {
		    if(err) {
		        return console.log(err);
		    }
		    console.log("The data has been scraped and saved successfully! View it at './data/suburbs_za_page1.json'");
		});
        /**/
		
	}
	catch(err){
		console.log("Could not resolve the browser instance => ", err);
	}
}

module.exports = (browserInstance, url) => scrapeAll(browserInstance, url)