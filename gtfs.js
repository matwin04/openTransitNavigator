import { importGtfs } from 'gtfs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read config.json
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Resolve all agency paths
for (const agency of config.agencies) {
    agency.path = path.resolve(__dirname, agency.path);
    if (!fs.existsSync(agency.path)) {
        console.error(`❌ GTFS file not found: ${agency.path}`);
        process.exit(1);
    }
}

// Import feeds using gtfs package
await importGtfs({
    agencies: config.agencies,
    sqlitePath: path.join(__dirname, 'public', 'gtfs.db'),
});

console.log("✅ GTFS import complete");