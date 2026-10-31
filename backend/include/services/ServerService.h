#ifndef SERVER_SERVICE_H
#define SERVER_SERVICE_H

#include <iostream>
#include <string>
#include <sstream>
#include <ctime>
#include <cmath>
#include "../models/Enums.h"
#include "../models/ReliefRequest.h"
#include "../models/RescueTeam.h"
#include "../models/Resource.h"
#include "../models/ReliefCenter.h"
#include "../models/TeamLocation.h"
#include "../datastructures/LinkedList.h"
#include "../datastructures/HashTable.h"
#include "../datastructures/Queue.h"
#include "../datastructures/PriorityQueue.h"
#include "../datastructures/Stack.h"
#include "../datastructures/Graph.h"
#include "PeopleService.h"
#include "ManagementService.h"
#include "FileService.h"
#include "../utils/Algorithms.h"

// ============================================================================
// Simple JSON Utility Functions for Standard I/O Bridge
// ============================================================================
namespace JsonUtil {

    // Safely escapes special JSON characters
    inline std::string escape(const std::string& input) {
        std::string out = "";
        for (size_t i = 0; i < input.length(); i++) {
            char c = input[i];
            if (c == '"') out += "\\\"";
            else if (c == '\\') out += "\\\\";
            else if (c == '\b') out += "\\b";
            else if (c == '\f') out += "\\f";
            else if (c == '\n') out += "\\n";
            else if (c == '\r') out += "\\r";
            else if (c == '\t') out += "\\t";
            else out += c;
        }
        return out;
    }

    // Safely extracts a string or primitive field value by key from a flat JSON line
    inline std::string getString(const std::string& json, const std::string& key) {
        std::string searchKey = "\"" + key + "\"";
        size_t pos = json.find(searchKey);
        if (pos == std::string::npos) return "";
        pos += searchKey.length();

        while (pos < json.length() && (json[pos] == ' ' || json[pos] == ':' || json[pos] == '\t')) {
            pos++;
        }
        if (pos >= json.length()) return "";

        if (json[pos] == '"') {
            pos++;
            std::string val = "";
            while (pos < json.length()) {
                if (json[pos] == '\\' && pos + 1 < json.length()) {
                    val += json[pos + 1];
                    pos += 2;
                } else if (json[pos] == '"') {
                    break;
                } else {
                    val += json[pos++];
                }
            }
            return val;
        } else {
            // Unquoted token (numeric or boolean)
            std::string val = "";
            while (pos < json.length() && json[pos] != ',' && json[pos] != '}' && json[pos] != ' ' && json[pos] != '\r' && json[pos] != '\n') {
                val += json[pos++];
            }
            return val;
        }
    }

    // Extracts an integer value by key
    inline int getInt(const std::string& json, const std::string& key, int defaultVal = 0) {
        std::string s = getString(json, key);
        if (s.empty()) return defaultVal;
        try {
            return std::stoi(s);
        } catch (...) {
            return defaultVal;
        }
    }

    // Extracts a 64-bit integer value by key
    inline long long getInt64(const std::string& json, const std::string& key, long long defaultVal = 0) {
        std::string s = getString(json, key);
        if (s.empty()) return defaultVal;
        try {
            return std::stoll(s);
        } catch (...) {
            return defaultVal;
        }
    }

    // Extracts a floating point value by key
    inline double getDouble(const std::string& json, const std::string& key, double defaultVal = 0.0) {
        std::string s = getString(json, key);
        if (s.empty()) return defaultVal;
        try {
            return std::stod(s);
        } catch (...) {
            return defaultVal;
        }
    }

    // Extracts a boolean value by key
    inline bool getBool(const std::string& json, const std::string& key, bool defaultVal = false) {
        std::string s = getString(json, key);
        if (s.empty()) return defaultVal;
        if (s == "true" || s == "1") return true;
        if (s == "false" || s == "0") return false;
        return defaultVal;
    }

    // Serializes a ReliefRequest to JSON
    inline std::string requestToJson(const ReliefRequest& r) {
        std::stringstream ss;
        ss << "{"
           << "\"id\":\"" << escape(r.id) << "\","
           << "\"name\":\"" << escape(r.citizenName) << "\","
           << "\"phone\":\"" << escape(r.contactPhone) << "\","
           << "\"location\":\"" << escape(r.location) << "\","
           << "\"disaster\":\"" << escape(r.disasterType) << "\","
           << "\"type\":\"" << escape(r.requestType) << "\","
           << "\"people\":" << r.peopleCount << ","
           << "\"severity\":\"" << severityToString(r.severity) << "\","
           << "\"status\":\"" << requestStatusToString(r.status) << "\","
           << "\"details\":\"" << escape(r.details) << "\","
           << "\"team\":\"" << escape(r.assignedTeamId) << "\","
           << "\"assignedTeamId\":\"" << escape(r.assignedTeamId) << "\","
           << "\"timestamp\":" << r.timestamp << ","
           << "\"date\":\"2026-10-12T10:00:00.000Z\","
           << "\"familiesCount\":" << r.familiesCount << ","
           << "\"childrenCount\":" << r.childrenCount << ","
           << "\"elderlyCount\":" << r.elderlyCount << ","
           << "\"injuredCount\":" << r.injuredCount << ","
           << "\"foodPackets\":" << r.foodPackets << ","
           << "\"waterLitres\":" << r.waterLitres << ","
           << "\"medicalKits\":" << r.medicalKits << ","
           << "\"blankets\":" << r.blankets << ","
           << "\"otherSupplies\":\"" << escape(r.otherSupplies) << "\","
           << "\"landmark\":\"" << escape(r.landmark) << "\","
           << "\"latitude\":" << r.latitude << ","
           << "\"longitude\":" << r.longitude << ","
           << "\"directions\":\"" << escape(r.directions) << "\""
           << "}";
        return ss.str();
    }

    // Serializes a RescueTeam to JSON
    inline std::string teamToJson(const RescueTeam& t) {
        std::stringstream ss;
        ss << "{"
           << "\"id\":\"" << escape(t.id) << "\","
           << "\"name\":\"" << escape(t.name) << "\","
           << "\"specialization\":\"" << escape(t.specialization) << "\","
           << "\"location\":\"" << escape(t.currentLocation) << "\","
           << "\"currentLocation\":\"" << escape(t.currentLocation) << "\","
           << "\"status\":\"" << teamStatusToString(t.status) << "\","
           << "\"assignment\":\"" << escape(t.activeRequestId) << "\","
           << "\"activeRequestId\":\"" << escape(t.activeRequestId) << "\""
           << "}";
        return ss.str();
    }

    // Serializes a Resource to JSON
    inline std::string resourceToJson(const Resource& r) {
        std::stringstream ss;
        ss << "{"
           << "\"id\":\"" << escape(r.id) << "\","
           << "\"name\":\"" << escape(r.name) << "\","
           << "\"quantity\":" << r.quantity << ","
           << "\"minThreshold\":" << r.minThreshold << ","
           << "\"status\":\"" << resourceStatusToString(r.status) << "\""
           << "}";
        return ss.str();
    }

