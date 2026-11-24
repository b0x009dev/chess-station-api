import { readFileSync } from 'node:fs';
import process from 'node:process';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse, stringify } from 'yaml';

const source = readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8');
const document = parse(source);
const serverUrl = process.env.OPENAPI_SERVER_URL;

if (serverUrl) {
  document.servers = [{ url: serverUrl }];
}

const yaml = serverUrl ? stringify(document) : source;
const app = express();

app.get('/openapi.yaml', (_req, res) => {
  res.type('application/yaml').send(yaml);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(document));

app.use('/api/v1', (_req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Маршрут API не найден' });
});

export default app;
