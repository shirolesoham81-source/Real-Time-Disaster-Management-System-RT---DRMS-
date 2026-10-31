#ifndef ENUMS_H
#define ENUMS_H

#include <string>

// Enum for relief request severity levels
enum class SeverityLevel {
    LOW,
    NORMAL,
    HIGH,
    CRITICAL
};

// Enum for relief request lifecycle status
enum class RequestStatus {
    PENDING,
    TRIAGED,
    ASSIGNED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED
};

// Enum for rescue team operational status
enum class TeamStatus {
    AVAILABLE,
    BUSY,
    OFFLINE
};

// Enum for relief resource stock status
enum class ResourceStatus {
    AVAILABLE,
    LOW,
    DEPLETED
};

// Helper functions to convert enum values to readable strings
inline std::string severityToString(SeverityLevel level) {
    switch (level) {
        case SeverityLevel::LOW:      return "LOW";
        case SeverityLevel::NORMAL:   return "NORMAL";
        case SeverityLevel::HIGH:     return "HIGH";
        case SeverityLevel::CRITICAL: return "CRITICAL";
        default:                      return "UNKNOWN";
    }
}

inline std::string requestStatusToString(RequestStatus status) {
    switch (status) {
        case RequestStatus::PENDING:     return "PENDING";
        case RequestStatus::TRIAGED:    return "TRIAGED";
        case RequestStatus::ASSIGNED:    return "ASSIGNED";
        case RequestStatus::IN_PROGRESS: return "IN_PROGRESS";
        case RequestStatus::COMPLETED:   return "COMPLETED";
        case RequestStatus::CANCELLED:   return "CANCELLED";
        default:                         return "UNKNOWN";
    }
}

inline std::string teamStatusToString(TeamStatus status) {
    switch (status) {
        case TeamStatus::AVAILABLE: return "AVAILABLE";
        case TeamStatus::BUSY:      return "BUSY";
        case TeamStatus::OFFLINE:   return "OFFLINE";
        default:                    return "UNKNOWN";
    }
}

inline std::string resourceStatusToString(ResourceStatus status) {
    switch (status) {
        case ResourceStatus::AVAILABLE: return "AVAILABLE";
        case ResourceStatus::LOW:       return "LOW";
        case ResourceStatus::DEPLETED:  return "DEPLETED";
        default:                        return "UNKNOWN";
    }
}

// Optional helper functions to parse strings back to enums
inline SeverityLevel stringToSeverity(const std::string& str) {
    if (str == "CRITICAL") return SeverityLevel::CRITICAL;
    if (str == "HIGH")     return SeverityLevel::HIGH;
    if (str == "LOW")      return SeverityLevel::LOW;
    return SeverityLevel::NORMAL;
}

inline RequestStatus stringToRequestStatus(const std::string& str) {
    if (str == "TRIAGED")    return RequestStatus::TRIAGED;
    if (str == "ASSIGNED")   return RequestStatus::ASSIGNED;
    if (str == "IN_PROGRESS") return RequestStatus::IN_PROGRESS;
    if (str == "COMPLETED")  return RequestStatus::COMPLETED;
    if (str == "CANCELLED")  return RequestStatus::CANCELLED;
    return RequestStatus::PENDING;
}

inline TeamStatus stringToTeamStatus(const std::string& str) {
    if (str == "BUSY")    return TeamStatus::BUSY;
    if (str == "OFFLINE") return TeamStatus::OFFLINE;
    return TeamStatus::AVAILABLE;
}

inline ResourceStatus stringToResourceStatus(const std::string& str) {
    if (str == "LOW")      return ResourceStatus::LOW;
    if (str == "DEPLETED") return ResourceStatus::DEPLETED;
    return ResourceStatus::AVAILABLE;
}

// Enum for team location freshness status
enum class LocationFreshness {
    LIVE,                // Location updated recently within threshold (<= 60s)
    STALE,               // Previously known location older than threshold (> 60s)
    NOT_SHARING,         // Location sharing explicitly stopped or inactive
    LOCATION_UNAVAILABLE // No location recorded yet for this team
};

inline std::string locationFreshnessToString(LocationFreshness status) {
    switch (status) {
        case LocationFreshness::LIVE:                 return "LIVE";
        case LocationFreshness::STALE:                return "STALE";
        case LocationFreshness::NOT_SHARING:          return "NOT_SHARING";
        case LocationFreshness::LOCATION_UNAVAILABLE: return "LOCATION_UNAVAILABLE";
        default:                                      return "LOCATION_UNAVAILABLE";
    }
}

inline std::string freshnessToString(LocationFreshness status) {
    return locationFreshnessToString(status);
}

inline std::string freshnessToDescription(LocationFreshness status) {
    switch (status) {
        case LocationFreshness::LIVE:                 return "Live GPS coordinates active and verified.";
        case LocationFreshness::STALE:                return "Signal stale: Last known location exceeds freshness threshold.";
        case LocationFreshness::NOT_SHARING:          return "Location sharing paused by field team.";
        case LocationFreshness::LOCATION_UNAVAILABLE: return "No GPS telemetry recorded for this team yet.";
        default:                                      return "Location unavailable.";
    }
}

inline LocationFreshness stringToLocationFreshness(const std::string& str) {
    if (str == "LIVE")                 return LocationFreshness::LIVE;
    if (str == "STALE")                return LocationFreshness::STALE;
    if (str == "NOT_SHARING")          return LocationFreshness::NOT_SHARING;
    return LocationFreshness::LOCATION_UNAVAILABLE;
}

#endif // ENUMS_H
