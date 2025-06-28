export type TicketType = 'normal' | 'urgent' | 'fixed-date';
export type TicketColor = 'yellow' | 'orange' | 'pink';
export type TicketStatus = 'todo' | 'phase1' | 'check' | 'phase2' | 'done';

export interface Blocker {
  id: string;
  points: number;
  maxPoints: number;
}

export interface Ticket {
  id: string;
  number: number;
  type: TicketType;
  color: TicketColor;
  status: TicketStatus;
  phase1Points: number;
  phase2Points: number;
  assignedPlayer?: number;
  blocker?: Blocker;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}

export interface Player {
  id: number;
  name: string;
  currentTicket?: string;
  isHost: boolean;
}

export interface GameState {
  session: 1 | 2;
  round: number;
  players: Player[];
  tickets: Ticket[];
  isGameStarted: boolean;
  currentPlayer: number;
} 