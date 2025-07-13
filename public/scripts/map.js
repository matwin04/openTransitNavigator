const map = new maplibregl.Map({
    container: "map",
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [-118.25, 34.05],
    zoom: 9
});
map.addControl(new maplibregl.NavigationControl());
map.on("load", () => {
    // Routes (Shapes)
    map.addSource('routes', {
        type: 'geojson',
        data: '/geojson/shapes.geojson'
    });

    map.addLayer({
        id: 'route-lines',
        type: 'line',
        source: 'routes',
        paint: {
            'line-color': '#000000',
            'line-width': 3
        }
    });
    // Stations
    map.addSource("stations", {
        type: "geojson",
        data: "/geojson/stations.geojson"
    });

    map.addLayer({
        id: "stations",
        type: "circle",
        source: "stations",
        paint: {
            "circle-radius": 5,
            "circle-color": "#007cbf"
        }
    });




    // Optional: station interactivity
    map.on("click", "stations", (e) => {
        const props = e.features[0].properties;
        new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`<strong>${props.stop_name}</strong><br><a href="/stations/departures/${props.stop_id}">View Departures</a>`)
            .addTo(map);
    });
});