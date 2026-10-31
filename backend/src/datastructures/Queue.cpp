#include "datastructures/Queue.h"
#include <iostream>

// ============================================================================
// DATA STRUCTURE IMPLEMENTATION: FIFO QUEUE
// ============================================================================

// QueueNode Constructor
QueueNode::QueueNode(const std::string& id) : requestId(id), next(nullptr) {}

// Queue Constructor
Queue::Queue() : frontNode(nullptr), rearNode(nullptr), size(0) {}

// Queue Destructor
Queue::~Queue() {
    clear();
}

// Deep Copy Constructor
Queue::Queue(const Queue& other) : frontNode(nullptr), rearNode(nullptr), size(0) {
    QueueNode* current = other.frontNode;
    while (current != nullptr) {
        enqueue(current->requestId);
        current = current->next;
    }
}

// Copy Assignment Operator
Queue& Queue::operator=(const Queue& other) {
    if (this != &other) {
        clear();
        QueueNode* current = other.frontNode;
        while (current != nullptr) {
            enqueue(current->requestId);
            current = current->next;
        }
    }
    return *this;
}

// Check if queue is empty - O(1)
bool Queue::isEmpty() const {
    return frontNode == nullptr;
}

// Return size - O(1)
int Queue::getSize() const {
    return size;
}

// Check if ID is in queue - O(n)
bool Queue::contains(const std::string& id) const {
    QueueNode* current = frontNode;
    while (current != nullptr) {
        if (current->requestId == id) {
            return true;
        }
        current = current->next;
    }
    return false;
}

// Enqueue request ID - O(1)
bool Queue::enqueue(const std::string& id) {
    if (contains(id)) {
        std::cout << "[QUEUE ERROR] Duplicate Request ID '" << id << "' cannot be enqueued.\n";
        return false;
    }

    QueueNode* newNode = new QueueNode(id);
    if (isEmpty()) {
        frontNode = newNode;
        rearNode = newNode;
    } else {
        rearNode->next = newNode;
        rearNode = newNode;
    }
    size++;
    return true;
}

// Dequeue request ID - O(1)
bool Queue::dequeue(std::string& outId) {
    if (isEmpty()) {
        return false;
    }

    QueueNode* temp = frontNode;
    outId = temp->requestId;
    frontNode = frontNode->next;

    if (frontNode == nullptr) {
        rearNode = nullptr;
    }

    delete temp;
    size--;
    return true;
}

// Dequeue overload
bool Queue::dequeue() {
    std::string dummy;
    return dequeue(dummy);
}

// Peek request ID - O(1)
bool Queue::peek(std::string& outId) const {
    if (isEmpty()) {
        return false;
    }
    outId = frontNode->requestId;
    return true;
}

// Peek overload
std::string Queue::peek() const {
    if (isEmpty()) {
        return "";
    }
    return frontNode->requestId;
}

// Display waiting queue items
void Queue::display() const {
    if (isEmpty()) {
        std::cout << "  (FIFO Queue is empty)\n";
        return;
    }

    std::cout << "  [Front] ";
    QueueNode* current = frontNode;
    while (current != nullptr) {
        std::cout << current->requestId;
        if (current->next != nullptr) {
            std::cout << " -> ";
        }
        current = current->next;
    }
    std::cout << " [Rear]\n";
}

// Clear all queue items
void Queue::clear() {
    while (!isEmpty()) {
        dequeue();
    }
}

// Getters
std::string Queue::getFrontId() const {
    return frontNode ? frontNode->requestId : "nullptr";
}

std::string Queue::getRearId() const {
    return rearNode ? rearNode->requestId : "nullptr";
}
