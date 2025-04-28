import React from "react";

const TradeOffers = ({ 
  game, 
  currentPlayer, 
  onAcceptTrade, 
  onRejectTrade 
}) => {
  if (!game || !game.trades || !currentPlayer) {
    return null;
  }

  const pendingTrades = game.trades.filter(
    trade => trade.status === "pending" && 
    (String(trade.to) === String(currentPlayer.user._id) || 
     String(trade.from) === String(currentPlayer.user._id))
  );

  if (pendingTrades.length === 0) {
    return null;
  }

  const getPlayerName = (playerId) => {
    const player = game.players.find(p => String(p.user._id) === String(playerId));
    return player ? (player.user.username || "Неизвестный игрок") : "Неизвестный игрок";
  };

  const getPropertyName = (propertyId) => {
    const property = game.properties.find(p => p.id === parseInt(propertyId));
    return property ? property.name : "Неизвестное свойство";
  };

  return (
    <div className="trade-offers">
      <h3>Предложения обмена</h3>
      {pendingTrades.map(trade => (
        <div key={trade.id} className="trade-offer">
          <div className="trade-offer-header">
            <span className="from-player">
              От: {getPlayerName(trade.from)}
            </span>
            <span className="to-player">
              Кому: {getPlayerName(trade.to)}
            </span>
          </div>
          
          <div className="trade-offer-content">
            <div className="trade-offer-column">
              <h4>Предлагает:</h4>
              {trade.offerMoney > 0 && (
                <div className="money-offer">
                  ${trade.offerMoney}
                </div>
              )}
              {trade.offerProperties.length > 0 && (
                <div className="properties-offer">
                  <h5>Свойства:</h5>
                  <ul>
                    {trade.offerProperties.map(propId => (
                      <li key={propId}>{getPropertyName(propId)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {trade.offerProperties.length === 0 && trade.offerMoney === 0 && (
                <div className="no-offer">Ничего</div>
              )}
            </div>
            
            <div className="trade-offer-column">
              <h4>Запрашивает:</h4>
              {trade.requestMoney > 0 && (
                <div className="money-offer">
                  ${trade.requestMoney}
                </div>
              )}
              {trade.requestProperties.length > 0 && (
                <div className="properties-offer">
                  <h5>Свойства:</h5>
                  <ul>
                    {trade.requestProperties.map(propId => (
                      <li key={propId}>{getPropertyName(propId)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {trade.requestProperties.length === 0 && trade.requestMoney === 0 && (
                <div className="no-offer">Ничего</div>
              )}
            </div>
          </div>
          
          <div className="trade-offer-actions">
            {String(trade.to) === String(currentPlayer.user._id) ? (
              <>
                <button 
                  className="accept-button"
                  onClick={() => onAcceptTrade(trade.id)}
                >
                  Принять
                </button>
                <button 
                  className="reject-button"
                  onClick={() => onRejectTrade(trade.id)}
                >
                  Отклонить
                </button>
              </>
            ) : (
              <button 
                className="cancel-button"
                onClick={() => onRejectTrade(trade.id)}
              >
                Отменить предложение
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TradeOffers;