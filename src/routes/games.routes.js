import { json, Router } from 'express';
import { createGame, deleteGame, getGameById, getGames, updateGame } from '../controllers/games.controller.js';

const router = Router();
const readJson = json({ limit: '1mb' });

router.get('/', getGames);
router.post('/', readJson, createGame);
router.get('/:id', getGameById);
router.put('/:id', readJson, updateGame);
router.delete('/:id', deleteGame);

export default router;
