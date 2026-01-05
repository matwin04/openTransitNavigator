const larouteColors = {
    "801": "#0072BC",
    "802": "#EB131B",
    "803": "#58A738",
    "804": "#FDB913",
    "805": "#A05DA5",
    "807": "#E56DB1",
    "Antelope Valley Line": "#1d9d02",
    "San Bernardino Line": "#a32236",
    "Ventura County Line": "#f6a706",
    "Orange County Line": "#ff7602",
    "unknown": "#AAAAAA",
};
const map = new maplibregl.Map({
    container: "map",
    style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    center: [-118.25, 34.05],
    zoom: 9
});
map.addControl(new maplibregl.NavigationControl());
map.on("load", () => {
    //Add Trains

    map.addSource('metrolink', {
        type: "geojson",
        data: "/api/vehicles/metrolink"
    });
    map.addSource('octa', {
        type: "geojson",
        data: "/api/vehicles/octa"
    });
    //Add Stations
    map.addSource("stations", {
        type: "geojson",
        data: "/api/bikes/stations"
    });
    map.addSource("lametro_rail",{
        type: "geojson",
        data: "/api/vehicles/lametro_rail"
    })
    map.addLayer({
        id: "metrolink-layer",
        type: "circle",
        source: "metrolink",
        paint: {
            "circle-radius":5,
            "circle-color": [
                "match",
                ["get", "routeId"],
                "Antelope Valley Line",larouteColors["Antelope Valley Line"],
                "San Bernardino Line",larouteColors["San Bernardino Line"],
                "Ventura County Line",larouteColors["Ventura County Line"],
                "Orange County Line",larouteColors["Orange County Line"],
                larouteColors["unknown"]
            ],
        }
    });
    map.addLayer({
        id: "octa-layer",
        type: "circle",
        source: "octa",
        paint: {
            "circle-radius":2.5,
            "circle-color":"#ff6000",
        }
    });
    map.addLayer({
        id: "lametro_rail-layer",
        type: "circle",
        source: "lametro_rail",
        paint: {
            "circle-radius": 3.5,
            "circle-color": [
                "match",
                ["get", "routeId"],
                "801", larouteColors["801"],
                "802", larouteColors["802"],
                "803", larouteColors["803"],
                "804", larouteColors["804"],
                "805", larouteColors["805"],
                "807", larouteColors["807"],
                larouteColors["unknown"]
            ]
        }
    });
    map.addLayer({
        id: "stations-layer",
        type: "circle",
        source: "stations",
        paint: {
            "circle-radius": 2,
            "circle-color": "#007cbf",
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff"
        }
    });

    map.on("click", "stations-layer", (e) => {
        const f = e.features[0];
        const p = f.properties;
        new maplibregl.Popup()
            .setLngLat(f.geometry.coordinates)
            .setHTML(`<strong>${p.name}</strong> (${p.code})<br>${p.city}, ${p.state}`)
            .addTo(map);
    });
    map.on("click", "metrolink-layer", (e) => {
        const f = e.features[0];
        const p = f.properties;
        new maplibregl.Popup()
            .setLngLat(f.geometry.coordinates)
            .setHTML(
                `
              <strong>${p.routeId || " "}<a href="/trains/${p.trainNum}">${p.trainNum}</a></strong><br/>
              <strong>Next Stop: </strong>${p.eventName || ""}<br/>
              Speed: ${p.speed ? Math.round(p.speed) + " mph" : "N/A"}
            `
            )
            .addTo(map);
    });
    map.on("click", "lametro_rail-layer", (e) => {
        const f = e.features[0];
        const p = f.properties;
        new maplibregl.Popup()
            .setLngLat(f.geometry.coordinates)
            .setHTML(
                `
              <strong>${p.routeId || " "}<a href="/trains/${p.trainNum}">${p.trainNum}</a></strong><br/>
              <strong>Next Stop: </strong>${p.eventName || ""}<br/>
              Speed: ${p.speed ? Math.round(p.speed) + " mph" : "N/A"}
            `
            )
            .addTo(map);
    });
    const REFRESH_MS = 10000;

    setInterval(() => {
        if (!map.isStyleLoaded()) return;

        map.getSource("metrolink")?.setData("/api/vehicles/metrolink");
        map.getSource("octa")?.setData("/api/vehicles/octa");
        map.getSource("lametro_rail")?.setData("/api/vehicles/lametro_rail");
        console.log(REFRESH_MS);
    }, REFRESH_MS);
});
