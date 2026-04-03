import 'dotenv/config';
import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const COOKIES_PATH = 'fb-cookies.json';

export async function scrapeFacebookBirthdays() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1280,800'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

  if (existsSync(COOKIES_PATH)) {
    console.log('Loading saved cookies...');
    const cookies = JSON.parse(readFileSync(COOKIES_PATH, 'utf-8'));
    await page.setCookie(...cookies);
    console.log('Cookies loaded!');
  } else {
    console.log('No saved cookies found. Please log in manually...');
    await page.goto('https://www.facebook.com/login');
    console.log('Log into Facebook in the browser window.');
    console.log('After you are logged in, press ENTER here in the terminal.');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

    const cookies = await page.cookies();
    writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
    console.log('Cookies saved! Next time login will be automatic.');
  }

  console.log('Navigating to birthdays page...');
  await page.goto('https://www.facebook.com/events/birthdays/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 5000));

  await page.screenshot({ path: 'screenshots/fb-birthdays.png' });
  console.log('Screenshot saved to screenshots/fb-birthdays.png');

  const names = await page.evaluate(() => {
    const junkWords = [
      'home', 'your events', 'notifications', 'classics', 'comedy', 'crafts',
      'dance', 'drinks', 'fitness', 'foods', 'games', 'gardening', 'health',
      'healthy', 'music', 'parties', 'professional', 'religions', 'shopping',
      'social', 'sports', 'theater', 'tv', 'visual', 'search', 'log in',
      'sign up', 'create', 'forgot', 'today', 'this week', 'next week',
      'recent birthdays', 'upcoming birthdays', 'see more',
    ];

    const birthdayNames = [];
    document.querySelectorAll('a').forEach(link => {
      const href = link.href || '';
      const name = link.textContent.trim();
      const isProfile = href.includes('facebook.com/') && !href.includes('/events') && !href.includes('/pages');
      const isJunk = junkWords.some(j => name.toLowerCase().startsWith(j));
      const hasSpace = name.includes(' ');

      if (isProfile && name && name.length > 3 && name.length < 50 && !isJunk && hasSpace) {
        birthdayNames.push(name);
      }
    });
    return [...new Set(birthdayNames)];
  });

  console.log(`Found ${names.length} name(s) on Facebook birthdays page:`);
  names.forEach(n => console.log(`  - ${n}`));

  await browser.close();

  return names.map(name => ({
    name,
    date: new Date().toISOString().split('T')[0],
    source: 'facebook',
    message: '',
    sent: false,
  }));
}
