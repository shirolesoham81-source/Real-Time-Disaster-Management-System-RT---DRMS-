#include "datastructures/PriorityQueue.h"
#include <iostream>

// ============================================================================
// DATA STRUCTURE IMPLEMENTATION: BINARY MAX-HEAP PRIORITY QUEUE
// ============================================================================

// PriorityEntry Default Constructor
PriorityEntry::PriorityEntry()
    : requestId(""), priorityScore(0), arrivalSequence(0),
      severity(SeverityLevel::LOW), peopleCount(0) {}

// PriorityEntry Parameterized Constructor
PriorityEntry::PriorityEntry(const std::string& id, SeverityLevel sev, int people, long long arrival)
    : requestId(id), arrivalSequence(arrival), severity(sev), peopleCount(people) {
    priorityScore = calculateScore(sev, people);
}

// Severity Weight Helper
int PriorityEntry::getSeverityWeight(SeverityLevel sev) {
    switch (sev) {
        case SeverityLevel::CRITICAL: return 3;
        case SeverityLevel::HIGH:     return 2;
        case SeverityLevel::NORMAL:   return 1;
        case SeverityLevel::LOW:      return 0;
        default:                      return 0;
    }
}

// Composite Priority Score Formula
int PriorityEntry::calculateScore(SeverityLevel sev, int people) {
    int weight = getSeverityWeight(sev);
    int cappedPeople = people;
    if (cappedPeople > 50) cappedPeople = 50;
    if (cappedPeople < 0) cappedPeople = 0;
    return (weight * 100) + cappedPeople;
}

// Higher Priority Comparator
bool PriorityEntry::hasHigherPriorityThan(const PriorityEntry& other) const {
    if (priorityScore != other.priorityScore) {
        return priorityScore > other.priorityScore;
    }
    // Tie-breaker: earlier arrival takes precedence
    return arrivalSequence < other.arrivalSequence;
}

// PriorityQueue Constructor
PriorityQueue::PriorityQueue(int initCapacity)
    : capacity(initCapacity < 2 ? 4 : initCapacity), size(0) {
    heapArray = new PriorityEntry[capacity];
}

// PriorityQueue Destructor
PriorityQueue::~PriorityQueue() {
    delete[] heapArray;
    heapArray = nullptr;
}

// Deep Copy Constructor
PriorityQueue::PriorityQueue(const PriorityQueue& other)
    : capacity(other.capacity), size(other.size) {
    heapArray = new PriorityEntry[capacity];
    for (int i = 0; i < size; i++) {
        heapArray[i] = other.heapArray[i];
    }
}

// Copy Assignment Operator
PriorityQueue& PriorityQueue::operator=(const PriorityQueue& other) {
    if (this != &other) {
        delete[] heapArray;
        capacity = other.capacity;
        size = other.size;
        heapArray = new PriorityEntry[capacity];
        for (int i = 0; i < size; i++) {
            heapArray[i] = other.heapArray[i];
        }
    }
    return *this;
}

// Swap entries
void PriorityQueue::swapEntries(int i, int j) {
    PriorityEntry temp = heapArray[i];
    heapArray[i] = heapArray[j];
    heapArray[j] = temp;
}

// Dynamic array expansion
void PriorityQueue::resize(int newCapacity) {
    if (newCapacity <= capacity) {
        return;
    }
    PriorityEntry* newArray = new PriorityEntry[newCapacity];
    for (int i = 0; i < size; i++) {
        newArray[i] = heapArray[i];
    }
    delete[] heapArray;
    heapArray = newArray;
    capacity = newCapacity;
}

// Check if heap is empty - O(1)
bool PriorityQueue::isEmpty() const {
    return size == 0;
}

// Return size - O(1)
int PriorityQueue::getSize() const {
    return size;
}

// Return capacity
int PriorityQueue::getCapacity() const {
    return capacity;
}

// Check duplicate ID - O(n)
bool PriorityQueue::contains(const std::string& id) const {
    for (int i = 0; i < size; i++) {
        if (heapArray[i].requestId == id) {
            return true;
        }
    }
    return false;
}

// Sift up - O(log n)
void PriorityQueue::heapifyUp(int index) {
    while (index > 0) {
        int parentIndex = (index - 1) / 2;
        if (heapArray[index].hasHigherPriorityThan(heapArray[parentIndex])) {
            swapEntries(index, parentIndex);
            index = parentIndex;
        } else {
            break;
        }
    }
}

// Sift down - O(log n)
void PriorityQueue::heapifyDown(int index) {
    while (true) {
        int largest = index;
        int leftChild = 2 * index + 1;
        int rightChild = 2 * index + 2;

        if (leftChild < size && heapArray[leftChild].hasHigherPriorityThan(heapArray[largest])) {
            largest = leftChild;
        }
        if (rightChild < size && heapArray[rightChild].hasHigherPriorityThan(heapArray[largest])) {
            largest = rightChild;
        }

        if (largest != index) {
            swapEntries(index, largest);
            index = largest;
        } else {
            break;
        }
    }
}

// Insert into max-heap - O(log n)
bool PriorityQueue::insert(const std::string& id, SeverityLevel severity, int peopleCount, long long arrivalSequence) {
    if (contains(id)) {
        std::cout << "[HEAP ERROR] Duplicate Request ID '" << id << "' cannot be inserted.\n";
        return false;
    }

    if (size == capacity) {
        resize(capacity * 2);
    }

    PriorityEntry newEntry(id, severity, peopleCount, arrivalSequence);
    heapArray[size] = newEntry;
    heapifyUp(size);
    size++;
    return true;
}

// Insert overload
bool PriorityQueue::insert(const PriorityEntry& entry) {
    return insert(entry.requestId, entry.severity, entry.peopleCount, entry.arrivalSequence);
}

// Extract max element (root) - O(log n)
bool PriorityQueue::extractMax(PriorityEntry& outEntry) {
    if (isEmpty()) {
        return false;
    }

    outEntry = heapArray[0];
    heapArray[0] = heapArray[size - 1];
    size--;

    if (size > 0) {
        heapifyDown(0);
    }

    return true;
}

// Peek root element without removing - O(1)
bool PriorityQueue::peekMax(PriorityEntry& outEntry) const {
    if (isEmpty()) {
        return false;
    }
    outEntry = heapArray[0];
    return true;
}

// Display heap contents
void PriorityQueue::displayHeap() const {
    if (isEmpty()) {
        std::cout << "  (Binary Max-Heap is empty)\n";
        return;
    }

    std::cout << "  Heap Size: " << size << " / Capacity: " << capacity << "\n";
    for (int i = 0; i < size; i++) {
        std::cout << "  [" << i << "] ID: " << heapArray[i].requestId
                  << " | Score: " << heapArray[i].priorityScore
                  << " (Sev: " << severityToString(heapArray[i].severity)
                  << ", People: " << heapArray[i].peopleCount
                  << ", Arrival: " << heapArray[i].arrivalSequence << ")\n";
    }
}

// Clear heap
void PriorityQueue::clear() {
    size = 0;
}
