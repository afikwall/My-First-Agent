import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import http from 'http';
import { URL } from 'url';
import { scrapeFacebookBirthdays } from '../browser/facebook-birthdays.js';
import { generateMessage } from './messages.js';

const CREDENTIALS_PATH = 'credentials.json';
const TOKEN_PATH = 'token.json';

async function authenticate() {
  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const { client_id, client_secret, redirect_uris } = credentials.installed;

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:3001'
  );

  if (existsSync(TOKEN_PATH)) {
    const token = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));
    oauth2Client.setCredentials(token);
    console.log('Using saved token.');
    return oauth2Client;
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
  });

  console.log('Open this URL in your browser to log in:\n');
  console.log(authUrl);
  console.log('\nWaiting for you to log in...');

  const code = await new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost:3001');
      const authCode = url.searchParams.get('code');
      if (authCode) {
        res.end('Login successful! You can close this tab.');
        server.close();
        resolve(authCode);
      }
    });
    server.listen(3001);
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log('Token saved to token.json');

  return oauth2Client;
}

const CALENDAR_IDS = [
  { id: 'primary', name: 'My Calendar' },
  { id: 'a8921f58db8b27d826df0be7b2ed39145e92808cad6c3cb5b0892bb98dab2449@group.calendar.google.com', name: 'Birthday Calendar' },
];

async function getTodaysBirthdays(auth) {
  const calendar = google.calendar({ version: 'v3', auth });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  console.log(`\nSearching for birthdays on ${startOfDay.toLocaleDateString()}...\n`);

  const allBirthdays = [];

  for (const cal of CALENDAR_IDS) {
    console.log(`Checking: ${cal.name}...`);
    try {
      const res = await calendar.events.list({
        calendarId: cal.id,
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = res.data.items || [];

      const birthdays = events
        .filter(e => /birthday/i.test(e.summary || ''))
        .map(event => ({
          name: event.summary.replace(/birthday/i, '').replace(/'s/i, '').trim(),
          date: startOfDay.toISOString().split('T')[0],
          source: `google-calendar (${cal.name})`,
          message: '',
          sent: false,
        }));

      console.log(`  Found ${birthdays.length} birthday(s)`);
      allBirthdays.push(...birthdays);
    } catch (err) {
      console.log(`  Error reading ${cal.name}: ${err.message}`);
    }
  }

  if (allBirthdays.length === 0) {
    console.log('\nNo birthdays found today.');
  } else {
    console.log(`\nTotal: ${allBirthdays.length} birthday(s):`);
    allBirthdays.forEach(b => console.log(`  - ${b.name} (${b.source})`));
  }

  return allBirthdays;
}

const auth = await authenticate();

console.log('=== Step 1: Google Calendar ===');
const calendarBirthdays = await getTodaysBirthdays(auth);

console.log('\n=== Step 2: Facebook ===');
let fbBirthdays = [];
try {
  fbBirthdays = await scrapeFacebookBirthdays();
} catch (err) {
  console.log('Facebook scraping failed:', err.message);
}

console.log('\n=== Step 3: Generate Messages ===');
const allBirthdays = [...calendarBirthdays, ...fbBirthdays];

allBirthdays.forEach(b => {
  b.message = generateMessage(b.name);
  console.log(`  ${b.name}: ${b.message}`);
});

writeFileSync('data/birthdays.json', JSON.stringify({ birthdays: allBirthdays }, null, 2));
console.log(`\nDone! ${allBirthdays.length} birthdays saved to data/birthdays.json`);

