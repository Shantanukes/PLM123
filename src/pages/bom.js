import { showToast, showModal, navigateTo, getCurrentUserRole } from '../main.js';
import { createPart, getParts, getPartById, getPartByNumber, updatePart } from '../api/parts.js';
import { createBom, getBomTree, updateBomLine, deleteBomLine, getBomLines, getBomWhereUsed, getBomByTeamId, getBomParts, getAllBomsWithParts, linkBomWithParent } from '../api/bom.js';

// ─── Master Data from PartNo.xlsx ───────────────────────────
// Column 1: Product Category
const PRODUCT_CATEGORIES = [
  { code: 'A', label: 'A - 4W Niche' },
  { code: 'B', label: 'B - 3W BEV' },
  { code: 'C', label: 'C - 3W PHEV' },
  { code: 'D', label: 'D - 3W ICE' },
  { code: 'E', label: 'E - Genset' },
  { code: 'F', label: 'F - Pump' },
  { code: 'G', label: 'G - 2 Wheel' },
];

// Column 2: Model Number (Alpha-numeric) — letter + digit
const MODEL_NUMBERS = [
  { code: 'A1', label: 'A1 - SAFAR' },
  { code: 'B1', label: 'B1 - SOLECKSHAW LITE' },
  { code: 'C1', label: 'C1 - SAFAR SAKTI (CARGO)' },
  { code: 'D1', label: 'D1 - K STAR' },
  { code: 'E1', label: 'E1 - SAFAR DX (ECO)' },
  { code: 'F1', label: 'F1 - K-STAR DX' },
  { code: 'G1', label: 'G1 - K-STAR SUPER DX' },
  { code: 'H1', label: 'H1 - SAFAR SMART' },
  { code: 'J1', label: 'J1 - HIGH SPEED 3 WHEELER (HAS 45)' },
  { code: 'K1', label: 'K1 - MSV CARGO' },
  { code: 'L1', label: 'L1 - MSV PASSENGER' },
  { code: 'M1', label: 'M1 - HIGH SPEED LOADER' },
  { code: 'N1', label: 'N1 - HSV PASSENGER' },
  { code: 'HW', label: 'HW - Hardware' },
  { code: 'S1', label: 'S1 - SAFAR SHAKTI (SMART PLATFORM)' },
  { code: 'TL', label: 'TL - SPECIAL TOOL' },
  { code: 'U1', label: 'U1 - SUPER DX-SEARA' },
];

// Column 3+4: Group Number (group digit + sub-group digit)
const GROUP_NUMBERS = [
  // Except for Hardware
  { groupCode: '0', subCode: '1', label: '01 - Vehicle Assembly' },
  { groupCode: '0', subCode: '2', label: '02 - Frame Assy' },
  { groupCode: '0', subCode: '3', label: '03 - Brake Assy' },
  { groupCode: '0', subCode: '4', label: '04 - Seating System' },
  { groupCode: '0', subCode: '5', label: '05 - Body' },
  { groupCode: '0', subCode: '6', label: '06 - Suspension System' },
  { groupCode: '0', subCode: '7', label: '07 - Handle Bar' },
  { groupCode: '0', subCode: '8', label: '08 - Wheel' },
  { groupCode: '0', subCode: '9', label: '09 - Logo / Stickers' },
  { groupCode: '1', subCode: '0', label: '10 - Control Cables' },
  { groupCode: '1', subCode: '1', label: '11 - Dashboard' },
  { groupCode: '1', subCode: '2', label: '12 - Tool & Tool Kit' },
  { groupCode: '1', subCode: '3', label: '13 - Cab Components' },
  { groupCode: '2', subCode: '0', label: '20 - Installation' },
  { groupCode: '3', subCode: '1', label: '31 - Engine Assembly' },
  { groupCode: '3', subCode: '2', label: '32 - Gear Box Assy' },
  { groupCode: '3', subCode: '3', label: '33 - Axel Assy (Transmission Assy)' },
  { groupCode: '3', subCode: '4', label: '34 - Gear' },
  { groupCode: '3', subCode: '5', label: '35 - Shaft' },
  { groupCode: '3', subCode: '6', label: '36 - Gasket / Rubber' },
  { groupCode: '3', subCode: '7', label: '37 - Plastic Parts' },
  { groupCode: '5', subCode: '1', label: '51 - Motor Assy' },
  { groupCode: '5', subCode: '2', label: '52 - Battery System / Charger' },
  { groupCode: '5', subCode: '3', label: '53 - Wiring' },
  { groupCode: '5', subCode: '4', label: '54 - Switches' },
  { groupCode: '5', subCode: '5', label: '55 - Lighting System' },
  { groupCode: '5', subCode: '6', label: '56 - Horn / Instrument Cluster' },
  { groupCode: '5', subCode: '7', label: '57 - Fuse' },
  { groupCode: '5', subCode: '8', label: '58 - Controller' },
  { groupCode: '5', subCode: '9', label: '59 - Sensor' },
  { groupCode: '8', subCode: '1', label: '81 - Consumable Parts' },
  { groupCode: '8', subCode: '2', label: '82 - Accessories Parts' },
  { groupCode: '9', subCode: '1', label: '91 - Homologation Dwg' },
  { groupCode: '9', subCode: '2', label: '92 - Workshop Manual' },
  { groupCode: '9', subCode: '3', label: '93 - Parts Catalogue' },
  { groupCode: '9', subCode: '4', label: '94 - Reference Assembly Dwg' },
  { groupCode: '9', subCode: '5', label: '95 - Design Standard' },
  { groupCode: '9', subCode: '6', label: '96 - Testing Standard' },
  // For Hardware
  { groupCode: '0', subCode: '1', label: 'H01 - Hexagonal Bolt', isHardware: true },
  { groupCode: '0', subCode: '2', label: 'H02 - Hexagonal Nut', isHardware: true },
  { groupCode: '0', subCode: '3', label: 'H03 - Socket Head Bolt', isHardware: true },
  { groupCode: '0', subCode: '4', label: 'H04 - Bearing', isHardware: true },
  { groupCode: '0', subCode: '5', label: 'H05 - Seals', isHardware: true },
  { groupCode: '0', subCode: '6', label: 'H06 - Stud', isHardware: true },
  { groupCode: '0', subCode: '7', label: 'H07 - Dowel Pin', isHardware: true },
  { groupCode: '0', subCode: '8', label: 'H08 - Washer', isHardware: true },
  { groupCode: '0', subCode: '9', label: 'H09 - Circlip', isHardware: true },
  { groupCode: '1', subCode: '0', label: 'H10 - Key', isHardware: true },
  { groupCode: '1', subCode: '1', label: 'H11 - Screw', isHardware: true },
  { groupCode: '1', subCode: '2', label: 'H12 - Rivet', isHardware: true },
  { groupCode: '1', subCode: '3', label: 'H13 - Pin', isHardware: true },
  { groupCode: '1', subCode: '4', label: 'H14 - Hoop (Clip Nut)', isHardware: true },
];

// Column 8: Machining Status (Assembly Status)
const MACHINING_STATUS = [
  { code: '0', label: '0 - Assy' },
  { code: '1', label: '1 - Finished Part' },
  { code: '2', label: '2 - Semi Finish' },
  { code: '3', label: '3 - Semi Finish' },
  { code: '4', label: '4 - CED' },
  { code: '5', label: '5 - Plated' },
  { code: '6', label: '6 - Painted Part' },
  { code: '7', label: '7 - Unpainted Finished Part' },
  { code: '8', label: '8 - Forging' },
  { code: '9', label: '9 - Casting' },
];

// Column 10: Revision Letter — A–Z excluding I and O
const REVISION_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');

// Column 11: Development Status
const DEV_STATUS = [
  { code: 'X', label: 'X - Drawing for Samples (max 25)' },
  { code: 'Y', label: 'Y - Drawing for Pilot Production (max 500)' },
  { code: 'Z', label: 'Z - Drawing for Mass Production (indefinite)' },
  { code: 'S', label: 'S - For Spares Only' },
];

// ─── Part Number Builder ─────────────────────────────────────
// Structure: [ProductCategory][ModelNumber][GroupCode][SubCode][SerialNo(3)][MachiningStatus][RevisionLetter][DevStatus]
// Example:   B         M1        0          1          001       0             A               X  = BM10100 1AX
// Total 11 digits: cat(1) + model(2) + group(1) + sub(1) + serial(3) + mach(1) + rev(1) + dev(1) = 11

function buildPartNumber({ categoryCode, modelCode, groupCode, subCode, serial = '001', machiningCode = '0', revisionLetter = 'A', devStatusCode = 'X' }) {
  if (!categoryCode || !modelCode || !groupCode || !subCode) return '';
  const s = String(serial).padStart(3, '0');
  return `${categoryCode}${modelCode}${groupCode}${subCode}${s}${machiningCode}${revisionLetter}${devStatusCode}`;
}

// ─── Serial auto-increment from existing BOM_TREE ────────────
function getNextSerial({ categoryCode, modelCode, groupCode, subCode }) {
  const prefix = `${categoryCode}${modelCode}${groupCode}${subCode}`.toUpperCase();
  let maxSerial = 0;
  BOM_TREE.forEach(node => {
    const pn = String(node?.pn || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!pn.startsWith(prefix) || pn.length < prefix.length + 3) return;
    const serial = Number(pn.slice(prefix.length, prefix.length + 3));
    if (Number.isFinite(serial) && serial > maxSerial) maxSerial = serial;
  });
  return String(Math.min(999, maxSerial + 1)).padStart(3, '0');
}

// ─── Part data (mock/local cache) ────────────────────────────
const PARTS = {};

const BOM_TREE = [];

let nextBomTeamId = Math.max(0, ...BOM_TREE.map(node => Number(node?.teamId) || 0)) + 1;

const STATUS_BADGE = { released: 'badge-released', review: 'badge-review', draft: 'badge-draft', rejected: 'badge-rejected', superseded: 'badge-superseded' };
const STATUS_LABEL = { released: 'Released', review: 'In Review', draft: 'Draft', rejected: 'Rejected', superseded: 'Superseded' };
const ICON_TYPE = { pdf: 'picture_as_pdf', '3d': 'view_in_ar', cert: 'verified', bin: 'memory' };

const REVISION_HISTORY = {};

let selectedPartId = null;
let bomContainer = null;
let detailPanel = null;
let currentTab = 'bom-nav';

// ─── Helper: build option HTML from array ───────────────────
function optionsHtml(items, valKey, labelKey) {
  return items.map(i => `<option value="${i[valKey]}">${i[labelKey]}</option>`).join('');
}

