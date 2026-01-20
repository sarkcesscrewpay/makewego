# Make We Go - API Documentation

This document outlines the available API endpoints for the "Make We Go" ride-sharing application.

## Authentication
Replit Auth is used for user management.

- `GET /api/login`: Redirects to the login flow.
- `GET /api/logout`: Logs out the current user.
- `GET /api/auth/user`: Returns the current authenticated user's data.

## Buses
Endpoints for managing the bus fleet.

- `GET /api/buses`: List all buses.
- `POST /api/buses`: Add a new bus (Requires authentication).
- `PUT /api/buses/:id`: Update bus details.

## Routes
Endpoints for managing travel routes.

- `GET /api/routes`: List all available routes.
- `POST /api/routes`: Create a new route (Requires authentication).

## Schedules
Endpoints for viewing and managing trip schedules.

- `GET /api/schedules`: List upcoming schedules.
  - Query parameters: `from`, `to`, `date`.
- `POST /api/schedules`: Schedule a new trip (Requires authentication).

## Bookings
Endpoints for passenger ticket bookings.

- `GET /api/bookings`: List bookings for the authenticated user.
- `POST /api/bookings`: Book a seat on a scheduled trip.
- `POST /api/bookings/:id/cancel`: Cancel an existing booking.

## User Profile
- `GET /api/profile`: Get or create the user's application-specific profile (e.g., role).

---
*Note: All management endpoints (POST/PUT) currently require the user to be authenticated. In a production scenario, these would be restricted to admin roles.*
