function project() {
  let filePath = "data.csv";
  question0(filePath);

  var scrollButton = document.querySelector(".scroll-button");

  var sections = document.querySelectorAll(".section");

  var currentSection = 0;

  scrollButton.addEventListener("click", function() {

      currentSection++;

      if (currentSection >= sections.length) {
          currentSection = 0;
      }

      sections[currentSection].scrollIntoView({
          behavior: "smooth"
      });

  });
}

let question0 = function(filePath) {

  d3.csv(filePath).then(function(data) {

      question1(data);
      question2(data);
      question3(data);
  });

};

let question1 = function(data) {

  let margin = {
      top: 100,
      right: 20,
      bottom: 30,
      left: 50
  };
  let width = 800 - margin.left - margin.right;
  let height = 800 - margin.top - margin.bottom;

  let svg = d3.select("#plot_1")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

  let g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  let ridesBetweenStations = {};
  data.forEach(function(d) {
      let startStation = d.start_station_name;
      let endStation = d.end_station_name;
      let key = startStation < endStation ? startStation + " - " + endStation : endStation + " - " + startStation;
      if (!ridesBetweenStations[key]) {
          ridesBetweenStations[key] = {
              count: 0,
              start: [d.start_lng, d.start_lat],
              end: [d.end_lng, d.end_lat],
              start_Station: startStation,
              end_Station: endStation
          };
      }
      ridesBetweenStations[key].count++;
  });

  let ridesPerStation = {};
  data.forEach(function(d) {
      let startStation = d.start_station_name;
      let endStation = d.end_station_name;
      if (!ridesPerStation[startStation]) {
          ridesPerStation[startStation] = {
              count: 0,
              coords: [d.start_lng, d.start_lat],
              station: startStation
          };
      }
      if (!ridesPerStation[endStation]) {
          ridesPerStation[endStation] = {
              count: 0,
              coords: [d.end_lng, d.end_lat],
              station: endStation
          };
      }
      ridesPerStation[startStation].count++;
      ridesPerStation[endStation].count++;
  });

  d3.json("chicago.geojson").then(function(geojson) {

      let projection = d3.geoMercator().fitSize([width, height], geojson);

      let path = d3.geoPath().projection(projection);

      g.selectAll("path")
          .data(geojson.features)
          .enter()
          .append("path")
          .attr("d", path)
          .attr("fill", "rgba(128,128,128,0.5)") 
          .attr("stroke", "black"); 

      d3.select("#node-threshold").on("input", function() {
          update(this.value, d3.select("#link-threshold").property("value"));
      });

      d3.select("#link-threshold").on("input", function() {
          update(d3.select("#node-threshold").property("value"), this.value);
      });

      let tooltip = d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("opacity", 0);

      let search = d3.select("#searchbar").append("input")
          .attr("type", "text")
          .attr("placeholder", "Search for a station...")
          .style("position", "relative") 

          .on("input", function() {
              update(1, 150, this.value); 
          });

      function update(nodeThreshold, linkThreshold, searchValue) {

          let filteredRidesPerStation = Object.values(ridesPerStation).filter(function(d) {
              return d.count > nodeThreshold && (!searchValue || d.station.toLowerCase().includes(searchValue.toLowerCase()));
          });

          let maxRides = d3.max(filteredRidesPerStation, function(d) {
              return d.count;
          });
          let radiusScale = d3.scaleSqrt().domain([0, maxRides]).range([3, 10]);

          let nodes = g.selectAll(".node")
              .data(filteredRidesPerStation);
          nodes.enter()
              .append("circle")
              .attr("class", "node")
              .merge(nodes)
              .attr("cx", function(d) {
                  return projection(d.coords)[0];
              })
              .attr("cy", function(d) {
                  return projection(d.coords)[1];
              })
              .attr("r", function(d) {
                  return radiusScale(d.count);
              })
              .attr("fill", "rgba(215, 195, 195,0.5)") 
              .on("mouseover", function(event, d) {
                  if (!d3.selectAll(".node").classed("selected")) { 
                      d3.select(this).transition().duration(200).attr("r", function(d) {
                          return radiusScale(d.count) * 1.2;
                      }); 
                      d3.selectAll(".node").style("opacity", 0.2); 
                      d3.select(this).style("opacity", 1); 

                      tooltip.transition()
                          .duration(200)
                          .style("opacity", 0.9); 
                      tooltip.html(d.station + ", Incoming traffic: " + d.count)
                          .style("left", (event.pageX + 10) + "px")
                          .style("top", (event.pageY - 28) + "px"); 
                  }
              })
              .on("mouseout", function() {
                  if (!d3.selectAll(".node").classed("selected")) { 
                      d3.select(this).transition().duration(200).attr("r", function(d) {
                          return radiusScale(d.count);
                      }); 
                      d3.selectAll(".node").style("opacity", 1); 

                      tooltip.transition()
                          .duration(500)
                          .style("opacity", 0); 
                  }
              })
              .on("click", function(event, d) {
                  if (d3.select(this).classed("selected")) { 
                      d3.select(this).classed("selected", false); 
                      d3.selectAll(".link").style("opacity", 0); 
                      d3.selectAll(".node").style("opacity", 1); 
                  } else { 
                      d3.selectAll(".node").classed("selected", false); 
                      d3.select(this).classed("selected", true); 
                      d3.selectAll(".link").style("opacity", function(linkData) {
                          if (linkData.start_Station === d.station) {
                              return 1; 
                          } else {
                              return 0; 
                          }
                      });
                      d3.selectAll(".node").style("opacity", function(nodeData) {
                          if (nodeData.station === d.station) {
                              return 1; 
                          } else {
                              return 0.2; 
                          }
                      });
                  }
              });
          nodes.exit().remove();

          let line = d3.line()
              .x(function(d) {
                  return projection(d)[0];
              })
              .y(function(d) {
                  return projection(d)[1];
              })
              .curve(d3.curveBundle.beta(1)); 

          let filteredRidesBetweenStations = Object.values(ridesBetweenStations).filter(function(d) {
              return d.count > linkThreshold;
          });

          let maxRidesBetweenStations = d3.max(filteredRidesBetweenStations, function(d) {
              return d.count;
          });
          let strokeColorScale = d3.scaleLinear().domain([0, maxRidesBetweenStations]).range(["green", "red"]);

          let links = g.selectAll(".link")
              .data(filteredRidesBetweenStations);
          links.enter()
              .append("path")
              .attr("class", "link")
              .merge(links)
              .attr("d", function(d) {
                  return line([d.start, d.end]);
              })
              .attr("fill", "none") 
              .attr("stroke", function(d) {
                  return strokeColorScale(d.count);
              }) 
              .style("opacity", 1) 
              .on("mouseover", function(event, d) {
                  if (!d3.selectAll(".node").classed("selected")) { 
                      d3.select(this).style("stroke-width", "3px"); 
                      d3.select(this).style("stroke", "orange"); 
                      d3.selectAll(".link").style("opacity", 0.2); 
                      d3.select(this).style("opacity", 1); 

                      tooltip.transition()
                          .duration(200)
                          .style("opacity", 0.9); 
                      tooltip.html(d.start_Station + " - " + d.end_Station + ", Traffic between: " + d.count)
                          .style("left", (event.pageX + 10) + "px")
                          .style("top", (event.pageY - 28) + "px"); 
                  }
              })
              .on("mouseout", function() {
                  if (!d3.selectAll(".node").classed("selected")) { 
                      d3.select(this).style("stroke-width", "1.5px"); 
                      d3.select(this).style("stroke", function(d) {
                          return strokeColorScale(d.count);
                      }); 
                      d3.selectAll(".link").style("opacity", 1); 

                      tooltip.transition()
                          .duration(500)
                          .style("opacity", 0); 
                  }
              });
          links.exit().remove();

          svg.call(d3.zoom()
              .extent([
                  [0, 0],
                  [width, height]
              ])
              .scaleExtent([1, 8])
              .on("zoom", function(event) {
                  g.attr("transform", event.transform);
              }));
      }

      update(1, 50); 

  });
  var legend = d3.select("#legend")
      .append("svg")
      .attr("width", 1000)
      .attr("height", 130)

  var circleData = [4, 8, 12];
  var circle = legend.selectAll("circle")
      .data(circleData)
      .enter()
      .append("circle")
      .attr("cx", function(d, i) {
          return (i + 5) * 50;
      })
      .attr("cy", 95)
      .attr("r", function(d) {
          return d;
      })
      .style("fill", "rgb(215, 195, 195")
      .style("stroke", "#ffffffcc");

  legend.append("text")
      .attr("x", 50)
      .attr("y", 100)
      .text("Incoming Traffic Volume");

  legend.append("rect")
      .attr("class", "legend-background")
      .attr("x", 29)
      .attr("y", 50)
      .attr("width", 810)
      .attr("height", 70)
      .style("fill", "none")
      .style("stroke", "#ffffffcc");

  var gradient = legend.append("defs")
      .append("linearGradient")
      .attr("id", "gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

  gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "green");

  gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "red");

  legend.append("rect")
      .attr("x", 670)
      .attr("y", 91)
      .attr("width", 150)
      .attr("height", 10)
      .style("fill", "url(#gradient)")
      .style("stroke", "#ffffffcc");

  legend.append("text")
      .attr("x", 390)
      .attr("y", 100)
      .text("Intensity of Traffic Between Stations: ");
  legend.attr("transform", "translate(-30,-15)");
}

