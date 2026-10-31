const RequestService = {
    liveCache: [],

    // Sync in-memory cache from C++ backend
    sync: async () => {
        try {
            const res = await ApiBridge.getRequests();
            if (res.ok && res.data && res.data.success && Array.isArray(res.data.data)) {
                RequestService.liveCache = res.data.data;
                return true;
            }
        } catch (e) {
            console.warn('[RequestService] Sync failed:', e);
        }
        return false;
    },

    getAll: () => {
        if (ApiBridge.isLive && RequestService.liveCache.length > 0) {
            return RequestService.liveCache;
        }
        return Storage.get('requests');
    },

    getById: (id) => {
        if (!id) return null;
        const cleanId = id.trim().toUpperCase();
        return RequestService.getAll().find(r => (r.id || '').toUpperCase() === cleanId);
    },

    // Submit request via C++ backend if live, else demo mode
    submit: async (req) => {
        if (ApiBridge.isLive) {
            const res = await ApiBridge.submitRequest(req);
            if (res.ok && res.data && res.data.success) {
                await RequestService.sync();
                return { success: true, id: res.data.requestId, message: res.data.message };
            } else {
                const errMsg = (res.data && res.data.message) || 'C++ backend rejected request submission.';
                return { success: false, message: errMsg };
            }
        }

        // Explicit Demo Mode Fallback
        const id = RequestService.addLocal(req);
        return { success: true, id: id, message: '[Demo Mode] Request registered in local memory.' };
    },

    addLocal: (req) => {
        const requests = Storage.get('requests');
        const maxId = requests.reduce((max, r) => {
            const parts = (r.id || '').split('-');
            const num = parts.length > 1 ? parseInt(parts[1], 10) : 0;
            return !isNaN(num) && num > max ? num : max;
        }, 1000);

        req.id = 'DR-' + (maxId + 1);
        req.date = new Date().toISOString();
        req.status = 'PENDING';
        req.team = null;

        requests.push(req);
        Storage.set('requests', requests);
        return req.id;
    },

    // Track request: verifies against C++ backend with privacy phone check
    track: async (id, phone) => {
        if (ApiBridge.isLive) {
            const res = await ApiBridge.trackRequest(id, phone);
            return res;
        }

        // Demo Mode local track
        const r = RequestService.getById(id);
        if (!r) {
            return { ok: false, status: 404, data: { success: false, message: `Request ID '${id}' not found.` } };
        }
        const cleanInputPhone = phone.replace(/\D/g, '');
        const cleanRecordPhone = (r.phone || '').replace(/\D/g, '');
        if (cleanInputPhone !== cleanRecordPhone) {
            return { ok: false, status: 403, data: { success: false, message: 'Provided phone number does not match registered contact phone.' } };
        }
        return { ok: true, status: 200, data: { success: true, data: r, message: 'Request located successfully.' } };
    },

    cancel: async (id, phone = '') => {
        if (ApiBridge.isLive) {
            const res = await ApiBridge.cancelRequest(id, phone);
            if (res.ok && res.data && res.data.success) {
                await RequestService.sync();
            }
            return res.data || { success: false, message: 'Unable to cancel request on C++ backend.' };
        }

        // Demo mode local cancel
        return RequestService.cancelLocal(id);
    },

    cancelLocal: (id) => {
        const requests = Storage.get('requests');
        const req = requests.find(r => r.id === id);
        if (!req) return { success: false, message: 'Request ID not found.' };
        if (req.status === 'COMPLETED') return { success: false, message: 'Completed requests cannot be cancelled.' };
        if (req.status === 'CANCELLED') return { success: false, message: 'This request is already cancelled.' };

        const prevTeam = req.team;
        req.status = 'CANCELLED';
        req.team = null;
        Storage.set('requests', requests);

        if (prevTeam && typeof TeamService !== 'undefined') {
            TeamService.freeTeam(prevTeam);
        }
        return { success: true, message: `Request ${id} has been cancelled successfully.` };
    },

    getStats: () => {
        const requests = RequestService.getAll();
        return {
            total: requests.length,
            critical: requests.filter(r => r.severity === 'CRITICAL').length,
            high: requests.filter(r => r.severity === 'HIGH').length,
            criticalAndHigh: requests.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH').length,
            pending: requests.filter(r => r.status === 'PENDING').length,
            triaged: requests.filter(r => r.status === 'TRIAGED').length,
            assigned: requests.filter(r => r.status === 'ASSIGNED' || (r.team && r.status !== 'COMPLETED' && r.status !== 'CANCELLED')).length,
            inProgress: requests.filter(r => r.status === 'IN PROGRESS' || r.status === 'IN_PROGRESS' || r.status === 'TEAM DISPATCHED').length,
            completed: requests.filter(r => r.status === 'COMPLETED').length,
            cancelled: requests.filter(r => r.status === 'CANCELLED').length,
            active: requests.filter(r => r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length
        };
    },

    filterRequests: (filters = {}) => {
        let results = RequestService.getAll();
        const query = (filters.search || '').trim().toLowerCase();
        const status = filters.status || 'ALL';
        const severity = filters.severity || 'ALL';
        const category = filters.category || 'ALL';

        if (query) {
            results = results.filter(r =>
                (r.id && r.id.toLowerCase().includes(query)) ||
                (r.name && r.name.toLowerCase().includes(query)) ||
                (r.location && r.location.toLowerCase().includes(query)) ||
                (r.phone && r.phone.includes(query))
            );
        }

        if (status !== 'ALL') {
            results = results.filter(r => {
                const s = (r.status || '').toUpperCase().replace('_', ' ');
                const target = status.toUpperCase().replace('_', ' ');
                if (target === 'IN PROGRESS' && s === 'TEAM DISPATCHED') return true;
                if (target === 'ASSIGNED' && (s === 'ASSIGNED' || (r.team && r.status !== 'COMPLETED' && r.status !== 'CANCELLED'))) return true;
                return s === target;
            });
        }

        if (severity !== 'ALL') {
            results = results.filter(r => (r.severity || '').toUpperCase() === severity.toUpperCase());
        }

        if (category !== 'ALL') {
            results = results.filter(r => (r.type || '').toUpperCase() === category.toUpperCase());
        }

        return results;
    },

    getPriorityQueue: () => {
        const requests = RequestService.getAll().filter(r => r.status === 'PENDING' || r.status === 'TRIAGED');
        const severityScores = { 'CRITICAL': 4, 'HIGH': 3, 'NORMAL': 2, 'LOW': 1 };

        return requests.sort((a, b) => {
            const scoreB = severityScores[b.severity] || 1;
            const scoreA = severityScores[a.severity] || 1;
            if (scoreB !== scoreA) {
                return scoreB - scoreA;
            }
            const dateA = new Date(a.date || (a.timestamp ? a.timestamp * 1000 : Date.now()));
            const dateB = new Date(b.date || (b.timestamp ? b.timestamp * 1000 : Date.now()));
            return dateA - dateB;
        });
    }
};
