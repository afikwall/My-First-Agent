import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, '..', 'data', 'birthdays.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/birthdays', (req, res) => {
  const raw = readFileSync(DATA_PATH, 'utf-8');
  const data = JSON.parse(raw);
  res.json(data);
});

app.post('/api/birthdays/:index/sent', (req, res) => {
  const raw = readFileSync(DATA_PATH, 'utf-8');
  const data = JSON.parse(raw);
  const index = parseInt(req.params.index);

  if (index >= 0 && index < data.birthdays.length) {
    data.birthdays[index].sent = true;
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid index' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});