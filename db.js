import postgres from "postgres";
import dotenv from "dotenv";
dotenv.config();

const sql = postgres(process.env.DATABASE_URL,  { ssl: 'verify-full' });
async function setupDB() {
    console.log("DB Connected");
    console.log("Database Connected");
    try {
        await sql`CREATE EXTENSION IF NOT EXISTS postgis`;
        console.log("PostGIS extension enabled");
        await sql`
            CREATE TABLE IF NOT EXISTS agency (
                agency_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                url TEXT,
                timezone TEXT,
                lang TEXT,
                phone TEXT
            )`;
            console.log("created table AGENCY");
        await sql`
            CREATE TABLE IF NOT EXISTS stops (
                stop_id TEXT PRIMARY KEY,
                stop_code TEXT,
                stop_name TEXT NOT NULL,
                stop_desc TEXT,
                stop_url TEXT,
                location_type INTEGER DEFAULT 0,     -- 0 = stop/platform, 1 = station
                parent_station TEXT,                 -- References stop_id of parent station
                tpis_name TEXT,                      -- Optional: platform ID or TPIS reference
                geom GEOMETRY(POINT, 4326) NOT NULL  -- Created from stop_lat + stop_lon
            )`;

            console.log("created table stops");
        await sql`
            CREATE TABLE IF NOT EXISTS routes (
                route_id    TEXT PRIMARY KEY,
                agency_id   TEXT NOT NULL,
                short_name  TEXT NOT NULL,
                long_name   TEXT NOT NULL,
                description TEXT,
                type        INTEGER,
                color       TEXT,
                text_color  TEXT
            )`;
            console.log("created table routes");
        await sql`
            CREATE TABLE IF NOT EXISTS trips
            (
                trip_id      TEXT PRIMARY KEY,
                route_id     TEXT REFERENCES routes (route_id),
                service_id   TEXT,
                headsign     TEXT,
                direction_id INTEGER,
                shape_id    TEXT
            )`;
        console.log("created table trips");
        await sql`
            CREATE TABLE IF NOT EXISTS stop_times (
              trip_id TEXT,
              arrival_time TEXT,
              departure_time TEXT,
              stop_id TEXT,
              stop_sequence INTEGER,
              PRIMARY KEY (trip_id, stop_sequence)
                )`;
        console.log("✅ Created table: stop_times");

        await sql`
            CREATE TABLE IF NOT EXISTS calendar (
                service_id TEXT PRIMARY KEY,
                monday BOOLEAN,
                tuesday BOOLEAN,
                wednesday BOOLEAN,
                thursday BOOLEAN,
                friday BOOLEAN,
                saturday BOOLEAN,
                sunday BOOLEAN,
                start_date TEXT,
                end_date TEXT
            )`;
        console.log("✅ Created table: calendar");

        await sql`
            CREATE TABLE IF NOT EXISTS shapes (
                shape_id TEXT,
                pt_sequence INTEGER,
                geom GEOMETRY(POINT, 4326),
                PRIMARY KEY (shape_id, pt_sequence)
            )`;

    } catch (error) {
        console.log(error);
    }
}
export { sql, setupDB };