import {setTimeout} from "node:timers/promises";
import puppeteer from "puppeteer";
import select from "puppeteer-select";
import scrapeStops from "./scrape_stops.js";
import { selectStation, selectDate, handleUnexpectedPopups } from './utils.js';

const departure = 'Stockholm Central';
const destination = 'Hässleholm Central';
const departureDate = '2024-12-20';
const departureTime = '11:24';
const url = 'https://www.sj.se/en/search-journey';

let currDestination = destination;
let currDeparture = departure;
let currDepartureTime = departureTime;

let soldOut = false;
let changedDestination = false;
let changedDeparture = true;
let firstTimeDate = true;

let routeData = [];
let trips = [];

const scrapeSJ = async () => {
    
    const browser = await puppeteer.launch({ 
        headless: false,
        //slowMo: 100 // Add a delay of 100ms between each action 
    });

    console.log('Start scraping SJ');

    // Fetch the stops for the trip
    routeData = await scrapeStops(browser, departure, destination, departureDate, departureTime);

    // New page for searching
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    await setTimeout(1000);

    handleUnexpectedPopups(page);

    // Make an initial search
    await makeNewSearch(page);

    // Are there stops for the initial trip?
    if (routeData.length === 0) {
        if (soldOut) {
            console.log('The trip has no substations and is fully booked');
        } else {
            console.log('The inputted trip does have available seats');
        }
        await browser.close();
        return;
    } else {
        if (!soldOut) {
            console.log('The inputted trip does have available seats');
            await browser.close();
            return;
        } else {
            await newProcessData(page, routeData);
        }
    }

    if (trips.length === 0) {
        console.log('No trips available.');
    } else {
        console.log('Trips available:', trips);
    }

    await browser.close();
};

const newProcessData = async (page, route) => {
    try{
        if (route.length === 0) {
            return;
        } else {
            for (let i = 0; i < route.length; i++) {
                // If the currDestination was changed because a trip was found, then we should not change it again
                if (!changedDestination) {
                    currDestination = route[route.length - (i + 1)].name;
                } else {
                    i = i - 1;
                }
                if (currDeparture === currDestination) {
                    return;
                }
                await makeNewSearch(page);
                if (soldOut) {
                    changedDestination = false;
                    changedDeparture = false;
                    continue;
                } else {
                    // Trip found
                    console.log('There is a trip available from ' + currDeparture + ' to ' + currDestination + ' with departure time ' + currDepartureTime);
                    trips.push([currDeparture, currDestination, currDepartureTime]);

                    if (currDestination !== destination) {
                        currDeparture = currDestination;
                        currDestination = destination;
                        changedDestination = true;
                        changedDeparture = true;
                        console.log('currDestination:', currDestination);
                        currDepartureTime = route[route.length - (i + 1)].departure;

                        // Find the index of the current destination in the route array
                        const currentIndex = route.findIndex(station => station.name === currDeparture);

                        // Slice the route array from the current index + 1
                        const remainingRoute = route.slice(currentIndex + 1);
                        console.log('Remaining route:', remainingRoute);
                        await newProcessData(page, remainingRoute);
                    }
                    break;
                }
            }
        }
    } catch (error) {
        console.log('Error in process Data:', error);
    }
};

// Make a new search with the new departure and destination
const makeNewSearch = async (page) => {
    try{
        console.log('Making new search...');
        await setTimeout(1000);
        // Rewrite the departure only if changed
        if (changedDeparture) {
            await selectStation(page, '#fromLocation', currDeparture);
        }
        await selectStation(page, '#toLocation', currDestination);

        // We only need to input the date one time
        if (firstTimeDate) {
            await selectDate(page, '#departureDate', departureDate);
            firstTimeDate = false;
        }

        await clickSearchButton(page);
        await waitForResults(page);
        await scrollToLoadAllResults(page);
        await setTimeout(3000);
        await checkifSoldOut(page);

        // Go back to search for new journey
        await page.click('a[aria-label="Back to search journey"]');
    } catch (error) {
        console.log('Error making new search:', error);
    }
};

// Click the search button
const clickSearchButton = async (page) => {
    try {
        const element = await select(page).getElement('button:contains(Search journey)');
        await element.click();
    } catch (error) {
        console.log('Error clicking search button:', error);
    }
};

// Wait for the trip results to load
const waitForResults = async (page) => {
    try {
        await page.waitForSelector('.MuiCard-root.Card-inactive', { visible: true, timeout: 20000});
    } catch (error) {
        console.log('Selector error:', error);
        await browser.close();
        return;
    }
};

// Scroll to load all results
const scrollToLoadAllResults = async (page) => {
    try {
        let previousHeight;
        while (true) {
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await setTimeout(500); 
            const newHeight = await page.evaluate('document.body.scrollHeight');
            if (newHeight === previousHeight) {
                break;
            }
        }
    } catch (error) {
        console.log('Error scrolling to load all results:', error);
    }
};

// Check if the trip is sold out
const checkifSoldOut = async (page) => {
    soldOut = false;
    const depTime = currDepartureTime + "-";
    console.log('Finding trip with departure time:', depTime + ' From: ' + currDeparture + ' To: ' + currDestination);
    const tripElements = await page.$$('.MuiCard-root.Card-inactive');

    for (const trip of tripElements) {

        // Find the departure time and make it clean
        const times = await trip.$$('h3 span');
        //await setTimeout(300);
        const secondDepTime = await page.evaluate(el => el.textContent, times[0]);
        const cleanedDepTime = secondDepTime.replace(/[\u2013\u2014]/g, '-').trim();

        // Is the departureTime found?
        if (cleanedDepTime === depTime) {
            const soldOutElement = await trip.$('.MuiBox-root.css-0 .MuiTypography-root.MuiTypography-h4.css-rkvqhq');
            soldOut = soldOutElement ? await page.evaluate(el => el.textContent.includes('Sold out'), soldOutElement) : false;
            return { soldOut, cleanedDepTime};
        }
    }
    console.log("Soldout: " + soldOut);
    console.log(cleanedDepTime);
    return null;

};

await scrapeSJ(
    departure,
    destination,
    departureDate,
    departureTime
);