const jwt = require("jsonwebtoken");
const { secret } = require("../config/config");

module.exports = function (roles) {
  return function (req, res, next) {
    if (req.method === "OPTIONS") {
      next();
    }
    try {
      const token = req.headers.authorization.split(" ")[1];
      if (!token) {
        return res
          .status(403)
          .json({ messsage: "Пользователь не авторизован" });
      }
      const { roles: userRoles } = jwt.verify(token, secret);
      let hasRole = false;
      userRoles.forEach((role) => {
        if (roles.includes(role)) {
          hasRole = true;
        }
      });
      if (!hasRole) {
        return res.status(403).json({ messsage: "У вас нет доступа" });
      }
    } catch (error) {
      console.log(Error);
      return res.status(403).json({ messsage: "Пользователь не авторизован" });
    }
  };
};
