#ifndef LINKED_LIST_H
#define LINKED_LIST_H

#include <iostream>
#include <string>
#include "models/ReliefRequest.h"

// ============================================================================
// DATA STRUCTURE: SINGLY LINKED LIST
// Purpose: Authoritative master storage for all ReliefRequest records.
// Structure: Sequence of dynamic nodes, each pointing to the next node in line.
// Supports: Fast head/tail insertions, sequential search, and targeted deletion.
// ============================================================================

// Node structure holding one ReliefRequest entity and a link to the next node
struct Node {
    ReliefRequest data; // Stored ReliefRequest record
    Node* next;         // Pointer to the next node in the list

    // Constructor initializing node with data and null next pointer
    Node(const ReliefRequest& req);
};

// Manually implemented Singly Linked List class
class LinkedList {
private:
    Node* head; // Pointer to the first node in the list (nullptr if empty)
    Node* tail; // Pointer to the last node in the list (nullptr if empty)
    int size;   // Total count of active nodes currently in the list

public:
    // Constructor: initializes an empty linked list
    LinkedList();

    // Destructor: releases all dynamically allocated nodes
    ~LinkedList();

    // Deep Copy Constructor: prevents shallow-copy pointer sharing
    LinkedList(const LinkedList& other);

    // Copy Assignment Operator: safely replaces this list with deep copies of other
    LinkedList& operator=(const LinkedList& other);

    // Check if the list contains zero nodes - O(1) time
    bool isEmpty() const;

    // Return the total number of stored requests - O(1) time
    int getSize() const;

    // Check if a request with the given ID already exists - O(n) time
    bool contains(const std::string& id) const;

    // INSERT AT HEAD: Add a new request at the beginning of the list - O(1) time
    bool insertAtHead(const ReliefRequest& req);

    // INSERT AT TAIL: Add a new request at the end of the list - O(1) time
    bool insertAtTail(const ReliefRequest& req);

    // SEARCH: Find a request by its unique ID (non-const version) - O(n) time
    ReliefRequest* findById(const std::string& id);

    // SEARCH: Const overload of findById
    const ReliefRequest* findById(const std::string& id) const;

    // DELETE: Remove a request node by its unique ID - O(n) time
    bool deleteById(const std::string& id);

    // DISPLAY: Print all stored requests in sequence from head to tail
    void displayAll() const;

    // CLEAR: Safely deallocate all nodes and reset pointers to empty state
    void clear();

    // Getters for inspecting internal pointer integrity in unit tests
    const Node* getHead() const;
    const Node* getTail() const;
};

#endif // LINKED_LIST_H
