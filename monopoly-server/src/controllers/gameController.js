import Game from "../models/Game.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import bcrypt from "bcryptjs"; 

// Карты "Шанс"
const chanceCards = [
  { id: 1, text: "Штраф за превышение скорости: заплатите 15$", action: (player) => { player.money -= 15; return `${player.user.username} заплатил штраф 15$`; } },
  { id: 2, text: "Банк выплачивает вам дивиденды: получите 50$", action: (player) => { player.money += 50; return `${player.user.username} получил 50$ дивидендов`; } },
  { id: 3, text: "Вы выиграли конкурс красоты: получите 100$", action: (player) => { player.money += 100; return `${player.user.username} получил 100$ за победу в конкурсе`; } },
  { id: 4, text: "Переместитесь на СТАРТ", action: (player) => { player.position = 0; player.money += 200; return `${player.user.username} переместился на СТАРТ и получил 200$`; } },
  { id: 5, text: "Переместитесь на Парк Горького", action: (player) => { player.position = 13; return `${player.user.username} переместился на Парк Горького`; } },
  { id: 6, text: "Переместитесь на Проспект Независимости", action: (player) => { player.position = 26; return `${player.user.username} переместился на Проспект Независимости`; } },
  { id: 7, text: "Отправляйтесь в тюрьму", action: (player) => { player.position = 10; player.jailStatus = true; return `${player.user.username} отправляется в тюрьму`; } },
  { id: 8, text: "Оплатите ремонт всех ваших домов: 25$ за дом, 100$ за отель", action: (player, game) => { 
    let cost = 0;
    let houses = 0;
    let hotels = 0;
    
    // Считаем дома и отели
    game.properties.forEach(property => {
      if (property.owner && property.owner.toString() === player.user.toString()) {
        if (property.houses === 5) hotels++;
        else houses += property.houses;
      }
    });
    
    cost = (houses * 25) + (hotels * 100);
    player.money -= cost;
    return `${player.user.username} заплатил ${cost}$ за ремонт (${houses} домов, ${hotels} отелей)`;
  }},
  { id: 9, text: "Вы были избраны председателем правления: получите 50$", action: (player) => { player.money += 50; return `${player.user.username} получил 50$ как председатель правления`; } },
  { id: 10, text: "Срок платежа по кредиту: заплатите 150$", action: (player) => { player.money -= 150; return `${player.user.username} заплатил 150$ по кредиту`; } }
];

// Карты "Общественная казна"
const communityCards = [
  { id: 1, text: "Возврат налога: получите 20$", action: (player) => { player.money += 20; return `${player.user.username} получил возврат налога 20$`; } },
  { id: 2, text: "Ошибка банка в вашу пользу: получите 200$", action: (player) => { player.money += 200; return `${player.user.username} получил 200$ из-за ошибки банка`; } },
  { id: 3, text: "Оплата врача: заплатите 50$", action: (player) => { player.money -= 50; return `${player.user.username} заплатил 50$ за лечение`; } },
  { id: 4, text: "Продажа акций: получите 50$", action: (player) => { player.money += 50; return `${player.user.username} получил 50$ от продажи акций`; } },
  { id: 5, text: "Выигрыш в лотерею: получите 100$", action: (player) => { player.money += 100; return `${player.user.username} выиграл 100$ в лотерею`; } },
  { id: 6, text: "Оплата страховки: заплатите 50$", action: (player) => { player.money -= 50; return `${player.user.username} заплатил 50$ за страховку`; } },
  { id: 7, text: "Наследство: получите 100$", action: (player) => { player.money += 100; return `${player.user.username} получил 100$ по наследству`; } },
  { id: 8, text: "Оплата учебы: заплатите 100$", action: (player) => { player.money -= 100; return `${player.user.username} заплатил 100$ за обучение`; } },
  { id: 9, text: "Консультационные услуги: получите 25$", action: (player) => { player.money += 25; return `${player.user.username} получил 25$ за консультацию`; } },
  { id: 10, text: "Отправляйтесь в тюрьму", action: (player) => { player.position = 10; player.jailStatus = true; return `${player.user.username} отправляется в тюрьму`; } }
];

// Функция для получения случайной карты из колоды
function drawCard(deck) {
  const randomIndex = Math.floor(Math.random() * deck.length);
  return deck[randomIndex];
}

// Функция для обработки приземления на собственность
async function processPropertyLanding(game, currentPlayer, landedProperty) {
  console.log(`[processPropertyLanding] Игрок приземлился на ${landedProperty ? landedProperty.name : 'неизвестное поле'}`);
  
  if (!landedProperty) return;

  // Обработка в зависимости от типа клетки
  switch (landedProperty.type) {
    case "property":
    case "railroad":
    case "utility":
      if (landedProperty.owner && 
          landedProperty.owner.toString() !== currentPlayer.user._id.toString() &&
          !landedProperty.mortgaged) {
        
        // Находим владельца собственности среди игроков
        const ownerPlayer = game.players.find(p => 
          p.user._id.toString() === landedProperty.owner.toString()
        );
        
        if (!ownerPlayer) {
          console.log("[processPropertyLanding] Владелец не найден:", landedProperty.owner);
          break;
        }

        // Рассчитываем арендную плату
        const rentAmount = calculateRent(landedProperty, game);
        
        // Проверяем, может ли игрок заплатить аренду сразу
        if (currentPlayer.money >= rentAmount) {
          // Автоматическая оплата аренды
          currentPlayer.money -= rentAmount;
          ownerPlayer.money += rentAmount;
          
          // Добавляем сообщение в чат
          game.chat.push({
            message: `${currentPlayer.user.username} заплатил ${rentAmount}$ игроку ${ownerPlayer.user.username} за аренду ${landedProperty.name}`,
            timestamp: new Date()
          });
          
          console.log(`[processPropertyLanding] Оплачена аренда: ${rentAmount}$`);
        } else {
          // Создаем ожидающий платеж
          game.paymentPending = {
            from: currentPlayer.user._id,
            to: landedProperty.owner,
            amount: rentAmount,
            propertyId: landedProperty.id
          };
          
          game.chat.push({
            message: `${currentPlayer.user.username} должен заплатить ${rentAmount}$ за аренду ${landedProperty.name}`,
            timestamp: new Date()
          });
          
          console.log(`[processPropertyLanding] Создан ожидающий платеж: ${rentAmount}$`);
        }
      }
      break;
      
    case "chance":
      const chanceCard = drawCard(chanceCards);
      
      // Сначала добавляем сообщение о вытянутой карте
      game.chat.push({
        message: `${currentPlayer.user.username} вытянул карту "Шанс": ${chanceCard.text}`,
        timestamp: new Date()
      });
      
      // Выполняем действие карты
      if (typeof chanceCard.action === 'function') {
        try {
          const actionResult = chanceCard.action(currentPlayer, game);
          
          // Добавляем сообщение о результате действия карты
          if (actionResult) {
            game.chat.push({
              message: actionResult,
              timestamp: new Date()
            });
          }
          
          // Если игрок попал на новое поле, обрабатываем это поле
          const newProperty = game.properties.find(p => p.id === currentPlayer.position);
          if (newProperty && newProperty.id !== landedProperty.id) {
            await processPropertyLanding(game, currentPlayer, newProperty);
          }
        } catch (error) {
          console.error("[processPropertyLanding] Ошибка при выполнении действия карты Шанс:", error);
        }
      }
      break;
      
    case "community":
      const communityCard = drawCard(communityCards);
      
      // Сначала добавляем сообщение о вытянутой карте
      game.chat.push({
        message: `${currentPlayer.user.username} вытянул карту "Общественная казна": ${communityCard.text}`,
        timestamp: new Date()
      });
      
      // Выполняем действие карты
      if (typeof communityCard.action === 'function') {
        try {
          const actionResult = communityCard.action(currentPlayer, game);
          
          // Добавляем сообщение о результате действия карты
          if (actionResult) {
            game.chat.push({
              message: actionResult,
              timestamp: new Date()
            });
          }
          
          // Если игрок попал на новое поле, обрабатываем это поле
          const newProperty = game.properties.find(p => p.id === currentPlayer.position);
          if (newProperty && newProperty.id !== landedProperty.id) {
            await processPropertyLanding(game, currentPlayer, newProperty);
          }
        } catch (error) {
          console.error("[processPropertyLanding] Ошибка при выполнении действия карты Общественная казна:", error);
        }
      }
      break;
      
    case "tax":
      // Обработка клеток налога
      const taxAmount = landedProperty.id === 4 ? 200 : 100; // Подоходный налог или налог на роскошь
      currentPlayer.money -= taxAmount;

      game.chat.push({
        message: `${currentPlayer.user.username} заплатил ${taxAmount}$ налога`,
        timestamp: new Date()
      });
      break;
      
    case "special":
      handleSpecialSquare(game, currentPlayer, landedProperty);
      break;
  }
}

