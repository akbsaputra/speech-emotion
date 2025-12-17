(function() {
    const container = document.querySelector("#journey-single-speech");
    const width = 800; 
    const height = 150; 
    const margin = { top: 20, right: 30, bottom: 30, left: 30 };

    const svg = d3.select("#journey-single-speech svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("width", "100%")
        .style("height", "auto")
        .style("overflow", "visible");

    const emotionColors = d3.scaleOrdinal()
        .domain(["Pride", "Unity", "Hope", "Resolve", "Anger", "Neutral"])
        .range(["#f5b041", "#58d68d", "#5dade2", "#af7ac5", "#e74c3c", "#e0e0e0"]);

    let currentView = 'timeline';
    
    d3.json("assets/data/timelines/obama_2009.json").then(data => {
        
        // --- PRE-CALCULATIONS ---
        const counts = {};
        data.forEach(d => { counts[d.emotion] = (counts[d.emotion] || 0) + 1; });
        const sortedEmotions = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
        const bandWidth = (width - margin.left - margin.right) / data.length;
        
        let currentX = margin.left;
        const groupMeta = {}; 

        sortedEmotions.forEach(emo => {
            const emotionChunks = data.filter(d => d.emotion === emo);
            const groupWidth = emotionChunks.length * bandWidth;
            
            // Store width for overlap check later
            groupMeta[emo] = { 
                x: currentX + (groupWidth / 2), 
                count: emotionChunks.length,
                width: groupWidth 
            };
            
            emotionChunks.forEach((d, i) => { d.groupedX = currentX + (i * bandWidth); });
            currentX += groupWidth; 
        });

        // --- SCALES ---
        const xScaleTimeline = d3.scaleBand()
            .domain(data.map(d => d.chunk_index)) 
            .range([margin.left, width - margin.right])
            .padding(0.1);

        const barHeight = 35;
        const yPos = height / 2 - barHeight / 2;

        // --- DRAW ---
        const bars = svg.append("g")
            .selectAll(".stripe")
            .data(data)
            .join("rect")
            .attr("class", "stripe")
            .attr("x", d => xScaleTimeline(d.chunk_index))
            .attr("y", yPos)
            .attr("width", xScaleTimeline.bandwidth())
            .attr("height", barHeight)
            .attr("fill", d => emotionColors(d.emotion))
            .attr("opacity", 1)
            .property("chunk", d => d.chunk_index); 

        // --- LABELS ---
        const axisLabels = svg.append("g").attr("class", "axis-labels");
        axisLabels.append("text").attr("x", margin.left).attr("y", yPos + barHeight + 15).text("Start").attr("font-size", "10px").attr("fill", "#999");
        axisLabels.append("text").attr("x", width - margin.right).attr("y", yPos + barHeight + 15).attr("text-anchor", "end").text("End").attr("font-size", "10px").attr("fill", "#999");

        // --- GROUP LABELS ---
        const groupLabels = svg.append("g").attr("class", "group-labels").style("opacity", 0);
        
        sortedEmotions.forEach(emo => {
            // FIX: Only show label if the group is wider than 40px
            if (groupMeta[emo].count > 0 && groupMeta[emo].width > 40) {
                groupLabels.append("text")
                    .attr("class", "group-label")
                    .attr("x", groupMeta[emo].x)
                    .attr("y", yPos - 10)
                    .text(emo)
                    .attr("fill", emotionColors(emo));
            }
        });

        // --- EXPOSE FUNCTIONS ---
        window.transitionToGrouped = function() {
            if (currentView === 'grouped') return;
            currentView = 'grouped';

            if (typeof hideAnnotation === 'function') hideAnnotation();

            bars.transition().duration(1000)
                .attr("x", d => d.groupedX)
                .attr("width", bandWidth - 0.5) 
                .attr("opacity", 1); 

            axisLabels.transition().duration(500).style("opacity", 0);
            groupLabels.transition().delay(800).duration(500).style("opacity", 1);
            d3.select("#chart-bottom-caption").style("opacity", 1);
        };

        window.transitionToTimeline = function() {
            if (currentView === 'timeline') return;
            currentView = 'timeline';

            bars.transition().duration(1000)
                .attr("x", d => xScaleTimeline(d.chunk_index))
                .attr("width", xScaleTimeline.bandwidth());

            groupLabels.transition().duration(300).style("opacity", 0);
            axisLabels.transition().delay(800).duration(500).style("opacity", 1);
            d3.select("#chart-bottom-caption").style("opacity", 0);
        };
    });
})();