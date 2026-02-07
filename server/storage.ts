// server/storage.ts - MySQL Storage Implementation using Drizzle ORM
import { db } from './db';
import {
  users, buses, routes, routeStops, schedules, bookings, profiles,
  busStops, payments, supportTickets, notifications, pushSubscriptions,
  notificationPreferences, rideRequests, reports, sosAlerts
} from '@shared/schema';
import {
  eq, and, or, like, sql, desc, asc, inArray, gt, gte, lte, ne, count
} from 'drizzle-orm';
import bcrypt from 'bcrypt';

// ==================== User Interface (MySQL-compatible, no ObjectId) ====================
export interface User {
  id: number;
  _id?: number; // alias for frontend compatibility
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  phoneVerified?: boolean | null;
  phoneVerificationCode?: string | null;
  phoneVerificationExpiry?: Date | null;
  role: 'passenger' | 'driver' | 'admin';
  createdAt: Date | null;
  updatedAt: Date | null;
  driverDetails?: {
    licenseNumber: string;
    vehicleParams: {
      make: string;
      model: string;
      year: string;
      plateNumber: string;
      color: string;
      capacity: number;
    };
  } | null;
  isLive?: boolean | null;
  emailVerified: boolean | null;
  verificationToken?: string | null;
  verificationTokenExpiry?: Date | null;
  kycStatus?: string | null;
  kycSubmittedAt?: Date | null;
  kycReviewedAt?: Date | null;
  kycReviewedBy?: string | null;
  kycRejectionReason?: string | null;
  licenseDocumentUrl?: string | null;
  accountStatus?: string | null;
  suspensionReason?: string | null;
  staffType?: string | null;
}

export interface SupportTicket {
  _id?: number;
  id?: number;
  userId: number;
  userEmail: string;
  userName: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  category: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  resolvedAt?: Date | null;
  adminNotes?: string | null;
  assignedTo?: string | null;
}

// ==================== Helper: parse ID from string or number ====================
function parseId(id: string | number): number {
  if (typeof id === 'number') return id;
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) throw new Error(`Invalid ID: ${id}`);
  return parsed;
}

// ==================== Helper: add _id alias to row ====================
function withIdAlias<T extends { id: number }>(row: T): T & { _id: number } {
  return { ...row, _id: row.id };
}

// ==================== IStorage Interface ====================
export interface IStorage {
  // Bus Methods
  getBuses(): Promise<any[]>;
  createBus(bus: any): Promise<any>;

  // Route Methods
  getRoutes(): Promise<any[]>;
  createRoute(route: any): Promise<any>;
  getRoute(id: number | string): Promise<any | null>;
  searchRoutes(filters?: { query?: string; start?: string; end?: string; busType?: string }): Promise<any[]>;

  // Schedule Methods
  getSchedules(filters?: any): Promise<any[]>;
  createSchedule(schedule: any): Promise<any>;
  getSchedule(id: number | string): Promise<any | null>;
  deleteSchedule(id: number | string): Promise<boolean>;
  updateScheduleLocation(scheduleId: number | string, location: { lat: number; lng: number }): Promise<void>;

  // Booking Methods
  getBookings(userId: number | string): Promise<any[]>;
  createBooking(booking: any): Promise<any>;
  cancelBooking(bookingId: number | string, userId: number | string): Promise<any | null>;
  deleteBooking(id: number | string): Promise<boolean>;
  markScheduleBookingsCompleted(scheduleId: number | string): Promise<void>;
  getAllBookings(filters?: { status?: string; page?: number; limit?: number }): Promise<{ bookings: any[]; total: number }>;

  // Profile Methods
  getProfile(userId: number | string): Promise<any | null>;
  createProfile(userId: number | string, profileData: any): Promise<any>;

  // Bus Stop Methods
  getBusStops(): Promise<any[]>;
  searchBusStops(query: string, region?: string): Promise<any[]>;
  findBusStopByName(name: string): Promise<any | null>;

  // User Methods
  createUser(userData: any): Promise<any>;
  findUserByEmail(email: string): Promise<any | null>;
  findUserById(id: number | string): Promise<any | null>;
  findUserByVerificationToken(token: string): Promise<any | null>;
  updateUser(id: number | string, updates: any): Promise<any | null>;

  // Admin Methods
  getAllUsers(filters?: { role?: string; search?: string; page?: number; limit?: number }): Promise<{ users: any[]; total: number }>;
  updateUserStatus(id: number | string, status: string, reason?: string): Promise<any | null>;
  getPendingKYCDrivers(): Promise<any[]>;
  approveDriverKYC(driverId: number | string, adminId: string): Promise<any | null>;
  rejectDriverKYC(driverId: number | string, adminId: string, reason: string): Promise<any | null>;
  getAdminStats(): Promise<{
    totalUsers: number; totalDrivers: number; totalPassengers: number;
    pendingKYC: number; totalBookings: number; totalRevenue: number; openTickets: number;
  }>;

  // Support Ticket Methods
  createSupportTicket(ticket: any): Promise<any>;
  getUserSupportTickets(userId: number | string): Promise<any[]>;
  getAllSupportTickets(filters?: { status?: string; priority?: string }): Promise<any[]>;
  updateSupportTicket(ticketId: number | string, updates: any): Promise<any | null>;

  // NEW Methods (absorb direct DB calls from routes.ts)
  updateSchedulesByDriverId(driverId: number, updates: any): Promise<number>;
  findScheduleWithOwnership(id: number | string, driverId: number | string): Promise<any | null>;
  updateSchedule(id: number | string, updates: any): Promise<any | null>;
  toggleScheduleLive(id: number | string, driverId: number | string, isLive: boolean): Promise<any | null>;
  getBookingsBySchedule(scheduleId: number | string, status?: string): Promise<any[]>;
  atomicDecrementSeats(scheduleId: number | string, count: number): Promise<any>;
  insertBookingDirect(booking: any): Promise<any>;
  getDemandAnalytics(): Promise<any[]>;
  getPeakHoursAnalytics(): Promise<any[]>;
  getRevenueAnalytics(driverId?: number, startDate?: Date): Promise<any>;
  createReport(report: any): Promise<any>;
  getRouteReports(routeId: number | string, since: Date): Promise<any[]>;
  createSOSAlert(alert: any): Promise<any>;
  findLiveSchedulesForRoute(from: string, to: string): Promise<any[]>;
  findLiveDriversByIds(ids: number[]): Promise<any[]>;
  createRideRequest(request: any): Promise<any>;
  getRecentRideRequests(): Promise<any[]>;
  findRideRequest(id: number | string, conditions?: any): Promise<any | null>;
  updateRideRequest(id: number | string, updates: any): Promise<any | null>;
  deleteUser(id: number | string): Promise<boolean>;
  createStaffUser(userData: any): Promise<any>;
}

// ==================== MySQLStorage Implementation ====================
export class MySQLStorage implements IStorage {

  // ==================== BUS METHODS ====================

  async getBuses(): Promise<any[]> {
    const rows = await db.select().from(buses);
    return rows.map(withIdAlias);
  }

  async createBus(bus: any): Promise<any> {
    const [result] = await db.insert(buses).values({
      plateNumber: bus.plateNumber,
      driverName: bus.driverName,
      capacity: bus.capacity,
      status: bus.status || 'active',
    });
    const insertId = (result as any).insertId;
    return { _id: insertId, id: insertId, ...bus };
  }

  // ==================== ROUTE METHODS ====================

