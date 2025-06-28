import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useGameStore } from '../store/gameStore';
import { TicketStatus } from '../types';

export const GameMetrics: React.FC = () => {
  const { tickets, round, session } = useGameStore();

  const metrics = useMemo(() => {
    const finishedTickets = tickets.filter((t) => t.status === 'done');
    const ticketsPerRound = Array.from({ length: round }, (_, i) => {
      const roundFinished = finishedTickets.filter(
        (t) => t.completedRound && t.completedRound <= i + 1
      ).length;
      return { round: i + 1, finished: roundFinished };
    });

    const leadTimes = finishedTickets
      .filter((t) => t.createdRound && t.completedRound)
      .map((t) => (t.completedRound! - t.createdRound!));

    const avgLeadTime = leadTimes.length
      ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
      : 0;

    const stdDev =
      leadTimes.length > 1
        ? Math.sqrt(
            leadTimes
              .map((x) => Math.pow(x - avgLeadTime, 2))
              .reduce((a, b) => a + b, 0) / (leadTimes.length - 1)
          )
        : 0;

    const cfdData = Array.from({ length: round }, (_, i) => {
      const r = i + 1;
      let inProgress = 0;
      let done = 0;
      tickets.forEach((t) => {
        if (t.completedRound && t.completedRound <= r) {
          done++;
        }
        if (t.inProgressEnteredRound && t.inProgressEnteredRound <= r) {
          inProgress++;
        }
      });
      return { round: r, inProgress, done };
    });

    return {
      ticketsPerRound,
      avgLeadTime,
      predictability: stdDev,
      cfdData,
    };
  }, [tickets, round]);

  return (
    <div className="fixed right-0 top-0 w-96 h-screen bg-white shadow-lg p-4 overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Game Metrics</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold mb-2">Velocity Chart</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.ticketsPerRound}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="round" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="finished"
                stroke="#2563eb"
                name="Finished Tickets"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Cumulative Flow Diagram</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.cfdData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="round" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="inProgress"
                stroke="#60a5fa"
                name="In Progress"
              />
              <Line
                type="monotone"
                dataKey="done"
                stroke="#6366f1"
                name="Done"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-700">Avg Lead Time</h4>
            <p className="text-2xl font-bold text-blue-900">
              {metrics.avgLeadTime.toFixed(1)} s
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="text-sm font-medium text-green-700">Predictability</h4>
            <p className="text-2xl font-bold text-green-900">
              ±{metrics.predictability.toFixed(1)} s
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 