import React, { useState, useEffect } from 'react';
import { GameBoard } from './components/GameBoard';
import { JoinScreen } from './components/JoinScreen';
import { useGameStore } from './store/gameStore';
import { WebSocketService, WebSocketMessage } from './services/websocket';
import { TicketType } from './types/game';
import './styles/dice.css';

function App() {
  const { 
    addPlayer, 
    addTicket, 
    rollDice, 
    players, 
    isGameStarted, 
    goHome,
    setMultiplayerMode,
    setRoomInfo,
    updateFromServer,
    getStateForSync
  } = useGameStore();

  const [showJoinScreen, setShowJoinScreen] = useState(false);
  const [wsService, setWsService] = useState<WebSocketService | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | undefined>();

  // WebSocket server URL - uses environment variable for production
  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

  const handleJoinGame = (room: string, password: string, playerName: string) => {
    setIsConnecting(true);
    setConnectionError(undefined);

    // Create WebSocket service
    const ws = new WebSocketService(
      WS_URL,
      (message) => handleWebSocketMessage(message, room, password, playerName),
      () => {
        console.log('Connected to server');
        setIsConnecting(false);
        // Send join message
        ws.send({
          type: 'join',
          room,
          password,
          name: playerName
        });
      },
      () => {
        console.log('Disconnected from server');
        setIsConnecting(false);
      },
      (error) => {
        console.error('WebSocket error:', error);
        setConnectionError(error);
        setIsConnecting(false);
      }
    );

    setWsService(ws);
    ws.connect();
  };

  const handleWebSocketMessage = (message: WebSocketMessage, room: string, password: string, playerName: string) => {
    console.log('Received message:', message);

    switch (message.type) {
      case 'joined':
        console.log('Successfully joined room');
        setShowJoinScreen(false);
        setMultiplayerMode(true);
        setRoomInfo(room, password, playerName);
        
        // If there's existing state, update from server
        if (message.state) {
          updateFromServer(message.state);
        }
        break;

      case 'state':
        // Update game state from server
        if (message.state) {
          updateFromServer(message.state);
        }
        break;

      case 'players':
        console.log(`Players in room: ${message.count}`);
        break;

      case 'error':
        setConnectionError(message.message || 'Unknown error');
        setIsConnecting(false);
        break;
    }
  };

  // Sync state changes to server
  useEffect(() => {
    if (wsService && wsService.isConnected()) {
      const state = getStateForSync();
      wsService.send({
        type: 'update',
        state
      });
    }
  }, [players, isGameStarted, wsService]);

  const handleAddPlayer = () => {
    const name = prompt('Enter player name:');
    if (name) {
      addPlayer(name);
    }
  };

  const handleGoHome = () => {
    if (wsService) {
      wsService.disconnect();
      setWsService(null);
    }
    setMultiplayerMode(false);
    setRoomInfo('', '', '');
    setShowJoinScreen(false);
    setConnectionError(undefined);
    goHome();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        {/* Only show controls when game is started */}
        {isGameStarted && (
          <div className="control-panel">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Game Controls</h2>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleAddPlayer}
                className="modern-button btn-green"
              >
                Add Player
              </button>
              <button
                onClick={() => addTicket('normal')}
                className="modern-button btn-yellow"
              >
                Add Normal Ticket
              </button>
              <button
                onClick={() => addTicket('urgent')}
                className="modern-button btn-orange"
              >
                Add Urgent Ticket
              </button>
              <button
                onClick={() => addTicket('fixed-date')}
                className="modern-button btn-pink"
              >
                Add Fixed Date Ticket
              </button>
              <button
                onClick={handleGoHome}
                className="modern-button btn-gray"
              >
                🏠 Home
              </button>
            </div>
          </div>
        )}
        
        {/* Show join screen if not in game and multiplayer mode is requested */}
        {showJoinScreen ? (
          <JoinScreen
            onJoin={handleJoinGame}
            isConnecting={isConnecting}
            error={connectionError}
          />
        ) : (
          <GameBoard onShowJoinScreen={() => setShowJoinScreen(true)} />
        )}
      </div>
    </div>
  );
}

export default App; 