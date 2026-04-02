import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

await page.goto('https://quotes.toscrape.com');

const pageTitle = await page.title();
console.log('Page title:', pageTitle);

const quotes = await page.$$eval('.quote', (elements) => {
  return elements.map(el => ({
    text: el.querySelector('.text').innerText,
    author: el.querySelector('.author').innerText,
  }));
});

console.log(`\nFound ${quotes.length} quotes:\n`);
quotes.forEach((q, i) => {
  console.log(`${i + 1}. "${q.text}"`);
  console.log(`   — ${q.author}\n`);
});

await browser.close();