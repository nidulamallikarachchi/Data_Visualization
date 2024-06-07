const width = 600;
const height = 600;
const margin = { top: 50, right: 50, bottom: 50, left: 50 };
const radius = Math.min(width, height) / 2;
const levels = 5;  // Number of concentric circles
const colors = d3.scaleOrdinal(d3.schemeCategory10);

const years = d3.range(2010, 2022);  // Array of years from 2010 to 2021
let data = [];

// Tooltip
const tooltip = d3.select("#tooltip");

d3.csv("Data/anti_bacterial_drug_sales.csv").then(csvData => {
    const nestedData = d3.groups(csvData, d => d.Country);
    nestedData.forEach(countryData => {
        const countryName = countryData[0];
        const values = {};
        countryData[1].forEach(d => {
            values[d.Year] = +d.Value;
        });
        data.push({ country: countryName, values });
    });

    populateCountryList();
    createRadarChart();
});

function populateCountryList() {
    const countryList = d3.select("#country-list");

    // Add "All Countries" option
    countryList.append("div")
        .attr("class", "country-checkbox")
        .html('<label><input type="checkbox" value="All" class="country-checkbox-input"> All Countries</label>');

    countryList.selectAll("div.country-checkbox-item")
        .data(data)
        .enter()
        .append("div")
        .attr("class", "country-checkbox-item")
        .html(d => `<label style="color:${colors(d.country)}"><input type="checkbox" value="${d.country}" class="country-checkbox-input"> ${d.country}</label>`);

    countryList.selectAll(".country-checkbox-input")
        .on("change", () => {
            const selectedCountries = [];
            countryList.selectAll(".country-checkbox-input").each(function() {
                if (this.checked) {
                    selectedCountries.push(this.value);
                }
            });
            if (selectedCountries.includes("All")) {
                createRadarChart(data.map(d => d.country));
            } else {
                createRadarChart(selectedCountries);
            }
            displaySelectedCountries(selectedCountries);
        });
}

function displaySelectedCountries(selectedCountries) {
    const selectedCountryDiv = d3.select("#selected-countries");
    selectedCountryDiv.html("");
    selectedCountries.forEach(country => {
        selectedCountryDiv.append("div")
            .style("color", colors(country))
            .text(country);
    });
}

function createRadarChart(selectedCountries = data.map(d => d.country)) {
    d3.select("#chart").selectAll("*").remove();

    const filteredData = data.filter(d => selectedCountries.includes(d.country));
    const maxValue = Math.max(...filteredData.flatMap(d => Object.values(d.values)));

    const angleSlice = (Math.PI * 2) / years.length;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${width / 2 + margin.left},${height / 2 + margin.top})`);

    for (let i = 0; i < levels; i++) {
        const r = radius / levels * (i + 1);
        svg.append("circle")
            .attr("class", "grid-circle")
            .attr("r", r)
            .style("fill", "none")
            .style("stroke", "#ccc")
            .style("stroke-dasharray", "2,2");
    }

    const axisGrid = svg.append("g").attr("class", "axisWrapper");
    axisGrid.selectAll(".axis")
        .data(years)
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", (d, i) => radius * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y2", (d, i) => radius * Math.sin(angleSlice * i - Math.PI / 2))
        .attr("class", "axis")
        .style("stroke", "#ccc")
        .style("stroke-width", "2px");

    axisGrid.selectAll(".axis-label")
        .data(years)
        .enter()
        .append("text")
        .attr("class", "axis-label")
        .attr("x", (d, i) => (radius + 10) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y", (d, i) => (radius + 10) * Math.sin(angleSlice * i - Math.PI / 2))
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("text-anchor", "middle")
        .text(d => d);

    filteredData.forEach((countryData, i) => {
        const radarLine = d3.lineRadial()
            .radius(d => radius * d.value / maxValue)
            .angle((d, i) => i * angleSlice);

        const radarData = years.map(year => ({
            year: year,
            value: countryData.values[year] || 0
        }));

        svg.append("path")
            .datum(radarData)
            .attr("class", "line")
            .attr("d", radarLine)
            .style("stroke", colors(countryData.country))
            .style("fill", colors(countryData.country))
            .style("fill-opacity", 0.1);

        // Add dots to the data points
        svg.selectAll(`.dot-${countryData.country}`)
            .data(radarData)
            .enter()
            .append("circle")
            .attr("class", `dot-${countryData.country}`)
            .attr("cx", d => radius * d.value / maxValue * Math.cos(angleSlice * years.indexOf(d.year) - Math.PI / 2))
            .attr("cy", d => radius * d.value / maxValue * Math.sin(angleSlice * years.indexOf(d.year) - Math.PI / 2))
            .attr("r", 4)
            .style("fill", colors(countryData.country))
            .style("pointer-events", "all")
            .on("mouseover", function (event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("visibility", "visible")
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
                tooltip.html(`Country: ${countryData.country}<br>Year: ${d.year}<br>Value: $${d.value.toFixed(1)} Million (USD)`);
            })
            .on("mouseout", function () {
                tooltip.transition()
                    .duration(500)
                    .style("visibility", "hidden");
            });
    });
}
