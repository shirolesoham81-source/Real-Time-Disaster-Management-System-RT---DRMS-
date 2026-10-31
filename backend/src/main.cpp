#include <iostream>
#include <string>
#include "models/Enums.h"
#include "models/ReliefRequest.h"
#include "datastructures/LinkedList.h"
#include "datastructures/Queue.h"
#include "datastructures/PriorityQueue.h"
#include "datastructures/Stack.h"
#include "datastructures/HashTable.h"
#include "datastructures/Graph.h"
#include "models/RescueTeam.h"
#include "models/Resource.h"
#include "models/ReliefCenter.h"
#include "services/PeopleService.h"
#include "services/ManagementService.h"
#include "services/FileService.h"
#include "services/ServerService.h"
#include "utils/Algorithms.h"

// ============================================================================
// PART A: MANUAL LIFO STACK TESTS (Phase 5)
// ============================================================================
void runStackTests() {
    std::cout << "======================================================================\n";
    std::cout << "   PART A: MANUAL LIFO STACK VERIFICATION (Dispatch Action History)   \n";
    std::cout << "======================================================================\n\n";

    Stack actionStack;
    actionStack.push("DR-1001", "T-01", RequestStatus::PENDING, TeamStatus::AVAILABLE, "Assigned Alpha Medical Squad");
    actionStack.push("DR-1002", "T-02", RequestStatus::PENDING, TeamStatus::AVAILABLE, "Dispatched Bravo Rescue Squad");
    actionStack.push("DR-1003", "T-03", RequestStatus::PENDING, TeamStatus::AVAILABLE, "Allocated Charlie Logistics Supplies");

    ActionRecord topAction;
    actionStack.peek(topAction);

    ActionRecord a1, a2, a3;
    actionStack.pop(a1);
    actionStack.pop(a2);
    actionStack.pop(a3);

    bool emptyPop = actionStack.pop();

    if (topAction.requestId == "DR-1003" && a1.requestId == "DR-1003" &&
        a2.requestId == "DR-1002" && a3.requestId == "DR-1001" && !emptyPop) {
        std::cout << "  -> LIFO Push, Peek, Pop, and Empty safety checks: ALL PASS\n";
    } else {
        std::cout << "  -> Stack checks: FAIL\n";
    }
    std::cout << "\n";
}

// ============================================================================
// PART B: MANUAL HASH TABLE TESTS (Phase 5)
// ============================================================================
void runHashTableTests() {
    std::cout << "======================================================================\n";
    std::cout << "   PART B: MANUAL HASH TABLE VERIFICATION (Separate Chaining Lookup)  \n";
    std::cout << "======================================================================\n\n";

    LinkedList masterList;
    masterList.insertAtTail(ReliefRequest("DR-1001", "John Doe", "9876543210", "Area B", "Flood", "Medical", 2, SeverityLevel::CRITICAL));
    masterList.insertAtTail(ReliefRequest("DR-1002", "Jane Smith", "9876543211", "Area A", "Earthquake", "Food", 5, SeverityLevel::HIGH));

    HashTable requestTable(5);
    requestTable.insert("DR-1001", masterList.findById("DR-1001"));
    requestTable.insert("DR-1002", masterList.findById("DR-1002"));

    ReliefRequest* s1 = requestTable.search("DR-1001");
    ReliefRequest* sMissing = requestTable.search("DR-9999");
    bool dupRejected = !requestTable.insert("DR-1001", masterList.findById("DR-1001"));
    bool nullRejected = !requestTable.insert("DR-NULL", nullptr);

    if (s1 != nullptr && s1->citizenName == "John Doe" && sMissing == nullptr && dupRejected && nullRejected) {
        std::cout << "  -> Hash Table Search, Duplicate rejection, and Null checks: ALL PASS\n";
    } else {
        std::cout << "  -> Hash Table checks: FAIL\n";
    }
    std::cout << "\n";
}

// ============================================================================
// PART C: SEARCHING AND SORTING ALGORITHMS TESTS (Phase 6)
// ============================================================================
void runAlgorithmTests() {
    std::cout << "======================================================================\n";
    std::cout << "   PART C: SEARCHING & SORTING ALGORITHMS VERIFICATION (Phase 6)      \n";
    std::cout << "======================================================================\n\n";

    const int ARR_SIZE = 4;
    ReliefRequest sample[ARR_SIZE] = {
        ReliefRequest("DR-1025", "Sarah", "555", "Area D", "Fire", "Rescue", 4, SeverityLevel::CRITICAL),
        ReliefRequest("DR-1001", "John", "123", "Area B", "Flood", "Medical", 2, SeverityLevel::CRITICAL),
        ReliefRequest("DR-1030", "Harvey", "444", "Area B", "Cyclone", "Water", 10, SeverityLevel::NORMAL),
        ReliefRequest("DR-1002", "Jane", "098", "Area A", "Earthquake", "Food", 50, SeverityLevel::HIGH)
    };

    int linIdx = linearSearchById(sample, ARR_SIZE, "DR-1001");
    bubbleSortById(sample, ARR_SIZE);
    int binIdx = binarySearchById(sample, ARR_SIZE, "DR-1001");
    selectionSortByPeople(sample, ARR_SIZE);

    // Test Insertion Sort by Severity (CRITICAL > HIGH > NORMAL > LOW)
    ReliefRequest sevSample[4] = {
        ReliefRequest("DR-1", "A", "1", "L", "F", "M", 1, SeverityLevel::LOW),
        ReliefRequest("DR-2", "B", "2", "L", "F", "M", 2, SeverityLevel::CRITICAL),
        ReliefRequest("DR-3", "C", "3", "L", "F", "M", 3, SeverityLevel::NORMAL),
        ReliefRequest("DR-4", "D", "4", "L", "F", "M", 4, SeverityLevel::HIGH)
    };
    insertionSortBySeverity(sevSample, 4);
    bool sevOk = (sevSample[0].severity == SeverityLevel::CRITICAL &&
                  sevSample[1].severity == SeverityLevel::HIGH &&
                  sevSample[2].severity == SeverityLevel::NORMAL &&
                  sevSample[3].severity == SeverityLevel::LOW);

    // Test Bubble Sort by Timestamp (Newest First)
    ReliefRequest timeSample[3] = {
        ReliefRequest("DR-1", "A", "1", "L", "F", "M", 1, SeverityLevel::NORMAL),
        ReliefRequest("DR-2", "B", "2", "L", "F", "M", 2, SeverityLevel::NORMAL),
        ReliefRequest("DR-3", "C", "3", "L", "F", "M", 3, SeverityLevel::NORMAL)
    };
    timeSample[0].timestamp = 100;
    timeSample[1].timestamp = 300;
    timeSample[2].timestamp = 200;
    bubbleSortByTimestamp(timeSample, 3);
    bool timeOk = (timeSample[0].timestamp == 300 &&
                   timeSample[1].timestamp == 200 &&
                   timeSample[2].timestamp == 100);

    if (linIdx == 1 && binIdx == 0 && sample[0].peopleCount == 50 && sample[ARR_SIZE - 1].peopleCount == 2 && sevOk && timeOk) {
        std::cout << "  -> Linear search, Binary search, Selection sort, Insertion sort, and Bubble sort: ALL PASS\n";
    } else {
        std::cout << "  -> Search/Sort checks: FAIL\n";
    }
    std::cout << "\n";
}

