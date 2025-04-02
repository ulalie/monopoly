const User = require("../models/User");
const Role = require("../models/Role");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const { secret } = require("../config/config");

const generateAccessToken = (id, roles) => {
  const payload = { id, roles };
  return jwt.sign(payload, secret, { expiresIn: "24h" });
};

class AuthController {
  async registration(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ message: "Ошибки при регистрации", errors });
      }

      const { username, password, roles } = req.body; // Добавляем возможность передавать роли
      const candidate = await User.findOne({ username });
      if (candidate) {
        return res
          .status(400)
          .json({ message: "Пользователь с таким именем уже существует" });
      }

      const hashPassword = bcrypt.hashSync(password, 7);

      // Найти роли в базе данных
      let userRoles = [];
      if (roles && roles.length > 0) {
        userRoles = await Role.find({ value: { $in: roles } });
      }

      // Если роли не указаны, используем роль по умолчанию - USER
      if (userRoles.length === 0) {
        const defaultRole = await Role.findOne({ value: "USER" });
        userRoles = [defaultRole];
      }

      const user = new User({
        username,
        password: hashPassword,
        roles: userRoles.map((role) => role.value), // Сохраняем только значения ролей
      });

      await user.save();
      return res.json({ message: "Пользователь был успешно зарегистрирован" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка регистрации" });
    }
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
      if (!user) {
        return res
          .status(400)
          .json({ message: "Пользователь с таким именем не найден" });
      }

      const validPassword = bcrypt.compareSync(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ message: "Неверный пароль" });
      }

      const token = generateAccessToken(user._id, user.roles);
      return res.json({ token });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Ошибка входа" });
    }
  }

  async getUsers(req, res) {
    try {
      const users = await User.find();
      res.json(users);
    } catch (error) {
      console.log(error);
      res.status(400).json({ message: "Get users error" });
    }
  }
}

module.exports = new AuthController();
