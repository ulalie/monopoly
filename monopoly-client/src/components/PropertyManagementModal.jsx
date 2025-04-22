import React, { useState } from "react";

const PropertyManagementModal = ({ 
  isOpen, 
  onClose, 
  property,
  game,
  currentPlayer,
  onBuildHouse,
  onMortgageProperty,
  onUnmortgageProperty
}) => {
  const [error, setError] = useState("");

  const getHouseCost = () => {
    switch (property?.group) {
      case "brown":
      case "light-blue":
        return 50;
      case "pink":
      case "orange":
        return 100;
      case "red":
      case "yellow":
        return 150;
      case "green":
      case "blue":
        return 200;
      default:
        return 0;
    }
  };
  
  const ownsFullGroup = () => {
    if (!property || !game || !currentPlayer) return false;
    
    const propertiesInGroup = game.properties.filter(p => p.group === property.group);
    return propertiesInGroup.every(p => 
      p.owner && String(p.owner) === String(currentPlayer.user._id)
    );
  };
  
  const canBuildHouse = () => {
    if (!property || !currentPlayer) return false;
    
    if (property.type !== "property" || !["brown", "light-blue", "pink", "orange", "red", "yellow", "green", "blue"].includes(property.group)) {
      return false;
    }
    
    if (!ownsFullGroup()) return false;
    
    if (property.houses >= 5) return false;
    
    if (property.mortgaged) return false;
    
    if (currentPlayer.money < getHouseCost()) return false;
    
    const propertiesInGroup = game.properties.filter(p => p.group === property.group);
    const minHousesInGroup = Math.min(...propertiesInGroup.map(p => p.houses));
    
    return property.houses <= minHousesInGroup;
  };
  
  const canMortgage = () => {
    if (!property || !currentPlayer) return false;
    
    if (String(property.owner) !== String(currentPlayer.user._id)) return false;
    
    if (property.mortgaged) return false;
    
    return property.houses === 0;
  };
  
  const canUnmortgage = () => {
    if (!property || !currentPlayer) return false;
    
    if (String(property.owner) !== String(currentPlayer.user._id)) return false;
    
    if (!property.mortgaged) return false;
    
    const unmortgageAmount = Math.floor((property.price / 2) * 1.1);
    return currentPlayer.money >= unmortgageAmount;
  };
  
  const handleBuildHouse = () => {
    if (!canBuildHouse()) {
      setError("Невозможно построить дом на этой собственности");
      return;
    }
    
    onBuildHouse(property.id);
    onClose();
  };
  
  const handleMortgage = () => {
    if (!canMortgage()) {
      setError("Невозможно заложить эту собственность");
      return;
    }
    
    onMortgageProperty(property.id);
    onClose();
  };
  
  const handleUnmortgage = () => {
    if (!canUnmortgage()) {
      setError("Невозможно выкупить эту собственность");
      return;
    }
    
    onUnmortgageProperty(property.id);
    onClose();
  };
  
  if (!isOpen || !property) return null;
  
  const isOwnedByCurrentPlayer = 
    property.owner && 
    currentPlayer && 
    String(property.owner) === String(currentPlayer.user._id);
  
  const isRailroad = property.group === "railroad";
  const isUtility = property.group === "utility";
  const isRegularProperty = !isRailroad && !isUtility && property.type === "property";
  
  const unmortgageAmount = Math.floor((property.price / 2) * 1.1);
  
  const getOwnerName = () => {
    if (!property.owner) return "Нет владельца";
    
    const ownerPlayer = game.players.find(p => 
      p.user && String(p.user._id) === String(property.owner)
    );
    
    return ownerPlayer 
      ? (ownerPlayer.isBot ? ownerPlayer.botName : ownerPlayer.user.username)
      : "Неизвестный владелец";
  };

  return (
    <div className="property-modal-backdrop">
      <div className="property-modal">
        <div className="property-modal-header">
          <h3>Управление собственностью</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="property-modal-body">
          {error && <div className="property-error">{error}</div>}
          
          <div className="property-details">
            <h4>{property.name}</h4>
            
            <div className="property-info">
              <p><strong>Тип:</strong> {
                isRailroad ? "Железная дорога" : 
                isUtility ? "Коммунальное предприятие" : 
                "Собственность"
              }</p>
              <p><strong>Стоимость:</strong> ${property.price}</p>
              <p><strong>Владелец:</strong> {getOwnerName()}</p>
              
              {isRegularProperty && (
                <>
                  <p><strong>Группа:</strong> {property.group}</p>
                  <p><strong>Домов:</strong> {property.houses === 5 ? "Отель" : property.houses}</p>
                  <p><strong>Рента:</strong> ${property.rent && property.rent[property.houses]}</p>
                </>
              )}
              
              {property.mortgaged && (
                <p className="mortgaged-badge">Заложена</p>
              )}
            </div>
            
            {isOwnedByCurrentPlayer && (
              <div className="property-actions">
                <h5>Действия</h5>
                
                {isRegularProperty && canBuildHouse() && (
                  <div className="action-item">
                    <p>Построить {property.houses === 4 ? "отель" : "дом"} (${getHouseCost()})</p>
                    <button 
                      onClick={handleBuildHouse}
                      className="action-button build-button"
                    >
                      Построить
                    </button>
                  </div>
                )}
                
                {canMortgage() && (
                  <div className="action-item">
                    <p>Заложить собственность (получить ${Math.floor(property.price / 2)})</p>
                    <button 
                      onClick={handleMortgage}
                      className="action-button mortgage-button"
                    >
                      Заложить
                    </button>
                  </div>
                )}
                
                {canUnmortgage() && (
                  <div className="action-item">
                    <p>Выкупить собственность (заплатить ${unmortgageAmount})</p>
                    <button 
                      onClick={handleUnmortgage}
                      className="action-button unmortgage-button"
                    >
                      Выкупить
                    </button>
                  </div>
                )}
                
                {!canBuildHouse() && !canMortgage() && !canUnmortgage() && (
                  <p className="no-actions">Нет доступных действий для этой собственности</p>
                )}
              </div>
            )}
            
            {!isOwnedByCurrentPlayer && (
              <p className="not-owner-message">
                Вы не являетесь владельцем этой собственности и не можете управлять ею.
              </p>
            )}
          </div>
        </div>

        <div className="property-modal-footer">
          <button onClick={onClose} className="cancel-button">Закрыть</button>
        </div>
      </div>
    </div>
  );
};

export default PropertyManagementModal;