#ifndef PRIORITY_QUEUE_H
#define PRIORITY_QUEUE_H

#include <iostream>
#include <string>
#include "models/Enums.h"

// ============================================================================
// DATA STRUCTURE: BINARY MAX-HEAP PRIORITY QUEUE
// Purpose: Automatically prioritizes urgent relief requests (CRITICAL & HIGH).
// Max-Heap Invariant: Every parent node has a higher priority than its children.
// Array Representation:
//   - Root is at index 0.
//   - For node at index i:
//       Parent index      = (i - 1) / 2
//       Left child index  = 2 * i + 1
//       Right child index = 2 * i + 2
// ============================================================================

// Lightweight priority entry stored inside the binary heap array
struct PriorityEntry {
    std::string requestId;       // Reference key linking to a ReliefRequest
    int priorityScore;          // Calculated severity score: (weight * 100) + min(people, 50)
    long long arrivalSequence;  // Monotonic sequence number used as a tie-breaker (FIFO for ties)
    SeverityLevel severity;     // Stored for inspection and debugging
    int peopleCount;            // Number of people affected

    // Default constructor
    PriorityEntry();

    // Parameterized constructor calculating priority score automatically
    PriorityEntry(const std::string& id, SeverityLevel sev, int people, long long arrival);

    // Helper: Returns integer weight for severity level
    static int getSeverityWeight(SeverityLevel sev);

    // Helper: Calculates composite priority score
    static int calculateScore(SeverityLevel sev, int people);

    // Comparator: returns true if this entry has strictly higher priority than other
    bool hasHigherPriorityThan(const PriorityEntry& other) const;
};

// Manually implemented Binary Max-Heap class
class PriorityQueue {
private:
    PriorityEntry* heapArray; // Dynamically allocated contiguous array storing heap elements
    int capacity;             // Maximum allocated capacity of the array
    int size;                 // Current number of elements stored in the heap

    // Helper to swap two entries in the heap array
    void swapEntries(int i, int j);

    // Dynamic array expansion when heap reaches full capacity
    void resize(int newCapacity);

public:
    // Constructor: initializes dynamic array with an initial capacity (default: 4)
    PriorityQueue(int initCapacity = 4);

    // Destructor: safely deallocates dynamic array
    ~PriorityQueue();

    // Deep Copy Constructor: prevents unsafe pointer sharing
    PriorityQueue(const PriorityQueue& other);

    // Copy Assignment Operator: performs safe deep copy
    PriorityQueue& operator=(const PriorityQueue& other);

    // Check if the heap contains zero elements - O(1) time
    bool isEmpty() const;

    // Return the number of elements in the heap - O(1) time
    int getSize() const;

    // Return the current allocated capacity of the array
    int getCapacity() const;

    // Check if an ID is already present in the heap to prevent duplicates - O(n) time
    bool contains(const std::string& id) const;

    // HEAPIFY UP: Sifts newly inserted leaf up to its valid heap position - O(log n) time
    void heapifyUp(int index);

    // HEAPIFY DOWN: Sifts root element down to its valid heap position - O(log n) time
    void heapifyDown(int index);

    // INSERT: Add an item into the max-heap - O(log n) time
    bool insert(const std::string& id, SeverityLevel severity, int peopleCount, long long arrivalSequence);

    // INSERT OVERLOAD: Insert an already constructed PriorityEntry
    bool insert(const PriorityEntry& entry);

    // EXTRACT MAX: Remove and return the highest-priority item (the root) - O(log n) time
    bool extractMax(PriorityEntry& outEntry);

    // PEEK MAX: Inspect the root element without removing it - O(1) time
    bool peekMax(PriorityEntry& outEntry) const;

    // DISPLAY: Print internal heap array layout for inspection and viva evaluation
    void displayHeap() const;

    // CLEAR: Reset heap to empty state - O(1) time
    void clear();
};

#endif // PRIORITY_QUEUE_H
