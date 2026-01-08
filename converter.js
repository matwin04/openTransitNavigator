
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

                //TripData
                tripId: v.trip?.tripId ?? null,
                startTime: v.trip?.startTime ?? null,
                endTime: v.trip?.startDate ?? null,
                routeId: v.trip?.routeId ?? null,
                directionId: v.trip?.directionId ?? null,
                scheduleRelationship: v.trip?.scheduleRelationship ?? null,
            },
        })),
    };
}