#ifndef FILE_SERVICE_H
#define FILE_SERVICE_H

#include <iostream>
#include <fstream>
#include <string>
#include <cstdlib>
#include "../models/Enums.h"
#include "../models/ReliefRequest.h"
#include "../models/RescueTeam.h"
#include "../models/TeamLocation.h"
#include "../models/Resource.h"
#include "../models/ReliefCenter.h"
#include "../datastructures/LinkedList.h"
#include "../datastructures/HashTable.h"
#include "ManagementService.h"

// Result structure for file operations reporting counts and diagnostics
struct FileOperationResult {
    bool success;           // True if file was processed without I/O failure
    int recordsProcessed;   // Number of records successfully saved or loaded
    int recordsSkipped;     // Number of duplicate or malformed records rejected
    std::string message;    // Diagnostic message

    FileOperationResult(bool s = false, int proc = 0, int skip = 0, const std::string& msg = "")
        : success(s), recordsProcessed(proc), recordsSkipped(skip), message(msg) {}
};

// ============================================================================
// FileService Class
// ============================================================================
// Handles persistent disk storage and loading for RT-DRMS core entities:
// 1. Relief Requests: Master LinkedList and O(1) HashTable reconstruction.
// 2. Rescue Teams: Responder units, specializations, and statuses.
// 3. Relief Resources: Supply quantities, thresholds, and availability.
// 4. Relief Centers: Base shelters and capacity numbers.
// 5. Team GPS Locations: Real-time squad coordinates and telemetry status.
//
// File Format:
// - Documented pipe-delimited text format ('|') with one record per line.
// - Preserves full text containing spaces, commas, and punctuation.
// - Lines starting with '#' are treated as schema comments and ignored.
// ============================================================================
class FileService {
public:
    // Standard default file paths in the backend data directory
    static const std::string DEFAULT_REQUESTS_FILE;
    static const std::string DEFAULT_TEAMS_FILE;
    static const std::string DEFAULT_RESOURCES_FILE;
    static const std::string DEFAULT_CENTERS_FILE;
    static const std::string DEFAULT_LOCATIONS_FILE;

    // Helper: Split a string by a single-character delimiter into an array of string tokens
    // Handles trailing empty fields cleanly without stream EOF bugs
    static int splitLine(const std::string& line, char delim, std::string tokens[], int maxTokens) {
        int count = 0;
        std::string current = "";
        for (size_t i = 0; i < line.length(); i++) {
            if (line[i] == delim) {
                if (count < maxTokens) {
                    tokens[count++] = current;
                }
                current = "";
            } else {
                current += line[i];
            }
        }
        if (count < maxTokens) {
            tokens[count++] = current;
        }
        return count;
    }

    // Validation helper for 10-digit numeric phone numbers
    static bool isValidPhone(const std::string& phone) {
        if (phone.length() != 10) return false;
        for (char ch : phone) {
            if (ch < '0' || ch > '9') return false;
        }
        return true;
    }

private:
    // Helper: Safely converts string to positive integer (> 0), returning false if non-numeric
    static bool parsePositiveInt(const std::string& str, int& outVal) {
        if (str.empty()) return false;
        int val = 0;
        for (char ch : str) {
            if (ch < '0' || ch > '9') return false;
            val = val * 10 + (ch - '0');
        }
        if (val <= 0) return false;
        outVal = val;
        return true;
    }

    // Helper: Safely converts string to non-negative integer (>= 0)
    static bool parseNonNegativeInt(const std::string& str, int& outVal) {
        if (str.empty()) return false;
        int val = 0;
        for (char ch : str) {
            if (ch < '0' || ch > '9') return false;
            val = val * 10 + (ch - '0');
        }
        outVal = val;
        return true;
    }

    // Helper: Safely converts string to long long timestamp
    static bool parseLongLong(const std::string& str, long long& outVal) {
        if (str.empty()) return false;
        long long val = 0;
        for (char ch : str) {
            if (ch < '0' || ch > '9') return false;
            val = val * 10 + (ch - '0');
        }
        outVal = val;
        return true;
    }

    // Helper: Safely converts string to double coordinate
    static bool parseDouble(const std::string& str, double& outVal) {
        if (str.empty()) {
            outVal = 0.0;
            return true;
        }
        char* end = nullptr;
        outVal = strtod(str.c_str(), &end);
        return (end != str.c_str());
    }

