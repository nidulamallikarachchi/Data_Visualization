
// Set the dimensions and margins of the graph
const margin = {top: 30, right: 150, bottom: 50, left: 70},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

// Parse the year
const parseYear = d3.timeParse("%Y");

// Set up scales
const x = d3.scaleTime().range([0, width]);
const yTB = d3.scaleLinear().range([height, 0]);
const ySales = d3.scaleLinear().range([height, 0]);

// Set up axes
const xAxis = d3.axisBottom(x).ticks(12);
const yAxisLeft = d3.axisLeft(yTB);
const yAxisRight = d3.axisRight(ySales);

// Set up line generators
const lineTB = d3.line()
    .x(d => x(d.year))
    .y(d => yTB(d.value));

const lineSales = d3.line()
    .x(d => x(d.year))
    .y(d => ySales(d.value));

// Append the svg object to the body of the page
const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Load the TB data
d3.csv("Data/TB_Data.csv").then(tbData => {

    // Filter and reshape TB data
    let tbFiltered = tbData.filter(d => d.COU !== "" && d.Country !== "");
    tbFiltered = tbFiltered.map(d => {
        return {
            country: d.Country,
            data: Object.keys(d).slice(2).map(key => {
                return {year: parseYear(key), value: +d[key]}
            }).filter(d => d.year >= parseYear(2010) && d.year <= parseYear(2021))
        }
    });

    // Load the sales data
    d3.csv("Data/Sales_Of_Anti_Bacterial_Drugs_OECD.csv").then(salesData => {

        // Filter and reshape sales data
        let salesFiltered = salesData.filter(d => d.COU !== "" && d.Country !== "");
        salesFiltered = salesFiltered.map(d => {
            return {
                country: d.Country,
                data: salesData.filter(s => s.Country === d.Country && s.Year >= 2010 && s.Year <= 2021)
                    .map(s => ({year: parseYear(s.Year), value: +s.Value}))
            }
        });

        // Merge data by country
        const countries = [...new Set(salesFiltered.map(d => d.country).filter(country => tbFiltered.some(d => d.country === country)))];
        const mergedData = countries.map(country => {
            return {
                country: country,
                tbData: tbFiltered.find(d => d.country === country).data,
                salesData: salesFiltered.find(d => d.country === country).data
            }
        });

        // Populate the country select dropdown
        const countrySelect = d3.select("#country-select");
        countries.forEach(country => {
            countrySelect.append("option")
                .attr("value", country)
                .text(country);
        });

        // Set the domains
        x.domain([parseYear(2010), parseYear(2021)]);
        yTB.domain([0, d3.max(mergedData, d => d3.max(d.tbData, d => d.value))]);
        ySales.domain([0, d3.max(mergedData, d => d3.max(d.salesData, d => d.value))]);

        // Append axes
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
            .append("text")
            .attr("x", width / 2)
            .attr("y", 40)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("Year");

        svg.append("g")
            .call(yAxisLeft)
            .append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -50)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("TB Cases");

        svg.append("g")
            .call(yAxisLeft)
            .append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", (-height / 2))
            .attr("y", -50+20)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("(Per 100,000 Population)");

        svg.append("g")
            .attr("transform", "translate(" + width + " ,0)")
            .call(yAxisRight)
            .append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", 60)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("Sales of Anti-Bacterial Drugs");

        svg.append("g")
            .attr("transform", "translate(" + width + " ,0)")
            .call(yAxisRight)
            .append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", 80)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("($ Million USD)");

        // Tooltip
        const tooltip = d3.select("#tooltip");

        // Function to update the chart
        const updateChart = selectedCountry => {
            // Clear previous lines and dots
            svg.selectAll(".line").remove();
            svg.selectAll(".dotTB").remove();
            svg.selectAll(".dotSales").remove();

            // Get the data for the selected country
            const countryData = mergedData.find(d => d.country === selectedCountry);

            // Add TB data line
            svg.append("path")
                .datum(countryData.tbData)
                .attr("class", "line")
                .attr("d", lineTB)
                .style("stroke", "steelblue")
                .style("stroke-width", 1.5);

            // Add Sales data line
            svg.append("path")
                .datum(countryData.salesData)
                .attr("class", "line")
                .attr("d", lineSales)
                .style("stroke", "red")
                .style("stroke-width", 1.5);

            // Add interactive dots for TB data
            svg.selectAll(".dotTB")
                .data(countryData.tbData)
                .enter().append("circle")
                .attr("class", "dotTB")
                .attr("cx", d => x(d.year))
                .attr("cy", d => yTB(d.value))
                .attr("r", 4)
                .style("fill", "steelblue")
                .style("pointer-events", "all")
                .on("mouseover", (event, d) => {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html(selectedCountry + "<br/>" + "Year: " + d3.timeFormat("%Y")(d.year) + "<br/>" + "TB Cases: " + d.value)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", () => {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });

            // Add interactive dots for Sales data
            svg.selectAll(".dotSales")
                .data(countryData.salesData)
                .enter().append("circle")
                .attr("class", "dotSales")
                .attr("cx", d => x(d.year))
                .attr("cy", d => ySales(d.value))
                .attr("r", 4)
                .style("fill", "red")
                .style("pointer-events", "all")
                .on("mouseover", (event, d) => {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html(selectedCountry + "<br/>" + "Year: " + d3.timeFormat("%Y")(d.year) + "<br/>" + "Sales: $" + d.value.toFixed(1) + " Million")
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", () => {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });
        };

        // Initial chart update
        updateChart(countries[0]);

        // Update chart on country selection change
        countrySelect.on("change", function(event) {
            const selectedCountry = d3.select(this).property("value");
            updateChart(selectedCountry);
        });

    });
});
