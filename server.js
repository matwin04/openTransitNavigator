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
import { parse } from "path";
import { format } from "date-fns";
import { updateAndImportGtfs } from './gtfs.js';

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
function getPacificTimeString() {
    const now = new Date();
    const pacificTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(now);
    return pacificTime; // "14:23:00"
}
function formatTo12Hour(timeStr) {
    const [hour, minute] = timeStr.split(":").map(Number);
    const date = new Date(2000, 0, 1, hour, minute);
    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Los_Angeles"
    });
}
app.get("/", async (req, res) => {
    const db = await getDB();
    const stops = await db.all("SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops");
    res.render("index", { title: "Open Transit Navigator", stops });
});
app.get("/data", async (req, res) => {
    res.render("data");
})
app.get("/routes", async (req, res) => {
    const db = await getDB();
    const routes = await db.all("SELECT * FROM routes");
    res.render("routes", { routes });
});

app.get("/map", (req, res) => {
    res.render("map", { title: "Open Transit Navigator" });
});
app.get("/routes", async (req, res) => {
    const db = await getDB();
    const routes = await db.all("SELECT * FROM routes");
    res.render("routes", { routes });
});
app.get("/about", (req, res) => {
    res.render("about");
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
        const stations = await db.all(`
      SELECT *
      FROM stops
      WHERE location_type = 1
    `);
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
        const now = getPacificTimeString();
        const radiusMeters = 200;
        const earthRadiusKm = 6371;

        // Get center stop (only once)
        const stop = await db.get(
            "SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops WHERE stop_id = ?",
            stopId
        );
        if (!stop) {
            return res.status(404).send("Stop not found");
        }

        // Single query: nearby departures using inline distance
        const departures = await db.all(
            `
      SELECT 
        st.departure_time,
        t.trip_headsign,
        r.route_short_name,
        r.route_long_name,
        r.route_color,
        r.route_text_color
      FROM stops s
      JOIN stop_times st ON s.stop_id = st.stop_id
      JOIN trips t ON st.trip_id = t.trip_id
      JOIN routes r ON t.route_id = r.route_id
      WHERE s.stop_lat IS NOT NULL AND s.stop_lon IS NOT NULL
        AND (
          ${earthRadiusKm} * 2 * 
          ASIN(SQRT(
            POWER(SIN(RADIANS((s.stop_lat - ?) / 2)), 2) +
            COS(RADIANS(?)) * COS(RADIANS(s.stop_lat)) *
            POWER(SIN(RADIANS((s.stop_lon - ?) / 2)), 2)
          )) * 1000
        ) <= ?
        AND TIME(st.departure_time) > TIME(?)
      ORDER BY st.departure_time ASC
      LIMIT 15
      `,
            [stop.stop_lat, stop.stop_lat, stop.stop_lon, radiusMeters, now]
        );

        res.render("departures", {
            title: "Departures",
            departures,
            stop,
            stop_id: stopId
        });
    } catch (err) {
        console.error("Error loading departures:", err);
        res.status(500).send("Failed to load departures.");
    }
});
app.get("/geojson/stations.geojson", async (req, res) => {
    const db = await getDB();
    const stations = await db.all(`
    SELECT stop_id, stop_name, stop_lat, stop_lon
    FROM stops
    WHERE stop_lat IS NOT NULL
      AND stop_lon IS NOT NULL
      AND location_type = 1
    `);
    const geojson = {
        type: "FeatureCollection",
        features: stations.map(stop => ({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [parseFloat(stop.stop_lon), parseFloat(stop.stop_lat)]
            },
            properties: {
                stop_id: stop.stop_id,
                stop_name: stop.stop_name
            }
        }))
    };
    res.json(geojson);
});
app.get("/geojson/shapes.geojson", async (req, res) => {
    try {
        const db = await getDB();
        const rows = await db.all(`
            SELECT shape_id, shape_pt_lat, shape_pt_lon, shape_pt_sequence
            FROM shapes
            ORDER BY shape_id, shape_pt_sequence
        `);

        // Group by shape_id
        const shapes = {};
        for (const row of rows) {
            if (!shapes[row.shape_id]) {
                shapes[row.shape_id] = [];
            }
            shapes[row.shape_id].push([row.shape_pt_lon, row.shape_pt_lat]);
        }

        const geojson = {
            type: "FeatureCollection",
            features: Object.entries(shapes).map(([shape_id, coordinates]) => ({
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates
                },
                properties: { shape_id }
            }))
        };

        res.json(geojson);
    } catch (err) {
        console.error("Error generating shape GeoJSON:", err);
        res.status(500).send("Failed to generate shape GeoJSON");
    }
});
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});