

export const selectStation = async (page, selector, station) => {
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
};

export const selectDate = async (page, selector, departureDate) => {
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
};

export const handleLanguagePopup = async (page) => {
    try {
        await page.waitForSelector('.MuiDialog-root', { visible: true, timeout: 10000 });
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