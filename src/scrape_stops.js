/**
 * @file scrape_stops.js
 * @description Script for scraping stops for the SJ Ticket Optimizer.
 * @version 1.0.0
 * @license MIT
 * @author Erik Eichmüller
 */


import {setTimeout} from "node:timers/promises";
import { selectStation, selectDate, handleLanguagePopup, handleCookieConsentPopup, handleSurveyPopup} from './utils.js';

const trafficInfoUrl = 'https://www.sj.se/en/traffic-information';


/**
 * Scrapes the stops for a given trip from the SJ traffic information page.
 * @param {Object} browser - The Puppeteer browser instance.
 * @param {String} departure - The departure station.
 * @param {String} destination - The destination station.
 * @param {String} departureDate - The departure date in YYYY-MM-DD format.
 * @param {String} departureTime - The departure time in HH:MM format.
 * @returns {Promise<Array<String>>} - A promise that resolves to an array of stop names.
 */
export default async function scrapeStops(browser, departure, destination, departureDate, departureTime) {

  const page = await browser.newPage();
  await page.goto(trafficInfoUrl, { waitUntil: "networkidle2" });

  // Handle popups, only done one time
  await handleLanguagePopup(page);
  await handleCookieConsentPopup(page);

  // Start a background task to handle survey pop-up which may appear at any time
  handleSurveyPopup(page);

  console.log('Page loaded: Searching for route...'); 

  // Fill the departure and destination fields and select the top alternative
  const actualDeparture = await selectStation(page, '#departureStation', departure);
  const actualDestination = await selectStation(page, '#arrivalStation', destination);

  // Select the departure date
  await selectDate(page, '#distanceFormDatePicker', departureDate);

  // Click the search button
  await page.click('button[data-testid="searchDistanceButton"]');
  
  await setTimeout(1000);

  // Click the correct route according to the departure time
  await pickRoute(page, departureTime);

  await setTimeout(1000);

  // Extract the stop-stations excluding the departure and destination
  const subStations = extractStationList(page, actualDeparture, actualDestination);

  await page.close();

  console.log('scrapeRoute done');
  console.log('Substations:', subStations);

  return subStations;
}

// Pick the route according to the departure time
/**
 * 
 * @param {Object} page - The Puppeteer page object.
 * @param {String} departureTime - The departure time to pick.
 */
const pickRoute = async (page, departureTime) => {
  try {
    // Click the correct route according to the departure time
    return await page.evaluate((departureTime) => {

      // Find the correct route according to the departure time
      const buttons = document.querySelectorAll('button[data-testid^="stationConnection_departure_"]');

      for (const button of buttons) {

        // Get the screen reader text for the button
        const screenReaderText = button.querySelector('span[data-testid^="stationConnection_departure_"]').textContent;

        // Check if the screen reader text includes the departure time
        if (screenReaderText.includes(`Departs ${departureTime}`)) {
          button.click();
          return;
        }
      }
      return;
    }, departureTime);
  } catch (error) {
    console.log('Error picking route:', error);
    return false;
  }
};

// Extract the stop-stations excluding the departure and destination
/**
 * 
 * @param {Object} page - The Puppeteer page object.
 * @param {String} departure - The departure station.
 * @param {String} destination - The destination station.
 * @returns {Array<Object>} - An array of stop-stations.
 */
const extractStationList = async (page, departure, destination) => {
  try{
      const result = await page.evaluate((departure, destination) => {

        // Clean the string from special characters
        const cleanString = (str) => {
            if (!str) return '';
            return str
                .normalize('NFC')
                .replace(/[\u00A0]/g, ' ')
                .replace(/[\u200B-\u200D\uFEFF]/g, '')
                .replace(/\s{2,}/g, ' ')
                .trim()
                .toLowerCase();
        };

        // Extract the station names and departure times
        const stationButtons = document.querySelectorAll('button.MuiGrid-root.MuiGrid-container.MuiGrid-wrap-xs-nowrap.css-1ejmycs');

        // Map the station buttons to an array of station objects, only add the departure time if it exists
        const stations = Array.from(stationButtons).map(button => {

            // Get the station name and departure time
            const stationElement = button.querySelector('.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-6.css-13ha1vu p.MuiTypography-root.MuiTypography-body1.css-19vpdtg');
            
            // Get the departure time from elements
            const timeElements = button.querySelectorAll('.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-2.css-6xqzqi p.MuiTypography-root.MuiTypography-body1.css-eq4yst');
            const timeElement = timeElements.length > 1 ? timeElements[1] : timeElements[0];

            return {
                name: cleanString(stationElement ? stationElement.textContent : ''),
                departure: timeElement ? timeElement.textContent.trim() : null
            };
        });

        // Find the index of the departure and destination stations in the stations array
        const departureIndex = stations.findIndex(station => station.name === cleanString(departure));
        const destinationIndex = stations.findIndex(station => station.name === cleanString(destination));
        
        // Remove the first station (departure) and the last station (destination) from the stations array
        if (departureIndex !== -1 && destinationIndex !== -1 && departureIndex < destinationIndex) {
            return stations.slice(departureIndex + 1, destinationIndex);
        }
        return [];
      }, departure, destination);
    return result;
  } catch (error) {
      console.log('Error extracting station list:', error);
      return [];
  }
};