    // Helper: Sanitizes a string to prevent delimiter ('|') or newline corruption
    static std::string sanitizeField(const std::string& input) {
        std::string clean = "";
        for (size_t i = 0; i < input.length(); i++) {
            char c = input[i];
            if (c == '|') {
                clean += '/';
            } else if (c == '\r' || c == '\n') {
                clean += ' ';
            } else {
                clean += c;
            }
        }
        return clean;
    }

    // Validation helper for SeverityLevel strings
    static bool isValidSeverityString(const std::string& str) {
        return (str == "LOW" || str == "NORMAL" || str == "HIGH" || str == "CRITICAL");
    }

    // Validation helper for RequestStatus strings
    static bool isValidRequestStatusString(const std::string& str) {
        return (str == "PENDING" || str == "TRIAGED" || str == "ASSIGNED" ||
                str == "IN_PROGRESS" || str == "COMPLETED" || str == "CANCELLED");
    }

    // Validation helper for TeamStatus strings
    static bool isValidTeamStatusString(const std::string& str) {
        return (str == "AVAILABLE" || str == "BUSY" || str == "OFFLINE");
    }

    // Validation helper for ResourceStatus strings
    static bool isValidResourceStatusString(const std::string& str) {
        return (str == "AVAILABLE" || str == "LOW" || str == "DEPLETED");
    }

    // Helper: Checks if file exists and contains non-comment data
    static bool fileHasContent(const std::string& filePath) {
        std::ifstream f(filePath.c_str());
        if (!f.is_open()) return false;
        std::string line;
        while (std::getline(f, line)) {
            if (!line.empty() && line[0] != '#') {
                return true;
            }
        }
        return false;
    }

public:
    // ========================================================================
    // 1. RELIEF REQUESTS PERSISTENCE
    // ========================================================================

    // SAVE RELIEF REQUESTS:
    // Serializes all records from master LinkedList to disk.
    // Guards against accidentally wiping an existing file with an empty list.
    static FileOperationResult saveRequests(const std::string& filePath,
                                            const LinkedList& list,
                                            bool allowEmptyOverwrite = false) {
        // Safety guard: prevent accidental wiping of existing data if in-memory list is empty
        if (list.isEmpty() && !allowEmptyOverwrite) {
            if (fileHasContent(filePath)) {
                return FileOperationResult(false, 0, 0,
                    "Save Aborted: In-memory dataset is empty. Refusing to overwrite existing persistent file without override.");
            }
        }

        std::ofstream outFile(filePath.c_str());
        if (!outFile.is_open()) {
            return FileOperationResult(false, 0, 0,
                "File Write Error: Unable to open file for writing at " + filePath);
        }

        // Write header schema comment
        outFile << "# RT-DRMS Relief Requests Data Store\n";
        outFile << "# ID|CitizenName|ContactPhone|Location|DisasterType|RequestType|PeopleCount|Severity|Status|Details|AssignedTeamId|Timestamp|FamiliesCount|ChildrenCount|ElderlyCount|InjuredCount|FoodPackets|WaterLitres|MedicalKits|Blankets|OtherSupplies|Landmark|Latitude|Longitude|Directions\n";

        int savedCount = 0;
        const Node* curr = list.getHead();
        while (curr != nullptr) {
            const ReliefRequest& r = curr->data;
            outFile << sanitizeField(r.id) << "|"
                    << sanitizeField(r.citizenName) << "|"
                    << sanitizeField(r.contactPhone) << "|"
                    << sanitizeField(r.location) << "|"
                    << sanitizeField(r.disasterType) << "|"
                    << sanitizeField(r.requestType) << "|"
                    << r.peopleCount << "|"
                    << severityToString(r.severity) << "|"
                    << requestStatusToString(r.status) << "|"
                    << sanitizeField(r.details) << "|"
                    << sanitizeField(r.assignedTeamId) << "|"
                    << r.timestamp << "|"
                    << r.familiesCount << "|"
                    << r.childrenCount << "|"
                    << r.elderlyCount << "|"
                    << r.injuredCount << "|"
                    << r.foodPackets << "|"
                    << r.waterLitres << "|"
                    << r.medicalKits << "|"
                    << r.blankets << "|"
                    << sanitizeField(r.otherSupplies) << "|"
                    << sanitizeField(r.landmark) << "|"
                    << r.latitude << "|"
                    << r.longitude << "|"
                    << sanitizeField(r.directions) << "\n";
            savedCount++;
            curr = curr->next;
        }

        if (!outFile.good()) {
            outFile.close();
            return FileOperationResult(false, savedCount, 0,
                "File Write Error: Stream failure during file write at " + filePath);
        }

        outFile.close();
        return FileOperationResult(true, savedCount, 0,
            "Successfully saved " + mgmtIntToString(savedCount) + " relief requests to " + filePath);
    }

