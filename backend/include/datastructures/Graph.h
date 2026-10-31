#ifndef GRAPH_H
#define GRAPH_H

#include <iostream>
#include <string>

// ============================================================================
// DATA STRUCTURE: WEIGHTED GRAPH (Adjacency List) & DIJKSTRA'S ALGORITHM
// Purpose: Models the city road network (disaster zones and relief centers)
//          and calculates the shortest road route for emergency dispatch.
// Representation:
//   - Vertices: Array of areas (e.g., "Central", "North", "West").
//   - Edges: Singly-linked list of outgoing roads for each vertex.
// Algorithm: Dijkstra's shortest path algorithm (Greedy approach).
// ============================================================================

// Node representing a directed road connection in the adjacency list
struct EdgeNode {
    int destinationIndex; // Index of the destination vertex in the vertex array
    int distance;         // Road distance or travel cost in kilometres
    EdgeNode* next;       // Pointer to the next road in this vertex's edge list

    // Constructor initializing edge destination and distance
    EdgeNode(int dest, int dist);
};

// Structure representing a disaster zone or relief camp vertex
struct Vertex {
    std::string areaName; // Name of the zone or center (e.g., "Central", "Swargate")
    EdgeNode* headEdge;   // Head pointer of the linked list of connected roads

    Vertex();
    Vertex(const std::string& name);
};

// Result structure returned by Dijkstra's shortest route algorithm
struct PathResult {
    bool exists;           // True if a connecting route was found
    int totalDistance;     // Sum of road distances along the route
    int nodeCount;         // Number of areas along the calculated path
    std::string path[100]; // Ordered sequence of area names from source to destination

    PathResult();
};

// Graph class using an Adjacency List
class Graph {
private:
    Vertex* vertices; // Dynamically allocated array of vertices
    int capacity;     // Allocated capacity of the vertex array
    int numVertices;  // Current number of registered vertices (areas)

    // Helper: Dynamic array expansion when vertex limit is reached
    void resize(int newCapacity);

    // Helper: Adds a single directed edge from vertex u to vertex v
    bool addDirectedEdge(int u, int v, int distance);

public:
    // Constructor: initializes graph with default capacity (default: 8)
    Graph(int initCapacity = 8);

    // Destructor: safely deallocates all edge nodes and vertex storage
    ~Graph();

    // Disable copy constructor and assignment to prevent double-deletion
    Graph(const Graph& other) = delete;
    Graph& operator=(const Graph& other) = delete;

    // Return the total number of registered areas - O(1) time
    int getVertexCount() const;

    // Find the 0-based array index of an area by name - O(V) time
    int findVertex(const std::string& areaName) const;

    // ADD VERTEX: Register a new disaster area or relief hub - O(V) time
    int addVertex(const std::string& areaName);

    // ADD EDGE: Connect two areas with a bidirectional road - O(E) time
    bool addEdge(const std::string& source, const std::string& destination, int distance);

    // CHECK DIRECT CONNECTIVITY: Returns true if a direct road connects source and destination
    bool isConnected(const std::string& source, const std::string& destination) const;

    // DISPLAY: Print each area and its outgoing road connections
    void displayGraph() const;

    // DIJKSTRA'S SHORTEST PATH ALGORITHM - O(V^2 + E) time, O(V) space
    PathResult findShortestRoute(const std::string& sourceName, const std::string& destName) const;

    // CLEAR: Release all dynamic edge nodes and reset vertices
    void clear();
};

#endif // GRAPH_H
