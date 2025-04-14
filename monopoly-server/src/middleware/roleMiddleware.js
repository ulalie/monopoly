import jwt from "jsonwebtoken";
const { sign, verify } = jwt;
import { secret } from "../config/config.js";

export default function (roles) {
  return function (req, res, next) {
    if (req.method === "OPTIONS") {
      return next();
    }
    try {
      const token = req.headers.authorization.split(" ")[1];
      if (!token) {
        return res.status(403).json({ message: "Пользователь не авторизован" });
      }

      const decodedData = verify(token, secret);

      req.user = {
        id: decodedData.id,
        roles: decodedData.roles,
      };

      if (roles && roles.length > 0) {
        let hasRole = false;
        decodedData.roles.forEach((role) => {
          if (roles.includes(role)) {
            hasRole = true;
          }
        });

        if (!hasRole) {
          return res.status(403).json({ message: "У вас нет доступа" });
        }
      }

      return next();
    } catch (error) {
      console.log(error);
      return res.status(403).json({ message: "Пользователь не авторизован" });
    }
  };
}
