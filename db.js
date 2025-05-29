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
        await sql`
            CREATE TABLE agency (
                agency_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                url TEXT,
                timezone TEXT,
                lang TEXT,
                phone TEXT
            )`;
        await sql`
            CREATE TABLE stops (
                stop_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                code TEXT,
                description TEXT,
                geom GEOMETRY(POINT,4326) NOT NULL
            )`;
        await sql`
            CREATE TABLE routes (
                route_id    TEXT PRIMARY KEY,
                agency_id   TEXT NOT NULL,
                short_name  TEXT NOT NULL,
                long_name   TEXT NOT NULL,
                description TEXT,
                type        INTEGER,
                color       TEXT,
                text_color  TEXT
            )`;

    } catch (error) {
        console.log(error);
    }
}
export { sql, setupDB };