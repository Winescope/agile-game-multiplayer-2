import React from 'react';
import { useGameStore } from '../store/gameStore';

export const PlayerControls: React.FC = () => {
  const { players, rollDice, session } = useGameStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-8 gap-4">
          {players.map((player) => (
            <div
              key={player.id}
              className={`p-4 rounded-lg ${
                player.isHost ? 'bg-purple-100' : 'bg-blue-100'
              }`}
            >
              <h3 className="font-semibold mb-2">{player.name}</h3>
              <button
                onClick={() => rollDice(player.id, Math.floor(Math.random() * 6) + 1)}
                className="w-full game-button primary"
                disabled={session === 1}
              >
                Roll Dice
              </button>
              <button
                onClick={() => useGameStore.getState().undoLastAction(player.id)}
                className="w-full game-button btn-gray mt-2"
              >
                Undo Last Action
              </button>
              <button onClick={() => alert('Test!')}>Test Button</button>
              {player.isHost && session === 1 && (
                <div className="text-sm text-purple-700">Game Master</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 