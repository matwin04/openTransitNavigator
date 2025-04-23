import postgres from "postgres";
import express from "express";
import dotenv from "dotenv";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import { track } from '@vercel/analytics/server';
import multer from "multer";
import { importGtfs } from "gtfs";
import fs from "fs";
import AdmZip from "adm-zip";
import path from "path";
import { parse } from "csv-parse/sync";
import os from "os";



dotenv.config();
console.log("🧪 Loaded DB URL:", process.env.DATABASE_URL);
const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VIEWS_DIR = path.join(__dirname, "views");
const PARTIALS_DIR = path.join(VIEWS_DIR, "partials");
const upload = multer({
    dest: os.tmpdir() // Safe writable temp dir, e.g., /tmp
});
app.engine("html", engine({ extname: ".html", defaultLayout: false, partialsDir: PARTIALS_DIR }));
app.set("view engine", "html");
app.set("views", VIEWS_DIR);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(path.join(__dirname, "public")));
// ✅ Ensure the POIs table exists
// ✅ Ensure the Users & POIs Table Exist
async function setupDB() {
    console.log("Starting DB...");
    try {
        // custom app tables
        await sql`
            CREATE TABLE IF NOT EXISTS gtfs_uploads (
                id SERIAL PRIMARY KEY,
                filename TEXT NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`;
        await sql`
            CREATE TABLE IF NOT EXISTS agency (
                agency_id TEXT PRIMARY KEY,
                gtfs_id INTEGER REFERENCES gtfs_uploads(id),
                agency_name TEXT NOT NULL,
                agency_url TEXT NOT NULL,
                agency_timezone TEXT NOT NULL,
                agency_lang TEXT,
                agency_phone TEXT
                )`;
        await sql`
            CREATE TABLE IF NOT EXISTS agency (
                agency_id SERIAL TEXT PRIMARY KEY,
                agency_name TEXT NOT NULL,
                agency_url TEXT NOT NULL,
                agency_timezone TEXT NOT NULL,
                agency_lang TEXT,
                agency_phone TEXT
            )
        `;
        // GTFS: routes
        await sql`
            CREATE TABLE IF NOT EXISTS routes (
                route_id TEXT,
                gtfs_id INTEGER REFERENCES gtfs_uploads(id),
                agency_id TEXT,
                route_short_name TEXT NOT NULL,
                route_long_name TEXT NOT NULL,
                route_type INTEGER NOT NULL,
                route_color TEXT,
                route_text_color TEXT,
                PRIMARY KEY (route_id, gtfs_id)
            )`;

        // GTFS: stops
        await sql`
            CREATE TABLE IF NOT EXISTS stops (
                stop_id TEXT,
                gtfs_id INTEGER REFERENCES gtfs_uploads(id),
                stop_name TEXT NOT NULL,
                stop_lat DOUBLE PRECISION NOT NULL,
                stop_lon DOUBLE PRECISION NOT NULL,
                location_type INTEGER,
                parent_station TEXT,
                PRIMARY KEY (stop_id, gtfs_id)
            )`;

        // GTFS: trips
        await sql`
            CREATE TABLE IF NOT EXISTS trips (
                trip_id TEXT,
                gtfs_id INTEGER REFERENCES gtfs_uploads(id),
                route_id TEXT,
                service_id TEXT,
                trip_headsign TEXT,
                direction_id INTEGER,
                shape_id TEXT,
                PRIMARY KEY (trip_id, gtfs_id)
            )`;

        // GTFS: stop_times
        await sql`
            CREATE TABLE IF NOT EXISTS stop_times (
                trip_id TEXT,
                gtfs_id INTEGER REFERENCES gtfs_uploads(id),
                arrival_time TEXT,
                departure_time TEXT,
                stop_id TEXT,
                stop_sequence INTEGER,
                PRIMARY KEY (trip_id, stop_sequence, gtfs_id)
            )`;

        // GTFS: calendar
        await sql`
            CREATE TABLE IF NOT EXISTS calendar (
                service_id TEXT,
                gtfs_id INTEGER REFERENCES gtfs_uploads(id),
                monday INTEGER,
                tuesday INTEGER,
                wednesday INTEGER,
                thursday INTEGER,
                friday INTEGER,
                saturday INTEGER,
                sunday INTEGER,
                start_date TEXT,
                end_date TEXT,
                PRIMARY KEY (service_id, gtfs_id)
            )`;

        // GTFS: calendar_dates
        await sql`
            CREATE TABLE IF NOT EXISTS calendar_dates (
                service_id TEXT,
                gtfs_id INTEGER REFERENCES gtfs_uploads(id),
                date TEXT,
                exception_type INTEGER,
                PRIMARY KEY (service_id, date, gtfs_id)
            )`;

        // GTFS: shapes
        await sql`
            CREATE TABLE IF NOT EXISTS shapes (
                shape_id TEXT,
                gtfs_id INTEGER REFERENCES gtfs_uploads(id),
                shape_pt_lat DOUBLE PRECISION,
                shape_pt_lon DOUBLE PRECISION,
                shape_pt_sequence INTEGER,
                shape_dist_traveled DOUBLE PRECISION,
                PRIMARY KEY (shape_id, shape_pt_sequence, gtfs_id)
            )`;

        // GTFS: fare_attributes
        await sql`
            CREATE TABLE IF NOT EXISTS fare_attributes (
                fare_id TEXT,
                gtfs_id INTEGER REFERENCES gtfs_uploads(id),
                price TEXT,
                currency_type TEXT,
                payment_method INTEGER,
                transfers INTEGER,
                transfer_duration INTEGER,
                PRIMARY KEY (fare_id, gtfs_id)
            )`;

        // GTFS: fare_rules
        await sql`
            CREATE TABLE IF NOT EXISTS fare_rules (
                fare_id TEXT,
                gtfs_id INTEGER REFERENCES gtfs_uploads(id),
                route_id TEXT,
                origin_id TEXT,
                destination_id TEXT,
                contains_id TEXT,
                PRIMARY KEY (fare_id, route_id, gtfs_id)
            )`;

        // GTFS: feed_info
        await sql`
            CREATE TABLE IF NOT EXISTS feed_info (
                feed_publisher_name TEXT,
                gtfs_id INTEGER REFERENCES gtfs_uploads(id),
                feed_publisher_url TEXT,
                feed_lang TEXT,
                feed_start_date TEXT,
                feed_end_date TEXT,
                feed_version TEXT,
                PRIMARY KEY (feed_publisher_name, feed_version, gtfs_id)
            )`;

    } catch (err) {
        console.error("❌ Database setup failed:", err);
    }
}
setupDB();


