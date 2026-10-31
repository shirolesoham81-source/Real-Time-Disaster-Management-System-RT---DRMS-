#include "datastructures/Stack.h"
#include <iostream>

// ============================================================================
// DATA STRUCTURE IMPLEMENTATION: LIFO STACK
// ============================================================================

// ActionRecord Default Constructor
ActionRecord::ActionRecord()
    : requestId(""), teamId(""),
      prevRequestStatus(RequestStatus::PENDING),
      prevTeamStatus(TeamStatus::AVAILABLE),
      actionDescription("") {}

// ActionRecord Parameterized Constructor
ActionRecord::ActionRecord(const std::string& reqId,
                           const std::string& tId,
                           RequestStatus reqStat,
                           TeamStatus tStat,
                           const std::string& desc)
    : requestId(reqId), teamId(tId),
      prevRequestStatus(reqStat),
      prevTeamStatus(tStat),
      actionDescription(desc) {}

// StackNode Constructor
StackNode::StackNode(const ActionRecord& act) : action(act), next(nullptr) {}

// Stack Constructor
Stack::Stack() : topNode(nullptr), size(0) {}

// Stack Destructor
Stack::~Stack() {
    clear();
}

// Check if stack is empty - O(1)
bool Stack::isEmpty() const {
    return topNode == nullptr;
}

// Get total count of records - O(1)
int Stack::getSize() const {
    return size;
}

// Push action record - O(1)
void Stack::push(const ActionRecord& action) {
    StackNode* newNode = new StackNode(action);
    newNode->next = topNode;
    topNode = newNode;
    size++;
}

// Push overload with fields - O(1)
void Stack::push(const std::string& reqId,
                 const std::string& tId,
                 RequestStatus reqStat,
                 TeamStatus tStat,
                 const std::string& desc) {
    push(ActionRecord(reqId, tId, reqStat, tStat, desc));
}

// Pop top record - O(1)
bool Stack::pop(ActionRecord& outAction) {
    if (isEmpty()) {
        return false;
    }

    StackNode* temp = topNode;
    outAction = temp->action;
    topNode = topNode->next;
    delete temp;
    size--;
    return true;
}

// Pop overload
bool Stack::pop() {
    ActionRecord dummy;
    return pop(dummy);
}

// Peek top record without popping - O(1)
bool Stack::peek(ActionRecord& outAction) const {
    if (isEmpty()) {
        return false;
    }
    outAction = topNode->action;
    return true;
}

// Display all stack records
void Stack::display() const {
    if (isEmpty()) {
        std::cout << "  (Action Stack is empty. No dispatch history.)\n";
        return;
    }

    std::cout << "  [Action Stack: Newest -> Oldest]\n";
    StackNode* current = topNode;
    int position = 1;
    while (current != nullptr) {
        std::cout << "  [" << position++ << "] Action: " << current->action.actionDescription
                  << " | Request: " << current->action.requestId
                  << " | Team: " << current->action.teamId
                  << " | Prev Req Status: " << requestStatusToString(current->action.prevRequestStatus)
                  << " | Prev Team Status: " << teamStatusToString(current->action.prevTeamStatus)
                  << "\n";
        current = current->next;
    }
}

// Clear all elements
void Stack::clear() {
    while (!isEmpty()) {
        pop();
    }
}
