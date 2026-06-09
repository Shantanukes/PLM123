const RUNTIME_KEY = 'kg_plm_runtime';
const MOCK_SEED_VERSION = '2026-04-10-v1';

const MOCK_WORKFLOW_TICKETS = [
  {
    id: 'TKT-2026-0410-001',
    taskId: 'WF-T-1002',
    taskTitle: 'Technical Review: BA152002 BMS PCB Rev B',
    raisedBy: 'Rohit Agarwal',
    managerStatus: 'not-approved',
    faultWithdraw: false,
    reason: 'Thermal validation report mismatch against latest drawing revision.',
    routeTo: ['Manager', 'COE Head'],
    status: 'pending-manager-approval',
    createdAt: '10-Apr-2026, 09:20:00 am'
  },
  {
    id: 'TKT-2026-0410-002',
    taskId: 'WF-T-1005',
    taskTitle: 'OTA Deployment Approval - Fleet Telematics FW v3.1',
    raisedBy: 'Priya Mehta',
    managerStatus: 'approved',
    faultWithdraw: true,
    reason: 'Field diagnostics found intermittent CAN drop during rollback tests.',
    routeTo: ['OT Team Head/Admin', 'IT Team'],
    status: 'open-withdrawal',
    createdAt: '10-Apr-2026, 10:35:00 am'
  },
  {
    id: 'TKT-2026-0410-003',
    taskId: 'WF-T-1003',
    taskTitle: 'Approve Part: GA151002 - BLDC Motor 350W',
    raisedBy: 'Amit Kumar',
    managerStatus: 'not-approved',
    faultWithdraw: false,
    reason: 'Supplier PPAP documents are pending for latest lot.',
    routeTo: ['Manager', 'COE Head'],
    status: 'manager-rejected',
    managerDecisionBy: 'Rohit Agarwal',
    managerDecisionAt: '10-Apr-2026, 11:12:00 am',
    createdAt: '10-Apr-2026, 10:50:00 am'
  }
];

const MOCK_WORKFLOW_ATTACHMENTS = {
  'WF-T-1002': [
    {
      id: 'F-100201',
      name: 'Thermal-Analysis-BA152002-RevB.pdf',
      sizeKb: 842,
      uploadedBy: 'Rohit Agarwal',
      uploadedAt: '10-Apr-2026, 09:25:00 am'
    },
    {
      id: 'F-100202',
      name: 'Review-Comments-BA152002.txt',
      sizeKb: 14,
      uploadedBy: 'Amit Kumar',
      uploadedAt: '10-Apr-2026, 09:40:00 am'
    }
  ],
  'WF-T-1005': [
    {
      id: 'F-100501',
      name: 'OTA-Rollback-Plan-v3.1.docx',
      sizeKb: 126,
      uploadedBy: 'Priya Mehta',
      uploadedAt: '10-Apr-2026, 10:42:00 am'
    }
  ]
};

const MOCK_REJECTION_FEEDBACK = [
  {
    taskId: 'WF-T-1003',
    creator: 'Priya Mehta',
    feedback: 'Update supplier PPAP and include lot traceability records before re-submit.',
    rejectedBy: 'Current Reviewer',
    time: '10-Apr-2026, 11:15:00 am'
  },
  {
    taskId: 'WF-T-1001',
    creator: 'Vikram T.',
    feedback: 'Attach revised AIS evidence with test bench logs from latest cycle.',
    rejectedBy: 'Current Reviewer',
    time: '09-Apr-2026, 06:30:00 pm'
  }
];

const MOCK_PART_WORKFLOWS = {
  GA152002: {
    state: 'review',
    currentStep: 2,
    lastUpdated: '10-Apr-2026',
    lastFeedback: 'Thermal validation pending for Rev B'
  },
  GA151001: {
    state: 'released',
    currentStep: 5,
    lastUpdated: '08-Apr-2026'
  },
  'SW-GA1-52': {
    state: 'review',
    currentStep: 3,
    lastUpdated: '09-Apr-2026'
  }
};

function safeParseRuntime(raw) {
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

export function seedMockRuntimeData() {
  const state = safeParseRuntime(localStorage.getItem(RUNTIME_KEY));
  let changed = false;

  if (!Array.isArray(state.workflowTickets) || state.workflowTickets.length === 0) {
    state.workflowTickets = [...MOCK_WORKFLOW_TICKETS];
    changed = true;
  }

  if (!state.workflowAttachments || Object.keys(state.workflowAttachments).length === 0) {
    state.workflowAttachments = { ...MOCK_WORKFLOW_ATTACHMENTS };
    changed = true;
  }

  if (!Array.isArray(state.rejectionFeedback) || state.rejectionFeedback.length === 0) {
    state.rejectionFeedback = [...MOCK_REJECTION_FEEDBACK];
    changed = true;
  }

  if (!state.partWorkflows || Object.keys(state.partWorkflows).length === 0) {
    state.partWorkflows = { ...MOCK_PART_WORKFLOWS };
    changed = true;
  }

  if (state.__mockSeedVersion !== MOCK_SEED_VERSION) {
    state.__mockSeedVersion = MOCK_SEED_VERSION;
    changed = true;
  }

  if (changed) {
    localStorage.setItem(RUNTIME_KEY, JSON.stringify(state));
  }
}
