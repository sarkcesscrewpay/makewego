import { mysqlTable, int, varchar, text, boolean, datetime, decimal, json } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== USERS ====================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  phoneVerified: boolean("phone_verified").default(false),
  phoneVerificationCode: varchar("phone_verification_code", { length: 10 }),
  phoneVerificationExpiry: datetime("phone_verification_expiry"),
  role: varchar("role", { length: 20 }).notNull().default("passenger"),
  isLive: boolean("is_live").default(false),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: varchar("verification_token", { length: 255 }),
  verificationTokenExpiry: datetime("verification_token_expiry"),
  driverDetails: json("driver_details").$type<{
    licenseNumber: string;
    vehicleParams: {
      make: string; model: string; year: string;
      plateNumber: string; color: string; capacity: number;
    };
  } | null>(),
  kycStatus: varchar("kyc_status", { length: 20 }),
  kycSubmittedAt: datetime("kyc_submitted_at"),
  kycReviewedAt: datetime("kyc_reviewed_at"),
  kycReviewedBy: varchar("kyc_reviewed_by", { length: 20 }),
  kycRejectionReason: text("kyc_rejection_reason"),
  licenseDocumentUrl: varchar("license_document_url", { length: 500 }),
  accountStatus: varchar("account_status", { length: 20 }).default("active"),
  suspensionReason: text("suspension_reason"),
  staffType: varchar("staff_type", { length: 30 }),
  createdAt: datetime("created_at").default(sql`NOW()`),
  updatedAt: datetime("updated_at").default(sql`NOW()`),
});

// ==================== BUSES ====================
export const buses = mysqlTable("buses", {
  id: int("id").autoincrement().primaryKey(),
  plateNumber: varchar("plate_number", { length: 20 }).notNull().unique(),
  driverName: varchar("driver_name", { length: 200 }).notNull(),
  capacity: int("capacity").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
});

// ==================== ROUTES ====================
export const routes = mysqlTable("routes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  startLocation: varchar("start_location", { length: 255 }).notNull(),
  endLocation: varchar("end_location", { length: 255 }).notNull(),
  distance: varchar("distance", { length: 20 }),
  estimatedDuration: int("estimated_duration"),
  busType: varchar("bus_type", { length: 30 }).default("standard"),
  geometry: json("geometry"),
  createdAt: datetime("created_at").default(sql`NOW()`),
});

// ==================== ROUTE STOPS ====================
export const routeStops = mysqlTable("route_stops", {
  id: int("id").autoincrement().primaryKey(),
  routeId: int("route_id").notNull().references(() => routes.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  lat: decimal("lat", { precision: 10, scale: 6 }),
  lng: decimal("lng", { precision: 10, scale: 6 }),
  stopOrder: int("stop_order").notNull(),
});

// ==================== SCHEDULES ====================
export const schedules = mysqlTable("schedules", {
  id: int("id").autoincrement().primaryKey(),
  routeId: int("route_id").references(() => routes.id),
  driverId: int("driver_id").references(() => users.id),
  departureTime: datetime("departure_time").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }),
  capacity: int("capacity").default(15),
  availableSeats: int("available_seats"),
  isLive: boolean("is_live").default(false),
  routeData: json("route_data"),
  fareBreakdown: json("fare_breakdown"),
  lastLocationLat: decimal("last_location_lat", { precision: 10, scale: 6 }),
  lastLocationLng: decimal("last_location_lng", { precision: 10, scale: 6 }),
  lastUpdate: datetime("last_update"),
  startLocation: varchar("start_location", { length: 255 }),
  endLocation: varchar("end_location", { length: 255 }),
  stopsData: json("stops_data"),
  createdAt: datetime("created_at").default(sql`NOW()`),
});

// ==================== BOOKINGS ====================
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  scheduleId: int("schedule_id").notNull().references(() => schedules.id),
  seatNumber: int("seat_number"),
  pickup: varchar("pickup", { length: 255 }),
  dropoff: varchar("dropoff", { length: 255 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).notNull().default("confirmed"),
  isGroupBooking: boolean("is_group_booking").default(false),
  numberOfSeats: int("number_of_seats"),
  organizationName: varchar("organization_name", { length: 255 }),
  organizationType: varchar("organization_type", { length: 50 }),
  contactName: varchar("contact_name", { length: 200 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  notes: text("notes"),
  rideRequestId: int("ride_request_id"),
  createdAt: datetime("created_at").default(sql`NOW()`),
});

// ==================== PROFILES ====================
export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  role: varchar("role", { length: 20 }).notNull().default("passenger"),
  phoneNumber: varchar("phone_number", { length: 20 }),
  createdAt: datetime("created_at").default(sql`NOW()`),
});

