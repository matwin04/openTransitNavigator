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
    res.render("stops", {title:"Stops",stops});
});
app.get("/calendar", async (req, res) => {
    const calendar = await sql`SELECT * FROM calendar`;
    res.render("calendar", { title: "Calendar", calendar });
})

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
