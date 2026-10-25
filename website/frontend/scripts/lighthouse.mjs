/**
 * Mobile Lighthouse audit.
 *
 * Usage:
 *   npm run audit:lighthouse -- http://localhost:3000/login
 *   LIGHTHOUSE_COOKIE="refresh=..." npm run audit:lighthouse -- http://localhost:3000/dashboard
 *
 * The server should be a production build (`npm run build && npm start`).
 * Scores below 90 for Performance or Accessibility fail the command.
 */
import { writeFileSync } from 'node:fs';

import { chromium } from '@playwright/test';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const url = process.argv[2] || 'http://localhost:3000/login';
const cookie = process.env.LIGHTHOUSE_COOKIE || '';
const categories = ['performance', 'accessibility', 'best-practices', 'seo'];

const chrome = await chromeLauncher.launch({
  chromePath: chromium.executablePath(),
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
});

try {
  const result = await lighthouse(url, {
    port: chrome.port,
    output: 'json',
    logLevel: 'error',
    onlyCategories: categories,
    formFactor: 'mobile',
    screenEmulation: {
      mobile: true,
      width: 360,
      height: 640,
      deviceScaleFactor: 2,
      disabled: false,
    },
    extraHeaders: cookie ? { Cookie: cookie } : undefined,
  });

  if (!result?.lhr) {
    throw new Error('Lighthouse returned no report.');
  }

  const scores = Object.fromEntries(
    categories.map((category) => [
      category,
      Math.round((result.lhr.categories[category]?.score ?? 0) * 100),
    ])
  );

  console.log(`Lighthouse (mobile): ${url}`);
  console.log(JSON.stringify(scores, null, 2));

  if (process.env.LIGHTHOUSE_REPORT) {
    writeFileSync(process.env.LIGHTHOUSE_REPORT, result.report);
    console.log(`Report: ${process.env.LIGHTHOUSE_REPORT}`);
  }

  if (scores.performance < 90 || scores.accessibility < 90) {
    process.exitCode = 1;
  }
} finally {
  await chrome.kill();
}
