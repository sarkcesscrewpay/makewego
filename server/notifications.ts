// server/notifications.ts - Push notification service (MySQL/Drizzle ORM implementation)
import { db } from './db';
import { notifications, pushSubscriptions, notificationPreferences, schedules, bookings } from '@shared/schema';
import { eq, and, ne, gte, desc, sql, inArray } from 'drizzle-orm';
import webPush from 'web-push';

// Notification types
export type NotificationType = 'arrival' | 'delay' | 'congestion' | 'route_change' | 'booking' | 'general' | 'ride_request' | 'ride_request_accepted';

export interface NotificationData {
  scheduleId?: string;
  routeId?: string;
  bookingId?: string;
  delayMinutes?: number;
  arrivalETA?: Date;
  busLocation?: { lat: number; lng: number };
  severity?: 'low' | 'medium' | 'high';
  // Ride request fields
  from?: string;
  to?: string;
  seats?: number;
  requestId?: string;
  passengerId?: string;
  passengerName?: string;
  passengerPhone?: string;
  driverId?: string;
  driverName?: string;
  departureTime?: string;
  // Fare estimation fields
  estimatedFare?: number;
  estimatedDistance?: number;
}

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: NotificationData;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPreferencesResult {
  _id: number;
  userId: number;
  enablePushNotifications: boolean | null;
  enableArrivalAlerts: boolean | null;
  enableDelayAlerts: boolean | null;
  enableCongestionWarnings: boolean | null;
  arrivalAlertMinutes: number | null;
  delayThresholdMinutes: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// VAPID keys - In production, these should be in environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@bus-connect.com';

// Initialize web-push if keys are configured
export function initializeWebPush() {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log('Web push initialized with VAPID keys');
    return true;
  }
  console.warn('VAPID keys not configured - push notifications disabled');
  return false;
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}

// Generate VAPID keys (run once, then store in env)
export function generateVapidKeys() {
  const keys = webPush.generateVAPIDKeys();
  console.log('Generated VAPID Keys:');
  console.log('Public Key:', keys.publicKey);
  console.log('Private Key:', keys.privateKey);
  return keys;
}

export class NotificationService {
  private pushEnabled: boolean;

  constructor() {
    this.pushEnabled = initializeWebPush();
  }

  // ============================================================
  // Push Subscription Management
  // ============================================================

