import { showToast, showModal } from '../main.js';
import { authFetch } from '../api/client.js';

export function renderAdmin(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Administrative Console</h1>
        <p>Manage users, roles, system integrations, and audit trail.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline btn-sm" id="btn-audit-log">
          <span class="material-icons-outlined" style="font-size:16px">history_edu</span>Full Audit Log
        </button>
        <button class="btn btn-primary btn-sm" id="btn-invite">
          <span class="material-icons-outlined" style="font-size:16px">person_add</span>Invite User
        </button>
      </div>
    </div>

    <div class="tabs" id="admin-tabs">
      <button class="tab-btn active" data-tab="users">Users & Roles</button>
      <button class="tab-btn" data-tab="integrations">Integrations</button>
      <button class="tab-btn" data-tab="audit">Audit Trail</button>
      <button class="tab-btn" data-tab="settings">System Settings</button>
    </div>

    <div id="admin-tab-content"></div>
  `;

  container.querySelectorAll('#admin-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#admin-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAdminTab(container.querySelector('#admin-tab-content'), btn.dataset.tab);
    });
  });

  container.querySelector('#btn-invite')?.addEventListener('click', () => {
    showModal('Invite New User',
      `<div class="grid-2" style="gap:16px">
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Full Name <span style="color:#DC2626">*</span></label><input class="form-input" id="inv-name" placeholder="e.g. Suresh Iyer" /></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Employee ID <span style="color:#DC2626">*</span></label><input class="form-input" id="inv-empid" placeholder="e.g. KG-10045" /></div>
        <div class="form-group"><label class="form-label">Email Address <span style="color:#DC2626">*</span></label><input class="form-input" id="inv-email" type="email" placeholder="suresh.iyer@kineticgreen.com" /></div>
        <div class="form-group"><label class="form-label">Role / Access Profile</label>
          <select class="form-select" id="inv-role">
            <option value="0">None</option><option value="8">R&D Head</option><option value="7">Project Head</option><option value="6">Designer</option><option value="5">Checker</option><option value="4">COE Head</option><option value="3">Project Manager</option><option value="2">Quality Auditor</option><option value="1">Super Admin</option>
          </select></div>
        <div class="form-group"><label class="form-label">Department</label>
          <select class="form-select" id="inv-dept"><option value="1">R&D / Engineering</option><option value="2">Quality</option><option value="4">Manufacturing</option><option value="3">SEM</option><option value="5">IT / Systems</option></select></div>
       </div>`,
      `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
       <button class="btn btn-primary" id="send-invite">Send Invite</button>`
    );
    setTimeout(() => {
      document.getElementById('send-invite')?.addEventListener('click', async () => {
        const name = document.getElementById('inv-name')?.value?.trim();
        const empId = document.getElementById('inv-empid')?.value?.trim();
        const email = document.getElementById('inv-email')?.value?.trim();
        const role = parseInt(document.getElementById('inv-role')?.value ?? '0', 10);
        const department = parseInt(document.getElementById('inv-dept')?.value ?? '1', 10);
        if (!name || !email || !empId) return showToast('Full Name, Employee ID and Email are required', 'error');
        try {
          const res = await authFetch('/api/Members/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName: name, email, employeeId: empId, role, department })
          });
          document.querySelector('.modal-overlay')?.remove();
          if (res.ok) {
            showToast(`Invite sent to ${email}. Account will be activated on first login.`, 'success');
          } else {
            const errText = await res.text().catch(() => '');
            showToast(`Failed to send invite. ${errText}`, 'error');
          }
        } catch (err) {
          console.error('Error sending invite:', err);
          showToast('Network error while sending invite.', 'error');
        }
      });
    }, 50);
  });

  container.querySelector('#btn-audit-log')?.addEventListener('click', () => {
    container.querySelectorAll('#admin-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'audit'));
    renderAdminTab(container.querySelector('#admin-tab-content'), 'audit');
  });

  renderAdminTab(container.querySelector('#admin-tab-content'), 'users');
}

function renderAdminTab(tc, tab) {
  if (tab === 'users') renderUsers(tc);
  else if (tab === 'integrations') renderIntegrations(tc);
  else if (tab === 'audit') renderAudit(tc);
  else renderSettings(tc);
}

function renderUsers(tc) {
  tc.innerHTML = `
    <div class="grid-main-sidebar">
      <div class="card">
        <div class="card-header" style="flex-wrap: wrap; gap: 12px;">
          <div class="card-title">Team Members (Authorized System Users)</div>
          <div style="display:flex;gap:8px;align-items:center;margin-left:auto;">
            <div style="display:flex; background:var(--bg-white); border:1px solid var(--border-light); border-radius:16px; padding:2px 12px; align-items:center; height: 32px; box-sizing: border-box;">
              <span class="material-icons-outlined" style="font-size:16px; color:var(--text-secondary);">search</span>
              <input type="number" id="team-search-id" placeholder="Search by Team ID..." style="border:none; outline:none; background:transparent; padding:0 8px; font-size:0.857rem; width:140px; color:var(--text-primary);">
              <button id="btn-team-search" style="border:none; background:transparent; color:var(--brand-primary); font-weight:500; cursor:pointer; font-size:0.857rem; padding:0; outline:none;">Search</button>
            </div>
            <button class="btn btn-outline btn-sm" id="btn-refresh-teams" title="Reload all teams" style="display:flex;align-items:center;height:32px;padding:0 8px">
              <span class="material-icons-outlined" style="font-size:16px">refresh</span>
            </button>
            <button class="btn btn-primary btn-sm" id="btn-create-team" style="height:32px;">
              <span class="material-icons-outlined" style="font-size:16px">add</span>Create Team
            </button>
          </div>
        </div>
        <div class="card-body no-pad">
          <table class="data-table">
            <thead>
              <tr>
                <th style="text-align: left; padding: 12px 20px; width: 80px;">ID</th>
                <th style="text-align: left; padding: 12px 20px;">Team Name</th>
                <th style="text-align: left; padding: 12px 20px;">Description</th>
                <th style="text-align: right; padding: 12px 20px;">Actions</th>
              </tr>
            </thead>
            <tbody id="team-table-body">
              <tr><td colspan="4" style="text-align:center;padding:20px">Loading teams...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:20px">
        <div class="card">
          <div class="card-header"><div class="card-title">Team Stats</div></div>
          <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:10px" id="team-stats">
              Loading stats...
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const displayTeams = (teamsList) => {
    const tbody = tc.querySelector('#team-table-body');
    if (teamsList && teamsList.length > 0) {
      tbody.innerHTML = teamsList.map(t => `
        <tr class="user-row">
          <td style="padding: 12px 20px; font-family: var(--font-mono); font-size: 0.857rem; color: var(--brand-primary); font-weight: 600;">${t.id}</td>
          <td style="padding: 12px 20px;" class="font-medium">${t.name || 'Unnamed Team'}</td>
          <td style="padding: 12px 20px;" class="text-sm">${t.description || 'No description'}</td>
          <td style="padding: 12px 20px; text-align: right; white-space: nowrap;">
            <button class="btn btn-ghost btn-xs view-team-btn" data-id="${t.id}" title="View Details">
              <span class="material-icons-outlined" style="font-size:16px">visibility</span>
            </button>
            <button class="btn btn-ghost btn-xs delete-team-btn" data-id="${t.id}" title="Delete Team" style="color:#DC2626">
              <span class="material-icons-outlined" style="font-size:16px">delete</span>
            </button>
          </td>
        </tr>`).join('');

      const openTeamModal = async (teamId) => {
        try {
          const [res, memRes] = await Promise.all([
            authFetch('/api/Teams/' + teamId),
            authFetch('/api/Members')
          ]);
          if (res.ok && memRes.ok) {
            const members = await res.json();
            const membersList = Array.isArray(members) ? members : (members.members || [members]);

            let rawAllMembers = await memRes.json();
            let allMembers = [];
            if (!Array.isArray(rawAllMembers)) {
              const possibleArrayKeys = Object.keys(rawAllMembers).filter(k => Array.isArray(rawAllMembers[k]));
              if (possibleArrayKeys.length > 0) {
                allMembers = rawAllMembers[possibleArrayKeys[0]];
              } else {
                allMembers = [rawAllMembers];
              }
            } else {
              allMembers = rawAllMembers;
            }

            const dMap = {
              1: 'R&D / Engineering', 'R_AND_D_Engineering': 'R&D / Engineering', 'R&D / Engineering': 'R&D / Engineering',
              2: 'Quality', 'Quality': 'Quality',
              3: 'SEM', 'SEM': 'SEM',
              4: 'Manufacturing', 'Manufacturing': 'Manufacturing',
              5: 'IT / Systems', 'IT_Systems': 'IT / Systems', 'IT / Systems': 'IT / Systems'
            };

            const memberOptions = allMembers.map(m => {
              const id = m.id || m.userId;
              const name = m.fullName || m.FullName || m.name || m.Name || m.userName || m.UserName || 'Unknown';
              let dept = m.department || m.Department || m.departmentId || m.DepartmentId;
              dept = dMap[dept] || dept || 'No Department';
              return `<option value="${id}">${name} - ${dept}</option>`;
            }).join('');

            let membersHTML = '';
            if (membersList && membersList.length > 0 && membersList[0].userName) {
              membersHTML = `
                <div style="max-height: 400px; overflow-y: auto;">
                  <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                    <thead>
                      <tr style="border-bottom: 1px solid var(--border-light);">
                        <th style="padding: 10px; font-weight: 600; color: var(--text-secondary);">Name</th>
                        <th style="padding: 10px; font-weight: 600; color: var(--text-secondary);">Email</th>
                        <th style="padding: 10px; font-weight: 600; color: var(--text-secondary);">Role</th>
                        <th style="padding: 10px; font-weight: 600; color: var(--text-secondary);">Joined At</th>
                        <th style="padding: 10px; font-weight: 600; color: var(--text-secondary); text-align: right;">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${membersList.map(m => {
                const rMap = { 0: 'None', 1: 'Super Admin', 2: 'Quality Auditor', 3: 'Project Manager', 4: 'COE Head', 5: 'Checker', 6: 'Designer', 7: 'Project Head', 8: 'R&D Head', 'RnDHead': 'R&D Head', 'SuperAdmin': 'Super Admin' };
                let rName = rMap[m.role] !== undefined ? rMap[m.role] : String(m.role).replace(/_/g, ' ');
                rName = typeof rName === 'string' ? rName.replace(/RnD/ig, 'R&D') : rName;
                const roleDisplay = m.role !== undefined && m.role !== null ? rName : 'N/A';
                return `
                        <tr style="border-bottom: 1px solid var(--bg-muted);">
                          <td style="padding: 10px;" class="font-medium">${m.userName || 'N/A'}</td>
                          <td style="padding: 10px;" class="text-sm">${m.userEmail || 'N/A'}</td>
                          <td style="padding: 10px;"><span class="tag tag-green">${roleDisplay}</span></td>
                          <td style="padding: 10px;" class="text-xs text-secondary">${m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'N/A'}</td>
                          <td style="padding: 10px; text-align: right;">
                            <button class="btn btn-ghost btn-xs remove-member-btn" data-userid="${m.userId || m.id}" title="Remove Member" style="color:#DC2626">
                              <span class="material-icons-outlined" style="font-size:16px">delete</span>
                            </button>
                          </td>
                        </tr>
                      `;
              }).join('')}
                    </tbody>
                  </table>
                </div>
              `;
            } else {
              membersHTML = '<div style="padding: 30px; text-align: center; color: var(--text-secondary);">No members found in this team.</div>';
            }

            const addMemberHTML = `
              <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-light);">
                <h4 style="margin-bottom: 12px; font-size: 14px; font-weight: 600; color: var(--text-primary);">Add New Member</h4>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <select id="new-member-user-id" class="form-input" style="flex: 1; padding: 6px 12px; min-width: 0; min-height: 36px;">
                    <option value="" disabled selected>Select User</option>
                    ${memberOptions}
                  </select>
                  <select id="new-member-role-id" class="form-input" style="flex: 1; padding: 6px 12px; min-width: 0; min-height: 36px;">
                    <option value="" disabled selected>Select Role</option>
                    <option value="0">None</option>
                    <option value="8">R&D Head</option>
                    <option value="7">Project Head</option>
                    <option value="6">Designer</option>
                    <option value="5">Checker</option>
                    <option value="4">COE Head</option>
                    <option value="3">Project Manager</option>
                    <option value="2">Quality Auditor</option>
                    <option value="1">Super Admin</option>
                  </select>
                  <button class="btn btn-primary" id="btn-add-member" style="white-space: nowrap;">Add Member</button>
                </div>
              </div>
            `;

            showModal('Team Members',
              `<div style="display:flex; flex-direction:column; gap:16px;">
                <div class="text-sm">Showing members for Team ID: <strong style="font-family:var(--font-mono); color:var(--text-primary);">${teamId}</strong></div>
                ${membersHTML}
                ${addMemberHTML}
               </div>`,
              `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Close</button>`
            );

            setTimeout(() => {
              const btnAdd = document.getElementById('btn-add-member');
              if (btnAdd) {
                btnAdd.addEventListener('click', async () => {
                  const userIdStr = document.getElementById('new-member-user-id')?.value;
                  const roleStr = document.getElementById('new-member-role-id')?.value;

                  if (!userIdStr || !roleStr) {
                    return showToast('Please enter User ID and select a Role', 'warning');
                  }

                  try {
                    const addRes = await authFetch('/api/Teams/' + teamId + '/members', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: parseInt(userIdStr, 10), role: parseInt(roleStr, 10) })
                    });

                    if (addRes.ok) {
                      showToast('Member added successfully', 'success');
                      document.querySelector('.modal-overlay')?.remove();
                      openTeamModal(teamId);
                    } else {
                      const errText = await addRes.text().catch(() => '');
                      showToast('Failed to add member: ' + errText, 'error');
                    }
                  } catch (e) {
                    console.error('Error adding member', e);
                    showToast('Network error while adding member', 'error');
                  }
                });
              }

              document.querySelectorAll('.remove-member-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                  const targetUserId = btn.dataset.userid;
                  if (!targetUserId || targetUserId === 'undefined') return showToast('No User ID available for this member.', 'error');

                  if (!confirm(`Are you sure you want to remove member (User ID: ${targetUserId}) from the team?`)) return;

                  try {
                    const removeRes = await authFetch(`/api/Teams/${teamId}/members/${targetUserId}`, { method: 'DELETE' });
                    if (removeRes.ok) {
                      showToast('Member removed successfully', 'success');
                      document.querySelector('.modal-overlay')?.remove();
                      openTeamModal(teamId);
                    } else {
                      const errText = await removeRes.text().catch(() => '');
                      showToast('Failed to remove member: ' + errText, 'error');
                    }
                  } catch (e) {
                    console.error('Error removing member:', e);
                    showToast('Network error while removing member', 'error');
                  }
                });
              });
            }, 50);

          } else {
            showToast('Failed to load team members.', 'error');
          }
        } catch (err) {
          console.error('Error fetching team members:', err);
          showToast('Error loading team members.', 'error');
        }
      };

      tc.querySelectorAll('.view-team-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const teamId = btn.dataset.id;
          if (!teamId || teamId === 'undefined') return showToast('No ID available for this team.', 'error');
          openTeamModal(teamId);
        });
      });

      tc.querySelectorAll('.delete-team-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const teamId = btn.dataset.id;
          if (!teamId || teamId === 'undefined') return showToast('No ID available for this team.', 'error');

          if (!confirm(`Are you sure you want to delete team ID ${teamId}?`)) return;

          try {
            const res = await authFetch('/api/Teams/' + teamId, { method: 'DELETE' });
            if (res.ok) {
              showToast(`Team ${teamId} deleted successfully.`, 'success');
              // Using document query in case tc context doesn't work after re-render, though loadTeams binds properly
              if (typeof loadTeams === 'function') {
                loadTeams();
              } else {
                document.getElementById('btn-refresh-teams')?.click();
              }
            } else {
              const errMsg = await res.text().catch(() => '');
              showToast(`Failed to delete team. ${errMsg}`, 'error');
            }
          } catch (err) {
            console.error('Error deleting team:', err);
            showToast('Network error while deleting team.', 'error');
          }
        });
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px">No teams found.</td></tr>';
    }
  };

  const loadTeams = async () => {
    try {
      const res = await authFetch('/api/Teams');
      const teams = await res.json();
      displayTeams(teams);
      tc.querySelector('#team-stats').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="text-sm text-secondary">Total Teams</span>
          <span style="font-weight:700;color:#2563EB">${teams.length || 0}</span>
        </div>`;
    } catch (err) {
      tc.querySelector('#team-table-body').innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#DC2626">Failed to load teams.</td></tr>';
      console.error('Error fetching teams:', err);
    }
  };

  tc.querySelector('#btn-team-search')?.addEventListener('click', async () => {
    const searchId = tc.querySelector('#team-search-id')?.value?.trim();
    if (!searchId) {
      return showToast('Please enter a team ID to search', 'warning');
    }

    const tbody = tc.querySelector('#team-table-body');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px">Searching for team...</td></tr>';

    try {
      const res = await authFetch('/api/Teams/' + searchId);
      if (res.ok) {
        const team = await res.json();
        if (team) {
          displayTeams([team]);
          showToast('Found team successfully', 'success');
        } else {
          tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px">No team found with ID: ${searchId}</td></tr>`;
        }
      } else if (res.status === 404) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#DC2626">Team with ID ${searchId} not found.</td></tr>`;
        showToast('Team not found', 'error');
      } else {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#DC2626">Failed to retrieve team (Status: ${res.status}).</td></tr>`;
        showToast('Error searching team', 'error');
      }
    } catch (err) {
      console.error('Error searching team:', err);
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#DC2626">Failed to search team due to network error.</td></tr>';
      showToast('Network error while searching team', 'error');
    }
  });

  tc.querySelector('#team-search-id')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      tc.querySelector('#btn-team-search')?.click();
    }
  });

  tc.querySelector('#btn-refresh-teams')?.addEventListener('click', () => {
    const input = tc.querySelector('#team-search-id');
    if (input) input.value = '';
    loadTeams();
  });

  loadTeams();

  tc.querySelector('#btn-create-team')?.addEventListener('click', () => {
    showModal('Create New Team',
      `<div class="grid-1" style="gap:16px">
        <div class="form-group"><label class="form-label">Team Name <span style="color:#DC2626">*</span></label><input class="form-input" id="team-name" placeholder="e.g. Product Engineering" /></div>
        <div class="form-group"><label class="form-label">Description <span style="color:#DC2626">*</span></label><textarea class="form-input" id="team-desc" rows="3" placeholder="Enter team description..."></textarea></div>
       </div>`,
      `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
       <button class="btn btn-primary" id="save-team">Create Team</button>`
    );
    setTimeout(() => {
      document.getElementById('save-team')?.addEventListener('click', async () => {
        const name = document.getElementById('team-name')?.value;
        const description = document.getElementById('team-desc')?.value;
        if (!name || !description) return showToast('Name and description are required', 'error');

        try {
          const res = await authFetch('/api/Teams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
          });
          if (res.ok) {
            document.querySelector('.modal-overlay')?.remove();
            showToast('Team created successfully', 'success');
            loadTeams();
          } else {
            showToast('Failed to create team. Ensure valid data.', 'error');
          }
        } catch (err) {
          showToast('Network error while creating team', 'error');
          console.error('Error creating team:', err);
        }
      });
    }, 50);
  });
}


