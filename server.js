/**
 * Root entry point for Hostinger Node.js Selector
 */
console.log("Starting server.js...");
// process.chdir is moved inside start() as __dirname is not available in global ESM scope

async function start() {
    try {
        const path = await import('path');
        const { fileURLToPath, pathToFileURL } = await import('url');
        const fs = await import('fs');

        // Ensure NODE_ENV is set for production if not already
        if (!process.env.NODE_ENV) {
            process.env.NODE_ENV = 'production';
        }

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        process.chdir(__dirname); // Ensure we are in the right directory

        const bundlePath = path.resolve(__dirname, 'dist', 'index.js');

        // Check if bundle exists
        if (!fs.existsSync(bundlePath)) {
            throw new Error(`Bundle not found at ${bundlePath}. Run 'npm run build' first.`);
        }

        console.log(`[${new Date().toISOString()}] Bridge Starting...`);
        console.log(`Node Version: ${process.version}`);
        console.log(`Directory: ${__dirname}`);
        console.log(`Attempting to import: ${bundlePath}`);

        // Using dynamic import with proper URL conversion
        // This handles Windows (C:\...) and Linux (/) correctly
        await import(pathToFileURL(bundlePath).href);

        console.log("Main bundle imported successfully.");
    } catch (err) {
        const errorMsg = `[${new Date().toISOString()}] FATAL ERROR during startup:\nNode Version: ${process.version}\n${err.stack || err}\n`;
        console.error(errorMsg);

        try {
            const fs = await import('fs');
            fs.appendFileSync('startup-error.log', errorMsg);
            console.log("Error details written to startup-error.log");
        } catch (e) {
            console.error("Could not write to startup-error.log:", e);
        }
        process.exit(1);
    }
}

start().catch(err => {
    console.error("Unhandled promise rejection during bridge startup:", err);
    process.exit(1);
});
