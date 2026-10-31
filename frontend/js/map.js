// ============================================================================
// RT-DRMS Phase 8: Pune City Disaster Relief Mapping and Operations
// Customization for Pune City, Maharashtra, India
// Default Operational Coordinates: [18.5204, 73.8567] (Pune Municipal Center)
// ============================================================================

const PUNE_LOCALITIES = [
    { id: 'shivajinagar', name: 'Shivajinagar', lat: 18.5314, lon: 73.8446, desc: 'Central civic & administrative hub (PMC Bhavan)' },
    { id: 'swargate', name: 'Swargate', lat: 18.5028, lon: 73.8567, desc: 'Major transit hub & Nehru Stadium staging' },
    { id: 'kothrud', name: 'Kothrud', lat: 18.5012, lon: 73.8093, desc: 'Western residential & Yashwantrao Chavan center' },
    { id: 'hadapsar', name: 'Hadapsar', lat: 18.5004, lon: 73.9340, desc: 'Eastern industrial & transit ward office' },
    { id: 'baner', name: 'Baner / Balewadi', lat: 18.5744, lon: 73.7698, desc: 'North-western staging & Balewadi sports complex' },
    { id: 'pimpri', name: 'Pimpri', lat: 18.6298, lon: 73.7997, desc: 'PCMC northern industrial & municipal zone' },
    { id: 'chinchwad', name: 'Chinchwad', lat: 18.6365, lon: 73.8227, desc: 'Annasaheb Magar Stadium relief staging' },
    { id: 'pune-station', name: 'Pune Railway Station / Yerawada', lat: 18.5289, lon: 73.8744, desc: 'Central rail corridor & Divisional sports hub' },
    { id: 'katraj', name: 'Katraj', lat: 18.4575, lon: 73.8677, desc: 'Southern gateway & ghat access staging' },
    { id: 'viman-nagar', name: 'Viman Nagar', lat: 18.5679, lon: 73.9143, desc: 'Airport corridor & eastern staging post' }
];

