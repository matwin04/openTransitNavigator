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
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`;
        // GTFS Tables
        await sql`
            CREATE TABLE IF NOT EXISTS gtfs_uploads (
                id SERIAL PRIMARY KEY,
                filename TEXT NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
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
        // Read the zip from the temp location
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();

        for (const entry of zipEntries) {
            const name = entry.entryName;
            const content = entry.getData().toString("utf-8");

            if (name === "agency.txt") {
                const records = parse(content, { columns: true, skip_empty_lines: true });
                for (const row of records) {
                    await sql`
                        INSERT INTO agency (
                            agency_id, agency_name, agency_url, agency_timezone,
                            agency_lang, agency_phone
                        ) VALUES (
                            ${row.agency_id || "default"},
                            ${row.agency_name},
                            ${row.agency_url},
                            ${row.agency_timezone},
                            ${row.agency_lang || null},
                            ${row.agency_phone || null}
                        ) ON CONFLICT (agency_id) DO NOTHING;
                    `;
                }
            }

            // Add logic for routes.txt, stops.txt, etc.
        }
        await sql`
            INSERT INTO gtfs_uploads(filename)
            VALUES (${originalName})
        `;
        fs.unlinkSync(zipPath);
        res.redirect("/admin");
        console.log(req.file.path);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("GTFS IMPORT FAILED");
    }
});

if (!process.env.VERCEL && !process.env.NOW_REGION) {
    const PORT = process.env.PORT || 8088;
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
    });
}
export default app;