import {setTimeout} from "node:timers/promises";
import puppeteer from "puppeteer";
import scrapeRoute from "./scrape_route.js";
import { selectStation, selectDate, handleLanguagePopup, handleCookieConsentPopup } from './utils.js';

const scrapeSJ = async (departure, destination, departureDate, passengerType, passengerAge, departureTime, arrivalTime, runAgain) => {
    const url = 'https://www.sj.se/sok-resa';

    const browser = await puppeteer.launch({ 
        headless: false,
        //slowMo: 100 // Add a delay of 100ms between each action 
    });
    const page = await browser.newPage();

    console.log('Navigating to URL...');
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log('Page loaded.');

    await handleLanguagePopup(page);
    await handleCookieConsentPopup(page);
    await selectStation(page, '#fromLocation', departure);
    await selectStation(page, '#toLocation', destination);
    await selectDate(page, '#departureDate', departureDate);
    await selectTraveller(page);
    await selectPassengerType(page, passengerType);
    await setTimeout(1000);
    await inputAge(page, passengerAge);
    await clickSaveButton(page);
    await setTimeout(1000);
    await clickSearchButton(page);
    await setTimeout(1000);
    await waitForResults(page);
    await scrollToLoadAllResults(page);
    const newScrape = await scrapeScript(page, departureTime, arrivalTime);
    if (newScrape) {
        console.log('New scrape required. A trip with the specified times is sold out.');
        const newUrl = 'https://www.sj.se/en/traffic-information';
        const routeData = await scrapeRoute(newUrl, departureTime, browser, departure, destination, departureDate);
        console.log('Scraped route data:', routeData);
    } else {
        console.log('No new scrape required.');
    }

    await setTimeout(5000);

    await browser.close();

    return runAgain //? scrapeSJ(departure, destination, departureDate, passengerType, passengerAge, departureTime, arrivalTime, runAgain) : null;
};

/*const handleLanguagePopup = async (page) => {
    try {
        await page.waitForSelector('.MuiDialog-root', { visible: true, timeout: 10000 });
        // Click the button to select English
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const englishButton = buttons.find(button => button.textContent.includes('English'));
            if (englishButton) {
                englishButton.click();
            }
        });
        console.log('Clicked English language button');
    } catch (error) {
        console.log('Language selection popup not found or error:', error);
    }
};*/

/*const handleCookieConsentPopup = async (page) => {
    try {
        console.log('Checking for cookie consent popup...');
        await page.waitForSelector('.MuiDialog-root', { visible: true, timeout: 10000 });
        console.log('Cookie consent popup found');
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const acceptButton = buttons.find(button => button.textContent.includes('Accept all cookies'));
            if (acceptButton) {
                acceptButton.click();
            }
        });
        console.log('Clicked accept all cookies button');
    } catch (error) {
        console.log('Cookie consent popup not found or error:', error);
    }
};*/

/*const selectStation = async (page, selector, station) => {
    try {
    await page.click(selector);
    await page.type(selector, station);
    await page.waitForSelector('.MuiButtonBase-root.MuiMenuItem-root', { visible: true , timeout: 10000 });
    await page.click('.MuiButtonBase-root.MuiMenuItem-root');

    // Get the actual value of the selected station
    const actualStation = await page.evaluate((selector) => {
        return document.querySelector(selector).value;
      }, selector);
    return actualStation; 
    } catch (error) {
        console.log('Error selecting station:', error);
        return null;
    } 
};*/

/*const selectDate = async (page, selector, departureDate) => {
    try {
        await page.click(selector);
        await page.evaluate((selector) => {
            document.querySelector(selector).value = '';
        }, selector);
        await page.type(selector, departureDate); // Adjust the date format as needed
    } catch (error) {
        console.log('Error selecting departure date:', error);
    }
};*/

const selectTraveller = async (page) => {
    try{
        await page.click('button.MuiButtonBase-root.MuiCardActionArea-root.css-l15tdn');
    } catch (error) {
            console.log('Error selecting passenger type:', error);
    }
};

