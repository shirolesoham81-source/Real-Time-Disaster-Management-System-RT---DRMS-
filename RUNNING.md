# RT-DRMS: Windows Setup, Compilation, and Execution Guide

This document contains step-by-step instructions for compiling and running the **Real-Time Disaster Relief Request Management System (RT-DRMS)** on Windows.

---

## 1. Prerequisites & Environment Setup

Ensure the following tools are installed and accessible in your Windows Command Prompt (`cmd.exe`) or PowerShell:

1. **C++ Compiler (MinGW GCC):**
   - MinGW GCC 6.3 or higher supporting `-std=c++11`.
   - Verify installation:
     ```cmd
     g++ --version
     ```
   - If not recognized, add the MinGW `bin` folder (e.g., `C:\MinGW\bin`) to your Windows `PATH` environment variable.

2. **Node.js Runtime:**
   - Node.js v14.x or higher (used for the lightweight HTTP bridge and static file server; zero external npm packages required).
   - Verify installation:
     ```cmd
     node -v
     ```

3. **Web Browser:**
   - Any modern browser (Google Chrome, Microsoft Edge, Mozilla Firefox) with JavaScript enabled.

---

## 2. Quick Start Guide (3 Simple Steps)

From the project root folder (`FDS CP/`):

### Configure Management Login
Set credentials in the terminal before starting the server. Use private values; do not commit them:
```cmd
set "MGMT_USERNAME=your-management-user"
set "MGMT_PASSWORD=replace-with-a-private-password"
```
The server exits with an error if either variable is missing. Team Leader accounts must also be provisioned locally in the ignored `backend/data/team_users.txt` file.

### Step 1: Compile the C++ Backend Executable
```cmd
backend\build.bat
```
*Expected Output:*
```
========================================================
  Compiling RT-DRMS Backend [MinGW GCC]
Running: g++ -std=c++11 -Wall -Iinclude src\main.cpp src\datastructures\LinkedList.cpp src\datastructures\Stack.cpp src\datastructures\Queue.cpp src\datastructures\PriorityQueue.cpp src\datastructures\Graph.cpp src\datastructures\HashTable.cpp src\utils\Algorithms.cpp -o ..\backend.exe
========================================================
  BUILD SUCCESSFUL!
  Generated executable: backend.exe in project root
========================================================
```

### Step 2: (Optional) Run C++ Standalone Verification Suites
To independently verify all data structures, algorithms, services, and file persistence routines:
```cmd
backend.exe
```
*Expected Result:* 100% of all unit test suites (Part A through Part G) pass with `PASS` indicators.

### Step 3: Launch the Full-Stack Application
Start the Node.js bridge server:
```cmd
node server.js
```
*Expected Output:*
```
======================================================================
  RT-DRMS Full-Stack Server running at http://localhost:3000/
  Static Frontend : ./frontend
  C++ Bridge IPC  : backend.exe --server via stdin/stdout
======================================================================
[C++ Backend] Loading persistent stores from backend/data/...
[C++ Backend] Loaded: 5 requests, 2 teams, 2 resources, 3 centers.
[C++ Backend Server] Ready and listening on stdin for JSON commands...
```

Open your browser and navigate to:
```
http://localhost:3000/
```
The status indicator in the top navbar will display: **🟢 C++ Backend: Online**.

## 3. Operational Guide for All Three Roles

### Role 1: Citizen (People View)
1. Navigate to `http://localhost:3000/`.
2. Click **Submit Relief Request**:
   - Provide Citizen Name, 10-digit Phone Number, and Primary Disaster Location.
   - Use the **Interactive Location Picker Map**: Click anywhere on the map or drag the pin to automatically set Latitude and Longitude fields. Alternatively, click **Use My Current Location** to obtain device GPS coordinates.
   - Enter detailed requirements: People affected, Families, Children, Elderly, Injured, Food Packets, Drinking Water (L), Medical Kits, and Blankets.
   - Provide landmarks and access directions.
