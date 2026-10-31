#include "datastructures/HashTable.h"
#include <iostream>

// ============================================================================
// DATA STRUCTURE IMPLEMENTATION: HASH TABLE (Separate Chaining)
// ============================================================================

// HashNode Constructor
HashNode::HashNode(const std::string& k, ReliefRequest* ptr)
    : key(k), requestPtr(ptr), next(nullptr) {}

// Polynomial rolling hash with prime multiplier 31
int HashTable::hashFunction(const std::string& key) const {
    unsigned long hashVal = 0;
    for (size_t i = 0; i < key.length(); i++) {
        unsigned char ch = static_cast<unsigned char>(key[i]);
        hashVal = (hashVal * 31 + ch) % bucketCount;
    }
    return static_cast<int>(hashVal);
}

// HashTable Constructor
HashTable::HashTable(int numBuckets)
    : bucketCount(numBuckets < 3 ? 7 : numBuckets), size(0) {
    buckets = new HashNode*[bucketCount];
    for (int i = 0; i < bucketCount; i++) {
        buckets[i] = nullptr;
    }
}

// HashTable Destructor
HashTable::~HashTable() {
    clear();
    delete[] buckets;
    buckets = nullptr;
}

// Check if empty - O(1)
bool HashTable::isEmpty() const {
    return size == 0;
}

// Return size - O(1)
int HashTable::getSize() const {
    return size;
}

// Return bucket count - O(1)
int HashTable::getBucketCount() const {
    return bucketCount;
}

// Return calculated bucket index
int HashTable::getBucketIndex(const std::string& id) const {
    return hashFunction(id);
}

// Check if key exists - average O(1)
bool HashTable::contains(const std::string& id) const {
    return search(id) != nullptr;
}

// Insert non-owning pointer - average O(1)
bool HashTable::insert(const std::string& id, ReliefRequest* reqPtr) {
    if (reqPtr == nullptr) {
        std::cout << "[HASH ERROR] Null request pointer rejected for ID: " << id << "\n";
        return false;
    }

    int bucketIdx = hashFunction(id);

    HashNode* current = buckets[bucketIdx];
    while (current != nullptr) {
        if (current->key == id) {
            std::cout << "[HASH ERROR] Duplicate Request ID '" << id << "' rejected.\n";
            return false;
        }
        current = current->next;
    }

    HashNode* newNode = new HashNode(id, reqPtr);
    newNode->next = buckets[bucketIdx];
    buckets[bucketIdx] = newNode;
    size++;
    return true;
}

// Search by ID (non-const) - average O(1)
ReliefRequest* HashTable::search(const std::string& id) {
    int bucketIdx = hashFunction(id);
    HashNode* current = buckets[bucketIdx];
    while (current != nullptr) {
        if (current->key == id) {
            return current->requestPtr;
        }
        current = current->next;
    }
    return nullptr;
}

// Search by ID (const) - average O(1)
const ReliefRequest* HashTable::search(const std::string& id) const {
    int bucketIdx = hashFunction(id);
    HashNode* current = buckets[bucketIdx];
    while (current != nullptr) {
        if (current->key == id) {
            return current->requestPtr;
        }
        current = current->next;
    }
    return nullptr;
}

// Remove entry by ID - average O(1)
bool HashTable::remove(const std::string& id) {
    int bucketIdx = hashFunction(id);
    HashNode* current = buckets[bucketIdx];

    if (current == nullptr) {
        return false;
    }

    if (current->key == id) {
        buckets[bucketIdx] = current->next;
        delete current;
        size--;
        return true;
    }

    while (current->next != nullptr && current->next->key != id) {
        current = current->next;
    }

    if (current->next == nullptr) {
        return false;
    }

    HashNode* target = current->next;
    current->next = target->next;
    delete target;
    size--;
    return true;
}

// Display table buckets and collision chains
void HashTable::display() const {
    std::cout << "  [Hash Table: " << size << " entries across " << bucketCount << " buckets]\n";
    for (int i = 0; i < bucketCount; i++) {
        std::cout << "  Bucket [" << i << "]: ";
        HashNode* current = buckets[i];
        if (current == nullptr) {
            std::cout << "(empty)\n";
        } else {
            while (current != nullptr) {
                std::cout << "[" << current->key;
                if (current->requestPtr != nullptr) {
                    std::cout << " -> " << current->requestPtr->citizenName;
                }
                std::cout << "]";
                if (current->next != nullptr) {
                    std::cout << " => ";
                }
                current = current->next;
            }
            std::cout << "\n";
        }
    }
}

// Clear all nodes
void HashTable::clear() {
    for (int i = 0; i < bucketCount; i++) {
        HashNode* current = buckets[i];
        while (current != nullptr) {
            HashNode* nextNode = current->next;
            delete current;
            current = nextNode;
        }
        buckets[i] = nullptr;
    }
    size = 0;
}
