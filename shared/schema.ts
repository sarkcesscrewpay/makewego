import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";
export * from "./models/auth";

export const profiles = pgTable("profiles", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  role: text("role").notNull().default("passenger"), // passenger, driver, admin
  phoneNumber: text("phone_number"),
});

export const buses = pgTable("buses", {
  id: serial("id").primaryKey(),
  plateNumber: text("plate_number").notNull().unique(),
  driverName: text("driver_name").notNull(),
  capacity: integer("capacity").notNull(),
  status: text("status").notNull().default("active"), // active, maintenance
});

export const busRoutes = pgTable("bus_routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startLocation: text("start_location").notNull(),
  endLocation: text("end_location").notNull(),
  stops: jsonb("stops").$type<string[]>().notNull(), // List of stop names
  distance: decimal("distance").notNull(), // in km
  estimatedDuration: integer("estimated_duration").notNull(), // in minutes
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull().references(() => busRoutes.id),
  busId: integer("bus_id").notNull().references(() => buses.id),
  departureTime: timestamp("departure_time").notNull(),
  arrivalTime: timestamp("arrival_time").notNull(),
  price: decimal("price").notNull(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  scheduleId: integer("schedule_id").notNull().references(() => schedules.id),
  seatNumber: integer("seat_number").notNull(),
  status: text("status").notNull().default("confirmed"), // confirmed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  amount: decimal("amount").notNull(),
  status: text("status").notNull().default("completed"),
  method: text("method").notNull(), // credit_card, cash
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations/Schemas
export const insertProfileSchema = createInsertSchema(profiles);
export const insertBusSchema = createInsertSchema(buses).omit({ id: true });
export const insertRouteSchema = createInsertSchema(busRoutes).omit({ id: true });
export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });

export type Profile = typeof profiles.$inferSelect;
export type Bus = typeof buses.$inferSelect;
export type BusRoute = typeof busRoutes.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Payment = typeof payments.$inferSelect;

export type InsertBus = z.infer<typeof insertBusSchema>;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