// ─── Helper: resolve backend part id ────────────────────────
async function resolveBackendPartIdByNumber(partNumber) {
  if (!partNumber) return null;
  try {
    const part = await getPartByNumber(partNumber);
    const id = Number(part?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch { return null; }
}

async function resolveBackendIdForLocalPart(partKey) {
  if (!partKey) return null;
  const directId = Number(partKey);
  if (Number.isFinite(directId) && directId > 0) return directId;
  const localPart = PARTS[partKey];
  if (localPart) {
    const bId = Number(localPart.backendId || localPart.id);
    if (Number.isFinite(bId) && bId > 0) return bId;
  }
  for (const candidate of [localPart?.pn, partKey].filter(Boolean)) {
    const resolved = await resolveBackendPartIdByNumber(candidate);
    if (resolved) return resolved;
  }
  return null;
}

// ─── BOM Tree helpers ────────────────────────────────────────
function getNodeIndexById(nodeId) {
  return BOM_TREE.findIndex(node => node.id === nodeId);
}

function getSubtreeEndIndex(parentIdx) {
  const parentLevel = BOM_TREE[parentIdx]?.level ?? 0;
  let idx = parentIdx + 1;
  while (idx < BOM_TREE.length && BOM_TREE[idx].level > parentLevel) idx += 1;
  return idx;
}

function insertBomNode(node, parentId) {
  if (!parentId) { BOM_TREE.push(node); return; }
  const parentIdx = getNodeIndexById(parentId);
  if (parentIdx < 0) return;
  BOM_TREE[parentIdx].hasChildren = true;
  BOM_TREE[parentIdx].expanded = true;
  BOM_TREE.splice(getSubtreeEndIndex(parentIdx), 0, node);
}

function createPartRecordFromBom({ bomNumber, description, type, qty, unit, weight, parentId, backendId }) {
  PARTS[bomNumber] = {
    id: backendId || null,
    backendId: backendId || null,
    name: description,
    pn: bomNumber,
    cls: 'Assembly',
    vt: type === '3w' ? '3-Wheeler' : '2-Wheeler',
    status: 'draft',
    rev: 'Rev 0',
    devStatus: 'X — Concept',
    machining: '0 — Assembly',
    weight: weight > 0 ? `${weight} kg` : `${qty} ${unit || 'Each'}`,
    children: '0',
    model: parentId ? `Child of ${parentId}` : 'Root Assembly',
    makeBuy: 'Make (In-house)',
    effectivity: 'TBD',
    ais: 'N/A',
    createdBy: 'Current User',
    lastMod: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    icon: 'widgets',
    iconClass: 'assy',
    docs: [],
    parentId: parentId || null,
  };
}

// ─── Main render ─────────────────────────────────────────────
export function renderBOM(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>BOM Management</h1>
        <p>Manage multi-level Bill of Materials across all product lines.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline btn-sm" id="btn-export-bom">
          <span class="material-icons-outlined" style="font-size:16px">file_download</span>Export BOM
        </button>
        <button class="btn btn-outline btn-sm" id="btn-compare-bom">
          <span class="material-icons-outlined" style="font-size:16px">compare_arrows</span>Compare BOMs
        </button>
        ${!(getCurrentUserRole().toLowerCase() === 'designer' || getCurrentUserRole() === '6') ? `
        <button class="btn btn-primary btn-sm" id="btn-link-bom" style="background:var(--brand-secondary); border-color:var(--brand-secondary);">
          <span class="material-icons-outlined" style="font-size:16px">link</span>Link BOM
        </button>
        <button class="btn btn-primary btn-sm" id="btn-new-bom">
          <span class="material-icons-outlined" style="font-size:16px">playlist_add</span>Create New BOM
        </button>
        ` : ''}
      </div>
    </div>

    <div class="tabs" id="bom-tabs">
      <button class="tab-btn active" data-tab="bom-nav">BOM Navigator</button>
      <!-- <button class="tab-btn" data-tab="team-boms">Team BOMs</button>
      <button class="tab-btn" data-tab="bom-parts">BOM Parts</button> -->
      <button class="tab-btn" data-tab="bom-compare">BOM Compare</button>
    </div>

    <div id="tab-content"></div>
  `;

  container.querySelectorAll('#bom-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#bom-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      renderTabContent(container.querySelector('#tab-content'), currentTab);
    });
  });

  renderTabContent(container.querySelector('#tab-content'), 'bom-nav');

  container.querySelector('#btn-export-bom')?.addEventListener('click', () => {
    showToast('Preparing BOM export (Excel + PDF)…', 'info');
    setTimeout(() => showToast('BOM exported successfully!', 'success'), 2000);
  });

  container.querySelector('#btn-compare-bom')?.addEventListener('click', () => {
    container.querySelectorAll('#bom-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'bom-compare'));
    renderTabContent(container.querySelector('#tab-content'), 'bom-compare');
  });

  container.querySelector('#btn-new-bom')?.addEventListener('click', () => {
    openCreateBomModal();
  });

  container.querySelector('#btn-link-bom')?.addEventListener('click', () => {
    openLinkBomModal();
  });
}

function renderTabContent(tc, tab) {
  if (tab === 'bom-nav') renderBomNav(tc);
  else if (tab === 'team-boms') renderTeamBoms(tc);
  else if (tab === 'bom-parts') renderBomParts(tc);
  else if (tab === 'bom-compare') renderBomCompare(tc);
}

// ─── Team BOMs ───────────────────────────────────────────────
async function renderTeamBoms(tc) {
  tc.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:16px">
        <div style="display:flex;gap:12px;align-items:center;">
          <div class="global-search" style="flex:1;height:40px">
            <span class="material-icons-outlined">group</span>
            <input type="number" id="team-search-input" placeholder="Enter Team ID (e.g. 1)..." />
          </div>
          <button class="btn btn-primary" id="btn-search-team-boms">View Team BOMs</button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-body no-pad">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Team ID</th>
              <th>Category</th>
              <th>Model</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="team-bom-results">
            <tr><td colspan="7" style="text-align:center;padding:20px">Enter a Team ID to load BOMs.</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

  tc.querySelector('#btn-search-team-boms')?.addEventListener('click', async () => {
    const teamId = tc.querySelector('#team-search-input').value.trim();
    const tbody = tc.querySelector('#team-bom-results');
    if (!teamId) {
      showToast('Please enter a Team ID.', 'warning');
      return;
    }

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px">Loading...</td></tr>';
    try {
      const boms = await getBomByTeamId(teamId);
      const items = Array.isArray(boms) ? boms : (boms?.items || [boms]);

      if (!items || items.length === 0 || (items.length === 1 && !items[0])) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px">No BOMs found for this team.</td></tr>';
        return;
      }

      tbody.innerHTML = items.map(b => `
        <tr>
          <td class="part-number">${b.name || '-'}</td>
          <td>${b.description || '-'}</td>
          <td>${b.teamId || teamId}</td>
          <td>${b.categoryCode || '-'}</td>
          <td>${b.modelCode || '-'}</td>
          <td><span class="badge badge-released">${b.assemblyStatus === 0 ? 'Assembly' : (b.assemblyStatus || '-')}</span></td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('[TEAM BOMS]', err);
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:red">Failed to fetch BOMs.</td></tr>';
      showToast(err.message || 'Error fetching BOMs', 'error');
    }
  });
}

