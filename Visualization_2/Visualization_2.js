const svg = d3.select("svg")
    .attr("width", 1400)
    .attr("height", 700);

const width = 1400,
    height = 700,
    tooltip = d3.select(".tooltip");

// Add a blue background to the SVG for the sea
svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "#87CEEB");  // Light blue color for the sea

const projection = d3.geoMercator().scale(200).translate([width / 2, (height / 2) + 100]);
const path = d3.geoPath().projection(projection);
const colorScale = d3.scaleThreshold()
    .domain([0, 50, 100, 150, 200, 250, 300, 350, 400])
    .range([
        "#ffdada", "#ffbebe", "#fd6d6d", "#fd2525", "#E10000", "#AA0000", "#8B0000"
    ]);

Promise.all([
    d3.json("Data/World_Map.json"),
    d3.csv("Data/TB_Data.csv")
]).then(function ([world, data]) {
    console.log("World data:", world);
    console.log("Tuberculosis Incidence data:", data);

    const years = Object.keys(data[0]).filter(d => d.match(/^\d{4}$/));
    d3.select("#year-select")
        .selectAll("option")
        .data(years)
        .enter()
        .append("option")
        .text(d => d);

    world.features.forEach(feat => {
        feat.properties.data = {};
        data.forEach(d => {
            if (d.COU === feat.properties.adm0_a3) {
                years.forEach(year => {
                    feat.properties.data[year] = +d[year];
                });
            }
        });
    });

    updateMap("2022"); // Default selection

    document.getElementById("year-select").addEventListener("change", function () {
        updateMap(this.value);
    });

    function updateMap(year) {
        const incidences = world.features.map(f => f.properties.data[year] || 0);
        console.log(`Incidences for ${year}:`, incidences);

        svg.selectAll("path")
            .data(world.features)
            .join("path")
            .attr("d", path)
            .style("fill", d => {
                const value = d.properties.data[year];
                return value ? colorScale(value) : '#ccc';
            })
            .attr("stroke", "black")
            .attr("stroke-width", 0.5)
            .on("mouseover", function (event, d) {
                d3.select(this).classed("highlight", true);
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html("Country: " + d.properties.name + "<br/>Incidence: " + (d.properties.data[year] || "No data") + " per 100,000 people");
            })
            .on("mousemove", function (event) {
                const [x, y] = d3.pointer(event);
                tooltip.style("left", (x + 10) + "px")
                    .style("top", (y + 10) + "px");
            })
            .on("mouseout", function () {
                d3.select(this).classed("highlight", false);
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    }
});

function toggleFullScreen() {
    const chartContainer = document.querySelector('.visualization');
    if (!document.fullscreenElement) {
        chartContainer.requestFullscreen().catch(err => {
            alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
}
