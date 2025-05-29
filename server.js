import express from "express";
import path from "path";
import { parse } from "csv-parse/sync";
import fs from "fs";
import multer from "multer";
import dotenv from "dotenv";
import { engine } from "express-handlebars";
import session from 'express-session';
import { fileURLToPath } from "url";
import { sql, setupDB } from "./db.js";
import { importAllGTFS } from "./import.js";
import {routes} from "gtfs/models";
//import bcrypt from "bcrypt";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const VIEWS_DIR = path.join(__dirname, "views");
const PARTIALS_DIR = path.join(VIEWS_DIR, "partials");
const PUBLIC_DIR = path.join(__dirname, "public");
const upload = multer();
const PORT = process.env.PORT || 3003;

// Template engine
app.engine("html", engine({ extname: ".html", defaultLayout: false, partialsDir: PARTIALS_DIR }));
app.set("view engine", "html");
app.set("views", VIEWS_DIR);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(PUBLIC_DIR));
app.use(
    session({
        secret: process.env.SESSION_SECRET || "thing-secret",
        resave: false,
        saveUninitialized: true,
    })
);
// DB Function
setupDB();
// Routes
app.get("/", (req, res) => {
    res.render("index", { title: "Thing Token" });
});

app.get("/agencies", async (req, res) => {
    const agencies = await sql`SELECT * FROM agency`;
    res.render("agencies", { title: "Cameras", agencies });
});
app.get("/routes", async (req, res) => {
    const routes = await sql`SELECT * FROM routes`;
    res.render("routes", {title:"Routes",routes});
});
app.get("/stops", async (req, res) => {
    const stops = await sql`SELECT *,ST_X(geom) AS lon,ST_Y(geom) AS lat FROM stops`;
    console.log(stops);
    res.render("stops", {title:"Stops",stops});
});
app.post("/stops/upload", upload.single("csv"), async (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded");

    try {
        const fileContent = req.file.buffer.toString("utf-8");
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        for (const row of records) {
            const {
                stop_id, stop_code, stop_name, stop_desc, stop_lat,
                stop_lon, stop_url, location_type, parent_station, tpis_name
            } = row;

            if (!stop_id || !stop_name || !stop_lat || !stop_lon) continue;

            await sql`
                INSERT INTO stops (
                    stop_id, stop_code, stop_name, stop_desc, stop_url,
                    location_type, parent_station, tpis_name, geom
                )
                VALUES (
                    ${stop_id}, ${stop_code}, ${stop_name}, ${stop_desc}, ${stop_url || null},
                    ${location_type || 0}, ${parent_station || null}, ${tpis_name || null},
                    ST_SetSRID(ST_MakePoint(${parseFloat(stop_lon)}, ${parseFloat(stop_lat)}), 4326)
                )
                ON CONFLICT (stop_id) DO NOTHING;
            `;
        }

        res.send("✅ stops.txt uploaded successfully!");
    } catch (err) {
        console.error("❌ Error processing stops.txt:", err);
        res.status(500).send("Error processing file.");
    }
});
app.get("/import/gtfs", async (req, res) => {
    try {
        const logs = await importAllGTFS();
        res.send(`<h1>GTFS Import Complete</h1><div>${logs.join("<br><br>")}</div>`);
    } catch (err) {
        res.status(500).send("❌ Import failed: " + err.message);
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
