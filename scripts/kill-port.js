#!/usr/bin/env node
/**
 * Cross-platform script to kill any process using a specific port
 * Usage: node scripts/kill-port.js [port]
 * Default port: 5000
 */

import { exec } from 'child_process';
import { platform } from 'os';

const port = process.argv[2] || process.env.PORT || '5000';
const isWindows = platform() === 'win32';

console.log(`🔍 Checking for processes on port ${port}...`);

if (isWindows) {
  // Windows: Use netstat and taskkill
  exec(`netstat -ano | findstr :${port} | findstr LISTENING`, (err, stdout) => {
    if (err || !stdout.trim()) {
      console.log(`✅ Port ${port} is available`);
      process.exit(0);
    }

    // Extract PID from netstat output (last column)
    const lines = stdout.trim().split('\n');
    const pids = new Set();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        pids.add(pid);
      }
    }

    if (pids.size === 0) {
      console.log(`✅ Port ${port} is available`);
      process.exit(0);
    }

    console.log(`⚠️ Found ${pids.size} process(es) using port ${port}: ${[...pids].join(', ')}`);

    // Kill each PID
    let killed = 0;
    for (const pid of pids) {
      exec(`taskkill /F /PID ${pid}`, (killErr, killStdout) => {
        if (killErr) {
          console.error(`❌ Failed to kill PID ${pid}:`, killErr.message);
        } else {
          console.log(`✅ Killed process ${pid}`);
          killed++;
        }

        if (killed === pids.size || killed + 1 === pids.size) {
          console.log(`🚀 Port ${port} should now be available`);
        }
      });
    }
  });
} else {
  // Unix/Mac: Use lsof and kill
  exec(`lsof -ti:${port}`, (err, stdout) => {
    if (err || !stdout.trim()) {
      console.log(`✅ Port ${port} is available`);
      process.exit(0);
    }

    const pids = stdout.trim().split('\n').filter(Boolean);
    console.log(`⚠️ Found ${pids.length} process(es) using port ${port}: ${pids.join(', ')}`);

    exec(`kill -9 ${pids.join(' ')}`, (killErr) => {
      if (killErr) {
        console.error(`❌ Failed to kill processes:`, killErr.message);
        process.exit(1);
      }
      console.log(`✅ Killed ${pids.length} process(es)`);
      console.log(`🚀 Port ${port} should now be available`);
      process.exit(0);
    });
  });
}
