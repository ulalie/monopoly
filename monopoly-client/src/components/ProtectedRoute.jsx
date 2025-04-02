import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token"); // Проверяем наличие токена

  // Если токена нет, перенаправляем на страницу входа
  if (!token) {
    return <Navigate to="/auth/login" />;
  }

  // Если токен есть, показываем защищенный компонент
  return children;
}
