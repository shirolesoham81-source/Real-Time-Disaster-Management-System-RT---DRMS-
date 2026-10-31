const ManagementApp = {
    filters: {
        searchType: 'all',
        searchQuery: '',
        status: 'ALL',
        severity: 'ALL',
        sortBy: 'none'
    },

    init: () => {
        ManagementApp.bindFilterEvents();
    },

    bindFilterEvents: () => {
        const searchTypeSelect = document.getElementById('mgmt-search-type');
        const queryInput = document.getElementById('mgmt-search-query');
        const queryWrap = document.getElementById('mgmt-query-input-wrap');
        const statusWrap = document.getElementById('mgmt-status-filter-wrap');
        const statusSelect = document.getElementById('mgmt-filter-status');
        const severityWrap = document.getElementById('mgmt-severity-filter-wrap');
        const severitySelect = document.getElementById('mgmt-filter-severity');
        const sortSelect = document.getElementById('mgmt-sort-by');
        const resetBtn = document.getElementById('btn-reset-filters');

        const updateVisibility = () => {
            const st = ManagementApp.filters.searchType || 'all';
            if (st === 'status') {
                if (queryWrap) queryWrap.style.display = 'none';
                if (statusWrap) statusWrap.style.display = 'block';
                if (severityWrap) severityWrap.style.display = 'none';
            } else if (st === 'severity') {
                if (queryWrap) queryWrap.style.display = 'none';
                if (statusWrap) statusWrap.style.display = 'none';
                if (severityWrap) severityWrap.style.display = 'block';
            } else {
                if (queryWrap) queryWrap.style.display = 'block';
                if (statusWrap) statusWrap.style.display = 'none';
                if (severityWrap) severityWrap.style.display = 'none';
                if (queryInput) {
                    if (st === 'id') {
                        queryInput.disabled = false;
                        queryInput.placeholder = 'Type Request ID (e.g. DR-1001)...';
                    } else if (st === 'phone') {
                        queryInput.disabled = false;
                        queryInput.placeholder = 'Type Contact Mobile (e.g. 9876543210)...';
                    } else {
                        queryInput.disabled = true;
                        queryInput.placeholder = 'All records selected (select a criterion to search)';
                        queryInput.value = '';
                        ManagementApp.filters.searchQuery = '';
                    }
                }
            }
        };

        if (searchTypeSelect) {
            searchTypeSelect.onchange = (e) => {
                ManagementApp.filters.searchType = e.target.value;
                if (ManagementApp.filters.searchType === 'status') {
                    ManagementApp.filters.searchQuery = statusSelect ? statusSelect.value : 'ALL';
                } else if (ManagementApp.filters.searchType === 'severity') {
                    ManagementApp.filters.searchQuery = severitySelect ? severitySelect.value : 'ALL';
                } else if (ManagementApp.filters.searchType === 'all') {
                    ManagementApp.filters.searchQuery = '';
                } else {
                    ManagementApp.filters.searchQuery = queryInput ? queryInput.value.trim() : '';
                }
                updateVisibility();
                ManagementApp.renderRequests();
            };
        }

        if (queryInput) {
            let debounceTimer = null;
            queryInput.oninput = (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    ManagementApp.filters.searchQuery = e.target.value.trim();
                    ManagementApp.renderRequests();
                }, 200);
            };
        }

        if (statusSelect) {
            statusSelect.onchange = (e) => {
                ManagementApp.filters.status = e.target.value;
                if (ManagementApp.filters.searchType === 'status') {
                    ManagementApp.filters.searchQuery = e.target.value;
                    ManagementApp.renderRequests();
                }
            };
        }

        if (severitySelect) {
            severitySelect.onchange = (e) => {
                ManagementApp.filters.severity = e.target.value;
                if (ManagementApp.filters.searchType === 'severity') {
                    ManagementApp.filters.searchQuery = e.target.value;
                    ManagementApp.renderRequests();
                }
            };
        }

        if (sortSelect) {
            sortSelect.onchange = (e) => {
                ManagementApp.filters.sortBy = e.target.value;
                ManagementApp.renderRequests();
            };
        }

        if (resetBtn) {
            resetBtn.onclick = () => {
                ManagementApp.resetFiltersUI();
            };
        }

        updateVisibility();
    },

    syncFilterInputsUI: () => {
        const searchTypeSelect = document.getElementById('mgmt-search-type');
        const queryInput = document.getElementById('mgmt-search-query');
        const queryWrap = document.getElementById('mgmt-query-input-wrap');
        const statusWrap = document.getElementById('mgmt-status-filter-wrap');
        const statusSelect = document.getElementById('mgmt-filter-status');
        const severityWrap = document.getElementById('mgmt-severity-filter-wrap');
        const severitySelect = document.getElementById('mgmt-filter-severity');
        const sortSelect = document.getElementById('mgmt-sort-by');

        if (searchTypeSelect) searchTypeSelect.value = ManagementApp.filters.searchType || 'all';
        if (queryInput) queryInput.value = ManagementApp.filters.searchQuery || '';
        if (statusSelect) statusSelect.value = ManagementApp.filters.status || 'ALL';
        if (severitySelect) severitySelect.value = ManagementApp.filters.severity || 'ALL';
        if (sortSelect) sortSelect.value = ManagementApp.filters.sortBy || 'none';

        const st = ManagementApp.filters.searchType || 'all';
        if (st === 'status') {
            if (queryWrap) queryWrap.style.display = 'none';
            if (statusWrap) statusWrap.style.display = 'block';
            if (severityWrap) severityWrap.style.display = 'none';
        } else if (st === 'severity') {
            if (queryWrap) queryWrap.style.display = 'none';
            if (statusWrap) statusWrap.style.display = 'none';
            if (severityWrap) severityWrap.style.display = 'block';
        } else {
            if (queryWrap) queryWrap.style.display = 'block';
            if (statusWrap) statusWrap.style.display = 'none';
            if (severityWrap) severityWrap.style.display = 'none';
            if (queryInput) {
                if (st === 'id') {
                    queryInput.disabled = false;
                    queryInput.placeholder = 'Type Request ID (e.g. DR-1001)...';
                } else if (st === 'phone') {
                    queryInput.disabled = false;
                    queryInput.placeholder = 'Type Contact Mobile (e.g. 9876543210)...';
                } else {
                    queryInput.disabled = true;
                    queryInput.placeholder = 'All records selected (select a criterion to search)';
                    queryInput.value = '';
                }
            }
        }
    },

    navigateWithFilter: (viewId, filters = null) => {
        if (filters) {
            if (filters.status && filters.status !== 'ALL') {
                ManagementApp.filters.searchType = 'status';
                ManagementApp.filters.status = filters.status;
                ManagementApp.filters.searchQuery = filters.status;
            } else if (filters.severity && filters.severity !== 'ALL') {
                ManagementApp.filters.searchType = 'severity';
                ManagementApp.filters.severity = filters.severity;
                ManagementApp.filters.searchQuery = filters.severity;
            } else if (filters.search) {
                ManagementApp.filters.searchType = 'id';
                ManagementApp.filters.searchQuery = filters.search;
            } else {
                ManagementApp.filters.searchType = 'all';
                ManagementApp.filters.searchQuery = '';
            }
            ManagementApp.syncFilterInputsUI();
        }
        App.navigate(viewId);
    },

    handleCardKeydown: (event, viewId, filters = null) => {
        if (event.key === 'Enter' || event.key === ' ' || event.keyCode === 13 || event.keyCode === 32) {
            event.preventDefault();
            ManagementApp.navigateWithFilter(viewId, filters);
        }
    },

    resetFiltersUI: () => {
        ManagementApp.filters = {
            searchType: 'all',
            searchQuery: '',
            status: 'ALL',
            severity: 'ALL',
            sortBy: 'none'
        };
        ManagementApp.syncFilterInputsUI();
        const requestsView = document.getElementById('view-management-requests');
        if (requestsView && !requestsView.classList.contains('hidden')) {
            ManagementApp.renderRequests();
        }
    },

    refreshView: async (viewId) => {
        if (viewId === 'management-overview') await ManagementApp.renderOverview();
        if (viewId === 'management-map') {
            if (typeof MapApp !== 'undefined') await MapApp.renderMap();
        }
        if (viewId === 'management-requests') await ManagementApp.renderRequests();
        if (viewId === 'management-critical') await ManagementApp.renderCritical();
        if (viewId === 'management-queue') await ManagementApp.renderPriorityQueue();
        if (viewId === 'management-teams') await ManagementApp.renderTeams();
        if (viewId === 'management-resources') await ManagementApp.renderResources();
    },

    renderOverview: async () => {
        await Promise.all([
            RequestService.sync(),
            TeamService.sync(),
            ResourceService.sync()
        ]);

        const stats = RequestService.getStats();
        const teamStats = TeamService.getStats();
        const resStats = ResourceService.getStats();

        // 1. Total Requests
        const elTotal = document.getElementById('stat-total');
        if (elTotal) elTotal.innerText = stats.total;

        // 2. Pending Requests
        const elPending = document.getElementById('stat-pending');
        if (elPending) elPending.innerText = stats.pending;

        // 3. Critical & High-Priority Requests
        const elCritHigh = document.getElementById('stat-critical-high');
        if (elCritHigh) elCritHigh.innerText = stats.criticalAndHigh;
        const elCrit = document.getElementById('stat-critical');
        if (elCrit) elCrit.innerText = stats.critical;

        // 4. Requests Assigned to Teams
        const elAssigned = document.getElementById('stat-assigned');
        if (elAssigned) elAssigned.innerText = stats.assigned;

        // 5. In Progress & Completed Requests
        const elProgress = document.getElementById('stat-progress');
        if (elProgress) elProgress.innerText = stats.inProgress;
        const elCompleted = document.getElementById('stat-completed');
        if (elCompleted) elCompleted.innerText = stats.completed;

        // 6. Available Rescue Teams
        const elTeams = document.getElementById('stat-teams');
        if (elTeams) elTeams.innerText = `${teamStats.available} / ${teamStats.total}`;

        // 7. Available Resource Stock (Total Units)
        const elResources = document.getElementById('stat-resources');
        if (elResources) elResources.innerText = `${resStats.totalUnits} units`;

        // 8. Compact Overview Map Preview
        if (typeof MapApp !== 'undefined') {
            MapApp.renderOverviewMap();
        }

        // 9. Overview Critical Emergencies List
        const criticalEl = document.getElementById('overview-critical-list');
        if (criticalEl) {
            const allRequests = RequestService.getAll();
            const criticalReqs = allRequests
                .filter(r => (r.severity === 'CRITICAL' || r.severity === 'HIGH') && r.status !== 'COMPLETED' && r.status !== 'CANCELLED')
                .slice(0, 5);

            if (criticalReqs.length === 0) {
                criticalEl.innerHTML = `
                    <div style="text-align:center; padding:28px 16px; color:var(--text-muted);">
                        <i class="fas fa-check-circle text-success fa-2x mb-1" style="font-size:24px;"></i>
                        <p style="margin:0; font-size:13px; font-weight:600; color:var(--primary);">No Unhandled Critical Emergencies</p>
                        <small style="color:var(--text-muted);">All urgent incidents have been triaged or assigned.</small>
                    </div>
                `;
            } else {
                let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
                criticalReqs.forEach(r => {
                    const isCrit = r.severity === 'CRITICAL';
                    html += `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#fff; border:1px solid var(--border); border-left:4px solid ${isCrit ? 'var(--danger)' : 'var(--warning)'}; border-radius:var(--radius-sm); font-size:12.5px;">
                            <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:60%;">
                                <div style="font-weight:700; color:var(--primary);">${r.id} • ${r.name}</div>
                                <div style="color:var(--text-muted); font-size:11.5px; overflow:hidden; text-overflow:ellipsis;"><i class="fas fa-map-marker-alt" style="color:#ef4444;"></i> ${r.location}</div>
                            </div>
                            <div style="display:flex; gap:6px; align-items:center;">
                                <span class="badge ${isCrit ? 'severity-critical' : 'severity-high'}">${r.severity}</span>
                                <button class="btn btn-primary btn-sm" onclick="ManagementApp.updateRequest('${r.id}')" title="Inspect / Assign Team">
                                    <i class="fas fa-tasks"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
                criticalEl.innerHTML = html;
            }
        }

        // 10. Overview Recent Requests Feed
        const recentEl = document.getElementById('overview-recent-list');
        if (recentEl) {
            const recentReqs = RequestService.getAll()
                .slice()
                .sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0))
                .slice(0, 5);

            if (recentReqs.length === 0) {
                recentEl.innerHTML = `
                    <div style="text-align:center; padding:28px 16px; color:var(--text-muted);">
                        <i class="fas fa-inbox text-accent fa-2x mb-1" style="font-size:24px;"></i>
                        <p style="margin:0; font-size:13px; font-weight:600; color:var(--primary);">No Relief Requests</p>
                    </div>
                `;
            } else {
                let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
                recentReqs.forEach(r => {
                    const statusClass = (r.status || 'PENDING').replace(/\s+/g, '-').toLowerCase();
                    html += `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#fff; border:1px solid var(--border); border-radius:var(--radius-sm); font-size:12.5px;">
                            <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:60%;">
                                <div style="font-weight:700; color:var(--primary);">${escapeHtml(r.id)} • ${escapeHtml(r.name)}</div>
                                <div style="color:var(--text-muted); font-size:11.5px; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(r.type)} • ${escapeHtml(r.location)}</div>
                            </div>
                            <div style="display:flex; gap:6px; align-items:center;">
                                <span class="badge status-${statusClass}">${escapeHtml(r.status)}</span>
                                <button class="btn btn-secondary btn-sm" onclick="ManagementApp.updateRequest('${r.id}')" title="Inspect Request">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
                recentEl.innerHTML = html;
            }
        }

        // 11. Overview Rescue Squads Status Summary
        const teamsEl = document.getElementById('overview-teams-list');
        if (teamsEl) {
            const teams = TeamService.getAll();
            if (teams.length === 0) {
                teamsEl.innerHTML = '<div style="text-align:center; padding:24px; color:var(--text-muted);">No rescue teams registered.</div>';
            } else {
                let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
                teams.forEach(t => {
                    let statusBadge = 'badge-success';
                    if (t.status === 'BUSY') statusBadge = 'badge-warning';
                    if (t.status === 'OFFLINE') statusBadge = 'badge-danger';
                    html += `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#fff; border:1px solid var(--border); border-radius:var(--radius-sm); font-size:12.5px;">
                            <div>
                                <span style="font-weight:700; color:var(--primary);">${t.name}</span>
                                <small style="color:var(--text-muted); margin-left:6px;">(${t.specialization})</small>
                                <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;"><i class="fas fa-campground text-accent"></i> ${t.location || 'Central Base'}</div>
                            </div>
                            <div style="display:flex; gap:6px; align-items:center;">
                                <span class="badge ${statusBadge}">${t.status}</span>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
                teamsEl.innerHTML = html;
            }
        }

        // 12. Overview Logistics Stockpile Snapshot
        const resEl = document.getElementById('overview-resources-list');
        if (resEl) {
            const resources = ResourceService.getAll();
            if (resources.length === 0) {
                resEl.innerHTML = '<div style="text-align:center; padding:24px; color:var(--text-muted);">No inventory items recorded.</div>';
            } else {
                let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
                resources.forEach(r => {
                    let statusBadge = 'badge-success';
                    if (r.status === 'LOW') statusBadge = 'badge-warning';
                    if (r.status === 'DEPLETED') statusBadge = 'badge-danger';
                    html += `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#fff; border:1px solid var(--border); border-radius:var(--radius-sm); font-size:12.5px;">
                            <div>
                                <span style="font-weight:700; color:var(--primary);">${r.name}</span>
                                <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">Stock: <b>${r.quantity}</b> units</div>
                            </div>
                            <div style="display:flex; gap:6px; align-items:center;">
                                <span class="badge ${statusBadge}">${r.status}</span>
                                <button class="btn btn-secondary btn-sm" onclick="ManagementApp.updateStock('${r.id}')" title="Update Quantity">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
                resEl.innerHTML = html;
            }
        }
    },

    renderRequests: async () => {
        const tbody = document.getElementById('mgmt-requests-tbody');
        const countEl = document.getElementById('mgmt-filter-count');
        const searchInfoEl = document.getElementById('mgmt-dsa-search-info');
        const sortInfoEl = document.getElementById('mgmt-dsa-sort-info');

        // Query parameters for C++ backend execution
        const params = {
            searchType: ManagementApp.filters.searchType || 'all',
            searchQuery: ManagementApp.filters.searchQuery || '',
            sortBy: ManagementApp.filters.sortBy || 'none'
        };

        let requests = [];
        let totalCount = 0;
        let matchCount = 0;
        let searchAlgo = 'Sequential Linked List Traversal';
        let searchComp = 'O(n) time';
        let sortAlgo = 'None (Original Order)';
        let sortComp = 'O(1)';

        try {
            // Call C++ backend via Node bridge - ALL search and sort executed natively in C++11
            const res = await ApiBridge.getRequests(params);
            if (res.ok && res.data && res.data.success) {
                requests = Array.isArray(res.data.data) ? res.data.data : [];
                matchCount = typeof res.data.count === 'number' ? res.data.count : requests.length;
                totalCount = typeof res.data.total === 'number' ? res.data.total : requests.length;
                if (res.data.searchAlgorithm) searchAlgo = res.data.searchAlgorithm;
                if (res.data.searchComplexity) searchComp = res.data.searchComplexity;
                if (res.data.sortAlgorithm) sortAlgo = res.data.sortAlgorithm;
                if (res.data.sortComplexity) sortComp = res.data.sortComplexity;
            } else {
                console.error('[ManagementApp] Failed to fetch searched/sorted requests from C++ backend:', res);
            }
        } catch (e) {
            console.error('[ManagementApp] Error fetching requests from C++ bridge:', e);
        }

        // Update C++ DSA Execution Indicator labels for viva demonstration
        if (searchInfoEl) {
            searchInfoEl.innerText = `${searchAlgo} [${searchComp}]`;
        }
        if (sortInfoEl) {
            sortInfoEl.innerText = `${sortAlgo} [${sortComp}]`;
        }

        // Update count indicator
        if (countEl) {
            if (params.searchType !== 'all' && params.searchQuery) {
                countEl.innerText = `Showing ${matchCount} of ${totalCount} requests (Filtered)`;
            } else {
                countEl.innerText = `Showing ${matchCount} of ${totalCount} requests`;
            }
        }

        if (!tbody) return;
        tbody.innerHTML = '';

        if (requests.length === 0) {
            let criteriaMsg = '';
            if (params.searchType === 'id') criteriaMsg = ` for ID "${escapeHtml(params.searchQuery)}"`;
            else if (params.searchType === 'phone') criteriaMsg = ` for Mobile "${escapeHtml(params.searchQuery)}"`;
            else if (params.searchType === 'status') criteriaMsg = ` with Status "${escapeHtml(params.searchQuery)}"`;
            else if (params.searchType === 'severity') criteriaMsg = ` with Severity "${escapeHtml(params.searchQuery)}"`;

            tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:30px 20px; color:var(--gray-dark);">
                <i class="fas fa-inbox fa-2x" style="color:var(--gray); margin-bottom:10px; display:block;"></i>
                <div style="font-weight:600; font-size:15px; margin-bottom:5px;">No requests match the selected criteria${criteriaMsg}</div>
                <div style="font-size:13px; color:var(--gray-dark); margin-bottom:12px;">Try adjusting search query or clearing filters. C++ DSA Algorithm: ${escapeHtml(searchAlgo)} (${escapeHtml(searchComp)}).</div>
                <button class="btn btn-secondary btn-sm" onclick="ManagementApp.resetFiltersUI()"><i class="fas fa-undo"></i> Reset Filters</button>
            </td></tr>`;
            return;
        }

        requests.forEach(r => {
            const tr = document.createElement('tr');
            const statusClass = (r.status || 'PENDING').replace(/\s+/g, '-').toLowerCase();
            const severityClass = (r.severity || 'NORMAL').toLowerCase();

            tr.innerHTML = `
                <td><b>${escapeHtml(r.id)}</b></td>
                <td>${escapeHtml(r.name)}</td>
                <td>${escapeHtml(r.location)}</td>
                <td>${escapeHtml(r.type)}</td>
                <td><span class="badge severity-${severityClass}">${escapeHtml(r.severity)}</span></td>
                <td><span class="badge status-${statusClass}">${escapeHtml(r.status)}</span></td>
                <td>${r.team ? `<b>${escapeHtml(r.team)}</b>` : '<span style="color:#bdc3c7;">-</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="ManagementApp.updateRequest('${r.id}')">
                        <i class="fas fa-edit"></i> Manage
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderCritical: async () => {
        await RequestService.sync();
        const requests = RequestService.getAll().filter(r =>
            (r.severity === 'CRITICAL' || r.severity === 'HIGH') &&
            r.status !== 'COMPLETED' && r.status !== 'CANCELLED'
        );
        const container = document.getElementById('critical-requests-container');
        if (!container) return;
        container.innerHTML = '';

        if (requests.length === 0) {
            container.innerHTML = `<div class="alert alert-success" style="padding:15px; border-radius:4px; background:#e8f8f5; border:1px solid #2ecc71;"><i class="fas fa-check-circle"></i> No active critical or high-urgency requests pending.</div>`;
            return;
        }

        requests.forEach(r => {
            const isCritical = r.severity === 'CRITICAL';
            const borderCol = isCritical ? 'var(--danger)' : 'var(--warning)';
            const bgCol = isCritical ? '#fff5f5' : '#fef9e7';

            container.innerHTML += `
                <div class="card critical-card" style="border-left: 5px solid ${borderCol}; background: ${bgCol};">
                    <div style="display:flex; justify-content: space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                            <h3 style="color:${isCritical ? 'var(--danger)' : '#d35400'}; margin:0 0 5px 0;">
                                <i class="fas fa-exclamation-triangle"></i> ${escapeHtml(r.id)} — ${escapeHtml(r.disaster)} (${escapeHtml(r.type)})
                            </h3>
                            <p><b>Citizen:</b> ${escapeHtml(r.name)} (${escapeHtml(r.phone)}) | <b>Location:</b> ${escapeHtml(r.location)} | <b>People Affected:</b> ${r.people}</p>
                            <p><b>Status:</b> <span class="badge status-${r.status.replace(/\s+/g, '-').toLowerCase()}">${escapeHtml(r.status)}</span> | <b>Severity:</b> <span class="badge severity-${r.severity.toLowerCase()}">${escapeHtml(r.severity)}</span></p>
                            <p style="margin-top:5px; font-style:italic;">"${escapeHtml(r.details || 'No additional details')}"</p>
                        </div>
                        <button class="btn ${isCritical ? 'btn-danger' : 'btn-warning'}" onclick="ManagementApp.updateRequest('${r.id}')">
                            <i class="fas fa-shield-alt"></i> Manage / Assign Team
                        </button>
                    </div>
                </div>
            `;
        });
    },

    renderPriorityQueue: async () => {
        await RequestService.sync();
        const pq = RequestService.getPriorityQueue();
        const container = document.getElementById('pq-visual');
        if (!container) return;
        container.innerHTML = '';

        if (pq.length === 0) {
            container.innerHTML = `<p style="padding:15px; color:#7f8c8d;">Priority Queue is currently empty. No pending or triaged requests.</p>`;
            return;
        }

        let html = `<div class="queue-container">`;
        pq.forEach((r, idx) => {
            const sevClass = (r.severity || 'NORMAL').toLowerCase();
            html += `
                <div class="queue-item severity-${sevClass}">
                    <span><b>#${idx + 1}</b> &nbsp; ${escapeHtml(r.id)} (${escapeHtml(r.name)} — ${escapeHtml(r.location)})</span>
                    <span><span class="badge severity-${sevClass}">${escapeHtml(r.severity)}</span> &nbsp; <small style="color:#7f8c8d;">${escapeHtml(r.type)}</small></span>
                </div>
            `;
        });
        html += `</div>`;
        html += `<div style="margin-top:20px; font-weight:bold; color:var(--primary);"><i class="fas fa-arrow-right text-accent"></i> Top of Max-Heap (Highest Priority to Dispatch): <b>${escapeHtml(pq[0].id)}</b> (${escapeHtml(pq[0].severity)} — ${escapeHtml(pq[0].location)})</div>`;
        container.innerHTML = html;
    },

    renderTeams: async () => {
        await TeamService.sync();
        const teams = TeamService.getAll();
        const tbody = document.getElementById('mgmt-teams-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Fetch latest telemetry for all teams from C++ backend
        let locationsMap = {};
        try {
            const locRes = await ApiBridge.getAllTeamLocations();
            if (locRes.ok && locRes.data && Array.isArray(locRes.data.data)) {
                locRes.data.data.forEach(item => {
                    locationsMap[item.teamId] = item;
                });
            }
        } catch (e) {
            console.warn('[ManagementApp] Could not fetch team GPS telemetry:', e);
        }

        teams.forEach(t => {
            let badgeClass = 'badge-success';
            if (t.status === 'BUSY') badgeClass = 'badge-warning';
            if (t.status === 'OFFLINE') badgeClass = 'badge-danger';

            const loc = locationsMap[t.id];
            let telemetryHtml = '<span class="badge" style="background:#6c757d; color:#fff;">NO DATA</span>';

            if (loc) {
                const isSim = !!loc.isSimulated;
                const simTag = isSim ? ' <span class="badge" style="background:#ffc107; color:#212529; font-size:9px;">SIMULATED</span>' : '';
                const timeStr = loc.timestamp > 0 ? new Date(loc.timestamp * 1000).toLocaleTimeString() : '';

                if (loc.freshness === 'LIVE') {
                    telemetryHtml = `
                        <div>
                            <span class="badge" style="background:#28a745; color:#fff;"><i class="fas fa-satellite"></i> LIVE</span>${simTag}
                            <div style="font-family:monospace; font-size:12px; margin-top:3px;">${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}</div>
                            <small style="color:#666;">±${Math.round(loc.accuracy)}m | ${timeStr} (${loc.ageSeconds}s ago)</small>
                        </div>
                    `;
                } else if (loc.freshness === 'STALE') {
                    telemetryHtml = `
                        <div>
                            <span class="badge" style="background:#fd7e14; color:#fff;"><i class="fas fa-exclamation-triangle"></i> STALE</span>${simTag}
                            <div style="font-family:monospace; font-size:12px; margin-top:3px; color:#888;">${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}</div>
                            <small style="color:#d35400;">Last seen: ${timeStr} (${loc.ageSeconds}s ago)</small>
                        </div>
                    `;
                } else if (loc.freshness === 'NOT_SHARING') {
                    telemetryHtml = `
                        <div>
                            <span class="badge" style="background:#6c757d; color:#fff;"><i class="fas fa-pause-circle"></i> NOT SHARING</span>${simTag}
                            ${loc.timestamp > 0 ? `<div style="font-size:11px; color:#888;">Last: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)} (${timeStr})</div>` : ''}
                        </div>
                    `;
                } else {
                    telemetryHtml = `<span class="badge" style="background:#17a2b8; color:#fff;">LOCATION UNAVAILABLE</span>`;
                }
            }

            tbody.innerHTML += `
                <tr>
                    <td><b>${t.id}</b></td>
                    <td>${t.name}</td>
                    <td>${t.specialization}</td>
                    <td><i class="fas fa-campground" style="color:var(--accent);"></i> ${t.location}</td>
                    <td><span class="badge ${badgeClass}">${t.status}</span></td>
                    <td>${t.assignment ? `<span class="badge badge-management">${t.assignment}</span>` : '<span style="color:#7f8c8d;">Idle</span>'}</td>
                    <td>${telemetryHtml}</td>
                </tr>
            `;
        });
    },

    renderResources: async () => {
        await ResourceService.sync();
        const resources = ResourceService.getAll();
        const tbody = document.getElementById('mgmt-resources-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        resources.forEach(r => {
            let badgeClass = 'badge-success';
            if (r.status === 'LOW') badgeClass = 'badge-warning';
            if (r.status === 'DEPLETED') badgeClass = 'badge-danger';

            tbody.innerHTML += `
                <tr>
                    <td><b>${r.name}</b> <small style="color:#7f8c8d;">(${r.id})</small></td>
                    <td><b>${r.quantity}</b> units</td>
                    <td><span class="badge ${badgeClass}">${r.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="ManagementApp.updateStock('${r.id}')">
                            <i class="fas fa-sync-alt"></i> Update Stock
                        </button>
                    </td>
                </tr>
            `;
        });
    },

    updateStock: async (id) => {
        const res = ResourceService.getAll().find(r => r.id === id);
        const currentQty = res ? res.quantity : 0;
        const input = prompt(`Update stock quantity for ${res ? res.name : id} (Current: ${currentQty}):`, currentQty);
        if (input !== null) {
            const qty = parseInt(input.trim(), 10);
            if (isNaN(qty) || qty < 0) {
                App.showToast('Validation Error: Stock quantity must be a non-negative integer (>= 0).', 'warning');
                return;
            }
            const updateRes = await ResourceService.updateQuantity(id, qty);
            await ManagementApp.renderResources();
            await ManagementApp.renderOverview();
            App.showToast(`Stock updated for ${res ? res.name : id} (${qty} units).`, 'success');
        }
    },

    updateRequest: (id) => {
        const r = RequestService.getById(id);
        if (!r) return;
        const teams = TeamService.getAll();

        let teamOptions = `<option value="">-- No Team (Unassigned) --</option>`;
        teams.forEach(t => {
            const isSelected = r.team === t.id;
            const isAvail = t.status === 'AVAILABLE' || isSelected;
            teamOptions += `<option value="${t.id}" ${isSelected ? 'selected' : ''} ${!isAvail ? 'disabled style="color:#bdc3c7;"' : ''}>
                ${t.name} (${t.specialization}) — [${t.status}]
            </option>`;
        });

        const isCritical = (r.severity || '').toUpperCase() === 'CRITICAL';
        const hasInjured = (r.injuredCount && r.injuredCount > 0);
        const hasMedicalNeed = (r.medicalKits && r.medicalKits > 0) || (r.type === 'Medical');
        const hasSuppliesNeed = (r.foodPackets > 0 || r.waterLitres > 0 || r.blankets > 0);

        const resources = ResourceService.getAll();
        const foodRes = resources.find(res => (res.name && res.name.toLowerCase().includes('food')) || res.id === 'R-01');
        const waterRes = resources.find(res => (res.name && res.name.toLowerCase().includes('water')) || res.id === 'R-02');
        const foodStock = foodRes ? foodRes.quantity : null;
        const waterStock = waterRes ? waterRes.quantity : null;

        const foodShortage = (foodStock !== null && (r.foodPackets || 0) > foodStock);
        const waterShortage = (waterStock !== null && (r.waterLitres || 0) > waterStock);

        const modalHtml = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:12px;">
                <div>
                    <h2 style="margin:0; font-size:18px; color:var(--primary);">
                        <i class="fas fa-clipboard-check"></i> Mission Details: ${escapeHtml(r.id)}
                    </h2>
                    <span style="font-size:12px; color:var(--gray-dark);">Real-Time Relief Operations Directive</span>
                </div>
                <div>
                    <span class="badge severity-${(r.severity || 'NORMAL').toLowerCase()}" style="font-size:13px; padding:4px 10px;">
                        ${escapeHtml(r.severity)}
                    </span>
                    <span class="badge status-${(r.status || 'PENDING').replace(/\s+/g, '-').toLowerCase()}" style="font-size:13px; padding:4px 10px; margin-left:4px;">
                        ${escapeHtml(r.status)}
                    </span>
                </div>
            </div>

            <div class="mission-view">
                <!-- 1. Request Information and Severity -->
                <div class="mission-section ${isCritical ? 'urgent-highlight' : ''}">
                    <div class="mission-section-title">
                        <span><i class="fas fa-info-circle text-primary"></i> 1. Request Information</span>
                        ${isCritical ? '<span class="mission-badge-alert"><i class="fas fa-exclamation-triangle"></i> CRITICAL EMERGENCY</span>' : ''}
                    </div>
                    <div class="mission-grid-2">
                        <div><b>Reporting Citizen:</b> ${escapeHtml(r.name)}</div>
                        <div><b>Contact Phone:</b> <a href="tel:${escapeHtml(r.phone)}">${escapeHtml(r.phone)}</a></div>
                        <div><b>Disaster Type:</b> <span class="badge" style="background:#e8f4f8; color:#2980b9;">${escapeHtml(r.disaster)}</span></div>
                        <div><b>Category:</b> <span class="badge" style="background:#f4ecf7; color:#8e44ad;">${escapeHtml(r.type)}</span></div>
                    </div>
                </div>

                <!-- 2. Affected Population -->
                <div class="mission-section ${hasInjured ? 'urgent-highlight' : ''}">
                    <div class="mission-section-title">
                        <span><i class="fas fa-users text-primary"></i> 2. Affected Population</span>
                        ${hasInjured ? `<span class="mission-badge-alert"><i class="fas fa-user-injured"></i> ${r.injuredCount} INJURED REPORTED</span>` : ''}
                    </div>
                    <div class="mission-grid-4">
                        <div class="mission-stat-box">
                            <div class="stat-val">${r.people || 1}</div>
                            <div class="stat-lbl">Total People</div>
                        </div>
                        <div class="mission-stat-box">
                            <div class="stat-val">${r.familiesCount || 0}</div>
                            <div class="stat-lbl">Families</div>
                        </div>
                        <div class="mission-stat-box">
                            <div class="stat-val">${r.childrenCount || 0}</div>
                            <div class="stat-lbl">Children</div>
                        </div>
                        <div class="mission-stat-box ${hasInjured ? 'urgent-val' : ''}">
                            <div class="stat-val">${r.injuredCount || 0}</div>
                            <div class="stat-lbl">Injured</div>
                        </div>
                    </div>
                    ${(r.elderlyCount && r.elderlyCount > 0) ? `
                        <div style="margin-top:8px; font-size:12px; color:var(--gray-dark);">
                            <i class="fas fa-user-clock"></i> Elderly Persons Count: <b>${r.elderlyCount}</b>
                        </div>
                    ` : ''}
                </div>

                <!-- 3. Food and Water Requirements -->
                <div class="mission-section ${(hasSuppliesNeed || foodShortage || waterShortage) ? 'warning-highlight' : ''}">
                    <div class="mission-section-title">
                        <span><i class="fas fa-utensils text-primary"></i> 3. Food & Water Logistics</span>
                        ${(foodShortage || waterShortage) ? '<span class="mission-badge-alert" style="background:#fee2e2; color:#b91c1c;"><i class="fas fa-exclamation-triangle"></i> STOCK SHORTAGE DETECTED</span>' : ((r.foodPackets > 50 || r.waterLitres > 100) ? '<span class="mission-badge-alert" style="background:#fef9e7; color:#d35400;">BULK RATION DISPATCH</span>' : '')}
                    </div>
                    <div class="mission-grid-2">
                        <div class="mission-stat-box ${foodShortage ? 'urgent-val' : ''}">
                            <div class="stat-val" style="color:${foodShortage ? 'var(--danger)' : '#d35400'};">${r.foodPackets || 0}</div>
                            <div class="stat-lbl">Requested Food Packets</div>
                            <div style="font-size:11px; margin-top:5px; color:#4b5563;">
                                Available Warehouse Stock: <b>${foodStock !== null ? foodStock + ' units' : 'N/A'}</b>
                                ${foodShortage ? `<br><span class="badge" style="background:#dc2626; color:#fff; font-size:10px; margin-top:3px;"><i class="fas fa-exclamation-circle"></i> Shortage of ${r.foodPackets - foodStock} units</span>` : ''}
                            </div>
                        </div>
                        <div class="mission-stat-box ${waterShortage ? 'urgent-val' : ''}">
                            <div class="stat-val" style="color:${waterShortage ? 'var(--danger)' : '#2980b9'};">${r.waterLitres || 0} L</div>
                            <div class="stat-lbl">Requested Drinking Water (L)</div>
                            <div style="font-size:11px; margin-top:5px; color:#4b5563;">
                                Available Warehouse Stock: <b>${waterStock !== null ? waterStock + ' L' : 'N/A'}</b>
                                ${waterShortage ? `<br><span class="badge" style="background:#dc2626; color:#fff; font-size:10px; margin-top:3px;"><i class="fas fa-exclamation-circle"></i> Shortage of ${r.waterLitres - waterStock} L</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div style="font-size:11px; color:#6b7280; margin-top:8px; font-style:italic;">
                        <i class="fas fa-info-circle"></i> Note: Warehouse stock is not automatically deducted upon request assignment. Inventory is decremented only upon verified dispatch allocation.
                    </div>
                </div>

                <!-- 4. Medical Supplies and Other Materials -->
                <div class="mission-section ${hasMedicalNeed ? 'urgent-highlight' : ''}">
                    <div class="mission-section-title">
                        <span><i class="fas fa-first-aid text-primary"></i> 4. Medical Supplies & Materials</span>
                        ${(r.medicalKits > 0) ? `<span class="mission-badge-alert"><i class="fas fa-medkit"></i> ${r.medicalKits} KITS URGENT</span>` : ''}
                    </div>
                    <div class="mission-grid-2">
                        <div class="mission-stat-box ${r.medicalKits > 0 ? 'urgent-val' : ''}">
                            <div class="stat-val">${r.medicalKits || 0}</div>
                            <div class="stat-lbl">Medical Kits Requested</div>
                        </div>
                        <div class="mission-stat-box">
                            <div class="stat-val">${r.blankets || 0}</div>
                            <div class="stat-lbl">Blankets Requested</div>
                        </div>
                    </div>
                    ${r.otherSupplies ? `
                        <div style="margin-top:10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; font-size:13px;">
                            <b><i class="fas fa-box-open"></i> Additional Requested Materials:</b> ${escapeHtml(r.otherSupplies)}
                        </div>
                    ` : ''}
                </div>

                <!-- 5. Destination, Landmark and Coordinates -->
                <div class="mission-section">
                    <div class="mission-section-title">
                        <span><i class="fas fa-map-marked-alt text-primary"></i> 5. Destination & Coordinates</span>
                    </div>
                    <div style="font-size:13px; display:flex; flex-direction:column; gap:6px;">
                        <div><b>Location Description:</b> ${escapeHtml(r.location)}</div>
                        <div><b>Area / Landmark:</b> ${r.landmark ? escapeHtml(r.landmark) : '<span style="color:#7f8c8d;">None specified</span>'}</div>
                        <div><b>GPS Coordinates:</b> ${(r.latitude || r.longitude) ? `<code style="background:#edf2f7; padding:2px 6px; border-radius:4px;">${r.latitude}, ${r.longitude}</code>` : '<span style="color:#7f8c8d;">Coordinates not provided</span>'}</div>
                    </div>
                </div>

                <!-- 6. Special Instructions -->
                <div class="mission-section">
                    <div class="mission-section-title">
                        <span><i class="fas fa-directions text-primary"></i> 6. Special Directions & Remarks</span>
                    </div>
                    <div style="font-size:13px; display:flex; flex-direction:column; gap:8px;">
                        ${r.directions ? `
                            <div style="background:#eef6fc; border-left:4px solid #3498db; padding:8px 12px; border-radius:4px;">
                                <b><i class="fas fa-route"></i> Rescue Team Directions:</b> ${escapeHtml(r.directions)}
                            </div>
                        ` : ''}
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:8px 12px;">
                            <b>Situation Remarks:</b> ${escapeHtml(r.details || 'No additional remarks provided.')}
                        </div>
                    </div>
                </div>

                <!-- 7. Current Status and Assigned Team -->
                <div class="mission-section" style="border:2px solid var(--accent); background:#fcfdfe;">
                    <div class="mission-section-title">
                        <span><i class="fas fa-tasks text-primary"></i> 7. Status & Rescue Team Assignment</span>
                    </div>
                    <div class="detail-grid">
                        <div class="form-group">
                            <label style="font-weight:600;">Update Mission Status</label>
                            <select id="update-status" class="form-control">
                                <option value="PENDING" ${r.status==='PENDING'?'selected':''}>PENDING (Awaiting Triage)</option>
                                <option value="TRIAGED" ${r.status==='TRIAGED'?'selected':''}>TRIAGED (Scheduled in Queue)</option>
                                <option value="ASSIGNED" ${r.status==='ASSIGNED'?'selected':''}>ASSIGNED (Team Dispatched)</option>
                                <option value="IN PROGRESS" ${r.status==='IN PROGRESS' || r.status==='IN_PROGRESS'?'selected':''}>IN PROGRESS (Operation Underway)</option>
                                <option value="COMPLETED" ${r.status==='COMPLETED'?'selected':''}>COMPLETED (Resolved)</option>
                                <option value="CANCELLED" ${r.status==='CANCELLED'?'selected':''}>CANCELLED</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label style="font-weight:600;">Assign Rescue Team</label>
                            <select id="assign-team" class="form-control">
                                ${teamOptions}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:10px; margin-top:14px; padding-top:10px; border-top:1px solid #e2e8f0;">
                <button class="btn btn-primary" onclick="ManagementApp.saveRequestUpdate('${r.id}')"><i class="fas fa-save"></i> Save Mission Updates</button>
                <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            </div>
        `;
        App.showModal(modalHtml);
    },

    saveRequestUpdate: async (id) => {
        const r = RequestService.getById(id);
        if (!r) return;

        const newStatus = document.getElementById('update-status').value;
        const newTeamId = document.getElementById('assign-team').value;

        if (ApiBridge.isLive) {
            // 1. Handle Cancellation
            if (newStatus === 'CANCELLED' && r.status !== 'CANCELLED') {
                const cancelRes = await ApiBridge.cancelRequest(id, r.phone);
                if (!cancelRes.ok || !cancelRes.data || !cancelRes.data.success) {
                    App.showToast(`Cancellation: ${(cancelRes.data && cancelRes.data.message) || 'Cancellation failed.'}`, 'warning');
                } else {
                    App.showToast(`Request ${id} cancelled successfully.`, 'info');
                }
            } else {
                // 2. Handle Triage & Assignment
                if (newStatus === 'TRIAGED' && r.status === 'PENDING') {
                    await ApiBridge.triageRequest(id);
                }
                if (newTeamId) {
                    // Auto-triage if still pending to satisfy C++ assignment prerequisites
                    if (r.status === 'PENDING') {
                        await ApiBridge.triageRequest(id);
                    }
                    const assignRes = await ApiBridge.assignTeam(id, newTeamId);
                    if (!assignRes.ok || !assignRes.data || !assignRes.data.success) {
                        App.showToast(`Assignment Warning: ${(assignRes.data && assignRes.data.message) || 'Team assignment rejected by C++ engine.'}`, 'warning');
                    } else {
                        App.showToast(`Team ${newTeamId} assigned to Mission ${id}!`, 'success');
                    }
                }
            }
            await Promise.all([
                RequestService.sync(),
                TeamService.sync(),
                ResourceService.sync()
            ]);
            App.closeModal();
            if (typeof MapApp !== 'undefined') {
                MapApp.refreshData();
            }
        } else {
            // Demo mode fallback
            const prevTeamId = r.team;
            if (prevTeamId && prevTeamId !== newTeamId) {
                TeamService.freeTeam(prevTeamId);
            }
            if (newTeamId) {
                if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
                    TeamService.freeTeam(newTeamId);
                } else {
                    TeamService.assignTeam(newTeamId, id);
                }
            }
            App.closeModal();
            App.showToast(`[Demo Mode] Request ${id} updated to ${newStatus}.`, 'success');
        }

        await ManagementApp.renderRequests();
        await ManagementApp.renderOverview();
        await ManagementApp.renderCritical();
        await ManagementApp.renderTeams();
        await ManagementApp.renderPriorityQueue();
    }
};
