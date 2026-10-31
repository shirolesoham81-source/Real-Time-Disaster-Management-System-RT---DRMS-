#include "datastructures/Graph.h"
#include <iostream>

// ============================================================================
// DATA STRUCTURE IMPLEMENTATION: WEIGHTED GRAPH & DIJKSTRA'S ALGORITHM
// ============================================================================

// EdgeNode Constructor
EdgeNode::EdgeNode(int dest, int dist)
    : destinationIndex(dest), distance(dist), next(nullptr) {}

// Vertex Constructors
Vertex::Vertex() : areaName(""), headEdge(nullptr) {}
Vertex::Vertex(const std::string& name) : areaName(name), headEdge(nullptr) {}

// PathResult Constructor
PathResult::PathResult() : exists(false), totalDistance(0), nodeCount(0) {}

// Dynamic array expansion
void Graph::resize(int newCapacity) {
    if (newCapacity <= capacity) {
        return;
    }
    Vertex* newArray = new Vertex[newCapacity];
    for (int i = 0; i < numVertices; i++) {
        newArray[i] = vertices[i];
    }
    delete[] vertices;
    vertices = newArray;
    capacity = newCapacity;
}

// Add directed edge
bool Graph::addDirectedEdge(int u, int v, int distance) {
    EdgeNode* current = vertices[u].headEdge;
    while (current != nullptr) {
        if (current->destinationIndex == v) {
            return false;
        }
        current = current->next;
    }

    EdgeNode* newEdge = new EdgeNode(v, distance);
    newEdge->next = vertices[u].headEdge;
    vertices[u].headEdge = newEdge;
    return true;
}

// Graph Constructor
Graph::Graph(int initCapacity)
    : capacity(initCapacity < 4 ? 4 : initCapacity), numVertices(0) {
    vertices = new Vertex[capacity];
}

// Graph Destructor
Graph::~Graph() {
    clear();
    delete[] vertices;
    vertices = nullptr;
}

// Return vertex count - O(1)
int Graph::getVertexCount() const {
    return numVertices;
}

// Find vertex index by name - O(V)
int Graph::findVertex(const std::string& areaName) const {
    for (int i = 0; i < numVertices; i++) {
        if (vertices[i].areaName == areaName) {
            return i;
        }
    }
    return -1;
}

// Add vertex - O(V)
int Graph::addVertex(const std::string& areaName) {
    if (areaName.empty()) {
        return -1;
    }

    if (findVertex(areaName) != -1) {
        std::cout << "[GRAPH ERROR] Duplicate area name '" << areaName << "' rejected.\n";
        return -1;
    }

    if (numVertices == capacity) {
        resize(capacity * 2);
    }

    int index = numVertices;
    vertices[index].areaName = areaName;
    vertices[index].headEdge = nullptr;
    numVertices++;
    return index;
}

// Add bidirectional edge - O(E)
bool Graph::addEdge(const std::string& source, const std::string& destination, int distance) {
    if (distance < 0) {
        std::cout << "[GRAPH ERROR] Negative road distance (" << distance << ") rejected.\n";
        return false;
    }

    if (source == destination) {
        std::cout << "[GRAPH ERROR] Self-connections are not permitted for roads.\n";
        return false;
    }

    int u = findVertex(source);
    int v = findVertex(destination);

    if (u == -1 || v == -1) {
        std::cout << "[GRAPH ERROR] One or both areas do not exist: "
                  << source << ", " << destination << "\n";
        return false;
    }

    bool addedForward = addDirectedEdge(u, v, distance);
    bool addedBackward = addDirectedEdge(v, u, distance);
    return addedForward && addedBackward;
}

// Check direct connectivity
bool Graph::isConnected(const std::string& source, const std::string& destination) const {
    int u = findVertex(source);
    int v = findVertex(destination);

    if (u == -1 || v == -1) {
        return false;
    }

    EdgeNode* current = vertices[u].headEdge;
    while (current != nullptr) {
        if (current->destinationIndex == v) {
            return true;
        }
        current = current->next;
    }
    return false;
}

// Display adjacency list
void Graph::displayGraph() const {
    std::cout << "  [Graph: " << numVertices << " Areas / Relief Centers]\n";
    if (numVertices == 0) {
        std::cout << "    (Graph has no areas registered.)\n";
        return;
    }

    for (int i = 0; i < numVertices; i++) {
        std::cout << "  [" << i << "] " << vertices[i].areaName << " -> ";
        EdgeNode* current = vertices[i].headEdge;
        if (current == nullptr) {
            std::cout << "(No connected roads)";
        } else {
            while (current != nullptr) {
                std::cout << vertices[current->destinationIndex].areaName
                          << " (" << current->distance << " km)";
                if (current->next != nullptr) {
                    std::cout << ", ";
                }
                current = current->next;
            }
        }
        std::cout << "\n";
    }
}

// Dijkstra's Shortest Path Algorithm - O(V^2 + E) time, O(V) space
PathResult Graph::findShortestRoute(const std::string& sourceName, const std::string& destName) const {
    PathResult result;

    if (numVertices == 0) {
        return result;
    }

    int src = findVertex(sourceName);
    int dest = findVertex(destName);

    if (src == -1 || dest == -1) {
        return result;
    }

    if (src == dest) {
        result.exists = true;
        result.totalDistance = 0;
        result.nodeCount = 1;
        result.path[0] = sourceName;
        return result;
    }

    const int INF = 1000000000;
    int* distance = new int[numVertices];
    bool* visited = new bool[numVertices];
    int* previous = new int[numVertices];

    for (int i = 0; i < numVertices; i++) {
        distance[i] = INF;
        visited[i] = false;
        previous[i] = -1;
    }

    distance[src] = 0;

    for (int count = 0; count < numVertices; count++) {
        int u = -1;
        int minDistance = INF;

        for (int i = 0; i < numVertices; i++) {
            if (!visited[i] && distance[i] < minDistance) {
                minDistance = distance[i];
                u = i;
            }
        }

        if (u == -1 || minDistance == INF) {
            break;
        }

        if (u == dest) {
            break;
        }

        visited[u] = true;

        EdgeNode* edge = vertices[u].headEdge;
        while (edge != nullptr) {
            int v = edge->destinationIndex;
            int weight = edge->distance;

            if (!visited[v] && distance[u] + weight < distance[v]) {
                distance[v] = distance[u] + weight;
                previous[v] = u;
            }
            edge = edge->next;
        }
    }

    if (distance[dest] < INF && previous[dest] != -1) {
        result.exists = true;
        result.totalDistance = distance[dest];

        int tempPath[100];
        int stepCount = 0;
        int current = dest;

        while (current != -1 && stepCount < 100) {
            tempPath[stepCount++] = current;
            if (current == src) {
                break;
            }
            current = previous[current];
        }

        result.nodeCount = stepCount;
        for (int i = 0; i < stepCount; i++) {
            result.path[i] = vertices[tempPath[stepCount - 1 - i]].areaName;
        }
    }

    delete[] distance;
    delete[] visited;
    delete[] previous;

    return result;
}

// Clear all vertices and edges
void Graph::clear() {
    for (int i = 0; i < numVertices; i++) {
        EdgeNode* current = vertices[i].headEdge;
        while (current != nullptr) {
            EdgeNode* nextEdge = current->next;
            delete current;
            current = nextEdge;
        }
        vertices[i].headEdge = nullptr;
        vertices[i].areaName = "";
    }
    numVertices = 0;
}
