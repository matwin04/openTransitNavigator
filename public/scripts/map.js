const map = L.map("map").setView([34.0522, -118.2437], 11); // Los Angeles

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
}).addTo(map);

const routeLayer = L.layerGroup().addTo(map);
const stationLayer = L.layerGroup().addTo(map);

// ✅ Fetch and draw routes (with embedded stops shown as small dots)
function getRoutes() {
    fetch("/api/routes")
        .then(res => res.json())
        .then(drawRoutes)
        .catch(console.error);
}

// ✅ Fetch /api/stations and flatten + render all deduped stops as GeoJSON
async function getStations() {
    try {
        const res = await fetch("/api/stations");
        const data = await res.json();
        const uniqueStations = new Map();

        data.features.forEach(route => {
            const stops = route.properties?.route_stops || [];

            stops.forEach(entry => {
                const stop = entry.stop;
                const id = stop.stop_id || stop.onestop_id;
                if (!uniqueStations.has(id)) {
                    uniqueStations.set(id, stop);
                }
            });
        });

        drawStationMarkers(uniqueStations);
    } catch (err) {
        console.error("Failed to load station data", err);
    }
}
// ✅ Draw deduplicated stations as a clean layer
function drawStationMarkers(stationMap) {
    const features = [];

    for (const stop of stationMap.values()) {
        if (!stop.geometry || !stop.geometry.coordinates) continue;

        features.push({
            type: "Feature",
            geometry: stop.geometry,
            properties: {
                stop_id: stop.stop_id,
                stop_name: stop.stop_name
            }
        });
    }

    L.geoJSON({
        type: "FeatureCollection",
        features: features
    }, {
        pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
                radius: 5,
                color: "#0088ff",
                weight: 1,
                fillOpacity: 0.85
            });
        },
        onEachFeature: (feature, layer) => {
            const name = feature.properties.stop_name || "Unnamed Station";
            layer.bindPopup(`<b>${name}</b>`);
        }
    }).addTo(stationLayer);
}
// ✅ Draw color-coded rail routes
function drawRoutes(geojson) {
    L.geoJSON(geojson, {
        style: feature => {
            const color = feature.properties.route_color;
            return {
                color: color ? `#${color}` : "#666666",
                weight: 3,
                opacity: 0.9
            };
        },
        onEachFeature: (feature, layer) => {
            const props = feature.properties;
            const name = props.route_long_name || props.route_name || "Unnamed Route";
            layer.bindPopup(`<b>${name}</b><br>Type: ${props.route_type}`);
        }
    }).addTo(routeLayer);
}

// ▶️ Load everything
getRoutes();
getStations();

// 🧭 Layer toggles
L.control.layers(null, {
    "Routes": routeLayer,
    "Stations": stationLayer
}).addTo(map);