  async getRoutes(): Promise<any[]> {
    const rows = await db.select().from(routes);
    // Also fetch stops for each route
    const result = await Promise.all(rows.map(async (route) => {
      const stops = await db.select().from(routeStops)
        .where(eq(routeStops.routeId, route.id))
        .orderBy(asc(routeStops.stopOrder));
      return {
        ...withIdAlias(route),
        stops: stops.map(s => ({
          name: s.name,
          location: s.lat && s.lng ? { lat: parseFloat(String(s.lat)), lng: parseFloat(String(s.lng)) } : null,
          order: s.stopOrder,
        })),
      };
    }));
    return result;
  }

  async createRoute(route: any): Promise<any> {
    const [result] = await db.insert(routes).values({
      name: route.name,
      startLocation: route.startLocation,
      endLocation: route.endLocation,
      distance: route.distance || null,
      estimatedDuration: route.estimatedDuration || null,
      busType: route.busType || 'standard',
      geometry: route.geometry || null,
    });
    const insertId = (result as any).insertId;

    // Insert stops into route_stops table
    if (route.stops && Array.isArray(route.stops)) {
      for (let i = 0; i < route.stops.length; i++) {
        const stop = route.stops[i];
        await db.insert(routeStops).values({
          routeId: insertId,
          name: typeof stop === 'string' ? stop : stop.name,
          lat: stop.location?.lat?.toString() || stop.lat?.toString() || null,
          lng: stop.location?.lng?.toString() || stop.lng?.toString() || null,
          stopOrder: stop.order ?? i,
        });
      }
    }

    return {
      _id: insertId,
      id: insertId,
      name: route.name,
      startLocation: route.startLocation,
      endLocation: route.endLocation,
      distance: route.distance,
      estimatedDuration: route.estimatedDuration,
      busType: route.busType,
      geometry: route.geometry,
      stops: route.stops || [],
    };
  }

  async getRoute(id: number | string): Promise<any | null> {
    if (!id) return null;
    const numId = parseId(id);
    const [row] = await db.select().from(routes).where(eq(routes.id, numId));
    if (!row) return null;

    const stops = await db.select().from(routeStops)
      .where(eq(routeStops.routeId, numId))
      .orderBy(asc(routeStops.stopOrder));

    return {
      ...withIdAlias(row),
      stops: stops.map(s => ({
        name: s.name,
        location: s.lat && s.lng ? { lat: parseFloat(String(s.lat)), lng: parseFloat(String(s.lng)) } : null,
        order: s.stopOrder,
      })),
    };
  }

  async searchRoutes(filters?: { query?: string; start?: string; end?: string; busType?: string }): Promise<any[]> {
    const conditions: any[] = [];

    if (filters?.query) {
      conditions.push(
        or(
          like(routes.name, `%${filters.query}%`),
          like(routes.startLocation, `%${filters.query}%`),
          like(routes.endLocation, `%${filters.query}%`)
        )
      );
    }
    if (filters?.start) {
      conditions.push(like(routes.startLocation, `%${filters.start}%`));
    }
    if (filters?.end) {
      conditions.push(like(routes.endLocation, `%${filters.end}%`));
    }
    if (filters?.busType) {
      conditions.push(eq(routes.busType, filters.busType));
    }

    let query;
    if (conditions.length > 0) {
      query = db.select().from(routes).where(and(...conditions));
    } else {
      query = db.select().from(routes);
    }

    const rows = await query;
    return rows.map(withIdAlias);
  }

  // ==================== SCHEDULE METHODS ====================

  async getSchedules(filters?: any): Promise<any[]> {
    // Fetch all schedules, then filter in JS for complex logic
    let conditions: any[] = [];

    if (filters?.driverId) {
      const dId = parseId(filters.driverId);
      conditions.push(eq(schedules.driverId, dId));
    }

    let rows;
    if (conditions.length > 0) {
      rows = await db.select().from(schedules).where(and(...conditions));
    } else {
      rows = await db.select().from(schedules);
    }

    // Populate driver and route info
    const populated = await Promise.all(rows.map(async (s) => {
      let driverInfo: any = null;
      // Ensure routeInfo is parsed if it's a string
      let routeInfo: any = s.routeData || null;
      if (typeof routeInfo === 'string') {
        try {
          routeInfo = JSON.parse(routeInfo);
        } catch (e) {
          console.error("Failed to parse routeData JSON:", e);
          routeInfo = null;
        }
      }

      // Fetch route info if routeId present and no embedded routeData
      if (!routeInfo && s.routeId) {
        routeInfo = await this.getRoute(s.routeId);
      }

      if (s.driverId) {
        const [driver] = await db.select().from(users).where(eq(users.id, s.driverId));
        if (driver) {
          driverInfo = {
            firstName: driver.firstName,
            lastName: driver.lastName,
            isLive: !!driver.isLive,
            vehicle: (driver.driverDetails as any)?.vehicleParams || null,
          };
        }
      }

      // Parse stopsData JSON or use route stops
      let stopsRaw: any = s.stopsData;
      if (typeof stopsRaw === 'string') {
        try {
          stopsRaw = JSON.parse(stopsRaw);
        } catch (e) {
          console.error("Failed to parse stopsData JSON:", e);
          stopsRaw = null;
        }
      }
      stopsRaw = (Array.isArray(stopsRaw) ? stopsRaw : []) || routeInfo?.stops || [];

      return {
        ...withIdAlias(s),
        _id: s.id,
        driver: driverInfo,
        route: routeInfo,
        stops: stopsRaw,
        isLive: !!s.isLive,
        price: s.price ? parseFloat(String(s.price)) : 0,
        lastLocationLat: s.lastLocationLat ? parseFloat(String(s.lastLocationLat)) : null,
        lastLocationLng: s.lastLocationLng ? parseFloat(String(s.lastLocationLng)) : null,
      };
    }));

    // Apply text-based filters in JS (from/to/query matching across stops/route)
    let filtered = populated;

    if (filters?.from || filters?.to || filters?.query) {
      filtered = populated.filter((s: any) => {
        const startLoc = (s.startLocation || s.route?.startLocation || '').toLowerCase();
        const endLoc = (s.endLocation || s.route?.endLocation || '').toLowerCase();
        const stops = s.stops || [];
        const allSearchable = [
          startLoc, endLoc,
          ...stops.map((st: any) => (typeof st === 'string' ? st : st?.name || '').toLowerCase()),
          s.driver?.firstName?.toLowerCase() || '',
          s.driver?.lastName?.toLowerCase() || '',
        ];

        if (filters.from) {
          const from = filters.from.toLowerCase();
          const matchesFrom = allSearchable.some((t: string) => t.includes(from) || from.includes(t));
          if (!matchesFrom) return false;
        }

        if (filters.to) {
          const to = filters.to.toLowerCase();
          const matchesTo = allSearchable.some((t: string) => t.includes(to) || to.includes(t));
          if (!matchesTo) return false;
        }

        if (filters.query) {
          const q = filters.query.toLowerCase();
          const matchesQuery = allSearchable.some((t: string) => t.includes(q));
          if (!matchesQuery) return false;
        }

        return true;
      });
    }

    // Passenger visibility: only show live or upcoming within 24h (unless driver view)
    if (!filters?.driverId) {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      filtered = filtered.filter((s: any) => {
        const isActuallyLive = s.isLive || s.driver?.isLive;
        const depTime = s.departureTime ? new Date(s.departureTime) : null;

        // If driver is live, always show
        if (isActuallyLive) return true;

        // Otherwise only show if within 24h window
        if (depTime && depTime.getTime() < oneDayAgo.getTime()) return false;

        return true;
      });
    }

    // Segment filtering for from/to stop ordering
    if (filters?.from || filters?.to) {
      filtered = filtered.filter((s: any) => {
        if (filters.driverId) return true; // Driver view skips ordering check

        const stops = s.stops || [];
        const startLoc = (s.startLocation || s.route?.startLocation || '').toLowerCase();
        const endLoc = (s.endLocation || s.route?.endLocation || '').toLowerCase();

        if (stops.length === 0) {
          // No stops, just check start/end locations
          if (filters.from) {
            const from = filters.from.toLowerCase();
            if (!startLoc.includes(from) && !from.includes(startLoc)) return false;
          }
          if (filters.to) {
            const to = filters.to.toLowerCase();
            if (!endLoc.includes(to) && !to.includes(endLoc)) return false;
          }
          return true;
        }

        const fromIndex = filters.from
          ? stops.findIndex((stop: any) => {
            const sName = (typeof stop === 'string' ? stop : stop?.name || '').toLowerCase();
            const fName = filters.from.toLowerCase();
            return sName.includes(fName) || fName.includes(sName);
          })
          : 0;

        const searchFrom = (filters.from || '').toLowerCase();
        const matchesStart = searchFrom && (startLoc.includes(searchFrom) || searchFrom.includes(startLoc));
        const effectiveFromIndex = fromIndex !== -1 ? fromIndex : (matchesStart ? 0 : -1);

        const toIndex = filters.to
          ? stops.findIndex((stop: any) => {
            const sName = (typeof stop === 'string' ? stop : stop?.name || '').toLowerCase();
            const fName = filters.to.toLowerCase();
            return sName.includes(fName) || fName.includes(sName);
          })
          : stops.length - 1;

        const searchTo = (filters.to || '').toLowerCase();
        const matchesEnd = searchTo && (endLoc.includes(searchTo) || searchTo.includes(endLoc));
        const effectiveToIndex = toIndex !== -1 ? toIndex : (matchesEnd ? (stops.length > 0 ? stops.length - 1 : 0) : -1);

        if (effectiveFromIndex === -1 || effectiveToIndex === -1) return false;
        if (effectiveFromIndex >= effectiveToIndex && stops.length > 0) return false;

        return true;
      });
    }

    return filtered;
  }

