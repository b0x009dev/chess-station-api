import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { request } from './api.js';

const marker = randomUUID();
const createdIds = new Set();

async function createGame(white, black) {
  const pgn = `[White "${white}"]\n[Black "${black}"]\n\n1. e4 e5 *`;
  const game = await request('/games', 201, 'POST', { pgn });
  assert(Number.isInteger(game.id) && game.id > 0, 'Сервер вернул некорректный ID');
  createdIds.add(game.id);
  assert.equal(game.pgn, pgn, 'При создании изменился PGN');
  assert.equal(game.createdAt, game.updatedAt, 'Даты создания и обновления различаются');
  return game;
}

try {
  const first = await createGame(`Ласкер %_${marker}`, 'Рубинштейн');
  const second = await createGame('Капабланка', `Алехин ${marker}`);
  const gamePath = `/games/${first.id}`;
  assert.deepEqual(await request(gamePath, 200), first, 'Сохранённая партия отличается от созданной');

  const filter = `/games?limit=1&player=${marker}`;
  const firstPage = await request(filter, 200);
  const secondPage = await request(`${filter}&page=2`, 200);
  assert.equal(firstPage.total, 2, 'Ожидались две тестовые партии');
  assert.equal(secondPage.total, 2, 'Число совпадений изменилось при смене страницы');
  assert.deepEqual(firstPage.items.map((game) => game.id), [second.id], 'Неверная первая страница');
  assert.deepEqual(secondPage.items.map((game) => game.id), [first.id], 'Неверная вторая страница');
  assert(!Object.hasOwn(firstPage.items[0], 'pgn'), 'Список содержит полный PGN');
  const emptyPage = await request(`${filter}&page=3`, 200);
  assert.deepEqual(emptyPage, { items: [], total: 2, page: 3, limit: 1 });

  const player = encodeURIComponent(` ЛАСКЕР %_${marker} `);
  const matches = await request(`/games?player=${player}`, 200);
  assert.deepEqual(matches.items.map((game) => game.id), [first.id], 'Поиск по имени белых вернул другой результат');
  const black = encodeURIComponent(`АЛЕХИН ${marker}`);
  const blackMatches = await request(`/games?player=${black}`, 200);
  assert.deepEqual(blackMatches.items.map((game) => game.id), [second.id], 'Поиск по имени чёрных вернул другой результат');

  const unchanged = await request(gamePath, 200, 'PUT', { pgn: first.pgn });
  assert.deepEqual(unchanged, first, 'Повторный PUT с тем же PGN изменил партию');
  const pgn = `[Event "Проверка API"]\n${first.pgn}`;
  const updated = await request(gamePath, 200, 'PUT', { pgn });
  assert.equal(updated.pgn, pgn, 'Новый PGN не сохранён');
  assert.equal(updated.event, 'Проверка API', 'Событие не обновилось');
  assert.equal(updated.createdAt, first.createdAt, 'Время создания изменилось');
  assert(updated.updatedAt > first.updatedAt, 'Время обновления не изменилось');

  const invalid = await request(gamePath, 400, 'PUT', { pgn: '[Date "2026"]' });
  assert.equal(invalid.code, 'VALIDATION_ERROR');
  assert.deepEqual(await request(gamePath, 200), updated, 'Некорректный PUT изменил партию');

  await request(gamePath, 204, 'DELETE');
  createdIds.delete(first.id);
  const missing = await request(gamePath, 404);
  assert.equal(missing.code, 'GAME_NOT_FOUND');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  for (const id of createdIds) {
    try {
      await request(`/games/${id}`, 204, 'DELETE');
    } catch (error) {
      console.error(`Не удалось удалить тестовую партию ${id}. ${error.message}`);
      process.exitCode = 1;
    }
  }
}

if (!process.exitCode) {
  console.log('Сценарий API пройден. Тестовые партии удалены');
}
