import Game from "../models/Game.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import bcrypt from "bcryptjs"; 

class GameController {
  async createGame(req, res) {
  try {
    const { name, maxPlayers, gameType } = req.body;
    const userId = req.user.id;

    const newGame = new Game({
      name,
      creator: userId,
      maxPlayers: maxPlayers || 4,
      gameType: gameType || "classic",
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

    if (gameType === "with-bots") {
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

      newGame.players.push({
        user: botUser._id,
        position: 0,
        money: 1500,
        properties: [],
        color: "#FF5733", 
        isBot: true,
        botName: "Бот" 
      });
      
      newGame.chat.push({
        message: "Бот присоединился к игре",
        timestamp: new Date()
      });

      const totalPlayers = newGame.players.length;
      if (totalPlayers >= 2) {
        newGame.status = "active";
        newGame.currentPlayerIndex = 0; 
        
        newGame.chat.push({
          message: `Игра автоматически началась! Первый ход: ${newGame.players[0].user.username || "Игрок"}`,
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

    res.status(201).json(newGame);
    
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

    const game = await Game.findById(gameId);

    if (!game) {
      return res.status(404).json({ message: "Игра не найдена" });
    }

    const isCreator = String(game.creator) === String(userId);
    const isParticipant = game.players.some(p => String(p.user) === String(userId));

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
    
    game.chat.push({
      message: `Игра началась! Первый ход: ${typeof game.players[0].user === 'object' 
        ? game.players[0].user.username 
        : (game.players[0].botName || 'Игрок')}`,
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

    const game = await Game.findById(gameId);

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
      (player) => player.user.toString() === userId
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

    if (game.players.length >= game.maxPlayers) {
      game.status = "active";
      game.currentPlayerIndex = 0;
      
      game.chat.push({
        message: `Комната заполнена. Игра автоматически началась! Первый ход: ${
          typeof game.players[0].user === 'object' 
            ? game.players[0].user.username 
            : (game.players[0].botName || 'Игрок')
        }`,
        timestamp: new Date()
      });
    }

    await game.save();
    
    if (game.status === "active" && game.players[0].isBot) {
      setTimeout(() => {
        this.botTurn(game);
      }, 1000);
    }
    
    res.json(game);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Ошибка присоединения к игре" });
  }
}

  async leaveGame(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;

      const game = await Game.findById(gameId);

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status === "active") {
        return res
          .status(400)
          .json({ message: "Нельзя выйти из активной игры" });
      }

      const playerIndex = game.players.findIndex(
        (player) => player.user.toString() === userId
      );
      if (playerIndex === -1) {
        return res
          .status(400)
          .json({ message: "Вы не участвуете в этой игре" });
      }

      game.players.splice(playerIndex, 1);

      if (game.players.length === 0) {
        await Game.findByIdAndDelete(gameId);
        return res.json({ message: "Игра удалена, так как все игроки вышли" });
      }

      if (game.creator.toString() === userId) {
        game.creator = game.players[0].user;
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

    const game = await Game.findById(gameId);

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
      currentPlayerUserId: currentPlayer.user.toString(),
      requestUserId: userId,
      gameLastDiceRoll: game.lastDiceRoll
    });

    if (String(currentPlayer.user.toString()) !== String(userId)) {
      console.log("[СЕРВЕР] Не ваш ход");
      return res.status(403).json({ message: "Сейчас не ваш ход" });
    }

    // Заменить эту проверку:
    // if (game.lastDiceRoll) {
    
    // НА ЭТУ - с более строгой проверкой:
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

      const landedProperty = game.properties.find(
        (p) => p.id === currentPlayer.position
      );

      if (landedProperty) {
        switch (landedProperty.type) {
          case "special":
            handleSpecialSquare(game, currentPlayer, landedProperty);
            break;
          case "property":
            if (
              landedProperty.owner &&
              landedProperty.owner.toString() !== currentPlayer.user.toString()
            ) {
              game.paymentPending = {
                from: currentPlayer.user,
                to: landedProperty.owner,
                amount: calculateRent(landedProperty, game),
                propertyId: landedProperty.id,
              };

              game.chat.push({
                message: `${currentPlayer.user.username} приземлился на ${landedProperty.name} и должен заплатить аренду`,
                timestamp: new Date(),
              });
            }
            break;
          case "tax":
            // Обработка клеток налога
            const taxAmount = landedProperty.id === 4 ? 200 : 100; // Подоходный налог или налог на роскошь
            currentPlayer.money -= taxAmount;

            game.chat.push({
              message: `${currentPlayer.user.username} заплатил ${taxAmount}$ налога`,
              timestamp: new Date(),
            });
            break;
          case "chance":
          case "community":
            // Обработка шанса/общественной казны
            // Здесь будет реализация карт шанса/общественной казны
            break;
          default:
            break;
        }
      }

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

      const game = await Game.findById(gameId);

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

      const currentPlayer = game.players.find(
        (player) => player.user.toString() === userId
      );

      if (!currentPlayer) {
        return res
          .status(400)
          .json({ message: "Вы не участвуете в этой игре" });
      }


      if (game.players[game.currentPlayerIndex].user.toString() !== userId) {
        return res.status(403).json({ message: "Сейчас не ваш ход" });
      }

      const property = game.properties.find(
        (p) => p.id === currentPlayer.position
      );

      if (!property) {
        return res.status(400).json({ message: "Свойство не найдено" });
      }

      if (property.type !== "property") {
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
      property.owner = currentPlayer.user;
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

      const game = await Game.findById(gameId);

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

    const currentPlayer = game.players[game.currentPlayerIndex];
if (currentPlayer.isBot || !currentPlayer.user || currentPlayer.user.toString() !== userId) {
  return res.status(403).json({ message: "Сейчас не ваш ход" });
}

      // Проверить, есть ли ожидающий платеж
      if (
        game.paymentPending &&
        game.paymentPending.from.toString() === userId
      ) {
        return res
          .status(400)
          .json({ message: "Вы должны сначала заплатить аренду" });
      }

   game.lastDiceRoll = null;
      game.markModified('lastDiceRoll'); // Явно указываем Mongoose, что поле изменилось
      
      game.paymentPending = null; 
  game.paymentPending = null; 

  // Переход к следующему игроку
  game.currentPlayerIndex = 
    (game.currentPlayerIndex + 1) % game.players.length;

      game.chat.push({
        message: `Ход перешёл к ${
          game.players[game.currentPlayerIndex].user.username
        }`,
        timestamp: new Date(),
      });

      await game.save();

          const nextPlayer = game.players[game.currentPlayerIndex];
    if (nextPlayer.isBot || (nextPlayer.user && typeof nextPlayer.user === 'object' && nextPlayer.user.isBot)) {
      this.botTurn(game);
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

      const game = await Game.findById(gameId);

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      // Проверка, есть ли ожидающий платеж для данного пользователя
      if (
        !game.paymentPending ||
        game.paymentPending.from.toString() !== userId
      ) {
        return res
          .status(400)
          .json({ message: "У вас нет ожидающих платежей" });
      }

      const { from, to, amount, propertyId } = game.paymentPending;

      const payingPlayer = game.players.find(
        (p) => p.user.toString() === from.toString()
      );
      const receivingPlayer = game.players.find(
        (p) => p.user.toString() === to.toString()
      );

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

      const game = await Game.findById(gameId);

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

      const player = game.players.find((p) => p.user.toString() === userId);

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

      if (property.owner.toString() !== userId) {
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

      const game = await Game.findById(gameId);

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

      const player = game.players.find((p) => p.user.toString() === userId);

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

      if (property.owner.toString() !== userId) {
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

      const game = await Game.findById(gameId);

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

      const player = game.players.find((p) => p.user.toString() === userId);

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

      if (property.owner.toString() !== userId) {
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
        (p) => p.owner && p.owner.toString() === userId
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

      const game = await Game.findById(gameId);

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      if (game.status !== "active") {
        return res.status(400).json({ message: "Игра ещё не началась" });
      }

      const fromPlayer = game.players.find((p) => p.user.toString() === userId);
      const toPlayer = game.players.find(
        (p) => p.user.toString() === toPlayerId
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

          if (!property || property.owner.toString() !== userId) {
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

          if (!property || property.owner.toString() !== toPlayerId) {
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

      const game = await Game.findById(gameId);

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

      if (trade.to.toString() !== userId) {
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
        (p) => p.user.toString() === trade.from.toString()
      );
      const toPlayer = game.players.find(
        (p) => p.user.toString() === trade.to.toString()
      );

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
        property.owner = toPlayer.user;

        // Обновить списки собственности игроков
        fromPlayer.properties = fromPlayer.properties.filter(
          (id) => id !== parseInt(propId)
        );
        toPlayer.properties.push(parseInt(propId));
      }

      for (const propId of trade.requestProperties) {
        const property = game.properties.find((p) => p.id === parseInt(propId));
        property.owner = fromPlayer.user;

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

      const game = await Game.findById(gameId);

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
      if (trade.to.toString() !== userId && trade.from.toString() !== userId) {
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
        (p) => p.user.toString() === trade.from.toString()
      );
      const toPlayer = game.players.find(
        (p) => p.user.toString() === trade.to.toString()
      );

      if (trade.to.toString() === userId) {
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

      const game = await Game.findById(gameId);

      if (!game) {
        return res.status(404).json({ message: "Игра не найдена" });
      }

      const player = game.players.find((p) => p.user.toString() === userId);

      if (!player) {
        return res
          .status(403)
          .json({ message: "Вы не участвуете в этой игре" });
      }

      game.chat.push({
        user: userId,
        message,
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

// Обработка специальных клеток
function handleSpecialSquare(game, player, property) {
  switch (property.id) {
    case 0: // СТАРТ
      // Уже обработано при прохождении через СТАРТ
      break;
    case 10: // Посещение тюрьмы
      // Ничего не происходит при простом посещении
      break;
    case 20: // Бесплатная парковка
      // В некоторых вариантах правил здесь игрок получает деньги из центра
      break;
    case 30: // Отправиться в тюрьму
      player.position = 10; // Переместить на клетку тюрьмы
      player.jailStatus = true; // Поместить в тюрьму

      game.chat.push({
        message: `${player.user.username} отправляется в тюрьму`,
        timestamp: new Date(),
      });
      break;
    default:
      break;
  }
}

// Расчет арендной платы
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
    const diceSum = game.lastDiceRoll.sum;

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
    },
    { id: 4, name: "Налог на роскошь", type: "tax", amount: 200 },
    {
      id: 5,
      name: "Минский ЖД вокзал",
      type: "railroad",
      price: 200,
      rent: [25, 50, 100, 200],
      group: "railroad",
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
    },
    {
      id: 12,
      name: "Минскэнерго",
      type: "utility",
      price: 150,
      group: "utility",
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
    },
    {
      id: 15,
      name: "Станция метро Немига",
      type: "railroad",
      price: 200,
      rent: [25, 50, 100, 200],
      group: "railroad",
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
    },
    {
      id: 25,
      name: "Станция метро Пушкинская",
      type: "railroad",
      price: 200,
      rent: [25, 50, 100, 200],
      group: "railroad",
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
    },
    {
      id: 28,
      name: "Минскводоканал",
      type: "utility",
      price: 150,
      group: "utility",
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
    },
    {
      id: 35,
      name: "Станция метро Каменная Горка",
      type: "railroad",
      price: 200,
      rent: [25, 50, 100, 200],
      group: "railroad",
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
    },
  ];

}

export default new GameController();
