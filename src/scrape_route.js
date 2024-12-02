import { time } from "node:console";
import { stat } from "node:fs";
import {setTimeout} from "node:timers/promises";
import puppeteer from "puppeteer";
import { selectStation, selectDate, handleLanguagePopup, handleCookieConsentPopup } from './utils.js';

const scrapeRoute = async (url, departureTime, browser, departure, destination, departureDate) => {
  /*const browser = await puppeteer.launch({
    headless: false,
    //slowMo: 200 // Add a delay of 100ms between each action 
  });*/

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  // Not needed when using the same browser as for scraper
  //await handleLanguagePopup(page);
  //await handleCookieConsentPopup(page);

  // Fill in the departure and destination fields and select the top alternative
  const actualDeparture = await selectStation(page, '#departureStation', departure);
  const actualDestination = await selectStation(page, '#arrivalStation', destination);
  await selectDate(page, '#distanceFormDatePicker', departureDate);

  console.log(`Selected departure station: ${actualDeparture}`);
    console.log(`Selected destination station: ${actualDestination}`);
  // Click the search button
  await page.click('button[data-testid="searchDistanceButton"]');

  await setTimeout(1000);

  // Find and click the button that matches the specified departureTime
  const buttonClicked = await page.evaluate((departureTime) => {
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

  await setTimeout(4000);

  if (buttonClicked) {
    console.log(`Clicked the button with departure time: ${departureTime}`);
  } else {
    console.log(`No button found with departure time: ${departureTime}`);
  }

  await setTimeout(4000);

  await extractStationList(page, actualDeparture, actualDestination);

  await setTimeout(4000);

  await browser.close();
  return "Scrape complete!";
}

// Global version of the function add in scraper.js
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

// An global function put this in scraper aswell and then make global
/*const selectDate = async (page, selector, departureDate) => {
    try {
        await page.click(selector);
        await page.evaluate((selector) => {
            document.querySelector(selector).value = '';
        }, selector);
        await page.type(selector, departureDate); // Adjust the date format as needed
        console.log('Departure date selected.');
    } catch (error) {
        console.log('Error selecting departure date:', error);
    }
};*/

const extractStationList = async (page, departure, destination) => {
    try{
        const stationNames = await page.evaluate((departure, destination) => {

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

            const stationElements = document.querySelectorAll('.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-6.css-13ha1vu p.MuiTypography-root.MuiTypography-body1.css-19vpdtg');
            const stations = Array.from(stationElements).map(station => cleanString(station.textContent));
            
            const normalizedDeparture = cleanString(departure);
            const normalizedDestination = cleanString(destination);

            const departureIndex = stations.indexOf(normalizedDeparture);
            const destinationIndex = stations.indexOf(normalizedDestination);

            if (departureIndex !== -1 && destinationIndex !== -1 && departureIndex < destinationIndex) {
                return stations.slice(departureIndex + 1, destinationIndex);
            }

            return stations;
        }, departure, destination);
        console.log('Extracted station names:', stationNames);
    } catch (error) {
        console.log('Error extracting station list:', error);
    }
};

const cleanString = (str) => {
    if (!str) return '';
    
    // Normalize to Unicode and replace hidden/non-breaking spaces
    return str
        .normalize('NFC') // Normalize Unicode
        .replace(/[\u00A0]/g, ' ') // Replace non-breaking spaces with regular spaces
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove invisible characters
        .replace(/\s{2,}/g, ' ') // Replace multiple spaces with a single space
        .trim() // Remove leading and trailing spaces
        .toLowerCase(); // Normalize case
};

// TODO: Test if this works for scraper.js aswell and make the function global
/*const handleLanguagePopup = async (page) => {
    try {
        console.log('Checking for language selection popup...');
        await page.waitForSelector('.MuiDialog-root', { visible: true, timeout: 10000 });
        console.log('Language selection popup found');
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

// TODO: Make global
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

export default scrapeRoute;


/*if (import.meta.url === `file://${process.argv[1]}`) {
    const destination = 'Hässleholm Central';
    const departure = 'Stockholm Central';
    const departureDate = '2024-12-03';
    const departureTime = '17:02';
    const url = 'https://www.sj.se/en/traffic-information';

    scrapeRoute(url, departureTime, departure, destination, departureDate)
        .then(result => {
            console.log(result);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}*/