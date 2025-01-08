/**
 * @file server.js
 * @description Express server for running the SJ Ticket Optimizer script via an API endpoint.
 * @version 1.0.0
 * @license MIT
 * @author Erik Eichmüller
 */

import express, { json } from 'express';
import { scrapeSJ } from './scraper.js';
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(json());

/**
 * POST endpoint to run the SJ Ticket Optimizer script.
 * Expects a JSON body with departure, destination, departureDate, and departureTime.
 * Returns the result of the script execution.
 */
app.post('/run-script', async (req, res) => {
  const { departure, destination, departureDate, departureTime } = req.body;

  try {
    // Run the scraper script with the provided parameters
    const result = await scrapeSJ(departure, destination, departureDate, departureTime);
    // Send the result back to the client
    res.json({ message: 'Script executed successfully', result });
  } catch (error) {
    console.error('Error running script:', error);
    // Send an error response if the script execution fails
    res.status(500).json({ error: 'Failed to execute script' });
  }
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});