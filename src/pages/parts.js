import { showToast, showModal, navigateTo, getCurrentUserRole } from '../main.js';
import { authFetch } from '../api/client.js';
import { createPart, getParts, getPartById, getPartByNumber, updatePart, revisePart, deletePart, fetchSuppliers } from '../api/parts.js';
import { createBom, getBomTree, updateBomLine, deleteBomLine, getBomLines, getBomWhereUsed, getBoms, getBomParts, getBomById, getAllBomsWithParts, addBomLine } from '../api/bom.js';

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
  { code: 'A1', label: 'A1 ' },
  { code: 'B1', label: 'B1 ' },
  { code: 'C1', label: 'C1 ' },
  { code: 'D1', label: 'D1 ' },
  { code: 'E1', label: 'E1 ' },
  { code: 'F1', label: 'F1 ' },
  { code: 'G1', label: 'G1 ' },
  { code: 'H1', label: 'H1 ' },
  { code: 'J1', label: 'J1 ' },
  { code: 'K1', label: 'K1 ' },
  { code: 'L1', label: 'L1 ' },
  { code: 'M1', label: 'M1 ' },
  { code: 'N1', label: 'N1 ' },
  { code: 'HW', label: 'HW ' },
  { code: 'S1', label: 'S1 ' },
  { code: 'TL', label: 'TL ' },
  { code: 'U1', label: 'U1 ' },
];

const GROUP_NUMBERS = [];

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

// ─── Serial auto-increment from purely backend parts ────────────
async function getNextSerial({ categoryCode, modelCode, groupCode, subCode }) {
  if (!categoryCode || !modelCode || !groupCode || !subCode) return '001';
  const prefix = `${categoryCode}${modelCode}${groupCode}${subCode}`.toUpperCase();
  let maxSerial = 0;
  try {
    const res = await getParts();
    const items = Array.isArray(res) ? res : (res?.items || []);
    items.forEach(node => {
      let pn = '';
      if (node.partNumber) pn = node.partNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (pn.startsWith(prefix) && pn.length >= prefix.length + 3) {
        const serial = Number(pn.slice(prefix.length, prefix.length + 3));
        if (Number.isFinite(serial) && serial > maxSerial) maxSerial = serial;
      } else if (node.categoryCode === categoryCode && node.modelCode === modelCode && node.groupCode === groupCode && node.subGroupCode === subCode) {
        const serial = Number(node.serialNumber);
        if (Number.isFinite(serial) && serial > maxSerial) maxSerial = serial;
      }
    });
  } catch (e) {
    console.warn('Failed to fetch parts for serial', e);
  }
  return String(Math.min(999, maxSerial + 1)).padStart(3, '0');
}

// ─── Part data (mock/local cache) ────────────────────────────
const PARTS = {
  'GA1-01': { name: 'E-Luna Go — Complete Vehicle Assembly', pn: 'ASSY-GA1-01-Z', cls: 'Assembly', vt: '2-Wheeler (L2)', status: 'released', rev: 'Rev A', devStatus: 'Z — Mass Production', machining: '0 — Assembly', weight: '68.5 kg (roll-up)', children: '23 (5 assemblies)', model: 'GA — E-Luna Go', makeBuy: 'Make (In-house)', effectivity: '01-Jan-2026', ais: 'Compliant', createdBy: 'Priya Mehta', lastMod: '28-Mar-2026', icon: 'widgets', iconClass: 'assy', docs: [{ name: 'DRW-01-GA1-RevA.pdf', type: 'PDF', status: 'released' }, { name: 'GA1-Complete-Assy.STEP', type: '3D', status: 'released' }] },
  'GA1-51': { name: 'Powertrain Assembly (Motor + Controller)', pn: 'ASSY-GA1-51-Z', cls: 'Assembly', vt: '2-Wheeler (L2)', status: 'released', rev: 'Rev A', devStatus: 'Z — Mass Production', machining: '0 — Assembly', weight: '12.3 kg (roll-up)', children: '3', model: 'GA — E-Luna Go', makeBuy: 'Make (In-house)', effectivity: '01-Jan-2026', ais: 'Compliant', createdBy: 'Amit Kumar', lastMod: '20-Mar-2026', icon: 'settings', iconClass: 'assy', docs: [{ name: 'DRW-51-ASSY-GA1-RevA.pdf', type: 'PDF', status: 'released' }] },
  'GA151001': { name: 'BLDC Hub Motor 250W 48V', pn: 'GA1510010AZ', cls: 'Mechanical/Electrical', vt: '2-Wheeler (L2/L3)', status: 'released', rev: 'Rev A', devStatus: 'Z — Mass Production', machining: '1 — Finished Part', weight: '4.8 kg', children: '—', model: 'GA — E-Luna Go', makeBuy: 'Buy', effectivity: '01-Jan-2026', ais: 'Compliant', createdBy: 'Priya Mehta', lastMod: '15-Feb-2026', icon: 'electric_bolt', iconClass: 'part', supplier: 'Bosch India', docs: [{ name: 'DRW-51-GA151001-RevA.pdf', type: 'PDF', status: 'released' }] },
  'GA158001': { name: 'Motor Control Unit / VCU 48V 30A', pn: 'GA1580011AZ', cls: 'Electronic', vt: '2-Wheeler (L2/L3)', status: 'released', rev: 'Rev A', devStatus: 'Z — Mass Production', machining: '1 — Finished Part', weight: '0.65 kg', children: '—', model: 'GA — E-Luna Go', makeBuy: 'Buy', effectivity: '01-Jan-2026', ais: 'Compliant', createdBy: 'Amit Kumar', lastMod: '10-Feb-2026', icon: 'developer_board', iconClass: 'part', supplier: 'Internal / Minda', docs: [{ name: 'DRW-58-GA158001-RevA.pdf', type: 'PDF', status: 'released' }] },
  'GA159001': { name: 'Throttle Position Sensor 5kΩ', pn: 'GA1590011AZ', cls: 'Electronic', vt: '2-Wheeler', status: 'released', rev: 'Rev A', devStatus: 'Z — Mass Production', machining: '1 — Finished Part', weight: '0.08 kg', children: '—', model: 'GA — E-Luna Go', makeBuy: 'Buy', effectivity: '01-Jan-2026', ais: 'N/A', createdBy: 'Priya Mehta', lastMod: '12-Feb-2026', icon: 'sensors', iconClass: 'part', supplier: 'Sensata', docs: [] },
  'GA1-52': { name: 'Energy System Assembly', pn: 'ASSY-GA1-52-Z', cls: 'Assembly', vt: '2-Wheeler (L2)', status: 'released', rev: 'Rev A', devStatus: 'Z — Mass Production', machining: '0 — Assembly', weight: '14.1 kg (roll-up)', children: '4', model: 'GA — E-Luna Go', makeBuy: 'Make (In-house)', effectivity: '01-Jan-2026', ais: 'Compliant', createdBy: 'Rohit Sharma', lastMod: '22-Mar-2026', icon: 'battery_charging_full', iconClass: 'assy', docs: [{ name: 'DRW-52-ASSY-GA1-RevA.pdf', type: 'PDF', status: 'released' }] },
  'GA152001': { name: 'Li-Ion Battery Pack 2kWh 48V (Removable)', pn: 'GA1520011AZ', cls: 'Electrical', vt: '2-Wheeler (L2)', status: 'released', rev: 'Rev A', devStatus: 'Z — Mass Production', machining: '1 — Finished Part', weight: '11.2 kg', children: '—', model: 'GA — E-Luna Go', makeBuy: 'Buy', effectivity: '01-Jan-2026', ais: 'Compliant', createdBy: 'Rohit Sharma', lastMod: '01-Mar-2026', icon: 'battery_full', iconClass: 'part', supplier: 'CATL / Exide', docs: [{ name: 'CERT-AIS038-GA152001.pdf', type: 'Cert', status: 'released' }] },
  'GA152002': { name: 'Battery Management System (BMS) 48V 40A', pn: 'GA1520021AZ', cls: 'Electronic', vt: '2-Wheeler (L2)', status: 'released', rev: 'Rev A', devStatus: 'Z — Mass Production', machining: '1 — Finished Part', weight: '0.42 kg', children: '—', model: 'GA — E-Luna Go', makeBuy: 'Buy', effectivity: '01-Jan-2026', ais: 'Compliant', createdBy: 'Priya Mehta', lastMod: '05-Apr-2026', icon: 'memory', iconClass: 'part', supplier: 'TI / STMicro', docs: [{ name: 'DRW-52-GA152002-RevA.pdf', type: 'PDF', status: 'review' }] },
  'SW-GA1-52': { name: 'BMS Firmware v1.8.2 (SW Part)', pn: 'SW-GA1-52-001AZ', cls: 'Software (SW)', vt: '2-Wheeler (L2)', status: 'released', rev: 'v1.8.2', devStatus: 'Z — Mass Production', machining: 'N/A', weight: 'N/A', children: '—', model: 'GA — E-Luna Go', makeBuy: 'Make (In-house)', effectivity: '01-Jan-2026', ais: 'Compliant', createdBy: 'Vikram Thakur', lastMod: '28-Mar-2026', icon: 'code', iconClass: 'sw', fwVersion: 'v1.8.2', gitHash: '7a2e41c', targetMCU: 'STM32F407', supplier: 'Internal FW Team', docs: [{ name: 'FW-BMS-v1.8.2.bin', type: 'BIN', status: 'released' }] },
  'GA160001': { name: 'On-Board Charger 48V 5A', pn: 'GA1600011AZ', cls: 'Electrical', vt: '2-Wheeler (L2)', status: 'released', rev: 'Rev A', devStatus: 'Z — Mass Production', machining: '1 — Finished Part', weight: '0.85 kg', children: '—', model: 'GA — E-Luna Go', makeBuy: 'Buy', effectivity: '01-Jan-2026', ais: 'N/A', createdBy: 'Rohit Sharma', lastMod: '18-Feb-2026', icon: 'ev_station', iconClass: 'part', supplier: 'Delta Electronics', docs: [] },
  'GA1-02': { name: 'Frame Assembly', pn: 'ASSY-GA1-02-Z', cls: 'Assembly', vt: '2-Wheeler (L2)', status: 'released', rev: 'Rev A', devStatus: 'Z — Mass Production', machining: '0 — Assembly', weight: '18.5 kg (roll-up)', children: '3', model: 'GA — E-Luna Go', makeBuy: 'Make (In-house)', effectivity: '01-Jan-2026', ais: 'N/A', createdBy: 'Neha Nair', lastMod: '04-Apr-2026', icon: 'construction', iconClass: 'assy', docs: [{ name: 'DRW-02-GA102001-RevA.STEP', type: '3D', status: 'draft' }] },
  'GA1-05': { name: 'Body & Trim Assembly', pn: 'ASSY-GA1-05-Z', cls: 'Assembly', vt: '2-Wheeler (L2)', status: 'review', rev: 'Rev A', devStatus: 'Y — Pilot Production', machining: '0 — Assembly', weight: '5.2 kg (roll-up)', children: '2', model: 'GA — E-Luna Go', makeBuy: 'Make (In-house)', effectivity: 'TBD', ais: 'N/A', createdBy: 'Neha Nair', lastMod: '05-Apr-2026', icon: 'directions_bike', iconClass: 'assy', docs: [{ name: 'DRW-05-ASSY-GA1-RevA.pdf', type: 'PDF', status: 'review' }] },
  'GA1-55': { name: 'Lighting System Assembly', pn: 'ASSY-GA1-55-Z', cls: 'Assembly', vt: '2-Wheeler (L2)', status: 'released', rev: 'Rev A', devStatus: 'Z — Mass Production', machining: '0 — Assembly', weight: '1.8 kg (roll-up)', children: '3', model: 'GA — E-Luna Go', makeBuy: 'Make (In-house)', effectivity: '01-Jan-2026', ais: 'N/A', createdBy: 'Priya Mehta', lastMod: '10-Mar-2026', icon: 'lightbulb', iconClass: 'assy', docs: [{ name: 'DRW-55-ASSY-GA1-RevA.pdf', type: 'PDF', status: 'released' }] },
};

