// converter.js
// GTFS-RT → GeoJSON converter (vehicles)

export function vehiclesFromFeed(feed) {
    return (feed.entity || [])
        .map(e => e.vehicle)
        .filter(v =>
            v?.position?.latitude != null &&
            v?.position?.longitude != null
        )
        .map(v => ({
            id: v.vehicle?.id ?? null,
            tripId: v.trip?.tripId ?? null,
            routeId: v.trip?.routeId ?? null,
            lat: v.position.latitude,
            lon: v.position.longitude,
            speed: v.position.speed ?? null,
            bearing: v.position.bearing ?? null,
            timestamp: v.timestamp ?? null
        }));
}

export function vehiclesToGeoJSON(vehicles) {
    return {
        type: "FeatureCollection",
        features: vehicles.map(v => ({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [v.lon, v.lat]
            },
            properties: {
                id: v.id,
                tripId: v.tripId,
                routeId: v.routeId,
                speed: v.speed,
                bearing: v.bearing,
                timestamp: v.timestamp
            }
        }))
    };
}

export function feedToVehicleGeoJSON(feed) {
    return vehiclesToGeoJSON(vehiclesFromFeed(feed));
}