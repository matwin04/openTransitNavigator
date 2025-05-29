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
            CREATE TABLE IF NOT EXISTS cameras (
                id SERIAL PRIMARY KEY,
                make TEXT NOT NULL,
                model TEXT NOT NULL,
                type TEXT,
                year TEXT,
                format TEXT
            )`;
    } catch (error) {
        console.log(error);
    }
}
export { sql, setupDB };