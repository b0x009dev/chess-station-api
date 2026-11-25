import { readFile, readdir } from 'node:fs/promises';
import process from 'node:process';
import { request } from './api.js';

const directory = new URL('./data/demo-games/', import.meta.url);
let created = 0;
let file;

try {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.pgn'))
    .map((entry) => entry.name)
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error('В каталоге demo-games нет PGN-файлов');
  }

  for (const name of files) {
    file = name;
    const pgn = await readFile(new URL(encodeURIComponent(file), directory), 'utf8');
    await request('/games', 201, 'POST', { pgn });
    created += 1;
  }

  console.log(`Загружено партий: ${created}`);
} catch (error) {
  console.error(`Загружено партий: ${created}. ${file ?? 'demo-games'}. ${error.message}`);
  process.exitCode = 1;
}
