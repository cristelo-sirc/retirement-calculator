            // --- Constants (2025 IRS Data) ---
            const STD_DEDUCTION_SINGLE = 15750;
            const STD_DEDUCTION_MFJ = 31500;

            // Pre-TCJA Standard Deductions (for 2026+ if sunset enabled)
            const STD_DEDUCTION_SINGLE_PRE_TCJA = 7850;  // Approx 2017 adjusted
            const STD_DEDUCTION_MFJ_PRE_TCJA = 15700;    // Approx 2017 adjusted

            // 2025 Brackets (Single)
            const BRACKETS_SINGLE = [
                { cap: 11925, rate: 0.10 },
                { cap: 48475, rate: 0.12 },
                { cap: 103350, rate: 0.22 },
                { cap: 197300, rate: 0.24 },
                { cap: 250525, rate: 0.32 },
                { cap: 626350, rate: 0.35 },
                { cap: Infinity, rate: 0.37 }
            ];

            // 2025 Brackets (MFJ)
            const BRACKETS_MFJ = [
                { cap: 23850, rate: 0.10 },
                { cap: 96950, rate: 0.12 },
                { cap: 206700, rate: 0.22 },
                { cap: 394600, rate: 0.24 },
                { cap: 501050, rate: 0.32 },
                { cap: 751600, rate: 0.35 },
                { cap: Infinity, rate: 0.37 }
            ];

            // Pre-TCJA Brackets (Single) - for 2026+ if sunset enabled
            const BRACKETS_SINGLE_PRE_TCJA = [
                { cap: 9525, rate: 0.10 },
                { cap: 38700, rate: 0.15 },
                { cap: 93700, rate: 0.25 },
                { cap: 195450, rate: 0.28 },
                { cap: 424950, rate: 0.33 },
                { cap: 426700, rate: 0.35 },
                { cap: Infinity, rate: 0.396 }
            ];

            // Pre-TCJA Brackets (MFJ) - for 2026+ if sunset enabled
            const BRACKETS_MFJ_PRE_TCJA = [
                { cap: 19050, rate: 0.10 },
                { cap: 77400, rate: 0.15 },
                { cap: 156150, rate: 0.25 },
                { cap: 237950, rate: 0.28 },
                { cap: 424950, rate: 0.33 },
                { cap: 480050, rate: 0.35 },
                { cap: Infinity, rate: 0.396 }
            ];

            // Capital Gains Thresholds (MFJ / Single) - 2025
            const CAP_GAINS_0_MFJ = 96700;
            const CAP_GAINS_15_MFJ = 600050;
            const CAP_GAINS_0_SINGLE = 48350;
            const CAP_GAINS_15_SINGLE = 533400;

            // NIIT Thresholds
            const NIIT_THRESHOLD_MFJ = 250000;
            const NIIT_THRESHOLD_SINGLE = 200000;

            // Contribution Limits 2025
            const LIMIT_401K = 23500;
            const CATCHUP_401K = 7500;
            const SUPER_CATCHUP_401K = 11250; // Ages 60-63

            // SS Earnings Limit 2025
            const SS_EARNINGS_LIMIT = 23400;

            // SS COLA (average annual Cost of Living Adjustment)
            const SS_COLA = 0.025; // 2.5% average

            let simulationResults = [];
            let medianPathData = [];
            let percentilePathsData = {};
            let simulationStats = {};
            let savedScenarios = [];  // Scenario Workbench snapshots
            let lastSimulationResults = null;  // For Charts/Reports views
            let inputSnapshots = [];  // Undo stack for Revert to Last Run (max 3)
            let params;
            let medianFinalBalanceNominal = 0;  // For today's dollars toggle
            let medianFinalBalanceReal = 0;     // For today's dollars toggle

            let balanceChartInstance, taxChartInstance, gaugeChartInstance, incomeSourcesChartInstance, incomeVsSpendChartInstance;

            // --- Helper: Gaussian Random Number (Box-Muller) ---
            function gaussianRandom(mean, stdev, rng) {
                const rand = (typeof rng === 'function') ? rng : Math.random;
                let u = 0, v = 0;
                while (u === 0) u = rand();
                while (v === 0) v = rand();
                const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
                return mean + (z * stdev);
            }

            // 32-bit FNV-1a hash (stable seed from a string)
            function fnv1aHash(str) {
                let h = 0x811c9dc5;
                for (let i = 0; i < str.length; i++) {
                    h ^= str.charCodeAt(i);
                    // h *= 16777619 (via shifts/adds to keep 32-bit)
                    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
                }
                return h >>> 0;
            }

            // Fast seeded PRNG (deterministic)
            function mulberry32(seed) {
                let a = seed >>> 0;
                return function () {
                    a |= 0;
                    a = (a + 0x6D2B79F5) | 0;
                    let t = Math.imul(a ^ (a >>> 15), 1 | a);
                    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                };
            }

            function getNumberValue(id) {
                const input = document.getElementById(id);
                if (!input) return 0;
                const value = input.value.replace(/[^0-9.-]/g, '');
                return parseFloat(value) || 0;
            }

            function formatCurrency(amount) {
                if (amount === null || isNaN(amount)) return '$0';
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
            }

            function formatPercent(value) {
                return (value * 100).toFixed(1) + '%';
            }

            // --- UI Logic ---
            function switchTab(tabId) {
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                const tabBtn = document.querySelector(`.tab-btn[onclick*="${tabId}"]`);
                if (tabBtn) tabBtn.classList.add('active');
                const tabContent = document.getElementById(tabId);
                if (tabContent) tabContent.classList.add('active');
            }

            // Icon sidebar section switching
            function switchSection(sectionId) {
                // Update icon nav button active state
                document.querySelectorAll('.icon-nav-btn').forEach(btn => btn.classList.remove('active'));
                const activeBtn = document.querySelector(`.icon-nav-btn[data-section="${sectionId}"]`);
                if (activeBtn) activeBtn.classList.add('active');

                // Hide all tab-content, show selected
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                const section = document.getElementById(sectionId);
                if (section) section.classList.add('active');

                // Update panel header
                const headers = {
                    'profile': { icon: 'ph-user', title: 'Profile & Timeline', desc: 'Basic information about you and your timeline' },
                    'assets': { icon: 'ph-wallet', title: 'Assets & Savings', desc: 'Current balances and contribution rates' },
                    'spending': { icon: 'ph-shopping-cart', title: 'Spending & Housing', desc: 'Lifestyle expenses and housing costs' },
                    'advanced': { icon: 'ph-faders', title: 'Advanced Settings', desc: 'Market assumptions and simulation options' }
                };

                const header = headers[sectionId];
                if (header) {
                    const panelHeader = document.getElementById('panelHeader');
                    if (panelHeader) {
                        panelHeader.innerHTML = `
                    <h2><i class="ph ${header.icon}"></i> ${header.title}</h2>
                    <p>${header.desc}</p>
                `;
                    }
                }
            }

            // Top navigation view switching
            function switchMainView(viewId) {
                // Update nav link active state
                document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
                const activeLink = document.querySelector(`.nav-link[onclick*="${viewId}"]`);
                if (activeLink) activeLink.classList.add('active');

                // Hide all main views
                document.querySelectorAll('.main-view').forEach(view => view.classList.remove('active'));

                // Show selected view
                const viewMap = {
                    'dashboard': 'dashboardView',
                    'charts': 'chartsView',
                    'scenarios': 'scenariosView',
                    'reports': 'reportsView'
                };

                const targetView = document.getElementById(viewMap[viewId]);
                if (targetView) {
                    targetView.classList.add('active');
                }

                // Update view-specific content
                if (viewId === 'charts') {
                    updateChartsView();
                } else if (viewId === 'scenarios') {
                    updateScenariosView();
                    initSolverTracker(); // Initialize solver settings display
                } else if (viewId === 'reports') {
                    updateReportsView();
                }

                // Also update mobile nav bar active states (v16.0)
                document.querySelectorAll('.mobile-nav-bar .nav-link').forEach(b => b.classList.remove('active'));
                const viewLabels = {
                    'dashboard': 'Dashboard',
                    'charts': 'Charts',
                    'scenarios': 'What-If',
                    'reports': 'Reports'
                };
                const targetLabel = viewLabels[viewId];
                if (targetLabel) {
                    document.querySelectorAll('.mobile-nav-bar .nav-link').forEach(b => {
                        if (b.textContent.includes(targetLabel)) {
                            b.classList.add('active');
                        }
                    });
                }

                // v17.0: Update bottom nav active states
                document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
                const activeBottomNav = document.querySelector(`.bottom-nav-item[data-view="${viewId}"]`);
                if (activeBottomNav) activeBottomNav.classList.add('active');
            }

            // v17.0: Bottom sheet open/close with DOM node transfer
            function openBottomSheet() {
                const backdrop = document.getElementById('bottomSheetBackdrop');
                const sheet = document.getElementById('bottomSheet');
                const sheetBody = document.getElementById('bottomSheetBody');
                const scrollArea = document.querySelector('.input-scroll-area');
                const sidebarFooter = document.querySelector('.sidebar-footer');

                // Move input scroll area into bottom sheet (preserves all listeners/IDs)
                if (sheetBody && scrollArea && window.innerWidth < 769) {
                    sheetBody.appendChild(scrollArea);
                    // Also move sidebar footer (Compute, Solver, Revert buttons + validation)
                    if (sidebarFooter) { sheetBody.appendChild(sidebarFooter); }
                }

                if (backdrop) { backdrop.classList.add('visible'); }
                if (sheet) { sheet.classList.add('open'); }
                document.body.style.overflow = 'hidden';
            }
            function closeBottomSheet() {
                const backdrop = document.getElementById('bottomSheetBackdrop');
                const sheet = document.getElementById('bottomSheet');
                const panel = document.getElementById('inputPanel');
                const scrollArea = document.querySelector('.input-scroll-area');
                const sidebarFooter = document.querySelector('.sidebar-footer');

                // Move input scroll area back into sidebar panel
                if (panel && scrollArea && scrollArea.parentElement && scrollArea.parentElement.id === 'bottomSheetBody') {
                    panel.appendChild(scrollArea);
                    if (sidebarFooter) { panel.appendChild(sidebarFooter); }
                }

                if (backdrop) { backdrop.classList.remove('visible'); }
                if (sheet) { sheet.classList.remove('open'); }
                document.body.style.overflow = '';
            }

            // v17.0: Ensure inputs return to sidebar if resized to desktop while sheet is open
            // v17.2: Also resize gauge chart on orientation change / resize
            window.addEventListener('resize', function() {
                if (gaugeChartInstance) { gaugeChartInstance.resize(); }
                if (window.innerWidth >= 769) {
                    const panel = document.getElementById('inputPanel');
                    const scrollArea = document.querySelector('.input-scroll-area');
                    const sidebarFooter = document.querySelector('.sidebar-footer');
                    if (panel && scrollArea && scrollArea.parentElement && scrollArea.parentElement.id === 'bottomSheetBody') {
                        panel.appendChild(scrollArea);
                        if (sidebarFooter) { panel.appendChild(sidebarFooter); }
                    }
                    // Also close bottom sheet if open
                    const backdrop = document.getElementById('bottomSheetBackdrop');
                    const sheet = document.getElementById('bottomSheet');
                    if (backdrop) { backdrop.classList.remove('visible'); }
                    if (sheet) { sheet.classList.remove('open'); }
                    document.body.style.overflow = '';
                }
            });

            // v17.0: Mobile chart type selector
            let activeChartType = 'balance';
            function selectChartType(type) {
                activeChartType = type;
                // Update button active states
                document.querySelectorAll('.chart-type-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-chart') === type);
                });
                // Show/hide chart cards (mobile only)
                if (window.innerWidth < 769) {
                    document.querySelectorAll('[data-chart-card]').forEach(card => {
                        const isMatch = card.getAttribute('data-chart-card') === type;
                        card.classList.toggle('mobile-hidden', !isMatch);
                    });
                }
            }

            function updateChartsView() {
                const hasResults = lastSimulationResults && lastSimulationResults.paths && lastSimulationResults.paths.length > 0;

                document.getElementById('chartsEmptyState').style.display = hasResults ? 'none' : 'block';
                document.getElementById('chartsContent').style.display = hasResults ? 'block' : 'none';

                if (hasResults) {
                    // Render charts in the Charts view (re-use existing chart rendering logic)
                    renderChartsViewCharts();
                    // Apply mobile chart type filter
                    if (window.innerWidth < 769) {
                        selectChartType(activeChartType);
                    }
                }
            }

            function updateScenariosView() {
                const hasScenarios = savedScenarios && savedScenarios.length > 0;

                document.getElementById('scenariosEmptyState').style.display = hasScenarios ? 'none' : 'block';
                document.getElementById('scenariosContent').style.display = hasScenarios ? 'block' : 'none';

                // Enable/disable snapshot button based on simulation state
                const snapshotBtn = document.getElementById('scenariosSnapshotBtn');
                if (snapshotBtn) {
                    snapshotBtn.disabled = !(lastSimulationResults && lastSimulationResults.paths);
                }

                if (hasScenarios) {
                    renderScenariosGrid();
                }
            }

            function renderScenariosGrid() {
                const grid = document.getElementById('scenariosGrid');
                if (!grid || !savedScenarios) return;

                let html = '';

                // Scenario cards
                html += '<div class="scenario-cards-row">';
                html += savedScenarios.map((scenario, index) => {
                    const successRate = scenario.results?.successRate != null ? scenario.results.successRate.toFixed(0) + '%' : '--';
                    const spending = scenario.results?.sustainableSpending ? '$' + Math.round(scenario.results.sustainableSpending / 1000) + 'k/yr' : '--';
                    const date = new Date(scenario.id).toLocaleDateString();

                    return `
                <div class="scenario-card-full ${scenario.active ? 'active' : ''}" onclick="selectScenario(${scenario.id})">
                    <div class="scenario-card-header">
                        <div class="scenario-card-title">${scenario.name || 'Scenario ' + (index + 1)}</div>
                        <div class="scenario-card-date">${date}</div>
                    </div>
                    <div class="scenario-card-metrics">
                        <div class="scenario-metric">Success: <strong>${successRate}</strong></div>
                        <div class="scenario-metric">Spending: <strong>${spending}</strong></div>
                    </div>
                    <div class="scenario-actions">
                        <button class="scenario-action-btn" onclick="event.stopPropagation(); restoreScenario(${scenario.id})">
                            <i class="ph ph-arrow-counter-clockwise"></i> Restore
                        </button>
                        <button class="scenario-action-btn danger" onclick="event.stopPropagation(); deleteScenario(${scenario.id})">
                            <i class="ph ph-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
                }).join('');
                html += '</div>';

                // Comparison table (only if 2+ scenarios)
                if (savedScenarios.length >= 2) {
                    html += renderScenarioComparisonTable();
                }

                grid.innerHTML = html;
            }

            function renderScenarioComparisonTable() {
                const metrics = [
                    { label: 'Success Rate', key: 'successRate', format: v => v != null ? v.toFixed(0) + '%' : '--', higherBetter: true },
                    { label: 'Spending', key: 'sustainableSpending', format: v => v ? '$' + Math.round(v).toLocaleString() + '/yr' : '--', higherBetter: true },
                    { label: 'Coverage', key: 'coveragePercent', format: v => v != null ? v + '%' : '--', higherBetter: true },
                    { label: 'Legacy', key: 'medianLegacy', format: v => v ? '$' + Math.round(v / 1000).toLocaleString() + 'k' : '--', higherBetter: true },
                    { label: 'Lifetime Tax', key: 'lifetimeTax', format: v => v ? '$' + Math.round(v / 1000).toLocaleString() + 'k' : '--', higherBetter: false },
                    { label: 'Poor Mkts Wall', key: 'poorWall', format: v => v != null ? 'Age ' + v : 'None', higherBetter: true },
                    { label: 'Avg Mkts Wall', key: 'averageWall', format: v => v != null ? 'Age ' + v : 'None', higherBetter: true }
                ];

                // Use first scenario as baseline for delta
                const baseline = savedScenarios[0].results;

                let html = '<div class="scenario-comparison-table"><table>';
                html += '<thead><tr><th>Metric</th>';
                savedScenarios.forEach((s, i) => {
                    html += `<th>${s.name || 'Scenario ' + (i + 1)}</th>`;
                });
                html += '</tr></thead><tbody>';

                metrics.forEach(metric => {
                    html += '<tr>';
                    html += `<td class="metric-label">${metric.label}</td>`;
                    savedScenarios.forEach((s, i) => {
                        const val = s.results?.[metric.key];
                        const formatted = metric.format(val);

                        if (i === 0 || val == null || baseline[metric.key] == null) {
                            html += `<td>${formatted}</td>`;
                        } else {
                            const baseVal = baseline[metric.key];
                            // For wall ages, null means no depletion (best outcome)
                            let delta;
                            if (metric.key === 'poorWall' || metric.key === 'averageWall') {
                                if (val === null && baseVal === null) delta = 0;
                                else if (val === null) delta = 1; // improved to no wall
                                else if (baseVal === null) delta = -1; // regressed to having a wall
                                else delta = val - baseVal;
                            } else {
                                delta = val - baseVal;
                            }
                            const isGood = metric.higherBetter ? delta > 0 : delta < 0;
                            const isBad = metric.higherBetter ? delta < 0 : delta > 0;
                            let deltaClass = 'neutral';
                            let deltaIcon = '';
                            if (isGood) { deltaClass = 'positive'; deltaIcon = '<i class="ph ph-arrow-up"></i>'; }
                            else if (isBad) { deltaClass = 'negative'; deltaIcon = '<i class="ph ph-arrow-down"></i>'; }
                            html += `<td><span class="comparison-value">${formatted}</span> <span class="comparison-delta ${deltaClass}">${deltaIcon}</span></td>`;
                        }
                    });
                    html += '</tr>';
                });

                html += '</tbody></table></div>';
                return html;
            }

            function selectScenario(id) {
                savedScenarios.forEach(s => s.active = (s.id === id));
                renderScenariosGrid();
            }

            function updateReportsView() {
                const hasResults = lastSimulationResults && lastSimulationResults.paths && lastSimulationResults.paths.length > 0;

                // Update summary stats
                if (hasResults) {
                    document.getElementById('reportSuccessRate').textContent = document.getElementById('successRateValue')?.textContent || '--';
                    document.getElementById('reportMonthlyPaycheck').textContent = document.getElementById('monthlyPaycheckValue')?.textContent || '--';
                    document.getElementById('reportPortfolioRunway').textContent = document.getElementById('portfolioRunwayValue')?.textContent || '--';
                    document.getElementById('reportMedianLegacy').textContent = document.getElementById('medianFinalBalanceValue')?.textContent || '--';
                    document.getElementById('reportLifetimeTax').textContent = document.getElementById('totalLifetimeTax')?.textContent || '--';
                }

                // Enable/disable export buttons
                const pdfBtn = document.getElementById('reportPdfBtn');
                const csvBtn = document.getElementById('reportCsvBtn');
                const jsonBtn = document.getElementById('reportJsonBtn');

                if (pdfBtn) pdfBtn.disabled = !hasResults;
                if (csvBtn) csvBtn.disabled = !hasResults;
                // JSON can always be exported (just inputs)
            }

            // Charts View rendering
            let chartsViewInstances = {};

            function renderChartsViewCharts() {
                if (!lastSimulationResults || !lastSimulationResults.paths) return;

                const paths = lastSimulationResults.paths;
                const currentAge = lastSimulationResults.params.currentAge;
                const retireAge = lastSimulationResults.params.retireAge;
                const startAge = params.retireAge;
                const endAge = params.endAge;
                const retireOffset = startAge - currentAge; // Index offset for retirement start
                const ages = [];
                for (let a = startAge; a <= endAge; a++) ages.push(a);

                // Full age range for Portfolio Balance chart (includes pre-retirement)
                const allAges = [];
                for (let a = currentAge; a <= endAge; a++) allAges.push(a);

                // Destroy existing charts
                Object.values(chartsViewInstances).forEach(chart => {
                    if (chart) chart.destroy();
                });
                chartsViewInstances = {};

                const medianPath = paths[Math.floor(paths.length / 2)];

                // 1. Portfolio Balance Chart (full range: currentAge to endAge)
                const balanceCtx = document.getElementById('chartsBalanceChart');
                if (balanceCtx) {
                    const balancePercentiles = calculatePercentiles(paths, 'balances', allAges.length, 0);
                    const retireLineIndex = retireAge - currentAge;
                    chartsViewInstances.balance = new Chart(balanceCtx, {
                        type: 'line',
                        data: {
                            labels: allAges,
                            datasets: [
                                { label: '90th', data: balancePercentiles.p90, borderColor: 'rgba(16, 185, 129, 0.3)', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: '+1', borderWidth: 1, pointRadius: 0 },
                                { label: '75th', data: balancePercentiles.p75, borderColor: 'rgba(16, 185, 129, 0.4)', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: '+1', borderWidth: 1, pointRadius: 0 },
                                { label: 'Median', data: balancePercentiles.p50, borderColor: '#3b82f6', backgroundColor: 'transparent', borderWidth: 3, pointRadius: 0 },
                                { label: '25th', data: balancePercentiles.p25, borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: '+1', borderWidth: 1, pointRadius: 0 },
                                { label: '10th', data: balancePercentiles.p10, borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'transparent', borderWidth: 1, pointRadius: 0 }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: { display: true, position: 'top' },
                                tooltip: {
                                    mode: 'index',
                                    intersect: false,
                                    callbacks: {
                                        title: function(items) { return 'Age ' + items[0].label; },
                                        label: function(c) { return c.dataset.label + ': ' + formatCurrency(c.raw); }
                                    }
                                },
                                zoom: {
                                    pan: { enabled: true, mode: 'x', onPan: function() { var b = document.getElementById('zoomResetBtn'); if(b) b.style.display='inline-block'; } },
                                    zoom: {
                                        wheel: { enabled: true },
                                        pinch: { enabled: true },
                                        mode: 'x',
                                        onZoom: function() { var b = document.getElementById('zoomResetBtn'); if(b) b.style.display='inline-block'; }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: function(v) {
                                            if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
                                            return '$' + Math.round(v / 1000) + 'k';
                                        }
                                    }
                                },
                                x: { title: { display: true, text: 'Age' } }
                            }
                        },
                        plugins: [{
                            id: 'retirementLine',
                            afterDraw: function(chart) {
                                var xScale = chart.scales.x;
                                var yScale = chart.scales.y;
                                var x = xScale.getPixelForValue(retireLineIndex);
                                if (x === undefined) return;
                                var ctx = chart.ctx;
                                ctx.save();
                                ctx.beginPath();
                                ctx.setLineDash([6, 4]);
                                ctx.strokeStyle = 'rgba(100, 116, 139, 0.6)';
                                ctx.lineWidth = 2;
                                ctx.moveTo(x, yScale.top);
                                ctx.lineTo(x, yScale.bottom);
                                ctx.stroke();
                                ctx.setLineDash([]);
                                ctx.fillStyle = '#64748b';
                                ctx.font = '11px Inter, sans-serif';
                                ctx.textAlign = 'center';
                                ctx.fillText('Retirement', x, yScale.top - 8);
                                ctx.restore();
                            }
                        }]
                    });
                }

                // 2. Income Sources Chart (stacked bar) - detailed breakdown matching dashboard bars
                const incomeCtx = document.getElementById('chartsIncomeChart');
                if (incomeCtx) {
                    // Extract income data from median path - use offset for retirement years
                    const ssData = medianPath.ssIncome ? medianPath.ssIncome.slice(retireOffset) : [];
                    const pensionData = medianPath.pensionIncome ? medianPath.pensionIncome.slice(retireOffset) : [];
                    const partTimeData = medianPath.partTimeIncome ? medianPath.partTimeIncome.slice(retireOffset) : [];
                    const rmdData = medianPath.rmd ? medianPath.rmd.slice(retireOffset) : [];
                    const taxableData = medianPath.wdTaxable ? medianPath.wdTaxable.slice(retireOffset) : [];
                    const preTaxData = medianPath.wdPreTax ? medianPath.wdPreTax.slice(retireOffset) : [];
                    const rothData = medianPath.wdRoth ? medianPath.wdRoth.slice(retireOffset) : [];

                    const dataLen = ssData.length;
                    const datasets = [
                        { label: 'Social Security', data: ssData, backgroundColor: '#3b82f6', stack: 'stack1' }
                    ];
                    // Only add datasets that have nonzero data
                    if (pensionData.some(v => v > 0)) datasets.push({ label: 'Pension', data: pensionData, backgroundColor: '#10b981', stack: 'stack1' });
                    if (partTimeData.some(v => v > 0)) datasets.push({ label: 'Part-Time', data: partTimeData, backgroundColor: '#f59e0b', stack: 'stack1' });
                    if (rmdData.some(v => v > 0)) datasets.push({ label: 'RMD', data: rmdData, backgroundColor: '#a855f7', stack: 'stack1' });
                    if (taxableData.some(v => v > 0)) datasets.push({ label: 'Taxable', data: taxableData, backgroundColor: '#06b6d4', stack: 'stack1' });
                    if (preTaxData.some(v => v > 0)) datasets.push({ label: '401k/IRA', data: preTaxData, backgroundColor: '#8b5cf6', stack: 'stack1' });
                    if (rothData.some(v => v > 0)) datasets.push({ label: 'Roth', data: rothData, backgroundColor: '#ec4899', stack: 'stack1' });

                    chartsViewInstances.income = new Chart(incomeCtx, {
                        type: 'bar',
                        data: {
                            labels: ages.slice(0, dataLen),
                            datasets: datasets
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8, padding: 10, font: { size: 11 } } },
                                tooltip: {
                                    mode: 'index',
                                    intersect: false,
                                    callbacks: {
                                        title: function(items) { return 'Age ' + items[0].label; },
                                        label: function(c) { return c.raw > 0 ? c.dataset.label + ': ' + formatCurrency(c.raw) : null; }
                                    }
                                }
                            },
                            scales: {
                                y: { stacked: true, beginAtZero: true, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'K' } },
                                x: { stacked: true, title: { display: true, text: 'Age' } }
                            }
                        }
                    });
                }

                // 3. Income vs Spending Chart
                const spendingCtx = document.getElementById('chartsSpendingChart');
                if (spendingCtx) {
                    const spendingData = medianPath.spending ? medianPath.spending.slice(retireOffset) : [];
                    const incomeData = [];

                    // Total income = sum of all income sources
                    for (let i = 0; i < ages.length && i < spendingData.length; i++) {
                        const dataIdx = retireOffset + i;
                        const ss = medianPath.ssIncome?.[dataIdx] || 0;
                        const pension = medianPath.pensionIncome?.[dataIdx] || 0;
                        const pt = medianPath.partTimeIncome?.[dataIdx] || 0;
                        const rmdVal = medianPath.rmd?.[dataIdx] || 0;
                        const wdTax = medianPath.wdTaxable?.[dataIdx] || 0;
                        const wdPre = medianPath.wdPreTax?.[dataIdx] || 0;
                        const wdRo = medianPath.wdRoth?.[dataIdx] || 0;
                        incomeData.push(ss + pension + pt + rmdVal + wdTax + wdPre + wdRo);
                    }

                    chartsViewInstances.spending = new Chart(spendingCtx, {
                        type: 'line',
                        data: {
                            labels: ages.slice(0, spendingData.length),
                            datasets: [
                                { label: 'Spending Need', data: spendingData, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, borderWidth: 2, pointRadius: 0 },
                                { label: 'Total Income', data: incomeData, borderColor: '#10b981', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0, borderDash: [5, 5] }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: { display: true, position: 'top' },
                                tooltip: {
                                    mode: 'index',
                                    intersect: false,
                                    callbacks: {
                                        title: function(items) { return 'Age ' + items[0].label; },
                                        label: function(c) { return c.dataset.label + ': ' + formatCurrency(c.raw); }
                                    }
                                }
                            },
                            scales: {
                                y: { beginAtZero: true, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'K' } },
                                x: { title: { display: true, text: 'Age' } }
                            }
                        }
                    });
                }

                // 4. Tax Chart
                const taxCtx = document.getElementById('chartsTaxChart');
                if (taxCtx) {
                    const taxData = medianPath.taxes ? medianPath.taxes.slice(retireOffset) : [];
                    chartsViewInstances.tax = new Chart(taxCtx, {
                        type: 'bar',
                        data: {
                            labels: ages.slice(0, taxData.length),
                            datasets: [{ label: 'Annual Tax', data: taxData, backgroundColor: '#ef4444' }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    mode: 'index',
                                    intersect: false,
                                    callbacks: {
                                        title: function(items) { return 'Age ' + items[0].label; },
                                        label: function(c) { return 'Tax: ' + formatCurrency(c.raw); }
                                    }
                                }
                            },
                            scales: {
                                y: { beginAtZero: true, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'K' } },
                                x: { title: { display: true, text: 'Age' } }
                            }
                        }
                    });
                }

                // 5. Outcome Distribution Histogram (v16.3)
                const outcomeCtx = document.getElementById('chartsOutcomeChart');
                if (outcomeCtx) {
                    const survivedCount = paths.filter(p => p.solvent || p.depletionAge === null).length;
                    const depletedPaths = paths.filter(p => !p.solvent && p.depletionAge !== null);

                    // Build age bins from retireAge to endAge
                    const binLabels = [];
                    const depletedCounts = [];
                    const survivedBin = [];
                    for (let a = retireAge; a <= endAge; a++) {
                        binLabels.push(a);
                        const count = depletedPaths.filter(p => p.depletionAge === a).length;
                        depletedCounts.push(count);
                        survivedBin.push(a === endAge ? survivedCount : 0);
                    }

                    // Create gradient for depleted bars (red fading lighter for earlier ages)
                    const datasets = [];
                    if (depletedPaths.length > 0) {
                        datasets.push({
                            label: 'Depleted at Age',
                            data: depletedCounts,
                            backgroundColor: depletedCounts.map((_, i) => {
                                const ratio = i / (binLabels.length - 1);
                                const r = 239;
                                const g = Math.round(68 + (130 - 68) * (1 - ratio));
                                const b = Math.round(68 + (130 - 68) * (1 - ratio));
                                return `rgba(${r}, ${g}, ${b}, 0.85)`;
                            }),
                            borderColor: 'rgba(239, 68, 68, 0.6)',
                            borderWidth: 1
                        });
                    }
                    if (survivedCount > 0) {
                        datasets.push({
                            label: 'Survived to End',
                            data: survivedBin,
                            backgroundColor: 'rgba(16, 185, 129, 0.75)',
                            borderColor: 'rgba(16, 185, 129, 0.9)',
                            borderWidth: 1
                        });
                    }

                    const totalPaths = paths.length;
                    chartsViewInstances.outcome = new Chart(outcomeCtx, {
                        type: 'bar',
                        data: { labels: binLabels, datasets: datasets },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8, padding: 10, font: { size: 11 } } },
                                tooltip: {
                                    mode: 'index',
                                    intersect: false,
                                    callbacks: {
                                        title: function(items) { return 'Age ' + items[0].label; },
                                        label: function(c) {
                                            if (c.raw === 0) return null;
                                            const pct = ((c.raw / totalPaths) * 100).toFixed(1);
                                            return c.dataset.label + ': ' + c.raw + ' paths (' + pct + '%)';
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: { display: true, text: 'Number of Paths' },
                                    ticks: { stepSize: 1, callback: function(v) { return Number.isInteger(v) ? v : ''; } }
                                },
                                x: {
                                    title: { display: true, text: 'Age' },
                                    ticks: {
                                        maxTicksLimit: 20,
                                        callback: function(value, index) {
                                            const age = binLabels[index];
                                            return (age % 5 === 0) ? age : '';
                                        }
                                    }
                                }
                            }
                        }
                    });
                }

                // Populate table
                populateChartsTable();
            }

            function calculatePercentiles(paths, field, length, offset = 0) {
                const result = { p10: [], p25: [], p50: [], p75: [], p90: [] };
                for (let i = 0; i < length; i++) {
                    const dataIdx = offset + i;
                    const values = paths.map(p => (p[field] && p[field][dataIdx]) || 0).sort((a, b) => a - b);
                    const n = values.length;
                    result.p10.push(values[Math.floor(n * 0.10)] || 0);
                    result.p25.push(values[Math.floor(n * 0.25)] || 0);
                    result.p50.push(values[Math.floor(n * 0.50)] || 0);
                    result.p75.push(values[Math.floor(n * 0.75)] || 0);
                    result.p90.push(values[Math.floor(n * 0.90)] || 0);
                }
                return result;
            }

            function populateChartsTable() {
                const tbody = document.getElementById('chartsTableBody');
                if (!tbody || !lastSimulationResults || !lastSimulationResults.paths) return;

                const paths = lastSimulationResults.paths;
                const medianPath = paths[Math.floor(paths.length / 2)];
                const startAge = params.retireAge;
                const currentAge = lastSimulationResults.params.currentAge;
                const retireOffset = startAge - currentAge; // Index offset for retirement start

                let html = '';
                const totalYears = medianPath.balances ? medianPath.balances.length : 0;
                const yearsToShow = totalYears - retireOffset; // Years from retirement to end

                for (let i = 0; i < yearsToShow; i++) {
                    const dataIndex = retireOffset + i; // Actual index in data arrays
                    const age = startAge + i;
                    const balance = medianPath.balances?.[dataIndex] || 0;
                    const stockPct = medianPath.stockAllocations?.[dataIndex] || params.stockAllocation;
                    const spending = medianPath.spending?.[dataIndex] || 0;
                    const wdRate = balance > 0 ? ((spending / balance) * 100).toFixed(1) : '0.0';
                    const ss = medianPath.ssIncome?.[dataIndex] || 0;
                    const tax = medianPath.taxes?.[dataIndex] || 0;
                    const effRate = spending > 0 ? ((tax / spending) * 100).toFixed(1) : '0.0';

                    html += `<tr>
                <td>${age}</td>
                <td>${formatCurrency(balance)}</td>
                <td>${(stockPct * 100).toFixed(0)}%</td>
                <td>${formatCurrency(spending)}</td>
                <td>${wdRate}%</td>
                <td>${formatCurrency(ss)}</td>
                <td>${formatCurrency(tax)}</td>
                <td>${effRate}%</td>
            </tr>`;
                }

                tbody.innerHTML = html;
            }

            function toggleDarkMode() {
                const body = document.body;
                const icon = document.getElementById('darkModeIcon');
                body.classList.toggle('dark-mode');

                if (body.classList.contains('dark-mode')) {
                    icon.className = 'ph ph-sun';
                    localStorage.setItem('darkMode', 'enabled');
                } else {
                    icon.className = 'ph ph-moon';
                    localStorage.setItem('darkMode', 'disabled');
                }
            }

            // Check for saved dark mode preference on load
            if (localStorage.getItem('darkMode') === 'enabled') {
                document.body.classList.add('dark-mode');
                document.getElementById('darkModeIcon').className = 'ph ph-sun';
            }

            // --- Input Panel Toggle ---
            function toggleInputPanel() {
                const panel = document.querySelector('.input-panel');
                const icon = document.getElementById('inputPanelToggleIcon');
                const toggleBtn = document.getElementById('inputPanelToggle');

                panel.classList.toggle('collapsed');

                if (panel.classList.contains('collapsed')) {
                    icon.className = 'ph ph-caret-right';
                    toggleBtn.classList.add('panel-collapsed');
                    localStorage.setItem('inputPanelCollapsed', 'true');
                } else {
                    icon.className = 'ph ph-caret-left';
                    toggleBtn.classList.remove('panel-collapsed');
                    localStorage.setItem('inputPanelCollapsed', 'false');
                }
            }

            // --- Mobile Panel Overlay (v16.0) ---
            function openMobilePanel() {
                const panel = document.getElementById('inputPanel');
                const backdrop = document.getElementById('mobileOverlayBackdrop');
                if (panel) {
                    panel.classList.remove('collapsed');
                    panel.classList.add('mobile-open');
                }
                if (backdrop) {
                    backdrop.style.display = 'block';
                    // Force reflow then activate
                    backdrop.offsetHeight;
                    backdrop.classList.add('active');
                }
                document.body.style.overflow = 'hidden';
            }

            function closeMobilePanel() {
                const panel = document.getElementById('inputPanel');
                const backdrop = document.getElementById('mobileOverlayBackdrop');
                if (panel) {
                    panel.classList.remove('mobile-open');
                }
                if (backdrop) {
                    backdrop.classList.remove('active');
                    setTimeout(() => { backdrop.style.display = 'none'; }, 300);
                }
                document.body.style.overflow = '';
            }

            function restoreInputPanelState() {
                const isCollapsed = localStorage.getItem('inputPanelCollapsed') === 'true';
                if (isCollapsed) {
                    const panel = document.querySelector('.input-panel');
                    const icon = document.getElementById('inputPanelToggleIcon');
                    const toggleBtn = document.getElementById('inputPanelToggle');
                    if (panel && icon && toggleBtn) {
                        panel.classList.add('collapsed');
                        icon.className = 'ph ph-caret-right';
                        toggleBtn.classList.add('panel-collapsed');
                    }
                }
            }

            function updateFilingStatus() {
                // Kept for logic compatibility - filing status is derived in collectInputs
            }

            function toggleHousingSettings() {
                const type = document.getElementById('housingTypeSelect').value;
                document.getElementById('housingOwn').checked = (type === 'own');
                document.getElementById('housingRent').checked = (type === 'rent');
                document.getElementById('housingOwnSettings').style.display = (type === 'own') ? 'block' : 'none';
                document.getElementById('housingRentSettings').style.display = (type === 'rent') ? 'block' : 'none';
            }

            function toggleRothConversionSettings() {
                const enabled = document.getElementById('enableRothConversion').checked;
                document.getElementById('rothConversionSettings').style.display = enabled ? 'block' : 'none';
            }

            function togglePartTimeSettings() {
                const enabled = document.getElementById('enablePartTime').checked;
                document.getElementById('partTimeSettings').style.display = enabled ? 'block' : 'none';
            }

            function toggleWindfallSettings() {
                const enabled = document.getElementById('enableWindfall').checked;
                document.getElementById('windfallSettings').style.display = enabled ? 'block' : 'none';
            }
            function toggleSpendingReductionSettings() {
                const enabled = document.getElementById('enableSpendingReduction').checked;
                document.getElementById('spendingReductionSettings').style.display = enabled ? 'block' : 'none';
            }
            function toggleGlidePathSettings() {
                const enabled = document.getElementById('enableGlidePath').checked;
                document.getElementById('glidePathSettings').style.display = enabled ? 'block' : 'none';
            }

            function toggleGuardrailSettings() {
                const enabled = document.getElementById('enableGuardrails').checked;
                document.getElementById('guardrailSettings').style.display = enabled ? 'block' : 'none';
            }

            function toggleTodaysDollars() {
                const toggleEl = document.getElementById('showTodaysDollars');
                if (!toggleEl) return;
                const showReal = toggleEl.checked;

                // Update hero pill legacy value
                const pillValueEl = document.getElementById('heroPillLegacy');
                const pillSubtextEl = document.getElementById('heroPillLegacySubtext');

                // Also update hidden legacy element for reports
                const hiddenLegacyEl = document.getElementById('medianFinalBalanceValue');

                if (showReal && medianFinalBalanceReal > 0) {
                    if (pillValueEl) pillValueEl.textContent = formatCurrency(medianFinalBalanceReal);
                    if (pillSubtextEl) pillSubtextEl.innerHTML = '<i class="ph ph-arrows-counter-clockwise"></i> Today\'s purchasing power';
                    if (hiddenLegacyEl) hiddenLegacyEl.textContent = formatCurrency(medianFinalBalanceReal);
                } else {
                    if (pillValueEl) pillValueEl.textContent = formatCurrency(medianFinalBalanceNominal);
                    if (pillSubtextEl) pillSubtextEl.innerHTML = '<i class="ph ph-trend-up"></i> Future dollars';
                    if (hiddenLegacyEl) hiddenLegacyEl.textContent = formatCurrency(medianFinalBalanceNominal);
                }
            }

            // --- Tax and RMD Calculation Logic ---

            // RMD Calculation (Uniform Lifetime Table - Simplified Approximation)
            function getDistributionPeriod(age) {
                if (age < 75) return 0; // SECURE 2.0 Act: RMDs begin at age 75 for those born 1960+
                const table = {
                    75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
                    80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8,
                    85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9,
                    90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5,
                    95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8,
                    100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9, // BUG-006 fix: extended table
                    105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5
                };
                return table[age] || 3.5; // Floor at 3.5 for ages beyond 110 (BUG-006 fix)
            }

            function calculateSSBenefit(baseFRA, claimAge, currentAge, FRA, annualCOLA, earnings, limit) {
                if (baseFRA <= 0) return 0;
                if (currentAge < claimAge) return 0;

                let factor = 1.0;
                const yearsDiff = claimAge - FRA;
                if (yearsDiff > 0) {
                    factor += (yearsDiff * 0.08); // 8%/yr delayed credit
                } else if (yearsDiff < 0) {
                    // BUG-002 fix: SSA tiered early claiming reduction
                    // First 36 months early: 5/9 of 1% per month (6.67%/yr)
                    // Beyond 36 months: 5/12 of 1% per month (5%/yr)
                    const monthsEarly = Math.abs(yearsDiff) * 12;
                    if (monthsEarly <= 36) {
                        factor -= monthsEarly * (5 / 900); // 5/9 of 1% = 5/900
                    } else {
                        factor -= 36 * (5 / 900) + (monthsEarly - 36) * (5 / 1200); // 5/12 of 1% = 5/1200
                    }
                }

                let benefit = baseFRA * factor;

                // COLA is handled externally via * inflation at the call site (line ~8889).
                // Do NOT apply internal COLA here to avoid double-inflation. (BUG-001 fix)

                if (currentAge < FRA && earnings > limit) {
                    const reduction = (earnings - limit) / 2;
                    benefit = Math.max(0, benefit - reduction);
                }

                return benefit;
            }

            // Calculate spousal benefit with accurate SSA reduction formulas
            function calculateSpousalBenefit(higherEarnerPIA, spouseClaimAge, FRA) {
                // Spousal benefit is 50% of higher earner's PIA (benefit at FRA)
                const baseSpousalBenefit = higherEarnerPIA * 0.5;

                // No adjustment if claiming at or after FRA
                if (spouseClaimAge >= FRA) {
                    return baseSpousalBenefit;
                }

                // Calculate reduction for early claiming
                const monthsEarly = (FRA - spouseClaimAge) * 12;
                let reductionPercent = 0;

                if (monthsEarly <= 36) {
                    // First 36 months: 25/36 of 1% per month = 0.6944% per month
                    reductionPercent = monthsEarly * (25 / 36) / 100;
                } else {
                    // First 36 months: 25%
                    // Additional months: 5/12 of 1% per month = 0.4167% per month
                    const first36Reduction = 36 * (25 / 36) / 100;
                    const additionalMonths = monthsEarly - 36;
                    const additionalReduction = additionalMonths * (5 / 12) / 100;
                    reductionPercent = first36Reduction + additionalReduction;
                }

                return baseSpousalBenefit * (1 - reductionPercent);
            }

            // Helper function to calculate own benefit with claiming age adjustment
            function calculateOwnBenefitAtClaiming(baseFRA, claimAge, FRA) {
                if (baseFRA <= 0) return 0;

                let factor = 1.0;
                const yearsDiff = claimAge - FRA;
                if (yearsDiff > 0) {
                    factor += (yearsDiff * 0.08);
                } else if (yearsDiff < 0) {
                    // BUG-002b fix: SSA tiered early claiming reduction
                    const monthsEarly = Math.abs(yearsDiff) * 12;
                    if (monthsEarly <= 36) {
                        factor -= monthsEarly * (5 / 900);
                    } else {
                        factor -= 36 * (5 / 900) + (monthsEarly - 36) * (5 / 1200);
                    }
                }

                return baseFRA * factor;
            }

            // Determine which spouse (if any) should receive spousal benefit
            function determineSpousalBenefitRecipient(userPIA, spousePIA, userClaimAge, spouseClaimAge, currentYearAge, spouseCurrentAge) {
                // Check if both have filed
                const bothHaveFiled = currentYearAge >= userClaimAge && spouseCurrentAge >= spouseClaimAge;
                if (!bothHaveFiled) {
                    return { recipient: 'none', higherPIA: 0, lowerClaimAge: 0 };
                }

                // Calculate own benefits at their respective claiming ages (with claiming age adjustments)
                const userOwnBenefit = calculateOwnBenefitAtClaiming(userPIA, userClaimAge, 67);
                const spouseOwnBenefit = calculateOwnBenefitAtClaiming(spousePIA, spouseClaimAge, 67);

                // Calculate what spousal benefit would be for each at their respective claiming ages
                const userSpousalBenefit = calculateSpousalBenefit(spousePIA, userClaimAge, 67);
                const spouseSpousalBenefit = calculateSpousalBenefit(userPIA, spouseClaimAge, 67);

                // Check if spouse would benefit from spousal benefit based on user's record
                // Compare properly adjusted amounts: spousal benefit vs own benefit (both at spouse's claiming age)
                if (spouseSpousalBenefit > spouseOwnBenefit) {
                    return { recipient: 'spouse', higherPIA: userPIA, lowerClaimAge: spouseClaimAge };
                }

                // Check if user would benefit from spousal benefit based on spouse's record
                // Compare properly adjusted amounts: spousal benefit vs own benefit (both at user's claiming age)
                if (userSpousalBenefit > userOwnBenefit) {
                    return { recipient: 'user', higherPIA: spousePIA, lowerClaimAge: userClaimAge };
                }

                // Neither qualifies
                return { recipient: 'none', higherPIA: 0, lowerClaimAge: 0 };
            }

            function calculateFederalOrdinaryTax(taxableIncome, status, bracketMult, sdMult, useTCJASunset = false) {
                if (taxableIncome <= 0) return 0;

                // Select appropriate deductions and brackets based on TCJA status
                let baseSD, brackets;
                if (useTCJASunset) {
                    baseSD = status === 'MFJ' ? STD_DEDUCTION_MFJ_PRE_TCJA : STD_DEDUCTION_SINGLE_PRE_TCJA;
                    brackets = status === 'MFJ' ? BRACKETS_MFJ_PRE_TCJA : BRACKETS_SINGLE_PRE_TCJA;
                } else {
                    baseSD = status === 'MFJ' ? STD_DEDUCTION_MFJ : STD_DEDUCTION_SINGLE;
                    brackets = status === 'MFJ' ? BRACKETS_MFJ : BRACKETS_SINGLE;
                }

                const SD = baseSD * sdMult;

                let income = Math.max(0, taxableIncome - SD);
                let tax = 0;
                let previousCap = 0;

                for (let b of brackets) {
                    const adjCap = b.cap * bracketMult;
                    if (income > previousCap) {
                        const taxableInBracket = Math.min(income, adjCap) - previousCap;
                        tax += taxableInBracket * b.rate;
                        previousCap = adjCap;
                    } else {
                        break;
                    }
                }
                return tax;
            }

            function calculateTaxableSS(ssIncome, otherTaxableIncome, filingStatus) {
                if (ssIncome <= 0) return 0;
                const provisionalIncome = otherTaxableIncome + (ssIncome * 0.5);
                let taxablePercent = 0;
                if (filingStatus === 'MFJ') {
                    if (provisionalIncome <= 32000) { taxablePercent = 0; }
                    else if (provisionalIncome <= 44000) {
                        const excess = provisionalIncome - 32000;
                        taxablePercent = Math.min(0.50, (excess * 0.5) / ssIncome);
                    } else {
                        const excess = provisionalIncome - 44000;
                        const base = Math.min(ssIncome * 0.5, 6000);
                        const additional = excess * 0.85;
                        taxablePercent = Math.min(0.85, (base + additional) / ssIncome);
                    }
                } else {
                    if (provisionalIncome <= 25000) { taxablePercent = 0; }
                    else if (provisionalIncome <= 34000) {
                        const excess = provisionalIncome - 25000;
                        taxablePercent = Math.min(0.50, (excess * 0.5) / ssIncome);
                    } else {
                        const excess = provisionalIncome - 34000;
                        const base = Math.min(ssIncome * 0.5, 4500);
                        const additional = excess * 0.85;
                        taxablePercent = Math.min(0.85, (base + additional) / ssIncome);
                    }
                }
                return ssIncome * taxablePercent;
            }

            function calculateCapGainsTax(taxableGains, ordinaryIncome, filingStatus, bracketMult, sdMult) {
                if (taxableGains <= 0) return 0;
                const SD = (filingStatus === 'MFJ' ? STD_DEDUCTION_MFJ : STD_DEDUCTION_SINGLE) * sdMult;
                const taxableOrdinary = Math.max(0, ordinaryIncome - SD);

                let zeroRateCap, fifteenRateCap;
                if (filingStatus === 'MFJ') {
                    zeroRateCap = CAP_GAINS_0_MFJ * bracketMult;
                    fifteenRateCap = CAP_GAINS_15_MFJ * bracketMult;
                } else {
                    zeroRateCap = CAP_GAINS_0_SINGLE * bracketMult;
                    fifteenRateCap = CAP_GAINS_15_SINGLE * bracketMult;
                }

                let tax = 0;

                // 0% Bracket
                const roomIn0Bracket = Math.max(0, zeroRateCap - taxableOrdinary);
                const in0Bracket = Math.min(taxableGains, roomIn0Bracket);
                let remainingGains = taxableGains - in0Bracket;

                // 15% Bracket
                const roomIn15Bracket = Math.max(0, fifteenRateCap - taxableOrdinary - in0Bracket);
                const in15Bracket = Math.min(remainingGains, roomIn15Bracket);
                remainingGains -= in15Bracket;
                tax += in15Bracket * 0.15;

                // 20% Bracket (all remaining)
                tax += remainingGains * 0.20;

                return tax;
            }

            function calculateNIIT(ordinaryIncome, taxableGains, filingStatus) {
                const niitThreshold = filingStatus === 'MFJ' ? NIIT_THRESHOLD_MFJ : NIIT_THRESHOLD_SINGLE;
                const magi = ordinaryIncome + taxableGains;
                const niitBase = Math.max(0, magi - niitThreshold);
                // NIIT applies to the lesser of net investment income (cap gains + interest/dividends) or the MAGI over the threshold.
                // We approximate net investment income as the taxable gains.
                return Math.min(niitBase, taxableGains) * 0.038;
            }

            function calculateStateTax(ordinaryIncome, taxableGains, stateRate, filingStatus, sdMult) {
                if (stateRate <= 0) return 0;
                const SD = (filingStatus === 'MFJ' ? STD_DEDUCTION_MFJ : STD_DEDUCTION_SINGLE) * sdMult;
                // State tax typically applies to AGI (Ord Income) + Capital Gains, less a state deduction (approximated here by Federal SD)
                const stateTaxableBase = Math.max(0, ordinaryIncome + taxableGains - SD);
                return stateTaxableBase * stateRate;
            }

            function calculateIRMAA(magi, filingStatus, inflationMult) {
                let thresholds, surcharges;
                // 2025 IRMAA (simplified based on 2024 data adjusted for est. inflation)
                if (filingStatus === 'MFJ') {
                    thresholds = [212000 * inflationMult, 266000 * inflationMult, 332000 * inflationMult, 398000 * inflationMult, 750000 * inflationMult];
                    surcharges = [0, 70, 175, 280, 385, 420];
                } else {
                    thresholds = [106000 * inflationMult, 133000 * inflationMult, 166000 * inflationMult, 199000 * inflationMult, 500000 * inflationMult];
                    surcharges = [0, 70, 175, 280, 385, 420];
                }
                let monthlyCharge = 0;
                if (magi <= thresholds[0]) monthlyCharge = surcharges[0];
                else if (magi <= thresholds[1]) monthlyCharge = surcharges[1];
                else if (magi <= thresholds[2]) monthlyCharge = surcharges[2];
                else if (magi <= thresholds[3]) monthlyCharge = surcharges[3];
                else if (magi <= thresholds[4]) monthlyCharge = surcharges[4];
                else monthlyCharge = surcharges[5];
                return monthlyCharge * 12;
            }

            // WARNING-01 fix: Input validation gate
            function validateInputs() {
                const errors = [];
                const age = getNumberValue('currentAge');
                const retireAge = getNumberValue('retireAge');
                const endAge = getNumberValue('endAge');
                const numPaths = getNumberValue('numPaths');
                const spouseAge = getNumberValue('spouseAge');
                const userSS = getNumberValue('userSS');
                const spouseSS = getNumberValue('spouseSS');

                if (age < 18 || age > 120) errors.push('Current age must be between 18 and 120.');
                if (retireAge < age) errors.push('Retirement age must be &ge; current age.');
                if (endAge <= retireAge) errors.push('End age must be greater than retirement age.');
                if (numPaths < 1) errors.push('Number of simulation paths must be at least 1.');

                // Balance checks
                const balanceFields = [
                    ['userPreTaxBalance', 'Pre-Tax Balance'],
                    ['userRothBalance', 'Roth Balance'],
                    ['spousePreTaxBalance', 'Spouse Pre-Tax Balance'],
                    ['spouseRothBalance', 'Spouse Roth Balance'],
                    ['taxableBalance', 'Taxable Balance']
                ];
                for (const [id, label] of balanceFields) {
                    if (getNumberValue(id) < 0) errors.push(`${label} cannot be negative.`);
                }

                if (getNumberValue('lifestyleSpending') < 0) errors.push('Annual spending cannot be negative.');

                // SS claim age validation (only if SS > 0)
                const userClaimAge = getNumberValue('userClaimAge');
                if (userSS > 0 && (userClaimAge < 62 || userClaimAge > 70)) {
                    errors.push('SS claim age must be between 62 and 70.');
                }
                const spouseClaimAge = getNumberValue('spouseClaimAge');
                if (spouseSS > 0 && (spouseClaimAge < 62 || spouseClaimAge > 70)) {
                    errors.push('Spouse SS claim age must be between 62 and 70.');
                }

                if (spouseAge > 0 && spouseAge < 18) errors.push('Spouse age must be at least 18.');

                // Stock allocation range
                const stockAlloc = getNumberValue('stockAllocation');
                if (stockAlloc < 0 || stockAlloc > 100) errors.push('Stock allocation must be between 0% and 100%.');

                // Conditional pension age checks
                const pension = getNumberValue('pension');
                const pensionAge = getNumberValue('pensionAge');
                if (pension > 0 && pensionAge < age) errors.push('Pension start age must be &ge; current age.');
                const spousePension = getNumberValue('spousePension');
                const spousePensionAge = getNumberValue('spousePensionAge');
                if (spousePension > 0 && spouseAge > 0 && spousePensionAge < spouseAge) errors.push('Spouse pension start age must be &ge; spouse age.');

                // Conditional part-time age checks
                const enablePartTime = document.getElementById('enablePartTime')?.checked;
                const partTimeIncome = getNumberValue('partTimeIncome');
                if (enablePartTime && partTimeIncome > 0) {
                    const ptStart = getNumberValue('partTimeStartAge');
                    const ptEnd = getNumberValue('partTimeEndAge');
                    if (ptStart < age) errors.push('Part-time start age must be &ge; current age.');
                    if (ptEnd <= ptStart) errors.push('Part-time end age must be greater than start age.');
                }

                // Conditional mortgage age check
                const mortgagePrincipal = getNumberValue('mortgagePrincipal');
                if (mortgagePrincipal > 0) {
                    const mortgageLastAge = getNumberValue('mortgageLastAge');
                    if (mortgageLastAge <= 0) errors.push('Mortgage payoff age must be specified when mortgage payment is entered.');
                }

                // Spouse retire age check
                const spouseRetireAge = getNumberValue('spouseRetireAge');
                if (spouseAge > 0 && spouseRetireAge < spouseAge) errors.push('Spouse retirement age must be &ge; spouse age.');

                // Roth conversion range check
                const enableRothConversion = document.getElementById('enableRothConversion')?.checked;
                if (enableRothConversion) {
                    const rcStart = getNumberValue('rothConversionStartAge');
                    const rcEnd = getNumberValue('rothConversionEndAge');
                    if (rcEnd < rcStart) errors.push('Roth conversion end age must be &ge; start age.');
                }

                // Return/volatility reasonableness
                const stockReturn = getNumberValue('stockReturn') / 100;
                const bondReturn = getNumberValue('bondReturn') / 100;
                const stockVol = getNumberValue('stockVol') / 100;
                const bondVol = getNumberValue('bondVol') / 100;
                if (stockReturn < -0.5 || stockReturn > 0.5) errors.push('Stock return must be between -50% and 50%.');
                if (bondReturn < -0.5 || bondReturn > 0.5) errors.push('Bond return must be between -50% and 50%.');
                if (stockVol <= 0) errors.push('Stock volatility must be greater than 0.');
                if (bondVol <= 0) errors.push('Bond volatility must be greater than 0.');

                return errors;
            }

            function collectInputs() {
                return {
                    numPaths: getNumberValue('numPaths'),
                    currentAge: getNumberValue('currentAge'),
                    retireAge: getNumberValue('retireAge'),
                    endAge: getNumberValue('endAge'),
                    spouseAge: getNumberValue('spouseAge'),
                    spouseRetireAge: getNumberValue('spouseRetireAge'),

                    userSS: getNumberValue('userSS'),
                    userClaimAge: getNumberValue('userClaimAge'),
                    spouseSS: getNumberValue('spouseSS'),
                    spouseClaimAge: getNumberValue('spouseClaimAge'),
                    enableSpousalBenefit: document.getElementById('enableSpousalBenefit').checked,

                    enablePartTime: document.getElementById('enablePartTime').checked,
                    partTimeIncome: getNumberValue('partTimeIncome'),
                    partTimeStartAge: getNumberValue('partTimeStartAge'),
                    partTimeEndAge: getNumberValue('partTimeEndAge'),

                    enableWindfall: document.getElementById('enableWindfall').checked,
                    windfallAmount: getNumberValue('windfallAmount'),
                    windfallAge: getNumberValue('windfallAge'),

                    userPreTaxBalance: getNumberValue('userPreTaxBalance'),
                    userRothBalance: getNumberValue('userRothBalance'),
                    spousePreTaxBalance: getNumberValue('spousePreTaxBalance'),
                    spouseRothBalance: getNumberValue('spouseRothBalance'),
                    taxableBalance: getNumberValue('taxableBalance'),

                    currentSalary: getNumberValue('currentSalary'),
                    userSavingsRate: getNumberValue('userSavingsRate') / 100,
                    userSavingsDest: document.getElementById('userSavingsDest').value,

                    spouseCurrentSalary: getNumberValue('spouseCurrentSalary'),
                    spouseSavingsRate: getNumberValue('spouseSavingsRate') / 100,
                    spouseSavingsDest: document.getElementById('spouseSavingsDest').value,

                    pension: getNumberValue('pension'),
                    pensionAge: getNumberValue('pensionAge'),
                    spousePension: getNumberValue('spousePension'),
                    spousePensionAge: getNumberValue('spousePensionAge'),
                    enablePensionCOLA: document.getElementById('enablePensionCOLA').checked,
                    enableSpousePensionCOLA: document.getElementById('enableSpousePensionCOLA').checked,

                    enableRothConversion: document.getElementById('enableRothConversion').checked,
                    rothConversionAmount: getNumberValue('rothConversionAmount'),
                    rothConversionStartAge: getNumberValue('rothConversionStartAge'),
                    rothConversionEndAge: getNumberValue('rothConversionEndAge'),

                    lifestyleSpending: getNumberValue('lifestyleSpending'),
                    lifestyleInflation: getNumberValue('lifestyleInflation') / 100,
                    enableSpendingReduction: document.getElementById('enableSpendingReduction').checked,
                    spendingReductionAge: getNumberValue('spendingReductionAge'),
                    spendingReductionPercent: getNumberValue('spendingReductionPercent') / 100,

                    enableGuardrails: document.getElementById('enableGuardrails').checked,
                    guardrailCeiling: getNumberValue('guardrailCeiling') / 100,
                    guardrailFloor: getNumberValue('guardrailFloor') / 100,
                    guardrailAdjustment: getNumberValue('guardrailAdjustment') / 100,

                    housingType: (document.querySelector('input[name="housingType"]:checked') || {value: 'own'}).value, // BUG-003 fix: null guard
                    mortgagePrincipal: getNumberValue('mortgagePrincipal'),
                    mortgageLastAge: getNumberValue('mortgageLastAge'),
                    propertyTax: getNumberValue('propertyTax'),
                    monthlyRent: getNumberValue('monthlyRent'),

                    healthcarePre65: getNumberValue('healthcarePre65'),
                    healthcare65: getNumberValue('healthcare65'),
                    healthcareInflation: getNumberValue('healthcareInflation') / 100,

                    stockAllocation: getNumberValue('stockAllocation') / 100,
                    enableGlidePath: document.getElementById('enableGlidePath').checked,
                    endingStockAllocation: getNumberValue('endingStockAllocation') / 100,
                    stockReturn: getNumberValue('stockReturn') / 100,
                    stockVol: getNumberValue('stockVol') / 100,
                    bondReturn: getNumberValue('bondReturn') / 100,
                    bondVol: getNumberValue('bondVol') / 100,
                    bracketGrowth: getNumberValue('bracketGrowth') / 100,
                    enableTCJASunset: document.getElementById('enableTCJASunset').checked,
                    stateTaxRate: getNumberValue('stateTaxRate') / 100,
                    taxableGainRatio: getNumberValue('taxableGainRatio') / 100,
                };
            }

            function simulatePath(params, solverPathIndex = null) {
                let userPreTax = params.userPreTaxBalance;
                let userRoth = params.userRothBalance;
                let spousePreTax = params.spousePreTaxBalance;
                let spouseRoth = params.spouseRothBalance;
                let taxable = params.taxableBalance;

                // Deterministic RNG for solver evaluations (reused market scenarios across spending tests)
                const useDeterministicRNG = !!(params && params._solverDeterministic && solverPathIndex !== null && solverPathIndex !== undefined);
                const rng = useDeterministicRNG
                    ? mulberry32(((((params._solverSeedBase >>> 0) || 0) + ((solverPathIndex + 1) * 0x9E3779B9)) >>> 0))
                    : null;

                let isSolvent = true;
                let depletionAge = null;
                let pathLog = [];
                let totalTaxPaid = 0;

                // Guardrail tracking variables
                let previousYearBalance = userPreTax + userRoth + spousePreTax + spouseRoth + taxable;
                let guardrailSpendingMultiplier = 1.0;  // Cumulative adjustment from guardrails
                let guardrailTriggersThisPath = 0;

                const filingStatus = params.spouseAge > 0 ? 'MFJ' : 'Single';
                const yearsToRun = params.endAge - params.currentAge;
                const FRA = 67; // Full Retirement Age (SSA)

                for (let i = 0; i <= yearsToRun; i++) {
                    const currentYearAge = params.currentAge + i;
                    const spouseCurrentAge = params.spouseAge > 0 ? params.spouseAge + i : 0;
                    const inflation = Math.pow(1 + params.lifestyleInflation, i);
                    const bracketMult = Math.pow(1 + params.bracketGrowth, i);

                    // 1. Market Returns (correlated via Cholesky decomposition)
                    const STOCK_BOND_CORR = -0.3; // Historical stock-bond correlation
                    const z1 = gaussianRandom(0, 1, rng);
                    const z2 = gaussianRandom(0, 1, rng);
                    const stockR = params.stockReturn + params.stockVol * z1;
                    const bondR = params.bondReturn + params.bondVol * (STOCK_BOND_CORR * z1 + Math.sqrt(1 - STOCK_BOND_CORR * STOCK_BOND_CORR) * z2);
                    let currentStockAllocation = params.stockAllocation;
                    if (params.enableGlidePath && yearsToRun > 0) {
                        const progress = i / yearsToRun;
                        currentStockAllocation = params.stockAllocation + (params.endingStockAllocation - params.stockAllocation) * progress;
                    }
                    const portfolioR = (currentStockAllocation * stockR) + ((1 - currentStockAllocation) * bondR);

                    // Apply return to start-of-year balances
                    userPreTax *= (1 + portfolioR);
                    userRoth *= (1 + portfolioR);
                    spousePreTax *= (1 + portfolioR);
                    spouseRoth *= (1 + portfolioR);
                    taxable *= (1 + portfolioR);

                    const userPreTax_startOfYear = userPreTax;
                    const spousePreTax_startOfYear = spousePreTax;
                    const taxable_startOfYear = taxable;
                    const userRoth_startOfYear = userRoth;
                    const spouseRoth_startOfYear = spouseRoth;

                    // 2. Work Income & Contributions (pre-tax deducted before tax convergence)
                    const userWorking = currentYearAge < params.retireAge;
                    const spouseWorking = params.spouseAge > 0 && spouseCurrentAge < params.spouseRetireAge;
                    let userSalary = userWorking ? params.currentSalary * inflation : 0;
                    let spouseSalary = spouseWorking ? params.spouseCurrentSalary * inflation : 0;
                    const totalSalary = userSalary + spouseSalary;

                    let userPreTaxContrib = 0;
                    let spousePreTaxContrib = 0;
                    let userRothContrib = 0;
                    let spouseRothContrib = 0;

                    if (userWorking && userSalary > 0) {
                        let userLimit = LIMIT_401K;
                        if (currentYearAge >= 50) userLimit += CATCHUP_401K;
                        if (currentYearAge >= 60 && currentYearAge <= 63) userLimit = LIMIT_401K + SUPER_CATCHUP_401K;

                        let userContrib = userSalary * params.userSavingsRate;
                        userContrib = Math.min(userContrib, userLimit);

                        if (params.userSavingsDest === 'pretax') userPreTaxContrib = userContrib;
                        else if (params.userSavingsDest === 'roth') userRothContrib = userContrib;
                        else { userPreTaxContrib = userContrib * 0.5; userRothContrib = userContrib * 0.5; }

                        userPreTax += userPreTaxContrib;
                        userRoth += userRothContrib;
                    }

                    if (spouseWorking && spouseSalary > 0) {
                        let spouseLimit = LIMIT_401K;
                        if (spouseCurrentAge >= 50) spouseLimit += CATCHUP_401K;
                        if (spouseCurrentAge >= 60 && spouseCurrentAge <= 63) spouseLimit = LIMIT_401K + SUPER_CATCHUP_401K;

                        let spouseContrib = spouseSalary * params.spouseSavingsRate;
                        spouseContrib = Math.min(spouseContrib, spouseLimit);

                        if (params.spouseSavingsDest === 'pretax') spousePreTaxContrib = spouseContrib;
                        else if (params.spouseSavingsDest === 'roth') spouseRothContrib = spouseContrib;
                        else { spousePreTaxContrib = spouseContrib * 0.5; spouseRothContrib = spouseContrib * 0.5; }

                        spousePreTax += spousePreTaxContrib;
                        spouseRoth += spouseRothContrib;
                    }

                    const userNetSalary = userSalary - (userPreTaxContrib + userRothContrib);
                    const spouseNetSalary = spouseSalary - (spousePreTaxContrib + spouseRothContrib);

                    // 3. Guaranteed Income & RMDs
                    let otherIncome = 0;
                    const userPensionMult = params.enablePensionCOLA ? inflation : 1;
                    const spousePensionMult = params.enableSpousePensionCOLA ? inflation : 1;
                    if (currentYearAge >= params.pensionAge) otherIncome += params.pension * userPensionMult;
                    if (spouseCurrentAge >= params.spousePensionAge && params.spouseAge > 0) otherIncome += params.spousePension * spousePensionMult;
                    let ptIncome = 0;
                    if (params.enablePartTime && currentYearAge >= params.partTimeStartAge && currentYearAge <= params.partTimeEndAge) ptIncome = params.partTimeIncome * inflation;

                    // Calculate individual SS benefits
                    let userSSBenefit = calculateSSBenefit(params.userSS, params.userClaimAge, currentYearAge, FRA, SS_COLA, ptIncome, SS_EARNINGS_LIMIT);
                    let spouseSSBenefit = 0;
                    if (params.spouseAge > 0) {
                        spouseSSBenefit = calculateSSBenefit(params.spouseSS, params.spouseClaimAge, spouseCurrentAge, FRA, SS_COLA, 0, SS_EARNINGS_LIMIT);
                    }

                    // Apply spousal benefit if enabled
                    if (params.enableSpousalBenefit && params.spouseAge > 0) {
                        const spousalInfo = determineSpousalBenefitRecipient(
                            params.userSS,
                            params.spouseSS,
                            params.userClaimAge,
                            params.spouseClaimAge,
                            currentYearAge,
                            spouseCurrentAge
                        );

                        if (spousalInfo.recipient === 'spouse') {
                            // Spouse gets spousal benefit based on user's record
                            // COLA handled externally via * inflation (BUG-001 fix)
                            const spousalAmount = calculateSpousalBenefit(spousalInfo.higherPIA, spousalInfo.lowerClaimAge, FRA);
                            spouseSSBenefit = Math.max(spouseSSBenefit, spousalAmount);
                        } else if (spousalInfo.recipient === 'user') {
                            // User gets spousal benefit based on spouse's record
                            // COLA handled externally via * inflation (BUG-001 fix)
                            const spousalAmount = calculateSpousalBenefit(spousalInfo.higherPIA, spousalInfo.lowerClaimAge, FRA);
                            userSSBenefit = Math.max(userSSBenefit, spousalAmount);
                        }
                    }

                    let ssIncome = (userSSBenefit + spouseSSBenefit) * inflation;


                    let userRmd = 0, spouseRmd = 0;
                    const userDistPeriod = getDistributionPeriod(currentYearAge);
                    if (userDistPeriod > 0 && userPreTax > 0) { userRmd = userPreTax_startOfYear / userDistPeriod; }
                    if (params.spouseAge > 0) {
                        const spouseDistPeriod = getDistributionPeriod(spouseCurrentAge);
                        if (spouseDistPeriod > 0 && spousePreTax > 0) { spouseRmd = spousePreTax_startOfYear / spouseDistPeriod; }
                    }
                    const totalRmd = userRmd + spouseRmd;

                    let rothConversion = 0;
                    if (params.enableRothConversion && currentYearAge >= params.rothConversionStartAge && currentYearAge <= params.rothConversionEndAge) {
                        let targetConversion = params.rothConversionAmount * inflation;
                        if (targetConversion > 0) {
                            const userConvert = Math.min(userPreTax_startOfYear - userRmd, targetConversion);
                            rothConversion += userConvert; targetConversion -= userConvert;
                            const spouseConvert = Math.min(spousePreTax_startOfYear - spouseRmd, targetConversion);
                            rothConversion += spouseConvert;
                        }
                    }

                    // 4. Spending
                    let baseLifestyle = params.lifestyleSpending;
                    if (params.enableSpendingReduction && currentYearAge >= params.spendingReductionAge) baseLifestyle *= (1 - params.spendingReductionPercent);

                    // Apply Guardrails (Guyton-Klinger style)
                    const currentTotalBalance = userPreTax_startOfYear + spousePreTax_startOfYear + taxable_startOfYear + userRoth_startOfYear + spouseRoth_startOfYear;
                    if (params.enableGuardrails && currentYearAge >= params.retireAge && currentTotalBalance > 0 && i > 0) {
                        // Calculate projected withdrawal rate (spending / portfolio value)
                        const projectedWithdrawalRate = (baseLifestyle * inflation * guardrailSpendingMultiplier) / currentTotalBalance;

                        // Ceiling guardrail: if withdrawal rate too high, reduce spending
                        if (projectedWithdrawalRate > params.guardrailCeiling) {
                            guardrailSpendingMultiplier *= (1 - params.guardrailAdjustment);
                            guardrailTriggersThisPath++;
                        }
                        // Floor guardrail: if withdrawal rate very low AND portfolio grew, allow increase
                        else if (projectedWithdrawalRate < params.guardrailFloor && currentTotalBalance > previousYearBalance) {
                            guardrailSpendingMultiplier *= (1 + params.guardrailAdjustment);
                            guardrailTriggersThisPath++;
                        }
                        // Capital preservation: never increase beyond original if portfolio dropped
                        if (currentTotalBalance < previousYearBalance && guardrailSpendingMultiplier > 1.0) {
                            guardrailSpendingMultiplier = Math.min(guardrailSpendingMultiplier, 1.0);
                        }
                    }

                    let lifestyle = baseLifestyle * inflation * guardrailSpendingMultiplier;

                    let housing = 0;
                    if (params.housingType === 'own') {
                        if (currentYearAge <= params.mortgageLastAge) housing += (params.mortgagePrincipal * 12) * inflation;
                        housing += params.propertyTax * Math.pow(1 + params.lifestyleInflation, i); // Property tax often tracks CPI
                    } else { housing += (params.monthlyRent * 12) * inflation; }

                    let medicareCount = 0;
                    if (currentYearAge >= 65) medicareCount++;
                    if (spouseCurrentAge >= 65) medicareCount++;

                    let health = 0;
                    const healthInfl = Math.pow(1 + params.healthcareInflation, i);
                    const userRetired = currentYearAge >= params.retireAge;
                    const spouseRetired = params.spouseAge > 0 && spouseCurrentAge >= params.spouseRetireAge;

                    if (currentYearAge >= 65) { health += params.healthcare65 * healthInfl; }
                    else if (userRetired) { health += params.healthcarePre65 * healthInfl; }

                    if (spouseCurrentAge >= 65) { health += params.healthcare65 * healthInfl; }
                    else if (spouseRetired && spouseCurrentAge > 0) { health += params.healthcarePre65 * healthInfl; }

                    const baseSpending = lifestyle + housing + health;

                    // 5. CRITICAL: Tax Convergence Loop (to solve circular dependency)
                    let iterationTax = 0;
                    let finalTax = 0;
                    let withdrawals_converged = { taxable: 0, userPreTax: 0, spousePreTax: 0, userRoth: 0, spouseRoth: 0 };
                    let totalWithdrawal = 0;
                    let finalOrdIncome = 0;
                    let finalTaxableGains = 0;
                    let irmaa = 0;
                    let totalNeed = baseSpending; // FIX: Initialize totalNeed before the loop

                    for (let iteration = 0; iteration < 5; iteration++) {
                        // Temporary balances for this iteration (reset after RMD)
                        let temp_userPreTax = userPreTax_startOfYear - userRmd;
                        let temp_spousePreTax = spousePreTax_startOfYear - spouseRmd;
                        let temp_taxable = taxable_startOfYear;
                        let temp_userRoth = userRoth_startOfYear;
                        let temp_spouseRoth = spouseRoth_startOfYear;

                        // 5a. Calculate available non-portfolio/non-tax-burdened cash
                        const availableCash = userNetSalary + spouseNetSalary + otherIncome + ptIncome + ssIncome + totalRmd;

                        // The gap includes the spending need + the tax burden (estimated from last pass)
                        let gap = totalNeed + iterationTax - availableCash; // Use totalNeed here

                        let withdrawals_this_pass = { taxable: 0, userPreTax: 0, spousePreTax: 0, userRoth: 0, spouseRoth: 0 };
                        let taxableGains_this_pass = 0;

                        if (gap > 0) {
                            // Waterfall Order: Taxable -> Pre-Tax (User/Spouse, oldest first) -> Roth
                            // 1. Taxable
                            if (temp_taxable > 0) {
                                const pull = Math.min(temp_taxable, gap);
                                temp_taxable -= pull; gap -= pull; withdrawals_this_pass.taxable = pull;
                                taxableGains_this_pass = pull * params.taxableGainRatio;
                            }

                            // 2. Pre-Tax (Order by age to manage RMDs/tax more logically)
                            const userIsOlder = currentYearAge >= spouseCurrentAge;
                            if (userIsOlder) {
                                if (gap > 0 && temp_userPreTax > 0) { const pull = Math.min(temp_userPreTax, gap); temp_userPreTax -= pull; gap -= pull; withdrawals_this_pass.userPreTax = pull; }
                                if (gap > 0 && temp_spousePreTax > 0) { const pull = Math.min(temp_spousePreTax, gap); temp_spousePreTax -= pull; gap -= pull; withdrawals_this_pass.spousePreTax = pull; }
                            } else {
                                if (gap > 0 && temp_spousePreTax > 0) { const pull = Math.min(temp_spousePreTax, gap); temp_spousePreTax -= pull; gap -= pull; withdrawals_this_pass.spousePreTax = pull; }
                                if (gap > 0 && temp_userPreTax > 0) { const pull = Math.min(temp_userPreTax, gap); temp_userPreTax -= pull; gap -= pull; withdrawals_this_pass.userPreTax = pull; }
                            }

                            // 3. Roth (No tax effect, used for convergence stability)
                            if (gap > 0 && temp_userRoth > 0) { const pull = Math.min(temp_userRoth, gap); temp_userRoth -= pull; gap -= pull; withdrawals_this_pass.userRoth = pull; }
                            if (gap > 0 && temp_spouseRoth > 0) { const pull = Math.min(temp_spouseRoth, gap); temp_spouseRoth -= pull; gap -= pull; withdrawals_this_pass.spouseRoth = pull; }
                        }

                        totalWithdrawal = withdrawals_this_pass.taxable + withdrawals_this_pass.userPreTax + withdrawals_this_pass.spousePreTax + withdrawals_this_pass.userRoth + withdrawals_this_pass.spouseRoth;

                        // 5b. Calculate Ordinary Income for this pass
                        const ordIncomeFromWithdrawals = withdrawals_this_pass.userPreTax + withdrawals_this_pass.spousePreTax;
                        const ordIncomeFromSalary = userNetSalary + spouseNetSalary;
                        const ordIncomeFromContributions = userRothContrib + spouseRothContrib; // Roth contributions are taxed income

                        let currentOrdIncome = ordIncomeFromSalary + ordIncomeFromContributions + otherIncome + ptIncome + totalRmd + rothConversion + ordIncomeFromWithdrawals;

                        // 5c. SS Tax calculation (SS taxability depends on other income + capital gains per IRS)
                        const taxableSS = calculateTaxableSS(ssIncome, currentOrdIncome + taxableGains_this_pass, filingStatus);
                        currentOrdIncome += taxableSS;

                        // 5d. Calculate IRMAA (depends on MAGI)
                        if (medicareCount > 0) {
                            const estimatedMAGI = currentOrdIncome + taxableGains_this_pass;
                            irmaa = calculateIRMAA(estimatedMAGI, filingStatus, inflation);
                        }

                        // 5e. Calculate New Total Tax
                        // Determine if TCJA has sunset (2026+)
                        const currentCalendarYear = 2025 + i;  // Assumes simulation starts in 2025
                        const useTCJASunset = params.enableTCJASunset && currentCalendarYear >= 2026;

                        const federalOrdinaryTax = calculateFederalOrdinaryTax(currentOrdIncome, filingStatus, bracketMult, inflation, useTCJASunset);
                        const capGainsTax = calculateCapGainsTax(taxableGains_this_pass, currentOrdIncome, filingStatus, bracketMult, inflation);
                        const niitTax = calculateNIIT(currentOrdIncome, taxableGains_this_pass, filingStatus);
                        const stateTax = calculateStateTax(currentOrdIncome, taxableGains_this_pass, params.stateTaxRate, filingStatus, inflation);

                        let newTax = federalOrdinaryTax + capGainsTax + niitTax + stateTax;

                        // 5f. Check for Convergence / Finalize
                        if (Math.abs(newTax - iterationTax) < 1 || iteration === 4) { // Converged if diff < $1 or max 5 passes reached
                            finalTax = newTax;
                            withdrawals_converged = withdrawals_this_pass;
                            finalOrdIncome = currentOrdIncome;
                            finalTaxableGains = taxableGains_this_pass;
                            break;
                        }

                        iterationTax = newTax;

                        // Update total need with new IRMAA, which forces another convergence pass if it's significant.
                        // This line was the source of the error in V8.3, but the check for convergence is better
                        // done on the tax change itself, which the main loop does. We only update totalNeed for the next loop run.
                        totalNeed = baseSpending + irmaa;
                    } // End Tax Convergence Loop

                    // 6. Update Permanent Balances based on converged withdrawals
                    userPreTax = userPreTax_startOfYear - userRmd - withdrawals_converged.userPreTax;
                    spousePreTax = spousePreTax_startOfYear - spouseRmd - withdrawals_converged.spousePreTax;
                    taxable = taxable_startOfYear - withdrawals_converged.taxable;
                    userRoth = userRoth_startOfYear - withdrawals_converged.userRoth;
                    spouseRoth = spouseRoth_startOfYear - withdrawals_converged.spouseRoth;

                    // Apply Roth Conversion (must happen after withdrawals, before log/solvency check)
                    if (rothConversion > 0) {
                        const userConvert = Math.min(userPreTax, rothConversion);
                        userPreTax -= userConvert; userRoth += userConvert;
                        const spouseConvert = Math.min(spousePreTax, rothConversion - userConvert);
                        spousePreTax -= spouseConvert; spouseRoth += spouseConvert;
                    }

                    // Apply Windfall
                    if (params.enableWindfall && currentYearAge === params.windfallAge) {
                        taxable += params.windfallAmount; // Amount is assumed to be in dollars at the age received
                    }

                    // 7. Solvency Check & Log
                    totalTaxPaid += finalTax;
                    const totalBal = userPreTax + spousePreTax + userRoth + spouseRoth + taxable;
                    const effectiveRate = finalOrdIncome > 0 ? (finalTax / finalOrdIncome) : 0;

                    if (totalBal < 1 && isSolvent) {
                        isSolvent = false;
                        depletionAge = currentYearAge;
                        userPreTax = 0; spousePreTax = 0; userRoth = 0; spouseRoth = 0; taxable = 0; // zero out balances
                    }

                    pathLog.push({
                        age: currentYearAge,
                        totalBal: totalBal,
                        rmd: totalRmd,
                        totalWithdrawal: totalWithdrawal,
                        ordIncome: finalOrdIncome,
                        taxBill: finalTax,
                        effRate: effectiveRate,
                        spending: totalNeed,
                        stockAlloc: currentStockAllocation,
                        ssIncome: ssIncome,
                        pensionIncome: otherIncome,
                        partTimeIncome: ptIncome,
                        discretionaryWithdrawal: Math.max(0, totalWithdrawal - totalRmd),
                        // Detailed withdrawal breakdown by account type
                        // Note: RMDs are withdrawn separately from discretionary pre-tax withdrawals
                        wdTaxable: withdrawals_converged.taxable,
                        wdPreTax: withdrawals_converged.userPreTax + withdrawals_converged.spousePreTax,  // Discretionary pre-tax (beyond RMD)
                        wdRoth: withdrawals_converged.userRoth + withdrawals_converged.spouseRoth,
                        inflation: inflation,
                        isSolvent: isSolvent
                    });
                    if (!isSolvent) { userPreTax = 0; spousePreTax = 0; userRoth = 0; spouseRoth = 0; taxable = 0; }

                    // Update previous year balance for guardrails
                    previousYearBalance = totalBal;
                }
                return { log: pathLog, finalBalance: userPreTax + spousePreTax + userRoth + spouseRoth + taxable, totalTax: totalTaxPaid, solvent: isSolvent, depletionAge: depletionAge, guardrailTriggers: guardrailTriggersThisPath };
            }

            function generateKeyObservations(params, stats) {
                const observations = [];
                const sr = stats.successRate;
                const totalBalance = params.userPreTaxBalance + params.userRothBalance + params.spousePreTaxBalance + params.spouseRothBalance + params.taxableBalance;
                const totalPreTax = params.userPreTaxBalance + params.spousePreTaxBalance;

                if (sr < 75) {
                    observations.push("High risk of portfolio depletion. The plan has a success rate below 75%. Review spending inputs or increase savings/retirement age.");
                } else if (sr < 90) {
                    observations.push("The plan is feasible but success is not guaranteed (75-90%). Consider increasing contributions or optimizing the withdrawal strategy.");
                }

                if (totalPreTax > 0 && totalBalance > 0) {
                    const preTaxRatio = (totalPreTax / totalBalance) * 100;
                    if (preTaxRatio > 75) {
                        observations.push(`${preTaxRatio.toFixed(0)}% of the starting portfolio is in **Pre-Tax** accounts. This asset mix will result in significant future Required Minimum Distributions (RMDs) and high tax liability, potentially pushing you into higher tax brackets in retirement.`);
                    } else if (preTaxRatio < 25) {
                        observations.push(`${preTaxRatio.toFixed(0)}% of the starting portfolio is in Pre-Tax accounts. While beneficial for low RMDs, you may be missing out on current tax deferral benefits if your current marginal tax rate is high.`);
                    }
                }

                // WARNING-02 fix: observation for taxable-heavy portfolios
                if (totalBalance > 0) {
                    const taxableRatio = (params.taxableBalance / totalBalance) * 100;
                    if (taxableRatio > 75 && sr < 50) {
                        observations.push(`${taxableRatio.toFixed(0)}% of the starting portfolio is in **Taxable** accounts. Every withdrawal from taxable accounts triggers capital gains tax (based on a ${(params.taxableGainRatio * 100).toFixed(0)}% gain ratio), reducing spendable income. Consider diversifying into Roth or Pre-Tax accounts for more tax-efficient retirement withdrawals.`);
                    }
                }

                if (params.enableRothConversion && params.rothConversionAmount > 0) {
                    observations.push(`**Roth Conversion Strategy** is enabled at ${formatCurrency(params.rothConversionAmount)}/year from Age ${params.rothConversionStartAge} to ${params.rothConversionEndAge}. This is an effective way to manage future RMDs, but results in higher current taxes.`);
                } else if (totalPreTax > 0 && params.retireAge < 75) {
                    const retireGap = 75 - params.retireAge; // SECURE 2.0: RMDs begin at 75 for those born 1960+
                    if (retireGap > 0) {
                        observations.push(`You have a ${retireGap}-year "taxable gap" between retirement and RMDs (Age 75). This is a prime window to perform **Roth Conversions** while your income is low.`);
                    }
                }

                if (params.userSS > 0 || params.spouseSS > 0) {
                    const userSSDiff = params.userClaimAge - 67;
                    const spouseSSDiff = params.spouseClaimAge - 67;
                    if (userSSDiff < 0 || spouseSSDiff < 0) {
                        observations.push(`**Early Social Security Claiming** (You: Age ${params.userClaimAge}, Spouse: Age ${params.spouseClaimAge}) results in permanently reduced benefits. Consider claiming later if cash flow permits.`);
                    }
                }

                if (params.enableGlidePath) {
                    observations.push(`**Glide Path** is enabled, reducing stock allocation from ${params.stockAllocation * 100}% to ${params.endingStockAllocation * 100}% over the planning horizon, decreasing risk over time.`);
                }

                if (params.stateTaxRate > 0) {
                    observations.push(`The simulation includes a ${formatPercent(params.stateTaxRate)} state tax rate, significantly increasing the overall tax drag on the portfolio.`);
                }

                if (params.enableGuardrails) {
                    observations.push(`**Spending Guardrails** are active (ceiling: ${(params.guardrailCeiling * 100).toFixed(1)}%, floor: ${(params.guardrailFloor * 100).toFixed(1)}%). Spending will automatically adjust based on withdrawal rate to extend plan longevity.`);
                }

                if (params.enableTCJASunset) {
                    observations.push(`**TCJA Sunset** is modeled. Tax brackets revert to higher pre-2017 rates starting in 2026 (e.g., 12%&rarr;15%, 22%&rarr;25%, 24%&rarr;28%). This increases projected tax liability.`);
                }

                // Roth Conversion Bracket Suggestion
                if (!params.enableRothConversion && totalPreTax > 50000 && params.retireAge < 75) {
                    const filingStatus = params.spouseAge > 0 ? 'MFJ' : 'Single';
                    // Estimate income in early retirement (just SS + pension, no salary)
                    const estimatedRetirementIncome = params.userSS + params.spouseSS + params.pension + params.spousePension;

                    // 2025 bracket thresholds (22% and 24%)
                    const bracket22Top = filingStatus === 'MFJ' ? 201050 : 100525;
                    const bracket24Top = filingStatus === 'MFJ' ? 383900 : 191950;
                    const stdDeduction = filingStatus === 'MFJ' ? 31500 : 15750;

                    const taxableIncome = Math.max(0, estimatedRetirementIncome - stdDeduction);
                    const roomIn22 = Math.max(0, bracket22Top - taxableIncome);
                    const roomIn24 = Math.max(0, bracket24Top - taxableIncome);

                    if (roomIn22 > 20000) {
                        observations.push(`&#x1F4A1; **Roth Conversion Opportunity:** Based on your inputs, you may have ~${formatCurrency(Math.round(roomIn22 / 1000) * 1000)} of "room" in the 22% tax bracket during early retirement (before RMDs begin). Converting Pre-Tax funds during this window locks in a lower tax rate and reduces future RMDs.`);
                    } else if (roomIn24 > 20000) {
                        observations.push(`&#x1F4A1; **Roth Conversion Opportunity:** Based on your inputs, you may have ~${formatCurrency(Math.round(roomIn24 / 1000) * 1000)} of "room" before the 32% bracket. Consider Roth conversions to reduce future RMD tax burden.`);
                    }
                }

                return observations;
            }

            function initiateSimulation() {
                // WARNING-01 fix: validate inputs before simulation
                const validationErrors = validateInputs();
                const errDiv = document.getElementById('validationErrors');
                if (validationErrors.length > 0) {
                    errDiv.innerHTML = '<strong>Please fix the following:</strong><br>' + validationErrors.join('<br>');
                    errDiv.style.display = 'block';
                    return;
                }
                errDiv.style.display = 'none';

                // Snapshot inputs before compute for Revert (v15.6)
                // Skip if lever already captured pre-change snapshot (v16.2)
                if (window._skipNextSnapshot) {
                    window._skipNextSnapshot = false;
                } else {
                    inputSnapshots.push(getAllInputValues());
                    if (inputSnapshots.length > 3) inputSnapshots.shift();
                    updateRevertButton();
                }

                params = collectInputs();

                const runBtn = document.getElementById('runSimulationBtn');
                runBtn.disabled = true;
                runBtn.classList.add('computing');
                const rocketIcon = runBtn.querySelector('i.ph');
                if (rocketIcon) { rocketIcon.className = 'ph ph-spinner'; rocketIcon.style.animation = 'spin 1s linear infinite'; }
                document.getElementById('btnText').textContent = "Computing...";
                const progressLine = document.getElementById('progressContainer');
                const progressFill = document.getElementById('progressBar');
                progressLine.style.display = 'block';

                document.getElementById('resultsContent').style.display = "block";
                document.getElementById('initialMessage').style.display = "none";
                document.getElementById('dispEndAge').textContent = params.endAge;

                setTimeout(() => {
                    simulationResults = [];
                    let solved = 0;

                    for (let i = 0; i < params.numPaths; i++) {
                        const res = simulatePath(params);
                        simulationResults.push(res);
                        if (res.solvent) solved++;
                        if (i % 50 === 0) progressFill.style.width = ((i / params.numPaths) * 100).toFixed(0) + "%";
                    }
                    progressFill.style.width = "100%";

                    // BUG-007 fix: guard against empty results (e.g., numPaths=0)
                    if (simulationResults.length === 0) {
                        restoreComputeButton();
                        alert('No simulation paths were generated. Please set Number of Paths to at least 1.');
                        return;
                    }

                    const numYears = simulationResults[0].log.length;
                    const p10Index = Math.floor(params.numPaths * 0.10);
                    const p25Index = Math.floor(params.numPaths * 0.25);
                    const p50Index = Math.floor(params.numPaths * 0.50);
                    const p75Index = Math.floor(params.numPaths * 0.75);
                    const p90Index = Math.floor(params.numPaths * 0.90);

                    const allTaxes = simulationResults.map(r => r.totalTax).sort((a, b) => a - b);
                    const medianLifetimeTax = allTaxes[p50Index];

                    simulationResults.sort((a, b) => {
                        if (a.finalBalance !== b.finalBalance) return a.finalBalance - b.finalBalance;
                        const aDepAge = a.depletionAge === null ? Infinity : a.depletionAge;
                        const bDepAge = b.depletionAge === null ? Infinity : b.depletionAge;
                        return aDepAge - bDepAge;
                    });
                    const medianFinalBalance = simulationResults[p50Index].finalBalance;
                    medianPathData = simulationResults[p50Index].log;

                    const percentilesByAge = { p10: [], p25: [], p50: [], p75: [], p90: [] };

                    for (let yearIdx = 0; yearIdx < numYears; yearIdx++) {
                        const age = simulationResults[0].log[yearIdx].age;
                        const balancesAtYear = simulationResults.map(r => r.log[yearIdx].totalBal).sort((a, b) => a - b);
                        percentilesByAge.p10.push({ age: age, totalBal: balancesAtYear[p10Index] });
                        percentilesByAge.p25.push({ age: age, totalBal: balancesAtYear[p25Index] });
                        percentilesByAge.p50.push({ age: age, totalBal: balancesAtYear[p50Index] });
                        percentilesByAge.p75.push({ age: age, totalBal: balancesAtYear[p75Index] });
                        percentilesByAge.p90.push({ age: age, totalBal: balancesAtYear[p90Index] });
                    }

                    percentilePathsData = percentilesByAge;

                    simulationStats = {
                        successRate: (solved / params.numPaths) * 100,
                        medianFinalBalance: medianFinalBalance,
                        totalLifetimeTax: medianLifetimeTax,
                        percentileFinalBalances: {
                            p10: simulationResults[p10Index].finalBalance,
                            p25: simulationResults[p25Index].finalBalance,
                            p50: medianFinalBalance,
                            p75: simulationResults[p75Index].finalBalance,
                            p90: simulationResults[p90Index].finalBalance
                        }
                    };

                    const observations = generateKeyObservations(params, simulationStats);

                    // Calculate today's dollars value (discount by inflation)
                    const yearsToEnd = params.endAge - params.currentAge;
                    const inflationDiscount = Math.pow(1 + params.lifestyleInflation, yearsToEnd);
                    medianFinalBalanceNominal = medianFinalBalance;
                    medianFinalBalanceReal = medianFinalBalance / inflationDiscount;

                    // Reset today's dollars toggle
                    const todaysDollarsToggle = document.getElementById('showTodaysDollars');
                    if (todaysDollarsToggle) todaysDollarsToggle.checked = false;

                    // Calculate Monthly Paycheck (first retirement year net spendable)
                    const retireYearIndex = Math.max(0, params.retireAge - params.currentAge);
                    let monthlyPaycheck = 0;
                    if (retireYearIndex < medianPathData.length) {
                        const retireYearData = medianPathData[retireYearIndex];
                        const netSpendable = retireYearData.spending - retireYearData.taxBill;
                        monthlyPaycheck = Math.max(0, netSpendable) / 12;
                    }

                    // Calculate Portfolio Runway (years until depletion on median path)
                    const medianPath = simulationResults[p50Index];
                    let portfolioRunway = params.endAge - params.currentAge; // Default: full horizon
                    if (medianPath.depletionAge !== null) {
                        portfolioRunway = medianPath.depletionAge - params.currentAge;
                    }

                    // Calculate Initial Withdrawal Rate (at retirement start)
                    let initialWDRate = 0;
                    if (retireYearIndex < medianPathData.length) {
                        const retireYearData = medianPathData[retireYearIndex];
                        if (retireYearData.totalBal > 0) {
                            initialWDRate = (retireYearData.totalWithdrawal / retireYearData.totalBal) * 100;
                        }
                    }

                    // Render KPI
                    const rate = simulationStats.successRate;
                    document.getElementById('successRateValue').textContent = `${rate.toFixed(0)}%`;
                    // Update ARIA for gauge (v16.0)
                    const gaugeAriaEl = document.getElementById('gaugeAriaContainer');
                    if (gaugeAriaEl) gaugeAriaEl.setAttribute('aria-valuenow', Math.round(rate));

                    // Legacy elements for backwards compatibility (hidden, used by reports)
                    const legacyEl = document.getElementById('medianFinalBalanceValue');
                    if (legacyEl) legacyEl.textContent = formatCurrency(medianFinalBalance);
                    const taxEl = document.getElementById('totalLifetimeTax');
                    if (taxEl) taxEl.textContent = formatCurrency(medianLifetimeTax);
                    const paycheckEl = document.getElementById('monthlyPaycheckValue');
                    if (paycheckEl) paycheckEl.textContent = formatCurrency(Math.round(monthlyPaycheck));
                    const runwayEl = document.getElementById('portfolioRunwayValue');
                    if (runwayEl) runwayEl.textContent = portfolioRunway >= (params.endAge - params.currentAge) ? (params.endAge - params.currentAge) + '+ yrs' : portfolioRunway + ' yrs';

                    const recBox = document.getElementById('recommendationArea');
                    recBox.innerHTML = ''; // Clear previous content
                    let recHeader = '';

                    if (rate > 90) {
                        recBox.className = "recommendation-box success";
                        recHeader = '<i class="ph ph-check-circle" style="font-size:1.5rem;"></i><strong>Audit Passed:</strong> High probability of success. Plan is robust.';
                    } else if (rate > 75) {
                        recBox.className = "recommendation-box warning";
                        recHeader = '<i class="ph ph-warning" style="font-size:1.5rem;"></i><strong>Audit Warning:</strong> Plan is feasible but tight. Review tax and spending assumptions.';
                    } else {
                        recBox.className = "recommendation-box danger";
                        recHeader = '<i class="ph ph-x-circle" style="font-size:1.5rem;"></i><strong>Audit Failed:</strong> High risk of depletion. Immediate action required.';
                    }

                    recBox.innerHTML = `<div class="rec-header">${recHeader}</div>`;
                    recBox.innerHTML += `<ul class="rec-list">${observations.map(o => `<li>${o}</li>`).join('')}</ul>`;

                    renderCharts(medianPathData, percentilePathsData, rate);
                    renderTable(medianPathData);

                    // Render Your Story narrative view
                    renderYourStory();
                    updateReportsView(); // WARNING-03 fix: refresh Reports Quick Summary on every compute

                    document.getElementById('runSimulationBtn').disabled = false;
                    const scenariosBtn = document.getElementById('scenariosSnapshotBtn');
                    if (scenariosBtn) scenariosBtn.disabled = false;

                    // Store results for Charts/Reports views
                    lastSimulationResults = {
                        paths: simulationResults.map(r => ({
                            balances: r.log.map(y => y.totalBal),
                            spending: r.log.map(y => y.spending),
                            taxes: r.log.map(y => y.taxBill),
                            ssIncome: r.log.map(y => y.ssIncome || 0),
                            pensionIncome: r.log.map(y => y.pensionIncome || 0),
                            partTimeIncome: r.log.map(y => y.partTimeIncome || 0),
                            rmd: r.log.map(y => y.rmd || 0),
                            wdTaxable: r.log.map(y => y.wdTaxable || 0),
                            wdPreTax: r.log.map(y => y.wdPreTax || 0),
                            wdRoth: r.log.map(y => y.wdRoth || 0),
                            stockAllocations: r.log.map(y => y.stockAlloc || params.stockAllocation),
                            finalBalance: r.finalBalance,
                            depletionAge: r.depletionAge,
                            solvent: r.solvent
                        })),
                        stats: simulationStats,
                        params: { ...params }
                    };

                    // Update Charts view if currently active
                    const activeView = document.querySelector('.main-view.active');
                    if (activeView && activeView.id === 'chartsView') {
                        renderChartsViewCharts();
                    }

                    restoreComputeButton();
                    progressLine.style.display = 'none';

                    // Lever apply callback (v16.2)
                    if (window._leverApplyCallback) {
                        window._leverApplyCallback();
                        window._leverApplyCallback = null;
                    }

                    // Onboarding tour trigger (v16.2)
                    if (!hasCompletedFirstSimulation && shouldShowTour()) {
                        hasCompletedFirstSimulation = true;
                        setTimeout(startTour, 800);
                    }
                    hasCompletedFirstSimulation = true;
                }, 100);
            }

            // Restore Compute button to default state after simulation (v16.1)
            function restoreComputeButton() {
                const runBtn = document.getElementById('runSimulationBtn');
                runBtn.disabled = false;
                runBtn.classList.remove('computing');
                const icon = runBtn.querySelector('i.ph');
                if (icon) { icon.className = 'ph ph-rocket-launch'; icon.style.animation = ''; }
                document.getElementById('btnText').textContent = "Compute Plan";
            }

            // Solver Modal Functions
            // --- Goal Solver Current Settings Tracker ---
            let solverOriginalValues = {};
            let solverAppliedChanges = {};

            function initSolverTracker() {
                // Capture original values when modal opens - but only if not already tracking
                // This preserves applied changes state across tab navigation
                if (Object.keys(solverAppliedChanges).length === 0) {
                    const userPreTax = parseFloat(document.getElementById('userPreTaxBalance').value.replace(/,/g, '')) || 0;
                    const userRoth = parseFloat(document.getElementById('userRothBalance').value.replace(/,/g, '')) || 0;
                    const spousePreTax = parseFloat(document.getElementById('spousePreTaxBalance').value.replace(/,/g, '')) || 0;
                    const spouseRoth = parseFloat(document.getElementById('spouseRothBalance').value.replace(/,/g, '')) || 0;
                    const taxable = parseFloat(document.getElementById('taxableBalance').value.replace(/,/g, '')) || 0;

                    solverOriginalValues = {
                        retireAge: parseFloat(document.getElementById('retireAge').value) || 0,
                        lifestyleSpending: parseFloat(document.getElementById('lifestyleSpending').value.replace(/,/g, '')) || 0,
                        userSavingsRate: parseFloat(document.getElementById('userSavingsRate').value) || 0,
                        targetPortfolio: userPreTax + userRoth + spousePreTax + spouseRoth + taxable,
                        // Store individual balances for reset
                        userPreTaxBalance: userPreTax,
                        userRothBalance: userRoth,
                        spousePreTaxBalance: spousePreTax,
                        spouseRothBalance: spouseRoth,
                        taxableBalance: taxable
                    };
                }
                updateSolverTracker();
            }

            function updateSolverTracker() {
                const userPreTax = parseFloat(document.getElementById('userPreTaxBalance').value.replace(/,/g, '')) || 0;
                const userRoth = parseFloat(document.getElementById('userRothBalance').value.replace(/,/g, '')) || 0;
                const spousePreTax = parseFloat(document.getElementById('spousePreTaxBalance').value.replace(/,/g, '')) || 0;
                const spouseRoth = parseFloat(document.getElementById('spouseRothBalance').value.replace(/,/g, '')) || 0;
                const taxable = parseFloat(document.getElementById('taxableBalance').value.replace(/,/g, '')) || 0;

                const currentValues = {
                    retireAge: parseFloat(document.getElementById('retireAge').value) || 0,
                    lifestyleSpending: parseFloat(document.getElementById('lifestyleSpending').value.replace(/,/g, '')) || 0,
                    userSavingsRate: parseFloat(document.getElementById('userSavingsRate').value) || 0,
                    targetPortfolio: userPreTax + userRoth + spousePreTax + spouseRoth + taxable
                };

                let html = '';
                let hasChanges = false;

                // Retirement Age
                html += '<div class="solver-setting-item">';
                html += '<span class="solver-setting-label">&bull; Retirement Age:</span>';
                if (solverAppliedChanges.retireAge) {
                    html += `<span class="solver-setting-value">${solverOriginalValues.retireAge}</span>`;
                    html += '<span class="solver-setting-arrow">&rarr;</span>';
                    html += `<span class="solver-setting-changed">${currentValues.retireAge}</span>`;
                    html += '<span class="solver-setting-checkmark">&#10003;</span>';
                    hasChanges = true;
                } else {
                    html += `<span class="solver-setting-value">${currentValues.retireAge}</span>`;
                }
                html += '</div>';

                // Annual Spending
                html += '<div class="solver-setting-item">';
                html += '<span class="solver-setting-label">&bull; Annual Spending:</span>';
                if (solverAppliedChanges.lifestyleSpending) {
                    html += `<span class="solver-setting-value">$${Math.round(solverOriginalValues.lifestyleSpending).toLocaleString()}</span>`;
                    html += '<span class="solver-setting-arrow">&rarr;</span>';
                    html += `<span class="solver-setting-changed">$${Math.round(currentValues.lifestyleSpending).toLocaleString()}</span>`;
                    html += '<span class="solver-setting-checkmark">&#10003;</span>';
                    hasChanges = true;
                } else {
                    html += `<span class="solver-setting-value">$${Math.round(currentValues.lifestyleSpending).toLocaleString()}</span>`;
                }
                html += '</div>';

                // Savings Rate
                html += '<div class="solver-setting-item">';
                html += '<span class="solver-setting-label">&bull; Savings Rate:</span>';
                if (solverAppliedChanges.userSavingsRate) {
                    html += `<span class="solver-setting-value">${solverOriginalValues.userSavingsRate}%</span>`;
                    html += '<span class="solver-setting-arrow">&rarr;</span>';
                    html += `<span class="solver-setting-changed">${currentValues.userSavingsRate}%</span>`;
                    html += '<span class="solver-setting-checkmark">&#10003;</span>';
                    hasChanges = true;
                } else {
                    html += `<span class="solver-setting-value">${currentValues.userSavingsRate}%</span>`;
                }
                html += '</div>';

                // Target Portfolio
                html += '<div class="solver-setting-item">';
                html += '<span class="solver-setting-label">&bull; Target Portfolio:</span>';
                if (solverAppliedChanges.targetPortfolio) {
                    html += `<span class="solver-setting-value">$${Math.round(solverOriginalValues.targetPortfolio).toLocaleString()}</span>`;
                    html += '<span class="solver-setting-arrow">&rarr;</span>';
                    html += `<span class="solver-setting-changed">$${Math.round(currentValues.targetPortfolio).toLocaleString()}</span>`;
                    html += '<span class="solver-setting-checkmark">&#10003;</span>';
                    hasChanges = true;
                } else {
                    html += `<span class="solver-setting-value">$${Math.round(currentValues.targetPortfolio).toLocaleString()}</span>`;
                }
                html += '</div>';

                // Update both modal and inline grids
                const grid = document.getElementById('solverCurrentSettings');
                const gridInline = document.getElementById('solverCurrentSettingsInline');
                const resetBtn = document.getElementById('solverResetBtn');
                const resetBtnInline = document.getElementById('solverResetBtnInline');
                const appliedChangesInline = document.getElementById('solverAppliedChangesInline');

                if (grid) grid.innerHTML = html;
                if (gridInline) gridInline.innerHTML = html;
                if (resetBtn) resetBtn.style.display = hasChanges ? 'block' : 'none';
                if (resetBtnInline) resetBtnInline.style.display = hasChanges ? 'flex' : 'none';
                if (appliedChangesInline) appliedChangesInline.style.display = hasChanges ? 'block' : 'none';
            }

            function resetSolverChanges() {
                if (!confirm('Reset all applied changes back to original values?')) return;

                // Restore original values to sidebar inputs
                document.getElementById('retireAge').value = solverOriginalValues.retireAge;
                document.getElementById('lifestyleSpending').value = Math.round(solverOriginalValues.lifestyleSpending).toLocaleString();
                document.getElementById('userSavingsRate').value = solverOriginalValues.userSavingsRate;

                // Restore all balance fields
                document.getElementById('userPreTaxBalance').value = Math.round(solverOriginalValues.userPreTaxBalance).toLocaleString();
                document.getElementById('userRothBalance').value = Math.round(solverOriginalValues.userRothBalance).toLocaleString();
                document.getElementById('spousePreTaxBalance').value = Math.round(solverOriginalValues.spousePreTaxBalance).toLocaleString();
                document.getElementById('spouseRothBalance').value = Math.round(solverOriginalValues.spouseRothBalance).toLocaleString();
                document.getElementById('taxableBalance').value = Math.round(solverOriginalValues.taxableBalance).toLocaleString();

                // Clear all solver result UI elements
                // Hide all green result boxes (both modal and inline)
                ['', 'Inline'].forEach(suffix => {
                    const maxSpend = document.getElementById('solverMaxSpendResult' + suffix);
                    const retireAge = document.getElementById('solverRetireAgeResult' + suffix);
                    const saveRate = document.getElementById('solverSaveRateResult' + suffix);
                    const targetPortfolio = document.getElementById('solverTargetPortfolioResult' + suffix);
                    if (maxSpend) maxSpend.classList.remove('active');
                    if (retireAge) retireAge.classList.remove('active');
                    if (saveRate) saveRate.classList.remove('active');
                    if (targetPortfolio) targetPortfolio.classList.remove('active');

                    // Clear all "What Changed" messages
                    const maxSpendWC = document.getElementById('solverMaxSpendWhatChanged' + suffix);
                    const retireAgeWC = document.getElementById('solverRetireAgeWhatChanged' + suffix);
                    const saveRateWC = document.getElementById('solverSaveRateWhatChanged' + suffix);
                    const targetPortfolioWC = document.getElementById('solverTargetPortfolioWhatChanged' + suffix);
                    if (maxSpendWC) { maxSpendWC.innerHTML = ''; maxSpendWC.classList.remove('active'); }
                    if (retireAgeWC) { retireAgeWC.innerHTML = ''; retireAgeWC.classList.remove('active'); }
                    if (saveRateWC) { saveRateWC.innerHTML = ''; saveRateWC.classList.remove('active'); }
                    if (targetPortfolioWC) { targetPortfolioWC.innerHTML = ''; targetPortfolioWC.classList.remove('active'); }

                    // Reset result values to $0
                    const maxSpendVal = document.getElementById('solverMaxSpendValue' + suffix);
                    const retireAgeVal = document.getElementById('solverRetireAgeValue' + suffix);
                    const saveRateVal = document.getElementById('solverSaveRateValue' + suffix);
                    const targetPortfolioVal = document.getElementById('solverTargetPortfolioValue' + suffix);
                    if (maxSpendVal) maxSpendVal.textContent = '$0';
                    if (retireAgeVal) retireAgeVal.textContent = '0';
                    if (saveRateVal) saveRateVal.textContent = '0%';
                    if (targetPortfolioVal) targetPortfolioVal.textContent = '$0';
                });

                // Show all "Apply This Result" buttons again
                const applyButtons = document.querySelectorAll('.solver-apply-btn');
                applyButtons.forEach(btn => btn.style.display = 'block');

                // Clear applied changes tracking
                solverAppliedChanges = {};
                updateSolverTracker();

                // Auto-run calculator to show original state
                initiateSimulation();
            }

            function applySolverResult(paramName, valueElementId) {
                const valueEl = document.getElementById(valueElementId);
                const valueText = valueEl.textContent;

                // Extract numeric value from display text
                let newValue;
                if (valueText.includes('%')) {
                    newValue = parseFloat(valueText.replace('%', ''));
                } else if (valueText.includes('$')) {
                    newValue = parseFloat(valueText.replace(/[$,]/g, ''));
                } else {
                    newValue = parseFloat(valueText);
                }

                // Get original value for comparison
                const originalValue = solverOriginalValues[paramName];

                // Update the appropriate input field
                let inputField;
                let formattedValue;
                let whatChangedDiv;

                if (paramName === 'lifestyleSpending') {
                    inputField = document.getElementById('lifestyleSpending');
                    formattedValue = Math.round(newValue).toLocaleString();
                    inputField.value = formattedValue;
                    whatChangedDiv = document.getElementById('solverMaxSpendWhatChanged');

                    const delta = newValue - originalValue;
                    const deltaText = delta >= 0 ? `+$${Math.round(Math.abs(delta)).toLocaleString()}` : `-$${Math.round(Math.abs(delta)).toLocaleString()}`;
                    whatChangedDiv.innerHTML = `&#10003; Applied: ${delta >= 0 ? 'Increased' : 'Decreased'} spending from $${Math.round(originalValue).toLocaleString()} (${deltaText}/year) <em>(running calculator...)</em>`;

                } else if (paramName === 'retireAge') {
                    inputField = document.getElementById('retireAge');
                    inputField.value = Math.round(newValue);
                    whatChangedDiv = document.getElementById('solverRetireAgeWhatChanged');

                    const delta = newValue - originalValue;
                    const deltaText = delta >= 0 ? `+${Math.abs(delta)} years` : `-${Math.abs(delta)} years`;
                    whatChangedDiv.innerHTML = `&#10003; Applied: Changed retirement age from ${originalValue} to ${newValue} (${deltaText}) <em>(running calculator...)</em>`;

                } else if (paramName === 'userSavingsRate') {
                    inputField = document.getElementById('userSavingsRate');
                    inputField.value = newValue;
                    whatChangedDiv = document.getElementById('solverSaveRateWhatChanged');

                    const delta = newValue - originalValue;
                    const deltaText = delta >= 0 ? `+${Math.abs(delta)}%` : `-${Math.abs(delta)}%`;
                    whatChangedDiv.innerHTML = `&#10003; Applied: ${delta >= 0 ? 'Increased' : 'Decreased'} savings rate from ${originalValue}% (${deltaText}) <em>(running calculator...)</em>`;

                } else if (paramName === 'targetPortfolio') {
                    // Get current balances
                    const userPreTax = parseFloat(document.getElementById('userPreTaxBalance').value.replace(/,/g, '')) || 0;
                    const userRoth = parseFloat(document.getElementById('userRothBalance').value.replace(/,/g, '')) || 0;
                    const spousePreTax = parseFloat(document.getElementById('spousePreTaxBalance').value.replace(/,/g, '')) || 0;
                    const spouseRoth = parseFloat(document.getElementById('spouseRothBalance').value.replace(/,/g, '')) || 0;
                    const taxable = parseFloat(document.getElementById('taxableBalance').value.replace(/,/g, '')) || 0;
                    const currentTotal = userPreTax + userRoth + spousePreTax + spouseRoth + taxable;

                    // Calculate scale factor
                    const scaleFactor = currentTotal > 0 ? newValue / currentTotal : 1;

                    // Scale all balances proportionally
                    document.getElementById('userPreTaxBalance').value = Math.round(userPreTax * scaleFactor).toLocaleString();
                    document.getElementById('userRothBalance').value = Math.round(userRoth * scaleFactor).toLocaleString();
                    document.getElementById('spousePreTaxBalance').value = Math.round(spousePreTax * scaleFactor).toLocaleString();
                    document.getElementById('spouseRothBalance').value = Math.round(spouseRoth * scaleFactor).toLocaleString();
                    document.getElementById('taxableBalance').value = Math.round(taxable * scaleFactor).toLocaleString();

                    whatChangedDiv = document.getElementById('solverTargetPortfolioWhatChanged');

                    const delta = newValue - originalValue;
                    const deltaText = delta >= 0 ? `+$${Math.round(Math.abs(delta)).toLocaleString()}` : `-$${Math.round(Math.abs(delta)).toLocaleString()}`;
                    whatChangedDiv.innerHTML = `&#10003; Applied: Scaled all balances ${delta >= 0 ? 'up' : 'down'} to reach target of $${Math.round(newValue).toLocaleString()} (${deltaText}) <em>(running calculator...)</em>`;
                }

                // Mark this change as applied
                solverAppliedChanges[paramName] = true;

                // Show what changed message
                whatChangedDiv.classList.add('active');

                // Update the tracker
                updateSolverTracker();

                // Hide the apply button (already applied)
                valueEl.parentElement.querySelector('.solver-apply-btn').style.display = 'none';

                // Auto-run calculator to show results
                initiateSimulation();
            }

            function openSolverModal() {
                // Legacy - now redirects to What-If tab
                navigateToGoalSolver();
            }

            function closeSolverModal() {
                // Legacy - modal no longer exists, but keep for compatibility
                const modal = document.getElementById('solverModal');
                if (modal) modal.classList.remove('active');
            }

            function navigateToGoalSolver() {
                initSolverTracker();
                switchMainView('scenarios');
                // Scroll to Goal Solver section after a brief delay for view switch
                setTimeout(() => {
                    const solverSection = document.getElementById('goalSolverInline');
                    if (solverSection) {
                        solverSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            }

            function openGuardrailsHelp() {
                document.getElementById('guardrailsHelpModal').classList.add('active');
            }

            function closeGuardrailsHelp() {
                document.getElementById('guardrailsHelpModal').classList.remove('active');
            }

            function openTcjaHelp() {
                document.getElementById('tcjaHelpModal').classList.add('active');
            }

            function closeTcjaHelp() {
                document.getElementById('tcjaHelpModal').classList.remove('active');
            }

            function openGlidePathHelp() {
                document.getElementById('glidePathHelpModal').classList.add('active');
            }

            function closeGlidePathHelp() {
                document.getElementById('glidePathHelpModal').classList.remove('active');
            }

            function openSpousalBenefitsHelp() {
                document.getElementById('spousalBenefitsHelpModal').classList.add('active');
            }

            function closeSpousalBenefitsHelp() {
                document.getElementById('spousalBenefitsHelpModal').classList.remove('active');
            }

            function switchSolverTab(tabName, clickedTab) {
                // Update all solver tabs (both modal and inline versions)
                document.querySelectorAll('.solver-tab').forEach(tab => tab.classList.remove('active'));
                clickedTab.classList.add('active');

                // Hide all solver panels (both versions)
                document.querySelectorAll('.solver-panel').forEach(panel => panel.classList.remove('active'));

                // Show the selected panel (check for both inline and modal versions)
                const inlinePanel = document.getElementById('solverPanelInline-' + tabName);
                const modalPanel = document.getElementById('solverPanel-' + tabName);
                if (inlinePanel) inlinePanel.classList.add('active');
                if (modalPanel) modalPanel.classList.add('active');
            }

            // Core solver helper - runs binary search for a parameter
            // Store sustainable spending result for Paycheck Mirror
            let sustainableSpendingResult = null;
            let calculatedLevers = [];  // Store levers for export
            let calculatedOpportunities = [];  // Store opportunities for export

            // Quick solver for sustainable spending (runs automatically)
            function calculateSustainableSpending(baseParams, targetSuccessRate = 90) {
                const solverPaths = 150; // Fewer paths for speed
                const solverSeedBase = fnv1aHash(JSON.stringify(baseParams));

                const minSpend = 1000;
                const maxSpend = Math.max(baseParams.lifestyleSpending * 3, 200000);

                function getSuccessRate(spendingValue) {
                    const testParams = {
                        ...baseParams,
                        lifestyleSpending: spendingValue,
                        numPaths: solverPaths,
                        _solverDeterministic: true,
                        _solverSeedBase: solverSeedBase
                    };

                    let solved = 0;
                    for (let i = 0; i < solverPaths; i++) {
                        const res = simulatePath(testParams, i);
                        if (res.solvent) solved++;
                    }
                    return (solved / solverPaths) * 100;
                }

                let low = minSpend;
                let high = maxSpend;
                let best = minSpend;
                let iterations = 0;
                const maxIterations = 12; // Fewer iterations for speed

                // Binary search for max spending at target success rate
                while (high - low > 500 && iterations < maxIterations) {
                    const mid = (low + high) / 2;
                    const rate = getSuccessRate(mid);

                    if (rate >= targetSuccessRate) {
                        best = mid;
                        low = mid;
                    } else {
                        high = mid;
                    }
                    iterations++;
                }

                return Math.round(best / 100) * 100; // Round to nearest $100
            }

            function runBinarySolver(paramName, minVal, maxVal, targetRate, progressId, getTestParams) {
                const params = collectInputs();
                const solverPaths = Math.min(200, params.numPaths);
                const solverSeedBase = fnv1aHash(JSON.stringify(params));
                const progressFill = document.getElementById(progressId);

                function getSuccessRate(testValue, pathsToRun) {
                    const n = pathsToRun || solverPaths;
                    const testParams = getTestParams(params, testValue);
                    testParams.numPaths = n;
                    testParams._solverDeterministic = true;
                    testParams._solverSeedBase = solverSeedBase;

                    let solved = 0;
                    for (let i = 0; i < n; i++) {
                        const res = simulatePath(testParams, i);
                        if (res.solvent) solved++;
                    }
                    return (solved / n) * 100;
                }

                let low = minVal;
                let high = maxVal;
                let best = minVal;
                let iterations = 0;
                const maxIterations = 15;

                // Binary search
                while (high - low > (maxVal - minVal) / 1000 && iterations < maxIterations) {
                    const mid = (low + high) / 2;
                    const rate = getSuccessRate(mid);
                    progressFill.style.width = ((iterations / maxIterations) * 100) + '%';

                    if (rate >= targetRate) {
                        best = mid;
                        low = mid;
                    } else {
                        high = mid;
                    }
                    iterations++;
                }

                // Final verification with full paths
                const finalRate = getSuccessRate(best, params.numPaths);
                progressFill.style.width = '100%';

                return { value: best, finalRate: finalRate, hitLimit: best >= maxVal * 0.99 || best <= minVal * 1.01 };
            }

            // ==========================================
            // PRESET SCENARIO FUNCTIONS
            // ==========================================

            // Store scenario state
            let presetScenarioState = {};

            function togglePresetScenario(type) {
                // Require simulation to have been run first
                if (!simulationStats || !simulationStats.successRate) {
                    alert('Please run a simulation first from the Dashboard.');
                    return;
                }

                const toggle = document.getElementById('toggle' + type.charAt(0).toUpperCase() + type.slice(1));
                const card = document.getElementById('preset' + type.charAt(0).toUpperCase() + type.slice(1));
                const comparison = document.getElementById('comparison' + type.charAt(0).toUpperCase() + type.slice(1));
                const applyBtn = document.getElementById('apply' + type.charAt(0).toUpperCase() + type.slice(1));

                // If already active, turn off
                if (toggle.classList.contains('active')) {
                    toggle.classList.remove('active');
                    card.classList.remove('active');
                    comparison.classList.remove('active');
                    if (applyBtn) applyBtn.classList.remove('active');
                    delete presetScenarioState[type];
                    return;
                }

                // Turn on - run simulation
                toggle.classList.add('loading');

                setTimeout(() => {
                    const params = collectInputs();
                    const currentRate = simulationStats.successRate;
                    let modifiedParams = { ...params };

                    // Store original values
                    presetScenarioState[type] = { originalParams: { ...params } };

                    // Modify params based on scenario type
                    switch (type) {
                        case 'retireEarly':
                            modifiedParams.retireAge = Math.max(params.currentAge + 1, params.retireAge - 2);
                            break;
                        case 'marketCrash':
                            const totalPortfolio = params.userPreTaxBalance + params.userRothBalance +
                                params.spousePreTaxBalance + params.spouseRothBalance +
                                params.taxableBalance;
                            const crashReduction = totalPortfolio * 0.4;
                            if (params.taxableBalance >= crashReduction) {
                                modifiedParams.taxableBalance = params.taxableBalance - crashReduction;
                            } else {
                                modifiedParams.taxableBalance = 0;
                                modifiedParams.userPreTaxBalance = Math.max(0, params.userPreTaxBalance - (crashReduction - params.taxableBalance));
                            }
                            break;
                        case 'spendMore':
                            modifiedParams.lifestyleSpending = Math.round(params.lifestyleSpending * 1.1);
                            break;
                        case 'partTime':
                            modifiedParams.enablePartTime = true;
                            modifiedParams.partTimeIncome = 20000;
                            modifiedParams.partTimeStartAge = params.retireAge;
                            modifiedParams.partTimeEndAge = params.retireAge + 5;
                            break;
                        case 'delaySS':
                            modifiedParams.userClaimAge = 70;
                            break;
                    }

                    // Run simulation
                    const numPaths = Math.min(200, params.numPaths || 500);
                    let solved = 0;
                    for (let i = 0; i < numPaths; i++) {
                        const res = simulatePath(modifiedParams);
                        if (res.solvent) solved++;
                    }
                    const scenarioRate = (solved / numPaths) * 100;
                    const diff = scenarioRate - currentRate;

                    // Store results
                    presetScenarioState[type].scenarioRate = scenarioRate;
                    presetScenarioState[type].modifiedParams = modifiedParams;

                    // Update UI
                    toggle.classList.remove('loading');
                    toggle.classList.add('active');
                    card.classList.add('active');

                    // Update comparison display
                    document.getElementById('currentRate' + type.charAt(0).toUpperCase() + type.slice(1)).textContent = currentRate.toFixed(0) + '%';
                    document.getElementById('scenarioRate' + type.charAt(0).toUpperCase() + type.slice(1)).textContent = scenarioRate.toFixed(0) + '%';
                    document.getElementById('currentBar' + type.charAt(0).toUpperCase() + type.slice(1)).style.width = currentRate + '%';

                    const scenarioBar = document.getElementById('scenarioBar' + type.charAt(0).toUpperCase() + type.slice(1));
                    scenarioBar.style.width = scenarioRate + '%';
                    scenarioBar.classList.remove('positive', 'negative', 'scenario');
                    if (diff > 2) {
                        scenarioBar.classList.add('positive');
                    } else if (diff < -2) {
                        scenarioBar.classList.add('negative');
                    } else {
                        scenarioBar.classList.add('scenario');
                    }

                    // Update delta display
                    const deltaEl = document.getElementById('delta' + type.charAt(0).toUpperCase() + type.slice(1));
                    deltaEl.classList.remove('positive', 'negative', 'neutral');
                    if (diff > 2) {
                        deltaEl.textContent = '+' + diff.toFixed(0) + '% success rate';
                        deltaEl.classList.add('positive');
                    } else if (diff < -2) {
                        deltaEl.textContent = diff.toFixed(0) + '% success rate';
                        deltaEl.classList.add('negative');
                    } else {
                        deltaEl.textContent = 'No significant change';
                        deltaEl.classList.add('neutral');
                    }

                    comparison.classList.add('active');

                    // Show apply button (except for market crash stress test)
                    if (applyBtn && type !== 'marketCrash') {
                        applyBtn.classList.add('active');
                    }
                }, 50);
            }

            function applyPresetScenario(type) {
                if (!presetScenarioState[type]) return;

                // Apply the changes to actual inputs
                switch (type) {
                    case 'retireEarly':
                        const newRetireAge = Math.max(
                            getNumberValue('currentAge') + 1,
                            getNumberValue('retireAge') - 2
                        );
                        document.getElementById('retireAge').value = newRetireAge;
                        break;
                    case 'spendMore':
                        const newSpending = Math.round(getNumberValue('lifestyleSpending') * 1.1);
                        document.getElementById('lifestyleSpending').value = newSpending;
                        formatCurrencyInput(document.getElementById('lifestyleSpending'));
                        break;
                    case 'partTime':
                        document.getElementById('enablePartTime').checked = true;
                        document.getElementById('partTimeIncome').value = 20000;
                        document.getElementById('partTimeStartAge').value = getNumberValue('retireAge');
                        document.getElementById('partTimeEndAge').value = getNumberValue('retireAge') + 5;
                        formatCurrencyInput(document.getElementById('partTimeIncome'));
                        togglePartTimeSettings();
                        break;
                    case 'delaySS':
                        document.getElementById('userClaimAge').value = 70;
                        break;
                }

                // Reset the toggle UI
                const toggle = document.getElementById('toggle' + type.charAt(0).toUpperCase() + type.slice(1));
                const card = document.getElementById('preset' + type.charAt(0).toUpperCase() + type.slice(1));
                const comparison = document.getElementById('comparison' + type.charAt(0).toUpperCase() + type.slice(1));
                const applyBtn = document.getElementById('apply' + type.charAt(0).toUpperCase() + type.slice(1));

                toggle.classList.remove('active');
                card.classList.remove('active');
                comparison.classList.remove('active');
                if (applyBtn) applyBtn.classList.remove('active');

                delete presetScenarioState[type];

                // Trigger auto-save and re-run simulation
                saveToLocalStorage();
                initiateSimulation();
            }

            // ==========================================
            // END PRESET SCENARIO FUNCTIONS
            // ==========================================

            // Helper to get solver target rate from whichever element is visible
            function getSolverTargetRate() {
                const inlineEl = document.getElementById('solverTargetRateInline');
                const modalEl = document.getElementById('solverTargetRate');
                // Prefer inline (more likely to be used now)
                if (inlineEl) return parseFloat(inlineEl.value);
                if (modalEl) return parseFloat(modalEl.value);
                return 90; // default
            }

            // Helper to update both modal and inline result displays
            function updateSolverResultDisplay(prefix, targetRate, value, note, isActive) {
                const elements = [
                    { target: prefix + 'TargetDisplay', value: targetRate },
                    { target: prefix + 'TargetDisplayInline', value: targetRate },
                    { target: prefix + 'Value', value: value },
                    { target: prefix + 'ValueInline', value: value },
                    { target: prefix + 'Note', value: note },
                    { target: prefix + 'NoteInline', value: note },
                ];

                elements.forEach(item => {
                    const el = document.getElementById(item.target);
                    if (el) el.textContent = item.value;
                });

                // Toggle active class on result boxes
                ['', 'Inline'].forEach(suffix => {
                    const resultBox = document.getElementById(prefix.replace('solver', 'solver') + 'Result' + suffix);
                    if (resultBox) {
                        if (isActive) {
                            resultBox.classList.add('active');
                        } else {
                            resultBox.classList.remove('active');
                        }
                    }
                });
            }

            // Max Spending Solver
            function runMaxSpendSolver() {
                const targetRate = getSolverTargetRate();
                const params = collectInputs();
                const minSpend = 1000;
                const maxSpend = params.lifestyleSpending * 10;

                updateSolverResultDisplay('solverMaxSpend', targetRate, '', '', false);

                setTimeout(() => {
                    const result = runBinarySolver('spending', minSpend, maxSpend, targetRate, 'solverMaxSpendProgress',
                        (p, val) => ({ ...p, lifestyleSpending: val }));

                    const roundedSpend = Math.round(result.value / 100) * 100;
                    const note = result.hitLimit ?
                        'Note: Result may be at the solver limit.' :
                        'Verified at ' + result.finalRate.toFixed(0) + '% success rate.';

                    updateSolverResultDisplay('solverMaxSpend', targetRate, formatCurrency(roundedSpend), note, true);

                    // Also update legacy display
                    const legacyTarget = document.getElementById('solverTargetDisplay');
                    const legacyValue = document.getElementById('solverResultValue');
                    const legacyResult = document.getElementById('solverResult');
                    if (legacyTarget) legacyTarget.textContent = targetRate;
                    if (legacyValue) legacyValue.textContent = formatCurrency(roundedSpend);
                    if (legacyResult) legacyResult.classList.add('active');
                }, 50);
            }

            // Retirement Age Solver
            function runRetireAgeSolver() {
                const targetRate = getSolverTargetRate();
                const params = collectInputs();
                const minAge = params.currentAge + 1;
                const maxAge = params.endAge - 5;

                updateSolverResultDisplay('solverRetireAge', targetRate, '', '', false);

                setTimeout(() => {
                    // For retirement age, we need to search from HIGH to LOW (we want earliest age that works)
                    const solverPaths = Math.min(200, params.numPaths);
                    const solverSeedBase = fnv1aHash(JSON.stringify(params));
                    const progressFill = document.getElementById('solverRetireAgeProgress') ||
                        document.getElementById('solverRetireAgeProgressInline');

                    function getSuccessRate(retireAge, pathsToRun) {
                        const n = pathsToRun || solverPaths;
                        const testParams = { ...params, retireAge: Math.round(retireAge), numPaths: n, _solverDeterministic: true, _solverSeedBase: solverSeedBase };
                        let solved = 0;
                        for (let i = 0; i < n; i++) {
                            const res = simulatePath(testParams, i);
                            if (res.solvent) solved++;
                        }
                        return (solved / n) * 100;
                    }

                    // Search from young to old to find earliest viable age
                    let low = minAge;
                    let high = maxAge;
                    let best = maxAge;
                    let iterations = 0;
                    const maxIterations = 15;

                    while (high - low > 0.5 && iterations < maxIterations) {
                        const mid = (low + high) / 2;
                        const rate = getSuccessRate(mid);
                        if (progressFill) progressFill.style.width = ((iterations / maxIterations) * 100) + '%';

                        if (rate >= targetRate) {
                            best = mid;
                            high = mid; // Try to find earlier age
                        } else {
                            low = mid; // Need to retire later
                        }
                        iterations++;
                    }

                    const finalAge = Math.ceil(best);
                    const finalRate = getSuccessRate(finalAge, params.numPaths);
                    if (progressFill) progressFill.style.width = '100%';

                    const note = finalRate >= targetRate ?
                        'Verified at ' + finalRate.toFixed(0) + '% success rate.' :
                        'Note: Could not find viable retirement age before ' + maxAge + '.';

                    updateSolverResultDisplay('solverRetireAge', targetRate, 'Age ' + finalAge, note, true);
                }, 50);
            }

            // Savings Rate Solver
            function runSaveRateSolver() {
                const targetRate = getSolverTargetRate();
                const params = collectInputs();
                const minRate = 0;
                const maxRate = 0.70; // 70% max savings rate

                updateSolverResultDisplay('solverSaveRate', targetRate, '', '', false);

                setTimeout(() => {
                    // For savings rate, we search from LOW to HIGH (we want minimum rate that works)
                    const solverPaths = Math.min(200, params.numPaths);
                    const solverSeedBase = fnv1aHash(JSON.stringify(params));
                    const progressFill = document.getElementById('solverSaveRateProgress') ||
                        document.getElementById('solverSaveRateProgressInline');

                    function getSuccessRate(saveRate, pathsToRun) {
                        const n = pathsToRun || solverPaths;
                        // Apply savings rate to both user and spouse (household rate)
                        const testParams = {
                            ...params,
                            userSavingsRate: saveRate,
                            spouseSavingsRate: params.spouseCurrentSalary > 0 ? saveRate : 0,
                            numPaths: n,
                            _solverDeterministic: true,
                            _solverSeedBase: solverSeedBase
                        };
                        let solved = 0;
                        for (let i = 0; i < n; i++) {
                            const res = simulatePath(testParams, i);
                            if (res.solvent) solved++;
                        }
                        return (solved / n) * 100;
                    }

                    let low = minRate;
                    let high = maxRate;
                    let best = maxRate;
                    let iterations = 0;
                    const maxIterations = 15;

                    while (high - low > 0.005 && iterations < maxIterations) {
                        const mid = (low + high) / 2;
                        const rate = getSuccessRate(mid);
                        if (progressFill) progressFill.style.width = ((iterations / maxIterations) * 100) + '%';

                        if (rate >= targetRate) {
                            best = mid;
                            high = mid; // Try to find lower savings rate
                        } else {
                            low = mid; // Need to save more
                        }
                        iterations++;
                    }

                    const finalSaveRate = Math.ceil(best * 100);
                    const finalRate = getSuccessRate(best, params.numPaths);
                    if (progressFill) progressFill.style.width = '100%';

                    const note = finalRate >= targetRate ?
                        'Verified at ' + finalRate.toFixed(0) + '% success rate.' :
                        'Note: Even 70% savings rate may not achieve target.';

                    updateSolverResultDisplay('solverSaveRate', targetRate, finalSaveRate + '%', note, true);
                }, 50);
            }

            // Target Portfolio Solver
            function runTargetPortfolioSolver() {
                const targetRate = getSolverTargetRate();
                const params = collectInputs();
                const currentTotal = params.userPreTaxBalance + params.userRothBalance + params.spousePreTaxBalance + params.spouseRothBalance + params.taxableBalance;
                const minPortfolio = 0;
                const maxPortfolio = currentTotal * 20;

                updateSolverResultDisplay('solverTargetPortfolio', targetRate, '', '', false);

                setTimeout(() => {
                    const solverPaths = Math.min(200, params.numPaths);
                    const solverSeedBase = fnv1aHash(JSON.stringify(params));
                    const progressFill = document.getElementById('solverTargetPortfolioProgress') ||
                        document.getElementById('solverTargetPortfolioProgressInline');

                    function getSuccessRate(portfolioTarget, pathsToRun) {
                        const n = pathsToRun || solverPaths;
                        // Scale all balances proportionally to hit the target
                        const currentTotal = params.userPreTaxBalance + params.userRothBalance + params.spousePreTaxBalance + params.spouseRothBalance + params.taxableBalance;
                        const scaleFactor = currentTotal > 0 ? portfolioTarget / currentTotal : 1;

                        const testParams = {
                            ...params,
                            userPreTaxBalance: params.userPreTaxBalance * scaleFactor,
                            userRothBalance: params.userRothBalance * scaleFactor,
                            spousePreTaxBalance: params.spousePreTaxBalance * scaleFactor,
                            spouseRothBalance: params.spouseRothBalance * scaleFactor,
                            taxableBalance: params.taxableBalance * scaleFactor,
                            numPaths: n,
                            _solverDeterministic: true,
                            _solverSeedBase: solverSeedBase
                        };

                        let solved = 0;
                        for (let i = 0; i < n; i++) {
                            const res = simulatePath(testParams, i);
                            if (res.solvent) solved++;
                        }
                        return (solved / n) * 100;
                    }

                    let low = minPortfolio;
                    let high = maxPortfolio;
                    let best = maxPortfolio;
                    let iterations = 0;
                    const maxIterations = 15;

                    while (high - low > 10000 && iterations < maxIterations) {
                        const mid = (low + high) / 2;
                        const rate = getSuccessRate(mid);
                        if (progressFill) progressFill.style.width = ((iterations / maxIterations) * 100) + '%';

                        if (rate >= targetRate) {
                            best = mid;
                            high = mid; // Try to find lower portfolio target
                        } else {
                            low = mid; // Need more savings
                        }
                        iterations++;
                    }

                    const roundedTarget = Math.round(best / 1000) * 1000;
                    const finalRate = getSuccessRate(roundedTarget, params.numPaths);
                    if (progressFill) progressFill.style.width = '100%';

                    const note = finalRate >= targetRate ?
                        'Verified at ' + finalRate.toFixed(0) + '% success rate. Assumes same asset mix.' :
                        'Note: Could not find viable target within limits.';

                    updateSolverResultDisplay('solverTargetPortfolio', targetRate, formatCurrency(roundedTarget), note, true);
                }, 50);
            }

            // Legacy runSolver for backward compatibility
            function runSolver() {
                openSolverModal();
            }

            function renderCharts(data, percentilePaths, successRate) {
                const labels = data.map(d => d.age);

                // 0. Gauge Chart (still in Dashboard)
                if (gaugeChartInstance) gaugeChartInstance.destroy();
                const gaugeEl = document.getElementById('successGauge');
                if (gaugeEl) {
                    const ctxGauge = gaugeEl.getContext('2d');
                    gaugeChartInstance = new Chart(ctxGauge, {
                        type: 'doughnut',
                        data: {
                            labels: ['Success', 'Failure'],
                            datasets: [{
                                data: [successRate, 100 - successRate],
                                backgroundColor: [
                                    successRate > 90 ? '#10b981' : successRate > 75 ? '#f59e0b' : '#ef4444',
                                    '#e2e8f0'
                                ],
                                borderWidth: 0,
                                cutout: '85%'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false }, tooltip: { enabled: false } },
                            animation: { animateScale: true, animateRotate: true }
                        }
                    });
                }

                // Charts 1-4 have been moved to Charts view - skip if elements don't exist
                const balanceEl = document.getElementById('balanceChart');
                const incomeEl = document.getElementById('incomeSourcesChart');
                const spendEl = document.getElementById('incomeVsSpendChart');
                const taxEl = document.getElementById('taxChart');

                // 1. Balance Chart with labeled percentile bands
                if (balanceEl) {
                    if (balanceChartInstance) balanceChartInstance.destroy();
                    balanceChartInstance = new Chart(balanceEl, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [
                                { label: '90th Percentile', data: percentilePaths.p90.map(d => d.totalBal), borderColor: '#10b981', borderWidth: 1, borderDash: [3, 3], pointRadius: 0, fill: false },
                                { label: '75th Percentile', data: percentilePaths.p75.map(d => d.totalBal), borderColor: 'transparent', backgroundColor: 'rgba(16, 185, 129, 0.15)', fill: '+1', pointRadius: 0 },
                                { label: 'Median (50th)', data: data.map(d => d.totalBal), borderColor: '#3b82f6', borderWidth: 3, pointRadius: 0, tension: 0.3, fill: false },
                                { label: '25th Percentile', data: percentilePaths.p25.map(d => d.totalBal), borderColor: 'transparent', backgroundColor: 'rgba(59, 130, 246, 0.15)', fill: '+1', pointRadius: 0 },
                                { label: '10th Percentile', data: percentilePaths.p10.map(d => d.totalBal), borderColor: '#ef4444', borderDash: [3, 3], borderWidth: 1, pointRadius: 0, fill: false }
                            ]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: {
                                legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8, padding: 15, font: { size: 11 } } },
                                tooltip: { mode: 'index', intersect: false, callbacks: { label: function (c) { return c.dataset.label + ': ' + formatCurrency(c.raw); } } },
                                title: { display: true, text: 'Portfolio Range (10th - 90th Percentile)', font: { size: 14, weight: 'bold' }, padding: { bottom: 10 } }
                            },
                            scales: { y: { ticks: { callback: function (value) { return value >= 1000000 ? '$' + value / 1000000 + 'M' : '$' + value / 1000 + 'k'; } } }, x: { grid: { display: false } } }
                        }
                    });
                } // end if balanceEl

                // 2. Income Sources Stacked Bar Chart - shows detailed withdrawal breakdown by account type
                if (incomeEl) {
                    if (incomeSourcesChartInstance) incomeSourcesChartInstance.destroy();
                    incomeSourcesChartInstance = new Chart(incomeEl, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [
                                { label: 'Social Security', data: data.map(d => d.ssIncome), backgroundColor: '#3b82f6', borderRadius: 2 },
                                { label: 'Pension', data: data.map(d => d.pensionIncome), backgroundColor: '#10b981', borderRadius: 2 },
                                { label: 'Part-Time Work', data: data.map(d => d.partTimeIncome), backgroundColor: '#f59e0b', borderRadius: 2 },
                                { label: 'RMD', data: data.map(d => d.rmd || 0), backgroundColor: '#a855f7', borderRadius: 2 },
                                { label: 'Taxable', data: data.map(d => d.wdTaxable || 0), backgroundColor: '#06b6d4', borderRadius: 2 },
                                { label: '401k/IRA', data: data.map(d => d.wdPreTax || 0), backgroundColor: '#8b5cf6', borderRadius: 2 },
                                { label: 'Roth', data: data.map(d => d.wdRoth || 0), backgroundColor: '#ec4899', borderRadius: 2 }
                            ]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: {
                                legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8, padding: 15, font: { size: 11 } } },
                                tooltip: { mode: 'index', intersect: false, callbacks: { label: (c) => c.dataset.label + ': ' + formatCurrency(c.raw) } },
                                title: { display: true, text: 'Income Sources by Year', font: { size: 14, weight: 'bold' }, padding: { bottom: 10 } }
                            },
                            scales: {
                                x: { stacked: true, grid: { display: false } },
                                y: { stacked: true, ticks: { callback: (v) => v >= 1000000 ? '$' + v / 1000000 + 'M' : '$' + v / 1000 + 'k' } }
                            }
                        }
                    });
                } // end if incomeEl

                // 3. Income vs Spending Chart
                if (spendEl) {
                    if (incomeVsSpendChartInstance) incomeVsSpendChartInstance.destroy();
                    const totalIncome = data.map(d => d.ssIncome + d.pensionIncome + d.partTimeIncome + (d.rmd || 0) + (d.wdTaxable || 0) + (d.wdPreTax || 0) + (d.wdRoth || 0));
                    incomeVsSpendChartInstance = new Chart(spendEl, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [
                                { label: 'Total Income', data: totalIncome, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true },
                                { label: 'Spending Need', data: data.map(d => d.spending), borderColor: '#ef4444', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, tension: 0.3, fill: false }
                            ]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: {
                                legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8, padding: 15, font: { size: 11 } } },
                                tooltip: { mode: 'index', intersect: false, callbacks: { label: (c) => c.dataset.label + ': ' + formatCurrency(c.raw) } },
                                title: { display: true, text: 'Income vs Spending Need', font: { size: 14, weight: 'bold' }, padding: { bottom: 10 } }
                            },
                            scales: { y: { ticks: { callback: (v) => v >= 1000000 ? '$' + v / 1000000 + 'M' : '$' + v / 1000 + 'k' } }, x: { grid: { display: false } } }
                        }
                    });
                } // end if spendEl

                // 4. Tax Chart
                if (taxEl) {
                    if (taxChartInstance) taxChartInstance.destroy();
                    taxChartInstance = new Chart(taxEl, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Annual Tax Bill',
                                data: data.map(d => d.taxBill),
                                backgroundColor: '#ef4444',
                                borderRadius: 2
                            }]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: { callbacks: { label: (c) => formatCurrency(c.raw) } },
                                title: { display: true, text: 'Tax Liability (Median Path)', font: { size: 14, weight: 'bold' }, padding: { bottom: 10 } }
                            },
                            scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => v >= 1000000 ? '$' + v / 1000000 + 'M' : '$' + v / 1000 + 'k' } } }
                        }
                    });
                } // end if taxEl
            }

            // Chart tab switching
            function toggleChartSection(sectionName) {
                const section = document.getElementById('chartSection-' + sectionName);
                if (section) {
                    section.classList.toggle('collapsed');

                    // If expanding, trigger chart resize after animation
                    if (!section.classList.contains('collapsed')) {
                        setTimeout(() => {
                            // Trigger resize for the chart in this section
                            if (sectionName === 'portfolio' && balanceChartInstance) balanceChartInstance.resize();
                            if (sectionName === 'income' && incomeSourcesChartInstance) incomeSourcesChartInstance.resize();
                            if (sectionName === 'incomeVsSpend' && incomeVsSpendChartInstance) incomeVsSpendChartInstance.resize();
                            if (sectionName === 'tax' && taxChartInstance) taxChartInstance.resize();
                        }, 350); // Wait for CSS transition to complete
                    }
                }
            }

            function expandAllCharts() {
                document.querySelectorAll('.chart-section').forEach(section => {
                    section.classList.remove('collapsed');
                });
                // Resize all charts
                setTimeout(() => {
                    if (balanceChartInstance) balanceChartInstance.resize();
                    if (incomeSourcesChartInstance) incomeSourcesChartInstance.resize();
                    if (incomeVsSpendChartInstance) incomeVsSpendChartInstance.resize();
                    if (taxChartInstance) taxChartInstance.resize();
                }, 350);
            }

            function collapseAllCharts() {
                document.querySelectorAll('.chart-section').forEach(section => {
                    section.classList.add('collapsed');
                });
            }

            function renderTable(data) {
                const tbody = document.getElementById('summaryTableBody');
                if (!tbody) return; // Table moved to Charts view
                tbody.innerHTML = '';

                // Track first SS income row
                let firstSSFound = false;

                data.forEach((d, index) => {
                    const row = tbody.insertRow();
                    if (d.rmd > 0) row.classList.add('highlight-row');

                    const spendingToday = d.spending / d.inflation;
                    const spendingTodayK = '$' + Math.round(spendingToday / 1000) + 'k';

                    // Calculate W/D Rate as number for conditional formatting
                    const wdRateNum = d.totalBal > 0 ? (d.totalWithdrawal / d.totalBal) * 100 : 0;
                    const wdRateStr = d.totalBal > 0 ? wdRateNum.toFixed(1) + '%' : '&ndash;';

                    // Effective rate as number
                    const effRateNum = d.effRate * 100;

                    // Conditional formatting classes
                    const wdRateClass = getWDRateClass(wdRateNum);
                    const effRateClass = getEffRateClass(effRateNum);
                    const balanceClass = getBalanceClass(d.totalBal, d.spending);

                    // Check for first SS income
                    let ssClass = '';
                    if (!firstSSFound && d.ssIncome > 0) {
                        ssClass = 'cell-highlight-first';
                        firstSSFound = true;
                    }

                    row.innerHTML = `
                <td>${d.age}</td>
                <td class="${balanceClass}">${formatCurrency(d.totalBal)}</td>
                <td>${(d.stockAlloc * 100).toFixed(0)}%</td>
                <td>${formatCurrency(d.spending)}</td>
                <td>${spendingTodayK}</td>
                <td class="${wdRateClass}">${wdRateStr}</td>
                <td class="${ssClass}">${formatCurrency(d.ssIncome)}</td>
                <td>${formatCurrency(d.rmd)}</td>
                <td>${formatCurrency(d.totalWithdrawal)}</td>
                <td>${formatCurrency(d.ordIncome)}</td>
                <td>${formatCurrency(d.taxBill)}</td>
                <td class="${effRateClass}">${effRateNum.toFixed(1)}%</td>
            `;
                });
            }

            // Conditional formatting helper functions
            function getWDRateClass(rate) {
                if (rate <= 0) return '';
                if (rate < 4) return 'cell-green';
                if (rate <= 6) return 'cell-yellow';
                return 'cell-red';
            }

            function getEffRateClass(rate) {
                if (rate < 15) return 'cell-green';
                if (rate <= 25) return 'cell-yellow';
                return 'cell-red';
            }

            function getBalanceClass(balance, spending) {
                // Warn if balance is less than 2 years of spending
                if (balance > 0 && spending > 0 && balance < spending * 2) {
                    return 'cell-red';
                }
                return '';
            }

            // ============================================
            // YOUR STORY - Rendering Functions
            // ============================================

            function calculateWallAges() {
                if (simulationResults.length === 0) return { poor: null, average: null };

                const n = simulationResults.length;
                const p10Index = Math.floor(n * 0.10);
                const p50Index = Math.floor(n * 0.50);

                const p10Path = simulationResults[p10Index];
                const p50Path = simulationResults[p50Index];

                // Get depletion ages (when money runs out)
                const poorWall = p10Path.depletionAge; // null if never depletes
                const averageWall = p50Path.depletionAge;

                return { poor: poorWall, average: averageWall };
            }

            function renderYourStory() {
                if (!params || simulationResults.length === 0) return;

                const walls = calculateWallAges();

                // Calculate sustainable spending (quick solver)
                sustainableSpendingResult = calculateSustainableSpending(params, 90);

                // Update success rate in hidden element (for reports)
                const successRate = simulationStats.successRate;
                const successValue = document.getElementById('storySuccessValue');
                if (successValue) successValue.textContent = successRate.toFixed(1) + '%';

                // Update hero gauge sub text based on success rate
                const heroGaugeSub = document.getElementById('heroGaugeSub');
                if (heroGaugeSub) {
                    if (successRate >= 90) {
                        heroGaugeSub.textContent = 'Your plan is on track';
                    } else if (successRate >= 75) {
                        heroGaugeSub.textContent = 'Some adjustments recommended';
                    } else {
                        heroGaugeSub.textContent = 'Significant changes needed';
                    }
                }

                // Render hero lifespan card (replaces old progress bar at bottom)
                renderHeroLifespan(walls);

                // Update hero metric pills with simulation data
                updateHeroMetrics();

                // Render Poor/Average markets insight boxes
                renderWallInsights(walls);

                // Render compact budget card (replaces old paycheck mirror)
                renderCompactBudget(walls);

                // Render A2-style budget bars
                renderBudgetBars();

                // Render inputs summary tile
                renderInputsSummary();

                // Render levers or opportunities
                renderLeversOrOpportunities(walls);

                // Animate new dashboard elements with GSAP
                gsap.from('.dashboard-hero-row', {
                    opacity: 0,
                    y: 20,
                    duration: 0.5,
                    ease: 'power2.out'
                });

                gsap.from('.compact-budget-card', {
                    opacity: 0,
                    y: 20,
                    duration: 0.5,
                    delay: 0.1,
                    ease: 'power2.out'
                });

                gsap.from('.budget-bars-section', {
                    opacity: 0,
                    y: 20,
                    duration: 0.5,
                    delay: 0.15,
                    ease: 'power2.out'
                });

                gsap.from('.dashboard-improve-section', {
                    opacity: 0,
                    y: 20,
                    duration: 0.5,
                    delay: 0.25,
                    ease: 'power2.out'
                });
            }

            function renderHeroLifespan(walls) {
                const container = document.getElementById('heroLifespanProgress');
                if (!container) return;

                const currentAge = params.currentAge;
                const retireAge = params.retireAge;
                const endAge = params.endAge;
                const ssAge = params.userClaimAge || 67;

                const poorWallAge = walls.poor;
                const avgWallAge = walls.average;
                const hasPoorGap = poorWallAge !== null && poorWallAge < endAge;
                const hasAvgGap = avgWallAge !== null && avgWallAge < endAge;

                // Calculate percentages
                const ageRange = endAge - currentAge;
                const ageToPercent = (age) => ((age - currentAge) / ageRange) * 100;

                // Build progress bar HTML
                // Bar fill aligns with MEDIAN (P50) to match Runway/Legacy pills
                let fillClass = 'lifespan-fill success';
                let fillWidth = '100%';
                let dangerZoneHTML = '';

                if (hasAvgGap) {
                    // Median depletes: bar fills to P50 wall, danger gradient
                    const fillPercent = ageToPercent(avgWallAge);
                    fillWidth = fillPercent + '%';
                    fillClass = 'lifespan-fill danger';
                    dangerZoneHTML = `<div class="lifespan-danger-zone" style="left: ${fillPercent}%; width: ${100 - fillPercent}%;"></div>`;
                } else if (hasPoorGap) {
                    // Only P10 depletes: bar fills full but uses warning gradient
                    fillWidth = '100%';
                    fillClass = 'lifespan-fill warning';
                    // Lighter danger zone from P10 wall to end
                    const poorPercent = ageToPercent(poorWallAge);
                    dangerZoneHTML = `<div class="lifespan-danger-zone lifespan-danger-zone-light" style="left: ${poorPercent}%; width: ${100 - poorPercent}%;"></div>`;
                }

                // Define milestones
                const milestones = [];
                milestones.push({ age: currentAge, label: 'Now', type: 'current', icon: 'ph-user' });
                if (retireAge > currentAge && retireAge < endAge) {
                    milestones.push({ age: retireAge, label: 'Retire', type: 'milestone', icon: 'ph-beach-chair' });
                }
                if (Math.abs(ssAge - retireAge) >= 3 && ssAge > currentAge && ssAge < endAge) {
                    milestones.push({ age: ssAge, label: 'SS', type: 'milestone', icon: 'ph-identification-card' });
                }
                // P10 wall marker (poor markets) &mdash; red
                if (hasPoorGap) {
                    milestones.push({ age: poorWallAge, label: 'Poor Mkts', type: 'danger', icon: 'ph-warning' });
                }
                // P50 wall marker (average markets) &mdash; orange/warning
                if (hasAvgGap && (!hasPoorGap || Math.abs(avgWallAge - poorWallAge) > 3)) {
                    milestones.push({ age: avgWallAge, label: 'Avg Mkts', type: 'warning', icon: 'ph-warning-circle' });
                }
                milestones.push({
                    age: endAge,
                    label: (hasPoorGap || hasAvgGap) ? 'End' : 'Success',
                    type: (hasPoorGap || hasAvgGap) ? 'end' : 'success',
                    icon: (hasPoorGap || hasAvgGap) ? 'ph-flag-checkered' : 'ph-check-circle'
                });

                // Filter and sort milestones
                const sortedMilestones = milestones
                    .sort((a, b) => a.age - b.age)
                    .filter((m, i, arr) => i === 0 || Math.abs(m.age - arr[i - 1].age) >= 2);

                // Proximity-triggered label alternation: default below,
                // flip to above when consecutive milestones are within 8 years (v16.1: was 5, missed 77/83 gap)
                // v17.2 fix: milestones in the first 15% of the bar must stay below to avoid
                // colliding with the "Your Money's Lifespan" heading above the bar.
                const PROXIMITY_THRESHOLD = 8;
                const HEADING_SAFE_PERCENT = 15; // % of bar where label-above is banned
                sortedMilestones.forEach((m, i) => {
                    m.labelAbove = false; // default: label below bar
                });
                for (let i = 1; i < sortedMilestones.length; i++) {
                    const gap = sortedMilestones[i].age - sortedMilestones[i - 1].age;
                    if (gap <= PROXIMITY_THRESHOLD) {
                        const percent = ageToPercent(sortedMilestones[i].age);
                        // Only flip above if far enough from the heading
                        if (percent > HEADING_SAFE_PERCENT && !sortedMilestones[i - 1].labelAbove) {
                            sortedMilestones[i].labelAbove = true;
                        }
                        // Otherwise keep below (may overlap slightly, but won't hit the heading)
                    }
                }

                // Build milestones HTML
                let milestonesHTML = '';
                sortedMilestones.forEach(m => {
                    const percent = ageToPercent(m.age);
                    let dotClass = 'milestone-dot';
                    if (m.type === 'current') dotClass += ' current';
                    else if (m.type === 'danger') dotClass += ' danger';
                    else if (m.type === 'warning') dotClass += ' warning';
                    else if (m.type === 'success') dotClass += ' success';
                    else dotClass += ' milestone';

                    let textClass = 'milestone-text';
                    if (m.type === 'danger') textClass += ' danger';
                    else if (m.type === 'warning') textClass += ' warning';
                    else if (m.type === 'success') textClass += ' success';

                    const milestoneClass = 'lifespan-milestone' + (m.labelAbove ? ' label-above' : '');

                    milestonesHTML += `
                        <div class="${milestoneClass}" style="left: ${percent}%;">
                            <div class="${dotClass}">
                                <i class="ph ${m.icon}"></i>
                            </div>
                            <div class="milestone-label">
                                <div class="milestone-age">${m.age}</div>
                                <div class="${textClass}">${m.label}</div>
                            </div>
                        </div>
                    `;
                });

                // Render complete progress bar
                const lifespan_wall_age = hasAvgGap ? avgWallAge : endAge;
                container.innerHTML = `
                    <div class="lifespan-track" role="progressbar" aria-label="Portfolio lifespan" aria-valuemin="${currentAge}" aria-valuemax="${endAge}" aria-valuenow="${lifespan_wall_age}">
                        <div class="${fillClass}" style="width: ${fillWidth};"></div>
                        ${dangerZoneHTML}
                        ${milestonesHTML}
                    </div>
                `;

                // Update metric pills - these will be populated after simulation runs
                // Placeholder values for now, will be updated by updateHeroMetrics()
                document.getElementById('heroPillLegacyAge').textContent = endAge;
            }

            function updateHeroMetrics() {
                // Called after simulation to update the metric pills with actual data
                if (!simulationStats) return;

                // Portfolio Runway
                const medianPath = simulationResults[Math.floor(simulationResults.length * 0.50)];
                let portfolioRunway = params.endAge - params.currentAge;
                if (medianPath.depletionAge !== null) {
                    portfolioRunway = medianPath.depletionAge - params.currentAge;
                }
                const runwayText = portfolioRunway >= (params.endAge - params.currentAge) ?
                    (params.endAge - params.currentAge) + '+ yrs' :
                    portfolioRunway + ' yrs';
                document.getElementById('heroPillRunway').textContent = runwayText;
                // Update ARIA for runway pill (v16.0)
                document.querySelector('.hero-metric-pill.runway').setAttribute('aria-label', 'Portfolio Runway: ' + runwayText);

                // Median Legacy (always shows nominal after fresh simulation; toggle resets)
                const medianFinalBalance = simulationStats.medianFinalBalance;
                document.getElementById('heroPillLegacy').textContent = formatCurrency(medianFinalBalance, 0);
                const legacySub = document.getElementById('heroPillLegacySubtext');
                if (legacySub) legacySub.innerHTML = '<i class="ph ph-trend-up"></i> Future dollars';
                // Update ARIA for legacy pill (v16.0)
                document.querySelector('.hero-metric-pill.legacy').setAttribute('aria-label', 'Legacy Balance: ' + formatCurrency(medianFinalBalance, 0));

                // Lifetime Tax
                const medianLifetimeTax = simulationStats.totalLifetimeTax;
                document.getElementById('heroPillTax').textContent = formatCurrency(medianLifetimeTax, 0);
                // Update ARIA for tax pill (v16.0)
                document.querySelector('.hero-metric-pill.tax').setAttribute('aria-label', 'Lifetime Tax: ' + formatCurrency(medianLifetimeTax, 0));
            }

            function renderCompactBudget(walls) {
                const todaySpending = params.lifestyleSpending || 0;
                const retirementSpending = sustainableSpendingResult || todaySpending;

                // Update amounts
                document.getElementById('compactBudgetToday').textContent = formatCurrency(todaySpending, 0) + '/yr';
                document.getElementById('compactBudgetRetirement').textContent = formatCurrency(retirementSpending, 0) + '/yr';

                // Calculate paycheck replacement
                const paycheckReplacement = todaySpending > 0 ? (retirementSpending / todaySpending) * 100 : 100;
                const verdictEl = document.getElementById('compactBudgetVerdict');

                if (paycheckReplacement >= 90) {
                    verdictEl.className = 'compact-budget-verdict positive';
                    verdictEl.innerHTML = `<i class="ph ph-check-circle"></i> ${paycheckReplacement.toFixed(0)}% of current lifestyle maintained`;
                } else if (paycheckReplacement >= 70) {
                    verdictEl.className = 'compact-budget-verdict neutral';
                    verdictEl.innerHTML = `<i class="ph ph-info"></i> ${paycheckReplacement.toFixed(0)}% of current lifestyle &mdash; moderate adjustment`;
                } else {
                    verdictEl.className = 'compact-budget-verdict negative';
                    verdictEl.innerHTML = `<i class="ph ph-warning"></i> ${paycheckReplacement.toFixed(0)}% of current lifestyle &mdash; significant change`;
                }
            }

            function renderPaycheckMirror(walls) {
                // Current spending (what they spend today)
                const currentSpending = params.lifestyleSpending || 0;

                // Retirement spending - what the plan sustainably supports at 90% success
                const retirementSpending = sustainableSpendingResult || currentSpending;

                // Calculate coverage percentage
                const coveragePercent = currentSpending > 0 ? Math.round((retirementSpending / currentSpending) * 100) : 100;

                // Calculate monthly dollar gap
                const annualGap = currentSpending - retirementSpending;
                const monthlyGap = Math.round(annualGap / 12);

                // Format values
                const formatCurrency = (val) => '$' + Math.round(val).toLocaleString();
                const formatMonthlyGap = (val) => '$' + Math.abs(val).toLocaleString();

                // Update the display
                document.getElementById('paycheckToday').textContent = formatCurrency(currentSpending);
                document.getElementById('paycheckRetirement').textContent = formatCurrency(retirementSpending);

                // Determine verdict class and message
                const verdictEl = document.getElementById('paycheckVerdict');
                let verdictClass, verdictMessage;

                if (coveragePercent >= 100) {
                    verdictClass = 'positive';
                    if (coveragePercent > 110) {
                        const monthlyExtra = Math.round((retirementSpending - currentSpending) / 12);
                        verdictMessage = `Your plan supports <span class="percentage">${coveragePercent}%</span> of your current lifestyle. <strong>You have ${formatMonthlyGap(monthlyExtra)}/mo extra capacity.</strong>`;
                    } else {
                        verdictMessage = `Your plan supports <span class="percentage">${coveragePercent}%</span> of your current lifestyle. <strong>You're maintaining your standard of living.</strong>`;
                    }
                } else if (coveragePercent >= 85) {
                    verdictClass = 'caution';
                    verdictMessage = `Your plan supports <span class="percentage">${coveragePercent}%</span> of your current lifestyle. <strong>You have a ${formatMonthlyGap(monthlyGap)}/mo income gap.</strong>`;
                } else if (coveragePercent >= 70) {
                    verdictClass = 'caution';
                    verdictMessage = `Your plan supports <span class="percentage">${coveragePercent}%</span> of your current lifestyle. <strong>You have a ${formatMonthlyGap(monthlyGap)}/mo income gap.</strong>`;
                } else {
                    verdictClass = 'warning';
                    verdictMessage = `Your plan supports only <span class="percentage">${coveragePercent}%</span> of your current lifestyle. <strong>You have a ${formatMonthlyGap(monthlyGap)}/mo income gap.</strong>`;
                }

                verdictEl.className = 'hero-paycheck-verdict ' + (verdictClass === 'positive' ? 'positive' : verdictClass === 'warning' ? 'negative' : 'neutral');

                // Build progress bar HTML
                const progressClass = verdictClass === 'positive' ? 'positive' : verdictClass === 'caution' ? 'caution' : 'negative';
                const progressWidth = Math.min(coveragePercent, 100);
                const progressBarHtml = `
            <div class="paycheck-progress-container">
                <div class="paycheck-progress-track">
                    <div class="paycheck-progress-fill ${progressClass}" style="width: ${progressWidth}%"></div>
                </div>
                <div class="paycheck-progress-label">
                    <span>0%</span>
                    <span>${coveragePercent}% covered</span>
                    <span>100%</span>
                </div>
            </div>
        `;

                verdictEl.innerHTML = verdictMessage + progressBarHtml;
            }

            // --- Inputs Summary Tile ---
            // Displays key user-provided inputs in the Dashboard hero row
            function renderInputsSummary() {
                var grid = document.getElementById('heroInputsGrid');
                if (!grid || !params) return;

                var fmtK = function(v) {
                    if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
                    if (v >= 1000) return '$' + Math.round(v / 1000) + 'k';
                    return '$' + v;
                };
                var fmtD = function(v) { return '$' + v.toLocaleString(); };
                var hasSpouse = params.spouseAge > 0;

                var userPreTax = params.userPreTaxBalance || 0;
                var spousePreTax = params.spousePreTaxBalance || 0;
                var userRoth = params.userRothBalance || 0;
                var spouseRoth = params.spouseRothBalance || 0;
                var taxableBal = params.taxableBalance || 0;
                var totalBal = userPreTax + spousePreTax + userRoth + spouseRoth + taxableBal;

                var items = [];

                // Ages
                if (hasSpouse) {
                    items.push({ label: 'Age', value: 'You ' + params.currentAge + ' / Spouse ' + params.spouseAge });
                    items.push({ label: 'Retire Age', value: 'You ' + params.retireAge + ' / Spouse ' + (params.spouseRetireAge || params.retireAge) });
                } else {
                    items.push({ label: 'Age', value: params.currentAge });
                    items.push({ label: 'Retire Age', value: params.retireAge });
                }
                items.push({ label: 'Plan To', value: params.endAge });

                // Portfolio
                items.push({ label: 'Total Portfolio', value: fmtK(totalBal) });

                // Pre-Tax with spouse breakdown
                if (hasSpouse && spousePreTax > 0) {
                    items.push({ label: 'Pre-Tax', value: fmtK(userPreTax + spousePreTax), detail: 'You ' + fmtK(userPreTax) + ' + Spouse ' + fmtK(spousePreTax) });
                } else {
                    items.push({ label: 'Pre-Tax', value: fmtK(userPreTax) });
                }

                // Roth with spouse breakdown
                if (hasSpouse && spouseRoth > 0) {
                    items.push({ label: 'Roth', value: fmtK(userRoth + spouseRoth), detail: 'You ' + fmtK(userRoth) + ' + Spouse ' + fmtK(spouseRoth) });
                } else {
                    items.push({ label: 'Roth', value: fmtK(userRoth) });
                }

                items.push({ label: 'Taxable', value: fmtK(taxableBal) });

                // Salary with spouse breakdown
                var userSalary = params.currentSalary || 0;
                var spouseSalary = params.spouseCurrentSalary || 0;
                if (hasSpouse && spouseSalary > 0) {
                    items.push({ label: 'Salary', value: fmtK(userSalary + spouseSalary), detail: 'You ' + fmtK(userSalary) + ' + Spouse ' + fmtK(spouseSalary) });
                } else {
                    items.push({ label: 'Salary', value: fmtK(userSalary) });
                }

                // Social Security with spouse breakdown
                var userSSAnnual = params.userSS || 0;
                var spouseSSAnnual = params.spouseSS || 0;
                if (hasSpouse && spouseSSAnnual > 0) {
                    items.push({ label: 'Social Security', value: fmtK(userSSAnnual + spouseSSAnnual) + '/yr', detail: 'You ' + fmtK(userSSAnnual) + ' + Spouse ' + fmtK(spouseSSAnnual) });
                } else {
                    items.push({ label: 'Social Security', value: userSSAnnual > 0 ? fmtK(userSSAnnual) + '/yr' : '&mdash;' });
                }

                // Pension with spouse breakdown
                var userPension = params.pension || 0;
                var spousePension = params.spousePension || 0;
                if (hasSpouse && spousePension > 0) {
                    items.push({ label: 'Pension', value: fmtK(userPension + spousePension) + '/yr', detail: 'You ' + fmtK(userPension) + ' + Spouse ' + fmtK(spousePension) });
                } else {
                    items.push({ label: 'Pension', value: userPension > 0 ? fmtK(userPension) + '/yr' : '&mdash;' });
                }

                // Spending
                items.push({ label: 'Spending', value: fmtD(params.lifestyleSpending || 0) + '/yr' });

                // Stock/Bond split
                var stockPct = Math.round((params.stockAllocation || 0.7) * 100);
                items.push({ label: 'Stock/Bond', value: stockPct + '/' + (100 - stockPct) });

                grid.innerHTML = items.map(function(item) {
                    var detailHtml = item.detail ? '<br><span class="input-summary-detail">' + item.detail + '</span>' : '';
                    return '<div class="input-summary-row">' +
                        '<span class="input-summary-label">' + item.label + '</span>' +
                        '<span class="input-summary-value">' + item.value + detailHtml + '</span>' +
                        '</div>';
                }).join('');
            }

            // --- Budget Bars: Key Transition Years ---
            // Shows income distribution at milestone ages with GLOBAL SCALING
            // All bars scaled relative to the maximum value for true visual comparison
            function renderBudgetBars() {
                if (!medianPathData || medianPathData.length === 0) return;

                const milestonesContainer = document.getElementById('budgetMilestones');
                const legendContainer = document.getElementById('budgetLegend');
                if (!milestonesContainer) return;

                // Identify key milestone ages
                const milestones = [];
                const retireAge = params.retireAge || 65;
                const endAge = params.endAge || 95;
                const ssClaimAge = params.userClaimAge || 67;
                const spendReductionAge = params.enableSpendingReduction ? (params.spendingReductionAge || 75) : null;

                // Always include retirement
                milestones.push({ age: retireAge, label: 'Retire' });

                // SS start if different from retirement and SS benefit exists
                if ((params.userSS > 0 || params.spouseSS > 0) && ssClaimAge > retireAge + 1) {
                    milestones.push({ age: ssClaimAge, label: 'SS Starts' });
                }

                // Spending reduction age if enabled and different from others
                if (spendReductionAge && spendReductionAge > retireAge + 2 && spendReductionAge < endAge - 2) {
                    const exists = milestones.some(m => Math.abs(m.age - spendReductionAge) <= 2);
                    if (!exists) {
                        milestones.push({ age: spendReductionAge, label: 'Age 75' });
                    }
                }

                // Always include end age
                milestones.push({ age: endAge, label: 'Plan End' });

                // Sort by age
                milestones.sort((a, b) => a.age - b.age);

                // Get data for each milestone with detailed breakdown
                const milestoneData = milestones.map(m => {
                    const yearData = medianPathData.find(y => y.age === m.age) ||
                        medianPathData.find(y => y.age >= m.age) ||
                        medianPathData[medianPathData.length - 1];

                    // Income sources
                    const ss = yearData ? (yearData.ssIncome || 0) : 0;
                    const pension = yearData ? (yearData.pensionIncome || 0) : 0;
                    const partTime = yearData ? (yearData.partTimeIncome || 0) : 0;

                    // Portfolio withdrawals by account type
                    const rmd = yearData ? (yearData.rmd || 0) : 0;
                    const wdTaxable = yearData ? (yearData.wdTaxable || 0) : 0;
                    const wdPreTax = yearData ? (yearData.wdPreTax || 0) : 0;
                    const wdRoth = yearData ? (yearData.wdRoth || 0) : 0;

                    // Gross total = all sources (before taxes)
                    const grossTotal = ss + pension + partTime + rmd + wdTaxable + wdPreTax + wdRoth;

                    // Tax bill for this year
                    const taxBill = yearData ? (yearData.taxBill || 0) : 0;

                    // NET spendable = gross income minus taxes
                    // This is what you actually have available to spend
                    const total = Math.max(0, grossTotal - taxBill);

                    // Spending need for THIS year (inflation-adjusted)
                    const spendingNeed = yearData ? (yearData.spending || 0) : 0;

                    return {
                        ...m, ss, pension, partTime, rmd, wdTaxable, wdPreTax, wdRoth, grossTotal, taxBill, total, spendingNeed
                    };
                });

                // Track which income sources are used across all milestones
                let hasSSIncome = false;
                let hasPensionIncome = false;
                let hasPartTimeIncome = false;
                let hasRMD = false;
                let hasTaxable = false;
                let hasPreTax = false;
                let hasRoth = false;

                const formatK = (val) => {
                    if (val >= 1000) return '$' + Math.round(val / 1000) + 'k';
                    return '$' + Math.round(val);
                };

                // Build HTML - Container = spending need (100%), income fills proportionally
                let html = '';
                milestoneData.forEach(m => {
                    const incomeTotal = m.total || 0; // NET income after taxes
                    const spendingNeed = m.spendingNeed || 0; // Inflation-adjusted for THIS year
                    const hasShortfall = incomeTotal < spendingNeed * 0.995;
                    const shortfallAmount = spendingNeed - incomeTotal;
                    const surplusAmount = incomeTotal - spendingNeed;

                    // Container = 100% = spending need for this year
                    // Income bar fills proportionally: income / spending
                    // If income < spending → gray space visible at end (shortfall)
                    // If income >= spending → bar fills 100% (capped, shows surplus in text)
                    const fillPercent = spendingNeed > 0
                        ? Math.min((incomeTotal / spendingNeed) * 100, 100)
                        : 0;

                    // Calculate each segment as % of the income bar
                    // Tax-aware: Roth is tax-free, so only taxable sources share the tax burden
                    const grossTotal = m.grossTotal || 0;
                    const taxBill = m.taxBill || 0;
                    const taxableSources = m.ss + m.pension + m.partTime + m.rmd + m.wdTaxable + m.wdPreTax;
                    const taxableNetRatio = taxableSources > 0 ? Math.max(0, taxableSources - taxBill) / taxableSources : 1;
                    const netSS = m.ss * taxableNetRatio;
                    const netPension = m.pension * taxableNetRatio;
                    const netPartTime = m.partTime * taxableNetRatio;
                    const netRmd = m.rmd * taxableNetRatio;
                    const netWdTaxable = m.wdTaxable * taxableNetRatio;
                    const netWdPreTax = m.wdPreTax * taxableNetRatio;
                    const netRoth = m.wdRoth; // Roth is tax-free
                    const calcSegmentWidth = (netVal) => incomeTotal > 0 ? (netVal / incomeTotal) * 100 : 0;
                    const ssWidth = calcSegmentWidth(netSS);
                    const pensionWidth = calcSegmentWidth(netPension);
                    const partTimeWidth = calcSegmentWidth(netPartTime);
                    const rmdWidth = calcSegmentWidth(netRmd);
                    const taxableWidth = calcSegmentWidth(netWdTaxable);
                    const preTaxWidth = calcSegmentWidth(netWdPreTax);
                    const rothWidth = calcSegmentWidth(netRoth);

                    // Track which sources are present
                    if (m.ss > 0) hasSSIncome = true;
                    if (m.pension > 0) hasPensionIncome = true;
                    if (m.partTime > 0) hasPartTimeIncome = true;
                    if (m.rmd > 0) hasRMD = true;
                    if (m.wdTaxable > 0) hasTaxable = true;
                    if (m.wdPreTax > 0) hasPreTax = true;
                    if (m.wdRoth > 0) hasRoth = true;

                    // Build shortfall/surplus indicator
                    let gapIndicator = '';
                    if (hasShortfall && shortfallAmount > 500) {
                        gapIndicator = `<span class="budget-shortfall-text" title="Annual shortfall: your spending need exceeds available income by this amount per year">&minus;${formatK(shortfallAmount)}/yr shortfall</span>`;
                    } else if (!hasShortfall && surplusAmount > 500) {
                        gapIndicator = `<span class="budget-surplus-text">+${formatK(surplusAmount)} surplus</span>`;
                    }

                    // Build simple breakdown - show net (after-tax) values per source
                    const breakdownItems = [];
                    if (m.ss > 0) breakdownItems.push(`SS ${formatK(netSS)}`);
                    if (m.pension > 0) breakdownItems.push(`Pension ${formatK(netPension)}`);
                    if (m.partTime > 0) breakdownItems.push(`Part-Time ${formatK(netPartTime)}`);
                    if (m.rmd > 0) breakdownItems.push(`RMD ${formatK(netRmd)}`);
                    if (m.wdTaxable > 0) breakdownItems.push(`Taxable ${formatK(netWdTaxable)}`);
                    if (m.wdPreTax > 0) breakdownItems.push(`401k/IRA ${formatK(netWdPreTax)}`);
                    if (m.wdRoth > 0) breakdownItems.push(`Roth ${formatK(netRoth)}`);

                    html += `
                <div class="budget-milestone-block">
                    <div class="budget-milestone-row">
                        <div class="budget-milestone-label">
                            <span class="age">${m.age}</span>
                            <span class="event">${m.label}</span>
                        </div>
                        <div class="budget-milestone-bar-wrapper">
                            <div class="budget-bar-and-info">
                                <div class="budget-global-track">
                                    <div class="budget-income-bar${hasShortfall ? ' shortfall' : ' surplus'}" style="width:${fillPercent.toFixed(1)}%">
                                        ${ssWidth > 0.5 ? `<div class="budget-bar-segment ss" style="width:${ssWidth.toFixed(1)}%" title="Social Security: ${formatK(m.ss)}" aria-label="Social Security: ${formatK(m.ss)}"></div>` : ''}
                                        ${pensionWidth > 0.5 ? `<div class="budget-bar-segment pension" style="width:${pensionWidth.toFixed(1)}%" title="Pension: ${formatK(m.pension)}" aria-label="Pension: ${formatK(m.pension)}"></div>` : ''}
                                        ${partTimeWidth > 0.5 ? `<div class="budget-bar-segment parttime" style="width:${partTimeWidth.toFixed(1)}%" title="Part-Time: ${formatK(m.partTime)}" aria-label="Part-Time: ${formatK(m.partTime)}"></div>` : ''}
                                        ${rmdWidth > 0.5 ? `<div class="budget-bar-segment rmd" style="width:${rmdWidth.toFixed(1)}%" title="RMD: ${formatK(m.rmd)}" aria-label="RMD: ${formatK(m.rmd)}"></div>` : ''}
                                        ${taxableWidth > 0.5 ? `<div class="budget-bar-segment taxable" style="width:${taxableWidth.toFixed(1)}%" title="Taxable: ${formatK(m.wdTaxable)}" aria-label="Taxable: ${formatK(m.wdTaxable)}"></div>` : ''}
                                        ${preTaxWidth > 0.5 ? `<div class="budget-bar-segment pretax" style="width:${preTaxWidth.toFixed(1)}%" title="401k/IRA: ${formatK(m.wdPreTax)}" aria-label="401k/IRA: ${formatK(m.wdPreTax)}"></div>` : ''}
                                        ${rothWidth > 0.5 ? `<div class="budget-bar-segment roth" style="width:${rothWidth.toFixed(1)}%" title="Roth: ${formatK(m.wdRoth)}" aria-label="Roth: ${formatK(m.wdRoth)}"></div>` : ''}
                                    </div>
                                </div>
                                <div class="budget-milestone-amount-wrapper">
                                    <div class="budget-milestone-amount">${formatK(incomeTotal)}/yr</div>
                                    ${gapIndicator ? `<div class="budget-gap-indicator">${gapIndicator}</div>` : ''}
                                </div>
                            </div>
                            <div class="budget-bar-breakdown">${breakdownItems.join(' · ')}</div>
                        </div>
                    </div>
                </div>
            `;
                });

                milestonesContainer.innerHTML = html;

                // Build legend based on actual income sources used
                let legendHtml = '';
                if (hasSSIncome) legendHtml += '<div class="budget-legend-item"><div class="budget-legend-dot ss"></div><span>Social Security</span></div>';
                if (hasPensionIncome) legendHtml += '<div class="budget-legend-item"><div class="budget-legend-dot pension"></div><span>Pension</span></div>';
                if (hasPartTimeIncome) legendHtml += '<div class="budget-legend-item"><div class="budget-legend-dot parttime"></div><span>Part-Time</span></div>';
                if (hasRMD) legendHtml += '<div class="budget-legend-item"><div class="budget-legend-dot rmd"></div><span>RMD</span></div>';
                if (hasTaxable) legendHtml += '<div class="budget-legend-item"><div class="budget-legend-dot taxable"></div><span>Taxable</span></div>';
                if (hasPreTax) legendHtml += '<div class="budget-legend-item"><div class="budget-legend-dot pretax"></div><span>401k/IRA</span></div>';
                if (hasRoth) legendHtml += '<div class="budget-legend-item"><div class="budget-legend-dot roth"></div><span>Roth</span></div>';
                // Removed: Spending Need legend item (container edge IS the spending need now)

                if (legendContainer) {
                    legendContainer.innerHTML = legendHtml;
                }
            }

            // Quick wall age calculator for lever testing
            function quickCalculateWallAge(testParams) {
                const solverPaths = 500;
                const solverSeedBase = fnv1aHash(JSON.stringify(testParams));

                const results = [];
                for (let i = 0; i < solverPaths; i++) {
                    const pathParams = {
                        ...testParams,
                        numPaths: solverPaths,
                        _solverDeterministic: true,
                        _solverSeedBase: solverSeedBase
                    };
                    const res = simulatePath(pathParams, i);
                    results.push(res);
                }

                // Sort by depletion age (null = never depletes = infinity)
                results.sort((a, b) => {
                    const aDepAge = a.depletionAge === null ? Infinity : a.depletionAge;
                    const bDepAge = b.depletionAge === null ? Infinity : b.depletionAge;
                    return aDepAge - bDepAge;
                });

                const p10Index = Math.floor(solverPaths * 0.10);
                const p10Path = results[p10Index];

                return p10Path.depletionAge; // null if never depletes
            }

            function calculateLevers(walls) {
                const baseWall = walls.poor;
                const endAge = params.endAge;

                // If no gap, return empty
                if (baseWall === null || baseWall >= endAge) {
                    return [];
                }

                const levers = [];

                // Lever 1: Delay Retirement by 2 years
                if (params.retireAge > params.currentAge) {
                    const newRetireAge = Math.min(params.retireAge + 2, params.endAge - 5);
                    if (newRetireAge > params.retireAge) {
                        const testParams = { ...params, retireAge: newRetireAge };
                        const newWall = quickCalculateWallAge(testParams);
                        const newWallValue = newWall === null ? endAge : newWall;
                        const improvement = newWallValue - baseWall;

                        levers.push({
                            action: `Delay retirement by 2 years (${params.retireAge} &rarr; ${newRetireAge})`,
                            wallBefore: baseWall,
                            wallAfter: newWall === null ? endAge + '+' : newWall,
                            improvement: Math.max(0, improvement),
                            reachesEnd: newWall === null || newWall >= endAge,
                            applyChanges: [{ inputId: 'retireAge', value: newRetireAge }]
                        });
                    }
                }

                // Lever 2: Reduce spending by 10%
                if (params.lifestyleSpending > 0) {
                    const reducedSpending = Math.round(params.lifestyleSpending * 0.9);
                    const spendingReduction = params.lifestyleSpending - reducedSpending;
                    const testParams = { ...params, lifestyleSpending: reducedSpending };
                    const newWall = quickCalculateWallAge(testParams);
                    const newWallValue = newWall === null ? endAge : newWall;
                    const improvement = newWallValue - baseWall;

                    levers.push({
                        action: `Reduce spending by 10% ($${spendingReduction.toLocaleString()}/year)`,
                        wallBefore: baseWall,
                        wallAfter: newWall === null ? endAge + '+' : newWall,
                        improvement: Math.max(0, improvement),
                        reachesEnd: newWall === null || newWall >= endAge,
                        applyChanges: [{ inputId: 'lifestyleSpending', value: reducedSpending }]
                    });
                }

                // Lever 3: Delay Social Security to 70
                if (params.userClaimAge && params.userClaimAge < 70) {
                    const testParams = { ...params, userClaimAge: 70 };
                    const newWall = quickCalculateWallAge(testParams);
                    const newWallValue = newWall === null ? endAge : newWall;
                    const improvement = newWallValue - baseWall;

                    levers.push({
                        action: `Delay Social Security to age 70 (from ${params.userClaimAge})`,
                        wallBefore: baseWall,
                        wallAfter: newWall === null ? endAge + '+' : newWall,
                        improvement: Math.max(0, improvement),
                        reachesEnd: newWall === null || newWall >= endAge,
                        applyChanges: [{ inputId: 'userClaimAge', value: 70 }]
                    });
                }

                // Lever 4: Delay retirement by 5 years
                if (params.retireAge > params.currentAge) {
                    const newRetireAge = Math.min(params.retireAge + 5, params.endAge - 5);
                    if (newRetireAge > params.retireAge + 2) {
                        const testParams = { ...params, retireAge: newRetireAge };
                        const newWall = quickCalculateWallAge(testParams);
                        const newWallValue = newWall === null ? endAge : newWall;
                        const improvement = newWallValue - baseWall;

                        levers.push({
                            action: `Delay retirement by 5 years (${params.retireAge} &rarr; ${newRetireAge})`,
                            wallBefore: baseWall,
                            wallAfter: newWall === null ? endAge + '+' : newWall,
                            improvement: Math.max(0, improvement),
                            reachesEnd: newWall === null || newWall >= endAge,
                            applyChanges: [{ inputId: 'retireAge', value: newRetireAge }]
                        });
                    }
                }

                // Lever 5: Reduce spending by 20%
                if (params.lifestyleSpending > 0) {
                    const reducedSpending = Math.round(params.lifestyleSpending * 0.8);
                    const spendingReduction = params.lifestyleSpending - reducedSpending;
                    const testParams = { ...params, lifestyleSpending: reducedSpending };
                    const newWall = quickCalculateWallAge(testParams);
                    const newWallValue = newWall === null ? endAge : newWall;
                    const improvement = newWallValue - baseWall;

                    levers.push({
                        action: `Reduce spending by 20% ($${spendingReduction.toLocaleString()}/year)`,
                        wallBefore: baseWall,
                        wallAfter: newWall === null ? endAge + '+' : newWall,
                        improvement: Math.max(0, improvement),
                        reachesEnd: newWall === null || newWall >= endAge,
                        applyChanges: [{ inputId: 'lifestyleSpending', value: reducedSpending }]
                    });
                }

                // Lever 6: Increase savings rate (if still working)
                if (params.currentSalary > 0 && params.userSavingsRate < 25 && params.retireAge > params.currentAge) {
                    const newSavingsRate = Math.min(params.userSavingsRate + 5, 25);
                    const testParams = { ...params, userSavingsRate: newSavingsRate };
                    const newWall = quickCalculateWallAge(testParams);
                    const newWallValue = newWall === null ? endAge : newWall;
                    const improvement = newWallValue - baseWall;

                    levers.push({
                        action: `Increase savings rate by 5% (${params.userSavingsRate}% &rarr; ${newSavingsRate}%)`,
                        wallBefore: baseWall,
                        wallAfter: newWall === null ? endAge + '+' : newWall,
                        improvement: Math.max(0, improvement),
                        reachesEnd: newWall === null || newWall >= endAge,
                        applyChanges: [{ inputId: 'userSavingsRate', value: newSavingsRate }]
                    });
                }

                // Sort by improvement (highest first), filter out zero-impact, take top 3
                const effectiveLevers = levers.filter(l => l.improvement > 0);
                effectiveLevers.sort((a, b) => b.improvement - a.improvement);
                return effectiveLevers.slice(0, 3);
            }

            function calculateOpportunities(walls) {
                // Called when there's no gap - plan is solid
                const opportunities = [];

                // Opportunity 1: Retire earlier
                if (params.retireAge > params.currentAge + 1) {
                    const earlierAge = params.retireAge - 2;
                    if (earlierAge > params.currentAge) {
                        opportunities.push({
                            icon: 'ph-calendar-check',
                            action: 'Retire 2 years earlier',
                            detail: `You could potentially retire at ${earlierAge} instead of ${params.retireAge}. Run the Goal Solver to find your earliest retirement age.`
                        });
                    }
                }

                // Opportunity 2: Spend more
                if (sustainableSpendingResult && sustainableSpendingResult > params.lifestyleSpending * 1.05) {
                    const extraSpending = sustainableSpendingResult - params.lifestyleSpending;
                    opportunities.push({
                        icon: 'ph-money',
                        action: `Increase spending by $${Math.round(extraSpending).toLocaleString()}/year`,
                        detail: `Your plan can sustainably support higher spending while maintaining a 90% success rate.`
                    });
                }

                // Opportunity 3: Roth conversions
                if (params.userPreTax > 100000 && !params.enableRothConversion) {
                    opportunities.push({
                        icon: 'ph-arrows-left-right',
                        action: 'Consider Roth conversions',
                        detail: `With $${(params.userPreTax / 1000).toFixed(0)}k+ in pre-tax accounts, strategic Roth conversions could reduce future RMDs and taxes.`
                    });
                }

                // Opportunity 4: Legacy planning
                if (simulationStats.medianFinalBalance > 500000) {
                    opportunities.push({
                        icon: 'ph-gift',
                        action: 'Plan for legacy giving',
                        detail: `Your median ending balance of $${(simulationStats.medianFinalBalance / 1000000).toFixed(1)}M suggests room for legacy planning or charitable giving.`
                    });
                }

                // Opportunity 5: Social Security timing
                if (params.userClaimAge && params.userClaimAge < 70) {
                    opportunities.push({
                        icon: 'ph-clock',
                        action: 'Optimize Social Security timing',
                        detail: `Delaying benefits to 70 increases monthly payments by ~8% per year delayed. Use the Goal Solver to analyze timing.`
                    });
                }

                return opportunities.slice(0, 3);
            }

            function renderLeversOrOpportunities(walls) {
                const improveSection = document.getElementById('improveSection');
                const improveList = document.getElementById('improveList');
                const improveTitle = document.getElementById('improveTitleText');
                const improveSubtitle = document.getElementById('improveSubtitle');
                const improveTitleContainer = improveTitle ? improveTitle.parentElement : null;

                if (!improveSection || !improveList) return;

                const hasGap = walls.poor !== null && walls.poor < params.endAge;

                if (hasGap) {
                    // Show levers - ways to improve
                    const levers = calculateLevers(walls);
                    calculatedLevers = levers;
                    calculatedOpportunities = [];

                    if (improveTitleContainer) improveTitleContainer.classList.remove('success');
                    if (improveTitle) improveTitle.textContent = 'Ways to Improve Your Plan';
                    if (improveSubtitle) improveSubtitle.textContent = 'Personalized simulations based on your specific situation';

                    // Input ID to human-readable label mapping (v16.4)
                    const inputLabelMap = {
                        retireAge: 'Retirement Age',
                        lifestyleSpending: 'Annual Spending',
                        userClaimAge: 'SS Claim Age',
                        userSavingsRate: 'Savings Rate',
                        stockAllocation: 'Stock Allocation'
                    };

                    if (levers.length > 0) {
                        let html = '';
                        levers.forEach((lever, leverIndex) => {
                            const maxImprovement = Math.max(...levers.map(l => l.improvement));
                            const impactPercent = Math.round((lever.improvement / maxImprovement) * 100);
                            let impactClass = 'low';
                            let impactLabel = 'Moderate';

                            if (lever.reachesEnd) {
                                impactClass = 'high';
                                impactLabel = 'Solves Gap';
                            } else if (impactPercent >= 70) {
                                impactClass = 'high';
                                impactLabel = 'High Impact';
                            } else if (impactPercent >= 40) {
                                impactClass = 'medium';
                                impactLabel = 'Medium';
                            }

                            const changedInputs = (lever.applyChanges || []).map(c => inputLabelMap[c.inputId] || c.inputId).join(', ');
                            html += `
                        <div class="improve-item" id="leverCard${leverIndex}">
                            <div class="improve-item-badge ${impactClass}">${impactLabel}</div>
                            <div class="improve-item-content">
                                <div class="improve-item-title">${lever.action}</div>
                                <div class="improve-item-desc">
                                    Extends portfolio from age ${lever.wallBefore} to ${lever.wallAfter} (+${lever.improvement} years)
                                </div>
                                <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">Changes: ${changedInputs}</div>
                            </div>
                            <button class="lever-apply-btn" onclick="applyLever(${leverIndex})" title="Apply this change to your plan">
                                <i class="ph ph-play"></i> Apply
                            </button>
                        </div>
                    `;
                        });

                        improveList.innerHTML = html;
                    } else {
                        improveList.innerHTML = `
                    <div class="improve-item">
                        <div class="improve-item-badge medium">Complex</div>
                        <div class="improve-item-content">
                            <div class="improve-item-title">Multiple changes may be needed</div>
                            <div class="improve-item-desc">
                                The gap is significant. Use the <strong>Goal Solver</strong> in the What-If tab to find the exact combination needed.
                            </div>
                        </div>
                    </div>
                `;
                    }

                    improveSection.style.display = 'block';
                } else {
                    // Show opportunities - plan is solid
                    calculatedLevers = [];
                    const opportunities = calculateOpportunities(walls);
                    calculatedOpportunities = opportunities;

                    if (improveTitleContainer) improveTitleContainer.classList.add('success');
                    if (improveTitle) improveTitle.textContent = 'Opportunities to Explore';
                    if (improveSubtitle) improveSubtitle.textContent = 'Your plan is solid &mdash; here are ways to optimize further';

                    if (opportunities.length > 0) {
                        let html = '';
                        opportunities.forEach(opp => {
                            html += `
                        <div class="improve-item">
                            <div class="improve-item-badge low">Optimize</div>
                            <div class="improve-item-content">
                                <div class="improve-item-title">${opp.action}</div>
                                <div class="improve-item-desc">${opp.detail}</div>
                            </div>
                        </div>
                    `;
                        });

                        improveList.innerHTML = html;
                        improveSection.style.display = 'block';
                    } else {
                        // No opportunities to show - display congratulations
                        improveList.innerHTML = `
                    <div class="improve-empty">
                        <i class="ph ph-check-circle"></i>
                        <h4>Your plan looks great!</h4>
                        <p>No major improvements needed at this time.</p>
                    </div>
                `;
                        improveSection.style.display = 'block';
                    }
                }
            }

            function applyLever(leverIndex) {
                const lever = calculatedLevers[leverIndex];
                if (!lever || !lever.applyChanges) return;

                // Capture previous success rate for toast
                const previousRate = simulationStats ? simulationStats.successRate : null;

                // Snapshot for revert
                inputSnapshots.push(getAllInputValues());
                if (inputSnapshots.length > 3) inputSnapshots.shift();
                updateRevertButton();

                // Apply each input change
                lever.applyChanges.forEach(change => {
                    const el = document.getElementById(change.inputId);
                    if (el) el.value = change.value;
                });

                // Disable the apply button to prevent double-apply
                const btn = document.querySelector(`#leverCard${leverIndex} .lever-apply-btn`);
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="ph ph-check"></i> Applied';
                    btn.classList.add('applied');
                }

                // Run simulation with callback to show toast
                const onComplete = function() {
                    if (previousRate !== null && simulationStats) {
                        showLeverToast(previousRate, simulationStats.successRate);
                    }
                };

                // Store callback and trigger simulation
                // Skip snapshot in initiateSimulation since we already captured pre-lever state
                window._leverApplyCallback = onComplete;
                window._skipNextSnapshot = true;
                initiateSimulation();
            }

            function showLeverToast(beforeRate, afterRate) {
                // Remove existing toast
                const existing = document.getElementById('leverToast');
                if (existing) existing.remove();

                const delta = afterRate - beforeRate;
                const deltaSign = delta >= 0 ? '+' : '';
                const deltaClass = delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral';

                const toast = document.createElement('div');
                toast.id = 'leverToast';
                toast.className = 'lever-toast ' + deltaClass;
                toast.innerHTML = `
                    <i class="ph ph-chart-line-up"></i>
                    <span>Success rate: ${beforeRate.toFixed(0)}% &rarr; ${afterRate.toFixed(0)}% (${deltaSign}${delta.toFixed(0)}%)</span>
                    <button onclick="this.parentElement.remove()" class="toast-close"><i class="ph ph-x"></i></button>
                `;
                document.body.appendChild(toast);

                // Auto-remove after 6 seconds
                setTimeout(() => {
                    if (toast.parentElement) {
                        toast.classList.add('fade-out');
                        setTimeout(() => toast.remove(), 300);
                    }
                }, 6000);
            }

            // --- Auto-save toast &amp; indicator (v17.1) ---
            function showAutoSaveToast(message) {
                const existing = document.getElementById('autoSaveToast');
                if (existing) existing.remove();

                const toast = document.createElement('div');
                toast.id = 'autoSaveToast';
                toast.className = 'lever-toast neutral';
                toast.innerHTML = `
                    <i class="ph ph-cloud-check"></i>
                    <span>${message}</span>
                    <button onclick="this.parentElement.remove()" class="toast-close"><i class="ph ph-x"></i></button>
                `;
                document.body.appendChild(toast);

                setTimeout(() => {
                    if (toast.parentElement) {
                        toast.classList.add('fade-out');
                        setTimeout(() => toast.remove(), 300);
                    }
                }, 4000);
            }

            function updateAutoSaveIndicator() {
                const indicator = document.getElementById('autoSaveIndicator');
                if (!indicator) return;
                indicator.textContent = 'Saved';
                indicator.classList.add('flash');
                setTimeout(() => indicator.classList.remove('flash'), 1500);
            }

            // ==========================================================================
            // ONBOARDING TOUR (v16.2)
            // ==========================================================================

            let tourCurrentStep = -1;
            const TOUR_STORAGE_KEY = 'retirementArchitect_tourDismissed';
            let hasCompletedFirstSimulation = false;

            const tourSteps = [
                {
                    target: 'gaugeAriaContainer',
                    title: 'Success Rate',
                    text: 'This gauge shows the probability your savings will last through retirement, based on hundreds of market simulations.',
                    position: 'bottom'
                },
                {
                    target: 'heroLifespanProgress',
                    title: 'Lifespan Timeline',
                    text: 'This timeline shows when your money may run out under different market conditions. Green means you&rsquo;re covered; red marks potential shortfalls.',
                    position: 'bottom'
                },
                {
                    target: 'compactBudgetSection',
                    title: 'Spending Comparison',
                    text: 'Compare your current spending to what the plan can sustain in retirement. The goal is to maintain your lifestyle.',
                    position: 'top'
                },
                {
                    target: 'budgetBarsSection',
                    title: 'Income Sources',
                    text: 'See where your retirement income comes from at each stage &mdash; Social Security, withdrawals, pensions, and more.',
                    position: 'top'
                },
                {
                    target: 'improveSection',
                    title: 'Improvement Actions',
                    text: 'Personalized suggestions to strengthen your plan. Click "Apply" to instantly test a change and see its impact.',
                    position: 'top'
                },
                {
                    target: 'navScenarios',
                    title: 'What-If Scenarios',
                    text: 'Save snapshots and compare different strategies side by side. Try "what if I retire earlier?" or "what if markets crash?"',
                    position: 'bottom'
                }
            ];

            function shouldShowTour() {
                try {
                    return !localStorage.getItem(TOUR_STORAGE_KEY);
                } catch (e) {
                    return false;
                }
            }

            function startTour() {
                tourCurrentStep = -1;
                advanceTour();
            }

            function advanceTour() {
                // Remove previous tooltip
                const prev = document.getElementById('tourTooltip');
                if (prev) prev.remove();

                tourCurrentStep++;

                if (tourCurrentStep >= tourSteps.length) {
                    endTour();
                    return;
                }

                const step = tourSteps[tourCurrentStep];
                const targetEl = document.getElementById(step.target);
                if (!targetEl) {
                    // Skip missing elements
                    advanceTour();
                    return;
                }

                // Scroll target into view
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

                setTimeout(() => {
                    renderTourTooltip(step, targetEl);
                }, 400);
            }

            function renderTourTooltip(step, targetEl) {
                const rect = targetEl.getBoundingClientRect();
                const tooltip = document.createElement('div');
                tooltip.id = 'tourTooltip';
                tooltip.className = 'tour-tooltip tour-' + step.position;

                const stepNum = tourCurrentStep + 1;
                const totalSteps = tourSteps.length;
                const isLast = tourCurrentStep === tourSteps.length - 1;

                tooltip.innerHTML = `
                    <div class="tour-tooltip-header">
                        <span class="tour-step-count">${stepNum} of ${totalSteps}</span>
                        <button class="tour-skip-btn" onclick="endTour()"><i class="ph ph-x"></i></button>
                    </div>
                    <div class="tour-tooltip-title">${step.title}</div>
                    <div class="tour-tooltip-text">${step.text}</div>
                    <div class="tour-tooltip-footer">
                        <label class="tour-dismiss-label">
                            <input type="checkbox" id="tourDontShow"> Don&rsquo;t show again
                        </label>
                        <button class="tour-next-btn" onclick="advanceTour()">
                            ${isLast ? 'Done' : 'Next'} <i class="ph ph-arrow-right"></i>
                        </button>
                    </div>
                `;

                document.body.appendChild(tooltip);

                // Position tooltip
                positionTourTooltip(tooltip, targetEl, step.position);

                // Add highlight ring to target
                targetEl.classList.add('tour-highlight');
            }

            function positionTourTooltip(tooltip, targetEl, position) {
                const rect = targetEl.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                const margin = 12;
                const isMobile = window.innerWidth <= 768;

                let top, left;

                if (isMobile) {
                    // On mobile, always position tooltip at bottom of viewport area
                    left = 16;
                    tooltip.style.width = 'calc(100vw - 32px)';
                    tooltip.style.maxWidth = 'none';
                    top = rect.bottom + margin;
                    if (top + tooltipRect.height > window.innerHeight) {
                        top = rect.top - tooltipRect.height - margin;
                    }
                } else {
                    if (position === 'bottom') {
                        top = rect.bottom + margin;
                        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                    } else {
                        top = rect.top - tooltipRect.height - margin;
                        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                    }
                    // Keep within viewport
                    left = Math.max(16, Math.min(left, window.innerWidth - tooltipRect.width - 16));
                }

                tooltip.style.top = (top + window.scrollY) + 'px';
                tooltip.style.left = left + 'px';
            }

            function endTour() {
                const tooltip = document.getElementById('tourTooltip');
                const dontShow = document.getElementById('tourDontShow');

                // Always save dismissal (tour was completed or skipped)
                try {
                    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
                } catch (e) {}

                if (tooltip) tooltip.remove();

                // Remove all highlight rings
                document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));

                tourCurrentStep = -1;
            }

            function resetTour() {
                try {
                    localStorage.removeItem(TOUR_STORAGE_KEY);
                } catch (e) {}
                startTour();
            }

            function renderProgressBar(walls) {
                const container = document.getElementById('lifespanProgress');
                if (!container) return;

                const currentAge = params.currentAge;
                const retireAge = params.retireAge;
                const endAge = params.endAge;
                const ssAge = params.userClaimAge || 67;

                const poorWallAge = walls.poor;
                const avgWallAge = walls.average;
                const hasGap = poorWallAge !== null && poorWallAge < endAge;
                const hasAvgGap = avgWallAge !== null && avgWallAge < endAge;

                // Calculate percentages
                const ageRange = endAge - currentAge;
                const ageToPercent = (age) => ((age - currentAge) / ageRange) * 100;

                // Update fill and danger zone
                const fill = document.getElementById('lifespanFill');
                const dangerZone = document.getElementById('lifespanDangerZone');

                if (hasGap) {
                    const fillPercent = ageToPercent(poorWallAge);
                    fill.style.width = fillPercent + '%';
                    fill.className = 'lifespan-fill danger';

                    dangerZone.style.display = 'block';
                    dangerZone.style.left = fillPercent + '%';
                    dangerZone.style.width = (100 - fillPercent) + '%';
                } else {
                    fill.style.width = '100%';
                    fill.className = 'lifespan-fill success';
                    dangerZone.style.display = 'none';
                }

                // Clear existing milestones
                container.querySelectorAll('.lifespan-milestone').forEach(el => el.remove());

                // Define milestones
                const milestones = [];

                // Current age
                milestones.push({
                    age: currentAge,
                    label: 'Now',
                    type: 'current',
                    icon: 'ph-user'
                });

                // Retirement
                if (retireAge > currentAge && retireAge < endAge) {
                    milestones.push({
                        age: retireAge,
                        label: 'Retire',
                        type: 'milestone',
                        icon: 'ph-beach-chair'
                    });
                }

                // Social Security (if different enough from retire)
                if (Math.abs(ssAge - retireAge) >= 3 && ssAge > currentAge && ssAge < endAge) {
                    milestones.push({
                        age: ssAge,
                        label: 'SS Starts',
                        type: 'milestone',
                        icon: 'ph-identification-card'
                    });
                }

                // Poor markets wall
                if (hasGap) {
                    milestones.push({
                        age: poorWallAge,
                        label: 'Poor Mkts',
                        type: 'danger',
                        icon: 'ph-warning'
                    });
                }

                // Average markets wall (if different from poor)
                if (hasAvgGap && (!hasGap || Math.abs(avgWallAge - poorWallAge) > 3)) {
                    milestones.push({
                        age: avgWallAge,
                        label: 'Avg Mkts',
                        type: 'warning',
                        icon: 'ph-warning-circle'
                    });
                }

                // Plan end
                milestones.push({
                    age: endAge,
                    label: hasGap ? 'Plan End' : 'Success!',
                    type: hasGap ? 'end' : 'success',
                    icon: hasGap ? 'ph-flag-checkered' : 'ph-check-circle'
                });

                // Sort by age and remove duplicates
                const sortedMilestones = milestones
                    .sort((a, b) => a.age - b.age)
                    .filter((m, i, arr) => i === 0 || Math.abs(m.age - arr[i - 1].age) >= 2);

                // Create milestone elements
                const track = container.querySelector('.lifespan-track');

                sortedMilestones.forEach(m => {
                    const percent = ageToPercent(m.age);

                    const milestone = document.createElement('div');
                    milestone.className = 'lifespan-milestone';
                    milestone.style.left = percent + '%';

                    let dotClass = 'milestone-dot';
                    if (m.type === 'current') dotClass += ' current';
                    else if (m.type === 'danger') dotClass += ' danger';
                    else if (m.type === 'warning') dotClass += ' warning';
                    else if (m.type === 'success') dotClass += ' success';
                    else if (m.type === 'milestone') dotClass += ' milestone';

                    let textClass = 'milestone-text';
                    if (m.type === 'danger') textClass += ' danger';
                    else if (m.type === 'warning') textClass += ' warning';
                    else if (m.type === 'success') textClass += ' success';

                    milestone.innerHTML = `
                <div class="${dotClass}">
                    <i class="ph ${m.icon}"></i>
                </div>
                <div class="milestone-label">
                    <div class="milestone-age">${m.age}</div>
                    <div class="${textClass}">${m.label}</div>
                </div>
            `;

                    track.appendChild(milestone);
                });
            }

            function renderWallInsights(walls) {
                const container = document.getElementById('wallInsights');
                if (!container) return;
                const endAge = params.endAge;
                const poorWall = walls.poor;
                const avgWall = walls.average;

                let insightsHTML = '';

                // Poor markets insight
                if (poorWall !== null && poorWall < endAge) {
                    const yearsShort = endAge - poorWall;
                    insightsHTML += `
                <div class="wall-insight-box warning">
                    <i class="ph ph-warning-circle wall-insight-icon"></i>
                    <div class="wall-insight-text">
                        <strong>Poor Markets:</strong> Your money runs out at age ${poorWall} &mdash; 
                        <strong>${yearsShort} years</strong> before your plan ends.
                    </div>
                </div>
            `;
                } else {
                    insightsHTML += `
                <div class="wall-insight-box success">
                    <i class="ph ph-check-circle wall-insight-icon"></i>
                    <div class="wall-insight-text">
                        <strong>Poor Markets:</strong> Even in tough conditions, your money lasts 
                        past age ${endAge}. You're well protected.
                    </div>
                </div>
            `;
                }

                // Average markets insight
                if (avgWall !== null && avgWall < endAge) {
                    const yearsShort = endAge - avgWall;
                    insightsHTML += `
                <div class="wall-insight-box info">
                    <i class="ph ph-info wall-insight-icon"></i>
                    <div class="wall-insight-text">
                        <strong>Average Markets:</strong> In typical conditions, money runs out at age ${avgWall} &mdash; 
                        <strong>${yearsShort} years</strong> early.
                    </div>
                </div>
            `;
                } else {
                    insightsHTML += `
                <div class="wall-insight-box success">
                    <i class="ph ph-check-circle wall-insight-icon"></i>
                    <div class="wall-insight-text">
                        <strong>Average Markets:</strong> In typical conditions, your money lasts 
                        your entire plan. You're on track.
                    </div>
                </div>
            `;
                }

                container.innerHTML = insightsHTML;
            }

            // ==========================================================================
            // EXPORT & DATA MANAGEMENT MODULE
            // All export and data persistence functions in one place
            // ==========================================================================

            // --- CSV Export ---
            function exportData() {
                if (medianPathData.length === 0) return;
                let csv = "Age,PortfolioBalance,StockAllocation,SpendingNeed,SpendingTodaysDollars,WithdrawalRate,SSIncome,PensionIncome,PartTimeIncome,RMD,DiscretionaryWithdrawal,TotalWithdrawal,OrdinaryTaxIncome,TaxBill,EffectiveRate,Solvent\n";
                medianPathData.forEach(d => {
                    const spendingToday = d.spending / d.inflation;
                    const wdRate = d.totalBal > 0 ? (d.totalWithdrawal / d.totalBal) * 100 : 0;
                    csv += `${d.age},${d.totalBal.toFixed(2)},${(d.stockAlloc * 100).toFixed(0)}%,${d.spending.toFixed(2)},${spendingToday.toFixed(2)},${wdRate.toFixed(2)}%,${d.ssIncome.toFixed(2)},${d.pensionIncome.toFixed(2)},${d.partTimeIncome.toFixed(2)},${d.rmd.toFixed(2)},${d.discretionaryWithdrawal.toFixed(2)},${d.totalWithdrawal.toFixed(2)},${d.ordIncome.toFixed(2)},${d.taxBill.toFixed(2)},${(d.effRate * 100).toFixed(2)}%,${d.isSolvent}\n`;
                });
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a'); a.href = window.URL.createObjectURL(blob); a.download = "median_path_v9_9.csv"; a.click();
            }

            // --- AI JSON Export ---
            function exportForAI() {
                if (simulationResults.length === 0) { alert("Please run the simulation first."); return; }

                // Calculate wall ages
                const walls = calculateWallAges();

                // Calculate sustainable spending if not already done
                const sustainableSpending = sustainableSpendingResult || calculateSustainableSpending(params, 90);

                // Calculate paycheck coverage
                const currentSpending = params.lifestyleSpending || 0;
                const coveragePercent = currentSpending > 0 ? Math.round((sustainableSpending / currentSpending) * 100) : 100;

                // Calculate portfolio runway
                const n = simulationResults.length;
                const p50Index = Math.floor(n * 0.50);
                const medianPath = simulationResults[p50Index];
                let portfolioRunway = params.endAge - params.currentAge;
                if (medianPath.depletionAge !== null) {
                    portfolioRunway = medianPath.depletionAge - params.currentAge;
                }

                // Use stored levers if available (already calculated during render)
                let leversData = [];
                const hasGap = walls.poor !== null && walls.poor < params.endAge;
                if (hasGap && calculatedLevers.length > 0) {
                    leversData = calculatedLevers.map(l => ({
                        action: l.action,
                        wallBefore: l.wallBefore,
                        wallAfter: l.wallAfter,
                        improvementYears: l.improvement,
                        solvesGap: l.reachesEnd
                    }));
                }

                const aiData = {
                    version: 'V17.2',
                    timestamp: new Date().toISOString(),
                    inputParameters: params,
                    simulationStats: simulationStats,

                    // NEW: Your Story data
                    yourStory: {
                        wallAges: {
                            poorMarkets: walls.poor,      // 10th percentile depletion age (null = never depletes)
                            averageMarkets: walls.average  // 50th percentile depletion age (null = never depletes)
                        },
                        hasGap: hasGap,
                        gapYears: hasGap ? params.endAge - walls.poor : 0,

                        paycheckMirror: {
                            currentSpending: currentSpending,
                            sustainableSpending: sustainableSpending,  // At 90% success rate
                            coveragePercent: coveragePercent
                        },

                        portfolioRunway: portfolioRunway,  // Years until median path depletes

                        topLevers: leversData,  // Top 3 improvement actions (if gap exists)

                        opportunities: calculatedOpportunities.map(o => ({
                            action: o.action,
                            detail: o.detail
                        }))  // Optimization opportunities (if no gap)
                    },

                    keyObservations: generateKeyObservations(params, simulationStats),
                    medianPathSummary: medianPathData.map(d => {
                        const spendingToday = d.spending / d.inflation;
                        const wdRate = d.totalBal > 0 ? (d.totalWithdrawal / d.totalBal) * 100 : 0;
                        return {
                            age: d.age,
                            portfolioBalance: d.totalBal.toFixed(0),
                            stockAllocation: (d.stockAlloc * 100).toFixed(0) + '%',
                            spendingNeed: d.spending.toFixed(0),
                            spendingTodaysDollars: spendingToday.toFixed(0),
                            withdrawalRate: wdRate.toFixed(1) + '%',
                            ssIncome: d.ssIncome.toFixed(0),
                            rmd: d.rmd.toFixed(0),
                            totalWithdrawal: d.totalWithdrawal.toFixed(0),
                            ordinaryTaxIncome: d.ordIncome.toFixed(0),
                            taxBill: d.taxBill.toFixed(0),
                            effectiveRate: (d.effRate * 100).toFixed(1) + '%'
                        };
                    })
                };

                const jsonString = JSON.stringify(aiData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const a = document.createElement('a'); a.href = window.URL.createObjectURL(blob); a.download = "audit_ai_export_v9_9.json"; a.click();

                alert("AI JSON Export Complete! File saved as audit_ai_export_v9_9.json");
            }

            // --- QR Code Generation ---
            function generateQRData() {
                const inputs = getAllInputValues();
                const json = JSON.stringify(inputs);
                const compressed = LZString.compressToEncodedURIComponent(json);
                const baseUrl = window.location.origin + window.location.pathname;
                return baseUrl + '?d=' + compressed;
            }

            function showQRCode() {
                const container = document.getElementById('qrCodeContainer');
                container.innerHTML = '';
                const url = generateQRData();

                // Check URL length feasibility for QR (max ~4,296 alphanumeric chars)
                if (url.length > 4000) {
                    container.innerHTML = '<div style="color: #ef4444; font-size: 0.9rem; padding: 20px;">Data too large for QR code. Try reducing the number of active features.</div>';
                    document.getElementById('qrModal').classList.add('active');
                    return;
                }

                new QRCode(container, {
                    text: url,
                    width: 280,
                    height: 280,
                    colorDark: '#0f172a',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.L
                });

                document.getElementById('qrModal').classList.add('active');
            }

            function closeQRModal() {
                document.getElementById('qrModal').classList.remove('active');
            }

            function generateQRForPDF(containerId) {
                const container = document.getElementById(containerId);
                if (!container) return;
                container.innerHTML = '';
                const url = generateQRData();
                if (url.length > 4000) {
                    container.innerHTML = '<div style="font-size: 9px; color: #94a3b8;">QR code omitted &mdash; data exceeds QR capacity.</div>';
                    return;
                }
                new QRCode(container, {
                    text: url,
                    width: 120,
                    height: 120,
                    colorDark: '#0f172a',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.L
                });
            }

            // --- QR Code URL Import ---
            function importFromQRUrl() {
                const urlParams = new URLSearchParams(window.location.search);
                const data = urlParams.get('d');
                if (!data) return false;

                try {
                    const json = LZString.decompressFromEncodedURIComponent(data);
                    if (!json) return false;
                    const inputs = JSON.parse(json);
                    setAllInputValues(inputs);

                    // Clear the URL parameter so refresh doesn't re-import
                    window.history.replaceState({}, '', window.location.pathname);

                    // Trigger dependent UI updates
                    updateFilingStatus();
                    toggleHousingSettings();

                    return true;
                } catch (e) {
                    console.warn('QR import failed:', e);
                    return false;
                }
            }

            // --- PDF Report Export ---
            function generatePDF() {
                if (simulationResults.length === 0) { alert("Please run the simulation first."); return; }
                const btn = document.getElementById('reportPdfBtn');
                if (btn) { btn.innerHTML = '<i class="ph ph-spinner"></i> Generating...'; btn.disabled = true; }

                // --- 1. Populate Executive Summary ---
                const rate = simulationStats.successRate;
                const medianBal = simulationStats.medianFinalBalance;
                const lifetimeTax = simulationStats.totalLifetimeTax;

                document.getElementById('pdfDate').textContent = new Date().toLocaleDateString();
                document.getElementById('pdfSuccessRate').textContent = `${rate.toFixed(1)}%`;
                document.getElementById('pdfMonthlyPaycheck').textContent = document.getElementById('monthlyPaycheckValue')?.textContent || '--'; // BUG-004 fix
                document.getElementById('pdfPortfolioRunway').textContent = document.getElementById('portfolioRunwayValue')?.textContent || '--'; // BUG-004 fix
                document.getElementById('pdfMedianBalance').textContent = formatCurrency(medianBal);
                document.getElementById('pdfLifetimeTax').textContent = formatCurrency(lifetimeTax);
                document.getElementById('pdfNumPaths').textContent = `${params.numPaths}`;

                // --- 2. Populate Assumptions ---
                const assumpBody = document.getElementById('pdfAssumptionsBody');
                assumpBody.innerHTML = `
            <ul>
                <li>**Current Age/Retire Age:** ${params.currentAge}/${params.retireAge}</li>
                <li>**End Age:** ${params.endAge}</li>
                <li>**Filing Status:** ${params.spouseAge > 0 ? 'MFJ' : 'Single'}</li>
                <li>**Inflation Rate:** ${formatPercent(params.lifestyleInflation)}</li>
                <li>**Stock Allocation:** ${params.stockAllocation * 100}% ${params.enableGlidePath ? `(Ends @ ${params.endingStockAllocation * 100}%)` : ''}</li>
                <li>**Stock Return/Vol:** ${formatPercent(params.stockReturn)} / ${formatPercent(params.stockVol)}</li>
                <li>**SS Claim Age (You/Spouse):** ${params.userClaimAge} / ${params.spouseClaimAge}</li>
                <li>**Taxable Gain Ratio:** ${params.taxableGainRatio * 100}%</li>
                <li>**Tax Bracket Growth:** ${params.bracketGrowth * 100}%</li>
                <li>**State Tax Rate:** ${params.stateTaxRate * 100}%</li>
            </ul>
        `;

                // --- 3. Populate Observations ---
                const observations = generateKeyObservations(params, simulationStats);
                const recBox = document.getElementById('pdfRecommendation');
                let recHeader = '';
                if (rate > 90) { recBox.className = "pdf-rec-box success"; recHeader = '<strong>ROBUST PLAN:</strong> Audit Passed with high confidence.'; }
                else if (rate > 75) { recBox.className = "pdf-rec-box warning"; recHeader = '<strong>CAUTIONARY PLAN:</strong> Feasible but warrants caution and optimization.'; }
                else { recBox.className = "pdf-rec-box danger"; recHeader = '<strong>HIGH RISK:</strong> Immediate action required to improve longevity.'; }
                recBox.innerHTML = `<div>${recHeader}</div><ul style="margin-top: 5px;">${observations.map(o => `<li>${o}</li>`).join('')}</ul>`;

                // --- 4. Populate Charts (all 4) ---
                // v17.2 fix: Chart.js requires visible, properly-sized canvases. The Charts tab
                // may be hidden (display:none via .main-view CSS). We must temporarily activate
                // the Charts view, render the charts, capture them, then restore the original view.

                // Remember which view was active so we can restore it
                const activeView = document.querySelector('.main-view.active');
                const chartsView = document.getElementById('chartsView');
                const chartsContent = document.getElementById('chartsContent');

                // Temporarily switch to Charts view (makes canvases visible with real dimensions)
                if (chartsView) chartsView.classList.add('active');
                if (chartsContent) chartsContent.style.display = 'block';

                // Expand any collapsed chart sections
                const collapsedSections = [];
                document.querySelectorAll('.chart-section.collapsed').forEach(section => {
                    collapsedSections.push(section.id);
                    section.classList.remove('collapsed');
                });

                // Force render charts (creates them if they don't exist)
                renderChartsViewCharts();

                // Wait for Chart.js to finish rendering into now-visible canvases
                setTimeout(() => {
                    // Capture from the correct v17.0 canvas IDs
                    try { document.getElementById('pdfBalanceChart').src = document.getElementById('chartsBalanceChart').toDataURL('image/png'); } catch (e) { console.log('Balance chart capture failed', e); }
                    try { document.getElementById('pdfIncomeSourcesChart').src = document.getElementById('chartsIncomeChart').toDataURL('image/png'); } catch (e) { console.log('Income sources chart capture failed', e); }
                    try { document.getElementById('pdfIncomeVsSpendChart').src = document.getElementById('chartsSpendingChart').toDataURL('image/png'); } catch (e) { console.log('Income vs spend chart capture failed', e); }
                    try { document.getElementById('pdfTaxChart').src = document.getElementById('chartsTaxChart').toDataURL('image/png'); } catch (e) { console.log('Tax chart capture failed', e); }

                    // Restore collapsed state
                    collapsedSections.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.classList.add('collapsed');
                    });

                    // Restore original view: remove Charts active, re-activate original
                    if (chartsView && activeView !== chartsView) chartsView.classList.remove('active');
                    if (activeView && !activeView.classList.contains('active')) activeView.classList.add('active');

                    // Continue with PDF generation
                    generatePDFContinue();
                }, 800);
            }

            function generatePDFContinue() {
                const btn = document.getElementById('reportPdfBtn');

                // --- 5. Populate Ledger ---
                const tbody = document.getElementById('pdfLedgerBody'); tbody.innerHTML = '';
                const summaryLedger = medianPathData.filter((d, index) => index % 3 === 0 || index === medianPathData.length - 1); // Sample every 3rd row + last row

                summaryLedger.forEach(d => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                <td>${d.age}</td>
                <td>${formatCurrency(d.totalBal)}</td>
                <td>${formatCurrency(d.rmd)}</td>
                <td>${formatCurrency(d.totalWithdrawal)}</td>
                <td>${formatCurrency(d.taxBill)}</td>
            `;
                    tbody.appendChild(row);
                });

                // --- 6. Generate PDF ---
                const pdfReport = document.getElementById('pdfReport');
                // v17.2 fix: .sidebar was removed in v17.0; hide icon-sidebar + input-panel + toggle instead
                const iconSidebar = document.querySelector('.icon-sidebar');
                const inputPanel = document.querySelector('.input-panel');
                const panelToggle = document.querySelector('.input-panel-toggle');
                const mainContent = document.querySelector('.main-content');
                if (iconSidebar) iconSidebar.style.display = 'none';
                if (inputPanel) inputPanel.style.display = 'none';
                if (panelToggle) panelToggle.style.display = 'none';
                if (mainContent) mainContent.style.display = 'none';
                pdfReport.style.display = 'block';

                // --- 6b. Generate QR code for PDF (must be after pdfReport is visible) ---
                generateQRForPDF('pdfQrContainer');

                setTimeout(() => {
                    html2pdf().set({
                        margin: 0.4,
                        filename: 'Retirement_Audit_V17.pdf',
                        image: { type: 'jpeg', quality: 0.95 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
                        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], avoid: ['.pdf-charts-page', '.pdf-chart-box-full', '.pdf-table-section', '.pdf-rec-box', '.pdf-grid'] }
                    })
                        .from(pdfReport).save().then(() => {
                            pdfReport.style.display = 'none';
                            // v17.2 fix: restore v17.0 sidebar elements
                            if (iconSidebar) iconSidebar.style.display = 'flex';
                            if (inputPanel) inputPanel.style.display = 'flex';
                            if (panelToggle) panelToggle.style.display = 'flex';
                            if (mainContent) mainContent.style.display = 'block';
                            if (btn) { btn.innerHTML = '<i class="ph ph-download"></i> Download PDF'; btn.disabled = false; }
                        });
                }, 100);
            }

            // Init
            document.addEventListener('DOMContentLoaded', () => {
                // v17.2: Check for QR code URL import before anything else
                const qrImported = importFromQRUrl();
                if (qrImported) {
                    // Brief delay to let inputs settle, then show a toast
                    setTimeout(() => {
                        const toast = document.getElementById('leverToast');
                        if (toast) {
                            toast.innerHTML = '<i class="ph ph-qr-code"></i> Scenario loaded from QR code!';
                            toast.style.background = '#6366f1';
                            toast.classList.add('show');
                            setTimeout(() => toast.classList.remove('show'), 3000);
                        }
                    }, 500);
                }

                updateFilingStatus();
                toggleHousingSettings();

                // Initialize sidebar accordions
                initAccordions();

                // Tooltip Logic &mdash; click-to-toggle (v15.6)
                const tooltip = document.getElementById('dynamicTooltip');
                let activeTooltipIcon = null;

                function openTooltip(icon) {
                    tooltip.textContent = icon.getAttribute('data-tooltip');
                    const rect = icon.getBoundingClientRect();
                    const vw = window.innerWidth;
                    const tooltipWidth = Math.min(250, vw - 24);
                    let left, top;

                    if (vw < 400) {
                        // Mobile: center tooltip below the icon
                        left = Math.max(12, (vw - tooltipWidth) / 2);
                        top = rect.bottom + 8;
                    } else {
                        // Desktop: position to the right of the icon
                        left = rect.right + 10;
                        top = rect.top - 5;
                        // If overflows right, try left side
                        if (left + tooltipWidth > vw - 12) {
                            left = rect.left - tooltipWidth - 10;
                        }
                    }

                    // Clamp: never go off-screen left or right
                    if (left < 8) left = 8;
                    if (left + tooltipWidth > vw - 8) left = vw - tooltipWidth - 8;
                    if (top < 8) top = 8;

                    tooltip.style.maxWidth = tooltipWidth + 'px';
                    tooltip.style.left = left + 'px';
                    tooltip.style.top = top + 'px';
                    tooltip.classList.add('tooltip-active');
                    activeTooltipIcon = icon;
                }

                function closeTooltip() {
                    tooltip.classList.remove('tooltip-active');
                    activeTooltipIcon = null;
                }

                document.querySelectorAll('.info-icon').forEach(icon => {
                    icon.addEventListener('click', e => {
                        e.stopPropagation();
                        if (activeTooltipIcon === icon) {
                            closeTooltip();
                        } else {
                            openTooltip(icon);
                        }
                    });
                });

                // Outside-click dismisses open tooltip
                document.addEventListener('click', (e) => {
                    if (activeTooltipIcon && !e.target.closest('#dynamicTooltip')) {
                        closeTooltip();
                    }
                });

                // Close tooltip on sidebar scroll (fixed-position tooltip would drift)
                const scrollArea = document.querySelector('.input-scroll-area');
                if (scrollArea) {
                    scrollArea.addEventListener('scroll', () => { if (activeTooltipIcon) closeTooltip(); });
                }

                // Close dropdowns when clicking outside
                document.addEventListener('click', (e) => {
                    if (!e.target.closest('.dropdown-container')) {
                        closeAllDropdowns();
                    }
                });

                // Initialize currency formatting for dollar inputs
                initCurrencyFormatting();

                // V17.2 migration: Mobile UX fixes (no data reset needed)
                if (localStorage.getItem('retirementCalcVersion') !== 'V17.2') {
                    localStorage.setItem('retirementCalcVersion', 'V17.2');
                }

                // Restore input panel collapse state
                restoreInputPanelState();

                // Check for auto-saved data
                checkAutoSave();
            });

            // --- Sidebar Accordion Functions ---
            function initAccordions() {
                // Find all section headers in the sidebar tabs
                document.querySelectorAll('.tab-content .section-header').forEach(header => {
                    // Collect all following siblings until next section-header or end
                    const contentElements = [];
                    let sibling = header.nextElementSibling;

                    while (sibling && !sibling.classList.contains('section-header')) {
                        contentElements.push(sibling);
                        sibling = sibling.nextElementSibling;
                    }

                    // Create accordion-content wrapper
                    if (contentElements.length > 0) {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'accordion-content';

                        // Insert wrapper after header
                        header.after(wrapper);

                        // Move content elements into wrapper
                        contentElements.forEach(el => wrapper.appendChild(el));
                    }
                });
            }

            function toggleAccordion(header) {
                header.classList.toggle('collapsed');
                const content = header.nextElementSibling;
                if (content && content.classList.contains('accordion-content')) {
                    content.classList.toggle('collapsed');
                }
            }

            // --- Dropdown Menu Functions ---
            function toggleDropdown(menuId) {
                const menu = document.getElementById(menuId);
                const wasOpen = menu.classList.contains('show');
                closeAllDropdowns();
                if (!wasOpen) {
                    menu.classList.add('show');
                }
            }

            function closeAllDropdowns() {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.classList.remove('show');
                });
            }

            // --- Currency Auto-Formatting ---
            function initCurrencyFormatting() {
                // Find all dollar input fields (text inputs with inputmode="decimal")
                document.querySelectorAll('input[type="text"][inputmode="decimal"]').forEach(input => {
                    // Real-time formatting as user types
                    input.addEventListener('input', function (e) {
                        formatCurrencyRealtime(this);
                    });

                    // Also format on blur to ensure clean state
                    input.addEventListener('blur', function () {
                        formatCurrencyInput(this);
                    });

                    // Select all on focus for easy replacement
                    input.addEventListener('focus', function () {
                        // Delay slightly to allow click to complete
                        setTimeout(() => this.select(), 0);
                    });

                    // Prevent invalid keystrokes
                    input.addEventListener('keypress', function (e) {
                        const char = String.fromCharCode(e.which);
                        // Allow: digits, period, minus
                        if (!/[0-9.-]/.test(char)) {
                            e.preventDefault();
                        }
                        // Only allow one decimal point
                        if (char === '.' && this.value.includes('.')) {
                            e.preventDefault();
                        }
                        // Only allow minus at start
                        if (char === '-' && this.selectionStart !== 0) {
                            e.preventDefault();
                        }
                    });
                });
            }

            function formatCurrencyRealtime(input) {
                // Get cursor position and value
                let cursorPos = input.selectionStart;
                let oldValue = input.value;

                // Count commas before cursor in old value
                let commasBeforeCursor = (oldValue.substring(0, cursorPos).match(/,/g) || []).length;

                // Strip to raw number (keep minus and decimal)
                let raw = oldValue.replace(/[^0-9.-]/g, '');

                // Handle empty or just minus
                if (raw === '' || raw === '-') {
                    input.value = raw;
                    return;
                }

                // Split by decimal if present
                let parts = raw.split('.');
                let intPart = parts[0];
                let decPart = parts[1];

                // Format integer part with commas
                let isNegative = intPart.startsWith('-');
                if (isNegative) intPart = intPart.substring(1);

                // Add commas
                let formatted = '';
                let digitCount = 0;
                for (let i = intPart.length - 1; i >= 0; i--) {
                    if (digitCount > 0 && digitCount % 3 === 0) {
                        formatted = ',' + formatted;
                    }
                    formatted = intPart[i] + formatted;
                    digitCount++;
                }

                if (isNegative) formatted = '-' + formatted;
                if (decPart !== undefined) formatted += '.' + decPart;

                // Set new value
                input.value = formatted;

                // Calculate new cursor position
                let newCommasBeforeCursor = (formatted.substring(0, cursorPos).match(/,/g) || []).length;
                let commasDiff = newCommasBeforeCursor - commasBeforeCursor;

                // Adjust cursor position based on comma changes
                let newCursorPos = cursorPos + commasDiff;

                // Handle edge cases
                if (newCursorPos < 0) newCursorPos = 0;
                if (newCursorPos > formatted.length) newCursorPos = formatted.length;

                // Set cursor position
                input.setSelectionRange(newCursorPos, newCursorPos);
            }

            function formatCurrencyInput(input) {
                const raw = input.value.replace(/[^0-9.-]/g, '');
                const num = parseFloat(raw);
                if (!isNaN(num) && num !== 0) {
                    input.value = Math.round(num).toLocaleString('en-US');
                } else if (raw === '' || num === 0) {
                    input.value = '';
                }
            }

            // --- Auto-Save to localStorage ---
            const AUTO_SAVE_KEY = 'retirementArchitect_autoSave';
            const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
            let autoSaveTimer = null;
            let autoSaveDebounceTimer = null;

            function startAutoSave() {
                if (autoSaveTimer) clearInterval(autoSaveTimer);
                autoSaveTimer = setInterval(() => {
                    saveToLocalStorage();
                }, AUTO_SAVE_INTERVAL);

                // Save on any input change (debounced) - listen to BOTH 'input' and 'change'
                document.querySelectorAll('input, select').forEach(el => {
                    // 'input' fires on every keystroke (for text inputs)
                    el.addEventListener('input', () => {
                        clearTimeout(autoSaveDebounceTimer);
                        autoSaveDebounceTimer = setTimeout(saveToLocalStorage, 2000);
                    });
                    // 'change' fires on blur for inputs and on selection for selects/checkboxes
                    el.addEventListener('change', () => {
                        clearTimeout(autoSaveDebounceTimer);
                        autoSaveDebounceTimer = setTimeout(saveToLocalStorage, 1000);
                    });
                });

                // Save when user leaves the page
                window.addEventListener('beforeunload', () => {
                    saveToLocalStorage();
                });
            }

            function saveToLocalStorage() {
                try {
                    const data = {
                        version: '9.9',
                        timestamp: new Date().toISOString(),
                        inputs: getAllInputValues()
                    };
                    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data));
                    updateAutoSaveIndicator();
                } catch (e) {
                    console.log('Auto-save failed:', e);
                }
            }

            let _autoSaveRestored = false;

            function checkAutoSave() {
                try {
                    const saved = localStorage.getItem(AUTO_SAVE_KEY);
                    if (saved) {
                        const data = JSON.parse(saved);
                        const timestamp = new Date(data.timestamp);
                        const now = new Date();
                        const hoursSince = (now - timestamp) / (1000 * 60 * 60);

                        // Only prompt if saved within last 7 days and has meaningful data
                        if (hoursSince < 168 && data.inputs && hasRealData(data.inputs)) {
                            const timeAgo = formatTimeAgo(timestamp);
                            if (confirm(`Resume where you left off?\n\nYou have unsaved work from ${timeAgo}.\n\nClick OK to restore, or Cancel to start fresh.`)) {
                                setAllInputValues(data.inputs);
                                _autoSaveRestored = true;
                            } else {
                                localStorage.removeItem(AUTO_SAVE_KEY);
                            }
                        }
                    }
                } catch (e) {
                    console.log('Auto-save check failed:', e);
                }

                // Start auto-saving regardless
                startAutoSave();
            }

            function hasRealData(inputs) {
                // Check if there's any meaningful data worth restoring
                const meaningfulFields = ['currentAge', 'retireAge', 'userPreTaxBalance', 'userRothBalance',
                    'taxableBalance', 'lifestyleSpending', 'currentSalary', 'userSS'];
                return meaningfulFields.some(field => {
                    const val = parseFloat(inputs[field]);
                    return !isNaN(val) && val > 0;
                });
            }

            function formatTimeAgo(date) {
                const now = new Date();
                const diffMs = now - date;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);

                if (diffMins < 1) return 'just now';
                if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
                if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            }

            // --- Data State Management ---
            // (getAllInputValues, setAllInputValues used by save/load and scenario restore)

            function getAllInputValues() {
                const inputs = {};
                // Capture both number and text inputs (text inputs are used for currency formatting)
                document.querySelectorAll('input[type="number"], input[type="text"]').forEach(input => {
                    if (input.id) inputs[input.id] = input.value;
                });
                document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                    inputs[checkbox.id] = checkbox.checked;
                });
                document.querySelectorAll('input[type="radio"]').forEach(radio => {
                    if (radio.checked) {
                        inputs[radio.name] = radio.value;
                    }
                });
                document.querySelectorAll('select').forEach(select => {
                    inputs[select.id] = select.value;
                });
                return inputs;
            }

            function setAllInputValues(inputs) {
                Object.keys(inputs).forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        if (element.type === 'checkbox') {
                            element.checked = inputs[id];
                        } else {
                            element.value = inputs[id];
                        }
                    } else {
                        // Handle radio buttons by name
                        const radios = document.getElementsByName(id);
                        if (radios.length > 0) {
                            radios.forEach(radio => {
                                if (radio.value === inputs[id]) {
                                    radio.checked = true;
                                }
                            });
                        }
                    }
                });

                // Update UI states that depend on checkbox values
                togglePartTimeSettings();
                toggleWindfallSettings();
                toggleRothConversionSettings();
                toggleSpendingReductionSettings();
                toggleGlidePathSettings();
                toggleGuardrailSettings();
                toggleHousingSettings();
                updateFilingStatus();
            }

            // --- Revert to Last Run (v15.6) ---

            function updateRevertButton() {
                const btn = document.getElementById('revertBtn');
                if (btn) btn.disabled = inputSnapshots.length === 0;
            }

            function revertToLastRun() {
                if (inputSnapshots.length === 0) return;
                const snapshot = inputSnapshots.pop();
                setAllInputValues(snapshot);
                updateRevertButton();
            }

            // --- Data Persistence (Save/Load/Clear) ---

            function saveDataFile() {
                const dataToSave = {
                    version: '9.9',
                    exported: new Date().toISOString(),
                    inputs: getAllInputValues()
                };

                const jsonString = JSON.stringify(dataToSave, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;

                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                a.download = `retirement-calc-${timestamp}.json`;

                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }

            function loadDataFile(event) {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function (e) {
                    try {
                        const data = JSON.parse(e.target.result);

                        if (!data.inputs) {
                            alert('Invalid file format. Please select a valid retirement calculator data file.');
                            return;
                        }

                        setAllInputValues(data.inputs);
                        alert('Data loaded successfully!');
                        event.target.value = '';

                    } catch (error) {
                        alert('Error reading file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }

            function clearAllInputs() {
                if (!confirm('Are you sure you want to reset all fields to default values?\n\nThis cannot be undone.')) {
                    return;
                }

                // Reset all number inputs
                document.querySelectorAll('input[type="number"]').forEach(input => {
                    const defaultValue = input.getAttribute('value');
                    if (defaultValue !== null) {
                        input.value = defaultValue;
                    } else {
                        input.value = 0;
                    }
                });

                // Reset all checkboxes to unchecked
                document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = false;
                });

                // Reset radio buttons to first option
                const radioGroups = {};
                document.querySelectorAll('input[type="radio"]').forEach(radio => {
                    if (!radioGroups[radio.name]) {
                        radioGroups[radio.name] = radio;
                        radio.checked = true;
                    }
                });

                // Reset selects to first option
                document.querySelectorAll('select').forEach(select => {
                    select.selectedIndex = 0;
                });

                // Clear any simulation results
                simulationResults = [];
                medianPathData = [];

                // Hide results, show initial message
                document.getElementById('resultsContent').style.display = 'none';
                document.getElementById('initialMessage').style.display = 'flex';

                // Hide improve section
                const improveSection = document.getElementById('improveSection');
                if (improveSection) improveSection.style.display = 'none';

                // Update UI states
                togglePartTimeSettings();
                toggleWindfallSettings();
                toggleRothConversionSettings();
                toggleGlidePathSettings();
                toggleGuardrailSettings();
                toggleHousingSettings();
                updateFilingStatus();

                // Reset KPI values
                document.getElementById('successRateValue').textContent = '--';
                document.getElementById('portfolioRunwayValue').textContent = '--';
                document.getElementById('medianFinalBalanceValue').textContent = '--';
                document.getElementById('totalLifetimeTax').textContent = '--';

                // Clear scenario snapshots
                savedScenarios = [];
                renderScenarioTray();

                // Clear auto-saved data
                try {
                    localStorage.removeItem(AUTO_SAVE_KEY);
                } catch (e) {
                    console.log('Could not clear auto-save:', e);
                }

                alert('All values have been reset to defaults.');
            }

            // ==========================================================================
            // SCENARIO WORKBENCH FUNCTIONS
            // ==========================================================================

            function captureSnapshot() {
                if (simulationResults.length === 0) {
                    alert("Run a simulation first before taking a snapshot.");
                    return;
                }

                // Enforce max 5 scenarios
                if (savedScenarios.length >= 5) {
                    alert("Maximum 5 scenarios saved. Delete one to save a new scenario.");
                    return;
                }

                const defaultName = `Retire @ ${document.getElementById('retireAge').value}, Spend $${Math.round(document.getElementById('lifestyleSpending').value / 1000)}k`;
                const name = prompt("Name this scenario:", defaultName);
                if (!name) return;

                // Calculate wall ages and coverage percent
                const walls = calculateWallAges();
                const currentSpending = params.lifestyleSpending || 0;
                const retirementSpending = sustainableSpendingResult || currentSpending;
                const coveragePercent = currentSpending > 0 ? Math.round((retirementSpending / currentSpending) * 100) : 100;

                const snapshot = {
                    id: Date.now(),
                    name: name,
                    inputs: getAllInputValues(),
                    results: {
                        successRate: simulationStats.successRate,
                        sustainableSpending: sustainableSpendingResult || 0,
                        coveragePercent: coveragePercent,
                        poorWall: walls.poor,
                        averageWall: walls.average,
                        endAge: params.endAge,
                        medianLegacy: simulationStats.medianFinalBalance || 0,
                        lifetimeTax: simulationStats.totalLifetimeTax || 0
                    }
                };

                savedScenarios.push(snapshot);
                persistScenarios();
                updateScenariosView();
            }

            function renderScenarioTray() {
                // Legacy function - now just updates Scenarios view
                renderScenariosGrid();
            }

            function restoreScenario(id) {
                const scenario = savedScenarios.find(s => s.id === id);
                if (!scenario) return;

                if (!confirm('This will replace your current inputs. You can use "Revert to Last Run" to undo.')) return;

                // Snapshot current state for revert
                inputSnapshots.push(getAllInputValues());
                if (inputSnapshots.length > 3) inputSnapshots.shift();
                updateRevertButton();

                setAllInputValues(scenario.inputs);
                initiateSimulation();

                // Highlight active card after re-render
                setTimeout(() => {
                    document.querySelectorAll('.scenario-card-full').forEach(c => c.classList.remove('active'));
                    const cards = document.querySelectorAll('.scenario-card-full');
                    const index = savedScenarios.findIndex(s => s.id === id);
                    if (cards[index]) cards[index].classList.add('active');
                }, 100);
            }

            function deleteScenario(id) {
                savedScenarios = savedScenarios.filter(s => s.id !== id);
                persistScenarios();
                updateScenariosView();
            }

            function persistScenarios() {
                try {
                    localStorage.setItem('retirementArchitect_scenarios', JSON.stringify(savedScenarios));
                } catch (e) {
                    console.log('Could not save scenarios:', e);
                }
            }

            function loadPersistedScenarios() {
                try {
                    const data = localStorage.getItem('retirementArchitect_scenarios');
                    if (data) {
                        savedScenarios = JSON.parse(data);
                        updateScenariosView();
                    }
                } catch (e) {
                    console.log('Could not load scenarios:', e);
                }
            }

            /* ============================================
               SETUP WIZARD LOGIC
            ============================================ */
            let wizCurrentStep = 0;
            let wizMaxStepReached = 0;
            const wizTotalSteps = 11;
            let wizIsCouple = false;

            // Initialize wizard on page load
            document.addEventListener('DOMContentLoaded', () => {
                // Check if we should show wizard (no meaningful data entered yet)
                const hasData = getNumberValue('currentSalary') > 0 ||
                    getNumberValue('userPreTaxBalance') > 0 ||
                    getNumberValue('userRothBalance') > 0 ||
                    getNumberValue('taxableBalance') > 0 ||
                    getNumberValue('lifestyleSpending') > 0 ||
                    getNumberValue('userSS') > 0;

                if (!hasData) {
                    showSetupWizard();
                } else if (_autoSaveRestored) {
                    // Auto-run simulation after restoring saved session
                    setTimeout(() => {
                        initiateSimulation();
                        showAutoSaveToast('Session restored &mdash; running simulation&hellip;');
                    }, 300);
                }

                // Load persisted scenarios (v16.2)
                loadPersistedScenarios();

                // Build progress bar
                buildWizProgressBar();
            });

            function showSetupWizard() {
                // Reset wizard state
                wizCurrentStep = 0;
                wizMaxStepReached = 0;
                wizIsCouple = false;

                // Reset all steps to first (Step 0)
                document.querySelectorAll('.wizard-step').forEach((step, i) => {
                    step.classList.toggle('active', i === 0);
                });

                // Reset toggle UI
                document.getElementById('optSingle').className = 'wiz-option selected';
                document.getElementById('optCouple').className = 'wiz-option';
                document.querySelectorAll('.spouse-only').forEach(el => el.style.display = 'none');

                // Pre-populate wizard with current sidebar values
                populateWizardFromSidebar();

                // Update UI
                updateWizUI();
                buildWizProgressBar();

                // Show wizard
                document.getElementById('setupWizard').style.display = 'flex';

                // Attach scroll listener for fade hints (v16.5)
                const progBar = document.getElementById('wizProgressBar');
                if (progBar && !progBar._fadeListenerAttached) {
                    progBar.addEventListener('scroll', updateWizProgressFades, { passive: true });
                    progBar._fadeListenerAttached = true;
                }
            }

            function closeWizard() {
                document.getElementById('setupWizard').style.display = 'none';
            }

            const wizStepLabels = ['Start', 'Timeline', 'Portfolio', 'Income', 'SS', 'Pension', 'Spending', 'Health', 'Adjust', 'Invest', 'Tax'];

            function buildWizProgressBar() {
                const container = document.getElementById('wizProgressBar');
                container.innerHTML = '';
                for (let i = 0; i < wizTotalSteps; i++) {
                    const step = document.createElement('div');
                    step.className = 'wizard-progress-step';
                    if (i < wizCurrentStep) step.classList.add('complete');
                    else if (i === wizCurrentStep) step.classList.add('current');
                    else if (i <= wizMaxStepReached) step.classList.add('visited');

                    const dot = document.createElement('div');
                    dot.className = 'wiz-dot';
                    step.appendChild(dot);

                    const label = document.createElement('div');
                    label.className = 'wiz-label';
                    label.textContent = wizStepLabels[i] || '';
                    step.appendChild(label);

                    container.appendChild(step);
                }

                // Auto-scroll to active step &amp; update fade hints (v16.5)
                requestAnimationFrame(() => {
                    const currentDot = container.querySelector('.wizard-progress-step.current');
                    if (currentDot) {
                        currentDot.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }
                    updateWizProgressFades();
                });
            }

            function updateWizProgressFades() {
                const scrollEl = document.getElementById('wizProgressBar');
                const wrapper = document.getElementById('wizProgressScroll');
                if (!scrollEl || !wrapper) return;
                const canScrollLeft = scrollEl.scrollLeft > 2;
                const canScrollRight = scrollEl.scrollWidth - scrollEl.clientWidth - scrollEl.scrollLeft > 2;
                wrapper.classList.toggle('fade-left', canScrollLeft);
                wrapper.classList.toggle('fade-right', canScrollRight);
            }

            function setWizardMode(mode) {
                wizIsCouple = (mode === 'couple');

                // UI Updates
                document.getElementById('optSingle').className = wizIsCouple ? 'wiz-option' : 'wiz-option selected';
                document.getElementById('optCouple').className = wizIsCouple ? 'wiz-option selected' : 'wiz-option';

                // Show/Hide Spouse Sections throughout wizard
                document.querySelectorAll('.spouse-only').forEach(el => {
                    el.style.display = wizIsCouple ? '' : 'none';
                });
            }

            function wizNext() {
                if (wizCurrentStep < wizTotalSteps - 1) {
                    document.getElementById(`wizStep${wizCurrentStep}`).classList.remove('active');
                    wizCurrentStep++;
                    if (wizCurrentStep > wizMaxStepReached) wizMaxStepReached = wizCurrentStep;
                    document.getElementById(`wizStep${wizCurrentStep}`).classList.add('active');
                    updateWizUI();
                } else {
                    finishWizard();
                }
            }

            function wizPrev() {
                if (wizCurrentStep > 0) {
                    document.getElementById(`wizStep${wizCurrentStep}`).classList.remove('active');
                    wizCurrentStep--;
                    document.getElementById(`wizStep${wizCurrentStep}`).classList.add('active');
                    updateWizUI();
                }
            }

            function updateWizUI() {
                document.getElementById('wizStepNum').textContent = wizCurrentStep + 1;
                document.getElementById('wizBackBtn').style.visibility = wizCurrentStep === 0 ? 'hidden' : 'visible';

                const nextBtn = document.getElementById('wizNextBtn');
                if (wizCurrentStep === wizTotalSteps - 1) {
                    nextBtn.innerHTML = 'Run Analysis <i class="ph ph-play-circle"></i>';
                    nextBtn.className = 'wiz-btn wiz-btn-finish';
                } else if (wizCurrentStep === 0) {
                    nextBtn.innerHTML = 'Let\'s Get Started <i class="ph ph-arrow-right"></i>';
                    nextBtn.className = 'wiz-btn wiz-btn-next';
                } else {
                    nextBtn.innerHTML = 'Next <i class="ph ph-arrow-right"></i>';
                    nextBtn.className = 'wiz-btn wiz-btn-next';
                }

                buildWizProgressBar();
            }

            function toggleWizOptional(section) {
                const toggle = event.currentTarget;
                const content = document.getElementById(`wiz${section.charAt(0).toUpperCase() + section.slice(1)}Section`);

                toggle.classList.toggle('open');
                content.classList.toggle('open');
            }

            // Feature toggle sections (with enable/disable switch)
            const wizFeatureSections = ['windfall', 'parttime', 'reduction', 'guardrails', 'glidepath', 'rothconv'];

            function toggleWizFeature(section) {
                const capSection = section.charAt(0).toUpperCase() + section.slice(1);
                const checkbox = document.getElementById(`wizEnable${capSection}`);
                const toggleBar = document.getElementById(`wiz${capSection}Toggle`);
                const content = document.getElementById(`wiz${capSection}Section`);

                // If called from the bar click (not the checkbox), toggle the checkbox
                if (event && event.currentTarget !== checkbox && event.currentTarget.tagName !== 'INPUT') {
                    checkbox.checked = !checkbox.checked;
                }

                const isEnabled = checkbox.checked;

                // Update visual state
                if (isEnabled) {
                    toggleBar.classList.add('enabled');
                    content.classList.add('open');
                } else {
                    toggleBar.classList.remove('enabled');
                    content.classList.remove('open');
                }
            }

            function setWizFeatureState(section, enabled) {
                const capSection = section.charAt(0).toUpperCase() + section.slice(1);
                const checkbox = document.getElementById(`wizEnable${capSection}`);
                const toggleBar = document.getElementById(`wiz${capSection}Toggle`);
                const content = document.getElementById(`wiz${capSection}Section`);

                if (!checkbox || !toggleBar || !content) return;

                checkbox.checked = enabled;
                if (enabled) {
                    toggleBar.classList.add('enabled');
                    content.classList.add('open');
                } else {
                    toggleBar.classList.remove('enabled');
                    content.classList.remove('open');
                }
            }

            function toggleWizHousing() {
                const type = document.getElementById('wizHousingType').value;
                document.getElementById('wizHousingOwn').style.display = type === 'own' ? 'grid' : 'none';
                document.getElementById('wizHousingRent').style.display = type === 'rent' ? 'grid' : 'none';
            }

            function populateWizardFromSidebar() {
                // Pre-populate wizard fields from current sidebar values
                // This allows editing existing data via the wizard

                // Step 1: Timeline
                document.getElementById('wizCurrentAge').value = document.getElementById('currentAge').value;
                document.getElementById('wizRetireAge').value = document.getElementById('retireAge').value;
                document.getElementById('wizEndAge').value = document.getElementById('endAge').value;
                document.getElementById('wizSpouseAge').value = document.getElementById('spouseAge').value || 45;
                document.getElementById('wizSpouseRetireAge').value = document.getElementById('spouseRetireAge').value;

                // Check if couple
                if (getNumberValue('spouseAge') > 0) {
                    setWizardMode('couple');
                }

                // Step 2: Assets
                document.getElementById('wizUserPreTax').value = getNumberValue('userPreTaxBalance') || '';
                document.getElementById('wizUserRoth').value = getNumberValue('userRothBalance') || '';
                document.getElementById('wizSpousePreTax').value = getNumberValue('spousePreTaxBalance') || '';
                document.getElementById('wizSpouseRoth').value = getNumberValue('spouseRothBalance') || '';
                document.getElementById('wizTaxable').value = getNumberValue('taxableBalance') || '';
                document.getElementById('wizWindfallAmount').value = getNumberValue('windfallAmount') || '';
                document.getElementById('wizWindfallAge').value = document.getElementById('windfallAge').value;

                // Step 3: Income
                document.getElementById('wizSalary').value = getNumberValue('currentSalary') || '';
                document.getElementById('wizSavingsRate').value = document.getElementById('userSavingsRate').value;
                document.getElementById('wizSavingsDest').value = document.getElementById('userSavingsDest').value;
                document.getElementById('wizSpouseSalary').value = getNumberValue('spouseCurrentSalary') || '';
                document.getElementById('wizSpouseSavingsRate').value = document.getElementById('spouseSavingsRate').value;
                document.getElementById('wizSpouseSavingsDest').value = document.getElementById('spouseSavingsDest').value;

                // Step 4: Social Security
                document.getElementById('wizUserSS').value = getNumberValue('userSS') || '';
                document.getElementById('wizUserSSAge').value = document.getElementById('userClaimAge').value;
                document.getElementById('wizSpouseSS').value = getNumberValue('spouseSS') || '';
                document.getElementById('wizSpouseSSAge').value = document.getElementById('spouseClaimAge').value;
                document.getElementById('wizEnableSpousal').checked = document.getElementById('enableSpousalBenefit').checked;

                // Step 5: Other Income
                document.getElementById('wizPension').value = getNumberValue('pension') || '';
                document.getElementById('wizPensionAge').value = document.getElementById('pensionAge').value;
                document.getElementById('wizSpousePension').value = getNumberValue('spousePension') || '';
                document.getElementById('wizSpousePensionAge').value = document.getElementById('spousePensionAge').value;
                document.getElementById('wizEnablePensionCOLA').checked = document.getElementById('enablePensionCOLA').checked;
                document.getElementById('wizEnableSpousePensionCOLA').checked = document.getElementById('enableSpousePensionCOLA').checked;
                document.getElementById('wizPartTimeIncome').value = getNumberValue('partTimeIncome') || '';
                document.getElementById('wizPartTimeStart').value = document.getElementById('partTimeStartAge').value;
                document.getElementById('wizPartTimeEnd').value = document.getElementById('partTimeEndAge').value;

                // Step 6: Spending
                document.getElementById('wizSpending').value = getNumberValue('lifestyleSpending') || '';
                document.getElementById('wizInflation').value = document.getElementById('lifestyleInflation').value;
                document.getElementById('wizHousingType').value = document.getElementById('housingTypeSelect').value;
                document.getElementById('wizMortgage').value = getNumberValue('mortgagePrincipal') || '';
                document.getElementById('wizMortgageEndAge').value = document.getElementById('mortgageLastAge').value;
                document.getElementById('wizPropertyTax').value = getNumberValue('propertyTax') || '';
                document.getElementById('wizRent').value = getNumberValue('monthlyRent') || '';
                toggleWizHousing();

                // Step 7: Healthcare
                document.getElementById('wizHealthPre65').value = getNumberValue('healthcarePre65') || '';
                document.getElementById('wizHealth65').value = getNumberValue('healthcare65') || '';
                document.getElementById('wizHealthInflation').value = document.getElementById('healthcareInflation').value;

                // Step 8: Spending Adjustments
                document.getElementById('wizReductionAge').value = document.getElementById('spendingReductionAge').value;
                document.getElementById('wizReductionPercent').value = document.getElementById('spendingReductionPercent').value;
                document.getElementById('wizGuardrailCeiling').value = document.getElementById('guardrailCeiling').value;
                document.getElementById('wizGuardrailFloor').value = document.getElementById('guardrailFloor').value;
                document.getElementById('wizGuardrailAdjust').value = document.getElementById('guardrailAdjustment').value;

                // Step 9: Investment
                document.getElementById('wizStockAlloc').value = document.getElementById('stockAllocation').value;
                document.getElementById('wizNumPaths').value = document.getElementById('numPaths').value;
                document.getElementById('wizEndStockAlloc').value = document.getElementById('endingStockAllocation').value;
                document.getElementById('wizRothConvAmount').value = getNumberValue('rothConversionAmount') || '';
                document.getElementById('wizRothConvStart').value = document.getElementById('rothConversionStartAge').value;
                document.getElementById('wizRothConvEnd').value = document.getElementById('rothConversionEndAge').value;
                document.getElementById('wizStockReturn').value = document.getElementById('stockReturn').value;
                document.getElementById('wizStockVol').value = document.getElementById('stockVol').value;
                document.getElementById('wizBondReturn').value = document.getElementById('bondReturn').value;
                document.getElementById('wizBondVol').value = document.getElementById('bondVol').value;

                // Step 10: Tax
                document.getElementById('wizStateTax').value = document.getElementById('stateTaxRate').value;
                document.getElementById('wizBracketGrowth').value = document.getElementById('bracketGrowth').value;
                document.getElementById('wizGainRatio').value = document.getElementById('taxableGainRatio').value;
                document.getElementById('wizEnableTCJA').checked = document.getElementById('enableTCJASunset').checked;

                // Sync feature toggle states from sidebar
                setWizFeatureState('windfall', document.getElementById('enableWindfall').checked);
                setWizFeatureState('parttime', document.getElementById('enablePartTime').checked);
                setWizFeatureState('reduction', document.getElementById('enableSpendingReduction').checked);
                setWizFeatureState('guardrails', document.getElementById('enableGuardrails').checked);
                setWizFeatureState('glidepath', document.getElementById('enableGlidePath').checked);
                setWizFeatureState('rothconv', document.getElementById('enableRothConversion').checked);
            }

            function finishWizard() {
                // Transfer ALL wizard data to main sidebar

                // --- STEP 1: Timeline & Household ---
                document.getElementById('currentAge').value = document.getElementById('wizCurrentAge').value;
                document.getElementById('retireAge').value = document.getElementById('wizRetireAge').value;
                document.getElementById('endAge').value = document.getElementById('wizEndAge').value;

                if (wizIsCouple) {
                    document.getElementById('spouseAge').value = document.getElementById('wizSpouseAge').value;
                    document.getElementById('spouseRetireAge').value = document.getElementById('wizSpouseRetireAge').value;
                } else {
                    document.getElementById('spouseAge').value = 0;
                }

                // --- STEP 2: Assets ---
                document.getElementById('userPreTaxBalance').value = document.getElementById('wizUserPreTax').value || 0;
                document.getElementById('userRothBalance').value = document.getElementById('wizUserRoth').value || 0;
                document.getElementById('spousePreTaxBalance').value = wizIsCouple ? (document.getElementById('wizSpousePreTax').value || 0) : 0;
                document.getElementById('spouseRothBalance').value = wizIsCouple ? (document.getElementById('wizSpouseRoth').value || 0) : 0;
                document.getElementById('taxableBalance').value = document.getElementById('wizTaxable').value || 0;

                // Windfall
                const wizWindfallEnabled = document.getElementById('wizEnableWindfall').checked;
                document.getElementById('enableWindfall').checked = wizWindfallEnabled;
                if (wizWindfallEnabled) {
                    document.getElementById('windfallAmount').value = getNumberValue('wizWindfallAmount') || 0;
                    document.getElementById('windfallAge').value = document.getElementById('wizWindfallAge').value;
                }
                toggleWindfallSettings();

                // --- STEP 3: Income & Savings ---
                document.getElementById('currentSalary').value = document.getElementById('wizSalary').value || 0;
                document.getElementById('userSavingsRate').value = document.getElementById('wizSavingsRate').value;
                document.getElementById('userSavingsDest').value = document.getElementById('wizSavingsDest').value;

                if (wizIsCouple) {
                    document.getElementById('spouseCurrentSalary').value = document.getElementById('wizSpouseSalary').value || 0;
                    document.getElementById('spouseSavingsRate').value = document.getElementById('wizSpouseSavingsRate').value;
                    document.getElementById('spouseSavingsDest').value = document.getElementById('wizSpouseSavingsDest').value;
                } else {
                    document.getElementById('spouseCurrentSalary').value = 0;
                }

                // --- STEP 4: Social Security ---
                document.getElementById('userSS').value = document.getElementById('wizUserSS').value || 0;
                document.getElementById('userClaimAge').value = document.getElementById('wizUserSSAge').value;

                if (wizIsCouple) {
                    document.getElementById('spouseSS').value = document.getElementById('wizSpouseSS').value || 0;
                    document.getElementById('spouseClaimAge').value = document.getElementById('wizSpouseSSAge').value;
                    document.getElementById('enableSpousalBenefit').checked = document.getElementById('wizEnableSpousal').checked;
                } else {
                    document.getElementById('spouseSS').value = 0;
                    document.getElementById('enableSpousalBenefit').checked = false;
                }

                // --- STEP 5: Other Income ---
                document.getElementById('pension').value = document.getElementById('wizPension').value || 0;
                document.getElementById('pensionAge').value = document.getElementById('wizPensionAge').value;

                if (wizIsCouple) {
                    document.getElementById('spousePension').value = document.getElementById('wizSpousePension').value || 0;
                    document.getElementById('spousePensionAge').value = document.getElementById('wizSpousePensionAge').value;
                } else {
                    document.getElementById('spousePension').value = 0;
                }

                // Pension COLA
                document.getElementById('enablePensionCOLA').checked = document.getElementById('wizEnablePensionCOLA').checked;
                if (wizIsCouple) {
                    document.getElementById('enableSpousePensionCOLA').checked = document.getElementById('wizEnableSpousePensionCOLA').checked;
                } else {
                    document.getElementById('enableSpousePensionCOLA').checked = false;
                }

                // Part-time work
                const wizParttimeEnabled = document.getElementById('wizEnableParttime').checked;
                document.getElementById('enablePartTime').checked = wizParttimeEnabled;
                if (wizParttimeEnabled) {
                    document.getElementById('partTimeIncome').value = getNumberValue('wizPartTimeIncome') || 0;
                    document.getElementById('partTimeStartAge').value = document.getElementById('wizPartTimeStart').value;
                    document.getElementById('partTimeEndAge').value = document.getElementById('wizPartTimeEnd').value;
                }
                togglePartTimeSettings();

                // --- STEP 6: Spending & Housing ---
                document.getElementById('lifestyleSpending').value = document.getElementById('wizSpending').value || 0;
                document.getElementById('lifestyleInflation').value = document.getElementById('wizInflation').value;

                const housingType = document.getElementById('wizHousingType').value;
                document.getElementById('housingTypeSelect').value = housingType;

                if (housingType === 'own') {
                    document.getElementById('mortgagePrincipal').value = document.getElementById('wizMortgage').value || 0;
                    document.getElementById('mortgageLastAge').value = document.getElementById('wizMortgageEndAge').value;
                    document.getElementById('propertyTax').value = document.getElementById('wizPropertyTax').value || 0;
                } else {
                    document.getElementById('monthlyRent').value = document.getElementById('wizRent').value || 0;
                }
                toggleHousingSettings();

                // --- STEP 7: Healthcare ---
                document.getElementById('healthcarePre65').value = document.getElementById('wizHealthPre65').value || 0;
                document.getElementById('healthcare65').value = document.getElementById('wizHealth65').value || 0;
                document.getElementById('healthcareInflation').value = document.getElementById('wizHealthInflation').value;

                // --- STEP 8: Spending Adjustments ---
                const wizReductionEnabled = document.getElementById('wizEnableReduction').checked;
                document.getElementById('enableSpendingReduction').checked = wizReductionEnabled;
                if (wizReductionEnabled) {
                    document.getElementById('spendingReductionAge').value = document.getElementById('wizReductionAge').value;
                    document.getElementById('spendingReductionPercent').value = document.getElementById('wizReductionPercent').value;
                }
                toggleSpendingReductionSettings();

                // Guardrails
                const wizGuardrailsEnabled = document.getElementById('wizEnableGuardrails').checked;
                document.getElementById('enableGuardrails').checked = wizGuardrailsEnabled;
                if (wizGuardrailsEnabled) {
                    document.getElementById('guardrailCeiling').value = document.getElementById('wizGuardrailCeiling').value;
                    document.getElementById('guardrailFloor').value = document.getElementById('wizGuardrailFloor').value;
                    document.getElementById('guardrailAdjustment').value = document.getElementById('wizGuardrailAdjust').value;
                }
                toggleGuardrailSettings();

                // --- STEP 9: Investment Strategy ---
                document.getElementById('stockAllocation').value = document.getElementById('wizStockAlloc').value;
                document.getElementById('numPaths').value = document.getElementById('wizNumPaths').value;

                // Glide Path
                const wizGlidepathEnabled = document.getElementById('wizEnableGlidepath').checked;
                document.getElementById('enableGlidePath').checked = wizGlidepathEnabled;
                if (wizGlidepathEnabled) {
                    document.getElementById('endingStockAllocation').value = document.getElementById('wizEndStockAlloc').value;
                }
                toggleGlidePathSettings();

                // Roth Conversions
                const wizRothconvEnabled = document.getElementById('wizEnableRothconv').checked;
                document.getElementById('enableRothConversion').checked = wizRothconvEnabled;
                if (wizRothconvEnabled) {
                    document.getElementById('rothConversionAmount').value = getNumberValue('wizRothConvAmount') || 0;
                    document.getElementById('rothConversionStartAge').value = document.getElementById('wizRothConvStart').value;
                    document.getElementById('rothConversionEndAge').value = document.getElementById('wizRothConvEnd').value;
                }
                toggleRothConversionSettings();

                // Returns (always apply even if not opened)
                document.getElementById('stockReturn').value = document.getElementById('wizStockReturn').value;
                document.getElementById('stockVol').value = document.getElementById('wizStockVol').value;
                document.getElementById('bondReturn').value = document.getElementById('wizBondReturn').value;
                document.getElementById('bondVol').value = document.getElementById('wizBondVol').value;

                // --- STEP 10: Tax Settings ---
                document.getElementById('stateTaxRate').value = document.getElementById('wizStateTax').value;
                document.getElementById('bracketGrowth').value = document.getElementById('wizBracketGrowth').value;
                document.getElementById('taxableGainRatio').value = document.getElementById('wizGainRatio').value;
                document.getElementById('enableTCJASunset').checked = document.getElementById('wizEnableTCJA').checked;

                // Update filing status based on spouse
                updateFilingStatus();

                // Close wizard with animation
                const wizard = document.getElementById('setupWizard');
                wizard.style.opacity = '0';
                wizard.style.transition = 'opacity 0.3s';

                setTimeout(() => {
                    wizard.style.display = 'none';
                    wizard.style.opacity = '1';

                    // Run simulation automatically
                    initiateSimulation();
                }, 300);
            }

            // ===== V15.5: PHASE 1 UX ENHANCEMENTS =====

            // --- 1.1: Escape Key & Focus Trap ---
            function trapFocus(containerEl) {
                const focusable = containerEl.querySelectorAll(
                    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href]'
                );
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                containerEl._focusTrapHandler = function(e) {
                    if (e.key !== 'Tab') return;
                    if (e.shiftKey) {
                        if (document.activeElement === first) {
                            e.preventDefault();
                            last.focus();
                        }
                    } else {
                        if (document.activeElement === last) {
                            e.preventDefault();
                            first.focus();
                        }
                    }
                };
                containerEl.addEventListener('keydown', containerEl._focusTrapHandler);
                // Focus first element
                first.focus();
            }

            function releaseFocusTrap(containerEl) {
                if (containerEl._focusTrapHandler) {
                    containerEl.removeEventListener('keydown', containerEl._focusTrapHandler);
                    delete containerEl._focusTrapHandler;
                }
            }

            // Store original showSetupWizard/closeWizard for wrapping
            const _origShowSetupWizard = showSetupWizard;
            showSetupWizard = function() {
                _origShowSetupWizard();
                const wizEl = document.getElementById('setupWizard');
                if (wizEl) {
                    const card = wizEl.querySelector('.wizard-card');
                    if (card) trapFocus(card);
                }
            };

            const _origCloseWizard = closeWizard;
            closeWizard = function() {
                const wizEl = document.getElementById('setupWizard');
                if (wizEl) {
                    const card = wizEl.querySelector('.wizard-card');
                    if (card) releaseFocusTrap(card);
                }
                _origCloseWizard();
            };

            // Global Escape key handler
            document.addEventListener('keydown', function(e) {
                if (e.key !== 'Escape') return;

                // Wizard modal
                const wizEl = document.getElementById('setupWizard');
                if (wizEl && wizEl.style.display !== 'none') {
                    closeWizard();
                    return;
                }

                // QR modal (v17.2)
                const qrEl = document.getElementById('qrModal');
                if (qrEl && qrEl.classList.contains('active')) {
                    closeQRModal();
                    return;
                }

                // Solver modal
                const solverEl = document.getElementById('solverModal');
                if (solverEl && solverEl.classList.contains('active')) {
                    closeSolverModal();
                    return;
                }

                // Mobile input panel overlay (v16.1)
                const mobilePanel = document.getElementById('inputPanel');
                if (mobilePanel && mobilePanel.classList.contains('mobile-open')) {
                    closeMobilePanel();
                    return;
                }

                // Help modals
                document.querySelectorAll('.help-modal-overlay.active').forEach(function(m) {
                    m.classList.remove('active');
                });
            });

            // --- 1.3: Clickable Wizard Steps ---
            const _origBuildWizProgressBar = buildWizProgressBar;
            buildWizProgressBar = function() {
                _origBuildWizProgressBar();
                const container = document.getElementById('wizProgressBar');
                if (!container) return;
                const steps = container.querySelectorAll('.wizard-progress-step');
                steps.forEach(function(stepEl, i) {
                    var stepName = wizStepLabels[i] || ('Step ' + (i + 1));
                    if (i !== wizCurrentStep && i <= wizMaxStepReached) {
                        // Visited step (past or ahead) - clickable
                        stepEl.title = 'Jump to ' + stepName;
                        stepEl.setAttribute('role', 'button');
                        stepEl.setAttribute('tabindex', '0');
                        stepEl.style.cursor = 'pointer';
                        stepEl.onclick = function() {
                            document.getElementById('wizStep' + wizCurrentStep).classList.remove('active');
                            wizCurrentStep = i;
                            document.getElementById('wizStep' + wizCurrentStep).classList.add('active');
                            updateWizUI();
                        };
                        stepEl.onkeydown = function(e) {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                stepEl.onclick();
                            }
                        };
                    } else if (i === wizCurrentStep) {
                        stepEl.title = stepName + ' (current)';
                    } else {
                        stepEl.title = stepName;
                    }
                });
            };

