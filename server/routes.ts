import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // === BUSES ===
  app.get(api.buses.list.path, async (req, res) => {
    const buses = await storage.getBuses();
    res.json(buses);
  });

  app.post(api.buses.create.path, isAuthenticated, async (req, res) => {
    // In a real app, check for admin role here
    const input = api.buses.create.input.parse(req.body);
    const bus = await storage.createBus(input);
    res.status(201).json(bus);
  });

  // === ROUTES ===
  app.get(api.routes.list.path, async (req, res) => {
    const routes = await storage.getRoutes();
    res.json(routes);
  });

  app.post(api.routes.create.path, isAuthenticated, async (req, res) => {
    const input = api.routes.create.input.parse(req.body);
    const route = await storage.createRoute(input);
    res.status(201).json(route);
  });

  // === SCHEDULES ===
  app.get(api.schedules.list.path, async (req, res) => {
    const schedules = await storage.getSchedules(req.query as any);
    res.json(schedules);
  });

  app.post(api.schedules.create.path, isAuthenticated, async (req, res) => {
    const input = api.schedules.create.input.parse(req.body);
    const schedule = await storage.createSchedule(input);
    res.status(201).json(schedule);
  });

  // === BOOKINGS ===
  app.get(api.bookings.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const bookings = await storage.getBookings(userId);
    res.json(bookings);
  });

  app.post(api.bookings.create.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const input = api.bookings.create.input.parse(req.body);
    // Force userId to be the authenticated user
    const booking = await storage.createBooking({ ...input, userId });
    res.status(201).json(booking);
  });

  app.post(api.bookings.cancel.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const bookingId = parseInt(req.params.id);
    const booking = await storage.cancelBooking(bookingId, userId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  });
  
  // === PROFILE ===
  app.get(api.profile.get.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    let profile = await storage.getProfile(userId);
    if (!profile) {
      // Create default profile if not exists
      profile = await storage.createProfile(userId, { role: 'passenger' });
    }
    res.json(profile);
  });

  // Seed Data
  if (process.env.NODE_ENV !== "production") {
    const routes = await storage.getRoutes();
    if (routes.length === 0) {
      console.log("Seeding Ghanaian data...");
      const bus1 = await storage.createBus({ plateNumber: "GW-1234-24", driverName: "Kofi Mensah", capacity: 40, status: "active" });
      const bus2 = await storage.createBus({ plateNumber: "AS-5678-23", driverName: "Kwame Asante", capacity: 50, status: "active" });

      const route1 = await storage.createRoute({ 
        name: "Circle to Madina", 
        startLocation: "Circle Station", 
        endLocation: "Madina Station", 
        stops: ["37 Military Hospital", "Legon", "UPSA"], 
        distance: "12.5", 
        estimatedDuration: 40 
      });

      const route2 = await storage.createRoute({ 
        name: "Accra to Kumasi", 
        startLocation: "VIP Station (Accra)", 
        endLocation: "Kejetia Station", 
        stops: ["Linda Dor", "Konongo"], 
        distance: "250.0", 
        estimatedDuration: 240 
      });

      await storage.createSchedule({ 
        routeId: route1.id, 
        busId: bus1.id, 
        departureTime: new Date(Date.now() + 3600000), 
        arrivalTime: new Date(Date.now() + 3600000 + 2400000), 
        price: "15.00" 
      });
      console.log("Seeding complete.");
    }
  }

  return httpServer;
}
