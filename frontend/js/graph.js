// Mock Graph Data for Dijkstra Visualization
const GraphData = {
    nodes: [
        { id: 'central', name: 'Central Area', x: 200, y: 150 },
        { id: 'north', name: 'North Area', x: 200, y: 50 },
        { id: 'east', name: 'East Area', x: 350, y: 150 },
        { id: 'south', name: 'South Area', x: 350, y: 250 },
        { id: 'west', name: 'West Area', x: 50, y: 150 }
    ],
    edges: [
        { source: 'central', target: 'north', distance: 5 },
        { source: 'central', target: 'east', distance: 7 },
        { source: 'central', target: 'west', distance: 3 },
        { source: 'east', target: 'south', distance: 4 },
        { source: 'west', target: 'south', distance: 8 }
    ]
};

const GraphService = {
    getGraph: () => GraphData,

    // Simple mock shortest path function for demonstration purposes.
    // The actual algorithm will be implemented in C++.
    findShortestPath: (startId, targetId) => {
        // Hardcoded paths for demonstration of the prototype
        const paths = {
            'central-south': { path: ['Central Area', 'East Area', 'South Area'], distance: 11 },
            'west-east': { path: ['West Area', 'Central Area', 'East Area'], distance: 10 },
            'north-south': { path: ['North Area', 'Central Area', 'East Area', 'South Area'], distance: 16 }
        };

        const key = `${startId}-${targetId}`;
        const keyReverse = `${targetId}-${startId}`;

        if (paths[key]) return paths[key];
        if (paths[keyReverse]) return { path: [...paths[keyReverse].path].reverse(), distance: paths[keyReverse].distance };

        // Fallback
        return { path: ['Direct route'], distance: 'N/A' };
    }
};