const MapApp = {
    map: null,
    overviewMap: null,
    tileLayer: null,
    overviewTileLayer: null,

    // Layer groups for granular filtering
    teamLayer: null,
    requestLayer: null,
    routeLayer: null,
    centerLayer: null,

    // Marker caches: key -> { marker, circle, data, type }
    teamMarkers: {},
    requestMarkers: {},
    routeLines: {},
    centerMarkers: {},

    // State
    selectedEntity: null, // { type: 'team'|'request', id: string, data: object }
    refreshTimer: null,
    isRefreshing: false,
    pollIntervalMs: 5000,
    hasFitInitialBounds: false,

    // Filter states
    filters: {
        showAllTeams: true,
        showSharingOnly: false,
        showStale: true,
        showSimulated: true,
        showActiveRequests: true,
        showCriticalOnly: false,
        showRoutes: true,
        showCenters: true,
        selectedLocality: 'ALL'
    },

    // Initialize Map module
    init: () => {
        if (typeof L === 'undefined') {
            console.error('[MapApp] Leaflet library (L) is not loaded.');
            return false;
        }

        // Initialize main map if container exists and not already created
        const mapContainer = document.getElementById('live-operations-map');
        if (mapContainer && !MapApp.map) {
            MapApp.initMainMap();
        }

        // Initialize overview map preview if container exists and not already created
        const overviewContainer = document.getElementById('overview-map-container');
        if (overviewContainer && !MapApp.overviewMap) {
            MapApp.initOverviewMap();
        }

        return true;
    },

    // Initialize full operations map centered on Pune City
    initMainMap: () => {
        try {
            // Default center around Pune City disaster management zone (18.5204, 73.8567)
            MapApp.map = L.map('live-operations-map', {
                center: [18.5204, 73.8567],
                zoom: 12,
                zoomControl: true,
                attributionControl: true
            });

            // OpenStreetMap Tile Layer with explicit attribution
            MapApp.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors • Pune Disaster Relief Operations'
            }).addTo(MapApp.map);

            // Handle tile errors / offline state gracefully
            MapApp.tileLayer.on('tileerror', (error) => {
                const alertEl = document.getElementById('map-offline-alert');
                if (alertEl) alertEl.style.display = 'block';
            });

            // Initialize Layer Groups
            MapApp.routeLayer = L.layerGroup().addTo(MapApp.map);
            MapApp.centerLayer = L.layerGroup().addTo(MapApp.map);
            MapApp.requestLayer = L.layerGroup().addTo(MapApp.map);
            MapApp.teamLayer = L.layerGroup().addTo(MapApp.map);

            // Deselect on background map click
            MapApp.map.on('click', (e) => {
                // If clicked on empty space, deselect
                if (e.originalEvent && e.originalEvent.target && e.originalEvent.target.id === 'live-operations-map') {
                    MapApp.clearSelection();
                }
            });

        } catch (err) {
            console.error('[MapApp] Failed to initialize main map:', err);
        }
    },

    // Initialize compact overview map preview centered on Pune City
    initOverviewMap: () => {
        try {
            MapApp.overviewMap = L.map('overview-map-container', {
                center: [18.5204, 73.8567],
                zoom: 11,
                zoomControl: false,
                attributionControl: false,
                dragging: true,
                scrollWheelZoom: false
            });

            MapApp.overviewTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19
            }).addTo(MapApp.overviewMap);

            // Click anywhere on preview navigates to full map
            MapApp.overviewMap.on('click', () => {
                App.navigate('management-map');
            });
        } catch (err) {
            console.error('[MapApp] Failed to initialize overview map preview:', err);
        }
    },

    // Helper: Calculate Haversine distance in km between two lat/lon pairs
    calculateDistanceKm: (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (R * c).toFixed(2);
    },

    // Helper: Valid coordinate checker (rejects 0,0 and out-of-bounds)
    isValidCoordinate: (lat, lon) => {
        if (typeof lat !== 'number' || typeof lon !== 'number') return false;
        if (isNaN(lat) || isNaN(lon)) return false;
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return false;
        if (Math.abs(lat) < 0.000001 && Math.abs(lon) < 0.000001) return false;
        return true;
    },

    // Custom Icon Generator for Rescue Teams
    createTeamIcon: (freshness, isSimulated, teamId) => {
        let pinClass = 'team-pin-live';
        let iconHtml = '<i class="fas fa-shield-alt"></i>';
        let badgeText = teamId;

        if (isSimulated) {
            pinClass = 'team-pin-simulated';
            iconHtml = '<i class="fas fa-flask"></i>';
            badgeText = `${teamId} <span class="tag-sim">[SIM]</span>`;
        } else if (freshness === 'STALE') {
            pinClass = 'team-pin-stale';
            iconHtml = '<i class="fas fa-history"></i>';
            badgeText = `${teamId} <span class="tag-stale">[STALE]</span>`;
        } else if (freshness === 'NOT_SHARING') {
            pinClass = 'team-pin-notsharing';
            iconHtml = '<i class="fas fa-pause"></i>';
            badgeText = `${teamId} [OFF]`;
        } else if (freshness === 'LIVE') {
            pinClass = 'team-pin-live';
            iconHtml = '<i class="fas fa-satellite-dish"></i>';
            badgeText = `${teamId} [LIVE]`;
        }

        return L.divIcon({
            className: 'custom-map-icon',
            html: `
                <div class="map-pin-container ${pinClass}">
                    <div class="map-pin-badge">
                        ${iconHtml}
                    </div>
                    <div class="map-pin-label">${badgeText}</div>
                    <div class="map-pin-pulse"></div>
                </div>
            `,
            iconSize: [44, 44],
            iconAnchor: [22, 22],
            popupAnchor: [0, -20]
        });
    },

    // Custom Icon Generator for Relief Requests
    createRequestIcon: (severity, status, reqId) => {
        const isCritical = (severity === 'CRITICAL' || severity === 'HIGH');
        const isCompleted = (status === 'COMPLETED' || status === 'CANCELLED');
        let pinClass = isCritical ? 'request-pin-critical' : 'request-pin-active';
        let iconHtml = isCritical ? '<i class="fas fa-exclamation-triangle"></i>' : '<i class="fas fa-life-ring"></i>';

        if (isCompleted) {
            pinClass = 'request-pin-completed';
            iconHtml = '<i class="fas fa-check"></i>';
        }

        return L.divIcon({
            className: 'custom-map-icon',
            html: `
                <div class="map-pin-container ${pinClass}">
                    <div class="map-pin-badge">
                        ${iconHtml}
                    </div>
                    <div class="map-pin-label">${reqId}</div>
                    ${isCritical ? '<div class="map-pin-pulse-alert"></div>' : ''}
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -18]
        });
    },

    // Render full Operations Map view
    renderMap: async () => {
        if (!MapApp.map) {
            MapApp.init();
        }

        // Invalidate size to ensure Leaflet renders correctly after tab unhide
        if (MapApp.map) {
            setTimeout(() => {
                MapApp.map.invalidateSize();
            }, 50);
        }

        await MapApp.refreshData();
        MapApp.startAutoRefresh();
    },

    // Render overview map preview
    renderOverviewMap: async (forceResize = false) => {
        if (!MapApp.overviewMap) {
            MapApp.init();
        }

        if (MapApp.overviewMap) {
            setTimeout(() => {
                MapApp.overviewMap.invalidateSize();
            }, 50);
        }

        await MapApp.refreshData(true);
    },

    // Synchronize all telemetry and relief entities from backend
    refreshData: async (overviewOnly = false) => {
        if (MapApp.isRefreshing) return;
        MapApp.isRefreshing = true;

        const liveBadge = document.getElementById('map-live-status-badge');
        if (liveBadge) {
            liveBadge.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> SYNCING...';
        }

        try {
            // Fetch latest telemetry and entities concurrently
            const [locRes, teamsRes, reqsRes, centersRes] = await Promise.all([
                ApiBridge.getAllTeamLocations().catch(e => ({ ok: false, error: e })),
                ApiBridge.getTeams().catch(e => ({ ok: false, error: e })),
                ApiBridge.getRequests().catch(e => ({ ok: false, error: e })),
                ApiBridge.getCenters().catch(e => ({ ok: false, error: e }))
            ]);

            const locations = (locRes.ok && locRes.data && Array.isArray(locRes.data.data)) ? locRes.data.data : [];
            const threshold = (locRes.ok && locRes.data && locRes.data.threshold) ? locRes.data.threshold : 60;
            const teams = (teamsRes.ok && teamsRes.data && Array.isArray(teamsRes.data.data)) ? teamsRes.data.data : [];
            const requests = (reqsRes.ok && reqsRes.data && Array.isArray(reqsRes.data.data)) ? reqsRes.data.data : [];
            const centers = (centersRes.ok && centersRes.data && Array.isArray(centersRes.data.data)) ? centersRes.data.data : [];

            // Update markers on main map
            if (MapApp.map && !overviewOnly) {
                MapApp.updateTeamMarkers(locations, teams, threshold, requests);
                MapApp.updateRequestMarkers(requests, teams);
                MapApp.updateCenterMarkers(centers);
                MapApp.updateDispatchRoutes(locations, teams, requests);
                MapApp.renderCentersList(centers);
                MapApp.updateSummaryBar(locations, requests, threshold);

                // Auto fit bounds on initial load if not already done
                if (!MapApp.hasFitInitialBounds) {
                    MapApp.fitAvailableBounds();
                    MapApp.hasFitInitialBounds = true;
                }
            }

            // Update overview map preview markers
            if (MapApp.overviewMap) {
                MapApp.updateOverviewMarkers(locations, requests);
            }

            // Restore live polling indicator badge
            if (liveBadge) {
                liveBadge.innerHTML = '<i class="fas fa-circle" style="font-size:8px; animation: pulse 1.5s infinite;"></i> LIVE POLLING (5s)';
            }

            // Hide offline warning if success
            const alertEl = document.getElementById('map-offline-alert');
            if (alertEl) alertEl.style.display = 'none';

        } catch (err) {
            console.error('[MapApp] Error during map data synchronization:', err);
            if (liveBadge) {
                liveBadge.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> SYNC DELAYED';
            }
        } finally {
            MapApp.isRefreshing = false;
        }
    },

    // Update Team Markers on Main Map
    updateTeamMarkers: (locations, teams, threshold, requests) => {
        const teamsMap = {};
        teams.forEach(t => teamsMap[t.id] = t);

        const currentNow = Math.floor(Date.now() / 1000);
        const processedTeamIds = new Set();

        locations.forEach(loc => {
            const teamId = loc.teamId;
            processedTeamIds.add(teamId);
            const teamInfo = teamsMap[teamId] || { name: `Rescue Squad ${teamId}`, status: 'AVAILABLE' };

            // Reject invalid or uninitialized (0,0) coordinates
            if (!MapApp.isValidCoordinate(loc.latitude, loc.longitude)) {
                // If marker previously existed for this team, remove it
                if (MapApp.teamMarkers[teamId]) {
                    MapApp.teamLayer.removeLayer(MapApp.teamMarkers[teamId].marker);
                    if (MapApp.teamMarkers[teamId].circle) {
                        MapApp.teamLayer.removeLayer(MapApp.teamMarkers[teamId].circle);
                    }
                    delete MapApp.teamMarkers[teamId];
                }
                return;
            }

            // Recompute freshness dynamically based on real timestamp & threshold
            const elapsed = (currentNow >= loc.timestamp && loc.timestamp > 0) ? (currentNow - loc.timestamp) : 0;
            let computedFreshness = loc.freshness;
            if (loc.isSharing === false) {
                computedFreshness = 'NOT_SHARING';
            } else if (elapsed <= threshold) {
                computedFreshness = 'LIVE';
            } else {
                computedFreshness = 'STALE';
            }

            const isSimulated = !!loc.isSimulated;
            const latLng = [loc.latitude, loc.longitude];
            const activeReq = loc.activeRequestId ? requests.find(r => r.id === loc.activeRequestId) : null;

            // Generate popup content
            const popupHtml = MapApp.buildTeamPopupHtml(loc, teamInfo, computedFreshness, elapsed, activeReq);
            const icon = MapApp.createTeamIcon(computedFreshness, isSimulated, teamId);

            let cached = MapApp.teamMarkers[teamId];
            if (cached) {
                // Smoothly update existing marker position & contents
                cached.marker.setLatLng(latLng);
                cached.marker.setIcon(icon);
                cached.marker.setPopupContent(popupHtml);

                if (loc.accuracy > 0) {
                    if (cached.circle) {
                        cached.circle.setLatLng(latLng);
                        cached.circle.setRadius(loc.accuracy);
                    } else {
                        cached.circle = L.circle(latLng, {
                            radius: loc.accuracy,
                            color: isSimulated ? '#f39c12' : '#2ecc71',
                            fillColor: isSimulated ? '#f1c40f' : '#2ecc71',
                            fillOpacity: 0.12,
                            weight: 1
                        }).addTo(MapApp.teamLayer);
                    }
                } else if (cached.circle) {
                    MapApp.teamLayer.removeLayer(cached.circle);
                    cached.circle = null;
                }

                cached.data = { loc, teamInfo, computedFreshness, elapsed, activeReq };
            } else {
                // Create new marker
                const marker = L.marker(latLng, { icon: icon });
                marker.bindPopup(popupHtml, { maxWidth: 320 });

                marker.on('click', () => {
                    MapApp.selectEntity('team', teamId, { loc, teamInfo, computedFreshness, elapsed, activeReq });
                });

                let circle = null;
                if (loc.accuracy > 0) {
                    circle = L.circle(latLng, {
                        radius: loc.accuracy,
                        color: isSimulated ? '#f39c12' : '#2ecc71',
                        fillColor: isSimulated ? '#f1c40f' : '#2ecc71',
                        fillOpacity: 0.12,
                        weight: 1
                    }).addTo(MapApp.teamLayer);
                }

                marker.addTo(MapApp.teamLayer);
                MapApp.teamMarkers[teamId] = {
                    marker,
                    circle,
                    data: { loc, teamInfo, computedFreshness, elapsed, activeReq }
                };
            }

            // Apply filter visibility
            MapApp.applyTeamFilterVisibility(teamId, computedFreshness, isSimulated, loc.isSharing);
        });

        // Remove any markers for teams that no longer exist
        Object.keys(MapApp.teamMarkers).forEach(id => {
            if (!processedTeamIds.has(id)) {
                MapApp.teamLayer.removeLayer(MapApp.teamMarkers[id].marker);
                if (MapApp.teamMarkers[id].circle) {
                    MapApp.teamLayer.removeLayer(MapApp.teamMarkers[id].circle);
                }
                delete MapApp.teamMarkers[id];
            }
        });
    },

    // Update Request Markers on Main Map
    updateRequestMarkers: (requests, teams) => {
        const processedReqIds = new Set();

        requests.forEach(req => {
            processedReqIds.add(req.id);

            // Reject missing or uninitialized (0,0) coordinates
            if (!MapApp.isValidCoordinate(req.latitude, req.longitude)) {
                if (MapApp.requestMarkers[req.id]) {
                    MapApp.requestLayer.removeLayer(MapApp.requestMarkers[req.id].marker);
                    delete MapApp.requestMarkers[req.id];
                }
                return;
            }

            const latLng = [req.latitude, req.longitude];
            const icon = MapApp.createRequestIcon(req.severity, req.status, req.id);
            const popupHtml = MapApp.buildRequestPopupHtml(req);

            let cached = MapApp.requestMarkers[req.id];
            if (cached) {
                cached.marker.setLatLng(latLng);
                cached.marker.setIcon(icon);
                cached.marker.setPopupContent(popupHtml);
                cached.data = req;
            } else {
                const marker = L.marker(latLng, { icon: icon });
                marker.bindPopup(popupHtml, { maxWidth: 340 });

                marker.on('click', () => {
                    MapApp.selectEntity('request', req.id, req);
                });

                marker.addTo(MapApp.requestLayer);
                MapApp.requestMarkers[req.id] = { marker, data: req };
            }

            // Apply filter visibility
            MapApp.applyRequestFilterVisibility(req.id, req.severity, req.status, req);
        });

        // Clean up excised requests
        Object.keys(MapApp.requestMarkers).forEach(id => {
            if (!processedReqIds.has(id)) {
                MapApp.requestLayer.removeLayer(MapApp.requestMarkers[id].marker);
                delete MapApp.requestMarkers[id];
            }
        });
    },

    // Update Straight-line Dispatch Routes between active squads and assigned incidents
    updateDispatchRoutes: (locations, teams, requests) => {
        const reqMap = {};
        requests.forEach(r => reqMap[r.id] = r);

        const activeSquadIds = new Set();

        locations.forEach(loc => {
            if (!loc.activeRequestId || !loc.isSharing) return;
            const req = reqMap[loc.activeRequestId];
            if (!req) return;

            if (MapApp.isValidCoordinate(loc.latitude, loc.longitude) && MapApp.isValidCoordinate(req.latitude, req.longitude)) {
                activeSquadIds.add(loc.teamId);
                const points = [
                    [loc.latitude, loc.longitude],
                    [req.latitude, req.longitude]
                ];
                const distKm = MapApp.calculateDistanceKm(loc.latitude, loc.longitude, req.latitude, req.longitude);

                const tooltipHtml = `
                    <b>Direct Geodesic Reference:</b> ${loc.teamId} &rarr; ${req.id}<br>
                    <span>Distance: <b>${distKm} km</b> (Straight-line)</span><br>
                    <small style="color:#d35400;">* Road route not calculated. Open external OSM/GPS navigation.</small>
                `;

                if (MapApp.routeLines[loc.teamId]) {
                    MapApp.routeLines[loc.teamId].setLatLngs(points);
                    MapApp.routeLines[loc.teamId].setTooltipContent(tooltipHtml);
                } else {
                    const polyline = L.polyline(points, {
                        color: '#e74c3c',
                        weight: 3,
                        dashArray: '6, 8',
                        opacity: 0.85
                    });
                    polyline.bindTooltip(tooltipHtml, { sticky: true });
                    polyline.addTo(MapApp.routeLayer);
                    MapApp.routeLines[loc.teamId] = polyline;
                }

                // Apply route visibility filter
                if (!MapApp.filters.showRoutes) {
                    MapApp.routeLayer.removeLayer(MapApp.routeLines[loc.teamId]);
                } else if (!MapApp.routeLayer.hasLayer(MapApp.routeLines[loc.teamId])) {
                    MapApp.routeLines[loc.teamId].addTo(MapApp.routeLayer);
                }
            }
        });

        // Remove obsolete route lines
        Object.keys(MapApp.routeLines).forEach(tId => {
            if (!activeSquadIds.has(tId)) {
                MapApp.routeLayer.removeLayer(MapApp.routeLines[tId]);
                delete MapApp.routeLines[tId];
            }
        });
    },

    // Update Overview Map Preview Markers
    updateOverviewMarkers: (locations, requests) => {
        if (!MapApp.overviewMap) return;

        // Clear existing preview layers
        MapApp.overviewMap.eachLayer(layer => {
            if (layer !== MapApp.overviewTileLayer) {
                MapApp.overviewMap.removeLayer(layer);
            }
        });

        // Add compact circle markers
        locations.forEach(loc => {
            if (MapApp.isValidCoordinate(loc.latitude, loc.longitude)) {
                const color = loc.isSimulated ? '#f39c12' : (loc.freshness === 'LIVE' ? '#2ecc71' : '#e67e22');
                L.circleMarker([loc.latitude, loc.longitude], {
                    radius: 7,
                    fillColor: color,
                    color: '#ffffff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.9
                }).bindTooltip(`<b>${loc.teamId}</b> (${loc.freshness})`).addTo(MapApp.overviewMap);
            }
        });

        requests.forEach(r => {
            if (MapApp.isValidCoordinate(r.latitude, r.longitude)) {
                const isCrit = (r.severity === 'CRITICAL' || r.severity === 'HIGH');
                L.circleMarker([r.latitude, r.longitude], {
                    radius: 6,
                    fillColor: isCrit ? '#e74c3c' : '#3498db',
                    color: '#ffffff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.9
                }).bindTooltip(`<b>${r.id}</b>: ${r.type}`).addTo(MapApp.overviewMap);
            }
        });
    },

    // Build Team Marker Popup HTML
    buildTeamPopupHtml: (loc, teamInfo, freshness, elapsed, activeReq) => {
        const timeStr = loc.timestamp > 0 ? new Date(loc.timestamp * 1000).toLocaleTimeString() : 'N/A';
        const isSim = !!loc.isSimulated;

        let freshnessBadge = `<span class="badge" style="background:#28a745; color:#fff;">LIVE</span>`;
        if (freshness === 'STALE') freshnessBadge = `<span class="badge" style="background:#e67e22; color:#fff;">STALE</span>`;
        if (freshness === 'NOT_SHARING') freshnessBadge = `<span class="badge" style="background:#7f8c8d; color:#fff;">NOT SHARING</span>`;
        if (isSim) freshnessBadge += ` <span class="badge" style="background:#f1c40f; color:#212529;">SIMULATED</span>`;

        let missionInfo = '<span style="color:#7f8c8d;">Idle / Available</span>';
        let routeAction = '';

        if (activeReq) {
            missionInfo = `<b>${activeReq.id}</b> (${activeReq.disaster || 'Disaster'}) - <span class="badge status-${(activeReq.status||'').replace(/\s+/g,'-').toLowerCase()}">${activeReq.status}</span>`;
            if (MapApp.isValidCoordinate(activeReq.latitude, activeReq.longitude)) {
                const distKm = MapApp.calculateDistanceKm(loc.latitude, loc.longitude, activeReq.latitude, activeReq.longitude);
                const extDirectionsUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${loc.latitude},${loc.longitude}%3B${activeReq.latitude},${activeReq.longitude}`;
                routeAction = `
                    <div style="margin-top:8px; padding-top:8px; border-top:1px dashed #e2e8f0; font-size:12px;">
                        <div><i class="fas fa-route text-accent"></i> Distance to Target: <b>${distKm} km</b> (Straight-line)</div>
                        <a href="${extDirectionsUrl}" target="_blank" rel="noopener" class="btn btn-sm btn-primary" style="display:inline-block; margin-top:6px; font-size:11px; padding:3px 8px;">
                            <i class="fas fa-external-link-alt"></i> External Turn-by-Turn Route
                        </a>
                    </div>
                `;
            }
        }

        return `
            <div class="map-popup-card">
                <div class="map-popup-header">
                    <h4><i class="fas fa-shield-alt text-accent"></i> ${teamInfo.name || loc.teamId} (${loc.teamId})</h4>
                    <div>${freshnessBadge}</div>
                </div>
                <div class="map-popup-body">
                    <div><b>Operational Status:</b> <span class="badge ${teamInfo.status === 'BUSY' ? 'badge-warning' : 'badge-success'}">${teamInfo.status || 'AVAILABLE'}</span></div>
                    <div><b>Specialization:</b> ${teamInfo.specialization || 'General Relief'}</div>
                    <div><b>Coordinates:</b> <code>${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}</code></div>
                    <div><b>Accuracy Radius:</b> ±${Math.round(loc.accuracy)} metres</div>
                    <div><b>Last Signal:</b> ${timeStr} (${elapsed}s ago)</div>
                    <div><b>Active Mission:</b> ${missionInfo}</div>
                    ${routeAction}
                </div>
                <div class="map-popup-footer">
                    <button class="btn btn-sm btn-secondary" onclick="MapApp.inspectEntity('team', '${loc.teamId}')" style="width:100%; font-size:11px;">
                        <i class="fas fa-info-circle"></i> Inspect Squad in Side Panel
                    </button>
                </div>
            </div>
        `;
    },

    // Build Request Marker Popup HTML
    buildRequestPopupHtml: (req) => {
        const isCrit = (req.severity === 'CRITICAL' || req.severity === 'HIGH');
        const assignedTeam = req.assignedTeamId || req.team;

        return `
            <div class="map-popup-card">
                <div class="map-popup-header">
                    <h4><i class="fas ${isCrit ? 'fa-exclamation-triangle text-danger' : 'fa-life-ring text-primary'}"></i> ${req.id} — ${req.disaster}</h4>
                    <div>
                        <span class="badge severity-${(req.severity||'normal').toLowerCase()}">${req.severity}</span>
                        <span class="badge status-${(req.status||'pending').replace(/\s+/g,'-').toLowerCase()}">${req.status}</span>
                    </div>
                </div>
                <div class="map-popup-body">
                    <div><b>Reporting Citizen:</b> ${req.name} (${req.phone})</div>
                    <div><b>Destination / Area:</b> ${req.location}</div>
                    ${req.landmark ? `<div><b>Landmark:</b> ${req.landmark}</div>` : ''}
                    <div><b>Affected Population:</b> <b>${req.people || 1} people</b> (${req.familiesCount||0} families, ${req.childrenCount||0} kids, ${req.injuredCount||0} injured)</div>
                    <div><b>Required Supplies:</b> ${req.foodPackets||0} rations, ${req.waterLitres||0}L water, ${req.medicalKits||0} med-kits</div>
                    <div><b>Assigned Squad:</b> ${assignedTeam ? `<b>${assignedTeam}</b>` : '<span style="color:#7f8c8d;">Unassigned</span>'}</div>
                    <div><b>Coordinates:</b> <code>${req.latitude.toFixed(5)}, ${req.longitude.toFixed(5)}</code></div>
                    ${req.directions ? `<div style="background:#eef6fc; padding:4px 6px; border-radius:4px; font-size:11px; margin-top:4px;"><b>Access Directions:</b> ${req.directions}</div>` : ''}
                </div>
                <div class="map-popup-footer" style="display:flex; gap:6px; margin-top:8px;">
                    <button class="btn btn-sm btn-primary" onclick="ManagementApp.updateRequest('${req.id}')" style="flex:1; font-size:11px; padding:4px 6px;">
                        <i class="fas fa-tasks"></i> Manage / Mission Details
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="MapApp.inspectEntity('request', '${req.id}')" style="flex:1; font-size:11px; padding:4px 6px;">
                        <i class="fas fa-info-circle"></i> View Side Details
                    </button>
                </div>
            </div>
        `;
    },

    // Update Side Detail Panel
    selectEntity: (type, id, data) => {
        MapApp.selectedEntity = { type, id, data };
        const container = document.getElementById('map-detail-panel');
        if (!container) return;

        if (type === 'team') {
            const { loc, teamInfo, computedFreshness, elapsed, activeReq } = data;
            const timeStr = loc.timestamp > 0 ? new Date(loc.timestamp * 1000).toLocaleTimeString() : 'N/A';
            const distInfo = (activeReq && MapApp.isValidCoordinate(activeReq.latitude, activeReq.longitude))
                ? `${MapApp.calculateDistanceKm(loc.latitude, loc.longitude, activeReq.latitude, activeReq.longitude)} km`
                : 'N/A';

            container.innerHTML = `
                <div class="card" style="border-top:4px solid var(--accent); margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0;"><i class="fas fa-user-shield text-accent"></i> ${teamInfo.name || id}</h3>
                        <span class="badge ${computedFreshness === 'LIVE' ? 'badge-success' : (computedFreshness === 'STALE' ? 'badge-warning' : 'badge-secondary')}">${computedFreshness}</span>
                    </div>
                    <div class="detail-grid mt-1" style="font-size:13px;">
                        <div><strong>Team Identifier:</strong> <code>${id}</code></div>
                        <div><strong>Deployment Readiness:</strong> <span class="badge ${teamInfo.status === 'BUSY' ? 'badge-warning' : 'badge-success'}">${teamInfo.status || 'AVAILABLE'}</span></div>
                        <div><strong>Operational Specialization:</strong> ${teamInfo.specialization || 'General Search & Rescue'}</div>
                        <div><strong>Current Coordinates:</strong> <code>${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}</code></div>
                        <div><strong>GPS Accuracy Radius:</strong> ±${Math.round(loc.accuracy)} metres</div>
                        <div><strong>Signal Age:</strong> ${elapsed}s ago (${timeStr})</div>
                        <div><strong>Hardware Source:</strong> ${loc.isSimulated ? '<span class="badge" style="background:#f1c40f; color:#212529;">SIMULATED MODE</span>' : '<span class="badge badge-success">PHYSICAL GPS TELEMETRY</span>'}</div>
                        <div><strong>Assigned Mission:</strong> ${activeReq ? `<b>${activeReq.id}</b> (${activeReq.status})` : 'None (Idle)'}</div>
                        ${activeReq ? `<div><strong>Distance to Mission:</strong> <b>${distInfo}</b> (Straight-line)</div>` : ''}
                    </div>
                    <div style="display:flex; gap:8px; margin-top:12px;">
                        <button class="btn btn-secondary btn-sm" onclick="MapApp.focusEntity('team', '${id}')">
                            <i class="fas fa-crosshairs"></i> Center on Map
                        </button>
                        ${activeReq ? `
                            <button class="btn btn-primary btn-sm" onclick="ManagementApp.updateRequest('${activeReq.id}')">
                                <i class="fas fa-tasks"></i> View Mission ${activeReq.id}
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        } else if (type === 'request') {
            const req = data;
            const isCrit = (req.severity === 'CRITICAL' || req.severity === 'HIGH');
            container.innerHTML = `
                <div class="card" style="border-top:4px solid ${isCrit ? 'var(--danger)' : 'var(--primary)'}; margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0;"><i class="fas fa-exclamation-circle ${isCrit ? 'text-danger' : 'text-primary'}"></i> ${req.id} — ${req.disaster}</h3>
                        <span class="badge severity-${(req.severity||'normal').toLowerCase()}">${req.severity}</span>
                    </div>
                    <div class="detail-grid mt-1" style="font-size:13px;">
                        <div><strong>Reporting Citizen:</strong> ${req.name} (${req.phone})</div>
                        <div><strong>Incident Status:</strong> <span class="badge status-${(req.status||'pending').replace(/\s+/g,'-').toLowerCase()}">${req.status}</span></div>
                        <div><strong>Incident Location:</strong> ${req.location}</div>
                        <div><strong>Area Landmark:</strong> ${req.landmark || 'None recorded'}</div>
                        <div><strong>Coordinates:</strong> <code>${req.latitude.toFixed(5)}, ${req.longitude.toFixed(5)}</code></div>
                        <div><strong>Victims Count:</strong> <b>${req.people || 1} people</b> (${req.familiesCount||0} families, ${req.childrenCount||0} children, ${req.injuredCount||0} injured)</div>
                        <div><strong>Requested Food:</strong> ${req.foodPackets || 0} meal packets</div>
                        <div><strong>Requested Water:</strong> ${req.waterLitres || 0} litres drinking water</div>
                        <div><strong>Medical Supplies:</strong> ${req.medicalKits || 0} first-aid kits, ${req.blankets || 0} blankets</div>
                        ${req.otherSupplies ? `<div><strong>Other Logistics:</strong> ${req.otherSupplies}</div>` : ''}
                        <div><strong>Assigned Squad:</strong> ${req.assignedTeamId || req.team ? `<b>${req.assignedTeamId || req.team}</b>` : '<span style="color:#7f8c8d;">Unassigned</span>'}</div>
                    </div>
                    ${req.directions ? `
                        <div style="background:#eef6fc; border-left:3px solid #3498db; padding:6px 10px; border-radius:4px; font-size:12px; margin-top:8px;">
                            <strong>Field Access Directions:</strong> ${req.directions}
                        </div>
                    ` : ''}
                    <div style="display:flex; gap:8px; margin-top:12px;">
                        <button class="btn btn-secondary btn-sm" onclick="MapApp.focusEntity('request', '${req.id}')">
                            <i class="fas fa-crosshairs"></i> Center on Map
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="ManagementApp.updateRequest('${req.id}')">
                            <i class="fas fa-shield-alt"></i> Open Full Mission Management
                        </button>
                    </div>
                </div>
            `;
        }
    },

    // Inspect entity wrapper invoked from popup
    inspectEntity: (type, id) => {
        if (type === 'team' && MapApp.teamMarkers[id]) {
            MapApp.selectEntity('team', id, MapApp.teamMarkers[id].data);
        } else if (type === 'request' && MapApp.requestMarkers[id]) {
            MapApp.selectEntity('request', id, MapApp.requestMarkers[id].data);
        }
    },

    // Pan & zoom map to specific marker
    focusEntity: (type, id) => {
        if (!MapApp.map) return;
        let markerObj = null;
        if (type === 'team') markerObj = MapApp.teamMarkers[id];
        if (type === 'request') markerObj = MapApp.requestMarkers[id];

        if (markerObj && markerObj.marker) {
            const latLng = markerObj.marker.getLatLng();
            MapApp.map.setView(latLng, 15, { animate: true });
            markerObj.marker.openPopup();
        }
    },

    // Clear selection in side panel
    clearSelection: () => {
        MapApp.selectedEntity = null;
        const container = document.getElementById('map-detail-panel');
        if (!container) return;
        container.innerHTML = `
            <div class="card" style="text-align:center; padding:25px; color:#7f8c8d;">
                <i class="fas fa-crosshairs fa-2x mb-1" style="color:#bdc3c7;"></i>
                <p style="margin:0; font-size:13px;">Click any rescue team or disaster request marker on the map to inspect full telemetry, demographics, logistics, and navigation references.</p>
            </div>
        `;
    },

    // Render Relief Centers Side List (Requirement 5: textual graph staging hubs)
    renderCentersList: (centers) => {
        const container = document.getElementById('map-centers-list');
        if (!container) return;

        if (!centers || centers.length === 0) {
            container.innerHTML = '<p class="text-muted" style="font-size:12px;">No relief centers registered.</p>';
            return;
        }

        let html = '';
        centers.forEach(c => {
            const pct = c.maxCapacity > 0 ? Math.round((c.currentOccupancy / c.maxCapacity) * 100) : 0;
            html += `
                <div class="center-item-card" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px; margin-bottom:8px; font-size:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong><i class="fas fa-campground text-accent"></i> ${c.name}</strong>
                        <span class="badge" style="background:#34495e; color:#fff; font-size:10px;">${c.id}</span>
                    </div>
                    <div style="color:#4a5568; margin-top:4px;">
                        <span>Graph Staging Node: <b>${c.locationNode || 'Central'}</b></span><br>
                        <span>Capacity: <b>${c.currentOccupancy} / ${c.maxCapacity}</b> (${pct}% full)</span><br>
                        <span>Contact: <b>${c.contactNumber || 'N/A'}</b></span>
                    </div>
                    <div style="background:#edf2f7; height:5px; border-radius:3px; margin-top:6px; overflow:hidden;">
                        <div style="background:${pct > 85 ? 'var(--danger)' : 'var(--success)'}; width:${Math.min(pct, 100)}%; height:100%;"></div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    // Update Top Summary Bar in Map View
    updateSummaryBar: (locations, requests, threshold) => {
        const nowSec = Math.floor(Date.now() / 1000);
        let liveTeams = 0;
        let staleTeams = 0;
        let mappedTeams = 0;

        locations.forEach(loc => {
            if (MapApp.isValidCoordinate(loc.latitude, loc.longitude)) {
                mappedTeams++;
                const age = (nowSec >= loc.timestamp && loc.timestamp > 0) ? (nowSec - loc.timestamp) : 0;
                if (loc.isSharing && age <= threshold) liveTeams++;
                else if (loc.isSharing && age > threshold) staleTeams++;
            }
        });

        let mappedRequests = 0;
        let critRequests = 0;

        requests.forEach(r => {
            if (MapApp.isValidCoordinate(r.latitude, r.longitude)) {
                mappedRequests++;
                if (r.severity === 'CRITICAL' || r.severity === 'HIGH') critRequests++;
            }
        });

        const elLiveTeams = document.getElementById('map-stat-live-teams');
        if (elLiveTeams) elLiveTeams.textContent = liveTeams;

        const elStaleTeams = document.getElementById('map-stat-stale-teams');
        if (elStaleTeams) elStaleTeams.textContent = staleTeams;

        const elMappedReq = document.getElementById('map-stat-requests');
        if (elMappedReq) elMappedReq.textContent = mappedRequests;

        const elCritReq = document.getElementById('map-stat-critical');
        if (elCritReq) elCritReq.textContent = critRequests;
    },

    // Fit map bounds to encompass all currently displayed markers
    fitAvailableBounds: () => {
        if (!MapApp.map) return;
        const latLngs = [];

        Object.values(MapApp.teamMarkers).forEach(item => {
            if (MapApp.teamLayer.hasLayer(item.marker)) {
                latLngs.push(item.marker.getLatLng());
            }
        });

        Object.values(MapApp.requestMarkers).forEach(item => {
            if (MapApp.requestLayer.hasLayer(item.marker)) {
                latLngs.push(item.marker.getLatLng());
            }
        });

        Object.values(MapApp.centerMarkers).forEach(marker => {
            if (MapApp.centerLayer.hasLayer(marker)) {
                latLngs.push(marker.getLatLng());
            }
        });

        if (latLngs.length > 0) {
            const bounds = L.latLngBounds(latLngs);
            MapApp.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        } else {
            // Default center around Pune City if no coordinates available
            MapApp.map.setView([18.5204, 73.8567], 12);
        }
    },

    // Apply Filter Visibility for a Team
    applyTeamFilterVisibility: (teamId, freshness, isSimulated, isSharing) => {
        const item = MapApp.teamMarkers[teamId];
        if (!item) return;

        let visible = MapApp.filters.showAllTeams;

        if (MapApp.filters.showSharingOnly && !isSharing) visible = false;
        if (!MapApp.filters.showStale && freshness === 'STALE') visible = false;
        if (!MapApp.filters.showSimulated && isSimulated) visible = false;

        if (visible) {
            if (!MapApp.teamLayer.hasLayer(item.marker)) {
                item.marker.addTo(MapApp.teamLayer);
            }
            if (item.circle && !MapApp.teamLayer.hasLayer(item.circle)) {
                item.circle.addTo(MapApp.teamLayer);
            }
        } else {
            MapApp.teamLayer.removeLayer(item.marker);
            if (item.circle) {
                MapApp.teamLayer.removeLayer(item.circle);
            }
        }
    },

    // Apply Filter Visibility for a Request (including locality filtering)
    applyRequestFilterVisibility: (reqId, severity, status, reqData) => {
        const item = MapApp.requestMarkers[reqId];
        if (!item) return;

        let visible = MapApp.filters.showActiveRequests;
        const isCrit = (severity === 'CRITICAL' || severity === 'HIGH');

        if (MapApp.filters.showCriticalOnly && !isCrit) visible = false;

        // Locality-based filter
        if (visible && MapApp.filters.selectedLocality && MapApp.filters.selectedLocality !== 'ALL') {
            const selLoc = MapApp.filters.selectedLocality.toLowerCase();
            const data = reqData || item.data || {};
            const textLoc = (data.location || '').toLowerCase();
            const landmarkLoc = (data.landmark || '').toLowerCase();

            // Match text locality or coordinate proximity to the locality anchor point
            let matchesLocality = textLoc.includes(selLoc) || landmarkLoc.includes(selLoc);
            if (!matchesLocality && MapApp.isValidCoordinate(data.latitude, data.longitude)) {
                const localityRef = PUNE_LOCALITIES.find(l => l.name.toLowerCase().includes(selLoc) || l.id === selLoc);
                if (localityRef) {
                    const distKm = MapApp.calculateDistanceKm(data.latitude, data.longitude, localityRef.lat, localityRef.lon);
                    if (distKm !== null && distKm <= 4.0) {
                        matchesLocality = true;
                    }
                }
            }
            if (!matchesLocality) visible = false;
        }

        if (visible) {
            if (!MapApp.requestLayer.hasLayer(item.marker)) {
                item.marker.addTo(MapApp.requestLayer);
            }
        } else {
            MapApp.requestLayer.removeLayer(item.marker);
        }
    },

    // Filter Trigger Handler
    onFilterChange: () => {
        // Update filter values from DOM checkboxes
        const chkAllTeams = document.getElementById('map-filter-teams');
        const chkSharingOnly = document.getElementById('map-filter-sharing-only');
        const chkStale = document.getElementById('map-filter-stale');
        const chkSimulated = document.getElementById('map-filter-simulated');
        const chkRequests = document.getElementById('map-filter-requests');
        const chkCritOnly = document.getElementById('map-filter-crit-only');
        const chkRoutes = document.getElementById('map-filter-routes');
        const chkCenters = document.getElementById('map-filter-centers');

        if (chkAllTeams) MapApp.filters.showAllTeams = chkAllTeams.checked;
        if (chkSharingOnly) MapApp.filters.showSharingOnly = chkSharingOnly.checked;
        if (chkStale) MapApp.filters.showStale = chkStale.checked;
        if (chkSimulated) MapApp.filters.showSimulated = chkSimulated.checked;
        if (chkRequests) MapApp.filters.showActiveRequests = chkRequests.checked;
        if (chkCritOnly) MapApp.filters.showCriticalOnly = chkCritOnly.checked;
        if (chkRoutes) MapApp.filters.showRoutes = chkRoutes.checked;
        if (chkCenters) MapApp.filters.showCenters = chkCenters.checked;

        // Re-evaluate team markers
        Object.keys(MapApp.teamMarkers).forEach(teamId => {
            const data = MapApp.teamMarkers[teamId].data;
            if (data && data.loc) {
                MapApp.applyTeamFilterVisibility(teamId, data.computedFreshness, !!data.loc.isSimulated, data.loc.isSharing);
            }
        });

        // Re-evaluate request markers
        Object.keys(MapApp.requestMarkers).forEach(reqId => {
            const req = MapApp.requestMarkers[reqId].data;
            if (req) {
                MapApp.applyRequestFilterVisibility(reqId, req.severity, req.status, req);
            }
        });

        // Re-evaluate center markers
        Object.keys(MapApp.centerMarkers).forEach(cId => {
            const marker = MapApp.centerMarkers[cId];
            if (MapApp.filters.showCenters) {
                if (!MapApp.centerLayer.hasLayer(marker)) marker.addTo(MapApp.centerLayer);
            } else {
                MapApp.centerLayer.removeLayer(marker);
            }
        });

        // Re-evaluate routes
        Object.keys(MapApp.routeLines).forEach(tId => {
            const line = MapApp.routeLines[tId];
            if (MapApp.filters.showRoutes) {
                if (!MapApp.routeLayer.hasLayer(line)) line.addTo(MapApp.routeLayer);
            } else {
                MapApp.routeLayer.removeLayer(line);
            }
        });
    },

    // Locality Filter Handler
    onLocalityFilterChange: (locName) => {
        MapApp.filters.selectedLocality = locName || 'ALL';
        MapApp.onFilterChange();
        if (locName && locName !== 'ALL') {
            MapApp.panToLocality(locName);
        }
    },

    // Smoothly pan map to selected Pune locality
    panToLocality: (locName) => {
        const found = PUNE_LOCALITIES.find(l => l.name.toLowerCase().includes(locName.toLowerCase()) || locName.toLowerCase().includes(l.id));
        if (found && MapApp.map) {
            MapApp.map.setView([found.lat, found.lon], 14, { animate: true });
        }
    },

    // Update verified Pune Relief Center markers on Command Map
    updateCenterMarkers: (centers) => {
        if (!MapApp.centerLayer) return;
        const processedCenterIds = new Set();

        centers.forEach(c => {
            const hasCoords = (c.latitude && c.longitude && MapApp.isValidCoordinate(c.latitude, c.longitude));
            if (!hasCoords) return;

            const cId = c.id || c.name;
            processedCenterIds.add(cId);
            const latLng = [c.latitude, c.longitude];
            const cap = c.capacity || c.maxCapacity || 100;
            const cur = c.current !== undefined ? c.current : (c.currentOccupancy !== undefined ? c.currentOccupancy : 0);
            const avail = (cap - cur > 0) ? (cap - cur) : 0;
            const isDemo = !!c.isDemonstration;

            const centerIcon = L.divIcon({
                className: 'custom-map-icon',
                html: `
                    <div class="map-pin-container" style="color:#27ae60;">
                        <div class="map-pin-badge" style="background:#27ae60; box-shadow:0 0 8px rgba(39,174,96,0.6);">
                            <i class="fas fa-campground"></i>
                        </div>
                        <div class="map-pin-label">${c.name}</div>
                    </div>
                `,
                iconSize: [38, 38],
                iconAnchor: [19, 19],
                popupAnchor: [0, -18]
            });

            const popupHtml = `
                <div class="map-popup-card">
                    <div class="map-popup-header">
                        <h4><i class="fas fa-campground"></i> ${c.name}</h4>
                        ${isDemo ? '<span class="badge" style="background:#f39c12; color:#fff;">DEMO SHELTER</span>' : '<span class="badge" style="background:#27ae60; color:#fff;">VERIFIED FACILITY</span>'}
                    </div>
                    <div class="map-popup-body">
                        <div><b>Area / Locality:</b> ${c.location || c.locationNode || 'Pune Municipal Zone'}</div>
                        <div><b>Shelter Capacity:</b> ${cur} / ${cap} (Available: <b>${avail}</b>)</div>
                        <div><b>Helpline / Contact:</b> ${c.contactNumber || '020-25501269'}</div>
                        <div><b>GPS Coordinates:</b> <code>${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}</code></div>
                        <div style="margin-top:4px;"><b>Operational Status:</b> <span class="badge" style="background:#2ecc71; color:#fff;">OPERATIONAL</span></div>
                    </div>
                    <div class="map-popup-footer" style="margin-top:8px;">
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}" target="_blank" rel="noopener" class="btn btn-sm btn-outline" style="width:100%; text-align:center; display:block;">
                            <i class="fas fa-directions"></i> External Navigation
                        </a>
                    </div>
                </div>
            `;

            let cached = MapApp.centerMarkers[cId];
            if (cached) {
                cached.setLatLng(latLng);
                cached.setIcon(centerIcon);
                cached.setPopupContent(popupHtml);
            } else {
                const marker = L.marker(latLng, { icon: centerIcon });
                marker.bindPopup(popupHtml, { maxWidth: 320 });
                if (MapApp.filters.showCenters) {
                    marker.addTo(MapApp.centerLayer);
                }
                MapApp.centerMarkers[cId] = marker;
            }
        });

        // Cleanup removed center markers
        Object.keys(MapApp.centerMarkers).forEach(cId => {
            if (!processedCenterIds.has(cId)) {
                MapApp.centerLayer.removeLayer(MapApp.centerMarkers[cId]);
                delete MapApp.centerMarkers[cId];
            }
        });
    },

    // Render Relief Centers sidebar list for Operations Command
    renderCentersList: (centers) => {
        const listEl = document.getElementById('map-centers-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        if (!centers || centers.length === 0) {
            listEl.innerHTML = '<div class="text-muted" style="padding:10px; font-size:12px;">No relief centres registered.</div>';
            return;
        }

        const mappedCenters = centers.filter(c => c.latitude && c.longitude && MapApp.isValidCoordinate(c.latitude, c.longitude));
        const unmappedCenters = centers.filter(c => !(c.latitude && c.longitude && MapApp.isValidCoordinate(c.latitude, c.longitude)));

        let html = '';
        if (mappedCenters.length > 0) {
            html += '<div style="font-size:11px; font-weight:700; color:var(--primary); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;"><i class="fas fa-map-marker-alt text-success"></i> Verified Mapped Shelters (' + mappedCenters.length + ')</div>';
            mappedCenters.forEach(c => {
                const cap = c.capacity || c.maxCapacity || 100;
                const cur = c.current !== undefined ? c.current : (c.currentOccupancy !== undefined ? c.currentOccupancy : 0);
                const isDemo = !!c.isDemonstration;
                html += `
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; margin-bottom:6px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong style="font-size:12px; color:var(--primary);">${c.name}</strong>
                            ${isDemo ? '<span class="badge" style="background:#f39c12; color:#fff; font-size:10px;">DEMO</span>' : '<span class="badge" style="background:#27ae60; color:#fff; font-size:10px;">VERIFIED</span>'}
                        </div>
                        <div style="font-size:11px; color:#64748b; margin-top:3px; display:flex; justify-content:space-between;">
                            <span><i class="fas fa-map-pin"></i> ${c.location || c.locationNode}</span>
                            <span><i class="fas fa-users"></i> ${cur}/${cap}</span>
                        </div>
                        <div style="margin-top:4px; display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:10px; color:#64748b;"><i class="fas fa-phone-alt"></i> ${c.contactNumber || 'N/A'}</span>
                            <button class="btn btn-sm btn-outline" style="padding:2px 8px; font-size:10px;" onclick="MapApp.map.setView([${c.latitude}, ${c.longitude}], 15); if(MapApp.centerMarkers['${c.id || c.name}']) MapApp.centerMarkers['${c.id || c.name}'].openPopup();">
                                <i class="fas fa-search-location"></i> View
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        if (unmappedCenters.length > 0) {
            html += '<div style="font-size:11px; font-weight:700; color:#64748b; margin:10px 0 6px 0; text-transform:uppercase; letter-spacing:0.5px;"><i class="fas fa-project-diagram"></i> Topological Graph Nodes (' + unmappedCenters.length + ')</div>';
            unmappedCenters.forEach(c => {
                const cap = c.capacity || c.maxCapacity || 100;
                const cur = c.current !== undefined ? c.current : (c.currentOccupancy !== undefined ? c.currentOccupancy : 0);
                html += `
                    <div style="background:#f1f5f9; border:1px dashed #cbd5e1; border-radius:6px; padding:6px 10px; margin-bottom:6px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:11px; font-weight:600; color:#475569;">${c.name}</span>
                            <span class="badge" style="background:#94a3b8; color:#fff; font-size:9px;">Graph Node: ${c.locationNode || c.location}</span>
                        </div>
                        <div style="font-size:10px; color:#94a3b8; margin-top:2px;">
                            Capacity: ${cur}/${cap} • Contact: ${c.contactNumber || 'N/A'} (Routing graph model only; no GPS markers fabricated).
                        </div>
                    </div>
                `;
            });
        }

        listEl.innerHTML = html;
    },

    // Focus All Teams
    focusTeams: () => {
        const teamLatLngs = [];
        Object.values(MapApp.teamMarkers).forEach(item => {
            if (MapApp.teamLayer.hasLayer(item.marker)) {
                teamLatLngs.push(item.marker.getLatLng());
            }
        });
        if (teamLatLngs.length > 0 && MapApp.map) {
            MapApp.map.fitBounds(L.latLngBounds(teamLatLngs), { padding: [50, 50], maxZoom: 15 });
        } else {
            App.showToast('No active rescue team coordinates currently on map.', 'info');
        }
    },

    // Focus All Requests
    focusRequests: () => {
        const reqLatLngs = [];
        Object.values(MapApp.requestMarkers).forEach(item => {
            if (MapApp.requestLayer.hasLayer(item.marker)) {
                reqLatLngs.push(item.marker.getLatLng());
            }
        });
        if (reqLatLngs.length > 0 && MapApp.map) {
            MapApp.map.fitBounds(L.latLngBounds(reqLatLngs), { padding: [50, 50], maxZoom: 15 });
        } else {
            App.showToast('No geocoded relief request coordinates currently on map.', 'info');
        }
    },

    // Auto-refresh lifecycle
    startAutoRefresh: () => {
        MapApp.stopAutoRefresh();
        MapApp.refreshTimer = setInterval(() => {
            // Only poll if management map or overview is currently visible
            const mapSec = document.getElementById('view-management-map');
            const overviewSec = document.getElementById('view-management-overview');
            const isMapVisible = (mapSec && !mapSec.classList.contains('hidden'));
            const isOverviewVisible = (overviewSec && !overviewSec.classList.contains('hidden'));

            if (isMapVisible) {
                MapApp.refreshData(false);
            } else if (isOverviewVisible) {
                MapApp.refreshData(true);
            } else {
                // If user navigated elsewhere, pause polling
                MapApp.stopAutoRefresh();
            }
        }, MapApp.pollIntervalMs);
    },

    stopAutoRefresh: () => {
        if (MapApp.refreshTimer) {
            clearInterval(MapApp.refreshTimer);
            MapApp.refreshTimer = null;
        }
    }
};

