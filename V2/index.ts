import puppeteer from 'puppeteer';
import { PushToS3Bucket } from "@/common/utils/utils.s3";
import moment from "moment-timezone";
import Utils from "@/common/utils/utils.helper";
import { env } from '@/common/utils/envConfig';
import { logger } from '@/server';
import { getCoordinates } from '../geolocation/utils';
import { reverseGeocoding } from '../nominatim';
import axios from 'axios';
const { LOCALE, NODE_ENV } = env;

const UtilsHelper = new Utils();
/**
 * 
 * @returns WAZE Incidents
 * 
 */
export const getIncidents = async (lat:number, lng:number, zoom:number, sizeX:number, sizeY:number, retries = 0, maxRetries = 3):Promise<any> => {

	const s3Path = `incident/json/${LOCALE}`;

	return new Promise(async (resolve, reject) => {

		let browser;

		if( NODE_ENV === 'development' ) {
			// Launch the browser and open a new blank page
			browser = await puppeteer.launch({
				headless: true,
				args: ["--disable-setuid-sandbox", "--no-sandbox"], 
				ignoreHTTPSErrors: true,
				defaultViewport: null
			});

		} else {
			browser = await puppeteer.launch({
				headless: true,
				//executablePath: '/usr/bin/chromium-browser',
				executablePath: '/usr/bin/google-chrome',
				args: ["--disable-setuid-sandbox", "--no-sandbox"],
				ignoreHTTPSErrors: true,
				defaultViewport: null 
			});
		}

		try {

			// CITY GEOCODE
			const cityResults = await reverseGeocoding(lat, lng) as any;

			const page = await browser.newPage();

			await page.goto(
				//myurl,
				//'https://www.waze.com/live-map/directions/za/gp/sandton/3-sandown-valley-cres?to=place.ChIJFwbxDTFzlR4R9AE1Eta1Ouw&from=place.ChIJV7TE3QJzlR4RaExsdv6Ydxk',
				`https://embed.waze.com/iframe?zoom=${zoom}&lat=${lat}&lon=${lng}&pin=1&desc=1`,
				{
					timeout: 60000,
					waitUntil: 'domcontentloaded'
				}
			);

			page.setViewport({
				'width': sizeX,
				'height': sizeY
			});

			// Wait for the required DOM to be rendered
			await page.waitForSelector('.leaflet-pane.leaflet-marker-pane', {timeout:0});
			await Utils.sleep(10000);

			const classListFunc = await page.evaluate(() => {
				let mapData = [];

				// ATTEMPT: OPTMISATION
				/** /
				const content = Array.from(document.querySelectorAll('.leaflet-marker-pane .leaflet-marker-icon')).map(content => {
	
					return {
						classes: content.classList,
						contentPosition: content,
						contentText: content.textContent
					}
				} );

				console.log('CONTENT DATA:', content);

				for (let index = 0; index < content.length; index++) {
	
					mapData.push({
						id: index ,
						name: content[index].classes.item(2),
						//@ts-ignore
						icon_id_on_waze: content[index].contentPosition[index]._leaflet_id,
						translate3d: {
							//@ts-ignore
							tx: content[index].contentPosition[index]._leaflet_pos.x,
							//@ts-ignore
							ty: content[index].contentPosition[index]._leaflet_pos.y,
							tz: 0
						},
						text: content[index].contentText
						//@ts-ignore
						//background: Array.from(document.querySelectorAll(content[index].item(2))).map(bg => {return bg}),
					});
					
				}
				/**/
				
				/**/
				const content = Array.from(document.querySelectorAll('.leaflet-marker-pane .leaflet-marker-icon')).map(content => {
	
					return content.classList;
				} );
				
				const contentPosition = Array.from(document.querySelectorAll('.leaflet-marker-pane .leaflet-marker-icon')).map(content => {
	
					return content;
				} );
	
				const contentText = Array.from(document.querySelectorAll('.leaflet-marker-pane .leaflet-marker-icon')).map(content => {
	
					return content.textContent;
				} );
				/**/

				//logger.info('CONTENT', content);

				/** /
				console.log('CONTENT DATA:', {
					'content': content,
					'contentPosition': contentPosition
				});
				/**/
	
				for (let index = 0; index < content.length; index++) {
	
					mapData.push({
						id: index ,
						name: content[index].item(2),
						//@ts-ignore
						icon_id_on_waze: contentPosition[index]._leaflet_id,
						translate3d: {
							//@ts-ignore
							tx: contentPosition[index]._leaflet_pos.x,
							//@ts-ignore
							ty: contentPosition[index]._leaflet_pos.y,
							tz: 0
						},
						//text: contentText[index]
						//@ts-ignore
						//background: Array.from(document.querySelectorAll(content[index].item(2))).map(bg => {return bg}),
					});
					
				}

				return mapData;
			});

			const alertResultsOnly = classListFunc.filter((x:any)=>x.name.startsWith('wm-alert-icon'));
			if (!alertResultsOnly) {
				reject('No Incidents Found.');
			}

			const parsedResponse = alertResultsOnly.map((model:any)=> {
				return {
					...model,
					latLng: getCoordinates(
						lat,
						lng,
						zoom,
						sizeX,
						sizeY,
						model.translate3d.tx,
						model.translate3d.ty
					)
				}
			});

			const format1 = "YYYY-MM-DD";
			const format2 = "HH";
			const dateTime = new Date();
			//@ts-ignore
			const dateLabelDay = moment(dateTime).tz(process.env.TIMEZONE).format(format1);
			//@ts-ignore
			const dateLabelHour = moment(dateTime).tz(process.env.TIMEZONE).format(format2);
			
			await PushToS3Bucket(
				`${s3Path}/${UtilsHelper.noSpecialCharactersandSpace(cityResults.address.state.toLowerCase())}/suburb-${UtilsHelper.noSpecialCharactersandSpace(cityResults.address.suburb.toLowerCase())}/${dateLabelDay.trim()}/${dateLabelHour.trim()}`,
				`incident`,
				parsedResponse
			);

			logger.info(`SUBURB INCIDENTS RECEIVED & UPLOADED TO S3.`);

			resolve(parsedResponse);

			await browser.close();
	

		} catch (error) {
			// Handle network errors or unknown errors
			logger.warn(`Error occured retries remaining ${maxRetries}`);

			if (retries < maxRetries - 1) {
				// Attempt retry with a different URL from the list
				retries++;
				resolve(await getIncidents(lat, lng, zoom, retries, maxRetries));
			} else {
				reject(error); // All retries exhausted, reject the promise
			}

		} finally {
			await browser.close(); // Ensure browser is always closed
		}
	});

};

