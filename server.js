import express from "express";
import path from "path";
import dotenv from "dotenv";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";

import fetch from "node-fetch";
import swaggerUi from "swagger-ui-express";
import fs from "node:fs/promises";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
dotenv.config();
import {
    getAgencies,
    getRoutes,
    getShapesAsGeoJSON,
    getStops,
    getStopsAsGeoJSON,
    getStoptimes,
    getStopTimeUpdates, getTrips,
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
const GTFSCFG = JSON.parse(
    await fs.readFile(new URL('./config.json',import.meta.url), "utf8")
);
const overview = JSON.parse(
    await fs.readFile(new URL("./overview.json",import.meta.url), "utf8")
);
console.log(overview)
await importGtfs(GTFSCFG);

await updateGtfsRealtime(GTFSCFG)

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

app.get("/api/overview", (req, res) => {
    res.render("overview",overview);
});
app.get("/api/agencies/:agency_id", (req, res) => {
    const agency_id = req.params.agency_id;
    const agency = getAgencies({agency_id});
    res.json(agency);
});
app.get("/api/agencies", async (req, res) => {
    const { agency_id } = req.query;
    const agencies = agency_id
        ? getAgencies({agency_id})
        : getAgencies();
    res.json(agencies);
});
app.get("/api/routes", async (req, res) => {
    const {route_id } = req.query;
    const routes = route_id
        ? getRoutes({route_id})
        : getRoutes();
    res.json(routes);
});
app.get("/api/stops",(req, res) => {
    const {stop_id} = req.query;
    const stops = stop_id
        ? getStops({stop_id})
        : getStops();
    res.json(stops);
});
app.get("/api/trips", (req, res) => {
    const {trip_id} = req.query;
    const trips = trip_id
        ? getTrips({trip_id})
        : getTrips();
    res.json(trips);
});
app.get("/api/departures", (req, res) => {
    const { stop_id, trip_id } = req.query;
    const stoptimes = getStoptimes({
        ...(stop_id && { stop_id }),
        ...(trip_id && { trip_id })
    });

    res.json(stoptimes);
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