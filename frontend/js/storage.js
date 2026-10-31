const DB_PREFIX = 'dr_system_';

const initialData = {
    requests: [],
    teams: [
        { id: 'T-01', name: 'Alpha Rescue', specialization: 'Medical', location: 'Central', status: 'BUSY', assignment: 'DR-1001' },
        { id: 'T-02', name: 'Bravo Squad', specialization: 'Search & Rescue', location: 'North', status: 'BUSY', assignment: 'DR-1018' },
        { id: 'T-03', name: 'Charlie Logistics', specialization: 'Supplies', location: 'South', status: 'AVAILABLE', assignment: null },
        { id: 'T-04', name: 'Delta Evac', specialization: 'Evacuation', location: 'East', status: 'OFFLINE', assignment: null }
    ],
    resources: [
        { id: 'R-1', name: 'Water (Liters)', quantity: 500, status: 'AVAILABLE' },
        { id: 'R-2', name: 'Food Packets', quantity: 300, status: 'AVAILABLE' },
        { id: 'R-3', name: 'First Aid Kits', quantity: 15, status: 'LOW' },
        { id: 'R-4', name: 'Blankets', quantity: 200, status: 'AVAILABLE' },
        { id: 'R-5', name: 'Medicines', quantity: 50, status: 'LOW' }
    ],
    centers: [
        { id: 'C-1', name: 'Central Relief Camp', location: 'Central Area', capacity: 150, current: 80, facilities: ['Food', 'Water', 'Medical'], latitude: 0, longitude: 0, isDemonstration: false },
        { id: 'C-2', name: 'North Shelter', location: 'North Area', capacity: 200, current: 190, facilities: ['Shelter', 'Food'], latitude: 0, longitude: 0, isDemonstration: false },
        { id: 'C-3', name: 'East Medical Post', location: 'East Area', capacity: 50, current: 20, facilities: ['Medical', 'Water'], latitude: 0, longitude: 0, isDemonstration: false },
        { id: 'C-PN-01', name: 'PMC Disaster Management Cell', location: 'Shivajinagar', capacity: 250, current: 0, latitude: 18.5314, longitude: 73.8446, isDemonstration: false },
        { id: 'C-PN-02', name: 'Nehru Stadium Sports & Emergency Shelter', location: 'Swargate', capacity: 500, current: 45, latitude: 18.5028, longitude: 73.8567, isDemonstration: false },
        { id: 'C-PN-03', name: 'Yashwantrao Chavan Community Staging Center', location: 'Kothrud', capacity: 350, current: 20, latitude: 18.5012, longitude: 73.8093, isDemonstration: false },
        { id: 'C-PN-04', name: 'Hadapsar Ward Office & Transit Center', location: 'Hadapsar', capacity: 200, current: 15, latitude: 18.5004, longitude: 73.9340, isDemonstration: false },
        { id: 'C-PN-05', name: 'Shree Shiv Chhatrapati Sports Complex', location: 'Baner', capacity: 1000, current: 0, latitude: 18.5744, longitude: 73.7698, isDemonstration: false },
        { id: 'C-PN-06', name: 'Annasaheb Magar Stadium Relief Camp', location: 'Pimpri-Chinchwad', capacity: 400, current: 10, latitude: 18.6365, longitude: 73.8227, isDemonstration: false },
        { id: 'C-PN-07', name: 'Divisional Sports Complex & Transit Hub', location: 'Yerawada', capacity: 300, current: 0, latitude: 18.5532, longitude: 73.8734, isDemonstration: false }
    ]
};

const Storage = {
    init: function() {
        try {
            if (!localStorage.getItem(DB_PREFIX + 'initialized')) {
                Storage.resetDemoData();
            }
        } catch (e) {
            console.warn('Storage init warning (localStorage unavailable or restricted):', e);
        }
    },

    get: function(key) {
        try {
            const raw = localStorage.getItem(DB_PREFIX + key);
            if (!raw) {
                // If key is missing from storage, provide initial demo data if available
                return initialData[key] ? JSON.parse(JSON.stringify(initialData[key])) : [];
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn(`Storage parse error for '${key}', falling back to initial data:`, e);
            // Handle corrupted/malformed local storage safely
            if (initialData[key]) {
                return JSON.parse(JSON.stringify(initialData[key]));
            }
            return [];
        }
    },

    set: function(key, data) {
        try {
            localStorage.setItem(DB_PREFIX + key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error(`Storage write error for '${key}':`, e);
            return false;
        }
    },

    resetDemoData: function() {
        try {
            localStorage.setItem(DB_PREFIX + 'requests', JSON.stringify(initialData.requests));
            localStorage.setItem(DB_PREFIX + 'teams', JSON.stringify(initialData.teams));
            localStorage.setItem(DB_PREFIX + 'resources', JSON.stringify(initialData.resources));
            localStorage.setItem(DB_PREFIX + 'centers', JSON.stringify(initialData.centers));
            localStorage.setItem(DB_PREFIX + 'initialized', 'true');
            return true;
        } catch (e) {
            console.error('Failed to reset demo data in storage:', e);
            return false;
        }
    }
};

Storage.init();