    // Serializes a ReliefCenter to JSON
    inline std::string centerToJson(const ReliefCenter& c) {
        std::stringstream ss;
        ss << "{"
           << "\"id\":\"" << escape(c.id) << "\","
           << "\"name\":\"" << escape(c.name) << "\","
           << "\"location\":\"" << escape(c.locationNode) << "\","
           << "\"locationNode\":\"" << escape(c.locationNode) << "\","
           << "\"capacity\":" << c.maxCapacity << ","
           << "\"maxCapacity\":" << c.maxCapacity << ","
           << "\"current\":" << c.currentOccupancy << ","
           << "\"currentOccupancy\":" << c.currentOccupancy << ","
           << "\"availableCapacity\":" << c.getAvailableCapacity() << ","
           << "\"contactNumber\":\"" << escape(c.contactNumber) << "\","
           << "\"latitude\":" << c.latitude << ","
           << "\"longitude\":" << c.longitude << ","
           << "\"isDemonstration\":" << (c.isDemonstration ? "true" : "false")
           << "}";
        return ss.str();
    }

    // Serializes a TeamLocation to JSON with real-time freshness classification
    inline std::string locationToJson(const TeamLocation& loc, long long now = 0, int threshold = 60) {
        if (now == 0) now = (long long)std::time(nullptr);
        LocationFreshness freshness = loc.getFreshness(now, threshold);
        long long age = (now >= loc.timestamp && loc.timestamp > 0) ? (now - loc.timestamp) : 0;
        std::stringstream ss;
        ss << "{"
           << "\"teamId\":\"" << escape(loc.teamId) << "\","
           << "\"latitude\":" << loc.latitude << ","
           << "\"longitude\":" << loc.longitude << ","
           << "\"accuracy\":" << loc.accuracy << ","
           << "\"timestamp\":" << loc.timestamp << ","
           << "\"activeRequestId\":\"" << escape(loc.activeRequestId) << "\","
           << "\"isSimulated\":" << (loc.isSimulated ? "true" : "false") << ","
           << "\"isSharing\":" << (loc.isSharing ? "true" : "false") << ","
           << "\"freshness\":\"" << freshnessToString(freshness) << "\","
           << "\"freshnessDescription\":\"" << escape(freshnessToDescription(freshness)) << "\","
           << "\"ageSeconds\":" << age
           << "}";
        return ss.str();
    }
}

// ============================================================================
// ServerService Class
// ============================================================================
// Provides a persistent command loop over standard I/O (stdin/stdout) for
// integration with the Node.js HTTP bridge.
// - Diagnostic logging is directed strictly to std::cerr.
// - Standard I/O (stdout) outputs strictly single-line valid JSON responses.
// ============================================================================
class ServerService {
private:
    LinkedList masterList;
    HashTable idTable;
    Queue routineQueue;
    PriorityQueue priorityQueue;
    Stack actionStack;
    Graph cityGraph;

    PeopleService peopleService;
    ManagementService mgmtService;

    // Phase 3: Team GPS Location Tracking
    TeamLocation teamLocations[32];
    int teamLocationCount;
    int locationFreshnessThreshold; // Configurable threshold in seconds (default: 60s)

public:
    ServerService()
        : masterList(),
          idTable(19),
          routineQueue(),
          priorityQueue(50),
          actionStack(),
          cityGraph(10),
          peopleService(masterList, idTable, 1001),
          mgmtService(masterList, idTable, routineQueue, priorityQueue, actionStack, cityGraph),
          teamLocationCount(0),
          locationFreshnessThreshold(60) {

        // Initialize geographical road network graph for Dijkstra routing
        initCityGraph();

        // Load persistent stores from backend/data
        loadStores();
    }

    ~ServerService() {
        // Automatically save on shutdown
        saveStores();
    }

    TeamLocation* findTeamLocation(const std::string& teamId) {
        for (int i = 0; i < teamLocationCount; i++) {
            if (teamLocations[i].teamId == teamId) {
                return &teamLocations[i];
            }
        }
        return nullptr;
    }

    const TeamLocation* findTeamLocation(const std::string& teamId) const {
        for (int i = 0; i < teamLocationCount; i++) {
            if (teamLocations[i].teamId == teamId) {
                return &teamLocations[i];
            }
        }
        return nullptr;
    }

    void upsertTeamLocation(const TeamLocation& loc) {
        TeamLocation* existing = findTeamLocation(loc.teamId);
        if (existing != nullptr) {
            *existing = loc;
        } else if (teamLocationCount < 32) {
            teamLocations[teamLocationCount++] = loc;
        }
    }

    int getLocationThreshold() const {
        return locationFreshnessThreshold;
    }

    void setLocationThreshold(int th) {
        if (th > 0) locationFreshnessThreshold = th;
    }

    void initCityGraph() {
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
    }

    void loadStores() {
        std::cerr << "[C++ Backend] Loading persistent stores from backend/data/...\n";
        FileOperationResult rReq = FileService::loadRequests(FileService::DEFAULT_REQUESTS_FILE, masterList, idTable, false);
        FileOperationResult rTeams = FileService::loadTeams(FileService::DEFAULT_TEAMS_FILE, mgmtService);
        FileOperationResult rRes = FileService::loadResources(FileService::DEFAULT_RESOURCES_FILE, mgmtService);
        FileOperationResult rCenters = FileService::loadCenters(FileService::DEFAULT_CENTERS_FILE, mgmtService);
        FileOperationResult rLoc = FileService::loadLocations(FileService::DEFAULT_LOCATIONS_FILE, teamLocations, 32, teamLocationCount);

        if (mgmtService.getCenterCount() == 0) {
            mgmtService.registerCenter("C-1", "Central Relief Camp", "Central", 150, 80, "1800-111-222");
            mgmtService.registerCenter("C-2", "North Shelter", "North", 200, 190, "1800-333-444");
            mgmtService.registerCenter("C-3", "East Medical Post", "East", 50, 20, "1800-555-666");
            mgmtService.registerCenter("C-PN-01", "PMC Disaster Management Cell", "Shivajinagar", 250, 0, "020-25501269", 18.5314, 73.8446, false);
            mgmtService.registerCenter("C-PN-02", "Nehru Stadium Sports & Emergency Shelter", "Swargate", 500, 45, "020-24440317", 18.5028, 73.8567, false);
            mgmtService.registerCenter("C-PN-03", "Yashwantrao Chavan Community Staging Center", "Kothrud", 350, 20, "020-25381864", 18.5012, 73.8093, false);
            mgmtService.registerCenter("C-PN-04", "Hadapsar Ward Office & Transit Center", "Hadapsar", 200, 15, "020-26870020", 18.5004, 73.9340, false);
            mgmtService.registerCenter("C-PN-05", "Shree Shiv Chhatrapati Sports Complex", "Baner", 1000, 0, "020-27372000", 18.5744, 73.7698, false);
            mgmtService.registerCenter("C-PN-06", "Annasaheb Magar Stadium Relief Camp", "Pimpri-Chinchwad", 400, 10, "020-27425511", 18.6365, 73.8227, false);
            mgmtService.registerCenter("C-PN-07", "Divisional Sports Complex & Transit Hub", "Yerawada", 300, 0, "020-26680455", 18.5532, 73.8734, false);
            FileService::saveCenters(FileService::DEFAULT_CENTERS_FILE, mgmtService, true);
        }

        std::cerr << "[C++ Backend] Loaded: " << rReq.recordsProcessed << " requests, "
                  << rTeams.recordsProcessed << " teams, "
                  << rRes.recordsProcessed << " resources, "
                  << mgmtService.getCenterCount() << " centers, "
                  << rLoc.recordsProcessed << " team locations.\n";
    }

