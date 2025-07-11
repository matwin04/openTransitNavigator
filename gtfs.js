// gtfs.js
import { importGtfs, openDb } from 'gtfs';
import path from 'path';
import { fileURLToPath } from 'url';

// Set __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Open SQLite database
const db = openDb({
    sqlitePath: path.join(__dirname, 'public', 'gtfs.db'),
});

// Run GTFS import with inline config
try {
    await importGtfs({
        agencies: [
            {
                agency_key: 'bart',
                url: 'http://www.bart.gov/dev/schedules/google_transit.zip',
            }
        ],
        db: db
    });

    console.log("✅ GTFS import complete (BART)");
} catch (err) {
    console.error("❌ GTFS import failed:", err.message);
}