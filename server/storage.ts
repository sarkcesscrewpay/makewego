import { db } from "./db";
import {
  buses, busRoutes, schedules, bookings, profiles,
  type Bus, type InsertBus,
  type BusRoute, type InsertRoute,
  type Schedule, type InsertSchedule,
  type Booking, type InsertBooking,
  type Profile, type InsertProfile
} from "@shared/schema";
import { eq, and, desc, gte } from "drizzle-orm";

export interface IStorage {
  // Buses
  getBuses(): Promise<Bus[]>;
  createBus(bus: InsertBus): Promise<Bus>;
  updateBus(id: number, bus: Partial<InsertBus>): Promise<Bus>;

  // Routes
  getRoutes(): Promise<BusRoute[]>;
  createRoute(route: InsertRoute): Promise<BusRoute>;

  // Schedules
  getSchedules(filters?: { from?: string, to?: string, date?: string }): Promise<(Schedule & { route: BusRoute, bus: Bus })[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  getSchedule(id: number): Promise<Schedule | undefined>;

  // Bookings
  getBookings(userId: string): Promise<(Booking & { schedule: Schedule, route: BusRoute })[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  cancelBooking(id: number, userId: string): Promise<Booking | undefined>;

  // Profile
  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(userId: string, profile: any): Promise<Profile>;
}

export type InsertProfile = typeof profiles.$inferInsert;

export class DatabaseStorage implements IStorage {
  async getBuses(): Promise<Bus[]> {
    return await db.select().from(buses);
  }

  async createBus(bus: InsertBus): Promise<Bus> {
    const [newBus] = await db.insert(buses).values(bus).returning();
    return newBus;
  }

  async updateBus(id: number, bus: Partial<InsertBus>): Promise<Bus> {
    const [updated] = await db.update(buses).set(bus).where(eq(buses.id, id)).returning();
    return updated;
  }

  async getRoutes(): Promise<BusRoute[]> {
    return await db.select().from(busRoutes);
  }

  async createRoute(route: InsertRoute): Promise<BusRoute> {
    const [newRoute] = await db.insert(busRoutes).values({
      ...route,
      distance: route.distance.toString()
    }).returning();
    return newRoute;
  }

  async getSchedules(filters?: { from?: string, to?: string, date?: string }): Promise<(Schedule & { route: BusRoute, bus: Bus })[]> {
    const whereConditions = [gte(schedules.departureTime, new Date())];

    if (filters?.from) {
      whereConditions.push(eq(busRoutes.startLocation, filters.from));
    }
    if (filters?.to) {
      whereConditions.push(eq(busRoutes.endLocation, filters.to));
    }

    const results = await db.select({
      schedule: schedules,
      route: busRoutes,
      bus: buses
    })
    .from(schedules)
    .innerJoin(busRoutes, eq(schedules.routeId, busRoutes.id))
    .innerJoin(buses, eq(schedules.busId, buses.id))
    .where(and(...whereConditions));

    return results.map(r => ({ ...r.schedule, route: r.route, bus: r.bus }));
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const [newSchedule] = await db.insert(schedules).values({
      ...schedule,
      price: schedule.price.toString()
    }).returning();
    return newSchedule;
  }

  async getSchedule(id: number): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
    return schedule;
  }

  async getBookings(userId: string): Promise<(Booking & { schedule: Schedule, route: BusRoute })[]> {
    const results = await db.select({
      booking: bookings,
      schedule: schedules,
      route: busRoutes
    })
    .from(bookings)
    .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
    .innerJoin(busRoutes, eq(schedules.routeId, busRoutes.id))
    .where(eq(bookings.userId, userId));

    return results.map(r => ({ ...r.booking, schedule: r.schedule, route: r.route }));
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async cancelBooking(id: number, userId: string): Promise<Booking | undefined> {
    const [updated] = await db.update(bookings)
      .set({ status: 'cancelled' })
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
      .returning();
    return updated;
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }

  async createProfile(userId: string, profileData: any): Promise<Profile> {
    const [profile] = await db.insert(profiles).values({ userId, ...profileData }).returning();
    return profile;
  }
}

export const storage = new DatabaseStorage();