    // LOAD RELIEF REQUESTS:
    // Safely reads requests from disk into the master LinkedList and indexes in HashTable.
    // Enforces: LinkedList committed first -> pointer resolved -> inserted into HashTable.
    // Rolls back LinkedList insertion if HashTable indexing fails.
    static FileOperationResult loadRequests(const std::string& filePath,
                                            LinkedList& list,
                                            HashTable& table,
                                            bool clearExisting = false) {
        std::ifstream inFile(filePath.c_str());
        if (!inFile.is_open()) {
            // First-run behavior: missing file treated gracefully as an empty dataset
            return FileOperationResult(true, 0, 0,
                "File not found: " + filePath + " (treated as first-run empty dataset).");
        }

        // Only clear existing in-memory structures after the file has successfully opened
        if (clearExisting) {
            table.clear();
            list.clear();
        }

        std::string line;
        int loadedCount = 0;
        int skippedCount = 0;

        while (std::getline(inFile, line)) {
            // Strip trailing carriage return if present
            if (!line.empty() && line[line.length() - 1] == '\r') {
                line.erase(line.length() - 1);
            }

            // Skip empty lines and comment lines
            if (line.empty() || line[0] == '#') {
                continue;
            }

            std::string tokens[26];
            int numTokens = splitLine(line, '|', tokens, 26);
            if (numTokens != 12 && numTokens < 25) {
                // Malformed line: insufficient fields
                skippedCount++;
                continue;
            }

            std::string id         = tokens[0];
            std::string name       = tokens[1];
            std::string phone      = tokens[2];
            std::string loc        = tokens[3];
            std::string disaster   = tokens[4];
            std::string reqType    = tokens[5];
            std::string peopleStr  = tokens[6];
            std::string sevStr     = tokens[7];
            std::string statStr    = tokens[8];
            std::string details    = tokens[9];
            std::string teamId     = tokens[10];
            std::string timeStr    = tokens[11];

            // Optional / extended Phase 1 fields:
            int familiesCount = 0;
            int childrenCount = 0;
            int elderlyCount = 0;
            int injuredCount = 0;
            int foodPackets = 0;
            int waterLitres = 0;
            int medicalKits = 0;
            int blankets = 0;
            std::string otherSupplies = "";
            std::string landmark = "";
            double latitude = 0.0;
            double longitude = 0.0;
            std::string directions = "";

            if (numTokens >= 25) {
                parseNonNegativeInt(tokens[12], familiesCount);
                parseNonNegativeInt(tokens[13], childrenCount);
                parseNonNegativeInt(tokens[14], elderlyCount);
                parseNonNegativeInt(tokens[15], injuredCount);
                parseNonNegativeInt(tokens[16], foodPackets);
                parseNonNegativeInt(tokens[17], waterLitres);
                parseNonNegativeInt(tokens[18], medicalKits);
                parseNonNegativeInt(tokens[19], blankets);
                otherSupplies = tokens[20];
                landmark = tokens[21];
                parseDouble(tokens[22], latitude);
                parseDouble(tokens[23], longitude);
                directions = tokens[24];
            }

            // Field validation 1: Required text fields
            if (id.empty() || name.empty() || loc.empty() || disaster.empty() || reqType.empty()) {
                skippedCount++;
                continue;
            }

            // Field validation 2: 10-digit phone number
            if (!isValidPhone(phone)) {
                skippedCount++;
                continue;
            }

            // Field validation 3: Positive people count
            int peopleCount = 0;
            if (!parsePositiveInt(peopleStr, peopleCount)) {
                skippedCount++;
                continue;
            }

            // Field validation 4: Enum validity
            if (!isValidSeverityString(sevStr) || !isValidRequestStatusString(statStr)) {
                skippedCount++;
                continue;
            }

            // Field validation 5: Timestamp
            long long timestamp = 0;
            parseLongLong(timeStr, timestamp);

            // Duplicate ID check against in-memory structures
            if (list.contains(id) || table.contains(id)) {
                skippedCount++;
                continue;
            }

            // Construct validated ReliefRequest
            ReliefRequest req(id, name, phone, loc, disaster, reqType, peopleCount,
                              stringToSeverity(sevStr), stringToRequestStatus(statStr),
                              details, teamId, timestamp,
                              familiesCount, childrenCount, elderlyCount, injuredCount,
                              foodPackets, waterLitres, medicalKits, blankets,
                              otherSupplies, landmark, latitude, longitude, directions);

            // Step A: Insert into authoritative master LinkedList first
            bool listOk = list.insertAtTail(req);
            if (!listOk) {
                skippedCount++;
                continue;
            }

            // Step B: Resolve real address of committed node
            ReliefRequest* insertedPtr = list.findById(id);
            if (insertedPtr == nullptr) {
                list.deleteById(id);
                skippedCount++;
                continue;
            }

            // Step C: Index pointer in HashTable
            bool hashOk = table.insert(id, insertedPtr);
            if (!hashOk) {
                // Rollback master list insertion to maintain strict dual-structure consistency
                list.deleteById(id);
                skippedCount++;
                continue;
            }

            loadedCount++;
        }

        inFile.close();
        return FileOperationResult(true, loadedCount, skippedCount,
            "Loaded " + mgmtIntToString(loadedCount) + " requests (" +
            mgmtIntToString(skippedCount) + " skipped/rejected).");
    }