app.get("/", async (req, res) => {
    console.log("HELLO WORLD");
    res.render("index");
});
app.get("/admin", async (req, res) => {
    console.log("/admin");
    res.render("admin");
});
app.post("/upload-gtfs", upload.single("gtfsFile"), async (req, res) => {
    if (!req.file) return res.status(400).send("No GTFS file uploaded.");

    const zipPath = req.file.path;
    const originalName = req.file.originalname;

    try {
        // Step 1: Log upload and get gtfs_id
        const uploadResult = await sql`
            INSERT INTO gtfs_uploads (filename)
            VALUES (${originalName})
            RETURNING id
        `;
        const gtfs_id = uploadResult[0].id;
        // Step 2: Extract and parse zip
        const zip = new AdmZip(req.file.path);
        const zipEntries = zip.getEntries();
        for (const entry of zipEntries) {
            const name = entry.entryName;
            const content = entry.getData().toString("utf-8");
            if (name === "agency.txt") {
                const records = parse(content, { columns: true, skip_empty_lines: true });
                for (const row of records) {
                    await sql`
                        INSERT INTO agency (
                            agency_id, gtfs_id, agency_name, agency_url, agency_timezone,
                            agency_lang, agency_phone
                        ) VALUES (
                            ${row.agency_id},
                            ${gtfs_id},
                            ${row.agency_name},
                            ${row.agency_url},
                            ${row.agency_timezone},
                            ${row.agency_lang || null},
                            ${row.agency_phone || null}
                        ) ON CONFLICT (agency_id) DO NOTHING;
                    `;
                }
            }
            if (name === "routes.txt") {
                const records = parse(content, { columns: true, skip_empty_lines: true });
                for (const row of records) {
                    await sql`
                        INSERT INTO routes (
                            route_id, agency_id, route_short_name,
                            route_long_name, route_type,
                            route_color, route_text_color
                        ) VALUES (
                            ${row.route_id},
                            ${row.agency_id || "default"},
                            ${row.route_short_name},
                            ${row.route_long_name},
                            ${parseInt(row.route_type)},
                            ${row.route_color || null},
                            ${row.route_text_color || null}
                        ) ON CONFLICT (route_id) DO NOTHING;
                    `;
                }
            }

            if (name === "stops.txt") {
                const records = parse(content, { columns: true, skip_empty_lines: true });
                for (const row of records) {
                    await sql`
                        INSERT INTO stops (
                            stop_id, stop_name, stop_lat, stop_lon,
                            location_type, parent_station
                        ) VALUES (
                            ${row.stop_id},
                            ${row.stop_name},
                            ${parseFloat(row.stop_lat)},
                            ${parseFloat(row.stop_lon)},
                            ${row.location_type ? parseInt(row.location_type) : null},
                            ${row.parent_station || null}
                        ) ON CONFLICT (stop_id) DO NOTHING;
                    `;
                }
            }

            // Add similar logic for routes.txt, stops.txt, etc., using gtfs_id
        }

        fs.unlinkSync(zipPath);
        res.redirect("/admin");
        console.log("Processed and deleted:", req.file.path);
    } catch (error) {
        console.error("❌ GTFS import failed:", error.message);
        res.status(500).send("GTFS IMPORT FAILED: " + error.message);
    }
});

if (!process.env.VERCEL && !process.env.NOW_REGION) {
    const PORT = process.env.PORT || 8088;
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
    });
}
export default app;