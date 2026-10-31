#include "datastructures/LinkedList.h"
#include "models/Enums.h"
#include <iostream>

// ============================================================================
// DATA STRUCTURE IMPLEMENTATION: SINGLY LINKED LIST
// ============================================================================

// Node Constructor
Node::Node(const ReliefRequest& req) : data(req), next(nullptr) {}

// LinkedList Constructor
LinkedList::LinkedList() : head(nullptr), tail(nullptr), size(0) {}

// LinkedList Destructor
LinkedList::~LinkedList() {
    clear();
}

// Deep Copy Constructor
LinkedList::LinkedList(const LinkedList& other) : head(nullptr), tail(nullptr), size(0) {
    Node* current = other.head;
    while (current != nullptr) {
        insertAtTail(current->data);
        current = current->next;
    }
}

// Copy Assignment Operator
LinkedList& LinkedList::operator=(const LinkedList& other) {
    if (this != &other) {
        clear();
        Node* current = other.head;
        while (current != nullptr) {
            insertAtTail(current->data);
            current = current->next;
        }
    }
    return *this;
}

// Check if list is empty - O(1)
bool LinkedList::isEmpty() const {
    return head == nullptr;
}

// Get total count of nodes - O(1)
int LinkedList::getSize() const {
    return size;
}

// Check if request ID exists - O(n)
bool LinkedList::contains(const std::string& id) const {
    return findById(id) != nullptr;
}

// Insert at head - O(1)
bool LinkedList::insertAtHead(const ReliefRequest& req) {
    if (contains(req.id)) {
        std::cout << "[ERROR] Duplicate Request ID '" << req.id << "' rejected.\n";
        return false;
    }

    Node* newNode = new Node(req);
    if (isEmpty()) {
        head = newNode;
        tail = newNode;
    } else {
        newNode->next = head;
        head = newNode;
    }
    size++;
    return true;
}

// Insert at tail - O(1)
bool LinkedList::insertAtTail(const ReliefRequest& req) {
    if (contains(req.id)) {
        std::cout << "[ERROR] Duplicate Request ID '" << req.id << "' rejected.\n";
        return false;
    }

    Node* newNode = new Node(req);
    if (isEmpty()) {
        head = newNode;
        tail = newNode;
    } else {
        tail->next = newNode;
        tail = newNode;
    }
    size++;
    return true;
}

// Search by ID (non-const) - O(n)
ReliefRequest* LinkedList::findById(const std::string& id) {
    Node* current = head;
    while (current != nullptr) {
        if (current->data.id == id) {
            return &(current->data);
        }
        current = current->next;
    }
    return nullptr;
}

// Search by ID (const) - O(n)
const ReliefRequest* LinkedList::findById(const std::string& id) const {
    Node* current = head;
    while (current != nullptr) {
        if (current->data.id == id) {
            return &(current->data);
        }
        current = current->next;
    }
    return nullptr;
}

// Delete by ID - O(n)
bool LinkedList::deleteById(const std::string& id) {
    if (isEmpty()) {
        return false;
    }

    // Case 1: Node to delete is head
    if (head->data.id == id) {
        Node* temp = head;
        head = head->next;
        if (head == nullptr) {
            tail = nullptr;
        }
        delete temp;
        size--;
        return true;
    }

    // Case 2: Node is after head
    Node* current = head;
    while (current->next != nullptr && current->next->data.id != id) {
        current = current->next;
    }

    if (current->next == nullptr) {
        return false;
    }

    Node* target = current->next;
    if (target == tail) {
        tail = current;
    }

    current->next = target->next;
    delete target;
    size--;
    return true;
}

// Display all stored requests
void LinkedList::displayAll() const {
    if (isEmpty()) {
        std::cout << "  (List is empty. No requests on record.)\n";
        return;
    }

    Node* current = head;
    int index = 1;
    while (current != nullptr) {
        std::cout << "  [" << index++ << "] ID: " << current->data.id
                  << " | Name: " << current->data.citizenName
                  << " | Location: " << current->data.location
                  << " | Severity: " << severityToString(current->data.severity)
                  << " | Status: " << requestStatusToString(current->data.status)
                  << " | People: " << current->data.peopleCount << "\n";
        current = current->next;
    }
}

// Deallocate all nodes
void LinkedList::clear() {
    Node* current = head;
    while (current != nullptr) {
        Node* nextNode = current->next;
        delete current;
        current = nextNode;
    }
    head = nullptr;
    tail = nullptr;
    size = 0;
}

// Getters
const Node* LinkedList::getHead() const {
    return head;
}

const Node* LinkedList::getTail() const {
    return tail;
}
