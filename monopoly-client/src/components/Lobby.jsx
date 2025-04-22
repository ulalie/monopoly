import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Lobby() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newGameName, setNewGameName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [includeBot, setIncludeBot] = useState(false);
  const [botCount, setBotCount] = useState(1);
  
  // Состояния для пагинации
  const [currentPage, setCurrentPage] = useState(1);
  const [gamesPerPage, setGamesPerPage] = useState(10);
  const [totalGames, setTotalGames] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchGames(currentPage, gamesPerPage);
  }, [currentPage, gamesPerPage]);

  const fetchGames = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      
      // Если у вас уже реализована серверная пагинация, используйте:
      const response = await fetch(`http://localhost:5000/game/list?page=${page}&limit=${limit}`);
      
      // Если серверной пагинации нет, используйте клиентскую пагинацию:
      // const response = await fetch("http://localhost:5000/game/list");
      
      if (!response.ok) {
        throw new Error("Не удалось получить список игр");
      }
      
      const data = await response.json();
      
      // Если серверная пагинация возвращает метаданные (общее количество игр и т.д.):
      if (data.games && data.totalGames && data.totalPages) {
        setGames(data.games);
        setTotalGames(data.totalGames);
        setTotalPages(data.totalPages);
      } else {
        // Для клиентской пагинации:
        setGames(data.slice((page - 1) * limit, page * limit));
        setTotalGames(data.length);
        setTotalPages(Math.ceil(data.length / limit));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createGame = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/auth/login");
        return;
      }

      if (!newGameName.trim() || maxPlayers <= 0) {
        throw new Error(
          "Пожалуйста, введите корректное название игры и количество игроков."
        );
      }

      if (includeBot && botCount >= maxPlayers) {
        throw new Error(
          "Количество ботов должно быть меньше максимального количества игроков минус 1 (для вас)."
        );
      }

      const response = await fetch("http://localhost:5000/game/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newGameName,
          maxPlayers: parseInt(maxPlayers),
          gameType: includeBot ? "with-bots" : "classic",
          botCount: includeBot ? parseInt(botCount) : 0
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Не удалось создать игру");
      }

      const newGame = await response.json();
      
      // После создания игры обновляем список и переходим на первую страницу
      fetchGames(1, gamesPerPage);
      setCurrentPage(1);
      setNewGameName("");

      navigate(`/game/${newGame._id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const joinGame = async (gameId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/auth/login");
        return;
      }

      const response = await fetch(
        `http://localhost:5000/game/${gameId}/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Не удалось присоединиться к игре");
      }

      navigate(`/game/${gameId}`);
    } catch (err) {
      setError(err.message);
    }
  };
  
  // Обработчики пагинации
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const handleGamesPerPageChange = (e) => {
    const newLimit = Number(e.target.value);
    setGamesPerPage(newLimit);
    setCurrentPage(1); 
  };

  if (loading && games.length === 0) return <div className="loading">Загрузка игр...</div>;
  if (error) return <div className="error">Ошибка: {error}</div>;

  const maxBots = maxPlayers > 1 ? maxPlayers - 1 : 0;
  
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }
  
  // Для мобильных устройств можно ограничить количество отображаемых номеров страниц
  const visiblePageNumbers = [];
  const maxVisiblePages = 5;
  
  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      visiblePageNumbers.push(i);
    }
  } else {
    const halfVisiblePages = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, currentPage - halfVisiblePages);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      visiblePageNumbers.push(i);
    }
    
    if (startPage > 1) {
      visiblePageNumbers.unshift(1);
      if (startPage > 2) visiblePageNumbers.splice(1, 0, '...');
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) visiblePageNumbers.push('...');
      visiblePageNumbers.push(totalPages);
    }
  }

  return (
    <div className="lobby-container">
      <h2>Игровое лобби</h2>

      <div className="create-game-form">
        <h3>Создать новую игру</h3>
        <form onSubmit={createGame}>
          <div className="form-group">
            <label>Название игры:</label>
            <input
              type="text"
              value={newGameName}
              onChange={(e) => setNewGameName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Максимум игроков (включая ботов):</label>
            <select
              value={maxPlayers}
              onChange={(e) => {
                const newMaxPlayers = Number(e.target.value);
                setMaxPlayers(newMaxPlayers);
                
                if (includeBot && botCount >= newMaxPlayers) {
                  setBotCount(newMaxPlayers - 1);
                }
              }}
            >
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="6">6</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={includeBot}
                onChange={(e) => setIncludeBot(e.target.checked)}
              />
              Добавить ботов в игру
            </label>
            
            {includeBot && (
              <div className="bot-count-selector">
                <label>Количество ботов:</label>
                <select
                  value={botCount}
                  onChange={(e) => setBotCount(Number(e.target.value))}
                >
                  {Array.from({ length: maxBots }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
                <p className="hint">Максимум {maxBots} ботов для этой игры</p>
              </div>
            )}
          </div>
          
          <button type="submit">Создать игру</button>
        </form>
      </div>

      <div className="games-list">
        <div className="games-list-header">
          <h3>Доступные игры</h3>
          
          <div className="pagination-controls">
            <label>
              Игр на странице:
              <select value={gamesPerPage} onChange={handleGamesPerPageChange}>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </label>
            
            <div className="games-count">
              Показано {games.length > 0 ? (currentPage - 1) * gamesPerPage + 1 : 0}-
              {Math.min(currentPage * gamesPerPage, totalGames)} из {totalGames}
            </div>
          </div>
        </div>
        
        <div className="games-list-content" style={{ minHeight: '400px' }}>
          {games.length === 0 ? (
            <p>Нет доступных игр. Создайте игру, чтобы начать!</p>
          ) : (
            <>
              {loading && <div className="list-loading">Обновление списка игр...</div>}
              
              {games.map((game) => (
                <div key={game._id} className="game-item">
                  <h4>{game.name}</h4>
                  <p>Создал: {game.creator.username}</p>
                  <p>
                    Статус: {game.status === "waiting" ? "Ожидание" : "Активна"}
                  </p>
                  <p>
                    Игроки: {game.players.length}/{game.maxPlayers}
                    {game.botCount > 0 && ` (включая ${game.botCount} ботов)`}
                  </p>
                  <button
                    onClick={() => joinGame(game._id)}
                    disabled={
                      game.status !== "waiting" ||
                      game.players.length >= game.maxPlayers
                    }
                  >
                    {game.status !== "waiting"
                      ? "Игра в процессе"
                      : game.players.length >= game.maxPlayers
                      ? "Игра заполнена"
                      : "Присоединиться"}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              onClick={handlePrevPage} 
              disabled={currentPage === 1}
              className="pagination-button"
            >
              &laquo; Пред.
            </button>
            
            <div className="pagination-pages">
              {visiblePageNumbers.map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                  >
                    {page}
                  </button>
                )
              ))}
            </div>
            
            <button 
              onClick={handleNextPage} 
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              След. &raquo;
            </button>
          </div>
        )}
      </div>

      <div className="navigation">
        <Link to="/profile">Назад в профиль</Link>
      </div>
    </div>
  );
}