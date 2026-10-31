#ifndef QUEUE_H
#define QUEUE_H

#include <iostream>
#include <string>

// ============================================================================
// DATA STRUCTURE: FIFO QUEUE
// Purpose: Manages routine (NORMAL and LOW severity) relief requests.
// Principle: First-In, First-Out (FIFO) - earliest submitted request is served first.
// ============================================================================

// Node structure for the singly-linked queue
struct QueueNode {
    std::string requestId; // Reference key linking to a ReliefRequest
    QueueNode* next;       // Pointer to the next node behind in line

    // Constructor initializing node with a request ID
    QueueNode(const std::string& id);
};

// Singly-linked FIFO Queue class
class Queue {
private:
    QueueNode* frontNode; // Pointer to the front of the queue (where items leave)
    QueueNode* rearNode;  // Pointer to the rear of the queue (where items enter)
    int size;             // Total number of items currently waiting in the queue

public:
    // Constructor: initializes an empty queue
    Queue();

    // Destructor: safely deallocates all nodes to prevent memory leaks
    ~Queue();

    // Deep Copy Constructor: prevents unsafe pointer sharing
    Queue(const Queue& other);

    // Copy Assignment Operator: performs safe deep copy
    Queue& operator=(const Queue& other);

    // Check if the queue contains zero elements - O(1) time
    bool isEmpty() const;

    // Return the total number of items waiting in the queue - O(1) time
    int getSize() const;

    // Check if a request ID is already in the queue to prevent duplicates - O(n) time
    bool contains(const std::string& id) const;

    // ENQUEUE: Insert a new request ID at the rear of the queue - O(1) time
    bool enqueue(const std::string& id);

    // DEQUEUE: Remove the front request ID from the queue - O(1) time
    bool dequeue(std::string& outId);

    // DEQUEUE OVERLOAD: Discards the front item without returning it
    bool dequeue();

    // PEEK: Inspect the front request ID without removing it - O(1) time
    bool peek(std::string& outId) const;

    // PEEK OVERLOAD: Returns the front request ID directly, or empty string if empty
    std::string peek() const;

    // DISPLAY: Print all waiting items from Front to Rear - O(n) time
    void display() const;

    // CLEAR: Dequeue all nodes until the queue is empty - O(n) time
    void clear();

    // Getters for testing pointer validity
    std::string getFrontId() const;
    std::string getRearId() const;
};

#endif // QUEUE_H
