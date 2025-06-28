import { create } from 'zustand';
import { GameState, Ticket, TicketType, TicketStatus, Player } from '../types/game';

interface GameStore extends GameState {
  startGame: () => void;
  addPlayer: (name: string) => void;
  removePlayer: (playerId: number) => void;
  rollDice: (playerId: number, diceValue: number) => void;
  addTicket: (type: TicketType) => void;
  assignTicket: (ticketId: string, playerId: number) => void;
  assignTicket2: (ticketId: string, playerId: number) => void;
  moveTicket: (ticketId: string, newStatus: TicketStatus) => void;
  addPoints: (ticketId: string, phase: 'phase1' | 'phase2' | 'blocker', points: number, playerId?: number) => void;
  nextRound: () => void;
  isHost: (playerId: number) => boolean;
  clearSession1Tickets: () => void;
  clearSession2Tickets: () => void;
  skipToSession2: () => void;
  goHome: () => void;
  addPointsWithHelper: (ticketId: string, phase: 'phase1' | 'phase2' | 'blocker', points: number, helperPlayerId: number) => void;
  setDiceValue: (playerId: number, value: number) => void;
  removeDiceValue: (playerId: number) => void;
  historyVersion: number;
  // Multiplayer methods
  setMultiplayerMode: (enabled: boolean) => void;
  setRoomInfo: (room: string, password: string, playerName: string) => void;
  updateFromServer: (state: any) => void;
  getStateForSync: () => any;
}

interface PlayerHistory {
  [playerId: number]: {
    tickets: Ticket[];
    diceValues: Record<number, number>;
    player: Player;
  }[];
}

const MAX_ROUNDS = 10;

// Utility to fix old tickets with status 'backlog'
function fixBacklogTickets(tickets: Ticket[]): Ticket[] {
  return tickets.map(ticket =>
    (ticket.status as any) === 'backlog' ? { ...ticket, status: 'todo' } : ticket
  );
}

const createInitialState = (): GameState & { diceValues: Record<number, number>, historyVersion: number, isMultiplayer: boolean, roomInfo: { room: string; password: string; playerName: string } | null } => ({
  round: 1,
  session: 1,
  players: [],
  tickets: [],
  isGameStarted: false,
  hostId: 1, // First player is always the host
  diceValues: {},
  historyVersion: 0,
  isMultiplayer: false,
  roomInfo: null,
});

let ticketCounter = 1;

// Function to reset ticket counter
const resetTicketCounter = () => {
  ticketCounter = 1;
};

// Helper to calculate urgent tickets count
const calculateUrgentTicketsCount = (playerCount: number): number => {
  return Math.ceil(playerCount * 0.75);
};

// Helper to calculate special tickets count (used for both urgent and fixed-date tickets)
const calculateSpecialTicketsCount = (playerCount: number): number => {
  return Math.ceil(playerCount * (2/3));
};

// Helper to calculate how many tickets should get blockers
const calculateBlockerCount = (tickets: Ticket[], percentage: number): number => {
  const inProgressOrMergingTickets = tickets.filter(
    t => (t.status === 'phase1' || t.status === 'phase2') && !t.hasBlocker
  );
  return Math.ceil(inProgressOrMergingTickets.length * percentage);
};

// Helper function to add blockers to tickets
const addBlockersToTickets = (tickets: Ticket[], blockersToAdd: number): Ticket[] => {
  const newTickets = [...tickets];
  const eligibleTickets = newTickets.filter(
    t => (t.status === 'phase1' || t.status === 'phase2') && !t.hasBlocker
  );
  
  // Randomly select tickets to block
  for (let i = 0; i < blockersToAdd && i < eligibleTickets.length; i++) {
    const randomIndex = Math.floor(Math.random() * eligibleTickets.length);
    const ticketToBlock = eligibleTickets[randomIndex];
    
    // Update the ticket in newTickets array
    const ticketIndex = newTickets.findIndex(t => t.id === ticketToBlock.id);
    if (ticketIndex !== -1) {
      newTickets[ticketIndex] = {
        ...newTickets[ticketIndex],
        hasBlocker: true,
        blockerPoints: 0,
      };
    }
    
    // Remove the ticket from eligible tickets to avoid double selection
    eligibleTickets.splice(randomIndex, 1);
  }
  
  return newTickets;
};

