const bbox = [32.521151, -120.981445, 35.383969, -116.520996];
const map = L.map("map").setView([34.05, -118.25], 9);
map.createPane("routesPane").style.zIndex = 400;
map.createPane("stationsPane").style.zIndex = 500;

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const exportBtn = document.getElementById("exportBtn");
const stationDetails = document.getElementById("stationDetails");

let currentLayers = [];
let geojsonFeatures = { routes: [], stations: [] };

function renderData(data) {
    currentLayers.forEach((l) => map.removeLayer(l));
    currentLayers = [];
    geojsonFeatures = { routes: [], stations: [] };
    stationDetails.innerHTML = "<strong>Station Info</strong><br><em>Click a station</em>";

    const nodes = data.elements.filter((e) => e.type === "node");
    const relations = data.elements.filter((e) => e.type === "relation");

    relations.forEach((rel) => {
        const color = rel.tags?.colour || rel.tags?.color || "#3388ff";
        const name = rel.tags?.name || "Unnamed";
        const from = rel.tags?.from;
        const to = rel.tags?.to;
        const display = from && to ? `${name}: ${from} → ${to}` : name;

        rel.members.forEach((m) => {
            if (m.geometry && m.type === "way") {
                const coords = m.geometry.map((pt) => [pt.lon, pt.lat]);
                const poly = L.polyline(coords.map(([lon, lat]) => [lat, lon]), {
                    color,
                    weight: 3,
                    pane: "routesPane"
                })
                    .addTo(map)
                    .bindTooltip(display);
                currentLayers.push(poly);
                geojsonFeatures.routes.push({
                    type: "Feature",
                    geometry: { type: "LineString", coordinates: coords },
                    properties: { name, from, to, color }
                });
            }
        });
    });

    nodes.forEach((n) => {
        const lat = n.lat, lon = n.lon;
        const name = n.tags?.name || "Unnamed Station";
        const stop_id = n.tags?.["stop_id"] || n.id;

        const marker = L.circleMarker([lat, lon], {
            radius: 4,
            fillColor: "black",
            color: "white",
            weight: 1,
            fillOpacity: 1,
            pane: "stationsPane"
        })
            .addTo(map)
            .bindTooltip(name);

        marker.on("click", () => {
            window.location.href = `/stations/${stop_id}`;
        });

        geojsonFeatures.stations.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [lon, lat] },
            properties: n.tags || {}
        });

        currentLayers.push(marker);
    });
}

function fetchData() {
    const query = `
[out:json][timeout:25];
(
  relation["route"~"light_rail|subway|train"]["passenger"="suburban"](${bbox.join(",")});
  relation["route"~"light_rail|subway"](${bbox.join(",")});
  node["station"~"light_rail|subway"](${bbox.join(",")});
);
out geom;
`;

    fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query
    })
        .then((res) => res.json())
        .then((data) => {
            console.log("✅ Overpass data loaded", data);
            renderData(data);
        })
        .catch((err) => {
            console.error("❌ Overpass fetch failed:", err);
            alert("Failed to load map data.");
        });
}

exportBtn.addEventListener("click", () => {
    const geojson = {
        type: "FeatureCollection",
        features: [...geojsonFeatures.routes, ...geojsonFeatures.stations]
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "transit-map.geojson";
    a.click();
});

fetchData();