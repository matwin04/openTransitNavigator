const map = L.map("map", {
    center: [34.05, -118.25],
    zoom: 11,
    layers: [],
    zoomControl: false
});

L.control.zoom({ position: "bottomright" }).addTo(map);

const baseLayers = {
    "Positron Light": L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap & CartoDB'
    }),
    "Positron Dark": L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap & CartoDB'
    })
};

baseLayers["Positron Dark"].addTo(map);

L.control.layers(baseLayers, {}, { position: "topright", collapsed: false }).addTo(map);

const stationLayer = L.layerGroup().addTo(map);
const routeLayer = L.geoJSON(null, {
    style: feature => ({
        color: `#${feature.properties.route_color || "0088ff"}`,
        weight: 4
    })
}).addTo(map);

function drawStationMarkers(stationMap) {
    const features = [];

    for (const stop of stationMap.values()) {
        if (!stop.geometry || !stop.geometry.coordinates) continue;

        features.push({
            type: "Feature",
            geometry: stop.geometry,
            properties: {
                stop_id: stop.stop_id,
                stop_name: stop.stop_name,
                id: stop.id // <-- This is the numeric ID used in /stations/:id
            }
        });
    }

    L.geoJSON({ type: "FeatureCollection", features }, {
        pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
                radius: 5,
                color: "#0088ff",
                weight: 1,
                fillOpacity: 0.85
            });
        },
        onEachFeature: (feature, layer) => {
            const stop_name = feature.properties.stop_name || "Unnamed Station";
            const stationId = feature.properties.id;

            layer.bindPopup(`
                <strong>${stop_name}</strong><br>
                <b>ID: ${stationId}</b><br>
                <a href="/stations/${stationId}">View Departures</a>
            `);
        }
    }).addTo(stationLayer);
}
async function getStations() {
    try {
        const res = await fetch("/api/stations");
        const data = await res.json();
        const stationMap = new Map();

        for (const feature of data.features) {
            if (feature.properties && feature.properties.route_stops) {
                for (const rs of feature.properties.route_stops) {
                    const stop = rs.stop;
                    if (!stationMap.has(stop.id)) {
                        stationMap.set(stop.id, stop);
                    }
                }
            }
        }

        drawStationMarkers(stationMap);
    } catch (err) {
        console.error("Failed to load stations", err);
    }
}

async function getRoutes() {
    try {
        const res = await fetch("/api/routes");
        const data = await res.json();
        routeLayer.clearLayers();
        routeLayer.addData(data);
    } catch (err) {
        console.error("Failed to load routes", err);
    }
}

getRoutes();
getStations();