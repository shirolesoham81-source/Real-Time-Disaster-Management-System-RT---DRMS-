const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION & STATIC FILE DEFINITIONS
// ============================================================================
const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'frontend');

// ============================================================================
// BASIC CYBERSECURITY & ACCESS CONTROL (VIVA-FRIENDLY SERVER-SIDE SESSIONS)
// ============================================================================
const MGMT_USERNAME = process.env.MGMT_USERNAME;
const MGMT_PASSWORD = process.env.MGMT_PASSWORD;

if (!MGMT_USERNAME || !MGMT_PASSWORD) {
    console.error('Set MGMT_USERNAME and MGMT_PASSWORD before starting the server.');
    process.exit(1);
}

// In-memory server-side session registry: token -> { role, teamId, createdAt }
const activeSessions = new Map();

// ============================================================================
// TEAM LEADER AUTHENTICATION & CREDENTIAL MANAGEMENT
// ============================================================================
const TEAM_USERS_FILE = path.join(__dirname, 'backend', 'data', 'team_users.txt');

function loadTeamUsers() {
    const users = [];
    if (!fs.existsSync(TEAM_USERS_FILE)) return users;
    const content = fs.readFileSync(TEAM_USERS_FILE, 'utf8');
    const lines = content.split('\n');
    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;
        const parts = line.split('|');
        if (parts.length >= 5) {
            users.push({
                teamId: parts[0].trim(),
                username: parts[1].trim(),
                salt: parts[2].trim(),
                passwordHash: parts[3].trim(),
                teamName: parts[4].trim()
            });
        }
    }
    return users;
}

function verifyPassword(password, salt, storedHash) {
    try {
        const computed = crypto.scryptSync(password, salt, 64).toString('hex');
        if (computed.length !== storedHash.length) return false;
        return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(storedHash, 'hex'));
    } catch (e) {
        return false;
    }
}

function getSessionFromReq(req) {
    const authHeader = req.headers['authorization'] || req.headers['x-auth-token'] || '';
    let token = '';
    if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
    } else {
        token = authHeader.trim();
    }
    if (!token) return null;
    return activeSessions.get(token) || null;
}


const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

// ============================================================================
// C++ BACKEND PROCESS MANAGEMENT (PERSISTENT STANDARD I/O BRIDGE)
// ============================================================================
let cppProcess = null;
let pendingQueue = [];
let stdoutBuffer = '';
let isBackendOnline = false;

function initCppBackend() {
    const exePath = path.join(__dirname, 'backend.exe');
    if (!fs.existsSync(exePath)) {
        console.error(`[Bridge Error] backend.exe not found at ${exePath}. Run 'backend\\build.bat' to build it.`);
        isBackendOnline = false;
        return;
    }

    console.log(`[Bridge] Spawning persistent C++ backend: ${exePath} --server`);

    // Spawn persistent child process in server mode
    // stdin: piped to Node
    // stdout: piped to Node (line-based JSON protocol)
    // stderr: inherited to terminal for C++ diagnostic logging
    const childEnv = Object.assign({}, process.env);
    const mingwPath = fs.existsSync('D:\\MinGW\\bin') ? 'D:\\MinGW\\bin;' : (fs.existsSync('C:\\MinGW\\bin') ? 'C:\\MinGW\\bin;' : '');
    if (mingwPath && (!childEnv.PATH || !childEnv.PATH.includes(mingwPath.slice(0, -1)))) {
        childEnv.PATH = mingwPath + (childEnv.PATH || '');
    }

    cppProcess = spawn(exePath, ['--server'], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'inherit'],
        env: childEnv
    });

    isBackendOnline = true;
    stdoutBuffer = '';

    cppProcess.stdout.on('data', (chunk) => {
        stdoutBuffer += chunk.toString('utf8');
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop(); // Retain incomplete line fragment in buffer

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            if (pendingQueue.length > 0) {
                const reqItem = pendingQueue.shift();
                try {
                    const parsed = JSON.parse(line);
                    reqItem.resolve(parsed);
                } catch (err) {
                    console.error('[Bridge] Failed to parse JSON response from C++:', line);
                    reqItem.reject(new Error('Malformed JSON received from C++ backend: ' + line));
                }
            } else {
                console.log('[Bridge] Spurious stdout line from C++:', line);
            }
        }
    });

    cppProcess.on('error', (err) => {
        console.error('[Bridge] C++ Process Error:', err.message);
        isBackendOnline = false;
        flushPendingWithError(new Error('C++ backend process error: ' + err.message));
    });

    cppProcess.on('exit', (code, signal) => {
        console.warn(`[Bridge] backend.exe exited with code ${code}, signal ${signal}`);
        isBackendOnline = false;
        flushPendingWithError(new Error('C++ backend process terminated unexpectedly'));
        cppProcess = null;
    });
}

