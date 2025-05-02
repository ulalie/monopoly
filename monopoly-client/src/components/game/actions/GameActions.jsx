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
  // Style for the buttons with consistent width
  const buttonStyle = (enabled) => ({
    padding: "12px 16px",
    backgroundColor: enabled ? "oklch(0.696 0.17 162.48)" : "#cccccc",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: enabled ? "pointer" : "not-allowed",
    boxShadow: enabled ? "0 2px 5px rgba(0,0,0,0.2)" : "none",
    transition: "all 0.3s ease",
    width: "100%", // Make all buttons take full width of container
    marginBottom: "8px",
    opacity: enabled ? 1 : 0.7,
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  });

  return (
    <div style={{
      display: "flex",
      flexDirection: "column", // Stack buttons vertically
      gap: "8px",
      width: "100%", // Take full width of parent container
      backgroundColor: "transparent", // Changed to fit with sidebar
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