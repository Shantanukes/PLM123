import { authFetch } from './client.js';

/**
 * Assigns a new workflow.
 * @param {Object} payload 
 * @param {string} payload.entityType
 * @param {number} payload.entityId
 * @param {number} payload.assignedUserId
 * @param {string|null} [payload.title]
 * @param {string|null} [payload.comments]
 * @param {string|null} [payload.dueDate]
 */
export async function assignWorkflow(payload) {
  const response = await authFetch('/api/Workflow/assign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to assign workflow');
  }

  // Return parsed JSON if the server responds with content, otherwise null
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function fetchWorkflows() {
  const response = await authFetch('/api/Workflow/my-tasks');
  if (!response.ok) {
    throw new Error('Failed to fetch my tasks');
  }
  return response.json();
}

export async function fetchCurrentApprovalStage(entityId) {
  const response = await authFetch('/api/Parts/' + entityId + '/current-approval-stage');
  if (!response.ok) {
    throw new Error('Failed to fetch approval stage');
  }
  return response.json();
}

export async function fetchPendingApprovals() {
  const response = await authFetch('/api/parts/pending-approvals');
  if (!response.ok) {
    throw new Error('Failed to fetch pending approvals');
  }
  return response.json();
}

export async function approvePartNumber(id, payload) {
  const response = await authFetch(`/api/Parts/${id}/approve-part-number`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error('Failed to approve part number');
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function rejectPartNumber(id, payload) {
  const response = await authFetch(`/api/Parts/${id}/reject-part-number`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error('Failed to reject part number');
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function approveDrawing(id, payload) {
  const response = await authFetch(`/api/Parts/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error('Failed to approve drawing');
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function rejectDrawing(id, payload) {
  const response = await authFetch(`/api/Parts/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error('Failed to reject drawing');
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function fetchPartApprovalHistory(id) {
  const response = await authFetch(`/api/Parts/${id}/approval-history`);
  if (!response.ok) {
    throw new Error('Failed to fetch approval history');
  }
  return response.json();
}

export async function fetchDesignerTasks() {
  const response = await authFetch(`/api/Parts/designer-tasks`);
  if (!response.ok) {
    throw new Error('Failed to fetch designer tasks');
  }
  return response.json();
}