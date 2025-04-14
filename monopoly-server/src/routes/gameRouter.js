import Router from "express";
const router = new Router();
import gameController from "../controllers/gameController.js";
const {
  createGame,
  getAllGames,
  getGameById,
  joinGame,
  leaveGame,
  startGame,
  rollDice,
  buyProperty,
  endTurn,
  payRent,
  mortgageProperty,
  unmortgageProperty,
  buildHouse,
  proposeTrade,
  acceptTrade,
  rejectTrade,
  sendChatMessage,
} = gameController;
import authMiddleware from "../middleware/authMiddleware.js";

router.post("/create", authMiddleware, createGame);
router.get("/list", getAllGames);
router.get("/:id", getGameById);
router.post("/:id/join", authMiddleware, joinGame);
router.post("/:id/leave", authMiddleware, leaveGame);
router.post("/:id/start", authMiddleware, startGame);

router.post("/:id/roll-dice", authMiddleware, rollDice);
router.post("/:id/buy-property", authMiddleware, buyProperty);
router.post("/:id/end-turn", authMiddleware, endTurn);
router.post("/:id/pay-rent", authMiddleware, payRent);
router.post("/:id/mortgage", authMiddleware, mortgageProperty);
router.post("/:id/unmortgage", authMiddleware, unmortgageProperty);
router.post("/:id/build", authMiddleware, buildHouse);
router.post("/:id/trade", authMiddleware, proposeTrade);
router.post("/:id/trade/:tradeId/accept", authMiddleware, acceptTrade);
router.post("/:id/trade/:tradeId/reject", authMiddleware, rejectTrade);
router.post("/:id/chat", authMiddleware, sendChatMessage);

export default router;
