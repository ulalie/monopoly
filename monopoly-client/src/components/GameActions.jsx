import React from "react";

export default function GameActions({
  canRollDice,
  canBuyProperty,
  canEndTurn,
  onRollDice,
  onBuyProperty,
  onEndTurn,
}) {
  return (
    <div className="game-actions">
      <button
        onClick={onRollDice}
        disabled={!canRollDice}
        className={`action-button ${canRollDice ? "active" : "disabled"}`}
      >
        Бросить кубики
      </button>

      <button
        onClick={onBuyProperty}
        disabled={!canBuyProperty}
        className={`action-button ${canBuyProperty ? "active" : "disabled"}`}
      >
        Купить собственность
      </button>

      <button
        onClick={onEndTurn}
        disabled={!canEndTurn}
        className={`action-button ${canEndTurn ? "active" : "disabled"}`}
      >
        Завершить ход
      </button>
    </div>
  );
}