class GameController {
  constructor() {
    // Привязка методов к контексту this
    this.botTurn = this.botTurn.bind(this);
    this.createGame = this.createGame.bind(this);
    this.startGame = this.startGame.bind(this);
    this.joinGame = this.joinGame.bind(this);
    this.endTurn = this.endTurn.bind(this);
  }

async createGame(req, res) {
  try {
    const { name, maxPlayers, gameType, botCount } = req.body;
    const userId = req.user.id;

    // Получаем данные пользователя для правильного отображения имени
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    // Проверка корректности количества ботов
    const actualMaxPlayers = maxPlayers || 4;
    const actualBotCount = botCount || 0;
    
    if (actualBotCount >= actualMaxPlayers) {
      return res.status(400).json({ 
        message: "Количество ботов должно быть меньше максимального количества игроков" 
      });
    }

    const newGame = new Game({
      name,
      creator: userId,
      maxPlayers: actualMaxPlayers,
      gameType: gameType || "classic",
      botCount: actualBotCount,
      players: [
        {
          user: userId,
          position: 0,
          money: 1500,
          properties: [],
          color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        },
      ],
      properties: [...initializeMonopolyProperties()],
      chat: [],
      lastDiceRoll: null,
      paymentPending: null,
      trades: [],
    });

    // Добавляем ботов, если нужно
    if (gameType === "with-bots" && actualBotCount > 0) {
      let botUser = await User.findOne({ username: "Бот" });
      
      if (!botUser) {
        const botPassword = Math.random().toString(36).substring(2, 15);
        const hashPassword = await bcrypt.hash(botPassword, 7);
        const botRole = await Role.findOne({ value: "USER" });
        
        botUser = new User({
          username: "Бот",
          password: hashPassword,
          roles: [botRole.value],
          isBot: true
        });
        
        await botUser.save();
      }

      // Генерируем разные имена и цвета для ботов
      const botColors = ["#FF5733", "#33FF57", "#3357FF", "#F033FF", "#FF3333"];
      const botNames = ["Бот Алекс", "Бот Макс", "Бот Ева", "Бот Лиза", "Бот Игорь"];
      
      // Добавляем указанное количество ботов
      for (let i = 0; i < actualBotCount; i++) {
        const botName = botNames[i % botNames.length];
        const botColor = botColors[i % botColors.length];
        
        newGame.players.push({
          user: botUser._id,
          position: 0,
          money: 1500,
          properties: [],
          color: botColor, 
          isBot: true,
          botName: `${botName} ${i+1}` // Добавляем номер, чтобы боты не повторялись
        });
        
        newGame.chat.push({
          message: `${botName} ${i+1} присоединился к игре`,
          timestamp: new Date()
        });
      }

      // Автоматически начинаем игру только если достигнуто максимальное количество игроков
      const totalPlayers = newGame.players.length;
      const shouldAutoStart = totalPlayers >= actualMaxPlayers;
      
      if (shouldAutoStart) {
        newGame.status = "active";
        newGame.currentPlayerIndex = 0; 
        
        newGame.chat.push({
          message: `Игра автоматически началась, так как достигнуто максимальное количество игроков! Первый ход: ${user.username || "Игрок"}`,
          timestamp: new Date()
        });
      }
    }

    console.log("Новая игра создается:", {
      название: name,
      игроков: newGame.players.length,
      ботов: newGame.players.filter(p => p.isBot).length,
      статус: newGame.status
    });

    await newGame.save();
    console.log("Игра успешно создана с ID:", newGame._id);

    // Заполняем детали пользователей для ответа
    const populatedGame = await Game.findById(newGame._id)
      .populate("creator", "username")
      .populate("players.user", "username");

    res.status(201).json(populatedGame);
    
    if (newGame.status === "active" && newGame.players[0].isBot) {
      setTimeout(() => {
        this.botTurn(newGame);
      }, 1000);
    }
  } catch (error) {
    console.log("Ошибка создания игры:", error);
    res.status(500).json({ message: "Ошибка создания игры", error: error.message });
  }
}

  async startGame(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      const isCreator = String(game.creator._id) === String(userId);
      const isParticipant = game.players.some(p => String(p.user._id) === String(userId));

      if (!isCreator && !isParticipant) {
        return res.status(403).json({ message: "Вы не участвуете в этой игре" });
      }

      if (game.status !== "waiting") {
        return res.status(400).json({ message: "Игра уже запущена" });
      }

      const totalPlayers = game.players.length;
      if (totalPlayers < 2) {
        return res.status(400).json({ message: "Для начала игры нужно минимум 2 участника" });
      }

      game.status = "active";
      game.currentPlayerIndex = 0;
      
      const firstPlayerName = game.players[0].isBot 
        ? (game.players[0].botName || 'Бот') 
        : game.players[0].user.username;
      
      game.chat.push({
        message: `Игра началась! Первый ход: ${firstPlayerName}`,
        timestamp: new Date()
      });

      await game.save();
      res.json(game);
      
      if (game.players[0].isBot) {
        setTimeout(() => {
          this.botTurn(game);
        }, 1000);
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка запуска игры" });
    }
  }

