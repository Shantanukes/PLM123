import { authFetch } from '../api/client.js';

export async function renderMembers(container) {
  container.innerHTML = `
    <div class="page-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h2 style="font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0;">Members</h2>
        <p style="color: var(--text-secondary); margin: 4px 0 0 0;">Manage organization members and directories</p>
      </div>
    </div>
      
    <div class="card fade-in">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding: 16px 24px;">
        <h3 class="card-title" style="margin: 0;">Members Directory</h3>
        <div style="display: flex; gap: 8px; align-items: center;">
          <div class="search-box" style="display: flex; align-items: center; border: 1px solid var(--border-light); border-radius: 6px; padding: 6px 12px; background: var(--bg-primary); transition: border-color 0.2s;">
            <span class="material-icons-outlined" style="color: var(--text-muted); font-size: 18px; margin-right: 6px;">search</span>
            <input type="text" id="members-search" placeholder="Search members..." style="border: none; background: transparent; outline: none; width: 140px; color: var(--text-primary); font-family: inherit;" />
          </div>
          <button class="btn btn-outline" id="refresh-members-btn" title="Refresh" style="height: 36px; width: 36px; padding: 0; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons-outlined">refresh</span>
          </button>
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div id="members-content" style="min-height: 200px;">
          <div style="display: flex; align-items: center; justify-content: center; height: 200px;"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  `;

  const contentDiv = document.getElementById('members-content');
  const refreshBtn = document.getElementById('refresh-members-btn');
  const searchInput = document.getElementById('members-search');
  let allMembers = [];

  const loadMembers = async () => {
    contentDiv.innerHTML = '<div style="padding: 40px; text-align: center;"><div class="spinner" style="margin: 0 auto;"></div><div style="margin-top: 12px; color: var(--text-secondary);">Loading members...</div></div>';

    try {
      const res = await authFetch('/api/Members');
      if (res.ok) {
        let rawData = await res.json();

        // Handle varying payload structures
        if (!Array.isArray(rawData)) {
          const possibleArrayKeys = Object.keys(rawData).filter(k => Array.isArray(rawData[k]));
          if (possibleArrayKeys.length > 0) {
            allMembers = rawData[possibleArrayKeys[0]];
          } else {
            allMembers = [rawData];
          }
        } else {
          allMembers = rawData;
        }

        displayMembers(allMembers);
      } else {
        contentDiv.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary);">Failed to load members. Server responded with status ${res.status}.</div>`;
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      contentDiv.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary);">Network error while loading members.</div>`;
    }
  };

  const displayMembers = (membersList) => {
    if (!membersList || membersList.length === 0) {
      contentDiv.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-secondary);">No members found.</div>';
      return;
    }

    // Dynamically extract columns from the first object, excluding 'id' and 'userId'
    const firstObj = membersList[0];
    const columns = Object.keys(firstObj).filter(col => col.toLowerCase() !== 'id' && col.toLowerCase() !== 'userid');

    let html = `
      <div style="overflow-x: auto;">
        <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-light);">
              ${columns.map(col => `<th style="padding: 12px 16px; font-weight: 600; color: var(--text-secondary); text-transform: capitalize; white-space: nowrap;">${col.replace(/([A-Z])/g, ' $1').trim()}</th>`).join('')}
              <th style="padding: 12px 16px; font-weight: 600; color: var(--text-secondary); white-space: nowrap;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${membersList.map((member, i) => `
              <tr style="border-bottom: 1px solid var(--bg-muted);" class="member-row hover-bg">
                ${columns.map(col => {
      let val = member[col];
      const colLower = col.toLowerCase();

      if (colLower === 'role' || colLower === 'roleid') {
        const rMap = { 0: 'None', 1: 'Super Admin', 2: 'Quality Auditor', 3: 'Project Manager', 4: 'COE Head', 5: 'Checker', 6: 'Designer', 7: 'Project Head', 8: 'R&D Head', 'RnDHead': 'R&D Head', 'SuperAdmin': 'Super Admin' };
        let rName = rMap[val] !== undefined ? rMap[val] : String(val).replace(/_/g, ' ');
        rName = typeof rName === 'string' ? rName.replace(/RnD/ig, 'R&D') : rName;
        val = (val !== undefined && val !== null) ? rName : '-';
      } else if (colLower === 'department' || colLower === 'departmentid') {
        const dMap = {
          1: 'R&D / Engineering', 'R_AND_D_Engineering': 'R&D / Engineering', 'R&D / Engineering': 'R&D / Engineering',
          2: 'Quality', 'Quality': 'Quality',
          3: 'SEM', 'SEM': 'SEM',
          4: 'Manufacturing', 'Manufacturing': 'Manufacturing',
          5: 'IT / Systems', 'IT_Systems': 'IT / Systems', 'IT / Systems': 'IT / Systems'
        };
        val = (val !== undefined && val !== null) ? (dMap[val] || String(val).replace(/_/g, ' ')) : '-';
      } else if (val === null || val === undefined) {
        val = '-';
      } else if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        val = new Date(val).toLocaleString();
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      return `<td style="padding: 12px 16px; color: var(--text-primary); white-space: nowrap;">${val}</td>`;
    }).join('')}
                <td style="padding: 12px 16px; white-space: nowrap;">
                  <button class="btn btn-ghost btn-xs edit-member-btn" data-index="${i}" title="Edit Profile" style="color: var(--primary);">
                    <span class="material-icons-outlined" style="font-size: 18px;">edit</span>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    contentDiv.innerHTML = html;

    contentDiv.querySelectorAll('.edit-member-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.dataset.index;
        openEditMemberModal(membersList[idx]);
      });
    });
  };

  const openEditMemberModal = (member) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(4px);';

    const getVal = (k1, k2) => member[k1] !== undefined ? member[k1] : (member[k2] !== undefined ? member[k2] : '');
    const fName = getVal('fullName', 'FullName') || getVal('name', 'Name');
    const eId = getVal('employeeId', 'EmployeeId');

    const dMapRev = { 'R_AND_D_Engineering': 1, 'Quality': 2, 'SEM': 3, 'Manufacturing': 4, 'IT_Systems': 5 };
    const rMapRev = { 'None': 0, 'SuperAdmin': 1, 'Super Admin': 1, 'QualityAuditor': 2, 'Quality Auditor': 2, 'ProjectManager': 3, 'Project Manager': 3, 'COEHead': 4, 'COE Head': 4, 'Checker': 5, 'Designer': 6, 'ProjectHead': 7, 'Project Head': 7, 'R&DHead': 8, 'RnDHead': 8 };

    let dId = getVal('department', 'Department') || getVal('departmentId', 'DepartmentId') || 1;
    if (typeof dId === 'string' && dMapRev[dId]) dId = dMapRev[dId];

    let rId = getVal('role', 'Role') || getVal('roleId', 'RoleId') || 0;
    if (typeof rId === 'string' && rMapRev[rId]) rId = rMapRev[rId];

    overlay.innerHTML = `
      <div class="modal-content card fade-in" style="width: 400px; padding: 24px; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
        <h3 style="margin: 0 0 16px 0;">Edit Member Details</h3>
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="display:block;margin-bottom:4px;font-size:13px;font-weight:600;">Full Name <span style="color:#DC2626">*</span></label>
          <input type="text" id="mem-fullname" class="form-input" style="width:100%;" value="${fName}" />
        </div>
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="display:block;margin-bottom:4px;font-size:13px;font-weight:600;">Employee ID</label>
          <input type="text" id="mem-empid" class="form-input" style="width:100%;" value="${eId}" placeholder="e.g. EMP-101" />
        </div>
        <div class="form-group" style="margin-bottom: 24px;">
          <label style="display:block;margin-bottom:4px;font-size:13px;font-weight:600;">Department <span style="color:#DC2626">*</span></label>
          <select class="form-select" id="mem-dept" style="width:100%;">
            <option value="1" ${dId == 1 ? 'selected' : ''}>R&D / Engineering</option>
            <option value="2" ${dId == 2 ? 'selected' : ''}>Quality</option>
            <option value="4" ${dId == 4 ? 'selected' : ''}>Manufacturing</option>
            <option value="3" ${dId == 3 ? 'selected' : ''}>SEM</option>
            <option value="5" ${dId == 5 ? 'selected' : ''}>IT / Systems</option>
          </select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="btn btn-outline" id="mem-cancel">Cancel</button>
          <button class="btn btn-primary" id="mem-save">Save Profile</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('mem-cancel').addEventListener('click', () => overlay.remove());

    document.getElementById('mem-save').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const fullName = document.getElementById('mem-fullname').value.trim();
      const empId = document.getElementById('mem-empid').value.trim() || null;
      const dept = parseInt(document.getElementById('mem-dept').value, 10);

      if (!fullName || isNaN(dept)) {
        if (window.showToast) window.showToast('Full name and valid department ID are required.', 'warning');
        return;
      }

      const payload = {
        fullName,
        employeeId: empId,
        department: dept
      };

      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const res = await authFetch('/api/Members/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          if (window.showToast) window.showToast('Profile updated successfully!', 'success');
          overlay.remove();
          loadMembers(); // Refresh the directory
        } else {
          if (window.showToast) window.showToast('Failed to update profile. Status ' + res.status, 'error');
          btn.disabled = false;
          btn.textContent = 'Save Profile';
        }
      } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Network error while updating profile.', 'error');
        btn.disabled = false;
        btn.textContent = 'Save Profile';
      }
    });
  };

  refreshBtn?.addEventListener('click', loadMembers);

  searchInput?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allMembers.filter(m => {
      return Object.values(m).some(val =>
        val !== null && val !== undefined && String(val).toLowerCase().includes(term)
      );
    });
    displayMembers(filtered);
  });

  // Initial load
  loadMembers();
}
