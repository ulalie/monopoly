const jwt = require("jsonwebtoken");
const { secret } = require("../config/config");

module.exports = function (req, res, next) {
  if (req.method === "OPTIONS") {
    next();
  }
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(403).json({ messsage: "Пользователь не авторизован" });
    }
    const decodedData = jwt.verify(token, secret);
    req.user = decodedData;
    next();
  } catch (error) {
    console.log(Error);
    return res.status(403).json({ messsage: "Пользователь не авторизован" });
  }
};
