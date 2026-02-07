import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Load environment variables FIRST before any other imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In production (dist/index.js), this file is bundled.
// We look for .env in the root (one level up from server/ or dist/)
const envPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(envPath)) {
    console.log(`[Env] Loading variables from: ${envPath}`);
    dotenv.config({ path: envPath });
} else {
    console.warn(`[Env] Warning: .env file not found at ${envPath}`);
    // Still try to load default dotenv in case they are set in the environment shell
    dotenv.config();
}

// Set defaults
process.env.NODE_ENV = process.env.NODE_ENV || "development";
process.env.PORT = process.env.PORT || "5000";

// Log SMTP config status (for debugging email issues)
console.log(`[Env] SMTP_HOST: ${process.env.SMTP_HOST || 'NOT SET'}`);
console.log(`[Env] SMTP_USER: ${process.env.SMTP_USER || 'NOT SET'}`);
console.log(`[Env] SMTP_PASS: ${process.env.SMTP_PASS ? `SET (${process.env.SMTP_PASS.length} chars)` : 'NOT SET'}`);

// Validate App Password format for Gmail
if (process.env.SMTP_HOST === 'smtp.gmail.com' && process.env.SMTP_PASS) {
    const pass = process.env.SMTP_PASS.replace(/\s/g, ''); // Remove any spaces
    if (pass.length !== 16) {
        console.warn(`[Env] WARNING: Gmail App Password should be 16 characters, got ${pass.length}`);
    }
    // Update the password without spaces
    process.env.SMTP_PASS = pass;
}
