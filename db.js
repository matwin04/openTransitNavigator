import postgres from "postgres";
import dotenv from "dotenv";
dotenv.config();
const connectionString = process.env.POSTGRES_URL;
console.log(connectionString)
const sql = postgres(connectionString);
async function setupDB() {
    console.log("DB Connected");
    console.log("Database Connected");
    try {
        /*await sql`
            CREATE TABLE IF NOT EXISTS agency (
                agency_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                url TEXT,
                timezone TEXT,
                lang TEXT,
                phone TEXT
            )`;*/
            console.log("created table AGENCY");
        await sql`
            CREATE TABLE IF NOT EXISTS stops (
                stop_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                code TEXT,
                description TEXT,
                geom GEOMETRY(POINT,4326) NOT NULL
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
                shaped_id    TEXT
            )`;
        console.log("created table trips");

    } catch (error) {
        console.log(error);
    }
}
export { sql, setupDB };