3. Submit the request to receive a unique tracking identifier (e.g. `DR-1041`).
4. Click **Track My Request**: Enter the tracking ID and contact phone number to inspect live status (`PENDING`, `TRIAGED`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`), and click **View on Live Map**.
5. Click **Citizen Relief Map** (via sidebar or quick action):
   - Enter your registered 10-digit phone number and click **My Requests**.
   - Inspect plotted incident markers, current status, and assigned rescue squad GPS positions with freshness indicator.
   - Review nearby staging relief centres (noting "Graph Node" topological status for centres without physical GPS coordinates).

### Role 2: Central Management (Operations Dashboard)
1. Switch to the **Management** portal via the top navbar role switcher or landing screen.
2. Review incoming distress tickets in **Triage Queue**:
   - View demographic breakdowns, critical medical injuries, and requested relief supplies.
   - Inspect requested food and drinking water alongside available central warehouse inventory.
   - Note that inventory is not automatically deducted upon assignment.
3. Click **Triage** to insert the distress ticket into the C++ Binary Max-Heap Priority Queue.
4. Select an available squad from the dispatch dropdown and click **Assign Squad**.
5. Inspect the **Live Operations Map**:
   - Live field squads (green pulsating pin) and simulated squads (yellow `[SIM]` pin).
   - Critical and high-priority incidents (pulsing red beacons).
   - Straight-line reference vectors connecting deployed squads to their assigned incidents.
   - Toggle filters by squad sharing status, stale signals, simulated data, active requests, or critical incidents without losing map pan or zoom.
6. Use the **Action History / Rollback** feature to undo erroneous dispatches via the C++ LIFO Stack.

### Role 3: Rescue Team Leader (Field Portal)
1. Switch to the **Team Leader** portal.
2. Select a registered squad (e.g. **Alpha Medical Squad (T-01)** or **Bravo Logistics Unit (T-02)**).
3. **Assigned Missions Tab:**
   - Inspect newly assigned missions awaiting deployment.
   - Click **View Directives** to inspect citizen contact details, demographic counts, landmark routes, requested supplies, and warehouse reserve comparisons.
   - Click **Mission Map** to open the tactical map centered on that incident target.
   - Click **Start Mission** to transition the lifecycle to `IN_PROGRESS` (marking the squad `BUSY` in C++).
4. **Squad Mission Map Tab:**
   - View your squad's live GPS position and assigned mission target beacons.
   - Click on mission markers to inspect directives and access inline lifecycle buttons (Start / Complete).
   - Click **Start Sharing** / **Stop Sharing** directly in the map header to control field telemetry broadcasting.
   - Click **Center Squad** or **Fit All** to adjust the viewport to your unit and missions.
5. **My Location Tab:**
   - Click **Start Location Sharing** to stream live hardware GPS coordinates via the browser W3C Geolocation API.
   - If physical GPS is unavailable or blocked by browser permissions, check **Enable Simulated Test Mode** and click a preset location (e.g., *Central Station* or *West Sector Base*) to broadcast test telemetry.
   - View live telemetry age, accuracy radius, and freshness window (<60s `LIVE`, >60s `STALE`).
   - Click **Stop Sharing** to pause transmission while retaining historical coordinate records in C++.
6. **In Progress Operations Tab:**
   - Monitor active field operations.
   - Once citizen rescue and relief distribution are complete, click **Mark Completed**.
   - The mission is archived as read-only, and the squad automatically returns to `AVAILABLE`.

---

## 4. Running the Automated Regression & Integration Tests

### A. Cybersecurity & Access Control Verification
Run these checks only against a disposable local copy; they create requests and update team telemetry. In the second terminal, set test-only environment values for the same management account used by the server, the local team accounts, and test input. Do not use production credentials or operational data:
```cmd
set "MGMT_USERNAME=<configured-management-user>"
set "MGMT_PASSWORD=<management-password>"
set "TEST_TEAM_BRAVO_PASSWORD=<local-team-password>"
set "TEST_TEAM_ALPHA_PASSWORD=<local-team-password>"
set "TEST_PHONE=<test-phone>"
set "WRONG_TEST_PHONE=<different-test-phone>"
set "TEST_CITIZEN_NAME=<test-name>"
set "TEST_CITIZEN_LOCATION=<test-location>"
```
With `node server.js` running in another terminal, execute:
```cmd
node scratch/verify_security.js
```
*Expected Result:* 100% of security checks pass, verifying unauthorized route blocking, management login, squad token isolation, and public citizen dual-key access.

### B. Comprehensive End-to-End Regression & Integration Suite
```cmd
node scratch/test_integration.js
```

The integration suite uses the same environment variables listed above.

This executes the comprehensive 173-assertion test suite covering:
- Health check and dashboard statistics.
- Form validation (empty names, invalid phone lengths, non-numeric phones, empty locations).
- JSON escaping for special characters (quotes, backslashes, commas).
- Privacy verification for phone-authenticated tracking.
- Request triage into the Priority Queue (Binary Max-Heap).
- Duplicate triage rejection.
- Team and resource listings.
- Team assignment and busy-team rejection.
- Duplicate team assignment prevention.
- Action history rollback (LIFO Stack undo).
- Resource inventory allocation, over-allocation rejection, and non-positive quantity rejection.
- Dijkstra shortest route path calculation (Central -> West).
- Disconnected location handling (Island Camp).
- Request cancellation and duplicate cancellation rejection.
- Prevention of assigning or dispatching cancelled requests.
- Detailed relief requirements (population breakdown, water, food, medical kits, coordinates, landmarks).
- Team Leader mission isolation (squads only view their assigned missions).
- Team ownership security guards (C++ backend rejects updates by unauthorized squads).
- Mission state transitions (`ASSIGNED` $\to$ `IN_PROGRESS` $\to$ `COMPLETED`).
- Lifecycle immutability (completed missions cannot be reopened or edited).
- Telemetry synchronization across assignments, starts, completions, cancellations, and rollbacks.
- Live GPS tracking, configurable freshness threshold, and simulation isolation.
- Geodesic distance calculation and missing coordinate suppression.
- Inventory non-deduction on request filing/assignment.
- C++11 Searching and Sorting: Linear search, Binary search on sorted arrays, Bubble sort by ID, Selection sort by people affected, and Insertion sort by priority severity.

*Expected Result:*
```
======================================================================
   INTEGRATION TEST SUMMARY: Passed: 173 | Failed: 0
======================================================================
```

---

## 5. Known Limitations & Demonstration Constraints

1. **Authentication Architecture:** Individual Team Leader accounts authenticate with their own credentials using salted SHA-256 password hashing stored locally in the ignored `backend/data/team_users.txt`, with active session token isolation. Management credentials are provided through the `MGMT_USERNAME` and `MGMT_PASSWORD` environment variables. Public Citizen portal remains completely open and barrier-free without requiring an account.
2. **Browser Geolocation API (HTTPS / Localhost Requirement):** The W3C Geolocation API is strictly restricted by modern browsers to secure origins (`https://` or `http://localhost`). When testing across a LAN via `http://<IP_ADDRESS>:3000`, browsers will block hardware GPS; testers should use the built-in **Simulated Mode** with Pune presets (Shivajinagar, Swargate, Hadapsar, Pimpri).
3. **Straight-Line Geodesic Distances:** The Live Operations Map displays direct straight-line distance references calculated via the Haversine formula, clearly labelled with an operational disclaimer that floodwaters and road routing are not accounted for. External turn-by-turn links to OpenStreetMap / OSRM are provided.
4. **Pune Map & Demonstration Data Boundaries:** Default map centers at Pune (`18.5204, 73.8567`). Demonstration disaster scenarios are explicitly flagged as simulated testing data, and legacy topological staging hubs are maintained as graph nodes without fabricating unverified GPS coordinates.

---

## 6. Troubleshooting & Windows Gotchas

### Issue 1: `g++` is not recognized as an internal or external command
- **Cause:** MinGW `bin` directory is missing from Windows system `PATH`.
- **Solution:** Add your compiler path (e.g. `C:\MinGW\bin` or `C:\msys64\mingw64\bin`) to Windows Environment Variables, restart your terminal, and re-run `g++ --version`.

### Issue 2: Permission denied when compiling `backend.exe`
- **Cause:** `backend.exe` is currently running as a background child process of `node server.js`. Windows locks running executable files from being overwritten.
- **Solution:** Stop `node server.js` (press `Ctrl + C` in its terminal), then re-run `backend\build.bat`.

### Issue 3: Port 3000 is already in use (`EADDRINUSE`)
- **Cause:** A previous instance of `node server.js` is still running in the background.
- **Solution:** In Command Prompt or PowerShell, terminate running Node processes:
  ```cmd
  taskkill /F /IM node.exe
  ```
  Then restart `node server.js`.

### Issue 4: Browser displays "C++ Backend: Offline"
- **Cause:** `backend.exe` was not compiled or exited unexpectedly.
- **Solution:** Re-run `backend\build.bat` to ensure `backend.exe` exists in the project root, then restart `node server.js`.

---

## 7. Submission Checklist

- [x] C++ Source Code (`backend/include/`, `backend/src/main.cpp`, `backend/src/datastructures/`, `backend/src/utils/`)
- [x] Build Script (`backend/build.bat`)
- [x] Flat-File Persistent Stores (`backend/data/*.txt`)
- [x] Vanilla Web Frontend (`frontend/index.html`, `frontend/css/`, `frontend/js/`)
- [x] Lightweight IPC Bridge Server (`server.js`)
- [x] Security Test Suite (`scratch/verify_security.js` - 100% passing)
- [x] Automated Integration Test Suite (`scratch/test_integration.js` - 173 passing tests)
- [x] Complete Project Documentation (`README.md`)
- [x] Setup & Execution Guide (`RUNNING.md`)