// ─── BOM Parts ───────────────────────────────────────────────
async function renderBomParts(tc) {
  tc.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:16px">
        <div style="display:flex;gap:12px;align-items:center;">
          <div class="global-search" style="flex:1;height:40px">
            <span class="material-icons-outlined">settings_input_component</span>
            <input type="number" id="bom-parts-search-input" placeholder="Enter BOM ID to view its parts (leave empty to show all parts)..." />
          </div>
          <button class="btn btn-primary" id="btn-search-bom-parts">View BOM Parts</button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-body no-pad">
        <table class="data-table">
          <thead>
            <tr>
              <th>Part Number</th>
              <th>Name</th>
              <th>Quantity</th>
              <th>Group</th>
              <th>Machining</th>
              <th>Revision</th>
              <th>Dev Status</th>
              <th>Lifecycle</th>
            </tr>
          </thead>
          <tbody id="bom-parts-results">
            <tr><td colspan="9" style="text-align:center;padding:20px">Loading parts...</td></tr>
          </tbody>
        </table>
        <div id="bom-parts-pagination" style="display:none; padding: 16px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0;">
          <div style="font-size:14px;color:#64748b;">
            Showing <span id="bp-start">0</span> to <span id="bp-end">0</span> of <span id="bp-total">0</span> entries
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-secondary" id="bp-prev" style="padding: 4px 12px;">Previous</button>
            <button class="btn btn-secondary" id="bp-next" style="padding: 4px 12px;">Next</button>
          </div>
        </div>
      </div>
    </div>`;

  const tbody = tc.querySelector('#bom-parts-results');
  const paginationDiv = tc.querySelector('#bom-parts-pagination');

  let currentPage = 1;
  const itemsPerPage = 20;
  let allItems = [];

  const displayPartsList = (items = allItems) => {
    allItems = items;

    if (!allItems || allItems.length === 0 || (allItems.length === 1 && !allItems[0])) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px">No parts found.</td></tr>';
      paginationDiv.style.display = 'none';
      return;
    }

    const totalPages = Math.ceil(allItems.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, allItems.length);
    const paginatedItems = allItems.slice(startIndex, endIndex);

    tbody.innerHTML = paginatedItems.map(p => `
      <tr data-id="${p.partNumber || p.id}" class="part-row">
        <td class="part-number">${p.partNumber || '-'}</td>
        <td>${p.name || '-'}</td>
        <td>${p.quantity ?? 1}</td>
        <td><span class="tag tag-gray">${p.groupName || '-'}</span></td>
        <td>${p.machiningName || '-'}</td>
        <td>${p.revisionLetter || ''}${p.revisionDigits || ''}</td>
        <td><span class="tag tag-amber">${p.devStatusCode || '-'}</span></td>
        <td><span class="badge ${p.lifecycleStatus === 0 ? 'badge-draft' : p.lifecycleStatus === 1 ? 'badge-review' : 'badge-released'}">${p.lifecycleStatusLabel || '-'}</span></td>
      </tr>
    `).join('');

    paginationDiv.style.display = 'flex';
    tc.querySelector('#bp-start').textContent = startIndex + 1;
    tc.querySelector('#bp-end').textContent = endIndex;
    tc.querySelector('#bp-total').textContent = allItems.length;

    tc.querySelector('#bp-prev').disabled = currentPage === 1;
    tc.querySelector('#bp-next').disabled = currentPage === totalPages;
  };

  tc.querySelector('#bp-prev')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      displayPartsList();
    }
  });

  tc.querySelector('#bp-next')?.addEventListener('click', () => {
    const totalPages = Math.ceil(allItems.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      displayPartsList();
    }
  });

  tc.querySelector('#btn-search-bom-parts')?.addEventListener('click', async () => {
    const bomId = tc.querySelector('#bom-parts-search-input').value.trim();

    if (!bomId) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px">Please enter a BOM ID to search.</td></tr>';
      paginationDiv.style.display = 'none';
      return;
    }

    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px">Loading BOM parts...</td></tr>';
    paginationDiv.style.display = 'none';

    try {
      currentPage = 1;
      const parts = await getBomParts(bomId);
      const items = Array.isArray(parts) ? parts : (parts?.items || [parts]);

      if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px">No parts found for this BOM ID.</td></tr>';
        return;
      }

      displayPartsList(items);
    } catch (err) {
      console.error('[BOM PARTS]', err);
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:red">Failed to fetch BOM parts. Please check the ID and try again.</td></tr>';
      showToast(err.message || 'Error fetching BOM parts', 'error');
    }
  });

  // Do not load all parts initially
  currentPage = 1;
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px">Enter a BOM ID and click View BOM Parts to load the list.</td></tr>';
}

// ─── Create BOM Modal ────────────────────────────────────────
async function openCreateBomModal() {
  // Build group options
  const standardGroups = GROUP_NUMBERS.filter(g => !g.isHardware);
  const groupOpts = standardGroups.map(g =>
    `<option value="${g.groupCode}:${g.subCode}">${g.label}</option>`
  ).join('');

  showModal(
    'Create New BOM',
    `<div class="detail-grid">
      <div class="form-group">
        <label class="form-label">Product Category <span style="color:#DC2626">*</span></label>
        <select class="form-select" id="bom-cat-code">
          ${optionsHtml(PRODUCT_CATEGORIES, 'code', 'label')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Model Number <span style="color:#DC2626">*</span></label>
        <select class="form-select" id="bom-model-code">
          ${optionsHtml(MODEL_NUMBERS, 'code', 'label')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Group Number <span style="color:#DC2626">*</span></label>
        <select class="form-select" id="bom-group-number">${groupOpts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Machining / Assembly Status <span style="color:#DC2626">*</span></label>
        <select class="form-select" id="bom-machining-status">
          ${optionsHtml(MACHINING_STATUS, 'code', 'label')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Revision Letter <span style="color:#DC2626">*</span></label>
        <select class="form-select" id="bom-revision-letter">
          ${REVISION_LETTERS.map(l => `<option value="${l}">${l}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Development Status <span style="color:#DC2626">*</span></label>
        <select class="form-select" id="bom-dev-status">
          ${optionsHtml(DEV_STATUS, 'code', 'label')}
        </select>
      </div>
      <div class="form-group" style="grid-column:1 / -1">
        <label class="form-label">BOM Number (Auto-generated)</label>
        <input class="form-input" id="bom-number-preview" readonly style="font-family:var(--font-mono);font-weight:700;letter-spacing:1px;background:var(--bg-muted)" />
      </div>
      <div class="form-group" style="grid-column:1 / -1">
        <label class="form-label">Description <span style="color:#DC2626">*</span></label>
        <input class="form-input" id="bom-description" placeholder="Enter BOM description" />
      </div>
      <div class="form-group">
        <label class="form-label">Team ID <span style="color:#DC2626">*</span></label>
        <input type="number" class="form-input" id="bom-team-id" placeholder="e.g. 1" />
      </div>
      <div class="form-group">
        <label class="form-label">Parent BOM ID</label>
        <input type="number" class="form-input" id="bom-parent-id" placeholder="Optional (leave empty for root BOM)" />
      </div>
    </div>`,
    `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
     <button class="btn btn-primary" id="save-new-bom">Create BOM</button>`
  );

  const catEl = document.getElementById('bom-cat-code');
  const modelEl = document.getElementById('bom-model-code');
  const groupEl = document.getElementById('bom-group-number');
  const machEl = document.getElementById('bom-machining-status');
  const revEl = document.getElementById('bom-revision-letter');
  const devEl = document.getElementById('bom-dev-status');
  const previewEl = document.getElementById('bom-number-preview');

  const syncPreview = () => {
    if (!previewEl) return;
    const [gc, sc] = String(groupEl?.value || '').split(':');
    const serial = getNextSerial({
      categoryCode: catEl?.value || '',
      modelCode: modelEl?.value || '',
      groupCode: gc || '',
      subCode: sc || '',
    });
    previewEl.value = buildPartNumber({
      categoryCode: catEl?.value || '',
      modelCode: modelEl?.value || '',
      groupCode: gc || '',
      subCode: sc || '',
      serial,
      machiningCode: machEl?.value || '0',
      revisionLetter: revEl?.value || 'A',
      devStatusCode: devEl?.value || 'X',
    });
  };

  [catEl, modelEl, groupEl, machEl, revEl, devEl].forEach(el => el?.addEventListener('change', syncPreview));
  syncPreview();

  document.getElementById('save-new-bom')?.addEventListener('click', async () => {
    const categoryCode = catEl?.value?.trim();
    const modelCode = modelEl?.value?.trim();
    const [groupCode, subGroupCode] = String(groupEl?.value || '').split(':');
    const machiningCode = machEl?.value?.trim();
    const revisionLetter = revEl?.value?.trim();
    const devStatusCode = devEl?.value?.trim();
    const bomNumber = previewEl?.value?.trim();
    const description = document.getElementById('bom-description')?.value?.trim();
    const teamIdVal = document.getElementById('bom-team-id')?.value?.trim();
    const parentBOMIdVal = document.getElementById('bom-parent-id')?.value?.trim();

    if (!categoryCode || !modelCode || !groupCode || !subGroupCode || !machiningCode || !revisionLetter || !devStatusCode || !description || !teamIdVal) {
      return showToast('Please fill all mandatory fields.', 'error');
    }

    // ── Payload shaped to match what the server expects ──────
    // Adjust field names here to exactly match your API contract.
    const bomPayload = {
      categoryCode,
      modelCode,
      groupCode,
      subGroupCode,
      revisionLetter,
      assemblyStatus: machiningCode,
      name: bomNumber,
      description,
      teamId: Number(teamIdVal) || 0
    };
    const parentIdParsed = Number(parentBOMIdVal);
    if (!isNaN(parentIdParsed) && parentIdParsed > 0) {
      bomPayload.parentBOMId = parentIdParsed;
    }

    let backendId = null;
    try {
      const newBomResp = await createBom(bomPayload);
      backendId = Number(newBomResp?.id || newBomResp?.bomId || 0) || null;
      showToast(`BOM ${bomNumber} created on server.`, 'success');
    } catch (e) {
      console.error('[BOM CREATE] Server error:', e);
      showToast(`BOM saved locally. Server error: ${e.message || 'Unknown'}`, 'warning');
    }

    // ── Add to local BOM tree ─────────────────────────────────
    const newNode = {
      id: bomNumber,
      backendId,
      // parentId: null,
      level: 0,
      hasChildren: false,
      label: description,
      pn: bomNumber,
      statusKey: 'draft',
      qty: '1',
      iconClass: 'assy',
      icon: 'widgets',
      expanded: true,
    };

    createPartRecordFromBom({ bomNumber, description, type: '2w', qty: 1, unit: 'Each', weight: 0, /*parentId: null,*/ backendId });
    insertBomNode(newNode, null);
    selectedPartId = bomNumber;
    drawBomTree();
    renderPartDetail(bomNumber);

    document.querySelector('.modal-overlay')?.remove();
  });
}

// ─── Fetch live BOM from server and merge into local tree ─────
async function loadServerBomTree(rootBomId) {
  if (!rootBomId) return;
  try {
    const serverTree = await getBomTree(rootBomId);
    if (Array.isArray(serverTree) && serverTree.length) {
      showToast(`Loaded ${serverTree.length} items from server BOM.`, 'info');
      // TODO: merge serverTree into BOM_TREE here if needed
    }
  } catch (e) {
    console.warn('[BOM LOAD] Failed to fetch server BOM tree:', e.message);
  }
}

// ─── BOM Navigator ───────────────────────────────────────────
function renderBomNav(tc) {
  tc.innerHTML = `
    <div class="grid-sidebar">
      <div class="card" id="bom-tree-card" style="display:flex;flex-direction:column;max-height:calc(100vh - 300px);">
        <div class="card-header" style="background:transparent;z-index:2;border-bottom:1px solid var(--border-light)">
          <div class="card-title"><span class="material-icons-outlined">account_tree</span>Product Structure</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-xs" id="expand-all" title="Expand All"><span class="material-icons-outlined" style="font-size:16px">unfold_more</span></button>
            <button class="btn btn-ghost btn-xs" id="collapse-all" title="Collapse All"><span class="material-icons-outlined" style="font-size:16px">unfold_less</span></button>
          </div>
        </div>
        <div class="card-body no-pad" id="bom-tree" style="overflow-y:auto;overflow-x:hidden;flex:1;"></div>
      </div>
      <div class="card" id="part-detail-card">
        <div class="card-header">
          <button class="card-title" id="btn-part-details-modal" style="border:none;background:transparent;padding:0;cursor:pointer" title="Open part detail screen">
            <span class="material-icons-outlined">info</span>Part Details
          </button>
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-xs" id="btn-edit-part" title="Edit Part"><span class="material-icons-outlined" style="font-size:16px">edit</span></button>
            <button class="btn btn-ghost btn-xs" id="btn-ecr-part" title="Raise ECR"><span class="material-icons-outlined" style="font-size:16px">published_with_changes</span></button>
            <button class="btn btn-ghost btn-xs" id="btn-where-used" title="Where Used"><span class="material-icons-outlined" style="font-size:16px">account_tree</span></button>
          </div>
        </div>
        <div class="card-body" id="part-detail-body" style="overflow-y:auto;max-height:calc(100vh - 340px)">Loading…</div>
      </div>
    </div>`;

  bomContainer = tc.querySelector('#bom-tree');
  detailPanel = tc.querySelector('#part-detail-body');

  const loadBomsTreeFromServer = async () => {
    if (bomContainer) {
      bomContainer.innerHTML = '<div style="padding:20px;text-align:center"><span class="material-icons-outlined" style="animation:spin 1s linear infinite;font-size:24px;color:var(--brand-primary)">refresh</span><br/><span style="font-size:0.8rem;color:var(--text-secondary)">Loading BOM structure...</span></div>';
    }
    if (detailPanel) {
      detailPanel.innerHTML = '<div style="padding:40px;text-align:center"><span class="material-icons-outlined" style="animation:spin 1s linear infinite;font-size:24px;color:var(--brand-primary)">refresh</span><br/><span style="font-size:0.8rem;color:var(--text-secondary)">Loading details...</span></div>';
    }
    try {
      const data = await getAllBomsWithParts();
      BOM_TREE.length = 0;
      for (const k in PARTS) delete PARTS[k];

      if (Array.isArray(data) && data.length > 0) {
        const bomMap = new Map();
        data.forEach(bom => bomMap.set(bom.id, bom));

        data.forEach(bom => {
          PARTS[bom.bomNumber] = {
            id: bom.id,
            backendId: bom.id,
            name: bom.name || bom.description,
            pn: bom.bomNumber,
            cls: 'Assembly',
            vt: bom.teamName || (bom.categoryCode === 'G' ? '2-Wheeler' : '3-Wheeler'),
            status: (bom.status || 'Draft').toLowerCase(),
            rev: `Rev ${bom.revisionLetter || 'A'}`,
            devStatus: bom.assemblyStatus || '-',
            machining: bom.machiningStatus !== undefined ? `${bom.machiningStatus} — Assembly` : '-',
            weight: '-',
            children: bom.parts ? String(bom.parts.length) : '0',
            model: bom.modelCode || '-',
            makeBuy: 'Make (In-house)',
            effectivity: 'Active',
            ais: 'N/A',
            createdBy: bom.createdByUserName || 'System',
            lastMod: bom.updatedAt ? new Date(bom.updatedAt).toLocaleDateString() : (bom.createdAt ? new Date(bom.createdAt).toLocaleDateString() : '-'),
            icon: 'widgets',
            iconClass: 'assy',
            docs: [],
          };
        });

        const childBomsMap = new Map();
        data.forEach(bom => {
          if (bom.parentBOMId && bomMap.has(bom.parentBOMId)) {
            if (!childBomsMap.has(bom.parentBOMId)) childBomsMap.set(bom.parentBOMId, []);
            childBomsMap.get(bom.parentBOMId).push(bom);
          }
        });

        const processBomNode = (bom, level) => {
          const childBoms = childBomsMap.get(bom.id) || [];
          const hasChildren = (bom.parts && bom.parts.length > 0) || childBoms.length > 0;
          
          BOM_TREE.push({
            id: bom.bomNumber,
            backendId: bom.id,
            level: level,
            hasChildren: hasChildren,
            label: bom.description || bom.name || 'Assembly',
            pn: bom.bomNumber,
            statusKey: (bom.status || 'Draft').toLowerCase(),
            qty: '1',
            iconClass: 'assy',
            icon: 'widgets',
            expanded: true,
          });

          childBoms.forEach(child => processBomNode(child, level + 1));

          if (Array.isArray(bom.parts)) {
            bom.parts.forEach(part => {
              const uniqueNodeId = `${bom.bomNumber}_${part.partNumber}_${part.id}`;
              BOM_TREE.push({
                id: uniqueNodeId,
                partRefId: part.partNumber,
                backendId: part.id,
                level: level + 1,
                hasChildren: false,
                label: part.name || 'Component Part',
                pn: part.partNumber,
                statusKey: (part.lifecycleStatusLabel || 'Draft').toLowerCase(),
                qty: String(part.quantity ?? 1),
                iconClass: 'part',
                icon: 'settings',
                expanded: false,
              });

              if (!PARTS[part.partNumber]) {
                PARTS[part.partNumber] = {
                  id: part.id,
                  backendId: part.id,
                  name: part.name,
                  pn: part.partNumber,
                  cls: 'Part',
                  vt: '-',
                  status: (part.lifecycleStatusLabel || 'Draft').toLowerCase(),
                  rev: `Rev ${part.revisionLetter || 'A'}${part.revisionDigits || '01'}`,
                  devStatus: part.devStatusCode || '-',
                  machining: part.machiningName || '-',
                  weight: part.weight !== undefined ? `${part.weight} ${part.unitOfMeasure || 'KG'}` : '-',
                  children: '0',
                  model: '-',
                  makeBuy: part.makeBuyLabel || (part.makeBuy === 1 ? 'Buy' : 'Make (In-house)'),
                  effectivity: 'Active',
                  ais: 'N/A',
                  createdBy: 'System',
                  lastMod: part.updatedAt ? new Date(part.updatedAt).toLocaleDateString() : (part.createdAt ? new Date(part.createdAt).toLocaleDateString() : '-'),
                  icon: 'settings',
                  iconClass: 'part',
                  docs: [],
                };
              }
            });
          }
        };

        const rootBoms = data.filter(bom => !bom.parentBOMId || !bomMap.has(bom.parentBOMId));
        rootBoms.forEach(bom => processBomNode(bom, 0));

        selectedPartId = data[0].bomNumber;
        drawBomTree();
        renderPartDetail(selectedPartId);
      } else {
        if (bomContainer) bomContainer.innerHTML = '<div class="empty-state"><span class="material-icons-outlined">info</span><h3>No BOMs found</h3></div>';
        if (detailPanel) detailPanel.innerHTML = '<div class="empty-state"><span class="material-icons-outlined">info</span><h3>No details available</h3></div>';
      }
    } catch (err) {
      console.error('[LOAD SERVER BOM TREE]', err);
      if (bomContainer) bomContainer.innerHTML = '<div style="padding:20px;text-align:center;color:red"><span class="material-icons-outlined">error_outline</span><br/>Failed to load BOM structure.</div>';
      if (detailPanel) detailPanel.innerHTML = '<div style="padding:20px;text-align:center;color:red">Failed to load part details.</div>';
      showToast(err.message || 'Error fetching BOM structure from server', 'error');
    }
  };

  loadBomsTreeFromServer();


  tc.querySelector('#expand-all')?.addEventListener('click', () => {
    BOM_TREE.forEach(n => { if (n.hasChildren) n.expanded = true; });
    drawBomTree();
  });
  tc.querySelector('#collapse-all')?.addEventListener('click', () => {
    BOM_TREE.forEach(n => { if (n.hasChildren && n.level > 0) n.expanded = false; });
    drawBomTree();
  });

  tc.querySelector('#btn-part-details-modal')?.addEventListener('click', () => openPartDetailsModal(selectedPartId));

  tc.querySelector('#btn-edit-part')?.addEventListener('click', () => {
    const p = PARTS[selectedPartId];
    if (!p) return showToast('No part selected', 'warning');
    const existingWeight = parseFloat(p.weight) || 0;
    showModal(`Edit Part: ${p.pn}`,
      `<div class="detail-grid">
        <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="edit-part-name" value="${p.name || ''}" /></div>
        <div class="form-group"><label class="form-label">Description</label><input class="form-input" id="edit-part-desc" value="${p.description || p.name}" /></div>
        <div class="form-group"><label class="form-label">Make / Buy</label>
          <select class="form-select" id="edit-part-makebuy">
            <option value="0" ${p.makeBuy === 'Make (In-house)' ? 'selected' : ''}>Make (In-house)</option>
            <option value="1" ${p.makeBuy === 'Buy' ? 'selected' : ''}>Buy</option>
          </select></div>
        <div class="form-group"><label class="form-label">Weight (kg)</label><input class="form-input" type="number" step="0.01" id="edit-part-weight" value="${existingWeight}" /></div>
        <div class="form-group"><label class="form-label">Lifecycle Status</label>
          <select class="form-select" id="edit-part-lifecycle">
            <option value="0" ${p.status === 'draft' ? 'selected' : ''}>Draft</option>
            <option value="1" ${p.status === 'review' ? 'selected' : ''}>Review</option>
            <option value="2" ${p.status === 'released' ? 'selected' : ''}>Released</option>
          </select></div>
      </div>`,
      `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
       <button class="btn btn-primary" id="save-part-edit">Save Changes</button>`
    );
    setTimeout(() => {
      document.getElementById('save-part-edit')?.addEventListener('click', async () => {
        const payload = {
          name: document.getElementById('edit-part-name').value,
          description: document.getElementById('edit-part-desc').value,
          makeBuy: parseInt(document.getElementById('edit-part-makebuy').value, 10),
          weight: parseFloat(document.getElementById('edit-part-weight').value || 0),
          lifecycleStatus: parseInt(document.getElementById('edit-part-lifecycle').value, 10),
        };
        try {
          await updatePart(selectedPartId, payload);
          showToast('Part updated on server.', 'success');
        } catch (err) {
          console.error('[PART UPDATE]', err);
          p.name = payload.name;
          p.description = payload.description;
          p.makeBuy = payload.makeBuy === 0 ? 'Make (In-house)' : 'Buy';
          p.weight = payload.weight + ' kg';
          p.status = payload.lifecycleStatus === 0 ? 'draft' : payload.lifecycleStatus === 1 ? 'review' : 'released';
          renderPartDetail(selectedPartId);
          showToast('Part updated locally (server sync failed).', 'warning');
        }
        document.querySelector('.modal-overlay')?.remove();
      });
    }, 50);
  });

  tc.querySelector('#btn-ecr-part')?.addEventListener('click', () => {
    const p = PARTS[selectedPartId];
    if (!p) return showToast('Select a part first', 'warning');
    showToast(`ECR initiated for ${p.pn}. Redirecting to Change Management…`, 'info');
    setTimeout(() => navigateTo('change-mgmt'), 1200);
  });

  tc.querySelector('#btn-where-used')?.addEventListener('click', async () => {
    const p = PARTS[selectedPartId];
    if (!p) return showToast('Select a part first', 'warning');
    const backendPartId = await resolveBackendIdForLocalPart(selectedPartId) || await resolveBackendPartIdByNumber(p.pn);
    if (!backendPartId) {
      return showModal(`Where Used: ${p.pn}`,
        '<div class="text-xs text-secondary">No matching backend part ID found for this part.</div>', '');
    }
    try {
      const whereUsed = await getBomWhereUsed(backendPartId);
      const rows = Array.isArray(whereUsed) ? whereUsed : [];
      const bodyRows = rows.map(item => {
        const parent = item?.parentPart || {};
        const bomNumber = parent.partNumber || item.parentPartNumber || '-';
        const assemblyName = parent.name || item.assemblyName || '-';
        const model = parent.modelCode || item.modelCode || '-';
        const rev = parent.revision || item.revision || '-';
        const qty = item.quantity ?? item.qty ?? '-';
        return `<tr>
          <td class="part-number">${bomNumber}</td>
          <td>${assemblyName}</td>
          <td>${model}</td>
          <td>${rev}</td>
          <td>${qty}</td>
        </tr>`;
      }).join('');
      showModal(`Where Used: ${p.pn}`,
        `<table class="data-table"><thead><tr><th>BOM</th><th>Assembly</th><th>Model</th><th>Rev</th><th>Qty</th></tr></thead>
         <tbody>${bodyRows || '<tr><td colspan="5" class="text-xs text-secondary">No parent assemblies found.</td></tr>'}</tbody></table>`, '');
    } catch (err) {
      console.error('[WHERE-USED]', err);
      showModal(`Where Used: ${p.pn}`,
        `<div class="text-xs text-secondary">Failed to load where-used data: ${err.message}</div>`, '');
    }
  });
}

function drawBomTree() {
  if (!bomContainer) return;
  bomContainer.innerHTML = '';
  let skip = false, skipLevel = 0;
  BOM_TREE.forEach(node => {
    if (skip && node.level > skipLevel) return;
    skip = false;
    const row = document.createElement('div');
    row.className = `bom-node${selectedPartId && (node.partRefId || node.id) === selectedPartId ? ' selected' : ''}`;
    row.dataset.nodeId = node.id || '';
    const indents = Array(node.level).fill('<div class="bom-indent"></div>').join('');
    const toggleHtml = node.hasChildren
      ? `<div class="bom-toggle${node.expanded ? ' expanded' : ''}" data-toggle="${node.id}"><span class="material-icons-outlined">chevron_right</span></div>`
      : `<div class="bom-toggle" style="visibility:hidden"><span class="material-icons-outlined">chevron_right</span></div>`;
    row.innerHTML = `${indents}${toggleHtml}
      <div class="bom-icon ${node.iconClass}"><span class="material-icons-outlined">${node.icon}</span></div>
      <div class="bom-name"><strong>${node.label}</strong><small>${node.pn}</small></div>
      <div class="bom-meta"><span class="bom-qty">×${node.qty}</span><span class="badge ${STATUS_BADGE[node.statusKey]} badge-sm">${STATUS_LABEL[node.statusKey]}</span></div>`;
    bomContainer.appendChild(row);

    row.addEventListener('click', e => {
      if (e.target.closest('.bom-toggle')) return;
      bomContainer.querySelectorAll('.bom-node').forEach(n => n.classList.remove('selected'));
      row.classList.add('selected');
      const detailId = node.partRefId || node.id;
      if (detailId && PARTS[detailId]) { selectedPartId = detailId; renderPartDetail(detailId); }
      else showToast(`Part ${node.pn} — detail view not available in preview`, 'info');
    });

    if (node.hasChildren) {
      row.querySelector('.bom-toggle')?.addEventListener('click', e => {
        e.stopPropagation();
        node.expanded = !node.expanded;
        drawBomTree();
      });
      if (!node.expanded) { skip = true; skipLevel = node.level; }
    }
  });
}

function openPartDetailsModal(partId) {
  const p = PARTS[partId];
  if (!p) return showToast('Select a part first.', 'warning');
  const statusBadge = `<span class="badge badge-${p.status}">${STATUS_LABEL[p.status]}</span>`;
  const isSW = p.cls === 'Software (SW)';
  const docs = p.docs || [];
  const revisions = REVISION_HISTORY[partId] || [{ rev: p.rev, date: p.lastMod, by: p.createdBy || 'System', summary: 'Latest revision snapshot.', status: p.status || 'released' }];

  const docsHtml = docs.length
    ? `<table class="data-table" style="margin-top:8px"><thead><tr><th>Type</th><th>Document</th><th>Status</th></tr></thead><tbody>
        ${docs.map((doc, idx) => {
      const icon = ICON_TYPE[String(doc.type || '').toLowerCase()] || 'description';
      return `<tr>
            <td><span class="material-icons-outlined" style="font-size:16px;vertical-align:middle">${icon}</span> ${doc.type || 'Doc'}</td>
            <td><a href="#" class="part-number" data-doc-link="${idx}">${doc.name}</a></td>
            <td><span class="badge ${STATUS_BADGE[doc.status] || 'badge-draft'} badge-sm">${STATUS_LABEL[doc.status] || 'Draft'}</span></td>
          </tr>`;
    }).join('')}
      </tbody></table>`
    : '<div class="text-xs text-secondary" style="margin-top:8px">No linked drawings/documents.</div>';

  const revisionHtml = `<table class="data-table" style="margin-top:8px"><thead><tr><th>Revision</th><th>Date</th><th>Changed By</th><th>Summary</th><th>Status</th></tr></thead><tbody>
    ${revisions.map(item => `<tr>
      <td class="part-number">${item.rev}</td>
      <td>${item.date}</td>
      <td>${item.by}</td>
      <td>${item.summary}</td>
      <td><span class="badge ${STATUS_BADGE[item.status] || 'badge-draft'} badge-sm">${STATUS_LABEL[item.status] || 'Draft'}</span></td>
    </tr>`).join('')}
  </tbody></table>`;

  showModal(
    `Part Details: ${p.pn}`,
    `<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border-light)">
      <div class="bom-icon ${p.iconClass}" style="width:36px;height:36px;flex-shrink:0"><span class="material-icons-outlined" style="font-size:20px">${p.icon}</span></div>
      <div>
        <div style="font-weight:700;font-size:0.95rem;line-height:1.3">${p.name}</div>
        <div style="font-family:var(--font-mono);font-size:0.786rem;color:var(--brand-primary);margin-top:2px">${p.pn}</div>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-field"><div class="detail-label">Classification</div><div class="detail-value">${p.cls}</div></div>
      <div class="detail-field"><div class="detail-label">Vehicle Type</div><div class="detail-value">${p.vt}</div></div>
      <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">${statusBadge}</div></div>
      <div class="detail-field"><div class="detail-label">Revision</div><div class="detail-value">${p.rev}</div></div>
      <div class="detail-field"><div class="detail-label">Dev Status</div><div class="detail-value">${p.devStatus}</div></div>
      <div class="detail-field"><div class="detail-label">Machining</div><div class="detail-value">${p.machining}</div></div>
      ${!isSW ? `<div class="detail-field"><div class="detail-label">Weight</div><div class="detail-value">${p.weight}</div></div>` : ''}
      <div class="detail-field"><div class="detail-label">Model</div><div class="detail-value">${p.model}</div></div>
      <div class="detail-field"><div class="detail-label">Make / Buy</div><div class="detail-value">${p.makeBuy}</div></div>
      <div class="detail-field"><div class="detail-label">Effectivity</div><div class="detail-value">${p.effectivity}</div></div>
    </div>
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-light)">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="font-weight:700;font-size:0.86rem">Drawings / Linked Documents</div>
        <button class="btn btn-ghost btn-xs" id="open-documents-page"><span class="material-icons-outlined" style="font-size:15px">folder_open</span>Open Documents</button>
      </div>
      ${docsHtml}
    </div>
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-light)">
      <div style="font-weight:700;font-size:0.86rem">Revision History</div>
      ${revisionHtml}
    </div>`,
    '<button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button>'
  );

  setTimeout(() => {
    document.getElementById('open-documents-page')?.addEventListener('click', () => {
      document.querySelector('.modal-overlay')?.remove();
      navigateTo('documents');
    });
    document.querySelectorAll('[data-doc-link]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const doc = docs[Number(link.getAttribute('data-doc-link'))];
        if (doc?.name) { showToast(`Opening ${doc.name}…`, 'info'); navigateTo('documents'); }
      });
    });
  }, 50);
}

async function renderPartDetail(id) {
  if (!detailPanel) return;
  const localP = PARTS[id];
  if (!localP) { detailPanel.innerHTML = '<div class="empty-state"><span class="material-icons-outlined">info</span><h3>No details available</h3></div>'; return; }

  detailPanel.innerHTML = '<div style="padding:40px;text-align:center"><span class="material-icons-outlined" style="animation:spin 1s linear infinite">refresh</span><br/><span class="text-sm text-secondary">Loading details...</span></div>';

  let partData = null;
  let whereUsedData = null;
  try {
    const isTopLevelBom = localP.cls === 'Assembly' &&  !localP.parentId;
    if (isTopLevelBom) {
      if (localP.parentBOMNumber) {
        whereUsedData = {
          linkedBom: {
            id: localP.parentBOMId || 0,
            bomNumber: localP.parentBOMNumber,
            name: 'Parent BOM',
            status: 'Released',
            revisionLetter: 'A'
          },
          usedBoms: []
        };
      }
    } else {
      let backendPartId = id;
      if (isNaN(backendPartId) && typeof resolveBackendIdForLocalPart === 'function') {
        backendPartId = await resolveBackendIdForLocalPart(id) || await resolveBackendPartIdByNumber(localP.pn);
      }
      if (backendPartId) {
        partData = await getPartById(backendPartId);
        whereUsedData = await getBomWhereUsed(backendPartId);
      }
    }
  } catch (err) {
    console.warn('[PART DETAILS]', err);
  }

  const name = partData?.name || localP.name;
  const pn = partData?.partNumber || localP.pn;
  const classification = 'Part';
  const vehicleType = partData?.categoryName || localP.vt || '-';
  const statusLabel = partData?.lifecycleStatusLabel || localP.status || 'Draft';
  const revision = partData ? ((partData.revisionLetter || '') + (partData.revisionDigits || '')) : localP.rev;
  const devStatus = partData?.devStatusCode || localP.devStatus || '-';
  const devStatusName = partData?.devStatusName || '';
  const machining = partData?.machiningName || localP.machining || '-';
  const weight = partData ? ((partData.weight || 0) + ' ' + (partData.unitOfMeasure || 'kg').toLowerCase()) : localP.weight;
  const childParts = localP.children || '0';
  const model = partData?.modelCode || localP.model || '-';
  const makeBuy = partData?.makeBuyLabel || localP.makeBuy || '-';
  const effectivity = localP.effectivity || '-';
  const ais = localP.ais || '-';
  const createdBy = localP.createdBy || 'System';
  const lastMod = partData?.updatedAt ? new Date(partData.updatedAt).toLocaleDateString() : localP.lastMod;

  const statusBadge = `<span class="badge badge-${statusLabel.toLowerCase()}">${statusLabel}</span>`;
  const isSW = classification === 'Software (SW)';
  const iconClass = localP.iconClass || 'part';
  const icon = localP.icon || 'settings';

  let whereUsedHtml = '<p class="text-xs text-secondary">No where-used data found.</p>';
  if (whereUsedData) {
    const isChildPart = whereUsedData.usedBoms && whereUsedData.usedBoms.length > 0;
    const bomsToShow = isChildPart ? whereUsedData.usedBoms : (whereUsedData.linkedBom ? [whereUsedData.linkedBom] : []);

    if (bomsToShow.length > 0) {
      whereUsedHtml = bomsToShow.map(b => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg-muted);border-radius:var(--radius-sm);margin-bottom:6px;border:1px solid var(--border-light)">
          <div class="bom-icon" style="width:32px;height:32px;flex-shrink:0;background:var(--bg-blue-light);color:var(--brand-primary);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center">
            <span class="material-icons-outlined" style="font-size:18px">account_tree</span>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:0.857rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.name || 'Unknown BOM'}</div>
            <div style="font-size:0.714rem;color:var(--text-secondary);font-family:var(--font-mono)">${b.bomNumber || '-'} &middot; Rev ${b.revisionLetter || 'A'} &middot; <span class="badge badge-${(b.status || 'draft').toLowerCase()} badge-sm" style="font-size:0.6rem;padding:2px 4px">${b.status || 'Draft'}</span></div>
          </div>
        </div>
      `).join('');
    }
  }

  const docs = localP.docs?.map(d => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg-muted);border-radius:var(--radius-sm);margin-bottom:6px;cursor:pointer" class="doc-link" data-doc="${d.name}">
      <span class="material-icons-outlined" style="font-size:18px;color:${d.type === 'PDF' ? '#DC2626' : d.type === '3D' ? '#2563EB' : d.type === 'Cert' ? '#059669' : '#7C3AED'}">${ICON_TYPE[String(d.type || '').toLowerCase()] || 'description'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.857rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.name}</div>
        <div style="font-size:0.714rem;color:var(--text-tertiary)">${d.type} · <span class="badge ${STATUS_BADGE[d.status] || 'badge-draft'} badge-sm">${STATUS_LABEL[d.status] || 'Draft'}</span></div>
      </div>
      <button class="btn btn-ghost btn-xs view-doc-btn" data-name="${d.name}"><span class="material-icons-outlined" style="font-size:16px">visibility</span></button>
    </div>`).join('') || '<p class="text-xs text-secondary">No documents linked.</p>';

  detailPanel.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border-light)">
      <div class="bom-icon ${iconClass}" style="width:40px;height:40px;flex-shrink:0"><span class="material-icons-outlined" style="font-size:22px">${icon}</span></div>
      <div>
        <div style="font-weight:700;font-size:1rem;line-height:1.3">${name}</div>
        <div style="font-family:var(--font-mono);font-size:0.786rem;color:var(--brand-primary);margin-top:2px">${pn}</div>
      </div>
    </div>
    <div class="detail-grid" style="margin-bottom:16px">
      <div class="detail-field"><div class="detail-label">Classification</div><div class="detail-value">${classification}</div></div>
      <div class="detail-field"><div class="detail-label">Vehicle Type</div><div class="detail-value">${vehicleType}</div></div>
      <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">${statusBadge}</div></div>
      <div class="detail-field"><div class="detail-label">Revision</div><div class="detail-value">${revision}</div></div>
      <div class="detail-field"><div class="detail-label">Dev Status</div><div class="detail-value"><span class="tag ${devStatus.startsWith('Z') ? 'tag-green' : devStatus.startsWith('Y') ? 'tag-amber' : 'tag-red'}">${devStatus} ${devStatusName ? `- ${devStatusName}` : ''}</span></div></div>
      <div class="detail-field"><div class="detail-label">Machining</div><div class="detail-value">${machining}</div></div>
      ${!isSW ? `<div class="detail-field"><div class="detail-label">Weight</div><div class="detail-value">${weight}</div></div>` : ''}
      ${!isSW ? `<div class="detail-field"><div class="detail-label">Child Parts</div><div class="detail-value">${childParts}</div></div>` : ''}
      <div class="detail-field"><div class="detail-label">Model</div><div class="detail-value">${model}</div></div>
      <div class="detail-field"><div class="detail-label">Make / Buy</div><div class="detail-value">${makeBuy}</div></div>
      <div class="detail-field"><div class="detail-label">Effectivity</div><div class="detail-value">${effectivity}</div></div>
      <div class="detail-field"><div class="detail-label">AIS-038</div><div class="detail-value"><span class="tag ${ais === 'Compliant' ? 'tag-green' : ais === 'N/A' ? '' : 'tag-red'}">${ais}</span></div></div>
      <div class="detail-field"><div class="detail-label">Created By</div><div class="detail-value">${createdBy}</div></div>
      <div class="detail-field"><div class="detail-label">Last Modified</div><div class="detail-value">${lastMod}</div></div>
    </div>
    <div class="divider"></div>
    <div class="section-title"><span class="material-icons-outlined" style="font-size:16px">description</span>Linked Documents</div>
    <div id="docs-list">${docs}</div>
    <div class="divider"></div>
    <div class="section-title"><span class="material-icons-outlined" style="font-size:16px">history</span>Revision History</div>
    <div style="font-size:0.786rem;display:flex;gap:8px;align-items:center;padding:6px 0">
      <span class="badge badge-released badge-sm">${revision}</span>
      <span class="text-secondary">Current production release</span>
      <span class="text-tertiary" style="margin-left:auto">${lastMod}</span>
    </div>
    <div class="divider"></div>
    <div class="section-title"><span class="material-icons-outlined" style="font-size:16px">account_tree</span>Where Used</div>
    <div id="where-used-list">${whereUsedHtml}</div>
    <div class="divider"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline btn-sm btn-full" id="btn-initiate-ecr-detail">
        <span class="material-icons-outlined" style="font-size:16px">published_with_changes</span>Raise ECR
      </button>
      <button class="btn btn-primary btn-sm btn-full" id="btn-view-drawing-detail">
        <span class="material-icons-outlined" style="font-size:16px">description</span>View Drawings
      </button>
    </div>`;

  detailPanel.querySelectorAll('.view-doc-btn, .doc-link').forEach(el => {
    el.addEventListener('click', e => {
      const name = e.target.closest('[data-name],[data-doc]')?.dataset.name || e.target.closest('[data-doc]')?.dataset.doc;
      if (name) showToast(`Opening ${name}…`, 'info');
    });
  });
  detailPanel.querySelector('#btn-initiate-ecr-detail')?.addEventListener('click', () => {
    showToast(`ECR initiated for ${p.pn}`, 'info');
    setTimeout(() => navigateTo('change-mgmt'), 1000);
  });
  detailPanel.querySelector('#btn-view-drawing-detail')?.addEventListener('click', () => navigateTo('documents'));
}

// ─── Part Search (GET from server) ───────────────────────────
async function renderPartSearch(tc) {
  tc.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:16px">
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
          <div class="global-search" style="flex:1;height:40px">
            <span class="material-icons-outlined">search</span>
            <input type="text" id="part-search-input" placeholder="Search by part number (e.g. GA1510010AZ)..." />
          </div>
          <!-- <div class="global-search" style="flex:1;height:40px">
            <span class="material-icons-outlined">tag</span>
            <input type="text" id="part-id-input" placeholder="Search by ID (e.g. 1)..." />
          </div> -->
          <button class="btn btn-primary" id="btn-search-parts">Search</button>
          <button class="btn btn-outline" id="btn-refresh-parts" title="Reload all parts">
            <span class="material-icons-outlined" style="font-size:16px">refresh</span>
          </button>
        </div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:150px">
            <input type="text" class="form-input" id="filter-category" placeholder="Category Type (e.g. G)" />
          </div>
          <div style="flex:1;min-width:150px">
            <input type="text" class="form-input" id="filter-model" placeholder="Model Type (e.g. A1)" />
          </div>
          <div style="flex:1;min-width:150px">
            <input type="text" class="form-input" id="filter-group" placeholder="Group Type (e.g. 5)" />
          </div>
          <div style="flex:1;min-width:150px">
            <input type="number" class="form-input" id="filter-status" placeholder="Status Type" />
          </div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-body no-pad">
        <table class="data-table">
          <thead>
            <tr>
              <th>PART NUMBER</th>
              <th>NAME</th>
              <th>GROUP</th>
              <th>Machining</th>
              <th>Revision</th>
              <th>Dev Status</th>
              <th>Lifecycle</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="search-results">
            <tr><td colspan="9" style="text-align:center;padding:20px">Loading parts from server…</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

  const tbody = tc.querySelector('#search-results');

  let currentItems = [];
  let currentPage = 1;
  const itemsPerPage = 20;

  const displayParts = (items, page = 1) => {
    currentItems = items || [];
    currentPage = page;

    let navContainer = tc.querySelector('#part-search-pagination');

    if (!currentItems.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px">No parts found.</td></tr>';
      if (navContainer) navContainer.remove();
      return;
    }

    const totalRows = currentItems.length;
    const totalPages = Math.ceil(totalRows / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, totalRows);
    const pageItems = currentItems.slice(startIdx, endIdx);

    tbody.innerHTML = pageItems.map(p => `
      <tr>
        <td>${p.id}</td>
        <td><span class="part-number">${p.partNumber}</span></td>
        <td>${p.name || '-'}</td>
        <td><span class="tag tag-gray">${p.groupName || '-'}</span></td>
        <td>${p.machiningName || '-'}</td>
        <td>${p.revisionLetter || ''}${p.revisionDigits || ''}</td>
        <td><span class="tag tag-amber">${p.devStatusCode || '-'}</span></td>
        <td><span class="badge ${p.lifecycleStatus === 0 ? 'badge-draft' : p.lifecycleStatus === 1 ? 'badge-review' : 'badge-released'}">${p.lifecycleStatusLabel || '-'}</span></td>
        <td>
          <button class="btn btn-ghost btn-xs btn-info-part" data-id="${p.id}" title="View"><span class="material-icons-outlined" style="font-size:16px">info</span></button>
          <button class="btn btn-ghost btn-xs btn-edit-part" data-id="${p.id}" title="Edit"><span class="material-icons-outlined" style="font-size:16px">edit</span></button>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('.btn-info-part').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = currentItems.find(i => String(i.id) === btn.dataset.id);
        if (p) openApiPartInfoModal(p);
      });
    });
    tbody.querySelectorAll('.btn-edit-part').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = currentItems.find(i => String(i.id) === btn.dataset.id);
        if (p) openApiPartEditModal(p, () => tc.querySelector('#btn-search-parts')?.click());
      });
    });

    if (totalRows > itemsPerPage) {
      if (!navContainer) {
        navContainer = document.createElement('div');
        navContainer.id = 'part-search-pagination';
        navContainer.style.display = 'flex';
        navContainer.style.justifyContent = 'space-between';
        navContainer.style.alignItems = 'center';
        navContainer.style.padding = '12px 20px';
        navContainer.style.borderTop = '1px solid var(--border-light)';

        const cardBody = tc.querySelector('.card-body.no-pad');
        cardBody.appendChild(navContainer);
      }

      navContainer.innerHTML = `
        <div style="font-size: 0.85rem; color: var(--text-secondary);">
          Showing ${startIdx + 1} to ${endIdx} of ${totalRows} entries
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-outline btn-sm prev-btn" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
          <button class="btn btn-outline btn-sm next-btn" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        </div>
      `;

      navContainer.querySelector('.prev-btn').addEventListener('click', () => {
        if (currentPage > 1) displayParts(currentItems, currentPage - 1);
      });
      navContainer.querySelector('.next-btn').addEventListener('click', () => {
        if (currentPage < totalPages) displayParts(currentItems, currentPage + 1);
      });
    } else {
      if (navContainer) navContainer.remove();
    }
  };

  const loadAll = async (params = {}) => {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px">Loading…</td></tr>';
    try {
      const defaultParams = { page: 1, pageSize: 100, ...params };
      const res = await getParts(defaultParams);
      displayParts(res.items || res || []);
    } catch (err) {
      console.error('[PARTS GET]', err);
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:red">Failed to load parts from server.</td></tr>';
    }
  };

  tc.querySelector('#btn-search-parts')?.addEventListener('click', async () => {
    const inputNumber = tc.querySelector('#part-search-input').value.trim();
    const inputId = tc.querySelector('#part-id-input')?.value?.trim() || '';
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px">Searching…</td></tr>';
    try {
      if (inputId) {
        const item = await getPartById(inputId);
        displayParts(item ? [item] : []);
      } else if (inputNumber) {
        const item = await getPartByNumber(inputNumber);
        displayParts(item ? [item] : []);
      } else {
        const params = {};
        const cat = tc.querySelector('#filter-category')?.value.trim();
        const model = tc.querySelector('#filter-model')?.value.trim();
        const group = tc.querySelector('#filter-group')?.value.trim();
        const status = tc.querySelector('#filter-status')?.value.trim();

        if (cat) params.category = cat;
        if (model) params.model = model;
        if (group) params.group = group;
        if (status) params.status = status;

        await loadAll(params);
      }
    } catch (err) {
      console.error('[PARTS SEARCH]', err);
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:red">Search failed.</td></tr>';
    }
  });

  tc.querySelector('#btn-refresh-parts')?.addEventListener('click', () => {
    tc.querySelector('#part-search-input').value = '';
    const idInput = tc.querySelector('#part-id-input');
    if (idInput) idInput.value = '';
    tc.querySelector('#filter-category').value = '';
    tc.querySelector('#filter-model').value = '';
    tc.querySelector('#filter-group').value = '';
    tc.querySelector('#filter-status').value = '';
    loadAll();
  });
  loadAll();
}

