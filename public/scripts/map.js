const map = L.map("map").setView([34.0522, -118.2437], 9);

// Add tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// Layer groups
const routeLayer = L.geoJSON(null, {
    style: (feature) => ({
        color: feature.properties?.colour || "#0074D9",
        weight: 3
    }),
    onEachFeature: (feature, layer) => {
        const from = feature.properties?.from || "Unknown";
        const to = feature.properties?.to || "Unknown";
        const name = feature.properties?.name || "Unnamed Route";
        layer.bindPopup(`<b>${name}</b><br>${from} → ${to}`);
    }
}).addTo(map);

const stationLayer = L.geoJSON(null, {
    pointToLayer: (feature, latlng) =>
        L.circleMarker(latlng, {
            radius: 5,
            fillColor: "#333",
            color: "#fff",
            weight: 1,
            fillOpacity: 0.9
        }),
    onEachFeature: (feature, layer) => {
        const stop = feature.properties;
        const id = stop.onestop_id;
        const name = stop.name || "Unnamed Station";
        layer.bindPopup(`<a href="/stations/${id}">${name}</a>`);
    }
}).addTo(map);

// Load Overpass data
async function loadRoutesFromOverpass() {
    const query = `
[out:json][timeout:25];
(
  relation["route"~"light_rail|subway|train"](35.383969,-120.981445,32.521151,-116.520996);
);
out geom tags;
  `.trim();

    try {
        const res = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query
        });

        const text = await res.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch (err) {
            console.error("❌ Overpass returned invalid JSON:", text);
            return;
        }

        const geojson = osmtogeojson(json);
        routeLayer.clearLayers().addData(geojson);
        console.log("✅ Overpass data loaded", json);
    } catch (err) {
        console.error("❌ Overpass fetch failed:", err);
    }
}

// Load station data from Transit.land
async function loadStations() {
    const bbox = "-120.981445,32.521151,-116.520996,35.383969";
    const url = `https://transit.land/api/v2/rest/stops?bbox=${bbox}&per_page=1000`;

    try {
        const res = await fetch(url, {
            headers: {
                apikey: window.TRANSITLAND_API_KEY || "" // Set via script tag or server
            }
        });

        const data = await res.json();

        if (!data.stops || !Array.isArray(data.stops)) {
            throw new Error("Transit.land returned no stops.");
        }

        const features = data.stops.map((stop) => ({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [stop.geometry.coordinates[0], stop.geometry.coordinates[1]]
            },
            properties: stop
        }));

        stationLayer.clearLayers().addData({ type: "FeatureCollection", features });
        console.log("✅ Transit.land stations loaded", features.length);
    } catch (err) {
        console.error("❌ Failed to load Transit.land stations:", err);
    }
}

// Initial load
loadRoutesFromOverpass();
loadStations();