const BOM_TREE = [
  { id: 'GA1-01', level: 0, hasChildren: true, label: 'E-Luna Go — Complete Vehicle Assembly', pn: 'ASSY-GA1-01-Z', statusKey: 'released', qty: '1', iconClass: 'assy', icon: 'widgets', expanded: true },
  { id: 'GA1-51', level: 1, hasChildren: true, label: 'Powertrain Assembly (Motor + Controller)', pn: 'ASSY-GA1-51-Z', statusKey: 'released', qty: '1', iconClass: 'assy', icon: 'settings', expanded: true },
  { id: 'GA151001', level: 2, hasChildren: false, label: 'BLDC Hub Motor 250W 48V', pn: 'GA1510010AZ', statusKey: 'released', qty: '1', iconClass: 'part', icon: 'electric_bolt' },
  { id: 'GA158001', level: 2, hasChildren: false, label: 'Motor Control Unit / VCU 48V 30A', pn: 'GA1580011AZ', statusKey: 'released', qty: '1', iconClass: 'part', icon: 'developer_board' },
  { id: 'GA159001', level: 2, hasChildren: false, label: 'Throttle Position Sensor 5kΩ', pn: 'GA1590011AZ', statusKey: 'released', qty: '1', iconClass: 'part', icon: 'sensors' },
  { id: 'GA1-52', level: 1, hasChildren: true, label: 'Energy System Assembly', pn: 'ASSY-GA1-52-Z', statusKey: 'released', qty: '1', iconClass: 'assy', icon: 'battery_charging_full', expanded: true },
  { id: 'GA152001', level: 2, hasChildren: false, label: 'Li-Ion Battery Pack 2kWh 48V', pn: 'GA1520011AZ', statusKey: 'released', qty: '1', iconClass: 'part', icon: 'battery_full' },
  { id: 'GA152002', level: 2, hasChildren: false, label: 'BMS PCB 48V 40A', pn: 'GA1520021AZ', statusKey: 'released', qty: '1', iconClass: 'part', icon: 'memory' },
  { id: 'SW-GA1-52', level: 2, hasChildren: false, label: 'BMS Firmware v1.8.2 (SW)', pn: 'SW-GA1-52-001AZ', statusKey: 'released', qty: '1', iconClass: 'sw', icon: 'code' },
  { id: 'GA160001', level: 2, hasChildren: false, label: 'On-Board Charger 48V 5A', pn: 'GA1600011AZ', statusKey: 'released', qty: '1', iconClass: 'part', icon: 'ev_station' },
  { id: 'GA1-02', level: 1, hasChildren: true, label: 'Frame Assembly', pn: 'ASSY-GA1-02-Z', statusKey: 'released', qty: '1', iconClass: 'assy', icon: 'construction', expanded: true },
  { id: null, level: 2, hasChildren: false, label: 'Tubular Steel Frame CRCA IS:1079', pn: 'GA1020012AZ', statusKey: 'released', qty: '1', iconClass: 'part', icon: 'view_in_ar' },
  { id: null, level: 2, hasChildren: false, label: 'Front Fork Telescopic Assembly', pn: 'GA1060011AZ', statusKey: 'released', qty: '1', iconClass: 'part', icon: 'view_in_ar' },
  { id: null, level: 2, hasChildren: false, label: 'Alloy Wheel 12" with Tyre', pn: 'GA1080011AZ', statusKey: 'released', qty: '2', iconClass: 'part', icon: 'tire_repair' },
  { id: 'GA1-05', level: 1, hasChildren: true, label: 'Body & Trim Assembly', pn: 'ASSY-GA1-05-Z', statusKey: 'review', qty: '1', iconClass: 'assy', icon: 'directions_bike', expanded: true },
  { id: null, level: 2, hasChildren: false, label: 'ABS Plastic Body Panel (Painted)', pn: 'GA1050016AZ', statusKey: 'review', qty: '1', iconClass: 'part', icon: 'palette' },
  { id: null, level: 2, hasChildren: false, label: 'Ergonomic Seat Assembly', pn: 'GA1040011AZ', statusKey: 'released', qty: '1', iconClass: 'part', icon: 'event_seat' },
  { id: 'GA1-55', level: 1, hasChildren: true, label: 'Lighting System Assembly', pn: 'ASSY-GA1-55-Z', statusKey: 'released', qty: '1', iconClass: 'assy', icon: 'lightbulb', expanded: true },
  { id: null, level: 2, hasChildren: false, label: 'LED Headlamp with DRL 12V', pn: 'GA1550011AZ', statusKey: 'released', qty: '1', iconClass: 'part', icon: 'highlight' },
  { id: null, level: 2, hasChildren: false, label: 'LED Tail Lamp + Stop Lamp', pn: 'GA1550021AZ', statusKey: 'released', qty: '1', iconClass: 'part', icon: 'highlight' },
  { id: null, level: 2, hasChildren: false, label: 'LED Turn Indicators Front Pair', pn: 'GA1550031AZ', statusKey: 'released', qty: '2', iconClass: 'part', icon: 'highlight' },
];

