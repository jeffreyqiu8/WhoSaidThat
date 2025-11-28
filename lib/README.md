# Redis Storage Layer

This module provides the Redis storage layer for game session management using Upstash Redis.

## Setup

1. Create an Upstash Redis database at [https://upstash.com](https://upstash.com)
2. Copy your Redis REST URL and token
3. Add them to your `.env.local` file:

```env
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
```

## Features

- **Automatic TTL**: Game sessions automatically expire after 24 hours
- **Transaction Support**: Uses Redis pipelines for atomic operations
- **Serialization**: Handles complex data structures (Maps, Dates) automatically
- **Unique Code Generation**: Ensures game codes are unique with retry logic

## API

### `createGame(hostNickname: string): Promise<GameSession>`

Creates a new game session with a unique 6-character code.

```typescript
const session = await createGame('Alice');
console.log(session.code); // e.g., "ABC123"
```

### `getGame(code: string): Promise<GameSession | null>`

Retrieves a game session by code. Returns `null` if not found.

```typescript
const session = await getGame('ABC123');
if (session) {
  console.log(`Host: ${session.hostId}`);
}
```

### `updateGame(session: GameSession): Promise<void>`

Updates an existing game session. Preserves the remaining TTL.

```typescript
session.phase = 'responding';
await updateGame(session);
```

### `deleteGame(code: string): Promise<void>`

Deletes a game session from Redis.

```typescript
await deleteGame('ABC123');
```

### `getRedisClient(): Redis`

Returns the Redis client instance for advanced operations.

```typescript
const redis = getRedisClient();
const keys = await redis.keys('game:*');
```

## Data Storage

Game sessions are stored with the key pattern: `game:{code}`

All data is automatically serialized to JSON and deserialized back to the proper types including:
- `Map` objects (players, responses, guesses)
- `Date` objects (timestamps)
- Nested structures (rounds, results)

## Error Handling

- `createGame`: Throws if unable to generate unique code after 10 attempts
- `updateGame`: Throws if game doesn't exist
- All functions may throw network errors if Redis is unreachable
