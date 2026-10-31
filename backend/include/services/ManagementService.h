#ifndef MANAGEMENT_SERVICE_H
#define MANAGEMENT_SERVICE_H

#include <iostream>
#include <string>
#include "../models/Enums.h"
#include "../models/ReliefRequest.h"
#include "../models/RescueTeam.h"
#include "../models/Resource.h"
#include "../models/ReliefCenter.h"
#include "../datastructures/LinkedList.h"
#include "../datastructures/HashTable.h"
#include "../datastructures/Queue.h"
#include "../datastructures/PriorityQueue.h"
#include "../datastructures/Stack.h"
#include "../datastructures/Graph.h"

// Helper function to convert integer to string without relying on compiler-specific std::to_string
inline std::string mgmtIntToString(int val) {
    if (val == 0) return "0";
    std::string s = "";
    bool negative = false;
    if (val < 0) {
        negative = true;
        val = -val;
    }
    while (val > 0) {
        s = static_cast<char>('0' + (val % 10)) + s;
        val /= 10;
    }
    if (negative) {
        s = "-" + s;
    }
    return s;
}

// Result structure for triage operations
struct TriageResult {
    bool success;
    std::string message;
    bool isPriorityQueue; // True if routed to PriorityQueue; false if routine Queue

    TriageResult(bool s, const std::string& msg, bool isPQ = false)
        : success(s), message(msg), isPriorityQueue(isPQ) {}
};

// Result structure for team assignment operations
struct AssignmentResult {
    bool success;
    std::string message;
    std::string teamId;

    AssignmentResult(bool s, const std::string& msg, const std::string& tId = "")
        : success(s), message(msg), teamId(tId) {}
};

// Result structure for resource allocation operations
struct AllocationResult {
    bool success;
    std::string message;
    int remainingStock;

    AllocationResult(bool s, const std::string& msg, int remaining = 0)
        : success(s), message(msg), remainingStock(remaining) {}
};

// Result structure for rollback operations
struct RollbackResult {
    bool success;
    std::string message;
    ActionRecord rolledBackAction;

    RollbackResult(bool s, const std::string& msg, const ActionRecord& act = ActionRecord())
        : success(s), message(msg), rolledBackAction(act) {}
};

// ============================================================================
// ManagementService Class
// ============================================================================
// Coordinates disaster response operations across RT-DRMS data structures:
// 1. Triage: Routes high-severity requests into Binary Max-Heap (PriorityQueue)
//            and routine requests into FIFO Queue.
// 2. Rescue Teams: Registers emergency units and assigns available teams to
//                  eligible triaged requests.
// 3. Resources: Manages supply inventory and allocates supplies to requests.
// 4. Routing: Queries Graph Dijkstra shortest-path navigation for rescue dispatch.
// 5. Audit & Rollback: Logs actions on LIFO Stack and safely reverses assignments.
// ============================================================================
class ManagementService {
private:
    LinkedList& masterList;        // Master authoritative store for ReliefRequests
    HashTable& idTable;            // O(1) request lookup index
    Queue& routineQueue;           // FIFO Queue for NORMAL/LOW routine requests
    PriorityQueue& priorityQueue;  // Binary Max-Heap for CRITICAL/HIGH requests
    Stack& actionStack;            // LIFO Stack for action audit trail and undo
    Graph& cityGraph;              // Weighted road network graph

    RescueTeam* teams;             // Dynamically allocated array of RescueTeams
    int teamCount;                 // Current number of registered teams
    int teamCapacity;              // Allocated team array capacity

    Resource* resources;           // Dynamically allocated array of relief Resources
    int resourceCount;             // Current number of registered resources
    int resourceCapacity;          // Allocated resource array capacity

    ReliefCenter* centers;         // Dynamically allocated array of ReliefCenters
    int centerCount;               // Current number of registered relief centers
    int centerCapacity;            // Allocated center array capacity