function flushPendingWithError(err) {
    while (pendingQueue.length > 0) {
        const item = pendingQueue.shift();
        item.reject(err);
    }
}

// Sends a single JSON command to C++ stdin and waits for single-line JSON response on stdout
function sendCppCommand(cmdObj) {
    return new Promise((resolve, reject) => {
        if (!cppProcess || !isBackendOnline || cppProcess.killed) {
            return reject(new Error('C++ backend is currently offline.'));
        }

        const timeout = setTimeout(() => {
            const idx = pendingQueue.findIndex(p => p.resolve === resolve);
            if (idx !== -1) {
                pendingQueue.splice(idx, 1);
            }
            reject(new Error('Timeout (5000ms) waiting for C++ backend response.'));
        }, 5000);

        pendingQueue.push({
            resolve: (val) => {
                clearTimeout(timeout);
                resolve(val);
            },
            reject: (err) => {
                clearTimeout(timeout);
                reject(err);
            }
        });

        try {
            cppProcess.stdin.write(JSON.stringify(cmdObj) + '\n');
        } catch (err) {
            clearTimeout(timeout);
            reject(err);
        }
    });
}

// ============================================================================
// HTTP REQUEST HELPERS
// ============================================================================
function sendJson(res, statusCode, data) {
    const jsonStr = JSON.stringify(data);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=UTF-8',
        'Cache-Control': 'no-store'
    });
    res.end(jsonStr);
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString('utf8');
            if (body.length > 1e6) { // 1MB limit
                req.connection.destroy();
                reject(new Error('Request body payload too large'));
            }
        });
        req.on('end', () => {
            if (!body.trim()) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(new Error('Invalid JSON format in request body'));
            }
        });
        req.on('error', err => reject(err));
    });
}

