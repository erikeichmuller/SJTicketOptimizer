import express, { json } from 'express';
import { scrapeSJ } from './scraper.js';
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(json());

// Your script logic here
app.post('/run-script', async (req, res) => {
  const { departure, destination, departureDate, departureTime } = req.body;

  try {
    const result = await scrapeSJ(departure, destination, departureDate, departureTime);
    res.json({ message: 'Script executed successfully', result });
  } catch (error) {
    console.error('Error running script:', error);
    res.status(500).json({ error: 'Failed to execute script' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});