let nextBomTeamId = Math.max(0, ...BOM_TREE.map(node => Number(node?.teamId) || 0)) + 1;

const STATUS_BADGE = { released: 'badge-released', review: 'badge-review', draft: 'badge-draft', rejected: 'badge-rejected', superseded: 'badge-superseded' };
const STATUS_LABEL = { released: 'Released', review: 'In Review', draft: 'Draft', rejected: 'Rejected', superseded: 'Superseded' };
const ICON_TYPE = { pdf: 'picture_as_pdf', '3d': 'view_in_ar', cert: 'verified', bin: 'memory' };

const REVISION_HISTORY = {
  'GA1-01': [
    { rev: 'Rev A', date: '28-Mar-2026', by: 'Priya Mehta', summary: 'Released complete vehicle assembly for production.', status: 'released' },
    { rev: 'Rev 0', date: '15-Jan-2026', by: 'Priya Mehta', summary: 'Initial engineering release.', status: 'review' }
  ],
  'GA1-05': [
    { rev: 'Rev A', date: '05-Apr-2026', by: 'Neha Nair', summary: 'Body trim mounting corrections under review.', status: 'review' },
    { rev: 'Rev 0', date: '26-Feb-2026', by: 'Neha Nair', summary: 'Initial prototype release.', status: 'draft' }
  ],
  'SW-GA1-52': [
    { rev: 'v1.8.2', date: '28-Mar-2026', by: 'Vikram Thakur', summary: 'Mass production firmware freeze.', status: 'released' },
    { rev: 'v1.8.1', date: '12-Mar-2026', by: 'Vikram Thakur', summary: 'CAN diagnostics fixes and balancing update.', status: 'review' }
  ]
};

let selectedPartId = 'GA1-01';
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

