import postgres from "postgres";
import express from "express";
import dotenv from "dotenv";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import { track } from '@vercel/analytics/server';
import multer from "multer";
import {getAgencies, importGtfs} from "gtfs";
import fs from "fs";
import AdmZip from "adm-zip";
import path from "path";
import { parse } from "csv-parse/sync";
import os from "os";
import { initDB, handleGtfsUpload } from "./db.js";
await initDB();


dotenv.config();
const sql = postgres(process.env.DATABASE_URL,  { ssl: 'verify-full' });
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

app.get("/", async (req, res) => {
    console.log("HELLO WORLD");
    res.render("index");
});
app.get("/agencies", async (req, res) => {
    try {
        const agencies = await sql`SELECT * FROM agencies ORDER BY id DESC LIMIT 50`;
        res.render("agencies", {agencies});
    } catch (error) {
        console.log(error);
        res.render("error");
    }
})
app.get("/admin", async (req, res) => {
    try {
        const agencies = await sql`SELECT * FROM agencies ORDER BY id DESC LIMIT 50`;
        const uploads = await sql`SELECT * FROM gtfs_uploads ORDER BY uploaded_at DESC LIMIT 10`;
        res.render("admin", { agencies, uploads });
    } catch (err) {
        console.error("Error loading admin page:", err);
        res.status(500).send("Internal Server Error: " + err.message);
    }
});
app.post("/admin/upload", upload.single("gtfsZip"), async (req, res) => {
    const result = await handleGtfsUpload(req.file.path, req.file.originalname);
    res.render("admin", { message: result.message || "Upload complete", success: result.success });
});
if (!process.env.VERCEL && !process.env.NOW_REGION) {
    const PORT = process.env.PORT || 8088;
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
    });
}
export default app;