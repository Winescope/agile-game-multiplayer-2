import React from 'react';
import { useGameStore } from '../store/gameStore';
import { TicketStatus, TicketType } from '../types/game';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  useDraggable,
  useDroppable,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, ResponsiveContainer } from 'recharts';

const columns: TicketStatus[] = ['phase1', 'check', 'phase2', 'done'];
const columnTitles: Record<TicketStatus, string> = {
  todo: 'Backlog',
  phase1: 'In Progress',
  check: 'Check',
  phase2: 'Merging',
  done: 'Done',
};

const columnColors: Record<TicketStatus, string> = {
  todo: 'bg-gradient-to-br from-blue-50 to-blue-100',
  phase1: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
  check: 'bg-gradient-to-br from-purple-50 to-purple-100',
  phase2: 'bg-gradient-to-br from-red-50 to-red-100',
  done: 'bg-gradient-to-br from-green-50 to-green-100',
};

interface TicketProps {
  id: string;
  type: TicketType;
  points: { phase1: number; phase2: number };
  hasBlocker: boolean;
  blockerPoints?: number;
  assignedTo?: number;
  playerName?: string;
  assignedTo2?: number;
  playerName2?: string;
  onClick: () => void;
}

const Ticket: React.FC<TicketProps> = ({ id, type, points, hasBlocker, blockerPoints = 0, assignedTo, playerName, assignedTo2, playerName2, onClick }) => {
  const { session } = useGameStore();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
    data: { type: 'ticket', id, currentAssignee: assignedTo },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `ticket-${id}`,
    data: { type: 'ticket', id, points, hasBlocker, blockerPoints }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 1,
    cursor: hasBlocker ? 'not-allowed' : 'grab',
  } : undefined;

  // Debug log
  if (isDragging) {
    console.log('Ticket is being dragged:', id, isDragging);
  }

  // Combine the drag ref and drop ref
  const setRefs = (element: HTMLElement | null) => {
    setNodeRef(element);
    setDropRef(element);
  };

  const ticketClass = hasBlocker ? 'blocked' : type;
  const phase1Progress = (points.phase1 / 6) * 100;
  const phase2Progress = (points.phase2 / 6) * 100;

  return (
    <div
      ref={setRefs}
      {...(hasBlocker ? {} : listeners)}
      {...(hasBlocker ? {} : attributes)}
      onClick={onClick}
      className={`
        ticket-card ${ticketClass}
        ${isDragging ? 'dragging' : ''}
        ${isOver ? 'ring-4 ring-green-500' : ''}
        transform-gpu ${hasBlocker ? 'cursor-not-allowed' : 'cursor-move'}
      `}
      style={{
        ...style,
        minWidth: '200px',
        minHeight: '120px',
      }}
    >
      {/* Blocker Overlay */}
      {hasBlocker && (
        <div className="absolute inset-0 blocker-overlay flex flex-col items-center justify-center">
          <div className="blocker-content">
            <div className="blocker-title">BLOCKED</div>
            <div className="blocker-subtitle">{blockerPoints}/4 points needed</div>
          </div>
        </div>
      )}

      <div className="ticket-header">
        <div className="flex justify-between items-start">
          <div className="ticket-id">#{id}</div>
          <span className={`ticket-type-badge ${type}`}>
            {type === 'urgent' ? 'Urgent' : type === 'fixed-date' ? 'Fixed Date' : 'Normal'}
          </span>
        </div>
        </div>

      <div className="ticket-content">
        <div className="ticket-points">
          <div>
            <div className="point-row">
              <span className="point-label">Phase 1:</span>
              <span className="point-value">{points.phase1}/6</span>
      </div>
            <div className="point-progress">
              <div 
                className="point-progress-fill" 
                style={{ width: `${phase1Progress}%` }}
              ></div>
        </div>
        </div>
          
          <div>
            <div className="point-row">
              <span className="point-label">Phase 2:</span>
              <span className="point-value">{points.phase2}/6</span>
            </div>
            <div className="point-progress">
              <div 
                className="point-progress-fill" 
                style={{ width: `${phase2Progress}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        {/* Player assignments */}
        <div className="space-y-1">
          {assignedTo && playerName && (
            <div className={`player-badge player-${assignedTo}`}>
              {playerName}
            </div>
          )}
          {session === 2 && assignedTo2 && playerName2 && (
            <div className={`player-badge player-${assignedTo2}`}>
              {playerName2}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface CellProps {
  playerId?: number;
  playerName?: string;
  status: TicketStatus;
  tickets: any[];
  players: any[];
  onTicketClick: (ticketId: string, status: TicketStatus) => void;
}

const Cell: React.FC<CellProps> = ({ playerId, playerName, status, tickets, players, onTicketClick }) => {
  const { session } = useGameStore();
  const dropId = playerId ? `cell-${playerId}-${status}` : `cell-unassigned-${status}`;
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: { type: 'cell', playerId, status },
  });

  // Check if player already has a ticket assigned in session 2
  const playerAlreadyHasTicket = session === 2 && playerId && status === 'todo' && 
    tickets.some(ticket => ticket.assignedTo === playerId);

  return (
    <div
      ref={setNodeRef}
      className={`
        column-cell
        transition-all duration-200
        ${isOver ? 'ring-2 ring-blue-500 shadow-lg scale-102 z-10' : ''}
        ${playerAlreadyHasTicket ? 'bg-red-50 border-red-200' : ''}
      `}
      style={{ minHeight: '160px' }}
    >
      {/* Drop zone indicator */}
      <div className={`
        drop-zone
        ${isOver ? 'active' : ''}
        mb-4
      `}>
        {/* "Add tickets here" text */}
        <div className={`
          drop-text
          ${isOver ? 'active' : ''}
          transition-opacity duration-200
        `}>
          {playerAlreadyHasTicket ? 'Player has max tickets' : 'Add tickets here'}
        </div>
      </div>

      {/* Session 2 warning for player with ticket */}
      {playerAlreadyHasTicket && (
        <div className="text-xs text-red-600 font-medium mb-2 text-center">
          ⚠️ Max 1 task per person in Session 2
        </div>
      )}

      {/* Tickets */}
      <div className="space-y-3">
        {tickets.map((ticket) => {
          // For backlog, find the player name from the ticket's assignedTo
          const ticketPlayerName = playerName || (ticket.assignedTo ? players.find(p => p.id === ticket.assignedTo)?.name : undefined);
          const ticketPlayerName2 = ticket.assignedTo2 ? players.find(p => p.id === ticket.assignedTo2)?.name : undefined;
          
          return (
          <Ticket
            key={ticket.id}
              id={ticket.id}
              type={ticket.type}
              points={ticket.points}
              hasBlocker={ticket.hasBlocker}
              blockerPoints={ticket.blockerPoints}
              assignedTo={ticket.assignedTo}
              playerName={ticketPlayerName}
              assignedTo2={ticket.assignedTo2}
              playerName2={ticketPlayerName2}
            onClick={() => onTicketClick(ticket.id, status)}
          />
          );
        })}
      </div>
    </div>
  );
};

const Dice: React.FC<{ value: number | null; remainingValue: number; playerId: number }> = ({ value, remainingValue, playerId }) => {
  // Only render if we have a valid value and remaining points
  if (value === null || remainingValue <= 0) {
    return null;
  }

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `dice-${playerId}`,
    data: { type: 'dice', value: remainingValue, playerId }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 1,
  } : undefined;

  // Function to render dots based on dice value
  const renderDots = (value: number) => {
    const dots: JSX.Element[] = [];
    
    // Standard dice dot positions (3x3 grid)
    const positions = [
      { x: 25, y: 25 }, // top-left
      { x: 50, y: 25 }, // top-center  
      { x: 75, y: 25 }, // top-right
      { x: 25, y: 50 }, // middle-left
      { x: 50, y: 50 }, // center
      { x: 75, y: 50 }, // middle-right
      { x: 25, y: 75 }, // bottom-left
      { x: 50, y: 75 }, // bottom-center
      { x: 75, y: 75 }, // bottom-right
    ];

    // Standard dice patterns
    const patterns = {
      1: [4], // center
      2: [0, 8], // top-left, bottom-right
      3: [0, 4, 8], // top-left, center, bottom-right
      4: [0, 2, 6, 8], // corners
      5: [0, 2, 4, 6, 8], // corners + center
      6: [0, 2, 3, 5, 6, 8], // left and right columns
    };

    const pattern = patterns[value as keyof typeof patterns] || [];
    
    pattern.forEach((index) => {
      const pos = positions[index];
      dots.push(
        <circle 
          key={index}
          cx={pos.x} 
          cy={pos.y} 
          r="6" 
          fill="black" 
          stroke="none"
        />
      );
    });

    return dots;
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`cursor-grab ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="relative">
        <svg 
          width="80" 
          height="80" 
          viewBox="0 0 100 100" 
          className="drop-shadow-md"
        >
          {/* Dice background with 3D effect */}
          <defs>
            <linearGradient id="diceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#f0f0f0', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          
          {/* Main dice face */}
          <rect 
            x="5" 
            y="5" 
            width="90" 
            height="90" 
            rx="8" 
            ry="8"
            fill="url(#diceGradient)"
            stroke="#333333"
            strokeWidth="2"
          />
          
          {/* Inner border for depth */}
          <rect 
            x="8" 
            y="8" 
            width="84" 
            height="84" 
            rx="6" 
            ry="6"
            fill="none"
            stroke="#666666"
            strokeWidth="1"
          />
          
          {/* Dice dots */}
          {renderDots(remainingValue)}
        </svg>
      </div>
    </div>
  );
};

// Add these CSS classes to your global styles or a separate CSS file
const globalStyles = `
  .perspective-500 {
    perspective: 500px;
  }
  
  .preserve-3d {
    transform-style: preserve-3d;
  }
  
  .backface-hidden {
    backface-visibility: hidden;
  }
  
  .rotate-y-180 {
    transform: rotateY(180deg);
  }
`;

export const GameBoard: React.FC<{ onShowJoinScreen?: () => void }> = ({ onShowJoinScreen }) => {
  const { tickets, players, isGameStarted, startGame, moveTicket, assignTicket, assignTicket2, rollDice, addPoints, addPointsWithHelper, round, session, nextRound, isHost, session1Tickets = [], session2Tickets = [], skipToSession2, diceValues, setDiceValue, removeDiceValue, historyVersion } = useGameStore();
  const [draggedTicket, setDraggedTicket] = React.useState<string | null>(null);
  const [showBeginningScreen, setShowBeginningScreen] = React.useState(false);
  const [showSessionSelection, setShowSessionSelection] = React.useState(false);
  const [showSession2BeginningScreen, setShowSession2BeginningScreen] = React.useState(false);
  const [showSessionEvaluation, setShowSessionEvaluation] = React.useState(false);
  const [showRoundPopup, setShowRoundPopup] = React.useState(false);
  const [currentRoundDisplay, setCurrentRoundDisplay] = React.useState(1);
  const [showFinalComparison, setShowFinalComparison] = React.useState(false);
  const [logoVisible, setLogoVisible] = React.useState(false);

  // Round messages for different rounds
  const roundMessages = [
    "Let's get started!",
    "Building momentum...",
    "Oh no! Some work got blocked",
    "Start working on these tickets as soon as possible, they are urgent!",
    "The fixed date tickets must be finished before round 10!",
    "Oh no! More work got blocked",
    "Keep pushing forward!",
    "Oh no! Some work got blocked",
    "Almost finished!",
    "Final round!"
  ];

  const getRoundMessage = (roundNumber: number) => {
    return roundMessages[roundNumber - 1] || "Keep going!";
  };

  // Calculate session 1 statistics
  const getSessionStats = (tickets: any[]) => {
    const completedTickets = tickets.filter(t => t.status === 'done');
    const urgentTickets = tickets.filter(t => t.type === 'urgent');
    const fixedDateTickets = tickets.filter(t => t.type === 'fixed-date');
    const blockedTickets = tickets.filter(t => t.hasBlocker);
    
    return {
      totalCompleted: completedTickets.length,
      urgentCompleted: urgentTickets.filter(t => t.status === 'done').length,
      urgentTotal: urgentTickets.length,
      fixedDateCompleted: fixedDateTickets.filter(t => t.status === 'done').length,
      fixedDateTotal: fixedDateTickets.length,
      blockedResolved: blockedTickets.filter(t => !t.hasBlocker).length,
      blockedTotal: blockedTickets.length
    };
  };

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 100,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  // Show round popup when round changes
  React.useEffect(() => {
    if (isGameStarted && round > 0) {
      console.log('Showing round popup for round:', round);
      setCurrentRoundDisplay(round);
      setShowRoundPopup(true);
      
      // Hide popup after 3 seconds
      const timer = setTimeout(() => {
        console.log('Hiding round popup');
        setShowRoundPopup(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [round, isGameStarted]);

  // Show session evaluation when transitioning to session 2
  React.useEffect(() => {
    if (session === 2 && round === 1 && session1Tickets && session1Tickets.length > 0) {
      setShowSessionEvaluation(true);
    }
  }, [session, round, session1Tickets]);

  // Add a dummy useEffect to force re-render on historyVersion change
  React.useEffect(() => {}, [historyVersion]);

  // Trigger logo animation on component mount
  React.useEffect(() => {
    console.log('Animation useEffect triggered, isGameStarted:', isGameStarted);
    if (!isGameStarted) {
      // Reset animation state first
      setLogoVisible(false);
      console.log('Setting logoVisible to false, will animate in 100ms');
      const timer = setTimeout(() => {
        setLogoVisible(true);
        console.log('Setting logoVisible to true - animation should start');
      }, 100); // Small delay to ensure smooth animation
      return () => clearTimeout(timer);
    } else {
      // Reset when game starts
      setLogoVisible(false);
      console.log('Game started, setting logoVisible to false');
    }
  }, [isGameStarted]);

  // Force animation reset when component mounts
  React.useEffect(() => {
    if (!isGameStarted) {
      console.log('Component mounted, resetting animation');
      setLogoVisible(false);
      const timer = setTimeout(() => {
        setLogoVisible(true);
        console.log('Initial animation triggered');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, []); // Empty dependency array - only run on mount

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'ticket') {
      setDraggedTicket(active.id as string);
    }
  };

  const handleRollDice = (playerId: number) => {
    const player = players.find(p => p.id === playerId);
    
    // Check if player has already rolled this round
    if (player && player.hasRolledThisRound) {
      console.log('Player', playerId, 'has already rolled this round');
      return; // Don't allow another roll
    }
    
    // Generate dice roll locally first
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    console.log('Rolling dice for player', playerId, 'result:', diceRoll);
    
    // Update store with the same dice roll
    rollDice(playerId, diceRoll);
    // Update dice values in the store
    setDiceValue(playerId, diceRoll);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setDraggedTicket(null);
      return;
    }

    const activeType = active.data.current?.type;
    const activeId = active.id.toString();

    if (activeType === 'ticket') {
      // Handle ticket movement
      const ticketId = draggedTicket;
      const cellId = over.id.toString();
      const [, targetId, targetStatus] = cellId.split('-');

      if (ticketId && targetStatus) {
        // Handle player assignment if it's a player cell
        if (targetId !== 'unassigned') {
          const numTargetId = parseInt(targetId);
          if (!isNaN(numTargetId)) {
            // Find the ticket to check current assignments
            const ticket = tickets.find(t => t.id === ticketId);
            
            if (ticket) {
              // In Session 2, allow second player assignment
              if (session === 2 && ticket.assignedTo && ticket.assignedTo !== numTargetId) {
                // Assign as second player
                assignTicket2(ticketId, numTargetId);
              } else {
                // Assign as primary player
                assignTicket(ticketId, numTargetId);
              }
            } else {
              // Fallback to primary assignment
              assignTicket(ticketId, numTargetId);
            }
          }
        }
        // Only update the status, never change the ticket type
        moveTicket(ticketId, targetStatus as TicketStatus);
      }
    } else if (activeType === 'dice') {
      // Handle dice drop on ticket
      const diceValue = active.data.current?.value;
      const playerId = active.data.current?.playerId;
      const [, ticketId] = over.id.toString().split('-');
      
      if (diceValue && ticketId && playerId) {
        // Find the ticket to determine which phase needs points
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
          // If ticket has a blocker, points go to the blocker first
          if (ticket.hasBlocker) {
            // Only allow values of 4, 5, or 6 for blockers
            if (diceValue >= 4) {
              // Use addPointsWithHelper if someone is helping
              if (session === 2 && ticket.assignedTo && ticket.assignedTo !== playerId) {
                addPointsWithHelper(ticketId, 'blocker', diceValue, playerId);
              } else {
                addPoints(ticketId, 'blocker', diceValue, playerId);
              }
              // Remove dice after successful use
              removeDiceValue(playerId);
            }
            // If dice value is less than 4, do nothing (dice bounces back)
            return;
          }

          // Handle regular ticket points
          let phase: 'phase1' | 'phase2' = 'phase1';
          let currentPoints = ticket.points.phase1;
          
          // If phase1 is complete, work on phase2
          if (ticket.points.phase1 >= 6) {
            phase = 'phase2';
            currentPoints = ticket.points.phase2;
          }

          // In session 2, check if player is helping a colleague's ticket
          let effectiveDiceValue = diceValue;
          if (session === 2 && ticket.assignedTo && ticket.assignedTo !== playerId) {
            // Player is helping a colleague's ticket - points count as half value
            effectiveDiceValue = Math.floor(diceValue / 2);
            console.log(`Player ${playerId} helping colleague's ticket. Dice value: ${diceValue} → ${effectiveDiceValue}`);
          }

          // Calculate how many points we can add to this phase
          const pointsNeeded = 6 - currentPoints;
          const pointsToAdd = Math.min(effectiveDiceValue, pointsNeeded);

          if (pointsToAdd > 0) {
            // Add points to the ticket - use addPointsWithHelper if someone is helping
            if (session === 2 && ticket.assignedTo && ticket.assignedTo !== playerId) {
              addPointsWithHelper(ticketId, phase, pointsToAdd, playerId);
            } else {
              addPoints(ticketId, phase, pointsToAdd, playerId);
            }

            // Calculate remaining points (use effective dice value for remaining calculation)
            const remainingPoints = effectiveDiceValue - pointsToAdd;
            
            // Remove the dice if no points remain, otherwise update the value
            if (remainingPoints <= 0) {
              removeDiceValue(playerId);
            } else {
              setDiceValue(playerId, remainingPoints);
            }
          }
        }
      }
    }

    setDraggedTicket(null);
  };

  const handleTicketClick = (ticketId: string, currentStatus: TicketStatus) => {
    if (currentStatus === 'todo') {
      return; // Do not allow moving tickets from the backlog by clicking
    }

    const statusIndex = columns.indexOf(currentStatus);
    if (statusIndex < columns.length - 1) {
      let nextStatus = columns[statusIndex + 1];
      
      // In session 2, skip the check phase - move directly from check to phase2
      if (session === 2 && currentStatus === 'check') {
        nextStatus = 'phase2';
      }
      
      moveTicket(ticketId, nextStatus);
    }
  };

  const draggedTicketData = React.useMemo(() => {
    if (!draggedTicket) return null;
    return tickets.find(t => t.id === draggedTicket);
  }, [draggedTicket, tickets]);

  // Session 2 beginning screen
  if (showSession2BeginningScreen) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center z-[999999] overflow-y-auto p-4"
        style={{ backgroundColor: '#EFE7DB' }}
      >
        <div className="max-w-6xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-800 mb-4 font-['Inter']">Welcome to Session 2: Collaborative Work!</h1>
            <p className="text-xl text-gray-600 font-['Inter']">Work together as a team to achieve better results</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
              <div 
                className="rounded-2xl p-6"
                style={{ backgroundColor: '#EFE7DB', border: '1px solid #D4C4A8' }}
              >
                <h3 className="text-2xl font-bold text-gray-800 mb-4 font-['Inter']">🎯 Game Objective</h3>
                <p className="text-gray-700 leading-relaxed font-['Inter']">
                  Work in duos to complete tickets collaboratively. The goal is to <strong>stop starting and start finishing</strong>. Focus on completing tickets rather than starting new ones.
                </p>
              </div>
              
              <div 
                className="rounded-2xl p-6"
                style={{ backgroundColor: '#EFE7DB', border: '1px solid #D4C4A8' }}
              >
                <h3 className="text-2xl font-bold text-gray-800 mb-4 font-['Inter']">🎲 How to Play</h3>
                <ul className="text-gray-700 space-y-2 font-['Inter']">
                  <li>Work in duos - maximum 1 task per person</li>
                  <li>Add players to your team using the "Add Player" button</li>
                  <li>Add tickets to the backlog using the ticket buttons</li>
                  <li>Assign tickets to team members by dragging them</li>
                  <li>Roll dice to add points and move tickets through phases</li>
                  <li><strong>Focus on finishing</strong> rather than starting new tickets</li>
                </ul>
              </div>
            </div>
            
            <div className="space-y-6">
              <div 
                className="rounded-2xl p-6"
                style={{ backgroundColor: '#EFE7DB', border: '1px solid #D4C4A8' }}
              >
                <h3 className="text-2xl font-bold text-gray-800 mb-4 font-['Inter']">🤝 Collaboration Rules</h3>
                <ul className="text-gray-700 space-y-2 font-['Inter']">
                  <li><strong>Duo work:</strong> Maximum 1 task per person</li>
                  <li><strong>Point sharing:</strong> When helping a colleague's ticket, dice points count as half value</li>
                  <li><strong>No gamehost checking:</strong> Tickets move directly from Check to Phase 2</li>
                  <li><strong>Focus on finishing:</strong> Complete tickets before starting new ones</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div 
            className="rounded-2xl p-6 mb-8"
            style={{ backgroundColor: '#EFE7DB', border: '1px solid #D4C4A8' }}
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-4 font-['Inter']">📋 Session Structure</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-['Inter']">
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">Duo Formation</h4>
                <p className="text-gray-700">Work in pairs with maximum 1 task per person. Coordinate with your partner to complete tickets efficiently.</p>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">Streamlined Workflow</h4>
                <p className="text-gray-700">Tickets move directly from Check to Phase 2 (no gamehost checking). Focus on finishing existing work.</p>
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-4">
            <button
              onClick={() => {
                setShowSession2BeginningScreen(false);
                skipToSession2();
              }}
              className="modern-button btn-orange text-xl px-8 py-4 font-['Inter']"
            >
              Start Collaborative Session! →
            </button>
            <button
              onClick={() => {
                setShowSession2BeginningScreen(false);
                setShowSessionSelection(true);
              }}
              className="modern-button btn-gray text-lg px-6 py-3 font-['Inter']"
            >
              ← Back
            </button>
            <p className="text-sm text-gray-500 font-['Inter']">This session lasts 10 rounds. Work together for the best results!</p>
          </div>
        </div>
      </div>
    );
  }

  // Beginning screen
  if (showBeginningScreen) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center z-[999999] overflow-y-auto p-4"
        style={{ backgroundColor: '#EFE7DB' }}
      >
        <div className="max-w-6xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-800 mb-4 font-['Inter']">Welcome to the Agile Game!</h1>
            <p className="text-xl text-gray-600 font-['Inter']">Learn the rules and get ready to play</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
              <div 
                className="rounded-2xl p-6"
                style={{ backgroundColor: '#EFE7DB', border: '1px solid #D4C4A8' }}
              >
                <h3 className="text-2xl font-bold text-gray-800 mb-4 font-['Inter']">🎯 Game Objective</h3>
                <p className="text-gray-700 leading-relaxed font-['Inter']">
                  Complete as many tickets as possible by moving them through the development phases. 
                  Each ticket requires 6 points in Phase 1 and 6 points in Phase 2 to be completed.
                </p>
              </div>
              
              <div 
                className="rounded-2xl p-6"
                style={{ backgroundColor: '#EFE7DB', border: '1px solid #D4C4A8' }}
              >
                <h3 className="text-2xl font-bold text-gray-800 mb-4 font-['Inter']">🎲 How to Play</h3>
                <ul className="text-gray-700 space-y-2 font-['Inter']">
                  <li>Roll dice to get points (1-6)</li>
                  <li>Drag dice onto tickets to add points and proceed</li>
                  <li>Move tickets through phases by clicking them</li>
                  <li>Assign tickets to players by dragging them</li>
                </ul>
              </div>
            </div>
            
            <div className="space-y-6">
              <div 
                className="rounded-2xl p-6"
                style={{ backgroundColor: '#EFE7DB', border: '1px solid #D4C4A8' }}
              >
                <h3 className="text-2xl font-bold text-gray-800 mb-4 font-['Inter']">🚫 Blockers</h3>
                <p className="text-gray-700 leading-relaxed font-['Inter']">
                  Some tickets may get blocked during the game. You need dice values of 4, 5, or 6 to resolve blockers. 
                  Blocked tickets cannot be moved until resolved.
                </p>
              </div>
            </div>
          </div>
          
          <div 
            className="rounded-2xl p-6 mb-8"
            style={{ backgroundColor: '#EFE7DB', border: '1px solid #D4C4A8' }}
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-4 font-['Inter']">📋 Session Structure</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-['Inter']">
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">Session 1: Individual Work</h4>
                <p className="text-gray-700">Work independently to complete tickets and focus on what the gamehost tells you to do.</p>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">Session 2: Collaborative Work</h4>
                <p className="text-gray-700">Work together as a team and focus on finishing work to achieve better results.</p>
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-4">
            <button
              onClick={() => {
                setShowBeginningScreen(false);
                startGame();
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                fontFamily: 'Inter',
                fontSize: '16px',
                transition: 'all 1s ease-out 0.5s',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: 'none',
                letterSpacing: '0.025em',
                textTransform: 'none',
                background: '#2563eb',
                color: 'white',
                opacity: logoVisible ? 1 : 0,
                transform: logoVisible ? 'translateY(0)' : 'translateY(20px)',
                marginBottom: '1rem'
              }}
            >
              Start Game
            </button>
            {onShowJoinScreen && (
              <button
                onClick={onShowJoinScreen}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontFamily: 'Inter',
                  fontSize: '16px',
                  transition: 'all 1s ease-out 0.7s',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  border: 'none',
                  letterSpacing: '0.025em',
                  textTransform: 'none',
                  background: '#059669',
                  color: 'white',
                  opacity: logoVisible ? 1 : 0,
                  transform: logoVisible ? 'translateY(0)' : 'translateY(20px)',
                }}
              >
                🎮 Join Multiplayer Game
              </button>
            )}
            <button
              onClick={() => {
                setShowBeginningScreen(false);
                setShowSessionSelection(true);
              }}
              className="modern-button btn-gray text-lg px-6 py-3 font-['Inter']"
            >
              ← Back
            </button>
            <p className="text-sm text-gray-500 font-['Inter']">Each session lasts 10 rounds. Good luck!</p>
          </div>
        </div>
      </div>
    );
  }

  // Session selection screen
  if (showSessionSelection) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#EFE7DB',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px'
        }}
      >
        <div className="max-w-4xl w-full">
          <h1 className="text-4xl font-bold mb-8 text-gray-800 font-['Inter'] text-center">Choose Your Session</h1>
          
          {/* Player Management Section */}
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg session-selection">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 font-['Inter']">👥 Team Setup</h2>
            
            {/* Add Player Button */}
            <div className="mb-6">
              <button
                onClick={() => {
                  const name = prompt('Enter player name:');
                  if (name) {
                    useGameStore.getState().addPlayer(name);
                  }
                }}
                className="modern-button btn-green font-['Inter'] text-lg px-6 py-3"
              >
                ➕ Add Player
              </button>
            </div>
            
            {/* Player List */}
            <div className="space-y-3">
              {players.length === 0 ? (
                <p className="text-gray-500 font-['Inter'] text-center py-4">No players added yet. Add at least one player to start.</p>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-700 font-['Inter'] mb-3">Current Players:</h3>
                  <div className="space-y-6" style={{marginBottom: '3rem'}}>
                    {players.map((player, index) => {
                      // Different colors for each player
                      const playerColors = [
                        'text-blue-600', // Player 1: Blue
                        'text-green-600', // Player 2: Green
                        'text-purple-600', // Player 3: Purple
                        'text-orange-600', // Player 4: Orange
                        'text-pink-600', // Player 5: Pink
                        'text-indigo-600', // Player 6: Indigo
                        'text-teal-600', // Player 7: Teal
                        'text-red-600', // Player 8: Red
                      ];
                      const playerColor = playerColors[(player.id - 1) % playerColors.length];
                      
                      return (
                        <div 
                          key={player.id}
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200 w-full"
                          style={{marginBottom: '1.5rem'}}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className={`text-xl font-bold ${playerColor} !important`} style={{color: playerColor.includes('blue') ? '#2563eb' : playerColor.includes('green') ? '#059669' : playerColor.includes('purple') ? '#7c3aed' : playerColor.includes('orange') ? '#ea580c' : playerColor.includes('pink') ? '#db2777' : playerColor.includes('indigo') ? '#4f46e5' : playerColor.includes('teal') ? '#0d9488' : '#dc2626', fontSize: '1.25rem', fontWeight: '700'}}>Player {player.id}: </span>
                            <span className="text-xl font-normal text-gray-900 font-['Inter']" style={{fontSize: '1.25rem', fontWeight: '400', fontStyle: 'normal'}}>{player.name}</span>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`Remove ${player.name} from the team?`)) {
                                useGameStore.getState().removePlayer(player.id);
                              }
                            }}
                            className="modern-button btn-red text-sm px-4 py-2 flex-shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Session Selection Buttons */}
          <div className="flex flex-col gap-6">
            <button
              onClick={() => {
                if (players.length === 0) {
                  alert('Please add at least one player before starting the game.');
                  return;
                }
                setShowSessionSelection(false);
                setShowBeginningScreen(true);
              }}
              disabled={players.length === 0}
              className={`modern-button font-['Inter'] text-xl px-8 py-4 ${
                players.length === 0 ? 'btn-gray' : 'btn-blue'
              }`}
            >
              Start with Session 1 (Individual Work)
            </button>
            <button
              onClick={() => {
                if (players.length === 0) {
                  alert('Please add at least one player before starting the game.');
                  return;
                }
                setShowSessionSelection(false);
                setShowSession2BeginningScreen(true);
              }}
              disabled={players.length === 0}
              className={`modern-button font-['Inter'] text-xl px-8 py-4 ${
                players.length === 0 ? 'btn-gray' : 'btn-orange'
              }`}
            >
              Start with Session 2 (Collaborative Work)
            </button>
            <button
              onClick={() => setShowSessionSelection(false)}
              className="modern-button btn-gray font-['Inter'] text-lg px-6 py-3"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isGameStarted) {
  return (
      <div
        style={{
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
        }}
      >
        {/* Logo 1.5x bigger, beige background */}
        <img
          src="/mvw-logo.png"
          alt="MVW Logo"
          style={{
            width: '270px',
            height: '270px',
            objectFit: 'contain',
            marginBottom: '24px',
            border: '2px solid #333',
            background: '#EFE7DB',
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? 'scale(1)' : 'scale(0.75)',
            transition: 'all 1s ease-out',
          }}
          onLoad={() => console.log('Logo loaded, logoVisible state:', logoVisible)}
        />
        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: 'bold',
          marginBottom: '2rem',
          color: '#1f2937',
          fontFamily: 'Inter',
          opacity: logoVisible ? 1 : 0,
          transform: logoVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 1s ease-out 0.3s',
        }}>Agile Game</h1>
        <button
          onClick={() => setShowSessionSelection(true)}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: '600',
            fontFamily: 'Inter',
            fontSize: '16px',
            transition: 'all 1s ease-out 0.5s',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: 'none',
            letterSpacing: '0.025em',
            textTransform: 'none',
            background: '#2563eb',
            color: 'white',
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          Start Game
        </button>
      </div>
    );
  }

  // Session evaluation screen
  if (showSessionEvaluation) {
    const evalTickets = session1Tickets.length > 0 ? session1Tickets : tickets;
    const stats = getSessionStats(evalTickets);
    // --- New metrics ---
    const completedTickets = evalTickets.filter(t => t.completedRound !== undefined);
    const leadTimes = completedTickets.map(t => (t.completedRound! - t.createdRound + 1));
    const avgVelocity = completedTickets.length / 10;
    const meanLeadTime = leadTimes.reduce((a, b) => a + b, 0) / (leadTimes.length || 1);
    const stdDev = Math.sqrt(leadTimes.reduce((sum, lt) => sum + Math.pow(lt - meanLeadTime, 2), 0) / (leadTimes.length || 1));
    // --- CFD data ---
    const maxRounds = 10;
    let cfdData = Array.from({ length: maxRounds }, (_, i) => {
      const r = i + 1;
      let inProgress = 0;
      let done = 0;
      evalTickets.forEach((t) => {
        if (t.completedRound && t.completedRound <= r) {
          done++;
        }
        if (t.inProgressEnteredRound && t.inProgressEnteredRound <= r) {
          inProgress++;
        }
      });
      return { round: r, inProgress, done };
    });
    // Debug log
    console.log('EVALUATION DEBUG: evalTickets', evalTickets);
    if (evalTickets.length === 0) {
  return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[999999]">
          <div className="bg-white rounded-3xl p-12 max-w-4xl mx-4 shadow-2xl w-full text-center">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">Session 1 Complete!</h1>
            <p className="text-xl text-gray-600 mb-8">No ticket data found for evaluation.<br/>Please make sure you completed tickets before session 2.</p>
            <button
              onClick={() => {
                setShowSessionEvaluation(false);
              }}
              className="modern-button btn-green text-xl px-8 py-4"
            >
              Continue to Session 2 →
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[999999] overflow-y-auto">
        <div className="bg-white rounded-3xl p-12 max-w-4xl mx-4 shadow-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">Session 1 Complete!</h1>
            <p className="text-xl text-gray-600">Let's see how you performed...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 rounded-2xl p-6">
              <h3 className="text-2xl font-bold text-blue-800 mb-4">📊 Overall Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg">Total Completed:</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.totalCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg">Velocity (tickets/round):</span>
                  <span className="text-2xl font-bold text-blue-600">{avgVelocity.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg">Predictability (Std Dev):</span>
                  <span className="text-2xl font-bold text-blue-600">{stdDev.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 rounded-2xl p-6 overflow-x-auto">
              <h3 className="text-2xl font-bold text-amber-800 mb-4">⏱️ Lead Time per Ticket</h3>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="pr-4">Ticket</th>
                    <th>Lead Time</th>
                  </tr>
                </thead>
                <tbody>
                  {completedTickets.map(t => (
                    <tr key={t.id}>
                      <td className="pr-4">#{t.id}</td>
                      <td>{t.completedRound! - t.createdRound + 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-green-50 rounded-2xl p-6 mb-8">
            <h3 className="text-2xl font-bold text-green-800 mb-4">📈 Cumulative Flow Diagram</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cfdData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDone2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="round" />
                <YAxis allowDecimals={false} />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="inProgress" stroke="#60a5fa" fill="#c7d2fe" name="In Progress" />
                <Area type="monotone" dataKey="done" stroke="#22c55e" fill="#bbf7d0" name="Done" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center">
            <button
              onClick={() => {
                setShowSessionEvaluation(false);
              }}
              className="modern-button btn-green text-xl px-8 py-4"
            >
              Continue to Session 2 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Final comparison page
  if (showFinalComparison && session1Tickets && session2Tickets) {
    // Metrics for session 1
    const evalTickets1 = session1Tickets;
    const stats1 = getSessionStats(evalTickets1);
    const completedTickets1 = evalTickets1.filter(t => t.completedRound !== undefined);
    const leadTimes1 = completedTickets1.map(t => (t.completedRound! - t.createdRound + 1));
    const avgVelocity1 = completedTickets1.length / 10;
    const meanLeadTime1 = leadTimes1.reduce((a, b) => a + b, 0) / (leadTimes1.length || 1);
    const stdDev1 = Math.sqrt(leadTimes1.reduce((sum, lt) => sum + Math.pow(lt - meanLeadTime1, 2), 0) / (leadTimes1.length || 1));
    const maxRounds = 10;
    let cfdData1 = Array.from({ length: maxRounds }, (_, i) => {
      const r = i + 1;
      let inProgress = 0;
      let done = 0;
      evalTickets1.forEach((t) => {
        if (t.completedRound && t.completedRound <= r) {
          done++;
        }
        if (t.inProgressEnteredRound && t.inProgressEnteredRound <= r) {
          inProgress++;
        }
      });
      return { round: r, inProgress, done };
    });
    // Metrics for session 2
    const evalTickets2 = session2Tickets;
    const stats2 = getSessionStats(evalTickets2);
    const completedTickets2 = evalTickets2.filter(t => t.completedRound !== undefined);
    const leadTimes2 = completedTickets2.map(t => (t.completedRound! - t.createdRound + 1));
    const avgVelocity2 = completedTickets2.length / 10;
    const meanLeadTime2 = leadTimes2.reduce((a, b) => a + b, 0) / (leadTimes2.length || 1);
    const stdDev2 = Math.sqrt(leadTimes2.reduce((sum, lt) => sum + Math.pow(lt - meanLeadTime2, 2), 0) / (leadTimes2.length || 1));
    let cfdData2 = Array.from({ length: maxRounds }, (_, i) => {
      const r = i + 1;
      let inProgress = 0;
      let done = 0;
      evalTickets2.forEach((t) => {
        if (t.completedRound && t.completedRound <= r) {
          done++;
        }
        if (t.inProgressEnteredRound && t.inProgressEnteredRound <= r) {
          inProgress++;
        }
      });
      return { round: r, inProgress, done };
    });
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[999999] overflow-y-auto">
        <div className="bg-white rounded-3xl p-12 max-w-6xl mx-4 shadow-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">Final Comparison</h1>
            <p className="text-xl text-gray-600">Compare your results from Session 1 and Session 2</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Session 1 */}
            <div className="bg-blue-50 rounded-2xl p-6">
              <h3 className="text-2xl font-bold text-blue-800 mb-4">Session 1</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg">Total Completed:</span>
                  <span className="text-2xl font-bold text-blue-600">{stats1.totalCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg">Velocity (tickets/round):</span>
                  <span className="text-2xl font-bold text-blue-600">{avgVelocity1.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg">Predictability (Std Dev):</span>
                  <span className="text-2xl font-bold text-blue-600">{stdDev1.toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 mt-6">
                <h4 className="text-lg font-bold text-green-800 mb-2">CFD</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={cfdData1} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDone1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="round" />
                    <YAxis allowDecimals={false} />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="inProgress" stroke="#60a5fa" fill="#c7d2fe" name="In Progress" />
                    <Area type="monotone" dataKey="done" stroke="#22c55e" fill="#bbf7d0" name="Done" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Session 2 */}
            <div className="bg-orange-50 rounded-2xl p-6">
              <h3 className="text-2xl font-bold text-orange-800 mb-4">Session 2</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg">Total Completed:</span>
                  <span className="text-2xl font-bold text-orange-600">{stats2.totalCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg">Velocity (tickets/round):</span>
                  <span className="text-2xl font-bold text-orange-600">{avgVelocity2.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg">Predictability (Std Dev):</span>
                  <span className="text-2xl font-bold text-orange-600">{stdDev2.toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 mt-6">
                <h4 className="text-lg font-bold text-green-800 mb-2">CFD</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={cfdData2} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDone2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="round" />
                    <YAxis allowDecimals={false} />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="inProgress" stroke="#60a5fa" fill="#c7d2fe" name="In Progress" />
                    <Area type="monotone" dataKey="done" stroke="#22c55e" fill="#bbf7d0" name="Done" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="text-center mt-8">
            <button
              onClick={() => {
                setShowFinalComparison(false);
                useGameStore.getState().goHome();
              }}
              className="modern-button btn-gray text-xl px-8 py-4"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Session 2 evaluation screen
  if (session === 2 && round === 1 && !showSessionEvaluation && session2Tickets && session2Tickets.length > 0) {
    console.log('Session 2 evaluation screen should show:', { session, round, session2Tickets: session2Tickets.length });
    const evalTickets = session2Tickets;
    const stats = getSessionStats(evalTickets);
    const completedTickets = evalTickets.filter(t => t.completedRound !== undefined);
    const leadTimes = completedTickets.map(t => (t.completedRound! - t.createdRound + 1));
    const avgVelocity = completedTickets.length / 10;
    const meanLeadTime = leadTimes.reduce((a, b) => a + b, 0) / (leadTimes.length || 1);
    const stdDev = Math.sqrt(leadTimes.reduce((sum, lt) => sum + Math.pow(lt - meanLeadTime, 2), 0) / (leadTimes.length || 1));
    const maxRounds = 10;
    let cfdData = Array.from({ length: maxRounds }, (_, i) => {
      const r = i + 1;
      let inProgress = 0;
      let done = 0;
      evalTickets.forEach((t) => {
        if (t.completedRound && t.completedRound <= r) {
          done++;
        }
        if (t.inProgressEnteredRound && t.inProgressEnteredRound <= r) {
          inProgress++;
        }
      });
      return { round: r, inProgress, done };
    });
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[999999] overflow-y-auto">
        <div className="bg-white rounded-3xl p-12 max-w-4xl mx-4 shadow-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">Session 2 Complete!</h1>
            <p className="text-xl text-gray-600">Here are your collaborative results...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 rounded-2xl p-6">
              <h3 className="text-2xl font-bold text-blue-800 mb-4">📊 Overall Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg">Total Completed:</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.totalCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg">Velocity (tickets/round):</span>
                  <span className="text-2xl font-bold text-blue-600">{avgVelocity.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg">Predictability (Std Dev):</span>
                  <span className="text-2xl font-bold text-blue-600">{stdDev.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 rounded-2xl p-6 overflow-x-auto">
              <h3 className="text-2xl font-bold text-amber-800 mb-4">⏱️ Lead Time per Ticket</h3>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="pr-4">Ticket</th>
                    <th>Lead Time</th>
                  </tr>
                </thead>
                <tbody>
                  {completedTickets.map(t => (
                    <tr key={t.id}>
                      <td className="pr-4">#{t.id}</td>
                      <td>{t.completedRound! - t.createdRound + 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-green-50 rounded-2xl p-6 mb-8">
            <h3 className="text-2xl font-bold text-green-800 mb-4">📈 Cumulative Flow Diagram</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cfdData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDone2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="round" />
                <YAxis allowDecimals={false} />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="inProgress" stroke="#60a5fa" fill="#c7d2fe" name="In Progress" />
                <Area type="monotone" dataKey="done" stroke="#22c55e" fill="#bbf7d0" name="Done" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center">
            <button
              onClick={() => {
                setShowFinalComparison(true);
              }}
              className="modern-button btn-blue text-xl px-8 py-4 mr-4"
            >
              Compare Results
            </button>
            <button
              onClick={() => {
                useGameStore.getState().clearSession2Tickets();
                // Optionally show a final message or reset the game
                window.location.reload();
              }}
              className="modern-button btn-green text-xl px-8 py-4"
            >
              Finish Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Debug button to print tickets */}
      <button
        style={{ position: 'fixed', top: 10, right: 10, zIndex: 999999 }}
        onClick={() => {
          console.log('Current tickets:', tickets.map(t => ({ id: t.id, points: t.points, hasBlocker: t.hasBlocker, blockerPoints: t.blockerPoints })));
        }}
      >
        Debug: Print Tickets
      </button>

      {/* Round Popup - Outside DndContext to avoid positioning issues */}
      {showRoundPopup && (
        <>
          {/* Background overlay */}
          <div 
            style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0,0,0,0.7)',
              zIndex: 999998
            }}
          />
          {/* Popup content */}
          <div 
            style={{ 
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '20px',
              boxShadow: '0 0 50px rgba(0,0,0,0.5)',
              zIndex: 999999,
              border: '5px solid blue',
              minWidth: '400px',
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#333', marginBottom: '20px' }}>ROUND</h1>
              <div style={{ fontSize: '72px', fontWeight: 'bold', color: '#2563eb', marginBottom: '20px' }}>{currentRoundDisplay}</div>
              <div style={{ fontSize: '24px', color: '#666', fontStyle: 'italic' }}>{getRoundMessage(currentRoundDisplay)}</div>
            </div>
          </div>
        </>
      )}

    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-8">
        {/* Game Info Header */}
          <div className="game-info-header flex justify-between items-center">
          <div className="flex items-center gap-4">
              <div className="game-session-info">
              Session {session} - Round {round}/10
            </div>
            {players.some(p => p.isHost) && (
              <button
                onClick={nextRound}
                  className="modern-button btn-green"
              >
                Next Round →
              </button>
                          )}
                        </div>
            <div className="game-mode-info">
            {session === 1 ? 'Individual Work' : 'Collaborative Work'}
          </div>
        </div>

          <table className="game-table">
          <thead>
            <tr>
                <th style={{ width: '250px' }}>
                  <span className="column-header">Backlog</span>
              </th>
                <th style={{ width: '200px' }}>
                  <span className="column-header">Player</span>
              </th>
              {columns.map((status) => (
                  <th key={status} style={{ width: '300px' }}>
                    <span className="column-header">{columnTitles[status]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((player) => {
              const playerColors = [
                'text-blue-600', // Player 1: Blue
                'text-green-600', // Player 2: Green
                'text-purple-600', // Player 3: Purple
                'text-orange-600', // Player 4: Orange
                'text-pink-600', // Player 5: Pink
                'text-indigo-600', // Player 6: Indigo
                'text-teal-600', // Player 7: Teal
                'text-red-600', // Player 8: Red
              ];
              const playerColor = playerColors[(player.id - 1) % playerColors.length];
              
              return (
                <tr key={player.id}>
                  {/* Backlog cell - same for all players */}
                  {player.id === 1 && (
                      <td rowSpan={players.length}>
                        <Cell
                          status="todo"
                          tickets={tickets.filter(t => t.status === 'todo').map(ticket => ({
                            ...ticket,
                            playerName: ticket.assignedTo ? players.find(p => p.id === ticket.assignedTo)?.name : undefined
                          }))}
                          players={players}
                          onTicketClick={handleTicketClick}
                              />
                    </td>
                  )}
                    <td>
                      <div className="player-section" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="player-name">
                          <div className="flex items-center gap-3 flex-1">
                            <span className={`text-xl font-bold ${playerColor} !important`} style={{color: playerColor.includes('blue') ? '#2563eb' : playerColor.includes('green') ? '#059669' : playerColor.includes('purple') ? '#7c3aed' : playerColor.includes('orange') ? '#ea580c' : playerColor.includes('pink') ? '#db2777' : playerColor.includes('indigo') ? '#4f46e5' : playerColor.includes('teal') ? '#0d9488' : '#dc2626', fontSize: '1.25rem', fontWeight: '700'}}>Player {player.id}: </span>
                            <span className="text-xl font-normal text-gray-900 font-['Inter']" style={{fontSize: '1.25rem', fontWeight: '400', fontStyle: 'normal'}}>{player.name}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRollDice(player.id)}
                          disabled={player.hasRolledThisRound}
                          className={`game-button ${player.hasRolledThisRound ? 'disabled' : 'primary'}`}
                          style={{ marginTop: '12px' }}
                        >
                          {player.hasRolledThisRound ? 'Already Rolled' : 'Roll Dice'}
                        </button>
                        <button
                          onClick={() => useGameStore.getState().undoLastAction(player.id)}
                          className="game-button btn-gray"
                          style={{ marginTop: '8px' }}
                        >
                          Undo Last Action
                        </button>
                        <div style={{ height: 80, marginTop: '8px' }}>
                          <div style={diceValues[player.id] > 0 ? {} : { opacity: 0, pointerEvents: 'none' }}>
                            <Dice
                              value={diceValues[player.id] > 0 ? player.currentDiceRoll : null}
                              remainingValue={diceValues[player.id] > 0 ? diceValues[player.id] : 1}
                              playerId={player.id}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    {columns.map((status) => (
                        <td key={status}>
                        <Cell
                          playerId={player.id}
                            playerName={player.name}
                          status={status}
                          tickets={tickets.filter(
                            (t) => t.assignedTo === player.id && t.status === status
                          )}
                            players={players}
                          onTicketClick={handleTicketClick}
                        />
                      </td>
                        ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
        
        <DragOverlay>
          {draggedTicketData ? (
            <Ticket
              id={draggedTicketData.id}
              type={draggedTicketData.type}
              points={draggedTicketData.points}
              hasBlocker={draggedTicketData.hasBlocker}
              assignedTo={draggedTicketData.assignedTo}
              playerName={players.find(p => p.id === draggedTicketData.assignedTo)?.name}
              assignedTo2={draggedTicketData.assignedTo2}
              playerName2={players.find(p => p.id === draggedTicketData.assignedTo2)?.name}
              onClick={() => {}}
            />
          ) : null}
        </DragOverlay>
    </DndContext>
    </>
  );
}; 