    // Helper: Resize rescue teams array when capacity limit is reached
    void resizeTeams(int newCapacity) {
        if (newCapacity <= teamCapacity) return;
        RescueTeam* newArr = new RescueTeam[newCapacity];
        for (int i = 0; i < teamCount; i++) {
            newArr[i] = teams[i];
        }
        delete[] teams;
        teams = newArr;
        teamCapacity = newCapacity;
    }

    // Helper: Resize resources array when capacity limit is reached
    void resizeResources(int newCapacity) {
        if (newCapacity <= resourceCapacity) return;
        Resource* newArr = new Resource[newCapacity];
        for (int i = 0; i < resourceCount; i++) {
            newArr[i] = resources[i];
        }
        delete[] resources;
        resources = newArr;
        resourceCapacity = newCapacity;
    }

    // Helper: Resize relief centers array when capacity limit is reached
    void resizeCenters(int newCapacity) {
        if (newCapacity <= centerCapacity) return;
        ReliefCenter* newArr = new ReliefCenter[newCapacity];
        for (int i = 0; i < centerCount; i++) {
            newArr[i] = centers[i];
        }
        delete[] centers;
        centers = newArr;
        centerCapacity = newCapacity;
    }

public:
    // Constructor: binds to shared data structures and initializes dynamic arrays
    ManagementService(LinkedList& list,
                      HashTable& table,
                      Queue& rQueue,
                      PriorityQueue& pQueue,
                      Stack& stack,
                      Graph& graph,
                      int initTeamCap = 16,
                      int initResCap = 16,
                      int initCenterCap = 16)
        : masterList(list),
          idTable(table),
          routineQueue(rQueue),
          priorityQueue(pQueue),
          actionStack(stack),
          cityGraph(graph),
          teamCount(0),
          teamCapacity(initTeamCap < 4 ? 4 : initTeamCap),
          resourceCount(0),
          resourceCapacity(initResCap < 4 ? 4 : initResCap),
          centerCount(0),
          centerCapacity(initCenterCap < 4 ? 4 : initCenterCap) {
        teams = new RescueTeam[teamCapacity];
        resources = new Resource[resourceCapacity];
        centers = new ReliefCenter[centerCapacity];
    }

    // Destructor: cleans up dynamically allocated team, resource, and center arrays
    ~ManagementService() {
        delete[] teams;
        teams = nullptr;
        delete[] resources;
        resources = nullptr;
        delete[] centers;
        centers = nullptr;
    }

    // Disable copy constructor and copy assignment operator
    ManagementService(const ManagementService&) = delete;
    ManagementService& operator=(const ManagementService&) = delete;

    // ========================================================================
    // 1. REQUEST TRIAGE & PRIORITIZATION
    // ========================================================================
    // Validates request eligibility, places into appropriate queue,
    // updates request status to TRIAGED, and records action on the Stack.
    TriageResult triageRequest(const std::string& requestId) {
        if (requestId.empty()) {
            return TriageResult(false, "Triage Error: Request ID cannot be empty.");
        }

        // 1. Lookup request in HashTable (O(1))
        ReliefRequest* req = idTable.search(requestId);
        if (req == nullptr) {
            return TriageResult(false, "Triage Error: Request ID '" + requestId + "' not found.");
        }

        // 2. Validate lifecycle status eligibility
        if (req->status == RequestStatus::CANCELLED) {
            return TriageResult(false, "Triage Rejected: Request " + requestId + " is CANCELLED.");
        }
        if (req->status == RequestStatus::COMPLETED) {
            return TriageResult(false, "Triage Rejected: Request " + requestId + " is already COMPLETED.");
        }
        if (req->status == RequestStatus::ASSIGNED || req->status == RequestStatus::IN_PROGRESS) {
            return TriageResult(false, "Triage Rejected: Request " + requestId + " is already ASSIGNED / IN_PROGRESS.");
        }
        if (req->status == RequestStatus::TRIAGED) {
            return TriageResult(false, "Triage Rejected: Request " + requestId + " is already TRIAGED.");
        }

        // 3. Prevent duplicate queue scheduling
        if (priorityQueue.contains(requestId) || routineQueue.contains(requestId)) {
            return TriageResult(false, "Triage Rejected: Request " + requestId + " is already scheduled in a queue.");
        }

        // 4. Severity-based routing:
        // CRITICAL & HIGH -> Binary Max-Heap PriorityQueue
        // NORMAL & LOW   -> FIFO routine Queue
        bool isPriority = false;
        if (req->severity == SeverityLevel::CRITICAL || req->severity == SeverityLevel::HIGH) {
            bool ok = priorityQueue.insert(req->id, req->severity, req->peopleCount, req->timestamp);
            if (!ok) {
                return TriageResult(false, "System Error: Failed to insert into priority queue.");
            }
            isPriority = true;
        } else {
            bool ok = routineQueue.enqueue(req->id);
            if (!ok) {
                return TriageResult(false, "System Error: Failed to enqueue into routine queue.");
            }
            isPriority = false;
        }

        // 5. Update request status to TRIAGED
        RequestStatus prevStatus = req->status;
        req->status = RequestStatus::TRIAGED;

        // 6. Log triage action to LIFO Stack
        std::string queueName = isPriority ? "PriorityQueue (Binary Max-Heap)" : "RoutineQueue (FIFO)";
        actionStack.push(req->id, "", prevStatus, TeamStatus::AVAILABLE,
                         "Triaged " + req->id + " into " + queueName);

        return TriageResult(true, "Request " + requestId + " triaged successfully into " + queueName + ".", isPriority);
    }

