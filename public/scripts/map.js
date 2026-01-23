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
function showTrainPopup(e) {
  const f = e.features[0];
  const p = f.properties;
  

  
  new maplibregl.Popup()
  .setLngLat(f.geometry.coordinates)
  .setHTML(`
      <b>${p.agencyId}</b><br>
      <b>Vehicle:</b> ${p.id}<br>
      <b>Route:</b> ${p.routeId}<br>
      <b>Trip:</b> <a href="/api/trips/${p.tripId}">${p.tripId}</a><br>
    `)
  .addTo(map);
}
map.addControl(new maplibregl.NavigationControl());
map.on("load", () => {
    map.addSource('metrolink', {
        type: "geojson",
        data: "/api/vehicles/metrolink.geojson"
    });
    map.addSource('octa', {
        type: "geojson",
        data: "/api/vehicles/octa.geojson"
    });
    //Add Stations

    map.addSource("stations", {
        type: "geojson",
        data: "/api/bikes/stations"
    });
    map.addSource("routes",{
        type: "geojson",
        data: "/api/gtfs/shapes"
    });
    map.addSource("ws", {
        type: "geojson",
        data: "https://api.metro.net/LACMTA_Rail/vehicle_positions?format=geojson"
    });
    map.addSource("lametro_rail",{
        type: "geojson",
        data: "/api/vehicles/lametro_rail.geojson"
    })
    map.addLayer({
        id: "routes-layer",
        type: "line",
        source: "routes",
        paint: {
            "line-width":2,
            "line-color": ["get","route_color"]

        }
    });
    map.addLayer({
        id: "metrolink-layer",
        type: "circle",
        source: "metrolink",
        paint: {
            "circle-radius": 6,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff",

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
        id: "shapes-layer",
        type: "line",
        source: "shapes",
        paint: {
            "circle-radius":6,
            "circle-color":"#ff6000",

        }
    })
    map.addLayer({
        id: "lametro_rail-layer",
        type: "circle",
        source: "lametro_rail",
        paint: {
            "circle-radius": 6,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff",
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
    map.addLayer({
        id: "ws",
        type: "circle",
        source: "ws",
        paint: {
            "circle-radius": 5,
            "circle-color": "#ff6000",
        }
    })

    map.on("click", "stations-layer", (e) => {
        const f = e.features[0];
        const p = f.properties;
        new maplibregl.Popup()
            .setLngLat(f.geometry.coordinates)
            .setHTML(`<strong>${p.name}</strong> (${p.code})<br>${p.city}, ${p.state}`)
            .addTo(map);
    });
    map.on("click", "metrolink-layer", showTrainPopup);
    map.on("click", "lametro_rail-layer", showTrainPopup);
    map.on("click", "nctd-layer", showTrainPopup);
    const REFRESH_MS = 10000;

    setInterval(() => {
        if (!map.isStyleLoaded()) return;

        map.getSource("metrolink")?.setData("/api/vehicles/metrolink");
        map.getSource("nctd")?.setData("/api/vehicles/nctd");
        map.getSource("lametro_rail")?.setData("/api/vehicles/lametro_rail");
        console.log(REFRESH_MS);
    }, REFRESH_MS);
});
