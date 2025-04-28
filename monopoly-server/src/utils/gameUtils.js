function handleSpecialSquare(game, player, property) {
  let playerName;
  if (player.isBot) {
    playerName = player.botName || "Бот";
  } else if (typeof player.user === 'object' && player.user.username) {
    playerName = player.user.username;
  } else {
    playerName = "Игрок";
  }
  
  switch (property.id) {
    case 0: // СТАРТ
      // Уже обработано при прохождении через СТАРТ
      break;
    case 10: // Посещение тюрьмы
      // Ничего не происходит при простом посещении
      game.chat.push({
        message: `${playerName} посетил тюрьму`,
        timestamp: new Date(),
      });
      break;
    case 20: // Бесплатная парковка
      // В некоторых вариантах правил здесь игрок получает деньги из центра
      game.chat.push({
        message: `${playerName} отдыхает на бесплатной парковке`,
        timestamp: new Date(),
      });
      break;
    case 30: // Отправиться в тюрьму
      player.position = 10; // Переместить на клетку тюрьмы
      player.jailStatus = true; // Поместить в тюрьму

      game.chat.push({
        message: `${playerName} отправляется в тюрьму`,
        timestamp: new Date(),
      });
      break;
    default:
      break;
  }
}

function calculateRent(property, game) {
  // Если собственность заложена, аренда не платится
  if (property.mortgaged) return 0;

  // Для железных дорог и коммунальных предприятий особый расчет
  if (property.group === "railroad") {
    // Поиск всех железных дорог, принадлежащих одному владельцу
    const railroadsOwned = game.properties.filter(
      (p) =>
        p.group === "railroad" &&
        p.owner &&
        p.owner.toString() === property.owner.toString()
    ).length;

    // Аренда за железные дороги: 25, 50, 100, 200
    const railroadRents = [25, 50, 100, 200];
    return railroadRents[railroadsOwned - 1];
  }

  if (property.group === "utility") {
    // Поиск всех коммунальных предприятий, принадлежащих одному владельцу
    const utilitiesOwned = game.properties.filter(
      (p) =>
        p.group === "utility" &&
        p.owner &&
        p.owner.toString() === property.owner.toString()
    ).length;

    // Аренда за коммунальные предприятия зависит от броска кубиков
    const diceSum = game.lastDiceRoll ? game.lastDiceRoll.sum : 7; // Используем 7 как среднее значение, если нет броска

    if (utilitiesOwned === 1) {
      return diceSum * 4; // Одно предприятие: 4x бросок кубиков
    } else {
      return diceSum * 10; // Два предприятия: 10x бросок кубиков
    }
  }

  // Для обычных свойств
  // Базовая аренда зависит от количества домов
  const baseRent = property.rent[property.houses];

  // Проверить, владеет ли игрок всей группой (монополия)
  const owner = property.owner;
  const propertiesInGroup = game.properties.filter(
    (p) => p.group === property.group
  );
  const hasMonopoly = propertiesInGroup.every(
    (p) => p.owner && p.owner.toString() === owner.toString()
  );

  // Если это монополия и нет домов, аренда удваивается
  if (hasMonopoly && property.houses === 0) {
    return baseRent * 2;
  }

  return baseRent;
}

export {
  handleSpecialSquare,
  calculateRent
};