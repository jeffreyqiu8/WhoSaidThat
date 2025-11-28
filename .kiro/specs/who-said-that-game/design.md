# Design Document

## Overview

The Who Said That Game is a real-time multiplayer web application built with Next.js and deployed on Vercel. The architecture uses a combination of Next.js API routes for game state management and a real-time communication layer for synchronizing game events across players. The application follows a client-server model where the server maintains authoritative game state and clients receive updates through real-time connections.

## Architecture

### Technology Stack

- **Frontend**: Next.js 14+ with App Router, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless functions)
- **Real-time Communication**: Pusher Channels or Ably (Vercel-compatible WebSocket alternatives)
- **State Management**: React Context API for client state, in-memory storage with Redis/Upstash for server state
- **Deployment**: Vercel
- **Database**: Upstash Redis for game session persistence

### System Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Client    │◄───────►│   Next.js API    │◄───────►│   Upstash   │
│  (Browser)  │  HTTP   │     Routes       │  Redis  │    Redis    │
└─────────────┘         └──────────────────┘         └─────────────┘
       │                         │
       │                         │
       │    Real-time Events     │
       │                         │
       └────────►┌────────────┐◄─┘
                 │   Pusher   │
                 │  Channels  │
                 └────────────┘
```

### Page Structure

- `/` - Landing page with "Create Game" and "Join Game" options
- `/host` - Host creates game, displays game code
- `/join/[code]` - Players enter nickname to join
- `/game/[code]` - Main gameplay interface

## Components and Interfaces

### Core Components

#### 1. Game State Manager (Server-side)
Manages authoritative game state in Redis with the following operations:
- `createGame(hostNickname: string): GameSession`
- `joinGame(code: string, nickname: string): Player`
- `submitResponse(code: string, playerId: string, response: string): void`
- `submitGuesses(code: string, playerId: string, guesses: Map<responseId, playerId>): void`
- `startRound(code: string): void`
- `endGame(code: string): void`

#### 2. Real-time Event Broadcaster
Handles publishing events to all clients in a game room:
- `broadcastPlayerJoined(code: string, player: Player): void`
- `broadcastPrompt(code: string, prompt: string): void`
- `broadcastResponsesReady(code: string, responses: Response[]): void`
- `broadcastResults(code: string, results: RoundResults): void`

#### 3. Client Game Controller
React component managing client-side game flow:
- Subscribes to real-time events for the game code
- Manages local UI state (current phase, player input)
- Sends actions to API routes
- Handles reconnection logic

#### 4. UI Components
- `LandingPage`: Entry point with create/join options
- `HostLobby`: Displays game code and waiting players
- `JoinForm`: Nickname input and validation
- `GameBoard`: Main gameplay container
- `PromptDisplay`: Shows current prompt
- `ResponseInput`: Text input for player responses
- `GuessingInterface`: Drag-and-drop or select interface for matching responses to players
- `ResultsDisplay`: Shows correct answers and drinking penalties

## Data Models

### GameSession
```typescript
interface GameSession {
  code: string;              // 6-character unique code
  hostId: string;            // Player ID of host
  players: Map<string, Player>;
  currentRound: number;
  phase: GamePhase;          // 'lobby' | 'prompt' | 'responding' | 'guessing' | 'reveal'
  rounds: Round[];
  createdAt: Date;
  expiresAt: Date;           // Auto-cleanup after 24 hours
}
```

### Player
```typescript
interface Player {
  id: string;                // UUID
  nickname: string;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: Date;
}
```

### Round
```typescript
interface Round {
  roundNumber: number;
  prompt: string;
  responses: Map<string, Response>;
  guesses: Map<string, PlayerGuesses>;
  results?: RoundResults;
}
```

### Response
```typescript
interface Response {
  id: string;                // UUID
  playerId: string;          // Hidden until reveal
  text: string;
  submittedAt: Date;
}
```

### PlayerGuesses
```typescript
interface PlayerGuesses {
  playerId: string;
  guesses: Map<string, string>; // responseId -> guessedPlayerId
  submittedAt: Date;
}
```

### RoundResults
```typescript
interface RoundResults {
  responses: Array<{
    responseId: string;
    text: string;
    actualAuthor: Player;
    guessedBy: Map<string, string>; // playerId -> guessedPlayerId
  }>;
  penalties: Map<string, number>; // playerId -> number of wrong guesses (drinks)
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Game creation produces valid session
*For any* host nickname, creating a game should produce a game session with a unique code, the host as the first player, and a properly formatted WebSocket room identifier (game-${code}).
**Validates: Requirements 1.1, 1.3, 1.4**

### Property 2: Valid player joins increase player count
*For any* existing game session and unique valid nickname, joining the game should increase the player count by exactly one and add the player to the session.
**Validates: Requirements 2.2**

### Property 3: Invalid operations are rejected
*For any* non-existent game code or duplicate nickname in a session, the system should reject the operation and return an error without modifying game state.
**Validates: Requirements 2.4, 2.5**

### Property 4: Response anonymity is preserved
*For any* submitted response during the responding phase, querying the game state should not reveal the author's identity until the reveal phase begins.
**Validates: Requirements 3.3**

### Property 5: Phase transitions occur when all players complete actions
*For any* game session in the responding or guessing phase, when the number of submissions equals the number of players, the system should automatically transition to the next phase.
**Validates: Requirements 3.5, 4.5**

### Property 6: Responses are shuffled
*For any* set of responses from a round, the order presented to players during the guessing phase should differ from the submission order (with high probability for 4+ responses).
**Validates: Requirements 4.1**

### Property 7: Guess privacy is maintained
*For any* player's submitted guesses during the guessing phase, other players should not be able to access those guesses until the reveal phase.
**Validates: Requirements 4.4**

### Property 8: Penalty calculation matches incorrect guesses
*For any* player's guesses in a round, the drinking penalty count should equal the number of responses where the player's guess does not match the actual author.
**Validates: Requirements 5.3**

### Property 9: Round progression maintains state
*For any* game session, starting a new round should increment the round number, reset the phase to prompt, and preserve all previous round data.
**Validates: Requirements 5.5**

### Property 10: Host actions broadcast to all players
*For any* host-initiated action (starting round, ending game), all connected players in the session should receive the corresponding event notification.
**Validates: Requirements 7.2, 7.4**

### Property 11: Session isolation is maintained
*For any* two distinct game sessions, actions performed in one session should not affect the state or data of the other session.
**Validates: Requirements 8.3**

### Property 12: State persistence round-trip
*For any* game session state written to storage, immediately reading that state should return data equivalent to what was written.
**Validates: Requirements 8.4**

## Error Handling

### Client-Side Errors
- **Network Disconnection**: Implement exponential backoff reconnection strategy with visual feedback
- **Invalid Input**: Validate nickname length (3-20 characters), no special characters except spaces
- **Session Expired**: Redirect to landing page with appropriate message
- **Rate Limiting**: Prevent spam submissions with client-side debouncing

### Server-Side Errors
- **Game Not Found**: Return 404 with clear error message
- **Game Full**: Reject joins when player count reaches 8
- **Duplicate Nickname**: Return 409 conflict error
- **Invalid Phase**: Reject actions that don't match current game phase
- **Storage Failures**: Implement retry logic with Redis, fallback to error state

### Edge Cases
- **Host Disconnection**: Transfer host privileges to next player in join order
- **All Players Disconnect**: Mark game for cleanup after 5 minutes
- **Partial Submissions**: If timeout occurs, proceed with submitted responses only
- **Concurrent Joins**: Use Redis transactions to prevent race conditions

## Testing Strategy

### Unit Testing
The application will use **Vitest** as the testing framework for unit tests. Unit tests will focus on:

- **Game State Logic**: Test individual functions for creating games, joining, submitting responses, calculating results
- **Validation Functions**: Test nickname validation, game code generation, input sanitization
- **Data Transformations**: Test response shuffling, result calculation, phase transitions
- **Error Conditions**: Test specific error cases like duplicate nicknames, invalid codes, full games

Example unit tests:
- Test that `generateGameCode()` produces 6-character alphanumeric codes
- Test that `validateNickname()` rejects empty strings and special characters
- Test that `calculatePenalties()` correctly counts wrong guesses for a specific example

### Property-Based Testing
The application will use **fast-check** as the property-based testing library. Each property-based test will run a minimum of 100 iterations to ensure robust validation across diverse inputs.

Property-based tests will verify universal correctness properties across all valid inputs:

- **Property 1-12**: Each correctness property listed above will be implemented as a property-based test
- Tests will generate random game sessions, player nicknames, responses, and guesses
- Each test will be tagged with: `**Feature: who-said-that-game, Property {number}: {property_text}**`
- Tests will verify invariants hold across all generated inputs

Example property test:
- Generate random game sessions with 4-8 players
- Generate random responses for each player
- Verify that response authors are never exposed before reveal phase
- Run 100+ iterations with different random inputs

### Integration Testing
- **API Route Testing**: Test Next.js API routes with mock Redis
- **Real-time Event Flow**: Test complete round flow from prompt to reveal
- **Multi-Player Scenarios**: Test with simulated concurrent players
- **Reconnection Logic**: Test disconnect and reconnect scenarios

### End-to-End Testing
- **Complete Game Flow**: Use Playwright to test full game from creation to completion
- **Mobile Responsiveness**: Test on various viewport sizes
- **Cross-Browser**: Test on Chrome, Safari, Firefox

## Implementation Notes

### Vercel Deployment Considerations
- Use Upstash Redis for persistent state (Vercel-compatible)
- Use Pusher Channels or Ably for real-time communication (WebSocket alternatives)
- Set appropriate serverless function timeouts
- Implement game session cleanup with TTL in Redis

### Performance Optimizations
- Lazy load game components
- Optimize bundle size with code splitting
- Use React.memo for expensive components
- Implement optimistic UI updates

### Security Considerations
- Sanitize all user inputs (nicknames, responses)
- Rate limit API endpoints
- Implement CORS policies
- Use environment variables for API keys
- Add basic DDoS protection with rate limiting

### Accessibility
- Ensure keyboard navigation works throughout
- Add ARIA labels for screen readers
- Maintain sufficient color contrast
- Support reduced motion preferences