  async createSchedule(schedule: any): Promise<any> {
    // Parse routeId to number if string
    const routeId = schedule.routeId ? parseId(schedule.routeId) : null;
    const driverId = schedule.driverId ? parseId(schedule.driverId) : null;

    const [result] = await db.insert(schedules).values({
      routeId,
      driverId,
      departureTime: schedule.departureTime instanceof Date ? schedule.departureTime : new Date(schedule.departureTime),
      price: schedule.price?.toString() || '0',
      capacity: schedule.capacity || 15,
      availableSeats: schedule.availableSeats ?? schedule.capacity ?? 15,
      isLive: schedule.isLive || false,
      routeData: schedule.route || null,
      fareBreakdown: schedule.fareBreakdown || null,
      startLocation: schedule.route?.startLocation || schedule.startLocation || null,
      endLocation: schedule.route?.endLocation || schedule.endLocation || null,
      stopsData: schedule.stops || null,
    });
    const insertId = (result as any).insertId;

    return {
      _id: insertId,
      id: insertId,
      routeId,
      driverId,
      departureTime: schedule.departureTime,
      price: schedule.price,
      capacity: schedule.capacity || 15,
      availableSeats: schedule.availableSeats ?? schedule.capacity ?? 15,
      isLive: schedule.isLive || false,
      route: schedule.route || null,
      fareBreakdown: schedule.fareBreakdown || null,
      startLocation: schedule.route?.startLocation || schedule.startLocation || null,
      endLocation: schedule.route?.endLocation || schedule.endLocation || null,
      stops: schedule.stops || null,
    };
  }

  async getSchedule(id: number | string): Promise<any | null> {
    if (!id) return null;
    const numId = parseId(id);
    const [row] = await db.select().from(schedules).where(eq(schedules.id, numId));
    if (!row) return null;

    // Populate route info
    let routeInfo: any = row.routeData || null;
    if (!routeInfo && row.routeId) {
      routeInfo = await this.getRoute(row.routeId);
    }

    return {
      ...withIdAlias(row),
      route: routeInfo,
      stops: row.stopsData || routeInfo?.stops || [],
      price: row.price ? parseFloat(String(row.price)) : 0,
      isLive: !!row.isLive,
      lastLocationLat: row.lastLocationLat ? parseFloat(String(row.lastLocationLat)) : null,
      lastLocationLng: row.lastLocationLng ? parseFloat(String(row.lastLocationLng)) : null,
    };
  }

  async deleteSchedule(id: number | string): Promise<boolean> {
    const numId = parseId(id);
    const [result] = await db.delete(schedules).where(eq(schedules.id, numId));
    return (result as any).affectedRows > 0;
  }

  async updateScheduleLocation(scheduleId: number | string, location: { lat: number; lng: number }): Promise<void> {
    const numId = parseId(scheduleId);
    await db.update(schedules).set({
      lastLocationLat: location.lat.toString(),
      lastLocationLng: location.lng.toString(),
      lastUpdate: new Date(),
    }).where(eq(schedules.id, numId));
  }

  // ==================== BOOKING METHODS ====================

  async getBookings(userId: number | string): Promise<any[]> {
    const numUserId = parseId(userId);
    const rows = await db.select().from(bookings)
      .where(eq(bookings.userId, numUserId))
      .orderBy(desc(bookings.createdAt));

    const populatedBookings = await Promise.all(rows.map(async (booking) => {
      let schedule: any = null;
      let driverInfo: any = null;
      let routeInfo: any = null;

      if (booking.scheduleId) {
        const [sched] = await db.select().from(schedules).where(eq(schedules.id, booking.scheduleId));
        if (sched) {
          schedule = sched;
          routeInfo = sched.routeData || null;
          if (!routeInfo && sched.routeId) {
            routeInfo = await this.getRoute(sched.routeId);
          }

          if (sched.driverId) {
            const [driver] = await db.select().from(users).where(eq(users.id, sched.driverId));
            if (driver) {
              driverInfo = {
                firstName: driver.firstName,
                lastName: driver.lastName,
                phone: driver.phoneVerified ? driver.phone : null,
                phoneVerified: driver.phoneVerified || false,
                vehicle: (driver.driverDetails as any)?.vehicleParams || null,
              };
            }
          }
        }
      }

      if (schedule) {
        return {
          ...withIdAlias(booking),
          price: booking.price ? parseFloat(String(booking.price)) : 0,
          schedule: {
            _id: schedule.id,
            id: schedule.id,
            departureTime: schedule.departureTime,
            price: schedule.price ? parseFloat(String(schedule.price)) : 0,
            driver: driverInfo,
          },
          route: routeInfo || {
            startLocation: schedule.startLocation || 'Unknown',
            endLocation: schedule.endLocation || 'Unknown',
          },
        };
      }

      // Fallback for orphaned bookings
      return {
        ...withIdAlias(booking),
        price: booking.price ? parseFloat(String(booking.price)) : 0,
        schedule: {
          departureTime: new Date(),
          price: 0,
        },
        route: {
          startLocation: 'Unknown (Deleted)',
          endLocation: 'Unknown (Deleted)',
        },
      };
    }));

    // Sort by departure time descending
    return populatedBookings.sort((a, b) => {
      const dateA = new Date(a.schedule?.departureTime || 0).getTime();
      const dateB = new Date(b.schedule?.departureTime || 0).getTime();
      return dateB - dateA;
    });
  }

