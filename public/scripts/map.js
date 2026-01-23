var map = L.map('map', {
    center: [34,-88],
    zoom: 4
});
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
async function loadData(map)