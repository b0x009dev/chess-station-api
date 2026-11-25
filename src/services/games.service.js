import { Buffer } from 'node:buffer';
import * as gamesRepository from '../repositories/games.repository.js';
import { ApiError } from '../utils/api-error.js';

const maxPgnBytes = 128 * 1024;
const maxMetadataLength = 255;
const maxGameId = 2147483647;
const tagPattern = /^\[[ \t]*([A-Za-z]+)[ \t]+"([^"\\\p{Cc}]+)"[ \t]*\](?=$|\s|\[)/u;
const datePattern = /^(?:[0-9]{4}|\?{4})\.(?:[0-9]{2}|\?{2})\.(?:[0-9]{2}|\?{2})$/;
const results = ['1-0', '0-1', '1/2-1/2', '*'];

function validationError(message, details) {
  return new ApiError(400, 'VALIDATION_ERROR', message, details);
}

function readPgnTags(pgn) {
  const tags = new Map();
  let remaining = pgn.trimStart();

  while (remaining.startsWith('[')) {
    const match = tagPattern.exec(remaining);
    if (!match || !match[2].trim()) {
      throw validationError('Некорректный заголовок PGN');
    }

    const [header, name, value] = match;
    if (tags.has(name)) {
      throw validationError('Имена тегов PGN не должны повторяться');
    }
    tags.set(name, value);
    remaining = remaining.slice(header.length).trimStart();
  }

  return tags;
}

function validateGameInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw validationError('Тело запроса должно быть JSON-объектом');
  }

  const extraFields = Object.keys(input).filter((field) => field !== 'pgn');
  if (extraFields.length > 0) {
    const details = extraFields.map((field) => ({ field, message: 'Лишнее поле' }));
    throw validationError('В запросе есть лишние поля', details);
  }

  const { pgn } = input;
  if (typeof pgn !== 'string' || !pgn.trim()) {
    throw validationError('Поле pgn должно содержать непустую строку');
  }
  if (pgn.startsWith('\uFEFF') || pgn.includes('\0') || !pgn.isWellFormed()) {
    throw validationError('PGN содержит недопустимые символы');
  }
  if (Buffer.byteLength(pgn, 'utf8') > maxPgnBytes) {
    throw validationError('Размер PGN превышает 128 КиБ');
  }

  const tags = readPgnTags(pgn);
  for (const name of ['White', 'Black', 'Event']) {
    const value = tags.get(name);
    if (value && Array.from(value).length > maxMetadataLength) {
      throw validationError(`Длина тега ${name} превышает ${maxMetadataLength} символов`);
    }
  }

  const date = tags.get('Date') ?? '????.??.??';
  if (!datePattern.test(date)) {
    throw validationError('Тег Date должен иметь формат YYYY.MM.DD');
  }
  const result = tags.get('Result') ?? '*';
  if (!results.includes(result)) {
    throw validationError('Тег Result должен содержать 1-0, 0-1, 1/2-1/2 или *');
  }

  return {
    pgn,
    white: tags.get('White') ?? '?',
    black: tags.get('Black') ?? '?',
    event: tags.get('Event') ?? '?',
    date,
    result,
  };
}

function validatePositiveInteger(value, field, max) {
  const number = typeof value === 'string' && /^[0-9]+$/.test(value) ? Number(value) : 0;
  if (number < 1 || number > max) {
    throw validationError(`Параметр ${field} должен быть целым числом от 1 до ${max}`);
  }
  return number;
}

function requireGame(game) {
  if (!game) {
    throw new ApiError(404, 'GAME_NOT_FOUND', 'Партия не найдена');
  }
  return game;
}

export async function getGames({ player = '', page = '1', limit = '20' }) {
  if (typeof player !== 'string' || player.includes('\0') || !player.isWellFormed()) {
    throw validationError('Параметр player должен быть строкой без недопустимых символов');
  }

  const pageNumber = validatePositiveInteger(page, 'page', Number.MAX_SAFE_INTEGER);
  const pageSize = validatePositiveInteger(limit, 'limit', 100);
  const offset = (BigInt(pageNumber) - 1n) * BigInt(pageSize);
  const { items, total } = await gamesRepository.findGames({
    player: player.trim(),
    limit: pageSize,
    offset,
  });
  return { items, total, page: pageNumber, limit: pageSize };
}

export async function createGame(input) {
  return gamesRepository.createGame(validateGameInput(input));
}

export async function getGameById(value) {
  const id = validatePositiveInteger(value, 'id', maxGameId);
  return requireGame(await gamesRepository.findGameById(id));
}

export async function updateGame(value, input) {
  const id = validatePositiveInteger(value, 'id', maxGameId);
  return requireGame(await gamesRepository.updateGame(id, validateGameInput(input)));
}

export async function deleteGame(value) {
  const id = validatePositiveInteger(value, 'id', maxGameId);
  requireGame(await gamesRepository.deleteGame(id));
}