  // Save push subscription for a user
  async savePushSubscription(userId: string, subscription: PushSubscriptionInput) {
    const uid = parseInt(userId);

    // Check if subscription already exists for this user + endpoint
    const existing = await db.select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, uid),
          eq(pushSubscriptions.endpoint, subscription.endpoint)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return { ...existing[0], _id: existing[0].id };
    }

    // Insert new subscription
    const [inserted] = await db.insert(pushSubscriptions).values({
      userId: uid,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    }).$returningId();

    const doc = {
      id: inserted.id,
      userId: uid,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      createdAt: new Date(),
    };

    return { ...doc, _id: inserted.id };
  }

  // Remove push subscription
  async removePushSubscription(userId: string, endpoint: string): Promise<boolean> {
    const uid = parseInt(userId);

    const result = await db.delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, uid),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      );

    // mysql2 returns [ResultSetHeader] with affectedRows
    return (result as any)[0]?.affectedRows > 0;
  }

  // Get user's push subscriptions
  async getUserSubscriptions(userId: string) {
    const uid = parseInt(userId);

    const subs = await db.select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, uid));

    return subs;
  }

  // ============================================================
  // Notification Preferences
  // ============================================================

  // Get/Create notification preferences
  async getPreferences(userId: string): Promise<NotificationPreferencesResult> {
    const uid = parseInt(userId);

    const existing = await db.select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, uid))
      .limit(1);

    if (existing.length > 0) {
      return { ...existing[0], _id: existing[0].id };
    }

    // Create default preferences
    const [inserted] = await db.insert(notificationPreferences).values({
      userId: uid,
      enablePushNotifications: true,
      enableArrivalAlerts: true,
      enableDelayAlerts: true,
      enableCongestionWarnings: true,
      arrivalAlertMinutes: 10,
      delayThresholdMinutes: 15,
    }).$returningId();

    const defaults: NotificationPreferencesResult = {
      _id: inserted.id,
      id: inserted.id,
      userId: uid,
      enablePushNotifications: true,
      enableArrivalAlerts: true,
      enableDelayAlerts: true,
      enableCongestionWarnings: true,
      arrivalAlertMinutes: 10,
      delayThresholdMinutes: 15,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    return defaults;
  }

  // Update notification preferences (upsert)
  async updatePreferences(userId: string, updates: Partial<NotificationPreferencesResult>) {
    const uid = parseInt(userId);

    // Check if preferences exist
    const existing = await db.select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, uid))
      .limit(1);

    // Build the update values, only including defined fields
    const updateValues: any = {};
    if (updates.enablePushNotifications !== undefined) updateValues.enablePushNotifications = updates.enablePushNotifications;
    if (updates.enableArrivalAlerts !== undefined) updateValues.enableArrivalAlerts = updates.enableArrivalAlerts;
    if (updates.enableDelayAlerts !== undefined) updateValues.enableDelayAlerts = updates.enableDelayAlerts;
    if (updates.enableCongestionWarnings !== undefined) updateValues.enableCongestionWarnings = updates.enableCongestionWarnings;
    if (updates.arrivalAlertMinutes !== undefined) updateValues.arrivalAlertMinutes = updates.arrivalAlertMinutes;
    if (updates.delayThresholdMinutes !== undefined) updateValues.delayThresholdMinutes = updates.delayThresholdMinutes;

    if (existing.length > 0) {
      // Update existing
      await db.update(notificationPreferences)
        .set({ ...updateValues, updatedAt: new Date() })
        .where(eq(notificationPreferences.userId, uid));
    } else {
      // Insert new
      await db.insert(notificationPreferences).values({
        userId: uid,
        enablePushNotifications: true,
        enableArrivalAlerts: true,
        enableDelayAlerts: true,
        enableCongestionWarnings: true,
        arrivalAlertMinutes: 10,
        delayThresholdMinutes: 15,
        ...updateValues,
      });
    }

    // Return updated preferences
    return this.getPreferences(userId);
  }

  // ============================================================
  // Notification CRUD
  // ============================================================

  // Create and optionally send a notification
  async createNotification(notification: NotificationInput, sendPush = true) {
    const uid = parseInt(notification.userId);

    const notifData = {
      userId: uid,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data || null,
      isRead: false,
      sent: false,
    };

    const [inserted] = await db.insert(notifications).values(notifData).$returningId();

    const created = {
      ...notifData,
      id: inserted.id,
      _id: inserted.id,
      sentAt: null as Date | null,
      createdAt: new Date(),
    };

    // Send push notification if enabled
    if (sendPush && this.pushEnabled) {
      const prefs = await this.getPreferences(notification.userId);

      // Check if this notification type is enabled
      const shouldSend = this.shouldSendNotification(notification.type, prefs);

      if (shouldSend) {
        await this.sendPushToUser(notification.userId, created);
      }
    }

    return created;
  }

  // Get user's notifications
  async getUserNotifications(userId: string, limit = 50, unreadOnly = false) {
    const uid = parseInt(userId);

    const conditions = [eq(notifications.userId, uid)];
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    const rows = await db.select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    // Map to frontend-compatible field names
    return rows.map(row => {
      // Ensure data is a parsed object (MySQL JSON column might return string)
      let parsedData = row.data;
      if (typeof parsedData === 'string') {
        try { parsedData = JSON.parse(parsedData); } catch { parsedData = null; }
      }
      return {
        ...row,
        _id: String(row.id),
        read: row.isRead ?? false,
        sent: row.sent ?? false,
        data: parsedData,
      };
    });
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    const uid = parseInt(userId);

    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, uid),
          eq(notifications.isRead, false)
        )
      );

    return result.count;
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const nid = parseInt(notificationId);
    const uid = parseInt(userId);

    const result = await db.update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, nid),
          eq(notifications.userId, uid)
        )
      );

    return (result as any)[0]?.affectedRows > 0;
  }

  // Mark all as read
  async markAllAsRead(userId: string): Promise<number> {
    const uid = parseInt(userId);

    const result = await db.update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, uid),
          eq(notifications.isRead, false)
        )
      );

    return (result as any)[0]?.affectedRows || 0;
  }

  // Delete a notification
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const nid = parseInt(notificationId);
    const uid = parseInt(userId);

    const result = await db.delete(notifications)
      .where(
        and(
          eq(notifications.id, nid),
          eq(notifications.userId, uid)
        )
      );

    return (result as any)[0]?.affectedRows > 0;
  }

  // Dismiss ride request notifications for all drivers except the one who accepted
  async dismissRideRequestNotifications(requestId: string, excludeUserId?: string): Promise<number> {
    const conditions = [
      eq(notifications.type, 'ride_request'),
      sql`JSON_EXTRACT(${notifications.data}, '$.requestId') = ${requestId}`,
    ];

    if (excludeUserId) {
      const excludeUid = parseInt(excludeUserId);
      conditions.push(ne(notifications.userId, excludeUid));
    }

    const result = await db.delete(notifications)
      .where(and(...conditions));

    return (result as any)[0]?.affectedRows || 0;
  }

  // Get notifications by requestId (for tracking which drivers were notified)
  async getNotificationsByRequestId(requestId: string) {
    const rows = await db.select()
      .from(notifications)
      .where(
        and(
          eq(notifications.type, 'ride_request'),
          sql`JSON_EXTRACT(${notifications.data}, '$.requestId') = ${requestId}`
        )
      );

    return rows.map(row => ({ ...row, _id: row.id }));
  }

  // ============================================================
  // Push Notification Logic
  // ============================================================

  // Check if notification should be sent based on preferences
  private shouldSendNotification(type: NotificationType, prefs: NotificationPreferencesResult): boolean {
    if (!prefs.enablePushNotifications) return false;

    switch (type) {
      case 'arrival':
        return !!prefs.enableArrivalAlerts;
      case 'delay':
        return !!prefs.enableDelayAlerts;
      case 'congestion':
        return !!prefs.enableCongestionWarnings;
      default:
        return true;
    }
  }

  // Send push notification to all user's devices
  async sendPushToUser(userId: string, notification: { _id: number; type: string; title: string; body: string; data?: any }): Promise<number> {
    if (!this.pushEnabled) return 0;

    const subscriptions = await this.getUserSubscriptions(userId);
    let successCount = 0;

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      type: notification.type,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `bus-connect-${notification.type}-${notification._id}`,
      data: notification.data,
    });

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys as { p256dh: string; auth: string },
          },
          payload
        );
        successCount++;
      } catch (error: any) {
        console.error('Push notification failed:', error.message);

        // Remove invalid subscriptions (gone or expired)
        if (error.statusCode === 404 || error.statusCode === 410) {
          await this.removePushSubscription(userId, sub.endpoint);
        }
      }
    }

    // Mark notification as sent
    if (successCount > 0) {
      await db.update(notifications)
        .set({ sent: true, sentAt: new Date() })
        .where(eq(notifications.id, notification._id));
    }

    return successCount;
  }

  // ============================================================
  // Arrival Alert Logic
  // ============================================================

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Estimate arrival time based on distance and average speed
  estimateArrivalTime(distanceKm: number, averageSpeedKmh = 30): Date {
    const hours = distanceKm / averageSpeedKmh;
    const arrivalTime = new Date();
    arrivalTime.setTime(arrivalTime.getTime() + hours * 60 * 60 * 1000);
    return arrivalTime;
  }

  // Check if bus is approaching and should trigger arrival alert
  async checkArrivalAlert(
    scheduleId: string,
    busLocation: { lat: number; lng: number },
    destinationLocation: { lat: number; lng: number },
    passengerUserId: string
  ): Promise<boolean> {
    const prefs = await this.getPreferences(passengerUserId);
    if (!prefs.enableArrivalAlerts) return false;

    const distance = this.calculateDistance(
      busLocation.lat, busLocation.lng,
      destinationLocation.lat, destinationLocation.lng
    );

    const eta = this.estimateArrivalTime(distance);
    const minutesUntilArrival = (eta.getTime() - Date.now()) / (1000 * 60);

    // Check if within alert threshold
    if (minutesUntilArrival <= (prefs.arrivalAlertMinutes || 10) && minutesUntilArrival > 0) {
      const uid = parseInt(passengerUserId);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Check if we already sent this alert recently (within last 5 minutes)
      const recentAlerts = await db.select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, uid),
            eq(notifications.type, 'arrival'),
            sql`JSON_EXTRACT(${notifications.data}, '$.scheduleId') = ${scheduleId}`,
            gte(notifications.createdAt, fiveMinutesAgo)
          )
        )
        .limit(1);

      if (recentAlerts.length === 0) {
        await this.createNotification({
          userId: passengerUserId,
          type: 'arrival',
          title: 'Bus Arriving Soon!',
          body: `Your bus will arrive in approximately ${Math.round(minutesUntilArrival)} minutes`,
          data: {
            scheduleId,
            busLocation,
            arrivalETA: eta,
          },
        });
        return true;
      }
    }

    return false;
  }

  // ============================================================
  // Delay Detection Logic
  // ============================================================

  async checkDelayAlert(
    scheduleId: string,
    expectedArrivalTime: Date,
    currentLocation: { lat: number; lng: number },
    destinationLocation: { lat: number; lng: number },
    affectedUserIds: string[]
  ): Promise<number> {
    const distance = this.calculateDistance(
      currentLocation.lat, currentLocation.lng,
      destinationLocation.lat, destinationLocation.lng
    );

    const estimatedArrival = this.estimateArrivalTime(distance);
    const delayMinutes = Math.round((estimatedArrival.getTime() - expectedArrivalTime.getTime()) / (1000 * 60));

    let alertsSent = 0;

    if (delayMinutes > 0) {
      for (const userId of affectedUserIds) {
        const prefs = await this.getPreferences(userId);

        if (prefs.enableDelayAlerts && delayMinutes >= (prefs.delayThresholdMinutes || 15)) {
          const uid = parseInt(userId);
          const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

          // Check for recent delay alert
          const recentAlerts = await db.select()
            .from(notifications)
            .where(
              and(
                eq(notifications.userId, uid),
                eq(notifications.type, 'delay'),
                sql`JSON_EXTRACT(${notifications.data}, '$.scheduleId') = ${scheduleId}`,
                gte(notifications.createdAt, fifteenMinutesAgo)
              )
            )
            .limit(1);

          if (recentAlerts.length === 0) {
            await this.createNotification({
              userId,
              type: 'delay',
              title: 'Bus Delayed',
              body: `Your bus is running approximately ${delayMinutes} minutes late`,
              data: {
                scheduleId,
                delayMinutes,
                arrivalETA: estimatedArrival,
                severity: delayMinutes > 30 ? 'high' : delayMinutes > 15 ? 'medium' : 'low',
              },
            });
            alertsSent++;
          }
        }
      }
    }

    return alertsSent;
  }

  // ============================================================
  // Congestion Monitoring
  // ============================================================

  async checkCongestion(routeId: string): Promise<{ level: string; activeSchedules: number; avgDelay: number } | null> {
    const rid = parseInt(routeId);

    // Get active (live) schedules for this route
    const activeSchedules = await db.select()
      .from(schedules)
      .where(
        and(
          eq(schedules.routeId, rid),
          eq(schedules.isLive, true)
        )
      );

    if (activeSchedules.length < 3) {
      return null; // Not enough data for congestion analysis
    }

    // Calculate average delay
    let totalDelay = 0;
    let delayCount = 0;

    for (const schedule of activeSchedules) {
      if (schedule.lastLocationLat && schedule.departureTime) {
        // Simplified delay calculation
        const expectedTime = new Date(schedule.departureTime).getTime();
        const now = Date.now();
        if (now > expectedTime) {
          totalDelay += (now - expectedTime) / (1000 * 60);
          delayCount++;
        }
      }
    }

    const avgDelay = delayCount > 0 ? totalDelay / delayCount : 0;

    let level = 'low';
    if (avgDelay > 30 || activeSchedules.length > 10) {
      level = 'high';
    } else if (avgDelay > 15 || activeSchedules.length > 5) {
      level = 'medium';
    }

    return {
      level,
      activeSchedules: activeSchedules.length,
      avgDelay: Math.round(avgDelay),
    };
  }

  async sendCongestionWarning(routeId: string, routeName: string, congestionLevel: string): Promise<number> {
    const rid = parseInt(routeId);
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    const now = new Date();

    // Join bookings with schedules to find affected users
    // This replaces the MongoDB $lookup aggregation
    const affectedBookings = await db.select({
      userId: bookings.userId,
    })
      .from(bookings)
      .innerJoin(schedules, eq(bookings.scheduleId, schedules.id))
      .where(
        and(
          eq(schedules.routeId, rid),
          gte(schedules.departureTime, now),
          sql`${schedules.departureTime} <= ${oneHourFromNow}`,
          eq(bookings.status, 'confirmed')
        )
      );

    // Deduplicate user IDs
    const userIds = Array.from(new Set(affectedBookings.map(b => b.userId)));
    let alertsSent = 0;

    for (const uid of userIds) {
      const userId = uid.toString();
      const prefs = await this.getPreferences(userId);

      if (prefs.enableCongestionWarnings) {
        await this.createNotification({
          userId,
          type: 'congestion',
          title: 'High Traffic Alert',
          body: `${routeName} is experiencing ${congestionLevel} congestion. Consider alternative routes.`,
          data: {
            routeId,
            severity: congestionLevel as any,
          },
        });
        alertsSent++;
      }
    }

    return alertsSent;
  }
}
