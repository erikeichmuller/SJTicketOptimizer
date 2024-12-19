import {setTimeout} from "node:timers/promises";

export const selectStation = async (page, selector, station) => {
    try {
        await page.click(selector);
        await setTimeout(1000);
        await page.$eval(selector, el => el.value = '');
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
};

export const selectDate = async (page, selector, departureDate) => {
    try {
        await page.click(selector);
        await page.evaluate((selector) => {
            document.querySelector(selector).value = '';
        }, selector);
        await page.type(selector, departureDate);
    } catch (error) {
        console.log('Error selecting departure date:', error);
    }
};

export const handleLanguagePopup = async (page) => {
    try {
        await page.waitForSelector('.MuiDialog-root', { visible: true, timeout: 10000 });
        // Select English
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

export const handleCookieConsentPopup = async (page) => {
    try {
        await page.waitForSelector('.MuiDialog-root', { visible: true, timeout: 10000 });
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

export const handleUnexpectedPopups = async (page) => {
    // This popup will only appear once and will search for it every 0.5 seconds, until found
    let popupHandled = false;

    while (!popupHandled) {
        try {
            // Check for the pop-up every 0.5 seconds
            await page.waitForSelector('#NII-survey-btn-cancel', { visible: true, timeout: 1000 });
            console.log('Unexpected pop-up detected. Closing it...');
            await page.click('#NII-survey-btn-cancel'); 
            console.log('Pop-up closed.');
            popupHandled = true; // Set the flag to true after handling the pop-up
        } catch (error) {
            // No pop-up found, continue
            popupHandled = true;
        }
        await setTimeout(500); // Wait for 0.5 seconds before checking again
    }
};