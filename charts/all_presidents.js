// charts/all_presidents.js

(function() {
    const gridId = "#presidents-grid";
    const EMOTION_COLORS = {
        "Pride": "#f5b041", "Unity": "#58d68d", "Hope": "#5dade2", 
        "Resolve": "#af7ac5", "Anger": "#e74c3c", "Neutral": "#cccccc"
    };
    const ORDER = ["Pride", "Unity", "Hope", "Resolve", "Anger"];

    // Load data
    d3.csv("assets/data/inaugural_summary.csv").then(data => {
        data.forEach(d => {
            d.Year = +d.Year;
            d.Pride_Pct = +d.Pride_Pct;
            d.Unity_Pct = +d.Unity_Pct;
            d.Hope_Pct = +d.Hope_Pct;
            d.Resolve_Pct = +d.Resolve_Pct;
            d.Anger_Pct = +d.Anger_Pct;
        });

        // SORT CHRONOLOGICALLY
        data.sort((a, b) => a.Year - b.Year);

        renderGrid(data);
    });

    function renderGrid(data) {
        const container = d3.select(gridId);
        container.html(""); 

        // Create Grid Items
        const items = container.selectAll(".pres-item")
            .data(data)
            .enter()
            .append("div")
            .attr("class", "pres-item")
            .attr("id", d => `pres-${d.President.replace(/[^a-zA-Z0-9]/g, '')}-${d.Year}`);

        // Name & Year
        items.append("div").attr("class", "pres-name").text(d => d.President);
        items.append("div").attr("class", "pres-year").text(d => d.Year);

        // Chart
        const svgHeight = 8;
        const svg = items.append("div").attr("class", "mini-timeline")
            .append("svg").attr("width", "100%").attr("height", svgHeight);

        svg.each(function(d) {
            const el = d3.select(this);
            let cumPct = 0;
            ORDER.forEach(emo => {
                const pct = d[`${emo}_Pct`];
                if (pct > 0) {
                    el.append("rect")
                        .attr("x", `${cumPct}%`).attr("y", 0)
                        .attr("width", `${pct}%`).attr("height", svgHeight)
                        .attr("fill", EMOTION_COLORS[emo]);
                    cumPct += pct;
                }
            });
        });

// --- FILTER FUNCTION ---
        window.updateGridFocus = function(mode) {
            if (mode === 'all') {
                // Show All
                d3.selectAll(".pres-item").classed("faded", false);
                
            } else if (mode.startsWith("pres-")) {
                // SPECIAL CASE: Single President ID (e.g. George Washington)
                d3.selectAll(".pres-item").classed("faded", true);
                // Unfade specific ID
                d3.select("#" + mode).classed("faded", false);
                
            } else {
                // MODE: Emotion (Hope, Anger, Unity, etc.)
                const allItems = d3.selectAll(".pres-item").data();
                
                // Sort by the emotion's percentage (e.g., Unity_Pct)
                const emotionKey = `${mode}_Pct`;
                // Create a shallow copy [...] so we don't mess up the original order
                const sorted = [...allItems].sort((a, b) => b[emotionKey] - a[emotionKey]);
                
                // Get TOP 3 specific speeches (Data Objects)
                const top3 = sorted.slice(0, 3);

                // Generate the specific IDs for these 3 speeches
                // Must match the ID generation logic: pres-Name-Year
                const targetIds = top3.map(d => 
                    `pres-${d.President.replace(/[^a-zA-Z0-9]/g, '')}-${d.Year}`
                );
                
                // Fade out ALL items first
                d3.selectAll(".pres-item").classed("faded", true);
                
                // Unfade ONLY the specific IDs
                targetIds.forEach(id => {
                    d3.select("#" + id).classed("faded", false);
                });
            }
        };
    }
})();