export const getIncidentsFromCache = async (lat:number, lng:number, zoom:number, sizeX:number, sizeY:number, retries = 0, maxRetries = 3):Promise<any> => {

	const s3Path = `incident/json/${LOCALE}`;

	return new Promise(async (resolve, reject) => {

		try {

			// CITY GEOCODE
			const cityResults = await reverseGeocoding(lat, lng) as any;

			const format1 = "YYYY-MM-DD";
			const format2 = "HH";
			const dateTime = new Date();
			//@ts-ignore
			const dateLabelDay = moment(dateTime).tz(process.env.TIMEZONE).format(format1);
			//@ts-ignore
			const dateLabelHour = moment(dateTime).tz(process.env.TIMEZONE).format(format2);

			axios
				.get(
					`${process.env.cdnDataUrl}/incident/json/${LOCALE}/${UtilsHelper.noSpecialCharactersandSpace(cityResults.address.state.toLowerCase())}/suburb-${UtilsHelper.noSpecialCharactersandSpace(cityResults.address.suburb.toLowerCase())}//${dateLabelDay.trim()}/${dateLabelHour.trim()}/incident.json`
				)
				.then( async (response:any)=>{

					logger.info(`SUBURB INCIDENTS RECEIVED FROM S3.`);

					resolve(response.data);

				})
				.catch((e)=>{

					logger.error(`SUBURB INCIDENTS ERROR [CACHE].`);

					reject(e);

				});
	

		} catch (error) {
			// Handle network errors or unknown errors
			logger.warn(`Error occured getting cached incidents.`);

			reject(error);
			//resolve(await getIncidents(lat, lng, zoom, retries, maxRetries));

		}
	});

};