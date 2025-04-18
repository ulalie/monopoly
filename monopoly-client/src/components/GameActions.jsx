import React from "react";

export default function GameActions({
  canRollDice,
  canBuyProperty,
  canEndTurn,
  onRollDice,
  onBuyProperty,
  onEndTurn,
}) {
  console.log("Состояние кнопок:", { canRollDice, canBuyProperty, canEndTurn });

  return (
    <div className="game-actions" style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '10px',
      marginTop: '20px'
    }}>
      <button
        onClick={canRollDice ? onRollDice : undefined}
        disabled={!canRollDice}
        className={`action-button ${canRollDice ? "active" : "disabled"}`}
        style={{
          padding: '10px 16px',
          backgroundColor: canRollDice ? '#5D5CDE' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: canRollDice ? 'pointer' : 'not-allowed',
          fontWeight: 'bold'
        }}
      >
        Бросить кубики
      </button>

      <button
        onClick={canBuyProperty ? onBuyProperty : undefined}
        disabled={!canBuyProperty}
        className={`action-button ${canBuyProperty ? "active" : "disabled"}`}
        style={{
          padding: '10px 16px',
          backgroundColor: canBuyProperty ? '#5D5CDE' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: canBuyProperty ? 'pointer' : 'not-allowed',
          fontWeight: 'bold'
        }}
      >
        Купить собственность
      </button>

      <button
        onClick={canEndTurn ? onEndTurn : undefined}
        disabled={!canEndTurn}
        className={`action-button ${canEndTurn ? "active" : "disabled"}`}
        style={{
          padding: '10px 16px',
          backgroundColor: canEndTurn ? '#5D5CDE' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: canEndTurn ? 'pointer' : 'not-allowed',
          fontWeight: 'bold'
        }}
      >
        Завершить ход
      </button>
    </div>
  );
}