    // ========================================================================
    // 2. RESCUE TEAMS PERSISTENCE
    // ========================================================================

    // SAVE RESCUE TEAMS:
    // Serializes all registered teams from ManagementService to disk.
    static FileOperationResult saveTeams(const std::string& filePath,
                                         const ManagementService& mgmt,
                                         bool allowEmptyOverwrite = false) {
        if (mgmt.getTeamCount() == 0 && !allowEmptyOverwrite) {
            if (fileHasContent(filePath)) {
                return FileOperationResult(false, 0, 0,
                    "Save Aborted: In-memory team dataset is empty. Refusing to overwrite existing file.");
            }
        }

        std::ofstream outFile(filePath.c_str());
        if (!outFile.is_open()) {
            return FileOperationResult(false, 0, 0,
                "File Write Error: Unable to open file for writing at " + filePath);
        }

        outFile << "# RT-DRMS Rescue Teams Data Store\n";
        outFile << "# TeamID|Name|Specialization|CurrentLocation|Status|ActiveRequestId\n";

        int savedCount = 0;
        for (int i = 0; i < mgmt.getTeamCount(); i++) {
            const RescueTeam* t = mgmt.getTeamAt(i);
            if (t != nullptr) {
                outFile << t->id << "|"
                        << t->name << "|"
                        << t->specialization << "|"
                        << t->currentLocation << "|"
                        << teamStatusToString(t->status) << "|"
                        << t->activeRequestId << "\n";
                savedCount++;
            }
        }

        if (!outFile.good()) {
            outFile.close();
            return FileOperationResult(false, savedCount, 0,
                "File Write Error: Stream failure during file write at " + filePath);
        }

        outFile.close();
        return FileOperationResult(true, savedCount, 0,
            "Successfully saved " + mgmtIntToString(savedCount) + " rescue teams to " + filePath);
    }

    // LOAD RESCUE TEAMS:
    // Reads team records from disk and registers them into ManagementService.
    static FileOperationResult loadTeams(const std::string& filePath,
                                         ManagementService& mgmt) {
        std::ifstream inFile(filePath.c_str());
        if (!inFile.is_open()) {
            return FileOperationResult(true, 0, 0,
                "File not found: " + filePath + " (treated as first-run empty dataset).");
        }

        std::string line;
        int loadedCount = 0;
        int skippedCount = 0;

        while (std::getline(inFile, line)) {
            if (!line.empty() && line[line.length() - 1] == '\r') {
                line.erase(line.length() - 1);
            }

            if (line.empty() || line[0] == '#') {
                continue;
            }

            std::string tokens[6];
            int numTokens = splitLine(line, '|', tokens, 6);
            if (numTokens != 6) {
                skippedCount++;
                continue;
            }

            std::string id        = tokens[0];
            std::string name      = tokens[1];
            std::string spec      = tokens[2];
            std::string loc       = tokens[3];
            std::string statStr   = tokens[4];
            std::string activeReq = tokens[5];

            if (id.empty() || name.empty()) {
                skippedCount++;
                continue;
            }

            if (!isValidTeamStatusString(statStr)) {
                skippedCount++;
                continue;
            }

            // Prevent duplicate team IDs
            if (mgmt.findTeam(id) != nullptr) {
                skippedCount++;
                continue;
            }

            bool regOk = mgmt.registerTeam(id, name, spec, loc);
            if (regOk) {
                RescueTeam* t = mgmt.findTeam(id);
                if (t != nullptr) {
                    t->status = stringToTeamStatus(statStr);
                    t->activeRequestId = activeReq;
                }
                loadedCount++;
            } else {
                skippedCount++;
            }
        }

        inFile.close();
        return FileOperationResult(true, loadedCount, skippedCount,
            "Loaded " + mgmtIntToString(loadedCount) + " rescue teams (" +
            mgmtIntToString(skippedCount) + " skipped/rejected).");
    }