function renderIntegrations(tc) {
  const integrations = [
    { name: 'SAP ERP Connector (REST API)', icon: 'account_balance', status: 'online', lastSync: '2 min ago', endpoint: 'https://sap-api.kineticgreen.internal/v1', desc: 'Syncs BOM cost rollups, purchase orders, and part master data to SAP S/4HANA.' },
    { name: 'GitHub CI/CD Webhook', icon: 'code', status: 'online', lastSync: 'Just now', endpoint: 'https://api.github.com/repos/kg-fw/webhooks', desc: 'Triggers on firmware releases — auto-creates SW parts and links binaries to PLM.' },
    { name: 'Fleet Management API', icon: 'directions_car', status: 'offline', lastSync: '2h ago', endpoint: 'https://fleet.kineticgreen.com/api/v2', desc: 'VIN-level As-Built BOM sync and OTA deployment status tracking.' },
    { name: 'Jira / Issue Tracker', icon: 'bug_report', status: 'online', lastSync: '15 min ago', endpoint: 'https://kineticgreen.atlassian.net/rest', desc: 'Links Jira tickets to ECRs and syncs resolution status automatically.' },
    { name: 'SMTP Email Notifications', icon: 'email', status: 'online', lastSync: 'Active', endpoint: 'smtp.kineticgreen.com:587', desc: 'Sends workflow notifications, SLA alerts, and approval requests via email.' },
  ];

  tc.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      ${integrations.map(i => `
        <div class="card">
          <div class="card-body" style="padding:16px 20px">
            <div style="display:flex;align-items:flex-start;gap:16px">
              <div class="kpi-icon ${i.status === 'online' ? 'green' : 'red'}" style="flex-shrink:0">
                <span class="material-icons-outlined">${i.icon}</span>
              </div>
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
                  <div class="font-bold">${i.name}</div>
                  <div style="width:8px;height:8px;border-radius:50%;background:${i.status === 'online' ? '#10B981' : '#DC2626'}"></div>
                  <span style="font-size:0.786rem;color:${i.status === 'online' ? '#10B981' : '#DC2626'};font-weight:600">${i.status.toUpperCase()}</span>
                </div>
                <div style="font-size:0.857rem;color:var(--text-secondary);margin-bottom:6px">${i.desc}</div>
                <div style="display:flex;gap:16px;font-size:0.714rem;color:var(--text-tertiary)">
                  <span>Endpoint: <span style="font-family:var(--font-mono)">${i.endpoint}</span></span>
                  <span>Last sync: ${i.lastSync}</span>
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-shrink:0">
                <button class="btn btn-ghost btn-xs test-conn-btn" data-name="${i.name}" data-status="${i.status}">Test</button>
                <button class="btn btn-outline btn-xs">Configure</button>
                ${i.status === 'offline' ? `<button class="btn btn-primary btn-xs reconnect-btn" data-name="${i.name}">Reconnect</button>` : ''}
              </div>
            </div>
          </div>
        </div>`).join('')}
    </div>`;

  tc.querySelectorAll('.test-conn-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast(`Testing connection to ${btn.dataset.name}…`, 'info');
      setTimeout(() => {
        if (btn.dataset.status === 'online') showToast(`${btn.dataset.name}: Connection OK — 42ms latency`, 'success');
        else showToast(`${btn.dataset.name}: Connection failed — timeout after 30s`, 'error');
      }, 1500);
    });
  });

  tc.querySelectorAll('.reconnect-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast(`Attempting to reconnect ${btn.dataset.name}…`, 'info');
      setTimeout(() => showToast(`Reconnection failed. Check network configuration or contact IT.`, 'error'), 2000);
    });
  });
}

function renderAudit(tc) {
  const events = [
    { time: '06-Apr-2026 13:05', user: 'Rohit Agarwal', action: 'APPROVE', entity: 'Part GA151002', ip: '192.168.1.10' },
    { time: '06-Apr-2026 12:40', user: 'Priya Mehta', action: 'UPLOAD', entity: 'DRW-52-BA152002-RevB', ip: '192.168.1.22' },
    { time: '06-Apr-2026 11:15', user: 'Vikram Thakur', action: 'DEPLOY OTA', entity: 'BMS FW v2.3.1 — 5% fleet', ip: '192.168.1.33' },
    { time: '06-Apr-2026 10:30', user: 'Amit Kumar', action: 'LOGIN', entity: 'System', ip: '192.168.1.18' },
    { time: '06-Apr-2026 09:45', user: 'Rohit Agarwal', action: 'RAISE ECR', entity: 'KG-ECR-2026-0047', ip: '192.168.1.10' },
    { time: '05-Apr-2026 17:22', user: 'Sanjay Ghosh', action: 'CLOSE ECN', entity: 'KG-ECN-2026-0031', ip: '192.168.1.25' },
    { time: '05-Apr-2026 16:00', user: 'Neha Nair', action: 'CREATE PART', entity: 'ASSY-GA1-05-Z Rev A', ip: '192.168.1.29' },
    { time: '05-Apr-2026 14:32', user: 'Priya Mehta', action: 'SUBMIT REVIEW', entity: 'GA152002 Rev A', ip: '192.168.1.22' },
  ];

  const actionColor = { APPROVE: '#059669', UPLOAD: '#2563EB', LOGIN: '#6B7280', 'RAISE ECR': '#D97706', 'CLOSE ECN': '#7C3AED', 'CREATE PART': '#2563EB', 'SUBMIT REVIEW': '#F59E0B', 'DEPLOY OTA': '#059669' };

  tc.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><span class="material-icons-outlined">manage_history</span>System Audit Trail</div>
        <div style="display:flex;gap:8px">
          <select class="form-select" style="width:150px;padding:6px 10px" id="audit-action-filter">
            <option value="">All Actions</option><option>APPROVE</option><option>UPLOAD</option><option>LOGIN</option><option>RAISE ECR</option><option>DEPLOY OTA</option>
          </select>
          <button class="btn btn-outline btn-sm" id="export-audit">
            <span class="material-icons-outlined" style="font-size:16px">download</span>Export
          </button>
        </div>
      </div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity / Target</th><th>IP Address</th></tr></thead>
          <tbody id="audit-body">
            ${events.map(e => `
              <tr class="audit-row">
                <td class="text-secondary text-xs" style="font-family:var(--font-mono)">${e.time}</td>
                <td class="text-sm font-medium">${e.user}</td>
                <td><span class="tag" style="border-color:${actionColor[e.action] || '#6B7280'};color:${actionColor[e.action] || '#6B7280'};font-family:var(--font-mono);font-size:0.714rem">${e.action}</span></td>
                <td class="text-sm">${e.entity}</td>
                <td class="text-xs" style="font-family:var(--font-mono);color:var(--text-tertiary)">${e.ip}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  tc.querySelector('#audit-action-filter')?.addEventListener('change', (e) => {
    const q = e.target.value;
    tc.querySelectorAll('.audit-row').forEach(row => {
      row.style.display = !q || row.textContent.includes(q) ? '' : 'none';
    });
  });

  tc.querySelector('#export-audit')?.addEventListener('click', () => {
    showToast('Exporting audit log (last 30 days) to Excel…', 'info');
    setTimeout(() => showToast('Audit log exported!', 'success'), 1500);
  });
}

