/**
 * @file utils.js
 * @description Utility functions for the SJ Ticket Optimizer project.
 * @version 1.0.0
 * @license MIT
 * @author Erik Eichmüller
 */

import {setTimeout} from "node:timers/promises";

/**
 * Inputs the station name in the search field and selects the top station from the dropdown.
 * @param {Object} page - The Puppeteer page object.
 * @param {string} selector - The CSS selector for the station input field.
 * @param {string} station - The station name to input.
 * @returns {string|null} The actual station name selected since the top one is selected.
 */
export const selectStation = async (page, selector, station) => {
    try {
        // click the station input field
        await page.click(selector);
        await setTimeout(1000);

        // Clear the input field
        await page.$eval(selector, el => el.value = '');

        // Type the station name
        await page.type(selector, station); 

        // Wait for the dropdown to appear and select the top station
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
};


/**
 * Clears the input field and types the departure date.
 * @param {Object} page - The Puppeteer page object.
 * @param {String} selector - The CSS selector for the date input field.
 * @param {String} departureDate - The departure date to input.
 */
export const selectDate = async (page, selector, departureDate) => {
    try {
        // Click the date input field
        await page.click(selector);

        // Clear the input field
        await page.evaluate((selector) => {
            document.querySelector(selector).value = '';
        }, selector);

        // Type the departure date
        await page.type(selector, departureDate);
    } catch (error) {
        console.log('Error selecting departure date:', error);
    }
};

/**
 * Clicks the english language button if it exists.
 * @param {Object} page - The Puppeteer page object.
 */
export const handleLanguagePopup = async (page) => {
    try {
        // Wait for the language selection popup to appear
        await page.waitForSelector('.MuiDialog-root', { visible: true, timeout: 10000 });
        // Select English language
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
};

/**
 * Clicks the accept all cookies button if it exists.
 * @param {Object} page - The Puppeteer page object.
 */
export const handleCookieConsentPopup = async (page) => {
    try {
        // Wait for the cookie consent popup to appear
        await page.waitForSelector('.MuiDialog-root', { visible: true, timeout: 10000 });

        // Click the accept all cookies button
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
};

/**
 * Clicks the cancel button of the survey popup if it exists.
 * @param {Object} page - The Puppeteer page object.
 */
export const handleSurveyPopup = async (page) => {
    // This popup will only appear once and will search for it every 0.5 seconds, until found
    let popupHandled = false;

    while (!popupHandled) {
        try {
            // Wait for the survey popup to appear
            await page.waitForSelector('#NII-survey-btn-cancel', { visible: true, timeout: 1000 });
            console.log('Unexpected pop-up detected. Closing it...');

            // Click the cancel button
            await page.click('#NII-survey-btn-cancel'); 
            console.log('Pop-up closed.');

            // Set the flag to true after handling the pop-up
            popupHandled = true; 
        } catch (error) {
            // No pop-up found, continue
            popupHandled = true;
        }
        // Wait for 0.5 seconds before checking again
        await setTimeout(500);
    }
};