// ============================================================================
// API ROUTE HANDLER
// ============================================================================
async function handleApiRequest(req, res, parsedUrl) {
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();
    const query = parsedUrl.query || {};

    // Check for unsupported HTTP methods
    if (!['GET', 'POST'].includes(method)) {
        return sendJson(res, 405, {
            success: false,
            message: `HTTP Method ${method} is not allowed on ${pathname}. Supported methods: GET, POST.`
        });
    }

    try {
        // 0A. POST /api/auth/login (Management Authentication)
        if (pathname === '/api/auth/login' && method === 'POST') {
            const body = await readJsonBody(req);
            const user = (body.username || '').trim();
            const pass = (body.password || '').trim();

            if (user === MGMT_USERNAME && pass === MGMT_PASSWORD) {
                const token = crypto.randomBytes(16).toString('hex');
                activeSessions.set(token, {
                    role: 'management',
                    createdAt: Date.now()
                });
                return sendJson(res, 200, {
                    success: true,
                    token: token,
                    role: 'management',
                    message: 'Authentication successful.'
                });
            } else {
                return sendJson(res, 401, {
                    success: false,
                    message: 'Invalid management username or password.'
                });
            }
        }

        // 0B. POST /api/auth/team-session or POST /api/auth/team-login (Team Leader Authentication)
        if ((pathname === '/api/auth/team-session' || pathname === '/api/auth/team-login') && method === 'POST') {
            const body = await readJsonBody(req);
            const username = (body.username || '').trim();
            const password = (body.password || '').trim();
            const teamIdParam = (body.teamId || '').trim();

            // Explicit rejection: submitting only teamId without credentials fails
            if (!username && !password) {
                return sendJson(res, 401, {
                    success: false,
                    message: 'Authentication required: Knowing a public team ID does not grant team leader access. Valid username and password required.'
                });
            }

            if (!username || !password) {
                return sendJson(res, 400, {
                    success: false,
                    message: 'Validation Error: Both username and password are required for team leader login.'
                });
            }

            const teamUsers = loadTeamUsers();
            const matchedUser = teamUsers.find(u =>
                u.username.toLowerCase() === username.toLowerCase() ||
                (teamIdParam && u.teamId.toUpperCase() === teamIdParam.toUpperCase() && u.username.toLowerCase() === username.toLowerCase())
            );

            if (!matchedUser || !verifyPassword(password, matchedUser.salt, matchedUser.passwordHash)) {
                return sendJson(res, 401, {
                    success: false,
                    message: 'Invalid team leader username or password.'
                });
            }

            // If teamId was explicitly supplied, verify it matches the user's assigned team
            if (teamIdParam && matchedUser.teamId.toUpperCase() !== teamIdParam.toUpperCase()) {
                return sendJson(res, 403, {
                    success: false,
                    message: `Forbidden: Team Leader account (${username}) is assigned to ${matchedUser.teamId}, not ${teamIdParam}.`
                });
            }

            const token = crypto.randomBytes(16).toString('hex');
            activeSessions.set(token, {
                role: 'team-leader',
                teamId: matchedUser.teamId,
                teamName: matchedUser.teamName,
                username: matchedUser.username,
                createdAt: Date.now()
            });

            return sendJson(res, 200, {
                success: true,
                squadToken: token,
                token: token,
                teamId: matchedUser.teamId,
                teamName: matchedUser.teamName,
                username: matchedUser.username,
                message: `Authentication successful. Squad session established for ${matchedUser.teamName} (${matchedUser.teamId}).`
            });
        }

        // 0C. POST /api/auth/logout
        if (pathname === '/api/auth/logout' && method === 'POST') {
            const authHeader = req.headers['authorization'] || req.headers['x-auth-token'] || '';
            const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
            if (token && activeSessions.has(token)) {
                activeSessions.delete(token);
            }
            return sendJson(res, 200, {
                success: true,
                message: 'Logged out successfully.'
            });
        }

        // 0D. GET /api/auth/verify
        if (pathname === '/api/auth/verify' && method === 'GET') {
            const session = getSessionFromReq(req);
            if (session) {
                return sendJson(res, 200, {
                    success: true,
                    authenticated: true,
                    role: session.role,
                    teamId: session.teamId || null
                });
            } else {
                return sendJson(res, 401, {
                    success: false,
                    authenticated: false,
                    message: 'Invalid or expired session.'
                });
            }
        }

        // 1. GET /api/health
        if (pathname === '/api/health' && method === 'GET') {
            if (!isBackendOnline) {
                return sendJson(res, 503, {
                    success: false,
                    status: 'offline',
                    message: 'C++ backend executable is not running.'
                });
            }
            const cRes = await sendCppCommand({ cmd: 'health' });
            return sendJson(res, 200, cRes);
        }

        // 2. GET /api/stats
        if (pathname === '/api/stats' && method === 'GET') {
            const cRes = await sendCppCommand({ cmd: 'get_stats' });
            return sendJson(res, 200, cRes);
        }

        // 3. GET /api/citizen/requests (or GET /api/requests?phone=10_DIGITS)
        if ((pathname === '/api/citizen/requests' || (pathname === '/api/requests' && query.phone)) && method === 'GET') {
            const rawPhone = query.phone || req.headers['x-contact-phone'] || '';
            const cleanPhone = (rawPhone || '').replace(/\D/g, '');
            if (cleanPhone.length !== 10) {
                return sendJson(res, 400, {
                    success: false,
                    message: 'Validation Error: Contact phone must be exactly 10 digits.'
                });
            }
            const cRes = await sendCppCommand({ cmd: 'get_citizen_requests', phone: cleanPhone });
            return sendJson(res, cRes.success ? 200 : 400, cRes);
        }

        // 3B. GET /api/requests (Full Citizen Records & C++ Search/Sort - Management Only)
        if ((pathname === '/api/requests' || pathname === '/api/requests/search') && method === 'GET') {
            const session = getSessionFromReq(req);
            if (!session || session.role !== 'management') {
                return sendJson(res, 401, {
                    success: false,
                    message: 'Unauthorized: Management credentials required to access full citizen records.'
                });
            }

            const searchType = (query.searchType || (query.id ? 'id' : (query.phone ? 'phone' : (query.status ? 'status' : (query.severity ? 'severity' : 'all'))))).trim();
            const searchQuery = (query.searchQuery || query.search || query.id || query.phone || query.status || query.severity || '').trim();
            const sortBy = (query.sortBy || 'none').trim();

            const cRes = await sendCppCommand({
                cmd: 'search_and_sort_requests',
                searchType: searchType,
                searchQuery: searchQuery,
                sortBy: sortBy
            });
            return sendJson(res, 200, cRes);
        }

        // 4. POST /api/requests
        if (pathname === '/api/requests' && method === 'POST') {
            const body = await readJsonBody(req);

            // Basic validation
            if (!body.name || !body.name.trim()) {
                return sendJson(res, 400, { success: false, message: 'Validation Error: Name cannot be empty.' });
            }
            const cleanPhone = (body.phone || '').replace(/\D/g, '');
            if (cleanPhone.length !== 10) {
                return sendJson(res, 400, { success: false, message: 'Validation Error: Contact phone must be exactly 10 digits.' });
            }
            if (!body.location || !body.location.trim()) {
                return sendJson(res, 400, { success: false, message: 'Validation Error: Location cannot be empty.' });
            }

            const people = parseInt(body.people, 10);
            if (isNaN(people) || people <= 0) {
                return sendJson(res, 400, { success: false, message: 'Validation Error: Number of people affected must be greater than zero.' });
            }

            // Phase 1 Quantity Validations (Reject negative or invalid values)
            const parseNonNeg = (val, fieldName) => {
                if (val === undefined || val === null || val === '') return 0;
                const parsed = parseInt(val, 10);
                if (isNaN(parsed) || parsed < 0) {
                    throw new Error(`Validation Error: ${fieldName} cannot be negative or invalid.`);
                }
                return parsed;
            };

            let familiesCount = 0, childrenCount = 0, elderlyCount = 0, injuredCount = 0;
            let foodPackets = 0, waterLitres = 0, medicalKits = 0, blankets = 0;

            try {
                familiesCount = parseNonNeg(body.familiesCount, 'Number of families');
                childrenCount = parseNonNeg(body.childrenCount, 'Number of children');
                elderlyCount = parseNonNeg(body.elderlyCount, 'Number of elderly people');
                injuredCount = parseNonNeg(body.injuredCount, 'Number of injured people');
                foodPackets = parseNonNeg(body.foodPackets, 'Food packets required');
                waterLitres = parseNonNeg(body.waterLitres, 'Drinking water required');
                medicalKits = parseNonNeg(body.medicalKits, 'Medical kits required');
                blankets = parseNonNeg(body.blankets, 'Blankets required');
            } catch (valErr) {
                return sendJson(res, 400, { success: false, message: valErr.message });
            }

            let latitude = 0, longitude = 0;
            if (body.latitude !== undefined && body.latitude !== null && body.latitude !== '') {
                latitude = parseFloat(body.latitude);
                if (isNaN(latitude) || latitude < -90 || latitude > 90) {
                    return sendJson(res, 400, { success: false, message: 'Validation Error: Latitude must be a number between -90 and 90.' });
                }
            }
            if (body.longitude !== undefined && body.longitude !== null && body.longitude !== '') {
                longitude = parseFloat(body.longitude);
                if (isNaN(longitude) || longitude < -180 || longitude > 180) {
                    return sendJson(res, 400, { success: false, message: 'Validation Error: Longitude must be a number between -180 and 180.' });
                }
            }

            const cRes = await sendCppCommand({
                cmd: 'submit_request',
                name: body.name.trim(),
                phone: cleanPhone,
                location: body.location.trim(),
                disaster: (body.disaster || 'General').trim(),
                type: (body.type || 'Other').trim(),
                people: people,
                severity: (body.severity || 'NORMAL').trim(),
                details: (body.details || '').trim(),
                familiesCount: familiesCount,
                childrenCount: childrenCount,
                elderlyCount: elderlyCount,
                injuredCount: injuredCount,
                foodPackets: foodPackets,
                waterLitres: waterLitres,
                medicalKits: medicalKits,
                blankets: blankets,
                otherSupplies: (body.otherSupplies || '').trim(),
                landmark: (body.landmark || '').trim(),
                latitude: latitude,
                longitude: longitude,
                directions: (body.directions || '').trim()
            });

            if (cRes.success) {
                return sendJson(res, 201, cRes);
            } else {
                return sendJson(res, 400, cRes);
            }
        }

        // 5. POST /api/requests/:id/cancel
        const cancelMatch = pathname.match(/^\/api\/requests\/([A-Za-z0-9_-]+)\/cancel$/);
        if (cancelMatch && method === 'POST') {
            const reqId = cancelMatch[1];
            const body = await readJsonBody(req);
            const rawPhone = body.phone || query.phone || req.headers['x-contact-phone'] || '';
            const phoneStr = (typeof rawPhone === 'string' ? rawPhone.trim() : String(rawPhone || '').trim());

            // Mandatory phone verification
            if (!phoneStr) {
                return sendJson(res, 400, {
                    success: false,
                    message: 'Cancellation Error: Contact phone number is required.'
                });
            }

            // Strict 10-digit format validation
            const cleanPhone = phoneStr.replace(/\D/g, '');
            if (phoneStr.length !== 10 || cleanPhone.length !== 10) {
                return sendJson(res, 400, {
                    success: false,
                    message: 'Cancellation Error: Contact phone must be exactly 10 digits.'
                });
            }

            const cRes = await sendCppCommand({
                cmd: 'cancel_request',
                id: reqId,
                phone: cleanPhone
            });

            if (cRes.success) {
                return sendJson(res, 200, cRes);
            } else {
                const msg = cRes.message || '';
                const code = cRes.code || (msg.includes('not found') ? 404 : ((msg.includes('does not match') || msg.includes('registered number')) ? 403 : 400));
                return sendJson(res, code, cRes);
            }
        }

        // 6. GET /api/requests/:id (Track Request)
        const trackMatch = pathname.match(/^\/api\/requests\/([A-Za-z0-9_-]+)$/);
        if (trackMatch && method === 'GET') {
            const reqId = trackMatch[1];
            const phone = query.phone || req.headers['x-contact-phone'] || '';

            if (!phone) {
                return sendJson(res, 400, {
                    success: false,
                    message: 'Tracking Error: Query parameter ?phone=10_DIGITS is required for verification.'
                });
            }

            const cRes = await sendCppCommand({
                cmd: 'track_request',
                id: reqId,
                phone: phone
            });

            if (cRes.success) {
                return sendJson(res, 200, cRes);
            } else {
                const msg = cRes.message || '';
                const code = msg.includes('not found') ? 404 : (msg.includes('does not match') ? 403 : 400);
                return sendJson(res, code, cRes);
            }
        }

        // 6B. GET /api/requests/:id/team-location (Assigned Team Telemetry for Citizen with Privacy Check)
        const citizenTeamLocMatch = pathname.match(/^\/api\/requests\/([A-Za-z0-9_-]+)\/(?:team-location|assigned-team-location)$/);
        if (citizenTeamLocMatch && method === 'GET') {
            const reqId = citizenTeamLocMatch[1];
            const rawPhone = query.phone || req.headers['x-contact-phone'] || '';
            const cleanPhone = (rawPhone || '').replace(/\D/g, '');

            if (cleanPhone.length !== 10) {
                return sendJson(res, 400, {
                    success: false,
                    message: 'Tracking Error: Valid 10-digit query parameter ?phone=10_DIGITS is required for verification.'
                });
            }

            const cRes = await sendCppCommand({
                cmd: 'get_citizen_team_location',
                id: reqId,
                phone: cleanPhone
            });

            if (cRes.success) {
                return sendJson(res, 200, cRes);
            } else {
                const msg = cRes.message || '';
                const code = cRes.code || (msg.includes('not found') ? 404 : (msg.includes('Privacy Check') || msg.includes('Access Revoked') ? 403 : 400));
                return sendJson(res, code, cRes);
            }
        }

        // 7. GET /api/teams
        if (pathname === '/api/teams' && method === 'GET') {
            const cRes = await sendCppCommand({ cmd: 'get_teams' });
            return sendJson(res, 200, cRes);
        }

        // 7B. GET /api/teams/:id/missions (Team Leader Portal - Authorized Missions)
        const teamMissionsMatch = pathname.match(/^\/api\/teams\/([A-Za-z0-9_-]+)\/missions$/);
        if (teamMissionsMatch && method === 'GET') {
            const teamId = teamMissionsMatch[1];
            const session = getSessionFromReq(req);
            if (!session) {
                return sendJson(res, 401, {
                    success: false,
                    message: 'Unauthorized: Authentication required to access team missions.'
                });
            }
            if (session.role !== 'management' && (session.role !== 'team-leader' || session.teamId !== teamId)) {
                return sendJson(res, 403, {
                    success: false,
                    message: `Forbidden: Team Leader (${session.teamId}) cannot access missions for Team ${teamId}.`
                });
            }
            const cRes = await sendCppCommand({
                cmd: 'get_team_missions',
                teamId: teamId
            });
            if (cRes.success && Array.isArray(cRes.data)) {
                cRes.missions = cRes.data;
            }
            return sendJson(res, cRes.success ? 200 : 404, cRes);
        }

        // 7C. POST /api/teams/:id/missions/:reqId/status (Field Status Update - Squad Authorized)
        const teamMissionStatusMatch = pathname.match(/^\/api\/teams\/([A-Za-z0-9_-]+)\/missions\/([A-Za-z0-9_-]+)\/status$/);
        if (teamMissionStatusMatch && method === 'POST') {
            const teamId = teamMissionStatusMatch[1];
            const session = getSessionFromReq(req);
            if (!session) {
                return sendJson(res, 401, { success: false, message: 'Unauthorized: Authentication required.' });
            }
            if (session.role !== 'management' && (session.role !== 'team-leader' || session.teamId !== teamId)) {
                return sendJson(res, 403, {
                    success: false,
                    message: `Forbidden: Team Leader (${session.teamId}) cannot update mission status for Team ${teamId}.`
                });
            }

            const reqId = teamMissionStatusMatch[2];
            const body = await readJsonBody(req);
            const status = (body.status || '').trim();

            if (!status) {
                return sendJson(res, 400, { success: false, message: 'Validation Error: Mission status is required.' });
            }

            const cRes = await sendCppCommand({
                cmd: 'update_mission_status',
                teamId: teamId,
                requestId: reqId,
                status: status
            });

            return sendJson(res, cRes.success ? 200 : 400, cRes);
        }

        // 7D. GET /api/teams/locations (All Teams GPS Telemetry - Management Only)
        if (pathname === '/api/teams/locations' && method === 'GET') {
            const session = getSessionFromReq(req);
            if (!session || session.role !== 'management') {
                return sendJson(res, 401, {
                    success: false,
                    message: 'Unauthorized: Management access required to view all teams GPS data.'
                });
            }
            const cRes = await sendCppCommand({ cmd: 'get_team_locations' });
            return sendJson(res, 200, cRes);
        }

        // 7E. POST /api/teams/location/threshold (Configurable Freshness Threshold - Management Only)
        if (pathname === '/api/teams/location/threshold' && method === 'POST') {
            const session = getSessionFromReq(req);
            if (!session || session.role !== 'management') {
                return sendJson(res, 401, {
                    success: false,
                    message: 'Unauthorized: Management access required to configure location threshold.'
                });
            }
            const body = await readJsonBody(req);
            const cRes = await sendCppCommand({
                cmd: 'set_location_threshold',
                threshold: parseInt(body.threshold, 10) || 60
            });
            return sendJson(res, cRes.success ? 200 : 400, cRes);
        }

        // 7F. POST /api/teams/:id/location/stop (Stop Location Sharing - Squad Authorized)
        const teamLocationStopMatch = pathname.match(/^\/api\/teams\/([A-Za-z0-9_-]+)\/location\/stop$/);
        if (teamLocationStopMatch && method === 'POST') {
            const teamId = teamLocationStopMatch[1];
            const session = getSessionFromReq(req);
            if (!session) {
                return sendJson(res, 401, { success: false, message: 'Unauthorized: Authentication required.' });
            }
            if (session.role !== 'management' && (session.role !== 'team-leader' || session.teamId !== teamId)) {
                return sendJson(res, 403, {
                    success: false,
                    message: `Forbidden: Team Leader (${session.teamId}) cannot stop location for Team ${teamId}.`
                });
            }
            const cRes = await sendCppCommand({
                cmd: 'stop_team_location',
                teamId: teamId
            });
            const status = cRes.success ? 200 : (cRes.message && cRes.message.includes('Unknown team') ? 404 : 400);
            return sendJson(res, status, cRes);
        }

        // 7G. POST /api/teams/:id/location (Submit Team Location - Squad Authorized)
        const teamLocationPostMatch = pathname.match(/^\/api\/teams\/([A-Za-z0-9_-]+)\/location$/);
        if (teamLocationPostMatch && method === 'POST') {
            const teamId = teamLocationPostMatch[1];
            const session = getSessionFromReq(req);
            if (!session) {
                return sendJson(res, 401, { success: false, message: 'Unauthorized: Authentication required.' });
            }
            if (session.role !== 'management' && (session.role !== 'team-leader' || session.teamId !== teamId)) {
                return sendJson(res, 403, {
                    success: false,
                    message: `Forbidden: Team Leader (${session.teamId}) cannot update location for Team ${teamId}.`
                });
            }
            const body = await readJsonBody(req);
            const cmdPayload = {
                cmd: 'update_team_location',
                teamId: teamId,
                ...body
            };
            const cRes = await sendCppCommand(cmdPayload);
            const status = cRes.success ? 200 : (cRes.message && cRes.message.includes('Unknown team') ? 404 : 400);
            return sendJson(res, status, cRes);
        }

        // 7H. GET /api/teams/:id/location (Phase 3 - Get Single Team Location)
        const teamLocationGetMatch = pathname.match(/^\/api\/teams\/([A-Za-z0-9_-]+)\/location$/);
        if (teamLocationGetMatch && method === 'GET') {
            const teamId = teamLocationGetMatch[1];
            const cRes = await sendCppCommand({
                cmd: 'get_team_location',
                teamId: teamId
            });
            const status = cRes.success ? 200 : (cRes.message && cRes.message.includes('Unknown team') ? 404 : 400);
            return sendJson(res, status, cRes);
        }

        // 8. GET /api/resources
        if (pathname === '/api/resources' && method === 'GET') {
            const cRes = await sendCppCommand({ cmd: 'get_resources' });
            return sendJson(res, 200, cRes);
        }

        // 8B. POST /api/resources/:id or /api/resources/update (Management Authorized)
        const resUpdateMatch = pathname.match(/^\/api\/resources\/([A-Za-z0-9_-]+)$/);
        if ((resUpdateMatch && method === 'POST') || (pathname === '/api/resources/update' && method === 'POST')) {
            const session = getSessionFromReq(req);
            if (!session || session.role !== 'management') {
                return sendJson(res, 401, {
                    success: false,
                    message: 'Unauthorized: Management authorization required to update resources.'
                });
            }
            const body = await readJsonBody(req);
            const resId = resUpdateMatch ? resUpdateMatch[1] : (body.id || '');
            const amount = body.quantity !== undefined ? body.quantity : (body.amount !== undefined ? body.amount : 0);

            const cRes = await sendCppCommand({
                cmd: 'update_resource',
                id: resId,
                quantity: parseInt(amount, 10)
            });

            return sendJson(res, cRes.success ? 200 : 400, cRes);
        }

        // 9. GET /api/centers
        if (pathname === '/api/centers' && method === 'GET') {
            const cRes = await sendCppCommand({ cmd: 'get_centers' });
            return sendJson(res, 200, cRes);
        }

        // 10. POST /api/triage (Management Authorized)
        if (pathname === '/api/triage' && method === 'POST') {
            const session = getSessionFromReq(req);
            if (!session || session.role !== 'management') {
                return sendJson(res, 401, {
                    success: false,
                    message: 'Unauthorized: Management authorization required for triage.'
                });
            }
            const body = await readJsonBody(req);
            const reqId = body.requestId || body.id || '';
            const cRes = await sendCppCommand({
                cmd: 'triage',
                requestId: reqId
            });
            return sendJson(res, cRes.success ? 200 : 400, cRes);
        }

        // 11. POST /api/assign (Management Authorized)
        if (pathname === '/api/assign' && method === 'POST') {
            const session = getSessionFromReq(req);
            if (!session || session.role !== 'management') {
                return sendJson(res, 401, {
                    success: false,
                    message: 'Unauthorized: Management authorization required for team assignment.'
                });
            }
            const body = await readJsonBody(req);
            const reqId = body.requestId || body.id || '';
            const teamId = body.teamId || '';
            const cRes = await sendCppCommand({
                cmd: 'assign_team',
                requestId: reqId,
                teamId: teamId
            });
            return sendJson(res, cRes.success ? 200 : 400, cRes);
        }

        // 12. GET /api/route (Dijkstra)
        if (pathname === '/api/route' && method === 'GET') {
            const from = query.from || '';
            const to = query.to || '';
            const cRes = await sendCppCommand({
                cmd: 'calculate_route',
                from: from,
                to: to
            });
            return sendJson(res, 200, cRes);
        }

        // 13. POST /api/rollback (LIFO Stack Rollback - Management Authorized)
        if (pathname === '/api/rollback' && method === 'POST') {
            const session = getSessionFromReq(req);
            if (!session || session.role !== 'management') {
                return sendJson(res, 401, {
                    success: false,
                    message: 'Unauthorized: Management authorization required for rollback.'
                });
            }
            const cRes = await sendCppCommand({ cmd: 'rollback' });
            return sendJson(res, cRes.success ? 200 : 400, cRes);
        }

        // 14. POST /api/allocate (Resource Allocation with stock verification - Management Authorized)
        if (pathname === '/api/allocate' && method === 'POST') {
            const session = getSessionFromReq(req);
            if (!session || session.role !== 'management') {
                return sendJson(res, 401, {
                    success: false,
                    message: 'Unauthorized: Management authorization required for resource allocation.'
                });
            }
            const body = await readJsonBody(req);
            const reqId = body.requestId || body.id || '';
            const resId = body.resourceId || '';
            const qty = parseInt(body.quantity, 10) || 0;
            const cRes = await sendCppCommand({
                cmd: 'allocate_resource',
                requestId: reqId,
                resourceId: resId,
                quantity: qty
            });
            return sendJson(res, cRes.success ? 200 : 400, cRes);
        }

        // Unknown API route
        return sendJson(res, 404, { success: false, message: `Endpoint ${method} ${pathname} not found.` });

    } catch (err) {
        if (err.message && err.message.includes('Invalid JSON format')) {
            return sendJson(res, 400, {
                success: false,
                message: 'Bad Request: ' + err.message
            });
        }
        console.error(`[API Error] ${method} ${pathname}:`, err.message);
        return sendJson(res, 503, {
            success: false,
            message: 'Bridge communication error: ' + err.message
        });
    }
}

