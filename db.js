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
            );
            CREATE TABLE stops (
                stop_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                code TEXT,
                description TEXT,
                geom GEOMETRY(POINT,4326) NOT NULL,
            );
            `

    } catch (error) {
        console.log(error);
    }
}
export { sql, setupDB };