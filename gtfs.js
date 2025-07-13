import { importGtfs } from 'gtfs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read config.json
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Use config directly — don't resolve paths or check file existence
// Because `url` entries will be downloaded by gtfs package automatically

export async function updateAndImportGtfs() {
    await importGtfs({
        agencies: config.agencies,
        sqlitePath: path.join(__dirname, 'public', 'gtfs.db'),
    });

    console.log("✅ GTFS import complete");
}