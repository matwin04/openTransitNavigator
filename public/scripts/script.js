async function loadAgencies() {
    try {
        const response = await fetch("/api/agencies");
        const data = await response.json();
        const tableBody = document.getElementById("table-body");
        tableBody.innerHTML = "";

        // Iterate through each agency and create a row
        data.forEach((agency) => {
            const row = `
            <tr>
                <td>
                    ${agency.agency_id}
                    <button onclick="loadRoutes(${agency.agency_id})"
                </td>
                
                <td>${agency.agency_name}</td>
                <td><a href="${agency.agency_url}" target="_blank">${agency.agency_url}</a></td>
                <td>${agency.agency_timezone}</td>
                <td>${agency.agency_phone}</td>
            </tr>
        `;
            tableBody.insertAdjacentHTML("beforeend", row);
        });
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}
async function loadStations() {
    try {
        const response = await fetch("/api/stops");
        const data = await response.json();
        const tableBody = document.getElementById("table-body");
        tableBody.innerHTML = "";
        data.forEach((stop) => {
            const row = `
            <tr>
                <td>${stop.stop_id}</td>
                <td>${stop.stop_name}</td>
                <td>${stop.stop_code}</td>
            </tr>
            `;
            tableBody.insertAdjacentHTML("beforeend", row);
        });
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}
async function loadTrips() {
    try {
        const response = await fetch("/api/trips");
        const data = await response.json();
        const tableBody = document.getElementById("table-body");
        tableBody.innerHTML = "";
        data.forEach((trip) => {
            const row = `
            <tr>
                <td>${trip.trip_id}</td>
                
            </tr>
            `;
            tableBody.insertAdjacentHTML("beforeend", row);
        });
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}
async function loadRoutes() {
    console.log("loading routes");
    const response = await fetch("/api/routes");
    const data = await response.json();
    const tableBody = document.getElementById("table-body");
    tableBody.innerHTML = "";
    data.forEach((route) => {
        const row = `
            <tr>
                <td>${route.route_id}</td>
                <td>${route.agency_id}</td>
                <td>${route.route_color}</td>
            </tr>
        `;
        tableBody.insertAdjacentHTML("beforeend", row);
    });
}
async function loadVehicles() {
    try {
        const response = await fetch("/api/realtime/vehicle_positions");

        const data = await response.json();
        const tableBody = document.getElementById("table-body");
        tableBody.innerHTML = "";
        data.forEach((vehicles) => {
            const row = `
            <tr>
                <td>${vehicles.id}</td>
                <td>${vehicles.trip_id}</td>
            </tr>
            `;
            tableBody.insertAdjacentHTML("beforeend", row);
        });
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}
// Initialize the fetch