// ============================================================================
// RT-DRMS Phase 7: Role-Based Map Integration Modules
// 1. CitizenLocationPicker (Interactive coordinates picker for request submission)
// 2. CitizenMap (Citizen disaster & relief map with private assigned-squad tracking)
// 3. TeamMissionMap (Team Leader tactical mission & GPS telemetry map)
// ============================================================================

const CitizenLocationPicker = {
    map: null,
    tileLayer: null,
    marker: null,
    accuracyCircle: null,
    defaultCenter: [18.5204, 73.8567],

    init: () => {
        const container = document.getElementById('request-location-picker-map');
        if (!container) return;

        // If Leaflet is not loaded yet, return
        if (typeof L === 'undefined') return;

        // If map already initialized on this container, invalidate size and return
        if (CitizenLocationPicker.map) {
            setTimeout(() => {
                CitizenLocationPicker.map.invalidateSize();
            }, 100);
            return;
        }

        // Check if there are already values in the input fields
        const latInput = document.getElementById('create-input-lat');
        const lonInput = document.getElementById('create-input-lon');
        let initialLat = 18.5204;
        let initialLon = 73.8567;
        let hasCustomCoords = false;

        if (latInput && lonInput && latInput.value && lonInput.value) {
            const pLat = parseFloat(latInput.value);
            const pLon = parseFloat(lonInput.value);
            if (!isNaN(pLat) && !isNaN(pLon) && MapApp.isValidCoordinate(pLat, pLon)) {
                initialLat = pLat;
                initialLon = pLon;
                hasCustomCoords = true;
            }
        }

        try {
            CitizenLocationPicker.map = L.map('request-location-picker-map', {
                center: [initialLat, initialLon],
                zoom: 13,
                zoomControl: true,
                attributionControl: false
            });

            CitizenLocationPicker.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19
            }).addTo(CitizenLocationPicker.map);

            // Create pin icon
            const pickerIcon = L.divIcon({
                className: 'custom-map-icon',
                html: `
                    <div class="map-pin-container request-pin-active" style="cursor:grab;">
                        <div class="map-pin-badge" style="background:#2980b9;">
                            <i class="fas fa-map-pin"></i>
                        </div>
                        <div class="map-pin-label">Incident Pin</div>
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });

            CitizenLocationPicker.marker = L.marker([initialLat, initialLon], {
                draggable: true,
                icon: pickerIcon
            }).addTo(CitizenLocationPicker.map);

            // Handle marker drag
            CitizenLocationPicker.marker.on('dragend', (e) => {
                const pos = e.target.getLatLng();
                CitizenLocationPicker.updateCoordinates(pos.lat, pos.lng);
            });

            // Handle map click
            CitizenLocationPicker.map.on('click', (e) => {
                const { lat, lng } = e.latlng;
                CitizenLocationPicker.marker.setLatLng([lat, lng]);
                CitizenLocationPicker.updateCoordinates(lat, lng);
            });

            // Sync if user types coordinates manually
            if (latInput && lonInput) {
                const manualSync = () => {
                    const lat = parseFloat(latInput.value);
                    const lon = parseFloat(lonInput.value);
                    if (MapApp.isValidCoordinate(lat, lon)) {
                        CitizenLocationPicker.marker.setLatLng([lat, lon]);
                        CitizenLocationPicker.map.setView([lat, lon], 14);
                    }
                };
                latInput.addEventListener('change', manualSync);
                lonInput.addEventListener('change', manualSync);
            }

            if (hasCustomCoords) {
                CitizenLocationPicker.updateCoordinates(initialLat, initialLon);
            }

            setTimeout(() => {
                if (CitizenLocationPicker.map) {
                    CitizenLocationPicker.map.invalidateSize();
                }
            }, 150);

        } catch (err) {
            console.error('[CitizenLocationPicker] Initialization error:', err);
        }
    },

    updateCoordinates: (lat, lon) => {
        const latInput = document.getElementById('create-input-lat');
        const lonInput = document.getElementById('create-input-lon');
        const statusNote = document.getElementById('picker-status-note');

        const roundedLat = parseFloat(lat.toFixed(6));
        const roundedLon = parseFloat(lon.toFixed(6));

        if (latInput) latInput.value = roundedLat;
        if (lonInput) lonInput.value = roundedLon;

        if (statusNote) {
            statusNote.innerHTML = `<span style="color:#27ae60; font-weight:600;"><i class="fas fa-check-circle"></i> Map Location Selected:</span> Lat <code>${roundedLat}</code>, Lon <code>${roundedLon}</code> (coordinates auto-filled below)`;
        }
    },

    useCurrentLocation: () => {
        const statusNote = document.getElementById('picker-status-note');
        const btn = document.getElementById('btn-use-my-location');

        if (!navigator.geolocation) {
            if (statusNote) {
                statusNote.innerHTML = `<span class="text-danger"><i class="fas fa-times-circle"></i> Browser geolocation is not supported on this device/browser. Please click on the map to set location manually.</span>`;
            }
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Detecting...`;
        }
        if (statusNote) {
            statusNote.innerHTML = `<span style="color:#3498db;"><i class="fas fa-satellite fa-spin"></i> Requesting GPS coordinates from your device...</span>`;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = `<i class="fas fa-location-arrow"></i> Use My Current Location`;
                }
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                const acc = pos.coords.accuracy || 0;

                if (!CitizenLocationPicker.map) {
                    CitizenLocationPicker.init();
                }

                if (CitizenLocationPicker.map && CitizenLocationPicker.marker) {
                    CitizenLocationPicker.marker.setLatLng([lat, lon]);
                    CitizenLocationPicker.map.setView([lat, lon], 15);

                    if (acc > 0) {
                        if (CitizenLocationPicker.accuracyCircle) {
                            CitizenLocationPicker.accuracyCircle.setLatLng([lat, lon]);
                            CitizenLocationPicker.accuracyCircle.setRadius(acc);
                        } else {
                            CitizenLocationPicker.accuracyCircle = L.circle([lat, lon], {
                                radius: acc,
                                color: '#3498db',
                                fillColor: '#3498db',
                                fillOpacity: 0.15,
                                weight: 1
                            }).addTo(CitizenLocationPicker.map);
                        }
                    }
                }

                CitizenLocationPicker.updateCoordinates(lat, lon);

                if (statusNote) {
                    statusNote.innerHTML = `<span style="color:#27ae60; font-weight:600;"><i class="fas fa-satellite"></i> GPS Lock Acquired:</span> Lat <code>${lat.toFixed(6)}</code>, Lon <code>${lon.toFixed(6)}</code> (accuracy ±${Math.round(acc)}m)`;
                }
            },
            (err) => {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = `<i class="fas fa-location-arrow"></i> Use My Current Location`;
                }
                let errReason = 'Location access permission was denied or signal unavailable.';
                if (err.code === 1) errReason = 'Location permission was denied by user.';
                else if (err.code === 2) errReason = 'Position unavailable (no GPS lock).';
                else if (err.code === 3) errReason = 'Location request timed out.';

                if (statusNote) {
                    statusNote.innerHTML = `<span style="color:#d35400;"><i class="fas fa-exclamation-triangle"></i> ${errReason} You can click anywhere on the map above to select your incident location manually.</span>`;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
            }
        );
    },

    // Curated Pune locality selector: jumps map and updates fields without fake geocoding
    selectLocality: (locName) => {
        if (!locName || locName === '') return;
        const found = PUNE_LOCALITIES.find(l => l.name.toLowerCase().includes(locName.toLowerCase()) || l.id === locName);
        if (!found) return;
        if (!CitizenLocationPicker.map) CitizenLocationPicker.init();
        if (CitizenLocationPicker.map && CitizenLocationPicker.marker) {
            CitizenLocationPicker.marker.setLatLng([found.lat, found.lon]);
            CitizenLocationPicker.map.setView([found.lat, found.lon], 14, { animate: true });
            CitizenLocationPicker.updateCoordinates(found.lat, found.lon);
            const locInput = document.getElementById('create-input-location');
            if (locInput && (!locInput.value || locInput.value === 'Area A' || locInput.value === 'Area B' || locInput.value === 'North Zone Sector 4, Block C')) {
                locInput.value = found.name + ', Pune';
            }
            const landmarkInput = document.getElementById('create-input-landmark');
            if (landmarkInput && !landmarkInput.value) {
                landmarkInput.value = found.desc;
            }
        }
    }
};