  async createBooking(booking: any): Promise<any> {
    const scheduleId = parseId(booking.scheduleId);
    const userId = parseId(booking.userId);

    // Use transaction to atomically decrement seats and insert booking
    const result = await db.transaction(async (tx) => {
      // SELECT FOR UPDATE to lock the row
      const [sched] = await tx.select().from(schedules)
        .where(eq(schedules.id, scheduleId))
        .for('update');

      if (!sched || !sched.availableSeats || sched.availableSeats <= 0) {
        throw new Error('No seats available for this schedule');
      }

      // Decrement available seats
      await tx.update(schedules).set({
        availableSeats: sql`${schedules.availableSeats} - 1`,
      }).where(eq(schedules.id, scheduleId));

      // Insert booking
      const [insertResult] = await tx.insert(bookings).values({
        userId,
        scheduleId,
        seatNumber: booking.seatNumber || null,
        pickup: booking.pickup || null,
        dropoff: booking.dropoff || null,
        price: booking.price?.toString() || '0',
        status: booking.status || 'confirmed',
        isGroupBooking: booking.isGroupBooking || false,
        numberOfSeats: booking.numberOfSeats || null,
        organizationName: booking.organizationName || null,
        organizationType: booking.organizationType || null,
        contactName: booking.contactName || null,
        contactPhone: booking.contactPhone || null,
        notes: booking.notes || null,
        rideRequestId: booking.rideRequestId ? parseId(booking.rideRequestId) : null,
      });

      const insertId = (insertResult as any).insertId;
      return { _id: insertId, id: insertId };
    });

    return { ...result, ...booking, userId, scheduleId };
  }

  async cancelBooking(bookingId: number | string, userId: number | string): Promise<any | null> {
    const numBookingId = parseId(bookingId);
    const numUserId = parseId(userId);

    // Find the booking first
    const [existing] = await db.select().from(bookings)
      .where(eq(bookings.id, numBookingId));

    if (!existing) return null;

    // Update to cancelled
    await db.update(bookings).set({ status: 'cancelled' })
      .where(eq(bookings.id, numBookingId));

    // Restore seat if was confirmed
    if (existing.status === 'confirmed' && existing.scheduleId) {
      await db.update(schedules).set({
        availableSeats: sql`${schedules.availableSeats} + 1`,
      }).where(eq(schedules.id, existing.scheduleId));
    }

    // Fetch and return the updated booking
    const [updated] = await db.select().from(bookings)
      .where(eq(bookings.id, numBookingId));

    return updated ? withIdAlias(updated) : null;
  }

  async deleteBooking(id: number | string): Promise<boolean> {
    const numId = parseId(id);

    // Find existing to check if we should restore seats
    const [existing] = await db.select().from(bookings)
      .where(eq(bookings.id, numId));

    if (existing && existing.status === 'confirmed' && existing.scheduleId) {
      await db.update(schedules).set({
        availableSeats: sql`${schedules.availableSeats} + 1`,
      }).where(eq(schedules.id, existing.scheduleId));
    }

    const [result] = await db.delete(bookings).where(eq(bookings.id, numId));
    return (result as any).affectedRows > 0;
  }

  async markScheduleBookingsCompleted(scheduleId: number | string): Promise<void> {
    const numId = parseId(scheduleId);
    await db.update(bookings).set({ status: 'completed' })
      .where(eq(bookings.scheduleId, numId));
  }

