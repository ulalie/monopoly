import React from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";
import Home from "./components/Home";
import Login from "./components/Login";
import SingUp from "./components/SingUp";
import Lobby from "./components/Lobby";
import Profile from "./components/Profile";
import GameBoard from "./components/GameBoard";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPage from "./components/AdminPage";

export default function App() {
  return (
    <Routes>
      <Route path="/auth/registration" element={<SingUp />} />
      <Route path="/auth/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Home />} />

      <Route
        path="/lobby"
        element={
          <ProtectedRoute>
            <Lobby />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game"
        element={
          <ProtectedRoute>
            <GameBoard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
