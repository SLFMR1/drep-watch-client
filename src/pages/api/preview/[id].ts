import type { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid question ID' });
  }

  // Build the URL to the card snapshot page
  const frontendBaseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://www.drep.watch';
  const url = `${frontendBaseUrl}/card-snapshot/${id}`;

  let browser;
  try {
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=600,800'
      ],
      headless: true
    });

    const page = await browser.newPage();
    
    // Set viewport to match card dimensions
    await page.setViewport({
      width: 600,
      height: 800,
      deviceScaleFactor: 2
    });

    // Set a longer timeout for page load
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Wait for the card to render with a longer timeout
    await page.waitForSelector('.card-snapshot-root', { 
      timeout: 30000,
      visible: true 
    });

    // Add a small delay to ensure content is fully rendered
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Screenshot only the card
    const card = await page.$('.card-snapshot-root');
    if (!card) {
      throw new Error('Card element not found');
    }

    const buffer = await card.screenshot({ 
      type: 'png',
      omitBackground: true
    });

    await browser.close();

    // Set cache headers for better performance
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(buffer);
  } catch (error) {
    console.error('Puppeteer error:', error);
    if (browser) await browser.close();
    
    // Return the default image instead of an error
    res.redirect(307, 'https://c-ipfs-gw.nmkr.io/ipfs/QmNWssukxYXoo2MHTu6BG9ScQpbYjDYjAm8qQsgRcWjpjd');
  }
} 