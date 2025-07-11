import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import dotenv from "dotenv";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import {getStops} from "gtfs";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';


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
app.get("/stations", async (req, res) => {
    try {
        const db = await open({
            filename: path.join(__dirname, "public", "gtfs.db"),
            driver: sqlite3.Database,
        });

        const stops = await db.all(
            "SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops ORDER BY stop_name ASC"
        );

        console.log(`📍 Loaded ${stops.length} stops from database`);

        res.render("stations", {
            title: "Stations",
            stops: stops.length > 0 ? stops : null
        });
    } catch (error) {
        console.error("❌ Error loading stations:", error.message);
        res.status(500).send("Failed to load stations.");
    }
});
app.get("/test",(req, res) => {
    res.render("testing");
});
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});