const TeamService = {
    liveCache: [],

    sync: async () => {
        try {
            const res = await ApiBridge.getTeams();
            if (res.ok && res.data && res.data.success && Array.isArray(res.data.data)) {
                TeamService.liveCache = res.data.data;
                return true;
            }
        } catch (e) {
            console.warn('[TeamService] Sync failed:', e);
        }
        return false;
    },

    getAll: () => {
        if (ApiBridge.isLive && TeamService.liveCache.length > 0) {
            return TeamService.liveCache;
        }
        return Storage.get('teams');
    },

    getAvailable: () => TeamService.getAll().filter(t => t.status === 'AVAILABLE'),

    assignTeam: async (teamId, requestId) => {
        if (ApiBridge.isLive) {
            const res = await ApiBridge.assignTeam(requestId, teamId);
            if (res.ok && res.data && res.data.success) {
                await TeamService.sync();
                await RequestService.sync();
                return { success: true, message: res.data.message };
            }
            return { success: false, message: (res.data && res.data.message) || 'Assignment failed on C++ backend.' };
        }

        // Demo fallback
        const teams = Storage.get('teams');
        const team = teams.find(t => t.id === teamId);
        if (team && team.status === 'AVAILABLE') {
            team.status = 'BUSY';
            team.assignment = requestId;
            Storage.set('teams', teams);
            return { success: true, message: `Team ${teamId} assigned locally.` };
        }
        return { success: false, message: 'Team not available for assignment.' };
    },

    freeTeam: (teamId) => {
        const teams = Storage.get('teams');
        const team = teams.find(t => t.id === teamId);
        if (team) {
            team.status = 'AVAILABLE';
            team.assignment = null;
            Storage.set('teams', teams);
            return true;
        }
        return false;
    },

    getStats: () => {
        const teams = TeamService.getAll();
        return {
            total: teams.length,
            available: teams.filter(t => t.status === 'AVAILABLE').length,
            active: teams.filter(t => t.status === 'BUSY').length
        };
    }
};