const CitizenMap = {
    map: null,
    tileLayer: null,
    requestLayer: null,
    teamLayer: null,
    vectorLayer: null,
    centerLayer: null,

    // Caches
    requestMarkers: {},
    teamMarkers: {},
    vectorLines: {},
    centerMarkers: {},

    // State
    currentPhone: '',
    selectedRequestId: null,
    refreshTimer: null,
    isRefreshing: false,
    pollIntervalMs: 6000,
    hasFitInitialBounds: false,

    init: () => {
        if (typeof L === 'undefined') return;
        const container = document.getElementById('citizen-interactive-map');
        if (!container || CitizenMap.map) return;

        try {
            CitizenMap.map = L.map('citizen-interactive-map', {
                center: [18.5204, 73.8567],
                zoom: 12,
                zoomControl: true,
                attributionControl: true
            });

            CitizenMap.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(CitizenMap.map);

            CitizenMap.vectorLayer = L.layerGroup().addTo(CitizenMap.map);
            CitizenMap.centerLayer = L.layerGroup().addTo(CitizenMap.map);
            CitizenMap.requestLayer = L.layerGroup().addTo(CitizenMap.map);
            CitizenMap.teamLayer = L.layerGroup().addTo(CitizenMap.map);

            CitizenMap.map.on('click', (e) => {
                if (e.originalEvent && e.originalEvent.target && e.originalEvent.target.id === 'citizen-interactive-map') {
                    CitizenMap.clearSelection();
                }
            });
        } catch (err) {
            console.error('[CitizenMap] Initialization error:', err);
        }
    },

    renderMap: async () => {
        CitizenMap.init();

        if (CitizenMap.map) {
            setTimeout(() => {
                CitizenMap.map.invalidateSize();
            }, 100);
        }

        // Prepopulate phone input if available from localStorage
        const phoneInput = document.getElementById('citizen-map-phone-input');
        if (phoneInput && !phoneInput.value) {
            const savedPhone = localStorage.getItem('dr_system_citizen_phone') || '';
            if (savedPhone) {
                phoneInput.value = savedPhone;
            }
        }

        await CitizenMap.loadCitizenData();
        CitizenMap.startAutoRefresh();
    },

    loadCitizenData: async () => {
        if (CitizenMap.isRefreshing) return;
        CitizenMap.isRefreshing = true;

        const phoneInput = document.getElementById('citizen-map-phone-input');
        const alertEl = document.getElementById('citizen-map-alert');
        let phone = (phoneInput ? phoneInput.value : '').trim().replace(/\D/g, '');

        if (!phone) {
            phone = (localStorage.getItem('dr_system_citizen_phone') || '').trim().replace(/\D/g, '');
            if (phone && phoneInput) phoneInput.value = phone;
        }

        if (phone) {
            localStorage.setItem('dr_system_citizen_phone', phone);
            CitizenMap.currentPhone = phone;
        }

        try {
            // Concurrently fetch centres and (if phone exists) citizen requests
            const reqPromise = phone ? ApiBridge.getCitizenRequests(phone).catch(e => ({ ok: false, error: e })) : Promise.resolve({ ok: true, data: { success: true, data: [] } });
            const centersPromise = ApiBridge.getCenters().catch(e => ({ ok: false, error: e }));

            const [reqRes, centersRes] = await Promise.all([reqPromise, centersPromise]);

            const requests = (reqRes.ok && reqRes.data && Array.isArray(reqRes.data.data)) ? reqRes.data.data : [];
            const centers = (centersRes.ok && centersRes.data && Array.isArray(centersRes.data.data)) ? centersRes.data.data : [];

            // Render Relief Centres in side list and map
            CitizenMap.renderCenters(centers);

            if (!phone) {
                if (alertEl) {
                    alertEl.className = 'alert alert-info mb-2';
                    alertEl.style.display = 'block';
                    alertEl.innerHTML = `<i class="fas fa-info-circle"></i> <strong>Citizen Identity Verification:</strong> Enter your registered 10-digit contact phone number above and click <strong>My Requests</strong> to plot your relief requests and track assigned rescue squads in real time.`;
                }
                CitizenMap.clearRequestAndTeamMarkers();
                CitizenMap.renderEmptyDetailPanel('Enter your 10-digit contact phone above to view your requests and live rescue squads.');
                return;
            }

            if (alertEl) {
                if (requests.length === 0) {
                    alertEl.className = 'alert alert-warning mb-2';
                    alertEl.style.display = 'block';
                    alertEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> No relief requests found for contact phone <b>${phone}</b>. Submit a new request to track it here.`;
                } else {
                    alertEl.style.display = 'none';
                }
            }

            // Plot citizen requests
            CitizenMap.updateRequestMarkers(requests);

            // Fetch and plot assigned team locations strictly for citizen's requests
            await CitizenMap.updateAssignedTeams(requests, phone);

            // Update detail panel
            if (CitizenMap.selectedRequestId) {
                const selReq = requests.find(r => r.id === CitizenMap.selectedRequestId);
                if (selReq) {
                    CitizenMap.renderRequestDetailPanel(selReq);
                } else {
                    CitizenMap.renderSummaryDetailPanel(requests);
                }
            } else {
                CitizenMap.renderSummaryDetailPanel(requests);
            }

            // Auto fit bounds on initial load
            if (!CitizenMap.hasFitInitialBounds && (requests.length > 0 || centers.length > 0)) {
                CitizenMap.fitBounds();
                CitizenMap.hasFitInitialBounds = true;
            }

        } catch (err) {
            console.error('[CitizenMap] Error loading citizen data:', err);
        } finally {
            CitizenMap.isRefreshing = false;
        }
    },

    // Refresh without resetting selection
    refreshData: async () => {
        await CitizenMap.loadCitizenData();
    },

    updateRequestMarkers: (requests) => {
        const processedReqIds = new Set();

        requests.forEach(req => {
            processedReqIds.add(req.id);

            if (!MapApp.isValidCoordinate(req.latitude, req.longitude)) {
                if (CitizenMap.requestMarkers[req.id]) {
                    CitizenMap.requestLayer.removeLayer(CitizenMap.requestMarkers[req.id].marker);
                    delete CitizenMap.requestMarkers[req.id];
                }
                return;
            }

            const latLng = [req.latitude, req.longitude];
            const isCritical = (req.severity === 'CRITICAL' || req.severity === 'HIGH');
            const isCompleted = (req.status === 'COMPLETED' || req.status === 'CANCELLED');
            let pinClass = isCritical ? 'request-pin-critical' : 'request-pin-active';
            let iconHtml = isCritical ? '<i class="fas fa-exclamation-triangle"></i>' : '<i class="fas fa-life-ring"></i>';

            if (isCompleted) {
                pinClass = 'request-pin-completed';
                iconHtml = '<i class="fas fa-check"></i>';
            }

            const icon = L.divIcon({
                className: 'custom-map-icon',
                html: `
                    <div class="map-pin-container ${pinClass}">
                        <div class="map-pin-badge">
                            ${iconHtml}
                        </div>
                        <div class="map-pin-label">${req.id}</div>
                        ${isCritical ? '<div class="map-pin-pulse-alert"></div>' : ''}
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -18]
            });

            const popupHtml = `
                <div class="map-popup-card">
                    <div class="map-popup-header">
                        <h4><i class="fas fa-life-ring"></i> Request ${req.id}</h4>
                        <span class="badge severity-${req.severity.toLowerCase()}">${req.severity}</span>
                    </div>
                    <div class="map-popup-body">
                        <div><b>Status:</b> <span class="badge status-${(req.status || 'PENDING').replace(/\s+/g, '-').toLowerCase()}">${req.status}</span></div>
                        <div><b>Location:</b> ${req.location}</div>
                        <div><b>People Affected:</b> ${req.people || 1}</div>
                        <div><b>Assigned Squad:</b> ${req.assignedSquadId || req.team ? `<b>${req.assignedSquadId || req.team}</b>` : '<span class="text-muted">Pending Assignment</span>'}</div>
                        ${req.landmark ? `<div><b>Landmark:</b> ${req.landmark}</div>` : ''}
                    </div>
                    <div class="map-popup-footer" style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                        <button class="btn btn-sm btn-primary" onclick="CitizenMap.selectRequest('${req.id}')">
                            <i class="fas fa-info-circle"></i> Inspect
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="PeopleApp.viewRequest('${req.id}')">
                            <i class="fas fa-eye"></i> Full Details
                        </button>
                    </div>
                </div>
            `;

            let cached = CitizenMap.requestMarkers[req.id];
            if (cached) {
                cached.marker.setLatLng(latLng);
                cached.marker.setIcon(icon);
                cached.marker.setPopupContent(popupHtml);
                cached.data = req;
            } else {
                const marker = L.marker(latLng, { icon: icon });
                marker.bindPopup(popupHtml, { maxWidth: 300 });
                marker.on('click', () => {
                    CitizenMap.selectRequest(req.id);
                });
                marker.addTo(CitizenMap.requestLayer);
                CitizenMap.requestMarkers[req.id] = { marker, data: req };
            }
        });

        // Cleanup removed markers
        Object.keys(CitizenMap.requestMarkers).forEach(id => {
            if (!processedReqIds.has(id)) {
                CitizenMap.requestLayer.removeLayer(CitizenMap.requestMarkers[id].marker);
                delete CitizenMap.requestMarkers[id];
            }
        });
    },

    updateAssignedTeams: async (requests, phone) => {
        const assignedRequests = requests.filter(r => (r.assignedSquadId || r.team) && r.status !== 'CANCELLED' && r.status !== 'COMPLETED');
        const activeTeamIds = new Set();

        for (const req of assignedRequests) {
            try {
                const locRes = await ApiBridge.getAssignedTeamLocation(req.id, phone);
                if (locRes.ok && locRes.data && locRes.data.success && locRes.data.data) {
                    const loc = locRes.data.data;
                    const squadId = loc.teamId || req.assignedSquadId || req.team;

                    // If squad is sharing location and has valid coordinates
                    if (loc.isSharing && MapApp.isValidCoordinate(loc.latitude, loc.longitude)) {
                        activeTeamIds.add(squadId);
                        const latLng = [loc.latitude, loc.longitude];
                        const freshness = loc.freshness || 'LIVE';
                        const isSim = !!loc.isSimulated;

                        const teamIcon = MapApp.createTeamIcon(freshness, isSim, squadId);

                        const popupHtml = `
                            <div class="map-popup-card">
                                <div class="map-popup-header">
                                    <h4><i class="fas fa-shield-alt"></i> Assigned Squad: ${squadId}</h4>
                                    <span class="badge" style="background:#28a745; color:#fff;">${freshness}</span>
                                </div>
                                <div class="map-popup-body">
                                    <div><b>Dispatched to:</b> Request ${req.id}</div>
                                    <div><b>Last Update:</b> ${loc.lastUpdatedSecondsAgo !== undefined ? `${loc.lastUpdatedSecondsAgo}s ago` : 'Recent'}</div>
                                    <div><b>GPS Accuracy:</b> ${loc.accuracy ? `±${Math.round(loc.accuracy)}m` : 'Standard'}</div>
                                    ${isSim ? '<div class="text-warning"><b>Mode:</b> Simulated Telemetry</div>' : ''}
                                </div>
                            </div>
                        `;

                        let cached = CitizenMap.teamMarkers[squadId];
                        if (cached) {
                            cached.marker.setLatLng(latLng);
                            cached.marker.setIcon(teamIcon);
                            cached.marker.setPopupContent(popupHtml);

                            if (loc.accuracy > 0) {
                                if (cached.circle) {
                                    cached.circle.setLatLng(latLng);
                                    cached.circle.setRadius(loc.accuracy);
                                } else {
                                    cached.circle = L.circle(latLng, {
                                        radius: loc.accuracy,
                                        color: isSim ? '#f39c12' : '#2ecc71',
                                        fillColor: isSim ? '#f1c40f' : '#2ecc71',
                                        fillOpacity: 0.12,
                                        weight: 1
                                    }).addTo(CitizenMap.teamLayer);
                                }
                            }
                            cached.data = loc;
                        } else {
                            const marker = L.marker(latLng, { icon: teamIcon });
                            marker.bindPopup(popupHtml, { maxWidth: 300 });

                            let circle = null;
                            if (loc.accuracy > 0) {
                                circle = L.circle(latLng, {
                                    radius: loc.accuracy,
                                    color: isSim ? '#f39c12' : '#2ecc71',
                                    fillColor: isSim ? '#f1c40f' : '#2ecc71',
                                    fillOpacity: 0.12,
                                    weight: 1
                                }).addTo(CitizenMap.teamLayer);
                            }

                            marker.addTo(CitizenMap.teamLayer);
                            CitizenMap.teamMarkers[squadId] = { marker, circle, data: loc };
                        }

                        // Draw straight-line vector if request coordinates are also valid
                        if (MapApp.isValidCoordinate(req.latitude, req.longitude)) {
                            const dist = MapApp.calculateDistanceKm(loc.latitude, loc.longitude, req.latitude, req.longitude);
                            const vectorKey = `${squadId}->${req.id}`;

                            let vecCached = CitizenMap.vectorLines[vectorKey];
                            const latLngs = [latLng, [req.latitude, req.longitude]];
                            const tooltipContent = `<div style="font-size:11px; text-align:center;"><b>Straight-line Distance:</b> ${dist} km<br><small class="text-muted">(Estimated radial distance; not a road route)</small></div>`;

                            if (vecCached) {
                                vecCached.setLatLngs(latLngs);
                                vecCached.setTooltipContent(tooltipContent);
                            } else {
                                const polyline = L.polyline(latLngs, {
                                    color: '#2980b9',
                                    weight: 3,
                                    opacity: 0.7,
                                    dashArray: '6, 8'
                                }).addTo(CitizenMap.vectorLayer);

                                polyline.bindTooltip(tooltipContent, {
                                    sticky: true,
                                    direction: 'top'
                                });
                                CitizenMap.vectorLines[vectorKey] = polyline;
                            }
                        }
                    } else {
                        // Squad is not sharing location or coordinates unavailable
                        CitizenMap.removeTeamMarker(squadId);
                    }
                } else {
                    const squadId = req.assignedSquadId || req.team;
                    if (squadId) CitizenMap.removeTeamMarker(squadId);
                }
            } catch (err) {
                // Ignore individual telemetry fetch errors (e.g. 403 on privacy)
            }
        }

        // Clean up team markers that are no longer active
        Object.keys(CitizenMap.teamMarkers).forEach(sId => {
            if (!activeTeamIds.has(sId)) {
                CitizenMap.removeTeamMarker(sId);
            }
        });
    },

    removeTeamMarker: (squadId) => {
        if (CitizenMap.teamMarkers[squadId]) {
            CitizenMap.teamLayer.removeLayer(CitizenMap.teamMarkers[squadId].marker);
            if (CitizenMap.teamMarkers[squadId].circle) {
                CitizenMap.teamLayer.removeLayer(CitizenMap.teamMarkers[squadId].circle);
            }
            delete CitizenMap.teamMarkers[squadId];
        }
        // Remove associated vector lines
        Object.keys(CitizenMap.vectorLines).forEach(key => {
            if (key.startsWith(`${squadId}->`)) {
                CitizenMap.vectorLayer.removeLayer(CitizenMap.vectorLines[key]);
                delete CitizenMap.vectorLines[key];
            }
        });
    },

    clearRequestAndTeamMarkers: () => {
        CitizenMap.requestLayer.clearLayers();
        CitizenMap.teamLayer.clearLayers();
        CitizenMap.vectorLayer.clearLayers();
        CitizenMap.requestMarkers = {};
        CitizenMap.teamMarkers = {};
        CitizenMap.vectorLines = {};
    },

    renderCenters: (centers) => {
        const countBadge = document.getElementById('citizen-center-count');
        const listContainer = document.getElementById('citizen-centers-list');

        if (countBadge) countBadge.textContent = centers.length;

        if (listContainer) {
            listContainer.innerHTML = '';
            if (centers.length === 0) {
                listContainer.innerHTML = '<div class="text-muted" style="padding:10px; font-size:12px;">No relief centres registered.</div>';
            } else {
                centers.forEach(c => {
                    const cap = c.capacity || c.maxCapacity || 100;
                    const cur = c.current !== undefined ? c.current : (c.currentOccupancy !== undefined ? c.currentOccupancy : 0);
                    const hasCoords = (c.latitude && c.longitude && MapApp.isValidCoordinate(c.latitude, c.longitude));

                    const isDemo = !!c.isDemonstration;
                    const avail = (cap - cur > 0) ? (cap - cur) : 0;

                    listContainer.innerHTML += `
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; margin-bottom:8px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <strong style="font-size:12px; color:var(--primary);">${c.name}</strong>
                                ${hasCoords ? (isDemo ? '<span class="badge" style="background:#f39c12; color:#fff; font-size:10px;">Demo Shelter</span>' : '<span class="badge" style="background:#27ae60; color:#fff; font-size:10px;">Verified Facility</span>') : '<span class="badge" style="background:#94a3b8; color:#fff; font-size:10px;">Graph Node</span>'}
                            </div>
                            <div style="font-size:11px; color:#64748b; margin-top:3px; display:flex; justify-content:space-between;">
                                <span><i class="fas fa-map-marker-alt"></i> ${c.location || c.locationNode || 'Pune Zone'}</span>
                                <span><i class="fas fa-users"></i> ${cur}/${cap} (Open: <b>${avail}</b>)</span>
                            </div>
                            <div style="font-size:10px; color:#64748b; margin-top:3px; display:flex; justify-content:space-between; align-items:center;">
                                <span><i class="fas fa-phone-alt"></i> ${c.contactNumber || '020-25501269'}</span>
                                ${hasCoords ? `<button class="btn btn-sm btn-outline" style="padding:1px 6px; font-size:9px;" onclick="CitizenMap.map.setView([${c.latitude}, ${c.longitude}], 15); if(CitizenMap.centerMarkers['${c.id || c.name}']) CitizenMap.centerMarkers['${c.id || c.name}'].openPopup();"><i class="fas fa-search-location"></i> View</button>` : ''}
                            </div>
                            ${!hasCoords ? `
                                <div style="font-size:10px; color:#94a3b8; margin-top:4px; font-style:italic;">
                                    Topological routing node only (no GPS coordinates recorded).
                                </div>
                            ` : ''}
                        </div>
                    `;

                    // If physical coordinates are present on the centre model, plot marker
                    if (hasCoords) {
                        const latLng = [c.latitude, c.longitude];
                        if (!CitizenMap.centerMarkers[c.id || c.name]) {
                            const centerIcon = L.divIcon({
                                className: 'custom-map-icon',
                                html: `
                                    <div class="map-pin-container" style="color:#27ae60;">
                                        <div class="map-pin-badge" style="background:#27ae60; box-shadow:0 0 8px rgba(39,174,96,0.6);">
                                            <i class="fas fa-campground"></i>
                                        </div>
                                        <div class="map-pin-label">${c.name}</div>
                                    </div>
                                `,
                                iconSize: [36, 36],
                                iconAnchor: [18, 18],
                                popupAnchor: [0, -18]
                            });

                            const marker = L.marker(latLng, { icon: centerIcon });
                            marker.bindPopup(`
                                <div class="map-popup-card">
                                    <div class="map-popup-header">
                                        <h4><i class="fas fa-campground"></i> ${c.name}</h4>
                                        ${isDemo ? '<span class="badge" style="background:#f39c12; color:#fff;">DEMO SHELTER</span>' : '<span class="badge" style="background:#27ae60; color:#fff;">VERIFIED FACILITY</span>'}
                                    </div>
                                    <div class="map-popup-body">
                                        <div><b>Area / Locality:</b> ${c.location || 'Pune Base Camp'}</div>
                                        <div><b>Capacity:</b> ${cur} / ${cap} (Available: <b>${avail}</b>)</div>
                                        <div><b>Contact:</b> ${c.contactNumber || '020-25501269'}</div>
                                        <div><b>Coordinates:</b> <code>${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}</code></div>
                                        <div style="margin-top:4px;"><b>Status:</b> <span class="badge" style="background:#2ecc71; color:#fff;">OPERATIONAL</span></div>
                                    </div>
                                    <div class="map-popup-footer" style="margin-top:8px;">
                                        <a href="https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}" target="_blank" rel="noopener" class="btn btn-sm btn-outline" style="width:100%; text-align:center; display:block;">
                                            <i class="fas fa-directions"></i> Get Directions
                                        </a>
                                    </div>
                                </div>
                            `);
                            marker.addTo(CitizenMap.centerLayer);
                            CitizenMap.centerMarkers[c.id || c.name] = marker;
                        }
                    }
                });
            }
        }
    },

    selectRequest: (reqId) => {
        CitizenMap.selectedRequestId = reqId;
        const cached = CitizenMap.requestMarkers[reqId];
        if (cached && CitizenMap.map) {
            CitizenMap.map.setView(cached.marker.getLatLng(), 15, { animate: true });
            cached.marker.openPopup();
            CitizenMap.renderRequestDetailPanel(cached.data);
        }
    },

    clearSelection: () => {
        CitizenMap.selectedRequestId = null;
        CitizenMap.loadCitizenData();
    },

    renderRequestDetailPanel: (req) => {
        const panel = document.getElementById('citizen-map-detail-panel');
        if (!panel) return;

        const isCritical = (req.severity === 'CRITICAL' || req.severity === 'HIGH');
        const assignedSquad = req.assignedSquadId || req.team;

        let teamTrackingHtml = '';
        if (assignedSquad) {
            const cachedTeam = CitizenMap.teamMarkers[assignedSquad];
            if (cachedTeam && cachedTeam.data) {
                const loc = cachedTeam.data;
                const dist = (MapApp.isValidCoordinate(req.latitude, req.longitude) && MapApp.isValidCoordinate(loc.latitude, loc.longitude)) ? MapApp.calculateDistanceKm(loc.latitude, loc.longitude, req.latitude, req.longitude) : null;

                teamTrackingHtml = `
                    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:10px; margin-top:10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong style="color:#15803d; font-size:12px;"><i class="fas fa-shield-alt"></i> Rescue Squad: ${assignedSquad}</strong>
                            <span class="badge" style="background:#16a34a; color:#fff; font-size:10px;">${loc.freshness || 'LIVE'}</span>
                        </div>
                        <div style="font-size:11px; color:#166534; margin-top:4px;">
                            ${dist ? `<div>Straight-line distance: <b>${dist} km</b></div>` : ''}
                            <div>GPS Accuracy: ±${Math.round(loc.accuracy || 15)}m</div>
                            <div>Last signal: ${loc.lastUpdatedSecondsAgo !== undefined ? `${loc.lastUpdatedSecondsAgo}s ago` : 'Recent'}</div>
                        </div>
                        <small class="text-muted" style="font-size:10px; display:block; margin-top:4px; font-style:italic;">
                            Note: Straight line is an aerial radial indicator, not a navigation route.
                        </small>
                    </div>
                `;
            } else {
                teamTrackingHtml = `
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px; margin-top:10px; font-size:11px; color:#64748b;">
                        <i class="fas fa-info-circle"></i> <b>Assigned Squad: ${assignedSquad}</b><br>
                        Location sharing is currently inactive or coordinates are being acquired.
                    </div>
                `;
            }
        } else {
            teamTrackingHtml = `
                <div style="background:#fef9e7; border:1px solid #fde68a; border-radius:6px; padding:8px 10px; margin-top:10px; font-size:11px; color:#92400e;">
                    <i class="fas fa-clock"></i> <b>Pending Assignment:</b> Central Management is triaging response units for your area.
                </div>
            `;
        }

        panel.innerHTML = `
            <div class="card" style="border-left: 4px solid ${isCritical ? '#e74c3c' : '#3498db'};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <h3 style="margin:0; font-size:15px; color:var(--primary);">Request: ${req.id}</h3>
                    <button class="btn btn-sm btn-secondary" onclick="CitizenMap.clearSelection()" style="padding:2px 8px; font-size:11px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="font-size:12px; display:flex; flex-direction:column; gap:4px;">
                    <div><b>Category:</b> ${req.type} (${req.disaster || 'Disaster'})</div>
                    <div><b>Severity:</b> <span class="badge severity-${req.severity.toLowerCase()}">${req.severity}</span></div>
                    <div><b>Status:</b> <span class="badge status-${(req.status || 'PENDING').replace(/\s+/g, '-').toLowerCase()}">${req.status}</span></div>
                    <div><b>Location:</b> ${req.location}</div>
                    ${req.landmark ? `<div><b>Landmark:</b> ${req.landmark}</div>` : ''}
                    <div><b>People Affected:</b> ${req.people || 1}</div>
                </div>

                ${teamTrackingHtml}

                <div style="display:flex; gap:8px; margin-top:12px;">
                    <button class="btn btn-sm btn-primary" onclick="PeopleApp.viewRequest('${req.id}')" style="flex:1; justify-content:center;">
                        <i class="fas fa-eye"></i> Full Details
                    </button>
                </div>
            </div>
        `;
    },

    renderSummaryDetailPanel: (requests) => {
        const panel = document.getElementById('citizen-map-detail-panel');
        if (!panel) return;

        const activeCount = requests.filter(r => r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length;
        const assignedCount = requests.filter(r => (r.assignedSquadId || r.team) && r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length;

        panel.innerHTML = `
            <div class="card">
                <h3 style="font-size:14px; margin-bottom:8px;"><i class="fas fa-clipboard-list text-primary"></i> My Requests Summary</h3>
                <div style="font-size:12px; display:flex; flex-direction:column; gap:6px;">
                    <div style="display:flex; justify-content:space-between;">
                        <span>Total Registered:</span> <b>${requests.length}</b>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>Active Incidents:</span> <b style="color:#2980b9;">${activeCount}</b>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>Assigned Dispatches:</span> <b style="color:#27ae60;">${assignedCount}</b>
                    </div>
                </div>
                <p class="text-muted" style="font-size:11px; margin-top:10px; margin-bottom:0;">
                    Click any marker on the map to inspect incident coordinates, severity, and live assigned rescue squad telemetry.
                </p>
            </div>
        `;
    },

    renderEmptyDetailPanel: (message) => {
        const panel = document.getElementById('citizen-map-detail-panel');
        if (!panel) return;
        panel.innerHTML = `
            <div class="card text-center" style="padding:20px 14px; color:#718096;">
                <i class="fas fa-map-marked-alt fa-2x mb-1" style="opacity:0.4;"></i>
                <div style="font-size:12px; margin-top:6px;">${message}</div>
            </div>
        `;
    },

    fitBounds: () => {
        if (!CitizenMap.map) return;
        const allLatLngs = [];

        Object.values(CitizenMap.requestMarkers).forEach(m => {
            allLatLngs.push(m.marker.getLatLng());
        });
        Object.values(CitizenMap.teamMarkers).forEach(m => {
            allLatLngs.push(m.marker.getLatLng());
        });
        Object.values(CitizenMap.centerMarkers).forEach(m => {
            allLatLngs.push(m.getLatLng());
        });

        if (allLatLngs.length > 0) {
            const bounds = L.latLngBounds(allLatLngs);
            CitizenMap.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } else {
            CitizenMap.map.setView([18.5204, 73.8567], 12);
        }
    },

    // Curated Pune locality jump for citizen map
    panToLocality: (locName) => {
        if (!locName || locName === '') return;
        const found = PUNE_LOCALITIES.find(l => l.name.toLowerCase().includes(locName.toLowerCase()) || l.id === locName);
        if (found && CitizenMap.map) {
            CitizenMap.map.setView([found.lat, found.lon], 14, { animate: true });
        }
    },

    startAutoRefresh: () => {
        CitizenMap.stopAutoRefresh();
        CitizenMap.refreshTimer = setInterval(() => {
            const mapSec = document.getElementById('view-people-map');
            if (mapSec && !mapSec.classList.contains('hidden')) {
                CitizenMap.loadCitizenData();
            } else {
                CitizenMap.stopAutoRefresh();
            }
        }, CitizenMap.pollIntervalMs);
    },

    stopAutoRefresh: () => {
        if (CitizenMap.refreshTimer) {
            clearInterval(CitizenMap.refreshTimer);
            CitizenMap.refreshTimer = null;
        }
    }
};

const TeamMissionMap = {
    map: null,
    tileLayer: null,
    squadLayer: null,
    missionLayer: null,
    vectorLayer: null,

    // Caches
    squadMarker: null,
    squadCircle: null,
    missionMarkers: {},
    vectorLines: {},

    // State
    selectedMissionId: null,
    refreshTimer: null,
    isRefreshing: false,
    pollIntervalMs: 5000,
    hasFitInitialBounds: false,

    init: () => {
        if (typeof L === 'undefined') return;
        const container = document.getElementById('team-mission-interactive-map');
        if (!container || TeamMissionMap.map) return;

        try {
            TeamMissionMap.map = L.map('team-mission-interactive-map', {
                center: [18.5204, 73.8567],
                zoom: 12,
                zoomControl: true,
                attributionControl: true
            });

            TeamMissionMap.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(TeamMissionMap.map);

            TeamMissionMap.vectorLayer = L.layerGroup().addTo(TeamMissionMap.map);
            TeamMissionMap.missionLayer = L.layerGroup().addTo(TeamMissionMap.map);
            TeamMissionMap.squadLayer = L.layerGroup().addTo(TeamMissionMap.map);

            TeamMissionMap.map.on('click', (e) => {
                if (e.originalEvent && e.originalEvent.target && e.originalEvent.target.id === 'team-mission-interactive-map') {
                    TeamMissionMap.clearSelection();
                }
            });
        } catch (err) {
            console.error('[TeamMissionMap] Initialization error:', err);
        }
    },

    renderMap: async () => {
        TeamMissionMap.init();

        if (TeamMissionMap.map) {
            setTimeout(() => {
                TeamMissionMap.map.invalidateSize();
            }, 100);
        }

        await TeamMissionMap.refreshData();
        TeamMissionMap.startAutoRefresh();
    },

    refreshData: async () => {
        if (TeamMissionMap.isRefreshing) return;
        TeamMissionMap.isRefreshing = true;

        const teamId = TeamLeaderApp.currentTeamId || sessionStorage.getItem('activeTeamLeaderId') || 'T-101';

        try {
            // Fetch telemetry and missions concurrently
            const [locRes, missionsRes] = await Promise.all([
                ApiBridge.getTeamLocation(teamId).catch(e => ({ ok: false, error: e })),
                ApiBridge.getTeamMissions(teamId).catch(e => ({ ok: false, error: e }))
            ]);

            const loc = (locRes.ok && locRes.data && locRes.data.success) ? locRes.data.data : null;
            const missions = (missionsRes.ok && missionsRes.data && missionsRes.data.success && Array.isArray(missionsRes.data.missions)) ? missionsRes.data.missions : (TeamLeaderApp.missions || []);

            // Update GPS badge and buttons in map header
            TeamMissionMap.updateHeaderControls(loc);

            // Update Squad Marker
            TeamMissionMap.updateSquadMarker(loc, teamId);

            // Update Mission Markers and straight-line vectors
            TeamMissionMap.updateMissionMarkers(missions, loc);

            // Render mission directives in side list
            TeamMissionMap.renderMissionList(missions);

            // Render details panel
            if (TeamMissionMap.selectedMissionId) {
                const selMission = missions.find(m => m.id === TeamMissionMap.selectedMissionId);
                if (selMission) {
                    TeamMissionMap.renderMissionDetailPanel(selMission, loc);
                } else {
                    TeamMissionMap.renderSquadTelemetryPanel(loc, teamId, missions);
                }
            } else {
                TeamMissionMap.renderSquadTelemetryPanel(loc, teamId, missions);
            }

            // Auto fit bounds on initial load
            if (!TeamMissionMap.hasFitInitialBounds) {
                TeamMissionMap.fitBounds();
                TeamMissionMap.hasFitInitialBounds = true;
            }

        } catch (err) {
            console.error('[TeamMissionMap] Synchronization error:', err);
        } finally {
            TeamMissionMap.isRefreshing = false;
        }
    },

    updateHeaderControls: (loc) => {
        const badge = document.getElementById('tl-map-freshness-badge');
        const startBtn = document.getElementById('tl-map-btn-start-sharing');
        const stopBtn = document.getElementById('tl-map-btn-stop-sharing');

        const isSharing = TeamLeaderApp.isSharingLocation || (loc && loc.isSharing);

        if (startBtn && stopBtn) {
            if (isSharing) {
                startBtn.style.display = 'none';
                stopBtn.style.display = 'inline-flex';
            } else {
                startBtn.style.display = 'inline-flex';
                stopBtn.style.display = 'none';
            }
        }

        if (badge) {
            if (!loc || loc.freshness === 'LOCATION_UNAVAILABLE' || (loc.latitude === 0 && loc.longitude === 0)) {
                badge.className = 'badge';
                badge.style.background = isSharing ? '#007bff' : '#6c757d';
                badge.textContent = isSharing ? 'ACQUIRING GPS...' : 'NOT SHARING';
            } else if (isSharing) {
                const nowSec = Math.floor(Date.now() / 1000);
                const elapsed = (nowSec >= loc.timestamp && loc.timestamp > 0) ? (nowSec - loc.timestamp) : 0;
                if (elapsed <= 60) {
                    badge.className = 'badge';
                    badge.style.background = '#28a745';
                    badge.innerHTML = `<i class="fas fa-satellite"></i> LIVE (${elapsed}s)`;
                } else {
                    badge.className = 'badge';
                    badge.style.background = '#fd7e14';
                    badge.innerHTML = `<i class="fas fa-exclamation-triangle"></i> STALE (${elapsed}s)`;
                }
            } else {
                badge.className = 'badge';
                badge.style.background = '#6c757d';
                badge.textContent = 'NOT SHARING';
            }
        }
    },

    updateSquadMarker: (loc, teamId) => {
        if (!loc || !MapApp.isValidCoordinate(loc.latitude, loc.longitude)) {
            if (TeamMissionMap.squadMarker) {
                TeamMissionMap.squadLayer.removeLayer(TeamMissionMap.squadMarker);
                TeamMissionMap.squadMarker = null;
            }
            if (TeamMissionMap.squadCircle) {
                TeamMissionMap.squadLayer.removeLayer(TeamMissionMap.squadCircle);
                TeamMissionMap.squadCircle = null;
            }
            return;
        }

        const latLng = [loc.latitude, loc.longitude];
        const isSharing = TeamLeaderApp.isSharingLocation || loc.isSharing;
        let freshness = loc.freshness;
        const nowSec = Math.floor(Date.now() / 1000);
        const elapsed = (nowSec >= loc.timestamp && loc.timestamp > 0) ? (nowSec - loc.timestamp) : 0;

        if (!isSharing) freshness = 'NOT_SHARING';
        else if (elapsed <= 60) freshness = 'LIVE';
        else freshness = 'STALE';

        const isSim = !!loc.isSimulated;
        const icon = MapApp.createTeamIcon(freshness, isSim, teamId);

        const popupHtml = `
            <div class="map-popup-card">
                <div class="map-popup-header">
                    <h4><i class="fas fa-shield-alt"></i> My Rescue Unit: ${teamId}</h4>
                    <span class="badge" style="background:#28a745; color:#fff;">${freshness}</span>
                </div>
                <div class="map-popup-body">
                    <div><b>Latitude:</b> <code>${loc.latitude.toFixed(6)}</code></div>
                    <div><b>Longitude:</b> <code>${loc.longitude.toFixed(6)}</code></div>
                    <div><b>Accuracy:</b> ±${Math.round(loc.accuracy || 15)}m</div>
                    <div><b>Updated:</b> ${elapsed}s ago</div>
                    ${isSim ? '<div class="text-warning"><b>Mode:</b> Simulated GPS Test</div>' : ''}
                </div>
            </div>
        `;

        if (TeamMissionMap.squadMarker) {
            TeamMissionMap.squadMarker.setLatLng(latLng);
            TeamMissionMap.squadMarker.setIcon(icon);
            TeamMissionMap.squadMarker.setPopupContent(popupHtml);
        } else {
            TeamMissionMap.squadMarker = L.marker(latLng, { icon: icon, zIndexOffset: 1000 });
            TeamMissionMap.squadMarker.bindPopup(popupHtml, { maxWidth: 300 });
            TeamMissionMap.squadMarker.addTo(TeamMissionMap.squadLayer);
        }

        if (loc.accuracy > 0) {
            if (TeamMissionMap.squadCircle) {
                TeamMissionMap.squadCircle.setLatLng(latLng);
                TeamMissionMap.squadCircle.setRadius(loc.accuracy);
            } else {
                TeamMissionMap.squadCircle = L.circle(latLng, {
                    radius: loc.accuracy,
                    color: isSim ? '#f39c12' : '#2ecc71',
                    fillColor: isSim ? '#f1c40f' : '#2ecc71',
                    fillOpacity: 0.12,
                    weight: 1
                }).addTo(TeamMissionMap.squadLayer);
            }
        } else if (TeamMissionMap.squadCircle) {
            TeamMissionMap.squadLayer.removeLayer(TeamMissionMap.squadCircle);
            TeamMissionMap.squadCircle = null;
        }
    },

    updateMissionMarkers: (missions, squadLoc) => {
        const processedMissionIds = new Set();
        const hasSquadCoords = squadLoc && MapApp.isValidCoordinate(squadLoc.latitude, squadLoc.longitude);

        missions.forEach(m => {
            processedMissionIds.add(m.id);

            if (!MapApp.isValidCoordinate(m.latitude, m.longitude)) {
                if (TeamMissionMap.missionMarkers[m.id]) {
                    TeamMissionMap.missionLayer.removeLayer(TeamMissionMap.missionMarkers[m.id].marker);
                    delete TeamMissionMap.missionMarkers[m.id];
                }
                return;
            }

            const latLng = [m.latitude, m.longitude];
            const isCritical = (m.severity === 'CRITICAL' || m.severity === 'HIGH');
            const isCompleted = (m.status === 'COMPLETED');
            let pinClass = isCritical ? 'request-pin-critical' : 'request-pin-active';
            let iconHtml = isCritical ? '<i class="fas fa-exclamation-triangle"></i>' : '<i class="fas fa-bullseye"></i>';

            if (isCompleted) {
                pinClass = 'request-pin-completed';
                iconHtml = '<i class="fas fa-check"></i>';
            }

            const icon = L.divIcon({
                className: 'custom-map-icon',
                html: `
                    <div class="map-pin-container ${pinClass}">
                        <div class="map-pin-badge">
                            ${iconHtml}
                        </div>
                        <div class="map-pin-label">${m.id}</div>
                        ${isCritical ? '<div class="map-pin-pulse-alert"></div>' : ''}
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -18]
            });

            let actionButtons = '';
            if (m.status === 'ASSIGNED') {
                actionButtons = `<button class="btn btn-sm btn-warning" onclick="TeamLeaderApp.startMission('${m.id}'); TeamMissionMap.refreshData();"><i class="fas fa-play"></i> Start Mission</button>`;
            } else if (m.status === 'IN PROGRESS' || m.status === 'IN_PROGRESS') {
                actionButtons = `<button class="btn btn-sm btn-success" onclick="TeamLeaderApp.completeMission('${m.id}'); TeamMissionMap.refreshData();"><i class="fas fa-check"></i> Mark Complete</button>`;
            } else {
                actionButtons = `<span class="badge" style="background:#e2e8f0; color:#718096;"><i class="fas fa-lock"></i> Resolved</span>`;
            }

            const popupHtml = `
                <div class="map-popup-card">
                    <div class="map-popup-header">
                        <h4><i class="fas fa-bullseye"></i> Mission ${m.id}</h4>
                        <span class="badge severity-${m.severity.toLowerCase()}">${m.severity}</span>
                    </div>
                    <div class="map-popup-body">
                        <div><b>Disaster:</b> ${m.disaster || 'Disaster Relief'}</div>
                        <div><b>Status:</b> <span class="badge status-${(m.status || 'ASSIGNED').replace(/\s+/g, '-').toLowerCase()}">${m.status}</span></div>
                        <div><b>Destination:</b> ${m.location}</div>
                        ${m.landmark ? `<div><b>Landmark:</b> ${m.landmark}</div>` : ''}
                        <div><b>People Affected:</b> ${m.people || 1}</div>
                        <div><b>Citizen:</b> ${m.name} (${m.phone})</div>
                    </div>
                    <div class="map-popup-footer" style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                        <button class="btn btn-sm btn-secondary" onclick="TeamLeaderApp.viewMissionDetails('${m.id}')">
                            <i class="fas fa-eye"></i> Details
                        </button>
                        ${actionButtons}
                    </div>
                </div>
            `;

            let cached = TeamMissionMap.missionMarkers[m.id];
            if (cached) {
                cached.marker.setLatLng(latLng);
                cached.marker.setIcon(icon);
                cached.marker.setPopupContent(popupHtml);
                cached.data = m;
            } else {
                const marker = L.marker(latLng, { icon: icon });
                marker.bindPopup(popupHtml, { maxWidth: 320 });
                marker.on('click', () => {
                    TeamMissionMap.selectMission(m.id);
                });
                marker.addTo(TeamMissionMap.missionLayer);
                TeamMissionMap.missionMarkers[m.id] = { marker, data: m };
            }

            // Draw straight-line vector from squad to mission if not completed
            if (hasSquadCoords && m.status !== 'COMPLETED') {
                const dist = MapApp.calculateDistanceKm(squadLoc.latitude, squadLoc.longitude, m.latitude, m.longitude);
                const vectorKey = `squad->${m.id}`;
                const latLngs = [[squadLoc.latitude, squadLoc.longitude], latLng];
                const tooltipContent = `<div style="font-size:11px; text-align:center;"><b>Straight-line Distance:</b> ${dist} km<br><small class="text-muted">(Estimated radial distance; not a road route)</small></div>`;

                let vecCached = TeamMissionMap.vectorLines[vectorKey];
                if (vecCached) {
                    vecCached.setLatLngs(latLngs);
                    vecCached.setTooltipContent(tooltipContent);
                } else {
                    const polyline = L.polyline(latLngs, {
                        color: isCritical ? '#e74c3c' : '#3498db',
                        weight: 3,
                        opacity: 0.75,
                        dashArray: '6, 8'
                    }).addTo(TeamMissionMap.vectorLayer);

                    polyline.bindTooltip(tooltipContent, {
                        sticky: true,
                        direction: 'top'
                    });
                    TeamMissionMap.vectorLines[vectorKey] = polyline;
                }
            } else {
                const vectorKey = `squad->${m.id}`;
                if (TeamMissionMap.vectorLines[vectorKey]) {
                    TeamMissionMap.vectorLayer.removeLayer(TeamMissionMap.vectorLines[vectorKey]);
                    delete TeamMissionMap.vectorLines[vectorKey];
                }
            }
        });

        // Clean up deleted mission markers
        Object.keys(TeamMissionMap.missionMarkers).forEach(id => {
            if (!processedMissionIds.has(id)) {
                TeamMissionMap.missionLayer.removeLayer(TeamMissionMap.missionMarkers[id].marker);
                delete TeamMissionMap.missionMarkers[id];

                const vectorKey = `squad->${id}`;
                if (TeamMissionMap.vectorLines[vectorKey]) {
                    TeamMissionMap.vectorLayer.removeLayer(TeamMissionMap.vectorLines[vectorKey]);
                    delete TeamMissionMap.vectorLines[vectorKey];
                }
            }
        });
    },

    renderMissionList: (missions) => {
        const countBadge = document.getElementById('tl-map-mission-count');
        const listContainer = document.getElementById('team-map-mission-list');

        if (countBadge) countBadge.textContent = missions.length;

        if (listContainer) {
            listContainer.innerHTML = '';
            if (missions.length === 0) {
                listContainer.innerHTML = '<div class="text-muted" style="padding:10px; font-size:12px;">No missions dispatched to your unit yet.</div>';
                return;
            }

            missions.forEach(m => {
                const isCritical = (m.severity === 'CRITICAL');
                const hasCoords = MapApp.isValidCoordinate(m.latitude, m.longitude);

                listContainer.innerHTML += `
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; margin-bottom:8px; cursor:pointer;" onclick="TeamMissionMap.selectMission('${m.id}')">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong style="font-size:12px; color:var(--primary);">${m.id} — ${m.disaster || 'Relief'}</strong>
                            <span class="badge severity-${m.severity.toLowerCase()}">${m.severity}</span>
                        </div>
                        <div style="font-size:11px; color:#64748b; margin-top:3px;">
                            <span><i class="fas fa-map-marker-alt"></i> ${m.location}</span> |
                            <span><i class="fas fa-users"></i> ${m.people || 1}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                            <span class="badge status-${(m.status || 'ASSIGNED').replace(/\s+/g, '-').toLowerCase()}" style="font-size:10px;">${m.status}</span>
                            ${hasCoords ? '<small style="color:#27ae60;"><i class="fas fa-crosshairs"></i> Mapped</small>' : '<small class="text-muted">No coords</small>'}
                        </div>
                    </div>
                `;
            });
        }
    },

    selectMission: (missionId) => {
        TeamMissionMap.selectedMissionId = missionId;
        const cached = TeamMissionMap.missionMarkers[missionId];
        if (cached && TeamMissionMap.map) {
            TeamMissionMap.map.setView(cached.marker.getLatLng(), 15, { animate: true });
            cached.marker.openPopup();
            const squadLoc = TeamLeaderApp.lastLocationUpdate;
            TeamMissionMap.renderMissionDetailPanel(cached.data, squadLoc);
        }
    },

    clearSelection: () => {
        TeamMissionMap.selectedMissionId = null;
        TeamMissionMap.refreshData();
    },

    renderMissionDetailPanel: (m, squadLoc) => {
        const panel = document.getElementById('team-map-detail-panel');
        if (!panel) return;

        const isCritical = (m.severity === 'CRITICAL');
        let distHtml = '';
        if (squadLoc && MapApp.isValidCoordinate(squadLoc.latitude, squadLoc.longitude) && MapApp.isValidCoordinate(m.latitude, m.longitude)) {
            const dist = MapApp.calculateDistanceKm(squadLoc.latitude, squadLoc.longitude, m.latitude, m.longitude);
            distHtml = `
                <div style="background:#eef6fc; border-left:4px solid #3498db; padding:6px 10px; margin-top:8px; font-size:11px; color:#2c3e50;">
                    <b>Straight-line Distance to Target:</b> ${dist} km<br>
                    <small class="text-muted">(Aerial direct measurement; terrain and road routes may vary)</small>
                </div>
            `;
        }

        let actionBtn = '';
        if (m.status === 'ASSIGNED') {
            actionBtn = `<button class="btn btn-sm btn-warning" onclick="TeamLeaderApp.startMission('${m.id}'); TeamMissionMap.refreshData();" style="flex:1; justify-content:center;"><i class="fas fa-play"></i> Start Mission</button>`;
        } else if (m.status === 'IN PROGRESS' || m.status === 'IN_PROGRESS') {
            actionBtn = `<button class="btn btn-sm btn-success" onclick="TeamLeaderApp.completeMission('${m.id}'); TeamMissionMap.refreshData();" style="flex:1; justify-content:center;"><i class="fas fa-check"></i> Mark Completed</button>`;
        }

        panel.innerHTML = `
            <div class="card" style="border-left: 4px solid ${isCritical ? '#e74c3c' : '#3498db'};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <h3 style="margin:0; font-size:15px; color:var(--primary);">Mission Directive: ${m.id}</h3>
                    <button class="btn btn-sm btn-secondary" onclick="TeamMissionMap.clearSelection()" style="padding:2px 8px; font-size:11px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="font-size:12px; display:flex; flex-direction:column; gap:4px;">
                    <div><b>Disaster:</b> ${m.disaster || 'Disaster Relief'}</div>
                    <div><b>Severity:</b> <span class="badge severity-${m.severity.toLowerCase()}">${m.severity}</span></div>
                    <div><b>Status:</b> <span class="badge status-${(m.status || 'ASSIGNED').replace(/\s+/g, '-').toLowerCase()}">${m.status}</span></div>
                    <div><b>Destination:</b> ${m.location}</div>
                    ${m.landmark ? `<div><b>Landmark:</b> ${m.landmark}</div>` : ''}
                    <div><b>Citizen:</b> ${m.name} (${m.phone})</div>
                    <div><b>People Affected:</b> ${m.people || 1}</div>
                    ${m.directions ? `<div><b>Access Notes:</b> ${m.directions}</div>` : ''}
                </div>

                ${distHtml}

                <div style="display:flex; gap:8px; margin-top:12px;">
                    <button class="btn btn-sm btn-secondary" onclick="TeamLeaderApp.viewMissionDetails('${m.id}')" style="flex:1; justify-content:center;">
                        <i class="fas fa-eye"></i> Full Directives
                    </button>
                    ${actionBtn}
                </div>
            </div>
        `;
    },

    renderSquadTelemetryPanel: (loc, teamId, missions) => {
        const panel = document.getElementById('team-map-detail-panel');
        if (!panel) return;

        const isSharing = TeamLeaderApp.isSharingLocation || (loc && loc.isSharing);
        const hasCoords = loc && MapApp.isValidCoordinate(loc.latitude, loc.longitude);
        const activeMissions = missions.filter(m => m.status === 'IN PROGRESS' || m.status === 'IN_PROGRESS' || m.status === 'ASSIGNED');

        panel.innerHTML = `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <h3 style="font-size:14px; margin:0;"><i class="fas fa-shield-alt text-primary"></i> Unit Telemetry</h3>
                    <span class="badge" style="background:${isSharing ? '#28a745' : '#6c757d'}; color:#fff; font-size:10px;">${isSharing ? 'GPS ACTIVE' : 'IDLE'}</span>
                </div>
                <div style="font-size:12px; display:flex; flex-direction:column; gap:5px;">
                    <div><b>Squad ID:</b> ${teamId}</div>
                    <div><b>Position:</b> ${hasCoords ? `<code>${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}</code>` : '<span class="text-muted">Coordinates not acquired</span>'}</div>
                    <div><b>Confidence Radius:</b> ${hasCoords ? `±${Math.round(loc.accuracy || 15)}m` : '--'}</div>
                    <div><b>Active Operations:</b> ${activeMissions.length} assigned target(s)</div>
                </div>
                <div style="display:flex; gap:8px; margin-top:12px;">
                    <button class="btn btn-sm btn-secondary" onclick="TeamMissionMap.centerOnSquad()" style="flex:1; justify-content:center;">
                        <i class="fas fa-crosshairs"></i> Center Squad
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="TeamMissionMap.fitBounds()" style="flex:1; justify-content:center;">
                        <i class="fas fa-expand-arrows-alt"></i> Fit All
                    </button>
                </div>
            </div>
        `;
    },

    centerOnSquad: () => {
        if (!TeamMissionMap.map) return;
        if (TeamMissionMap.squadMarker) {
            TeamMissionMap.map.setView(TeamMissionMap.squadMarker.getLatLng(), 15, { animate: true });
        } else {
            App.showToast('Squad GPS coordinates are not yet available to center map.', 'info');
        }
    },

    fitBounds: () => {
        if (!TeamMissionMap.map) return;
        const allLatLngs = [];

        if (TeamMissionMap.squadMarker) {
            allLatLngs.push(TeamMissionMap.squadMarker.getLatLng());
        }
        Object.values(TeamMissionMap.missionMarkers).forEach(m => {
            allLatLngs.push(m.marker.getLatLng());
        });

        if (allLatLngs.length > 0) {
            const bounds = L.latLngBounds(allLatLngs);
            TeamMissionMap.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } else {
            TeamMissionMap.map.setView([18.5204, 73.8567], 12);
        }
    },

    startAutoRefresh: () => {
        TeamMissionMap.stopAutoRefresh();
        TeamMissionMap.refreshTimer = setInterval(() => {
            const mapSec = document.getElementById('view-team-map');
            if (mapSec && !mapSec.classList.contains('hidden')) {
                TeamMissionMap.refreshData();
            } else {
                TeamMissionMap.stopAutoRefresh();
            }
        }, TeamMissionMap.pollIntervalMs);
    },

    stopAutoRefresh: () => {
        if (TeamMissionMap.refreshTimer) {
            clearInterval(TeamMissionMap.refreshTimer);
            TeamMissionMap.refreshTimer = null;
        }
    }
};