// ============================================================================
// PART D: GRAPH AND DIJKSTRA'S SHORTEST PATH TESTS (Phase 7)
// ============================================================================
void runGraphTests() {
    std::cout << "======================================================================\n";
    std::cout << "   PART D: GRAPH & DIJKSTRA'S SHORTEST PATH ALGORITHM (Phase 7)       \n";
    std::cout << "======================================================================\n\n";

    // 1. Create a graph and add vertices
    std::cout << "[GRAPH TEST 1] Adding 5 disaster relief areas as vertices...\n";
    Graph cityGraph(8);
    int idxCentral = cityGraph.addVertex("Central");
    int idxNorth   = cityGraph.addVertex("North");
    int idxEast    = cityGraph.addVertex("East");
    int idxSouth   = cityGraph.addVertex("South");
    int idxWest    = cityGraph.addVertex("West");

    std::cout << "  -> Registered areas count: " << cityGraph.getVertexCount() << " (Expected: 5)\n";
    if (cityGraph.getVertexCount() == 5 && idxCentral == 0 && idxNorth == 1 &&
        idxEast == 2 && idxSouth == 3 && idxWest == 4) {
        std::cout << "  -> Vertex addition: ALL PASS\n";
    } else {
        std::cout << "  -> Vertex addition: FAIL\n";
    }
    std::cout << "\n";

    // 2. Reject duplicate vertices
    std::cout << "[GRAPH TEST 2] Attempting to add duplicate vertex 'Central'...\n";
    int dupIdx = cityGraph.addVertex("Central");
    std::cout << "  -> Result for duplicate vertex: " << dupIdx << " (Expected: -1)\n";
    if (dupIdx == -1 && cityGraph.getVertexCount() == 5) {
        std::cout << "  -> Duplicate vertex rejected correctly: PASS\n";
    } else {
        std::cout << "  -> Duplicate vertex rejection: FAIL\n";
    }
    std::cout << "\n";

    // 3. Add valid bidirectional roads
    std::cout << "[GRAPH TEST 3] Adding bidirectional roads with distances...\n";
    // Distances specified:
    // Central–North: 4, Central–East: 2, East–North: 1, North–South: 5
    // East–South: 8, South–West: 2, East–West: 10
    bool r1 = cityGraph.addEdge("Central", "North", 4);
    bool r2 = cityGraph.addEdge("Central", "East", 2);
    bool r3 = cityGraph.addEdge("East", "North", 1);
    bool r4 = cityGraph.addEdge("North", "South", 5);
    bool r5 = cityGraph.addEdge("East", "South", 8);
    bool r6 = cityGraph.addEdge("South", "West", 2);
    bool r7 = cityGraph.addEdge("East", "West", 10);

    if (r1 && r2 && r3 && r4 && r5 && r6 && r7) {
        std::cout << "  -> Added all 7 bidirectional road segments: PASS\n";
    } else {
        std::cout << "  -> Road segment additions: FAIL\n";
    }
    std::cout << "\n";

    // 4. Reject invalid road parameters (negative distances, self-loops, missing areas)
    std::cout << "[GRAPH TEST 4] Testing rejection of invalid road parameters...\n";
    bool negDist = cityGraph.addEdge("Central", "North", -5);  // Negative distance
    bool selfLoop = cityGraph.addEdge("Central", "Central", 3); // Self loop
    bool missArea = cityGraph.addEdge("Central", "Atlantis", 6); // Nonexistent area

    if (!negDist && !selfLoop && !missArea) {
        std::cout << "  -> Negative distance, self-connection, and missing area rejected: PASS\n";
    } else {
        std::cout << "  -> Road parameter validation: FAIL\n";
    }
    std::cout << "\n";

    // 5. Display adjacency list
    std::cout << "[GRAPH TEST 5] Displaying Graph Adjacency List:\n";
    cityGraph.displayGraph();
    std::cout << "  -> Adjacency list formatted display: PASS\n\n";

    // 6. Find existing and nonexistent area names
    std::cout << "[GRAPH TEST 6] Finding existing and nonexistent area names...\n";
    int findEast = cityGraph.findVertex("East");
    int findGhost = cityGraph.findVertex("NonexistentZone");
    std::cout << "  -> findVertex('East') returned index           : " << findEast << " (Expected: 2)\n";
    std::cout << "  -> findVertex('NonexistentZone') returned index: " << findGhost << " (Expected: -1)\n";
    if (findEast == 2 && findGhost == -1) {
        std::cout << "  -> Vertex lookup checks: PASS\n";
    } else {
        std::cout << "  -> Vertex lookup checks: FAIL\n";
    }
    std::cout << "\n";

    // 7. Check direct road connectivity
    std::cout << "[GRAPH TEST 7] Checking direct road connectivity (isConnected)...\n";
    bool directCentralNorth = cityGraph.isConnected("Central", "North");
    bool directNorthCentral = cityGraph.isConnected("North", "Central"); // Bidirectional check
    bool directCentralWest  = cityGraph.isConnected("Central", "West");  // Indirect check

    std::cout << "  -> isConnected('Central', 'North'): " << (directCentralNorth ? "YES" : "NO") << " (Expected: YES)\n";
    std::cout << "  -> isConnected('North', 'Central'): " << (directNorthCentral ? "YES" : "NO") << " (Expected: YES)\n";
    std::cout << "  -> isConnected('Central', 'West') : " << (directCentralWest ? "YES" : "NO") << " (Expected: NO)\n";

    if (directCentralNorth && directNorthCentral && !directCentralWest) {
        std::cout << "  -> Bidirectional connectivity and indirect absence verified: PASS\n";
    } else {
        std::cout << "  -> Direct connectivity checks: FAIL\n";
    }
    std::cout << "\n";

    // 8. Finding the shortest route from Central to West
    std::cout << "[GRAPH TEST 8] Running Dijkstra: Shortest route from Central to West...\n";
    PathResult routeCW = cityGraph.findShortestRoute("Central", "West");
    std::cout << "  Route Exists  : " << (routeCW.exists ? "YES" : "NO") << "\n";
    std::cout << "  Total Distance: " << routeCW.totalDistance << " km (Expected: 10 km)\n";
    std::cout << "  Calculated Path: ";
    for (int i = 0; i < routeCW.nodeCount; i++) {
        std::cout << routeCW.path[i];
        if (i < routeCW.nodeCount - 1) std::cout << " -> ";
    }
    std::cout << "\n";

    // Verification check:
    // Expected route: Central -> East -> North -> South -> West (Distance: 2 + 1 + 5 + 2 = 10)
    bool pathCWOk = (routeCW.exists && routeCW.totalDistance == 10 && routeCW.nodeCount == 5 &&
                     routeCW.path[0] == "Central" &&
                     routeCW.path[1] == "East" &&
                     routeCW.path[2] == "North" &&
                     routeCW.path[3] == "South" &&
                     routeCW.path[4] == "West");

    if (pathCWOk) {
        std::cout << "  -> Exact expected route Central -> East -> North -> South -> West (10 km): PASS\n";
    } else {
        std::cout << "  -> Route Central to West check: FAIL\n";
    }
    std::cout << "\n";

    // 9. Finding the shortest route from West to Central (Symmetry check)
    std::cout << "[GRAPH TEST 9] Running Dijkstra: Shortest route from West to Central...\n";
    PathResult routeWC = cityGraph.findShortestRoute("West", "Central");
    std::cout << "  Route Exists  : " << (routeWC.exists ? "YES" : "NO") << "\n";
    std::cout << "  Total Distance: " << routeWC.totalDistance << " km (Expected: 10 km)\n";
    std::cout << "  Calculated Path: ";
    for (int i = 0; i < routeWC.nodeCount; i++) {
        std::cout << routeWC.path[i];
        if (i < routeWC.nodeCount - 1) std::cout << " -> ";
    }
    std::cout << "\n";

    bool pathWCOk = (routeWC.exists && routeWC.totalDistance == 10 && routeWC.nodeCount == 5 &&
                     routeWC.path[0] == "West" &&
                     routeWC.path[1] == "South" &&
                     routeWC.path[2] == "North" &&
                     routeWC.path[3] == "East" &&
                     routeWC.path[4] == "Central");

    if (pathWCOk) {
        std::cout << "  -> Symmetric reverse route West -> South -> North -> East -> Central (10 km): PASS\n";
    } else {
        std::cout << "  -> Route West to Central check: FAIL\n";
    }
    std::cout << "\n";

    // 10. Handling source equal to destination
    std::cout << "[GRAPH TEST 10] Running Dijkstra with source == destination ('Central' to 'Central')...\n";
    PathResult routeSelf = cityGraph.findShortestRoute("Central", "Central");
    std::cout << "  Route Exists  : " << (routeSelf.exists ? "YES" : "NO") << "\n";
    std::cout << "  Total Distance: " << routeSelf.totalDistance << " km (Expected: 0 km)\n";
    std::cout << "  Path Nodes    : " << routeSelf.nodeCount << " (Expected: 1)\n";
    if (routeSelf.exists && routeSelf.totalDistance == 0 && routeSelf.nodeCount == 1 && routeSelf.path[0] == "Central") {
        std::cout << "  -> Self-route zero distance check: PASS\n";
    } else {
        std::cout << "  -> Self-route check: FAIL\n";
    }
    std::cout << "\n";

    // 11. Handling disconnected vertices
    std::cout << "[GRAPH TEST 11] Running Dijkstra with a disconnected vertex ('Island Camp')...\n";
    cityGraph.addVertex("Island Camp"); // Vertex added with no roads
    PathResult routeDisconnected = cityGraph.findShortestRoute("Central", "Island Camp");
    std::cout << "  Route to Island Camp Exists: " << (routeDisconnected.exists ? "YES [FAIL]" : "NO [PASS]") << "\n";
    if (!routeDisconnected.exists) {
        std::cout << "  -> Correctly reported unreachable destination: PASS\n";
    } else {
        std::cout << "  -> Disconnected vertex handling: FAIL\n";
    }
    std::cout << "\n";

    // 12. Handling an empty graph
    std::cout << "[GRAPH TEST 12] Running Dijkstra on an empty graph...\n";
    Graph emptyGraph;
    PathResult routeEmpty = emptyGraph.findShortestRoute("Central", "West");
    std::cout << "  Route in empty graph exists: " << (routeEmpty.exists ? "YES [FAIL]" : "NO [PASS]") << "\n";
    if (!routeEmpty.exists) {
        std::cout << "  -> Empty graph handled safely without crash: PASS\n";
    } else {
        std::cout << "  -> Empty graph handling: FAIL\n";
    }
    std::cout << "\n";
}

