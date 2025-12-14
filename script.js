// script.js

// --- 1. Global Config ---
const EMOTION_COLORS = {
    "pride": "#f5b041", "unity": "#58d68d", "hope": "#5dade2", 
    "resolve": "#af7ac5", "anger": "#e74c3c", "neutral": "#cccccc"
};

let currentActiveChunk = null; // Tracks active annotation state
let currentBipartisanStep = null; // Tracks active bipartisan step

// --- 2. Main Scroll Listener ---
window.addEventListener('scroll', function() {
    const scrollPos = window.scrollY;
    const windowH = window.innerHeight;

    // --- A. Cloud Section (Unchanged) ---
    const section1 = document.getElementById('section-emotional-compass');
    if (section1) {
        const cloudGray = document.getElementById('cloud-gray');
        const cloudColored = document.getElementById('cloud-colored');
        const cloudThird = document.getElementById('cloud-third');
        
        const relScroll = scrollPos - section1.offsetTop;
        if (relScroll < windowH * 0.5) {
            cloudGray.style.opacity = 0; cloudColored.style.opacity = 0; cloudThird.style.opacity = 0;
        } else if (relScroll < windowH * 1.5) {
            cloudGray.style.opacity = 1; cloudColored.style.opacity = 0; cloudThird.style.opacity = 0;
        } else if (relScroll < windowH * 2.5) {
            cloudGray.style.opacity = 0; cloudColored.style.opacity = 1; cloudThird.style.opacity = 0;
        } else if (relScroll < windowH * 4) {
            cloudGray.style.opacity = 0; cloudColored.style.opacity = 0; cloudThird.style.opacity = 1;
        } else {
            cloudGray.style.opacity = 0; cloudColored.style.opacity = 0; cloudThird.style.opacity = 0;
        }
    }

    // --- B. Floating Titles Logic (Unchanged) ---
    handleFloatingTitles(windowH);

    // --- C. DYNAMIC FADE: TRUMP <-> ALL PRESIDENTS ---
    const sectionTrump = document.getElementById('section-journey-trump');
    const sectionAll = document.getElementById('section-all-presidents');
    
    if (sectionTrump && sectionAll) {
        const rectAll = sectionAll.getBoundingClientRect();
        const startFade = windowH;
        const endFade = windowH * 0.2; 
        
        let progress = (startFade - rectAll.top) / (startFade - endFade);
        progress = Math.max(0, Math.min(1, progress));

        sectionTrump.style.opacity = 1 - progress;
        sectionAll.style.opacity = progress;

        sectionTrump.style.pointerEvents = (progress > 0.9) ? 'none' : 'auto';
        sectionAll.style.pointerEvents = (progress < 0.1) ? 'none' : 'auto';
    }

    // --- D. TRANSITION: ALL PRESIDENTS -> BIPARTISAN ---
    const biSticky = document.querySelector('.bipartisan-sticky');
    const biChartContainer = document.querySelector('.bipartisan-chart-container');
    const leftPanel = document.querySelector('.left-panel');  // The sticky container
    const biSection = document.getElementById('section-bipartisan');

    if (biSection && biSticky && leftPanel && biChartContainer) {
    const rect = biSection.getBoundingClientRect();
    
    // Determine transition progress as bipartisan section enters
    if (rect.top < (window.innerHeight * 2) && rect.top > 0) {
        // We are scrolling INTO the bipartisan section
        let progress = (window.innerHeight - rect.top) / window.innerHeight;  // 0 to 1
        progress = Math.max(0, Math.min(1, progress));
        
        // Fade out the left panel (which contains the grid)
        leftPanel.style.opacity = 1 - progress;
        leftPanel.style.pointerEvents = (progress > 0.7) ? 'none' : 'auto';
        
        // Fade in bipartisan sticky background
        biSticky.style.opacity = progress;
        
        // Fade in chart container
        biChartContainer.style.opacity = progress;
        biChartContainer.style.pointerEvents = 'none';
        
    } else if (rect.top <= 0) {
        // Fully inside bipartisan section
        leftPanel.style.opacity = 0;
        leftPanel.style.pointerEvents = 'none';
        
        biSticky.style.opacity = 1;
        biChartContainer.style.opacity = 1;
        biChartContainer.style.pointerEvents = 'none';
        
    } else {
        // Before bipartisan section (viewing presidents)
        leftPanel.style.opacity = 1;
        leftPanel.style.pointerEvents = 'auto';
        
        biSticky.style.opacity = 0;
        biChartContainer.style.opacity = 0;
        biChartContainer.style.pointerEvents = 'none';
    }
    }


    // --- E. ANNOTATION STEPS (Obama & Trump) ---
    const obamaSteps = document.querySelectorAll('.annotation-step');
    let activeObamaStep = getClosestStep(obamaSteps, windowH);

    const trumpSteps = document.querySelectorAll('.trump-step');
    let activeTrumpStep = getClosestStep(trumpSteps, windowH);

    if (activeTrumpStep) {
        if (window.trumpTransitionToGrouped) window.trumpTransitionToGrouped();
        const chunkRaw = activeTrumpStep.dataset.chunk;
        // ... (Same Logic as before) ...
        if (chunkRaw === "conclusion" || !chunkRaw) {
             hideAnnotation('.trump-stripe', '#journey-trump svg', 'trump-annotation-box');
        } else if (chunkRaw === "breather" || chunkRaw === "-1") {
             if (window.trumpTransitionToTimeline) window.trumpTransitionToTimeline();
             hideAnnotation('.trump-stripe', '#journey-trump svg', 'trump-annotation-box');
        } else {
             const chunk = +chunkRaw;
             if (window.trumpTransitionToTimeline) window.trumpTransitionToTimeline();
             showAnnotation({
                 chunkIndex: chunk,
                 text: activeTrumpStep.dataset.text,
                 quote: activeTrumpStep.dataset.quote, 
                 barClass: '.trump-stripe',
                 svgId: '#journey-trump svg',
                 boxId: 'trump-annotation-box',
                 lineClass: 'trump-annotation-line'
             });
        }
    } else if (activeObamaStep) {
        // ... (Same Obama Logic) ...
        const chunkRaw = activeObamaStep.dataset.chunk;
        if (chunkRaw === "conclusion" || !chunkRaw) {
            if (window.transitionToGrouped) window.transitionToGrouped();
            hideAnnotation('.stripe', '#journey-single-speech svg', 'annotation-box');
        } else if (chunkRaw === "breather" || chunkRaw === "-1") {
            if (window.transitionToTimeline) window.transitionToTimeline();
            hideAnnotation('.stripe', '#journey-single-speech svg', 'annotation-box');
        } else {
            const chunk = +chunkRaw;
            if (window.transitionToTimeline) window.transitionToTimeline();
            showAnnotation({
                chunkIndex: chunk,
                text: activeObamaStep.dataset.text,
                quote: activeObamaStep.dataset.quote,
                barClass: '.stripe',
                svgId: '#journey-single-speech svg',
                boxId: 'annotation-box',
                lineClass: 'annotation-line'
            });
        }
    }

    // --- F. GRID FOCUS LOGIC ---
    const gridSteps = document.querySelectorAll('.grid-step');
    gridSteps.forEach(step => {
        const r = step.getBoundingClientRect();
        if (r.top < windowH * 0.6 && r.bottom > windowH * 0.4) {
            step.classList.add('active-step');
            const mode = step.dataset.mode;
            // FIX: Check if mode exists to prevent crash
            if (mode && window.updateGridFocus) window.updateGridFocus(mode);
        } else {
            step.classList.remove('active-step');
        }
    });

    // --- G. BIPARTISAN STEP LOGIC (WITH VISIBILITY SAFETY NET) ---
    const biSteps = document.querySelectorAll('.bi-step');
    const activeBiStep = getClosestStep(biSteps, windowH);

    if (activeBiStep) {
        const stepIndex = +activeBiStep.dataset.step;
        if (currentBipartisanStep !== stepIndex) {
            currentBipartisanStep = stepIndex;
            if (window.updateBipartisan) window.updateBipartisan(stepIndex);
        }

        biSteps.forEach(step => {
            const card = step.querySelector('.bi-text-card');
            if (card) {
                if (step === activeBiStep) card.style.opacity = 1;
                else card.style.opacity = 0.3;
            }
        });
    }

    const bipartisan = document.getElementById('section-bipartisan');
    const flow = document.getElementById('section-flow');
    
    if (!bipartisan || !flow) return;
    
    // Get position of the Flow section relative to viewport
    const flowRect = flow.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // LOGIC: 
    // The Flow section (z-index 20) scrolls OVER the Bipartisan section (z-index 10).
    // We should only hide Bipartisan when Flow has scrolled UP past the screen 
    // by at least one full viewport height.
    // This guarantees Flow completely blocks the view before we toggle visibility.

    if (flowRect.top < -windowHeight) {
        // We are deep into the Flow section. Safe to hide Bipartisan.
        bipartisan.style.visibility = 'hidden';
    } else {
        // We are near the transition. Keep Bipartisan visible so "Uncover" works.
        bipartisan.style.visibility = 'visible';
    }
});

