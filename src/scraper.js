import {setTimeout} from "node:timers/promises";
import puppeteer from "puppeteer";
import select from "puppeteer-select";
import scrapeStops from "./scrape_stops.js";
import { selectStation, selectDate, handleUnexpectedPopups } from './utils.js';

const url = 'https://www.sj.se/en/search-journey';

export const scrapeSJ = async (departure, destination, departureDate, departureTime) => {

    let currDestination = destination;
    let currDeparture = departure;
    let currDepartureTime = departureTime;

    let soldOut = false;
    let changedDestination = false;
    let changedDeparture = true;
    let firstTimeDate = true;

    let routeData = [];
    let trips = [];

    const browser = await puppeteer.launch({ 
        headless: true,
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
    soldOut = await makeNewSearch(page, currDeparture, currDestination, changedDeparture, departureDate, currDepartureTime, firstTimeDate, soldOut);
    console.log('Sold out second time:', soldOut);
    // Are there stops for the initial trip?
    if (routeData.length === 0) {
        await browser.close();
        if (soldOut) {
            console.log('The trip is truly fully booked');
            return {message: 'The trip is truly fully booked'};
        } else {
            console.log('The inputted trip already has available seats number 1');
            return {message: 'The inputted trip already has available seats'};
        }
    } else {
        if (!soldOut) {
            await browser.close();
            console.log('The inputted trip already has available seats');
            return {message: 'The inputted trip already has available seats'};
        } else {
            await newProcessData(page, routeData, currDeparture, currDestination, currDepartureTime, soldOut, changedDestination, changedDeparture, trips);
        }
    }

    await browser.close();
    if (trips.length === 0) {
        console.log('The trip is truly fully booked');
        return {message: 'The trip is truly fully booked'};
    } else {
        console.log('Trips avalable');
        return {message: 'Trips available:', trips};
    }
};

const newProcessData = async (page, route, currDeparture, currDestination, currDepartureTime, soldOut, changedDestination, changedDeparture, trips) => {
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
                soldOut = await makeNewSearch(page, currDeparture, currDestination, changedDeparture, departureDate, firstTimeDate, currDepartureTime, soldOut);
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
                        await newProcessData(page, remainingRoute, currDeparture, currDestination, currDepartureTime, soldOut, changedDestination, changedDeparture, trips);
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
const makeNewSearch = async (page, currDeparture, currDestination, changedDeparture, departureDate, currDepartureTime, firstTimeDate, soldOut) => {
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
        soldOut = await checkifSoldOut(page, currDepartureTime, currDeparture, currDestination, soldOut);

        // Go back to search for new journey
        await page.click('a[aria-label="Back to search journey"]');
        return soldOut;
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
const checkifSoldOut = async (page, currDepartureTime, currDeparture, currDestination, soldOut) => {
    soldOut = false;
    const depTime = currDepartureTime + "-";
    console.log('Finding trip with departure time:', depTime + ' From: ' + currDeparture + ' To: ' + currDestination);
    const tripElements = await page.$$('.MuiCard-root.Card-inactive');

    for (const trip of tripElements) {

        // Find the departure time and make it clean
        const times = await trip.$$('h3 span');
        await setTimeout(300);
        const secondDepTime = await page.evaluate(el => el.textContent, times[0]);
        const cleanedDepTime = secondDepTime.replace(/[\u2013\u2014]/g, '-').trim();

        // Is the departureTime found?
        if (cleanedDepTime === depTime) {
            console.log('Found trip with departure time:', cleanedDepTime);
            const soldOutElement = await trip.$('.MuiBox-root.css-0 .MuiTypography-root.MuiTypography-h4.css-rkvqhq');
            soldOut = soldOutElement ? await page.evaluate(el => el.textContent.includes('Sold out'), soldOutElement) : false;
            console.log('Sold out:', soldOut);
            return soldOut;
        }
    }
    console.log("soldOut: ", soldOut);
    return false;

};

/*await scrapeSJ(
    'Stockholm Central',
    'Göteborg Central',
    '2024-12-30',
    '14:14'
);*/