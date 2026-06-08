import { showToast, showModal, navigateTo } from '../main.js';
import { authFetch } from '../api/client.js';

export function renderChangeManagement(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Engineering Change Management</h1>
        <p>Manage ECR → ECN → ECN-Eng workflows with automated impact analysis.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline btn-sm" id="btn-impact">
          <span class="material-icons-outlined" style="font-size:16px">analytics</span>Impact Analysis
        </button>
        <button class="btn btn-primary btn-sm" id="btn-new-ecr">
          <span class="material-icons-outlined" style="font-size:16px">add</span>Raise ECR
        </button>
        <button class="btn btn-primary btn-sm" id="btn-new-ecn" style="margin-left: 8px;">
          <span class="material-icons-outlined" style="font-size:16px">add</span>Raise ECN
        </button>
      </div>
    </div>

    <div class="tabs" id="change-tabs">
      <button class="tab-btn active" data-tab="kanban">Kanban Board</button>
      <button class="tab-btn" data-tab="ecr-list">ECR List</button>
      <button class="tab-btn" data-tab="ecn-list">ECN List</button>
      <button class="tab-btn" data-tab="ecn-eng">ECN-Eng Log</button>
      <button class="tab-btn" data-tab="new-ecr">Raise ECR</button>
      <button class="tab-btn" data-tab="new-ecn">Raise ECN</button>
    </div>

    <div id="change-tab-content"></div>
  `;

  container.querySelectorAll('#change-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#change-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderChangeTab(container.querySelector('#change-tab-content'), btn.dataset.tab);
    });
  });

  container.querySelector('#btn-new-ecr')?.addEventListener('click', () => {
    container.querySelectorAll('#change-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'new-ecr'));
    renderChangeTab(container.querySelector('#change-tab-content'), 'new-ecr');
  });

  container.querySelector('#btn-new-ecn')?.addEventListener('click', () => {
    container.querySelectorAll('#change-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'new-ecn'));
    renderChangeTab(container.querySelector('#change-tab-content'), 'new-ecn');
  });

  container.querySelector('#btn-impact')?.addEventListener('click', () => {
    runImpactAnalysis();
  });

  renderChangeTab(container.querySelector('#change-tab-content'), 'kanban');
}

function renderChangeTab(tc, tab) {
  if (tab === 'kanban') renderKanban(tc);
  else if (tab === 'ecr-list') renderECRList(tc);
  else if (tab === 'ecn-list') renderECNList(tc);
  else if (tab === 'ecn-eng') renderECNEng(tc);
  else if (tab === 'new-ecr') renderNewECRForm(tc);
  else if (tab === 'new-ecn') renderNewECNForm(tc);
}

const KANBAN_DATA = {
  'ECR Draft': [
    { id: 'KG-ECR-2026-0051', title: 'Side Stand Sensor Improvement', priority: 'low', assignee: 'RS', color: '#6B7280' },
    { id: 'KG-ECR-2026-0052', title: 'Alternative Wheel Supplier Qualification', priority: 'medium', assignee: 'PM', color: '#2563EB' },
  ],
  'Impact Analysis': [
    { id: 'KG-ECR-2026-0047', title: 'BMS PCB Overheating Fix — Safar Smart', priority: 'high', assignee: 'AK', color: '#059669' },
  ],
  'ECN Review': [
    { id: 'KG-ECR-2026-0043', title: 'Motor Control Unit Upgrade — Zulu', priority: 'high', assignee: 'NN', color: '#7C3AED' },
  ],
  'Implementation': [
    { id: 'KG-ECN-2026-0035', title: 'Safar Shakti Harness Revision', priority: 'medium', assignee: 'VT', color: '#D97706' },
    { id: 'KG-ECN-2026-0038', title: 'E-Luna Prime Display Swap', priority: 'high', assignee: 'SG', color: '#2563EB' },
  ],
  'Closed': [
    { id: 'KG-ECN-2026-0031', title: 'Safar Smart Wiring Update', priority: 'closed', assignee: 'SG', color: '#059669' },
    { id: 'KG-ECN-2026-0028', title: 'K-Star BMS Firmware v2.0 Release', priority: 'closed', assignee: 'VT', color: '#059669' },
  ],
};

const PRIORITY_MAP = { critical: 'badge-priority-critical', high: 'badge-priority-high', medium: 'badge-priority-medium', low: 'badge-priority-low', closed: 'badge-released' };
const PRIORITY_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', closed: 'Completed' };

async function renderKanban(tc) {
  tc.innerHTML = '<div style="padding: 40px; text-align: center;"><div class="spinner" style="margin: 0 auto;"></div><div style="margin-top: 12px; color: var(--text-secondary);">Loading Kanban board...</div></div>';

  let kanbanData = {};
  try {
    const res = await authFetch('/api/Changes/kanban');
    if (res.ok) {
      kanbanData = await res.json();
    } else {
      tc.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary);">Failed to load Kanban board. Server responded with status ${res.status}.</div>`;
      return;
    }
  } catch (error) {
    console.error('Error fetching kanban data:', error);
    tc.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary);">Network error while loading Kanban board.</div>`;
    return;
  }

  tc.innerHTML = `
    <div class="kanban-board" style="overflow-x: auto; display: flex; gap: 16px; padding-bottom: 16px;">
      ${Object.entries(kanbanData).map(([col, cards]) => {
    const cardArray = Array.isArray(cards) ? cards : [];
    return `
        <div class="kanban-column" style="min-width: 300px;">
          <div class="kanban-col-header">
            <div class="kanban-col-title" style="text-transform: capitalize;">${col.replace(/([A-Z])/g, ' $1').trim()}</div>
            <div class="kanban-col-count">${cardArray.length}</div>
          </div>
          <div class="kanban-col-body" data-col="${col}">
            ${cardArray.map(c => {
      const cid = c.id || c.changeId || c.ticketId || c.number || c.key || '';
      const ctitle = c.title || c.summary || c.description || c.name || JSON.stringify(c);
      const cpriority = (c.priority || c.severity || 'medium').toLowerCase();
      const cassignee = c.assignee || c.assignedTo || c.owner || 'Unassigned';
      const ccolor = c.color || '#6B7280';
      const prioClass = PRIORITY_MAP[cpriority] || 'badge-priority-medium';
      const prioLabel = PRIORITY_LABEL[cpriority] || cpriority;

      return `
              <div class="kanban-card" data-ecr-id="${cid}">
                ${cid ? `<div class="kanban-card-id">${cid}</div>` : ''}
                <div class="kanban-card-title">${ctitle}</div>
                <span class="badge ${prioClass} badge-sm">${prioLabel}</span>
                <div class="kanban-card-footer">
                  <div class="kanban-card-assignee">
                    <div class="kanban-card-assignee-avatar" style="background:${ccolor}">${cassignee.substring(0, 2).toUpperCase()}</div>
                    ${cassignee}
                  </div>
                  <button class="btn btn-ghost btn-xs open-ecr-btn" data-id="${cid}">
                    <span class="material-icons-outlined" style="font-size:14px">open_in_new</span>
                  </button>
                </div>
              </div>`
    }).join('')}
          </div>
        </div>`
  }).join('')}
    </div>

    <!-- Impact Analysis Section -->
    <div class="card" style="margin-top:24px">
      <div class="card-header">
        <div class="card-title"><span class="material-icons-outlined">biotech</span>Impact Analysis: KG-ECR-2026-0047 — BMS PCB Overheating Fix</div>
        <button class="btn btn-outline btn-sm" id="refresh-impact">
          <span class="material-icons-outlined" style="font-size:16px">refresh</span>Re-run Analysis
        </button>
      </div>
      <div class="card-body">
        <div class="grid-main-sidebar">
          <div>
            <table class="data-table">
              <thead><tr><th>Affected BOM</th><th>Model / Variant</th><th>Qty Used</th><th>WIP Units</th><th>Stocked</th><th>Impact Level</th></tr></thead>
              <tbody>
                <tr><td class="font-medium">ASSY-BA1 Rev C</td><td>Safar Smart Standard</td><td>1</td><td>124</td><td>56</td><td><span class="badge badge-priority-critical">HIGH</span></td></tr>
                <tr><td class="font-medium">ASSY-BH1 Rev B</td><td>Safar Smart Platform S1</td><td>1</td><td>38</td><td>12</td><td><span class="badge badge-priority-critical">HIGH</span></td></tr>
                <tr><td class="font-medium">ASSY-BE1 Rev A</td><td>Safar DX Eco</td><td>1</td><td>14</td><td>0</td><td><span class="badge badge-priority-medium">MEDIUM</span></td></tr>
                <tr><td class="font-medium">ASSY-BD1 Rev D</td><td>K-Star Super DX</td><td>1</td><td>8</td><td>22</td><td><span class="badge badge-priority-low">LOW</span></td></tr>
              </tbody>
            </table>
          </div>
          <div class="card" style="background:#F9FAFB;border:1px solid var(--border-light)">
            <div class="card-body">
              <div class="section-title">Change Economics</div>
              <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span class="text-secondary text-sm">Cost Delta / Unit</span><span class="font-bold">₹ +145</span></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:16px"><span class="text-secondary text-sm">Tooling Investment</span><span class="font-bold">₹ 14,500</span></div>
              <div class="divider"></div>
              <div class="section-title">Schedule Impact</div>
              <div style="display:flex;justify-content:space-between"><span class="text-secondary text-sm">Target Effectivity</span><span class="font-medium">01-June-2026</span></div>
              <div style="display:flex;justify-content:space-between;margin-top:4px"><span class="text-secondary text-sm">Project Delay</span><span class="font-medium" style="color:#059669">0 Days</span></div>
              <div class="divider"></div>
              <button class="btn btn-primary btn-sm btn-full" id="issue-ecn-btn">
                <span class="material-icons-outlined" style="font-size:16px">task_alt</span>Issue ECN
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // Open ECR cards
  tc.querySelectorAll('.open-ecr-btn, .kanban-card').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.open-ecr-btn') || e.target.closest('.kanban-card')) {
        const id = e.target.closest('[data-ecr-id],[data-id]')?.dataset.ecrId || e.target.closest('[data-id]')?.dataset.id;
        if (id) openECRDetail(id);
      }
    });
  });

  tc.querySelector('#refresh-impact')?.addEventListener('click', () => {
    showToast('Running impact analysis across 1,402 parts…', 'info');
    setTimeout(() => showToast('Impact analysis complete. 4 BOMs affected.', 'success'), 1800);
  });

  tc.querySelector('#issue-ecn-btn')?.addEventListener('click', () => {
    showModal('Issue Engineering Change Note',
      `<p style="margin-bottom:16px">Issue ECN for <strong>KG-ECR-2026-0047</strong>?</p>
       <div class="form-group"><label class="form-label">ECN Title</label><input class="form-input" value="BMS PCB Trace Width Upgrade — Thermal Fix for Safar Smart" /></div>
       <div class="form-group"><label class="form-label">Effectivity Type</label><select class="form-select"><option>Serial Number Effectivity (Mandatory — Safety/Recall)</option><option>Date Effectivity</option></select></div>
       <div class="form-group"><label class="form-label">Effective From (VIN / Date)</label><input class="form-input" placeholder="BG3W-2026-01501 or 01-June-2026" /></div>
       <div class="form-group"><label class="form-label">Distribution List</label><input class="form-input" value="Manufacturing, Quality, Sourcing, Service" /></div>`,
      `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button class="btn btn-primary" id="confirm-ecn">Issue ECN & Distribute</button>`
    );
    setTimeout(() => {
      document.getElementById('confirm-ecn')?.addEventListener('click', () => {
        document.querySelector('.modal-overlay')?.remove();
        showToast('ECN KG-ECN-2026-0048 issued and distributed to all stakeholders!', 'success');
      });
    }, 50);
  });
}

async function openECRDetail(id) {
  showToast('Loading ECR details...', 'info');
  try {
    const numericId = parseInt(String(id).split('-').pop(), 10);
    const res = await authFetch('/api/Changes/ecr/' + numericId);
    if (!res.ok) throw new Error('Status ' + res.status);
    const data = await res.json();

    // Parse priority back to string for display
    let priorityText = 'Medium';
    let priorityClass = 'badge-priority-medium';
    if (data.priority === 4) { priorityText = 'Critical'; priorityClass = 'badge-priority-critical'; }
    else if (data.priority === 3) { priorityText = 'High'; priorityClass = 'badge-priority-high'; }
    else if (data.priority === 1) { priorityText = 'Low'; priorityClass = 'badge-priority-low'; }

    showModal(`ECR Details: ${id}`,
      `<div class="detail-grid" style="margin-bottom:16px">
        <div class="detail-field"><div class="detail-label">ECR Number</div><div class="detail-value" style="font-family:var(--font-mono)">${data.id || id}</div></div>
        <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value"><span class="badge badge-review">${data.status || 'Under Review'}</span></div></div>
        <div class="detail-field"><div class="detail-label">Priority</div><div class="detail-value"><span class="badge ${priorityClass}">${priorityText}</span></div></div>
        <div class="detail-field"><div class="detail-label">Affected Areas</div><div class="detail-value">${data.affectedAreas || 'N/A'}</div></div>
        <div class="detail-field"><div class="detail-label">Raised By</div><div class="detail-value">${data.raisedBy || 'System User'}</div></div>
        <div class="detail-field"><div class="detail-label">Date Raised</div><div class="detail-value">${new Date(data.createdAt || Date.now()).toLocaleDateString()}</div></div>
      </div>
      <div class="divider"></div>
      <div class="form-group"><label class="form-label">Title</label>
        <div style="padding:12px;background:var(--bg-muted);border-radius:var(--radius-sm);font-size:0.857rem;font-weight:600;">${data.title || 'No Title'}</div>
      </div>
      <div class="form-group"><label class="form-label">Description / Problem Statement</label>
        <div style="padding:12px;background:var(--bg-muted);border-radius:var(--radius-sm);font-size:0.857rem;line-height:1.6">${data.description || 'No description provided.'}</div>
      </div>
      <div class="form-group"><label class="form-label">Justification / Proposed Solution</label>
        <div style="padding:12px;background:var(--bg-muted);border-radius:var(--radius-sm);font-size:0.857rem;line-height:1.6">${data.justification || 'No justification provided.'}</div>
      </div>`,
      `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
       <button class="btn btn-danger" id="btn-reject-ecr">Reject</button>
       <button class="btn btn-primary" id="btn-approve-ecr">Approve ECR</button>`
    );

    setTimeout(() => {
      document.getElementById('btn-reject-ecr')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = 'Rejecting...';
        try {
          const res = await authFetch(`/api/Changes/ecr/${numericId}/status?status=Rejected`, { method: 'PUT' });
          if (res.ok) {
            showToast('ECR rejected successfully.', 'success');
            document.querySelector('.modal-overlay')?.remove();
          } else {
            showToast('Failed to reject ECR. Status ' + res.status, 'error');
            btn.disabled = false;
            btn.textContent = 'Reject';
          }
        } catch (err) {
          console.error(err);
          showToast('Network error while rejecting ECR', 'error');
          btn.disabled = false;
          btn.textContent = 'Reject';
        }
      });

      document.getElementById('btn-approve-ecr')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = 'Approving...';
        try {
          const res = await authFetch(`/api/Changes/ecr/${numericId}/status?status=Approved`, { method: 'PUT' });
          if (res.ok) {
            showToast('ECR approved! Proceed to ECN issuance.', 'success');
            document.querySelector('.modal-overlay')?.remove();
          } else {
            showToast('Failed to approve ECR. Status ' + res.status, 'error');
            btn.disabled = false;
            btn.textContent = 'Approve ECR';
          }
        } catch (err) {
          console.error(err);
          showToast('Network error while approving ECR', 'error');
          btn.disabled = false;
          btn.textContent = 'Approve ECR';
        }
      });
    }, 50);
  } catch (error) {
    console.error('Failed to load ECR details:', error);
    showToast('Failed to load ECR details.', 'error');
  }
}

function renderECRList(tc) {
  const ecrs = [
    { id: 'KG-ECR-2026-0052', title: 'Alternative Wheel Supplier Qualification', cat: 'Supplier Change', priority: 'medium', model: 'GA (E-Luna)', by: 'Priya M.', date: '06-Apr-2026', status: 'draft' },
    { id: 'KG-ECR-2026-0051', title: 'Side Stand Sensor Improvement', cat: 'Design Upgrade', priority: 'low', model: 'GA (E-Luna)', by: 'Rohit S.', date: '05-Apr-2026', status: 'draft' },
    { id: 'KG-ECR-2026-0047', title: 'BMS PCB Overheating Fix — Safar Smart', cat: 'Defect Fix', priority: 'high', model: 'BA, BD', by: 'Rohit S.', date: '03-Apr-2026', status: 'review' },
    { id: 'KG-ECR-2026-0043', title: 'Motor Control Unit Upgrade — Zulu', cat: 'Design Upgrade', priority: 'high', model: 'GF (Zulu)', by: 'Amit K.', date: '28-Mar-2026', status: 'review' },
    { id: 'KG-ECR-2026-0040', title: 'AIS-038 Rev5 Battery Cell Fuse', cat: 'Regulatory', priority: 'critical', model: 'All 2W', by: 'Vikram T.', date: '20-Mar-2026', status: 'released' },
    { id: 'KG-ECR-2026-0035', title: 'Safar Shakti Harness Rev', cat: 'Design Upgrade', priority: 'medium', model: 'BC (Shakti)', by: 'Neha N.', date: '15-Mar-2026', status: 'released' },
  ];

  tc.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">ECR Registry</div>
        <div style="display:flex;gap:8px">
          <select class="form-select" style="width:140px;padding:6px 10px" id="ecr-filter-status">
            <option value="">All Status</option><option>Draft</option><option>In Review</option><option>Approved</option>
          </select>
          <select class="form-select" style="width:160px;padding:6px 10px" id="ecr-filter-priority">
            <option value="">All Priority</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
          </select>
        </div>
      </div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>ECR Number</th><th>Title</th><th>Category</th><th>Priority</th><th>Model</th><th>Raised By</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="ecr-rows">
            ${ecrs.map(e => `
              <tr class="ecr-row">
                <td><span class="part-number" style="cursor:pointer" data-ecrid="${e.id}">${e.id}</span></td>
                <td style="max-width:220px;white-space:normal;line-height:1.4">${e.title}</td>
                <td><span class="tag">${e.cat}</span></td>
                <td><span class="badge badge-priority-${e.priority}">${e.priority.charAt(0).toUpperCase() + e.priority.slice(1)}</span></td>
                <td>${e.model}</td>
                <td>${e.by}</td>
                <td class="text-secondary text-sm">${e.date}</td>
                <td><span class="badge badge-${e.status}">${e.status === 'released' ? 'Approved' : e.status === 'review' ? 'In Review' : 'Draft'}</span></td>
                <td>
                  <button class="btn btn-ghost btn-xs open-ecr" data-id="${e.id}"><span class="material-icons-outlined" style="font-size:16px">visibility</span></button>
                  <button class="btn btn-ghost btn-xs"><span class="material-icons-outlined" style="font-size:16px">edit</span></button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  tc.querySelectorAll('.open-ecr, [data-ecrid]').forEach(el => {
    el.addEventListener('click', () => openECRDetail(el.dataset.id || el.dataset.ecrid));
  });

  tc.querySelector('#ecr-filter-status')?.addEventListener('change', (e) => {
    const q = e.target.value.toLowerCase();
    tc.querySelectorAll('.ecr-row').forEach(r => {
      r.style.display = !q || r.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

function renderECNList(tc) {
  const ecns = [
    { id: 'KG-ECN-2026-0048', title: 'BMS PCB Trace Width Upgrade — Safar Smart', effectivity: 'VIN: BG3W-2026-01501', status: 'draft', by: 'Rohit A.', date: '06-Apr-2026' },
    { id: 'KG-ECN-2026-0038', title: 'E-Luna Prime Display Swap to TFT', effectivity: 'Date: 01-May-2026', status: 'review', by: 'Amit K.', date: '28-Mar-2026' },
    { id: 'KG-ECN-2026-0035', title: 'Safar Shakti Wiring Harness Rev B', effectivity: 'Date: 15-Mar-2026', status: 'released', by: 'Neha N.', date: '15-Mar-2026' },
    { id: 'KG-ECN-2026-0031', title: 'Safar Smart Wiring Update — CAN Protocol', effectivity: 'Date: 01-Mar-2026', status: 'released', by: 'Sanjay G.', date: '01-Mar-2026' },
    { id: 'KG-ECN-2026-0028', title: 'K-Star BMS Firmware v2.0 Rollout', effectivity: 'VIN: BD1W-2026-00800', status: 'released', by: 'Vikram T.', date: '20-Feb-2026' },
  ];

  tc.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title">ECN Registry</div></div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>ECN Number</th><th>Title</th><th>Effectivity</th><th>Issued By</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${ecns.map(e => `
              <tr>
                <td><span class="part-number">${e.id}</span></td>
                <td style="max-width:220px;white-space:normal;line-height:1.4">${e.title}</td>
                <td class="text-sm">${e.effectivity}</td>
                <td>${e.by}</td>
                <td class="text-secondary text-sm">${e.date}</td>
                <td><span class="badge badge-${e.status}">${e.status === 'released' ? 'Released' : e.status === 'review' ? 'In Review' : 'Draft'}</span></td>
                <td>
                  <button class="btn btn-ghost btn-xs"><span class="material-icons-outlined" style="font-size:16px">visibility</span></button>
                  <button class="btn btn-ghost btn-xs"><span class="material-icons-outlined" style="font-size:16px">download</span></button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderECNEng(tc) {
  const items = [
    { id: 'KG-ECN-ENG-2026-012', ecn: 'KG-ECN-2026-0048', issue: 'New BMS cell chemistry requires FW changes not in ECN scope', raisedBy: 'Vikram T.', date: '06-Apr-2026', status: 'open' },
    { id: 'KG-ECN-ENG-2026-011', ecn: 'KG-ECN-2026-0048', issue: 'Heatsink thermal simulation fails at peak load — Safar Smart hill-climb', raisedBy: 'Priya M.', date: '05-Apr-2026', status: 'open' },
    { id: 'KG-ECN-ENG-2026-010', ecn: 'KG-ECN-2026-0038', issue: 'OTA update path blocked — older E-Luna hardware cannot handle new package format', raisedBy: 'Vikram T.', date: '02-Apr-2026', status: 'review' },
    { id: 'KG-ECN-ENG-2026-008', ecn: 'KG-ECN-2026-0035', issue: 'Mechanical clearance interference: new motor vs existing chain drive on K-Star', raisedBy: 'Neha N.', date: '18-Mar-2026', status: 'resolved' },
  ];
  tc.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><span class="material-icons-outlined">bug_report</span>ECN-Eng — Engineering Challenge Log</div>
        <button class="btn btn-primary btn-sm" id="btn-new-ecn-eng">
          <span class="material-icons-outlined" style="font-size:16px">add</span>Log Challenge
        </button>
      </div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>ECN-Eng ID</th><th>Parent ECN</th><th>Issue Description</th><th>Raised By</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${items.map(i => `
              <tr>
                <td><span class="part-number">${i.id}</span></td>
                <td><span class="part-number" style="font-size:0.714rem">${i.ecn}</span></td>
                <td style="max-width:250px;white-space:normal;line-height:1.4;font-size:0.857rem">${i.issue}</td>
                <td>${i.raisedBy}</td>
                <td class="text-secondary text-sm">${i.date}</td>
                <td><span class="badge ${i.status === 'resolved' ? 'badge-released' : i.status === 'review' ? 'badge-review' : 'badge-priority-high'}">${i.status.charAt(0).toUpperCase() + i.status.slice(1)}</span></td>
                <td>
                  <button class="btn btn-ghost btn-xs resolve-btn" data-id="${i.id}" data-status="${i.status}">
                    <span class="material-icons-outlined" style="font-size:16px">${i.status === 'resolved' ? 'visibility' : 'check_circle'}</span>
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  tc.querySelector('#btn-new-ecn-eng')?.addEventListener('click', () => {
    showModal('Log Engineering Challenge (ECN-Eng)',
      `<div class="form-group"><label class="form-label">Parent ECN</label><select class="form-select"><option>KG-ECN-2026-0048</option><option>KG-ECN-2026-0038</option><option>KG-ECN-2026-0035</option></select></div>
       <div class="form-group"><label class="form-label">Issue Description <span style="color:#DC2626">*</span></label><textarea class="form-input" id="ecneng-desc" rows="3" placeholder="Describe the technical challenge encountered during ECN implementation…" style="resize:vertical"></textarea></div>
       <div class="form-group"><label class="form-label">Domain</label><select class="form-select"><option>Mechanical</option><option>Electrical</option><option>Software</option><option>Manufacturing</option><option>Regulatory</option></select></div>
       <div class="form-group"><label class="form-label">Proposed Resolution</label><textarea class="form-input" rows="2" placeholder="Initial proposed solution or workaround…" style="resize:vertical"></textarea></div>`,
      `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button class="btn btn-primary" id="log-eng">Log Challenge</button>`
    );
    setTimeout(() => {
      document.getElementById('log-eng')?.addEventListener('click', () => {
        const desc = document.getElementById('ecneng-desc')?.value;
        if (!desc) return showToast('Issue description is required', 'error');
        document.querySelector('.modal-overlay')?.remove();
        showToast('Engineering challenge logged. COE Head notified.', 'success');
      });
    }, 50);
  });

  tc.querySelectorAll('.resolve-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.status;
      if (s === 'resolved') return showToast(`${btn.dataset.id} is already resolved`, 'info');
      showModal(`Resolve: ${btn.dataset.id}`,
        `<div class="form-group"><label class="form-label">Resolution Summary <span style="color:#DC2626">*</span></label><textarea class="form-input" id="resolution-text" rows="4" placeholder="Describe how this challenge was resolved…" style="resize:vertical"></textarea></div>`,
        `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button class="btn btn-primary" id="confirm-resolve">Mark Resolved</button>`
      );
      setTimeout(() => {
        document.getElementById('confirm-resolve')?.addEventListener('click', () => {
          const t = document.getElementById('resolution-text')?.value;
          if (!t) return showToast('Resolution text required', 'error');
          document.querySelector('.modal-overlay')?.remove();
          showToast(`${btn.dataset.id} marked as resolved!`, 'success');
          btn.closest('tr').querySelector('.badge').textContent = 'Resolved';
          btn.closest('tr').querySelector('.badge').className = 'badge badge-released';
        });
      }, 50);
    });
  });
}

function renderNewECRForm(tc) {
  tc.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><span class="material-icons-outlined">edit_note</span>Raise Engineering Change Request</div>
      </div>
      <div class="card-body">
        <div class="grid-2" style="gap:20px">
          <div class="form-group"><label class="form-label">Title <span style="color:#DC2626">*</span></label>
            <input class="form-input" id="ecr-title" placeholder="Brief one-line description of the change" /></div>
          
          <div class="form-group"><label class="form-label">Priority <span style="color:#DC2626">*</span></label>
            <select class="form-select" id="ecr-priority">
              <option value="">Select priority…</option>
              <option value="4">Critical</option>
              <option value="3">High</option>
              <option value="2">Medium</option>
              <option value="1">Low</option>
            </select></div>
            
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Description <span style="color:#DC2626">*</span></label>
            <textarea class="form-input" id="ecr-description" rows="4" placeholder="Describe the issue in detail..." style="resize:vertical"></textarea></div>
            
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Justification <span style="color:#DC2626">*</span></label>
            <textarea class="form-input" id="ecr-justification" rows="3" placeholder="Provide justification for the proposed change..." style="resize:vertical"></textarea></div>
            
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Affected Areas <span style="color:#DC2626">*</span></label>
            <textarea class="form-input" id="ecr-affected" rows="2" placeholder="List the affected models, vehicles, or part numbers..." style="resize:vertical"></textarea></div>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px">
          <button class="btn btn-outline" id="ecr-save-draft">Save Draft</button>
          <button class="btn btn-primary" id="ecr-submit">
            <span class="material-icons-outlined" style="font-size:16px">send</span>Submit ECR
          </button>
        </div>
      </div>
    </div>`;

  tc.querySelector('#ecr-save-draft')?.addEventListener('click', () => showToast('ECR saved as draft.', 'info'));

  tc.querySelector('#ecr-submit')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const title = tc.querySelector('#ecr-title')?.value;
    const priorityInt = parseInt(tc.querySelector('#ecr-priority')?.value, 10);
    const description = tc.querySelector('#ecr-description')?.value;
    const justification = tc.querySelector('#ecr-justification')?.value;
    const affectedAreas = tc.querySelector('#ecr-affected')?.value;

    if (!title || isNaN(priorityInt) || !description || !justification || !affectedAreas) {
      return showToast('Please fill all required fields (*)', 'error');
    }

    const payload = {
      title,
      description,
      priority: priorityInt,
      justification,
      affectedAreas
    };

    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
      const res = await authFetch('/api/Changes/ecr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('ECR submitted successfully! COE Head notified for review.', 'success');
        tc.querySelectorAll('.form-input').forEach(el => el.value = '');
        tc.querySelectorAll('.form-select').forEach(el => el.selectedIndex = 0);
      } else {
        showToast('Failed to submit ECR. Server status ' + res.status, 'error');
      }
    } catch (err) {
      console.error('Error submitting ECR:', err);
      showToast('Network error while submitting ECR', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px">send</span>Submit ECR';
    }
  });
}

function runImpactAnalysis() {
  showModal('Automated Impact Analysis',
    `<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:14px;background:var(--brand-primary-lighter);border-radius:var(--radius-md)">
      <span class="material-icons-outlined" style="color:var(--brand-primary)">biotech</span>
      <div><div style="font-weight:600;color:var(--brand-primary)">Scanning 1,402 parts across 15 BOMs…</div><div style="font-size:0.786rem;color:var(--text-secondary)">Analysis completed in 0.8 seconds</div></div>
    </div>
    <table class="data-table">
      <thead><tr><th>Affected BOM</th><th>Model</th><th>Qty Used</th><th>WIP</th><th>Stocked</th><th>Risk</th></tr></thead>
      <tbody>
        <tr><td class="part-number">ASSY-BA1 Rev C</td><td>Safar Smart Standard</td><td>1</td><td>124</td><td>56</td><td><span class="badge badge-priority-critical">HIGH</span></td></tr>
        <tr><td class="part-number">ASSY-BH1 Rev B</td><td>Safar Smart S1</td><td>1</td><td>38</td><td>12</td><td><span class="badge badge-priority-critical">HIGH</span></td></tr>
        <tr><td class="part-number">ASSY-BE1 Rev A</td><td>Safar DX Eco</td><td>1</td><td>14</td><td>0</td><td><span class="badge badge-priority-medium">MEDIUM</span></td></tr>
        <tr><td class="part-number">ASSY-BD1 Rev D</td><td>K-Star Super DX</td><td>1</td><td>8</td><td>22</td><td><span class="badge badge-priority-low">LOW</span></td></tr>
      </tbody>
    </table>
    <div style="margin-top:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center">
      <div style="padding:12px;background:var(--bg-muted);border-radius:var(--radius-md)"><div style="font-size:1.14rem;font-weight:700">184</div><div style="font-size:0.714rem;color:var(--text-tertiary)">WIP Units Affected</div></div>
      <div style="padding:12px;background:var(--bg-muted);border-radius:var(--radius-md)"><div style="font-size:1.14rem;font-weight:700;color:#DC2626">2</div><div style="font-size:0.714rem;color:var(--text-tertiary)">High-Risk BOMs</div></div>
      <div style="padding:12px;background:var(--bg-muted);border-radius:var(--radius-md)"><div style="font-size:1.14rem;font-weight:700;color:#059669">₹145/unit</div><div style="font-size:0.714rem;color:var(--text-tertiary)">Cost Delta</div></div>
    </div>`, '');
}

function renderNewECNForm(tc) {
  tc.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><span class="material-icons-outlined">edit_note</span>Raise Engineering Change Note (ECN)</div>
      </div>
      <div class="card-body">
        <div class="grid-2" style="gap:20px">
          <div class="form-group"><label class="form-label">Title <span style="color:#DC2626">*</span></label>
            <input class="form-input" id="ecn-title" placeholder="Brief one-line description of the ECN" /></div>
          
          <div class="form-group"><label class="form-label">Effectivity Type <span style="color:#DC2626">*</span></label>
            <select class="form-select" id="ecn-effectivity">
              <option value="0">Serial Number Effectivity (0)</option>
              <option value="1">Date Effectivity (1)</option>
            </select></div>
            
          <div class="form-group"><label class="form-label">Effectivity Date</label>
            <input type="datetime-local" class="form-input" id="ecn-date" /></div>

          <div class="form-group"><label class="form-label">Affected Part IDs</label>
            <input class="form-input" id="ecn-affected" placeholder="e.g. 101, 105" /></div>
            
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Description <span style="color:#DC2626">*</span></label>
            <textarea class="form-input" id="ecn-description" rows="4" placeholder="Describe the change in detail..." style="resize:vertical"></textarea></div>
            
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Implementation Notes <span style="color:#DC2626">*</span></label>
            <textarea class="form-input" id="ecn-notes" rows="3" placeholder="Provide implementation notes..." style="resize:vertical"></textarea></div>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px">
          <button class="btn btn-outline" id="ecn-save-draft">Save Draft</button>
          <button class="btn btn-primary" id="ecn-submit">
            <span class="material-icons-outlined" style="font-size:16px">send</span>Submit ECN
          </button>
        </div>
      </div>
    </div>`;

  tc.querySelector('#ecn-save-draft')?.addEventListener('click', () => showToast('ECN saved as draft.', 'info'));

  tc.querySelector('#ecn-submit')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const title = tc.querySelector('#ecn-title')?.value;
    const effectivityType = parseInt(tc.querySelector('#ecn-effectivity')?.value, 10);
    let effectivityDate = tc.querySelector('#ecn-date')?.value;
    const affectedPartIds = tc.querySelector('#ecn-affected')?.value;
    const description = tc.querySelector('#ecn-description')?.value;
    const implementationNotes = tc.querySelector('#ecn-notes')?.value;

    if (!title || isNaN(effectivityType) || !description || !implementationNotes) {
      return showToast('Please fill all required fields (*)', 'error');
    }

    if (effectivityDate) {
      effectivityDate = new Date(effectivityDate).toISOString();
    } else {
      effectivityDate = new Date().toISOString();
    }

    const payload = {
      title,
      description,
      effectivityType,
      effectivityDate,
      affectedPartIds,
      implementationNotes
    };

    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
      const res = await authFetch('/api/Changes/ecn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('ECN submitted successfully!', 'success');
        tc.querySelectorAll('.form-input').forEach(el => el.value = '');
        tc.querySelectorAll('.form-select').forEach(el => el.selectedIndex = 0);
      } else {
        showToast('Failed to submit ECN. Server status ' + res.status, 'error');
      }
    } catch (err) {
      console.error('Error submitting ECN:', err);
      showToast('Network error while submitting ECN', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px">send</span>Submit ECN';
    }
  });
}
