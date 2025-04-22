import React from "react";

const GameActions = ({
  canRollDice,
  canBuyProperty,
  canEndTurn,
  onRollDice,
  onBuyProperty,
  onEndTurn,
  canTrade,
  onOpenTradeModal
}) => {
  return (
    <div className="game-actions">
      <button 
        className={`action-button ${canRollDice ? 'active' : 'disabled'}`}
        onClick={onRollDice} 
        disabled={!canRollDice}
      >
        Бросить кубики
      </button>
      
      <button 
        className={`action-button ${canBuyProperty ? 'active' : 'disabled'}`}
        onClick={onBuyProperty}
        disabled={!canBuyProperty}
      >
        Купить собственность
      </button>
      
      <button 
        className={`action-button ${canEndTurn ? 'active' : 'disabled'}`}
        onClick={onEndTurn}
        disabled={!canEndTurn}
      >
        Завершить ход
      </button>
      
      {canTrade && (
        <button 
          className="action-button trade-button"
          onClick={onOpenTradeModal}
        >
          Предложить обмен
        </button>
      )}
    </div>
  );
};

export default GameActions;