let question2 = function(data) {

  let groupedData = d3.group(data, d => d.rideable_type);

  let rideableTypes = Array.from(groupedData.keys());

  const margin = {
      top: 50,
      right: 150,
      bottom: 50,
      left: 60
  };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const counts = Array.from(groupedData.entries(), ([type, values]) => {
      const countsPerDay = Array(7).fill(0);
      values.forEach(d => countsPerDay[+d.day_of_week - 1]++);
      return {
          type,
          countsPerDay
      };
  });

  const maxCount = d3.max(counts, d => d3.max(d.countsPerDay));

  const svg = d3
      .select("#plot_2")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const x = d3.scaleLinear().domain(d3.extent(data, function(d) {
          return d.day_of_week;
      }))
      .range([0, width]);

  let y = d3.scaleLinear().range([height, 0]).domain([0, maxCount]);

  let color = d3.scaleOrdinal().domain(rideableTypes).range(d3.schemeCategory10);

  svg
      .append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x).ticks(7));

  svg.append("g").attr("class", "y-axis").call(d3.axisLeft(y));

  const line = d3.line()
      .x((d, i) => x(i + 1))
      .y(d => y(d));

  let groups = svg.selectAll(".line-group")
      .data(counts)
      .enter()
      .append("g")
      .attr("class", "line-group");

  groups.append("path")
      .attr("class", "line")
      .attr("d", d => line(d.countsPerDay))
      .style("stroke", d => color(d.type))
      .style("fill", "none");

  groups.selectAll(".dot")
      .data(d => d.countsPerDay)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d, i) => x(i + 1))
      .attr("cy", d => y(d))
      .attr("r", 3)
      .style("fill", d => color(d.type));

  const toggle = d3.select("#plot_2")
      .append("div")
      .attr("class", "toggle")
      .style("text-align", "left")
      .text("Show data for: ")

  toggle.append("label")
      .attr("for", "members")
      .text("Members");

  toggle.append("input")
      .attr("type", "radio")
      .attr("name", "toggle")
      .attr("id", "members")
      .attr("value", "member")
      .property("checked", true);

  toggle.append("label")
      .attr("for", "casuals")
      .text("Casuals");

  toggle.append("input")
      .attr("type", "radio")
      .attr("name", "toggle")
      .attr("id", "casuals")
      .attr("value", "casual");

  let filteredData = data.filter(d => d.member_casual === "member");

  d3.selectAll(".toggle input").on("change", function() {
      filteredData = data.filter(d => d.member_casual === this.value);
      updateChart();
  });

  const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", "translate(" + (width + margin.right / 1.2) + "," + margin.top + ")");

  legend.append("text")
      .attr("class", "legend-title")
      .attr("x", 10)
      .attr("y", -10)
      .style("text-anchor", "end")
      .text("Bike Type");

  legend.append("rect")
      .attr("class", "legend-background")
      .attr("x", -60)
      .attr("y", -30)
      .attr("width", 85)
      .attr("height", 55)
      .style("fill", "none")
      .style("stroke", "#ffffffcc");

  svg.append("text")
      .attr("x", (width / 2))
      .attr("y", 0 - (margin.top / 2))
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Ride Count by Day of Week Per Member Type");

  svg.append("text")
      .attr("transform",
          "translate(" + (width / 2) + " ," +
          (height + margin.top - 5) + ")")
      .style("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Day of Week");

  svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left - 5)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Ride Count");

  function updateLegend() {

      color.domain(rideableTypes);
      const items = legend.selectAll(".legend-item")
          .data(color.domain());

      const newItems = items.enter()
          .append("g")
          .attr("class", "legend-item")
          .attr("transform", (d, i) => "translate(0," + i * 20 + ")");

      newItems.append("rect")
          .attr("width", 18)
          .attr("height", 18)
          .style("fill", color);

      newItems.append("text")
          .attr("x", -56)
          .attr("y", 9)
          .attr("dy", ".35em")
          .style("text-anchor", "beginning")
          .text(d => String(d).charAt(0).toUpperCase() + String(d).slice(1).replace("_bike", ""));

      items.exit().remove();

      const height = color.domain().length * 20 + 35;
      legend.select(".legend-background").attr("height", height);
  }

  updateLegend();

  function updateChart() {

      let groupedData = d3.group(filteredData, d => d.rideable_type);

      let rideableTypes = Array.from(groupedData.keys());

      const counts = Array.from(groupedData.entries(), ([type, values]) => {
          const countsPerDay = Array(7).fill(0);
          values.forEach(d => countsPerDay[+d.day_of_week - 1]++);
          return {
              type,
              countsPerDay
          };
      });

      const maxCount = d3.max(counts, d => d3.max(d.countsPerDay));

      y.domain([0, maxCount]);

      svg.select(".y-axis").transition().duration(1000).call(d3.axisLeft(y));

      groups = svg.selectAll(".line-group")
          .data(counts);

      const newGroups = groups.enter()
          .append("g")
          .attr("class", "line-group");

      newGroups.append("path")
          .attr("class", "line")
          .attr("d", d => line(d.countsPerDay))
          .style("stroke", d => color(d.type))
          .style("fill", "none");

      groups.select(".line")
          .on("mouseover", function(event, d) {

              tooltip.transition().duration(200).style("opacity", 0.9);
              tooltip.html(d.type.charAt(0).toUpperCase() + d.type.slice(1).replace("_bike", ""))
                  .style("left", (event.pageX - tooltip.node().offsetWidth * 10.5) + "px")
                  .style("top", (event.pageY - tooltip.node().offsetHeight - 20) + "px");
              console.log(tooltip.node().offsetWidth)

              d3.select(this)
                  .style("stroke", "black")
                  .style("stroke-width", 3);
          })
          .on("mouseout", function(event, d) {

              tooltip.transition().duration(500).style("opacity", 0);

              d3.select(this)
                  .style("stroke", color(d.type))
                  .style("stroke-width", 1.5);
          });

      newGroups.select(".line")
          .on("mouseover", function(event, d) {

              tooltip.transition().duration(200).style("opacity", 0.9);
              tooltip.html(d.type.charAt(0).toUpperCase() + d.type.slice(1).replace("_bike", ""))
                  .style("left", (event.pageX - tooltip.node().offsetWidth * 10.5) + "px")
                  .style("top", (event.pageY - tooltip.node().offsetHeight - 20) + "px");

              d3.select(this)
                  .style("stroke", "black")
                  .style("stroke-width", 3);
          })
          .on("mouseout", function(event, d) {

              tooltip.transition().duration(500).style("opacity", 0);

              d3.select(this)
                  .style("stroke", color(d.type))
                  .style("stroke-width", 1.5);
          });

      newGroups.selectAll(".dot")
          .data(d => d.countsPerDay)
          .enter()
          .append("circle")
          .attr("class", "dot")
          .attr("cx", (d, i) => x(i + 1))
          .attr("cy", d => y(d))
          .attr("r", 3)
          .style("fill", d => color(d.type));

      newGroups.selectAll(".dot")
          .on("mouseover", function(event, d) {

              tooltip.transition().duration(200).style("opacity", 0.9);
              tooltip.html("Ride Count: " + d)
                  .style("left", (event.pageX - tooltip.node().offsetWidth * 5.75) + "px")
                  .style("top", (event.pageY - tooltip.node().offsetHeight - 20) + "px");
          })
          .on("mouseout", function() {

              tooltip.transition().duration(500).style("opacity", 0);
          });

      groups.selectAll(".dot")
          .on("mouseover", function(event, d) {

              tooltip.transition().duration(200).style("opacity", 0.9);
              tooltip.html("Ride Count: " + d)
                  .style("left", (event.pageX - tooltip.node().offsetWidth * 4.75) + "px")
                  .style("top", (event.pageY - tooltip.node().offsetHeight - 20) + "px");
          })
          .on("mouseout", function() {

              tooltip.transition().duration(500).style("opacity", 0);
          });

      groups.select(".line")
          .transition()
          .duration(1000)
          .attr("d", d => line(d.countsPerDay))
          .style("stroke", d => color(d.type));

      const dots = groups.selectAll(".dot")
          .data(d => d.countsPerDay);

      dots.transition()
          .duration(1000)
          .attr("cx", (d, i) => x(i + 1))
          .attr("cy", d => y(d))
          .style("fill", d => color(d.type));

      dots.enter()
          .append("circle")
          .attr("class", "dot")
          .attr("cx", (d, i) => x(i + 1))
          .attr("cy", d => y(d))
          .attr("r", 3)
          .style("fill", d => color(d.type));

      dots.exit().remove();

      groups.exit().remove();
  }

  const tooltip = d3.select("#plot_2")
      .append("div")
      .attr("class", "tooltip2")
      .style("opacity", 0);

  updateChart();

};