function createPartRecordFromBom({ bomNumber, description, type, qty, unit, weight, parentId }) {
  PARTS[bomNumber] = {
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
export function renderParts(container) {
  const role = (getCurrentUserRole() || '').toLowerCase();
  const isProjectManager = role.replace(/\s/g, '') === 'projectmanager';

  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Part Management</h1>
        <p>Manage part master records across all product lines.</p>
      </div>
      <div class="page-actions">
        <!-- <button class="btn btn-primary btn-sm" id="btn-new-part">
          <span class="material-icons-outlined" style="font-size:16px">add</span>Create Part
        </button> -->
        ${role === 'designer' ? `
        <button class="btn btn-primary btn-sm" id="btn-request-part">
          <span class="material-icons-outlined" style="font-size:16px">add</span>Request Part
        </button>
        ` : ''}
      </div>
    </div>

    <div class="tabs" id="part-tabs">
      <button class="tab-btn active" data-tab="part-search">Part Search</button>
      <button class="tab-btn" data-tab="part-revision">Part Revision</button>
      ${isProjectManager ? `<button class="tab-btn" data-tab="part-requests">Part Requests</button>` : ''}
      ${isProjectManager ? `<button class="tab-btn" data-tab="pending-parts">Pending Parts</button>` : ''}
      ${isProjectManager ? `<button class="tab-btn" data-tab="create-part">Create Part</button>` : ''}
    </div>

    <div id="tab-content"></div>
  `;

  container.querySelectorAll('#part-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#part-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      renderTabContent(container.querySelector('#tab-content'), currentTab);
    });
  });

  renderTabContent(container.querySelector('#tab-content'), 'part-search');

  // container.querySelector('#btn-new-part')?.addEventListener('click', () => {
  //   container.querySelectorAll('#part-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'create-part'));
  //   renderTabContent(container.querySelector('#tab-content'), 'create-part');
  // });

  if (role === 'designer') {
    container.querySelector('#btn-request-part')?.addEventListener('click', () => {
      showModal(
        'Request New Part',
        `<div class="form-group">
           <label class="form-label">BOM ID <span style="color:#DC2626">*</span></label>
           <input class="form-input" type="number" id="req-part-bomid" placeholder="Enter BOM ID for reference" />
         </div>
         <div class="form-group">
           <label class="form-label">Name <span style="color:#DC2626">*</span></label>
           <input class="form-input" id="req-part-name" placeholder="Enter part name" />
         </div>
         <div class="form-group">
           <label class="form-label">Description <span style="color:#DC2626">*</span></label>
           <input class="form-input" id="req-part-desc" placeholder="Enter part description" />
         </div>`,
        `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
         <button class="btn btn-primary" id="save-request-part">Submit Request</button>`
      );

      setTimeout(() => {
        document.getElementById('save-request-part')?.addEventListener('click', async () => {
          const bomIdStr = document.getElementById('req-part-bomid').value.trim();
          const name = document.getElementById('req-part-name').value.trim();
          const description = document.getElementById('req-part-desc').value.trim();

          if (!bomIdStr || !name || !description) return showToast('Please fill all mandatory fields.', 'error');

          const bomId = parseInt(bomIdStr, 10);
          if (isNaN(bomId)) return showToast('BOM ID must be a valid number.', 'error');

          try {
            const res = await authFetch('/api/PartRequests', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bomId, name, description })
            });
            if (res.ok) {
              showToast('Part request submitted successfully.', 'success');
              document.querySelector('.modal-overlay')?.remove();
            } else {
              let errorText = '';
              try { errorText = await res.text(); } catch (e) { }
              console.error('Server error response:', errorText);
              showToast('Failed to submit request. Server responded with: ' + res.status + ' ' + (errorText.substring(0, 50) || res.statusText), 'error');
            }
          } catch (e) {
            showToast('Error submitting request: ' + e.message, 'error');
          }
        });
      }, 50);
    });
  }
}

function renderTabContent(tc, tab) {
  if (tab === 'part-search') renderPartSearch(tc);
  else if (tab === 'part-revision') renderPartRevision(tc);
  else if (tab === 'create-part') renderCreatePart(tc);
  else if (tab === 'part-requests') renderPartRequests(tc);
  else if (tab === 'pending-parts') renderPendingParts(tc);
}

async function renderPartRequests(tc) {
  tc.innerHTML = `<div style="padding: 24px; text-align: center;"><span class="material-icons-outlined spinner" style="font-size:32px; color:var(--brand-primary)">autorenew</span><p style="margin-top:12px; color:var(--text-secondary)">Loading part requests...</p></div>`;
  try {
    const res = await authFetch('/api/PartRequests');
    if (!res.ok) throw new Error('Failed to fetch part requests');
    const data = await res.json();

    if (!data || data.length === 0) {
      tc.innerHTML = `<div class="empty-state"><span class="material-icons-outlined" style="font-size:48px; color:var(--text-tertiary)">inbox</span><p>No part requests found.</p></div>`;
      return;
    }

    const rows = data.map(req => `
      <tr>
        <td class="part-number">${req.bomNumber || '-'}</td>
        <td>${req.bomName || '-'}</td>
        <td>${req.name || '-'}</td>
        <td>${req.description || '-'}</td>
        <td>${req.requestedByUserName || '-'}</td>
        <td>${req.assignedToUserName || '-'}</td>
        <td><span class="badge badge-${(req.status || 'draft').toLowerCase().replace(' ', '-')} badge-sm">${req.status || 'Pending'}</span></td>
        <td>${new Date(req.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join('');

    tc.innerHTML = `
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <div class="card-title">Part Requests Overview</div>
        </div>
        <div class="card-body no-pad" style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>BOM Number</th>
                <th>BOM Name</th>
                <th>Part Name</th>
                <th>Description</th>
                <th>Requested By</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Error fetching part requests:', err);
    tc.innerHTML = `<div class="empty-state"><span class="material-icons-outlined" style="font-size:48px; color:#DC2626">error</span><p>Could not load part requests.</p><p style="font-size:12px;color:var(--text-tertiary)">${err.message}</p></div>`;
  }
}

async function renderPendingParts(tc) {
  tc.innerHTML = `<div style="padding: 24px; text-align: center;"><span class="material-icons-outlined spinner" style="font-size:32px; color:var(--brand-primary)">autorenew</span><p style="margin-top:12px; color:var(--text-secondary)">Loading pending parts...</p></div>`;
  try {
    const res = await authFetch('/api/PartRequests/pending');
    if (!res.ok) throw new Error('Failed to fetch pending parts');
    const data = await res.json();

    if (!data || data.length === 0) {
      tc.innerHTML = `<div class="empty-state"><span class="material-icons-outlined" style="font-size:48px; color:var(--text-tertiary)">inbox</span><p>No pending parts found.</p></div>`;
      return;
    }

    const rows = data.map(req => `
      <tr>
        <td class="part-number">${req.bomNumber || '-'}</td>
        <td>${req.bomName || '-'}</td>
        <td>${req.name || '-'}</td>
        <td>${req.description || '-'}</td>
        <td>${req.requestedByUserName || '-'}</td>
        <td>${new Date(req.createdAt).toLocaleDateString()}</td>
        <td>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary btn-xs btn-approve-part" data-id="${req.id}" title="Approve/Create">
              <span class="material-icons-outlined" style="font-size:16px">check_circle</span>
            </button>
            <button class="btn btn-outline btn-xs btn-reject-part" data-id="${req.id}" title="Reject" style="color:#DC2626;border-color:#DC2626;">
              <span class="material-icons-outlined" style="font-size:16px">cancel</span>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    tc.innerHTML = `
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <div class="card-title">Pending Parts Action Queue</div>
        </div>
        <div class="card-body no-pad" style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>BOM Number</th>
                <th>BOM Name</th>
                <th>Part Name</th>
                <th>Description</th>
                <th>Requested By</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    tc.querySelectorAll('.btn-approve-part').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const req = data.find(r => r.id == id);
        if (req) openApproveRequestModal(req, tc);
      });
    });

    tc.querySelectorAll('.btn-reject-part').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        try {
          const res = await authFetch(`/api/PartRequests/${id}/reject`, { method: 'POST' });
          if (res.ok) {
            showToast('Part request rejected successfully.', 'success');
            renderPendingParts(tc);
          } else {
            showToast('Failed to reject part request.', 'error');
          }
        } catch (err) {
          showToast('Error rejecting: ' + err.message, 'error');
        }
      });
    });
  } catch (err) {
    console.error('Error fetching pending parts:', err);
    tc.innerHTML = `<div class="empty-state"><span class="material-icons-outlined" style="font-size:48px; color:#DC2626">error</span><p>Could not load pending parts.</p><p style="font-size:12px;color:var(--text-tertiary)">${err.message}</p></div>`;
  }
}

async function openApproveRequestModal(req, tc) {
  let groupOpts = '';
  try {
    const res = await authFetch('/api/Lookups/part-groups');
    if (res.ok) {
      const allGroups = await res.json();
      const standardGroups = allGroups.filter(g => !g.isHardwareGroup);
      groupOpts = standardGroups.map(g =>
        `<option value="${g.groupCode}:${g.subGroupCode}">${g.groupCode}${g.subGroupCode} - ${g.name}</option>`
      ).join('');
    }
  } catch (err) {
    console.error('Error fetching group numbers:', err);
  }

  showModal(
    'Approve & Create Part',
    `<div class="detail-grid">
      <div class="form-group">
        <label class="form-label">Product Category <span style="color:#DC2626">*</span></label>
        <select class="form-select" id="appr-cat-code">
          ${optionsHtml(PRODUCT_CATEGORIES, 'code', 'label')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Model Number <span style="color:#DC2626">*</span></label>
        <select class="form-select" id="appr-model-code">
          ${optionsHtml(MODEL_NUMBERS, 'code', 'label')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Group Number <span style="color:#DC2626">*</span></label>
        <select class="form-select" id="appr-group-number">${groupOpts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Machining / Assembly Status <span style="color:#DC2626">*</span></label>
        <select class="form-select" id="appr-machining-status">
          ${optionsHtml(MACHINING_STATUS, 'code', 'label')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Revision Letter <span style="color:#DC2626">*</span></label>
        <select class="form-select" id="appr-revision-letter">
          ${REVISION_LETTERS.map(l => `<option value="${l}">${l}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Development Status <span style="color:#DC2626">*</span></label>
        <select class="form-select" id="appr-dev-status">
          ${optionsHtml(DEV_STATUS, 'code', 'label')}
        </select>
      </div>
      <div class="form-group" style="grid-column:1 / -1">
        <label class="form-label">BOM Number Preview</label>
        <input class="form-input" id="appr-number-preview" readonly style="font-family:var(--font-mono);font-weight:700;letter-spacing:1px;background:var(--bg-muted)" />
      </div>
      <div class="form-group" style="grid-column:1 / -1">
        <label class="form-label">Name <span style="color:#DC2626">*</span></label>
        <input class="form-input" id="appr-name" value="${req.name || ''}" />
      </div>
      <div class="form-group" style="grid-column:1 / -1">
        <label class="form-label">Description</label>
        <input class="form-input" id="appr-desc" value="${req.description || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Make / Buy</label>
        <select class="form-select" id="appr-makebuy">
          <option value="0">Make</option>
          <option value="1">Buy</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Weight (kg)</label>
        <input class="form-input" type="number" id="appr-weight" value="0" />
      </div>
      <div class="form-group">
        <label class="form-label">Unit of Measure</label>
        <input class="form-input" id="appr-uom" value="Each" />
      </div>
      <div class="form-group">
        <label class="form-label">Quantity</label>
        <input class="form-input" type="number" id="appr-qty" value="1" />
      </div>
    </div>`,
    `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
     <button class="btn btn-primary" id="save-appr-part">Approve & Fulfill</button>`
  );

  const catEl = document.getElementById('appr-cat-code');
  const modelEl = document.getElementById('appr-model-code');
  const groupEl = document.getElementById('appr-group-number');
  const machEl = document.getElementById('appr-machining-status');
  const revEl = document.getElementById('appr-revision-letter');
  const devEl = document.getElementById('appr-dev-status');
  const previewEl = document.getElementById('appr-number-preview');

  const syncPreview = async () => {
    if (!previewEl) return;
    const [gc, sc] = String(groupEl?.value || '').split(':');
    const serial = await getNextSerial({
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

  document.getElementById('save-appr-part')?.addEventListener('click', async () => {
    const [groupCode, subGroupCode] = String(groupEl?.value || '').split(':');

    // Fallback if preview value is empty/invalid
    let serialNumber = '001';
    if (previewEl.value && previewEl.value.length >= 7) {
      serialNumber = previewEl.value.slice(4, 7);
    }

    const payload = {
      groupCode,
      subGroupCode,
      serialNumber,
      machiningCode: machEl?.value?.trim() || "0",
      revisionLetter: revEl?.value?.trim() || "A",
      devStatusCode: devEl?.value?.trim() || "X",
      revisionDigits: "00",
      name: document.getElementById('appr-name')?.value?.trim() || req.name,
      description: document.getElementById('appr-desc')?.value?.trim() || req.description,
      makeBuy: parseInt(document.getElementById('appr-makebuy')?.value || "0", 10),
      releaseFlag: 0,
      eeRelease: 0,
      weight: parseFloat(document.getElementById('appr-weight')?.value || "0"),
      unitOfMeasure: document.getElementById('appr-uom')?.value?.trim() || "Each",
      gstCode: "",
      quantity: parseInt(document.getElementById('appr-qty')?.value || "1", 10),
      homologationStatus: 0
    };

    try {
      const res = await authFetch(`/api/PartRequests/${req.id}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Part request approved and fulfilled successfully.', 'success');
        document.querySelector('.modal-overlay')?.remove();
        renderPendingParts(tc);
      } else {
        showToast('Failed to fulfill part request.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error fulfilling: ' + err.message, 'error');
    }
  });
}

// ─── Create BOM Modal ────────────────────────────────────────
async function openCreateBomModal() {
  let groupOpts = '';
  try {
    const res = await authFetch('/api/Lookups/part-groups');
    if (res.ok) {
      const allGroups = await res.json();
      const standardGroups = allGroups.filter(g => !g.isHardwareGroup);
      groupOpts = standardGroups.map(g =>
        `<option value="${g.groupCode}:${g.subGroupCode}">${g.groupCode}${g.subGroupCode} - ${g.name}</option>`
      ).join('');
    }
  } catch (err) {
    console.error('Error fetching group numbers:', err);
  }

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

    if (!categoryCode || !modelCode || !groupCode || !subGroupCode || !machiningCode || !revisionLetter || !devStatusCode || !description) {
      return showToast('Please fill all mandatory fields.', 'error');
    }

    // ── Payload shaped to match what the server expects ──────
    // Adjust field names here to exactly match your API contract.
    const bomPayload = {
      categoryCode,          // e.g. "G"
      modelCode,             // e.g. "A1"
      groupCode,             // e.g. "5"
      subGroupCode,          // e.g. "1"
      serialNumber: previewEl.value.slice(4, 7), // 3-digit serial from built number
      machiningCode,         // e.g. "0"
      revisionLetter,        // e.g. "A"
      devStatusCode,         // e.g. "Z"
      name: bomNumber,       // The full 11-digit BOM number as name
      description,
      parentBOMId: 0,
    };

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
      parentId: null,
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

    createPartRecordFromBom({ bomNumber, description, type: '2w', qty: 1, unit: 'Each', weight: 0, parentId: null });
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
    <div class="filter-bar">
      <div class="filter-chip active" data-view="ad">As-Designed</div>
      <div class="filter-chip" data-view="ap">As-Planned</div>
      <div class="filter-chip" data-view="ab">As-Built (VIN)</div>
      <div style="flex:1"></div>
      <span class="text-xs text-tertiary">Vehicle:</span>
      <select class="form-select" style="width:220px;padding:6px 10px" id="vehicle-select">
        <option>E-Luna Go (GA1) — 2W</option>
        <option>E-Luna Pro (GG1) — 2W</option>
        <option>Zulu (GF1) — 2W</option>
        <option>Safar Smart (BA1) — 3W</option>
        <option>K-Star DX (BD1) — 3W</option>
        <option>MSV Cargo (BK1) — 3W</option>
      </select>
    </div>
    <div class="grid-sidebar">
      <div class="card" style="max-height:calc(100vh - 300px);overflow-y:auto" id="bom-tree-card">
        <div class="card-header" style="position:sticky;top:0;background:white;z-index:2">
          <div class="card-title"><span class="material-icons-outlined">account_tree</span>Product Structure</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-xs" id="expand-all" title="Expand All"><span class="material-icons-outlined" style="font-size:16px">unfold_more</span></button>
            <button class="btn btn-ghost btn-xs" id="collapse-all" title="Collapse All"><span class="material-icons-outlined" style="font-size:16px">unfold_less</span></button>
          </div>
        </div>
        <div class="card-body no-pad" id="bom-tree"></div>
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

  drawBomTree();
  renderPartDetail(selectedPartId);

  tc.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      tc.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      if (chip.dataset.view === 'ab') {
        showModal('As-Built BOM — VIN Lookup',
          `<div class="form-group"><label class="form-label">Enter Vehicle VIN / Chassis Number</label>
           <input class="form-input" id="vin-input" placeholder="e.g. BG3W-2026-01201" style="font-family:var(--font-mono)" /></div>
           <p class="text-xs text-secondary" style="margin-top:8px">The As-Built BOM reflects the exact parts installed in this specific vehicle at time of manufacture.</p>`,
          `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
           <button class="btn btn-primary" id="vin-submit">Load As-Built BOM</button>`
        );
        setTimeout(() => {
          document.getElementById('vin-submit')?.addEventListener('click', async () => {
            const vin = document.getElementById('vin-input')?.value?.trim();
            document.querySelector('.modal-overlay')?.remove();
            if (vin) {
              showToast(`Loading As-Built BOM for VIN: ${vin}…`, 'info');
              // GET: fetch as-built from server
              try {
                const lines = await getBomLines(vin);
                showToast(`As-Built BOM loaded (${lines?.length || 0} items).`, 'success');
              } catch (e) {
                showToast(`Could not load As-Built BOM: ${e.message}`, 'warning');
              }
            }
          });
        }, 50);
      } else {
        showToast(`Switched to ${chip.textContent} view`, 'info');
      }
    });
  });

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

function renderPartDetail(id) {
  if (!detailPanel) return;
  const p = PARTS[id];
  if (!p) { detailPanel.innerHTML = '<div class="empty-state"><span class="material-icons-outlined">info</span><h3>No details available</h3></div>'; return; }

  const statusBadge = `<span class="badge badge-${p.status}">${STATUS_LABEL[p.status]}</span>`;
  const isSW = p.cls === 'Software (SW)';

  const docs = p.docs?.map(d => `
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
      <div class="bom-icon ${p.iconClass}" style="width:40px;height:40px;flex-shrink:0"><span class="material-icons-outlined" style="font-size:22px">${p.icon}</span></div>
      <div>
        <div style="font-weight:700;font-size:1rem;line-height:1.3">${p.name}</div>
        <div style="font-family:var(--font-mono);font-size:0.786rem;color:var(--brand-primary);margin-top:2px">${p.pn}</div>
      </div>
    </div>
    <div class="detail-grid" style="margin-bottom:16px">
      <div class="detail-field"><div class="detail-label">Classification</div><div class="detail-value">${p.cls}</div></div>
      <div class="detail-field"><div class="detail-label">Vehicle Type</div><div class="detail-value">${p.vt}</div></div>
      <div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">${statusBadge}</div></div>
      <div class="detail-field"><div class="detail-label">Revision</div><div class="detail-value">${p.rev}</div></div>
      <div class="detail-field"><div class="detail-label">Dev Status</div><div class="detail-value"><span class="tag ${p.devStatus.startsWith('Z') ? 'tag-green' : p.devStatus.startsWith('Y') ? 'tag-amber' : 'tag-red'}">${p.devStatus}</span></div></div>
      <div class="detail-field"><div class="detail-label">Machining</div><div class="detail-value">${p.machining}</div></div>
      ${!isSW ? `<div class="detail-field"><div class="detail-label">Weight</div><div class="detail-value">${p.weight}</div></div>` : ''}
      ${!isSW ? `<div class="detail-field"><div class="detail-label">Child Parts</div><div class="detail-value">${p.children}</div></div>` : ''}
      <div class="detail-field"><div class="detail-label">Model</div><div class="detail-value">${p.model}</div></div>
      <div class="detail-field"><div class="detail-label">Make / Buy</div><div class="detail-value">${p.makeBuy}</div></div>
      <div class="detail-field"><div class="detail-label">Effectivity</div><div class="detail-value">${p.effectivity}</div></div>
      <div class="detail-field"><div class="detail-label">AIS-038</div><div class="detail-value"><span class="tag ${p.ais === 'Compliant' ? 'tag-green' : p.ais === 'N/A' ? '' : 'tag-red'}">${p.ais}</span></div></div>
      ${p.supplier ? `<div class="detail-field"><div class="detail-label">Supplier</div><div class="detail-value">${p.supplier}</div></div>` : ''}
      ${isSW ? `<div class="detail-field"><div class="detail-label">FW Version</div><div class="detail-value" style="font-family:var(--font-mono)">${p.fwVersion}</div></div>` : ''}
      ${isSW ? `<div class="detail-field"><div class="detail-label">Git Commit</div><div class="detail-value" style="font-family:var(--font-mono)">${p.gitHash}</div></div>` : ''}
      ${isSW ? `<div class="detail-field"><div class="detail-label">Target MCU</div><div class="detail-value">${p.targetMCU}</div></div>` : ''}
      <div class="detail-field"><div class="detail-label">Created By</div><div class="detail-value">${p.createdBy}</div></div>
      <div class="detail-field"><div class="detail-label">Last Modified</div><div class="detail-value">${p.lastMod}</div></div>
    </div>
    <div class="divider"></div>
    <div class="section-title"><span class="material-icons-outlined" style="font-size:16px">description</span>Linked Documents</div>
    <div id="docs-list">${docs}</div>
    <div class="divider"></div>
    <div class="section-title"><span class="material-icons-outlined" style="font-size:16px">history</span>Revision History</div>
    <div style="font-size:0.786rem;display:flex;gap:8px;align-items:center;padding:6px 0">
      <span class="badge badge-released badge-sm">${p.rev}</span>
      <span class="text-secondary">Current production release</span>
      <span class="text-tertiary" style="margin-left:auto">${p.lastMod}</span>
    </div>
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
          <div class="global-search" style="flex:1;height:40px">
            <span class="material-icons-outlined">label</span>
            <input type="text" id="part-name-input" placeholder="Search by part name..." />
          </div>
          <div class="global-search" style="flex:1;min-width:180px;height:40px">
            <span class="material-icons-outlined">account_tree</span>
            <input type="text" id="bom-name-input" list="bom-datalist" placeholder="Search by BOM name…" />
            <datalist id="bom-datalist"></datalist>
          </div>
          <button class="btn btn-primary" id="btn-search-parts">Search</button>
          <button class="btn btn-outline" id="btn-refresh-parts" title="Reload all parts">
            <span class="material-icons-outlined" style="font-size:16px">refresh</span>
          </button>
        </div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:150px">
            <input type="text" class="form-input" id="filter-category" placeholder="Category filter (e.g. G)" />
          </div>
          <div style="flex:1;min-width:150px">
            <input type="text" class="form-input" id="filter-model" placeholder="Model filter (e.g. A1)" />
          </div>
          <div style="flex:1;min-width:150px">
            <input type="text" class="form-input" id="filter-group" placeholder="Group filter (e.g. 5)" />
          </div>
          <div style="flex:1;min-width:150px">
            <select class="form-select" id="filter-status">
              <option value="">Status filter</option>
              <option value="0">Draft</option>
              <option value="1">In Review</option>
              <option value="2">Released</option>
            </select>
          </div>
          <div style="flex:1;min-width:150px">
            <select class="form-select" id="filter-myparts">
              <option value="">myPartsOnly</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
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
              <th>MACHINING</th>
              <th>REVISION</th>
              <th>DEV STATUS</th>
              <th>LIFECYCLE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody id="search-results">
            <tr><td colspan="8" style="text-align:center;padding:20px">Loading parts from server…</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;



  // Populate the BOM datalist from API using all-with-parts
  const bomDatalist = tc.querySelector('#bom-datalist');
  const bomMap = {};
  getAllBomsWithParts().then(boms => {
    const items = Array.isArray(boms) ? boms : (boms?.items || []);
    items.forEach(b => {
      const label = `${b.name || b.bomNumber || '-'}${b.description ? ' — ' + b.description : ''}`;
      bomMap[label] = b.id;
      const opt = document.createElement('option');
      opt.value = label;
      bomDatalist?.appendChild(opt);
    });
  }).catch(() => { /* silently fail */ });

  const tbody = tc.querySelector('#search-results');

  let currentItems = [];
  let currentPage = 1;
  const itemsPerPage = 25;

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
      <tr data-id="${p.partNumber || p.id}" class="part-row">
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
          <button class="btn btn-ghost btn-xs btn-revise-part" data-id="${p.id}" data-pn="${p.partNumber}" title="Revise Part"><span class="material-icons-outlined" style="font-size:16px">history</span></button>
          <button class="btn btn-ghost btn-xs btn-upload-part" data-pn="${p.partNumber}" title="Upload Drawing"><span class="material-icons-outlined" style="font-size:16px">upload_file</span></button>
          <button class="btn btn-ghost btn-xs btn-delete-part" data-id="${p.id}" title="Delete"><span class="material-icons-outlined" style="font-size:16px;color:#DC2626;">delete</span></button>
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
    tbody.querySelectorAll('.btn-revise-part').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = currentItems.find(i => String(i.id) === btn.dataset.id);
        if (p) openRevisePartModal(p, () => tc.querySelector('#btn-search-parts')?.click());
      });
    });
    tbody.querySelectorAll('.btn-upload-part').forEach(btn => {
      btn.addEventListener('click', () => {
        navigateTo('upload-drawing', btn.dataset.pn);
      });
    });
    tbody.querySelectorAll('.btn-delete-part').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this part? This action cannot be undone.')) return;
        const pId = btn.dataset.id;
        const prevHtml = btn.innerHTML;
        btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;color:#9CA3AF;">hourglass_empty</span>';
        btn.disabled = true;
        try {
          await deletePart(pId);
          showToast('Part deleted successfully.', 'success');
          tc.querySelector('#btn-search-parts')?.click(); // Refresh list
        } catch (err) {
          showToast(err.message || 'Error deleting part.', 'error');
          btn.innerHTML = prevHtml;
          btn.disabled = false;
        }
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
        if (cardBody) {
          cardBody.appendChild(navContainer);
        } else {
          return; // Tab was switched
        }
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
      const defaultParams = { page: 1, pageSize: 10000, ...params };
      const res = await getParts(defaultParams);
      let items = res.items || res || [];
      if (params.name) {
        const query = params.name.toLowerCase();
        items = items.filter(p => (p.name || '').toLowerCase().includes(query) || (p.partNumber || '').toLowerCase().includes(query));
      }
      displayParts(items);
    } catch (err) {
      console.error('[PARTS GET]', err);
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:red">Failed to load parts from server.</td></tr>';
    }
  };

  tc.querySelector('#btn-search-parts')?.addEventListener('click', async () => {
    const inputNumber = tc.querySelector('#part-search-input').value.trim();
    const inputName = tc.querySelector('#part-name-input').value.trim();
    const bomInputStr = tc.querySelector('#bom-name-input')?.value?.trim();
    const bomId = bomInputStr && bomMap[bomInputStr] ? bomMap[bomInputStr] : null;

    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px">Searching…</td></tr>';
    try {
      if (bomId) {
        const partsData = await getBomParts(bomId);
        let items = [];
        if (Array.isArray(partsData)) items = partsData;
        else if (partsData?.parts) items = partsData.parts;
        else if (partsData?.items) items = partsData.items;
        else if (partsData?.data) items = partsData.data;
        else items = [partsData].filter(Boolean);
        displayParts(items);
      } else if (inputNumber) {
        const item = await getPartByNumber(inputNumber);
        displayParts(item ? [item] : []);
      } else {
        const params = {};
        const cat = tc.querySelector('#filter-category')?.value.trim();
        const model = tc.querySelector('#filter-model')?.value.trim();
        const group = tc.querySelector('#filter-group')?.value.trim();
        const status = tc.querySelector('#filter-status')?.value.trim();
        const myParts = tc.querySelector('#filter-myparts')?.value.trim();

        if (inputName) params.name = inputName;
        if (cat) params.category = cat;
        if (model) params.model = model;
        if (group) params.group = group;
        if (status) params.lifecycleStatus = status;
        if (myParts === 'true') params.myPartsOnly = true;
        if (myParts === 'false') params.myPartsOnly = false;

        await loadAll(params);
      }
    } catch (err) {
      console.error('[PARTS SEARCH]', err);
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:red">Search failed.</td></tr>';
    }
  });

  tc.querySelector('#btn-refresh-parts')?.addEventListener('click', () => {
    tc.querySelector('#part-search-input').value = '';
    tc.querySelector('#part-name-input').value = '';
    if (tc.querySelector('#bom-name-input')) tc.querySelector('#bom-name-input').value = '';
    tc.querySelector('#filter-category').value = '';
    tc.querySelector('#filter-model').value = '';
    tc.querySelector('#filter-group').value = '';
    tc.querySelector('#filter-status').value = '';
    if (tc.querySelector('#filter-myparts')) tc.querySelector('#filter-myparts').value = '';
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

// ─── Revise Part Modal ────────────────────────────────────────
function openRevisePartModal(p, onRevised) {
  showModal(`Revise Part: ${p.partNumber}`,
    `<div class="detail-grid">
      <div class="detail-field" style="grid-column:1/-1">
        <div class="detail-label">Part Number</div>
        <div class="detail-value" style="font-family:var(--font-mono);font-weight:700">${p.partNumber}</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">Current Revision</div>
        <div class="detail-value">${p.revisionLetter || ''}${p.revisionDigits || ''}</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">Current Dev Status</div>
        <div class="detail-value"><span class="tag tag-amber">${p.devStatusCode || '-'}</span></div>
      </div>
      <div class="form-group">
        <label class="form-label">New Dev Status Code</label>
        <select class="form-select" id="revise-dev-status">
          <option value="">— keep current —</option>
          <option value="X">X - Drawing for Samples</option>
          <option value="Y">Y - Drawing for Pilot Production</option>
          <option value="Z">Z - Drawing for Mass Production</option>
          <option value="S">S - For Spares Only</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">New Revision Digits</label>
        <input class="form-input" id="revise-rev-digits" placeholder="e.g. 01 (leave blank to auto-increment)" />
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Reason</label>
        <input class="form-input" id="revise-reason" placeholder="Enter reason for revision" />
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Drawing File <span style="color:#DC2626">*</span></label>
        <input class="form-input" type="file" id="revise-drawing-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.stp,.step" />
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <div id="revise-response-preview" style="display:none;background:var(--bg-muted);border-radius:var(--radius-sm);padding:12px;font-family:var(--font-mono);font-size:0.75rem;white-space:pre-wrap;max-height:200px;overflow-y:auto"></div>
      </div>
    </div>`,
    `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
     <button class="btn btn-primary" id="revise-confirm">Revise Part</button>`
  );

  setTimeout(() => {
    document.getElementById('revise-confirm')?.addEventListener('click', async () => {
      const devCode = document.getElementById('revise-dev-status')?.value?.trim() || null;
      const revDigits = document.getElementById('revise-rev-digits')?.value?.trim() || null;
      const reason = document.getElementById('revise-reason')?.value?.trim() || null;
      const fileInput = document.getElementById('revise-drawing-file');

      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        return showToast('Drawing File is mandatory for part revision.', 'error');
      }

      const file = fileInput.files[0];

      const preview = document.getElementById('revise-response-preview');
      const btn = document.getElementById('revise-confirm');
      btn.disabled = true;
      btn.textContent = 'Revising…';

      const formData = new FormData();
      formData.append('PartId', p.id);
      if (devCode) formData.append('NewDevStatusCode', devCode);
      if (revDigits) formData.append('NewRevisionDigits', revDigits);
      if (reason) formData.append('Reason', reason);
      formData.append('drawingFile', file);

      try {
        const result = await revisePart(formData);
        if (preview) {
          preview.style.display = 'block';
          preview.textContent = JSON.stringify(result, null, 2);
        }
        showToast(`Part ${p.partNumber} revised successfully.`, 'success');
        btn.textContent = 'Done ✓';
        onRevised?.();
      } catch (err) {
        console.error('[REVISE PART]', err);
        if (preview) {
          preview.style.display = 'block';
          preview.textContent = `Error: ${err.message}`;
        }
        showToast(`Revision failed: ${err.message}`, 'error');
        btn.disabled = false;
        btn.textContent = 'Revise Part';
      }
    });
  }, 50);
}

// ─── BOM Compare ─────────────────────────────────────────────
function renderBomCompare(tc) {
  tc.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:16px">
        <div style="display:flex;gap:16px;align-items:center">
          <div style="flex:1"><label class="form-label">BOM A</label>
            <select class="form-select" id="bom-a"><option>ASSY-GA1-01-Z — E-Luna Go Rev A</option><option>ASSY-GA1-51-Z — Powertrain Rev A</option></select></div>
          <span class="material-icons-outlined" style="color:var(--text-tertiary);align-self:flex-end;padding-bottom:2px">compare_arrows</span>
          <div style="flex:1"><label class="form-label">BOM B</label>
            <select class="form-select" id="bom-b"><option>ASSY-GA1-01-Z — E-Luna Pro Rev B</option><option>ASSY-GG1-01-Z — E-Luna Pro Rev A</option></select></div>
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
          <tbody>
            <tr style="background:#ECFDF5"><td class="part-number">GA151002 1AZ</td><td>BLDC Hub Motor 350W 48V</td><td>—</td><td>1</td><td>—</td><td>Rev A</td><td><span class="badge badge-released badge-sm">ADDED</span></td></tr>
            <tr style="background:#FEF2F2"><td class="part-number">GA151001 1AZ</td><td>BLDC Hub Motor 250W 48V</td><td>1</td><td>—</td><td>Rev A</td><td>—</td><td><span class="badge badge-rejected badge-sm">REMOVED</span></td></tr>
            <tr style="background:#FFFBEB"><td class="part-number">GA152002 1AZ</td><td>BMS PCB 48V</td><td>1</td><td>1</td><td>Rev A</td><td>Rev B</td><td><span class="badge badge-review badge-sm">UPGRADED</span></td></tr>
            <tr><td class="part-number">GA160001 1AZ</td><td>On-Board Charger 48V</td><td>1</td><td>1</td><td>Rev A</td><td>Rev A</td><td><span class="badge badge-draft badge-sm">NO CHANGE</span></td></tr>
            <tr style="background:#FFFBEB"><td class="part-number">GA1080011AZ</td><td>Alloy Wheel 12"</td><td>2</td><td>2</td><td>Rev A</td><td>Rev B</td><td><span class="badge badge-review badge-sm">REV CHANGE</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

  tc.querySelector('#run-compare')?.addEventListener('click', () => {
    showToast('Running BOM comparison…', 'info');
    setTimeout(() => {
      tc.querySelector('#compare-result').style.display = '';
      showToast('BOM comparison complete. 3 differences found.', 'success');
    }, 800);
  });
}

// ─── Create Part ─────────────────────────────────────────────
async function renderCreatePart(tc) {
  let standardGroups = [];
  try {
    const res = await authFetch('/api/Lookups/part-groups');
    if (res.ok) {
      const allGroups = await res.json();
      standardGroups = allGroups.filter(g => !g.isHardwareGroup);
    }
  } catch (err) {
    console.error('Error fetching group numbers:', err);
  }

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
              ${standardGroups.map(g => `<option value="${g.groupCode}:${g.subGroupCode}">${g.groupCode}${g.subGroupCode} - ${g.name}</option>`).join('')}
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
            <label class="form-label">GST Code</label>
            <input class="form-input" id="cp-gstcode" placeholder="e.g. HSN1234" />
          </div>
          <div class="form-group">
            <label class="form-label">Quantity</label>
            <input class="form-input" type="number" id="cp-quantity" value="1" min="1" placeholder="Quantity" />
          </div>
          <div class="form-group">
            <label class="form-label">Release Flag <span style="color:#DC2626">*</span></label>
            <select class="form-select" id="cp-release-flag">
              <option value="0">EC</option>
              <option value="1">CD</option>
              <option value="2">Proto</option>
            </select>
          </div>
          <div class="form-group" id="cp-ee-release-group" style="display:none">
            <label class="form-label">EE Release</label>
            <select class="form-select" id="cp-ee-release">
              <option value="0">Sample</option>
              <option value="1">Proto</option>
              <option value="2">Production</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Homologation Required</label>
            <select class="form-select" id="cp-homo"><option value="0">No</option><option value="1">Yes</option></select>
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
  const updatePN = async () => {
    const [gc, sc] = String(tc.querySelector('#cp-group')?.value || '').split(':');
    const catCode = tc.querySelector('#cp-cat')?.value || '';
    const modelCode = tc.querySelector('#cp-model')?.value || '';

    // Show loading state while fetching
    const el = tc.querySelector('#pn-final');
    if (el && (!el.dataset.fetching || el.textContent === '—')) {
      el.dataset.fetching = 'true';
      el.textContent = '...';
    }

    const serial = await getNextSerial({ categoryCode: catCode, modelCode, groupCode: gc || '', subCode: sc || '' });
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

    if (el) {
      el.textContent = pn || '—';
      delete el.dataset.fetching;
    }
  };

  tc.querySelectorAll('#cp-cat, #cp-model, #cp-group, #cp-machine, #cp-revision, #cp-dev-status')
    .forEach(el => el.addEventListener('change', updatePN));
  updatePN();

  // Show EE Release + lock Release Flag to EC when group is in range 51–59
  const toggleEeRelease = () => {
    const groupVal = tc.querySelector('#cp-group')?.value || '';
    const [gc, sc] = groupVal.split(':');
    const combined = Number(gc || 0) * 10 + Number(sc || 0);
    const show = combined >= 51 && combined <= 59;
    // EE Release field
    const eeGroup = tc.querySelector('#cp-ee-release-group');
    if (eeGroup) eeGroup.style.display = show ? 'block' : 'none';
    // Release Flag: lock to EC when in range, restore otherwise
    const rfSelect = tc.querySelector('#cp-release-flag');
    if (rfSelect) {
      if (show) {
        rfSelect.value = '0';      // force EC
        rfSelect.disabled = true;
        rfSelect.style.opacity = '0.6';
        rfSelect.style.cursor = 'not-allowed';
        rfSelect.title = 'EC is required for group numbers 51–59';
      } else {
        rfSelect.disabled = false;
        rfSelect.style.opacity = '';
        rfSelect.style.cursor = '';
        rfSelect.title = '';
      }
    }
  };
  tc.querySelector('#cp-group')?.addEventListener('change', toggleEeRelease);
  toggleEeRelease();

  // Part name: uppercase
  tc.querySelector('#cp-name')?.addEventListener('input', e => {
    e.target.value = e.target.value.toUpperCase();
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
    const releaseFlagStr = tc.querySelector('#cp-release-flag')?.value;

    if (!name) return showToast('Part name is required.', 'error');
    if (!categoryCode || !modelCode || !groupCode || !subGroupCode) return showToast('Category, model, and group are required.', 'error');
    if (releaseFlagStr === '' || releaseFlagStr === undefined || releaseFlagStr === null) return showToast('Release Flag is required.', 'error');

    const serial = await getNextSerial({ categoryCode, modelCode, groupCode, subCode: subGroupCode });
    const generatedPartNumber = buildPartNumber({ categoryCode, modelCode, groupCode, subCode: subGroupCode, serial, machiningCode, revisionLetter, devStatusCode });

    const payload = {
      bomId: 0,
      categoryCode,
      modelCode,
      groupCode,
      subGroupCode,
      serialNumber: serial,
      machiningCode,
      revisionLetter,
      devStatusCode,
      revisionDigits: "00",
      name,
      description: tc.querySelector('#cp-desc')?.value?.trim() || '',
      makeBuy: Number(tc.querySelector('#cp-makebuy')?.value || 0),
      releaseFlag: Number(releaseFlagStr),
      eeRelease: Number(tc.querySelector('#cp-ee-release')?.value || 0),
      weight: Number(tc.querySelector('#cp-weight')?.value || 0),
      unitOfMeasure: unitOfMeasure || 'Each',
      gstCode: tc.querySelector('#cp-gstcode')?.value?.trim() || '',
      quantity: Number(tc.querySelector('#cp-quantity')?.value || 1),
      homologationStatus: Number(tc.querySelector('#cp-homo')?.value || 0),
      assignedToDesignerUserId: 0
    };

    const submitBtn = tc.querySelector('#cp-submit');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px">autorenew</span>Creating…'; }

    try {
      const resp = await authFetch('/api/Parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('Failed to create part');

      showToast(`Part ${generatedPartNumber} created and submitted for review!`, 'success');
      setTimeout(() => navigateTo('workflows'), 1500);
    } catch (err) {
      console.error('[PART CREATE] Error:', err);
      showToast(err instanceof Error ? err.message : 'Unable to create part.', 'error');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px">send</span>Create & Submit for Review'; }
    }
  });
}

async function renderPartRevision(tc) {
  tc.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:16px">
        <div style="display:flex;gap:12px;align-items:center;">
          <div class="global-search" style="flex:1;height:40px">
            <span class="material-icons-outlined">search</span>
            <input type="text" id="part-revision-input" placeholder="Search by Part ID or Part Number (e.g. 278 or GA1050013AX00)..." />
          </div>
          <button class="btn btn-primary" id="btn-search-revision">Search Revisions</button>
        </div>
      </div>
    </div>
    
    <div id="revision-results-container" style="display:none;">
      <div class="card" style="margin-bottom:16px">
        <div class="card-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
            <div style="font-weight:700;font-size:1.1rem" id="rev-base-identifier">-</div>
            <div><strong>Total Revisions:</strong> <span class="badge" style="background:#2563EB;color:#fff" id="rev-total-count">-</span></div>
          </div>
          <div style="font-size:0.9rem; color:var(--text-secondary)">
            Current Revision Part Number: <strong style="color:var(--text-primary)" id="rev-current-pn">-</strong>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body no-pad">
          <table class="data-table">
            <thead>
              <tr>
                <th>REV. NO</th>
                <th>PART ID</th>
                <th>PART NUMBER</th>
                <th>NAME</th>
                <th>REV. LTR/DIGITS</th>
                <th>DEV STATUS</th>
                <th>LIFECYCLE</th>
                <th>CREATED AT</th>
              </tr>
            </thead>
            <tbody id="revision-table-body">
              <tr><td colspan="8" style="text-align:center;padding:20px">No revisions found.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  tc.querySelector('#btn-search-revision').addEventListener('click', async () => {
    const input = tc.querySelector('#part-revision-input').value.trim();
    if (!input) return showToast('Please enter a Part ID or Part Number', 'warning');

    const isId = /^\d+$/.test(input);
    const endpoint = isId ? `/api/Parts/${input}/revisions` : `/api/Parts/number/${encodeURIComponent(input)}/revisions`;

    const btn = tc.querySelector('#btn-search-revision');
    btn.disabled = true;
    btn.textContent = 'Searching...';

    try {
      const res = await authFetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch revisions');
      const data = await res.json();

      tc.querySelector('#revision-results-container').style.display = 'block';
      tc.querySelector('#rev-base-identifier').textContent = data.basePartIdentifier || 'Unknown Base Part';
      tc.querySelector('#rev-total-count').textContent = data.totalRevisions || '0';
      tc.querySelector('#rev-current-pn').textContent = data.currentRevisionPartNumber || '-';

      const tbody = tc.querySelector('#revision-table-body');
      if (data.revisions && data.revisions.length > 0) {
        tbody.innerHTML = data.revisions.map(r => `
          <tr>
            <td><span class="badge" style="background:#F3F4F6;color:#374151">${r.revisionNumber}</span></td>
            <td>${r.partId}</td>
            <td><span class="part-number">${r.partNumber}</span></td>
            <td>${r.name || '-'}</td>
            <td>${r.revisionLetter || ''}${r.revisionDigits || ''}</td>
            <td><span class="tag tag-amber">${r.devStatusCode || '-'}</span></td>
            <td><span class="badge ${r.lifecycleStatus === 0 ? 'badge-draft' : r.lifecycleStatus === 1 ? 'badge-review' : 'badge-released'}">${r.lifecycleStatusLabel || '-'}</span></td>
            <td>${r.createdAt ? new Date(r.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px">No revisions found.</td></tr>';
      }

    } catch (err) {
      showToast(err.message, 'error');
      tc.querySelector('#revision-results-container').style.display = 'none';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Search Revisions';
    }
  });
}