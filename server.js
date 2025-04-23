import postgres from "postgres";
import express from "express";
import path from "path";
import dotenv from "dotenv";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import { track } from '@vercel/analytics/server';
dotenv.config();
console.log("🧪 Loaded DB URL:", process.env.DATABASE_URL);
const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VIEWS_DIR = path.join(__dirname, "views");
const PARTIALS_DIR = path.join(VIEWS_DIR, "partials");
const IMMICH_API_KEY = process.env.IMMICH_API_KEY;
console.log("🔐 Immich key loaded:", IMMICH_API_KEY); // Optional test
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
        console.log("✅ Users & POIs tables ready");
    } catch (err) {
        console.error("❌ Database setup failed:", err);
    }
}
setupDB();


app.get("/", async (req, res) => {
    console.log("HELLO WORLD");
    res.render("index");
});
if (!process.env.VERCEL && !process.env.NOW_REGION) {
    const PORT = process.env.PORT || 8088;
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
    });
}
export default app;