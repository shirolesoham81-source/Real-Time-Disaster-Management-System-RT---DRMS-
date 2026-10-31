#ifndef ALGORITHMS_H
#define ALGORITHMS_H

#include <iostream>
#include <string>
#include "models/ReliefRequest.h"
#include "models/Enums.h"

// ============================================================================
// SEARCHING & SORTING ALGORITHMS
// Purpose: Provides fundamental array searching and sorting for ReliefRequests.
// Algorithms:
//   1. Linear Search: Unordered search scanning sequentially - O(n)
//   2. Binary Search: Divide-and-conquer on sorted array - O(log n)
//   3. Bubble Sort  : Repeatedly swaps adjacent elements out of order - O(n^2)
//   4. Selection Sort: Repeatedly selects maximum/minimum element - O(n^2)
//   5. Insertion Sort: Inserts into sorted preceding subarray - O(n^2)
// ============================================================================

// A. LINEAR SEARCH BY REQUEST ID - O(n) time, O(1) space
int linearSearchById(const ReliefRequest arr[], int size, const std::string& targetId);

// B. BINARY SEARCH BY REQUEST ID - O(log n) time, O(1) space
int binarySearchById(const ReliefRequest arr[], int size, const std::string& targetId);

// C. BUBBLE SORT BY REQUEST ID (Ascending Order) - O(n^2) time, O(1) space
void bubbleSortById(ReliefRequest arr[], int size);

// D. SELECTION SORT BY PEOPLE AFFECTED (Descending Order: Highest First) - O(n^2) time, O(1) space
void selectionSortByPeople(ReliefRequest arr[], int size);

// E. INSERTION SORT BY SEVERITY (Descending Order: CRITICAL > HIGH > NORMAL > LOW) - O(n^2) time, O(1) space
void insertionSortBySeverity(ReliefRequest arr[], int size);

// F. BUBBLE SORT BY TIMESTAMP (Descending Order: Newest First) - O(n^2) time, O(1) space
void bubbleSortByTimestamp(ReliefRequest arr[], int size);

// G. HELPER: DISPLAY REQUEST ARRAY
void displayRequestArray(const ReliefRequest arr[], int size, const std::string& label = "");

#endif // ALGORITHMS_H
