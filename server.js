import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import dotenv from "dotenv";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import db from "gtfs-utils/route-types.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const VIEWS_DIR = path.join(__dirname, "views");
const PUBLIC_DIR = path.join(__dirname, "public");
const DB_PATH = path.join(PUBLIC_DIR, "gtfs.db");
const upload = multer();
const PORT = process.env.PORT || 3003;
const DB_OPTIONS = {
    filename: DB_PATH,
    driver: sqlite3.Database
};

const getDB = async () => await open(DB_OPTIONS);
app.engine("html", engine({ extname: ".html", defaultLayout: false }));
app.set("view engine", "html");
app.set("views", VIEWS_DIR);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(PUBLIC_DIR));

app.get("/", (req, res) => {
    res.render("index", { title: "Open Transit Navigator" });
});

app.get("/map", (req, res) => {
    res.render("map", { title: "Open Transit Navigator" });
});

app.get("/agencies", async (req, res) => {
    try {
        const db = await getDB();
        const agencies = await db.all("SELECT * FROM agency");
        res.render("agencies", {
            title: "Agencies - Open Transit Navigator",
            agencies
        });
    } catch (err) {
        console.error("Error loading agencies:", err);
        res.status(500).send("Failed to load agency data.");
    }
});
app.get("/stations", async (req, res) => {
    try {
        const db = await getDB();
        const stations = await db.all("SELECT * FROM stops");
        res.render("stations", {
            title: "Stations - Open Transit Navigator",
            stations
        });
    } catch (err) {
        console.error("Error loading stations:", err);
        res.status(500).send("Failed to load stations.");
    }
});
app.get("/stations/departures/:id", async (req, res) => {
    try {
        const db = await getDB();
        const stopId = req.params.id;

        const station = await db.get("SELECT * FROM stops WHERE stop_id = ?", stopId);
        if (!station) {
            return res.status(404).send("Station not found");
        }

        const departures = await db.all(
            `SELECT st.trip_id, st.departure_time, t.trip_headsign, r.route_short_name, r.route_color, r.route_text_color
             FROM stop_times st
             JOIN trips t ON st.trip_id = t.trip_id
             JOIN routes r ON t.route_id = r.route_id
             WHERE st.stop_id = ?
             ORDER BY st.departure_time`, stopId
        );

        res.render("departures", {
            title: `Departures - ${station.stop_name}`,
            stop: station,
            departures
        });
    } catch (err) {
        console.error("Error loading departures:", err);
        res.status(500).send("Failed to load departures.");
    }
});
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});