import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import dotenv from "dotenv";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const VIEWS_DIR = path.join(__dirname, "views");
const PUBLIC_DIR = path.join(__dirname, "public");
const upload = multer();
const PORT = process.env.PORT || 3003;
const API_KEY = process.env.API_KEY;

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
app.get("/stations",(req, res) => {
    res.render("stations", {title:"Stations"});
});
app.get("/test",(req, res) => {
    res.render("testing");
})
app.get("/stations/:id", async (req, res) => {
    const stopId = req.params.id;
    const apiUrl = `https://transit.land/api/v2/rest/stops/${stopId}/departures`;

    try {
        const response = await fetch(apiUrl, {
            headers: { apikey: API_KEY || "" }
        });
        const data = await response.json();
        const stop = data.stops?.[0];
        const parent = stop?.parent || stop;
        const departures = stop?.departures || [];

        res.render("stationboard", {
            layout: false,
            title: parent?.name || "Station Info",
            parent,
            departures
        });
    } catch (err) {
        console.error("Failed to fetch station departures:", err);
        res.status(500).send("Could not load station info");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});