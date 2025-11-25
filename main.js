// Waiting until document has loaded
window.onload = () => {

  // YOUR CODE GOES HERE
  // Attributes for scatter matrix
  const dims = [
    "Engine Size (l)",
    "Horsepower(HP)",
    "City Miles Per Gallon",
    "Highway Miles Per Gallon"
  ];

  // Attributes for detail table
  const detailAttrs = [
    "Name",
    "Engine Size (l)",
    "Horsepower(HP)",
    "City Miles Per Gallon",
    "Highway Miles Per Gallon",
    "Retail Price"
  ];

  // Expanded cell size
  const size = 420;
  const padding = 70;

  // D3 symbols by Type
  const symbol = d3.symbol();
  const typeSymbols = {
    "Sedan": d3.symbolCircle,      // 기존 유지
    "SUV": d3.symbolStar,          // ★ 완전히 다른, 잘 보이는 도형으로 변경
    "Sports Car": d3.symbolDiamond,
    "Wagon": d3.symbolSquare,
    "Pickup": d3.symbolTriangle,   // 기존 triangle 도형을 Pickup에게 이동
    "Minivan": d3.symbolCross,     // Sedan과 중복 방지 → cross로 변경
    "Other": d3.symbolWye          // cross를 Minivan에게 줬으니 여기엔 wye 배치
  };


  const color = d3.scaleOrdinal(d3.schemeSet2);

  d3.csv("cars.csv").then(data => {
    data.forEach(d => {
      dims.forEach(a => d[a] = +d[a]);
      d["Retail Price"] = +d["Retail Price"];
    });

    const svg = d3.select("#matrix")
      .append("svg")
      .attr("width", dims.length * size + 300)
      .attr("height", dims.length * size);

    const scales = {};
    dims.forEach(attr => {
      scales[attr] = d3.scaleLinear()
        .domain(d3.extent(data, d => d[attr]))
        .range([padding, size - padding]);
    });

    // Draw only Upper Triangle (col > row)
    dims.forEach((yAttr, row) => {
      dims.forEach((xAttr, col) => {

        if (col <= row) return;

        const cell = svg.append("g")
          .attr("class", "cell")
          .attr("transform", `translate(${col * size}, ${row * size})`);

        cell.append("rect")
          .attr("width", size)
          .attr("height", size);

        // Axes
        const xAxis = d3.axisBottom(scales[xAttr]).ticks(6);
        cell.append("g")
          .attr("transform", `translate(0, ${size - padding})`)
          .call(xAxis);

        const yAxis = d3.axisLeft(scales[yAttr]).ticks(6);
        cell.append("g")
          .attr("transform", `translate(${padding}, 0)`)
          .call(yAxis);

        // Axis labels
        cell.append("text")
          .attr("x", size / 2)
          .attr("y", size - 25)
          .attr("text-anchor", "middle")
          .style("font-size", "13px")
          .style("font-weight", "600")
          .text(xAttr);

        cell.append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -size / 2)
          .attr("y", 25)
          .attr("text-anchor", "middle")
          .style("font-size", "13px")
          .style("font-weight", "600")
          .text(yAttr);

        // Cell title
        cell.append("text")
          .attr("x", size / 2)
          .attr("y", 30)
          .attr("text-anchor", "middle")
          .style("font-size", "15px")
          .style("font-weight", "700")
          .text(`${yAttr} vs ${xAttr}`);

        // Draw points
        cell.selectAll(".point")
          .data(data)
          .enter()
          .append("path")
          .attr("class", "point")
          .attr("transform", d =>
            `translate(${scales[xAttr](d[xAttr])}, ${scales[yAttr](d[yAttr])})`
          )
          .attr("d", d => {
            const type = typeSymbols[d.Type] || typeSymbols["Other"];
            symbol.type(type).size(100);
            return symbol();
          })
          .attr("fill", d => color(d.Type))
          .attr("fill-opacity", 0.6)
          .on("click", function (d) {
            d3.selectAll(".point").classed("selected", false);
            d3.select(this).classed("selected", true);

            updateTable(d);
            drawStarplot(d);
          });

      });
    });

    // Legend
    const legend = svg.append("g")
      .attr("transform", `translate(${dims.length * size + 40}, 40)`);

    const types = [...new Set(data.map(d => d.Type))];

    types.forEach((t, i) => {
      const g = legend.append("g")
        .attr("transform", `translate(0, ${i * 28})`);

      g.append("path")
        .attr("d", d3.symbol().type(typeSymbols[t]).size(140)())
        .attr("fill", color(t));

      g.append("text")
        .attr("x", 24)
        .attr("y", 6)
        .style("font-size", "14px")
        .text(t);
    });

    // --- Detail table ---
    function updateTable(d) {
      const table = d3.select("#info-table");
      table.html("");

      detailAttrs.forEach(attr => {
        const row = table.append("tr");
        row.append("td").text(attr);
        row.append("td").text(d[attr]);
      });
    }

    // --- Starplot (FIXED: no clipping) ---
    const starSvg = d3.select("#starplot")
      .attr("width", 350)
      .attr("height", 350);

    const starCenter = 175;
    const starSize = 140;
    const starAttrs = detailAttrs.slice(1);

    function drawStarplot(d) {
      starSvg.selectAll("*").remove();

      const angleSlice = (2 * Math.PI) / starAttrs.length;

      const scales = {};
      starAttrs.forEach(attr => {
        scales[attr] = d3.scaleLinear()
          .domain(d3.extent(data, v => v[attr]))
          .range([0, starSize]);
      });

      const points = starAttrs.map((attr, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const r = scales[attr](d[attr]);
        return [
          starCenter + r * Math.cos(angle),
          starCenter + r * Math.sin(angle)
        ];
      });

      starSvg.append("polygon")
        .attr("points", points.join(" "))
        .attr("fill", "rgba(0, 128, 255, 0.3)")
        .attr("stroke", "#0066cc")
        .attr("stroke-width", 2);

      starAttrs.forEach((attr, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const x = starCenter + starSize * Math.cos(angle);
        const y = starCenter + starSize * Math.sin(angle);

        starSvg.append("line")
          .attr("x1", starCenter)
          .attr("y1", starCenter)
          .attr("x2", x)
          .attr("y2", y)
          .attr("stroke", "#aaa");

        starSvg.append("text")
          .attr("x", x)
          .attr("y", y)
          .attr("dy", "0.35em")
          .style("font-size", "11px")
          .style("text-anchor", "middle")
          .text(attr);
      });
    }
  });









  // Load the data set from the assets folder:

};
