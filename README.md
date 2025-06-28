# Agile Game

A multiplayer agile simulation game built with React, TypeScript, and WebSocket for real-time collaboration.

## Features

- **Multiplayer Support**: Real-time collaboration with room-based multiplayer
- **Agile Simulation**: Experience agile development workflows
- **Session Management**: Two distinct game sessions with evaluation
- **Real-time Updates**: Live synchronization between all players
- **Beautiful UI**: Modern, responsive design with animations

## Local Development

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   cd server && npm install
   ```

2. **Start the backend server:**
   ```bash
   cd server
   npm start
   ```
   The backend will run on `http://localhost:8080`

3. **Start the frontend development server:**
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`

4. **Open your browser** and navigate to `http://localhost:5173`

## Multiplayer Setup

1. **Start a game:**
   - Click "🎮 Join Multiplayer Game" on the home screen
   - Enter a room name, password, and your player name
   - Click "Join Game"

2. **Share with others:**
   - Share the room name and password with other players
   - They can join using the same room name and password

## Deployment to Render

### Option 1: Using render.yaml (Recommended)

1. **Push your code to GitHub**

2. **Connect to Render:**
   - Go to [render.com](https://render.com)
   - Sign up/Login with your GitHub account
   - Click "New +" and select "Blueprint"

3. **Deploy:**
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file
   - Click "Apply" to deploy both services

### Option 2: Manual Deployment

#### Backend Deployment

1. **Create a new Web Service:**
   - Name: `agile-game-backend`
   - Environment: `Node`
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`

2. **Deploy**

#### Frontend Deployment

1. **Create a new Static Site:**
   - Name: `agile-game-frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

2. **Set Environment Variables:**
   - `VITE_WS_URL`: `wss://your-backend-url.onrender.com`

3. **Deploy**

### Update Frontend URL

After deployment, update the WebSocket URL in `src/App.tsx`:

```typescript
const WS_URL = 'wss://your-backend-url.onrender.com';
```

## Game Rules

### Session 1: Individual Work
- Players work individually on tickets
- Each player has their own dice and tickets
- Goal: Complete as many tickets as possible

### Session 2: Collaborative Work
- Players can help each other with tickets
- Multiple players can work on the same ticket
- Goal: Improve team collaboration and efficiency

### Ticket Types
- **Normal**: Standard tickets (6 points each phase)
- **Urgent**: Must be completed quickly
- **Fixed Date**: Must be completed by round 10

### Blockers
- Tickets can get blocked during gameplay
- Blockers require 4 points to resolve
- Only dice values 4, 5, or 6 can be used on blockers

## Technologies Used

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, WebSocket
- **State Management**: Zustand
- **Deployment**: Render
- **Real-time Communication**: WebSocket

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE). 