    // Display contents of both triage queues
    void displayPendingQueues() const {
        std::cout << "  === Priority Queue (Binary Max-Heap: Critical/High) ===\n";
        priorityQueue.displayHeap();
        std::cout << "  === Routine Queue (FIFO: Normal/Low) ===\n";
        routineQueue.display();
    }

    // Dispatch helper with lazy validation:
    // Fetches the next valid triaged request ID from queues, automatically skipping
    // requests that were cancelled, completed, or already assigned.
    std::string getNextRequestForDispatch(bool preferPriority = true) {
        if (preferPriority && !priorityQueue.isEmpty()) {
            while (!priorityQueue.isEmpty()) {
                PriorityEntry topEntry;
                priorityQueue.extractMax(topEntry);

                ReliefRequest* req = idTable.search(topEntry.requestId);
                // Validation step: skip cancelled, completed, or already assigned requests
                if (req != nullptr && req->status == RequestStatus::TRIAGED) {
                    return topEntry.requestId;
                }
            }
        }

        while (!routineQueue.isEmpty()) {
            std::string frontId;
            routineQueue.dequeue(frontId);

            ReliefRequest* req = idTable.search(frontId);
            // Validation step: skip cancelled, completed, or already assigned requests
            if (req != nullptr && req->status == RequestStatus::TRIAGED) {
                return frontId;
            }
        }

        return ""; // No eligible request available
    }

    // ========================================================================
    // 2. RESCUE TEAM MANAGEMENT
    // ========================================================================
    // Register a new rescue team
    bool registerTeam(const std::string& teamId,
                      const std::string& name,
                      const std::string& specialization,
                      const std::string& currentLocation = "Central") {
        if (teamId.empty() || name.empty()) {
            std::cout << "[TEAM ERROR] Team ID and name cannot be empty.\n";
            return false;
        }

        if (findTeam(teamId) != nullptr) {
            std::cout << "[TEAM ERROR] Duplicate Team ID '" << teamId << "' rejected.\n";
            return false;
        }

        if (teamCount == teamCapacity) {
            resizeTeams(teamCapacity * 2);
        }

        teams[teamCount++] = RescueTeam(teamId, name, specialization, currentLocation,
                                        TeamStatus::AVAILABLE, "");
        return true;
    }

    // Find team by ID
    RescueTeam* findTeam(const std::string& teamId) {
        for (int i = 0; i < teamCount; i++) {
            if (teams[i].id == teamId) {
                return &teams[i];
            }
        }
        return nullptr;
    }