    // ========================================================================
    // 3. RELIEF RESOURCES PERSISTENCE
    // ========================================================================

    // SAVE RELIEF RESOURCES:
    // Serializes all registered resources from ManagementService to disk.
    static FileOperationResult saveResources(const std::string& filePath,
                                             const ManagementService& mgmt,
                                             bool allowEmptyOverwrite = false) {
        if (mgmt.getResourceCount() == 0 && !allowEmptyOverwrite) {
            if (fileHasContent(filePath)) {
                return FileOperationResult(false, 0, 0,
                    "Save Aborted: In-memory resource dataset is empty. Refusing to overwrite existing file.");
            }
        }

        std::ofstream outFile(filePath.c_str());
        if (!outFile.is_open()) {
            return FileOperationResult(false, 0, 0,
                "File Write Error: Unable to open file for writing at " + filePath);
        }

        outFile << "# RT-DRMS Relief Resources Data Store\n";
        outFile << "# ResourceID|Name|Quantity|MinThreshold|Status\n";

        int savedCount = 0;
        for (int i = 0; i < mgmt.getResourceCount(); i++) {
            const Resource* r = mgmt.getResourceAt(i);
            if (r != nullptr) {
                outFile << r->id << "|"
                        << r->name << "|"
                        << r->quantity << "|"
                        << r->minThreshold << "|"
                        << resourceStatusToString(r->status) << "\n";
                savedCount++;
            }
        }

        if (!outFile.good()) {
            outFile.close();
            return FileOperationResult(false, savedCount, 0,
                "File Write Error: Stream failure during file write at " + filePath);
        }

        outFile.close();
        return FileOperationResult(true, savedCount, 0,
            "Successfully saved " + mgmtIntToString(savedCount) + " relief resources to " + filePath);
    }

    // LOAD RELIEF RESOURCES:
    // Reads resource records from disk and registers them into ManagementService.
    static FileOperationResult loadResources(const std::string& filePath,
                                             ManagementService& mgmt) {
        std::ifstream inFile(filePath.c_str());
        if (!inFile.is_open()) {
            return FileOperationResult(true, 0, 0,
                "File not found: " + filePath + " (treated as first-run empty dataset).");
        }

        std::string line;
        int loadedCount = 0;
        int skippedCount = 0;

        while (std::getline(inFile, line)) {
            if (!line.empty() && line[line.length() - 1] == '\r') {
                line.erase(line.length() - 1);
            }

            if (line.empty() || line[0] == '#') {
                continue;
            }

            std::string tokens[5];
            int numTokens = splitLine(line, '|', tokens, 5);
            if (numTokens != 5) {
                skippedCount++;
                continue;
            }

            std::string id        = tokens[0];
            std::string name      = tokens[1];
            std::string qtyStr    = tokens[2];
            std::string threshStr = tokens[3];
            std::string statStr   = tokens[4];

            if (id.empty() || name.empty()) {
                skippedCount++;
                continue;
            }

            int qty = 0;
            int thresh = 0;
            if (!parseNonNegativeInt(qtyStr, qty) || !parseNonNegativeInt(threshStr, thresh)) {
                skippedCount++;
                continue;
            }

            if (!isValidResourceStatusString(statStr)) {
                skippedCount++;
                continue;
            }

            // Prevent duplicate resource IDs
            if (mgmt.findResource(id) != nullptr) {
                skippedCount++;
                continue;
            }

            bool regOk = mgmt.registerResource(id, name, qty, thresh);
            if (regOk) {
                Resource* r = mgmt.findResource(id);
                if (r != nullptr) {
                    r->status = stringToResourceStatus(statStr);
                }
                loadedCount++;
            } else {
                skippedCount++;
            }
        }

        inFile.close();
        return FileOperationResult(true, loadedCount, skippedCount,
            "Loaded " + mgmtIntToString(loadedCount) + " relief resources (" +
            mgmtIntToString(skippedCount) + " skipped/rejected).");
    }

