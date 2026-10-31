#ifndef HASH_TABLE_H
#define HASH_TABLE_H

#include <iostream>
#include <string>
#include "models/ReliefRequest.h"

// ============================================================================
// DATA STRUCTURE: HASH TABLE (Separate Chaining)
// Purpose: Provides fast O(1) average-time lookup of ReliefRequests by ID.
// Collision Handling: Separate chaining using linked lists at each bucket.
// Important note: Stores non-owning pointers to master records in LinkedList.
// ============================================================================

// Node structure for collision chains inside each bucket
struct HashNode {
    std::string key;            // Request ID key (e.g., "DR-1001")
    ReliefRequest* requestPtr;  // Non-owning pointer to the master ReliefRequest record
    HashNode* next;             // Pointer to the next node in this bucket's chain

    // Constructor initializing node with key and master pointer
    HashNode(const std::string& k, ReliefRequest* ptr);
};

// Manually implemented Hash Table class using Separate Chaining
class HashTable {
private:
    HashNode** buckets; // Dynamically allocated array of bucket head pointers
    int bucketCount;    // Total number of buckets in the hash table
    int size;           // Total number of entries stored

    // Hash function: polynomial rolling hash with prime multiplier 31
    int hashFunction(const std::string& key) const;

public:
    // Constructor: dynamically allocates an array of bucket pointers (default: 7 buckets)
    HashTable(int numBuckets = 7);

    // Destructor: safely deallocates hash chain nodes and bucket pointer array
    ~HashTable();

    // Disable copy constructor and assignment to prevent double-deletion
    HashTable(const HashTable& other) = delete;
    HashTable& operator=(const HashTable& other) = delete;

    // Check if the hash table is empty - O(1) time
    bool isEmpty() const;

    // Return the total number of entries - O(1) time
    int getSize() const;

    // Return the total number of buckets - O(1) time
    int getBucketCount() const;

    // Helper to calculate bucket index for an ID (useful for testing collisions in viva)
    int getBucketIndex(const std::string& id) const;

    // Check if a request ID exists in the hash table - average O(1) time
    bool contains(const std::string& id) const;

    // INSERT: Add a request ID and its non-owning pointer into the hash table - average O(1) time
    bool insert(const std::string& id, ReliefRequest* reqPtr);

    // SEARCH: Retrieve pointer to master ReliefRequest by ID - average O(1) time
    ReliefRequest* search(const std::string& id);

    // SEARCH: Const overload of search
    const ReliefRequest* search(const std::string& id) const;

    // REMOVE: Delete an ID node from the hash table - average O(1) time
    bool remove(const std::string& id);

    // DISPLAY: Show bucket contents and collision chains for viva demonstration
    void display() const;

    // CLEAR: Delete all hash nodes across all buckets
    void clear();
};

#endif // HASH_TABLE_H
