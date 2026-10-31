#ifndef RELIEF_CENTER_H
#define RELIEF_CENTER_H

#include <string>
#include <iostream>

// ReliefCenter struct representing a shelter / hub in the relief network
struct ReliefCenter {
    std::string id;            // Unique center ID (e.g., "C-1")
    std::string name;          // Center name (e.g., "Central Relief Camp")
    std::string locationNode;  // Corresponding graph node name / key (e.g., "central")
    int maxCapacity;           // Maximum number of people the center can shelter
    int currentOccupancy;      // Current number of sheltered victims
    std::string contactNumber; // Contact number for camp coordinators
    double latitude;           // Optional GPS latitude (0.0 if topological graph node only)
    double longitude;          // Optional GPS longitude (0.0 if topological graph node only)
    bool isDemonstration;      // True if demonstration/unverified; false if verified civic facility

    // Default constructor
    ReliefCenter()
        : id(""),
          name(""),
          locationNode(""),
          maxCapacity(0),
          currentOccupancy(0),
          contactNumber(""),
          latitude(0.0),
          longitude(0.0),
          isDemonstration(false) {}

    // Parameterized constructor
    ReliefCenter(const std::string& centerId,
                 const std::string& centerName,
                 const std::string& locNode,
                 int maxCap,
                 int curOcc,
                 const std::string& contact = "",
                 double lat = 0.0,
                 double lon = 0.0,
                 bool isDemo = false)
        : id(centerId),
          name(centerName),
          locationNode(locNode),
          maxCapacity(maxCap),
          currentOccupancy(curOcc),
          contactNumber(contact),
          latitude(lat),
          longitude(lon),
          isDemonstration(isDemo) {}

    // Helper to calculate remaining open spots
    int getAvailableCapacity() const {
        int available = maxCapacity - currentOccupancy;
        return (available > 0) ? available : 0;
    }

    // Display center information
    void display() const {
        std::cout << "----------------------------------------\n";
        std::cout << "Center ID       : " << id << "\n";
        std::cout << "Center Name     : " << name << "\n";
        std::cout << "Location Node   : " << locationNode << "\n";
        std::cout << "Capacity        : " << currentOccupancy << " / " << maxCapacity
                  << " (Available: " << getAvailableCapacity() << ")\n";
        std::cout << "Contact Number  : " << (contactNumber.empty() ? "N/A" : contactNumber) << "\n";
        std::cout << "----------------------------------------\n";
    }
};

#endif // RELIEF_CENTER_H
