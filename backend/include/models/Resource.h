#ifndef RESOURCE_H
#define RESOURCE_H

#include <string>
#include <iostream>
#include "Enums.h"

// Resource struct representing relief supplies (water, food, medicine, blankets)
struct Resource {
    std::string id;         // Unique resource ID (e.g., "R-1")
    std::string name;       // Resource name (e.g., "Water (Liters)")
    int quantity;           // Current stock quantity
    int minThreshold;       // Alert threshold below which stock is considered LOW
    ResourceStatus status;  // AVAILABLE, LOW, DEPLETED

    // Default constructor
    Resource()
        : id(""),
          name(""),
          quantity(0),
          minThreshold(10),
          status(ResourceStatus::DEPLETED) {}

    // Parameterized constructor
    Resource(const std::string& resId,
             const std::string& resName,
             int qty,
             int threshold = 20)
        : id(resId),
          name(resName),
          quantity(qty),
          minThreshold(threshold) {
        // Automatically determine initial stock status
        updateStatus();
    }

    // Helper to evaluate and refresh stock status based on current quantity
    void updateStatus() {
        if (quantity <= 0) {
            status = ResourceStatus::DEPLETED;
        } else if (quantity <= minThreshold) {
            status = ResourceStatus::LOW;
        } else {
            status = ResourceStatus::AVAILABLE;
        }
    }

    // Display resource information
    void display() const {
        std::cout << "----------------------------------------\n";
        std::cout << "Resource ID     : " << id << "\n";
        std::cout << "Resource Name   : " << name << "\n";
        std::cout << "Quantity        : " << quantity << "\n";
        std::cout << "Min Threshold   : " << minThreshold << "\n";
        std::cout << "Status          : " << resourceStatusToString(status) << "\n";
        std::cout << "----------------------------------------\n";
    }
};

#endif // RESOURCE_H
