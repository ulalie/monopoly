import React, { useState, useEffect, useRef } from "react";

export default function GameChat({ game, gameId }) {
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (game.chat) {
      console.log("Получены сообщения чата:", game.chat);
      setChatMessages(game.chat);
    }
    scrollToBottom();
  }, [game]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/game/${gameId}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message }),
        }
      );

      if (!response.ok) {
        throw new Error("Не удалось отправить сообщение");
      }

      setMessage("");
    } catch (err) {
      console.error("Ошибка отправки сообщения:", err);
    }
  };

  return (
    <div className="game-chat">
      <div className="chat-header">
        <h3>Игровой чат</h3>
      </div>

      <div className="chat-messages">
        {chatMessages.length === 0 ? (
          <div className="no-messages">Сообщений пока нет</div>
        ) : (
          chatMessages.map((msg, index) => (
            <div key={index} className="chat-message">
              {/* Обрабатываем разные форматы сообщений */}
              {msg.user ? (
                <><strong>{msg.user.username}:</strong> {msg.message}</>
              ) : (
                // Системные сообщения без пользователя
                <><strong>Система:</strong> {msg.message}</>
              )}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Введите сообщение..."
        />
        <button type="submit">Отправить</button>
      </form>
    </div>
  );
}