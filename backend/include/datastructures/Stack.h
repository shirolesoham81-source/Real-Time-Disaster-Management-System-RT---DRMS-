#ifndef STACK_H
#define STACK_H

#include <iostream>
#include <string>
#include "models/Enums.h"

// ============================================================================
// DATA STRUCTURE: LIFO STACK
// Purpose: Stores operational dispatch history to support undo / rollback.
// Principle: Last-In, First-Out (LIFO) - newest action is on top and undone first.
// ============================================================================

// Record of a single management action that can be inspected or rolled back
struct ActionRecord {
    std::string requestId;            // Affected relief request ID (e.g., "DR-1001")
    std::string teamId;               // Assigned rescue team ID (e.g., "T-01")
    RequestStatus prevRequestStatus;  // Request status prior to this action
    TeamStatus prevTeamStatus;        // Team status prior to this action
    std::string actionDescription;    // Readable summary of the action

    // Default constructor
    ActionRecord();

    // Parameterized constructor
    ActionRecord(const std::string& reqId,
                 const std::string& tId,
                 RequestStatus reqStat,
                 TeamStatus tStat,
                 const std::string& desc);
};

// Node structure for the singly-linked stack
struct StackNode {
    ActionRecord action; // Data payload stored in this node
    StackNode* next;     // Pointer to the node underneath in the stack

    // Constructor initializing node with an action record
    StackNode(const ActionRecord& act);
};

// Singly-linked LIFO Stack class
class Stack {
private:
    StackNode* topNode; // Pointer to the top element (nullptr when stack is empty)
    int size;           // Number of active action records currently on the stack

public:
    // Constructor: initializes an empty stack
    Stack();

    // Destructor: releases all dynamically allocated nodes to prevent memory leaks
    ~Stack();

    // Disable copy constructor and assignment to prevent shallow-copy pointer bugs
    Stack(const Stack& other) = delete;
    Stack& operator=(const Stack& other) = delete;

    // Check if the stack contains zero elements - O(1) time
    bool isEmpty() const;

    // Return the total number of actions on the stack - O(1) time
    int getSize() const;

    // PUSH: Add a new action record onto the top of the stack - O(1) time
    void push(const ActionRecord& action);

    // PUSH OVERLOAD: Allows pushing by specifying fields directly
    void push(const std::string& reqId,
              const std::string& tId,
              RequestStatus reqStat,
              TeamStatus tStat,
              const std::string& desc);

    // POP: Remove and retrieve the top action record - O(1) time
    bool pop(ActionRecord& outAction);

    // POP OVERLOAD: Discards the top element without returning it
    bool pop();

    // PEEK: Inspect the top action record without removing it - O(1) time
    bool peek(ActionRecord& outAction) const;

    // DISPLAY: Print all actions from newest (top) to oldest (bottom) - O(n) time
    void display() const;

    // CLEAR: Pop all nodes until the stack is completely empty - O(n) time
    void clear();
};

#endif // STACK_H