  async botTurn(game) {
    try {
      console.log("[botTurn] Начало хода бота для игры", game._id);
      
      // Получаем актуальную игру из базы данных
      const updatedGame = await Game.findById(game._id)
        .populate("creator", "username")
        .populate("players.user", "username");
        
      if (!updatedGame || updatedGame.status !== 'active') {
        console.log("[botTurn] Игра не найдена или неактивна");
        return;
      }
      
      const currentPlayer = updatedGame.players[updatedGame.currentPlayerIndex];
      
      // Проверяем, что текущий игрок - бот
      if (!currentPlayer.isBot) {
        console.log("[botTurn] Текущий игрок не бот, отмена хода бота");
        return;
      }
      
      console.log("[botTurn] Бот бросает кубики");
      
      // Бросок кубиков для бота
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const diceSum = dice1 + dice2;
      
      updatedGame.lastDiceRoll = {
        dice: [dice1, dice2],
        sum: diceSum,
        doubles: dice1 === dice2,
      };
      
      const oldPosition = currentPlayer.position;
      currentPlayer.position = (currentPlayer.position + diceSum) % 40;
      
      // Проверяем прохождение через СТАРТ
      if (currentPlayer.position < oldPosition) {
        currentPlayer.money += 200;
        updatedGame.chat.push({
          message: `Бот ${currentPlayer.botName || "Бот"} прошёл через СТАРТ и получил 200$`,
          timestamp: new Date(),
        });
      }
      
      updatedGame.chat.push({
        message: `Бот ${currentPlayer.botName || "Бот"} бросил кубики и выбросил ${dice1} и ${dice2}`,
        timestamp: new Date(),
      });
      
      // Обработка поля, на которое попал бот
      const landedProperty = updatedGame.properties.find(p => p.id === currentPlayer.position);
      
      // Обрабатываем приземление на поле
      await processPropertyLanding(updatedGame, currentPlayer, landedProperty);
      
      // Простая логика для покупки свойств
      if (landedProperty && 
          (landedProperty.type === 'property' || landedProperty.type === 'railroad' || landedProperty.type === 'utility') && 
          !landedProperty.owner &&
          currentPlayer.money >= landedProperty.price) {
        
        // Бот покупает свойство с вероятностью 70%
        if (Math.random() < 0.7) {
          landedProperty.owner = currentPlayer.user._id || currentPlayer.user;
          currentPlayer.money -= landedProperty.price;
          currentPlayer.properties.push(landedProperty.id);
          
          updatedGame.chat.push({
            message: `Бот ${currentPlayer.botName || "Бот"} купил ${landedProperty.name} за ${landedProperty.price}$`,
            timestamp: new Date(),
          });
        } else {
          updatedGame.chat.push({
            message: `Бот ${currentPlayer.botName || "Бот"} решил не покупать ${landedProperty.name}`,
            timestamp: new Date(),
          });
        }
      }
      
      // Сбрасываем бросок кубиков
      updatedGame.lastDiceRoll = null;
      updatedGame.markModified('lastDiceRoll');
      
      // Переходим к следующему игроку
      updatedGame.currentPlayerIndex = (updatedGame.currentPlayerIndex + 1) % updatedGame.players.length;
      
      // Добавляем сообщение о переходе хода
      const nextPlayer = updatedGame.players[updatedGame.currentPlayerIndex];
      const nextPlayerName = nextPlayer.isBot 
        ? (nextPlayer.botName || "Бот") 
        : (nextPlayer.user?.username || "Неизвестный игрок");
      
      updatedGame.chat.push({
        message: `Ход перешёл к ${nextPlayerName}`,
        timestamp: new Date(),
      });
      
      // Сохраняем игру
      await updatedGame.save();
      console.log("[botTurn] Ход бота завершен, переход к игроку:", nextPlayerName);
      
      // Если следующий игрок тоже бот, запускаем его ход через процесс
      if (nextPlayer.isBot) {
        console.log("[botTurn] Следующий игрок тоже бот, запускаем его ход");
        
        // Используем process.nextTick без "self" - теперь можно напрямую использовать "this"
        process.nextTick(() => {
          this.botTurn(updatedGame).catch(err => {
            console.error("[botTurn] Ошибка запуска хода следующего бота:", err);
          });
        });
      }
      
    } catch (error) {
      console.error("[botTurn] Ошибка в ходе бота:", error);
      
      // Обработка ошибки - все равно переходим к следующему игроку
      try {
        const game = await Game.findById(game._id)
          .populate("creator", "username")
          .populate("players.user", "username");
          
        if (game && game.status === 'active') {
          game.lastDiceRoll = null;
          game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
          
          game.chat.push({
            message: `Произошла ошибка в ходе бота. Ход переходит к следующему игроку.`,
            timestamp: new Date(),
          });
          
          await game.save();
          console.log("[botTurn] Восстановление после ошибки - ход передан следующему игроку");
        }
      } catch (recoverError) {
        console.error("[botTurn] Ошибка восстановления:", recoverError);
      }
    }
  }

  async getAllGames(req, res) {
    try {
      const games = await Game.find({ status: { $ne: "completed" } })
        .populate("creator", "username")
        .populate("players.user", "username");
      res.json(games);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка получения списка игр" });
    }
  }

  async getGameById(req, res) {
    try {
      const game = await Game.findById(req.params.id)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка получения игры" });
    }
  }

  async joinGame(req, res) {
  try {
    const gameId = req.params.id;
    const userId = req.user.id;

    // Получаем данные пользователя
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const game = await Game.findById(gameId)
      .populate("creator", "username")
      .populate("players.user", "username");

    if (!game) {
      return res.status(404).json({ message: "Игра не найдена" });
    }

    if (game.status !== "waiting") {
      return res.status(400).json({ message: "Игра уже началась" });
    }

    if (game.players.length >= game.maxPlayers) {
      return res.status(400).json({ message: "Игра заполнена" });
    }

    const playerExists = game.players.some(
      (player) => String(player.user._id) === String(userId)
    );
    if (playerExists) {
      return res.status(400).json({ message: "Вы уже в этой игре" });
    }

    game.players.push({
      user: userId,
      position: 0,
      money: 1500,
      properties: [],
      color: "#" + Math.floor(Math.random() * 16777215).toString(16),
    });
    
    // Добавляем сообщение в чат
    game.chat.push({
      message: `${user.username} присоединился к игре`,
      timestamp: new Date()
    });

    // Проверяем, достигнуто ли максимальное количество игроков
    if (game.players.length >= game.maxPlayers) {
      game.status = "active";
      game.currentPlayerIndex = 0;
      
      const firstPlayer = game.players[0];
      const firstPlayerName = firstPlayer.isBot 
        ? firstPlayer.botName || "Бот" 
        : firstPlayer.user.username;
      
      game.chat.push({
        message: `Комната заполнена. Игра автоматически началась! Первый ход: ${firstPlayerName}`,
        timestamp: new Date()
      });
    }

    await game.save();
    
    // Получаем обновленную игру с заполненными данными пользователей
    const updatedGame = await Game.findById(gameId)
      .populate("creator", "username")
      .populate("players.user", "username");
    
    if (updatedGame.status === "active" && updatedGame.players[0].isBot) {
      setTimeout(() => {
        this.botTurn(updatedGame);
      }, 1000);
    }
    
    res.json(updatedGame);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Ошибка присоединения к игре" });
  }
}

  async leaveGame(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status === "active") {
        return res
          .status(400)
          .json({ message: "Нельзя выйти из активной игры" });
      }

