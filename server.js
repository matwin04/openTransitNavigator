import express from "express";
import path from "path";
import dotenv from "dotenv";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import * as bikes from "./bikes.js";
import fetch from "node-fetch";
import swaggerUi from "swagger-ui-express";
import fs from "node:fs/promises";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import {feedToVehicleGeoJSON} from "./converter.js";
dotenv.config();

const app = express();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIEWS_DIR = path.join(__dirname, "views");
const PARTIALS_DIR = path.join(VIEWS_DIR, "partials");
const openapi = JSON.parse(
    await fs.readFile(new URL("./apispec/openapi.json", import.meta.url), "utf8")
);
const agencies = JSON.parse(
    await fs.readFile(new URL("./agencies.json", import.meta.url), "utf8")
);

app.engine("html", engine({ extname: ".html", defaultLayout: false, partialsDir: PARTIALS_DIR }));
app.set("view engine", "html");
app.set("views", VIEWS_DIR);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.get("/", async (req, res) => {
    res.render("index");
});
app.get("/api/bikes/stations", async (req, res) => {
    const data = await bikes.getAllStations();
    res.json(data);
});
app.get("/api/bikes/stations/:stationId", async (req, res) => {
    res.json("test");
});
app.get("/api/trips/test",async (req, res) => {
    const response = await fetch("https://metrolink-gtfsrt.gbsdigital.us/feed/gtfsrt-trips", {
        "headers": {
            "x-api-key": "gMpUXrGPJJ8X9Pp2OivQC1czi046utCMabRM3XQg",
        }
    });
    console.log(response);
    const buff = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buff));
    const obj = GtfsRealtimeBindings.transit_realtime.FeedMessage.toObject(feed);
    res.json(obj);
});
app.get("/api/vehicles/:agencyId.geojson", async (req, res) => {
    const agencyId = req.params.agencyId;
    const agency = agencies[agencyId];
    
    if (!agency?.vehicle_url) {
        return res.status(404).json({ error: `Unknown agencyId: ${agencyId}` });
    }
    
    const headers = {};
    if (agency.api_key) headers["x-api-key"] = agency.api_key;
    const response = await fetch(agency.vehicle_url, { headers });
    console.log(agency.vehicle_url);
    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
    
    const geojson = feedToVehicleGeoJSON(feed);
    
    // tag each feature with agencyId (so your popups/layers can filter)
    for (const f of geojson.features) f.properties.agencyId = agencyId;
    
    res.json(geojson);
});
app.get("/api/vehicles/:agencyId", async (req, res) => {
    const agencyId = req.params.agencyId;
    const agency = agencies[agencyId];

    if (!agency?.vehicle_url) {
        return res.status(404).json({ error: `Unknown agencyId: ${agencyId}` });
    }

    const headers = {};
    if (agency.api_key) headers["x-api-key"] = agency.api_key;
    const response = await fetch(agency.vehicle_url, { headers });
    console.log(agency.vehicle_url);
    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
    const obj = GtfsRealtimeBindings.transit_realtime.FeedMessage.toObject(feed);
    res.json(obj);
});
app.get("/api/overview", (req, res) => {
    res.render("overview");
});

app.get("/about", (req, res) => {
    res.render("about");
});

// START SERVER
if (!process.env.VERCEL && !process.env.NOW_REGION) {
    const PORT = process.env.PORT || 8088;
    app.listen(PORT, () => {
        console.log(`Server running: http://localhost:${PORT}`);
        console.log(`📘 Auto-generated API docs will appear at /api-docs`);
    });
}

export default app;