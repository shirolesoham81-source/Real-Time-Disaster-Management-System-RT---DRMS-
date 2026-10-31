#ifndef PEOPLE_SERVICE_H
#define PEOPLE_SERVICE_H

#include <iostream>
#include <string>
#include "../models/Enums.h"
#include "../models/ReliefRequest.h"
#include "../datastructures/LinkedList.h"
#include "../datastructures/HashTable.h"

// Helper function to convert integer to string without relying on compiler-specific std::to_string
inline std::string intToString(int val) {
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

// Result structure for request submissions
struct SubmissionResult {
    bool success;           // True if validation passed and records were committed
    std::string requestId;  // Generated unique request ID (e.g. "DR-1001")
    std::string message;    // Informative status or validation error message

    SubmissionResult(bool s, const std::string& id, const std::string& msg)
        : success(s), requestId(id), message(msg) {}
};

// Result structure for tracking inquiries
struct TrackingResult {
    bool success;               // True if request ID and phone match
    std::string message;        // Informative message
    ReliefRequest requestData;  // Snapshot of the retrieved request details

    TrackingResult(bool s, const std::string& msg, const ReliefRequest& req = ReliefRequest())
        : success(s), message(msg), requestData(req) {}
};

// Result structure for cancellation requests
struct CancellationResult {
    bool success;         // True if request status was successfully updated to CANCELLED
    std::string message;  // Informative status message

    CancellationResult(bool s, const std::string& msg)
        : success(s), message(msg) {}
};

// ============================================================================
// PeopleService Class
// ============================================================================
// Handles all citizen-facing operations for disaster distress calls:
// 1. Submitting new relief requests with comprehensive input validation.
// 2. Generating sequential, unique IDs in "DR-xxxx" format.
// 3. Dual-index synchronization: Master LinkedList + O(1) HashTable lookup.
// 4. Tracking request status with a privacy check (ID + contact phone match).
// 5. Viewing all requests submitted under a phone number.
// 6. Cancelling active requests with lifecycle status guards.
// ============================================================================
class PeopleService {
private:
    LinkedList& masterList;     // Authoritative store for all ReliefRequest records
    HashTable& idTable;         // O(1) lookup table indexing master request pointers by ID
    int nextIdNumber;           // Counter for sequential ID generation (e.g., 1001)
    long long arrivalCounter;   // Monotonic arrival sequence counter

    // Helper: Validates that phone number contains exactly 10 numeric digits
    bool isValidPhone(const std::string& phone) const {
        if (phone.length() != 10) {
            return false;
        }
        for (char ch : phone) {
            if (ch < '0' || ch > '9') {
                return false;
            }
        }
        return true;
    }

    // Helper: Validates accepted disaster relief request types
    bool isValidRequestType(const std::string& type) const {
        return (type == "Medical" || type == "Rescue" || type == "Food" ||
                type == "Water"   || type == "Shelter" || type == "Other" ||
                type == "General");
    }

    // Helper: Generates the next guaranteed-unique request ID
    std::string generateUniqueId() {
        while (true) {
            std::string candidate = "DR-" + intToString(nextIdNumber++);
            if (!idTable.contains(candidate) && !masterList.contains(candidate)) {
                return candidate;
            }
        }
    }

public:
    // Constructor: binds to authoritative LinkedList and HashTable instances
    // Automatically aligns nextIdNumber past any pre-existing records in masterList
    PeopleService(LinkedList& list, HashTable& table, int startId = 1001)
        : masterList(list), idTable(table), nextIdNumber(startId), arrivalCounter(1) {

        // Scan master list to avoid reusing any pre-existing IDs
        const Node* curr = masterList.getHead();
        while (curr != nullptr) {
            if (curr->data.id.length() > 3 && curr->data.id.substr(0, 3) == "DR-") {
                int num = 0;
                for (size_t i = 3; i < curr->data.id.length(); i++) {
                    if (curr->data.id[i] >= '0' && curr->data.id[i] <= '9') {
                        num = num * 10 + (curr->data.id[i] - '0');
                    }
                }
                if (num >= nextIdNumber) {
                    nextIdNumber = num + 1;
                }
            }
            curr = curr->next;
        }
    }

    // Destructor: PeopleService holds non-owning references, so it does not destroy data stores
    ~PeopleService() {}

    // Disable copy constructor and copy assignment operator to prevent shallow-copy issues
    PeopleService(const PeopleService&) = delete;
    PeopleService& operator=(const PeopleService&) = delete;

    // ========================================================================
    // 1. REQUEST SUBMISSION
    // ========================================================================
    // Validates inputs, generates unique ID, inserts into master LinkedList,
    // and indexes pointer in HashTable. Rolls back on any indexing failure.
    SubmissionResult submitRequest(const std::string& citizenName,
                                   const std::string& contactPhone,
                                   const std::string& location,
                                   const std::string& disasterType,
                                   const std::string& requestType,
                                   int peopleCount,
                                   SeverityLevel severity,
                                   const std::string& details = "",
                                   int familiesCount = 0,
                                   int childrenCount = 0,
                                   int elderlyCount = 0,
                                   int injuredCount = 0,
                                   int foodPackets = 0,
                                   int waterLitres = 0,
                                   int medicalKits = 0,
                                   int blankets = 0,
                                   const std::string& otherSupplies = "",
                                   const std::string& landmark = "",
                                   double latitude = 0.0,
                                   double longitude = 0.0,
                                   const std::string& directions = "") {
        // Validation 1: Required text fields
        if (citizenName.empty()) {
            return SubmissionResult(false, "", "Validation Error: Citizen name cannot be empty.");
        }
        if (contactPhone.empty()) {
            return SubmissionResult(false, "", "Validation Error: Contact phone cannot be empty.");
        }
        if (location.empty()) {
            return SubmissionResult(false, "", "Validation Error: Disaster location cannot be empty.");
        }
        if (disasterType.empty()) {
            return SubmissionResult(false, "", "Validation Error: Disaster type cannot be empty.");
        }
        if (requestType.empty()) {
            return SubmissionResult(false, "", "Validation Error: Request type cannot be empty.");
        }

        // Validation 2: People count must be positive
        if (peopleCount <= 0) {
            return SubmissionResult(false, "", "Validation Error: Number of people affected must be greater than zero.");
        }

        // Validation 3: Contact phone number format (10 numeric digits)
        if (!isValidPhone(contactPhone)) {
            return SubmissionResult(false, "", "Validation Error: Contact phone must be a 10-digit numeric phone number.");
        }

        // Validation 4: Request category
        if (!isValidRequestType(requestType)) {
            return SubmissionResult(false, "", "Validation Error: Invalid request type '" + requestType +
                                               "'. Allowed: Medical, Rescue, Food, Water, Shelter, Other.");
        }

        // Validation 5: Non-negative population breakdown quantities
        if (familiesCount < 0) {
            return SubmissionResult(false, "", "Validation Error: Number of families cannot be negative.");
        }
        if (childrenCount < 0) {
            return SubmissionResult(false, "", "Validation Error: Number of children cannot be negative.");
        }
        if (elderlyCount < 0) {
            return SubmissionResult(false, "", "Validation Error: Number of elderly people cannot be negative.");
        }
        if (injuredCount < 0) {
            return SubmissionResult(false, "", "Validation Error: Number of injured people cannot be negative.");
        }

        // Validation 6: Non-negative supply requirements
        if (foodPackets < 0) {
            return SubmissionResult(false, "", "Validation Error: Food packets required cannot be negative.");
        }
        if (waterLitres < 0) {
            return SubmissionResult(false, "", "Validation Error: Drinking water required cannot be negative.");
        }
        if (medicalKits < 0) {
            return SubmissionResult(false, "", "Validation Error: Medical kits required cannot be negative.");
        }
        if (blankets < 0) {
            return SubmissionResult(false, "", "Validation Error: Blankets required cannot be negative.");
        }

        // Validation 7: Valid coordinate ranges if provided
        if (latitude < -90.0 || latitude > 90.0) {
            return SubmissionResult(false, "", "Validation Error: Latitude must be between -90 and 90 degrees.");
        }
        if (longitude < -180.0 || longitude > 180.0) {
            return SubmissionResult(false, "", "Validation Error: Longitude must be between -180 and 180 degrees.");
        }

        // Generate unique request ID
        std::string newId = generateUniqueId();
        long long timestamp = arrivalCounter++;

        // Construct ReliefRequest with initial status PENDING and no assigned team
        ReliefRequest newReq(newId, citizenName, contactPhone, location,
                             disasterType, requestType, peopleCount,
                             severity, RequestStatus::PENDING, details, "", timestamp,
                             familiesCount, childrenCount, elderlyCount, injuredCount,
                             foodPackets, waterLitres, medicalKits, blankets,
                             otherSupplies, landmark, latitude, longitude, directions);

        // Step A: Insert into authoritative master LinkedList
        bool listInserted = masterList.insertAtTail(newReq);
        if (!listInserted) {
            return SubmissionResult(false, "", "System Error: Failed to insert request into master linked list.");
        }

        // Step B: Retrieve pointer to the committed node in master list
        ReliefRequest* insertedPtr = masterList.findById(newId);
        if (insertedPtr == nullptr) {
            // Roll back list insertion if pointer cannot be resolved
            masterList.deleteById(newId);
            return SubmissionResult(false, "", "System Error: Failed to locate newly inserted request record.");
        }

        // Step C: Index master pointer in HashTable
        bool hashInserted = idTable.insert(newId, insertedPtr);
        if (!hashInserted) {
            // ROLLBACK: If indexing fails, delete from master list so no inconsistent state is left
            masterList.deleteById(newId);
            return SubmissionResult(false, "", "System Error: Hash table indexing failed. Insertion rolled back cleanly.");
        }

        return SubmissionResult(true, newId, "Relief request submitted successfully.");
    }

    // Overload accepting severity as a string (e.g., "CRITICAL", "HIGH", "NORMAL", "LOW")
    SubmissionResult submitRequest(const std::string& citizenName,
                                   const std::string& contactPhone,
                                   const std::string& location,
                                   const std::string& disasterType,
                                   const std::string& requestType,
                                   int peopleCount,
                                   const std::string& severityStr,
                                   const std::string& details = "",
                                   int familiesCount = 0,
                                   int childrenCount = 0,
                                   int elderlyCount = 0,
                                   int injuredCount = 0,
                                   int foodPackets = 0,
                                   int waterLitres = 0,
                                   int medicalKits = 0,
                                   int blankets = 0,
                                   const std::string& otherSupplies = "",
                                   const std::string& landmark = "",
                                   double latitude = 0.0,
                                   double longitude = 0.0,
                                   const std::string& directions = "") {
        SeverityLevel sev = stringToSeverity(severityStr);
        return submitRequest(citizenName, contactPhone, location, disasterType,
                             requestType, peopleCount, sev, details,
                             familiesCount, childrenCount, elderlyCount, injuredCount,
                             foodPackets, waterLitres, medicalKits, blankets,
                             otherSupplies, landmark, latitude, longitude, directions);
    }

    // ========================================================================
    // 2. REQUEST TRACKING
    // ========================================================================
    // Retrieves request details via O(1) HashTable lookup.
    // Confirms phone number matches as a basic privacy check before returning data.
    TrackingResult trackRequest(const std::string& requestId, const std::string& contactPhone) const {
        if (requestId.empty() || contactPhone.empty()) {
            return TrackingResult(false, "Tracking Error: Both Request ID and contact phone number are required.");
        }

        // 1. O(1) lookup via Hash Table
        const ReliefRequest* req = idTable.search(requestId);
        if (req == nullptr) {
            return TrackingResult(false, "Tracking Error: Request ID '" + requestId + "' not found.");
        }

        // 2. Basic privacy check: verify contact phone number matches
        if (req->contactPhone != contactPhone) {
            return TrackingResult(false, "Tracking Error: Provided phone number does not match registered contact phone.");
        }

        // 3. Match verified: return snapshot of request
        return TrackingResult(true, "Request located successfully.", *req);
    }

    // ========================================================================
    // 3. VIEWING REQUESTS BY PHONE
    // ========================================================================
    // Scans master list to find and copy all requests matching the contact phone
    int getRequestsByPhone(const std::string& contactPhone, ReliefRequest* outArray, int maxCapacity) const {
        if (!isValidPhone(contactPhone) || outArray == nullptr || maxCapacity <= 0) {
            return 0;
        }

        int count = 0;
        const Node* curr = masterList.getHead();
        while (curr != nullptr && count < maxCapacity) {
            if (curr->data.contactPhone == contactPhone) {
                outArray[count++] = curr->data;
            }
            curr = curr->next;
        }
        return count;
    }

    // Display all requests matching a phone number directly to stdout
    void displayRequestsByPhone(const std::string& contactPhone) const {
        std::cout << "  [Requests on Record for Phone: " << contactPhone << "]\n";
        if (!isValidPhone(contactPhone)) {
            std::cout << "  [ERROR] Invalid 10-digit phone number provided.\n";
            return;
        }

        int count = 0;
        const Node* curr = masterList.getHead();
        while (curr != nullptr) {
            if (curr->data.contactPhone == contactPhone) {
                count++;
                std::cout << "  - ID: " << curr->data.id
                          << " | Type: " << curr->data.requestType
                          << " | Location: " << curr->data.location
                          << " | Severity: " << severityToString(curr->data.severity)
                          << " | Status: " << requestStatusToString(curr->data.status)
                          << " | People: " << curr->data.peopleCount << "\n";
            }
            curr = curr->next;
        }
        if (count == 0) {
            std::cout << "  (No requests found for this contact number.)\n";
        }
    }

    // ========================================================================
    // 4. REQUEST CANCELLATION
    // ========================================================================
    // Allows citizen to cancel their distress call if it has not yet completed.
    // Rejects cancellation of COMPLETED or already CANCELLED requests.
    CancellationResult cancelRequest(const std::string& requestId, const std::string& contactPhone) {
        if (requestId.empty() || contactPhone.empty()) {
            return CancellationResult(false, "Cancellation Error: Both Request ID and contact phone number are required.");
        }

        // Validate 10-digit numeric phone format
        if (contactPhone.length() != 10) {
            return CancellationResult(false, "Cancellation Error: Contact phone must be exactly 10 digits.");
        }
        for (char ch : contactPhone) {
            if (ch < '0' || ch > '9') {
                return CancellationResult(false, "Cancellation Error: Contact phone must be exactly 10 digits.");
            }
        }

        // 1. Locate request via Hash Table
        ReliefRequest* req = idTable.search(requestId);
        if (req == nullptr) {
            return CancellationResult(false, "Cancellation Error: Request ID '" + requestId + "' not found.");
        }

        // 2. Privacy verification
        if (req->contactPhone != contactPhone) {
            return CancellationResult(false, "Cancellation Error: Provided phone number does not match registered contact phone.");
        }

        // 3. Reject cancellation of COMPLETED requests
        if (req->status == RequestStatus::COMPLETED) {
            return CancellationResult(false, "Cancellation Rejected: Request " + requestId +
                                             " is already COMPLETED and cannot be cancelled.");
        }

        // 4. Reject cancellation of already CANCELLED requests
        if (req->status == RequestStatus::CANCELLED) {
            return CancellationResult(false, "Cancellation Rejected: Request " + requestId +
                                             " is already CANCELLED.");
        }

        // 5. Update lifecycle status
        req->status = RequestStatus::CANCELLED;
        return CancellationResult(true, "Request " + requestId + " has been successfully cancelled.");
    }

    // ========================================================================
    // 5. HARD REMOVAL (PURGE)
    // ========================================================================
    // Strictly enforces correct unlinking order:
    // 1. Remove from HashTable FIRST so no dangling pointer remains.
    // 2. Delete node from master LinkedList.
    bool removeRequest(const std::string& requestId, const std::string& contactPhone) {
        ReliefRequest* req = idTable.search(requestId);
        if (req == nullptr) {
            return false;
        }
        if (req->contactPhone != contactPhone) {
            return false;
        }

        // Step 1: Remove hash table entry first!
        idTable.remove(requestId);

        // Step 2: Delete node from master linked list
        return masterList.deleteById(requestId);
    }
};

#endif // PEOPLE_SERVICE_H
