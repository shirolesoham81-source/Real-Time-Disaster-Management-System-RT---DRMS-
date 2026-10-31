#ifndef RESCUE_TEAM_H
#define RESCUE_TEAM_H

#include <string>
#include <iostream>
#include "Enums.h"

// RescueTeam struct representing an active emergency responder unit
struct RescueTeam {
    std::string id;              // Unique team ID (e.g., "T-01")
    std::string name;            // Team name (e.g., "Alpha Rescue")
    std::string specialization;  // "Medical", "Search & Rescue", "Supplies", "Evacuation"
    std::string currentLocation; // Current base camp or map node (e.g., "Central")
    TeamStatus status;           // AVAILABLE, BUSY, OFFLINE
    std::string activeRequestId; // ID of the currently assigned request (or empty if idle)

    // Default constructor
    RescueTeam()
        : id(""),
          name(""),
          specialization("General"),
          currentLocation("Central"),
          status(TeamStatus::AVAILABLE),
          activeRequestId("") {}

    // Parameterized constructor
    RescueTeam(const std::string& teamId,
               const std::string& teamName,
               const std::string& spec,
               const std::string& loc,
               TeamStatus stat = TeamStatus::AVAILABLE,
               const std::string& reqId = "")
        : id(teamId),
          name(teamName),
          specialization(spec),
          currentLocation(loc),
          status(stat),
          activeRequestId(reqId) {}

    // Display team information
    void display() const {
        std::cout << "----------------------------------------\n";
        std::cout << "Team ID         : " << id << "\n";
        std::cout << "Team Name       : " << name << "\n";
        std::cout << "Specialization  : " << specialization << "\n";
        std::cout << "Current Location: " << currentLocation << "\n";
        std::cout << "Status          : " << teamStatusToString(status) << "\n";
        std::cout << "Active Request  : " << (activeRequestId.empty() ? "None (Idle)" : activeRequestId) << "\n";
        std::cout << "----------------------------------------\n";
    }
};

#endif // RESCUE_TEAM_H
