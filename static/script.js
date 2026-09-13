// === Configuration ===
const API_BASE = window.location.origin;

// === Check AI Status ===
const checkAIStatus = async () => {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        const data = await response.json();
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('aiStatus');
        
        if (data.ai_configured) {
            statusDot.className = 'status-dot online';
            statusText.textContent = 'AI ready';
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'AI offline (fallback mode)';
        }
    } catch (error) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('aiStatus');
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Server offline';
    }
};

// === Prediction engine ===
const predictGoal = async (sleep, water, steps) => {
    const response = await fetch(`${API_BASE}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sleep, water, steps })
    });
    
    if (!response.ok) {
        throw new Error('Prediction failed');
    }
    
    return await response.json();
};

// === AI Coaching ===
const getAICoaching = async (sleep, water, steps, hitGoal, score) => {
    const response = await fetch(`${API_BASE}/api/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sleep, water, steps, hitGoal, score })
    });
    
    if (!response.ok) {
        throw new Error('Coaching failed');
    }
    
    return await response.json();
};

// === Session Store ===
const sessionLog = [];

const logEntry = (sleep, water, steps, hitGoal, confidence, score, coaching, source) => {
    const entry = {
        id: sessionLog.length + 1,
        time: new Date().toLocaleTimeString(),
        sleep,
        water,
        steps,
        hitGoal,
        confidence,
        score,
        coaching,
        source
    };
    sessionLog.push(entry);
    return entry;
};

const renderHistory = () => {
    const tableEl = document.querySelector('#historyTable');
    const countEl = document.querySelector('#entryCount');
    const hitRateEl = document.querySelector('#hitRate');
    
    countEl.textContent = `(${sessionLog.length} entries)`;
    
    // Calculate and display hit rate
    if (sessionLog.length > 0) {
        const hitCount = sessionLog.filter(e => e.hitGoal).length;
        const hitRate = (hitCount / sessionLog.length * 100).toFixed(1);
        hitRateEl.textContent = `${hitRate}%`;
        hitRateEl.style.color = hitRate >= 50 ? '#4ade80' : '#f87171';
    } else {
        hitRateEl.textContent = '0%';
        hitRateEl.style.color = '#94a3b8';
    }
    
    if (!sessionLog.length) {
        tableEl.innerHTML = '<tr><td colspan="6" class="empty-state">No entries yet. Submit your first prediction!</td></tr>';
        return;
    }
    
    tableEl.innerHTML = sessionLog.map(e => {
        const outcomeColor = e.hitGoal ? "#4ecca3" : "#f5a623";
        const outcome = e.hitGoal ? "HIT" : "MISS";
        return `<tr>
            <td style="color:#8b949e;font-size:0.8rem;">${e.time}</td>
            <td>${e.sleep}h</td>
            <td>${e.water} gl</td>
            <td>${e.steps.toLocaleString()}</td>
            <td style="color:${outcomeColor};font-weight:700;">${outcome}</td>
            <td style="color:#a0a0b0;">${(e.confidence * 100).toFixed(0)}%</td>
        </tr>`;
    }).join('');
    
    // Compute and log hit rate
    const hitCount = sessionLog.filter(e => e.hitGoal).length;
    const hitRate = sessionLog.length > 0 ? (hitCount / sessionLog.length * 100).toFixed(1) : 0;
    console.log(`📊 Session Stats: ${sessionLog.length} entries, ${hitCount} hits, ${hitRate}% hit rate`);
};

// === Clear history ===
document.querySelector('#clearHistory').addEventListener('click', () => {
    if (sessionLog.length === 0) return;
    if (confirm('Clear all history entries?')) {
        sessionLog.length = 0;
        renderHistory();
        console.log('🗑️ History cleared.');
    }
});

// === Main form handler ===
const form = document.querySelector('#coachForm');
const display = document.querySelector('#coachDisplay');
const submitBtn = document.querySelector('#submitBtn');

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const sleep = parseFloat(document.querySelector('#inSleep').value);
    const water = parseInt(document.querySelector('#inWater').value);
    const steps = parseInt(document.querySelector('#inSteps').value);
    
    if (isNaN(sleep) || isNaN(water) || isNaN(steps)) {
        display.className = 'ai-response idle';
        display.innerHTML = '<div class="label-sm">Error</div><div class="coaching">All three fields are required.</div>';
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Analyzing...';
    display.className = 'ai-response loading';
    display.innerHTML = `
        <div class="spinner"></div>
        <span>Getting AI coaching...</span>
    `;
    
    try {
        // Get prediction
        const result = await predictGoal(sleep, water, steps);
        const outcome = result.hitGoal ? "HIT GOAL" : "MISS GOAL";
        const confPct = (result.confidence * 100).toFixed(0);
        
        // Get AI coaching
        const coachingData = await getAICoaching(
            sleep, water, steps, result.hitGoal, result.score
        );
        
        // Log to session history
        logEntry(
            sleep, water, steps, 
            result.hitGoal, result.confidence, result.score,
            coachingData.coaching, coachingData.source
        );
        renderHistory();
        
        // Display result
        const sourceLabel = coachingData.source === 'ai' 
            ? '✨ AI-generated advice' 
            : '📝 Template advice (fallback)';
        
        display.className = `ai-response ${result.hitGoal ? "hit" : "miss"}`;
        display.innerHTML = `
            <div class="label-sm">Prediction</div>
            <div class="prediction">${outcome} &nbsp; (${confPct}% confidence • score: ${result.score}/100)</div>
            <div class="label-sm" style="margin-top:0.8rem;">Coaching</div>
            <div class="coaching">${coachingData.coaching}</div>
            <div class="coaching-source">${sourceLabel}</div>
        `;
        
        console.log(`✅ Submitted: sleep=${sleep}h water=${water}gl steps=${steps.toLocaleString()}`);
        console.log(`📈 Result: ${outcome} | ${confPct}% confidence | score ${result.score}`);
        console.log(`🎯 Coaching source: ${coachingData.source}`);
        
    } catch (error) {
        console.error('❌ Error:', error);
        display.className = 'ai-response miss';
        display.innerHTML = `
            <div class="label-sm">Error</div>
            <div class="coaching">${error.message || 'Something went wrong. Please try again.'}</div>
        `;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Analyze →';
        form.reset();
    }
});

// === Initialize ===
checkAIStatus();
renderHistory();
console.log('🚀 SMP Coach loaded successfully!');
console.log('📡 API endpoint:', API_BASE);
console.log('💡 Hit rate will be calculated and displayed after each submission.');