function renderSettings(tc) {
  tc.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Part Numbering Configuration</div></div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Next Sequence Number</label><input class="form-input" value="001" type="number" /></div>
          <div class="form-group"><label class="form-label">Default Dev Status</label><select class="form-select"><option>X — Concept</option><option>Y — Pilot</option><option>Z — Production</option></select></div>
          <div class="form-group"><label class="form-label">Auto-Generate Drawing Numbers</label>
            <select class="form-select"><option>Yes (auto-increment)</option><option>No (manual)</option></select></div>
          <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="window._st('Part numbering settings saved.','success')">Save Settings</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Workflow SLA Defaults</div></div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Part Release SLA (days)</label><input class="form-input" type="number" value="7" /></div>
          <div class="form-group"><label class="form-label">ECR → ECN SLA (days)</label><input class="form-input" type="number" value="14" /></div>
          <div class="form-group"><label class="form-label">SLA Breach Notification</label><select class="form-select"><option>4 hours before</option><option>8 hours before</option><option>24 hours before</option></select></div>
          <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="window._st('SLA settings saved.','success')">Save Settings</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Notification Settings</div></div>
        <div class="card-body">
          ${[['Email notifications on approval', 'true'], ['SLA breach alerts', 'true'], ['OTA deployment status', 'true'], ['New ECR notifications', 'false']].map(([label, def]) => `
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <span class="text-sm">${label}</span>
                <label class="toggle-switch">
                  <input type="checkbox" ${def === 'true' ? 'checked' : ''} onchange="window._st('Setting updated','info')" />
                  <span class="toggle-track"></span>
                </label>
              </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Compliance & Regulatory</div></div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">AIS-038 Revision</label><select class="form-select"><option>Revision 5 (Latest)</option><option>Revision 4</option></select></div>
          <div class="form-group"><label class="form-label">Default Jurisdiction</label><select class="form-select"><option>IN — India (CMVR)</option><option>EU — Europe (ECE)</option></select></div>
          <div class="form-group"><label class="form-label">OTA Rollback Policy</label><select class="form-select"><option>Automatic rollback on >5% failure</option><option>Manual rollback only</option></select></div>
          <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="window._st('Compliance settings saved.','success')">Save Settings</button>
        </div>
      </div>
    </div>`;
  window._st = showToast;
}