      const playerIndex = game.players.findIndex(
        (player) => String(player.user._id) === String(userId)
      );
      if (playerIndex === -1) {
        return res
          .status(400)
          .json({ message: "Вы не участвуете в этой игре" });
      }

      const playerName = game.players[playerIndex].user.username;
      game.players.splice(playerIndex, 1);
      
      game.chat.push({
        message: `${playerName} покинул игру`,
        timestamp: new Date()
      });

      if (game.players.length === 0) {
        await Game.findByIdAndDelete(gameId);
        return res.json({ message: "Игра удалена, так как все игроки вышли" });
      }

      if (String(game.creator._id) === String(userId)) {
        game.creator = game.players[0].user._id;
      }

      await game.save();
      res.json({ message: "Вы успешно вышли из игры", game });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка выхода из игры" });
    }
  }

  async rollDice(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;

      console.log(`[СЕРВЕР] Запрос на бросок кубиков от userId=${userId}, gameId=${gameId}`);

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        console.log("[СЕРВЕР] Игра не найдена");
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        console.log("[СЕРВЕР] Игра не активна");
        return res.status(400).json({ message: "Игра еще не началась" });
      }

      const currentPlayer = game.players[game.currentPlayerIndex];

      console.log("[СЕРВЕР] Данные текущего игрока:", {
        currentPlayerUserId: String(currentPlayer.user._id),
        requestUserId: String(userId),
        gameLastDiceRoll: game.lastDiceRoll
      });

      if (String(currentPlayer.user._id) !== String(userId)) {
        console.log("[СЕРВЕР] Не ваш ход");
        return res.status(403).json({ message: "Сейчас не ваш ход" });
      }

      if (game.lastDiceRoll && 
          game.lastDiceRoll.dice && 
          game.lastDiceRoll.dice.length > 0) {
        console.log("[СЕРВЕР] Кубики уже брошены");
        return res.status(400).json({ message: "Вы уже бросали кубики в этот ход" });
      }

      // Бросок кубиков...
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const diceSum = dice1 + dice2;

      console.log(`[СЕРВЕР] Новый бросок кубиков: ${dice1}, ${dice2}`);

      // Устанавливаем lastDiceRoll
      game.lastDiceRoll = {
        dice: [dice1, dice2],
        sum: diceSum,
        doubles: dice1 === dice2,
      };

      const oldPosition = currentPlayer.position;

      currentPlayer.position = (currentPlayer.position + diceSum) % 40;

      if (currentPlayer.position < oldPosition) {
        currentPlayer.money += 200;
        game.chat.push({
          message: `${currentPlayer.user.username} прошёл через СТАРТ и получил 200$`,
          timestamp: new Date(),
        });
      }

      game.chat.push({
        message: `${currentPlayer.user.username} бросил кубики и выбросил ${dice1} и ${dice2}`,
        timestamp: new Date(),
      });

      const landedProperty = game.properties.find(
        (p) => p.id === currentPlayer.position
      );

      // Обрабатываем приземление на поле
      // Переделываем вызов метода на вызов функции
      await processPropertyLanding(game, currentPlayer, landedProperty);

      await game.save();
      console.log("[СЕРВЕР] Игра сохранена с новым броском кубиков");

      // Проверим, что lastDiceRoll действительно сохранился
      const checkGame = await Game.findById(gameId);
      console.log("[СЕРВЕР] Проверка lastDiceRoll после сохранения:", checkGame.lastDiceRoll);

      res.json({
        game,
        dice: [dice1, dice2],
        position: currentPlayer.position,
      });
    } catch (error) {
      console.log("[СЕРВЕР] Ошибка броска кубиков:", error);
      res.status(500).json({ message: "Ошибка броска кубиков" });
    }
  }

  async buyProperty(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

      const playerIndex = game.players.findIndex(
        (player) => String(player.user._id) === String(userId)
      );

      if (playerIndex === -1) {
        return res
          .status(400)
          .json({ message: "Вы не участвуете в этой игре" });
      }

      const currentPlayer = game.players[playerIndex];

      if (game.currentPlayerIndex !== playerIndex) {
        return res.status(403).json({ message: "Сейчас не ваш ход" });
      }

      const property = game.properties.find(
        (p) => p.id === currentPlayer.position
      );

      if (!property) {
        return res.status(400).json({ message: "Свойство не найдено" });
      }

      if (property.type !== "property" && property.type !== "railroad" && property.type !== "utility") {
        return res.status(400).json({ message: "Это поле нельзя купить" });
      }

      if (property.owner) {
        return res
          .status(400)
          .json({ message: "Это свойство уже принадлежит кому-то" });
      }

      if (currentPlayer.money < property.price) {
        return res.status(400).json({ message: "У вас недостаточно денег" });
      }

      // Покупка свойства
      property.owner = currentPlayer.user._id;
      currentPlayer.money -= property.price;
      currentPlayer.properties.push(property.id);

      // Добавить сообщение в чат
      game.chat.push({
        message: `${currentPlayer.user.username} купил ${property.name} за ${property.price}$`,
        timestamp: new Date(),
      });

      await game.save();
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка покупки собственности" });
    }
  }
  
  async endTurn(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

      // Новая, более безопасная проверка
      const currentPlayer = game.players[game.currentPlayerIndex];
      
      // Проверяем, является ли текущий игрок ботом или имеет другой ID
      if (currentPlayer.isBot || 
          !currentPlayer.user || 
          String(currentPlayer.user._id) !== String(userId)) {
        return res.status(403).json({ message: "Сейчас не ваш ход" });
      }

      // Проверить, есть ли ожидающий платеж
      if (game.paymentPending) {
        // Сначала проверим, что paymentPending.from существует
        const fromUserId = game.paymentPending.from;
        if (fromUserId && String(fromUserId) === String(userId)) {
          return res
            .status(400)
            .json({ message: "Вы должны сначала заплатить аренду" });
        }
      }
      
      game.lastDiceRoll = null;
      game.markModified('lastDiceRoll'); // Явно указываем Mongoose, что поле изменилось
      
      game.paymentPending = null;

      // Переход к следующему игроку
      game.currentPlayerIndex = 
        (game.currentPlayerIndex + 1) % game.players.length;

      // Безопасное сообщение в чат, учитывающее ботов
      const nextPlayer = game.players[game.currentPlayerIndex];
      const nextPlayerName = nextPlayer.isBot 
        ? nextPlayer.botName 
        : nextPlayer.user.username;
        
      game.chat.push({
        message: `Ход перешёл к ${nextPlayerName}`,
        timestamp: new Date(),
      });

      await game.save();

      if (nextPlayer.isBot) {
        // Запускаем ход бота в следующем тике
        process.nextTick(() => {
          this.botTurn(game).catch(err => {
            console.error("Ошибка запуска хода бота:", err);
          });
        });
      }
      
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка завершения хода" });
    }
  }

  async payRent(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      // Проверка, есть ли ожидающий платеж для данного пользователя
      if (
        !game.paymentPending ||
        String(game.paymentPending.from) !== String(userId)
      ) {
        return res
          .status(400)
          .json({ message: "У вас нет ожидающих платежей" });
      }

      const { from, to, amount, propertyId } = game.paymentPending;

      const payingPlayer = game.players.find(
        (p) => String(p.user._id) === String(from)
      );
      const receivingPlayer = game.players.find(
        (p) => String(p.user._id) === String(to)
      );

      if (!payingPlayer || !receivingPlayer) {
        return res.status(400).json({ message: "Не найден один из участников платежа" });
      }

      // Проверить, достаточно ли денег
      if (payingPlayer.money < amount) {
        // Игрок не может заплатить, обработка банкротства
        // Здесь будет реализация объявления банкротства
        return res.status(400).json({
          message:
            "У вас недостаточно денег. Вы должны заложить собственность или объявить банкротство",
        });
      }

      payingPlayer.money -= amount;
      receivingPlayer.money += amount;

      game.paymentPending = null;

      game.chat.push({
        message: `${payingPlayer.user.username} заплатил ${amount}$ игроку ${receivingPlayer.user.username} за аренду`,
        timestamp: new Date(),
      });

      await game.save();
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка оплаты аренды" });
    }
  }

  async mortgageProperty(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;
      const { propertyId } = req.body;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

      const player = game.players.find((p) => String(p.user._id) === String(userId));

      if (!player) {
        return res
          .status(400)
          .json({ message: "Вы не участвуете в этой игре" });
      }

      const property = game.properties.find(
        (p) => p.id === parseInt(propertyId)
      );

      if (!property) {
        return res.status(400).json({ message: "Собственность не найдена" });
      }

      if (String(property.owner) !== String(userId)) {
        return res
          .status(400)
          .json({ message: "Эта собственность вам не принадлежит" });
      }

      if (property.mortgaged) {
        return res
          .status(400)
          .json({ message: "Эта собственность уже заложена" });
      }

      if (property.houses > 0) {
        return res
          .status(400)
          .json({ message: "Сначала нужно продать все дома" });
      }

      property.mortgaged = true;
      player.money += Math.floor(property.price / 2);

      game.chat.push({
        message: `${player.user.username} заложил ${
          property.name
        } и получил ${Math.floor(property.price / 2)}$`,
        timestamp: new Date(),
      });

      await game.save();
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка залога собственности" });
    }
  }

  async unmortgageProperty(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;
      const { propertyId } = req.body;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

      const player = game.players.find((p) => String(p.user._id) === String(userId));

      if (!player) {
        return res
          .status(400)
          .json({ message: "Вы не участвуете в этой игре" });
      }

      const property = game.properties.find(
        (p) => p.id === parseInt(propertyId)
      );

      if (!property) {
        return res.status(400).json({ message: "Собственность не найдена" });
      }

      if (String(property.owner) !== String(userId)) {
        return res
          .status(400)
          .json({ message: "Эта собственность вам не принадлежит" });
      }

      if (!property.mortgaged) {
        return res
          .status(400)
          .json({ message: "Эта собственность не заложена" });
      }

      // Рассчитать сумму для выкупа (цена + 10%)
      const unmortgageAmount = Math.floor((property.price / 2) * 1.1);

      if (player.money < unmortgageAmount) {
        return res
          .status(400)
          .json({ message: "У вас недостаточно денег для выкупа" });
      }

      property.mortgaged = false;
      player.money -= unmortgageAmount;

      game.chat.push({
        message: `${player.user.username} выкупил ${property.name} за ${unmortgageAmount}$`,
        timestamp: new Date(),
      });

      await game.save();
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка выкупа собственности" });
    }
  }

  async buildHouse(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;
      const { propertyId } = req.body;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

      const player = game.players.find((p) => String(p.user._id) === String(userId));

      if (!player) {
        return res
          .status(400)
          .json({ message: "Вы не участвуете в этой игре" });
      }

      const property = game.properties.find(
        (p) => p.id === parseInt(propertyId)
      );

      if (!property) {
        return res.status(400).json({ message: "Собственность не найдена" });
      }

      if (String(property.owner) !== String(userId)) {
        return res
          .status(400)
          .json({ message: "Эта собственность вам не принадлежит" });
      }

      if (property.mortgaged) {
        return res
          .status(400)
          .json({ message: "Эта собственность заложена, нельзя строить" });
      }

      if (property.houses >= 5) {
        return res.status(400).json({
          message:
            "На этой собственности уже максимальное количество домов/отель",
        });
      }

      const propertiesInGroup = game.properties.filter(
        (p) => p.group === property.group
      );
      const ownsAllInGroup = propertiesInGroup.every(
        (p) => p.owner && String(p.owner) === String(userId)
      );

      if (!ownsAllInGroup) {
        return res
          .status(400)
          .json({ message: "Вы должны владеть всей группой собственностей" });
      }

      // Проверить равномерное развитие (нельзя строить больше домов на одной собственности, если другие имеют на 2+ дома меньше)
      const minHousesInGroup = Math.min(
        ...propertiesInGroup.map((p) => p.houses)
      );
      if (property.houses > minHousesInGroup) {
        return res.status(400).json({
          message:
            "Сначала постройте дома на других собственностях этой группы",
        });
      }

      // Стоимость дома зависит от группы собственности
      let houseCost;
      switch (property.group) {
        case "brown":
        case "light-blue":
          houseCost = 50;
          break;
        case "pink":
        case "orange":
          houseCost = 100;
          break;
        case "red":
        case "yellow":
          houseCost = 150;
          break;
        case "green":
        case "blue":
          houseCost = 200;
          break;
        default:
          return res
            .status(400)
            .json({ message: "На этой собственности нельзя строить" });
      }

      if (player.money < houseCost) {
        return res.status(400).json({ message: "У вас недостаточно денег" });
      }

      property.houses += 1;
      player.money -= houseCost;

      const buildingType = property.houses === 5 ? "отель" : "дом";
      game.chat.push({
        message: `${player.user.username} построил ${buildingType} на ${property.name} за ${houseCost}$`,
        timestamp: new Date(),
      });

      await game.save();
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка постройки дома" });
    }
  }

  async proposeTrade(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;
      const {
        toPlayerId,
        offerProperties,
        requestProperties,
        offerMoney,
        requestMoney,
      } = req.body;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

      const fromPlayer = game.players.find((p) => String(p.user._id) === String(userId));
      const toPlayer = game.players.find(
        (p) => String(p.user._id) === String(toPlayerId)
      );

      if (!fromPlayer || !toPlayer) {
        return res.status(400).json({ message: "Один из игроков не найден" });
      }

      // Проверить, что у предлагающего есть все offered properties
      if (offerProperties && offerProperties.length > 0) {
        for (const propId of offerProperties) {
          const property = game.properties.find(
            (p) => p.id === parseInt(propId)
          );

          if (!property || String(property.owner) !== String(userId)) {
            return res.status(400).json({
              message: "Вы не владеете всеми предлагаемыми собственностями",
            });
          }

          if (property.houses > 0) {
            return res.status(400).json({
              message:
                "Нельзя торговать собственностями с домами. Сначала продайте дома",
            });
          }
        }
      }

      // Проверить, что у получателя есть все requested properties
      if (requestProperties && requestProperties.length > 0) {
        for (const propId of requestProperties) {
          const property = game.properties.find(
            (p) => p.id === parseInt(propId)
          );

          if (!property || String(property.owner) !== String(toPlayerId)) {
            return res.status(400).json({
              message:
                "Другой игрок не владеет всеми запрашиваемыми собственностями",
            });
          }

          if (property.houses > 0) {
            return res
              .status(400)
              .json({ message: "Нельзя торговать собственностями с домами" });
          }
        }
      }

      if (offerMoney && fromPlayer.money < offerMoney) {
        return res
          .status(400)
          .json({ message: "У вас недостаточно денег для этой сделки" });
      }

      if (!game.trades) {
        game.trades = [];
      }

      const newTrade = {
        id: Date.now().toString(),
        from: userId,
        to: toPlayerId,
        offerProperties: offerProperties || [],
        requestProperties: requestProperties || [],
        offerMoney: offerMoney || 0,
        requestMoney: requestMoney || 0,
        status: "pending",
        createdAt: new Date(),
      };

      game.trades.push(newTrade);

      game.chat.push({
        message: `${fromPlayer.user.username} предложил обмен игроку ${toPlayer.user.username}`,
        timestamp: new Date(),
      });

      await game.save();
      res.json({ game, trade: newTrade });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка предложения обмена" });
    }
  }

  async acceptTrade(req, res) {
    try {
      const gameId = req.params.id;
      const tradeId = req.params.tradeId;
      const userId = req.user.id;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      const tradeIndex = game.trades.findIndex((t) => t.id === tradeId);

      if (tradeIndex === -1) {
        return res
          .status(404)
          .json({ message: "Предложение обмена не найдено" });
      }

      const trade = game.trades[tradeIndex];

      if (String(trade.to) !== String(userId)) {
        return res
          .status(403)
          .json({ message: "Это предложение обмена не для вас" });
      }

      if (trade.status !== "pending") {
        return res
          .status(400)
          .json({ message: "Это предложение уже обработано" });
      }

      const fromPlayer = game.players.find(
        (p) => String(p.user._id) === String(trade.from)
      );
      const toPlayer = game.players.find(
        (p) => String(p.user._id) === String(trade.to)
      );

      if (!fromPlayer || !toPlayer) {
        return res.status(400).json({ message: "Один из участников обмена не найден" });
      }

      if (trade.requestMoney > 0 && toPlayer.money < trade.requestMoney) {
        return res
          .status(400)
          .json({ message: "У вас недостаточно денег для этой сделки" });
      }

      // Выполнить обмен

      // 1. Обмен деньгами
      if (trade.offerMoney > 0) {
        fromPlayer.money -= trade.offerMoney;
        toPlayer.money += trade.offerMoney;
      }

      if (trade.requestMoney > 0) {
        toPlayer.money -= trade.requestMoney;
        fromPlayer.money += trade.requestMoney;
      }

      // 2. Обмен собственностью
      for (const propId of trade.offerProperties) {
        const property = game.properties.find((p) => p.id === parseInt(propId));
        property.owner = toPlayer.user._id;

        // Обновить списки собственности игроков
        fromPlayer.properties = fromPlayer.properties.filter(
          (id) => id !== parseInt(propId)
        );
        toPlayer.properties.push(parseInt(propId));
      }

      for (const propId of trade.requestProperties) {
        const property = game.properties.find((p) => p.id === parseInt(propId));
        property.owner = fromPlayer.user._id;

        // Обновить списки собственности игроков
        toPlayer.properties = toPlayer.properties.filter(
          (id) => id !== parseInt(propId)
        );
        fromPlayer.properties.push(parseInt(propId));
      }

      // Обновить статус предложения
      trade.status = "accepted";
      trade.completedAt = new Date();

      game.chat.push({
        message: `${toPlayer.user.username} принял предложение обмена от ${fromPlayer.user.username}`,
        timestamp: new Date(),
      });

      await game.save();
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка принятия обмена" });
    }
  }

  async rejectTrade(req, res) {
    try {
      const gameId = req.params.id;
      const tradeId = req.params.tradeId;
      const userId = req.user.id;

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      // Найти предложение обмена
      const tradeIndex = game.trades.findIndex((t) => t.id === tradeId);

      if (tradeIndex === -1) {
        return res
          .status(404)
          .json({ message: "Предложение обмена не найдено" });
      }

      const trade = game.trades[tradeIndex];

      // Проверить, что текущий пользователь может отклонить предложение
      // (либо он получатель, либо отправитель)
      if (String(trade.to) !== String(userId) && String(trade.from) !== String(userId)) {
        return res
          .status(403)
          .json({ message: "Вы не можете отклонить это предложение" });
      }

      if (trade.status !== "pending") {
        return res
          .status(400)
          .json({ message: "Это предложение уже обработано" });
      }

      // Обновить статус предложения
      trade.status = "rejected";
      trade.completedAt = new Date();

      // Найти игроков
      const fromPlayer = game.players.find(
        (p) => String(p.user._id) === String(trade.from)
      );
      const toPlayer = game.players.find(
        (p) => String(p.user._id) === String(trade.to)
      );

      if (String(trade.to) === String(userId)) {
        game.chat.push({
          message: `${toPlayer.user.username} отклонил предложение обмена от ${fromPlayer.user.username}`,
          timestamp: new Date(),
        });
      } else {
        game.chat.push({
          message: `${fromPlayer.user.username} отозвал своё предложение обмена`,
          timestamp: new Date(),
        });
      }

      await game.save();
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка отклонения обмена" });
    }
  }

  async sendChatMessage(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;
      const { message } = req.body;

      if (!message || message.trim() === "") {
        return res
          .status(400)
          .json({ message: "Сообщение не может быть пустым" });
      }

      const game = await Game.findById(gameId)
        .populate("creator", "username")
        .populate("players.user", "username");

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      const player = game.players.find((p) => String(p.user._id) === String(userId));

      if (!player) {
        return res
          .status(403)
          .json({ message: "Вы не участвуете в этой игре" });
      }

      game.chat.push({
        user: userId,
        message: `${player.user.username}: ${message}`,
        timestamp: new Date(),
      });

      await game.save();
      res.json(game);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка отправки сообщения" });
    }
  }
}

