#include "utils/Algorithms.h"
#include <iostream>

// ============================================================================
// SEARCHING & SORTING ALGORITHMS IMPLEMENTATION
// ============================================================================

// A. LINEAR SEARCH BY REQUEST ID - O(n) time, O(1) space
int linearSearchById(const ReliefRequest arr[], int size, const std::string& targetId) {
    if (size <= 0) {
        return -1;
    }

    for (int i = 0; i < size; i++) {
        if (arr[i].id == targetId) {
            return i;
        }
    }

    return -1;
}

// B. BINARY SEARCH BY REQUEST ID - O(log n) time, O(1) space
int binarySearchById(const ReliefRequest arr[], int size, const std::string& targetId) {
    if (size <= 0) {
        return -1;
    }

    int low = 0;
    int high = size - 1;

    while (low <= high) {
        int mid = low + (high - low) / 2;

        if (arr[mid].id == targetId) {
            return mid;
        } else if (arr[mid].id < targetId) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    return -1;
}

// C. BUBBLE SORT BY REQUEST ID (Ascending Order) - O(n^2) time, O(1) space
void bubbleSortById(ReliefRequest arr[], int size) {
    if (size <= 1) {
        return;
    }

    for (int i = 0; i < size - 1; i++) {
        for (int j = 0; j < size - i - 1; j++) {
            if (arr[j].id > arr[j + 1].id) {
                ReliefRequest temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

// D. SELECTION SORT BY PEOPLE AFFECTED (Descending Order: Highest First) - O(n^2) time, O(1) space
void selectionSortByPeople(ReliefRequest arr[], int size) {
    if (size <= 1) {
        return;
    }

    for (int i = 0; i < size - 1; i++) {
        int maxIndex = i;

        for (int j = i + 1; j < size; j++) {
            if (arr[j].peopleCount > arr[maxIndex].peopleCount) {
                maxIndex = j;
            }
        }

        if (maxIndex != i) {
            ReliefRequest temp = arr[i];
            arr[i] = arr[maxIndex];
            arr[maxIndex] = temp;
        }
    }
}

// E. INSERTION SORT BY SEVERITY (Descending Order: CRITICAL > HIGH > NORMAL > LOW) - O(n^2) time, O(1) space
void insertionSortBySeverity(ReliefRequest arr[], int size) {
    if (size <= 1) {
        return;
    }

    for (int i = 1; i < size; i++) {
        ReliefRequest key = arr[i];
        int j = i - 1;

        while (j >= 0 && static_cast<int>(arr[j].severity) < static_cast<int>(key.severity)) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}

// F. BUBBLE SORT BY TIMESTAMP (Descending Order: Newest First) - O(n^2) time, O(1) space
void bubbleSortByTimestamp(ReliefRequest arr[], int size) {
    if (size <= 1) {
        return;
    }

    for (int i = 0; i < size - 1; i++) {
        for (int j = 0; j < size - i - 1; j++) {
            if (arr[j].timestamp < arr[j + 1].timestamp) {
                ReliefRequest temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

// G. HELPER: DISPLAY REQUEST ARRAY
void displayRequestArray(const ReliefRequest arr[], int size, const std::string& label) {
    if (!label.empty()) {
        std::cout << "  " << label << " (Total: " << size << " requests):\n";
    }
    if (size <= 0) {
        std::cout << "    (Array is empty)\n";
        return;
    }
    for (int i = 0; i < size; i++) {
        std::cout << "    [" << i << "] ID: " << arr[i].id
                  << " | Citizen: " << arr[i].citizenName
                  << " | People Affected: " << arr[i].peopleCount
                  << " | Severity: " << severityToString(arr[i].severity)
                  << " | Location: " << arr[i].location << "\n";
    }
}
