const PeopleApp = {
    init: () => {
        PeopleApp.bindForms();
    },

    refreshView: async (viewId) => {
        if (viewId === 'people-home') await PeopleApp.renderHome();
        if (viewId === 'people-my-requests') await PeopleApp.renderMyRequests();
        if (viewId === 'people-centers') await PeopleApp.renderCenters();
        if (viewId === 'people-map') await CitizenMap.renderMap();
        if (viewId === 'people-create') CitizenLocationPicker.init();
    },

    bindForms: () => {
        // General Request Form
        const reqForm = document.getElementById('form-create-request');
        if (reqForm) {
            reqForm.onsubmit = async (e) => {
                e.preventDefault();
                await PeopleApp.submitRequest(reqForm);
            };
        }

        // Emergency Form
        const emergForm = document.getElementById('form-report-emergency');
        if (emergForm) {
            emergForm.onsubmit = async (e) => {
                e.preventDefault();
                await PeopleApp.submitEmergency(emergForm);
            };
        }

        // Track Request Form
        const trackForm = document.getElementById('form-track');
        if (trackForm) {
            trackForm.onsubmit = async (e) => {
                e.preventDefault();
                const id = (document.getElementById('track-id') ? document.getElementById('track-id').value : '').trim();
                const phone = (document.getElementById('track-phone') ? document.getElementById('track-phone').value : '').trim();
                await PeopleApp.trackRequest(id, phone);
            };
        }
    },

    // Helper: Validates 10-digit phone number
    isValidPhone: (phone) => {
        const clean = (phone || '').replace(/\D/g, '');
        return clean.length === 10;
    },

    renderHome: async () => {
        await RequestService.sync();
        const stats = RequestService.getStats();
        const statsHtml = `
            <div class="stat-card">
                <h3>Total Requests</h3>
                <div class="num">${stats.total}</div>
            </div>
            <div class="stat-card">
                <h3>Active Needs</h3>
                <div class="num">${stats.active}</div>
            </div>
            <div class="stat-card danger">
                <h3>Critical / High Priority</h3>
                <div class="num text-danger">${stats.criticalAndHigh}</div>
            </div>
            <div class="stat-card success">
                <h3>Completed</h3>
                <div class="num text-success">${stats.completed}</div>
            </div>
        `;
        const container = document.getElementById('people-home-stats');
        if (container) container.innerHTML = statsHtml;
    },

    submitRequest: async (form) => {
        const fd = new FormData(form);
        const name = (fd.get('name') || '').trim();
        const phone = (fd.get('phone') || '').trim();
        const location = (fd.get('location') || '').trim();
        const disaster = (fd.get('disaster') || 'General').trim();
        const type = (fd.get('type') || 'Other').trim();
        const peopleCount = parseInt(fd.get('people'), 10);
        const severity = (fd.get('severity') || 'NORMAL').trim();
        const details = (fd.get('details') || '').trim();

        // Field Validation
        if (!name) {
            App.showToast('Validation Error: Please enter citizen name.', 'warning');
            return;
        }
        if (!PeopleApp.isValidPhone(phone)) {
            App.showToast('Validation Error: Contact phone must be a valid 10-digit number.', 'warning');
            return;
        }
        if (!location) {
            App.showToast('Validation Error: Please enter location/address.', 'warning');
            return;
        }
        if (isNaN(peopleCount) || peopleCount < 1) {
            App.showToast('Validation Error: People affected must be at least 1.', 'warning');
            return;
        }

        // Phase 1 Quantity Validations (Reject negative values)
        const parseQty = (val, fieldLabel) => {
            if (!val || val === '') return 0;
            const num = parseInt(val, 10);
            if (isNaN(num) || num < 0) {
                App.showToast(`Validation Error: ${fieldLabel} cannot be negative.`, 'warning');
                throw new Error('invalid_quantity');
            }
            return num;
        };

        let familiesCount = 0, childrenCount = 0, elderlyCount = 0, injuredCount = 0;
        let foodPackets = 0, waterLitres = 0, medicalKits = 0, blankets = 0;
        try {
            familiesCount = parseQty(fd.get('familiesCount'), 'Number of families');
            childrenCount = parseQty(fd.get('childrenCount'), 'Number of children');
            elderlyCount = parseQty(fd.get('elderlyCount'), 'Number of elderly people');
            injuredCount = parseQty(fd.get('injuredCount'), 'Number of injured people');
            foodPackets = parseQty(fd.get('foodPackets'), 'Food packets required');
            waterLitres = parseQty(fd.get('waterLitres'), 'Drinking water required');
            medicalKits = parseQty(fd.get('medicalKits'), 'Medical kits required');
            blankets = parseQty(fd.get('blankets'), 'Blankets required');
        } catch (e) {
            return;
        }

        let latitude = 0, longitude = 0;
        const latVal = fd.get('latitude');
        if (latVal && latVal.trim() !== '') {
            latitude = parseFloat(latVal);
            if (isNaN(latitude) || latitude < -90 || latitude > 90) {
                App.showToast('Validation Error: Latitude must be between -90 and 90 degrees.', 'warning');
                return;
            }
        }
        const lonVal = fd.get('longitude');
        if (lonVal && lonVal.trim() !== '') {
            longitude = parseFloat(lonVal);
            if (isNaN(longitude) || longitude < -180 || longitude > 180) {
                App.showToast('Validation Error: Longitude must be between -180 and 180 degrees.', 'warning');
                return;
            }
        }

        const req = {
            name,
            phone: phone.replace(/\D/g, ''),
            location,
            disaster,
            type,
            people: peopleCount,
            severity,
            details,
            familiesCount,
            childrenCount,
            elderlyCount,
            injuredCount,
            foodPackets,
            waterLitres,
            medicalKits,
            blankets,
            otherSupplies: (fd.get('otherSupplies') || '').trim(),
            landmark: (fd.get('landmark') || '').trim(),
            latitude,
            longitude,
            directions: (fd.get('directions') || '').trim()
        };

        const res = await RequestService.submit(req);
        if (res.success) {
            localStorage.setItem('dr_system_citizen_phone', req.phone);
            form.reset();
            App.showToast(`Relief request registered successfully!<br>Your Request ID: <b>${res.id}</b>`, 'success');
            App.navigate('people-my-requests');
        } else {
            App.showToast(`Submission Error: ${res.message}`, 'danger');
        }
    },

    submitEmergency: async (form) => {
        const fd = new FormData(form);
        const name = (fd.get('name') || '').trim();
        const phone = (fd.get('phone') || '').trim();
        const location = (fd.get('location') || '').trim();
        const emergType = (fd.get('type') || 'General Emergency').trim();
        const peopleCount = parseInt(fd.get('people'), 10);
        const details = (fd.get('details') || '').trim();

        // Validation
        if (!name) {
            App.showToast('Validation Error: Please enter your name.', 'warning');
            return;
        }
        if (!PeopleApp.isValidPhone(phone)) {
            App.showToast('Validation Error: Please provide a valid 10-digit phone number.', 'warning');
            return;
        }
        if (!location) {
            App.showToast('Validation Error: Exact location is required for emergency dispatch.', 'warning');
            return;
        }
        if (isNaN(peopleCount) || peopleCount < 1) {
            App.showToast('Validation Error: Number of people must be at least 1.', 'warning');
            return;
        }
        if (!details) {
            App.showToast('Validation Error: Please describe the situation.', 'warning');
            return;
        }

        const req = {
            name,
            phone: phone.replace(/\D/g, ''),
            location,
            disaster: emergType,
            type: 'Rescue',
            people: peopleCount,
            severity: 'CRITICAL',
            details: 'EMERGENCY: ' + details
        };

        const res = await RequestService.submit(req);
        if (res.success) {
            localStorage.setItem('dr_system_citizen_phone', req.phone);
            form.reset();
            App.showToast(`CRITICAL Emergency Request Logged!<br>Request ID: <b>${res.id}</b>`, 'danger');
            App.navigate('people-my-requests');
        } else {
            App.showToast(`Emergency Submission Error: ${res.message}`, 'danger');
        }
    },

    renderMyRequests: async () => {
        let requests = [];
        const savedPhone = (localStorage.getItem('dr_system_citizen_phone') || '').trim().replace(/\D/g, '');
        if (savedPhone && savedPhone.length === 10) {
            try {
                const res = await ApiBridge.getCitizenRequests(savedPhone);
                if (res.ok && res.data && Array.isArray(res.data.data)) {
                    requests = res.data.data;
                }
            } catch (e) {}
        }
        if (requests.length === 0) {
            const local = Storage.get('requests') || [];
            if (savedPhone) {
                requests = local.filter(r => (r.phone || '').replace(/\D/g, '') === savedPhone);
            }
        }

        requests.sort((a,b) => {
            const dateA = new Date(a.date || (a.timestamp ? a.timestamp * 1000 : 0));
            const dateB = new Date(b.date || (b.timestamp ? b.timestamp * 1000 : 0));
            return dateB - dateA;
        });

        const tbody = document.getElementById('people-requests-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (requests.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:24px; color:#7f8c8d;"><i class="fas fa-clipboard-list fa-2x mb-1" style="display:block; opacity:0.5;"></i>No citizen relief requests found for your registered phone number.<br><small style="color:var(--text-muted);">Enter your 10-digit contact number in <b>Track Request</b> or submit a request to view history here.</small></td></tr>`;
            return;
        }

        requests.forEach(r => {
            const tr = document.createElement('tr');
            const statusClass = (r.status || 'PENDING').replace(/\s+/g, '-').toLowerCase();
            const severityClass = (r.severity || 'NORMAL').toLowerCase();
            const canCancel = r.status !== 'COMPLETED' && r.status !== 'CANCELLED';
            const displayDate = r.date ? new Date(r.date).toLocaleDateString() : (r.timestamp ? new Date(r.timestamp * 1000).toLocaleDateString() : 'Active');

            tr.innerHTML = `
                <td><b>${escapeHtml(r.id)}</b></td>
                <td>${escapeHtml(r.type)}</td>
                <td>${escapeHtml(r.location)}</td>
                <td><span class="badge severity-${severityClass}">${escapeHtml(r.severity)}</span></td>
                <td><span class="badge status-${statusClass}">${escapeHtml(r.status)}</span></td>
                <td>${displayDate}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="PeopleApp.viewRequest('${escapeHtml(r.id)}')" title="View Details">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-info" onclick="PeopleApp.viewOnMap('${escapeHtml(r.id)}', '${escapeHtml(r.phone || '')}')" title="View on Map" style="margin-left:5px;">
                        <i class="fas fa-map-marked-alt"></i> Map
                    </button>
                    ${canCancel ? `
                        <button class="btn btn-sm btn-danger" onclick="PeopleApp.cancelRequest('${escapeHtml(r.id)}')" title="Cancel Request" style="margin-left:5px;">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    viewRequest: async (id) => {
        let r = RequestService.getById(id);
        if (!r) {
            const phone = (localStorage.getItem('dr_system_citizen_phone') || '').trim();
            if (phone) {
                try {
                    const trackRes = await ApiBridge.trackRequest(id, phone);
                    if (trackRes.ok && trackRes.data && trackRes.data.success) {
                        r = trackRes.data.data;
                    }
                } catch (e) {}
            }
        }
        if (!r) {
            App.showToast('Request record not found.', 'warning');
            return;
        }

        const statusClass = (r.status || 'PENDING').replace(/\s+/g, '-').toLowerCase();
        const severityClass = (r.severity || 'NORMAL').toLowerCase();
        const canCancel = r.status !== 'COMPLETED' && r.status !== 'CANCELLED';
        const displayDate = r.date ? new Date(r.date).toLocaleString() : (r.timestamp ? new Date(r.timestamp * 1000).toLocaleString() : 'N/A');

        const modalHtml = `
            <h2>Request Details (${escapeHtml(r.id)})</h2>
            <div class="detail-grid mt-2">
                <div><b>Request ID:</b> ${escapeHtml(r.id)}</div>
                <div><b>Current Status:</b> <span class="badge status-${statusClass}">${escapeHtml(r.status)}</span></div>
                <div><b>Citizen Name:</b> ${escapeHtml(r.name)}</div>
                <div><b>Contact Phone:</b> ${escapeHtml(r.phone)}</div>
                <div><b>Location:</b> ${escapeHtml(r.location)}</div>
                <div><b>Disaster Type:</b> ${escapeHtml(r.disaster)}</div>
                <div><b>Assistance Category:</b> ${escapeHtml(r.type)}</div>
                <div><b>Severity Level:</b> <span class="badge severity-${severityClass}">${escapeHtml(r.severity)}</span></div>
                <div><b>People Affected:</b> ${r.people}</div>
                <div><b>Assigned Team:</b> ${r.team ? escapeHtml(r.team) : '<span style="color:#7f8c8d;">Unassigned (Idle)</span>'}</div>
                <div><b>Submitted At:</b> ${displayDate}</div>
                <div><b>Landmark:</b> ${r.landmark ? escapeHtml(r.landmark) : 'None specified'}</div>
                ${(r.latitude || r.longitude) ? `<div><b>Coordinates:</b> ${r.latitude}, ${r.longitude}</div>` : ''}
                ${r.directions ? `<div class="full-width"><b>Rescue Directions:</b> ${escapeHtml(r.directions)}</div>` : ''}
                <div class="full-width" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px;">
                    <b style="color:var(--primary); display:block; margin-bottom:6px;"><i class="fas fa-users"></i> Population Breakdown:</b>
                    <span>Families: <b>${r.familiesCount || 0}</b> | Children: <b>${r.childrenCount || 0}</b> | Elderly: <b>${r.elderlyCount || 0}</b> | Injured: <b>${r.injuredCount || 0}</b></span>
                </div>
                <div class="full-width" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px;">
                    <b style="color:var(--primary); display:block; margin-bottom:6px;"><i class="fas fa-box-open"></i> Relief Supplies Required:</b>
                    <span>Food Packets: <b>${r.foodPackets || 0}</b> | Water (L): <b>${r.waterLitres || 0}</b> | Medical Kits: <b>${r.medicalKits || 0}</b> | Blankets: <b>${r.blankets || 0}</b></span>
                    ${r.otherSupplies ? `<div style="margin-top:4px; font-size:12px; color:#4a5568;">Other Supplies: ${escapeHtml(r.otherSupplies)}</div>` : ''}
                </div>
                <div class="full-width"><b>Situation Details:</b> ${escapeHtml(r.details || 'None provided.')}</div>
            </div>
            <div class="modal-actions" style="margin-top: 25px; display:flex; justify-content:flex-end; gap:10px;">
                ${canCancel ? `<button class="btn btn-danger" onclick="PeopleApp.cancelRequest('${escapeHtml(r.id)}')"><i class="fas fa-ban"></i> Cancel Request</button>` : ''}
                <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            </div>
        `;
        App.showModal(modalHtml);
    },

    cancelRequest: async (id) => {
        const r = RequestService.getById(id);
        if (!r) {
            App.showToast('Request not found.', 'warning');
            return;
        }

        if (r.status === 'COMPLETED') {
            App.showToast('Cancellation Rejected: Completed requests cannot be cancelled.', 'warning');
            return;
        }
        if (r.status === 'CANCELLED') {
            App.showToast('Notice: This request is already cancelled.', 'warning');
            return;
        }

        if (confirm(`Are you sure you want to cancel request ${id}?`)) {
            const res = await RequestService.cancel(id, r.phone || '');
            if (res.success) {
                App.closeModal();
                await PeopleApp.renderMyRequests();
                await PeopleApp.renderHome();
                App.showToast(res.message, 'success');
            } else {
                App.showToast(res.message, 'danger');
            }
        }
    },

    trackRequest: async (id, phone) => {
        const resultDiv = document.getElementById('track-result');
        if (!resultDiv) return;

        if (!id || !phone) {
            resultDiv.innerHTML = `
                <div class="alert alert-warning" style="padding:15px; border-radius:4px; border:1px solid #f39c12; background:#fef9e7;">
                    <i class="fas fa-exclamation-triangle"></i> Both <b>Request ID</b> and <b>Contact Phone Number</b> are required to track request status.
                </div>
            `;
            return;
        }

        resultDiv.innerHTML = `
            <div style="padding:15px; color:#7f8c8d; text-align:center;">
                <i class="fas fa-spinner fa-spin"></i> Verifying request credentials...
            </div>
        `;

        const res = await RequestService.track(id, phone);
        if (!res.ok || !res.data || !res.data.success) {
            const errMsg = (res.data && res.data.message) || 'Request not found or verification failed.';
            const isPrivacy = res.status === 403 || errMsg.includes('match');
            resultDiv.innerHTML = `
                <div class="alert ${isPrivacy ? 'alert-warning' : 'alert-danger'}" style="padding:15px; border-radius:4px;">
                    <i class="fas ${isPrivacy ? 'fa-user-shield' : 'fa-times-circle'}"></i> <b>${isPrivacy ? 'Privacy Check Failed' : 'Lookup Error'}:</b> ${errMsg}
                </div>
            `;
            return;
        }

        const r = res.data.data;
        localStorage.setItem('dr_system_citizen_phone', phone);

        // Timeline progression definition
        const steps = ['PENDING', 'TRIAGED', 'ASSIGNED', 'IN PROGRESS', 'COMPLETED'];
        let currentIndex = 0;
        const normStatus = (r.status || 'PENDING').toUpperCase();

        if (normStatus === 'PENDING') currentIndex = 0;
        else if (normStatus === 'TRIAGED') currentIndex = 1;
        else if (normStatus === 'ASSIGNED') currentIndex = 2;
        else if (normStatus === 'IN PROGRESS' || normStatus === 'IN_PROGRESS' || normStatus === 'TEAM DISPATCHED') currentIndex = 3;
        else if (normStatus === 'COMPLETED') currentIndex = 4;

        let timelineHtml = `<div class="timeline">`;
        steps.forEach((step, index) => {
            let statusClass = 'pending';
            if (normStatus === 'CANCELLED') {
                statusClass = index === 0 ? 'completed' : 'cancelled';
            } else if (index < currentIndex) {
                statusClass = 'completed';
            } else if (index === currentIndex) {
                statusClass = 'active';
            }

            timelineHtml += `
                <div class="timeline-step ${statusClass}">
                    <div class="circle"></div>
                    <div class="label">${step}</div>
                </div>
            `;
        });
        timelineHtml += `</div>`;

        const canCancel = r.status !== 'COMPLETED' && r.status !== 'CANCELLED';

        resultDiv.innerHTML = `
            <div class="card" style="margin-top:15px; border-top: 4px solid var(--accent);">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <h3>Request: ${escapeHtml(r.id)}</h3>
                    <div>
                        <span class="badge severity-${(r.severity || 'NORMAL').toLowerCase()}">${escapeHtml(r.severity || 'NORMAL')}</span>
                        <span class="badge status-${(r.status || 'PENDING').replace(/\s+/g, '-').toLowerCase()}">${escapeHtml(r.status || 'PENDING')}</span>
                    </div>
                </div>
                <p class="mt-1"><b>Citizen:</b> ${escapeHtml(r.name || 'Anonymous')} | <b>Location:</b> ${escapeHtml(r.location || '')} | <b>Category:</b> ${escapeHtml(r.type || '')}</p>
                ${r.landmark ? `<p style="font-size:12px; color:#4a5568;"><i class="fas fa-map-marker-alt"></i> Landmark: <b>${escapeHtml(r.landmark)}</b> ${(r.latitude||r.longitude)?`(${r.latitude}, ${r.longitude})`:''}</p>` : ''}
                <p><b>People Affected:</b> ${parseInt(r.people, 10) || 0} | <b>Assigned Team:</b> ${r.team ? `<b>${escapeHtml(r.team)}</b>` : '<span style="color:#7f8c8d;">None (Pending assignment)</span>'}</p>
                ${(r.foodPackets || r.waterLitres || r.medicalKits || r.blankets) ? `
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:6px 10px; margin:8px 0; font-size:12px;">
                        <i class="fas fa-cubes"></i> Supplies: Food <b>${r.foodPackets||0}</b> | Water <b>${r.waterLitres||0}L</b> | MedKits <b>${r.medicalKits||0}</b> | Blankets <b>${r.blankets||0}</b>
                    </div>
                ` : ''}
                ${r.team ? `
                    <div id="track-team-telemetry-box" style="margin:10px 0;">
                        <div class="alert alert-info" style="padding:8px 12px; font-size:12px;">
                            <i class="fas fa-shield-alt"></i> <b>Assigned Unit (${escapeHtml(r.team)}):</b> Checking responder telemetry status...
                        </div>
                    </div>
                ` : ''}
                <div style="margin:20px 0;">
                    ${normStatus === 'CANCELLED' ? '<div class="alert alert-danger" style="padding:10px; border-radius:4px; background:#fadbd8; border:1px solid #e74c3c;"><i class="fas fa-ban"></i> This request has been CANCELLED.</div>' : timelineHtml}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:14px; padding-top:10px; border-top:1px solid #e2e8f0;">
                    <button class="btn btn-sm btn-primary" onclick="PeopleApp.viewOnMap('${escapeHtml(r.id)}', '${escapeHtml(phone)}')">
                        <i class="fas fa-map-marked-alt"></i> View on Live Map
                    </button>
                    ${canCancel ? `
                        <button class="btn btn-sm btn-danger" onclick="PeopleApp.cancelRequest('${escapeHtml(r.id)}'); PeopleApp.trackRequest('${escapeHtml(r.id)}', '${escapeHtml(phone)}');">
                            <i class="fas fa-times"></i> Cancel This Request
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        // Async lookup of assigned squad telemetry status
        if (r.team) {
            setTimeout(async () => {
                const box = document.getElementById('track-team-telemetry-box');
                if (!box) return;
                let loc = null;
                try {
                    const locRes = await ApiBridge.getTeamLocation(r.team);
                    if (locRes && locRes.ok && locRes.data && locRes.data.data) {
                        loc = locRes.data.data;
                    }
                } catch(e) {}
                if (!loc && typeof Storage !== 'undefined' && Storage.getTeamLocations) {
                    const all = Storage.getTeamLocations();
                    loc = all ? all[r.team] : null;
                }

                if (loc && (loc.latitude || loc.longitude)) {
                    const freshness = (loc.freshness || 'NOT_SHARING').toUpperCase();
                    const isSim = !!loc.isSimulated;
                    const simBadge = isSim ? ' <span class="badge" style="background:#fef3c7; color:#b45309; font-size:10px;">[SIMULATED]</span>' : '';
                    if (freshness === 'LIVE') {
                        box.innerHTML = `
                            <div class="alert alert-success" style="padding:8px 12px; font-size:12px;">
                                <i class="fas fa-satellite"></i> <b>Assigned Squad (${escapeHtml(r.team)}) Live GPS:</b> Active broadcasting (&le; 60s ago) at [${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}] &plusmn;${Math.round(loc.accuracy||10)}m.${simBadge}
                            </div>
                        `;
                    } else if (freshness === 'STALE') {
                        box.innerHTML = `
                            <div class="alert alert-warning" style="padding:8px 12px; font-size:12px;">
                                <i class="fas fa-exclamation-triangle"></i> <b>Assigned Squad (${escapeHtml(r.team)}) Telemetry Stale:</b> Last reported signal &gt; 60s ago at [${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}]. Squad is actively deployed.${simBadge}
                            </div>
                        `;
                    } else {
                        box.innerHTML = `
                            <div class="alert alert-info" style="padding:8px 12px; font-size:12px;">
                                <i class="fas fa-pause-circle"></i> <b>Assigned Squad (${escapeHtml(r.team)}) GPS Paused:</b> Squad is assigned. Field telemetry is currently idle or awaiting transmitter restart.
                            </div>
                        `;
                    }
                } else {
                    box.innerHTML = `
                        <div class="alert alert-info" style="padding:8px 12px; font-size:12px;">
                            <i class="fas fa-info-circle"></i> <b>Assigned Squad (${escapeHtml(r.team)}):</b> Squad has been assigned by Central Management. Live telemetry will update once field unit activates GPS.
                        </div>
                    `;
                }
            }, 100);
        }
    },

    renderCenters: async () => {
        await ResourceService.sync();
        const centers = ResourceService.getCenters();
        const container = document.getElementById('centers-container');
        if (!container) return;
        container.innerHTML = '';

        centers.forEach(c => {
            const cap = c.capacity || c.maxCapacity || 100;
            const cur = c.current !== undefined ? c.current : (c.currentOccupancy !== undefined ? c.currentOccupancy : 0);
            const occ = Math.round((cur / cap) * 100);
            const loc = c.location || c.locationNode || 'Pune Zone';
            const hasCoords = (c.latitude && c.longitude && (c.latitude !== 0 || c.longitude !== 0));
            const isDemo = !!c.isDemonstration;
            const avail = (cap - cur > 0) ? (cap - cur) : 0;

            container.innerHTML += `
                <div class="card center-card" style="border-top: 4px solid ${hasCoords ? (isDemo ? '#f39c12' : '#27ae60') : '#94a3b8'};">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <h3 style="margin:0 0 6px 0;">${c.name}</h3>
                        ${hasCoords ? (isDemo ? '<span class="badge" style="background:#f39c12; color:#fff;">DEMO</span>' : '<span class="badge" style="background:#27ae60; color:#fff;">VERIFIED</span>') : '<span class="badge" style="background:#94a3b8; color:#fff;">GRAPH NODE</span>'}
                    </div>
                    <p style="margin:4px 0;"><i class="fas fa-map-marker-alt text-danger"></i> <b>Locality:</b> ${loc}</p>
                    <div class="progress-container" style="background:#ecf0f1; border-radius:10px; height:10px; margin:10px 0; overflow:hidden;">
                        <div class="progress-bar" style="width: ${occ}%; height:100%; background: ${occ > 90 ? 'var(--danger)' : 'var(--primary)'}"></div>
                    </div>
                    <p style="margin:4px 0;"><b>Capacity:</b> ${cur} / ${cap} (${occ}%) • <b>Available:</b> <span class="badge" style="background:#e8f5e9; color:#2e7d32;">${avail}</span></p>
                    <p style="margin:4px 0;"><b>Helpline:</b> <a href="tel:${c.contactNumber || '020-25501269'}">${c.contactNumber || '020-25501269'}</a></p>
                    ${hasCoords ? `
                        <div style="margin-top:10px; display:flex; gap:8px;">
                            <button class="btn btn-sm btn-outline" style="flex:1;" onclick="App.navigate('people-map'); setTimeout(() => { CitizenMap.map.setView([${c.latitude}, ${c.longitude}], 15); if(CitizenMap.centerMarkers['${c.id || c.name}']) CitizenMap.centerMarkers['${c.id || c.name}'].openPopup(); }, 300);">
                                <i class="fas fa-map-marked-alt"></i> Show on Map
                            </button>
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary" style="flex:1; text-align:center;">
                                <i class="fas fa-directions"></i> Directions
                            </a>
                        </div>
                    ` : `
                        <div style="font-size:11px; color:#94a3b8; margin-top:8px; font-style:italic;">
                            Topological graph network node (no GPS coordinates recorded).
                        </div>
                    `}
                </div>
            `;
        });
    },

    // Realistic demonstration disaster relief scenarios for Pune testing
    demoScenarios: {
        'mutha-river': {
            name: 'Anand Joshi',
            phone: '9822014455',
            location: 'Pulachi Wadi, Deccan Gymkhana, Pune',
            disaster: 'Flood',
            type: 'Rescue',
            people: 5,
            severity: 'HIGH',
            familiesCount: 2,
            childrenCount: 1,
            elderlyCount: 1,
            injuredCount: 0,
            foodPackets: 15,
            waterLitres: 25,
            medicalKits: 1,
            blankets: 5,
            landmark: 'Near Z-Bridge & Baba Bhide Bridge riverside path',
            latitude: 18.5167,
            longitude: 73.8417,
            details: '[DEMONSTRATION SCENARIO - Simulated For Testing] Mutha river high discharge flooding riverbank shanties. Water level approx 2.5 ft, access lane submerged.',
            directions: 'Enter via Deccan Gymkhana lane behind PMPML bus station; avoid riverside path.'
        },
        'sinhagad-road': {
            name: 'Sunita Patil',
            phone: '9822098765',
            location: 'Vitthalwadi / Sinhagad Road, Pune',
            disaster: 'Flood',
            type: 'Rescue',
            people: 8,
            severity: 'CRITICAL',
            familiesCount: 2,
            childrenCount: 3,
            elderlyCount: 2,
            injuredCount: 1,
            foodPackets: 20,
            waterLitres: 40,
            medicalKits: 2,
            blankets: 8,
            landmark: 'Behind Vitthal Mandir, Ekta Nagari riverside cluster',
            latitude: 18.4862,
            longitude: 73.8315,
            details: '[DEMONSTRATION SCENARIO - Simulated For Testing] Khadakwasla dam discharge leading to rapid inundation of ground-floor housing societies along Sinhagad road. 8 people stranded on terrace.',
            directions: 'Use Rajaram Bridge bypass; main Sinhagad road has waterlogging near canal.'
        },
        'sangamwadi': {
            name: 'Vijay Gaikwad',
            phone: '9822033221',
            location: 'Sangamwadi Confluence Area, Pune',
            disaster: 'Flood',
            type: 'Shelter',
            people: 12,
            severity: 'HIGH',
            familiesCount: 3,
            childrenCount: 4,
            elderlyCount: 1,
            injuredCount: 0,
            foodPackets: 35,
            waterLitres: 50,
            medicalKits: 1,
            blankets: 12,
            landmark: 'Near Sangam Bridge and Mula-Mutha confluence point',
            latitude: 18.5385,
            longitude: 73.8655,
            details: '[DEMONSTRATION SCENARIO - Simulated For Testing] High river confluence volume causing localized inundation of low-lying transit camps near Sangamwadi.',
            directions: 'Approachable from Pune Station via Bund Garden Road. Low clearance under bridge.'
        },
        'hadapsar': {
            name: 'Kavita Shinde',
            phone: '9822077889',
            location: 'Hadapsar Flyover Underpass, Pune',
            disaster: 'Flood',
            type: 'Food',
            people: 6,
            severity: 'NORMAL',
            familiesCount: 1,
            childrenCount: 2,
            elderlyCount: 0,
            injuredCount: 0,
            foodPackets: 20,
            waterLitres: 30,
            medicalKits: 0,
            blankets: 4,
            landmark: 'Hadapsar Gadital junction underpass corridor',
            latitude: 18.5004,
            longitude: 73.9340,
            details: '[DEMONSTRATION SCENARIO - Simulated For Testing] Intense localized cloudburst causing drainage choking under flyover. Displaced street vendors and residents require dry rations.',
            directions: 'Service road open on Pune-Solapur highway side.'
        },
        'kasba-peth': {
            name: 'Mahesh Kulkarni',
            phone: '9822066442',
            location: 'Kasba Peth / Shaniwar Wada vicinity, Pune',
            disaster: 'Other',
            type: 'Medical',
            people: 2,
            severity: 'HIGH',
            familiesCount: 1,
            childrenCount: 0,
            elderlyCount: 2,
            injuredCount: 1,
            foodPackets: 5,
            waterLitres: 10,
            medicalKits: 3,
            blankets: 2,
            landmark: 'Near Kasba Ganpati Mandir historic quarter',
            latitude: 18.5204,
            longitude: 73.8567,
            details: '[DEMONSTRATION SCENARIO - Simulated For Testing] Elderly citizen requiring emergency oxygen and medical evacuation due to storm damage disrupting localized power grid.',
            directions: 'Narrow wada alleyway; rescue ambulance must halt at main Kasba Peth road.'
        },
        'chinchwad': {
            name: 'Rahul More',
            phone: '9822055113',
            location: 'Chinchwad Gaon / Pavana Riverbank, Pune',
            disaster: 'Flood',
            type: 'Rescue',
            people: 7,
            severity: 'CRITICAL',
            familiesCount: 2,
            childrenCount: 2,
            elderlyCount: 1,
            injuredCount: 0,
            foodPackets: 25,
            waterLitres: 35,
            medicalKits: 1,
            blankets: 7,
            landmark: 'Near Moraya Gosavi Mandir ghat steps',
            latitude: 18.6298,
            longitude: 73.7997,
            details: '[DEMONSTRATION SCENARIO - Simulated For Testing] Pavana river water level rising rapidly past danger mark. Riverside homes waterlogged up to waist level.',
            directions: 'Reach via Pune-PCMC highway corridor (NH-48) to Chinchwad station road; avoid ghat access.'
        }
    },

    fillDemoScenario: (key) => {
        if (!key || key === '') return;
        const sc = PeopleApp.demoScenarios[key];
        if (!sc) return;
        const form = document.getElementById('form-create-request');
        if (!form) return;

        if (form.elements['name']) form.elements['name'].value = sc.name;
        if (form.elements['phone']) form.elements['phone'].value = sc.phone;
        if (form.elements['location']) form.elements['location'].value = sc.location;
        if (form.elements['people']) form.elements['people'].value = sc.people;
        if (form.elements['disaster']) form.elements['disaster'].value = sc.disaster;
        if (form.elements['type']) form.elements['type'].value = sc.type;
        if (form.elements['severity']) form.elements['severity'].value = sc.severity;
        if (form.elements['familiesCount']) form.elements['familiesCount'].value = sc.familiesCount;
        if (form.elements['childrenCount']) form.elements['childrenCount'].value = sc.childrenCount;
        if (form.elements['elderlyCount']) form.elements['elderlyCount'].value = sc.elderlyCount;
        if (form.elements['injuredCount']) form.elements['injuredCount'].value = sc.injuredCount;
        if (form.elements['foodPackets']) form.elements['foodPackets'].value = sc.foodPackets;
        if (form.elements['waterLitres']) form.elements['waterLitres'].value = sc.waterLitres;
        if (form.elements['medicalKits']) form.elements['medicalKits'].value = sc.medicalKits;
        if (form.elements['blankets']) form.elements['blankets'].value = sc.blankets;
        if (form.elements['landmark']) form.elements['landmark'].value = sc.landmark;
        if (form.elements['latitude']) form.elements['latitude'].value = sc.latitude;
        if (form.elements['longitude']) form.elements['longitude'].value = sc.longitude;
        if (form.elements['directions']) form.elements['directions'].value = sc.directions;
        if (form.elements['details']) form.elements['details'].value = sc.details;

        if (typeof CitizenLocationPicker !== 'undefined') {
            if (!CitizenLocationPicker.map) CitizenLocationPicker.init();
            if (CitizenLocationPicker.map && CitizenLocationPicker.marker) {
                CitizenLocationPicker.marker.setLatLng([sc.latitude, sc.longitude]);
                CitizenLocationPicker.map.setView([sc.latitude, sc.longitude], 14, { animate: true });
                CitizenLocationPicker.updateCoordinates(sc.latitude, sc.longitude);
            }
        }
        App.showToast(`Loaded Demonstration Scenario: ${sc.location}`, 'info');
    },

    viewOnMap: (reqId, phone) => {
        if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            localStorage.setItem('dr_system_citizen_phone', cleanPhone);
            const phoneInput = document.getElementById('citizen-map-phone-input');
            if (phoneInput) phoneInput.value = cleanPhone;
        }
        App.navigate('people-map');
        setTimeout(() => {
            if (typeof CitizenMap !== 'undefined' && CitizenMap.selectRequest) {
                CitizenMap.selectRequest(reqId);
            }
        }, 300);
    }
};