// --- HELPER FUNCTIONS ---

function handleFloatingTitles(windowH) {
    // ... (Keep existing implementation) ...
    const obamaPhoto = document.querySelector('.obama-photo');
    if (obamaPhoto) {
        const rect = obamaPhoto.getBoundingClientRect();
        const title = document.getElementById('chart-floating-title');
        const sub = document.getElementById('chart-floating-subtitle');
        if (title && sub) {
            const opacity = (rect.bottom <= windowH * 0.1) ? 1 : 0;
            title.style.opacity = opacity;
            sub.style.opacity = opacity;
        }
    }
    const trumpPhoto = document.querySelector('.trump-photo');
    if (trumpPhoto) {
        const rect = trumpPhoto.getBoundingClientRect();
        const title = document.getElementById('trump-floating-title');
        const sub = document.getElementById('trump-floating-subtitle');
        if (title && sub) {
            const opacity = (rect.bottom <= windowH * 0.1) ? 1 : 0;
            title.style.opacity = opacity;
            sub.style.opacity = opacity;
        }
    }
}

function getClosestStep(nodeList, windowH) {
    let minDistance = Infinity;
    let activeStep = null;
    nodeList.forEach(step => {
        const rect = step.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const dist = Math.abs(center - windowH / 2);
        if (dist < minDistance && dist < windowH * 0.8) {
            minDistance = dist;
            activeStep = step;
        }
    });
    return activeStep;
}