    // ========================================================================
    // 4. RELIEF CENTERS PERSISTENCE
    // ========================================================================

    // SAVE RELIEF CENTERS:
    // Serializes all registered centers from ManagementService to disk.
    static FileOperationResult saveCenters(const std::string& filePath,
                                           const ManagementService& mgmt,
                                           bool allowEmptyOverwrite = false) {
        if (mgmt.getCenterCount() == 0 && !allowEmptyOverwrite) {
            if (fileHasContent(filePath)) {
                return FileOperationResult(false, 0, 0,
                    "Save Aborted: In-memory center dataset is empty. Refusing to overwrite existing file.");
            }
        }

        std::ofstream outFile(filePath.c_str());
        if (!outFile.is_open()) {
            return FileOperationResult(false, 0, 0,
                "File Write Error: Unable to open file for writing at " + filePath);
        }

        outFile << "# RT-DRMS Relief Centers Data Store\n";
        outFile << "# CenterID|Name|LocationNode|MaxCapacity|CurrentOccupancy|ContactNumber|Latitude|Longitude|IsDemonstration\n";

        int savedCount = 0;
        for (int i = 0; i < mgmt.getCenterCount(); i++) {
            const ReliefCenter* c = mgmt.getCenterAt(i);
            if (c != nullptr) {
                outFile << c->id << "|"
                        << c->name << "|"
                        << c->locationNode << "|"
                        << c->maxCapacity << "|"
                        << c->currentOccupancy << "|"
                        << c->contactNumber;
                if (c->latitude != 0.0 || c->longitude != 0.0 || c->isDemonstration) {
                    outFile << "|" << c->latitude
                            << "|" << c->longitude
                            << "|" << (c->isDemonstration ? 1 : 0);
                }
                outFile << "\n";
                savedCount++;
            }
        }

        if (!outFile.good()) {
            outFile.close();
            return FileOperationResult(false, savedCount, 0,
                "File Write Error: Stream failure during file write at " + filePath);
        }

        outFile.close();
        return FileOperationResult(true, savedCount, 0,
            "Successfully saved " + mgmtIntToString(savedCount) + " relief centers to " + filePath);
    }

    // LOAD RELIEF CENTERS:
    // Reads center records from disk and registers them into ManagementService.
    // Supports backward-compatible 6-token legacy lines and 8/9-token coordinate-bearing records.
    static FileOperationResult loadCenters(const std::string& filePath,
                                           ManagementService& mgmt) {
        std::ifstream inFile(filePath.c_str());
        if (!inFile.is_open()) {
            return FileOperationResult(true, 0, 0,
                "File not found: " + filePath + " (treated as first-run empty dataset).");
        }

        std::string line;
        int loadedCount = 0;
        int skippedCount = 0;

        while (std::getline(inFile, line)) {
            if (!line.empty() && line[line.length() - 1] == '\r') {
                line.erase(line.length() - 1);
            }

            if (line.empty() || line[0] == '#') {
                continue;
            }

            const int MAX_CENTER_TOKENS = 10;
            std::string tokens[MAX_CENTER_TOKENS];
            int numTokens = splitLine(line, '|', tokens, MAX_CENTER_TOKENS);
            if (numTokens < 6) {
                skippedCount++;
                continue;
            }

            std::string id        = tokens[0];
            std::string name      = tokens[1];
            std::string loc       = tokens[2];
            std::string maxCapStr = tokens[3];
            std::string curOccStr = tokens[4];
            std::string contact   = tokens[5];

            double lat = 0.0;
            double lon = 0.0;
            bool isDemo = false;

            if (numTokens >= 8) {
                parseDouble(tokens[6], lat);
                parseDouble(tokens[7], lon);
            }
            if (numTokens >= 9) {
                isDemo = (tokens[8] == "1" || tokens[8] == "true");
            }

            if (id.empty() || name.empty() || loc.empty()) {
                skippedCount++;
                continue;
            }

            int maxCap = 0;
            int curOcc = 0;
            if (!parsePositiveInt(maxCapStr, maxCap) || !parseNonNegativeInt(curOccStr, curOcc)) {
                skippedCount++;
                continue;
            }

            if (mgmt.findCenter(id) != nullptr) {
                skippedCount++;
                continue;
            }

            bool regOk = mgmt.registerCenter(id, name, loc, maxCap, curOcc, contact, lat, lon, isDemo);
            if (regOk) {
                loadedCount++;
            } else {
                skippedCount++;
            }
        }

        inFile.close();
        return FileOperationResult(true, loadedCount, skippedCount,
            "Loaded " + mgmtIntToString(loadedCount) + " relief centers (" +
            mgmtIntToString(skippedCount) + " skipped/rejected).");
    }