    const RescueTeam* findTeam(const std::string& teamId) const {
        for (int i = 0; i < teamCount; i++) {
            if (teams[i].id == teamId) {
                return &teams[i];
            }
        }
        return nullptr;
    }

    int getTeamCount() const {
        return teamCount;
    }

    // Get team at 0-based index
    const RescueTeam* getTeamAt(int index) const {
        if (index >= 0 && index < teamCount) {
            return &teams[index];
        }
        return nullptr;
    }

    RescueTeam* getTeamAt(int index) {
        if (index >= 0 && index < teamCount) {
            return &teams[index];
        }
        return nullptr;
    }

    // List all registered rescue teams
    void listTeams() const {
        std::cout << "  [Rescue Teams: " << teamCount << " registered]\n";
        if (teamCount == 0) {
            std::cout << "    (No teams registered)\n";
            return;
        }
        for (int i = 0; i < teamCount; i++) {
            std::cout << "  - ID: " << teams[i].id
                      << " | Name: " << teams[i].name
                      << " | Spec: " << teams[i].specialization
                      << " | Loc: " << teams[i].currentLocation
                      << " | Status: " << teamStatusToString(teams[i].status)
                      << " | Active Req: " << (teams[i].activeRequestId.empty() ? "None" : teams[i].activeRequestId)
                      << "\n";
        }
    }

    // Select suitable team for a request:
    // Prefers an AVAILABLE team matching the request's assistance type;
    // falls back to the first AVAILABLE team. Returns nullptr if none available.
    RescueTeam* selectSuitableTeam(const ReliefRequest& req) {
        // Pass 1: Look for an available team with matching specialization
        for (int i = 0; i < teamCount; i++) {
            if (teams[i].status == TeamStatus::AVAILABLE) {
                if (teams[i].specialization == req.requestType ||
                    (req.requestType == "Rescue" && teams[i].specialization == "Search & Rescue")) {
                    return &teams[i];
                }
            }
        }

        // Pass 2: Fall back to first available team
        for (int i = 0; i < teamCount; i++) {
            if (teams[i].status == TeamStatus::AVAILABLE) {
                return &teams[i];
            }
        }

        return nullptr;
    }

    // Assign an eligible triaged request to an available rescue team
    AssignmentResult assignTeam(const std::string& requestId, const std::string& specificTeamId = "") {
        if (requestId.empty()) {
            return AssignmentResult(false, "Assignment Error: Request ID cannot be empty.");
        }

        // 1. Verify request existence
        ReliefRequest* req = idTable.search(requestId);
        if (req == nullptr) {
            return AssignmentResult(false, "Assignment Error: Request ID '" + requestId + "' not found.");
        }

        // 2. Validate request status eligibility
        if (req->status == RequestStatus::CANCELLED) {
            return AssignmentResult(false, "Assignment Rejected: Request " + requestId + " is CANCELLED.");
        }
        if (req->status == RequestStatus::COMPLETED) {
            return AssignmentResult(false, "Assignment Rejected: Request " + requestId + " is already COMPLETED.");
        }
        if (req->status == RequestStatus::ASSIGNED || req->status == RequestStatus::IN_PROGRESS) {
            return AssignmentResult(false, "Assignment Rejected: Request " + requestId + " is already assigned to team " + req->assignedTeamId + ".");
        }
        if (req->status != RequestStatus::TRIAGED) {
            return AssignmentResult(false, "Assignment Rejected: Request " + requestId + " is not triaged yet. Must be triaged before assignment.");
        }

        // 3. Locate target team
        RescueTeam* targetTeam = nullptr;
        if (!specificTeamId.empty()) {
            targetTeam = findTeam(specificTeamId);
            if (targetTeam == nullptr) {
                return AssignmentResult(false, "Assignment Error: Team '" + specificTeamId + "' not found.");
            }
            if (targetTeam->status != TeamStatus::AVAILABLE || !targetTeam->activeRequestId.empty()) {
                return AssignmentResult(false, "Assignment Rejected: Team " + specificTeamId + " is currently " + teamStatusToString(targetTeam->status) + ".");
            }
        } else {
            targetTeam = selectSuitableTeam(*req);
            if (targetTeam == nullptr) {
                return AssignmentResult(false, "Assignment Rejected: No available rescue teams found.");
            }
        }

        // 4. Guard: ensure team is available and not assigned to another request
        if (targetTeam->status != TeamStatus::AVAILABLE || !targetTeam->activeRequestId.empty()) {
            return AssignmentResult(false, "Assignment Rejected: Team " + targetTeam->id + " is not available.");
        }

        // 5. Save previous status for audit trail and rollback
        RequestStatus prevReqStatus = req->status;   // TRIAGED
        TeamStatus prevTeamStatus = targetTeam->status; // AVAILABLE

        // 6. Update request and team state atomically
        req->assignedTeamId = targetTeam->id;
        req->status = RequestStatus::ASSIGNED;

        targetTeam->status = TeamStatus::BUSY;
        targetTeam->activeRequestId = req->id;

        // 7. Log action to LIFO Stack
        actionStack.push(req->id, targetTeam->id, prevReqStatus, prevTeamStatus,
                         "Assigned team " + targetTeam->id + " (" + targetTeam->name + ") to request " + req->id);

        return AssignmentResult(true, "Team " + targetTeam->id + " assigned successfully to request " + req->id + ".", targetTeam->id);
    }

