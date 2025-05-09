import type { NextApiRequest, NextApiResponse } from 'next';
import { execSync } from 'child_process';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const healthCheck = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'healthy',
    chrome: {
      available: false,
      version: null as string | null,
      path: process.env.PUPPETEER_EXECUTABLE_PATH || 'not set'
    }
  };

  try {
    // Check if Chrome is accessible
    if (process.env.NODE_ENV === 'production') {
      const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      if (!chromePath) {
        throw new Error('PUPPETEER_EXECUTABLE_PATH not set');
      }

      // Try to get Chrome version
      const chromeVersion = execSync(`${chromePath} --version`).toString().trim();
      healthCheck.chrome = {
        available: true,
        version: chromeVersion,
        path: chromePath
      };
    } else {
      healthCheck.chrome = {
        available: true,
        version: 'development',
        path: 'development'
      };
    }

    res.status(200).json(healthCheck);
  } catch (error) {
    console.error('Health check failed:', error);
    
    healthCheck.status = 'unhealthy';
    if (error instanceof Error) {
      healthCheck.chrome.version = error.message;
    }
    
    res.status(503).json(healthCheck);
  }
} 