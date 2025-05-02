import React, { useState, useEffect, useRef, useCallback } from "react";

export default function GameBoard({ game, currentPlayer, diceRoll, onPropertyClick, gameId }) {
  // Refs for measurements and scaling
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const resizeTimeoutRef = useRef(null);
  const chatContainerRef = useRef(null);
  const chatEndRef = useRef(null);

  // State for board and UI
  const [boardSize, setBoardSize] = useState(0);
  const [scale, setScale] = useState(1);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [userScrolled, setUserScrolled] = useState(false);

  // Calculate scaled dimensions
  const cornerSize = Math.floor(110 * scale);
  const propertyWidth = Math.floor(60 * scale);
  const propertyHeight = Math.floor(110 * scale);

  // Debounced resize function to prioritize height and fill available space
  const resizeBoard = useCallback(() => {
    if (!containerRef.current) return;
    
    // Clear any pending resize timeout
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    // Set a timeout to resize after 100ms of stability
    resizeTimeoutRef.current = setTimeout(() => {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      
      // Calculate size based on available height, then check if it fits width
      let newSize = containerHeight - 20; // Subtract some padding
      
      // If the calculated height-based size exceeds available width,
      // recalculate based on width
      if (newSize > containerWidth - 20) {
        newSize = containerWidth - 20;
      }
      
      // Calculate scale factor based on the reference size of 760
      const newScale = newSize / 760;
      
      setBoardSize(newSize);
      setScale(newScale);
    }, 100);
  }, []);

  // Handle window resizing
  useEffect(() => {
    resizeBoard();
    window.addEventListener('resize', resizeBoard);
    
    return () => {
      window.removeEventListener('resize', resizeBoard);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [resizeBoard]);

  // Utility function to get player ID consistently
  const getPlayerId = (player) =>
    player.user && player.user._id ? String(player.user._id) : String(player.user);

  // Get property by position
  const getPropertyByPosition = (position) => {
    return game.properties.find((p) => p.id === position);
  };

  // Map color names to hex colors
  const getGroupColor = (group) => {
    switch (group) {
      case "brown": return "#8B4513";
      case "light-blue": return "#87CEEB";
      case "pink": return "#FF69B4";
      case "orange": return "#FFA500";
      case "red": return "#FF0000";
      case "yellow": return "#FFFF00";
      case "green": return "#008000";
      case "blue": return "#0000FF";
      case "railroad": return "#000000";
      case "utility": return "#C0C0C0";
      default: return "#FFFFFF";
    }
  };

  // Calculate player token position
  const getPlayerPosition = (player, index) => {
    const position = player.position;
    let x, y;

    if (position <= 10) {
      // Bottom row (right to left)
      x = boardSize - cornerSize - position * propertyWidth;
      y = boardSize - propertyHeight;
    } else if (position <= 20) {
      // Left column (bottom to top)
      x = 0;
      y = boardSize - cornerSize - (position - 10) * propertyWidth;
    } else if (position <= 30) {
      // Top row (left to right)
      x = cornerSize + (position - 21) * propertyWidth;
      y = 0;
    } else {
      // Right column (top to bottom)
      x = boardSize - propertyHeight;
      y = cornerSize + (position - 31) * propertyWidth;
    }

    // Offset for multiple players on the same square
    const offsetX = (index % 2) * 15 * scale;
    const offsetY = Math.floor(index / 2) * 15 * scale;

    return {
      x: x + offsetX + 5 * scale,
      y: y + offsetY + 5 * scale,
    };
  };

  // Group players by position
  const playersByPosition = {};
  game.players.forEach((player) => {
    if (!playersByPosition[player.position]) {
      playersByPosition[player.position] = [];
    }
    playersByPosition[player.position].push(player);
  });

  // Scroll handling for chat
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    
    const isNearBottom = chatContainerRef.current.scrollHeight - 
                         chatContainerRef.current.scrollTop - 
                         chatContainerRef.current.clientHeight < 100;
    setUserScrolled(!isNearBottom);
  };

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Format and display chat messages
  useEffect(() => {
    if (!game.chat) return;
    
    const chatContainer = chatContainerRef.current;
    const wasAtBottom = chatContainer && 
      (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 30);
    
    // Format all messages to a consistent structure
    const formattedMessages = game.chat.map((msg) => {
      if (msg.user && typeof msg.user === "object" && msg.user.username) {
        return msg;
      }
      if (typeof msg.message === "string" && msg.message.includes(":")) {
        const [username, ...messageParts] = msg.message.split(":");
        return {
          ...msg,
          user: { username: username.trim() },
          message: messageParts.join(":").trim(),
        };
      }
      return msg;
    });
    
    setChatMessages(formattedMessages);
  
    if ((wasAtBottom || chatMessages.length === 0) && !userScrolled) {
      setTimeout(scrollToBottom, 50);
    }
    // eslint-disable-next-line
  }, [game.chat]);

  // Send chat message
  const sendMessage = async (e) => {
    e?.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    const currentGameId = gameId || (game && game._id);
    
    if (!currentGameId) {
      console.error("Ошибка: ID игры не определен");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`http://localhost:8080/game/${currentGameId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmedMessage }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Optimistic UI update
      const username = currentPlayer.isBot 
        ? (currentPlayer.botName || "Бот") 
        : (currentPlayer.user?.username || "Игрок");
      
      const id = getPlayerId(currentPlayer);

      const newMessage = {
        user: { _id: id, username },
        message: trimmedMessage,
        timestamp: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, newMessage]);
      setMessage("");
      setUserScrolled(false);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("Ошибка отправки сообщения:", err);
      alert(`Не удалось отправить сообщение: ${err.message}`);
    }
  };

  // Render buildings (houses and hotels)
  const renderBuildings = (property, x, y, width, height, position) => {
    if (!property.houses || property.houses === 0 || property.type !== "property") {
      return null;
    }

    const isHorizontal = position <= 10 || (position > 20 && position <= 30);
    const houseSize = 8 * scale;
    const hotelSize = 12 * scale;
    let housesContainerStyle = {};

    if (property.houses === 5) {
      // Hotel
      if (isHorizontal) {
        housesContainerStyle = {
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          top: position <= 10 ? "25%" : "60%",
          width: "100%",
          display: "flex",
          justifyContent: "center",
        };
        return (
          <div style={housesContainerStyle}>
            <div style={{
              width: `${hotelSize}px`,
              height: `${hotelSize}px`,
              backgroundColor: "#C41E3A",
              border: "1px solid #8B0000",
            }}></div>
          </div>
        );
      } else {
        housesContainerStyle = {
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          left: position <= 20 ? "60%" : "25%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        };
        return (
          <div style={housesContainerStyle}>
            <div style={{
              width: `${hotelSize}px`,
              height: `${hotelSize}px`,
              backgroundColor: "#C41E3A",
              border: "1px solid #8B0000",
            }}></div>
          </div>
        );
      }
    } else {
      // Houses
      if (isHorizontal) {
        housesContainerStyle = {
          position: "absolute",
          left: "0",
          right: "0",
          top: position <= 10 ? "25%" : "60%",
          display: "flex",
          justifyContent: "space-evenly",
        };
      } else {
        housesContainerStyle = {
          position: "absolute",
          top: "0",
          bottom: "0",
          left: position <= 20 ? "60%" : "25%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-evenly",
        };
      }
      return (
        <div style={housesContainerStyle}>
          {Array(property.houses)
            .fill()
            .map((_, i) => (
              <div
                key={i}
                style={{
                  width: `${houseSize}px`,
                  height: `${houseSize}px`,
                  backgroundColor: "#3CB043",
                  border: "1px solid #2E8B57",
                }}
              ></div>
            ))}
        </div>
      );
    }
  };

  // Loading state
  if (!game || !game.properties || game.properties.length === 0) {
    return (
      <div className="container mx-auto text-neutral-600 p-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400 mb-4"></div>
          <p className="text-xl">Загрузка игровой доски...</p>
        </div>
      </div>
    );
  }

  // Make sure we have a valid game ID
  const currentGameId = gameId || (game && game._id);

  return (
    <div 
      ref={containerRef} 
      className="h-full w-full flex items-center justify-center"
      style={{ overflow: "hidden", padding: "0" }}
    >
      <div
        ref={boardRef}
        className="game-board"
        style={{
          width: `${boardSize}px`,
          height: `${boardSize}px`,
          position: "relative",
          backgroundColor: "#e9f5e9",
          border: `${2 * scale}px solid #128c7e`,
          borderRadius: `${8 * scale}px`,
          overflow: "hidden",
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      >
        {/* Center area with chat */}
        <div
          style={{
            position: "absolute",
            left: `${cornerSize}px`,
            top: `${cornerSize}px`,
            width: `${boardSize - 2 * cornerSize}px`,
            height: `${boardSize - 2 * cornerSize}px`,
            backgroundColor: "#f8f8f8",
            display: "flex",
            flexDirection: "column",
            padding: `${10 * scale}px`,
            boxSizing: "border-box",
          }}
        >
          {/* Chat container */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(8px)",
              borderRadius: `${12 * scale}px`,
              overflow: "hidden",
              boxShadow: `0 ${4 * scale}px ${12 * scale}px rgba(0, 0, 0, 0.1)`,
              position: "relative",
            }}
          >
            {/* Chat header */}
            <div
              style={{
                padding: `${12 * scale}px`,
                fontWeight: "bold",
                fontSize: `${16 * scale}px`,
                color: "#333",
                backgroundColor: "transparent",
                textAlign: "center",
              }}
            >
              Игровой чат
            </div>
            
            {/* Chat messages */}
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: `${12 * scale}px`,
                fontSize: `${14 * scale}px`,
              }}
            >
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#aaa" }}>
                  Сообщений пока нет
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} style={{ marginBottom: `${10 * scale}px`, color: "#333" }}>
                    <strong>{msg.user?.username || "Система"}:</strong>{" "}
                    {msg.message}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            
            {/* Scroll down button */}
            {userScrolled && (
              <button
                onClick={() => {
                  scrollToBottom();
                  setUserScrolled(false);
                }}
                style={{
                  position: "absolute",
                  bottom: `${70 * scale}px`,
                  right: `${20 * scale}px`,
                  backgroundColor: "oklch(76.5% 0.177 163.223)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: `${40 * scale}px`,
                  height: `${40 * scale}px`,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  boxShadow: `0 ${2 * scale}px ${5 * scale}px rgba(0,0,0,0.2)`,
                  cursor: "pointer",
                  zIndex: 20,
                  fontSize: `${20 * scale}px`,
                }}
              >
                ↓
              </button>
            )}
            
            {/* Chat input */}
            <form
              onSubmit={sendMessage}
              style={{
                display: "flex",
                padding: `${12 * scale}px`,
                gap: `${8 * scale}px`,
                backgroundColor: "transparent",
              }}
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={currentGameId ? "Введите сообщение..." : "ID игры не определен"}
                disabled={!currentGameId}
                style={{
                  flex: 1,
                  padding: `${10 * scale}px`,
                  borderRadius: `${8 * scale}px`,
                  border: `${1 * scale}px solid #ccc`,
                  backgroundColor: "white",
                  fontSize: `${14 * scale}px`,
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={!currentGameId}
                style={{
                  padding: `${10 * scale}px ${18 * scale}px`,
                  borderRadius: `${8 * scale}px`,
                  backgroundColor: currentGameId ? "oklch(76.5% 0.177 163.223)" : "#cccccc",
                  color: "white",
                  border: "none",
                  fontWeight: "bold",
                  cursor: currentGameId ? "pointer" : "not-allowed",
                  transition: "background-color 0.3s",
                }}
                onMouseOver={(e) => {
                  if (currentGameId) e.currentTarget.style.backgroundColor = "oklch(0.596 0.145 163.225)";
                }}
                onMouseOut={(e) => {
                  if (currentGameId) e.currentTarget.style.backgroundColor = "oklch(76.5% 0.177 163.223)";
                }}
              >
                ➤
              </button>
            </form>
          </div>
        </div>

        {/* Board squares */}
        {Array.from({ length: 40 }).map((_, index) => {
          const property = getPropertyByPosition(index);
          if (!property) return null;

          let x, y, width, height;
          const isCorner = index === 0 || index === 10 || index === 20 || index === 30;

          if (isCorner) {
            width = cornerSize;
            height = cornerSize;
            if (index === 0) {
              x = boardSize - cornerSize;
              y = boardSize - cornerSize;
            } else if (index === 10) {
              x = 0;
              y = boardSize - cornerSize;
            } else if (index === 20) {
              x = 0;
              y = 0;
            } else if (index === 30) {
              x = boardSize - cornerSize;
              y = 0;
            }
          } else {
            if (index <= 10) {
              x = boardSize - cornerSize - index * propertyWidth;
              y = boardSize - propertyHeight;
              width = propertyWidth;
              height = propertyHeight;
            } else if (index <= 20) {
              x = 0;
              y = boardSize - cornerSize - (index - 10) * propertyWidth;
              width = propertyHeight;
              height = propertyWidth;
            } else if (index <= 30) {
              x = cornerSize + (index - 21) * propertyWidth;
              y = 0;
              width = propertyWidth;
              height = propertyHeight;
            } else {
              x = boardSize - propertyHeight;
              y = cornerSize + (index - 31) * propertyWidth;
              width = propertyHeight;
              height = propertyWidth;
            }
          }

          // Background color based on owner
          let backgroundColor = "#f9f9f9";
          if (property.owner) {
            const ownerPlayer = game.players.find(
              (p) => getPlayerId(p) === String(property.owner)
            );
            if (ownerPlayer) {
              backgroundColor = `${ownerPlayer.color}33`;
            }
          }

          const groupColor = property.group ? getGroupColor(property.group) : null;

          return (
            <div
              key={index}
              className={`board-square ${property.owner ? "owned" : ""}${
                isCorner ? "corner-square" : ""
              }`}
              onClick={() => onPropertyClick(property)}
              style={{
                position: "absolute",
                left: `${x}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${height}px`,
                backgroundColor,
                border: `${1 * scale}px solid #ccc`,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: `${2 * scale}px`,
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform 0.1s ease",
              }}
            >
              {/* Group color band */}
              {groupColor && property.type === "property" && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    backgroundColor: groupColor,
                    width: "100%",
                    height: "100%",
                    opacity: 0.5,
                  }}
                />
              )}

              {/* Corner names */}
              {[0, 10, 20, 30].includes(property.id) && (
                <div
                  className="property-name"
                  style={{
                    fontSize: `${8 * scale}px`,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {property.name || `Поле ${index}`}
                </div>
              )}

              {/* Price display */}
              {property.price && (
                <div
                  className="property-price"
                  style={{
                    position: "absolute",
                    fontSize: `${8 * scale}px`,
                    color: "black",
                    backgroundColor: "rgba(0,0,0,0.1)",
                    padding: `${1 * scale}px ${2 * scale}px`,
                    borderRadius: `${2 * scale}px`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...(index <= 10
                      ? {
                          top: "80%",
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: "100%",
                        }
                      : index <= 20
                      ? {
                          right: "40%",
                          top: "50%",
                          transform: "translateY(-50%) rotate(-90deg)",
                          height: "20%",
                          width: "100%",
                          transformOrigin: "center",
                        }
                      : index <= 30
                      ? {
                          bottom: "85%",
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: "100%",
                        }
                      : {
                          left: "40%",
                          top: "50%",
                          transform: "translateY(-50%) rotate(90deg)",
                          height: "20%",
                          width: "100%",
                          transformOrigin: "center",
                        }),
                  }}
                >
                  ${property.price}
                </div>
              )}

              {/* Property images */}
              {[1,2,3,4,5,6,7,8,9,11,12,13,14,15,16,17,18,19,21,22,23,24,25,26,27,28,29,31,32,33,34,35,36,37,38,39].includes(property.id) && (
                <div
                  style={{
                    position: 'absolute',
                    zIndex: 5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...(index <= 10
                      ? { // Bottom row -- photo above
                          bottom: '20%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          height: `${60 * scale}px`,
                          width: `${60 * scale}px`
                        }
                      : index <= 20
                      ? { // Left column -- photo to right
                          right: '0',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          height: `${60 * scale}px`,
                          width: `${60 * scale}px`
                        }
                      : index <= 30
                      ? { // Top row -- photo below
                          bottom: '0',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          height: `${60 * scale}px`,
                          width: `${60 * scale}px`
                        }
                      : { // Right column -- photo to left
                          left: '0',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          height: `${60 * scale}px`,
                          width: `${60 * scale}px`
                        }
                    )
                  }}
                >
                  <img
                    src={
                      (property.id === 15 || property.id === 25 || property.id === 35)
                        ? '/pic/id_15_25_35.png'
                        : [2, 4, 17, 33, 38].includes(property.id)
                          ? '/pic/doll.png'
                          : [7, 22, 36].includes(property.id)
                            ? '/pic/chance.png'
                            : `/pic/id_${property.id}.png`
                    }
                    alt="Property"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              )}

              {/* Mortgage indicator */}
              {property.mortgaged && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%) rotate(-35deg)",
                    backgroundColor: "rgba(255, 0, 0, 0.7)",
                    color: "white",
                    fontSize: `${8 * scale}px`,
                    padding: `${1 * scale}px ${3 * scale}px`,
                    borderRadius: `${2 * scale}px`,
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    zIndex: 5,
                  }}
                >
                  ЗАЛОЖЕНО
                </div>
              )}

              {/* Buildings (houses/hotels) */}
              {renderBuildings(property, x, y, width, height, index)}
            </div>
          );
        })}

        {/* Player tokens */}
        {game.players.map((player) => {
          const playerId = getPlayerId(player);
          const positionPlayers = playersByPosition[player.position] || [];
          const positionIndex = positionPlayers.findIndex(
            (p) => getPlayerId(p) === playerId
          );
          const { x, y } = getPlayerPosition(player, positionIndex);

          return (
            <div
              key={playerId}
              className={`player-token ${
                playerId === getPlayerId(currentPlayer) ? "current-player" : ""
              }`}
              style={{
                position: "absolute",
                transform: `translate(${x}px, ${y}px)`,
                transition: player.isBot 
                  ? "transform 2s ease-in-out"
                  : "transform 0.3s ease-in-out",
                width: `${35 * scale}px`,
                height: `${35 * scale}px`,
                borderRadius: "50%",
                backgroundColor: player.color,
                border: `${2 * scale}px solid white`,
                boxShadow: `0 ${2 * scale}px ${4 * scale}px rgba(0,0,0,0.3)`,
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: `${15 * scale}px`,
                fontWeight: "bold",
              }}
            >
              {player.isBot
                ? player.botName?.[0] || "B"
                : player.user?.username?.[0] || "?"}
            </div>
          );
        })}

        {/* Dice display */}
        {diceRoll && (
          <div
            className="dice-display"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              gap: `${15 * scale}px`,
              zIndex: 20,
              backgroundColor: "rgba(255,255,255,0.95)",
              padding: `${20 * scale}px`,
              borderRadius: `${12 * scale}px`,
              boxShadow: `0 ${8 * scale}px ${20 * scale}px rgba(0,0,0,0.25)`,
            }}
          >
            {diceRoll.map((value, index) => (
              <div
                key={index}
                className="die animate-roll"
                style={{
                  width: `${50 * scale}px`,
                  height: `${50 * scale}px`,
                  background: "linear-gradient(145deg, #ffffff, #e6e6e6)",
                  borderRadius: `${10 * scale}px`,
                  border: `${2 * scale}px solid #ccc`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: `${28 * scale}px`,
                  fontWeight: "bold",
                  color: "#333",
                  boxShadow: `inset -${2 * scale}px -${2 * scale}px ${5 * scale}px #ffffff, inset ${2 * scale}px ${2 * scale}px ${5 * scale}px #d1d1d1`,
                }}
              >
                {value}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}