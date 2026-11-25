import { readFileSync } from 'node:fs';
import process from 'node:process';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse, stringify } from 'yaml';
import gamesRouter from './routes/games.routes.js';
import { ApiError } from './utils/api-error.js';

const source = readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8');
const document = parse(source);
const serverUrl = process.env.OPENAPI_SERVER_URL;

if (serverUrl) {
  document.servers = [{ url: serverUrl }];
}

const yaml = serverUrl ? stringify(document) : source;
const app = express();

app.get('/openapi.yaml', (req, res) => {
  const type = req.accepts(['application/yaml', 'text/html', 'text/plain']) || 'application/yaml';
  res.vary('Accept').type(type === 'text/html' ? 'text/plain' : type).send(yaml);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(document));

app.use('/api/v1/games', gamesRouter);

app.use('/api/v1', (_req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Маршрут API не найден' });
});

app.use('/api/v1', (error, _req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  if (error instanceof ApiError) {
    const { status, code, message, details } = error;
    return res.status(status).json({ code, message, details });
  }
  if (error.status === 413) {
    return res.status(413).json({ code: 'PAYLOAD_TOO_LARGE', message: 'Размер тела запроса превышает 1 МиБ' });
  }
  if (error.status >= 400 && error.status < 500) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Некорректный HTTP-запрос' });
  }

  console.error(error);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Внутренняя ошибка сервера' });
});

export default app;
