const svg = d3.select("#map-svg");
    const g = svg.append("g");

    svg.call(d3.zoom().on("zoom", function (event) {
      g.attr("transform", event.transform);
    }));

    // Load and inline the external SVG file
    d3.xml("/public/maps/LAMETRO.svg").then(data => {
      const importedNode = document.importNode(data.documentElement, true);
      g.node().appendChild(importedNode);
    }).catch(error => {
      console.error("Error loading SVG:", error);
    });