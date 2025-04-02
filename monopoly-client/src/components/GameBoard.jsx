import React, { useState } from "react";

export default function GameBoard() {
  const [gameState] = useState({
    players: [
      {
        _id: 1,
        username: "Игрок1",
        color: "#FF0000",
        money: 1500,
      },
      {
        _id: 2,
        username: "Игрок2",
        color: "#00FF00",
        money: 1450,
      },
    ],
    currentPlayer: 0,
  });

  const handleRollDice = () => {
    alert("Бросок кубиков (заглушка)");
  };

  return (
    <div>
      <div>
        {gameState.players.map((player) => (
          <div
            key={player._id}
            style={{ display: "flex", alignItems: "center", margin: "5px 0" }}
          >
            <div
              style={{
                backgroundColor: player.color,
                padding: "10px",
                borderRadius: "5px",
                color: "#ffffff",
              }}
            >
              <span>{player.username}</span>
              <span style={{ marginLeft: "10px" }}>${player.money}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="board-container">
        {/* Заглушка игрового поля */}
        <div
          className="board-placeholder"
          style={{
            padding: "20px",
            border: "1px dashed #000",
            textAlign: "center",
          }}
        >
          Игровое поле (в разработке)
        </div>
      </div>

      <div className="controls" style={{ marginTop: "20px" }}>
        <button onClick={handleRollDice}>Бросить кубики</button>
      </div>
    </div>
  );
}
