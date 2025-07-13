// gtfs.js
import { importGtfs } from 'gtfs';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, "feeds");

const GTFS_SOURCES = [
    { name: "Amtrak", url: "https://content.amtrak.com/content/gtfs/GTFS.zip" },
    { name: "LA Metro", url: "https://gitlab.com/LACMTA/gtfs_rail/raw/master/gtfs_rail.zip" },
    { name: "Metrolink", url: "https://metrolinktrains.com/globalassets/about/gtfs/gtfs.zip" }
];

async function downloadAndExtract({ name, url }) {
    const agencyDir = path.join(OUTPUT_DIR, name.replace(/\s+/g, "_"));

    console.log(`🔽 Downloading ${name} GTFS...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download ${name}: ${res.statusText}`);

    await fs.promises.mkdir(agencyDir, { recursive: true });

    await new Promise((resolve, reject) => {
        res.body
            .pipe(unzipper.Extract({ path: agencyDir }))
            .on("close", () => {
                console.log(`✅ Extracted ${name} to ${agencyDir}`);
                resolve();
            })
            .on("error", reject);
    });

    return agencyDir;
}

export async function updateAndImportGtfs() {
    await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });

    const agencies = [];

    for (const source of GTFS_SOURCES) {
        try {
            const extractedPath = await downloadAndExtract(source);
            agencies.push({
                agency_key: source.name.replace(/\s+/g, "_").toLowerCase(),
                path: extractedPath
            });
        } catch (err) {
            console.error(`❌ Error processing ${source.name}: ${err.message}`);
        }
    }

    const sqlitePath = path.join(__dirname, 'public', 'gtfs.db');
    console.log("🛠️  Importing all GTFS feeds into:", sqlitePath);

    await importGtfs({
        agencies,
        sqlitePath,
        ignoreDuplicates: true,
    });

    console.log("✅ GTFS import complete");
}