async function loadRoutes(agency_id) {
    try {
        const response = await fetch(`http://localhost:8088/api/routes?agency_id=${agency_id}`);
        const data = await response.json();
        const tableBody = document.getElementById("route-info");
        document.getElementById("route_id").textContent = data.route_id;
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}
loadRoutes("LACMTA_Rail");
