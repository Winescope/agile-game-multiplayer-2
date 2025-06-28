export type TicketType = 'normal' | 'urgent' | 'fixed-date';
export type TicketStatus = 'todo' | 'phase1' | 'check' | 'phase2' | 'done';

export interface Ticket {
  id: string;
  type: TicketType;
  status: TicketStatus;
  points: {
    phase1: number;
    phase2: number;
  };
  hasBlocker: boolean;
  blockerPoints?: number;
  assignedTo?: number;
  assignedTo2?: number;
  createdRound: number;
  completedRound?: number;
  inProgressEnteredRound?: number;
}

export interface Player {
  id: number;
  name: string;
  currentDiceRoll: number | null;
  currentTicket: string | null;
  isHost: boolean;
  hasRolledThisRound: boolean;
}

export interface GameState {
  round: number;
  session: number;
  players: Player[];
  tickets: Ticket[];
  isGameStarted: boolean;
  hostId: number;
  session1Tickets?: Ticket[];
  session2Tickets?: Ticket[];
} 