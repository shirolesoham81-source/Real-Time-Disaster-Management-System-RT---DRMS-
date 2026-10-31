#ifndef TEAM_LOCATION_H
#define TEAM_LOCATION_H

#include <string>
#include <iostream>
#include <cmath>
#include "Enums.h"

// TeamLocation struct representing a rescue squad's GPS coordinates and telemetry
struct TeamLocation {
    std::string teamId;              // Unique team ID (e.g., "T-01")
    double latitude;                 // Decimal degrees (-90.0 to +90.0)
    double longitude;                // Decimal degrees (-180.0 to +180.0)
    double accuracy;                 // Horizontal accuracy in metres (> 0.0)
    long long timestamp;             // Unix timestamp in seconds of the measurement
    std::string activeRequestId;     // Current assigned mission ID, if available
    bool isSimulated;                // False if actual browser GPS; True if simulated test data
    bool isSharing;                  // True if team leader is currently actively broadcasting

    // Default constructor
    TeamLocation()
        : teamId(""),
          latitude(0.0),
          longitude(0.0),
          accuracy(0.0),
          timestamp(0),
          activeRequestId(""),
          isSimulated(false),
          isSharing(false) {}

    // Parameterized constructor
    TeamLocation(const std::string& tId,
                 double lat,
                 double lon,
                 double acc,
                 long long ts,
                 const std::string& reqId = "",
                 bool sim = false,
                 bool sharing = true)
        : teamId(tId),
          latitude(lat),
          longitude(lon),
          accuracy(acc),
          timestamp(ts),
          activeRequestId(reqId),
          isSimulated(sim),
          isSharing(sharing) {}

    // Computes telemetry freshness classification given the current reference time
    LocationFreshness getFreshness(long long currentTime, int freshnessThresholdSeconds = 60) const {
        if (!isSharing) {
            return LocationFreshness::NOT_SHARING;
        }
        if (timestamp <= 0 || (std::abs(latitude) < 0.000001 && std::abs(longitude) < 0.000001)) {
            return LocationFreshness::LOCATION_UNAVAILABLE;
        }
        long long age = currentTime - timestamp;
        if (age < 0) age = 0; // Guard against client clock skew
        if (age <= freshnessThresholdSeconds) {
            return LocationFreshness::LIVE;
        }
        return LocationFreshness::STALE;
    }

    // Displays location record for terminal diagnostics
    void display() const {
        std::cout << "----------------------------------------\n";
        std::cout << "Team ID         : " << teamId << "\n";
        std::cout << "Coordinates     : " << latitude << ", " << longitude << "\n";
        std::cout << "Accuracy (m)    : " << accuracy << "\n";
        std::cout << "Timestamp       : " << timestamp << "\n";
        std::cout << "Active Mission  : " << (activeRequestId.empty() ? "None" : activeRequestId) << "\n";
        std::cout << "Data Source     : " << (isSimulated ? "SIMULATED TEST DATA" : "HARDWARE GPS") << "\n";
        std::cout << "Sharing Active  : " << (isSharing ? "YES" : "NO (STOPPED)") << "\n";
        std::cout << "----------------------------------------\n";
    }
};

#endif // TEAM_LOCATION_H
