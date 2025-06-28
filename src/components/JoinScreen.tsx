import React, { useState } from 'react';

interface JoinScreenProps {
  onJoin: (room: string, password: string, playerName: string) => void;
  isConnecting: boolean;
  error?: string;
}

export const JoinScreen: React.FC<JoinScreenProps> = ({ onJoin, isConnecting, error }) => {
  const [room, setRoom] = useState('');
  const [password, setPassword] = useState('');
  const [playerName, setPlayerName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (room.trim() && password.trim() && playerName.trim()) {
      onJoin(room.trim(), password.trim(), playerName.trim());
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#EFE7DB',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Logo */}
      <img
        src="/mvw-logo.png"
        alt="MVW Logo"
        style={{
          width: '200px',
          height: '200px',
          objectFit: 'contain',
          marginBottom: '24px',
          border: '2px solid #333',
          background: '#EFE7DB'
        }}
      />
      
      <h1 style={{
        fontSize: '2.25rem',
        fontWeight: 'bold',
        marginBottom: '2rem',
        color: '#1f2937',
        fontFamily: 'Inter',
      }}>Join Multiplayer Game</h1>

      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        width: '100%',
        maxWidth: '400px',
        padding: '0 1rem'
      }}>
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '600',
            color: '#374151'
          }}>
            Room Name:
          </label>
          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="Enter room name"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontFamily: 'Inter'
            }}
            required
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '600',
            color: '#374151'
          }}>
            Password:
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter room password"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontFamily: 'Inter'
            }}
            required
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '600',
            color: '#374151'
          }}>
            Your Name:
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontFamily: 'Inter'
            }}
            required
          />
        </div>

        {error && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            color: '#dc2626',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isConnecting}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: isConnecting ? '#9ca3af' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            fontFamily: 'Inter',
            cursor: isConnecting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isConnecting ? 'Connecting...' : 'Join Game'}
        </button>
      </form>
    </div>
  );
}; 