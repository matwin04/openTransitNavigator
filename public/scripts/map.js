async function loadRouteColors() {
    const res = await fetch("/api/routes");
    const routes = await res.json();

    let routeColors = Object.fromEntries(
        routes.map(r => [
            r.route_id,
            r.route_color ? `#${r.route_color}` : "#888888"
        ])
    );
}
const map = new maplibregl.Map({
    container: "map",
    style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    center: [-118.25, 34.05],
    zoom: 9
});
function showTrainPopup(e) {
    const f = e.features[0];
    const p = f.properties;
    new maplibregl.Popup()
        .setLngLat(f.geometry.coordinates)
        .setHTML(
            `
                <span class="mdi mdi-train"></span><br>
                <b>Vehicle:</b> ${p.id}<br>
                <b>Route:</b> ${p.route_id}<br>
                <b>Trip:</b> <a href="/api/trips/${p.trip_id}">${p.tripId}</a><br>
            `
        )
        .addTo(map);
}
function vehiclesToGeoJSON(data) {
    return {
        type: "FeatureCollection",
        features: data
            .filter((v) => v.latitude && v.longitude)
            .map((v) => ({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [v.longitude, v.latitude]
                },
                properties: {
                    id: v.id,
                    route_id: v.route_id,
                    trip_id: v.trip_id,
                    timestamp: v.timestamp,
                    route_color: v.route_color ? v.route_color : null
                }
            }))
    };
}
async function loadVehiclesPositions() {
    const res = await fetch("/api/realtime/vehicle_positions");
    const data = await res.json();
    console.log(data);
    const geojson = vehiclesToGeoJSON(data);
    console.log(geojson);
    if (map.getSource("vehicles")) {
        map.getSource("vehicles").setData(geojson);
        return;
    }
    map.addSource("vehicles", {
        type: "geojson",
        data: geojson
    });
    map.addLayer({
        id: "vehicles-layer",
        type: "circle",
        source: "vehicles",
        paint: {
            "circle-radius": 5,
            "circle-color":["get", "route_color"],
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 1
        }
    });
}
map.addControl(new maplibregl.NavigationControl());

function displayStopData() {
    console.log("Displaying stop data");
}

map.on("load", () => {
    map.addSource("shapes", {
        type: "geojson",
        data: "/api/shapes"
    });
    map.addSource("stops", {
        type: "geojson",
        data: "/api/stops.geojson"
    });
    map.addLayer({
        id: "routes-layer",
        type: "line",
        source: "shapes",
        paint: {
            "line-width": 2,
            "line-color": ["get", "route_color"]
        }
    });

    map.addLayer({
        id: "stops-layer",
        type: "circle",
        source: "stops",
        paint: {
            "circle-radius": 4,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#000",
            "circle-color": "#fff"
        }
    });
    map.addLayer({
        id: "routes-layer",
        type: "line",
        source: "shapes",
        paint: {
            "circle-radius": 6,
            "circle-color": "#ff6000"
        }
    });

    map.on("click", "stops-layer", (e) => {
        const f = e.features[0];
        const p = f.properties;
        new maplibregl.Popup()
            .setLngLat(f.geometry.coordinates)
            .setHTML(`<strong>${p.stop_name}</strong> ${p.stop_id}`)
            .addTo(map);
    });
    map.on("click", "stops-later", displayStopData);
    map.on("click", "vehicles-layer", showTrainPopup);
    const REFRESH_MS = 10000;
    setInterval(() => {
        if (!map.isStyleLoaded()) return;
        loadVehiclesPositions();
        map.getSource("shapes")?.setData("/api/shapes");
        console.log(REFRESH_MS);
    }, REFRESH_MS);
});
