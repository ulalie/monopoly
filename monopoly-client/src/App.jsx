import React from "react";
import { Routes, Route } from "react-router-dom";
import "./index.css";
import Game from "./pages/Game";
import Home from "./pages/Home";
import Login from "./pages/Login";
import SingUp from "./pages/SingUp";
import Lobby from "./pages/Lobby";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPage from "./pages/AdminPage";

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
      {/* <Route
        path="/game"
        element={
          <ProtectedRoute>
            <GameBoard />
          </ProtectedRoute>
        }
      /> */}
      <Route
        path="/game/:id"
        element={
          <ProtectedRoute>
            <Game />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