// ============================================================================
// MAIN HTTP SERVER
// ============================================================================
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Route API calls to C++ bridge handler
    if (pathname.startsWith('/api/')) {
        return handleApiRequest(req, res, parsedUrl);
    }

    // Static files
    let reqPath = decodeURI(pathname);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

    let filePath = path.join(PUBLIC_DIR, reqPath);

    // Prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('404 Not Found');
        }

        if (stats.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }

        fs.readFile(filePath, (readErr, data) => {
            if (readErr) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                return res.end('500 Internal Server Error');
            }
            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
});

// Start persistent C++ backend child process, then start HTTP server
initCppBackend();

server.listen(PORT, () => {
    console.log(`======================================================================`);
    console.log(`  RT-DRMS Full-Stack Server running at http://localhost:${PORT}/`);
    console.log(`  Static Frontend : ./frontend`);
    console.log(`  C++ Bridge IPC  : backend.exe --server via stdin/stdout`);
    console.log(`======================================================================`);
});

// Clean shutdown handler
process.on('SIGINT', () => {
    console.log('\n[Bridge] Gracefully shutting down...');
    if (cppProcess && !cppProcess.killed) {
        try {
            cppProcess.stdin.write('exit\n');
        } catch (e) {}
    }
    process.exit(0);
});