    // ========================================================================
    // 5. RESCUE TEAM LOCATIONS PERSISTENCE (Phase 3)
    // ========================================================================
    static FileOperationResult saveLocations(const std::string& filename,
                                             const TeamLocation locations[],
                                             int count,
                                             bool allowEmptyOverwrite = false) {
        if (count == 0 && !allowEmptyOverwrite) {
            return FileOperationResult(false, 0, 0,
                "Save Aborted: In-memory locations dataset is empty. Refusing to overwrite without override.");
        }

        std::ofstream outFile(filename.c_str(), std::ios::out | std::ios::trunc);
        if (!outFile.is_open()) {
            return FileOperationResult(false, 0, 0,
                "File Write Error: Unable to open file for writing at " + filename);
        }

        outFile << "# RT-DRMS Team GPS Locations Data Store\n";
        outFile << "# TeamID|Latitude|Longitude|Accuracy|Timestamp|ActiveRequestId|IsSimulated|IsSharing\n";

        int savedCount = 0;
        for (int i = 0; i < count; i++) {
            const TeamLocation& loc = locations[i];
            if (loc.teamId.empty()) continue;
            outFile << loc.teamId << "|"
                    << loc.latitude << "|"
                    << loc.longitude << "|"
                    << loc.accuracy << "|"
                    << loc.timestamp << "|"
                    << loc.activeRequestId << "|"
                    << (loc.isSimulated ? 1 : 0) << "|"
                    << (loc.isSharing ? 1 : 0) << "\n";
            savedCount++;
        }

        outFile.close();
        return FileOperationResult(true, savedCount, 0,
            "Successfully saved " + mgmtIntToString(savedCount) + " team location records to " + filename);
    }

    static FileOperationResult loadLocations(const std::string& filename,
                                             TeamLocation locations[],
                                             int maxLocations,
                                             int& loadedCount) {
        loadedCount = 0;
        int skippedCount = 0;

        std::ifstream inFile(filename.c_str());
        if (!inFile.is_open()) {
            return FileOperationResult(true, 0, 0,
                "File not found: " + filename + " (treated as first-run empty dataset).");
        }

        std::string line;
        while (std::getline(inFile, line)) {
            if (!line.empty() && line[line.length() - 1] == '\r') {
                line.erase(line.length() - 1);
            }
            if (line.empty() || line[0] == '#') {
                continue;
            }

            const int MAX_TOKENS = 10;
            std::string tokens[MAX_TOKENS];
            int tokenCount = splitLine(line, '|', tokens, MAX_TOKENS);

            if (tokenCount < 8) {
                skippedCount++;
                continue;
            }

            std::string teamId = tokens[0];
            std::string latStr = tokens[1];
            std::string lonStr = tokens[2];
            std::string accStr = tokens[3];
            std::string tsStr  = tokens[4];
            std::string reqId  = tokens[5];
            std::string simStr = tokens[6];
            std::string sharStr= tokens[7];

            if (teamId.empty()) {
                skippedCount++;
                continue;
            }

            double lat = 0.0, lon = 0.0, acc = 0.0;
            long long ts = 0;
            try {
                lat = std::stod(latStr);
                lon = std::stod(lonStr);
                acc = std::stod(accStr);
                ts  = std::stoll(tsStr);
            } catch (...) {
                skippedCount++;
                continue;
            }

            // Coordinate range validation
            if (lat < -90.0 || lat > 90.0 || lon < -180.0 || lon > 180.0 || acc <= 0.0) {
                skippedCount++;
                continue;
            }

            bool isSim = (simStr == "1" || simStr == "true");
            bool isShar = (sharStr == "1" || sharStr == "true");

            if (loadedCount < maxLocations) {
                locations[loadedCount++] = TeamLocation(teamId, lat, lon, acc, ts, reqId, isSim, isShar);
            } else {
                skippedCount++;
            }
        }

        inFile.close();
        return FileOperationResult(true, loadedCount, skippedCount,
            "Loaded " + mgmtIntToString(loadedCount) + " team locations (" +
            mgmtIntToString(skippedCount) + " skipped/rejected).");
    }

