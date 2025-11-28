# Real-Time Communication Layer

This directory contains the Pusher-based real-time communication implementation for the Who Said That Game.

## Architecture

The real-time layer uses Pusher Channels to broadcast game events to all connected players in a session.

### Channel Naming Convention

All game sessions use the channel naming pattern: `game-${code}`

Example: A game with code "ABC123" uses channel "game-ABC123"

## Server-Side (`pusher-server.ts`)

### Configuration

The server-side Pusher instance requires the following environment variables:
- `PUSHER_APP_ID` - Your Pusher app ID
- `NEXT_PUBLIC_PUSHER_APP_KEY` - Your Pusher app key (public)
- `PUSHER_SECRET` - Your Pusher secret key (private)
- `NEXT_PUBLIC_PUSHER_CLUSTER` - Your Pusher cluster (e.g., "us2")

### Event Types

The following events are broadcast to game channels:

1. **playerJoined** - When a new player joins the game
   ```typescript
   {
     player: { id, nickname, isHost },
     playerCount: number
   }
   ```

2. **promptStarted** - When a new round begins with a prompt
   ```typescript
   {
     prompt: string,
     roundNumber: number
   }
   ```

3. **responsesReady** - When all players have submitted responses
   ```typescript
   {
     responses: Array<{ id, text }>
     // Note: playerId is omitted for anonymity
   }
   ```

4. **resultsReady** - When guessing is complete and results are revealed
   ```typescript
   {
     results: {
       responses: Array<{
         responseId, text, actualAuthor, guessedBy
       }>,
       penalties: Record<playerId, drinkCount>
     }
   }
   ```

5. **gameEnded** - When the host ends the game
   ```typescript
   {
     reason: string,
     finalStats?: { totalRounds, players }
   }
   ```

### Broadcasting Functions

```typescript
// Broadcast player joined
await broadcastPlayerJoined(code, {
  player: { id, nickname, isHost },
  playerCount: 5
});

// Broadcast prompt started
await broadcastPromptStarted(code, {
  prompt: "What's your guilty pleasure?",
  roundNumber: 1
});

// Broadcast responses ready
await broadcastResponsesReady(code, {
  responses: [{ id: "uuid1", text: "Pizza" }, ...]
});

// Broadcast results ready
await broadcastResultsReady(code, {
  results: { responses, penalties }
});

// Broadcast game ended
await broadcastGameEnded(code, {
  reason: "Host ended game",
  finalStats: { ... }
});
```

## Client-Side (`pusher-client.ts`)

### Usage

```typescript
import { subscribeToGame, GameEvent } from '@/lib/pusher-client';

// Subscribe to game channel
const channel = subscribeToGame(gameCode);

// Listen for events
channel.bind(GameEvent.PLAYER_JOINED, (data) => {
  console.log('Player joined:', data.player.nickname);
});

channel.bind(GameEvent.PROMPT_STARTED, (data) => {
  console.log('New prompt:', data.prompt);
});

// Unsubscribe when done
unsubscribeFromGame(gameCode);
```

### Reconnection

Pusher automatically handles reconnection with exponential backoff. Connection state can be monitored:

```typescript
import { getPusherClient } from '@/lib/pusher-client';

const pusher = getPusherClient();

pusher.connection.bind('connected', () => {
  console.log('Connected to Pusher');
});

pusher.connection.bind('disconnected', () => {
  console.log('Disconnected from Pusher');
});
```

## Testing

When testing locally, you can use Pusher's debug console to monitor events:
1. Log into your Pusher dashboard
2. Navigate to your app
3. Open the "Debug Console" tab
4. Watch events in real-time as they're broadcast

## Vercel Deployment

Pusher Channels is fully compatible with Vercel's serverless architecture. No special configuration is needed beyond setting the environment variables in your Vercel project settings.

## Requirements Satisfied

- **1.3**: WebSocket room identified by game-${code}
- **7.2**: Host actions broadcast to all players
- **7.4**: Game end broadcasts to all players