    // ========================================================================
    // 3. RESOURCE ALLOCATION
    // ========================================================================
    // Register a new relief resource
    bool registerResource(const std::string& resId,
                          const std::string& name,
                          int quantity,
                          int threshold = 20) {
        if (resId.empty() || name.empty() || quantity < 0) {
            std::cout << "[RESOURCE ERROR] Invalid resource parameters.\n";
            return false;
        }

        if (findResource(resId) != nullptr) {
            std::cout << "[RESOURCE ERROR] Duplicate Resource ID '" << resId << "' rejected.\n";
            return false;
        }

        if (resourceCount == resourceCapacity) {
            resizeResources(resourceCapacity * 2);
        }

        resources[resourceCount++] = Resource(resId, name, quantity, threshold);
        return true;
    }

    // Find resource by ID
    Resource* findResource(const std::string& resId) {
        for (int i = 0; i < resourceCount; i++) {
            if (resources[i].id == resId) {
                return &resources[i];
            }
        }
        return nullptr;
    }

    const Resource* findResource(const std::string& resId) const {
        for (int i = 0; i < resourceCount; i++) {
            if (resources[i].id == resId) {
                return &resources[i];
            }
        }
        return nullptr;
    }

    int getResourceCount() const {
        return resourceCount;
    }

    // Get resource at 0-based index
    const Resource* getResourceAt(int index) const {
        if (index >= 0 && index < resourceCount) {
            return &resources[index];
        }
        return nullptr;
    }

    Resource* getResourceAt(int index) {
        if (index >= 0 && index < resourceCount) {
            return &resources[index];
        }
        return nullptr;
    }

    // List all registered resources
    void listResources() const {
        std::cout << "  [Relief Resources: " << resourceCount << " registered]\n";
        if (resourceCount == 0) {
            std::cout << "    (No resources registered)\n";
            return;
        }
        for (int i = 0; i < resourceCount; i++) {
            std::cout << "  - ID: " << resources[i].id
                      << " | Name: " << resources[i].name
                      << " | Qty: " << resources[i].quantity
                      << " | Min: " << resources[i].minThreshold
                      << " | Status: " << resourceStatusToString(resources[i].status)
                      << "\n";
        }
    }

