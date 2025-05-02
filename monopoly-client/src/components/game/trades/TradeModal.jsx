import React, { useState, useEffect } from "react";

const TradeModal = ({ 
  isOpen, 
  onClose, 
  game, 
  currentPlayer, 
  onProposeTrade 
}) => {
  console.log("TradeModal рендерится, isOpen:", isOpen);
  
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [offerProperties, setOfferProperties] = useState([]);
  const [requestProperties, setRequestProperties] = useState([]);
  const [offerMoney, setOfferMoney] = useState(0);
  const [requestMoney, setRequestMoney] = useState(0);
  const [error, setError] = useState("");
  const [availablePlayers, setAvailablePlayers] = useState([]);

  useEffect(() => {
    if (isOpen) {
      console.log("TradeModal: useEffect запущен, isOpen = true");
      setSelectedPlayer(null);
      setOfferProperties([]);
      setRequestProperties([]);
      setOfferMoney(0);
      setRequestMoney(0);
      setError("");
      
      if (game && game.players && currentPlayer) {
        const others = game.players.filter(player => {
          if (player.user && 
              currentPlayer.user && 
              String(player.user._id) === String(currentPlayer.user._id)) {
            return false;
          }
          return true; 
        });
        
        console.log("Доступные игроки для обмена:", others);
        setAvailablePlayers(others);
        
        if (others.length === 0) {
          setError("Нет доступных игроков для обмена.");
        }
      }
    }
  }, [isOpen, game, currentPlayer]);
  
  if (!isOpen) {
    console.log("TradeModal: isOpen = false, возвращаем null");
    return null;
  }

  const myProperties = game.properties.filter(property => 
    property.owner && 
    String(property.owner) === String(currentPlayer.user._id) &&
    property.houses === 0 && 
    !property.mortgaged 
  );

  const selectedPlayerProperties = selectedPlayer 
    ? game.properties.filter(property => {
        const ownerId = selectedPlayer.isBot 
          ? selectedPlayer.user._id 
          : (selectedPlayer.user && selectedPlayer.user._id);
          
        return property.owner && 
          String(property.owner) === String(ownerId) &&
          property.houses === 0 && 
          !property.mortgaged; 
      }) 
    : [];

  const handlePlayerSelect = (playerId) => {
    console.log("Выбран игрок с ID:", playerId);
    
    if (!playerId) {
      setSelectedPlayer(null);
      setRequestProperties([]);
      return;
    }
    
    const player = game.players.find(p => {
      if (p.isBot) {
        return p.botId === playerId || (p.user && String(p.user._id) === String(playerId));
      }
      return p.user && String(p.user._id) === String(playerId);
    });
    
    if (player) {
      console.log("Найден игрок:", player);
      setSelectedPlayer(player);
      setRequestProperties([]);
    } else {
      console.error("Игрок не найден по ID:", playerId);
      setError("Не удалось найти выбранного игрока");
    }
  };

  const toggleOfferProperty = (propertyId) => {
    console.log("Переключение предлагаемого свойства:", propertyId);
    if (offerProperties.includes(propertyId)) {
      setOfferProperties(offerProperties.filter(id => id !== propertyId));
    } else {
      setOfferProperties([...offerProperties, propertyId]);
    }
  };

  const toggleRequestProperty = (propertyId) => {
    console.log("Переключение запрашиваемого свойства:", propertyId);
    if (requestProperties.includes(propertyId)) {
      setRequestProperties(requestProperties.filter(id => id !== propertyId));
    } else {
      setRequestProperties([...requestProperties, propertyId]);
    }
  };

  const handleProposeTrade = () => {
    if (!selectedPlayer) {
      setError("Выберите игрока для обмена");
      return;
    }

    if (offerProperties.length === 0 && requestProperties.length === 0 && offerMoney === 0 && requestMoney === 0) {
      setError("Выберите что-то для обмена");
      return;
    }

    if (offerMoney > currentPlayer.money) {
      setError("У вас недостаточно денег для предложения");
      return;
    }

    if (requestMoney > (selectedPlayer.money || 0)) {
      setError("У выбранного игрока недостаточно денег");
      return;
    }

    onProposeTrade({
      toPlayerId: selectedPlayer.user._id,
      offerProperties,
      requestProperties,
      offerMoney: parseInt(offerMoney) || 0,
      requestMoney: parseInt(requestMoney) || 0,
      isToBot: selectedPlayer.isBot, 
      botIndex: selectedPlayer.isBot ? game.players.indexOf(selectedPlayer) : null,
      botName: selectedPlayer.isBot ? selectedPlayer.botName : null,
    });
  };

  const noAvailablePlayers = availablePlayers.length === 0;

  return (
    <div className="fixed inset-0 bg-neutral-600/70 backdrop-blur-sm flex items-center justify-center z-40">
      <div className="bg-white dark:bg-gray-800 w-11/12 max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-auto p-8 dark:text-white border border-emerald-100 dark:border-emerald-900/20">
        <div className="flex justify-between items-center border-b border-emerald-100 dark:border-emerald-800/30 pb-4 mb-6">
          <h3 className="m-0 text-xl font-semibold text-neutral-700 dark:text-emerald-400">Предложить обмен</h3>
          <button 
            className="bg-transparent border-0 text-2xl cursor-pointer text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-xl mb-6 border-l-4 border-red-400 animate-pulse">
              {error}
            </div>
          )}

          {noAvailablePlayers ? (
            <div className="text-neutral-600 dark:text-neutral-300 p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-xl mb-6">
              <p className="text-lg">Нет доступных игроков для обмена.</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block mb-2 text-neutral-700 dark:text-neutral-300 font-medium">Выберите игрока для обмена:</label>
                <select 
                  className="w-full p-3 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-base dark:bg-gray-700 focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-700 focus:outline-none transition-shadow"
                  value={selectedPlayer ? game.players.indexOf(selectedPlayer) : ""}
                  onChange={(e) => handlePlayerSelect(e.target.value)}
                >
                  <option value=""> Выберите игрока </option>
                  {availablePlayers.map((player, index) => (
                    <option 
                      key={player.isBot ? `bot-${index}` : player.user._id} 
                      value={player.isBot ? player.user._id : player.user._id}
                    >
                      {player.isBot ? `${player.botName || "Бот"}` : player.user.username}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlayer && (
                <div className="flex flex-wrap gap-6 mb-6">
                  <div className="flex-1 min-w-[250px] dark:bg-emerald-900/20 rounded-xl p-5 shadow-md">
                    <h4 className="font-semibold mb-4 text-emerald-700 dark:text-emerald-400 text-lg">Ваше предложение</h4>
                    <div className="mb-4">
                      <label className="block mb-2 font-medium text-neutral-700 dark:text-neutral-300">Деньги:</label>
                      <input 
                        type="number" 
                        min="0" 
                        max={currentPlayer.money}
                        value={offerMoney}
                        onChange={(e) => setOfferMoney(e.target.value)}
                        className="w-full p-3 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-base dark:bg-gray-700 focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-700 focus:outline-none transition-shadow"
                      />
                    </div>
                    <div className="mt-4">
                      <h5 className="font-medium mb-2 text-neutral-700 dark:text-neutral-300">Ваши свойства:</h5>
                      {myProperties.length === 0 ? (
                        <p className="text-neutral-500 dark:text-neutral-400 p-3 bg-white/50 dark:bg-black/10 rounded-lg">У вас нет доступных свойств для обмена</p>
                      ) : (
                        <ul className="list-none p-0 m-0 max-h-[200px] overflow-y-auto space-y-2 pr-1">
                          {myProperties.map(property => (
                            <li 
                              key={property.id} 
                              onClick={() => toggleOfferProperty(property.id)}
                              className={`flex items-center p-3 rounded-lg cursor-pointer border transition-all ${
                                offerProperties.includes(property.id) 
                                  ? 'bg-emerald-100 dark:bg-emerald-800/40 border-emerald-300 dark:border-emerald-700 shadow-sm' 
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800/70'
                              }`}
                            >
                              <input 
                                type="checkbox" 
                                checked={offerProperties.includes(property.id)}
                                onChange={() => {}} 
                                className="mr-3 h-5 w-5 accent-emerald-500"
                              />
                              <span className="font-medium">{property.name}</span>
                              <span 
                                className={`inline-block w-3 h-3 rounded-full ml-2.5`}
                                style={{ backgroundColor: getGroupColor(property.group) }}
                              ></span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-[250px] dark:bg-emerald-900/20 rounded-xl p-5 shadow-md">
                    <h4 className="font-semibold mb-4 text-emerald-700 dark:text-emerald-400 text-lg">Вы запрашиваете</h4>
                    <div className="mb-4">
                      <label className="block mb-2 font-medium text-neutral-700 dark:text-neutral-300">Деньги:</label>
                      <input 
                        type="number" 
                        min="0" 
                        max={selectedPlayer.money || 0}
                        value={requestMoney}
                        onChange={(e) => setRequestMoney(e.target.value)}
                        className="w-full p-3 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-base dark:bg-gray-700 focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-700 focus:outline-none transition-shadow"
                      />
                    </div>
                    <div className="mt-4">
                      <h5 className="font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                        Свойства {selectedPlayer.isBot ? (selectedPlayer.botName || "Бота") : selectedPlayer.user.username}:
                      </h5>
                      {selectedPlayerProperties.length === 0 ? (
                        <p className="text-neutral-500 dark:text-neutral-400 p-3 bg-white/50 dark:bg-black/10 rounded-lg">У игрока нет доступных свойств для обмена</p>
                      ) : (
                        <ul className="list-none p-0 m-0 max-h-[200px] overflow-y-auto space-y-2 pr-1">
                          {selectedPlayerProperties.map(property => (
                            <li 
                              key={property.id} 
                              onClick={() => toggleRequestProperty(property.id)}
                              className={`flex items-center p-3 rounded-lg cursor-pointer border transition-all ${
                                requestProperties.includes(property.id) 
                                  ? 'bg-emerald-100 dark:bg-emerald-800/40 border-emerald-300 dark:border-emerald-700 shadow-sm' 
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800/70'
                              }`}
                            >
                              <input 
                                type="checkbox" 
                                checked={requestProperties.includes(property.id)}
                                onChange={() => {}} 
                                className="mr-3 h-5 w-5 accent-emerald-500"
                              />
                              <span className="font-medium">{property.name}</span>
                              <span 
                                className={`inline-block w-3 h-3 rounded-full ml-2.5`}
                                style={{ backgroundColor: getGroupColor(property.group) }}
                              ></span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedPlayer && selectedPlayer.isBot && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-xl mt-6 mb-4 text-sm">
                  <p className="text-neutral-700 dark:text-neutral-300"><strong>Примечание:</strong> Боты принимают решение о принятии сделки в зависимости от её выгодности и некоторого элемента случайности.</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-emerald-100 dark:border-emerald-800/30">
          <button 
            className="px-6 py-3 bg-neutral-500 hover:bg-neutral-600 text-white rounded-xl font-medium transition-colors shadow-sm hover:shadow"
            onClick={onClose}
          >
            Отмена
          </button>
          <button 
            className={`px-6 py-3 ${
              (!selectedPlayer || noAvailablePlayers) 
                ? 'bg-neutral-300 cursor-not-allowed dark:bg-neutral-700' 
                : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 shadow-md hover:shadow-lg'
            } text-white rounded-xl font-medium transition-all`}
            onClick={handleProposeTrade} 
            disabled={!selectedPlayer || noAvailablePlayers}
          >
            Предложить обмен
          </button>
        </div>
      </div>
    </div>
  );
};

const getGroupColor = (group) => {
  switch(group) {
    case "brown": return "#8B4513";
    case "light-blue": return "#87CEEB";
    case "pink": return "#FF69B4";
    case "orange": return "#FFA500";
    case "red": return "#FF0000";
    case "yellow": return "#FFFF00";
    case "green": return "#008000";
    case "blue": return "#0000FF";
    case "railroad": return "#000000";
    case "utility": return "#C0C0C0";
    default: return "#FFFFFF";
  }
};

export default TradeModal;