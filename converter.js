
export function feedToVehicleGeoJSON(feed) {
    return {
        type: "FeatureCollection",
        features: (feed.entity || [])
        .map(e => e.vehicle)
        .filter(v => v?.position?.latitude != null && v?.position?.longitude != null)
        .map(v => ({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [v.position.longitude, v.position.latitude],
            },
            properties: {
                agencyId: null, // you’ll set this in the route
                id: v.vehicle?.id ?? null,
                trip: v.trip ?? null,
                position: v.position ?? null,
                timestamp: v.timestamp ?? null,
                vehicle: v.vehicle ?? null
            },
        })),
    };
}