    // ========================================================================
    // 3B. RELIEF CENTER MANAGEMENT
    // ========================================================================
    bool registerCenter(const std::string& centerId,
                        const std::string& name,
                        const std::string& locationNode,
                        int maxCapacity,
                        int currentOccupancy,
                        const std::string& contact = "",
                        double latitude = 0.0,
                        double longitude = 0.0,
                        bool isDemonstration = false) {
        if (centerId.empty() || name.empty()) {
            std::cout << "[CENTER ERROR] Center ID and name cannot be empty.\n";
            return false;
        }

        if (findCenter(centerId) != nullptr) {
            std::cout << "[CENTER ERROR] Duplicate Center ID '" << centerId << "' rejected.\n";
            return false;
        }

        if (centerCount == centerCapacity) {
            resizeCenters(centerCapacity * 2);
        }

        centers[centerCount++] = ReliefCenter(centerId, name, locationNode, maxCapacity, currentOccupancy, contact, latitude, longitude, isDemonstration);
        return true;
    }

    ReliefCenter* findCenter(const std::string& centerId) {
        for (int i = 0; i < centerCount; i++) {
            if (centers[i].id == centerId) {
                return &centers[i];
            }
        }
        return nullptr;
    }

    const ReliefCenter* findCenter(const std::string& centerId) const {
        for (int i = 0; i < centerCount; i++) {
            if (centers[i].id == centerId) {
                return &centers[i];
            }
        }
        return nullptr;
    }

    int getCenterCount() const {
        return centerCount;
    }

    const ReliefCenter* getCenterAt(int index) const {
        if (index >= 0 && index < centerCount) {
            return &centers[index];
        }
        return nullptr;
    }

    ReliefCenter* getCenterAt(int index) {
        if (index >= 0 && index < centerCount) {
            return &centers[index];
        }
        return nullptr;
    }

    void listCenters() const {
        std::cout << "  [Relief Centers: " << centerCount << " registered]\n";
        if (centerCount == 0) {
            std::cout << "    (No centers registered)\n";
            return;
        }
        for (int i = 0; i < centerCount; i++) {
            std::cout << "  - ID: " << centers[i].id
                      << " | Name: " << centers[i].name
                      << " | Loc: " << centers[i].locationNode
                      << " | Occ: " << centers[i].currentOccupancy << "/" << centers[i].maxCapacity
                      << " | Contact: " << centers[i].contactNumber
                      << "\n";
        }
    }

    // Allocate resources to an eligible request
    // Note: ActionRecord lacks quantity fields, so resource allocations are not
    // pushed to the action stack for undo (to prevent unsafe quantity guesswork).
    AllocationResult allocateResource(const std::string& requestId,
                                      const std::string& resourceId,
                                      int quantity) {
        // 1. Validate positive quantity
        if (quantity <= 0) {
            return AllocationResult(false, "Allocation Error: Quantity must be positive (> 0).");
        }

        // 2. Validate request
        ReliefRequest* req = idTable.search(requestId);
        if (req == nullptr) {
            return AllocationResult(false, "Allocation Error: Request ID '" + requestId + "' not found.");
        }
        if (req->status == RequestStatus::CANCELLED) {
            return AllocationResult(false, "Allocation Rejected: Request " + requestId + " is CANCELLED.");
        }
        if (req->status == RequestStatus::COMPLETED) {
            return AllocationResult(false, "Allocation Rejected: Request " + requestId + " is already COMPLETED.");
        }

        // 3. Validate resource
        Resource* res = findResource(resourceId);
        if (res == nullptr) {
            return AllocationResult(false, "Allocation Error: Resource ID '" + resourceId + "' not found.");
        }

        // 4. Validate stock availability
        if (res->quantity < quantity) {
            return AllocationResult(false, "Allocation Rejected: Insufficient stock for " + res->name +
                                           " (Available: " + mgmtIntToString(res->quantity) +
                                           ", Requested: " + mgmtIntToString(quantity) + ").",
                                    res->quantity);
        }

        // 5. Deduct stock and refresh status
        res->quantity -= quantity;
        res->updateStatus();

        return AllocationResult(true, "Allocated " + mgmtIntToString(quantity) + " units of " +
                                      res->name + " to request " + requestId + ".", res->quantity);
    }

