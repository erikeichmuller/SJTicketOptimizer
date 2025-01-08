/**
 * @file scraper.js
 * @description Script for scraping SJ train journeys and finding alternative travel options if the train is fully booked.
 * @version 1.0.0
 * @license MIT
 * @author Erik Eichmüller
 */

import {setTimeout} from "node:timers/promises";
import puppeteer from "puppeteer";
import scrapeStops from "./scrape_stops.js";
import { selectStation, selectDate, handleSurveyPopup } from './utils.js';
import { clickSearchButton, waitForResults, scrollToLoadAllResults, checkifSoldOut } from './scraper_utils.js';

const url = 'https://www.sj.se/en/search-journey';

/**
 * Takes the user input and scrapes the SJ website to find alternative travel options if the train is fully booked.
 * @param {String} departure - The departure station.
 * @param {String} destination - The destination station.
 * @param {String} departureDate - The departure date in YYYY-MM-DD format.
 * @param {String} departureTime - The departure time in HH:MM format.
 * @returns {Promise<Object>} - A promise that resolves to an object with the message and the available trips.
 */
export const scrapeSJ = async (departure, destination, departureDate, departureTime) => {

    let currDestination = destination;
    let currDeparture = departure;
    let currDepartureTime = departureTime;
    let currArrivalTime = '';

    let soldOut = false;
    let changedDestination = false;
    let changedDeparture = true;
    let firstTimeDate = true;

    let routeData = [];
    let trips = [];

    const browser = await puppeteer.launch({ 
        headless: false,
        //slowMo: 100 // Add a delay of 100ms between each action 
    });

    console.log('Start scraping SJ');

    // Fetch the stops and their departure times for the trip
    routeData = await scrapeStops(browser, departure, destination, departureDate, departureTime);

    // New page for searching
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    await setTimeout(1000);

    // Handle survey popup
    handleSurveyPopup(page);

    // Make an initial search
    const result = await makeNewSearch(page, currDeparture, currDestination, changedDeparture, departureDate, currDepartureTime, firstTimeDate, soldOut, currArrivalTime);
    soldOut = result.soldOut;
    currArrivalTime = result.currArrivalTime;

    // Are there stops for the initial trip?
    if (routeData.length === 0) {
        await browser.close();
        if (soldOut) {
            console.log('The trip is truly fully booked');
            return {message: 'The trip is truly fully booked'};
        } else {
            console.log('The inputted trip already has available seats');
            return {message: 'The inputted trip already has available seats'};
        }
    } else {
        if (!soldOut) {
            await browser.close();
            console.log('The inputted trip already has available seats');
            return {message: 'The inputted trip already has available seats'};
        } else {
            await newProcessData(page, routeData, currDeparture, currDestination, currDepartureTime, departureDate, soldOut, changedDestination, changedDeparture, trips, currArrivalTime, destination);
        }
    }

    await browser.close();
    if (trips.length === 0) {
        console.log('The trip is truly fully booked');
        return {message: 'The trip is truly fully booked'};
    } else {
        console.log('Trips avalable: ', trips);
        return {message: 'Trips available:', trips};
    }
};

/**
 * Handles the logic of the optimizing algorithm.
 * @param {Object} page - The Puppeteer page object.
 * @param {Array<{name: String, departure: String}>} route - The route data.
 * @param {String} currDeparture - The current departure station.
 * @param {String} currDestination - The current destination station. 
 * @param {String} currDepartureTime - The current departure time.
 * @param {String} departureDate - The departure date.
 * @param {boolean} soldOut - If the trip is sold out.
 * @param {boolean} changedDestination - If the destination was changed.
 * @param {boolean} changedDeparture - If the departure was changed.
 * @param {Array<[String, String, String, String]>} trips - The available trips.
 * @param {String} currArrivalTime - The current arrival time.
 * @param {String} destination - The destination station.
 */
const newProcessData = async (page, route, currDeparture, currDestination, currDepartureTime, departureDate, soldOut, changedDestination, changedDeparture, trips, currArrivalTime, destination) => {
    try{
        // If the route array has no stops, return
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
                // If the current departure is same as the current destination, we are done
                if (currDeparture === currDestination) {
                    return;
                }
                // Make new search
                const result = await makeNewSearch(page, currDeparture, currDestination, changedDeparture, departureDate, currDepartureTime, false, soldOut, currArrivalTime);
                soldOut = result.soldOut;
                currArrivalTime = result.currArrivalTime;

                // If the trip is sold out, we continue to the next trip
                if (soldOut) {
                    changedDestination = false;
                    changedDeparture = false;
                    continue;
                } else {
                    // Trip found, add to the trips array
                    console.log('There is a trip available from ' + currDeparture + ' to ' + currDestination + ' with departure time ' + currDepartureTime);
                    trips.push([currDeparture, currDestination, currDepartureTime, currArrivalTime]);
                    
                    // Set the new departure and destination
                    if (currDestination !== destination) {
                        
                        // The current departure becomes the current destination
                        currDeparture = currDestination;

                        // The current destination becomes the original destination
                        currDestination = destination;

                        // We have now changed the departure and destination
                        changedDestination = true;
                        changedDeparture = true;

                        console.log('currDestination:', currDestination);

                        // Change the current departure time to the one matching the new departure from route array
                        currDepartureTime = route[route.length - (i + 1)].departure;

                        // Find the index of the current destination in the route array
                        const currentIndex = route.findIndex(station => station.name === currDeparture);

                        // Remove the stations that a found trip already has passed
                        const remainingRoute = route.slice(currentIndex + 1);
                        console.log('Remaining route:', remainingRoute);

                        // Recursively call the function with the new values
                        await newProcessData(page, remainingRoute, currDeparture, currDestination, currDepartureTime, departureDate, soldOut, changedDestination, changedDeparture, trips, currArrivalTime, destination);
                    }
                    break;
                }
            }
        }
    } catch (error) {
        console.log('Error in process Data:', error);
    }
};

/**
 * Makes a search for a new journey and chekcs wheter the trip is soldout or not.
 * @param {Object} page - The Puppeteer page object. 
 * @param {String} currDeparture - The current departure station.
 * @param {String} currDestination - The current destination station.
 * @param {String} changedDeparture - If the departure was changed.
 * @param {String} departureDate - The departure date.
 * @param {String} currDepartureTime - The current departure time.
 * @param {boolean} firstTimeDate - If it is the first time the date is inputted.
 * @param {boolean} soldOut - If the trip is sold out.
 * @param {String} currArrivalTime - The current arrival time.
 * @returns {boolean, string} - Returns true if the trip is sold out, otherwise false. Also returns the arrival time of the trip.
 */
const makeNewSearch = async (page, currDeparture, currDestination, changedDeparture, departureDate, currDepartureTime, firstTimeDate, soldOut, currArrivalTime) => {
    try{
        console.log('Making new search...');
        await setTimeout(1000);
        
        // Changes the departure only if changedDeparture is true
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
        
        const result = await checkifSoldOut(page, currDepartureTime, currDeparture, currDestination, soldOut, currArrivalTime);
        soldOut = result.soldOut;
        currArrivalTime = result.cleanedArrTime;

        // Go back to search for new journey
        await page.click('a[aria-label="Back to search journey"]');

        return {soldOut, currArrivalTime};
    } catch (error) {
        console.log('Error making new search:', error);
    }
};

// For testing and manual running
await scrapeSJ(
    'Stockholm Central',
    'Göteborg Central',
    '2025-01-08',
    '20:12'
);