function openApiPartInfoModal(p) {
  showModal(`Part Details: ${p.partNumber}`,
    `<div class="detail-grid">
      <div class="detail-field"><div class="detail-label">Name</div><div class="detail-value">${p.name || '-'}</div></div>
      <div class="detail-field"><div class="detail-label">Group</div><div class="detail-value">${p.groupName || '-'}</div></div>
      <div class="detail-field"><div class="detail-label">Lifecycle</div><div class="detail-value"><span class="badge ${p.lifecycleStatus === 0 ? 'badge-draft' : p.lifecycleStatus === 1 ? 'badge-review' : 'badge-released'}">${p.lifecycleStatusLabel || '-'}</span></div></div>
      <div class="detail-field"><div class="detail-label">Revision</div><div class="detail-value">${p.revisionLetter || ''}${p.revisionDigits || ''}</div></div>
      <div class="detail-field"><div class="detail-label">Dev Status</div><div class="detail-value"><span class="tag tag-amber">${p.devStatusCode || '-'}</span></div></div>
      <div class="detail-field"><div class="detail-label">Machining</div><div class="detail-value">${p.machiningName || '-'}</div></div>
      <div class="detail-field"><div class="detail-label">Weight</div><div class="detail-value">${p.weight ?? p.netWeight ?? '0'} kg</div></div>
      <div class="detail-field"><div class="detail-label">Make / Buy</div><div class="detail-value">${p.makeBuy === 0 ? 'Make (In-house)' : p.makeBuy === 1 ? 'Buy' : '-'}</div></div>
    </div>`,
    '<button class="btn btn-outline" onclick="this.closest(\'.modal-overlay\').remove()">Close</button>'
  );
}