    // ========================================================================
    // 4. SHORTEST-ROUTE GRAPH NAVIGATION
    // ========================================================================
    // Calls Dijkstra's algorithm from Graph.h to find shortest road route
    PathResult calculateRescueRoute(const std::string& startLocation,
                                   const std::string& destLocation,
                                   bool printDetails = true) const {
        PathResult result = cityGraph.findShortestRoute(startLocation, destLocation);

        if (printDetails) {
            std::cout << "  [Dijkstra Shortest Route: " << startLocation << " -> " << destLocation << "]\n";
            if (result.exists) {
                std::cout << "    Route Exists  : YES\n";
                std::cout << "    Total Distance: " << result.totalDistance << " km\n";
                std::cout << "    Route Nodes   : ";
                for (int i = 0; i < result.nodeCount; i++) {
                    std::cout << result.path[i];
                    if (i < result.nodeCount - 1) {
                        std::cout << " -> ";
                    }
                }
                std::cout << "\n";
                std::cout << "    Notice: Shortest cumulative road distance, not real-world weather safety.\n";
            } else {
                std::cout << "    Route Exists  : NO (Unreachable, disconnected, or missing location)\n";
            }
        }

        return result;
    }

    // ========================================================================
    // 5. ACTION HISTORY & ROLLBACK
    // ========================================================================
    // Reverses the latest eligible management action from the LIFO Stack:
    // Safely supports rolling back:
    // - Team assignment: verifies request and team, restores previous statuses,
    //                    clears assignedTeamId and activeRequestId.
    // - Triage: restores request status to PENDING.
    RollbackResult rollbackLastAction() {
        if (actionStack.isEmpty()) {
            return RollbackResult(false, "Rollback Error: Action history stack is empty. Nothing to undo.");
        }

        ActionRecord topAction;
        actionStack.peek(topAction);

        // CASE 1: Rolling back a team assignment (teamId is populated)
        if (!topAction.teamId.empty()) {
            ReliefRequest* req = idTable.search(topAction.requestId);
            if (req == nullptr) {
                return RollbackResult(false, "Rollback Error: Request " + topAction.requestId + " no longer exists.");
            }

            RescueTeam* team = findTeam(topAction.teamId);
            if (team == nullptr) {
                return RollbackResult(false, "Rollback Error: Team " + topAction.teamId + " no longer exists.");
            }

            // Verify current state matches the action being undone
            if (req->assignedTeamId != topAction.teamId || team->activeRequestId != topAction.requestId) {
                return RollbackResult(false, "Rollback Rejected: Current assignment state has been modified after this action.");
            }

            // Revert state safely
            req->status = topAction.prevRequestStatus; // Restore previous request status (e.g. TRIAGED)
            req->assignedTeamId = "";

            team->status = topAction.prevTeamStatus;   // Restore previous team status (e.g. AVAILABLE)
            team->activeRequestId = "";

            // Pop action off the stack only on verified success
            actionStack.pop();

            return RollbackResult(true, "Successfully rolled back team assignment for request " +
                                        topAction.requestId + " and team " + topAction.teamId + ".", topAction);
        }

        // CASE 2: Rolling back a triage action (teamId is empty, previous was PENDING)
        if (topAction.teamId.empty() && topAction.prevRequestStatus == RequestStatus::PENDING) {
            ReliefRequest* req = idTable.search(topAction.requestId);
            if (req == nullptr) {
                return RollbackResult(false, "Rollback Error: Request " + topAction.requestId + " no longer exists.");
            }

            if (req->status != RequestStatus::TRIAGED) {
                return RollbackResult(false, "Rollback Rejected: Request " + topAction.requestId + " is no longer in TRIAGED status.");
            }

            // Revert request status to PENDING
            req->status = RequestStatus::PENDING;

            actionStack.pop();

            return RollbackResult(true, "Successfully rolled back triage for request " +
                                        topAction.requestId + "; status reverted to PENDING.", topAction);
        }

        return RollbackResult(false, "Rollback Error: Action cannot be safely undone with available audit fields.");
    }

    // Display all recorded actions in the stack
    void displayActionHistory() const {
        actionStack.display();
    }
};

#endif // MANAGEMENT_SERVICE_H