    void saveStores() {
        FileService::saveRequests(FileService::DEFAULT_REQUESTS_FILE, masterList, true);
        FileService::saveTeams(FileService::DEFAULT_TEAMS_FILE, mgmtService, true);
        FileService::saveResources(FileService::DEFAULT_RESOURCES_FILE, mgmtService, true);
        FileService::saveCenters(FileService::DEFAULT_CENTERS_FILE, mgmtService, true);
        FileService::saveLocations(FileService::DEFAULT_LOCATIONS_FILE, teamLocations, teamLocationCount, true);
    }

    // Handles a single incoming JSON command line and generates a single-line JSON response
    std::string processCommand(const std::string& line) {
        if (line.empty()) {
            return "{\"success\":false,\"message\":\"Empty command received\"}";
        }

        std::string cmd = JsonUtil::getString(line, "cmd");

        // 1. HEALTH CHECK
        if (cmd == "health") {
            return "{\"success\":true,\"status\":\"ok\",\"message\":\"RT-DRMS C++ Core Online\",\"requestsCount\":" +
                   std::to_string(masterList.getSize()) + "}";
        }

        // 2. DASHBOARD STATS
        if (cmd == "get_stats") {
            int total = 0, pending = 0, triaged = 0, assigned = 0, inProg = 0, completed = 0, cancelled = 0;
            int critical = 0, high = 0;

            const Node* curr = masterList.getHead();
            while (curr != nullptr) {
                total++;
                const ReliefRequest& r = curr->data;
                if (r.status == RequestStatus::PENDING) pending++;
                else if (r.status == RequestStatus::TRIAGED) triaged++;
                else if (r.status == RequestStatus::ASSIGNED) assigned++;
                else if (r.status == RequestStatus::IN_PROGRESS) inProg++;
                else if (r.status == RequestStatus::COMPLETED) completed++;
                else if (r.status == RequestStatus::CANCELLED) cancelled++;

                if (r.severity == SeverityLevel::CRITICAL) critical++;
                else if (r.severity == SeverityLevel::HIGH) high++;

                curr = curr->next;
            }

            int availTeams = 0;
            for (int i = 0; i < mgmtService.getTeamCount(); i++) {
                const RescueTeam* t = mgmtService.getTeamAt(i);
                if (t && t->status == TeamStatus::AVAILABLE) availTeams++;
            }

            int totalStock = 0;
            for (int i = 0; i < mgmtService.getResourceCount(); i++) {
                const Resource* res = mgmtService.getResourceAt(i);
                if (res) totalStock += res->quantity;
            }

            std::stringstream ss;
            ss << "{\"success\":true,\"data\":{"
               << "\"total\":" << total << ","
               << "\"pending\":" << pending << ","
               << "\"triaged\":" << triaged << ","
               << "\"assigned\":" << assigned << ","
               << "\"inProgress\":" << inProg << ","
               << "\"completed\":" << completed << ","
               << "\"cancelled\":" << cancelled << ","
               << "\"critical\":" << critical << ","
               << "\"high\":" << high << ","
               << "\"criticalAndHigh\":" << (critical + high) << ","
               << "\"availableTeams\":" << availTeams << ","
               << "\"totalTeams\":" << mgmtService.getTeamCount() << ","
               << "\"totalStockUnits\":" << totalStock
               << "}}";
            return ss.str();
        }

        // 3. GET ALL REQUESTS / SEARCH AND SORT (Phase 3 C++11 DSA Enhancement)
        if (cmd == "get_requests" || cmd == "search_and_sort_requests") {
            std::string searchType  = JsonUtil::getString(line, "searchType");   // "id", "phone", "status", "severity", "all"
            std::string searchQuery = JsonUtil::getString(line, "searchQuery");  // query string
            std::string sortBy      = JsonUtil::getString(line, "sortBy");       // "none", "severity", "people", "timestamp"

            int totalListSize = masterList.getSize();
            ReliefRequest* tempArr = new ReliefRequest[totalListSize > 0 ? totalListSize : 1];
            int matchCount = 0;

            std::string searchAlgo = "Sequential Linked List Traversal";
            std::string searchComp = "O(n) time";

            // Trim query string
            while (!searchQuery.empty() && (searchQuery.front() == ' ' || searchQuery.front() == '\t')) searchQuery.erase(0, 1);
            while (!searchQuery.empty() && (searchQuery.back() == ' ' || searchQuery.back() == '\t' || searchQuery.back() == '\r')) searchQuery.pop_back();

            // --- 1. SEARCH PHASE (C++11 Search Algorithms) ---
            if (searchType == "id" && !searchQuery.empty()) {
                // A. Search by Request ID: Hash Table O(1) average lookup
                searchAlgo = "Hash Table Lookup (Separate Chaining)";
                searchComp = "O(1) average time";

                ReliefRequest* found = idTable.search(searchQuery);
                if (found != nullptr) {
                    tempArr[matchCount++] = *found;
                }
            } else if (searchType == "phone" && !searchQuery.empty()) {
                // B. Search by Contact Mobile: Linear Search O(n)
                searchAlgo = "Linear Search (Linked List Traversal)";
                searchComp = "O(n) time";

                const Node* curr = masterList.getHead();
                while (curr != nullptr) {
                    if (curr->data.contactPhone.find(searchQuery) != std::string::npos) {
                        tempArr[matchCount++] = curr->data;
                    }
                    curr = curr->next;
                }
            } else if (searchType == "status" && !searchQuery.empty() && searchQuery != "ALL") {
                // C. Search by Status: Linear Search O(n)
                searchAlgo = "Linear Search (Linked List Traversal)";
                searchComp = "O(n) time";

                RequestStatus targetStatus = stringToRequestStatus(searchQuery);
                const Node* curr = masterList.getHead();
                while (curr != nullptr) {
                    if (curr->data.status == targetStatus) {
                        tempArr[matchCount++] = curr->data;
                    }
                    curr = curr->next;
                }
            } else if (searchType == "severity" && !searchQuery.empty() && searchQuery != "ALL") {
                // D. Search by Severity: Linear Search O(n)
                searchAlgo = "Linear Search (Linked List Traversal)";
                searchComp = "O(n) time";

                SeverityLevel targetSeverity = stringToSeverity(searchQuery);
                const Node* curr = masterList.getHead();
                while (curr != nullptr) {
                    if (curr->data.severity == targetSeverity) {
                        tempArr[matchCount++] = curr->data;
                    }
                    curr = curr->next;
                }
            } else {
                // E. Default: Return all records (Linear traversal)
                searchAlgo = "Sequential Linked List Traversal";
                searchComp = "O(n) time";

                const Node* curr = masterList.getHead();
                while (curr != nullptr) {
                    tempArr[matchCount++] = curr->data;
                    curr = curr->next;
                }
            }

            // --- 2. SORTING PHASE (C++11 Temporary Array Sorting) ---
            std::string sortAlgo = "None (Original Order)";
            std::string sortComp = "O(1)";

            if (matchCount > 1) {
                if (sortBy == "people") {
                    selectionSortByPeople(tempArr, matchCount);
                    sortAlgo = "Selection Sort (Highest People Count First)";
                    sortComp = "O(n^2) time";
                } else if (sortBy == "severity") {
                    insertionSortBySeverity(tempArr, matchCount);
                    sortAlgo = "Insertion Sort (Highest Severity First)";
                    sortComp = "O(n^2) time";
                } else if (sortBy == "timestamp") {
                    bubbleSortByTimestamp(tempArr, matchCount);
                    sortAlgo = "Bubble Sort (Newest Creation Timestamp First)";
                    sortComp = "O(n^2) time";
                }
            }

            // --- 3. JSON RESPONSE SERIALIZATION ---
            std::stringstream ss;
            ss << "{\"success\":true,"
               << "\"count\":" << matchCount << ","
               << "\"total\":" << totalListSize << ","
               << "\"searchAlgorithm\":\"" << JsonUtil::escape(searchAlgo) << "\","
               << "\"searchComplexity\":\"" << JsonUtil::escape(searchComp) << "\","
               << "\"sortAlgorithm\":\"" << JsonUtil::escape(sortAlgo) << "\","
               << "\"sortComplexity\":\"" << JsonUtil::escape(sortComp) << "\","
               << "\"data\":[";

            for (int i = 0; i < matchCount; i++) {
                if (i > 0) ss << ",";
                ss << JsonUtil::requestToJson(tempArr[i]);
            }
            ss << "]}";

            delete[] tempArr;
            return ss.str();
        }

        // 4. SUBMIT REQUEST
        if (cmd == "submit_request") {
            std::string name = JsonUtil::getString(line, "name");
            std::string phone = JsonUtil::getString(line, "phone");
            std::string loc = JsonUtil::getString(line, "location");
            std::string disaster = JsonUtil::getString(line, "disaster");
            std::string type = JsonUtil::getString(line, "type");
            int people = JsonUtil::getInt(line, "people", 1);
            std::string sevStr = JsonUtil::getString(line, "severity");
            std::string details = JsonUtil::getString(line, "details");

            // Phase 1: Population details
            int families = JsonUtil::getInt(line, "familiesCount", 0);
            int children = JsonUtil::getInt(line, "childrenCount", 0);
            int elderly = JsonUtil::getInt(line, "elderlyCount", 0);
            int injured = JsonUtil::getInt(line, "injuredCount", 0);

            // Phase 1: Supplies details
            int food = JsonUtil::getInt(line, "foodPackets", 0);
            int water = JsonUtil::getInt(line, "waterLitres", 0);
            int medical = JsonUtil::getInt(line, "medicalKits", 0);
            int blankets = JsonUtil::getInt(line, "blankets", 0);
            std::string otherSupplies = JsonUtil::getString(line, "otherSupplies");

            // Phase 1: Destination details
            std::string landmark = JsonUtil::getString(line, "landmark");
            std::string latStr = JsonUtil::getString(line, "latitude");
            std::string lonStr = JsonUtil::getString(line, "longitude");
            double lat = 0.0;
            double lon = 0.0;
            if (!latStr.empty()) {
                char* end = nullptr;
                lat = strtod(latStr.c_str(), &end);
            }
            if (!lonStr.empty()) {
                char* end = nullptr;
                lon = strtod(lonStr.c_str(), &end);
            }
            std::string directions = JsonUtil::getString(line, "directions");

            if (disaster.empty()) disaster = "General";
            if (type.empty()) type = "Other";

            SubmissionResult subRes = peopleService.submitRequest(
                name, phone, loc, disaster, type, people, sevStr, details,
                families, children, elderly, injured,
                food, water, medical, blankets, otherSupplies,
                landmark, lat, lon, directions
            );
            if (subRes.success) {
                // Immediately persist changes
                FileService::saveRequests(FileService::DEFAULT_REQUESTS_FILE, masterList, true);
                return "{\"success\":true,\"requestId\":\"" + JsonUtil::escape(subRes.requestId) +
                       "\",\"message\":\"" + JsonUtil::escape(subRes.message) + "\"}";
            } else {
                return "{\"success\":false,\"message\":\"" + JsonUtil::escape(subRes.message) + "\"}";
            }
        }

        // 5. TRACK REQUEST (Dual-Key verification: ID + Phone)
        if (cmd == "track_request") {
            std::string reqId = JsonUtil::getString(line, "id");
            std::string phone = JsonUtil::getString(line, "phone");

            TrackingResult trackRes = peopleService.trackRequest(reqId, phone);
            if (trackRes.success) {
                return "{\"success\":true,\"data\":" + JsonUtil::requestToJson(trackRes.requestData) +
                       ",\"message\":\"" + JsonUtil::escape(trackRes.message) + "\"}";
            } else {
                return "{\"success\":false,\"message\":\"" + JsonUtil::escape(trackRes.message) + "\"}";
            }
        }

        // 6. CANCEL REQUEST (Mandatory dual-key verification)
        if (cmd == "cancel_request") {
            std::string reqId = JsonUtil::getString(line, "id");
            std::string phone = JsonUtil::getString(line, "phone");

            if (reqId.empty()) {
                return "{\"success\":false,\"code\":400,\"message\":\"Validation Error: Request ID is required.\"}";
            }

            if (phone.empty()) {
                return "{\"success\":false,\"code\":400,\"message\":\"Cancellation Error: Contact phone number is required.\"}";
            }

            if (!FileService::isValidPhone(phone)) {
                return "{\"success\":false,\"code\":400,\"message\":\"Cancellation Error: Contact phone must be exactly 10 digits.\"}";
            }

            ReliefRequest* req = idTable.search(reqId);
            if (!req) {
                return "{\"success\":false,\"code\":404,\"message\":\"Request ID '" + JsonUtil::escape(reqId) + "' not found.\"}";
            }

            // Mandatory Privacy & Authorization Guard: Phone must match registered request contact phone
            if (req->contactPhone != phone) {
                return "{\"success\":false,\"code\":403,\"message\":\"Cancellation Error: Contact phone does not match registered number.\"}";
            }

            if (req->status == RequestStatus::COMPLETED) {
                return "{\"success\":false,\"code\":400,\"message\":\"Cancellation Rejected: Completed requests cannot be cancelled.\"}";
            }
            if (req->status == RequestStatus::CANCELLED) {
                return "{\"success\":false,\"code\":400,\"message\":\"Notice: Request is already cancelled.\"}";
            }

            // Release assigned team if any
            if (!req->assignedTeamId.empty()) {
                RescueTeam* team = mgmtService.findTeam(req->assignedTeamId);
                if (team) {
                    team->status = TeamStatus::AVAILABLE;
                    team->activeRequestId = "";
                }
                TeamLocation* loc = findTeamLocation(req->assignedTeamId);
                if (loc) {
                    loc->activeRequestId = "";
                    FileService::saveLocations(FileService::DEFAULT_LOCATIONS_FILE, teamLocations, teamLocationCount, true);
                }
                req->assignedTeamId = "";
            }

            req->status = RequestStatus::CANCELLED;

            // Persist
            FileService::saveRequests(FileService::DEFAULT_REQUESTS_FILE, masterList, true);
            FileService::saveTeams(FileService::DEFAULT_TEAMS_FILE, mgmtService, true);

            return "{\"success\":true,\"code\":200,\"message\":\"Request " + JsonUtil::escape(reqId) + " cancelled successfully.\"}";
        }

        // 6B. GET CITIZEN REQUESTS (Filtered by contact phone)
        if (cmd == "get_citizen_requests") {
            std::string phone = JsonUtil::getString(line, "phone");
            if (phone.empty()) {
                return "{\"success\":false,\"message\":\"Validation Error: Contact phone number is required.\"}";
            }
            std::stringstream ss;
            ss << "{\"success\":true,\"data\":[";
            bool first = true;
            const Node* curr = masterList.getHead();
            while (curr != nullptr) {
                if (curr->data.contactPhone == phone) {
                    if (!first) ss << ",";
                    ss << JsonUtil::requestToJson(curr->data);
                    first = false;
                }
                curr = curr->next;
            }
            ss << "]}";
            return ss.str();
        }

        // 6C. GET CITIZEN ASSIGNED TEAM LOCATION (Strict Privacy & Lifecycle Authorization)
        if (cmd == "get_citizen_team_location") {
            std::string reqId = JsonUtil::getString(line, "id");
            if (reqId.empty()) {
                reqId = JsonUtil::getString(line, "requestId");
            }
            std::string phone = JsonUtil::getString(line, "phone");
            if (reqId.empty() || phone.empty()) {
                return "{\"success\":false,\"code\":400,\"message\":\"Validation Error: Both Request ID and contact phone are required.\"}";
            }

            ReliefRequest* req = idTable.search(reqId);
            if (!req) {
                return "{\"success\":false,\"code\":404,\"message\":\"Request ID '" + JsonUtil::escape(reqId) + "' not found.\"}";
            }

            // Strict privacy check: Phone number MUST match registered citizen contact phone
            if (req->contactPhone != phone) {
                return "{\"success\":false,\"code\":403,\"message\":\"Privacy Check Failed: Contact phone does not match registered request phone.\"}";
            }

            // Lifecycle check: Cancelled requests must not expose team location
            if (req->status == RequestStatus::CANCELLED) {
                return "{\"success\":false,\"code\":403,\"message\":\"Access Revoked: Request is CANCELLED. Assigned team telemetry is unavailable.\"}";
            }

            // Lifecycle check: Completed requests
            if (req->status == RequestStatus::COMPLETED) {
                return "{\"success\":false,\"code\":403,\"message\":\"Access Revoked: Request is COMPLETED. Active mission tracking is closed.\"}";
            }

            // Must have an assigned team
            if (req->assignedTeamId.empty()) {
                return "{\"success\":false,\"code\":404,\"message\":\"No rescue team is currently assigned to this request.\"}";
            }

            RescueTeam* team = mgmtService.findTeam(req->assignedTeamId);
            TeamLocation* loc = findTeamLocation(req->assignedTeamId);
            if (!loc) {
                return "{\"success\":false,\"code\":404,\"message\":\"Assigned squad telemetry not found.\"}";
            }

            std::string teamName = team ? team->name : loc->teamId;
            long long now = (long long)std::time(nullptr);
            LocationFreshness freshness = loc->getFreshness(now, locationFreshnessThreshold);
            long long age = (now >= loc->timestamp && loc->timestamp > 0) ? (now - loc->timestamp) : 0;

            // Privacy rule: Only expose real-time coordinates if team is actively sharing
            std::stringstream ss;
            ss << "{\"success\":true,\"data\":{";
            ss << "\"teamId\":\"" << JsonUtil::escape(loc->teamId) << "\",";
            ss << "\"teamName\":\"" << JsonUtil::escape(teamName) << "\",";
            ss << "\"isSharing\":" << (loc->isSharing ? "true" : "false") << ",";
            ss << "\"freshness\":\"" << freshnessToString(freshness) << "\",";
            ss << "\"freshnessDescription\":\"" << JsonUtil::escape(freshnessToDescription(freshness)) << "\",";
            ss << "\"ageSeconds\":" << age << ",";
            ss << "\"timestamp\":" << loc->timestamp << ",";
            if (loc->isSharing) {
                ss << "\"latitude\":" << loc->latitude << ",";
                ss << "\"longitude\":" << loc->longitude << ",";
                ss << "\"accuracy\":" << loc->accuracy << ",";
                ss << "\"isSimulated\":" << (loc->isSimulated ? "true" : "false");
            } else {
                ss << "\"latitude\":0.0,";
                ss << "\"longitude\":0.0,";
                ss << "\"accuracy\":0.0,";
                ss << "\"isSimulated\":false";
            }
            ss << "}}";
            return ss.str();
        }

        // 7. GET RESCUE TEAMS
        if (cmd == "get_teams") {
            std::stringstream ss;
            ss << "{\"success\":true,\"data\":[";
            for (int i = 0; i < mgmtService.getTeamCount(); i++) {
                if (i > 0) ss << ",";
                const RescueTeam* t = mgmtService.getTeamAt(i);
                if (t) ss << JsonUtil::teamToJson(*t);
            }
            ss << "]}";
            return ss.str();
        }

        // 8. GET RESOURCES
        if (cmd == "get_resources") {
            std::stringstream ss;
            ss << "{\"success\":true,\"data\":[";
            for (int i = 0; i < mgmtService.getResourceCount(); i++) {
                if (i > 0) ss << ",";
                const Resource* r = mgmtService.getResourceAt(i);
                if (r) ss << JsonUtil::resourceToJson(*r);
            }
            ss << "]}";
            return ss.str();
        }

        // 8B. GET RELIEF CENTERS
        if (cmd == "get_centers") {
            std::stringstream ss;
            ss << "{\"success\":true,\"data\":[";
            for (int i = 0; i < mgmtService.getCenterCount(); i++) {
                if (i > 0) ss << ",";
                const ReliefCenter* c = mgmtService.getCenterAt(i);
                if (c) ss << JsonUtil::centerToJson(*c);
            }
            ss << "]}";
            return ss.str();
        }

        // 8C. UPDATE RESOURCE QUANTITY
        if (cmd == "update_resource") {
            std::string resId = JsonUtil::getString(line, "id");
            int qty = JsonUtil::getInt(line, "quantity", -1);
            if (qty < 0) qty = JsonUtil::getInt(line, "amount", 0);
            if (qty < 0) qty = 0;

            Resource* res = mgmtService.findResource(resId);
            if (!res) {
                return "{\"success\":false,\"message\":\"Resource ID '" + JsonUtil::escape(resId) + "' not found.\"}";
            }

            res->quantity = qty;
            if (res->quantity <= 0) {
                res->status = ResourceStatus::DEPLETED;
            } else if (res->quantity < res->minThreshold) {
                res->status = ResourceStatus::LOW;
            } else {
                res->status = ResourceStatus::AVAILABLE;
            }

            FileService::saveResources(FileService::DEFAULT_RESOURCES_FILE, mgmtService, true);
            return "{\"success\":true,\"message\":\"Resource stock updated successfully.\",\"data\":" +
                   JsonUtil::resourceToJson(*res) + "}";
        }

        // 9. TRIAGE REQUEST
        if (cmd == "triage") {
            std::string reqId = JsonUtil::getString(line, "requestId");
            if (reqId.empty()) reqId = JsonUtil::getString(line, "id");
            TriageResult tr = mgmtService.triageRequest(reqId);
            if (tr.success) {
                FileService::saveRequests(FileService::DEFAULT_REQUESTS_FILE, masterList, true);
                return "{\"success\":true,\"message\":\"" + JsonUtil::escape(tr.message) +
                       "\",\"isPriorityQueue\":" + (tr.isPriorityQueue ? "true" : "false") + "}";
            } else {
                return "{\"success\":false,\"message\":\"" + JsonUtil::escape(tr.message) + "\"}";
            }
        }

        // 10. ASSIGN RESCUE TEAM
        if (cmd == "assign_team") {
            std::string reqId = JsonUtil::getString(line, "requestId");
            if (reqId.empty()) reqId = JsonUtil::getString(line, "id");
            std::string teamId = JsonUtil::getString(line, "teamId");

            AssignmentResult ar = mgmtService.assignTeam(reqId, teamId);
            if (ar.success) {
                TeamLocation* loc = findTeamLocation(ar.teamId);
                if (loc) {
                    loc->activeRequestId = reqId;
                    FileService::saveLocations(FileService::DEFAULT_LOCATIONS_FILE, teamLocations, teamLocationCount, true);
                }
                FileService::saveRequests(FileService::DEFAULT_REQUESTS_FILE, masterList, true);
                FileService::saveTeams(FileService::DEFAULT_TEAMS_FILE, mgmtService, true);
                return "{\"success\":true,\"teamId\":\"" + JsonUtil::escape(ar.teamId) +
                       "\",\"message\":\"" + JsonUtil::escape(ar.message) + "\"}";
            } else {
                return "{\"success\":false,\"message\":\"" + JsonUtil::escape(ar.message) + "\"}";
            }
        }

        // 11. CALCULATE SHORTEST ROUTE (Dijkstra)
        if (cmd == "calculate_route") {
            std::string startLoc = JsonUtil::getString(line, "from");
            std::string destLoc = JsonUtil::getString(line, "to");

            PathResult pr = mgmtService.calculateRescueRoute(startLoc, destLoc, false);
            std::stringstream ss;
            ss << "{\"success\":true,"
               << "\"exists\":" << (pr.exists ? "true" : "false") << ","
               << "\"distance\":" << pr.totalDistance << ","
               << "\"path\":[";
            for (int i = 0; i < pr.nodeCount; i++) {
                if (i > 0) ss << ",";
                ss << "\"" << JsonUtil::escape(pr.path[i]) << "\"";
            }
            ss << "]}";
            return ss.str();
        }

        // 12. ROLLBACK LAST MANAGEMENT ACTION (LIFO Stack)
        if (cmd == "rollback") {
            RollbackResult rr = mgmtService.rollbackLastAction();
            if (rr.success) {
                if (!rr.rolledBackAction.teamId.empty()) {
                    TeamLocation* loc = findTeamLocation(rr.rolledBackAction.teamId);
                    if (loc) {
                        loc->activeRequestId = "";
                        FileService::saveLocations(FileService::DEFAULT_LOCATIONS_FILE, teamLocations, teamLocationCount, true);
                    }
                }
                FileService::saveRequests(FileService::DEFAULT_REQUESTS_FILE, masterList, true);
                FileService::saveTeams(FileService::DEFAULT_TEAMS_FILE, mgmtService, true);
                return "{\"success\":true,\"message\":\"" + JsonUtil::escape(rr.message) + "\"}";
            } else {
                return "{\"success\":false,\"message\":\"" + JsonUtil::escape(rr.message) + "\"}";
            }
        }

        // 13. ALLOCATE RESOURCE STOCK
        if (cmd == "allocate_resource") {
            std::string reqId = JsonUtil::getString(line, "requestId");
            if (reqId.empty()) reqId = JsonUtil::getString(line, "id");
            std::string resId = JsonUtil::getString(line, "resourceId");
            int quantity = JsonUtil::getInt(line, "quantity", 0);

            AllocationResult ar = mgmtService.allocateResource(reqId, resId, quantity);
            if (ar.success) {
                FileService::saveResources(FileService::DEFAULT_RESOURCES_FILE, mgmtService, true);
                return "{\"success\":true,\"message\":\"" + JsonUtil::escape(ar.message) +
                       "\",\"remainingStock\":" + std::to_string(ar.remainingStock) + "}";
            } else {
                return "{\"success\":false,\"message\":\"" + JsonUtil::escape(ar.message) + "\"}";
            }
        }

        // 14. GET TEAM MISSIONS (Phase 2 - Team Leader Portal)
        if (cmd == "get_team_missions") {
            std::string teamId = JsonUtil::getString(line, "teamId");
            if (teamId.empty()) {
                return "{\"success\":false,\"message\":\"Validation Error: Team ID cannot be empty.\"}";
            }

            const RescueTeam* team = mgmtService.findTeam(teamId);
            if (team == nullptr) {
                return "{\"success\":false,\"message\":\"Rescue team '" + JsonUtil::escape(teamId) + "' not found.\"}";
            }

            int total = 0, assigned = 0, inProg = 0, completed = 0, critHigh = 0;
            std::stringstream ss;
            ss << "{\"success\":true,\"team\":" << JsonUtil::teamToJson(*team)
               << ",\"data\":[";

            bool first = true;
            const Node* curr = masterList.getHead();
            while (curr != nullptr) {
                if (curr->data.assignedTeamId == teamId) {
                    total++;
                    if (curr->data.status == RequestStatus::ASSIGNED) assigned++;
                    else if (curr->data.status == RequestStatus::IN_PROGRESS) inProg++;
                    else if (curr->data.status == RequestStatus::COMPLETED) completed++;

                    if (curr->data.severity == SeverityLevel::CRITICAL || curr->data.severity == SeverityLevel::HIGH) {
                        critHigh++;
                    }

                    if (!first) ss << ",";
                    ss << JsonUtil::requestToJson(curr->data);
                    first = false;
                }
                curr = curr->next;
            }

            ss << "],\"stats\":{"
               << "\"total\":" << total << ","
               << "\"assigned\":" << assigned << ","
               << "\"inProgress\":" << inProg << ","
               << "\"completed\":" << completed << ","
               << "\"criticalAndHigh\":" << critHigh
               << "}}";

            return ss.str();
        }

        // 15. UPDATE MISSION STATUS (Phase 2 - Team Leader Field Updates)
        if (cmd == "update_mission_status") {
            std::string teamId = JsonUtil::getString(line, "teamId");
            std::string reqId = JsonUtil::getString(line, "requestId");
            if (reqId.empty()) reqId = JsonUtil::getString(line, "id");
            std::string newStatusStr = JsonUtil::getString(line, "status");

            if (teamId.empty()) {
                return "{\"success\":false,\"message\":\"Validation Error: Team ID is required.\"}";
            }
            if (reqId.empty()) {
                return "{\"success\":false,\"message\":\"Validation Error: Request ID is required.\"}";
            }

            RescueTeam* team = mgmtService.findTeam(teamId);
            if (team == nullptr) {
                return "{\"success\":false,\"message\":\"Unauthorized: Rescue team '" + JsonUtil::escape(teamId) + "' not found.\"}";
            }

            ReliefRequest* req = idTable.search(reqId);
            if (req == nullptr) {
                return "{\"success\":false,\"message\":\"Mission Error: Request ID '" + JsonUtil::escape(reqId) + "' not found.\"}";
            }

            // Team Ownership Guard: Only the team assigned to this request may update its mission lifecycle
            if (req->assignedTeamId != teamId) {
                return "{\"success\":false,\"message\":\"Access Denied: Request '" + JsonUtil::escape(reqId) +
                       "' is assigned to team '" + JsonUtil::escape(req->assignedTeamId) +
                       "', not your team ('" + JsonUtil::escape(teamId) + "').\"}";
            }

            // Lifecycle Transition Guards
            if (req->status == RequestStatus::CANCELLED) {
                return "{\"success\":false,\"message\":\"Mission Rejected: Request has been CANCELLED by Management.\"}";
            }
            if (req->status == RequestStatus::COMPLETED) {
                return "{\"success\":false,\"message\":\"Notice: Request is already COMPLETED. Completed missions are archived and read-only.\"}";
            }
            if (req->status == RequestStatus::PENDING || req->status == RequestStatus::TRIAGED) {
                return "{\"success\":false,\"message\":\"Invalid Transition: Request must be officially ASSIGNED by Management before field teams can start it.\"}";
            }

            // Transition A: Start Mission (ASSIGNED -> IN_PROGRESS)
            if (newStatusStr == "IN_PROGRESS" || newStatusStr == "IN PROGRESS") {
                if (req->status != RequestStatus::ASSIGNED) {
                    return "{\"success\":false,\"message\":\"Invalid Transition: Mission can only be started (IN_PROGRESS) from ASSIGNED state. Current state: " +
                           requestStatusToString(req->status) + ".\"}";
                }

                req->status = RequestStatus::IN_PROGRESS;
                team->status = TeamStatus::BUSY;
                team->activeRequestId = req->id;

                TeamLocation* loc = findTeamLocation(teamId);
                if (loc) {
                    loc->activeRequestId = req->id;
                    FileService::saveLocations(FileService::DEFAULT_LOCATIONS_FILE, teamLocations, teamLocationCount, true);
                }

                FileService::saveRequests(FileService::DEFAULT_REQUESTS_FILE, masterList, true);
                FileService::saveTeams(FileService::DEFAULT_TEAMS_FILE, mgmtService, true);

                return "{\"success\":true,\"message\":\"Mission " + JsonUtil::escape(reqId) +
                       " marked IN PROGRESS. Operation underway.\",\"data\":" +
                       JsonUtil::requestToJson(*req) + ",\"team\":" + JsonUtil::teamToJson(*team) + "}";
            }

            // Transition B: Complete Mission (IN_PROGRESS -> COMPLETED)
            if (newStatusStr == "COMPLETED") {
                if (req->status != RequestStatus::IN_PROGRESS) {
                    return "{\"success\":false,\"message\":\"Invalid Transition: Mission can only be marked COMPLETED from IN_PROGRESS state. Current state: " +
                           requestStatusToString(req->status) + ".\"}";
                }

                req->status = RequestStatus::COMPLETED;

                // Inspect whether team has any other active missions (ASSIGNED or IN_PROGRESS)
                bool hasOtherActive = false;
                std::string otherActiveReqId = "";
                const Node* curr = masterList.getHead();
                while (curr != nullptr) {
                    if (curr->data.id != req->id && curr->data.assignedTeamId == teamId &&
                        (curr->data.status == RequestStatus::ASSIGNED || curr->data.status == RequestStatus::IN_PROGRESS)) {
                        hasOtherActive = true;
                        otherActiveReqId = curr->data.id;
                        break;
                    }
                    curr = curr->next;
                }

                if (!hasOtherActive) {
                    team->status = TeamStatus::AVAILABLE;
                    team->activeRequestId = "";
                } else {
                    team->status = TeamStatus::BUSY;
                    team->activeRequestId = otherActiveReqId;
                }

                TeamLocation* loc = findTeamLocation(teamId);
                if (loc) {
                    loc->activeRequestId = team->activeRequestId;
                    FileService::saveLocations(FileService::DEFAULT_LOCATIONS_FILE, teamLocations, teamLocationCount, true);
                }

                FileService::saveRequests(FileService::DEFAULT_REQUESTS_FILE, masterList, true);
                FileService::saveTeams(FileService::DEFAULT_TEAMS_FILE, mgmtService, true);

                return "{\"success\":true,\"message\":\"Mission " + JsonUtil::escape(reqId) +
                       " marked COMPLETED successfully.\",\"data\":" +
                       JsonUtil::requestToJson(*req) + ",\"team\":" + JsonUtil::teamToJson(*team) + "}";
            }

            return "{\"success\":false,\"message\":\"Invalid status '" + JsonUtil::escape(newStatusStr) +
                   "'. Team Leaders may only transition to 'IN_PROGRESS' or 'COMPLETED'.\"}";
        }

        // ====================================================================
        // PHASE 3: TEAM GPS LOCATION TRACKING COMMANDS
        // ====================================================================

        // 13. UPDATE TEAM LOCATION
        if (cmd == "update_team_location") {
            std::string teamId = JsonUtil::getString(line, "teamId");
            if (teamId.empty()) {
                return "{\"success\":false,\"message\":\"Missing required field: teamId\"}";
            }

            const RescueTeam* team = mgmtService.findTeam(teamId);
            if (team == nullptr) {
                return "{\"success\":false,\"message\":\"Unknown team ID: '" + JsonUtil::escape(teamId) + "'. Team is not registered.\"}";
            }

            // Check if this is a stop-sharing instruction
            bool hasIsSharing = (line.find("\"isSharing\"") != std::string::npos);
            bool isSharing = hasIsSharing ? JsonUtil::getBool(line, "isSharing", true) : true;
            bool stopOnly = (JsonUtil::getString(line, "action") == "stop") || (hasIsSharing && !isSharing && line.find("\"latitude\"") == std::string::npos);

            TeamLocation* existing = findTeamLocation(teamId);

            if (stopOnly) {
                if (existing != nullptr) {
                    existing->isSharing = false;
                    FileService::saveLocations(FileService::DEFAULT_LOCATIONS_FILE, teamLocations, teamLocationCount, true);
                    long long now = (long long)std::time(nullptr);
                    return "{\"success\":true,\"message\":\"Location sharing stopped for team " + JsonUtil::escape(teamId) + ".\",\"data\":" +
                           JsonUtil::locationToJson(*existing, now, locationFreshnessThreshold) + "}";
                } else {
                    TeamLocation notSharingLoc(teamId, 0.0, 0.0, 0.0, (long long)std::time(nullptr), team->activeRequestId, false, false);
                    upsertTeamLocation(notSharingLoc);
                    FileService::saveLocations(FileService::DEFAULT_LOCATIONS_FILE, teamLocations, teamLocationCount, true);
                    long long now = (long long)std::time(nullptr);
                    return "{\"success\":true,\"message\":\"Location sharing stopped for team " + JsonUtil::escape(teamId) + ".\",\"data\":" +
                           JsonUtil::locationToJson(notSharingLoc, now, locationFreshnessThreshold) + "}";
                }
            }

            // Check coordinates
            if (line.find("\"latitude\"") == std::string::npos || line.find("\"longitude\"") == std::string::npos) {
                return "{\"success\":false,\"message\":\"Missing required fields: latitude and longitude are required.\"}";
            }

            double lat = JsonUtil::getDouble(line, "latitude", 999.0);
            double lon = JsonUtil::getDouble(line, "longitude", 999.0);
            double acc = JsonUtil::getDouble(line, "accuracy", -1.0);
            bool isSim = JsonUtil::getBool(line, "isSimulated", false);
            long long ts = JsonUtil::getInt64(line, "timestamp", 0);
            if (ts <= 0) {
                ts = (long long)std::time(nullptr);
            }

            // Validate coordinates
            if (lat < -90.0 || lat > 90.0) {
                return "{\"success\":false,\"message\":\"Invalid coordinate: Latitude must be between -90 and 90 degrees. Received " + std::to_string(lat) + ".\"}";
            }
            if (lon < -180.0 || lon > 180.0) {
                return "{\"success\":false,\"message\":\"Invalid coordinate: Longitude must be between -180 and 180 degrees. Received " + std::to_string(lon) + ".\"}";
            }
            if (std::abs(lat) < 0.000001 && std::abs(lon) < 0.000001) {
                return "{\"success\":false,\"message\":\"Invalid coordinates: (0,0) uninitialized origin rejected. GPS must be a valid location.\"}";
            }
            if (acc <= 0.0) {
                return "{\"success\":false,\"message\":\"Invalid GPS accuracy: Accuracy must be a positive value in metres. Received " + std::to_string(acc) + ".\"}";
            }

            std::string reqId = JsonUtil::getString(line, "activeRequestId");
            if (reqId.empty()) {
                reqId = team->activeRequestId;
            }

            TeamLocation newLoc(teamId, lat, lon, acc, ts, reqId, isSim, isSharing);
            upsertTeamLocation(newLoc);
            FileService::saveLocations(FileService::DEFAULT_LOCATIONS_FILE, teamLocations, teamLocationCount, true);

            long long now = (long long)std::time(nullptr);
            return "{\"success\":true,\"message\":\"Location updated successfully for team " + JsonUtil::escape(teamId) +
                   (isSim ? " [SIMULATED MODE]" : "") + ".\",\"data\":" +
                   JsonUtil::locationToJson(newLoc, now, locationFreshnessThreshold) + "}";
        }

        // 14. GET SINGLE TEAM LOCATION
        if (cmd == "get_team_location") {
            std::string teamId = JsonUtil::getString(line, "teamId");
            if (teamId.empty()) {
                return "{\"success\":false,\"message\":\"Missing required field: teamId\"}";
            }

            const RescueTeam* team = mgmtService.findTeam(teamId);
            if (team == nullptr) {
                return "{\"success\":false,\"message\":\"Unknown team ID: '" + JsonUtil::escape(teamId) + "'. Team is not registered.\"}";
            }

            long long now = (long long)std::time(nullptr);
            TeamLocation* loc = findTeamLocation(teamId);
            if (loc != nullptr) {
                loc->activeRequestId = team->activeRequestId;
                return "{\"success\":true,\"data\":" + JsonUtil::locationToJson(*loc, now, locationFreshnessThreshold) + "}";
            } else {
                // Team registered, but no location ever recorded
                TeamLocation unavail(teamId, 0.0, 0.0, 0.0, 0, team->activeRequestId, false, false);
                return "{\"success\":true,\"data\":" + JsonUtil::locationToJson(unavail, now, locationFreshnessThreshold) + "}";
            }
        }

        // 15. GET ALL TEAM LOCATIONS
        if (cmd == "get_team_locations") {
            long long now = (long long)std::time(nullptr);
            std::stringstream ss;
            ss << "{\"success\":true,\"threshold\":" << locationFreshnessThreshold << ",\"data\":[";

            bool first = true;
            for (int i = 0; i < mgmtService.getTeamCount(); i++) {
                const RescueTeam* t = mgmtService.getTeamAt(i);
                if (!t) continue;
                if (!first) ss << ",";
                first = false;

                TeamLocation* loc = findTeamLocation(t->id);
                if (loc != nullptr) {
                    loc->activeRequestId = t->activeRequestId;
                    ss << JsonUtil::locationToJson(*loc, now, locationFreshnessThreshold);
                } else {
                    TeamLocation unavail(t->id, 0.0, 0.0, 0.0, 0, t->activeRequestId, false, false);
                    ss << JsonUtil::locationToJson(unavail, now, locationFreshnessThreshold);
                }
            }
            ss << "]}";
            return ss.str();
        }

        // 16. STOP TEAM LOCATION SHARING
        if (cmd == "stop_team_location") {
            std::string teamId = JsonUtil::getString(line, "teamId");
            if (teamId.empty()) {
                return "{\"success\":false,\"message\":\"Missing required field: teamId\"}";
            }

            const RescueTeam* team = mgmtService.findTeam(teamId);
            if (team == nullptr) {
                return "{\"success\":false,\"message\":\"Unknown team ID: '" + JsonUtil::escape(teamId) + "'. Team is not registered.\"}";
            }

            TeamLocation* loc = findTeamLocation(teamId);
            long long now = (long long)std::time(nullptr);
            if (loc != nullptr) {
                loc->isSharing = false;
                FileService::saveLocations(FileService::DEFAULT_LOCATIONS_FILE, teamLocations, teamLocationCount, true);
                return "{\"success\":true,\"message\":\"Location sharing stopped for team " + JsonUtil::escape(teamId) + ".\",\"data\":" +
                       JsonUtil::locationToJson(*loc, now, locationFreshnessThreshold) + "}";
            } else {
                TeamLocation notSharingLoc(teamId, 0.0, 0.0, 0.0, 0, team->activeRequestId, false, false);
                upsertTeamLocation(notSharingLoc);
                FileService::saveLocations(FileService::DEFAULT_LOCATIONS_FILE, teamLocations, teamLocationCount, true);
                return "{\"success\":true,\"message\":\"Location sharing stopped for team " + JsonUtil::escape(teamId) + ".\",\"data\":" +
                       JsonUtil::locationToJson(notSharingLoc, now, locationFreshnessThreshold) + "}";
            }
        }

        // 17. CONFIGURE FRESHNESS THRESHOLD
        if (cmd == "set_location_threshold") {
            int th = JsonUtil::getInt(line, "threshold", 60);
            if (th <= 0) {
                return "{\"success\":false,\"message\":\"Threshold must be greater than 0 seconds.\"}";
            }
            locationFreshnessThreshold = th;
            return "{\"success\":true,\"message\":\"Freshness threshold updated to " + std::to_string(locationFreshnessThreshold) + " seconds.\",\"threshold\":" + std::to_string(locationFreshnessThreshold) + "}";
        }

        // Unknown command
        return "{\"success\":false,\"message\":\"Unknown command '" + JsonUtil::escape(cmd) + "'\"}";
    }

    // Runs the blocking line-based I/O loop
    void run() {
        std::cerr << "[C++ Backend Server] Ready and listening on stdin for JSON commands...\n";
        std::string line;
        while (std::getline(std::cin, line)) {
            // Strip trailing carriage return if present
            if (!line.empty() && line[line.length() - 1] == '\r') {
                line.erase(line.length() - 1);
            }
            if (line.empty()) continue;

            if (line == "exit" || line == "quit" || line == "{\"cmd\":\"exit\"}") {
                std::cout << "{\"success\":true,\"message\":\"C++ Backend stopping.\"}\n";
                std::cout.flush();
                break;
            }

            std::string resp = processCommand(line);
            std::cout << resp << "\n";
            std::cout.flush();
        }
        std::cerr << "[C++ Backend Server] Exiting server loop cleanly.\n";
    }
};

#endif // SERVER_SERVICE_H
