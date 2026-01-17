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
import {
    getAgencies,
    getRoutes,
    getShapesAsGeoJSON,
    getStops,
    getStopsAsGeoJSON,
    getStoptimes,
    getStopTimeUpdates,
    importGtfs, updateGtfsRealtime
} from 'gtfs';
import {agency} from "gtfs/models";

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
const GTFSCFG = JSON.parse(
    await fs.readFile(new URL('./config.json',import.meta.url), "utf8")
);
await importGtfs(GTFSCFG);

await updateGtfsRealtime(GTFSCFG)
async function fetchGtfsRtFeed(agency, urlField) {
    if (!agency?.[urlField]) {
        throw new Error(`Agency does not have ${urlField}`);
    }
    const headers = {};
    if (agency.api_key) headers["x-api-key"] = agency.api_key;
    const response = await fetch(agency[urlField], { headers });
    if (!response.ok) {
        throw new Error(`Upstream GTFS-RT error: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        new Uint8Array(buffer)
    );
    return GtfsRealtimeBindings.transit_realtime.FeedMessage.toObject(feed);
}
app.engine("html", engine({ extname: ".html", defaultLayout: false, partialsDir: PARTIALS_DIR }));
app.set("view engine", "html");
app.set("views", VIEWS_DIR);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapi));

app.get("/", async (req, res) => {
    const agencies = await getAgencies();
    res.render("index", {
        agencies: agencies,
    });
});
app.get("/agencies/:agency_id", async (req, res) => {
    const agency_id = req.params.agency_id;
    const agency = getAgencies({agency_id});
    const routes = getRoutes({agency_id});
    res.render("info/agency", {
        agency: agency,
        routes: routes,
    })
});

app.get("/api/vehicles/:agencyId.geojson", async (req, res) => {
    try {
        const agencyId = req.params.agencyId;
        const agency = agencies[agencyId];
        if (!agency) return res.status(404).json({ error: "Unknown agency" });
        const obj = await fetchGtfsRtFeed(agency, "vehicle_url");
        // If your converter expects decoded feed instead of object:
        const geojson = feedToVehicleGeoJSON(
            GtfsRealtimeBindings.transit_realtime.FeedMessage.fromObject(obj)
        );

        for (const f of geojson.features) f.properties.agencyId = agencyId;
        res.json(geojson);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
app.get("/api/vehicles/:agencyId", async (req, res) => {
    try {
        const agency = agencies[req.params.agencyId];
        if (!agency) return res.status(404).json({ error: "Unknown agency" });

        const obj = await fetchGtfsRtFeed(agency, "vehicle_url");
        res.json(obj);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
app.get("/api/overview", (req, res) => {
    res.render("overview");
});
app.get("/api/trips/:trip_id", (req, res) => {
    const trip_id = req.params.trip_id;
    const stoptimes = getStoptimes({trip_id});
    res.json(stoptimes);
});
app.get("/api/trips/rt/:trip_id", (req, res) => {
    const trip_id = req.params.trip_id;
    const stoptimes = getStopTimeUpdates();
    res.json(stoptimes);
});
app.get("/api/stops/:stop_id", (req, res) => {
    const stop_id = req.params.stop_id;
    const departureBoard = getStoptimes({stop_id});
    res.json(departureBoard);
});
app.get("/stops/:stop_id", (req, res) => {
    const stop_id = req.params.stop_id;
    const departureBoard = getStoptimes({stop_id});
    res.render("departures", {
        stop_id: stop_id,
        departures: departureBoard,
    });
})
app.get("/api/stops/geojson", (req, res) => {
    const geojson = getStopsAsGeoJSON();
    res.json(geojson);
});
app.get("/api/gtfs/shapes", (req, res) => {
    const shapesGeojson = getShapesAsGeoJSON();
    res.json(shapesGeojson)
});
app.get("/api/gtfs/stops", (req, res) => {
    const stopsGeojson = getStopsAsGeoJSON();
    res.json(stopsGeojson);
});
app.get("/about", (req, res) => {
    res.render("about");
});

// START SERVER
if (!process.env.VERCEL && !process.env.NOW_REGION) {
    const PORT = process.env.PORT || 8088;
    app.listen(PORT, () => {
        console.log(`Server running: http://localhost:${PORT}`);
        console.log(`📘 Auto-generated API docs will appear at http://localhost:${PORT}/api-docs`);
    });
}

export default app;