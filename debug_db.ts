import 'dotenv/config';
import { db, pool } from './server/db';
import { users, schedules } from './shared/schema';
import { eq } from 'drizzle-orm';

async function debug() {
  console.log('--- DRIVERS ---');
  const drivers = await db.select().from(users).where(eq(users.role, 'driver'));
  drivers.forEach(u => console.log(JSON.stringify(u, null, 2)));

  console.log('\n--- SCHEDULES ---');
  const allSchedules = await db.select().from(schedules);
  allSchedules.forEach(s => console.log(JSON.stringify(s, null, 2)));

  await pool.end();
}

debug();
