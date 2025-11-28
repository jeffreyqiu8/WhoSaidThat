# Implementation Plan

- [ ] 1. Set up Next.js project with TypeScript and dependencies





  - Initialize Next.js 14+ project with App Router and TypeScript
  - Install dependencies: Tailwind CSS, Upstash Redis, Pusher/Ably, fast-check, Vitest
  - Configure environment variables for Redis and real-time service
  - Set up basic project structure with folders: app/, lib/, components/, types/
  - _Requirements: 8.1, 8.2_

- [x] 2. Implement core data models and types





  - Create TypeScript interfaces for GameSession, Player, Round, Response, PlayerGuesses, RoundResults
  - Implement game code generation utility (6-character alphanumeric)
  - Implement nickname validation function (3-20 chars, alphanumeric + spaces)
  - _Requirements: 1.1, 2.2, 2.5_

- [ ]* 2.1 Write property test for game code generation
  - **Property 1: Game creation produces valid session**
  - **Validates: Requirements 1.1, 1.3, 1.4**

- [x] 3. Set up Redis storage layer





  - Configure Upstash Redis connection
  - Implement game session storage functions: createGame, getGame, updateGame, deleteGame
  - Implement TTL-based cleanup (24 hour expiration)
  - Add Redis transaction support for concurrent operations
  - _Requirements: 8.3, 8.4_

- [ ]* 3.1 Write property test for state persistence
  - **Property 12: State persistence round-trip**
  - **Validates: Requirements 8.4**

- [ ]* 3.2 Write property test for session isolation
  - **Property 11: Session isolation is maintained**
  - **Validates: Requirements 8.3**

- [x] 4. Implement game state management logic








  - Create GameStateManager class with methods: createGame, joinGame, submitResponse, submitGuesses
  - Implement phase transition logic (lobby → prompt → responding → guessing → reveal)
  - Implement response shuffling algorithm
  - Implement penalty calculation logic
  - _Requirements: 1.1, 1.4, 2.2, 3.3, 3.5, 4.1, 4.5, 5.3_

- [ ]* 4.1 Write property test for player joining
  - **Property 2: Valid player joins increase player count**
  - **Validates: Requirements 2.2**

- [ ]* 4.2 Write property test for invalid operations
  - **Property 3: Invalid operations are rejected**
  - **Validates: Requirements 2.4, 2.5**

- [ ]* 4.3 Write property test for response anonymity
  - **Property 4: Response anonymity is preserved**
  - **Validates: Requirements 3.3**

- [ ]* 4.4 Write property test for phase transitions
  - **Property 5: Phase transitions occur when all players complete actions**
  - **Validates: Requirements 3.5, 4.5**

- [ ]* 4.5 Write property test for response shuffling
  - **Property 6: Responses are shuffled**
  - **Validates: Requirements 4.1**

- [ ]* 4.6 Write property test for guess privacy
  - **Property 7: Guess privacy is maintained**
  - **Validates: Requirements 4.4**

- [ ]* 4.7 Write property test for penalty calculation
  - **Property 8: Penalty calculation matches incorrect guesses**
  - **Validates: Requirements 5.3**

- [ ]* 4.8 Write property test for round progression
  - **Property 9: Round progression maintains state**
  - **Validates: Requirements 5.5**
-

- [x] 5. Set up real-time communication layer




  - Configure Pusher Channels or Ably client
  - Implement event broadcaster for: playerJoined, promptStarted, responsesReady, resultsReady, gameEnded
  - Create channel naming convention: game-${code}
  - Implement server-side event publishing functions
  - _Requirements: 1.3, 7.2, 7.4_

- [ ]* 5.1 Write property test for host broadcasts
  - **Property 10: Host actions broadcast to all players**
  - **Validates: Requirements 7.2, 7.4**



- [x] 6. Create Next.js API routes



  - POST /api/game/create - Create new game session
  - POST /api/game/[code]/join - Join existing game
  - POST /api/game/[code]/response - Submit response
  - POST /api/game/[code]/guess - Submit guesses
  - POST /api/game/[code]/start-round - Start new round (host only)
  - POST /api/game/[code]/end - End game (host only)
  - GET /api/game/[code] - Get current game state
  - _Requirements: 1.1, 2.2, 3.3, 4.3, 5.5, 7.2, 7.4_

