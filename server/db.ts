// server/db.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in your .env file");
}

// Create MySQL connection pool
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Create Drizzle ORM instance
export const db = drizzle(pool, { schema, mode: "default" });

// Export pool for direct access if needed
export { pool };

/**
 * Test MySQL connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log("✅ Connected to MySQL database");
    return true;
  } catch (error: any) {
    console.error("\n❌ MySQL Connection Failed!");
    console.error("Error:", error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error("\n🔍 Cause: Connection refused");
      console.error("Check that your MySQL server is running and DATABASE_URL is correct.");
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error("\n🔍 Cause: Authentication failed");
      console.error("Check your DATABASE_URL username and password.");
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error("\n🔍 Cause: Database not found");
      console.error("Create the database on your MySQL server first.");
    } else if (error.code === 'ETIMEDOUT') {
      console.error("\n🔍 Cause: Connection timed out");
      console.error("Check your network connectivity and firewall rules.");
    }

    console.error("\n📋 Fix steps:");
    console.error("1. Verify DATABASE_URL in your .env file");
    console.error("2. Ensure MySQL server is running");
    console.error("3. Run 'npx drizzle-kit push' to create tables\n");

    return false;
  }
}

/**
 * Close the MySQL connection pool
 */
export async function closeDb() {
  await pool.end();
  console.log("✅ MySQL connection pool closed");
}
