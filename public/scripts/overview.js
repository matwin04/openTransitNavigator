const OVERVIEW_URL = "/public/overview.json";

async function fetchOverviewData() {
    const options = { method: "GET" };

    try {
        const response = await fetch(OVERVIEW_URL, options);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching overview.json:", error);
        return [];
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const data = await fetchOverviewData();
    console.log(data);
    populateTable(data);
});

function populateTable(data) {
    const table = document.getElementById("overview-table");
    if (!data || data.length === 0) return;

    table.innerHTML = "";

    /* ---------- THEAD ---------- */
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    const headers = Object.keys(data[0]);
    headers.forEach((headerText) => {
        const th = document.createElement("th");
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    /* ---------- TBODY ---------- */
    const tbody = document.createElement("tbody");

    data.forEach((rowData) => {
        const row = document.createElement("tr");

        headers.forEach((header) => {
            const td = document.createElement("td");

            if (header === "url") {
                const a = document.createElement("a");
                a.href = rowData[header];
                a.textContent = rowData[header];
                td.appendChild(a);
            } else {
                td.textContent = rowData[header] ?? "";
            }

            row.appendChild(td);
        });

        tbody.appendChild(row);
    });
    table.appendChild(tbody);
}
