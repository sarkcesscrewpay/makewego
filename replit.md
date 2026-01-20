# Make We Go - Bus Ride Sharing Application

## Overview

Make We Go is a bus ride-sharing application designed for Ghana. It enables passengers to search for bus routes, view schedules, book seats, and manage their tickets. The application also includes an admin panel for managing buses, routes, and schedules. The platform targets intercity travel with features like real-time route visualization on maps.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Build Tool**: Vite with custom plugins for Replit integration
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Maps**: Leaflet with react-leaflet for route visualization

The frontend follows a page-based architecture with shared components. Pages include Landing (unauthenticated), Dashboard (ride search), MyRides (ticket management), and Admin (fleet management). Custom hooks abstract data fetching logic (`use-auth`, `use-bookings`, `use-schedules`, etc.).

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod validation schemas
- **Authentication**: Replit Auth (OpenID Connect) with Passport.js, session-based with PostgreSQL session store
- **Database ORM**: Drizzle ORM with PostgreSQL

The server uses a storage layer pattern (`server/storage.ts`) that implements an `IStorage` interface for all database operations. This abstraction allows for easier testing and potential database swapping. Routes are registered in `server/routes.ts` with authentication middleware applied to protected endpoints.

### Shared Code
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts`: Drizzle table definitions and Zod insert schemas
- `routes.ts`: API endpoint definitions with input/output types
- `models/auth.ts`: User and session table definitions (required for Replit Auth)

### Role System
Users have profiles with roles: `passenger` (default), `driver`, or `admin`. Admin role grants access to fleet management features.

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connected via `DATABASE_URL` environment variable
- **Drizzle ORM**: Schema management and queries
- **connect-pg-simple**: Session storage in PostgreSQL

### Authentication
- **Replit Auth**: OpenID Connect authentication provider
- **Passport.js**: Authentication middleware with OpenID Client strategy
- Sessions stored in `sessions` table with 7-day TTL

### Frontend Libraries
- **Leaflet**: Interactive maps for route visualization
- **date-fns**: Date formatting and manipulation
- **Radix UI**: Accessible component primitives (via shadcn/ui)

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `ISSUER_URL`: Replit OIDC issuer (defaults to https://replit.com/oidc)
- `REPL_ID`: Replit environment identifier

### Local Development (VS Code / Windows)
To run this project locally on Windows:
1. Ensure Node.js is installed.
2. Install dependencies: `npm install`
3. The project uses `cross-env` to handle environment variables across different operating systems.
4. Run in development mode: `npm run dev`

### Build & Development
- `npm run dev`: Development server with Vite HMR
- `npm run build`: Production build (Vite for frontend, esbuild for backend)
- `npm run db:push`: Push schema changes to database