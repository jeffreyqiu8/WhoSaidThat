# Requirements Document

## Introduction

The Who Said That Game is a web-based multiplayer drinking game designed for 4-8 players. Players join via their phones using a game code, submit anonymous answers to prompts, and guess which player wrote each response. Wrong guesses result in drinking penalties. The application must be deployable to Vercel and support real-time multiplayer interaction through WebSocket connections.

## Glossary

- **Game System**: The web application that manages game sessions, player connections, and game flow
- **Host**: The player who creates a game session and receives the game code
- **Player**: Any participant in a game session, including the host
- **Game Code**: A unique identifier that allows players to join a specific game session
- **Prompt**: A question or statement that players respond to anonymously
- **Response**: A player's anonymous answer to a prompt
- **Round**: A complete cycle of prompt display, response submission, guessing, and reveal
- **WebSocket Room**: A real-time communication channel identified by game-${code}

## Requirements

### Requirement 1

**User Story:** As a host, I want to create a new game session, so that I can gather friends to play together.

#### Acceptance Criteria

1. WHEN a user navigates to the host page THEN the Game System SHALL generate a unique game code and create a new game session
2. WHEN a game session is created THEN the Game System SHALL display the game code prominently to the host
3. WHEN a game session is created THEN the Game System SHALL establish a WebSocket room identified by game-${code}
4. WHEN a host creates a game THEN the Game System SHALL automatically add the host as the first player in the session

### Requirement 2

**User Story:** As a player, I want to join a game using a code, so that I can participate with my friends.

#### Acceptance Criteria

1. WHEN a player navigates to /join/[code] THEN the Game System SHALL prompt the player to enter a nickname
2. WHEN a player submits a valid nickname THEN the Game System SHALL add the player to the game session and connect them to the WebSocket room
3. WHEN a player joins successfully THEN the Game System SHALL redirect the player to /game/[code]
4. IF a game code does not exist THEN the Game System SHALL display an error message and prevent joining
5. IF a nickname is already taken in the session THEN the Game System SHALL reject the nickname and prompt for a different one

### Requirement 3

**User Story:** As a player, I want to see a prompt and submit my answer, so that other players can guess who wrote it.

#### Acceptance Criteria

1. WHEN a round begins THEN the Game System SHALL display a prompt to all players simultaneously
2. WHEN a prompt is displayed THEN the Game System SHALL provide an input field for players to submit their response
3. WHEN a player submits a response THEN the Game System SHALL store the response anonymously without revealing the author
4. WHILE players are submitting responses THEN the Game System SHALL display a waiting indicator showing how many players have submitted
5. WHEN all players have submitted responses THEN the Game System SHALL proceed to the guessing phase

### Requirement 4

**User Story:** As a player, I want to guess who wrote each response, so that I can test my knowledge of my friends.

#### Acceptance Criteria

1. WHEN the guessing phase begins THEN the Game System SHALL display all responses in shuffled order
2. WHEN responses are displayed THEN the Game System SHALL provide a mechanism for players to assign each response to a player nickname
3. WHEN a player completes their guesses THEN the Game System SHALL store the guesses and display a waiting indicator
4. WHILE players are guessing THEN the Game System SHALL prevent players from seeing others' guesses
5. WHEN all players have submitted guesses THEN the Game System SHALL proceed to the reveal phase

### Requirement 5

**User Story:** As a player, I want to see the results and know who drinks, so that the game rules are enforced.

#### Acceptance Criteria

1. WHEN the reveal phase begins THEN the Game System SHALL display each response alongside its actual author
2. WHEN results are displayed THEN the Game System SHALL show each player's guesses and highlight incorrect guesses
3. WHEN incorrect guesses are identified THEN the Game System SHALL display a drinking penalty indicator for players who guessed incorrectly
4. WHEN the reveal is complete THEN the Game System SHALL provide a mechanism to start the next round
5. WHEN a new round starts THEN the Game System SHALL return to the prompt phase with a new prompt

### Requirement 6

**User Story:** As a player, I want the game to work smoothly on my phone, so that I can play comfortably from any device.

#### Acceptance Criteria

1. WHEN a player accesses the game from a mobile device THEN the Game System SHALL display a responsive interface optimized for mobile screens
2. WHEN a player interacts with game elements THEN the Game System SHALL provide touch-friendly controls with appropriate sizing
3. WHEN the game state changes THEN the Game System SHALL update the interface without requiring page refreshes
4. WHEN network connectivity is temporarily lost THEN the Game System SHALL attempt to reconnect to the WebSocket room automatically

### Requirement 7

**User Story:** As a host, I want to manage the game session, so that I can control the game flow and handle issues.

#### Acceptance Criteria

1. WHEN the host views the game THEN the Game System SHALL display additional controls not available to regular players
2. WHEN the host initiates a round THEN the Game System SHALL select a prompt and broadcast it to all players
3. IF a player disconnects THEN the Game System SHALL notify all players and allow the game to continue with remaining players
4. WHEN the host ends the game THEN the Game System SHALL close the WebSocket room and display a game-over screen to all players

### Requirement 8

**User Story:** As a developer, I want to deploy the application to Vercel, so that it is accessible and scalable.

#### Acceptance Criteria

1. WHEN the application is deployed THEN the Game System SHALL run successfully on Vercel's serverless infrastructure
2. WHEN WebSocket connections are established THEN the Game System SHALL use a Vercel-compatible WebSocket solution or alternative real-time communication method
3. WHEN multiple game sessions exist simultaneously THEN the Game System SHALL isolate each session's data and communication
4. WHEN the application scales THEN the Game System SHALL maintain game state consistency across serverless function invocations
