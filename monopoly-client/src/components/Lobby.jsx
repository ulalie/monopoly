import React, { useState } from "react";

export default function Lobby() {
  const [games] = useState([
    {
      _id: "4",
      name: "Игра с ботами",
      players: [{}, {}, {}],
      maxPlayers: 4,
      gameType: "with-bots",
      status: "active",
    },
    {
      _id: "5",
      name: "Турнирная игра",
      players: [],
      maxPlayers: 2,
      gameType: "tournament",
      status: "waiting",
    },
  ]);

  return (
    <div>
      <h2>Доступные игры</h2>
      <div>
        {games.map((game) => (
          <div key={game._id}>
            <h3>{game.name}</h3>
            <p>
              Игроков: {game.players.length}/{game.maxPlayers}
            </p>
            <button>Присоединиться</button>
          </div>
        ))}
      </div>
    </div>
  );
}
