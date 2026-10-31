// ============================================================================
// RT-DRMS Frontend API Helper
// ============================================================================
// Communicates with Node.js bridge at /api/* which routes directly to the
// persistent backend.exe process over standard I/O (stdin/stdout).
// ============================================================================

const ApiBridge = {
    baseUrl: '/api',
    isLive: false,
    lastCheckTime: null,

    // Generic JSON request wrapper
    request: async (endpoint, options = {}) => {
        const url = `${ApiBridge.baseUrl}${endpoint}`;
        const mgmtToken = (typeof sessionStorage !== 'undefined') ? sessionStorage.getItem('mgmtToken') : null;
        const squadToken = (typeof sessionStorage !== 'undefined') ? sessionStorage.getItem('squadToken') : null;
        const token = mgmtToken || squadToken;

        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(url, config);
            let data = null;
            try {
                data = await response.json();
            } catch (jsonErr) {
                data = { success: false, message: 'Invalid JSON response from server.' };
            }

            return {
                ok: response.ok,
                status: response.status,
                data: data
            };
        } catch (netErr) {
            console.warn(`[ApiBridge] Network error on ${url}:`, netErr.message);
            return {
                ok: false,
                status: 0,
                data: {
                    success: false,
                    message: 'Network error: Unable to connect to C++ backend bridge server.'
                }
            };
        }
    },

    // 1. Health check
    checkHealth: async () => {
        const res = await ApiBridge.request('/health', { method: 'GET' });
        ApiBridge.lastCheckTime = new Date();
        if (res.ok && res.data && res.data.success && res.data.status === 'ok') {
            ApiBridge.isLive = true;
            return { online: true, details: res.data };
        } else {
            ApiBridge.isLive = false;
            return { online: false, details: res.data };
        }
    },

    // 2. Fetch system statistics
    getStats: async () => {
        const res = await ApiBridge.request('/stats', { method: 'GET' });
        return res;
    },

    // 3. Get all relief requests / Execute C++ Search & Sort
    getRequests: async (params = null) => {
        let endpoint = '/requests';
        if (params && typeof params === 'object') {
            const sp = new URLSearchParams();
            for (const [k, v] of Object.entries(params)) {
                if (v !== undefined && v !== null && v !== '') {
                    sp.append(k, v);
                }
            }
            const qs = sp.toString();
            if (qs) endpoint += `?${qs}`;
        }
        const res = await ApiBridge.request(endpoint, { method: 'GET' });
        return res;
    },

    // 4. Submit new relief request
    submitRequest: async (reqData) => {
        const res = await ApiBridge.request('/requests', {
            method: 'POST',
            body: JSON.stringify(reqData)
        });
        return res;
    },

    // 5. Track request with dual-key verification (ID + contact phone)
    trackRequest: async (requestId, phone) => {
        const encodedPhone = encodeURIComponent(phone.trim());
        const res = await ApiBridge.request(`/requests/${encodeURIComponent(requestId)}?phone=${encodedPhone}`, {
            method: 'GET'
        });
        return res;
    },

    // 6. Cancel request
    cancelRequest: async (requestId, phone = '') => {
        const res = await ApiBridge.request(`/requests/${encodeURIComponent(requestId)}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ phone: phone.trim() })
        });
        return res;
    },

    // 7. Get rescue teams
    getTeams: async () => {
        const res = await ApiBridge.request('/teams', { method: 'GET' });
        return res;
    },

    // 8. Get resources
    getResources: async () => {
        const res = await ApiBridge.request('/resources', { method: 'GET' });
        return res;
    },

    // 8B. Update resource quantity
    updateResource: async (resourceId, quantity) => {
        const res = await ApiBridge.request(`/resources/${encodeURIComponent(resourceId)}`, {
            method: 'POST',
            body: JSON.stringify({ quantity: parseInt(quantity, 10) })
        });
        return res;
    },

    // 9. Get relief centers
    getCenters: async () => {
        const res = await ApiBridge.request('/centers', { method: 'GET' });
        return res;
    },

    // 10. Triage request
    triageRequest: async (requestId) => {
        const res = await ApiBridge.request('/triage', {
            method: 'POST',
            body: JSON.stringify({ requestId: requestId })
        });
        return res;
    },

    // 11. Assign rescue team
    assignTeam: async (requestId, teamId) => {
        const res = await ApiBridge.request('/assign', {
            method: 'POST',
            body: JSON.stringify({ requestId: requestId, teamId: teamId })
        });
        return res;
    },

    // 12. Calculate shortest route (Dijkstra)
    calculateRoute: async (fromLocation, toLocation) => {
        const fromEnc = encodeURIComponent(fromLocation);
        const toEnc = encodeURIComponent(toLocation);
        const res = await ApiBridge.request(`/route?from=${fromEnc}&to=${toEnc}`, {
            method: 'GET'
        });
        return res;
    },

    // 13. Get Team Missions (Phase 2 - Team Leader Portal)
    getTeamMissions: async (teamId) => {
        const res = await ApiBridge.request(`/teams/${encodeURIComponent(teamId)}/missions`, {
            method: 'GET'
        });
        return res;
    },

    // 14. Update Mission Status (Phase 2 - Team Leader Field Updates)
    updateMissionStatus: async (teamId, requestId, status) => {
        const res = await ApiBridge.request(`/teams/${encodeURIComponent(teamId)}/missions/${encodeURIComponent(requestId)}/status`, {
            method: 'POST',
            body: JSON.stringify({ status })
        });
        return res;
    },

    // 15. Submit Team Location Update (Phase 3 - GPS Telemetry)
    updateTeamLocation: async (teamId, data) => {
        const res = await ApiBridge.request(`/teams/${encodeURIComponent(teamId)}/location`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return res;
    },

    // 16. Get Single Team Location (Phase 3)
    getTeamLocation: async (teamId) => {
        const res = await ApiBridge.request(`/teams/${encodeURIComponent(teamId)}/location`, {
            method: 'GET'
        });
        return res;
    },

    // 17. Get All Teams Locations (Phase 3)
    getAllTeamLocations: async () => {
        const res = await ApiBridge.request('/teams/locations', {
            method: 'GET'
        });
        return res;
    },

    // 18. Stop Location Sharing for Team (Phase 3)
    stopTeamLocation: async (teamId) => {
        const res = await ApiBridge.request(`/teams/${encodeURIComponent(teamId)}/location/stop`, {
            method: 'POST'
        });
        return res;
    },

    // 19. Set Location Freshness Threshold in seconds (Phase 3)
    setLocationThreshold: async (thresholdSeconds) => {
        const res = await ApiBridge.request('/teams/location/threshold', {
            method: 'POST',
            body: JSON.stringify({ threshold: thresholdSeconds })
        });
        return res;
    },

    // 20. Get Citizen Requests by Phone (Phase 7 - Role-Based Citizen Map)
    getCitizenRequests: async (phone) => {
        const encodedPhone = encodeURIComponent((phone || '').trim().replace(/\D/g, ''));
        const res = await ApiBridge.request(`/citizen/requests?phone=${encodedPhone}`, {
            method: 'GET'
        });
        return res;
    },

    // 21. Get Assigned Team Location for a Citizen Request (Phase 7 - Privacy Verified)
    getAssignedTeamLocation: async (requestId, phone) => {
        const encodedPhone = encodeURIComponent((phone || '').trim().replace(/\D/g, ''));
        const res = await ApiBridge.request(`/requests/${encodeURIComponent(requestId)}/team-location?phone=${encodedPhone}`, {
            method: 'GET'
        });
        return res;
    },

    // 22. Management Login (Role-based Authentication)
    login: async (username, password) => {
        const res = await ApiBridge.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        return res;
    },

    // 23. Logout Active Session
    logout: async () => {
        const res = await ApiBridge.request('/auth/logout', {
            method: 'POST'
        });
        sessionStorage.removeItem('mgmtToken');
        sessionStorage.removeItem('squadToken');
        return res;
    },

    // 24. Team Leader Authentication with Salted Password Verification
    teamLogin: async (username, password, teamId = null) => {
        const payload = { username: (username || '').trim(), password: password };
        if (teamId) payload.teamId = teamId.trim();
        const res = await ApiBridge.request('/auth/team-session', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (res.ok && res.data && res.data.success && (res.data.squadToken || res.data.token)) {
            const token = res.data.squadToken || res.data.token;
            sessionStorage.setItem('squadToken', token);
            if (res.data.teamId) {
                sessionStorage.setItem('activeTeamLeaderId', res.data.teamId);
            }
        }
        return res;
    },

    // 25. Verify Active Session
    verifyAuth: async () => {
        const res = await ApiBridge.request('/auth/verify', {
            method: 'GET'
        });
        return res;
    }
};
