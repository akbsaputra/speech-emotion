// charts/emotional_compass.js

const widthCompass = 800;
const heightCompass = 600;
const svgCompass = d3.select("#emotional-compass")
  .append("svg")
  .attr("width", widthCompass)
  .attr("height", heightCompass);

// Define anchor positions (circle layout)
const centerX = widthCompass / 2;
const centerY = heightCompass / 2;
const radius = 200;

const anchorEmotions = ["Pride", "Unity", "Hope", "Resolve", "Anger"];
const colorCompass = d3.scaleOrdinal()
  .domain(anchorEmotions)
  .range(["#f5b041", "#58d68d", "#5dade2", "#af7ac5", "#e74c3c"]);

const angleSlice = (2 * Math.PI) / anchorEmotions.length;

const anchorsPos = anchorEmotions.map((emotion, i) => ({
  emotion: emotion,
  x: centerX + radius * Math.cos(i * angleSlice - Math.PI/2),
  y: centerY + radius * Math.sin(i * angleSlice - Math.PI/2)
}));

// Load anchor sentences
d3.json("assets/data/anchors.json").then(data => {
  
  const points = [];
  anchorsPos.forEach(anchor => {
    const examples = data[anchor.emotion];
    examples.forEach(sentence => {
      points.push({
        emotion: anchor.emotion,
        sentence: sentence,
        x: anchor.x + (Math.random() - 0.5) * 160,
        y: anchor.y + (Math.random() - 0.5) * 160
      });
    });
  });

  // Force simulation to float sentences around anchors
  const simulation = d3.forceSimulation(points)
    .force("x", d3.forceX(d => anchorsPos.find(a => a.emotion === d.emotion).x).strength(0.2))
    .force("y", d3.forceY(d => anchorsPos.find(a => a.emotion === d.emotion).y).strength(0.2))
    .force("collide", d3.forceCollide(6))
    .on("tick", ticked);

  function ticked() {
    circles
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);
  }

  // Draw emotion anchors
  svgCompass.selectAll(".anchor")
    .data(anchorsPos)
    .enter()
    .append("circle")
    .attr("class", "anchor")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 20)
    .attr("fill", d => colorCompass(d.emotion))
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .on("mouseover", function(event, d) {
      d3.select("#tooltip")
        .style("visibility", "visible")
        .html(`<strong>${d.emotion}</strong><br>${getEmotionExplanation(d.emotion)}`);
    })
    .on("mousemove", function(event) {
      d3.select("#tooltip")
        .style("top", (event.pageY - 20) + "px")
        .style("left", (event.pageX + 20) + "px");
    })
    .on("mouseout", function() {
      d3.select("#tooltip").style("visibility", "hidden");
    });

  // Add labels
  svgCompass.selectAll(".anchor-label")
    .data(anchorsPos)
    .enter()
    .append("text")
    .attr("class", "anchor-label")
    .attr("x", d => d.x)
    .attr("y", d => d.y + 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .attr("fill", "#333")
    .text(d => d.emotion);

  // Draw floating sentences
  const circles = svgCompass.selectAll(".example")
  .data(points)
  .enter()
  .append("circle")
  .attr("class", "example")
  .attr("r", 4)
  .attr("fill", "#bbb") // Neutral gray at start
  .attr("opacity", 0.2); // Slightly faint at first


});

// Helper: emotion explanations
function getEmotionExplanation(emotion) {
  switch (emotion) {
    case "Pride": return "Celebrating national identity and ideals.";
    case "Unity": return "Emphasizing togetherness and common purpose.";
    case "Hope": return "Expressing optimism for the future.";
    case "Resolve": return "Highlighting determination and perseverance.";
    case "Anger": return "Addressing injustice and threats.";
  }
}
