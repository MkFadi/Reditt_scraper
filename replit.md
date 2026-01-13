# Reddit Data Scraper

## Overview

A utility web application for collecting Reddit data to build training datasets. Users enter a subreddit name and configuration options, then the app scrapes text-only posts (filtering out images/videos/galleries) along with their top comments. The collected data can be exported as JSON for machine learning or research purposes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with custom plugins for Replit development environment

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful endpoints under `/api` prefix
- **Data Fetching**: Server-side Reddit JSON API consumption (no OAuth, uses public `.json` endpoints)
- **Rate Limiting**: Built-in delays between Reddit API requests to avoid blocks

### Data Flow
1. User configures scrape parameters (subreddit, post count, comments per post, sort order)
2. Frontend sends configuration to backend API
3. Backend fetches posts from Reddit's public JSON API
4. Posts are filtered to exclude media content (images, videos, galleries)
5. Comments are fetched for each valid post
6. Results are returned to frontend for JSON export

### Shared Code
- **Location**: `/shared` directory
- **Purpose**: Zod schemas and TypeScript types shared between frontend and backend
- **Key Schema**: `scrapeConfigSchema` for validating scrape configuration

### Database
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Location**: `/shared/schema.ts`
- **Current State**: Schema includes type definitions but storage is currently in-memory (MemStorage class)

## External Dependencies

### Reddit API
- Uses public Reddit JSON endpoints (no authentication required)
- Endpoints: `https://www.reddit.com/r/{subreddit}/{sort}.json` for posts
- Endpoints: `https://www.reddit.com{permalink}.json` for comments
- Custom User-Agent header required
- Rate limiting: 1.5 second delay between requests

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- Drizzle Kit for migrations (`/migrations` directory)
- Connect-pg-simple for session storage (if enabled)

### UI Dependencies
- Radix UI primitives for accessible components
- Lucide React for icons
- react-icons for Reddit brand icon
- embla-carousel-react for carousel components
- date-fns for date formatting
- class-variance-authority for component variants