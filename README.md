# Who Said That Game

A multiplayer drinking game built with Next.js where players guess who said what.

## Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Upstash Redis
- **Real-time**: Pusher Channels
- **Testing**: Vitest + fast-check (property-based testing)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```

4. Configure environment variables:
   - Get Upstash Redis credentials from [upstash.com](https://upstash.com)
   - Get Pusher credentials from [pusher.com](https://pusher.com)

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

Run tests:

```bash
npm test
```

### Building

Build for production:

```bash
npm run build
```

### Deployment

This project is configured for deployment on Vercel. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions including:

- Setting up Upstash Redis
- Configuring Pusher Channels
- Environment variable configuration
- Deployment verification steps
- Troubleshooting guide

**Quick Deploy:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/who-said-that-game)

After deployment, configure the required environment variables in your Vercel project settings.

## Project Structure

```
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/              # Utility functions and business logic
├── types/            # TypeScript type definitions
└── .kiro/specs/      # Feature specifications and design docs
```

## License

MIT