const selectPassengerType = async (page, type) => {
    try {
        await page.click('#select_passenger_type-select');
        await page.waitForSelector('li[data-value="'+ type +'"]', { visible: true, timeout: 10000 }); 
        await page.click('li[data-value="' + type +'"]');
    } catch (error) {
        console.log('Error selecting passenger type:', error);
    }
};

const inputAge = async (page, passengerAge) => {
    try {
        await page.click('#passenger\\.age');
        await page.type('#passenger\\.age', passengerAge); 
    } catch (error) {
        console.log('Error inputting age:', error);
    }
};

const clickSaveButton = async (page) => {
    try {
        await page.click('button.MuiButtonBase-root.css-125mqfp[data-testid="savePassenger"]');
    } catch (error) {
        console.log('Error clicking save button:', error);
    }
};

const clickSearchButton = async (page) => {
    try {
        await page.click('button.MuiButtonBase-root.css-125mqfp');
    } catch (error) {
        console.log('Error clicking search button:', error);
    }
};

const waitForResults = async (page) => {
    // Wait for results to load (with a longer timeout to handle slow loads)
    try {
        await page.waitForSelector('.MuiCard-root.Card-inactive', { visible: true, timeout: 60000});
    } catch (error) {
        console.log('Selector error:', error);
        await browser.close();
        return;
    }
};

const scrollToLoadAllResults = async (page) => {
    try {
        let previousHeight;
        while (true) {
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await setTimeout(2000); 
            const newHeight = await page.evaluate('document.body.scrollHeight');
            if (newHeight === previousHeight) {
                break;
            }
        }
    } catch (error) {
        console.log('Error scrolling to load all results:', error);
    }
};

const scrapeScript = async (page, depTime, arrTime) => {
    try {
        const { trips, newScrape } = await page.evaluate((depTime, arrTime) => {
            const tripElements = document.querySelectorAll('.MuiCard-root.Card-inactive');
            const tripData = [];
            let newScrape = false;
            
            tripElements.forEach(trip => {
                const departureTimeElement = trip.querySelector('h3 span:nth-child(1)');
                const arrivalTimeElement = trip.querySelector('h3 span:nth-child(2)');
                const priceElement = trip.querySelector('.MuiTypography-body1');
                const trainTypeElement = trip.querySelector('.MuiBox-root.css-13bjtlo img');
                const costElement = trip.querySelector('.MuiBox-root.css-1mqr07s span.MuiTypography-root.MuiTypography-h2.css-8l6mxd');
                const soldOutElement = trip.querySelector('h4.MuiTypography-root.MuiTypography-h4.css-rkvqhq');

                const departureTime = departureTimeElement ? departureTimeElement.textContent : null;
                const arrivalTime = arrivalTimeElement ? arrivalTimeElement.textContent : null;
                const price = priceElement ? priceElement.textContent : null;
                const trainType = trainTypeElement ? trainTypeElement.alt : null;
                const cost = costElement ? costElement.textContent : null;
                const soldOut = soldOutElement ? soldOutElement.textContent.includes('Sold out') : false;

                if (departureTime?.trim == depTime?.trim && arrivalTime == arrTime && soldOut == true) {
                    newScrape = true;
                }

                tripData.push({ departureTime, arrivalTime, cost, price, trainType, soldOut, newScrape });
            });
            
            return { trips: tripData, newScrape };
        }, depTime, arrTime);
        
        console.log('Trips:', trips, newScrape); 
        return newScrape;
    } catch (error) {
        console.log('Error scraping trip data:', error);
    }
};




const departure = 'Stockholm Central';
const destination = 'Hässleholm Central';
const departureDate = '2024-12-04';
const passengerType = 'STUDENT'; // ALL CAPS
const passengerAge = '25';
const departureTime = '16:15';
const arrivalTime = '20:10';
const runAgain = false;


scrapeSJ(
    departure,
    destination,
    departureDate,
    passengerType,
    passengerAge,
    departureTime,
    arrivalTime,
    runAgain
);