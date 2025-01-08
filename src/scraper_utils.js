/**
 * @file scraper_utils.js
 * @description Utility functions for the scraper file only.
 * @version 1.0.0
 * @license MIT
 * @author Erik Eichmüller
 */

import {setTimeout} from "node:timers/promises";
import select from "puppeteer-select";

/**
 * Clicks the search button to search for a journey.
 * @param {Object} page - The Puppeteer page object.
 */
export const clickSearchButton = async (page) => {
    try {
        // Click the search button
        const element = await select(page).getElement('button:contains(Search journey)');
        await element.click();
    } catch (error) {
        console.log('Error clicking search button:', error);
    }
};

/**
 * Waits for the trip results to load.
 * @param {Object} page - The Puppeteer page object.
 */
export const waitForResults = async (page) => {
    try {
        // Wait for the results to load
        await page.waitForSelector('.MuiCard-root.Card-inactive', { visible: true, timeout: 20000});
    } catch (error) {
        console.log('Selector error:', error);
        await browser.close();
        return;
    }
};

/**
 * Scroll to load all results on the page. 
 * @param {Object} page - The Puppeteer page object.
 */
export const scrollToLoadAllResults = async (page) => {
    try {
        let previousHeight;
        while (true) {
            // Scroll to the bottom of the page
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
/**
 * Checks if a trip is sold out.
 * @param {Object} page - The Puppeteer page object.
 * @param {String} currDepartureTime - The departure time to check. 
 * @returns {boolean, string} - Returns true if the trip is sold out, otherwise false. Also returns the arrival time of the trip.
 */
export const checkifSoldOut = async (page, currDepartureTime) => {
    let soldOut = false;
    const departureTime = currDepartureTime + "-";

    // All trips
    const tripElements = await page.$$('.MuiCard-root.Card-inactive');

    for (const trip of tripElements) {

        // Find the departure- and arrival time and clean the strings
        const times = await trip.$$('h3 span');
        await setTimeout(300);

        // Separate the departure and arrival time
        const depTime = await page.evaluate(el => el.textContent, times[0]);
        const arrTime = await page.evaluate(el => el.textContent, times[1]);

        // Clean the strings
        const cleanedDepTime = depTime.replace(/[\u2013\u2014]/g, '-').trim();
        const cleanedArrTime = arrTime.replace(/[\u2013\u2014]/g, '-').trim();

        // Is the departureTime found?
        if (cleanedDepTime === departureTime) {
            console.log('Found trip with departure time:', cleanedDepTime);

            // Check if the trip is sold out
            const soldOutElement = await trip.$('.MuiBox-root.css-0 .MuiTypography-root.MuiTypography-h4.css-rkvqhq');
            soldOut = soldOutElement ? await page.evaluate(el => el.textContent.includes('Sold out'), soldOutElement) : false;

            return { soldOut, cleanedArrTime };
        }
    }
    return {soldOut: false, cleanedArrTime: ''};
};