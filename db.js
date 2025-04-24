import postgres from "postgres";
import fs from "fs";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import crypto from "crypto";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'verify-full' });

async function initDB() {
    await sql`
        CREATE TABLE IF NOT EXISTS gtfs_uploads (
            id SERIAL PRIMARY KEY,
            filename TEXT,
            filehash TEXT UNIQUE,
            uploaded_at TIMESTAMP DEFAULT NOW()
        );`;

    await sql`
        CREATE TABLE IF NOT EXISTS agencies (
            id SERIAL PRIMARY KEY,
            agency_id TEXT,
            agency_name TEXT,
            agency_url TEXT,
            agency_timezone TEXT,
            gtfs_upload_id INTEGER REFERENCES gtfs_uploads(id)
        );`;

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
        SELECT * FROM gtfs_uploads WHERE filename = ${originalName}
    `;

    let uploadId;
    if (existing.length > 0) {
        uploadId = existing[0].id;
        await sql`
            UPDATE gtfs_uploads SET uploaded_at = NOW() WHERE id = ${uploadId}
        `;
    } else {
        const result = await sql`
            INSERT INTO gtfs_uploads (filename, filehash)
            VALUES (${originalName}, ${fileHash})
            RETURNING id
        `;
        uploadId = result[0].id;
    }

    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();

    const parseAndInsert = async (entryName, parseFunc) => {
        const entry = zipEntries.find(e => e.entryName === entryName);
        if (entry) {
            const data = parse(entry.getData().toString(), { columns: true, skip_empty_lines: true });
            await parseFunc(data, uploadId);
        }
    };

    await parseAndInsert("agency.txt", async (data, uploadId) => {
        for (const row of data) {
            await sql`
                INSERT INTO agencies (agency_id, agency_name, agency_url, agency_timezone, gtfs_upload_id)
                VALUES (${row.agency_id}, ${row.agency_name}, ${row.agency_url}, ${row.agency_timezone}, ${uploadId})
            `;
        }
    });

    await parseAndInsert("routes.txt", async (data, uploadId) => {
        for (const row of data) {
            await sql`
                INSERT INTO routes (route_id, route_short_name, route_long_name, route_type, gtfs_upload_id)
                VALUES (${row.route_id}, ${row.route_short_name}, ${row.route_long_name}, ${row.route_type}, ${uploadId})
            `;
        }
    });

    await parseAndInsert("stops.txt", async (data, uploadId) => {
        for (const row of data) {
            await sql`
                INSERT INTO stops (stop_id, stop_name, stop_lat, stop_lon, gtfs_upload_id)
                VALUES (${row.stop_id}, ${row.stop_name}, ${row.stop_lat}, ${row.stop_lon}, ${uploadId})
            `;
        }
    });

    return { success: true, uploadId };
}


export { initDB, handleGtfsUpload };