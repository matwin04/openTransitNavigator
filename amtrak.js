// amtrakService.js
import * as amtrak from "amtrak";

// Fetch all trains
export async function getAllTrains() {
    try {
        return await amtrak.fetchAllTrains();
    } catch (err) {
        console.error("Error fetching trains:", err);
        throw err;
    }
}

// Fetch all stations
export async function getAllStations() {
    try {
        return await amtrak.fetchAllStations();
    } catch (err) {
        console.error("Error fetching stations:", err);
        throw err;
    }
}