export const useGameStore = create<GameStore & { 
  playerHistory: PlayerHistory; 
  undoLastAction: (playerId: number) => void; 
  savePlayerHistory: (playerId: number) => void; 
  diceValues: Record<number, number>;
  isMultiplayer: boolean;
  roomInfo: { room: string; password: string; playerName: string } | null;
}>((set, get) => ({
  ...createInitialState(),
  playerHistory: {},

  // Helper to save player state before an action
  savePlayerHistory: (playerId: number) => {
    const state = get();
    console.log(`Saving history for player ${playerId}:`, {
      ticketsCount: state.tickets.length,
      diceValues: state.diceValues,
      tickets: state.tickets.map(t => ({ id: t.id, points: t.points, hasBlocker: t.hasBlocker, blockerPoints: t.blockerPoints }))
    });
    set((store) => {
      const player = store.players.find(p => p.id === playerId);
      if (!player) return {};
      const history = store.playerHistory[playerId] || [];
      return {
        playerHistory: {
          ...store.playerHistory,
          [playerId]: [...history, {
            tickets: store.tickets.map(t => ({ ...t })),
            diceValues: { ...store.diceValues },
            player: { ...player }
          }]
        }
      };
    });
  },

  undoLastAction: (playerId: number) => {
    set((store) => {
      const history = store.playerHistory[playerId] || [];
      console.log(`Undoing for player ${playerId}:`, {
        historyLength: history.length,
        currentTickets: store.tickets.map(t => ({ id: t.id, points: t.points, hasBlocker: t.hasBlocker, blockerPoints: t.blockerPoints }))
      });
      if (history.length === 0) return {};
      const last = history[history.length - 1];
      console.log(`Restoring to:`, {
        tickets: last.tickets.map(t => ({ id: t.id, points: t.points, hasBlocker: t.hasBlocker, blockerPoints: t.blockerPoints })),
        diceValues: last.diceValues
      });
      return {
        tickets: last.tickets.map(t => ({ ...t })),
        diceValues: last.diceValues,
        players: store.players.map(p => p.id === playerId ? { ...last.player } : p),
        playerHistory: {
          ...store.playerHistory,
          [playerId]: history.slice(0, -1)
        },
        historyVersion: (store.historyVersion || 0) + 1
      };
    });
  },

  startGame: () => set((state) => ({
    ...state,
    tickets: fixBacklogTickets(state.tickets),
    isGameStarted: true
  })),

  addPlayer: (name) =>
    set((state) => ({
      players: [
        ...state.players,
        { 
          id: state.players.length + 1, 
          name, 
          currentDiceRoll: null, 
          currentTicket: null,
          isHost: state.players.length === 0, // First player is the host
          hasRolledThisRound: false
        },
      ],
    })),

  removePlayer: (playerId) => {
    set((state) => {
      const updatedPlayers = state.players.filter(p => p.id !== playerId);
      
      // If we removed the host and there are still players, make the first remaining player the host
      if (state.hostId === playerId && updatedPlayers.length > 0) {
        const newHostId = updatedPlayers[0].id;
        return {
          ...state,
          players: updatedPlayers.map(p => ({
            ...p,
            isHost: p.id === newHostId
          })),
          hostId: newHostId
        };
      }
      
      return {
        ...state,
        players: updatedPlayers,
      };
    });
  },

  rollDice: (playerId, diceValue) => {
    get().savePlayerHistory(playerId);
    set((state) => {
      const player = state.players.find(p => p.id === playerId);
      
      // Check if player has already rolled this round
      if (player && player.hasRolledThisRound) {
        console.log('Player', playerId, 'has already rolled this round');
        return state; // Don't allow another roll
      }
      
      console.log('Rolling dice for player', playerId, 'result:', diceValue);
      
      const updatedPlayers = state.players.map((player) => {
        if (player.id === playerId) {
          return { 
            ...player, 
            currentDiceRoll: diceValue,
            hasRolledThisRound: true
          };
        }
        return player;
      });

      return {
        ...state,
        players: updatedPlayers,
      };
    });
  },

  nextRound: () => {
    set((state) => {
      console.log('nextRound called:', { currentRound: state.round, currentSession: state.session, maxRounds: MAX_ROUNDS });
      if (state.round >= MAX_ROUNDS) {
        // If we're at max rounds in session 1, start session 2
        if (state.session === 1) {
          console.log('Starting session 2');
          return {
            ...state,
            round: 1,
            session: 2,
            session1Tickets: state.tickets, // Save session 1 tickets for evaluation
            tickets: [], // Reset tickets for session 2
            players: state.players.map(player => ({
              ...player,
              hasRolledThisRound: false,
              currentDiceRoll: null
            }))
          };
        }
        // If we're at max rounds in session 2, game is over
        if (state.session === 2) {
          console.log('Session 2 ended, saving tickets for evaluation:', state.tickets.length);
          return {
            ...state,
            round: 1, // Set round to 1 so evaluation screen shows
            session2Tickets: state.tickets, // Save session 2 tickets for evaluation
            tickets: [], // Optionally clear tickets
            players: state.players.map(player => ({
              ...player,
              hasRolledThisRound: false,
              currentDiceRoll: null
            }))
          };
        }
        return state;
      }
      
      const nextRound = state.round + 1;
      let newTickets = [...state.tickets];

      // Handle special cases for different rounds
      if (nextRound === 3 || nextRound === 6 || nextRound === 8) {
        // Add blockers to in-progress/merging tickets
        const blockersToAdd = calculateBlockerCount(newTickets, nextRound === 3 ? 0.3 : nextRound === 6 ? 0.4 : 0.3);
        newTickets = addBlockersToTickets(newTickets, blockersToAdd);
      } else if (nextRound === 4 || nextRound === 5) {
        // Add urgent/fixed-date tickets
        const ticketsCount = calculateSpecialTicketsCount(state.players.length);
        const ticketType = nextRound === 4 ? 'urgent' : 'fixed-date';
        for (let i = 0; i < ticketsCount; i++) {
          newTickets.push({
            id: String(ticketCounter++),
            type: ticketType,
            status: 'todo',
            points: {
              phase1: 0,
              phase2: 0,
            },
            hasBlocker: false,
            blockerPoints: 0,
            assignedTo: undefined,
            assignedTo2: undefined,
            createdRound: state.round,
            completedRound: undefined,
            inProgressEnteredRound: undefined,
          });
        }
      }

      return {
        ...state,
        round: nextRound,
        tickets: newTickets,
        players: state.players.map(player => ({
          ...player,
          hasRolledThisRound: false,
          currentDiceRoll: null // Also reset dice rolls for new round
        }))
      };
    });
  },

  isHost: (playerId) => {
    const state = get();
    return playerId === state.hostId;
  },

  addTicket: (type: TicketType) => {
    const state = get();
    const newTicket: Ticket = {
      id: String(ticketCounter++),
      type,
      status: 'todo',
      points: {
        phase1: 0,
        phase2: 0,
      },
      hasBlocker: false,
      blockerPoints: 0,
      assignedTo: undefined,
      assignedTo2: undefined,
      createdRound: state.round,
      completedRound: undefined,
      inProgressEnteredRound: undefined,
    };

    set((state) => ({
      tickets: [...state.tickets, newTicket],
    }));
  },

  assignTicket: (ticketId, playerId) => {
    get().savePlayerHistory(playerId);
    console.log('Assigning ticket in store:', { ticketId, playerId });
    set((state) => {
      // First, unassign the ticket from any previous player
      const updatedPlayers = state.players.map((player) => ({
        ...player,
        currentTicket: player.currentTicket === ticketId ? null : player.currentTicket,
      }));

      // Then assign it to the new player
      const targetPlayerIndex = updatedPlayers.findIndex((p) => p.id === playerId);
      if (targetPlayerIndex !== -1) {
        updatedPlayers[targetPlayerIndex] = {
          ...updatedPlayers[targetPlayerIndex],
          currentTicket: ticketId,
        };
      }

      // Update the ticket's assignment
      const updatedTickets = state.tickets.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, assignedTo: playerId } : ticket
      );

      return {
        players: updatedPlayers,
        tickets: updatedTickets,
      };
    });
  },

  assignTicket2: (ticketId, playerId) => {
    get().savePlayerHistory(playerId);
    console.log('Assigning ticket2 in store:', { ticketId, playerId });
    set((state) => {
      // Update the ticket's second assignment
      const updatedTickets = state.tickets.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, assignedTo2: playerId } : ticket
      );

      return {
        ...state,
        tickets: updatedTickets,
      };
    });
  },

  moveTicket: (ticketId, newStatus) => {
    const state = get();
    const ticket = state.tickets.find(t => t.id === ticketId);
    if (ticket && ticket.assignedTo) {
      get().savePlayerHistory(ticket.assignedTo);
    }
    set((state) => {
      const ticket = state.tickets.find(t => t.id === ticketId);
      if (!ticket) return state;
      
      // Only prevent movement if the ticket is blocked
      if (ticket.hasBlocker) return state;

      // Determine if moving to an In Progress column
      const inProgressColumns = ['phase1', 'check', 'phase2'];
      const isMovingToInProgress = inProgressColumns.includes(newStatus);
      const shouldSetInProgressRound = isMovingToInProgress && !ticket.inProgressEnteredRound;

      // If moving to done, set completedRound
      return {
        tickets: state.tickets.map(t =>
          t.id === ticketId
            ? {
                ...t,
                status: newStatus,
                completedRound: newStatus === 'done' && !t.completedRound ? state.round : t.completedRound,
                inProgressEnteredRound: shouldSetInProgressRound ? state.round : t.inProgressEnteredRound,
              }
            : t
        ),
      };
    });
  },

  addPoints: (ticketId, phase, points, playerId?: number) => {
    // Save history for the player using the dice (if provided) or the assigned player
    const state = get();
    const ticket = state.tickets.find(t => t.id === ticketId);
    const playerToSave = playerId || (ticket && ticket.assignedTo);
    if (playerToSave) {
      get().savePlayerHistory(playerToSave);
    }
    console.log('Adding points to ticket:', { ticketId, phase, points, playerId });
    set((state) => {
      const updatedTickets = state.tickets.map((ticket) => {
        if (ticket.id === ticketId) {
          const updatedTicket = { ...ticket };
          
          if (phase === 'blocker') {
            updatedTicket.blockerPoints = (updatedTicket.blockerPoints || 0) + points;
            // Remove blocker if it's complete
            if (updatedTicket.blockerPoints >= 4) {
              updatedTicket.hasBlocker = false;
              updatedTicket.blockerPoints = 0;
            }
          } else if (phase === 'phase1') {
            updatedTicket.points = {
              ...updatedTicket.points,
              phase1: Math.min(6, updatedTicket.points.phase1 + points)
            };
          } else if (phase === 'phase2') {
            updatedTicket.points = {
              ...updatedTicket.points,
              phase2: Math.min(6, updatedTicket.points.phase2 + points)
            };
          }
          
          return updatedTicket;
        }
        return ticket;
      });

      return {
        ...state,
        tickets: updatedTickets,
      };
    });
  },

  addPointsWithHelper: (ticketId, phase, points, helperPlayerId) => {
    get().savePlayerHistory(helperPlayerId);
    console.log('Adding points to ticket with helper:', { ticketId, phase, points, helperPlayerId });
    set((state) => {
      const updatedTickets = state.tickets.map((ticket) => {
        if (ticket.id === ticketId) {
          const updatedTicket = { ...ticket };
          
          if (phase === 'blocker') {
            updatedTicket.blockerPoints = (updatedTicket.blockerPoints || 0) + points;
            // Remove blocker if it's complete
            if (updatedTicket.blockerPoints >= 4) {
              updatedTicket.hasBlocker = false;
              updatedTicket.blockerPoints = 0;
            }
          } else if (phase === 'phase1') {
            updatedTicket.points = {
              ...updatedTicket.points,
              phase1: Math.min(6, updatedTicket.points.phase1 + points)
            };
          } else if (phase === 'phase2') {
            updatedTicket.points = {
              ...updatedTicket.points,
              phase2: Math.min(6, updatedTicket.points.phase2 + points)
            };
          }
          
          // In Session 2, if someone is helping and they're not the primary assignee, assign them as second player
          if (state.session === 2 && helperPlayerId && ticket.assignedTo && ticket.assignedTo !== helperPlayerId) {
            updatedTicket.assignedTo2 = helperPlayerId;
          }
          
          return updatedTicket;
        }
        return ticket;
      });

      return {
        ...state,
        tickets: updatedTickets,
      };
    });
  },

  clearSession1Tickets: () => {
    set((state) => ({
      ...state,
      session1Tickets: [],
    }));
  },

  clearSession2Tickets: () => {
    set((state) => ({
      ...state,
      session2Tickets: [],
    }));
  },

  skipToSession2: () => {
    set((state) => ({
      ...state,
      session: 2,
      round: 1,
      isGameStarted: true,
      tickets: [], // Start with empty tickets for session 2
      session1Tickets: undefined, // Clear session1Tickets when starting Session 2 directly
    }));
  },

  goHome: () => {
    resetTicketCounter(); // Reset ticket counter when going home
    set((state) => ({
      ...state,
      session: 1,
      round: 1,
      isGameStarted: false,
      tickets: [],
      players: [],
      session1Tickets: undefined,
      session2Tickets: undefined,
    }));
  },

  setDiceValue: (playerId: number, value: number) => {
    set((state) => ({
      diceValues: { ...state.diceValues, [playerId]: value }
    }));
  },

  removeDiceValue: (playerId: number) => {
    set((state) => {
      const newDiceValues = { ...state.diceValues };
      delete newDiceValues[playerId];
      return { diceValues: newDiceValues };
    });
  },

  // Multiplayer methods
  setMultiplayerMode: (enabled: boolean) => {
    set((state) => ({
      ...state,
      isMultiplayer: enabled
    }));
  },

  setRoomInfo: (room: string, password: string, playerName: string) => {
    set((state) => ({
      ...state,
      roomInfo: { room, password, playerName }
    }));
  },

  updateFromServer: (state: any) => {
    if (state) {
      set((currentState) => ({
        ...currentState,
        ...state,
        historyVersion: (currentState.historyVersion || 0) + 1
      }));
    }
  },

  getStateForSync: () => {
    const state = get();
    return {
      round: state.round,
      session: state.session,
      players: state.players,
      tickets: state.tickets,
      isGameStarted: state.isGameStarted,
      hostId: state.hostId,
      diceValues: state.diceValues,
      session1Tickets: state.session1Tickets,
      session2Tickets: state.session2Tickets
    };
  },
})); 