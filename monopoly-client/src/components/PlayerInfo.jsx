// components/PlayerInfo.js
import React from "react";

export default function PlayerInfo({
  player,
  isCurrentPlayer,
  isActivePlayer,
}) {
  return (
    <div
      className={`player-info ${isCurrentPlayer ? "current-player" : ""} ${
        isActivePlayer ? "active-player" : ""
      }`}
    >
      <div
        className="player-color"
        style={{ backgroundColor: player.color }}
      ></div>
      <div className="player-details">
        <div className="player-name">{player.user.username}</div>
        <div className="player-money">${player.money}</div>
        <div className="player-properties">
          Собственность: {player.properties.length}
        </div>
      </div>
    </div>
  );
}
