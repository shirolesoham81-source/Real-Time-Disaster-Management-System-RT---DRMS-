#include <iostream>
#include <string>
#include "services/ServerService.h"

// ============================================================================
// Real-Time Disaster Relief Request Management System (RT-DRMS)
// C++ Engine - Main Entry Point
// ============================================================================
// The C++ engine serves as the high-performance computational core of RT-DRMS.
// It maintains all in-memory data structures and algorithms:
//   1. Singly Linked List: Authoritative master storage for all requests
//   2. Hash Table (Separate Chaining): O(1) average lookup by request ID
//   3. Binary Max-Heap (Priority Queue): Urgent emergency triage (Critical/High)
//   4. FIFO Queue: Routine request queue (Normal/Low)
//   5. LIFO Stack: Dispatch action history and safe rollback/undo
//   6. Weighted Graph: City road network representation
//   7. Dijkstra's Algorithm: Shortest rescue path calculation
//   8. Searching & Sorting: Linear/Binary search, Bubble/Selection/Insertion sort
//
// Communication Architecture:
// - Operates as a persistent child process managed by the Node.js server.
// - Standard I/O IPC: Receives single-line JSON commands from Node.js via stdin.
// - Standard Output: Transmits single-line JSON responses back to Node.js via stdout.
// - Standard Error: Diagnostic logs are sent to stderr to prevent stream corruption.
// ============================================================================

int main(int argc, char* argv[]) {
    // Initialize and run persistent C++ JSON bridge server
    ServerService server;
    server.run();
    return 0;
}
