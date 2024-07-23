const fs = require('fs/promises');
async function generatePageLinks(url){

    const pageLinks = [];
    for (let index = 1; index < 3; index++) {
        pageLinks.push(
            `${url}/${index}/`
        );
    }

    return pageLinks;
}

async function sleep (ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

const scraperObject = {

    async wazeTest(browser){
		let page = await browser.newPage();
		console.log(`Navigating to waze...`);
		await page.goto(
            //myurl,
            'https://www.waze.com/live-map/directions/za/gp/sandton/3-sandown-valley-cres?to=place.ChIJFwbxDTFzlR4R9AE1Eta1Ouw&from=place.ChIJV7TE3QJzlR4RaExsdv6Ydxk',
            {
                timeout: 60000, waitUntil: 'domcontentloaded'

            }
        );

        // Wait for the required DOM to be rendered
        //await page.waitForSelector('.wm-map__leaflet', {timeout:0});

        console.log(`Pause for 10seconds.`);

        await sleep(15000);

        console.log(`Closing Download Banners..`);
        await page.click('.wz-downloadbar__close-button');

        await sleep(1000);
        console.log(`Close Walthrough 1..`);
        await page.click('.waze-tour-tooltip__acknowledge');

        await sleep(1000);
        console.log(`Close Walthrough 2..`);
        await page.click('.waze-tour-tooltip__acknowledge');

        await sleep(1000);
        console.log(`Get all Alert Divs..`);


        const classList = await page.evaluate(() => {
            let mapData = [];

            const content = Array.from(document.querySelectorAll('.leaflet-marker-icon')).map(content => {

                return content.classList;
             } );

             for (let index = 0; index < content.length; index++) {

                 mapData.push({Name: content[index].item(2)})
                
             }


            return mapData;
          });
          

          const saveData = (classList) => {
            const finished = (error) => {
                if(error){
                    console.log(error);
                    return;
                }
            }
            const jsonData = JSON.stringify(classList,null,2);
            fs.writeFile('output.json', jsonData, finished);
          }

          saveData(classList);
        // const classes = await page.$eval( wm-jam__level
        //     'div.wm-alert-icon.leaflet-interactive', 
        //     el => [...el.classList]
        //     //el => { return el.map(content => content.classList);}
        // );

        // const data = await page.evaluate(() => {
        //     return document.querySelectorAll('.wm-marker-label__text').value;
        // })
        // console.log(data);

         const classes = await page.$eval( 
            '.leaflet-marker-icon', 
            el => [...el.classList]
            //el => { return el.map(content => content.classList);}
        );


        /** /
        const columnData = await page.$$eval('div.wm-alert-icon.leaflet-interactive', columns => {

            //console.log('ALERTS:', columns);
            
            return columns.map(content => content.get);

            //return columns;
            
        });
        /**/

        return classes;

    },
	async scraper(browser, myurl){
		let page = await browser.newPage();
		console.log(`Navigating to ${myurl}...`);
		await page.goto(myurl, {timeout: 60000, waitUntil: 'domcontentloaded'});
        
        /** WORKS -/
        // Wait for the required DOM to be rendered        
        await page.waitForSelector('.table-bordered');
        console.log('Table Ready');

        const columnData = await page.$$eval('.table-bordered tbody td[scope="col"]', columns => {
            
            return columns.map(content => content.textContent);
            
        });
        
        const final = [];
        const chunkSize = 6;
        for (let i = 0; i < columnData.length; i += chunkSize) {

            const chunk = columnData.slice(i, i + chunkSize);

            const mappedChunk = {};
            for (let indexChunk = 0; indexChunk < chunk.length; indexChunk++) {
                const element = chunk[indexChunk];
                switch (indexChunk) {
                    case 0:
                        mappedChunk['ID'] = element;
                        break;
                    case 1:
                        mappedChunk['Name'] = element;
                        break;
                    case 2:
                        mappedChunk['Country'] = element;
                        break;
                    case 3:
                        mappedChunk['Latitude'] = element;
                        break;
                    case 4:
                        mappedChunk['Longitude'] = element;
                        break;
                    default:
                        //continue;
                        break;
                }
            }

            final.push(mappedChunk);
            // do whatever
        }

        return final;
        /* END WORKS */

        let scrapedData = [];

        async function scrapeCurrentPage(){
            // Wait for the required DOM to be rendered
            await page.waitForSelector('.table-bordered');

            /*
            let paginationLinks = await page.$$eval('.pagination .page-item:not(:first-child):not(:last-child):not(.active)', links => {
				// Make sure the link to be scraped is a page
				//links = links.filter(link => link.querySelector('.instock.availability > i').textContent !== "In stock")
				// Extract the links from the data
				links = links.map(el => el.querySelector('a.page-link').href)
				return links;
			});
            /**/

            let paginationLinks = await generatePageLinks(myurl);

            console.log(`NO. OF PAGE LINKS FOR SCRAPING: ${paginationLinks.length}...`);

            // Loop through each of those links, open a new page instance and get the relevant data from them
			let pagePromise = (link) => new Promise(async(resolve, reject) => {
				let newPage = await browser.newPage();

                console.log(`[SCRAPING]... ${link}`);

                await newPage.goto(link, {timeout: 60000, waitUntil: 'domcontentloaded'});

                await newPage.waitForSelector('.table-bordered');

				const columnData = await newPage.$$eval('.table-bordered tbody td[scope="col"]', columns => {
            
                    return columns.map(content => content.textContent);
                    
                });

				resolve(columnData);
				await newPage.close();
			});

            for(link in paginationLinks){
				let currentPageData = await pagePromise(paginationLinks[link]);
				scrapedData.push(currentPageData);
			}

            // When all the data on this page is done, click the next button and start the scraping of the next page
			// You are going to check if this button exist first, so you know if there really is a next page.
            /** /
			let nextButtonExist = false;
			try{
				const nextButton = await page.$eval('.pagination .page-item:last-child', a => a.textContent);
				nextButtonExist = true;
			}
			catch(err){
				nextButtonExist = false;
			}
			if(nextButtonExist){
				await page.click('.next > a');	
				return scrapeCurrentPage(); // Call this function recursively
			}
            /**/

			await page.close();
			return scrapedData.flat();
        }

        let columnData = await scrapeCurrentPage();

        const final = [];
        const chunkSize = 6;
        for (let i = 0; i < columnData.length; i += chunkSize) {

            const chunk = columnData.slice(i, i + chunkSize);

            const mappedChunk = {};
            for (let indexChunk = 0; indexChunk < chunk.length; indexChunk++) {
                const element = chunk[indexChunk];
                switch (indexChunk) {
                    case 0:
                        mappedChunk['ID'] = element;
                        break;
                    case 1:
                        mappedChunk['Name'] = element;
                        break;
                    case 2:
                        mappedChunk['Country'] = element;
                        break;
                    case 3:
                        mappedChunk['Latitude'] = element;
                        break;
                    case 4:
                        mappedChunk['Longitude'] = element;
                        break;
                    default:
                        //continue;
                        break;
                }
            }

            final.push(mappedChunk);
            // do whatever
        }

        return final;

        //browser.close();
		
	}
}

module.exports = scraperObject;