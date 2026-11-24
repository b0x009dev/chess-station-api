import process from 'node:process';
import app from './app.js';

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT должен быть целым числом от 1 до 65535');
}

app.listen(port, '127.0.0.1', (error) => {
  if (error) throw error;
  console.log(`ChessStation API слушает 127.0.0.1:${port}`);
});