// ==================== BUS STOPS ====================
export const busStops = mysqlTable("bus_stops", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  region: varchar("region", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  lat: decimal("lat", { precision: 10, scale: 6 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 6 }).notNull(),
  aliases: json("aliases").$type<string[]>(),
  searchTerms: text("search_terms"),
  createdAt: datetime("created_at").default(sql`NOW()`),
  updatedAt: datetime("updated_at").default(sql`NOW()`),
});

// ==================== PAYMENTS ====================
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("booking_id").notNull().references(() => bookings.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("completed"),
  method: varchar("method", { length: 30 }).notNull(),
  createdAt: datetime("created_at").default(sql`NOW()`),
});

// ==================== SUPPORT TICKETS ====================
export const supportTickets = mysqlTable("support_tickets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  userName: varchar("user_name", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"),
  category: varchar("category", { length: 30 }).notNull().default("other"),
  resolvedAt: datetime("resolved_at"),
  adminNotes: text("admin_notes"),
  assignedTo: varchar("assigned_to", { length: 20 }),
  createdAt: datetime("created_at").default(sql`NOW()`),
  updatedAt: datetime("updated_at").default(sql`NOW()`),
});

// ==================== NOTIFICATIONS ====================
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 30 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  data: json("data"),
  isRead: boolean("is_read").default(false),
  sent: boolean("sent").default(false),
  sentAt: datetime("sent_at"),
  createdAt: datetime("created_at").default(sql`NOW()`),
});

// ==================== PUSH SUBSCRIPTIONS ====================
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  keys: json("keys").$type<{ p256dh: string; auth: string }>().notNull(),
  createdAt: datetime("created_at").default(sql`NOW()`),
});

// ==================== NOTIFICATION PREFERENCES ====================
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  enablePushNotifications: boolean("enable_push_notifications").default(true),
  enableArrivalAlerts: boolean("enable_arrival_alerts").default(true),
  enableDelayAlerts: boolean("enable_delay_alerts").default(true),
  enableCongestionWarnings: boolean("enable_congestion_warnings").default(true),
  arrivalAlertMinutes: int("arrival_alert_minutes").default(10),
  delayThresholdMinutes: int("delay_threshold_minutes").default(15),
  createdAt: datetime("created_at").default(sql`NOW()`),
  updatedAt: datetime("updated_at").default(sql`NOW()`),
});

// ==================== RIDE REQUESTS ====================
export const rideRequests = mysqlTable("ride_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  userName: varchar("user_name", { length: 200 }),
  userPhone: varchar("user_phone", { length: 20 }),
  fromLocation: varchar("from_location", { length: 255 }).notNull(),
  toLocation: varchar("to_location", { length: 255 }).notNull(),
  seats: int("seats").default(1),
  departureTime: datetime("departure_time"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  estimatedFare: decimal("estimated_fare", { precision: 10, scale: 2 }),
  estimatedDistance: decimal("estimated_distance", { precision: 10, scale: 2 }),
  notifiedDrivers: json("notified_drivers").$type<string[]>(),
  acceptedBy: int("accepted_by").references(() => users.id),
  acceptedByName: varchar("accepted_by_name", { length: 200 }),
  acceptedScheduleId: int("accepted_schedule_id"),
  acceptedAt: datetime("accepted_at"),
  cancelledAt: datetime("cancelled_at"),
  createdAt: datetime("created_at").default(sql`NOW()`),
});

// ==================== REPORTS ====================
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  scheduleId: int("schedule_id"),
  routeId: int("route_id"),
  details: text("details"),
  locationLat: decimal("location_lat", { precision: 10, scale: 6 }),
  locationLng: decimal("location_lng", { precision: 10, scale: 6 }),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: datetime("created_at").default(sql`NOW()`),
});

// ==================== SOS ALERTS ====================
export const sosAlerts = mysqlTable("sos_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  scheduleId: int("schedule_id"),
  locationLat: decimal("location_lat", { precision: 10, scale: 6 }),
  locationLng: decimal("location_lng", { precision: 10, scale: 6 }),
  message: text("message"),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: datetime("created_at").default(sql`NOW()`),
});

// ==================== INSERT SCHEMAS ====================
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBusSchema = createInsertSchema(buses).omit({ id: true });
export const insertRouteSchema = createInsertSchema(routes).omit({ id: true, createdAt: true });
export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true, createdAt: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true });

// ==================== TYPES ====================
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Bus = typeof buses.$inferSelect;
export type InsertBus = z.infer<typeof insertBusSchema>;
export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Payment = typeof payments.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type BusStop = typeof busStops.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type RideRequest = typeof rideRequests.$inferSelect;
