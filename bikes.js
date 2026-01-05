export async function getAllStations() {
    try {
        const response = await fetch("https://bts-status.bicycletransit.workers.dev/lax");
        if (!response.ok) throw new Error("Network error");

        return await response.json();
    } catch (err) {
        console.error("Error fetching station data:", err);
        return null;
    }
}