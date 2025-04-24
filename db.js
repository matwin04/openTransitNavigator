import postgres from "postgres";
import fs from "fs";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import crypto from "crypto";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const sql = postgres(process.env.DATABASE_URL,  { ssl: 'verify-full' });
async function initDB() {
    await sql`
    CREATE TABLE IF NOT EXISTS gtfs_uploads (
        id SERIAL PRIMARY KEY,
        filename TEXT,
        filehash TEXT UNIQUE,
        uploaded_at TIMESTAMP DEFAULT NOW()
    );
    `;

    await sql`
    CREATE TABLE IF NOT EXISTS agencies (
        id SERIAL PRIMARY KEY,
        agency_id TEXT,
        agency_name TEXT,
        agency_url TEXT,
        agency_timezone TEXT,
        gtfs_upload_id INTEGER REFERENCES gtfs_uploads(id)
    );
    `;

    await sql`
    CREATE TABLE IF NOT EXISTS routes (
        id SERIAL PRIMARY KEY,
        route_id TEXT,
        route_short_name TEXT,
        route_long_name TEXT,
        route_type INTEGER,
        gtfs_upload_id INTEGER REFERENCES gtfs_uploads(id)
    );`;

    await sql`
    CREATE TABLE IF NOT EXISTS stops (
        id SERIAL PRIMARY KEY,
        stop_id TEXT,
        stop_name TEXT,
        stop_lat DOUBLE PRECISION,
        stop_lon DOUBLE PRECISION,
        gtfs_upload_id INTEGER REFERENCES gtfs_uploads(id)
    );`;
}

async function handleGtfsUpload(filePath, originalName) {
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const existing = await sql`
        SELECT * FROM gtfs_uploads WHERE filehash = ${fileHash}
    `;
    if (existing.length > 0) {
        return { success: false, message: "Duplicate GTFS upload." };
    }

    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    const agencyEntry = zipEntries.find(entry => entry.entryName === "agency.txt");
    if (!agencyEntry) return { success: false, message: "No agency.txt found in GTFS." };

    const agencyData = parse(agencyEntry.getData().toString(), { columns: true, skip_empty_lines: true });

    const result = await sql`
        INSERT INTO gtfs_uploads (filename, filehash)
        VALUES (${originalName}, ${fileHash})
        RETURNING id
    `;
    const uploadId = result[0].id;

    for (const agency of agencyData) {
        await sql`
            INSERT INTO agencies (agency_id, agency_name, agency_url, agency_timezone, gtfs_upload_id)
            VALUES (${agency.agency_id}, ${agency.agency_name}, ${agency.agency_url}, ${agency.agency_timezone}, ${uploadId})
        `;
    }

    // Repeat for routes.txt, stops.txt, etc.

    return { success: true, uploadId };
}
async function getAgencies() {
    await sql`SELECT * FROM agencies`;
}
export { initDB, handleGtfsUpload };
