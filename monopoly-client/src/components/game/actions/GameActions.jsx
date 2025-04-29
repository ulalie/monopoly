import React from "react";


///КРИВАЯ РАБОТА КНОПКИ КУПИТЬ СОБСТВЕННОСТЬ 

 
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
  const buttonStyle = (enabled) => ({
    padding: "12px 20px",
    backgroundColor: enabled ? "#4CAF50" : "#cccccc",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: enabled ? "pointer" : "not-allowed",
    boxShadow: enabled ? "0 2px 5px rgba(0,0,0,0.2)" : "none",
    transition: "all 0.3s ease",
    minWidth: "180px",
    opacity: enabled ? 1 : 0.7
  });

  return (
    <div style={{
      display: "flex",
      gap: "12px",
      padding: "16px",
      backgroundColor: "#f5f5f5",
      borderRadius: "8px",
      flexWrap: "wrap",
      justifyContent: "center"
    }}>
      <button 
        style={buttonStyle(canRollDice)}
        onClick={onRollDice}
        disabled={!canRollDice}
      >
        Бросить кубики
      </button>

      <button 
        style={buttonStyle(canBuyProperty)}
        onClick={onBuyProperty}
        disabled={!canBuyProperty}
      >
        Купить собственность
      </button>

      <button 
        style={buttonStyle(canEndTurn)}
        onClick={onEndTurn}
        disabled={!canEndTurn}
      >
        Завершить ход
      </button>

      {canTrade && (
        <button 
          style={buttonStyle(true)}
          onClick={onOpenTradeModal}
        >
          Предложить обмен
        </button>
      )}
    </div>
  );
};

export default GameActions;
