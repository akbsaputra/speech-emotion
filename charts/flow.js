// charts/flow.js
(function() {
    // --- CONFIGURATION ---
    const containerId = "#chart-flow";
    const sectionId = "#section-flow";
    const railSelector = ".flow-rail";
    
    // Manual Label Placements (User Requested)
    const STATIC_LABELS = [
        { key: "Neutral", year: 1792, dy: 300}, // Shift up slightly for Washington
        { key: "Pride",   year: 1820, dy: 60 },
        { key: "Unity",   year: 1825, dy: 50 },
        { key: "Anger",   year: 1895, dy: 100 },
        { key: "Resolve", year: 1958, dy: 100 },
        { key: "Hope",    year: 1999, dy: 150 }
    ];

const STORIES = [
        { 
            year: 1793, 
            title: "The Stoic Standard", 
            text: "<strong>George Washington</strong>'s second inaugural remains the shortest in history at just 135 words. It is purely procedural, setting a 'stoic standard' for the early republic. The high <span class='text-neutral'>neutrality</span> reflects an era where the presidency was viewed as a formal duty to be performed, rather than a platform for emotional persuasion or mass communication." 
        },
        { 
            year: 1825, 
            title: "The Era of Good Feelings", 
            text: "National <span class='text-pride'>pride</span> swells in the early 19th century, reaching its apex with <strong>John Quincy Adams</strong>. Following the War of 1812, the U.S. was asserting its place on the world stage, fueled by the Monroe Doctrine and a growing sense of distinct national identity. This 'Era of Good Feelings' marks the solidification of the 'City on a Hill' sentiment before the sectional crisis tore it apart." 
        },
        { 
            year: 1877, 
            title: "A Plea for Union", 
            text: "<strong>Rutherford B. Hayes</strong> creates a massive, desperate anomaly in <span class='text-unity'>unity</span>. This peak does not reflect organic harmony, but rather a rhetorical bandage on a bleeding wound. Coming into office after a violently contested election and the corrupt 'Compromise of 1877,' Hayes used high-unity rhetoric to justify the end of Reconstruction and attempt to bind a nation that was nearly at war with itself again." 
        },
        { 
            year: 1893, 
            title: "The Industrial Storm", 
            text: "<strong>Grover Cleveland</strong> returns for a non-consecutive term just as the Panic of 1893 looms, bringing a sharp spike in <span class='text-anger'>anger</span>. This captures the mood of a nation on the brink of its first industrial depression. With populist movements rising and labor unrest brewing, the rhetoric hardens, reflecting the deep economic fractures that would soon lead to massive strikes and social upheaval." 
        },
        { 
            year: 1961, 
            title: "The Iron Will", 
            text: "By the mid-20th century, <span class='text-anger'>anger</span> gives way to <span class='text-resolve'>resolve</span>. <strong>John F. Kennedy</strong> marks the absolute peak of this trend. Facing the Soviet Union and the nuclear age, the rhetoric shifts from internal squabbles to a 'long twilight struggle'. This is the sound of the Cold War: cool, calculated determination, and the discipline to 'bear any burden' rather than the hot aggression of the 19th century." 
        },
        { 
            year: 1997, 
            title: "The Invention of Hope", 
            text: "<span class='text-hope'>Hope</span> was a minor player in presidential history until the modern era. <strong>Bill Clinton</strong>'s second term marks the triumph of this emotion. Buoyed by the dot-com boom and relative peace, Clinton professionalizes optimism as a political strategy, framing his presidency not as a battle, but as a 'Bridge to the 21st Century'. This sets the stage for the hope-driven rhetoric that characterizes modern campaigns." 
        }
    ];
    
    const EMOTION_COLORS = {
        "Pride": "#f5b041", "Unity": "#58d68d", "Hope": "#5dade2", 
        "Resolve": "#af7ac5", "Anger": "#e74c3c", "Neutral": "#999999"
    };
    const ALL_KEYS = ["Unity", "Neutral", "Anger", "Resolve", "Hope", "Pride"];

    // ORDER: Front (drawn last) -> Back (drawn first)
    // "Unity" is Front. "Pride" is Back.
    const layerOrderFrontToBack = ["Unity", "Neutral", "Anger", "Resolve", "Hope", "Pride"];

    // Dimensions
    const windowWidth = window.innerWidth;
    const totalWidth = windowWidth * 4; 
    const height = window.innerHeight * 0.70;
    const margin = { top: 100, right: 50, bottom: 50, left: 60 };

    const startX = windowWidth / 2;
    const endX = totalWidth - (windowWidth / 2);

    // --- SETUP SVG ---
    const svg = d3.select(containerId)
        .html("")
        .append("svg")
        .attr("width", totalWidth)
        .attr("height", height)
        .attr("viewBox", `0 0 ${totalWidth} ${height}`)
        .append("g");

    // --- SCALES ---
    const x = d3.scaleLinear().range([startX, endX]);
    
    // CUSTOM Y-AXIS (The "Chop")
    // We map Domain [0, 60, 100] -> Range [Bottom, TopOfMainChart, AbsoluteTop]
    // This compresses 60-100% into the top 15% of the chart, leaving 85% of space for 0-60%.
    const yTopLimit = margin.top;
    const yBreakPoint = margin.top + (height - margin.bottom - margin.top) * 0.15; // 15% from top
    const yBottom = height - margin.bottom;

    const y = d3.scaleLinear()
        .domain([0, 60, 100])
        .range([yBottom, yBreakPoint, yTopLimit])
        .clamp(true);

    // Area Generator
    const area = d3.area()
        .x(d => x(d.Year))
        .y0(yBottom) 
        .y1(d => y(d.Value))      
        .curve(d3.curveMonotoneX);

    // --- INTERACTION HELPERS ---
    
    // 1. Tooltip Div (Appended to Body to float over everything)
    let tooltip = d3.select("#flow-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("id", "flow-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(255, 255, 255, 0.8)")
            .style("padding", "8px 12px")
            .style("border", "1px solid #333")
            .style("border-radius", "4px")
            .style("pointer-events", "none") // Crucial: let mouse pass through
            .style("font-family", "sans-serif")
            .style("font-size", "12px")
            .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
            .style("z-index", "9999")
            .style("opacity", 0)
            .style("transition", "opacity 0.1s ease");
    }

    // 2. Focus Dot (Appended to SVG)
    const focusDot = svg.append("circle")
        .attr("r", 5)
        .attr("fill", "white")
        .attr("stroke", "#333")
        .attr("stroke-width", 2)
        .style("opacity", 0)
        .style("pointer-events", "none")
        .attr("z-index", 100);

    d3.csv("assets/data/inaugural_summary.csv").then(data => {
        
        // 1. Data Cleaning
        data.forEach(d => {
            d.Year = +d.Year;
            layerOrderFrontToBack.forEach(k => d[k] = +d[`${k}_Pct`] || 0);
        });

        // FILTER DUPLICATES: Keep the latter president for the same year
        data.sort((a, b) => a.Year - b.Year);
        const uniqueMap = new Map();
        data.forEach(d => uniqueMap.set(d.Year, d));
        const cleanData = Array.from(uniqueMap.values());

        // 2. Domains
        x.domain(d3.extent(cleanData, d => d.Year));
        
        // 3. Draw Areas
        // Reverse order so 'Pride' (Back) is drawn FIRST, 'Unity' (Front) is drawn LAST.
        const drawOrder = [...layerOrderFrontToBack].reverse();

        drawOrder.forEach((key) => {
            const emotionData = cleanData.map(d => ({ 
                Year: d.Year, 
                Value: d[key], 
                President: d.President,
                Emotion: key
            }));

            svg.append("path")
                .datum(emotionData)
                .attr("class", "area-layer")
                .attr("fill", EMOTION_COLORS[key])
                .attr("fill-opacity", 0.9) 
                .attr("stroke", "white")
                .attr("stroke-width", 0.5)
                .attr("d", area)
                .style("pointer-events", "none"); // Ensure this layer catches the mouse
        });

        // 4. MANUAL LABELS (Within the areas)
        const labelGroup = svg.append("g").style("pointer-events", "none"); // Pass through clicks

        STATIC_LABELS.forEach(label => {
            // Find the data point roughly near this year
            const nearest = cleanData.reduce((prev, curr) => 
                Math.abs(curr.Year - label.year) < Math.abs(prev.Year - label.year) ? curr : prev
            );
            
            if (nearest) {
                const xPos = x(nearest.Year) - 20;
                const yVal = nearest[label.key];
                
                // If value is tiny, don't shove label into the axis, float it a bit
                const safeY = Math.max(yVal, 5); 
                const yPos = y(safeY); 

                labelGroup.append("text")
                    .attr("x", xPos)
                    .attr("y", yPos + (label.dy || 0))
                    .text(label.key.toUpperCase())
                    .attr("text-anchor", "middle")
                    .attr("alignment-baseline", "middle")
                    .attr("fill", "#fff")
                    .attr("font-family", "sans-serif")
                    .attr("font-size", "11px")
                    .attr("font-weight", "bold")
                    .attr("letter-spacing", "1px");
            }
        });

        // 5. AXES & DECORATION (Pointer Events NONE to prevent blocking hover)

        // X Axis (Bottom)
        const axisGroup = svg.append("g").attr("class", "axis-group").style("pointer-events", "none");
        axisGroup.append("line")
            .attr("x1", startX).attr("x2", endX)
            .attr("y1", yBottom).attr("y2", yBottom)
            .attr("stroke", "#333").attr("stroke-width", 2);

        const xDomain = x.domain();
        const startYear = Math.ceil(xDomain[0] / 10) * 10;
        const endYear = Math.floor(xDomain[1] / 10) * 10;
        const tickValues = d3.range(startYear, endYear + 1, 10);

        tickValues.forEach(year => {
            const xPos = x(year);
            const g = axisGroup.append("g").attr("transform", `translate(${xPos}, ${yBottom})`);
            g.append("line").attr("y2", 8).attr("stroke", "#333");
            g.append("text").attr("y", 25).attr("text-anchor", "middle").text(year)
                .attr("fill", "#333").attr("font-size", "12px").attr("font-weight", "bold");
        });

        // Y Axis (Left - Custom with Break)
        const yAxisGroup = svg.append("g")
            .attr("transform", `translate(${startX}, 0)`)
            .style("pointer-events", "none");
        yAxisGroup.append("line")
            .attr("x1", 0).attr("x2", 0)
            .attr("y1", yBottom).attr("y2", margin.top) // Full height of axis
            .attr("stroke", "#333")
            .attr("stroke-width", 1);

        // Custom ticks for the broken axis
        const yTicks = [0, 20, 40, 60, 100]; 
        yTicks.forEach(tick => {
            const yPos = y(tick);
            yAxisGroup.append("line")
                .attr("x1", -5).attr("x2", 0)
                .attr("y1", yPos).attr("y2", yPos)
                .attr("stroke", "#333");
            
            yAxisGroup.append("text")
                .attr("x", -8).attr("y", yPos + 4)
                .attr("text-anchor", "end")
                .text(tick + "%")
                .attr("font-size", "11px").attr("font-family", "sans-serif");
        });

        // The "Break" Symbol (//)
        const breakY = (y(60) + y(100)) / 2;
        
        yAxisGroup.append("text")
            .attr("x", 0)              // Centered on the line (was -15)
            .attr("y", breakY + 3)     // Vertical position
            .text("//")
            .attr("text-anchor", "middle") // Center the text anchor
            .attr("font-size", "12px")     // Slightly larger
            .attr("font-weight", "bold")   // Make it visible
            .attr("fill", "#fff")          // White text...
            .attr("stroke", "#333")        // ...with dark stroke looks like a cut
            .attr("stroke-width", 1)       // Thick stroke creates the "gap" look
            .attr("transform", `rotate(-90 0 ${breakY})`); // Rotate around 0 (the line)
            
        // 6. STORY HIGHLIGHTS (Pointer Events NONE)
        const getStackAtYear = (targetYear) => {
            return cleanData.reduce((prev, curr) => 
                Math.abs(curr.Year - targetYear) < Math.abs(prev.Year - targetYear) ? curr : prev
            );
        };

        const highlights = svg.append("g").attr("class", "highlights").style("pointer-events", "none");

        STORIES.forEach(story => {
            const d = getStackAtYear(story.year);
            const xPos = x(d.Year);
            
            const g = highlights.append("g").attr("transform", `translate(${xPos}, 0)`);

            // Vertical Line
            g.append("line")
                .attr("y1", margin.top - 10)
                .attr("y2", yBottom)
                .attr("stroke", "#333")
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "4 4")
                .attr("opacity", 0.5);

            // Labels
            g.append("text")
                .attr("y", margin.top - 40).attr("text-anchor", "middle")
                .text(d.President)
                .attr("fill", "#000")
                .attr("font-weight", "bold")
                .attr("font-size", "14px");

            g.append("text")
                .attr("y", margin.top - 25).attr("text-anchor", "middle")
                .text(story.year)
                .attr("fill", "#777")
                .attr("font-size", "12px");
        });

        // --- 7. HOVER OVERLAY (THE MAGIC FIX) ---
        
        // A. Focus Line (Vertical Dashed) - Replaces the Dot
        const focusLine = svg.append("line")
            .attr("stroke", "#333")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4 4")
            .style("opacity", 0)
            .style("pointer-events", "none");

        // B. The invisible rectangle captures ALL mouse events
        svg.append("rect")
            .attr("width", totalWidth)
            .attr("height", height)
            .attr("fill", "transparent")
            .on("mousemove", function(event) {
                // 1. Find Year & Mouse Position
                const [mx, my] = d3.pointer(event);
                const yearVal = x.invert(mx);

                // --- NEW CHECK: Are we outside the timeline bounds? ---
                // (Fixes hover triggering on the far left or far right empty spaces)
                const minYear = cleanData[0].Year;
                const maxYear = cleanData[cleanData.length - 1].Year;
                
                if (yearVal < minYear || yearVal > maxYear) {
                    tooltip.style("opacity", 0);
                    focusLine.style("opacity", 0);
                    return;
                }
                // --------------------------------------------------------
                
                // 2. Find Data
                const bisect = d3.bisector(d => d.Year).center;
                const i = bisect(cleanData, yearVal);
                if (i < 0 || i >= cleanData.length) return;
                const d = cleanData[i];

                // 3. Find Max Value (Top of the chart at this year)
                const maxVal = Math.max(...ALL_KEYS.map(k => d[k]));
                const yTopEdge = y(maxVal);

                // --- CHECK: Are we hovering empty space above the chart? ---
                if (my < yTopEdge) {
                    tooltip.style("opacity", 0);
                    focusLine.style("opacity", 0);
                    return; 
                }

                // 4. Update Line
                focusLine
                    .attr("x1", x(d.Year))
                    .attr("x2", x(d.Year))
                    .attr("y1", yTopEdge)
                    .attr("y2", yBottom)
                    .style("opacity", 1);

                // 5. Prepare Sorted Data for Tooltip
                const sortedMoods = ALL_KEYS.map(k => ({ key: k, value: d[k] }))
                    .sort((a, b) => b.value - a.value); 

                // 6. Build Tooltip HTML
                let tooltipHtml = `
                    <div style="font-family:'Georgia', serif; font-size:14px; font-weight: bold; margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:6px;">
                        ${d.President} 
                        <span style="font-family:'Georga'; font-size:12px; color:#888; vertical-align:middle; margin-left:4px;">${d.Year}</span>
                    </div>
                `;

                sortedMoods.forEach(item => {
                    const isZero = item.value < 1;
                    const opacity = isZero ? 0.3 : 1;
                    
                    tooltipHtml += `
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:3px; opacity:${opacity}">
                            <div style="display:flex; align-items:center; gap:6px;">
                                <div style="width:8px; height:8px; background:${EMOTION_COLORS[item.key]}; border-radius:50%;"></div>
                                <span>${item.key}</span>
                            </div>
                            <strong>${Math.round(item.value)}%</strong>
                        </div>
                    `;
                });

                // 7. Position Tooltip
                const tooltipX = event.pageX + 20;
                const tooltipY = event.pageY - 50;
                
                tooltip.html(tooltipHtml)
                    .style("left", tooltipX + "px")
                    .style("top", tooltipY + "px")
                    .style("opacity", 1);
            })            
            .on("mouseleave", function() {
                tooltip.style("opacity", 0);
                focusLine.style("opacity", 0);
            });
        // --- SCROLL SYNC (Unchanged) ---
        const section = document.querySelector(sectionId);
        const rail = document.querySelector(railSelector);
        const titleEl = document.getElementById("flow-title");
        const descEl = document.getElementById("flow-desc");
        const yearEl = document.querySelector(".flow-year-display");

        function onScroll() {
            tooltip.style("opacity", 0);
            focusLine.style("opacity", 0);
            if(!section || !rail) return;
            const rect = section.getBoundingClientRect();
            const sectionHeight = section.offsetHeight;
            const windowHeight = window.innerHeight;
            let progress = -rect.top / (sectionHeight - windowHeight);
            progress = Math.max(0, Math.min(1, progress));
            const maxTranslate = totalWidth - windowWidth;
            rail.style.transform = `translateX(-${progress * maxTranslate}px)`;

            const minYear = xDomain[0]; const maxYear = xDomain[1];
            const currentYear = minYear + (progress * (maxYear - minYear));
            const nearestStory = STORIES.reduce((prev, curr) => 
                Math.abs(curr.year - currentYear) < Math.abs(prev.year - currentYear) ? curr : prev
            );

            if (titleEl.innerText !== nearestStory.title) {
                titleEl.style.opacity = 0; descEl.style.opacity = 0; yearEl.style.opacity = 0;
                setTimeout(() => {
                    titleEl.innerText = nearestStory.title; descEl.innerHTML = nearestStory.text; yearEl.innerText = nearestStory.year;
                    titleEl.style.opacity = 1; descEl.style.opacity = 1; yearEl.style.opacity = 0.1;
                }, 200);
            }
        }
        window.addEventListener("scroll", () => window.requestAnimationFrame(onScroll));
        onScroll();
    });
})();