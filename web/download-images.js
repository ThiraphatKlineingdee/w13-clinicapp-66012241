import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const games = [
  { url: 'https://placehold.co/400x300/1f2937/f59e0b/png?text=Architects+of+the+West+Kingdom', filename: 'architects.jpg' },
  { url: 'https://placehold.co/400x300/1f2937/f59e0b/png?text=Mansions+of+Madness', filename: 'mansions.jpg' },
  { url: 'https://placehold.co/400x300/1f2937/f59e0b/png?text=Terraforming+Mars', filename: 'terraforming.jpg' },
  { url: 'https://placehold.co/400x300/1f2937/f59e0b/png?text=Ark+Nova', filename: 'arknova.jpg' },
  { url: 'https://placehold.co/400x300/1f2937/f59e0b/png?text=CS+Files', filename: 'csfiles.jpg' }
];

const destDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  for (const game of games) {
    console.log(`Downloading ${game.filename}...`);
    try {
      await download(game.url, path.join(destDir, game.filename));
      console.log(`Saved ${game.filename}`);
    } catch (e) {
      console.error(e);
    }
  }
}

run();