- [ ]* 6.1 Write unit tests for API routes
  - Test create game endpoint with valid input
  - Test join game with invalid code (error case)
  - Test duplicate nickname rejection (error case)
  - Test response submission updates game state
  - _Requirements: 1.1, 2.2, 2.4, 2.5, 3.3_

- [x] 7. Build landing page and host flow





  - Create landing page (/) with "Create Game" and "Join Game" buttons
  - Create host page (/host) that calls create API and displays game code
  - Implement game code display with copy-to-clipboard functionality
  - Add loading states and error handling
  - _Requirements: 1.1, 1.2_

- [x] 8. Build join flow




  - Create join page (/join/[code]) with nickname input form
  - Implement nickname validation on client side
  - Call join API and handle errors (invalid code, duplicate nickname)
  - Redirect to game page on successful join
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 9. Create game board shell and real-time connection





  - Create game page (/game/[code]) with layout
  - Implement real-time event subscription on mount
  - Create GameContext for managing client-side game state
  - Implement reconnection logic with exponential backoff
  - Display connection status indicator
  - _Requirements: 6.3, 6.4_

- [x] 10. Implement lobby phase UI





  - Display waiting players list
  - Show "Waiting for players..." message
  - Add "Start Game" button for host only
  - Handle playerJoined events to update player list
  - _Requirements: 7.1_

- [x] 11. Implement prompt and response phase





  - Create PromptDisplay component showing current prompt
  - Create ResponseInput component with text area
  - Implement submit response functionality
  - Show waiting indicator with submission count (X/Y players submitted)
  - Handle phase transition to guessing when all responses submitted
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 12. Implement guessing phase UI




  - Display shuffled responses in list
  - Create GuessingInterface with dropdown/select for each response
  - Populate dropdowns with all player nicknames
  - Implement submit guesses functionality
  - Show waiting indicator during guessing
  - Handle phase transition to reveal when all guesses submitted
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 13. Implement reveal phase UI





  - Create ResultsDisplay component
  - Show each response with actual author
  - Highlight incorrect guesses for each player
  - Display drinking penalties (🍺 × count) for each player
  - Add "Next Round" button for host
  - Handle round progression
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 14. Add prompt data and selection logic





  - Create prompts.ts file with array of 50+ prompts
  - Implement random prompt selection (no repeats within same game)
  - Store used prompts in game session
  - _Requirements: 3.1, 7.2_

- [x] 15. Implement host controls and game end




  - Add host-only UI controls (start round, end game)
  - Implement end game functionality
  - Create game-over screen with final stats
  - Handle cleanup on game end
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 16. Handle player disconnections








  - Implement disconnect detection
  - Broadcast disconnect events to remaining players
  - Mark disconnected players in UI
  - Transfer host if host disconnects
  - Allow game to continue with remaining players
  - _Requirements: 7.3_

- [x] 17. Add mobile responsive styling





  - Apply Tailwind CSS for responsive design
  - Optimize layouts for mobile screens (320px - 768px)
  - Make touch targets at least 44×44px
  - Test on various viewport sizes
  - _Requirements: 6.1, 6.2_

- [x] 18. Implement input sanitization and validation





  - Sanitize nickname input (XSS prevention)
  - Sanitize response text (XSS prevention)
  - Add rate limiting to API routes
  - Validate game phase before accepting actions
  - _Requirements: 2.5, 3.3, 4.3_

- [ ]* 18.1 Write unit tests for validation functions
  - Test nickname validation edge cases
  - Test input sanitization
  - Test rate limiting logic
  - _Requirements: 2.5_

- [x] 19. Add error handling and user feedback





  - Implement toast notifications for errors
  - Add loading spinners for async operations
  - Handle API errors gracefully with user-friendly messages
  - Implement retry logic for failed requests
  - _Requirements: 2.4, 2.5_

- [x] 20. Configure Vercel deployment





  - Create vercel.json with configuration
  - Set up environment variables in Vercel dashboard
  - Configure Redis connection for production
  - Configure real-time service for production
  - Test deployment on Vercel
  - _Requirements: 8.1, 8.2_

- [ ] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