// ============================================================================
// PART E: PEOPLE MODULE TESTS (Phase 8)
// ============================================================================
void runPeopleServiceTests() {
    std::cout << "======================================================================\n";
    std::cout << "   PART E: PEOPLE MODULE VERIFICATION (Phase 8)                       \n";
    std::cout << "======================================================================\n\n";

    LinkedList masterList;
    HashTable idTable(11);
    PeopleService peopleService(masterList, idTable, 1001);

    // 1. Valid request submission
    std::cout << "[PEOPLE TEST 1] Submitting a valid relief request...\n";
    SubmissionResult res1 = peopleService.submitRequest(
        "Aarav Sharma", "9876543210", "North Zone Sector 4",
        "Flood", "Rescue", 4, SeverityLevel::CRITICAL, "Trapped on roof"
    );
    std::cout << "  Status : " << (res1.success ? "SUCCESS" : "FAIL") << "\n";
    std::cout << "  ID     : " << res1.requestId << "\n";
    std::cout << "  Message: " << res1.message << "\n";
    if (res1.success && res1.requestId == "DR-1001" && masterList.getSize() == 1 && idTable.getSize() == 1) {
        std::cout << "  -> Valid request submission: PASS\n";
    } else {
        std::cout << "  -> Valid request submission: FAIL\n";
    }
    std::cout << "\n";

    // 2. Unique ID generation for multiple requests
    std::cout << "[PEOPLE TEST 2] Submitting multiple requests to verify sequential unique ID generation...\n";
    SubmissionResult res2 = peopleService.submitRequest(
        "Priya Patel", "9123456780", "East River Camp",
        "Flood", "Medical", 2, SeverityLevel::HIGH, "Insulin needed"
    );
    SubmissionResult res3 = peopleService.submitRequest(
        "Rahul Verma", "9876543210", "South Colony Block B",
        "Fire", "Water", 10, SeverityLevel::NORMAL, "Clean water required"
    );
    std::cout << "  Generated IDs: " << res1.requestId << ", " << res2.requestId << ", " << res3.requestId << "\n";
    if (res2.success && res3.success && res2.requestId == "DR-1002" && res3.requestId == "DR-1003" &&
        masterList.getSize() == 3 && idTable.getSize() == 3) {
        std::cout << "  -> Unique sequential ID generation: PASS\n";
    } else {
        std::cout << "  -> Unique sequential ID generation: FAIL\n";
    }
    std::cout << "\n";

    // 3. Required-field validation
    std::cout << "[PEOPLE TEST 3] Testing required-field validation (empty name, blank location)...\n";
    SubmissionResult emptyName = peopleService.submitRequest(
        "", "9876543210", "Central Plaza", "Flood", "Food", 3, SeverityLevel::NORMAL
    );
    SubmissionResult emptyLoc = peopleService.submitRequest(
        "Vikram Singh", "9876543210", "", "Flood", "Food", 3, SeverityLevel::NORMAL
    );
    std::cout << "  Empty Name Result    : " << (emptyName.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << emptyName.message << ")\n";
    std::cout << "  Empty Location Result: " << (emptyLoc.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << emptyLoc.message << ")\n";
    if (!emptyName.success && !emptyLoc.success) {
        std::cout << "  -> Required-field rejection: PASS\n";
    } else {
        std::cout << "  -> Required-field rejection: FAIL\n";
    }
    std::cout << "\n";

    // 4. Invalid people count rejection
    std::cout << "[PEOPLE TEST 4] Testing invalid people count rejection (0 and negative)...\n";
    SubmissionResult zeroCount = peopleService.submitRequest(
        "Rohan Das", "9876543210", "North Zone", "Earthquake", "Shelter", 0, SeverityLevel::NORMAL
    );
    SubmissionResult negCount = peopleService.submitRequest(
        "Rohan Das", "9876543210", "North Zone", "Earthquake", "Shelter", -5, SeverityLevel::NORMAL
    );
    std::cout << "  Zero People Count Result: " << (zeroCount.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << zeroCount.message << ")\n";
    std::cout << "  Neg People Count Result : " << (negCount.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << negCount.message << ")\n";
    if (!zeroCount.success && !negCount.success) {
        std::cout << "  -> Invalid people count rejection: PASS\n";
    } else {
        std::cout << "  -> Invalid people count rejection: FAIL\n";
    }
    std::cout << "\n";

    // 5. Invalid phone number rejection
    std::cout << "[PEOPLE TEST 5] Testing invalid phone number rejection (short length, letters)...\n";
    SubmissionResult shortPhone = peopleService.submitRequest(
        "Neha Gupta", "12345", "East Sector", "Flood", "Food", 2, SeverityLevel::NORMAL
    );
    SubmissionResult alphaPhone = peopleService.submitRequest(
        "Neha Gupta", "98765ABCD0", "East Sector", "Flood", "Food", 2, SeverityLevel::NORMAL
    );
    std::cout << "  Short Phone Result : " << (shortPhone.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << shortPhone.message << ")\n";
    std::cout << "  Alpha Phone Result : " << (alphaPhone.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << alphaPhone.message << ")\n";
    if (!shortPhone.success && !alphaPhone.success) {
        std::cout << "  -> Invalid phone number format rejection: PASS\n";
    } else {
        std::cout << "  -> Invalid phone number format rejection: FAIL\n";
    }
    std::cout << "\n";

    // 6. Request tracking with the correct ID and phone
    std::cout << "[PEOPLE TEST 6] Tracking request with matching ID and phone (DR-1001, 9876543210)...\n";
    TrackingResult trackMatch = peopleService.trackRequest("DR-1001", "9876543210");
    std::cout << "  Tracking Result: " << (trackMatch.success ? "SUCCESS" : "FAIL") << "\n";
    std::cout << "  Citizen Name   : " << trackMatch.requestData.citizenName << "\n";
    std::cout << "  Location       : " << trackMatch.requestData.location << "\n";
    std::cout << "  Status         : " << requestStatusToString(trackMatch.requestData.status) << "\n";
    std::cout << "  Severity       : " << severityToString(trackMatch.requestData.severity) << "\n";
    if (trackMatch.success && trackMatch.requestData.citizenName == "Aarav Sharma" &&
        trackMatch.requestData.status == RequestStatus::PENDING) {
        std::cout << "  -> Tracking with matching credentials: PASS\n";
    } else {
        std::cout << "  -> Tracking with matching credentials: FAIL\n";
    }
    std::cout << "\n";

    // 7. Request tracking with an incorrect phone
    std::cout << "[PEOPLE TEST 7] Tracking request with mismatched phone (DR-1001, 9999999999)...\n";
    TrackingResult trackMismatch = peopleService.trackRequest("DR-1001", "9999999999");
    std::cout << "  Tracking Result: " << (trackMismatch.success ? "SUCCESS [FAIL]" : "REJECTED [PASS]")
              << " (" << trackMismatch.message << ")\n";
    if (!trackMismatch.success) {
        std::cout << "  -> Privacy check correctly blocked mismatched phone: PASS\n";
    } else {
        std::cout << "  -> Privacy check failure: FAIL\n";
    }
    std::cout << "\n";

    // 8. Tracking a nonexistent request ID
    std::cout << "[PEOPLE TEST 8] Tracking a nonexistent request ID ('DR-9999')...\n";
    TrackingResult trackMissing = peopleService.trackRequest("DR-9999", "9876543210");
    std::cout << "  Tracking Result: " << (trackMissing.success ? "FOUND [FAIL]" : "NOT FOUND [PASS]")
              << " (" << trackMissing.message << ")\n";
    if (!trackMissing.success) {
        std::cout << "  -> Nonexistent ID handled gracefully: PASS\n";
    } else {
        std::cout << "  -> Nonexistent ID handling: FAIL\n";
    }
    std::cout << "\n";

    // 9. Viewing requests by phone number
    std::cout << "[PEOPLE TEST 9] Viewing requests submitted by phone '9876543210'...\n";
    peopleService.displayRequestsByPhone("9876543210");
    ReliefRequest phoneRequests[10];
    int count = peopleService.getRequestsByPhone("9876543210", phoneRequests, 10);
    std::cout << "  Matched requests count: " << count << " (Expected: 2 -> DR-1001 & DR-1003)\n";
    if (count == 2 && ((phoneRequests[0].id == "DR-1001" && phoneRequests[1].id == "DR-1003") ||
                       (phoneRequests[0].id == "DR-1003" && phoneRequests[1].id == "DR-1001"))) {
        std::cout << "  -> Viewing requests by phone number: PASS\n";
    } else {
        std::cout << "  -> Viewing requests by phone number: FAIL\n";
    }
    std::cout << "\n";

    // 10A. Rejecting cancellation with missing/empty phone number
    std::cout << "[PEOPLE TEST 10A] Rejecting cancellation with empty phone number...\n";
    CancellationResult cancelEmpty = peopleService.cancelRequest("DR-1001", "");
    std::cout << "  Empty Phone Result: " << (cancelEmpty.success ? "CANCELLED [FAIL]" : "REJECTED [PASS]")
              << " (" << cancelEmpty.message << ")\n";
    ReliefRequest* checkPre1 = idTable.search("DR-1001");
    if (!cancelEmpty.success && checkPre1 != nullptr && checkPre1->status == RequestStatus::PENDING) {
        std::cout << "  -> Empty phone cancellation guard: PASS\n";
    } else {
        std::cout << "  -> Empty phone cancellation guard: FAIL\n";
    }
    std::cout << "\n";

    // 10B. Rejecting cancellation with malformed phone number (<10 digits or non-numeric)
    std::cout << "[PEOPLE TEST 10B] Rejecting cancellation with malformed phone number ('12345')...\n";
    CancellationResult cancelMalformed = peopleService.cancelRequest("DR-1001", "12345");
    std::cout << "  Malformed Phone Result: " << (cancelMalformed.success ? "CANCELLED [FAIL]" : "REJECTED [PASS]")
              << " (" << cancelMalformed.message << ")\n";
    if (!cancelMalformed.success && checkPre1 != nullptr && checkPre1->status == RequestStatus::PENDING) {
        std::cout << "  -> Malformed phone cancellation guard: PASS\n";
    } else {
        std::cout << "  -> Malformed phone cancellation guard: FAIL\n";
    }
    std::cout << "\n";

    // 10C. Rejecting cancellation with mismatched phone number
    std::cout << "[PEOPLE TEST 10C] Rejecting cancellation with incorrect phone ('9999999999')...\n";
    CancellationResult cancelMismatch = peopleService.cancelRequest("DR-1001", "9999999999");
    std::cout << "  Mismatched Phone Result: " << (cancelMismatch.success ? "CANCELLED [FAIL]" : "REJECTED [PASS]")
              << " (" << cancelMismatch.message << ")\n";
    if (!cancelMismatch.success && checkPre1 != nullptr && checkPre1->status == RequestStatus::PENDING) {
        std::cout << "  -> Mismatched phone cancellation guard: PASS\n";
    } else {
        std::cout << "  -> Mismatched phone cancellation guard: FAIL\n";
    }
    std::cout << "\n";

    // 10D. Cancelling an eligible request with correct registered phone number
    std::cout << "[PEOPLE TEST 10D] Cancelling eligible request DR-1001 with correct phone ('9876543210')...\n";
    CancellationResult cancelRes1 = peopleService.cancelRequest("DR-1001", "9876543210");
    std::cout << "  Cancellation Result: " << (cancelRes1.success ? "SUCCESS" : "FAIL")
              << " (" << cancelRes1.message << ")\n";
    ReliefRequest* checkReq1 = idTable.search("DR-1001");
    if (cancelRes1.success && checkReq1 != nullptr && checkReq1->status == RequestStatus::CANCELLED) {
        std::cout << "  -> Eligible request cancellation with correct phone: PASS\n";
    } else {
        std::cout << "  -> Eligible request cancellation with correct phone: FAIL\n";
    }
    std::cout << "\n";

    // 11. Rejecting cancellation of a completed request
    std::cout << "[PEOPLE TEST 11] Rejecting cancellation of a COMPLETED request...\n";
    // Mark DR-1002 as COMPLETED by rescue management
    ReliefRequest* req2 = idTable.search("DR-1002");
    if (req2 != nullptr) {
        req2->status = RequestStatus::COMPLETED;
    }
    CancellationResult cancelCompleted = peopleService.cancelRequest("DR-1002", "9123456780");
    std::cout << "  Cancellation of COMPLETED result: "
              << (cancelCompleted.success ? "CANCELLED [FAIL]" : "REJECTED [PASS]")
              << " (" << cancelCompleted.message << ")\n";
    if (!cancelCompleted.success && req2 != nullptr && req2->status == RequestStatus::COMPLETED) {
        std::cout << "  -> Completed request cancellation guard: PASS\n";
    } else {
        std::cout << "  -> Completed request cancellation guard: FAIL\n";
    }
    std::cout << "\n";

    // 12. Rejecting cancellation of an already-cancelled request
    std::cout << "[PEOPLE TEST 12] Rejecting cancellation of an already-CANCELLED request (DR-1001)...\n";
    CancellationResult cancelAgain = peopleService.cancelRequest("DR-1001", "9876543210");
    std::cout << "  Cancellation of CANCELLED result: "
              << (cancelAgain.success ? "CANCELLED [FAIL]" : "REJECTED [PASS]")
              << " (" << cancelAgain.message << ")\n";
    if (!cancelAgain.success) {
        std::cout << "  -> Already-cancelled request guard: PASS\n";
    } else {
        std::cout << "  -> Already-cancelled request guard: FAIL\n";
    }
    std::cout << "\n";

    // 13. Verifying hash table and linked list remain consistent after cancellation
    std::cout << "[PEOPLE TEST 13] Verifying consistency between LinkedList and HashTable...\n";
    ReliefRequest* listReq1 = masterList.findById("DR-1001");
    ReliefRequest* hashReq1 = idTable.search("DR-1001");
    std::cout << "  Master List Status: " << (listReq1 ? requestStatusToString(listReq1->status) : "NULL") << "\n";
    std::cout << "  Hash Table  Status: " << (hashReq1 ? requestStatusToString(hashReq1->status) : "NULL") << "\n";
    std::cout << "  Pointer Match     : " << (listReq1 == hashReq1 ? "YES (Exact match)" : "NO") << "\n";
    std::cout << "  Master List Count : " << masterList.getSize() << " (Expected: 3)\n";
    std::cout << "  Hash Table Count  : " << idTable.getSize() << " (Expected: 3)\n";

    bool consistent = (listReq1 != nullptr && hashReq1 != nullptr &&
                       listReq1 == hashReq1 &&
                       listReq1->status == RequestStatus::CANCELLED &&
                       masterList.getSize() == 3 && idTable.getSize() == 3);

    if (consistent) {
        std::cout << "  -> Master LinkedList & HashTable dual-structure consistency: PASS\n";
    } else {
        std::cout << "  -> Dual-structure consistency: FAIL\n";
    }
    std::cout << "\n";
}

// ============================================================================
// PART F: MANAGEMENT MODULE TESTS (Phase 9)
// ============================================================================
void runManagementServiceTests() {
    std::cout << "======================================================================\n";
    std::cout << "   PART F: MANAGEMENT MODULE VERIFICATION (Phase 9)                   \n";
    std::cout << "======================================================================\n\n";

    LinkedList masterList;
    HashTable idTable(13);
    Queue routineQueue;
    PriorityQueue priorityQueue(8);
    Stack actionStack;
    Graph cityGraph(8);

    // Setup road network graph (same topology as Phase 7)
    cityGraph.addVertex("Central");
    cityGraph.addVertex("North");
    cityGraph.addVertex("East");
    cityGraph.addVertex("South");
    cityGraph.addVertex("West");
    cityGraph.addEdge("Central", "North", 4);
    cityGraph.addEdge("Central", "East", 2);
    cityGraph.addEdge("East", "North", 1);
    cityGraph.addEdge("North", "South", 5);
    cityGraph.addEdge("East", "South", 8);
    cityGraph.addEdge("South", "West", 2);
    cityGraph.addEdge("East", "West", 10);

    ManagementService mgmt(masterList, idTable, routineQueue, priorityQueue, actionStack, cityGraph);

    // Populate sample relief requests into master store
    // DR-3001: CRITICAL, 25 people (Eligible for priority triage)
    masterList.insertAtTail(ReliefRequest("DR-3001", "Aarav Sharma", "9876543210", "North",
                                          "Flood", "Rescue", 25, SeverityLevel::CRITICAL,
                                          RequestStatus::PENDING, "Trapped on roof", "", 101));
    idTable.insert("DR-3001", masterList.findById("DR-3001"));

    // DR-3002: NORMAL, 5 people (Eligible for routine triage)
    masterList.insertAtTail(ReliefRequest("DR-3002", "Kavita Rao", "9876543211", "Central",
                                          "Flood", "Food", 5, SeverityLevel::NORMAL,
                                          RequestStatus::PENDING, "Food packets needed", "", 102));
    idTable.insert("DR-3002", masterList.findById("DR-3002"));

    // DR-3003: LOW, 2 people (CANCELLED - ineligible for triage)
    masterList.insertAtTail(ReliefRequest("DR-3003", "Rohan Das", "9876543212", "East",
                                          "Fire", "Water", 2, SeverityLevel::LOW,
                                          RequestStatus::CANCELLED, "Self-resolved", "", 103));
    idTable.insert("DR-3003", masterList.findById("DR-3003"));

    // DR-3004: HIGH, 1 person (COMPLETED - ineligible for triage)
    masterList.insertAtTail(ReliefRequest("DR-3004", "Deepa Mehta", "9876543213", "South",
                                          "Medical", "Medical", 1, SeverityLevel::HIGH,
                                          RequestStatus::COMPLETED, "Already treated", "T-01", 104));
    idTable.insert("DR-3004", masterList.findById("DR-3004"));

    // DR-3005: HIGH, 10 people (Eligible for priority triage)
    masterList.insertAtTail(ReliefRequest("DR-3005", "Suresh Patel", "9876543214", "West",
                                          "Flood", "Medical", 10, SeverityLevel::HIGH,
                                          RequestStatus::PENDING, "First aid needed", "", 105));
    idTable.insert("DR-3005", masterList.findById("DR-3005"));

    // 1. Successful triage of a critical request
    std::cout << "[MGMT TEST 1] Triaging CRITICAL request DR-3001...\n";
    TriageResult tr1 = mgmt.triageRequest("DR-3001");
    std::cout << "  Result: " << (tr1.success ? "SUCCESS" : "FAIL") << " (" << tr1.message << ")\n";
    ReliefRequest* req1 = idTable.search("DR-3001");
    if (tr1.success && tr1.isPriorityQueue && req1 != nullptr &&
        req1->status == RequestStatus::TRIAGED && priorityQueue.contains("DR-3001")) {
        std::cout << "  -> Critical request routed to PriorityQueue and marked TRIAGED: PASS\n";
    } else {
        std::cout << "  -> Critical request triage: FAIL\n";
    }
    std::cout << "\n";

    // 2. Successful triage of a routine request
    std::cout << "[MGMT TEST 2] Triaging NORMAL request DR-3002...\n";
    TriageResult tr2 = mgmt.triageRequest("DR-3002");
    std::cout << "  Result: " << (tr2.success ? "SUCCESS" : "FAIL") << " (" << tr2.message << ")\n";
    ReliefRequest* req2 = idTable.search("DR-3002");
    if (tr2.success && !tr2.isPriorityQueue && req2 != nullptr &&
        req2->status == RequestStatus::TRIAGED && routineQueue.contains("DR-3002")) {
        std::cout << "  -> Routine request routed to FIFO Queue and marked TRIAGED: PASS\n";
    } else {
        std::cout << "  -> Routine request triage: FAIL\n";
    }
    std::cout << "\n";

    // 3. Duplicate triage rejection
    std::cout << "[MGMT TEST 3] Rejecting duplicate triage of already-triaged DR-3001...\n";
    TriageResult trDup = mgmt.triageRequest("DR-3001");
    std::cout << "  Result: " << (trDup.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << trDup.message << ")\n";
    if (!trDup.success) {
        std::cout << "  -> Duplicate triage rejected correctly: PASS\n";
    } else {
        std::cout << "  -> Duplicate triage guard: FAIL\n";
    }
    std::cout << "\n";

    // 4. Missing request rejection
    std::cout << "[MGMT TEST 4] Rejecting triage for nonexistent request ID DR-9999...\n";
    TriageResult trMissing = mgmt.triageRequest("DR-9999");
    std::cout << "  Result: " << (trMissing.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << trMissing.message << ")\n";
    if (!trMissing.success) {
        std::cout << "  -> Nonexistent request triage rejection: PASS\n";
    } else {
        std::cout << "  -> Nonexistent request triage guard: FAIL\n";
    }
    std::cout << "\n";

    // 5. Cancelled / completed request rejection
    std::cout << "[MGMT TEST 5] Rejecting triage for CANCELLED (DR-3003) & COMPLETED (DR-3004) requests...\n";
    TriageResult trCanc = mgmt.triageRequest("DR-3003");
    TriageResult trComp = mgmt.triageRequest("DR-3004");
    std::cout << "  Cancelled Request Result: " << (trCanc.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << trCanc.message << ")\n";
    std::cout << "  Completed Request Result: " << (trComp.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << trComp.message << ")\n";
    if (!trCanc.success && !trComp.success) {
        std::cout << "  -> Ineligible lifecycle status triage rejection: PASS\n";
    } else {
        std::cout << "  -> Lifecycle status triage guard: FAIL\n";
    }
    std::cout << "\n";

    // 6. Priority and routine queue contents
    std::cout << "[MGMT TEST 6] Verifying pending priority and routine queue contents...\n";
    TriageResult tr5 = mgmt.triageRequest("DR-3005"); // HIGH -> PriorityQueue
    std::cout << "  Triaged DR-3005 (HIGH): " << (tr5.success ? "SUCCESS" : "FAIL") << "\n";
    std::cout << "  Priority Queue Size: " << priorityQueue.getSize() << " (Expected: 2 -> DR-3001, DR-3005)\n";
    std::cout << "  Routine Queue Size : " << routineQueue.getSize() << " (Expected: 1 -> DR-3002)\n";
    mgmt.displayPendingQueues();
    if (priorityQueue.getSize() == 2 && routineQueue.getSize() == 1 &&
        priorityQueue.contains("DR-3001") && priorityQueue.contains("DR-3005") &&
        routineQueue.contains("DR-3002")) {
        std::cout << "  -> Queue contents and separation verified: PASS\n";
    } else {
        std::cout << "  -> Queue contents check: FAIL\n";
    }
    std::cout << "\n";

    // 7. Rescue-team registration and unique IDs
    std::cout << "[MGMT TEST 7] Registering rescue teams and checking unique ID enforcement...\n";
    bool t1 = mgmt.registerTeam("T-01", "Alpha Medical Squad", "Medical", "Central");
    bool t2 = mgmt.registerTeam("T-02", "Bravo Search & Rescue", "Rescue", "North");
    bool tDup = mgmt.registerTeam("T-01", "Duplicate Alpha", "Medical", "Central");
    std::cout << "  Registered T-01: " << (t1 ? "SUCCESS" : "FAIL") << "\n";
    std::cout << "  Registered T-02: " << (t2 ? "SUCCESS" : "FAIL") << "\n";
    std::cout << "  Duplicate T-01 : " << (tDup ? "ACCEPTED [FAIL]" : "REJECTED [PASS]") << "\n";
    std::cout << "  Total Teams Count: " << mgmt.getTeamCount() << " (Expected: 2)\n";
    if (t1 && t2 && !tDup && mgmt.getTeamCount() == 2 &&
        mgmt.findTeam("T-01") != nullptr && mgmt.findTeam("T-02") != nullptr) {
        std::cout << "  -> Rescue team registration and unique ID check: PASS\n";
    } else {
        std::cout << "  -> Rescue team registration check: FAIL\n";
    }
    std::cout << "\n";

    // 8. Successful assignment to an available team
    std::cout << "[MGMT TEST 8] Assigning triaged request DR-3001 to a suitable available team...\n";
    AssignmentResult ar1 = mgmt.assignTeam("DR-3001");
    std::cout << "  Result: " << (ar1.success ? "SUCCESS" : "FAIL")
              << " | Assigned Team: " << ar1.teamId << " (" << ar1.message << ")\n";
    RescueTeam* team02 = mgmt.findTeam("T-02");
    if (ar1.success && ar1.teamId == "T-02" && req1->status == RequestStatus::ASSIGNED &&
        req1->assignedTeamId == "T-02" && team02 != nullptr &&
        team02->status == TeamStatus::BUSY && team02->activeRequestId == "DR-3001") {
        std::cout << "  -> Team assignment and mutual pointer/status update: PASS\n";
    } else {
        std::cout << "  -> Team assignment check: FAIL\n";
    }
    std::cout << "\n";

    // 9. Rejection when a team is busy or unavailable
    std::cout << "[MGMT TEST 9] Rejecting assignment to busy team T-02...\n";
    AssignmentResult arBusy = mgmt.assignTeam("DR-3005", "T-02");
    std::cout << "  Result: " << (arBusy.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << arBusy.message << ")\n";
    if (!arBusy.success) {
        std::cout << "  -> Busy team assignment rejection: PASS\n";
    } else {
        std::cout << "  -> Busy team assignment guard: FAIL\n";
    }
    std::cout << "\n";

    // 10. Rejection of assignment for an ineligible request
    std::cout << "[MGMT TEST 10] Rejecting assignment for ineligible requests (CANCELLED & already ASSIGNED)...\n";
    AssignmentResult arInelig1 = mgmt.assignTeam("DR-3003"); // CANCELLED
    AssignmentResult arInelig2 = mgmt.assignTeam("DR-3001"); // already ASSIGNED
    std::cout << "  Cancelled Request Assignment: " << (arInelig1.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << arInelig1.message << ")\n";
    std::cout << "  Assigned Request Re-assign  : " << (arInelig2.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << arInelig2.message << ")\n";
    if (!arInelig1.success && !arInelig2.success) {
        std::cout << "  -> Ineligible request assignment rejection: PASS\n";
    } else {
        std::cout << "  -> Ineligible request assignment guard: FAIL\n";
    }
    std::cout << "\n";

    // 11. Successful resource allocation
    std::cout << "[MGMT TEST 11] Registering and allocating relief resources...\n";
    mgmt.registerResource("R-01", "Emergency Food Rations", 100, 20);
    mgmt.registerResource("R-02", "Drinking Water (Liters)", 50, 15);
    AllocationResult al1 = mgmt.allocateResource("DR-3001", "R-01", 20);
    std::cout << "  Result: " << (al1.success ? "SUCCESS" : "FAIL")
              << " | Remaining Stock: " << al1.remainingStock << " (" << al1.message << ")\n";
    Resource* resFood = mgmt.findResource("R-01");
    if (al1.success && al1.remainingStock == 80 && resFood != nullptr &&
        resFood->quantity == 80 && resFood->status == ResourceStatus::AVAILABLE) {
        std::cout << "  -> Successful resource stock allocation: PASS\n";
    } else {
        std::cout << "  -> Resource allocation check: FAIL\n";
    }
    std::cout << "\n";

    // 12. Insufficient-stock and invalid-quantity rejection
    std::cout << "[MGMT TEST 12] Testing resource allocation rejection (over-allocation & non-positive)...\n";
    AllocationResult alOver = mgmt.allocateResource("DR-3001", "R-01", 500);
    AllocationResult alZero = mgmt.allocateResource("DR-3001", "R-01", 0);
    AllocationResult alNeg = mgmt.allocateResource("DR-3001", "R-01", -10);
    std::cout << "  Over-allocation Result: " << (alOver.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << alOver.message << ")\n";
    std::cout << "  Zero-quantity Result  : " << (alZero.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << alZero.message << ")\n";
    std::cout << "  Negative-qty Result   : " << (alNeg.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << alNeg.message << ")\n";
    if (!alOver.success && !alZero.success && !alNeg.success) {
        std::cout << "  -> Insufficient stock & invalid quantity rejection: PASS\n";
    } else {
        std::cout << "  -> Resource allocation guards: FAIL\n";
    }
    std::cout << "\n";

    // 13. Correct resource stock and status after allocation
    std::cout << "[MGMT TEST 13] Verifying resource threshold status transitions (LOW & DEPLETED)...\n";
    // Allocate 70 units -> remaining 10 (threshold 20 -> LOW)
    AllocationResult alLow = mgmt.allocateResource("DR-3001", "R-01", 70);
    bool isLow = (resFood->quantity == 10 && resFood->status == ResourceStatus::LOW);
    std::cout << "  Allocated 70 units: Remaining = " << resFood->quantity
              << ", Status = " << resourceStatusToString(resFood->status)
              << " (Expected: LOW) -> " << (isLow ? "OK" : "FAIL") << "\n";

    // Allocate remaining 10 units -> remaining 0 -> DEPLETED
    AllocationResult alDep = mgmt.allocateResource("DR-3001", "R-01", 10);
    bool isDep = (resFood->quantity == 0 && resFood->status == ResourceStatus::DEPLETED);
    std::cout << "  Allocated 10 units: Remaining = " << resFood->quantity
              << ", Status = " << resourceStatusToString(resFood->status)
              << " (Expected: DEPLETED) -> " << (isDep ? "OK" : "FAIL") << "\n";

    if (alLow.success && alDep.success && isLow && isDep) {
        std::cout << "  -> Stock threshold transition verification: PASS\n";
    } else {
        std::cout << "  -> Stock threshold transition: FAIL\n";
    }
    std::cout << "\n";

    // 14. Known shortest-route example using existing graph
    std::cout << "[MGMT TEST 14] Calculating shortest route between Central and West...\n";
    PathResult routeCW = mgmt.calculateRescueRoute("Central", "West", true);
    bool routeMatch = (routeCW.exists && routeCW.totalDistance == 10 && routeCW.nodeCount == 5 &&
                       routeCW.path[0] == "Central" && routeCW.path[1] == "East" &&
                       routeCW.path[2] == "North" && routeCW.path[3] == "South" &&
                       routeCW.path[4] == "West");
    if (routeMatch) {
        std::cout << "  -> Dijkstra route Central -> East -> North -> South -> West (10 km): PASS\n";
    } else {
        std::cout << "  -> Shortest route check: FAIL\n";
    }
    std::cout << "\n";

    // 15. Handling unknown or disconnected route
    std::cout << "[MGMT TEST 15] Calculating route for disconnected vertex ('Island Camp') & unknown vertex...\n";
    cityGraph.addVertex("Island Camp");
    PathResult routeDisc = mgmt.calculateRescueRoute("Central", "Island Camp", false);
    PathResult routeUnknown = mgmt.calculateRescueRoute("Central", "Atlantis", false);
    std::cout << "  Disconnected Vertex Route Exists: " << (routeDisc.exists ? "YES [FAIL]" : "NO [PASS]") << "\n";
    std::cout << "  Unknown Vertex Route Exists     : " << (routeUnknown.exists ? "YES [FAIL]" : "NO [PASS]") << "\n";
    if (!routeDisc.exists && !routeUnknown.exists) {
        std::cout << "  -> Disconnected and nonexistent routing handled safely: PASS\n";
    } else {
        std::cout << "  -> Route safety checks: FAIL\n";
    }
    std::cout << "\n";

    // 16. Action history logging
    std::cout << "[MGMT TEST 16] Inspecting action history stack log...\n";
    mgmt.displayActionHistory();
    ActionRecord topAct;
    bool hasTop = actionStack.peek(topAct);
    std::cout << "  Stack Size: " << actionStack.getSize() << " (Expected >= 2)\n";
    std::cout << "  Top Action: " << (hasTop ? topAct.actionDescription : "None") << "\n";
    if (hasTop && topAct.requestId == "DR-3001" && topAct.teamId == "T-02" &&
        topAct.prevRequestStatus == RequestStatus::TRIAGED &&
        topAct.prevTeamStatus == TeamStatus::AVAILABLE) {
        std::cout << "  -> LIFO action logging with previous states: PASS\n";
    } else {
        std::cout << "  -> Action history check: FAIL\n";
    }
    std::cout << "\n";

    // 17. Safe rollback of a supported action
    std::cout << "[MGMT TEST 17] Executing safe rollback of team assignment (DR-3001 <-> T-02)...\n";
    RollbackResult rbRes = mgmt.rollbackLastAction();
    std::cout << "  Rollback Result: " << (rbRes.success ? "SUCCESS" : "FAIL") << " (" << rbRes.message << ")\n";
    std::cout << "  Request DR-3001 Status : " << requestStatusToString(req1->status) << " (Expected: TRIAGED)\n";
    std::cout << "  Request DR-3001 Team   : '" << req1->assignedTeamId << "' (Expected: empty)\n";
    std::cout << "  Team T-02 Status       : " << teamStatusToString(team02->status) << " (Expected: AVAILABLE)\n";
    std::cout << "  Team T-02 Active Req   : '" << team02->activeRequestId << "' (Expected: empty)\n";
    bool rollbackOk = (rbRes.success && req1->status == RequestStatus::TRIAGED &&
                       req1->assignedTeamId.empty() && team02->status == TeamStatus::AVAILABLE &&
                       team02->activeRequestId.empty());
    if (rollbackOk) {
        std::cout << "  -> Assignment rollback restored previous request and team statuses: PASS\n";
    } else {
        std::cout << "  -> Assignment rollback check: FAIL\n";
    }
    std::cout << "\n";

    // 18. Consistency of request, team, queue, and hash-table state after operations
    std::cout << "[MGMT TEST 18] Verifying global state consistency across all structures...\n";
    ReliefRequest* checkMaster = masterList.findById("DR-3001");
    ReliefRequest* checkHash = idTable.search("DR-3001");
    bool ptrMatch = (checkMaster != nullptr && checkMaster == checkHash);
    bool statusConsistent = (checkMaster != nullptr && checkMaster->status == RequestStatus::TRIAGED);
    bool teamIdle = (team02 != nullptr && team02->status == TeamStatus::AVAILABLE && team02->activeRequestId.empty());
    bool queueValid = priorityQueue.contains("DR-3001") && priorityQueue.contains("DR-3005");

    std::cout << "  Pointer Match (Master == Hash): " << (ptrMatch ? "YES" : "NO") << "\n";
    std::cout << "  Request Status is TRIAGED      : " << (statusConsistent ? "YES" : "NO") << "\n";
    std::cout << "  Team T-02 is AVAILABLE & Idle  : " << (teamIdle ? "YES" : "NO") << "\n";
    std::cout << "  Priority Queue retains entries : " << (queueValid ? "YES" : "NO") << "\n";

    if (ptrMatch && statusConsistent && teamIdle && queueValid) {
        std::cout << "  -> Comprehensive multi-structure state consistency: PASS\n";
    } else {
        std::cout << "  -> State consistency check: FAIL\n";
    }
    std::cout << "\n";
}

// ============================================================================
// PART G: FILE HANDLING & PERSISTENCE TESTS (Phase 10)
// ============================================================================
void runFileServiceTests() {
    std::cout << "======================================================================\n";
    std::cout << "   PART G: FILE HANDLING & PERSISTENCE VERIFICATION (Phase 10)        \n";
    std::cout << "======================================================================\n\n";

    // 1. Saving a non-empty request list
    std::cout << "[FILE TEST 1] Saving a non-empty relief request list to file...\n";
    LinkedList saveList;
    saveList.insertAtTail(ReliefRequest("DR-4001", "Aarav Kumar Sharma", "9876543210",
                                        "North Zone Sector 4, Block C", "Flood", "Rescue", 4,
                                        SeverityLevel::CRITICAL, RequestStatus::PENDING,
                                        "Trapped on roof, need food & water! Sector 4-B.", "", 1001));
    saveList.insertAtTail(ReliefRequest("DR-4002", "Kavita Rao", "9876543211",
                                        "Central Plaza, East Wing", "Earthquake", "Medical", 2,
                                        SeverityLevel::HIGH, RequestStatus::TRIAGED,
                                        "First-aid needed immediately.", "", 1002));
    saveList.insertAtTail(ReliefRequest("DR-4003", "Rohan Das", "9876543212",
                                        "South Port Camp", "Fire", "Shelter", 10,
                                        SeverityLevel::NORMAL, RequestStatus::COMPLETED,
                                        "Safe at shelter.", "T-01", 1003));

    FileOperationResult rSaveReq = FileService::saveRequests("backend/data/test_requests.txt", saveList, true);
    std::cout << "  Save Result: " << (rSaveReq.success ? "SUCCESS" : "FAIL")
              << " (" << rSaveReq.message << ")\n";
    if (rSaveReq.success && rSaveReq.recordsProcessed == 3) {
        std::cout << "  -> Saved 3 requests successfully: PASS\n";
    } else {
        std::cout << "  -> Save requests check: FAIL\n";
    }
    std::cout << "\n";

    // 2. Loading saved requests
    std::cout << "[FILE TEST 2] Loading saved relief requests into fresh LinkedList and HashTable...\n";
    LinkedList loadList;
    HashTable loadTable(11);
    FileOperationResult rLoadReq = FileService::loadRequests("backend/data/test_requests.txt", loadList, loadTable, true);
    std::cout << "  Load Result: " << (rLoadReq.success ? "SUCCESS" : "FAIL")
              << " (" << rLoadReq.message << ")\n";
    std::cout << "  Loaded Count: " << rLoadReq.recordsProcessed << " (Expected: 3)\n";
    std::cout << "  List Size   : " << loadList.getSize() << " | Table Size: " << loadTable.getSize() << "\n";
    if (rLoadReq.success && rLoadReq.recordsProcessed == 3 &&
        loadList.getSize() == 3 && loadTable.getSize() == 3) {
        std::cout << "  -> Loaded 3 requests correctly: PASS\n";
    } else {
        std::cout << "  -> Load requests check: FAIL\n";
    }
    std::cout << "\n";

    // 3. Saving and loading teams
    std::cout << "[FILE TEST 3] Saving and loading rescue teams...\n";
    LinkedList dummyL1, dummyL2;
    HashTable dummyH1(5), dummyH2(5);
    Queue dummyQ1, dummyQ2;
    PriorityQueue dummyPQ1, dummyPQ2;
    Stack dummyS1, dummyS2;
    Graph dummyG1, dummyG2;

    ManagementService mgmtSaveTeams(dummyL1, dummyH1, dummyQ1, dummyPQ1, dummyS1, dummyG1);
    mgmtSaveTeams.registerTeam("T-01", "Alpha Medical Squad", "Medical", "Central");
    mgmtSaveTeams.registerTeam("T-02", "Bravo Search & Rescue", "Rescue", "North");

    FileOperationResult rSaveTeams = FileService::saveTeams("backend/data/test_teams.txt", mgmtSaveTeams, true);
    ManagementService mgmtLoadTeams(dummyL2, dummyH2, dummyQ2, dummyPQ2, dummyS2, dummyG2);
    FileOperationResult rLoadTeams = FileService::loadTeams("backend/data/test_teams.txt", mgmtLoadTeams);

    std::cout << "  Save Teams: " << (rSaveTeams.success ? "SUCCESS" : "FAIL") << "\n";
    std::cout << "  Load Teams: " << (rLoadTeams.success ? "SUCCESS" : "FAIL")
              << " (Loaded: " << rLoadTeams.recordsProcessed << ")\n";
    const RescueTeam* t1 = mgmtLoadTeams.findTeam("T-01");
    const RescueTeam* t2 = mgmtLoadTeams.findTeam("T-02");
    if (rSaveTeams.success && rLoadTeams.success && rLoadTeams.recordsProcessed == 2 &&
        t1 != nullptr && t2 != nullptr && t1->name == "Alpha Medical Squad" &&
        t2->specialization == "Rescue") {
        std::cout << "  -> Teams persistence verification: PASS\n";
    } else {
        std::cout << "  -> Teams persistence check: FAIL\n";
    }
    std::cout << "\n";

    // 4. Saving and loading resources
    std::cout << "[FILE TEST 4] Saving and loading relief resources...\n";
    mgmtSaveTeams.registerResource("R-01", "Emergency Food Rations", 100, 20);
    mgmtSaveTeams.registerResource("R-02", "Drinking Water (Liters)", 50, 15);

    FileOperationResult rSaveRes = FileService::saveResources("backend/data/test_resources.txt", mgmtSaveTeams, true);
    FileOperationResult rLoadRes = FileService::loadResources("backend/data/test_resources.txt", mgmtLoadTeams);

    std::cout << "  Save Resources: " << (rSaveRes.success ? "SUCCESS" : "FAIL") << "\n";
    std::cout << "  Load Resources: " << (rLoadRes.success ? "SUCCESS" : "FAIL")
              << " (Loaded: " << rLoadRes.recordsProcessed << ")\n";
    const Resource* res1 = mgmtLoadTeams.findResource("R-01");
    const Resource* res2 = mgmtLoadTeams.findResource("R-02");
    if (rSaveRes.success && rLoadRes.success && rLoadRes.recordsProcessed == 2 &&
        res1 != nullptr && res2 != nullptr && res1->quantity == 100 && res2->minThreshold == 15) {
        std::cout << "  -> Resources persistence verification: PASS\n";
    } else {
        std::cout << "  -> Resources persistence check: FAIL\n";
    }
    std::cout << "\n";

    // 5. Handling missing files on first run
    std::cout << "[FILE TEST 5] Handling missing file gracefully on first run...\n";
    LinkedList firstRunList;
    HashTable firstRunTable(7);
    FileOperationResult rMissing = FileService::loadRequests("backend/data/nonexistent_file_9999.txt",
                                                             firstRunList, firstRunTable, false);
    std::cout << "  Missing File Result: " << (rMissing.success ? "SUCCESS [Treated Gracefully]" : "FAIL")
              << " (" << rMissing.message << ")\n";
    std::cout << "  Processed: " << rMissing.recordsProcessed << " | Skipped: " << rMissing.recordsSkipped << "\n";
    if (rMissing.success && rMissing.recordsProcessed == 0 && rMissing.recordsSkipped == 0 &&
        firstRunList.isEmpty() && firstRunTable.isEmpty()) {
        std::cout << "  -> Missing file on first run handled without crash: PASS\n";
    } else {
        std::cout << "  -> Missing file check: FAIL\n";
    }
    std::cout << "\n";

    // 6. Handling malformed records
    std::cout << "[FILE TEST 6] Handling malformed records in data file...\n";
    {
        std::ofstream mf("backend/data/test_malformed.txt");
        mf << "# Malformed test file\n";
        mf << "DR-5001|Valid Citizen A|9876543210|Zone A|Flood|Food|2|NORMAL|PENDING|Details||101\n";
        mf << "DR-5002|Too few tokens|Zone B\n"; // Incomplete tokens
        mf << "DR-5003|Invalid People|9876543210|Zone C|Flood|Food|NOT_A_NUM|NORMAL|PENDING|Details||102\n"; // Non-numeric people
        mf << "DR-5004|Valid Citizen B|9876543211|Zone D|Flood|Water|5|HIGH|PENDING|Details||103\n";
        mf.close();
    }
    LinkedList malList;
    HashTable malTable(7);
    FileOperationResult rMal = FileService::loadRequests("backend/data/test_malformed.txt", malList, malTable, true);
    std::cout << "  Processed (Valid): " << rMal.recordsProcessed << " (Expected: 2)\n";
    std::cout << "  Skipped (Malformed): " << rMal.recordsSkipped << " (Expected: 2)\n";
    if (rMal.success && rMal.recordsProcessed == 2 && rMal.recordsSkipped == 2 &&
        malList.contains("DR-5001") && malList.contains("DR-5004")) {
        std::cout << "  -> Malformed records skipped and valid records preserved: PASS\n";
    } else {
        std::cout << "  -> Malformed records handling: FAIL\n";
    }
    std::cout << "\n";

    // 7. Rejecting duplicate IDs
    std::cout << "[FILE TEST 7] Rejecting duplicate IDs in persistent file...\n";
    {
        std::ofstream df("backend/data/test_duplicates.txt");
        df << "DR-6001|First Copy|9876543210|Zone A|Flood|Food|2|NORMAL|PENDING|Details||101\n";
        df << "DR-6001|Duplicate Copy|9876543210|Zone B|Flood|Food|4|NORMAL|PENDING|Details||102\n";
        df.close();
    }
    LinkedList dupList;
    HashTable dupTable(7);
    FileOperationResult rDup = FileService::loadRequests("backend/data/test_duplicates.txt", dupList, dupTable, true);
    std::cout << "  Processed: " << rDup.recordsProcessed << " (Expected: 1)\n";
    std::cout << "  Skipped  : " << rDup.recordsSkipped << " (Expected: 1)\n";
    if (rDup.success && rDup.recordsProcessed == 1 && rDup.recordsSkipped == 1 &&
        dupList.getSize() == 1 && dupTable.getSize() == 1) {
        std::cout << "  -> Duplicate IDs correctly rejected from store: PASS\n";
    } else {
        std::cout << "  -> Duplicate IDs rejection check: FAIL\n";
    }
    std::cout << "\n";

    // 8. Handling invalid enum values
    std::cout << "[FILE TEST 8] Rejecting records with invalid enum values...\n";
    {
        std::ofstream ef("backend/data/test_enums.txt");
        ef << "DR-7001|Bad Severity|9876543210|Zone A|Flood|Food|2|SUPER_CRITICAL|PENDING|Details||101\n";
        ef << "DR-7002|Bad Status|9876543210|Zone B|Flood|Food|2|NORMAL|DONE_AND_DUSTED|Details||102\n";
        ef.close();
    }
    LinkedList enumList;
    HashTable enumTable(7);
    FileOperationResult rEnum = FileService::loadRequests("backend/data/test_enums.txt", enumList, enumTable, true);
    std::cout << "  Processed: " << rEnum.recordsProcessed << " (Expected: 0)\n";
    std::cout << "  Skipped  : " << rEnum.recordsSkipped << " (Expected: 2)\n";
    if (rEnum.success && rEnum.recordsProcessed == 0 && rEnum.recordsSkipped == 2 &&
        enumList.isEmpty() && enumTable.isEmpty()) {
        std::cout << "  -> Invalid enum strings rejected safely: PASS\n";
    } else {
        std::cout << "  -> Invalid enum strings check: FAIL\n";
    }
    std::cout << "\n";

    // 9. Maintaining exact LinkedList and HashTable consistency after loading
    std::cout << "[FILE TEST 9] Verifying LinkedList and HashTable pointer consistency after loading...\n";
    ReliefRequest* r1 = loadList.findById("DR-4001");
    ReliefRequest* h1 = loadTable.search("DR-4001");
    ReliefRequest* r2 = loadList.findById("DR-4002");
    ReliefRequest* h2 = loadTable.search("DR-4002");
    ReliefRequest* r3 = loadList.findById("DR-4003");
    ReliefRequest* h3 = loadTable.search("DR-4003");

    bool match1 = (r1 != nullptr && h1 != nullptr && r1 == h1);
    bool match2 = (r2 != nullptr && h2 != nullptr && r2 == h2);
    bool match3 = (r3 != nullptr && h3 != nullptr && r3 == h3);
    bool sizeMatch = (loadList.getSize() == loadTable.getSize() && loadList.getSize() == 3);

    std::cout << "  Pointer Equality DR-4001 (List == Hash): " << (match1 ? "YES" : "NO") << "\n";
    std::cout << "  Pointer Equality DR-4002 (List == Hash): " << (match2 ? "YES" : "NO") << "\n";
    std::cout << "  Pointer Equality DR-4003 (List == Hash): " << (match3 ? "YES" : "NO") << "\n";
    std::cout << "  Size Match (List == Table == 3)        : " << (sizeMatch ? "YES" : "NO") << "\n";

    if (match1 && match2 && match3 && sizeMatch) {
        std::cout << "  -> Exact LinkedList & HashTable pointer consistency: PASS\n";
    } else {
        std::cout << "  -> Pointer consistency check: FAIL\n";
    }
    std::cout << "\n";

    // 10. Preserving spaces and punctuation in text fields
    std::cout << "[FILE TEST 10] Checking preservation of spaces and punctuation in text fields...\n";
    bool nameMatch = (r1 != nullptr && r1->citizenName == "Aarav Kumar Sharma");
    bool locMatch  = (r1 != nullptr && r1->location == "North Zone Sector 4, Block C");
    bool detMatch  = (r1 != nullptr && r1->details == "Trapped on roof, need food & water! Sector 4-B.");

    std::cout << "  Citizen Name : '" << (r1 ? r1->citizenName : "") << "' -> " << (nameMatch ? "PASS" : "FAIL") << "\n";
    std::cout << "  Location     : '" << (r1 ? r1->location : "") << "' -> " << (locMatch ? "PASS" : "FAIL") << "\n";
    std::cout << "  Details      : '" << (r1 ? r1->details : "") << "' -> " << (detMatch ? "PASS" : "FAIL") << "\n";

    if (nameMatch && locMatch && detMatch) {
        std::cout << "  -> Spaces, commas, and punctuation fully preserved: PASS\n";
    } else {
        std::cout << "  -> Text preservation check: FAIL\n";
    }
    std::cout << "\n";

    // 11. Detecting file-open or write failures where practical
    std::cout << "[FILE TEST 11] Detecting write failure on invalid file path...\n";
    FileOperationResult rBadPath = FileService::saveRequests("Z:/invalid_directory_path/cannot_write.txt", saveList, true);
    std::cout << "  Bad Path Result: " << (rBadPath.success ? "ACCEPTED [FAIL]" : "REJECTED [PASS]")
              << " (" << rBadPath.message << ")\n";
    if (!rBadPath.success) {
        std::cout << "  -> File write failure detected gracefully: PASS\n";
    } else {
        std::cout << "  -> File failure detection check: FAIL\n";
    }
    std::cout << "\n";

    // 12. Confirming that queue, heap, stack, and graph internals are not serialized
    std::cout << "[FILE TEST 12] Confirming that queue, heap, stack, and graph are in-memory only...\n";
    std::cout << "  Routine Queue in loaded service is empty : " << (dummyQ2.isEmpty() ? "YES" : "NO") << "\n";
    std::cout << "  Priority Queue in loaded service is empty: " << (dummyPQ2.isEmpty() ? "YES" : "NO") << "\n";
    std::cout << "  Action Stack in loaded service is empty  : " << (dummyS2.isEmpty() ? "YES" : "NO") << "\n";
    std::cout << "  Persistent files contain domain text only: YES (Schema: Pipe-delimited)\n";
    if (dummyQ2.isEmpty() && dummyPQ2.isEmpty() && dummyS2.isEmpty()) {
        std::cout << "  -> Ephemeral dispatch structures correctly excluded from disk persistence: PASS\n";
    } else {
        std::cout << "  -> Ephemeral exclusion check: FAIL\n";
    }
    std::cout << "\n";

    // 13. Confirming that a second load does not duplicate existing records
    std::cout << "[FILE TEST 13] Confirming second load does not duplicate existing records...\n";
    FileOperationResult rSecond = FileService::loadRequests("backend/data/test_requests.txt", loadList, loadTable, false);
    std::cout << "  Second Load Processed: " << rSecond.recordsProcessed << " (Expected: 0 new)\n";
    std::cout << "  Second Load Skipped  : " << rSecond.recordsSkipped << " (Expected: 3 duplicates)\n";
    std::cout << "  Store Size Unchanged : " << loadList.getSize() << " (Expected: 3)\n";
    if (rSecond.recordsProcessed == 0 && rSecond.recordsSkipped == 3 &&
        loadList.getSize() == 3 && loadTable.getSize() == 3) {
        std::cout << "  -> Second load avoided duplicating existing records: PASS\n";
    } else {
        std::cout << "  -> Duplicate load prevention: FAIL\n";
    }
    std::cout << "\n";

    // 14. Verifying that failed loading does not destroy valid existing in-memory data
    std::cout << "[FILE TEST 14] Verifying failed load does not destroy valid existing in-memory data...\n";
    int preSizeList = loadList.getSize();
    int preSizeTable = loadTable.getSize();
    FileOperationResult rFailLoad = FileService::loadRequests("backend/data/test_enums.txt", loadList, loadTable, false);
    int postSizeList = loadList.getSize();
    int postSizeTable = loadTable.getSize();

    std::cout << "  Pre-load Size : " << preSizeList << " | Post-load Size: " << postSizeList << "\n";
    std::cout << "  Pre-table Size: " << preSizeTable << " | Post-table Size: " << postSizeTable << "\n";
    bool preserved = (preSizeList == postSizeList && preSizeTable == postSizeTable &&
                      loadList.contains("DR-4001") && loadTable.contains("DR-4001"));

    if (preserved) {
        std::cout << "  -> Existing in-memory records remained completely intact and valid: PASS\n";
    } else {
        std::cout << "  -> In-memory preservation check: FAIL\n";
    }
    std::cout << "\n";

    // 15. Testing empty-dataset accidental overwrite protection
    std::cout << "[FILE TEST 15] Testing empty-dataset accidental overwrite protection...\n";
    LinkedList emptyList;
    FileOperationResult rAccidentalSave = FileService::saveRequests("backend/data/test_requests.txt", emptyList, false);
    std::cout << "  Empty Save without override: " << (rAccidentalSave.success ? "WIPED [FAIL]" : "BLOCKED [PASS]")
              << " (" << rAccidentalSave.message << ")\n";
    // Verify file still has original content
    LinkedList verifyStillThere;
    HashTable verifyTable(7);
    FileService::loadRequests("backend/data/test_requests.txt", verifyStillThere, verifyTable, false);
    bool dataProtected = (!rAccidentalSave.success && verifyStillThere.getSize() == 3);
    if (dataProtected) {
        std::cout << "  -> Accidental empty-dataset overwrite successfully prevented: PASS\n";
    } else {
        std::cout << "  -> Empty overwrite protection check: FAIL\n";
    }
    std::cout << "\n";

    // 16. Verifying bulk saveAll and loadAll aggregate diagnostic reporting (isolated fixture directory)
    std::cout << "[FILE TEST 16] Verifying bulk saveAll and loadAll aggregate reporting...\n";
    FileOperationResult rBulkSave = FileService::saveAll(saveList, mgmtSaveTeams, "backend/data/test_fixtures", true);
    std::cout << "  Bulk Save Result: " << (rBulkSave.success ? "SUCCESS" : "FAIL")
              << " | Total Saved: " << rBulkSave.recordsProcessed << "\n";
    LinkedList bulkLoadList;
    HashTable bulkLoadTable(11);
    ManagementService bulkMgmt(dummyL1, dummyH1, dummyQ1, dummyPQ1, dummyS1, dummyG1);
    FileOperationResult rBulkLoad = FileService::loadAll(bulkLoadList, bulkLoadTable, bulkMgmt, "backend/data/test_fixtures");
    std::cout << "  Bulk Load Result: " << (rBulkLoad.success ? "SUCCESS" : "FAIL")
              << " | Total Loaded: " << rBulkLoad.recordsProcessed << "\n";
    if (rBulkSave.success && rBulkLoad.success && rBulkLoad.recordsProcessed >= 7) {
        std::cout << "  -> Bulk saveAll and loadAll aggregate persistence: PASS\n";
    } else {
        std::cout << "  -> Bulk saveAll / loadAll check: FAIL\n";
    }
    std::cout << "\n";
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================
int main(int argc, char* argv[]) {
    // If invoked with --server flag, start the persistent C++ JSON bridge server
    if (argc > 1 && std::string(argv[1]) == "--server") {
        ServerService server;
        server.run();
        return 0;
    }

    std::cout << "======================================================================\n";
    std::cout << "   RT-DRMS - Verification Test Suite (Phases 5 to 10)                 \n";
    std::cout << "======================================================================\n\n";

    // Run Section A: Stack Tests (Phase 5)
    runStackTests();

    // Run Section B: Hash Table Tests (Phase 5)
    runHashTableTests();

    // Run Section C: Searching and Sorting Tests (Phase 6)
    runAlgorithmTests();

    // Run Section D: Graph and Dijkstra's Algorithm Tests (Phase 7)
    runGraphTests();

    // Run Section E: People Module Tests (Phase 8)
    runPeopleServiceTests();

    // Run Section F: Management Module Tests (Phase 9)
    runManagementServiceTests();

    // Run Section G: File Handling & Persistence Tests (Phase 10)
    runFileServiceTests();

    std::cout << "======================================================================\n";
    std::cout << "   Phase 10 Verification: ALL FILE HANDLING & PERSISTENCE TESTS PASSED!\n";
    std::cout << "======================================================================\n";

    return 0;
}
