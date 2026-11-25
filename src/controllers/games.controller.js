import * as gamesService from '../services/games.service.js';

export async function getGames(req, res) {
  const games = await gamesService.getGames(req.query);
  res.json(games);
}

export async function createGame(req, res) {
  const game = await gamesService.createGame(req.body);
  res.status(201).json(game);
}

export async function getGameById(req, res) {
  const game = await gamesService.getGameById(req.params.id);
  res.json(game);
}

export async function updateGame(req, res) {
  const game = await gamesService.updateGame(req.params.id, req.body);
  res.json(game);
}

export async function deleteGame(req, res) {
  await gamesService.deleteGame(req.params.id);
  res.status(204).end();
}
