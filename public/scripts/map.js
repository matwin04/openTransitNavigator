const svg = d3.select("#map-svg");
    const g = svg.append("g");

    svg.call(d3.zoom().on("zoom", function (event) {
      g.attr("transform", event.transform);
    }));

    const loadMap = (filename) => {
      g.selectAll("*").remove(); // Clear previous map
      d3.xml(`/public/maps/${filename}`).then(data => {
        const importedNode = document.importNode(data.documentElement, true);
        g.node().appendChild(importedNode);
      }).catch(error => {
        console.error("Error loading SVG:", error);
      });
    };

    // Load initial map
    loadMap(document.getElementById("map-select").value);

    // Change map when selection changes
    document.getElementById("map-select").addEventListener("change", function () {
      loadMap(this.value);
    });