const ResourceService = {
    liveCache: [],
    centerCache: [],

    sync: async () => {
        try {
            const res = await ApiBridge.getResources();
            if (res.ok && res.data && res.data.success && Array.isArray(res.data.data)) {
                ResourceService.liveCache = res.data.data;
            }
            const cRes = await ApiBridge.getCenters();
            if (cRes.ok && cRes.data && cRes.data.success && Array.isArray(cRes.data.data)) {
                ResourceService.centerCache = cRes.data.data;
            }
            return true;
        } catch (e) {
            console.warn('[ResourceService] Sync failed:', e);
        }
        return false;
    },

    getAll: () => {
        if (ApiBridge.isLive && ResourceService.liveCache.length > 0) {
            return ResourceService.liveCache;
        }
        return Storage.get('resources');
    },

    getCenters: () => {
        if (ApiBridge.isLive && ResourceService.centerCache.length > 0) {
            return ResourceService.centerCache;
        }
        return Storage.get('centers');
    },

    updateQuantity: async (id, amount) => {
        const qty = Math.max(0, parseInt(amount, 10) || 0);
        if (ApiBridge.isLive) {
            const res = await ApiBridge.updateResource(id, qty);
            if (res.ok && res.data && res.data.success) {
                await ResourceService.sync();
                return { success: true, message: res.data.message };
            }
            return { success: false, message: (res.data && res.data.message) || 'Stock update failed on C++ backend.' };
        }

        // Demo fallback
        const resources = Storage.get('resources');
        const r = resources.find(res => res.id === id);
        if (r) {
            r.quantity = qty;
            if (qty <= 0) r.status = 'DEPLETED';
            else if (qty < 50) r.status = 'LOW';
            else r.status = 'AVAILABLE';
            Storage.set('resources', resources);
            return { success: true, message: 'Stock updated locally.' };
        }
        return { success: false, message: 'Resource ID not found.' };
    },

    getStats: () => {
        const resources = ResourceService.getAll();
        const totalStockUnits = resources.reduce((sum, r) => sum + (parseInt(r.quantity, 10) || 0), 0);
        return {
            totalItems: resources.length,
            totalUnits: totalStockUnits,
            availableItems: resources.filter(r => r.status === 'AVAILABLE').length,
            lowItems: resources.filter(r => r.status === 'LOW').length,
            depletedItems: resources.filter(r => r.status === 'DEPLETED').length
        };
    }
};
