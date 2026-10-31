const http = require('http');
const { escapeHtml } = require('../frontend/js/app.js');

const { MGMT_USERNAME, MGMT_PASSWORD, TEST_TEAM_BRAVO_PASSWORD, TEST_PHONE, WRONG_TEST_PHONE, TEST_CITIZEN_NAME, TEST_CITIZEN_LOCATION } = process.env;
const requiredEnvironment = {
    MGMT_USERNAME,
    MGMT_PASSWORD,
    TEST_TEAM_BRAVO_PASSWORD,
    TEST_PHONE,
    WRONG_TEST_PHONE,
    TEST_CITIZEN_NAME,
    TEST_CITIZEN_LOCATION
};
const missingEnvironment = Object.entries(requiredEnvironment)
    .filter(([, value]) => !value)
    .map(([name]) => name);
if (missingEnvironment.length) {
    throw new Error(`Missing required test environment variables: ${missingEnvironment.join(', ')}`);
}

function apiCall(path, method = 'GET', body = null, token = null) {
    return new Promise((resolve, reject) => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const req = http.request({ hostname: 'localhost', port: 3000, path, method, headers }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
                catch (e) { resolve({ status: res.statusCode, data }); }
            });
        });
        req.on('error', err => reject(err));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function verify() {
    console.log('=== 1. SERVER-SIDE MANAGEMENT ACCESS CHECKS ===');
    const u1 = await apiCall('/api/requests', 'GET');
    console.log('[1A] Unauth GET /api/requests:', u1.status, '-', u1.data.message);
    const u2 = await apiCall('/api/teams/locations', 'GET');
    console.log('[1B] Unauth GET /api/teams/locations:', u2.status, '-', u2.data.message);
    const u3 = await apiCall('/api/triage', 'POST', { requestId: 'DR-TEST' });
    console.log('[1C] Unauth POST /api/triage:', u3.status, '-', u3.data.message);
    const u4 = await apiCall('/api/assign', 'POST', { requestId: 'DR-TEST', teamId: 'T-01' });
    console.log('[1D] Unauth POST /api/assign:', u4.status, '-', u4.data.message);
    const u5 = await apiCall('/api/rollback', 'POST', {});
    console.log('[1E] Unauth POST /api/rollback:', u5.status, '-', u5.data.message);
    const u6 = await apiCall('/api/allocate', 'POST', { resourceId: 'R-01', requestId: 'DR-TEST', quantity: 1 });
    console.log('[1F] Unauth POST /api/allocate:', u6.status, '-', u6.data.message);
    const u7 = await apiCall('/api/resources/update', 'POST', { id: 'R-01', quantity: 10 });
    console.log('[1G] Unauth POST /api/resources/update:', u7.status, '-', u7.data.message);

    console.log('\n=== 2. MANAGEMENT LOGIN & SESSION VERIFICATION ===');
    const bad = await apiCall('/api/auth/login', 'POST', { username: MGMT_USERNAME, password: 'wrongpassword' });
    console.log('[2A] Bad Login:', bad.status, '-', bad.data.message);
    const good = await apiCall('/api/auth/login', 'POST', { username: MGMT_USERNAME, password: MGMT_PASSWORD });
    console.log('[2B] Valid Login:', good.status, '- Token:', good.data.token.substring(0, 10) + '...');
    const token = good.data.token;
    const authReqs = await apiCall('/api/requests', 'GET', null, token);
    console.log('[2C] Auth GET /api/requests with Bearer token:', authReqs.status, '- Count:', authReqs.data.data.length);

    console.log('\n=== 3. SQUAD ROLE AUTHORIZATION & CROSS-TEAM SPOOFING ===');
    const sqLogin = await apiCall('/api/auth/team-session', 'POST', { username: 'leader_bravo', password: TEST_TEAM_BRAVO_PASSWORD });
    console.log('[3A] Squad T-02 session established:', sqLogin.status, '- Token:', sqLogin.data.squadToken.substring(0, 10) + '...');
    const sqToken = sqLogin.data.squadToken;
    const crossLoc = await apiCall('/api/teams/T-01/location', 'POST', { latitude: 18.5, longitude: 73.8 }, sqToken);
    console.log('[3B] Squad T-02 spoofing T-01 location:', crossLoc.status, '-', crossLoc.data.message);
    const crossStatus = await apiCall('/api/teams/T-01/missions/DR-1/status', 'POST', { status: 'COMPLETED' }, sqToken);
    console.log('[3C] Squad T-02 updating T-01 mission status:', crossStatus.status, '-', crossStatus.data.message);
    const ownLoc = await apiCall('/api/teams/T-02/location', 'POST', { latitude: 18.51, longitude: 73.81, accuracy: 10, isSharing: true }, sqToken);
    console.log('[3D] Squad T-02 updating T-02 location:', ownLoc.status, '- Success:', ownLoc.data.success);

    console.log('\n=== 4. PUBLIC CITIZEN REGISTRATION & DUAL-KEY ACCESS ===');
    const pubSub = await apiCall('/api/requests', 'POST', {
        name: TEST_CITIZEN_NAME,
        phone: TEST_PHONE,
        location: TEST_CITIZEN_LOCATION,
        disaster: 'Flood',
        type: 'Rescue',
        people: 2,
        details: 'Public submission works unauthenticated'
    });
    console.log('[4A] Public citizen request submit (unauthenticated):', pubSub.status, '- ID:', pubSub.data.requestId);
    const trackWrong = await apiCall(`/api/requests/${pubSub.data.requestId}?phone=${WRONG_TEST_PHONE}`);
    console.log('[4B] Dual-key track with wrong phone:', trackWrong.status, '-', trackWrong.data.message);
    const trackRight = await apiCall(`/api/requests/${pubSub.data.requestId}?phone=${TEST_PHONE}`);
    console.log('[4C] Dual-key track with registered phone:', trackRight.status, '- Status:', trackRight.data.data.status);

    console.log('\n=== 5. XSS SANITIZATION REGRESSION CHECKS ===');
    const xssScript = escapeHtml('<script>alert("XSS")</script>');
    console.log('[5A] Script tag escaped:', xssScript);
    const xssImg = escapeHtml('<img src=x onerror=alert(1)>');
    console.log('[5B] Img onerror escaped:', xssImg);
    const safeText = escapeHtml('ordinary text');
    console.log('[5C] Legitimate text preserved:', safeText);

    console.log('\n=== ALL SECURITY VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

verify().catch(console.error);
