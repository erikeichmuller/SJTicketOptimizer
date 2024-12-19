import {setTimeout} from "node:timers/promises";
import { selectStation, selectDate, handleLanguagePopup, handleCookieConsentPopup, handleUnexpectedPopups} from './utils.js';

const trafficInfoUrl = 'https://www.sj.se/en/traffic-information';

const scrapeStops = async (browser, departure, destination, departureDate, departureTime) => {

  const page = await browser.newPage();
  await page.goto(trafficInfoUrl, { waitUntil: "networkidle2" });

  // Only done one time
  await handleLanguagePopup(page);
  await handleCookieConsentPopup(page);

  // Start a background task to handle unexpected pop-ups
  handleUnexpectedPopups(page);

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
  const subStations = await extractStationList(page, actualDeparture, actualDestination);

  await page.close();

  console.log('scrapeRoute done');
  console.log('Substations:', subStations);

  return subStations;
}

// Pick the route according to the departure time
const pickRoute = async (page, departureTime) => {
  try {
    return await page.evaluate((departureTime) => {
      const buttons = document.querySelectorAll('button[data-testid^="stationConnection_departure_"]');
      for (const button of buttons) {
        const screenReaderText = button.querySelector('span[data-testid^="stationConnection_departure_"]').textContent;
        if (screenReaderText.includes(`Departs ${departureTime}`)) {
          button.click();
          return true;
        }
      }
      return false;
    }, departureTime);
  } catch (error) {
    console.log('Error picking route:', error);
    return false;
  }
};

// Extract the stop-stations excluding the departure and destination
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

        const stationButtons = document.querySelectorAll('button.MuiGrid-root.MuiGrid-container.MuiGrid-wrap-xs-nowrap.css-1ejmycs');

        const stations = Array.from(stationButtons).map(button => {
            const stationElement = button.querySelector('.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-6.css-13ha1vu p.MuiTypography-root.MuiTypography-body1.css-19vpdtg');
            const timeElements = button.querySelectorAll('.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-2.css-6xqzqi p.MuiTypography-root.MuiTypography-body1.css-eq4yst');
            const timeElement = timeElements.length > 1 ? timeElements[1] : timeElements[0];

            return {
                name: cleanString(stationElement ? stationElement.textContent : ''),
                departure: timeElement ? timeElement.textContent.trim() : null
            };
        });

        const departureIndex = stations.findIndex(station => station.name === cleanString(departure));
        const destinationIndex = stations.findIndex(station => station.name === cleanString(destination));
        
        // Remove the first station (departure) and the last station (destination)
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

export default scrapeStops;