function showAnnotation({ chunkIndex, text, quote, barClass, svgId, boxId, lineClass }) {
    // ... (Keep existing implementation) ...
    const uniqueKey = `${boxId}-${chunkIndex}`;
    if (currentActiveChunk === uniqueKey) return;
    currentActiveChunk = uniqueKey;

    const svg = d3.select(svgId);
    const box = document.getElementById(boxId);
    const allBars = d3.selectAll(barClass);
    
    allBars.attr('opacity', 0.3); 
    const target = allBars.filter((d, i) => (d.chunk_index !== undefined ? d.chunk_index : i) === chunkIndex);
    if (target.empty()) return;
    
    target.attr('opacity', 1); 
    const data = target.datum();

    try {
        const svgContainer = document.querySelector(svgId).parentElement; 
        const svgRect = svgContainer.getBoundingClientRect();
        const containerWidth = svgRect.width;
        const barX_Attr = parseFloat(target.attr("x")) + parseFloat(target.attr("width"))/2;
        const domCenterX = (barX_Attr / 800) * containerWidth; 
        const barY_Attr = parseFloat(target.attr("y")) + parseFloat(target.attr("height"));
        
        svg.selectAll('.' + lineClass).remove();
        svg.append('line')
            .attr('class', lineClass)
            .attr('x1', barX_Attr).attr('y1', barY_Attr + 10)
            .attr('x2', barX_Attr).attr('y2', barY_Attr + 60)
            .attr('stroke', '#333')
            .attr('stroke-width', 2);

        const order = ["pride", "unity", "hope", "resolve", "anger"];
        const maxScore = Math.max(...order.map(emo => data.scores[emo] || 0));
        
        let chartHTML = '<div class="mini-chart-container">';
        order.forEach(emo => {
            const score = data.scores[emo] || 0;
            const widthPct = maxScore > 0 ? (score / maxScore) * 100 : 0;
            const color = EMOTION_COLORS[emo];
            const dataEmo = data.emotion ? data.emotion.toLowerCase() : "";
            const isWinner = (emo === dataEmo);
            chartHTML += `
                <div class="mini-bar-row">
                    <div class="mini-label" style="font-weight:${isWinner ? 'bold' : 'normal'}">
                        ${emo.charAt(0).toUpperCase() + emo.slice(1)}
                    </div>
                    <div class="mini-bar-track">
                        <div class="mini-bar-fill" style="width:${widthPct}%; background-color:${color}; opacity:${isWinner ? 1 : 0.3};"></div>
                    </div>
                    <div class="mini-value">${Math.round(score * 100)}%</div>
                </div>`;
        });
        chartHTML += '</div>';

        box.innerHTML = `
            <div class="annotation-speech-text">"${text || data.text}"</div>
            <hr style="border:0; border-top:1px solid #eee; margin:12px 0;">
            ${chartHTML}
        `;

        box.style.top = `150px`; 
        box.style.left = `${domCenterX}px`; 
        box.style.transform = "translateX(-50%)";
        box.style.display = 'block';
        box.style.opacity = 1;

    } catch (e) {
        console.error("Error rendering annotation:", e);
    }
}

function hideAnnotation(barClass, svgId, boxId) {
    // ... (Keep existing implementation) ...
    if (barClass) d3.selectAll(barClass).attr('opacity', 1);
    if (svgId) d3.select(svgId).selectAll('line').remove();
    if (boxId) {
        const box = document.getElementById(boxId);
        if (box) {
            box.style.display = 'none';
            box.style.opacity = 0;
        }
    }
    if (currentActiveChunk && currentActiveChunk.startsWith(boxId)) {
        currentActiveChunk = null;
    }
}