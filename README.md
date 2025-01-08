# SJTicketOptimizer
This project aims to help SJ and customers to SJ by optimizing available tickets and seats on fully booked trips with trains through web scraping.

## Overview 

The project scrapes ticket information from the SJ website to find solutions for booking trips that are stated as fully booked. It is only possible for trips that has no transfers. It uses JavaScript and Node.js along with other libraries to automate the scraping process. 

## Libraries used

-**Puppeteer**: For browser-based scraping to handle dynamic content.
-**puppeteer-select**: For enhanced element selection in Puppeteer.

## Project Structure 

### `src/scraper.js`

This is the main script that initiates the scraping process. It handles the following tasks:
- Launches a Puppeteer browser instance.
- Navigates to the SJ website.
- Initiates the search for routes and tickets.
- Handles unexpected pop-ups using functions from `utils.js`.
- Calls `scrapeStops` from `scrape_stops.js` to fetch stop information.
- Implements the main algorithm to make a fully booked trip available by finding different available trips within the same route and initial trip.


### `src/scrape_stops.js`

This script is responsible for scraping the stops for a given route. It:
- Navigates to the traffic information page.
- Handles language and cookie consent pop-ups.
- Selects departure and destination stations.
- Extracts the list of stops between the departure and destination.


### `src/scraper_utils.js`

Contains utility functions specific to the scraper, including:
- `clickSearchButton`: Clicks the search button to search for a journey.
- `waitForResults`: Waits for the trip results to load.
- `scrollToLoadAllResults`: Scrolls to load all results on the page.
- `checkifSoldOut`: Checks if a trip is sold out.


### `src/utils.js`

Contains utility functions used across the project, including:
- `selectStation`: Selects a station from a dropdown.
- `selectDate`: Selects a date from a date picker.
- `handleLanguagePopup`: Handles the language selection pop-up.
- `handleCookieConsentPopup`: Handles the cookie consent pop-up.
- `handleSurveyPopup`: Handles the survey pop-up.


### `src/server.js`

Sets up an Express server to run the SJ Ticket Optimizer script via an API endpoint. It:
- Defines a POST endpoint to run the scraper script with provided parameters.
- Returns the result of the script execution.

## How to Run

1. **Fork the Project**:
    - Click the "Fork" button at the top right of this repository to create a copy of the project under your GitHub account.

2. **Clone the Repository**:
    ```sh
    git clone https://github.com/YOUR_USERNAME/SJTicketOptimizer.git
    cd SJTicketOptimizer
    ```

3. **Install Dependencies**:
    ```sh
    npm install
    ```

4. **Start Scraping**:
    ```sh
    npm run start
    ```

## License

This project is licensed under the ISC License.