// Вспомогательные функции

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

function initializeMonopolyProperties() {
  return [
    //------------------ Первый круг (нижняя строка) ------------------
    { id: 0, name: "СТАРТ (Площадь Независимости)", type: "special" },
    {
      id: 1,
      name: "Улица Зыбицкая",
      type: "property",
      price: 60,
      rent: [2, 10, 30, 90, 160, 250],
      group: "brown",
      houses: 0,
      mortgaged: false,
      description: "Зыбицкая улица — одна из самых известных и оживленных улиц Минска, находящаяся в центре города. Здесь расположены многочисленные кафе, бары, магазины и исторические здания, привлекающие как местных жителей, так и туристов. Это место, где сочетаются старинная архитектура и современная атмосфера.",
      pic: "monopoly/pic/id_1"
    },
    { id: 2, name: "Общественная казна", type: "community" },
    {
      id: 3,
      name: "Троицкое предместье",
      type: "property",
      price: 60,
      rent: [4, 20, 60, 180, 320, 450],
      group: "brown",
      houses: 0,
      mortgaged: false,
      description: "Троицкое предместье — исторический район Минска с характерной для XVIII-XIX веков архитектурой. Здесь сохранились старинные здания, узкие улицы и уютные площади, создающие атмосферу старого города. Это место является популярным для прогулок и культурных мероприятий.",
      pic: "monopoly/pic/id_3"
    },
    { id: 4, name: "Налог на роскошь", type: "tax", amount: 200 },
    {
      id: 5,
      name: "Минский ЖД вокзал",
      type: "railroad",
      price: 200,
      rent: [25, 50, 100, 200],
      group: "railroad",
      description: "Минский железнодорожный вокзал — центральная транспортная станция города, открытая в 2002 году. Он представляет собой современный архитектурный комплекс с развитой инфраструктурой и множеством сервисов для пассажиров. Вокзал соединяет Минск с различными регионами Беларуси и зарубежья.",
      pic: "monopoly/pic/id_5"
    },
    {
      id: 6,
      name: "Улица Немига",
      type: "property",
      price: 100,
      rent: [6, 30, 90, 270, 400, 550],
      group: "light-blue",
      houses: 0,
      mortgaged: false,
      description: "Улица Немига — одна из самых старых улиц Минска, расположенная в центре города. Здесь проходят важные транспортные артерии, а также находятся многочисленные магазины, кафе и жилые дома. Вдоль улицы можно найти памятники архитектуры и исторические здания.",
      pic: "monopoly/pic/id_6"
    },
    { id: 7, name: "Шанс", type: "chance" },
    {
      id: 8,
      name: "Площадь Свободы",
      type: "property",
      price: 100,
      rent: [6, 30, 90, 270, 400, 550],
      group: "light-blue",
      houses: 0,
      mortgaged: false,
      description: "Площадь Свободы — важный городской центр Минска, окруженный историческими зданиями, такими как Ратуша и Минский городской исполнительный комитет. Площадь является местом проведения культурных и общественных мероприятий, а также популярным туристическим объектом. Это место, где пересекаются важнейшие улицы города.",
      pic: "monopoly/pic/id_8"
    },
    {
      id: 9,
      name: "Верхний город",
      type: "property",
      price: 120,
      rent: [8, 40, 100, 300, 450, 600],
      group: "light-blue",
      houses: 0,
      mortgaged: false,
      description: "Верхний город — исторический район Минска, где сосредоточены культурные и административные объекты. Здесь можно увидеть старинные здания, такие как костел Святого Духа и Президентский дворец. Район является культурным и туристическим центром города.",
      pic: "monopoly/pic/id_9"
    },
    { id: 10, name: "Володарка (СИЗО №1)", type: "jail" },

    //------------------ Левая сторона ------------------
    {
      id: 11,
      name: "Проспект Победителей",
      type: "property",
      price: 140,
      rent: [10, 50, 150, 450, 625, 750],
      group: "pink",
      houses: 0,
      mortgaged: false,
      description: "Проспект Победителей — одна из главных магистралей Минска, проходящая через несколько районов города. Здесь расположены важные административные здания, культурные учреждения и спортивные объекты. Проспект также является важным транспортным узлом, соединяющим разные части города.",
      pic: "monopoly/pic/id_11"
    },
    {
      id: 12,
      name: "Минскэнерго",
      type: "utility",
      price: 150,
      group: "utility",
      description: "Минскэнерго — крупнейшая энергетическая компания Беларуси, обеспечивающая город Минск и его окрестности электроэнергией и теплом. Компании принадлежит несколько крупных теплоэлектростанций. Она играет ключевую роль в обеспечении энергоснабжения региона.",
      pic: "monopoly/pic/id_12"
    },
    {
      id: 13,
      name: "Парк Горького",
      type: "property",
      price: 140,
      rent: [10, 50, 150, 450, 625, 750],
      group: "pink",
      houses: 0,
      mortgaged: false,
      description: "Парк Горького — один из самых популярных парков Минска, который привлекает горожан своими зелеными аллеями, озерами и аттракционами. Это место для активного отдыха, прогулок и культурных мероприятий. Здесь расположены исторические памятники и скульптуры.",
      pic: "monopoly/pic/id_13"
    },
    {
      id: 14,
      name: "Национальная библиотека",
      type: "property",
      price: 160,
      rent: [12, 60, 180, 500, 700, 900],
      group: "pink",
      houses: 0,
      mortgaged: false,
      description:"Национальная библиотека Беларуси — одна из самых уникальных и современных библиотек в мире, расположенная в Минске. Она известна своей архитектурой в виде ромба, освещаемого днем солнечным светом. Библиотека является важным культурным центром, с огромными фондами книг и активной научной деятельностью.",
      pic: "monopoly/pic/id_14"
    },
    {
      id: 15,
      name: "Станция метро Немига",
      type: "railroad",
      price: 200,
      rent: [25, 50, 100, 200],
      group: "railroad",
      description:"Станция метро Немига — одна из станций Минского метрополитена, расположенная в центре города. Она находится вблизи главных торговых и культурных объектов. Станция является важным транспортным узлом, соединяя различные части города.",
      pic: "monopoly/pic/id_12_25_35"
    },
    {
      id: 16,
      name: "Улица Карла Маркса",
      type: "property",
      price: 180,
      rent: [14, 70, 200, 550, 750, 950],
      group: "orange",
      houses: 0,
      mortgaged: false,
      description:"Улица Карла Маркса — одна из центральных улиц Минска, являющаяся важной транспортной артерией. Здесь расположены многочисленные магазины, офисы и культурные учреждения. Улица соединяет важные районы города и является частью исторического центра.",
      pic: "monopoly/pic/id_16"
    },
    { id: 17, name: "Общественная казна", type: "community" },
    {
      id: 18,
      name: "Площадь Якуба Коласа",
      type: "property",
      price: 180,
      rent: [14, 70, 200, 550, 750, 950],
      group: "orange",
      houses: 0,
      mortgaged: false,
      description:"Площадь Якуба Колоса — одна из центральных площадей Минска, названная в честь белорусского писателя. Она окружена историческими зданиями, университетами и культурными учреждениями. Площадь является важным транспортным узлом и популярным местом для прогулок.",
      pic: "monopoly/pic/id_18"
    },
    {
      id: 19,
      name: "Лошицкий парк",
      type: "property",
      price: 200,
      rent: [16, 80, 220, 600, 800, 1000],
      group: "orange",
      houses: 0,
      mortgaged: false,
      description:"Лошицкий парк — зеленая зона в Минске, которая является популярным местом для отдыха на природе. Парк славится своей богатой растительностью и уютными прудиками. Это отличное место для пеших прогулок, занятий спортом и пикников.",
      pic: "monopoly/pic/id_19"
    },
    { id: 20, name: "Бесплатная парковка (Парк Челюскинцев)", type: "special" },

    //------------------ Верхняя строка ------------------
    {
      id: 21,
      name: "Музей ВОВ",
      type: "property",
      price: 220,
      rent: [18, 90, 250, 700, 875, 1050],
      group: "red",
      houses: 0,
      mortgaged: false,
      description:"Музей Великой Отечественной войны в Минске — важное культурное учреждение, которое хранит память о событиях Второй мировой войны. В музее представлены уникальные экспонаты, фотографии и документы, связанные с историей войны. Это место привлекает как местных жителей, так и туристов.",
      pic: "monopoly/pic/id_21"
    },
    { id: 22, name: "Шанс", type: "chance" },
    {
      id: 23,
      name: "Минск-Арена",
      type: "property",
      price: 220,
      rent: [18, 90, 250, 700, 875, 1050],
      group: "red",
      houses: 0,
      mortgaged: false,
      description:"Минск Арена — спортивно-развлекательный комплекс в Минске, где проводятся международные спортивные события, концерты и выставки. Арена является домом для хоккейного клуба Динамо Минск и других спортивных команд. Комплекс включает ледовую арену, концертный зал и гостиницу.",
      pic: "monopoly/pic/id_23"
    },
    {
      id: 24,
      name: "Оперный театр",
      type: "property",
      price: 240,
      rent: [20, 100, 300, 750, 925, 1100],
      group: "red",
      houses: 0,
      mortgaged: false,
      description:"Национальный академический Большой театр оперы и балета Беларуси — один из самых значительных театров страны. Это место для зрелищных постановок опер, балетов и других музыкальных спектаклей. Театр является важным культурным центром и привлекает зрителей со всего мира.",
      pic: "monopoly/pic/id_24"
    },
    {
      id: 25,
      name: "Станция метро Пушкинская",
      type: "railroad",
      price: 200,
      rent: [25, 50, 100, 200],
      group: "railroad",
      description:"Станция метро Пушкинская — одна из станций Минского метрополитена, расположенная в центре города. Она является важной для пересадки пассажиров, соединяя несколько районов города. Станция обслуживает крупные торговые и культурные объекты.",
      pic: "monopoly/pic/id_15_25_35"
    },
    {
      id: 26,
      name: "Проспект Независимости",
      type: "property",
      price: 260,
      rent: [22, 110, 330, 800, 975, 1150],
      group: "yellow",
      houses: 0,
      mortgaged: false,
      description:"Проспект Независимости — одна из главных улиц Минска, проходящая через несколько крупных районов города. Здесь сосредоточены важные административные здания, магазины и культурные учреждения. Проспект является важной транспортной магистралью и популярным местом для прогулок.",
      pic: "monopoly/pic/id_26"
    },
    {
      id: 27,
      name: "Площадь Победы",
      type: "property",
      price: 260,
      rent: [22, 110, 330, 800, 975, 1150],
      group: "yellow",
      houses: 0,
      mortgaged: false,
      description:"Площадь Победы — одна из центральных площадей Минска, посвященная победе в Великой Отечественной войне. Здесь расположен знаменитый монумент Вечный огонь, символизирующий память о погибших. Площадь является важным историческим и культурным центром.",
      pic: "monopoly/pic/id_27"
    },
    {
      id: 28,
      name: "Минскводоканал",
      type: "utility",
      price: 150,
      group: "utility",
      description:"Минскводоканал — крупнейшая коммунальная компания, занимающаяся водоснабжением и водоотведением в Минске. Она отвечает за очистку воды, ремонт и эксплуатацию водопроводных и канализационных сетей. Компания также занимается обслуживанием водных объектов города.",
      pic: "monopoly/pic/id_28"
    },
    {
      id: 29,
      name: "Национальный аэропорт",
      type: "property",
      price: 280,
      rent: [24, 120, 360, 850, 1025, 1200],
      group: "yellow",
      houses: 0,
      mortgaged: false,
      description:"Национальный аэропорт Минск — главный международный аэропорт страны, расположенный в 42 км от Минска. Аэропорт обслуживает рейсы по всему миру и является ключевым транспортным узлом Беларуси. Он оснащен современными терминалами и инфраструктурой для удобства пассажиров.",
      pic: "monopoly/pic/id_29"
    },
    { id: 30, name: "Отправка в Володарку", type: "jail" },

    //------------------ Правая сторона ------------------
    {
      id: 31,
      name: "Ботанический сад",
      type: "property",
      price: 300,
      rent: [26, 130, 390, 900, 1100, 1275],
      group: "green",
      houses: 0,
      mortgaged: false,
      description:"Ботанический сад Минска — крупнейший ботанический сад Беларуси, где представлено более 10 000 видов растений. Он является местом для прогулок, научных исследований и образовательных мероприятий. Сад привлекает как любителей природы, так и ученых.",
      pic: "monopoly/pic/id_31"
    },
    {
      id: 32,
      name: "Пищаловский замок",
      type: "property",
      price: 300,
      rent: [26, 130, 390, 900, 1100, 1275],
      group: "green",
      houses: 0,
      mortgaged: false,
      description:"Пищаловский замок — историческое сооружение в Минске, которое является примером дворцовой архитектуры XVI века. Замок с богатой историей был восстановлен и теперь является частью культурного наследия города. Это популярное место для экскурсий и культурных мероприятий.",
      pic: "monopoly/pic/id_32"
    },
    { id: 33, name: "Общественная казна", type: "community" },
    {
      id: 34,
      name: "Дворец Республики",
      type: "property",
      price: 320,
      rent: [28, 150, 450, 1000, 1200, 1400],
      group: "green",
      houses: 0,
      mortgaged: false,
      description:"Дворец Республики — крупное культурное и административное здание в Минске. Здесь проходят важнейшие государственные мероприятия, концерты, выставки и другие культурные события. Архитектурный стиль дворца сочетает элементы модерна и классики.",
      pic: "monopoly/pic/id_34"
    },
    {
      id: 35,
      name: "Станция метро Каменная Горка",
      type: "railroad",
      price: 200,
      rent: [25, 50, 100, 200],
      group: "railroad",
      description:"Станция метро Каменная Горка — одна из станций Минского метрополитена, расположенная в юго-западной части города. Она соединяет несколько районов и является важным транспортным узлом. Станция обслуживает множество жилых комплексов и коммерческих объектов.",
      pic: "monopoly/pic/id_15_25_35"
    },
    { id: 36, name: "Шанс", type: "chance" },
    {
      id: 37,
      name: "Бизнес-центр «Парус»",
      type: "property",
      price: 350,
      rent: [35, 175, 500, 1100, 1300, 1500],
      group: "blue",
      houses: 0,
      mortgaged: false,
      description:"Бизнес-центр Парус — современный офисный комплекс в Минске, известный своей архитектурой и удобным расположением. Он предоставляет офисные и коммерческие площади для различных компаний. Бизнес-центр также включает в себя рестораны, кафе и другие удобства для арендаторов и посетителей.",
      pic: "monopoly/pic/id_37"
    },
    { id: 38, name: "Экологический налог", type: "tax", amount: 100 },
    {
      id: 39,
      name: "Национальный банк РБ",
      type: "property",
      price: 400,
      rent: [50, 200, 600, 1400, 1700, 2000],
      group: "blue",
      houses: 0,
      mortgaged: false,
      description:"Национальный банк Республики Беларусь — центральное финансовое учреждение страны, регулирующее денежно-кредитную политику. Банк управляет национальной валютой, определяет процентные ставки и контролирует финансовую систему. Он играет ключевую роль в экономике страны.",
      pic: "monopoly/pic/id_39"
    },
  ];
}

export default new GameController();