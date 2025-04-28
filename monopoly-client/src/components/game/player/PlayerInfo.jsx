import React from "react";

export default function PlayerInfo({
  player,
  isCurrentPlayer,
  isActivePlayer,
}) {
  return (
    <div
      className={`player-card ${isCurrentPlayer ? "current-player" : ""} ${
        isActivePlayer ? "active-player" : ""
      }`}
    >
      <div className="player-name">
        <span 
          className="player-color-indicator" 
          style={{ backgroundColor: player.color }}
        ></span>
        {player.user.username}
        {isActivePlayer && 
          <span className="active-marker"> (ходит)</span>}
      </div>
      
      <div className="player-stats">
        <div className="player-money">${player.money}</div>
        <div className="player-position">Позиция: {player.position}</div>
      </div>
      
      {player.properties.length > 0 && (
        <div className="player-properties">
          Собственность: {player.properties.length} шт.
        </div>
      )}
    </div>
  );
}