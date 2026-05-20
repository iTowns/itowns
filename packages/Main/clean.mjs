import fs from 'node:fs';

fs.rmSync('./examples', { recursive: true, force: true });
fs.rmSync('./docs', { recursive: true, force: true });
fs.rmSync('./dist', { recursive: true, force: true });