let question3 = function(data) {

  var margin = {
          top: 20,
          right: 20,
          bottom: 70,
          left: 70
      },
      width = 760 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

  var svg = d3.select("#plot_0")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

  var parseDate = d3.timeParse("%m/%d/%Y %H:%M");

  data.forEach(function(d) {
      d.started_at = parseDate(d.started_at);
  });

  var trafficByDay = d3.group(data, d => d.started_at.getDate());

  var trafficData = Array.from(trafficByDay, ([day, rides]) => ({
      day: day,
      traffic: rides.length
  }));
  trafficData.sort((a, b) => a.day - b.day);

  var x = d3.scaleBand()
      .range([0, width])
      .padding(0.1);
  var y = d3.scaleLinear()
      .range([height, 0]);

  x.domain(trafficData.map(function(d) {
      return d.day;
  }));
  y.domain([0, d3.max(trafficData, function(d) {
      return d.traffic;
  })]);

  svg.selectAll(".bar")
      .data(trafficData)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) {
          return x(d.day);
      })
      .attr("width", x.bandwidth())
      .attr("y", function(d) {
          return y(d.traffic);
      })
      .attr("height", function(d) {
          return height - y(d.traffic);
      });

  svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("y", 0)
      .attr("x", 9)
      .attr("dy", ".35em")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "start");

  svg.append("g")
      .call(d3.axisLeft(y));

  svg.append("text")
      .attr("transform",
          "translate(" + (width / 2.1) + " ," +
          (height + margin.top + 20) + ")")
      .style("text-anchor", "middle")
      .text("Day of Month");

  svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 12)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Traffic Count");

  svg.append("text")
      .attr("x", (width / 2.1))
      .attr("y", 0 - (margin.top / 3))
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Day of Month vs. Traffic Count");
}