  async getAllBookings(filters?: { status?: string; page?: number; limit?: number }): Promise<{ bookings: any[]; total: number }> {
    const page = filters?.page || 1;
    const limitNum = filters?.limit || 20;
    const offset = (page - 1) * limitNum;

    let conditions: any[] = [];
    if (filters?.status && filters.status !== 'all') {
      conditions.push(eq(bookings.status, filters.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalResult] = await Promise.all([
      whereClause
        ? db.select().from(bookings).where(whereClause).orderBy(desc(bookings.createdAt)).limit(limitNum).offset(offset)
        : db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(limitNum).offset(offset),
      whereClause
        ? db.select({ cnt: count() }).from(bookings).where(whereClause)
        : db.select({ cnt: count() }).from(bookings),
    ]);

    const total = totalResult[0]?.cnt || 0;

    // Populate with user and schedule info
    const populated = await Promise.all(rows.map(async (b) => {
      let userInfo: any = null;
      let scheduleInfo: any = null;

      if (b.userId) {
        const [u] = await db.select().from(users).where(eq(users.id, b.userId));
        if (u) {
          userInfo = {
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            phone: u.phone || null,
            phoneVerified: u.phoneVerified || false,
          };
        }
      }

      if (b.scheduleId) {
        const [s] = await db.select().from(schedules).where(eq(schedules.id, b.scheduleId));
        if (s) {
          scheduleInfo = {
            ...withIdAlias(s),
            route: s.routeData,
            price: s.price ? parseFloat(String(s.price)) : 0,
          };
        }
      }

      return { ...withIdAlias(b), user: userInfo, schedule: scheduleInfo };
    }));

    return { bookings: populated, total };
  }

  // ==================== PROFILE METHODS ====================

  async getProfile(userId: number | string): Promise<any | null> {
    const numId = parseId(userId);
    const [row] = await db.select().from(profiles).where(eq(profiles.userId, numId));
    return row ? withIdAlias(row) : null;
  }

  async createProfile(userId: number | string, profileData: any): Promise<any> {
    const numId = parseId(userId);
    const [result] = await db.insert(profiles).values({
      userId: numId,
      role: profileData.role || 'passenger',
      phoneNumber: profileData.phoneNumber || null,
    });
    const insertId = (result as any).insertId;
    return {
      _id: insertId,
      id: insertId,
      userId: numId,
      role: profileData.role || 'passenger',
      createdAt: new Date(),
    };
  }

  // ==================== BUS STOP METHODS ====================

  async getBusStops(): Promise<any[]> {
    const rows = await db.select().from(busStops);
    return rows.map(r => ({
      ...withIdAlias(r),
      lat: r.lat ? parseFloat(String(r.lat)) : null,
      lng: r.lng ? parseFloat(String(r.lng)) : null,
      // Legacy compatibility: some code may use location.lat / location.lng
      location: r.lat && r.lng ? { lat: parseFloat(String(r.lat)), lng: parseFloat(String(r.lng)) } : null,
      latitude: r.lat ? parseFloat(String(r.lat)) : null,
      longitude: r.lng ? parseFloat(String(r.lng)) : null,
    }));
  }

  async searchBusStops(query: string, region?: string): Promise<any[]> {
    const conditions: any[] = [
      or(
        like(busStops.name, `%${query}%`),
        like(busStops.city, `%${query}%`),
        like(busStops.region, `%${query}%`),
        like(busStops.searchTerms, `%${query}%`)
      ),
    ];

    if (region && region !== 'All Regions') {
      conditions.push(eq(busStops.region, region));
    }

    const rows = await db.select().from(busStops)
      .where(and(...conditions))
      .orderBy(asc(busStops.type))
      .limit(15);

    return rows.map(r => ({
      ...withIdAlias(r),
      lat: r.lat ? parseFloat(String(r.lat)) : null,
      lng: r.lng ? parseFloat(String(r.lng)) : null,
      location: r.lat && r.lng ? { lat: parseFloat(String(r.lat)), lng: parseFloat(String(r.lng)) } : null,
    }));
  }

  async findBusStopByName(name: string): Promise<any | null> {
    // Case-insensitive exact match using LIKE
    const rows = await db.select().from(busStops)
      .where(
        or(
          like(busStops.name, name),
          like(busStops.city, name)
        )
      )
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...withIdAlias(r),
      lat: r.lat ? parseFloat(String(r.lat)) : null,
      lng: r.lng ? parseFloat(String(r.lng)) : null,
      location: r.lat && r.lng ? { lat: parseFloat(String(r.lat)), lng: parseFloat(String(r.lng)) } : null,
    };
  }

  async clearBusStops(): Promise<void> {
    await db.delete(busStops);
  }

  async createBusStop(stop: any): Promise<any> {
    const [result] = await db.insert(busStops).values({
      name: stop.name,
      city: stop.city,
      region: stop.region,
      type: stop.type,
      lat: stop.location?.lat?.toString() || stop.lat?.toString() || null,
      lng: stop.location?.lng?.toString() || stop.lng?.toString() || null,
      aliases: stop.aliases || null,
      searchTerms: stop.searchTerms || null,
    });
    const insertId = (result as any).insertId;
    return { id: insertId, ...stop };
  }

  // ==================== USER METHODS ====================

  async createUser(userData: any): Promise<any> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [result] = await db.insert(users).values({
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone || null,
      phoneVerified: userData.phoneVerified ?? false,
      role: userData.role || 'passenger',
      driverDetails: userData.driverDetails || null,
      emailVerified: userData.emailVerified ?? false,
      verificationToken: userData.verificationToken || null,
      verificationTokenExpiry: userData.verificationTokenExpiry || null,
      isLive: false,
      accountStatus: userData.accountStatus || 'active',
      kycStatus: userData.role === 'driver' ? 'pending' : null,
      kycSubmittedAt: userData.role === 'driver' ? new Date() : null,
    });
    const insertId = (result as any).insertId;

    return {
      _id: insertId,
      id: insertId,
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone || null,
      phoneVerified: userData.phoneVerified ?? false,
      role: userData.role || 'passenger',
      driverDetails: userData.driverDetails || null,
      emailVerified: userData.emailVerified ?? false,
      verificationToken: userData.verificationToken || null,
      verificationTokenExpiry: userData.verificationTokenExpiry || null,
      isLive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async findUserByEmail(email: string): Promise<any | null> {
    const [row] = await db.select().from(users).where(eq(users.email, email));
    return row ? withIdAlias(row) : null;
  }

  async findUserById(id: number | string): Promise<any | null> {
    const numId = parseId(id);
    const [row] = await db.select().from(users).where(eq(users.id, numId));
    return row ? withIdAlias(row) : null;
  }

  async findUserByVerificationToken(token: string): Promise<any | null> {
    const [row] = await db.select().from(users).where(eq(users.verificationToken, token));
    return row ? withIdAlias(row) : null;
  }

  async updateUser(id: number | string, updates: any): Promise<any | null> {
    const numId = parseId(id);

    // Build the update set - only include defined values
    const setValues: any = {};
    if (updates.firstName !== undefined) setValues.firstName = updates.firstName;
    if (updates.lastName !== undefined) setValues.lastName = updates.lastName;
    if (updates.email !== undefined) setValues.email = updates.email;
    if (updates.phone !== undefined) setValues.phone = updates.phone;
    if (updates.phoneVerified !== undefined) setValues.phoneVerified = updates.phoneVerified;
    if (updates.phoneVerificationCode !== undefined) setValues.phoneVerificationCode = updates.phoneVerificationCode || null;
    if (updates.phoneVerificationExpiry !== undefined) setValues.phoneVerificationExpiry = updates.phoneVerificationExpiry || null;
    if (updates.role !== undefined) setValues.role = updates.role;
    if (updates.isLive !== undefined) setValues.isLive = updates.isLive;
    if (updates.emailVerified !== undefined) setValues.emailVerified = updates.emailVerified;
    if (updates.verificationToken !== undefined) setValues.verificationToken = updates.verificationToken || null;
    if (updates.verificationTokenExpiry !== undefined) setValues.verificationTokenExpiry = updates.verificationTokenExpiry || null;
    if (updates.driverDetails !== undefined) setValues.driverDetails = updates.driverDetails;
    if (updates.kycStatus !== undefined) setValues.kycStatus = updates.kycStatus;
    if (updates.kycSubmittedAt !== undefined) setValues.kycSubmittedAt = updates.kycSubmittedAt;
    if (updates.kycReviewedAt !== undefined) setValues.kycReviewedAt = updates.kycReviewedAt;
    if (updates.kycReviewedBy !== undefined) setValues.kycReviewedBy = updates.kycReviewedBy;
    if (updates.kycRejectionReason !== undefined) setValues.kycRejectionReason = updates.kycRejectionReason;
    if (updates.licenseDocumentUrl !== undefined) setValues.licenseDocumentUrl = updates.licenseDocumentUrl;
    if (updates.accountStatus !== undefined) setValues.accountStatus = updates.accountStatus;
    if (updates.suspensionReason !== undefined) setValues.suspensionReason = updates.suspensionReason;
    if (updates.password !== undefined) setValues.password = updates.password;
    if (updates.staffType !== undefined) setValues.staffType = updates.staffType;
    setValues.updatedAt = new Date();

    await db.update(users).set(setValues).where(eq(users.id, numId));

    // Return updated user
    return this.findUserById(numId);
  }

  // ==================== ADMIN METHODS ====================

  async getAllUsers(filters?: { role?: string; search?: string; page?: number; limit?: number }): Promise<{ users: any[]; total: number }> {
    const page = filters?.page || 1;
    const limitNum = filters?.limit || 20;
    const offset = (page - 1) * limitNum;

    const conditions: any[] = [];

    if (filters?.role && filters.role !== 'all') {
      conditions.push(eq(users.role, filters.role));
    }

    if (filters?.search) {
      conditions.push(
        or(
          like(users.email, `%${filters.search}%`),
          like(users.firstName, `%${filters.search}%`),
          like(users.lastName, `%${filters.search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalResult] = await Promise.all([
      whereClause
        ? db.select().from(users).where(whereClause).orderBy(desc(users.createdAt)).limit(limitNum).offset(offset)
        : db.select().from(users).orderBy(desc(users.createdAt)).limit(limitNum).offset(offset),
      whereClause
        ? db.select({ cnt: count() }).from(users).where(whereClause)
        : db.select({ cnt: count() }).from(users),
    ]);

    const total = totalResult[0]?.cnt || 0;
    return { users: rows.map(withIdAlias), total };
  }

  async updateUserStatus(id: number | string, status: string, reason?: string): Promise<any | null> {
    const numId = parseId(id);
    const setValues: any = { accountStatus: status, updatedAt: new Date() };
    if (reason) setValues.suspensionReason = reason;

    await db.update(users).set(setValues).where(eq(users.id, numId));
    return this.findUserById(numId);
  }

  async getPendingKYCDrivers(): Promise<any[]> {
    const rows = await db.select().from(users)
      .where(and(eq(users.role, 'driver'), eq(users.kycStatus, 'pending')))
      .orderBy(asc(users.kycSubmittedAt));
    return rows.map(withIdAlias);
  }

  async approveDriverKYC(driverId: number | string, adminId: string): Promise<any | null> {
    const numId = parseId(driverId);
    await db.update(users).set({
      kycStatus: 'approved',
      kycReviewedAt: new Date(),
      kycReviewedBy: adminId,
      updatedAt: new Date(),
    }).where(and(eq(users.id, numId), eq(users.role, 'driver')));
    return this.findUserById(numId);
  }

  async rejectDriverKYC(driverId: number | string, adminId: string, reason: string): Promise<any | null> {
    const numId = parseId(driverId);
    await db.update(users).set({
      kycStatus: 'rejected',
      kycReviewedAt: new Date(),
      kycReviewedBy: adminId,
      kycRejectionReason: reason,
      updatedAt: new Date(),
    }).where(and(eq(users.id, numId), eq(users.role, 'driver')));
    return this.findUserById(numId);
  }

  async getAdminStats(): Promise<{
    totalUsers: number; totalDrivers: number; totalPassengers: number;
    pendingKYC: number; totalBookings: number; totalRevenue: number; openTickets: number;
  }> {
    const [
      totalUsersResult,
      totalDriversResult,
      totalPassengersResult,
      pendingKYCResult,
      totalBookingsResult,
      openTicketsResult,
      revenueResult,
    ] = await Promise.all([
      db.select({ cnt: count() }).from(users),
      db.select({ cnt: count() }).from(users).where(eq(users.role, 'driver')),
      db.select({ cnt: count() }).from(users).where(eq(users.role, 'passenger')),
      db.select({ cnt: count() }).from(users).where(and(eq(users.role, 'driver'), eq(users.kycStatus, 'pending'))),
      db.select({ cnt: count() }).from(bookings),
      db.select({ cnt: count() }).from(supportTickets).where(
        or(eq(supportTickets.status, 'open'), eq(supportTickets.status, 'in_progress'))
      ),
      db.select({
        total: sql<number>`COALESCE(SUM(CAST(${bookings.price} AS DECIMAL(10,2))), 0)`,
      }).from(bookings).where(
        or(eq(bookings.status, 'confirmed'), eq(bookings.status, 'completed'))
      ),
    ]);

    return {
      totalUsers: totalUsersResult[0]?.cnt || 0,
      totalDrivers: totalDriversResult[0]?.cnt || 0,
      totalPassengers: totalPassengersResult[0]?.cnt || 0,
      pendingKYC: pendingKYCResult[0]?.cnt || 0,
      totalBookings: totalBookingsResult[0]?.cnt || 0,
      totalRevenue: revenueResult[0]?.total || 0,
      openTickets: openTicketsResult[0]?.cnt || 0,
    };
  }

  // ==================== SUPPORT TICKET METHODS ====================

  async createSupportTicket(ticket: any): Promise<any> {
    const userId = ticket.userId || ticket.odId;
    const [result] = await db.insert(supportTickets).values({
      userId: parseId(userId),
      userEmail: ticket.userEmail,
      userName: ticket.userName,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status || 'open',
      priority: ticket.priority || 'medium',
      category: ticket.category || 'other',
    });
    const insertId = (result as any).insertId;
    return {
      _id: insertId,
      id: insertId,
      userId: parseId(userId),
      userEmail: ticket.userEmail,
      userName: ticket.userName,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status || 'open',
      priority: ticket.priority || 'medium',
      category: ticket.category || 'other',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getUserSupportTickets(userId: number | string): Promise<any[]> {
    const numId = parseId(userId);
    const rows = await db.select().from(supportTickets)
      .where(eq(supportTickets.userId, numId))
      .orderBy(desc(supportTickets.createdAt));
    return rows.map(withIdAlias);
  }

  async getAllSupportTickets(filters?: { status?: string; priority?: string }): Promise<any[]> {
    const conditions: any[] = [];
    if (filters?.status && filters.status !== 'all') {
      conditions.push(eq(supportTickets.status, filters.status));
    }
    if (filters?.priority && filters.priority !== 'all') {
      conditions.push(eq(supportTickets.priority, filters.priority));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = whereClause
      ? await db.select().from(supportTickets).where(whereClause).orderBy(desc(supportTickets.createdAt))
      : await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));

    return rows.map(withIdAlias);
  }

  async updateSupportTicket(ticketId: number | string, updates: any): Promise<any | null> {
    const numId = parseId(ticketId);
    const setValues: any = { updatedAt: new Date() };
    if (updates.status !== undefined) setValues.status = updates.status;
    if (updates.priority !== undefined) setValues.priority = updates.priority;
    if (updates.adminNotes !== undefined) setValues.adminNotes = updates.adminNotes;
    if (updates.assignedTo !== undefined) setValues.assignedTo = updates.assignedTo;
    if (updates.resolvedAt !== undefined) setValues.resolvedAt = updates.resolvedAt;

    await db.update(supportTickets).set(setValues).where(eq(supportTickets.id, numId));

    const [row] = await db.select().from(supportTickets).where(eq(supportTickets.id, numId));
    return row ? withIdAlias(row) : null;
  }

  // ==================== NEW METHODS (absorb direct DB calls from routes.ts) ====================

  async updateSchedulesByDriverId(driverId: number, updates: any): Promise<number> {
    const setValues: any = {};
    if (updates.isLive !== undefined) setValues.isLive = updates.isLive;
    if (updates.startLocation !== undefined) setValues.startLocation = updates.startLocation;
    if (updates.endLocation !== undefined) setValues.endLocation = updates.endLocation;

    const [result] = await db.update(schedules).set(setValues)
      .where(eq(schedules.driverId, driverId));
    return (result as any).affectedRows || 0;
  }

  async findScheduleWithOwnership(id: number | string, driverId: number | string): Promise<any | null> {
    const numId = parseId(id);
    const numDriverId = parseId(driverId);
    const [row] = await db.select().from(schedules)
      .where(and(eq(schedules.id, numId), eq(schedules.driverId, numDriverId)));
    if (!row) return null;
    return {
      ...withIdAlias(row),
      route: row.routeData,
      price: row.price ? parseFloat(String(row.price)) : 0,
    };
  }

  async updateSchedule(id: number | string, updates: any): Promise<any | null> {
    const numId = parseId(id);
    const setValues: any = {};

    if (updates.departureTime !== undefined) {
      setValues.departureTime = updates.departureTime instanceof Date
        ? updates.departureTime
        : new Date(updates.departureTime);
    }
    if (updates.price !== undefined) setValues.price = updates.price.toString();
    if (updates.capacity !== undefined) setValues.capacity = updates.capacity;
    if (updates.availableSeats !== undefined) setValues.availableSeats = updates.availableSeats;
    if (updates.isLive !== undefined) setValues.isLive = updates.isLive;
    if (updates.startLocation !== undefined) setValues.startLocation = updates.startLocation;
    if (updates.endLocation !== undefined) setValues.endLocation = updates.endLocation;
    if (updates.routeData !== undefined) setValues.routeData = updates.routeData;
    if (updates.fareBreakdown !== undefined) setValues.fareBreakdown = updates.fareBreakdown;
    if (updates.stopsData !== undefined) setValues.stopsData = updates.stopsData;

    // Handle nested route updates (from MongoDB's dot notation like "route.startLocation")
    if (updates['route.startLocation'] || updates['route.endLocation']) {
      // Fetch existing routeData, merge updates
      const [existing] = await db.select().from(schedules).where(eq(schedules.id, numId));
      if (existing) {
        const currentRouteData: any = existing.routeData || {};
        if (updates['route.startLocation']) currentRouteData.startLocation = updates['route.startLocation'];
        if (updates['route.endLocation']) currentRouteData.endLocation = updates['route.endLocation'];
        setValues.routeData = currentRouteData;
        if (updates['route.startLocation']) setValues.startLocation = updates['route.startLocation'];
        if (updates['route.endLocation']) setValues.endLocation = updates['route.endLocation'];
      }
    }

    if (Object.keys(setValues).length === 0) return this.getSchedule(numId);

    await db.update(schedules).set(setValues).where(eq(schedules.id, numId));
    return this.getSchedule(numId);
  }

  async toggleScheduleLive(id: number | string, driverId: number | string, isLive: boolean): Promise<any | null> {
    const numId = parseId(id);
    const numDriverId = parseId(driverId);

    await db.update(schedules).set({ isLive: !!isLive })
      .where(and(eq(schedules.id, numId), eq(schedules.driverId, numDriverId)));

    const [row] = await db.select().from(schedules)
      .where(and(eq(schedules.id, numId), eq(schedules.driverId, numDriverId)));

    if (!row) return null;
    return {
      ...withIdAlias(row),
      route: row.routeData,
      price: row.price ? parseFloat(String(row.price)) : 0,
    };
  }

  async getBookingsBySchedule(scheduleId: number | string, status?: string): Promise<any[]> {
    const numId = parseId(scheduleId);
    const conditions = [eq(bookings.scheduleId, numId)];
    if (status) {
      conditions.push(eq(bookings.status, status));
    }
    const rows = await db.select().from(bookings).where(and(...conditions));
    return rows.map(withIdAlias);
  }

  async atomicDecrementSeats(scheduleId: number | string, seatCount: number): Promise<any> {
    const numId = parseId(scheduleId);

    return db.transaction(async (tx) => {
      // SELECT FOR UPDATE
      const [sched] = await tx.select().from(schedules)
        .where(eq(schedules.id, numId))
        .for('update');

      if (!sched || !sched.availableSeats || sched.availableSeats < seatCount) {
        throw new Error(`Not enough seats available. Have ${sched?.availableSeats || 0}, need ${seatCount}`);
      }

      await tx.update(schedules).set({
        availableSeats: sql`${schedules.availableSeats} - ${seatCount}`,
      }).where(eq(schedules.id, numId));

      // Return updated schedule
      const [updated] = await tx.select().from(schedules).where(eq(schedules.id, numId));
      return updated ? withIdAlias(updated) : null;
    });
  }

  async insertBookingDirect(booking: any): Promise<any> {
    const userId = parseId(booking.userId);
    const scheduleId = parseId(booking.scheduleId);

    const [result] = await db.insert(bookings).values({
      userId,
      scheduleId,
      seatNumber: booking.seatNumber || null,
      pickup: booking.pickup || null,
      dropoff: booking.dropoff || null,
      price: booking.price?.toString() || '0',
      status: booking.status || 'confirmed',
      isGroupBooking: booking.isGroupBooking || false,
      numberOfSeats: booking.numberOfSeats || null,
      organizationName: booking.organizationName || null,
      organizationType: booking.organizationType || null,
      contactName: booking.contactName || null,
      contactPhone: booking.contactPhone || null,
      notes: booking.notes || null,
      rideRequestId: booking.rideRequestId ? parseId(booking.rideRequestId) : null,
    });
    const insertId = (result as any).insertId;
    return { _id: insertId, id: insertId, ...booking, userId, scheduleId };
  }

  async updateBookingStatus(bookingId: number | string, status: string): Promise<any | null> {
    const numId = parseId(bookingId);
    await db.update(bookings).set({ status }).where(eq(bookings.id, numId));
    const [row] = await db.select().from(bookings).where(eq(bookings.id, numId));
    return row ? withIdAlias(row) : null;
  }

  async getDemandAnalytics(): Promise<any[]> {
    const rows = await db.select({
      startLocation: schedules.startLocation,
      endLocation: schedules.endLocation,
      bookingCount: sql<number>`COUNT(*)`,
      totalRevenue: sql<number>`COALESCE(SUM(CAST(${schedules.price} AS DECIMAL(10,2))), 0)`,
    })
      .from(bookings)
      .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
      .where(or(eq(bookings.status, 'confirmed'), eq(bookings.status, 'completed')))
      .groupBy(schedules.startLocation, schedules.endLocation)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(20);

    return rows.map(d => ({
      startLocation: d.startLocation,
      endLocation: d.endLocation,
      bookingCount: d.bookingCount,
      totalRevenue: d.totalRevenue,
    }));
  }

  async getPeakHoursAnalytics(): Promise<any[]> {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const rows = await db.select({
      hour: sql<number>`HOUR(${schedules.departureTime})`,
      dayOfWeek: sql<number>`DAYOFWEEK(${schedules.departureTime})`,
      bookingCount: sql<number>`COUNT(*)`,
    })
      .from(bookings)
      .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
      .where(or(eq(bookings.status, 'confirmed'), eq(bookings.status, 'completed')))
      .groupBy(sql`HOUR(${schedules.departureTime})`, sql`DAYOFWEEK(${schedules.departureTime})`)
      .orderBy(sql`DAYOFWEEK(${schedules.departureTime})`, sql`HOUR(${schedules.departureTime})`);

    return rows.map(d => ({
      hour: d.hour,
      dayOfWeek: d.dayOfWeek,
      dayName: dayNames[(d.dayOfWeek || 1) - 1] || 'Unknown',
      bookingCount: d.bookingCount,
    }));
  }

  async getRevenueAnalytics(driverId?: number, startDate?: Date): Promise<any> {
    const sinceDateObj = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Base conditions
    const baseConditions = [
      or(eq(bookings.status, 'confirmed'), eq(bookings.status, 'completed')),
      gte(bookings.createdAt, sinceDateObj),
    ];

    if (driverId) {
      baseConditions.push(eq(schedules.driverId, driverId));
    }

    const whereClause = and(...baseConditions);

    // Daily revenue
    const dailyRevenue = await db.select({
      date: sql<string>`DATE_FORMAT(${bookings.createdAt}, '%Y-%m-%d')`,
      bookingCount: sql<number>`COUNT(*)`,
      revenue: sql<number>`COALESCE(SUM(CAST(${schedules.price} AS DECIMAL(10,2))), 0)`,
    })
      .from(bookings)
      .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
      .where(whereClause)
      .groupBy(sql`DATE_FORMAT(${bookings.createdAt}, '%Y-%m-%d')`)
      .orderBy(sql`DATE_FORMAT(${bookings.createdAt}, '%Y-%m-%d')`);

    // Total stats
    const totalStats = await db.select({
      totalBookings: sql<number>`COUNT(*)`,
      totalRevenue: sql<number>`COALESCE(SUM(CAST(${schedules.price} AS DECIMAL(10,2))), 0)`,
      avgRevenue: sql<number>`COALESCE(AVG(CAST(${schedules.price} AS DECIMAL(10,2))), 0)`,
    })
      .from(bookings)
      .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
      .where(whereClause);

    // Popular routes
    const popularRoutes = await db.select({
      startLocation: schedules.startLocation,
      endLocation: schedules.endLocation,
      bookingCount: sql<number>`COUNT(*)`,
      revenue: sql<number>`COALESCE(SUM(CAST(${schedules.price} AS DECIMAL(10,2))), 0)`,
    })
      .from(bookings)
      .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
      .where(whereClause)
      .groupBy(schedules.startLocation, schedules.endLocation)
      .orderBy(sql`COALESCE(SUM(CAST(${schedules.price} AS DECIMAL(10,2))), 0) DESC`)
      .limit(5);

    return {
      dailyRevenue: dailyRevenue.map(d => ({
        date: d.date,
        bookings: d.bookingCount,
        revenue: d.revenue || 0,
      })),
      summary: totalStats[0] || { totalBookings: 0, totalRevenue: 0, avgRevenue: 0 },
      popularRoutes: popularRoutes.map(r => ({
        route: `${r.startLocation} \u2192 ${r.endLocation}`,
        bookings: r.bookingCount,
        revenue: r.revenue || 0,
      })),
    };
  }

  async createReport(report: any): Promise<any> {
    const [result] = await db.insert(reports).values({
      userId: parseId(report.userId),
      type: report.type,
      scheduleId: report.scheduleId ? parseId(report.scheduleId) : null,
      routeId: report.routeId ? parseId(report.routeId) : null,
      details: report.details || null,
      locationLat: report.location?.lat?.toString() || report.locationLat?.toString() || null,
      locationLng: report.location?.lng?.toString() || report.locationLng?.toString() || null,
      status: report.status || 'pending',
    });
    const insertId = (result as any).insertId;
    return { _id: insertId, id: insertId, ...report };
  }

  async getRouteReports(routeId: number | string, since: Date): Promise<any[]> {
    const numId = parseId(routeId);
    const rows = await db.select().from(reports)
      .where(and(
        eq(reports.routeId, numId),
        gte(reports.createdAt, since)
      ))
      .orderBy(desc(reports.createdAt))
      .limit(10);
    return rows.map(withIdAlias);
  }

  async createSOSAlert(alert: any): Promise<any> {
    const [result] = await db.insert(sosAlerts).values({
      userId: parseId(alert.userId),
      scheduleId: alert.scheduleId ? parseId(alert.scheduleId) : null,
      locationLat: alert.location?.lat?.toString() || alert.locationLat?.toString() || null,
      locationLng: alert.location?.lng?.toString() || alert.locationLng?.toString() || null,
      message: alert.message || 'Emergency alert',
      status: alert.status || 'active',
    });
    const insertId = (result as any).insertId;
    return { _id: insertId, id: insertId, ...alert };
  }

  async findLiveSchedulesForRoute(from: string, to: string): Promise<any[]> {
    // Fetch all live schedules, then filter in JS for complex text matching
    const rows = await db.select().from(schedules)
      .where(eq(schedules.isLive, true));

    return rows.filter(s => {
      const startLoc = (s.startLocation || '').toLowerCase();
      const endLoc = (s.endLocation || '').toLowerCase();

      let stopsRaw: any = s.stopsData;
      if (typeof stopsRaw === 'string') {
        try {
          stopsRaw = JSON.parse(stopsRaw);
        } catch (e) {
          stopsRaw = [];
        }
      }
      stopsRaw = (Array.isArray(stopsRaw) ? stopsRaw : []) || [];

      let routeData: any = s.routeData;
      if (typeof routeData === 'string') {
        try {
          routeData = JSON.parse(routeData);
        } catch (e) {
          routeData = null;
        }
      }

      const routeStart = (routeData?.startLocation || '').toLowerCase();
      const routeEnd = (routeData?.endLocation || '').toLowerCase();

      const allText = [
        startLoc, endLoc, routeStart, routeEnd,
        ...stopsRaw.map((st: any) => (typeof st === 'string' ? st : st?.name || '').toLowerCase()),
      ];

      const fromLower = from.toLowerCase();
      const toLower = to.toLowerCase();

      const matchesFrom = allText.some(t => t.includes(fromLower));
      const matchesTo = allText.some(t => t.includes(toLower));

      return matchesFrom || matchesTo;
    }).map(withIdAlias);
  }

  async findLiveDriversByIds(ids: number[]): Promise<any[]> {
    if (ids.length === 0) return [];
    const rows = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    }).from(users)
      .where(and(
        inArray(users.id, ids),
        eq(users.role, 'driver'),
        eq(users.isLive, true)
      ));
    return rows.map(r => ({ ...r, _id: r.id }));
  }

  async createRideRequest(request: any): Promise<any> {
    const [result] = await db.insert(rideRequests).values({
      userId: parseId(request.userId),
      userName: request.userName || null,
      userPhone: request.userPhone || null,
      fromLocation: request.from || request.fromLocation,
      toLocation: request.to || request.toLocation,
      seats: request.seats || 1,
      departureTime: request.departureTime ? new Date(request.departureTime) : null,
      notes: request.notes || null,
      status: request.status || 'pending',
      estimatedFare: request.estimatedFare?.toString() || null,
      estimatedDistance: request.estimatedDistance?.toString() || null,
      notifiedDrivers: request.notifiedDrivers || null,
    });
    const insertId = (result as any).insertId;
    return { _id: insertId, id: insertId, ...request };
  }

  async getRecentRideRequests(): Promise<any[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await db.select().from(rideRequests)
      .where(and(
        eq(rideRequests.status, 'pending'),
        gte(rideRequests.createdAt, oneDayAgo)
      ))
      .orderBy(desc(rideRequests.createdAt))
      .limit(50);

    return rows.map(r => ({
      ...withIdAlias(r),
      from: r.fromLocation,
      to: r.toLocation,
      estimatedFare: r.estimatedFare ? parseFloat(String(r.estimatedFare)) : 0,
      estimatedDistance: r.estimatedDistance ? parseFloat(String(r.estimatedDistance)) : 0,
    }));
  }

  async findRideRequest(id: number | string, conditions?: any): Promise<any | null> {
    const numId = parseId(id);
    const queryConditions = [eq(rideRequests.id, numId)];

    if (conditions?.status) {
      queryConditions.push(eq(rideRequests.status, conditions.status));
    }
    if (conditions?.userId) {
      queryConditions.push(eq(rideRequests.userId, parseId(conditions.userId)));
    }

    const [row] = await db.select().from(rideRequests)
      .where(and(...queryConditions));

    if (!row) return null;
    return {
      ...withIdAlias(row),
      from: row.fromLocation,
      to: row.toLocation,
      estimatedFare: row.estimatedFare ? parseFloat(String(row.estimatedFare)) : 0,
      estimatedDistance: row.estimatedDistance ? parseFloat(String(row.estimatedDistance)) : 0,
    };
  }

  async updateRideRequest(id: number | string, updates: any): Promise<any | null> {
    const numId = parseId(id);
    const setValues: any = {};

    if (updates.status !== undefined) setValues.status = updates.status;
    if (updates.acceptedBy !== undefined) setValues.acceptedBy = updates.acceptedBy ? parseId(updates.acceptedBy) : null;
    if (updates.acceptedByName !== undefined) setValues.acceptedByName = updates.acceptedByName;
    if (updates.acceptedScheduleId !== undefined) setValues.acceptedScheduleId = updates.acceptedScheduleId ? parseId(updates.acceptedScheduleId) : null;
    if (updates.acceptedAt !== undefined) setValues.acceptedAt = updates.acceptedAt;
    if (updates.cancelledAt !== undefined) setValues.cancelledAt = updates.cancelledAt;
    if (updates.notifiedDrivers !== undefined) setValues.notifiedDrivers = updates.notifiedDrivers;

    if (Object.keys(setValues).length === 0) return this.findRideRequest(numId);

    await db.update(rideRequests).set(setValues).where(eq(rideRequests.id, numId));
    return this.findRideRequest(numId);
  }

  async deleteUser(id: number | string): Promise<boolean> {
    const numId = parseId(id);
    const [result] = await db.delete(users).where(eq(users.id, numId));
    return (result as any).affectedRows > 0;
  }

  async createStaffUser(userData: any): Promise<any> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [result] = await db.insert(users).values({
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: 'admin',
      staffType: userData.staffType || 'station_master',
      accountStatus: 'active',
      emailVerified: true,
    });
    const insertId = (result as any).insertId;
    return {
      _id: insertId,
      id: insertId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: 'admin',
      staffType: userData.staffType || 'station_master',
    };
  }
}

export const storage = new MySQLStorage();
