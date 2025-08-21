const map = new maplibregl.Map({
    container: "map",
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [-118.25, 34.05],
    zoom: 9
});
map.addControl(new maplibregl.NavigationControl());
map.on("load", () => {
    //Add Trains
    
    map.addSource("trains",{
        type: "geojson",
        data: "/api/trains",
    })
    //Add Stations
    map.addSource("stations", {
        type: "geojson",
        data: "/api/stations",
    });
    map.addLayer({
        id: "trains-layer",
        type: "circle",
        source: "trains",
        paint: {
            "circle-radius": 4,
            "circle-color": "#e53935",
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff"
        }
    });
    map.addLayer({
        id: "trains-labels",
        type: "symbol",
        source: "trains",
        layout: {
            "text-field": ["get", "trainNum"],
            "text-size": 10,
            "text-offset": [0, 1],
            "text-anchor": "top"
        },
        paint: {
            "text-halo-color": "#fff",
            "text-halo-width": 1
        }
    });
    // Add a circle layer for station points
    map.addLayer({
        id: "stations-layer",
        type: "circle",
        source: "stations",
        paint: {
            "circle-radius": 5,
            "circle-color": "#007cbf",
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff"
        }
    });
    
    // Add labels for station names
    map.addLayer({
        id: "stations-labels",
        type: "symbol",
        source: "stations",
        layout: {
            "text-field": ["get", "name"],
            "text-offset": [0, 1],
            "text-anchor": "top"
        },
        paint: {
            "text-color": "#333",
            "text-halo-color": "#fff",
            "text-halo-width": 1
        }
    });
    // Optional: station interactivity
    map.on("click", "stations-layer", (e) => {
        const f = e.features[0];
        const p = f.properties;
        new maplibregl.Popup()
        .setLngLat(f.geometry.coordinates)
        .setHTML(`<strong>${p.name}</strong> (${p.code})<br>${p.city}, ${p.state}`)
        .addTo(map);
    });
    map.on("click", "trains-layer", (e) => {
        const f = e.features[0];
        const p = f.properties;
        new maplibregl.Popup()
            .setLngLat(f.geometry.coordinates)
            .setHTML(`
      <strong>${p.routeName || "Train"} ${p.trainNum || ""}</strong><br/>
      <strong>Next Stop: </strong>${p.eventName || ""}<br/>
      Speed: ${p.velocity ? Math.round(p.velocity) + " mph" : "N/A"}
    `)
            .addTo(map);
    });
});