function openApiPartEditModal(p, onSaved) {
  showModal(`Edit Part: ${p.partNumber}`,
    `<div class="detail-grid">
      <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="api-edit-name" value="${p.name || ''}" /></div>
      <div class="form-group"><label class="form-label">Description</label><input class="form-input" id="api-edit-desc" value="${p.description || p.name || ''}" /></div>
      <div class="form-group"><label class="form-label">Make / Buy</label>
        <select class="form-select" id="api-edit-makebuy">
          <option value="0" ${p.makeBuy === 0 ? 'selected' : ''}>Make (In-house)</option>
          <option value="1" ${p.makeBuy === 1 ? 'selected' : ''}>Buy</option>
        </select></div>
      <div class="form-group"><label class="form-label">Weight (kg)</label><input class="form-input" type="number" step="0.01" id="api-edit-weight" value="${p.weight ?? p.netWeight ?? 0}" /></div>
      <div class="form-group"><label class="form-label">Lifecycle Status</label>
        <select class="form-select" id="api-edit-lifecycle">
          <option value="0" ${p.lifecycleStatus === 0 ? 'selected' : ''}>Draft</option>
          <option value="1" ${p.lifecycleStatus === 1 ? 'selected' : ''}>Review</option>
          <option value="2" ${p.lifecycleStatus === 2 ? 'selected' : ''}>Released</option>
        </select></div>
    </div>`,
    `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
     <button class="btn btn-primary" id="api-save-edit">Save Changes</button>`
  );

  setTimeout(() => {
    document.getElementById('api-save-edit')?.addEventListener('click', async () => {
      const payload = {
        name: document.getElementById('api-edit-name').value,
        description: document.getElementById('api-edit-desc').value,
        makeBuy: parseInt(document.getElementById('api-edit-makebuy').value, 10),
        weight: parseFloat(document.getElementById('api-edit-weight').value || 0),
        lifecycleStatus: parseInt(document.getElementById('api-edit-lifecycle').value, 10),
      };
      try {
        await updatePart(p.id, payload);
        showToast('Part updated on server.', 'success');
        document.querySelector('.modal-overlay')?.remove();
        onSaved?.();
      } catch (err) {
        console.error('[PART UPDATE]', err);
        showToast('Error updating part via API.', 'error');
        document.querySelector('.modal-overlay')?.remove();
      }
    });
  }, 50);
}

