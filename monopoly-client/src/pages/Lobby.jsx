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
      const response = await fetch(`http://localhost:8080/game/list?page=${page}&limit=${limit}`);
      
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

      const response = await fetch("http://localhost:8080/game/create", {
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
        `http://localhost:8080/game/${gameId}/join`,
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

  if (loading && games.length === 0) return<div className="container mx-auto text-neutral-600 p-8 min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400 mb-4"></div>
        <p className="text-xl">Загрузка игр...</p>
      </div>
    </div>;
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
    <div className="container mx-auto text-neutral-600 p-8 min-h-screen">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center m-2">
          <img src="../../public/logo.png" className="w-8 h-8"></img>
          <h1 className="m-2 text-2xl font-bold">Monopoly Lobby</h1>
        </div>
        <Link 
          to="/profile" 
          className="rounded-lg bg-emerald-400 m-2 px-6 py-2 text-xl text-amber-50 hover:bg-emerald-300 transition-colors"
        >
          Профиль
        </Link>
      </header>

      <section className="mb-8">
        <h2 className="text-3xl font-bold mb-4 text-center">Создать новую игру</h2>
        
        <form onSubmit={createGame} className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-lg mb-2">Название игры:</label>
            <input
              type="text"
              value={newGameName}
              onChange={(e) => setNewGameName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-lg mb-2">Максимум игроков:</label>
            <select
              value={maxPlayers}
              onChange={(e) => {
                const newMaxPlayers = Number(e.target.value);
                setMaxPlayers(newMaxPlayers);
                if (includeBot && botCount >= newMaxPlayers) {
                  setBotCount(newMaxPlayers - 1);
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            >
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="6">6</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeBot}
                onChange={(e) => setIncludeBot(e.target.checked)}
                className="h-5 w-5 text-emerald-400 rounded focus:ring-emerald-400"
              />
              <span className="text-lg">Добавить ботов в игру</span>
            </label>
            
            {includeBot && (
              <div className="mt-3 ml-7">
                <label className="block text-lg mb-2">Количество ботов:</label>
                <select
                  value={botCount}
                  onChange={(e) => setBotCount(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                >
                  {Array.from({ length: maxBots }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">Максимум {maxBots} ботов для этой игры</p>
              </div>
            )}
          </div>
          
          <button 
            type="submit" 
            className="w-full rounded-xl bg-emerald-400 px-5 py-3 text-xl text-amber-50 hover:bg-emerald-300 transition-colors"
          >
            Создать игру
          </button>
        </form>
      </section>

      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold">Доступные игры</h2>
          
          <div className="flex items-center space-x-4">
            <div>
              <label className="mr-2">Игр на странице:</label>
              <select 
                value={gamesPerPage} 
                onChange={handleGamesPerPageChange}
                className="p-1 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-400"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
            
            <div className="text-gray-600">
              Показано {games.length > 0 ? (currentPage - 1) * gamesPerPage + 1 : 0}-
              {Math.min(currentPage * gamesPerPage, totalGames)} из {totalGames}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 min-h-[400px]">
          {games.length === 0 ? (
            <p className="text-center text-lg py-8">Нет доступных игр. Создайте игру, чтобы начать!</p>
          ) : (
            <>
              {loading && <div className="text-center py-4">Обновление списка игр...</div>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {games.map((game) => (
                  <div key={game._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-semibold mb-2">{game.name}</h3>
                    <p className="mb-1">Создал: {game.creator.username}</p>
                    <p className="mb-1">
                      Статус: {game.status === "waiting" ? (
                        <span className="text-yellow-600">⏳ Ожидание</span>
                      ) : (
                        <span className="text-green-600">▶️ Активна</span>
                      )}
                    </p>
                    <p className="mb-3">
                      Игроки: {game.players.length}/{game.maxPlayers}
                      {game.botCount > 0 && ` (🤖 ${game.botCount})`}
                    </p>
                    <button
                      onClick={() => joinGame(game._id)}
                      disabled={
                        game.status !== "waiting" ||
                        game.players.length >= game.maxPlayers
                      }
                      className={`w-full rounded-lg py-2 px-4 ${
                        game.status !== "waiting" || game.players.length >= game.maxPlayers
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-emerald-400 hover:bg-emerald-300 text-amber-50"
                      } transition-colors`}
                    >
                      {game.status !== "waiting"
                        ? "Игра в процессе"
                        : game.players.length >= game.maxPlayers
                        ? "Игра заполнена"
                        : "Присоединиться"}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="flex justify-center mt-6 space-x-2">
            <button 
              onClick={handlePrevPage} 
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg ${
                currentPage === 1 
                  ? "bg-gray-200 cursor-not-allowed" 
                  : "bg-emerald-400 hover:bg-emerald-300 text-amber-50"
              }`}
            >
              &laquo; Пред.
            </button>
            
            <div className="flex space-x-1">
              {visiblePageNumbers.map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-4 py-2">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-4 py-2 rounded-lg ${
                      currentPage === page 
                        ? "bg-emerald-500 text-white" 
                        : "bg-gray-200 hover:bg-gray-300"
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}
            </div>
            
            <button 
              onClick={handleNextPage} 
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg ${
                currentPage === totalPages 
                  ? "bg-gray-200 cursor-not-allowed" 
                  : "bg-emerald-400 hover:bg-emerald-300 text-amber-50"
              }`}
            >
              След. &raquo;
            </button>
          </div>
        )}
      </section>

      <div className="text-center mt-8">
        <Link 
          to="/" 
          className="inline-block rounded-lg bg-gray-200 px-6 py-2 text-lg hover:bg-gray-300 transition-colors"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}