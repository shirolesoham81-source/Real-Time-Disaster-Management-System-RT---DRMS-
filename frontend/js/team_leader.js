// ============================================================================
// RT-DRMS - Phase 2: Team Leader Portal Implementation
// Provides isolated, role-specific mission views and field updates for rescue teams
// ============================================================================

const TeamLeaderApp = {
    currentTeamId: null,
    currentTeamData: null,
    missions: [],
    stats: {
        total: 0,
        inProgress: 0,
        completed: 0,
        critical: 0,
        assigned: 0
    },
    // Phase 3 GPS Tracking State
    locationWatcherId: null,
    isSharingLocation: false,
    isSimulationMode: false,
    lastLocationUpdate: null,
    lastSentTimestamp: 0,
    throttleMs: 5000,
    freshnessTimer: null,

    // Initialize module state and session
    init: async () => {
        const savedTeamId = sessionStorage.getItem('activeTeamLeaderId');
        const savedToken = sessionStorage.getItem('squadToken');
        if (savedTeamId && savedToken) {
            try {
                const check = await ApiBridge.verifyAuth();
                if (check.ok && check.data && check.data.authenticated && check.data.role === 'team-leader' && check.data.teamId === savedTeamId) {
                    TeamLeaderApp.currentTeamId = savedTeamId;
                    await TeamLeaderApp.syncMissions();
                    TeamLeaderApp.updateHeaderBadge();
                    return;
                }
            } catch (e) {}
            // Invalid session
            sessionStorage.removeItem('activeTeamLeaderId');
            sessionStorage.removeItem('squadToken');
            TeamLeaderApp.currentTeamId = null;
        }
    },

    // Update topbar role badge and team indicator
    updateHeaderBadge: () => {
        const badge = document.getElementById('role-badge');
        if (!badge) return;
        if (TeamLeaderApp.currentTeamData) {
            badge.textContent = `TEAM: ${TeamLeaderApp.currentTeamData.name} (${TeamLeaderApp.currentTeamData.id})`;
        } else if (TeamLeaderApp.currentTeamId) {
            badge.textContent = `TEAM LEADER: ${TeamLeaderApp.currentTeamId}`;
        } else {
            badge.textContent = 'TEAM LEADER (UNSELECTED)';
        }
    },

    // Refresh active view within Team Leader portal
    refreshView: async (viewId) => {
        // If no team is selected yet, force navigation to team-select
        if (!TeamLeaderApp.currentTeamId && viewId !== 'team-select') {
            App.navigate('team-select');
            return;
        }

        if (viewId === 'team-select') {
            await TeamLeaderApp.loadTeamSelection();
            return;
        }

        await TeamLeaderApp.syncMissions();
        TeamLeaderApp.updateHeaderBadge();

        switch (viewId) {
            case 'team-overview':
                TeamLeaderApp.renderOverview();
                break;
            case 'team-assigned':
                TeamLeaderApp.renderAssigned();
                break;
            case 'team-inprogress':
                TeamLeaderApp.renderInProgress();
                break;
            case 'team-completed':
                TeamLeaderApp.renderCompleted();
                break;
            case 'team-profile':
                TeamLeaderApp.renderProfile();
                break;
            case 'team-location':
                TeamLeaderApp.renderLocationView();
                break;
            case 'team-map':
                await TeamMissionMap.renderMap();
                break;
            default:
                break;
        }
    },

    // Load available rescue teams for authenticated squad login
    loadTeamSelection: async () => {
        const container = document.getElementById('team-select-grid');
        if (!container) return;

        container.innerHTML = '<div style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p class="mt-1">Loading registered rescue teams...</p></div>';

        let teams = [];
        try {
            const res = await ApiBridge.getTeams();
            if (res.ok && res.data && res.data.success && Array.isArray(res.data.data)) {
                teams = res.data.data;
            }
        } catch (e) {
            console.warn('[TeamLeaderApp] Failed to load teams from C++ API, checking cache:', e);
        }

        if (teams.length === 0) {
            teams = TeamService.getAll();
        }

        if (teams.length === 0) {
            container.innerHTML = `
                <div class="alert alert-warning" style="grid-column:1/-1;">
                    <i class="fas fa-exclamation-circle"></i> No rescue teams found in the database. Please initialize teams from Management portal.
                </div>
            `;
            return;
        }

        let html = '';
        teams.forEach(t => {
            const isCurrent = (t.id === TeamLeaderApp.currentTeamId && sessionStorage.getItem('squadToken'));
            const statusClass = (t.status || 'AVAILABLE').toLowerCase();
            let statusBadge = 'badge-success';
            if (t.status === 'BUSY') statusBadge = 'badge-warning';
            if (t.status === 'OFFLINE') statusBadge = 'badge-danger';

            let specIcon = 'fa-first-aid';
            if (t.specialization === 'Rescue' || t.specialization.includes('Search')) specIcon = 'fa-search-location';
            if (t.specialization === 'Supplies' || t.specialization.includes('Logistics')) specIcon = 'fa-truck-loading';
            if (t.specialization === 'Evacuation') specIcon = 'fa-walking';

            html += `
                <div class="card team-select-card ${isCurrent ? 'active-team-card' : ''}" style="border: 2px solid ${isCurrent ? 'var(--accent)' : '#e2e8f0'}; position:relative;">
                    ${isCurrent ? '<div style="position:absolute; top:12px; right:12px; background:var(--accent); color:white; font-size:11px; padding:2px 8px; border-radius:12px; font-weight:600;"><i class="fas fa-check-circle"></i> Authenticated Session</div>' : ''}
                    <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                        <div style="width:48px; height:48px; border-radius:10px; background:#eef6fc; display:flex; align-items:center; justify-content:center; color:var(--accent); font-size:22px;">
                            <i class="fas ${specIcon}"></i>
                        </div>
                        <div>
                            <h3 style="margin:0; font-size:17px; color:var(--primary);">${escapeHtml(t.name)}</h3>
                            <span class="badge" style="background:#edf2f7; color:#4a5568; font-size:11px;">${escapeHtml(t.id)}</span>
                            <span class="badge ${statusBadge}" style="font-size:11px;">${escapeHtml(t.status)}</span>
                        </div>
                    </div>

                    <div style="font-size:13px; color:#4a5568; margin-bottom:15px; display:flex; flex-direction:column; gap:6px;">
                        <div><i class="fas fa-layer-group" style="width:18px; color:var(--accent);"></i> <b>Specialization:</b> ${escapeHtml(t.specialization)}</div>
                        <div><i class="fas fa-map-marker-alt" style="width:18px; color:#e74c3c;"></i> <b>Base Camp / Location:</b> ${escapeHtml(t.location || 'Central Base')}</div>
                        <div><i class="fas fa-clipboard-list" style="width:18px; color:#3498db;"></i> <b>Current Assignment:</b> ${t.assignment || (t.activeRequestId ? escapeHtml(t.activeRequestId) : '<span style="color:#7f8c8d;">None (Idle)</span>')}</div>
                    </div>

                    ${isCurrent ? `
                        <button class="btn btn-primary" style="width:100%; justify-content:center;" onclick="App.navigate('team-overview')">
                            <i class="fas fa-arrow-right"></i> Continue to Missions
                        </button>
                    ` : `
                        <button class="btn btn-primary" style="width:100%; justify-content:center;" onclick="TeamLeaderApp.promptTeamLeaderLogin('${t.id}', '${escapeHtml(t.name)}')">
                            <i class="fas fa-lock"></i> Authenticate & Enter
                        </button>
                    `}
                </div>
            `;
        });

        container.innerHTML = html;
    },

    // Prompt Team Leader Login Modal with salted authentication
    promptTeamLeaderLogin: (teamId, teamName) => {
        let defaultUser = 'leader_alpha';
        if (teamId === 'T-02') defaultUser = 'leader_bravo';
        else if (teamId === 'T-03') defaultUser = 'leader_charlie';
        else if (teamId === 'T-04') defaultUser = 'leader_delta';

        const modalHtml = `
            <div style="padding:10px;">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
                    <div style="width:40px; height:40px; border-radius:8px; background:#eff6ff; display:flex; align-items:center; justify-content:center; color:var(--accent); font-size:20px;">
                        <i class="fas fa-user-shield"></i>
                    </div>
                    <div>
                        <h2 style="margin:0; font-size:1.25rem;">Team Leader Authentication</h2>
                        <small style="color:var(--text-muted);">${escapeHtml(teamName)} (${escapeHtml(teamId)})</small>
                    </div>
                </div>

                <p style="font-size:13px; color:#475569; margin-bottom:16px;">
                    Enter your squad leader credentials to access assigned tactical missions and location telemetry.
                </p>

                <form id="form-team-leader-login" onsubmit="event.preventDefault(); TeamLeaderApp.handleLoginSubmit('${teamId}');">
                    <div class="form-group mb-2">
                        <label for="team-login-user" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Squad Leader Username:</label>
                        <input type="text" id="team-login-user" class="form-control" value="${defaultUser}" placeholder="e.g. ${defaultUser}" required autocomplete="username">
                    </div>
                    <div class="form-group mb-2">
                        <label for="team-login-pass" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Password:</label>
                        <input type="password" id="team-login-pass" class="form-control" placeholder="Enter password" required autocomplete="current-password">
                    </div>

                    <div id="team-login-error" style="display:none; color:#dc2626; font-size:12px; margin-bottom:12px; background:#fef2f2; padding:8px 10px; border-radius:4px; border:1px solid #fecaca;"></div>

                    <div style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:6px; padding:10px 12px; font-size:12px; color:#475569; margin-bottom:14px;">
                        <i class="fas fa-key text-accent"></i> Use the squad credentials configured by your administrator.
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:8px;">
                        <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary" id="btn-submit-team-login">
                            <i class="fas fa-sign-in-alt"></i> Authenticate & Enter
                        </button>
                    </div>
                </form>
            </div>
        `;

        App.showModal(modalHtml);
        setTimeout(() => {
            const passInput = document.getElementById('team-login-pass');
            if (passInput) passInput.focus();
        }, 100);
    },

    // Process Team Leader Login Submission
    handleLoginSubmit: async (teamId) => {
        const userEl = document.getElementById('team-login-user');
        const passEl = document.getElementById('team-login-pass');
        const errEl = document.getElementById('team-login-error');
        const submitBtn = document.getElementById('btn-submit-team-login');

        const username = userEl ? userEl.value.trim() : '';
        const password = passEl ? passEl.value : '';

        if (!username || !password) {
            if (errEl) {
                errEl.textContent = 'Please enter both username and password.';
                errEl.style.display = 'block';
            }
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
        }

        try {
            const res = await ApiBridge.teamLogin(username, password, teamId);
            if (res.ok && res.data && res.data.success) {
                // If sharing location for a previously selected team, stop it cleanly
                if (TeamLeaderApp.currentTeamId && TeamLeaderApp.currentTeamId !== res.data.teamId) {
                    await TeamLeaderApp.stopLocationSharing(true);
                }

                TeamLeaderApp.currentTeamId = res.data.teamId;
                sessionStorage.setItem('activeTeamLeaderId', res.data.teamId);
                sessionStorage.setItem('squadToken', res.data.squadToken || res.data.token);

                App.closeModal();
                await TeamLeaderApp.syncMissions();
                TeamLeaderApp.updateHeaderBadge();

                const teamName = res.data.teamName || (TeamLeaderApp.currentTeamData ? TeamLeaderApp.currentTeamData.name : teamId);
                App.showToast(`Authenticated successfully as <b>${teamName} (${res.data.teamId})</b>`, 'success');

                App.navigate('team-overview');
            } else {
                if (errEl) {
                    errEl.textContent = (res.data && res.data.message) || 'Invalid team leader username or password.';
                    errEl.style.display = 'block';
                }
            }
        } catch (e) {
            if (errEl) {
                errEl.textContent = 'Network or bridge error during squad authentication.';
                errEl.style.display = 'block';
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Authenticate & Enter';
            }
        }
    },

    // Log out of the current team session and return to team select
    switchTeam: () => {
        TeamLeaderApp.stopLocationSharing(true);
        TeamLeaderApp.currentTeamId = null;
        TeamLeaderApp.currentTeamData = null;
        TeamLeaderApp.missions = [];
        sessionStorage.removeItem('activeTeamLeaderId');
        sessionStorage.removeItem('squadToken');
        TeamLeaderApp.updateHeaderBadge();
        App.showToast('Exited team session. Select a team to continue.', 'info');
        App.navigate('team-select');
    },

    // Synchronize missions strictly assigned to this team via C++ backend
    syncMissions: async () => {
        if (!TeamLeaderApp.currentTeamId) return;

        try {
            const res = await ApiBridge.getTeamMissions(TeamLeaderApp.currentTeamId);
            if (res.ok && res.data && res.data.success) {
                TeamLeaderApp.missions = res.data.missions || res.data.data || [];
                TeamLeaderApp.currentTeamData = res.data.team || null;
                TeamLeaderApp.stats = res.data.stats || {
                    total: TeamLeaderApp.missions.length,
                    inProgress: 0,
                    completed: 0,
                    critical: 0,
                    assigned: 0
                };
                return;
            }
        } catch (e) {
            console.warn('[TeamLeaderApp] Backend sync error, falling back to local dataset:', e);
        }

        // Local fallback if offline
        const allReqs = Storage.get('requests') || [];
        TeamLeaderApp.missions = allReqs.filter(r => r.team === TeamLeaderApp.currentTeamId);

        const allTeams = Storage.get('teams') || [];
        TeamLeaderApp.currentTeamData = allTeams.find(t => t.id === TeamLeaderApp.currentTeamId) || null;

        TeamLeaderApp.stats = {
            total: TeamLeaderApp.missions.length,
            inProgress: TeamLeaderApp.missions.filter(m => m.status === 'IN PROGRESS' || m.status === 'IN_PROGRESS').length,
            completed: TeamLeaderApp.missions.filter(m => m.status === 'COMPLETED').length,
            critical: TeamLeaderApp.missions.filter(m => m.severity === 'CRITICAL').length,
            assigned: TeamLeaderApp.missions.filter(m => m.status === 'ASSIGNED').length
        };
    },

    // Render 1. Overview View
    renderOverview: () => {
        // Update summary cards
        const elAssigned = document.getElementById('tl-stat-assigned');
        const elInProgress = document.getElementById('tl-stat-inprogress');
        const elCompleted = document.getElementById('tl-stat-completed');
        const elCritical = document.getElementById('tl-stat-critical');

        if (elAssigned) elAssigned.innerText = TeamLeaderApp.stats.assigned;
        if (elInProgress) elInProgress.innerText = TeamLeaderApp.stats.inProgress;
        if (elCompleted) elCompleted.innerText = TeamLeaderApp.stats.completed;
        if (elCritical) elCritical.innerText = TeamLeaderApp.stats.critical;

        // Render Active Mission Banner
        const bannerContainer = document.getElementById('team-active-banner');
        if (bannerContainer) {
            const activeMission = TeamLeaderApp.missions.find(m => m.status === 'IN PROGRESS' || m.status === 'IN_PROGRESS');
            const pendingAssigned = TeamLeaderApp.missions.find(m => m.status === 'ASSIGNED');

            if (activeMission) {
                bannerContainer.innerHTML = `
                    <div class="card" style="border-left: 5px solid #9b59b6; background: #faf5fc; padding:18px 22px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                            <div>
                                <span class="badge" style="background:#8e44ad; color:white; font-size:11px; margin-bottom:6px;"><i class="fas fa-spinner fa-spin"></i> ACTIVE FIELD OPERATION UNDERWAY</span>
                                <h3 style="margin:4px 0; color:var(--primary);">
                                    <i class="fas fa-broadcast-tower text-primary"></i> ${escapeHtml(activeMission.id)} — ${escapeHtml(activeMission.disaster)} (${escapeHtml(activeMission.type)})
                                </h3>
                                <p style="margin:2px 0; font-size:13px; color:#4a5568;">
                                    <b>Location:</b> ${escapeHtml(activeMission.location)} &nbsp;|&nbsp;
                                    <b>Affected:</b> ${activeMission.people} people &nbsp;|&nbsp;
                                    <b>Citizen Contact:</b> ${escapeHtml(activeMission.name)} (${escapeHtml(activeMission.phone)})
                                </p>
                            </div>
                            <div style="display:flex; gap:8px;">
                                <button class="btn btn-secondary btn-sm" onclick="TeamLeaderApp.viewMissionDetails('${activeMission.id}')">
                                    <i class="fas fa-eye"></i> View Directives
                                </button>
                                <button class="btn btn-success btn-sm" onclick="TeamLeaderApp.completeMission('${activeMission.id}')">
                                    <i class="fas fa-check-circle"></i> Mark Completed
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            } else if (pendingAssigned) {
                bannerContainer.innerHTML = `
                    <div class="card" style="border-left: 5px solid var(--warning); background: #fef9e7; padding:18px 22px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                            <div>
                                <span class="badge" style="background:#e67e22; color:white; font-size:11px; margin-bottom:6px;"><i class="fas fa-bell"></i> NEW MISSION DISPATCHED AWAITING DEPLOYMENT</span>
                                <h3 style="margin:4px 0; color:var(--primary);">
                                    <i class="fas fa-map-marked-alt text-primary"></i> ${escapeHtml(pendingAssigned.id)} — ${escapeHtml(pendingAssigned.disaster)} (${escapeHtml(pendingAssigned.type)})
                                </h3>
                                <p style="margin:2px 0; font-size:13px; color:#4a5568;">
                                    <b>Location:</b> ${escapeHtml(pendingAssigned.location)} &nbsp;|&nbsp;
                                    <b>Severity:</b> <span class="badge severity-${pendingAssigned.severity.toLowerCase()}">${escapeHtml(pendingAssigned.severity)}</span>
                                </p>
                            </div>
                            <div style="display:flex; gap:8px;">
                                <button class="btn btn-secondary btn-sm" onclick="TeamLeaderApp.viewMissionDetails('${pendingAssigned.id}')">
                                    <i class="fas fa-eye"></i> View Directives
                                </button>
                                <button class="btn btn-warning btn-sm" onclick="TeamLeaderApp.startMission('${pendingAssigned.id}')">
                                    <i class="fas fa-play"></i> Start Mission
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                bannerContainer.innerHTML = `
                    <div class="card" style="border-left: 5px solid var(--success); background: #e8f8f5; padding:16px 20px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <i class="fas fa-check-circle fa-2x" style="color:var(--success);"></i>
                            <div>
                                <h4 style="margin:0; color:#27ae60;">Unit Ready & Standby</h4>
                                <p style="margin:2px 0 0 0; font-size:13px; color:#2c3e50;">No pending or ongoing operations. Your unit is marked AVAILABLE in Central Management.</p>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        // Render Recent Missions in Overview
        const recentContainer = document.getElementById('team-recent-missions-tbody');
        if (recentContainer) {
            recentContainer.innerHTML = '';
            if (TeamLeaderApp.missions.length === 0) {
                recentContainer.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:24px; color:#7f8c8d;"><i class="fas fa-clipboard-check fa-2x mb-1" style="display:block; opacity:0.5;"></i>No missions have been assigned to your unit yet.</td></tr>`;
                return;
            }

            TeamLeaderApp.missions.slice(0, 5).forEach(m => {
                const tr = document.createElement('tr');
                const statusClass = (m.status || 'ASSIGNED').replace(/\s+/g, '-').toLowerCase();
                const severityClass = (m.severity || 'NORMAL').toLowerCase();

                let actionBtn = '';
                if (m.status === 'ASSIGNED') {
                    actionBtn = `<button class="btn btn-sm btn-warning" onclick="TeamLeaderApp.startMission('${m.id}')"><i class="fas fa-play"></i> Start</button>`;
                } else if (m.status === 'IN PROGRESS' || m.status === 'IN_PROGRESS') {
                    actionBtn = `<button class="btn btn-sm btn-success" onclick="TeamLeaderApp.completeMission('${m.id}')"><i class="fas fa-check"></i> Complete</button>`;
                } else {
                    actionBtn = `<span class="badge" style="background:#e2e8f0; color:#718096;"><i class="fas fa-lock"></i> Archived</span>`;
                }

                tr.innerHTML = `
                    <td><b>${escapeHtml(m.id)}</b></td>
                    <td>${escapeHtml(m.name)}</td>
                    <td>${escapeHtml(m.location)}</td>
                    <td><span class="badge severity-${severityClass}">${escapeHtml(m.severity)}</span></td>
                    <td><span class="badge status-${statusClass}">${escapeHtml(m.status)}</span></td>
                    <td>${m.people || 1}</td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-sm btn-secondary" onclick="TeamLeaderApp.viewMissionDetails('${m.id}')" title="Directives"><i class="fas fa-eye"></i></button>
                            <button class="btn btn-sm btn-info" onclick="TeamLeaderApp.viewOnMissionMap('${m.id}')" title="Mission Map"><i class="fas fa-map-marked-alt"></i></button>
                            ${actionBtn}
                        </div>
                    </td>
                `;
                recentContainer.appendChild(tr);
            });
        }
    },

    // Render 2. Assigned Missions View (Awaiting Deployment)
    renderAssigned: () => {
        const container = document.getElementById('team-assigned-container');
        if (!container) return;
        container.innerHTML = '';

        const assignedList = TeamLeaderApp.missions.filter(m => m.status === 'ASSIGNED');
        if (assignedList.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align:center; padding:40px 20px; color:#7f8c8d;">
                    <i class="fas fa-calendar-check fa-3x mb-2" style="color:var(--success); opacity:0.7;"></i>
                    <h3 style="color:var(--primary); margin-bottom:8px;">No Pending Dispatches</h3>
                    <p style="max-width:500px; margin:0 auto; font-size:14px;">All assigned missions for your squad have either been started or completed. New directives dispatched by Central Management will appear here automatically.</p>
                </div>
            `;
            return;
        }

        assignedList.forEach(m => {
            const isCritical = (m.severity === 'CRITICAL');
            const card = document.createElement('div');
            card.className = 'card mission-card';
            card.style.borderLeft = isCritical ? '6px solid var(--danger)' : '6px solid #e67e22';
            card.style.marginBottom = '18px';

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:12px; border-bottom:1px solid #edf2f7; padding-bottom:12px;">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <h3 style="margin:0; font-size:18px; color:var(--primary);">${escapeHtml(m.id)} — ${escapeHtml(m.disaster)}</h3>
                            <span class="badge severity-${m.severity.toLowerCase()}">${escapeHtml(m.severity)}</span>
                            <span class="badge status-assigned">ASSIGNED</span>
                        </div>
                        <span style="font-size:12px; color:#718096;"><i class="fas fa-user"></i> Citizen: <b>${escapeHtml(m.name)}</b> (${escapeHtml(m.phone)})</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-secondary" onclick="TeamLeaderApp.viewMissionDetails('${m.id}')">
                            <i class="fas fa-eye"></i> View Directives
                        </button>
                        <button class="btn btn-info" onclick="TeamLeaderApp.viewOnMissionMap('${m.id}')">
                            <i class="fas fa-map-marked-alt"></i> Mission Map
                        </button>
                        <button class="btn btn-warning" onclick="TeamLeaderApp.startMission('${m.id}')">
                            <i class="fas fa-play"></i> Start Mission
                        </button>
                    </div>
                </div>

                <div class="mission-grid-4 mb-2">
                    <div class="mission-stat-box">
                        <div class="stat-val">${m.people || 1}</div>
                        <div class="stat-lbl">People Affected</div>
                    </div>
                    <div class="mission-stat-box ${(m.injuredCount && m.injuredCount > 0) ? 'urgent-val' : ''}">
                        <div class="stat-val">${m.injuredCount || 0}</div>
                        <div class="stat-lbl">Injured</div>
                    </div>
                    <div class="mission-stat-box">
                        <div class="stat-val">${m.foodPackets || 0}</div>
                        <div class="stat-lbl">Food Packets</div>
                    </div>
                    <div class="mission-stat-box">
                        <div class="stat-val">${m.waterLitres || 0} L</div>
                        <div class="stat-lbl">Drinking Water</div>
                    </div>
                </div>

                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px; font-size:13px; display:flex; flex-direction:column; gap:6px;">
                    <div><i class="fas fa-map-marker-alt" style="color:#e74c3c; width:16px;"></i> <b>Location:</b> ${escapeHtml(m.location)} ${m.landmark ? `(Near: ${escapeHtml(m.landmark)})` : ''}</div>
                    ${m.directions ? `<div><i class="fas fa-route" style="color:#3498db; width:16px;"></i> <b>Route Directions:</b> ${escapeHtml(m.directions)}</div>` : ''}
                    <div><i class="fas fa-comment-alt" style="color:#7f8c8d; width:16px;"></i> <b>Situation Remarks:</b> ${escapeHtml(m.details || 'None provided.')}</div>
                </div>
            `;
            container.appendChild(card);
        });
    },

    // Render 3. In-Progress Missions View (Active Field Operations)
    renderInProgress: () => {
        const container = document.getElementById('team-inprogress-container');
        if (!container) return;
        container.innerHTML = '';

        const inProgressList = TeamLeaderApp.missions.filter(m => m.status === 'IN PROGRESS' || m.status === 'IN_PROGRESS');
        if (inProgressList.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align:center; padding:40px 20px; color:#7f8c8d;">
                    <i class="fas fa-hiking fa-3x mb-2" style="color:#9b59b6; opacity:0.6;"></i>
                    <h3 style="color:var(--primary); margin-bottom:8px;">No Operations In Progress</h3>
                    <p style="max-width:500px; margin:0 auto; font-size:14px;">Your squad is not currently deployed on any active field missions. Deploy by starting an assigned mission from the Assigned Missions tab.</p>
                </div>
            `;
            return;
        }

        inProgressList.forEach(m => {
            const card = document.createElement('div');
            card.className = 'card mission-card';
            card.style.borderLeft = '6px solid #8e44ad';
            card.style.marginBottom = '18px';
            card.style.background = '#fdfbff';

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:12px; border-bottom:1px solid #e9d8fd; padding-bottom:12px;">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <h3 style="margin:0; font-size:18px; color:var(--primary);">${escapeHtml(m.id)} — ${escapeHtml(m.disaster)}</h3>
                            <span class="badge severity-${m.severity.toLowerCase()}">${escapeHtml(m.severity)}</span>
                            <span class="badge status-in-progress"><i class="fas fa-spinner fa-spin"></i> IN PROGRESS</span>
                        </div>
                        <span style="font-size:12px; color:#718096;"><i class="fas fa-user"></i> Citizen: <b>${escapeHtml(m.name)}</b> (${escapeHtml(m.phone)})</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-secondary" onclick="TeamLeaderApp.viewMissionDetails('${m.id}')">
                            <i class="fas fa-eye"></i> View Directives
                        </button>
                        <button class="btn btn-info" onclick="TeamLeaderApp.viewOnMissionMap('${m.id}')">
                            <i class="fas fa-map-marked-alt"></i> Mission Map
                        </button>
                        <button class="btn btn-success" onclick="TeamLeaderApp.completeMission('${m.id}')">
                            <i class="fas fa-check-circle"></i> Mark Completed
                        </button>
                    </div>
                </div>

                <div class="alert alert-info" style="margin-bottom:14px; background:#f3e8ff; border:1px solid #d8b4fe; color:#6b21a8; font-size:13px;">
                    <i class="fas fa-broadcast-tower"></i> <b>Active Field Status:</b> Squad deployed to target zone. Once personnel and citizens are accounted for and supplies are distributed, mark the mission completed.
                </div>

                <div class="mission-grid-4 mb-2">
                    <div class="mission-stat-box">
                        <div class="stat-val">${m.people || 1}</div>
                        <div class="stat-lbl">People Assisted</div>
                    </div>
                    <div class="mission-stat-box ${(m.injuredCount && m.injuredCount > 0) ? 'urgent-val' : ''}">
                        <div class="stat-val">${m.injuredCount || 0}</div>
                        <div class="stat-lbl">Injured Handled</div>
                    </div>
                    <div class="mission-stat-box">
                        <div class="stat-val">${m.foodPackets || 0}</div>
                        <div class="stat-lbl">Food Packets</div>
                    </div>
                    <div class="mission-stat-box">
                        <div class="stat-val">${m.medicalKits || 0}</div>
                        <div class="stat-lbl">Medical Kits</div>
                    </div>
                </div>

                <div style="background:white; border:1px solid #e2e8f0; border-radius:6px; padding:12px; font-size:13px; display:flex; flex-direction:column; gap:6px;">
                    <div><i class="fas fa-map-marker-alt" style="color:#e74c3c; width:16px;"></i> <b>Target Location:</b> ${escapeHtml(m.location)} ${m.landmark ? `(Landmark: ${escapeHtml(m.landmark)})` : ''}</div>
                    ${m.directions ? `<div><i class="fas fa-route" style="color:#3498db; width:16px;"></i> <b>Access Route:</b> ${escapeHtml(m.directions)}</div>` : ''}
                    <div><i class="fas fa-notes-medical" style="color:#27ae60; width:16px;"></i> <b>Relief Requisition:</b> ${escapeHtml(m.details || 'Standard relief package dispatched.')}</div>
                </div>
            `;
            container.appendChild(card);
        });
    },

    // Render 4. Completed Missions View (Archived & Read-Only)
    renderCompleted: () => {
        const container = document.getElementById('team-completed-container');
        if (!container) return;
        container.innerHTML = '';

        const completedList = TeamLeaderApp.missions.filter(m => m.status === 'COMPLETED');
        if (completedList.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align:center; padding:40px 20px; color:#7f8c8d;">
                    <i class="fas fa-clipboard-list fa-3x mb-2" style="color:#bdc3c7;"></i>
                    <h3 style="color:var(--primary); margin-bottom:8px;">No Completed Missions Yet</h3>
                    <p style="max-width:500px; margin:0 auto; font-size:14px;">Missions marked as completed by your unit will be permanently archived and displayed here in read-only audit format.</p>
                </div>
            `;
            return;
        }

        completedList.forEach(m => {
            const card = document.createElement('div');
            card.className = 'card mission-card';
            card.style.borderLeft = '6px solid var(--success)';
            card.style.marginBottom = '16px';
            card.style.opacity = '0.95';

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:10px;">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <h3 style="margin:0; font-size:17px; color:var(--primary);">${escapeHtml(m.id)} — ${escapeHtml(m.disaster)} (${escapeHtml(m.type)})</h3>
                            <span class="badge status-completed"><i class="fas fa-check-circle"></i> COMPLETED</span>
                        </div>
                        <span style="font-size:12px; color:#718096;"><i class="fas fa-user"></i> Citizen: ${escapeHtml(m.name)} | <i class="fas fa-map-marker-alt"></i> ${escapeHtml(m.location)}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="badge" style="background:#e2e8f0; color:#4a5568; font-size:11px;"><i class="fas fa-lock"></i> ARCHIVED & READ-ONLY</span>
                        <button class="btn btn-secondary btn-sm" onclick="TeamLeaderApp.viewMissionDetails('${m.id}')">
                            <i class="fas fa-eye"></i> View Directives
                        </button>
                    </div>
                </div>

                <div style="display:flex; gap:18px; font-size:13px; color:#4a5568; background:#f8fafc; padding:10px 14px; border-radius:6px; flex-wrap:wrap;">
                    <div><b>People Assisted:</b> ${m.people || 1}</div>
                    <div><b>Requested Food Packets:</b> ${m.foodPackets || 0} units</div>
                    <div><b>Requested Water:</b> ${m.waterLitres || 0} L</div>
                    <div><b>Requested Medical Kits:</b> ${m.medicalKits || 0}</div>
                    <div><b>Requested Blankets:</b> ${m.blankets || 0}</div>
                </div>
            `;
            container.appendChild(card);
        });
    },

    // Render 5. Team Profile View
    renderProfile: () => {
        const team = TeamLeaderApp.currentTeamData || {
            id: TeamLeaderApp.currentTeamId,
            name: 'Rescue Squad',
            specialization: 'General',
            location: 'Central',
            status: 'AVAILABLE',
            activeRequestId: ''
        };

        const container = document.getElementById('team-profile-container');
        if (!container) return;

        let statusBadge = 'badge-success';
        if (team.status === 'BUSY') statusBadge = 'badge-warning';
        if (team.status === 'OFFLINE') statusBadge = 'badge-danger';

        container.innerHTML = `
            <div class="dashboard-grid">
                <!-- Unit Overview Card -->
                <div class="card" style="grid-column: span 2;">
                    <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding-bottom:14px; margin-bottom:16px;">
                        <div style="display:flex; align-items:center; gap:14px;">
                            <div style="width:54px; height:54px; border-radius:12px; background:#eef6fc; display:flex; align-items:center; justify-content:center; color:var(--accent); font-size:26px;">
                                <i class="fas fa-users-cog"></i>
                            </div>
                            <div>
                                <h2 style="margin:0; font-size:22px; color:var(--primary);">${team.name}</h2>
                                <span class="badge" style="background:#edf2f7; color:#4a5568; font-size:12px;">ID: ${team.id}</span>
                                <span class="badge ${statusBadge}" style="font-size:12px;">STATUS: ${team.status}</span>
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="TeamLeaderApp.switchTeam()">
                            <i class="fas fa-exchange-alt"></i> Switch Squad
                        </button>
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:20px;">
                        <div style="background:#f8fafc; padding:12px 16px; border-radius:8px; border:1px solid #e2e8f0;">
                            <div style="font-size:11px; text-transform:uppercase; color:#718096; font-weight:600;">Specialization</div>
                            <div style="font-size:16px; font-weight:600; color:var(--primary); margin-top:4px;">${team.specialization}</div>
                        </div>
                        <div style="background:#f8fafc; padding:12px 16px; border-radius:8px; border:1px solid #e2e8f0;">
                            <div style="font-size:11px; text-transform:uppercase; color:#718096; font-weight:600;">Base Station / Staging Area</div>
                            <div style="font-size:16px; font-weight:600; color:var(--primary); margin-top:4px;">${team.location || 'Central Staging Post'}</div>
                        </div>
                        <div style="background:#f8fafc; padding:12px 16px; border-radius:8px; border:1px solid #e2e8f0;">
                            <div style="font-size:11px; text-transform:uppercase; color:#718096; font-weight:600;">Active Assigned Request</div>
                            <div style="font-size:16px; font-weight:600; color:var(--primary); margin-top:4px;">${team.activeRequestId || team.assignment || 'None (Idle)'}</div>
                        </div>
                    </div>

                    <h4 style="margin-bottom:12px; color:var(--primary);"><i class="fas fa-chart-line text-accent"></i> Squad Operational Record</h4>
                    <div class="mission-grid-4">
                        <div class="mission-stat-box">
                            <div class="stat-val">${TeamLeaderApp.stats.total}</div>
                            <div class="stat-lbl">Total Missions Dispatched</div>
                        </div>
                        <div class="mission-stat-box" style="background:#fef9e7;">
                            <div class="stat-val" style="color:#d35400;">${TeamLeaderApp.stats.assigned}</div>
                            <div class="stat-lbl">Pending Deployment</div>
                        </div>
                        <div class="mission-stat-box" style="background:#faf5fc;">
                            <div class="stat-val" style="color:#8e44ad;">${TeamLeaderApp.stats.inProgress}</div>
                            <div class="stat-lbl">In Progress Operations</div>
                        </div>
                        <div class="mission-stat-box" style="background:#e8f8f5;">
                            <div class="stat-val" style="color:#27ae60;">${TeamLeaderApp.stats.completed}</div>
                            <div class="stat-lbl">Resolved & Completed</div>
                        </div>
                    </div>
                </div>

                <!-- Academic / Authentication Architecture Notice -->
                <div class="card">
                    <h3 style="color:var(--primary); margin-bottom:10px;"><i class="fas fa-shield-alt text-primary"></i> Access & Security Architecture</h3>
                    <p style="font-size:13px; color:#4a5568; line-height:1.6; margin-bottom:12px;">
                        <b>Current Mode:</b> Academic Demonstration Portal. Simple team selection allows examiners and students to simulate multi-role operations without requiring password management.
                    </p>
                    <div class="alert alert-info" style="font-size:12px; line-height:1.5; margin-bottom:12px;">
                        <b><i class="fas fa-key"></i> Production Implementation:</b><br>
                        In an enterprise disaster management infrastructure, this screen is replaced by:
                        <ul style="margin:6px 0 0 16px; padding:0;">
                            <li>Cryptographic JWT / OAuth2 bearer token authentication.</li>
                            <li>Role-Based Access Control (RBAC) enforced at the API gateway.</li>
                            <li>TLS/HTTPS mutual client certificates for field communications.</li>
                        </ul>
                    </div>
                    <button class="btn btn-danger" style="width:100%; justify-content:center;" onclick="TeamLeaderApp.switchTeam()">
                        <i class="fas fa-sign-out-alt"></i> Exit Team Session
                    </button>
                </div>
            </div>
        `;
    },

    // Action: Transition Mission from ASSIGNED to IN PROGRESS
    startMission: async (requestId) => {
        if (!confirm(`Deploy squad for Mission ${requestId}?\n\nThis will transition the status to IN PROGRESS and mark your team as BUSY.`)) {
            return;
        }

        try {
            const res = await ApiBridge.updateMissionStatus(TeamLeaderApp.currentTeamId, requestId, 'IN_PROGRESS');
            if (res.ok && res.data && res.data.success) {
                App.showToast(`Mission ${requestId} started! Field status set to IN PROGRESS.`, 'success');
                await TeamLeaderApp.syncMissions();
                TeamLeaderApp.refreshActiveView();
            } else {
                const msg = (res.data && res.data.message) || 'Failed to update mission status.';
                App.showToast(`Error: ${msg}`, 'warning');
            }
        } catch (e) {
            console.error('[TeamLeaderApp] Start mission error:', e);
            App.showToast('Network error updating mission status.', 'danger');
        }
    },

    // Action: Transition Mission from IN PROGRESS to COMPLETED
    completeMission: async (requestId) => {
        if (!confirm(`Mark Mission ${requestId} as COMPLETED?\n\nConfirm that all affected individuals have received relief and your squad is safe. Once completed, this mission becomes archived and read-only.`)) {
            return;
        }

        try {
            const res = await ApiBridge.updateMissionStatus(TeamLeaderApp.currentTeamId, requestId, 'COMPLETED');
            if (res.ok && res.data && res.data.success) {
                App.showToast(`Mission ${requestId} successfully completed and archived!`, 'success');
                await TeamLeaderApp.syncMissions();
                TeamLeaderApp.refreshActiveView();
            } else {
                const msg = (res.data && res.data.message) || 'Failed to complete mission.';
                App.showToast(`Error: ${msg}`, 'warning');
            }
        } catch (e) {
            console.error('[TeamLeaderApp] Complete mission error:', e);
            App.showToast('Network error completing mission.', 'danger');
        }
    },

    // Helper to refresh the currently displayed subview
    refreshActiveView: () => {
        const activeNav = document.querySelector('#sidebar-nav .nav-item.active');
        if (activeNav && activeNav.dataset.target) {
            const viewId = activeNav.dataset.target.replace('view-', '');
            TeamLeaderApp.refreshView(viewId);
        } else {
            TeamLeaderApp.renderOverview();
        }
    },

    // Modal: Comprehensive Mission Directives View (Phase 1 details)
    viewMissionDetails: (requestId) => {
        const m = TeamLeaderApp.missions.find(req => req.id === requestId);
        if (!m) {
            App.showToast('Mission record not found.', 'warning');
            return;
        }

        const isCritical = (m.severity || '').toUpperCase() === 'CRITICAL';
        const hasInjured = (m.injuredCount && m.injuredCount > 0);
        const hasSuppliesNeed = (m.foodPackets > 0 || m.waterLitres > 0 || m.blankets > 0);
        const hasMedicalNeed = (m.medicalKits > 0 || m.type === 'Medical');

        const resources = (typeof ResourceService !== 'undefined') ? ResourceService.getAll() : (Storage.get('resources') || []);
        const foodRes = resources.find(r => r.id === 'R-01' || (r.name && r.name.toLowerCase().includes('food')));
        const waterRes = resources.find(r => r.id === 'R-02' || (r.name && r.name.toLowerCase().includes('water')));
        const foodStock = foodRes ? foodRes.quantity : 0;
        const waterStock = waterRes ? waterRes.quantity : 0;
        const foodShortage = (m.foodPackets > 0 && foodStock < m.foodPackets);
        const waterShortage = (m.waterLitres > 0 && waterStock < m.waterLitres);

        let footerActions = '';
        if (m.status === 'ASSIGNED') {
            footerActions = `
                <button class="btn btn-warning" onclick="App.closeModal(); TeamLeaderApp.startMission('${m.id}')">
                    <i class="fas fa-play"></i> Start Mission Now
                </button>
            `;
        } else if (m.status === 'IN PROGRESS' || m.status === 'IN_PROGRESS') {
            footerActions = `
                <button class="btn btn-success" onclick="App.closeModal(); TeamLeaderApp.completeMission('${m.id}')">
                    <i class="fas fa-check-circle"></i> Mark Mission Completed
                </button>
            `;
        } else if (m.status === 'COMPLETED') {
            footerActions = `
                <span class="badge" style="background:#e2e8f0; color:#4a5568; font-size:12px; padding:6px 12px;">
                    <i class="fas fa-lock"></i> Archived & Read-Only
                </span>
            `;
        }

        const modalHtml = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:12px;">
                <div>
                    <h2 style="margin:0; font-size:18px; color:var(--primary);">
                        <i class="fas fa-clipboard-check text-accent"></i> Field Directives: ${escapeHtml(m.id)}
                    </h2>
                    <span style="font-size:12px; color:var(--gray-dark);">Assigned to Squad: <b>${TeamLeaderApp.currentTeamData ? TeamLeaderApp.currentTeamData.name : TeamLeaderApp.currentTeamId}</b></span>
                </div>
                <div>
                    <span class="badge severity-${(m.severity || 'NORMAL').toLowerCase()}" style="font-size:13px; padding:4px 10px;">
                        ${escapeHtml(m.severity)}
                    </span>
                    <span class="badge status-${(m.status || 'ASSIGNED').replace(/\s+/g, '-').toLowerCase()}" style="font-size:13px; padding:4px 10px; margin-left:4px;">
                        ${escapeHtml(m.status)}
                    </span>
                </div>
            </div>

            <div class="mission-view">
                <!-- 1. Request Information and Severity -->
                <div class="mission-section ${isCritical ? 'urgent-highlight' : ''}">
                    <div class="mission-section-title">
                        <span><i class="fas fa-info-circle text-primary"></i> 1. Request Information</span>
                        ${isCritical ? '<span class="mission-badge-alert"><i class="fas fa-exclamation-triangle"></i> CRITICAL PRIORITY</span>' : ''}
                    </div>
                    <div class="mission-grid-2">
                        <div><b>Reporting Citizen:</b> ${escapeHtml(m.name)}</div>
                        <div><b>Contact Phone:</b> <a href="tel:${escapeHtml(m.phone)}">${escapeHtml(m.phone)}</a></div>
                        <div><b>Disaster Category:</b> <span class="badge" style="background:#e8f4f8; color:#2980b9;">${escapeHtml(m.disaster)}</span></div>
                        <div><b>Operation Type:</b> <span class="badge" style="background:#f4ecf7; color:#8e44ad;">${escapeHtml(m.type)}</span></div>
                    </div>
                </div>

                <!-- 2. Affected Population -->
                <div class="mission-section ${hasInjured ? 'urgent-highlight' : ''}">
                    <div class="mission-section-title">
                        <span><i class="fas fa-users text-primary"></i> 2. Affected Population</span>
                        ${hasInjured ? `<span class="mission-badge-alert"><i class="fas fa-user-injured"></i> ${m.injuredCount} INJURED REPORTED</span>` : ''}
                    </div>
                    <div class="mission-grid-4">
                        <div class="mission-stat-box">
                            <div class="stat-val">${m.people || 1}</div>
                            <div class="stat-lbl">Total People</div>
                        </div>
                        <div class="mission-stat-box">
                            <div class="stat-val">${m.familiesCount || 0}</div>
                            <div class="stat-lbl">Families</div>
                        </div>
                        <div class="mission-stat-box">
                            <div class="stat-val">${m.childrenCount || 0}</div>
                            <div class="stat-lbl">Children</div>
                        </div>
                        <div class="mission-stat-box ${hasInjured ? 'urgent-val' : ''}">
                            <div class="stat-val">${m.injuredCount || 0}</div>
                            <div class="stat-lbl">Injured</div>
                        </div>
                    </div>
                    ${(m.elderlyCount && m.elderlyCount > 0) ? `
                        <div style="margin-top:8px; font-size:12px; color:var(--gray-dark);">
                            <i class="fas fa-user-clock"></i> Elderly Persons Count: <b>${m.elderlyCount}</b>
                        </div>
                    ` : ''}
                </div>

                <!-- 3. Food and Water Requirements -->
                <div class="mission-section ${(hasSuppliesNeed || foodShortage || waterShortage) ? 'warning-highlight' : ''}">
                    <div class="mission-section-title">
                        <span><i class="fas fa-utensils text-primary"></i> 3. Food & Water Logistics</span>
                        ${(foodShortage || waterShortage) ? '<span class="mission-badge-alert" style="background:#fee2e2; color:#b91c1c;"><i class="fas fa-exclamation-triangle"></i> WAREHOUSE SHORTAGE RISK</span>' : ((m.foodPackets > 50 || m.waterLitres > 100) ? '<span class="mission-badge-alert" style="background:#fef9e7; color:#d35400;">BULK RATION DISPATCH</span>' : '')}
                    </div>
                    <div class="mission-grid-2">
                        <div class="mission-stat-box ${foodShortage ? 'urgent-val' : ''}">
                            <div class="stat-val" style="color:${foodShortage ? '#c0392b' : '#d35400'};">${m.foodPackets || 0}</div>
                            <div class="stat-lbl">Requested Food Packets (Units)</div>
                            <div style="font-size:11px; color:#64748b; margin-top:4px;">Available Stock: <b>${foodStock}</b> units ${foodShortage ? '<span style="color:#e74c3c; font-weight:700;">(DEFICIT)</span>' : '<span style="color:#27ae60;">(Sufficient)</span>'}</div>
                        </div>
                        <div class="mission-stat-box ${waterShortage ? 'urgent-val' : ''}">
                            <div class="stat-val" style="color:${waterShortage ? '#c0392b' : '#2980b9'};">${m.waterLitres || 0} L</div>
                            <div class="stat-lbl">Requested Drinking Water (Litres)</div>
                            <div style="font-size:11px; color:#64748b; margin-top:4px;">Available Stock: <b>${waterStock}</b> L ${waterShortage ? '<span style="color:#e74c3c; font-weight:700;">(DEFICIT)</span>' : '<span style="color:#27ae60;">(Sufficient)</span>'}</div>
                        </div>
                    </div>
                    ${(foodShortage || waterShortage) ? `
                        <div class="alert alert-warning" style="margin-top:10px; margin-bottom:0; font-size:12px; padding:8px 12px; border-radius:6px;">
                            <i class="fas fa-exclamation-triangle"></i> <b>Warehouse Shortage Alert:</b> One or more requested relief supplies exceed current central stock reserves. Central Management may need to coordinate emergency supplier replenishment.
                        </div>
                    ` : ''}
                    <div style="font-size:11px; color:#718096; margin-top:6px;">
                        <i class="fas fa-info-circle"></i> <i>Note: Warehouse inventory is tracked at relief centres and is NOT deducted automatically upon mission assignment.</i>
                    </div>
                </div>

                <!-- 4. Medical Supplies and Other Materials -->
                <div class="mission-section ${hasMedicalNeed ? 'urgent-highlight' : ''}">
                    <div class="mission-section-title">
                        <span><i class="fas fa-first-aid text-primary"></i> 4. Medical Supplies & Materials</span>
                        ${(m.medicalKits > 0) ? `<span class="mission-badge-alert"><i class="fas fa-medkit"></i> ${m.medicalKits} KITS URGENT</span>` : ''}
                    </div>
                    <div class="mission-grid-2">
                        <div class="mission-stat-box ${m.medicalKits > 0 ? 'urgent-val' : ''}">
                            <div class="stat-val">${m.medicalKits || 0}</div>
                            <div class="stat-lbl">Medical Kits Required</div>
                        </div>
                        <div class="mission-stat-box">
                            <div class="stat-val">${m.blankets || 0}</div>
                            <div class="stat-lbl">Blankets Required</div>
                        </div>
                    </div>
                    ${m.otherSupplies ? `
                        <div style="margin-top:10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; font-size:13px;">
                            <b><i class="fas fa-box-open"></i> Additional Requested Materials:</b> ${escapeHtml(m.otherSupplies)}
                        </div>
                    ` : ''}
                </div>

                <!-- 5. Destination, Landmark and Coordinates -->
                <div class="mission-section">
                    <div class="mission-section-title">
                        <span><i class="fas fa-map-marked-alt text-primary"></i> 5. Destination & Coordinates</span>
                    </div>
                    <div style="font-size:13px; display:flex; flex-direction:column; gap:6px;">
                        <div><b>Location:</b> ${escapeHtml(m.location)}</div>
                        <div><b>Area / Landmark:</b> ${m.landmark ? escapeHtml(m.landmark) : '<span style="color:#7f8c8d;">None specified</span>'}</div>
                        <div><b>Coordinates:</b> ${(m.latitude || m.longitude) ? `<code style="background:#edf2f7; padding:2px 6px; border-radius:4px;">${m.latitude}, ${m.longitude}</code>` : '<span style="color:#7f8c8d;">Coordinates not recorded</span>'}</div>
                    </div>
                </div>

                <!-- 6. Special Instructions & Route Directions -->
                <div class="mission-section">
                    <div class="mission-section-title">
                        <span><i class="fas fa-directions text-primary"></i> 6. Special Directions & Remarks</span>
                    </div>
                    <div style="font-size:13px; display:flex; flex-direction:column; gap:8px;">
                        ${m.directions ? `
                            <div style="background:#eef6fc; border-left:4px solid #3498db; padding:8px 12px; border-radius:4px;">
                                <b><i class="fas fa-route"></i> Access Route Directions:</b> ${escapeHtml(m.directions)}
                            </div>
                        ` : ''}
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:8px 12px;">
                            <b>Citizen Situation Remarks:</b> ${escapeHtml(m.details || 'No additional remarks provided.')}
                        </div>
                    </div>
                </div>

                <!-- 7. Mission Status & Squad Ownership -->
                <div class="mission-section" style="border:1px solid #cbd5e0; background:#f8fafc;">
                    <div class="mission-section-title">
                        <span><i class="fas fa-shield-alt text-primary"></i> 7. Ownership & Authorization</span>
                    </div>
                    <div style="font-size:13px;">
                        <b>Assigned Squad:</b> ${escapeHtml(m.assignedTeamId || m.team)} (${TeamLeaderApp.currentTeamData ? TeamLeaderApp.currentTeamData.name : 'Your Squad'})<br>
                        <b>Status:</b> <span class="badge status-${(m.status || 'ASSIGNED').replace(/\s+/g, '-').toLowerCase()}">${escapeHtml(m.status)}</span>
                    </div>
                </div>
            </div>

            <div class="modal-actions" style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:10px; border-top:1px solid #e2e8f0;">
                <div>${footerActions}</div>
                <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            </div>
        `;

        App.showModal(modalHtml);
    },

    // ========================================================================
    // PHASE 3: REAL-TIME TEAM GPS LOCATION TRACKING
    // ========================================================================

    // Render the My Location telemetry view
    renderLocationView: async () => {
        if (!TeamLeaderApp.currentTeamId) {
            App.navigate('team-select');
            return;
        }

        const teamName = TeamLeaderApp.currentTeamData ? TeamLeaderApp.currentTeamData.name : TeamLeaderApp.currentTeamId;
        const teamEl = document.getElementById('gps-team-id');
        if (teamEl) teamEl.textContent = `${teamName} (${TeamLeaderApp.currentTeamId})`;

        const missionEl = document.getElementById('gps-mission-id');
        const activeMission = TeamLeaderApp.missions.find(m => m.status === 'IN_PROGRESS' || m.status === 'ASSIGNED');
        if (missionEl) {
            missionEl.textContent = activeMission ? `${activeMission.id} (${activeMission.disaster || 'Disaster'}) - ${activeMission.status}` : 'None (No active mission)';
        }

        // Fetch latest saved location from backend
        try {
            const res = await ApiBridge.getTeamLocation(TeamLeaderApp.currentTeamId);
            if (res.ok && res.data && res.data.success && res.data.data) {
                const loc = res.data.data;
                TeamLeaderApp.lastLocationUpdate = loc;
                TeamLeaderApp.updateLocationUI(loc);
            } else {
                TeamLeaderApp.updateLocationUI(null);
            }
        } catch (e) {
            console.warn('[TeamLeaderApp] Failed to load location from backend:', e);
            TeamLeaderApp.updateLocationUI(TeamLeaderApp.lastLocationUpdate);
        }

        // Start local freshness ticker if not already running
        if (!TeamLeaderApp.freshnessTimer) {
            TeamLeaderApp.freshnessTimer = setInterval(() => {
                if (TeamLeaderApp.lastLocationUpdate) {
                    TeamLeaderApp.updateFreshnessUI(TeamLeaderApp.lastLocationUpdate);
                }
            }, 3000);
        }
    },

    // Update location telemetry display cards
    updateLocationUI: (loc) => {
        const startBtn = document.getElementById('btn-start-location-sharing');
        const stopBtn = document.getElementById('btn-stop-location-sharing');
        const ovStartBtn = document.getElementById('tl-overview-btn-start-gps');
        const ovStopBtn = document.getElementById('tl-overview-btn-stop-gps');
        const ovCoords = document.getElementById('tl-overview-gps-coords');
        const ovBadge = document.getElementById('tl-overview-gps-badge');

        const statusBadge = document.getElementById('gps-status-badge');
        const statusDesc = document.getElementById('gps-status-desc');
        const coordsDisplay = document.getElementById('gps-coords-display');
        const coordsDetail = document.getElementById('gps-lat-lon-detail');
        const accDisplay = document.getElementById('gps-accuracy-display');
        const tsDisplay = document.getElementById('gps-timestamp-display');
        const ageDisplay = document.getElementById('gps-age-display');
        const freshnessTag = document.getElementById('gps-freshness-tag');

        if (TeamLeaderApp.isSharingLocation) {
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-flex';
            if (ovStartBtn) ovStartBtn.style.display = 'none';
            if (ovStopBtn) ovStopBtn.style.display = 'inline-flex';
        } else {
            if (startBtn) startBtn.style.display = 'inline-flex';
            if (stopBtn) stopBtn.style.display = 'none';
            if (ovStartBtn) ovStartBtn.style.display = 'inline-flex';
            if (ovStopBtn) ovStopBtn.style.display = 'none';
        }

        if (!loc || loc.freshness === 'LOCATION_UNAVAILABLE' || (loc.latitude === 0 && loc.longitude === 0)) {
            if (coordsDisplay) coordsDisplay.textContent = '-- , --';
            if (coordsDetail) coordsDetail.textContent = 'Lat: Not acquired | Lon: Not acquired';
            if (ovCoords) ovCoords.textContent = '-- , --';
            if (accDisplay) accDisplay.textContent = '--';
            if (tsDisplay) tsDisplay.textContent = '--';
            if (ageDisplay) ageDisplay.textContent = 'No telemetry received yet';
            if (freshnessTag) freshnessTag.innerHTML = `<span class="badge" style="background:#0284c7; color:#fff;">LOCATION UNAVAILABLE</span>`;

            if (TeamLeaderApp.isSharingLocation) {
                if (statusBadge) statusBadge.innerHTML = `<span class="badge" style="background:#0284c7; color:#fff;"><i class="fas fa-spinner fa-spin"></i> ACQUIRING GPS...</span>`;
                if (ovBadge) ovBadge.innerHTML = `<span class="badge" style="background:#0284c7; color:#fff;"><i class="fas fa-spinner fa-spin"></i> ACQUIRING GPS...</span>`;
                if (statusDesc) statusDesc.textContent = 'Hardware watch active. Waiting for satellite / network coordinate lock...';
            } else {
                if (statusBadge) statusBadge.innerHTML = `<span class="badge" style="background:#64748b; color:#fff;">NOT SHARING</span>`;
                if (ovBadge) ovBadge.innerHTML = `<span class="badge" style="background:#64748b; color:#fff;">NOT SHARING</span>`;
                if (statusDesc) statusDesc.textContent = 'GPS tracking is currently idle. Click Start Sharing to begin.';
            }
            return;
        }

        // Render coordinates
        const isSim = !!loc.isSimulated;
        const simBadge = isSim ? ' <span class="badge" style="background:#f59e0b; color:#1e293b; font-size:10px; vertical-align:middle;">SIMULATED</span>' : '';
        if (coordsDisplay) coordsDisplay.innerHTML = `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}${simBadge}`;
        if (coordsDetail) coordsDetail.textContent = `Lat: ${loc.latitude.toFixed(6)}° | Lon: ${loc.longitude.toFixed(6)}°`;
        if (ovCoords) ovCoords.innerHTML = `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}${isSim ? ' <small style="color:#d97706; font-weight:700;">[SIM]</small>' : ''}`;

        if (accDisplay) accDisplay.innerHTML = `±${Math.round(loc.accuracy)} <small style="font-size:12px; font-weight:normal; color:#64748b;">metres</small>`;

        // Format timestamp
        const dateObj = new Date(loc.timestamp * 1000);
        const timeStr = dateObj.toLocaleTimeString();
        const dateStr = dateObj.toLocaleDateString();
        if (tsDisplay) tsDisplay.textContent = `${timeStr} (${dateStr})`;

        TeamLeaderApp.updateFreshnessUI(loc);
    },

    // Refresh freshness badge and elapsed seconds
    updateFreshnessUI: (loc) => {
        const statusBadge = document.getElementById('gps-status-badge');
        const ovBadge = document.getElementById('tl-overview-gps-badge');
        const statusDesc = document.getElementById('gps-status-desc');
        const ageDisplay = document.getElementById('gps-age-display');
        const freshnessTag = document.getElementById('gps-freshness-tag');
        if (!loc) return;

        const nowSec = Math.floor(Date.now() / 1000);
        const elapsedSec = (nowSec >= loc.timestamp && loc.timestamp > 0) ? (nowSec - loc.timestamp) : 0;

        if (ageDisplay) {
            ageDisplay.textContent = `Updated ${elapsedSec}s ago (Freshness window: 60s)`;
        }

        let currentFreshness = loc.freshness;
        // Dynamically compute freshness if actively sharing
        if (TeamLeaderApp.isSharingLocation) {
            if (elapsedSec <= 60) {
                currentFreshness = 'LIVE';
            } else {
                currentFreshness = 'STALE';
            }
        } else {
            currentFreshness = 'NOT_SHARING';
        }

        let badgeHtml = '';
        let descText = '';

        switch (currentFreshness) {
            case 'LIVE':
                badgeHtml = `<span class="badge" style="background:#16a34a; color:#fff;"><i class="fas fa-satellite"></i> LIVE / RECENT</span>`;
                descText = `Live GPS coordinates active and verified (acquired ${elapsedSec}s ago).`;
                break;
            case 'STALE':
                badgeHtml = `<span class="badge" style="background:#ea580c; color:#fff;"><i class="fas fa-exclamation-triangle"></i> STALE</span>`;
                descText = `Warning: GPS telemetry is older than 60s threshold (${elapsedSec}s old). Satellite signal may be lost.`;
                break;
            case 'NOT_SHARING':
                badgeHtml = `<span class="badge" style="background:#64748b; color:#fff;"><i class="fas fa-pause-circle"></i> NOT SHARING</span>`;
                descText = `Location sharing paused by field squad. Historical coordinates retained (${elapsedSec}s old).`;
                break;
            default:
                badgeHtml = `<span class="badge" style="background:#0284c7; color:#fff;">LOCATION UNAVAILABLE</span>`;
                descText = `No telemetry recorded for this squad yet.`;
                break;
        }

        if (statusBadge) statusBadge.innerHTML = badgeHtml;
        if (ovBadge) ovBadge.innerHTML = badgeHtml;
        if (statusDesc) statusDesc.textContent = descText;
        if (freshnessTag) freshnessTag.innerHTML = badgeHtml;
    },

    // Start location sharing via W3C Geolocation API
    startLocationSharing: async () => {
        if (!TeamLeaderApp.currentTeamId) {
            App.showToast('Please select a rescue team first.', 'danger');
            App.navigate('team-select');
            return;
        }

        const alertContainer = document.getElementById('gps-alert-container');
        if (alertContainer) alertContainer.innerHTML = '';

        if (!navigator.geolocation) {
            const errorMsg = 'Geolocation API is not supported by your browser. Please update your browser or use Simulated Mode for testing.';
            if (alertContainer) {
                alertContainer.innerHTML = `<div class="alert alert-danger mb-2"><i class="fas fa-times-circle"></i> ${errorMsg}</div>`;
            }
            App.showToast(errorMsg, 'danger');
            return;
        }

        TeamLeaderApp.isSharingLocation = true;
        TeamLeaderApp.updateLocationUI(TeamLeaderApp.lastLocationUpdate);

        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        };

        try {
            TeamLeaderApp.locationWatcherId = navigator.geolocation.watchPosition(
                async (position) => {
                    await TeamLeaderApp.handlePositionSuccess(position);
                },
                (error) => {
                    TeamLeaderApp.handlePositionError(error);
                },
                options
            );

            App.showToast('Real-time location sharing started. Watching GPS hardware...', 'success');
        } catch (err) {
            console.error('[TeamLeaderApp] watchPosition invocation failed:', err);
            TeamLeaderApp.handlePositionError({ code: 0, message: err.message });
        }
    },

    // Handle incoming position from Geolocation API
    handlePositionSuccess: async (position) => {
        const coords = position.coords;
        const now = Date.now();

        // Throttle updates (default 5000ms) to prevent network flooding
        if (now - TeamLeaderApp.lastSentTimestamp < TeamLeaderApp.throttleMs) {
            return;
        }
        TeamLeaderApp.lastSentTimestamp = now;

        const lat = coords.latitude;
        const lon = coords.longitude;
        const acc = coords.accuracy || 10;
        const ts = Math.floor(position.timestamp ? (position.timestamp / 1000) : (now / 1000));

        // Coordinate sanity check
        if (lat === 0 && lon === 0) {
            console.warn('[TeamLeaderApp] Discarded uninitialized (0,0) GPS fix.');
            return;
        }

        const activeMission = TeamLeaderApp.missions.find(m => m.status === 'IN_PROGRESS' || m.status === 'ASSIGNED');
        const activeReqId = activeMission ? activeMission.id : '';

        const payload = {
            latitude: lat,
            longitude: lon,
            accuracy: acc,
            timestamp: ts,
            activeRequestId: activeReqId,
            isSimulated: false,
            isSharing: true
        };

        try {
            const res = await ApiBridge.updateTeamLocation(TeamLeaderApp.currentTeamId, payload);
            if (res.ok && res.data && res.data.success) {
                TeamLeaderApp.lastLocationUpdate = res.data.data;
                TeamLeaderApp.updateLocationUI(res.data.data);

                const alertContainer = document.getElementById('gps-alert-container');
                if (alertContainer) alertContainer.innerHTML = '';
            } else {
                console.warn('[TeamLeaderApp] Backend rejected location update:', res.data ? res.data.message : res.status);
            }
        } catch (e) {
            console.error('[TeamLeaderApp] Failed to transmit location update:', e);
        }
    },

    // Handle Geolocation API errors with clear user feedback
    handlePositionError: (error) => {
        let title = 'GPS Error';
        let detail = 'Unable to retrieve location fix.';

        switch (error.code) {
            case 1: // PERMISSION_DENIED
                title = 'GPS Permission Denied';
                detail = 'Location permission was denied. Please allow location access in your browser address bar (site permissions) and click Start Sharing again.';
                break;
            case 2: // POSITION_UNAVAILABLE
                title = 'GPS Position Unavailable';
                detail = 'Location information is unavailable from the device. Ensure GPS is turned on, or switch to Simulated Test Mode.';
                break;
            case 3: // TIMEOUT
                title = 'GPS Request Timed Out';
                detail = 'The request to acquire your location fix timed out. Retrying satellite connection...';
                break;
            default:
                detail = error.message || 'An unknown error occurred while retrieving location.';
                break;
        }

        const alertContainer = document.getElementById('gps-alert-container');
        if (alertContainer) {
            alertContainer.innerHTML = `
                <div class="alert alert-danger mb-2">
                    <i class="fas fa-exclamation-triangle"></i> <strong>${title}:</strong> ${detail}
                </div>
            `;
        }

        const statusBadge = document.getElementById('gps-status-badge');
        if (statusBadge) {
            statusBadge.innerHTML = `<span class="badge" style="background:#dc3545; color:#fff;">PERMISSION / GPS ERROR</span>`;
        }
    },

    // Stop location sharing
    stopLocationSharing: async (silent = false) => {
        if (TeamLeaderApp.locationWatcherId !== null) {
            navigator.geolocation.clearWatch(TeamLeaderApp.locationWatcherId);
            TeamLeaderApp.locationWatcherId = null;
        }

        TeamLeaderApp.isSharingLocation = false;

        if (TeamLeaderApp.currentTeamId) {
            try {
                const res = await ApiBridge.stopTeamLocation(TeamLeaderApp.currentTeamId);
                if (res.ok && res.data && res.data.data) {
                    TeamLeaderApp.lastLocationUpdate = res.data.data;
                }
            } catch (e) {
                console.warn('[TeamLeaderApp] Failed to notify backend of stop-sharing:', e);
            }
        }

        TeamLeaderApp.updateLocationUI(TeamLeaderApp.lastLocationUpdate);

        if (!silent) {
            App.showToast('Location sharing stopped. Squad marked as NOT SHARING (historical data retained).', 'info');
        }
    },

    // Toggle simulated test mode
    toggleSimulationMode: (enabled) => {
        TeamLeaderApp.isSimulationMode = enabled;
        const simPanel = document.getElementById('sim-controls-panel');
        if (simPanel) {
            simPanel.style.display = enabled ? 'block' : 'none';
        }
        if (enabled && TeamLeaderApp.isSharingLocation) {
            App.showToast('Simulated mode enabled. Real GPS watch paused while sending test telemetry.', 'warning');
        }
    },

    // Preset coordinate buttons helper
    setPresetCoordinates: (lat, lon, label) => {
        const latInput = document.getElementById('sim-lat');
        const lonInput = document.getElementById('sim-lon');
        if (latInput) latInput.value = lat;
        if (lonInput) lonInput.value = lon;
        App.showToast(`Loaded preset coordinates for ${label}: (${lat}, ${lon})`, 'info');
    },

    // Transmit simulated coordinates to C++ backend
    transmitSimulatedLocation: async () => {
        if (!TeamLeaderApp.currentTeamId) {
            App.showToast('Please select a rescue team first.', 'danger');
            App.navigate('team-select');
            return;
        }

        const latInput = document.getElementById('sim-lat');
        const lonInput = document.getElementById('sim-lon');
        const accInput = document.getElementById('sim-acc');

        const lat = parseFloat(latInput ? latInput.value : 0);
        const lon = parseFloat(lonInput ? lonInput.value : 0);
        const acc = parseFloat(accInput ? accInput.value : 15);

        if (isNaN(lat) || lat < -90 || lat > 90) {
            App.showToast('Validation Error: Latitude must be between -90 and 90 degrees.', 'danger');
            return;
        }
        if (isNaN(lon) || lon < -180 || lon > 180) {
            App.showToast('Validation Error: Longitude must be between -180 and 180 degrees.', 'danger');
            return;
        }
        if (Math.abs(lat) < 0.000001 && Math.abs(lon) < 0.000001) {
            App.showToast('Validation Error: Coordinates (0,0) rejected. Provide realistic coordinates.', 'danger');
            return;
        }
        if (isNaN(acc) || acc <= 0) {
            App.showToast('Validation Error: Accuracy must be greater than 0 metres.', 'danger');
            return;
        }

        const activeMission = TeamLeaderApp.missions.find(m => m.status === 'IN_PROGRESS' || m.status === 'ASSIGNED');
        const activeReqId = activeMission ? activeMission.id : '';

        const payload = {
            latitude: lat,
            longitude: lon,
            accuracy: acc,
            timestamp: Math.floor(Date.now() / 1000),
            activeRequestId: activeReqId,
            isSimulated: true,
            isSharing: true
        };

        try {
            const res = await ApiBridge.updateTeamLocation(TeamLeaderApp.currentTeamId, payload);
            if (res.ok && res.data && res.data.success) {
                TeamLeaderApp.isSharingLocation = true;
                TeamLeaderApp.lastLocationUpdate = res.data.data;
                TeamLeaderApp.updateLocationUI(res.data.data);
                App.showToast(`Simulated telemetry broadcast successfully for <b>${TeamLeaderApp.currentTeamId}</b>!`, 'warning');
            } else {
                App.showToast(`Backend rejected simulated telemetry: ${res.data ? res.data.message : 'Unknown error'}`, 'danger');
            }
        } catch (e) {
            console.error('[TeamLeaderApp] Failed to send simulated telemetry:', e);
            App.showToast('Communication error sending simulated telemetry.', 'danger');
        }
    },

    // Navigate to Tactical Mission Map and highlight a specific mission target
    viewOnMissionMap: (missionId) => {
        App.navigate('team-map');
        setTimeout(() => {
            if (typeof TeamMissionMap !== 'undefined' && TeamMissionMap.selectMission) {
                TeamMissionMap.selectMission(missionId);
            }
        }, 300);
    }
};