// ─── BOM Compare ─────────────────────────────────────────────
async function renderBomCompare(tc) {
  tc.innerHTML = `<div style="padding: 20px; text-align: center;">Loading BOMs...</div>`;

  let boms = [];
  try {
    boms = await getAllBomsWithParts();
  } catch (err) {
    console.error('Failed to load BOMs for comparison', err);
  }

  const items = Array.isArray(boms) ? boms : (boms?.items || []);
  const optionsHtml = items.map(b => `<option value="${b.id}">${b.bomNumber || b.name || `BOM-${b.id}`} — ${b.description || 'No description'}</option>`).join('');

  tc.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:16px">
        <div style="display:flex;gap:16px;align-items:center">
          <div style="flex:1"><label class="form-label">BOM A</label>
            <select class="form-select" id="bom-a"><option value="">Select BOM A...</option>${optionsHtml}</select></div>
          <span class="material-icons-outlined" style="color:var(--text-tertiary);align-self:flex-end;padding-bottom:2px">compare_arrows</span>
          <div style="flex:1"><label class="form-label">BOM B</label>
            <select class="form-select" id="bom-b"><option value="">Select BOM B...</option>${optionsHtml}</select></div>
          <div style="align-self:flex-end"><button class="btn btn-primary btn-sm" id="run-compare">Compare</button></div>
        </div>
      </div>
    </div>
    <div class="card" id="compare-result" style="display:none">
      <div class="card-header">
        <div class="card-title"><span class="material-icons-outlined">difference</span>Comparison Results</div>
        <div style="display:flex;gap:8px">
          <span style="display:flex;align-items:center;gap:4px;font-size:0.786rem"><span style="width:10px;height:10px;background:#ECFDF5;border:1px solid #059669;border-radius:2px;display:inline-block"></span>Added</span>
          <span style="display:flex;align-items:center;gap:4px;font-size:0.786rem"><span style="width:10px;height:10px;background:#FEF2F2;border:1px solid #DC2626;border-radius:2px;display:inline-block"></span>Removed</span>
          <span style="display:flex;align-items:center;gap:4px;font-size:0.786rem"><span style="width:10px;height:10px;background:#FFFBEB;border:1px solid #D97706;border-radius:2px;display:inline-block"></span>Changed</span>
        </div>
      </div>
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>Part Number</th><th>Name</th><th>BOM A Qty</th><th>BOM B Qty</th><th>BOM A Rev</th><th>BOM B Rev</th><th>Change</th></tr></thead>
          <tbody id="compare-tbody">
          </tbody>
        </table>
      </div>
    </div>`;

  tc.querySelector('#run-compare')?.addEventListener('click', async () => {
    const bomAId = tc.querySelector('#bom-a').value;
    const bomBId = tc.querySelector('#bom-b').value;
    
    if (!bomAId || !bomBId) return showToast('Please select two BOMs to compare.', 'warning');
    if (bomAId === bomBId) return showToast('Please select different BOMs to compare.', 'warning');

    const btn = tc.querySelector('#run-compare');
    btn.disabled = true;
    btn.textContent = 'Comparing...';

    try {
      showToast('Running BOM comparison...', 'info');
      const [partsA, partsB] = await Promise.all([
        getBomParts(bomAId),
        getBomParts(bomBId)
      ]);

      const listA = Array.isArray(partsA) ? partsA : (partsA?.items || [partsA]);
      const listB = Array.isArray(partsB) ? partsB : (partsB?.items || [partsB]);

      const mapA = {};
      listA.forEach(p => { if (p) mapA[p.partNumber || p.id] = p; });
      const mapB = {};
      listB.forEach(p => { if (p) mapB[p.partNumber || p.id] = p; });

      const allPartIds = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
      const diffs = [];

      for (const pid of allPartIds) {
        const partA = mapA[pid];
        const partB = mapB[pid];
        
        if (partA && !partB) {
          diffs.push({ part: partA, aQty: partA.quantity ?? 1, bQty: '—', aRev: partA.revisionLetter || '—', bRev: '—', type: 'REMOVED', style: 'background:#FEF2F2', badge: 'badge-rejected' });
        } else if (!partA && partB) {
          diffs.push({ part: partB, aQty: '—', bQty: partB.quantity ?? 1, aRev: '—', bRev: partB.revisionLetter || '—', type: 'ADDED', style: 'background:#ECFDF5', badge: 'badge-released' });
        } else {
          // Both have it
          const qA = partA.quantity ?? 1;
          const qB = partB.quantity ?? 1;
          const rA = partA.revisionLetter || '—';
          const rB = partB.revisionLetter || '—';
          
          if (qA !== qB) {
            diffs.push({ part: partA, aQty: qA, bQty: qB, aRev: rA, bRev: rB, type: 'QTY CHANGE', style: 'background:#FFFBEB', badge: 'badge-review' });
          } else if (rA !== rB) {
            diffs.push({ part: partA, aQty: qA, bQty: qB, aRev: rA, bRev: rB, type: 'REV CHANGE', style: 'background:#FFFBEB', badge: 'badge-review' });
          } else {
            diffs.push({ part: partA, aQty: qA, bQty: qB, aRev: rA, bRev: rB, type: 'NO CHANGE', style: '', badge: 'badge-draft' });
          }
        }
      }

      const tbody = tc.querySelector('#compare-tbody');
      if (diffs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 20px;">No differences found.</td></tr>';
      } else {
        tbody.innerHTML = diffs.map(d => `
          <tr style="${d.style}">
            <td class="part-number">${d.part.partNumber || d.part.id || '-'}</td>
            <td>${d.part.name || '-'}</td>
            <td>${d.aQty}</td>
            <td>${d.bQty}</td>
            <td>${d.aRev}</td>
            <td>${d.bRev}</td>
            <td><span class="badge ${d.badge} badge-sm">${d.type}</span></td>
          </tr>
        `).join('');
      }

      tc.querySelector('#compare-result').style.display = '';
      showToast('BOM comparison complete.', 'success');
    } catch (err) {
      console.error('BOM Compare error', err);
      showToast('Error comparing BOMs.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Compare';
    }
  });
}

// ─── Create Part ─────────────────────────────────────────────
function renderCreatePart(tc) {
  const standardGroups = GROUP_NUMBERS.filter(g => !g.isHardware);

  tc.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><span class="material-icons-outlined">add_circle</span>Create New Part — 11-Digit Part Number</div>
      </div>
      <div class="card-body">
        <div style="background:var(--brand-primary-lighter);border:1px solid var(--brand-primary);border-radius:var(--radius-md);padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;gap:14px">
          <span class="material-icons-outlined" style="color:var(--brand-primary)">auto_fix_high</span>
          <div>
            <div style="font-weight:600;color:var(--brand-primary)">Auto-Generated Part Number</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px">Category + Model + Group + Sub + Serial(3) + Machining + RevLetter + DevStatus = 11 digits</div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div style="font-size:0.786rem;color:var(--text-secondary)">Generated Part Number</div>
            <div style="font-family:var(--font-mono);font-size:1.1rem;font-weight:700;letter-spacing:2px;color:var(--brand-primary)" id="pn-final">—</div>
          </div>
        </div>

        <div class="grid-2" style="gap:20px">
          <div class="form-group">
            <label class="form-label">Product Category <span style="color:#DC2626">*</span></label>
            <select class="form-select" id="cp-cat">
              ${optionsHtml(PRODUCT_CATEGORIES, 'code', 'label')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Model Number <span style="color:#DC2626">*</span></label>
            <select class="form-select" id="cp-model">
              ${optionsHtml(MODEL_NUMBERS, 'code', 'label')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Group Number <span style="color:#DC2626">*</span></label>
            <select class="form-select" id="cp-group">
              ${standardGroups.map(g => `<option value="${g.groupCode}:${g.subCode}">${g.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Machining / Assembly Status <span style="color:#DC2626">*</span></label>
            <select class="form-select" id="cp-machine">
              ${optionsHtml(MACHINING_STATUS, 'code', 'label')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Revision Letter <span style="color:#DC2626">*</span></label>
            <select class="form-select" id="cp-revision">
              ${REVISION_LETTERS.map(l => `<option value="${l}">${l}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Development Status <span style="color:#DC2626">*</span></label>
            <select class="form-select" id="cp-dev-status">
              ${optionsHtml(DEV_STATUS, 'code', 'label')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Part Name <span style="color:#DC2626">*</span></label>
            <input class="form-input" id="cp-name" placeholder="e.g. BLDC HUB MOTOR 250W 48V" maxlength="60" />
            <div class="text-xs text-secondary" style="margin-top:4px">Uppercase only. Max 60 characters.</div>
          </div>
          <div class="form-group">
            <label class="form-label">Classification <span style="color:#DC2626">*</span></label>
            <select class="form-select" id="cp-cls">
              <option>Assembly</option>
              <option>Mechanical/Electrical</option>
              <option>Electronic</option>
              <option>Software (SW)</option>
              <option>Electrical</option>
              <option>Hardware</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Make / Buy <span style="color:#DC2626">*</span></label>
            <select class="form-select" id="cp-makebuy">
              <option value="0">0 - FSS Full Supplier Scope</option>
              <option value="1">1 - Make (In-house)</option>
              <option value="2">2 - BTP Built to Print</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Unit of Measure</label>
            <select class="form-select" id="cp-uom">
              <option value="Each">Each</option>
              <option value="Kg">Kg</option>
              <option value="Set">Set</option>
              <option value="Pair">Pair</option>
              <option value="Metre">Metre</option>
              <option value="Lot">Lot</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Weight (kg)</label>
            <input class="form-input" id="cp-weight" type="number" step="0.001" placeholder="0.000" />
          </div>
          <div class="form-group">
            <label class="form-label">Material / Grade</label>
            <input class="form-input" id="cp-material" placeholder="e.g. CRCA Steel IS:1079 Grade D" />
          </div>
          <div class="form-group">
            <label class="form-label">Homologation Required</label>
            <select class="form-select" id="cp-homo"><option value="0">No</option><option value="1">Yes</option></select>
          </div>
          <div class="form-group">
            <label class="form-label">Supplier Name</label>
            <select class="form-select" id="cp-supplier">
              <option value="na">Not Applicable</option>
              <option value="manual">Enter Manually</option>
            </select>
          </div>
          <div class="form-group" id="supplier-name-group" style="display:none">
            <label class="form-label">Supplier Name <span style="color:#DC2626">*</span></label>
            <input class="form-input" id="supplier-name-input" placeholder="Enter supplier company name" />
          </div>
          <div class="form-group" id="supplier-email-group" style="display:none">
            <label class="form-label">Supplier Email <span style="color:#DC2626">*</span></label>
            <input class="form-input" type="email" id="supplier-email-input" placeholder="supplier@company.com" />
          </div>
          <div class="form-group" id="send-email-group" style="display:none">
            <label class="form-label">Send Notification Email?</label>
            <select class="form-select" id="send-email-select">
              <option value="">Select…</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div class="form-group" id="supplier-checkbox-group" style="display:none">
            <label style="display:flex;align-items:center;gap:8px;font-size:0.857rem;cursor:pointer">
              <input type="checkbox" id="supplier-confirm-checkbox" style="accent-color:var(--brand-primary)" />
              Confirm supplier details are correct
            </label>
          </div>
        </div>

        <div class="form-group" style="margin-top:8px">
          <label class="form-label">Description / Technical Notes</label>
          <textarea class="form-input" id="cp-desc" rows="3" placeholder="Additional technical specifications or notes…" style="resize:vertical"></textarea>
        </div>

        <div style="display:flex;gap:12px;justify-content:flex-end">
          <button class="btn btn-outline" id="cp-save-draft">Save as Draft</button>
          <button class="btn btn-primary" id="cp-submit">
            <span class="material-icons-outlined" style="font-size:16px">send</span>Create & Submit for Review
          </button>
        </div>
      </div>
    </div>`;

  // Auto-update part number
  const updatePN = () => {
    const [gc, sc] = String(tc.querySelector('#cp-group')?.value || '').split(':');
    const catCode = tc.querySelector('#cp-cat')?.value || '';
    const modelCode = tc.querySelector('#cp-model')?.value || '';
    const serial = getNextSerial({ categoryCode: catCode, modelCode, groupCode: gc || '', subCode: sc || '' });
    const pn = buildPartNumber({
      categoryCode: catCode,
      modelCode,
      groupCode: gc || '',
      subCode: sc || '',
      serial,
      machiningCode: tc.querySelector('#cp-machine')?.value || '0',
      revisionLetter: tc.querySelector('#cp-revision')?.value || 'A',
      devStatusCode: tc.querySelector('#cp-dev-status')?.value || 'X',
    });
    const el = tc.querySelector('#pn-final');
    if (el) el.textContent = pn || '—';
  };

  tc.querySelectorAll('#cp-cat, #cp-model, #cp-group, #cp-machine, #cp-revision, #cp-dev-status')
    .forEach(el => el.addEventListener('change', updatePN));
  updatePN();

  // Part name: uppercase
  tc.querySelector('#cp-name')?.addEventListener('input', e => {
    e.target.value = e.target.value.toUpperCase();
  });

  // Supplier cascade
  const supplierSelect = tc.querySelector('#cp-supplier');
  const nameGroup = tc.querySelector('#supplier-name-group');
  const nameInput = tc.querySelector('#supplier-name-input');
  const emailGroup = tc.querySelector('#supplier-email-group');
  const emailInput = tc.querySelector('#supplier-email-input');
  const sendGroup = tc.querySelector('#send-email-group');
  const sendSelect = tc.querySelector('#send-email-select');
  const confirmGroup = tc.querySelector('#supplier-checkbox-group');

  supplierSelect?.addEventListener('change', e => {
    const isManual = e.target.value === 'manual';
    nameGroup.style.display = isManual ? 'block' : 'none';
    emailGroup.style.display = 'none';
    sendGroup.style.display = 'none';
    confirmGroup.style.display = 'none';
    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (sendSelect) sendSelect.value = '';
  });

  nameInput?.addEventListener('input', e => {
    emailGroup.style.display = e.target.value.trim() ? 'block' : 'none';
    if (!e.target.value.trim()) { sendGroup.style.display = 'none'; confirmGroup.style.display = 'none'; }
  });

  emailInput?.addEventListener('input', e => {
    sendGroup.style.display = e.target.value.trim() ? 'block' : 'none';
    if (!e.target.value.trim()) confirmGroup.style.display = 'none';
  });

  sendSelect?.addEventListener('change', e => {
    confirmGroup.style.display = e.target.value ? 'block' : 'none';
  });

  tc.querySelector('#cp-save-draft')?.addEventListener('click', () => {
    showToast('Part saved as draft. Continue editing.', 'info');
  });

  tc.querySelector('#cp-submit')?.addEventListener('click', async () => {
    const name = tc.querySelector('#cp-name')?.value?.trim();
    const [groupCode, subGroupCode] = String(tc.querySelector('#cp-group')?.value || '').split(':');
    const categoryCode = tc.querySelector('#cp-cat')?.value?.trim();
    const modelCode = tc.querySelector('#cp-model')?.value?.trim();
    const machiningCode = tc.querySelector('#cp-machine')?.value?.trim();
    const revisionLetter = tc.querySelector('#cp-revision')?.value?.trim();
    const devStatusCode = tc.querySelector('#cp-dev-status')?.value?.trim();
    const unitOfMeasure = tc.querySelector('#cp-uom')?.value?.trim();

    if (!name) return showToast('Part name is required.', 'error');
    if (!categoryCode || !modelCode || !groupCode || !subGroupCode) return showToast('Category, model, and group are required.', 'error');

    const supplierMode = supplierSelect?.value || 'na';
    const supplierName = supplierMode === 'manual' ? (nameInput?.value?.trim() || '') : 'Not Applicable';
    const supplierEmail = supplierMode === 'manual' ? (emailInput?.value?.trim() || '') : 'na@company.com';

    if (supplierMode === 'manual') {
      if (!supplierName) return showToast('Supplier name is required.', 'error');
      if (!supplierEmail) return showToast('Supplier email is required.', 'error');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierEmail)) return showToast('Enter a valid supplier email.', 'error');
    }

    const serial = getNextSerial({ categoryCode, modelCode, groupCode, subCode: subGroupCode });
    const generatedPartNumber = buildPartNumber({ categoryCode, modelCode, groupCode, subCode: subGroupCode, serial, machiningCode, revisionLetter, devStatusCode });

    const payload = {
      categoryCode,            // "G"
      modelCode,               // "A1"
      groupCode,               // "5"
      subGroupCode,            // "1"
      serialNumber: serial,    // "001"
      machiningCode,           // "0"
      revisionLetter,          // "A"
      devStatusCode,           // "Z"
      name,
      description: tc.querySelector('#cp-desc')?.value?.trim() || '',
      makeBuy: Number(tc.querySelector('#cp-makebuy')?.value || 0),
      weight: Number(tc.querySelector('#cp-weight')?.value || 0),
      unitOfMeasure,
      gstCode: '',
      material: tc.querySelector('#cp-material')?.value?.trim() || '',
      homologation: Number(tc.querySelector('#cp-homo')?.value || 0),
      supplierName,
      supplierEmail,
    };

    const submitBtn = tc.querySelector('#cp-submit');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px">autorenew</span>Creating…'; }

    try {
      const resp = await createPart(payload);
      showToast(`Part ${generatedPartNumber} created and submitted for review!`, 'success');
      setTimeout(() => navigateTo('workflows'), 1500);
    } catch (err) {
      console.error('[PART CREATE] Error:', err);
      showToast(err instanceof Error ? err.message : 'Unable to create part.', 'error');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px">send</span>Create & Submit for Review'; }
    }
  });
  updatePN();
}

// ─── Link BOM Modal ───────────────────────────────────────────
function openLinkBomModal() {
  document.querySelector('.modal-overlay')?.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
  <div class="modal" style="width: 500px">
    <div class="modal-header">
      <div class="modal-title">Link Child BOM to Parent BOM</div>
      <button class="modal-close btn-close-modal"><span class="material-icons-outlined">close</span></button>
    </div>
    <div class="modal-body">
      <div style="background:rgba(59,130,246,0.1); border-left:3px solid var(--brand-primary); padding:12px; border-radius:4px; font-size:0.85rem; margin-bottom:16px; color:var(--text-secondary);">
        Link an existing Assembly/BOM as a child line item to another existing Parent BOM.
      </div>
      <div class="form-group">
        <label class="form-label">Parent BOM <span style="color:#DC2626">*</span></label>
        <input class="form-input" id="link-parent-bom" list="link-bom-datalist" placeholder="Select or type Parent BOM..." />
      </div>
      <div class="form-group" style="margin-top:16px">
        <label class="form-label">Child BOM <span style="color:#DC2626">*</span></label>
        <input class="form-input" id="link-child-bom" list="link-bom-datalist" placeholder="Select or type Child BOM..." />
      </div>
      <datalist id="link-bom-datalist"></datalist>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline btn-close-modal">Cancel</button>
      <button class="btn btn-primary" id="btn-submit-link-bom" style="background:var(--brand-secondary); border-color:var(--brand-secondary);">Link BOMs</button>
    </div>
  </div>`;
  document.body.appendChild(modal);

  // Populate datalist
  const datalist = modal.querySelector('#link-bom-datalist');
  const bomMap = {};
  getAllBomsWithParts().then(boms => {
    const items = Array.isArray(boms) ? boms : (boms?.items || []);
    items.forEach(b => {
      const label = `${b.name || b.bomNumber || '-'}${b.description ? ' — ' + b.description : ''}`;
      bomMap[label] = b.id;
      const opt = document.createElement('option');
      opt.value = label;
      datalist?.appendChild(opt);
    });
  }).catch(() => { /* silently fail */ });

  setTimeout(() => {
    modal.querySelectorAll('.btn-close-modal').forEach(b => b.addEventListener('click', () => modal.remove()));
    modal.querySelector('#link-parent-bom')?.focus();

    modal.querySelector('#btn-submit-link-bom')?.addEventListener('click', async (e) => {
      const btn = e.target;
      const parentVal = modal.querySelector('#link-parent-bom').value.trim();
      const childVal = modal.querySelector('#link-child-bom').value.trim();

      const parentId = bomMap[parentVal];
      const childId = bomMap[childVal];

      if (!parentId) return showToast('Please select a valid Parent BOM.', 'error');
      if (!childId) return showToast('Please select a valid Child BOM.', 'error');
      if (parentId === childId) return showToast('Parent and Child BOMs cannot be the same.', 'error');

      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px">autorenew</span>Linking...';

      try {
        await linkBomWithParent(childId, parentId);
        showToast('BOMs successfully linked!', 'success');
        modal.remove();
        // Trigger a refresh if on BOM Navigator
        const refreshBtn = document.querySelector('#btn-refresh-bom');
        if (refreshBtn) refreshBtn.click();
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to link BOMs', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Link BOMs';
      }
    });
  }, 50);
}
