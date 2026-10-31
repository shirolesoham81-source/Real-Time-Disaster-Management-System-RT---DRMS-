#ifndef RELIEF_REQUEST_H
#define RELIEF_REQUEST_H

#include <string>
#include <iostream>
#include "Enums.h"

// ReliefRequest struct representing a distress call from a citizen
struct ReliefRequest {
    std::string id;              // Unique request ID (e.g., "DR-1001")
    std::string citizenName;     // Name of the reporting citizen
    std::string contactPhone;    // 10-digit contact number
    std::string location;        // Disaster location / area zone (e.g., "Area B")
    std::string disasterType;    // Type of disaster (e.g., "Flood", "Fire")
    std::string requestType;     // Type of assistance needed (e.g., "Medical", "Rescue", "Food")
    int peopleCount;             // Number of people requiring help
    SeverityLevel severity;      // LOW, NORMAL, HIGH, CRITICAL
    RequestStatus status;        // PENDING, TRIAGED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED
    std::string details;         // Additional situation details or remarks
    std::string assignedTeamId;  // ID of the assigned rescue team (e.g., "T-01" or empty)
    long long timestamp;         // Arrival timestamp or sequence number

    // Phase 1: Affected population details
    int familiesCount;           // Number of families, if known (default 0)
    int childrenCount;           // Number of children, if known (default 0)
    int elderlyCount;            // Number of elderly people, if known (default 0)
    int injuredCount;            // Number of injured people, if known (default 0)

    // Phase 1: Required supplies
    int foodPackets;             // Food packets required (default 0)
    int waterLitres;             // Drinking water required in litres (default 0)
    int medicalKits;             // Medical kits required (default 0)
    int blankets;                // Blankets required (default 0)
    std::string otherSupplies;   // Other supplies with quantity and unit (e.g., "10 baby food jars")

    // Phase 1: Destination details
    std::string landmark;        // Area or landmark (e.g., "Near Central Clocktower")
    double latitude;             // Latitude, if available (default 0.0)
    double longitude;            // Longitude, if available (default 0.0)
    std::string directions;      // Additional rescue team navigation directions

    // Default constructor with sensible initial values
    ReliefRequest()
        : id(""),
          citizenName(""),
          contactPhone(""),
          location(""),
          disasterType("General"),
          requestType("General"),
          peopleCount(1),
          severity(SeverityLevel::NORMAL),
          status(RequestStatus::PENDING),
          details(""),
          assignedTeamId(""),
          timestamp(0),
          familiesCount(0),
          childrenCount(0),
          elderlyCount(0),
          injuredCount(0),
          foodPackets(0),
          waterLitres(0),
          medicalKits(0),
          blankets(0),
          otherSupplies(""),
          landmark(""),
          latitude(0.0),
          longitude(0.0),
          directions("") {}

    // Parameterized constructor (backward-compatible with default arguments for new fields)
    ReliefRequest(const std::string& reqId,
                  const std::string& name,
                  const std::string& phone,
                  const std::string& loc,
                  const std::string& disaster,
                  const std::string& reqType,
                  int count,
                  SeverityLevel sev,
                  RequestStatus stat = RequestStatus::PENDING,
                  const std::string& extraDetails = "",
                  const std::string& teamId = "",
                  long long time = 0,
                  int famCount = 0,
                  int childCount = 0,
                  int eldCount = 0,
                  int injCount = 0,
                  int food = 0,
                  int water = 0,
                  int med = 0,
                  int blk = 0,
                  const std::string& otherSup = "",
                  const std::string& lmark = "",
                  double lat = 0.0,
                  double lon = 0.0,
                  const std::string& dirs = "")
        : id(reqId),
          citizenName(name),
          contactPhone(phone),
          location(loc),
          disasterType(disaster),
          requestType(reqType),
          peopleCount(count),
          severity(sev),
          status(stat),
          details(extraDetails),
          assignedTeamId(teamId),
          timestamp(time),
          familiesCount(famCount),
          childrenCount(childCount),
          elderlyCount(eldCount),
          injuredCount(injCount),
          foodPackets(food),
          waterLitres(water),
          medicalKits(med),
          blankets(blk),
          otherSupplies(otherSup),
          landmark(lmark),
          latitude(lat),
          longitude(lon),
          directions(dirs) {}

    // Display request information in a readable format
    void display() const {
        std::cout << "----------------------------------------\n";
        std::cout << "Request ID      : " << id << "\n";
        std::cout << "Citizen Name    : " << citizenName << "\n";
        std::cout << "Contact Phone   : " << contactPhone << "\n";
        std::cout << "Location        : " << location << "\n";
        std::cout << "Disaster Type   : " << disasterType << "\n";
        std::cout << "Request Type    : " << requestType << "\n";
        std::cout << "People Affected : " << peopleCount << "\n";
        std::cout << "Severity Level  : " << severityToString(severity) << "\n";
        std::cout << "Status          : " << requestStatusToString(status) << "\n";
        std::cout << "Details         : " << (details.empty() ? "None" : details) << "\n";
        std::cout << "Assigned Team   : " << (assignedTeamId.empty() ? "Unassigned" : assignedTeamId) << "\n";
        std::cout << "Timestamp       : " << timestamp << "\n";
        std::cout << "Families        : " << familiesCount << "\n";
        std::cout << "Children        : " << childrenCount << "\n";
        std::cout << "Elderly         : " << elderlyCount << "\n";
        std::cout << "Injured         : " << injuredCount << "\n";
        std::cout << "Food Packets    : " << foodPackets << "\n";
        std::cout << "Water (Litres)  : " << waterLitres << "\n";
        std::cout << "Medical Kits    : " << medicalKits << "\n";
        std::cout << "Blankets        : " << blankets << "\n";
        std::cout << "Other Supplies  : " << (otherSupplies.empty() ? "None" : otherSupplies) << "\n";
        std::cout << "Landmark        : " << (landmark.empty() ? "None" : landmark) << "\n";
        std::cout << "Coordinates     : " << latitude << ", " << longitude << "\n";
        std::cout << "Directions      : " << (directions.empty() ? "None" : directions) << "\n";
        std::cout << "----------------------------------------\n";
    }
};

#endif // RELIEF_REQUEST_H
