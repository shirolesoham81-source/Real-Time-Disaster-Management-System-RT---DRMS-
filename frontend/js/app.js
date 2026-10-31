// ============================================================================
// RT-DRMS Cybersecurity Utilities: XSS Prevention Helper
// ============================================================================
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

if (typeof window !== 'undefined') {
    window.escapeHtml = escapeHtml;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { escapeHtml };
}

// Global Application Controller
const App = {
    currentRole: null,

    init: async () => {
        // Initial backend connectivity check
        await App.checkBackendStatus();
        setInterval(App.checkBackendStatus, 5000);

        // Handle Role Selection with Server-Side Management Authentication
        document.querySelectorAll('.role-card').forEach(card => {
            card.addEventListener('click', async (e) => {
                const role = e.currentTarget.dataset.role;
                if (role === 'management') {
                    const token = sessionStorage.getItem('mgmtToken');
                    if (token) {
                        try {
                            const check = await ApiBridge.verifyAuth();
                            if (check.ok && check.data && check.data.authenticated && check.data.role === 'management') {
                                App.setRole('management');
                                return;
                            }
                        } catch (err) {}
                    }
                    App.promptManagementLogin();
                    return;
                }
                App.setRole(role);
            });
        });

        // Handle Logout/Back
        document.getElementById('btn-logout').addEventListener('click', async () => {
            if (App.currentRole === 'management') {
                try {
                    await ApiBridge.logout();
                } catch (e) {}
                sessionStorage.removeItem('mgmtToken');
            } else if (App.currentRole === 'team-leader') {
                try {
                    await ApiBridge.logout();
                } catch (e) {}
                if (typeof TeamLeaderApp !== 'undefined' && TeamLeaderApp.stopLocationSharing) {
                    TeamLeaderApp.stopLocationSharing(true);
                }
                sessionStorage.removeItem('activeTeamLeaderId');
                sessionStorage.removeItem('squadToken');
                if (typeof TeamLeaderApp !== 'undefined') {
                    TeamLeaderApp.currentTeamId = null;
                    TeamLeaderApp.currentTeamData = null;
                    TeamLeaderApp.missions = [];
                }
            }
            App.setRole(null);
        });

        // Handle Reset Demo Data
        const resetDemoBtn = document.getElementById('btn-reset-demo');
        if (resetDemoBtn) {
            resetDemoBtn.addEventListener('click', () => {
                if (confirm('Reset demo requests, teams, and resources back to default dataset?')) {
                    Storage.resetDemoData();
                    App.showToast('Demo dataset reinitialized successfully.', 'success');
                    if (App.currentRole === 'people') {
                        PeopleApp.refreshView('people-home');
                        PeopleApp.renderMyRequests();
                    } else if (App.currentRole === 'management') {
                        ManagementApp.renderOverview();
                        ManagementApp.renderRequests();
                        ManagementApp.renderTeams();
                        ManagementApp.renderResources();
                    } else if (App.currentRole === 'team-leader' && typeof TeamLeaderApp !== 'undefined') {
                        TeamLeaderApp.syncMissions().then(() => {
                            TeamLeaderApp.refreshActiveView();
                        });
                    }
                }
            });
        }

        // Mobile Menu & Desktop Sidebar Toggles
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const desktopToggle = document.getElementById('desktop-menu-toggle');
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');

        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                if (sidebar) sidebar.classList.toggle('active');
                if (backdrop) backdrop.classList.toggle('active');
            });
        }

        if (desktopToggle) {
            desktopToggle.addEventListener('click', () => {
                if (sidebar) sidebar.classList.toggle('compact');
            });
        }

        if (backdrop) {
            backdrop.addEventListener('click', () => {
                if (sidebar) sidebar.classList.remove('active');
                backdrop.classList.remove('active');
            });
        }

        // Close Modal
        document.getElementById('modal-container').addEventListener('click', (e) => {
            if(e.target.id === 'modal-container') {
                App.closeModal();
            }
        });
    },

    checkBackendStatus: async () => {
        const health = await ApiBridge.checkHealth();
        ApiBridge.isLive = !!health.online;
        const pill = document.getElementById('backend-status-pill');
        if (pill) {
            if (ApiBridge.isLive) {
                pill.className = 'system-status-pill';
                pill.innerHTML = '<span class="system-status-dot"></span><span>Bridge Online</span>';
                pill.title = 'Node.js Bridge & C++ Core Engine are fully synchronized';
            } else {
                pill.className = 'system-status-pill';
                pill.style.background = '#fffbeb';
                pill.style.borderColor = '#fde68a';
                pill.style.color = '#92400e';
                pill.innerHTML = '<span class="system-status-dot" style="background:#f59e0b;"></span><span>Local Mode</span>';
                pill.title = 'Running in browser local-storage mode';
            }
        }
    },

    setRole: (role) => {
        const landing = document.getElementById('landing-view');
        const app = document.getElementById('app-layout');
        const sidebar = document.getElementById('sidebar-nav');
        const roleBadge = document.getElementById('role-badge');

        App.currentRole = role;

        if (role === 'people') {
            landing.classList.add('hidden');
            app.classList.remove('hidden');
            roleBadge.textContent = 'PEOPLE';
            roleBadge.className = 'badge badge-people';
            App.buildSidebar('people');
            App.navigate('people-home');
            PeopleApp.init();
        } else if (role === 'management') {
            landing.classList.add('hidden');
            app.classList.remove('hidden');
            roleBadge.textContent = 'MANAGEMENT';
            roleBadge.className = 'badge badge-management';
            App.buildSidebar('management');
            App.navigate('management-overview');
            ManagementApp.init();
        } else if (role === 'team-leader') {
            landing.classList.add('hidden');
            app.classList.remove('hidden');
            roleBadge.textContent = 'TEAM LEADER';
            roleBadge.className = 'badge badge-team-leader';
            App.buildSidebar('team-leader');
            const savedTeamId = sessionStorage.getItem('activeTeamLeaderId');
            const savedToken = sessionStorage.getItem('squadToken');
            if (savedTeamId && savedToken && typeof TeamLeaderApp !== 'undefined') {
                TeamLeaderApp.currentTeamId = savedTeamId;
                App.navigate('team-overview');
            } else {
                App.navigate('team-select');
            }
            if (typeof TeamLeaderApp !== 'undefined') {
                TeamLeaderApp.init();
            }
        } else {
            landing.classList.remove('hidden');
            app.classList.add('hidden');
        }
    },

    buildSidebar: (role) => {
        const nav = document.getElementById('sidebar-nav');
        nav.innerHTML = ''; // Clear existing

        let menu = [];
        if (role === 'people') {
            menu = [
                { id: 'people-home', icon: 'fa-home', text: 'Dashboard' },
                { id: 'people-map', icon: 'fa-map-marked-alt', text: 'Citizen Map' },
                { id: 'people-create', icon: 'fa-plus-circle', text: 'Create Request' },
                { id: 'people-emergency', icon: 'fa-exclamation-triangle', text: 'Report Emergency', class: 'text-danger' },
                { id: 'people-my-requests', icon: 'fa-list', text: 'My Requests' },
                { id: 'people-track', icon: 'fa-search', text: 'Track Request' },
                { id: 'people-centers', icon: 'fa-hospital', text: 'Relief Centers' },
                { id: 'people-contacts', icon: 'fa-phone-alt', text: 'Emergency Contacts' },
                { id: 'people-safety', icon: 'fa-shield-alt', text: 'Safety Information' }
            ];
        } else if (role === 'management') {
            menu = [
                { id: 'management-overview', icon: 'fa-chart-pie', text: 'Overview' },
                { id: 'management-map', icon: 'fa-map-marked-alt', text: 'Live Operations Map' },
                { id: 'management-requests', icon: 'fa-table', text: 'All Requests' },
                { id: 'management-critical', icon: 'fa-exclamation-circle', text: 'Critical Requests', class: 'text-danger' },
                { id: 'management-queue', icon: 'fa-layer-group', text: 'Priority Queue' },
                { id: 'management-teams', icon: 'fa-users', text: 'Rescue Teams' },
                { id: 'management-resources', icon: 'fa-box', text: 'Resources' },
                { id: 'management-analytics', icon: 'fa-chart-bar', text: 'Analytics' }
            ];
        } else if (role === 'team-leader') {
            menu = [
                { id: 'team-overview', icon: 'fa-chart-pie', text: 'Squad Overview' },
                { id: 'team-map', icon: 'fa-map-marked-alt', text: 'Mission Map' },
                { id: 'team-location', icon: 'fa-crosshairs', text: 'My Location' },
                { id: 'team-assigned', icon: 'fa-clipboard-list', text: 'Assigned Missions' },
                { id: 'team-inprogress', icon: 'fa-running', text: 'In-Progress Ops' },
                { id: 'team-completed', icon: 'fa-check-double', text: 'Completed Archive' },
                { id: 'team-profile', icon: 'fa-id-badge', text: 'Squad Profile' },
                { id: 'team-select', icon: 'fa-exchange-alt', text: 'Switch Squad' }
            ];
        }

        menu.forEach(item => {
            const li = document.createElement('li');
            li.className = `nav-item ${item.class || ''}`;
            li.dataset.target = `view-${item.id}`;
            li.innerHTML = `<i class="fas ${item.icon}"></i> <span>${item.text}</span>`;
            li.addEventListener('click', () => {
                if (item.id === 'management-requests' && typeof ManagementApp !== 'undefined' && ManagementApp.resetFiltersUI) {
                    ManagementApp.resetFiltersUI();
                }
                App.navigate(item.id);
                if(window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('active');
                }
            });
            nav.appendChild(li);
        });
    },

    navigate: (viewId) => {
        // Hide all views
        document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
        // Show target
        const target = document.getElementById(`view-${viewId}`);
        if(target) target.classList.remove('hidden');

        // Update active class on sidebar
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-target="view-${viewId}"]`);
        if(activeNav) activeNav.classList.add('active');

        // Dynamic Title & Breadcrumbs
        let viewTitle = 'Dashboard';
        if(activeNav) {
            viewTitle = activeNav.querySelector('span').innerText;
            document.getElementById('topbar-title').innerText = viewTitle;
        }

        const roleCrumb = document.getElementById('breadcrumb-role');
        const pageCrumb = document.getElementById('breadcrumb-page');
        if (roleCrumb) {
            if (App.currentRole === 'people') roleCrumb.innerText = 'Citizen Portal';
            else if (App.currentRole === 'management') roleCrumb.innerText = 'Command Center';
            else if (App.currentRole === 'team-leader') roleCrumb.innerText = 'Field Squad';
            else roleCrumb.innerText = 'Operations';
        }
        if (pageCrumb) {
            pageCrumb.innerText = viewTitle;
        }

        // Auto-close mobile sidebar and backdrop on navigation
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.getElementById('sidebar-backdrop');
            if (sidebar) sidebar.classList.remove('active');
            if (backdrop) backdrop.classList.remove('active');
        }

        // Invalidate map dimensions whenever views change to prevent grey/broken tiles
        setTimeout(() => {
            if (typeof MapApp !== 'undefined') {
                if (MapApp.map) MapApp.map.invalidateSize();
                if (MapApp.overviewMap) MapApp.overviewMap.invalidateSize();
            }
            if (typeof CitizenMap !== 'undefined' && CitizenMap.map) {
                CitizenMap.map.invalidateSize();
            }
            if (typeof CitizenLocationPicker !== 'undefined' && CitizenLocationPicker.map) {
                CitizenLocationPicker.map.invalidateSize();
            }
            if (typeof TeamMissionMap !== 'undefined' && TeamMissionMap.map) {
                TeamMissionMap.map.invalidateSize();
            }
        }, 150);

        // Stop map auto-refresh if navigating away from map views
        if (typeof MapApp !== 'undefined' && viewId !== 'management-map') {
            MapApp.stopAutoRefresh();
        }
        if (typeof CitizenMap !== 'undefined' && viewId !== 'people-map') {
            CitizenMap.stopAutoRefresh();
        }
        if (typeof TeamMissionMap !== 'undefined' && viewId !== 'team-map') {
            TeamMissionMap.stopAutoRefresh();
        }

        // Call specific refresh logic based on view
        if(App.currentRole === 'people') PeopleApp.refreshView(viewId);
        if(App.currentRole === 'management') ManagementApp.refreshView(viewId);
        if(App.currentRole === 'team-leader' && typeof TeamLeaderApp !== 'undefined') TeamLeaderApp.refreshView(viewId);
    },

    showToast: (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    showModal: (html) => {
        document.getElementById('modal-body').innerHTML = html;
        document.getElementById('modal-container').classList.remove('hidden');
    },

    closeModal: () => {
        document.getElementById('modal-container').classList.add('hidden');
    },

    // Management Authentication Modal Prompt
    promptManagementLogin: () => {
        const modalHtml = `
            <div style="max-width:380px; margin:0 auto; padding:10px 4px;">
                <div style="text-align:center; margin-bottom:20px;">
                    <div style="width:56px; height:56px; border-radius:50%; background:#eef2ff; color:#3b82f6; display:inline-flex; align-items:center; justify-content:center; font-size:24px; margin-bottom:12px;">
                        <i class="fas fa-user-shield"></i>
                    </div>
                    <h3 style="margin:0 0 6px 0; color:var(--primary); font-size:18px;">Operations Commander Login</h3>
                    <p style="margin:0; font-size:12.5px; color:var(--text-muted);">Restricted to authorized incident management personnel</p>
                </div>
                <form id="form-mgmt-login" onsubmit="event.preventDefault(); App.handleManagementLogin();">
                    <div class="form-group mb-2">
                        <label style="font-size:12px; font-weight:600; color:var(--text);">Username</label>
                        <input type="text" id="mgmt-login-user" class="form-control" placeholder="admin" autocomplete="username" required>
                    </div>
                    <div class="form-group mb-2">
                        <label style="font-size:12px; font-weight:600; color:var(--text);">Password</label>
                        <input type="password" id="mgmt-login-pass" class="form-control" placeholder="Enter password" autocomplete="current-password" required>
                    </div>
                    <div id="mgmt-login-error" style="display:none; color:#dc2626; font-size:12px; margin-bottom:12px; background:#fef2f2; padding:8px 10px; border-radius:4px; border:1px solid #fecaca;">
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
                        <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary" id="btn-submit-mgmt-login">
                            <i class="fas fa-sign-in-alt"></i> Authenticate
                        </button>
                    </div>
                </form>
            </div>
        `;
        App.showModal(modalHtml);
        setTimeout(() => {
            const input = document.getElementById('mgmt-login-user');
            if (input) input.focus();
        }, 100);
    },

    handleManagementLogin: async () => {
        const userEl = document.getElementById('mgmt-login-user');
        const passEl = document.getElementById('mgmt-login-pass');
        const errEl = document.getElementById('mgmt-login-error');
        const submitBtn = document.getElementById('btn-submit-mgmt-login');

        const username = userEl ? userEl.value.trim() : '';
        const password = passEl ? passEl.value : '';

        if (!username || !password) {
            if (errEl) {
                errEl.textContent = 'Please enter both username and password.';
                errEl.style.display = 'block';
            }
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        }

        try {
            const res = await ApiBridge.login(username, password);
            if (res.ok && res.data && res.data.success && res.data.token) {
                sessionStorage.setItem('mgmtToken', res.data.token);
                App.closeModal();
                App.setRole('management');
                App.showToast('Authentication successful. Welcome, Operations Commander.', 'success');
            } else {
                if (errEl) {
                    errEl.textContent = (res.data && res.data.message) || 'Invalid credentials. Access denied.';
                    errEl.style.display = 'block';
                }
            }
        } catch (e) {
            if (errEl) {
                errEl.textContent = 'Network or bridge error during authentication.';
                errEl.style.display = 'block';
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Authenticate';
            }
        }
    }
};

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        App.init();
    });
}
