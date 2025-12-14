// charts/bipartisan.js

(function() {
    const containerId = "#chart-bipartisan";
    const EMOTION_COLORS = {
        "Pride": "#f5b041", "Unity": "#58d68d", "Hope": "#5dade2", 
        "Resolve": "#af7ac5", "Anger": "#e74c3c", "Neutral": "#cccccc"
    };
    
    const MOODS = ["Resolve", "Pride", "Hope", "Anger", "Unity", "Neutral"];
    
    // --- LAYOUT CONFIG ---
    // Increased gap to 250 (Total 500px space in middle) to fit text box safely
    const width = 1200; 
    const height = 400;
    const center = width / 2;
    const gap = 200; 
    const barMax = (width / 2) - gap - 20; // Max width of a bar

    let currentStep = -1; // PERFORMANCE GUARD: Tracks active step

    const svg = d3.select(containerId)
        .html("")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("width", "100%")
        .style("height", "auto")
        .style("overflow", "visible");

    // Scales
    const y = d3.scaleBand().domain(MOODS).range([50, height - 50]).padding(0.4);
    const x = d3.scaleLinear().domain([0, 35]).range([0, barMax]); 

    d3.csv("assets/data/inaugural_summary.csv").then(rawData => {
        
        // 1. DATA PROCESSING
        const data = rawData.filter(d => 
            +d.Year >= 1853 && 
            (d.Party === 'Democratic' || d.Party === 'Republican')
        );

        const sums = { 'Democratic': {}, 'Republican': {} };
        const totals = { 'Democratic': 0, 'Republican': 0 };
        MOODS.forEach(m => { sums['Democratic'][m] = 0; sums['Republican'][m] = 0; });

        data.forEach(d => {
            MOODS.forEach(m => {
                const val = +d[`${m}_Pct`];
                sums[d.Party][m] += val;
                totals[d.Party] += val;
            });
        });

        const processed = MOODS.map(mood => {
            const demVal = (sums['Democratic'][mood] / totals['Democratic']) * 100;
            const repVal = (sums['Republican'][mood] / totals['Republican']) * 100;
            return {
                mood: mood,
                dem: demVal,
                rep: repVal,
                // Ensure simpler class names (lowercase, no spaces)
                classSafe: mood.toLowerCase().trim() 
            };
        });

        const fmt = d3.format(".1f");

        // 2. DRAW CENTER LABELS (Rotated)
        // Democrats (Left Border, Rotated CCW)
        svg.append("text")
            .attr("x", 300) // Slightly left of absolute center
            .attr("y", -30)
            .attr("text-anchor", "middle")
            .text("DEMOCRATS")
            .attr("font-family", "Instrument Serif, serif")
            .attr("font-size", "48px")
            .attr("fill", "#0c45bd")
            .attr("opacity", 0.5)
            .style("pointer-events", "none");

        // Republicans (Right Border, Rotated CW)
        svg.append("text")
            .attr("x", 910) 
            .attr("y", -30)
            .attr("text-anchor", "middle")
            .text("REPUBLICANS")
            .attr("font-family", "Instrument Serif, serif")
            .attr("font-size", "48px")
            .attr("fill", "#f70000")
            .attr("opacity", 0.5)
            .style("pointer-events", "none");


        // 3. RENDER CHARTS
        
        // --- LEFT: DEMOCRATS ---
        const demGroup = svg.append("g").attr("class", "dem-group");
        
        processed.forEach(d => {
            // Group for each bar (Bar + Label + Value)
            const g = demGroup.append("g")
                .attr("class", "bar-wrapper " + d.classSafe) // e.g. "bar-wrapper resolve"
                .style("opacity", 1);

            // Bar (Heading Left)
            g.append("rect")
                .attr("class", "bar-rect")
                .attr("y", y(d.mood))
                .attr("height", y.bandwidth() / 2)
                .attr("x", center - gap - x(d.dem)) 
                .attr("width", x(d.dem))
                .attr("fill", EMOTION_COLORS[d.mood]);

            // Mood Label (Above bar, aligned to start/right)
            g.append("text")
                .attr("x", center - gap) 
                .attr("y", y(d.mood) - 8)
                .attr("text-anchor", "end") 
                .text(d.mood)
                .attr("font-size", "0.8em")
                .attr("font-weight", "bold")
                .attr("fill", "#333");

            // Value Label (Left of bar, Hidden)
            g.append("text")
                .attr("class", "val-label")
                .attr("x", center - gap - x(d.dem) - 8)
                .attr("y", y(d.mood) + y.bandwidth() / 4)
                .attr("dy", "0.35em")
                .attr("text-anchor", "end")
                .text(fmt(d.dem) + "%")
                .attr("font-size", "12px")
                .attr("font-weight", "bold")
                .attr("fill", "#333")
                .style("opacity", 0);
        });

        // --- RIGHT: REPUBLICANS ---
        const repGroup = svg.append("g").attr("class", "rep-group");

        processed.forEach(d => {
            const g = repGroup.append("g")
                .attr("class", "bar-wrapper " + d.classSafe)
                .style("opacity", 1);

            // Bar (Heading Right)
            g.append("rect")
                .attr("class", "bar-rect")
                .attr("y", y(d.mood))
                .attr("height", y.bandwidth() / 2)
                .attr("x", center + gap)
                .attr("width", x(d.rep))
                .attr("fill", EMOTION_COLORS[d.mood]);

            // Mood Label (Above bar, aligned to start/left)
            g.append("text")
                .attr("x", center + gap)
                .attr("y", y(d.mood) - 8)
                .attr("text-anchor", "start") 
                .text(d.mood)
                .attr("font-size", "0.8em")
                .attr("font-weight", "bold")
                .attr("fill", "#333");

            // Value Label (Right of bar, Hidden)
            g.append("text")
                .attr("class", "val-label")
                .attr("x", center + gap + x(d.rep) + 8)
                .attr("y", y(d.mood) + y.bandwidth() / 4)
                .attr("dy", "0.35em")
                .attr("text-anchor", "start")
                .text(fmt(d.rep) + "%")
                .attr("font-size", "12px")
                .attr("font-weight", "bold")
                .attr("fill", "#333")
                .style("opacity", 0);
        });


        // 4. UPDATE FUNCTION (OPTIMIZED)
        window.updateBipartisan = function(step) {
            // PERFORMANCE FIX: Only run if step actually changed
            if (step === currentStep) return;
            currentStep = step;

            // Helper to Dim/Reset
            const dimAll = () => {
                svg.selectAll(".bar-wrapper").transition().duration(600).style("opacity", 0.2);
                svg.selectAll(".val-label").transition().duration(600).style("opacity", 0);
            };
            const showAll = () => {
                svg.selectAll(".bar-wrapper").transition().duration(600).style("opacity", 1);
                svg.selectAll(".val-label").transition().duration(600).style("opacity", 0);
            };

            if (step === 1) {
                showAll();
            }
            else if (step === 2) {
                dimAll();
                
                // Highlight Dem Resolve
                // Logic: Select the group .dem-group, then find the wrapper with class .resolve
                const demItem = svg.select(".dem-group .resolve");
                demItem.transition().duration(600).style("opacity", 1);
                demItem.select(".val-label").transition().duration(600).style("opacity", 1);

                // Highlight Rep Pride
                const repItem = svg.select(".rep-group .pride");
                repItem.transition().duration(600).style("opacity", 1);
                repItem.select(".val-label").transition().duration(600).style("opacity", 1);
            }
            else if (step === 3) {
                dimAll();

                // Highlight Dem: Resolve & Hope
                ["resolve", "hope"].forEach(k => {
                    const item = svg.select(`.dem-group .${k}`);
                    item.transition().style("opacity", 1);

                    // Diff calculation
                    const d = processed.find(p => p.classSafe === k);
                    const txt = `${fmt(d.dem)}%`;
                    
                    item.select(".val-label")
                        .text(txt)
                        .transition().style("opacity", 1);
                });

                // Highlight Rep: Pride, Anger, Unity
                ["pride", "anger", "unity"].forEach(k => {
                    const item = svg.select(`.rep-group .${k}`);
                    item.transition().style("opacity", 1);

                    const d = processed.find(p => p.classSafe === k);
                    const txt = `${fmt(d.rep)}%`;
                    
                    item.select(".val-label")
                        .text(txt)
                        .transition().style("opacity", 1);
                });
                // Show opposite party values FADED
                // Rep: Resolve & Hope (faded - opposite of Dem strengths)
                ["resolve", "hope"].forEach(k => {
                const item = svg.select(`.rep-group .${k}`);
                item.transition().style("opacity", 0.15);

                const d = processed.find(p => p.classSafe === k);
                const txt = `${fmt(d.rep)}%`;
                item.select(".val-label")
                    .text(txt)
                    .transition().style("opacity", 1);
                });

                // Dem: Pride, Anger, Unity (faded - opposite of Rep strengths)
                ["pride", "anger", "unity"].forEach(k => {
                const item = svg.select(`.dem-group .${k}`);
                item.transition().style("opacity", 0.15);

                const d = processed.find(p => p.classSafe === k);
                const txt = `${fmt(d.dem)}%`;
                item.select(".val-label")
                    .text(txt)
                    .transition().style("opacity", 1);
                });
            }
        };

        // Initialize
        updateBipartisan(1);
    });
})();