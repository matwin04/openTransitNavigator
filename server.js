import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import dotenv from "dotenv";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import fetch from "node-fetch"; // required to make TransitLand API requests

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const VIEWS_DIR = path.join(__dirname, "views");
const PARTIALS_DIR = path.join(VIEWS_DIR, "partials");
const PUBLIC_DIR = path.join(__dirname, "public");
const upload = multer();
const PORT = process.env.PORT || 3003;

const API_KEY = process.env.API_KEY;
const BASE_URL = "https://www.transit.land/api/v2/rest";
// Template engine
app.engine("html", engine({ extname: ".html", defaultLayout: false, partialsDir: PARTIALS_DIR }));
app.set("view engine", "html");
app.set("views", VIEWS_DIR);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(PUBLIC_DIR));

// Views
app.get("/", (req, res) => {
    res.render("index", { title: "Open Transit Navigator" });
});
app.get("/api/stations", async (req, res) => {
    const apiKey = API_KEY || "WOo9vL8ECMWN76EcKjsNGfo8YgNZ7c2u";
    const bbox = req.query.bbox || "-118.75,33.7,-117.6,34.4";

    try {
        const response = await fetch(
            `https://transit.land/api/v2/rest/routes?include_stops=true&format=geojson&bbox=${bbox}&route_types=0,1,2&per_page=1000`,
            {
                headers: { apikey: apiKey }
            }
        );

        if (!response.ok) {
            const text = await response.text();
            return res.status(response.status).json({
                error: true,
                message: "Transitland API error",
                response: text
            });
        }

        const geojson = await response.json();
        res.json(geojson);
    } catch (err) {
        console.error("Transitland stations fetch failed:", err);
        res.status(500).json({ error: true, message: "Fetch failed", detail: err.message });
    }
});
app.get("/api/routes", async (req, res) => {
    const apiKey = API_KEY || "WOo9vL8ECMWN76EcKjsNGfo8YgNZ7c2u";
    const bbox = req.query.bbox || "-118.75,33.7,-117.6,34.4";

    try {
        const response = await fetch(
            `https://transit.land/api/v2/rest/routes?include_stops=true&format=geojson&bbox=${bbox}&route_types=0,1,2&limit=1000`,
            {
                headers: { apikey: apiKey }
            }
        );
        if (!response.ok) {
            const text = await response.text();
            return res.status(response.status).json({
                error: true,
                message: "Transitland API error",
                response: text
            });
        }
        const geojson = await response.json();
        res.json(geojson);
    } catch (err) {
        console.error("Transitland routes fetch failed:", err);
        res.status(500).json({ error: true, message: "Fetch failed", detail: err.message });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});