    // ========================================================================
    // 6. BULK PERSISTENCE OPERATIONS
    // ========================================================================

    // Save all application stores to standard backend/data files
    // Defaults allowEmptyOverwrite to false to guard against accidental data loss
    static FileOperationResult saveAll(const LinkedList& list,
                                       const ManagementService& mgmt,
                                       const std::string& dataDir = "backend/data",
                                       bool allowEmptyOverwrite = false) {
        FileOperationResult rReq = saveRequests(dataDir + "/requests.txt", list, allowEmptyOverwrite);
        FileOperationResult rTeams = saveTeams(dataDir + "/teams.txt", mgmt, allowEmptyOverwrite);
        FileOperationResult rRes = saveResources(dataDir + "/resources.txt", mgmt, allowEmptyOverwrite);
        FileOperationResult rCenters = saveCenters(dataDir + "/centers.txt", mgmt, allowEmptyOverwrite);

        bool allOk = rReq.success && rTeams.success && rRes.success && rCenters.success;
        int totalSaved = rReq.recordsProcessed + rTeams.recordsProcessed +
                         rRes.recordsProcessed + rCenters.recordsProcessed;
        int totalSkipped = rReq.recordsSkipped + rTeams.recordsSkipped +
                           rRes.recordsSkipped + rCenters.recordsSkipped;

        std::string msg;
        if (allOk) {
            msg = "All stores saved successfully (" + mgmtIntToString(totalSaved) + " records total).";
        } else {
            msg = "Bulk save notice: One or more data stores failed to save or were aborted by empty overwrite protection.";
        }
        return FileOperationResult(allOk, totalSaved, totalSkipped, msg);
    }

    // Load all application stores from standard backend/data files
    // Accumulates diagnostic results and reports aggregate counts and status
    static FileOperationResult loadAll(LinkedList& list,
                                       HashTable& table,
                                       ManagementService& mgmt,
                                       const std::string& dataDir = "backend/data") {
        FileOperationResult rReq = loadRequests(dataDir + "/requests.txt", list, table, false);
        FileOperationResult rTeams = loadTeams(dataDir + "/teams.txt", mgmt);
        FileOperationResult rRes = loadResources(dataDir + "/resources.txt", mgmt);
        FileOperationResult rCenters = loadCenters(dataDir + "/centers.txt", mgmt);

        bool allOk = rReq.success && rTeams.success && rRes.success && rCenters.success;
        int totalLoaded = rReq.recordsProcessed + rTeams.recordsProcessed +
                          rRes.recordsProcessed + rCenters.recordsProcessed;
        int totalSkipped = rReq.recordsSkipped + rTeams.recordsSkipped +
                           rRes.recordsSkipped + rCenters.recordsSkipped;

        std::string msg;
        if (allOk) {
            msg = "All stores loaded successfully (" + mgmtIntToString(totalLoaded) + " records, " +
                  mgmtIntToString(totalSkipped) + " skipped).";
        } else {
            msg = "Bulk load notice: One or more data store files failed to load.";
        }
        return FileOperationResult(allOk, totalLoaded, totalSkipped, msg);
    }
};

// Define default path constants
const std::string FileService::DEFAULT_REQUESTS_FILE  = "backend/data/requests.txt";
const std::string FileService::DEFAULT_TEAMS_FILE     = "backend/data/teams.txt";
const std::string FileService::DEFAULT_RESOURCES_FILE = "backend/data/resources.txt";
const std::string FileService::DEFAULT_CENTERS_FILE   = "backend/data/centers.txt";
const std::string FileService::DEFAULT_LOCATIONS_FILE = "backend/data/team_locations.txt";

#endif // FILE_SERVICE_H
