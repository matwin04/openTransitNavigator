import express from "express";
import path from "path";
import dotenv from "dotenv";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import * as amtrak from "amtrak";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIEWS_DIR = path.join(__dirname, "views");
const PARTIALS_DIR = path.join(VIEWS_DIR, "partials");

app.engine("html", engine({ extname: ".html", defaultLayout: false, partialsDir: PARTIALS_DIR }));
app.set("view engine", "html");
app.set("views", VIEWS_DIR);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(path.join(__dirname, "public")));

// Home route with trains
app.get("/", async (req, res) => {
    res.render("index");
});
app.get("/about",(req,res)=>{
    res.render("about");
})

app.get("/trains", async (req, res) => {
    try {
        const response = await fetch("https://api-v3.amtraker.com/v3/trains");
        const trainsObj = await response.json();

        // Flatten trains for easy Handlebars rendering
        const trains = Object.entries(trainsObj).flatMap(([trainNum, arr]) =>
            (arr || []).map((t) => ({ ...t, trainNum }))
        );
        res.render("index", { trains });
    } catch (err) {
        console.error("❌ API Error:", err);
        res.status(500).send("Failed to fetch trains");
    }
});

// Stations route
app.get("/api/trains",async (req,res)=>{
    try {
        const r = await fetch("https://api-v3.amtraker.com/v3/trains");
        const trainsObj = await r.json();

        // Flatten: each key is a trainNum -> array of train objects
        const features = Object.entries(trainsObj).flatMap(([trainNum, arr]) =>
            (arr || [])
                .filter(t => Number.isFinite(t.lon) && Number.isFinite(t.lat))
                .map(t => ({
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [t.lon, t.lat] },
                    properties: {
                        trainNum: t.trainNum ?? trainNum,
                        trainID: t.trainID,
                        routeName: t.routeName,
                        provider: t.providerShort || t.provider,
                        eventName: t.eventName,
                        heading: t.heading,
                        velocity: t.velocity,
                        updatedAt: t.updatedAt
                    }
                }))
        );

        res.json({ type: "FeatureCollection", features });
    } catch (e) {
        console.error("Failed to fetch trains:", e);
        res.status(500).json({ error: "Failed to fetch trains" });
    }
});
app.get("/api/stations", async (req, res) => {
    try {
        const r = await fetch("https://api-v3.amtraker.com/v3/stations");
        const stations = await r.json();
        
        const features = Object.entries(stations).map(([code, s]) => ({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [s.lon, s.lat],
            },
            properties: {
                code,
                name: s.name,
                city: s.city,
                state: s.state,
            },
        }));
        
        res.json({ type: "FeatureCollection", features });
    } catch (e) {
        console.error("X Failed to fetch stations:", e);
        res.status(500).json({ error: "Failed to fetch stations" });
    }
});
app.get("/stations", async (req, res) => {
    const stations = await amtrak.fetchAllStations();
    res.render("stations", { stations });
});
// GET /trains/:num → fetch that train directly from Amtraker
app.get("/trains/:num", async (req, res) => {
    const num = req.params.num;
    try {
        const r = await fetch(`https://api-v3.amtraker.com/v3/trains/${num}`);
        if (!r.ok) {
            return res.status(r.status).send(`Train ${num} not found`);
        }
        const data = await r.json();
        // Each key is the train number, with an array of train objects
        const trainArr = data[num];
        if (!trainArr || trainArr.length === 0) {
            return res.status(404).send(`Train ${num} not found`);
        }

        const train = trainArr[0]; // usually just one object

        // Render with train info + station list
        res.render("traininfo", { train, stations: train.stations });
    } catch (err) {
        console.error("❌ API Error:", err);
        res.status(500).send("Failed to fetch train");
    }
});

if (!process.env.VERCEL && !process.env.NOW_REGION) {
    const PORT = process.env.PORT || 8088;
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
    });
}

export default app;