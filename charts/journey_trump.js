// charts/journey_trump.js

(function() {
    // --- 1. CONFIGURATION & SETUP ---
    const containerId = "#journey-trump";
    const bottomCaptionId = "#trump-bottom-caption";

    const container = document.querySelector(containerId);
    const width = container ? container.getBoundingClientRect().width : 800; 
    const height = 150; 
    const margin = { top: 20, right: 30, bottom: 30, left: 30 };

    const svg = d3.select(`${containerId} svg`)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("width", "100%")
        .style("height", "auto")
        .style("overflow", "visible");

    const EMOTION_COLORS = {
        "pride": "#f5b041", 
        "unity": "#58d68d", 
        "hope": "#5dade2", 
        "resolve": "#af7ac5", 
        "anger": "#e74c3c",
        "neutral": "#cccccc"
    };
    
    const getColor = (emo) => EMOTION_COLORS[emo ? emo.toLowerCase() : "neutral"] || "#cccccc";

    let currentView = 'timeline';

    // --- 2. LOAD DATA ---
    d3.json("assets/data/timelines/trump_2017.json").then(data => {
        renderTrumpChart(data);
    }).catch(err => {
        console.error("Error loading Trump data:", err);
    });

    function renderTrumpChart(data) {
        // --- PRE-CALCULATIONS FOR GROUPED VIEW ---
        const counts = {};
        data.forEach(d => {
            const emo = d.emotion || "Neutral";
            counts[emo] = (counts[emo] || 0) + 1;
        });

        const sortedEmotions = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
        const bandWidth = (width - margin.left - margin.right) / data.length;
        
        let currentX = margin.left;
        const groupMeta = {}; 

        sortedEmotions.forEach(emo => {
            const emotionChunks = data.filter(d => (d.emotion || "Neutral") === emo);
            const groupWidth = emotionChunks.length * bandWidth;
            groupMeta[emo] = {
                x: currentX + (groupWidth / 2),
                count: emotionChunks.length
            };
            emotionChunks.forEach((d, i) => {
                d.groupedX = currentX + (i * bandWidth);
            });
            currentX += groupWidth;
        });

        // --- SCALES FOR TIMELINE ---
        const xScaleTimeline = d3.scaleBand()
            .domain(data.map((d, i) => i))
            .range([margin.left, width - margin.right])
            .padding(0.1);

        const barHeight = 35;
        const yPos = height / 2 - barHeight / 2;

        // --- DRAW STRIPES (BARS) ---
        const bars = svg.append("g")
            .selectAll(".trump-stripe")
            .data(data)
            .join("rect")
            .attr("class", "trump-stripe") // Distinct class for Trump
            .attr("x", (d, i) => xScaleTimeline(i))
            .attr("y", yPos)
            .attr("width", xScaleTimeline.bandwidth())
            .attr("height", barHeight)
            .attr("fill", d => getColor(d.emotion))
            .attr("opacity", 1)
            .property("chunk_index", (d, i) => d.chunk_index); // Bind chunk index property

        // --- DRAW LABELS ---
        const axisLabels = svg.append("g").attr("class", "trump-axis-labels");
        axisLabels.append("text").attr("x", margin.left).attr("y", yPos + barHeight + 15).text("Start").attr("font-size", "10px").attr("fill", "#999");
        axisLabels.append("text").attr("x", width - margin.right).attr("y", yPos + barHeight + 15).attr("text-anchor", "end").text("End").attr("font-size", "10px").attr("fill", "#999");

        const groupLabels = svg.append("g").attr("class", "trump-group-labels").style("opacity", 0);
        sortedEmotions.forEach(emo => {
            if (groupMeta[emo].count > 0) {
                groupLabels.append("text")
                    .attr("class", "group-label")
                    .attr("x", groupMeta[emo].x)
                    .attr("y", yPos - 10)
                    .text(emo)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "12px")
                    .attr("font-weight", "bold")
                    .attr("fill", getColor(emo));
            }
        });

        // --- EXPOSE FUNCTIONS ---
        window.trumpTransitionToGrouped = function() {
            if (currentView === 'grouped') return;
            currentView = 'grouped';

            // Bars Move
            bars.transition().duration(1000)
                .attr("x", d => d.groupedX)
                .attr("width", bandWidth - 0.5)
                .attr("opacity", 1); // Ensure they are visible

            // Labels Swap
            axisLabels.transition().duration(500).style("opacity", 0);
            groupLabels.transition().delay(800).duration(500).style("opacity", 1);

            // Caption
            d3.select(bottomCaptionId).style("opacity", 1);
        };

        window.trumpTransitionToTimeline = function() {
            if (currentView === 'timeline') return;
            currentView = 'timeline';

            // Bars Move Back
            bars.transition().duration(1000)
                .attr("x", (d, i) => xScaleTimeline(i))
                .attr("width", xScaleTimeline.bandwidth());

            // Labels Swap
            groupLabels.transition().duration(300).style("opacity", 0);
            axisLabels.transition().delay(800).duration(500).style("opacity", 1);

            // Caption
            d3.select(bottomCaptionId).style("opacity", 0);
        };
    }
})();