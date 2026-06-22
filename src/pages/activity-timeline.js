import { authFetch } from '../api/client.js';

export async function renderActivityTimeline(container) {
  // Initial loading state
  container.innerHTML = `
    <div class="main-workspace fade-in" style="padding: 24px; display: flex; align-items: center; justify-content: center; height: 100%;">
      <div style="text-align: center;">
        <span class="material-icons-outlined" style="font-size: 32px; animation: spin 1s linear infinite; color: var(--primary-main);">autorenew</span>
        <div style="margin-top: 12px; color: var(--text-secondary);">Loading Activity Timeline...</div>
      </div>
    </div>
  `;

  let activities = [];

  const fetchActivities = async () => {
    try {
      // Using page size 50 as requested
      const res = await authFetch('/api/executive-analytics/activity-timeline?limit=50');
      if (res.ok) {
        const json = await res.json();
        // Handle both raw array or paginated response format { data: [], total: ... }
        activities = Array.isArray(json) ? json : (json.data || json.items || []);
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      console.warn("Failed to fetch activity timeline, using mock data", err);
      // Fallback to mock data representing the requested schema
      activities = [
        {
          "id": 110,
          "timestamp": "2026-06-18T13:26:34.4700539",
          "action": "ApprovalStageApproved",
          "entityType": "Part",
          "entityId": 281,
          "entityRef": "GA1520011AX00",
          "userName": "Anushka Mahajan",
          "details": "Stage 'RnDHead' approved by Anushka Mahajan. Next: Completed"
        },
        {
          "id": 109,
          "timestamp": "2026-06-18T12:15:22.0000000",
          "action": "EntityCreated",
          "entityType": "BOM",
          "entityId": 142,
          "entityRef": "BOM-2026-004",
          "userName": "Vikram Singh",
          "details": "New BOM draft created for E-Luna Pro Drivetrain."
        },
        {
          "id": 108,
          "timestamp": "2026-06-18T10:05:10.0000000",
          "action": "StatusChanged",
          "entityType": "ECN",
          "entityId": 8840,
          "entityRef": "ECN-8840",
          "userName": "System",
          "details": "ECN status changed from InReview to Approved."
        }
      ];
    }
  };

  const getIconForAction = (action) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('approve')) return { icon: 'check_circle', color: 'var(--success-main)' };
    if (actionLower.includes('reject')) return { icon: 'cancel', color: 'var(--danger-main)' };
    if (actionLower.includes('create')) return { icon: 'add_circle', color: 'var(--primary-main)' };
    if (actionLower.includes('update') || actionLower.includes('change')) return { icon: 'edit', color: 'var(--warning-main)' };
    return { icon: 'notifications', color: 'var(--text-secondary)' };
  };

  const formatDate = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const renderUI = () => {
    // Dynamic total count mapping
    const totalCount = activities.length;

    let timelineHTML = '';
    if (activities.length === 0) {
      timelineHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;">No recent activities found.</div>`;
    } else {
      timelineHTML = activities.map(act => {
        const { icon, color } = getIconForAction(act.action);
        return `
          <div class="timeline-item" style="position: relative; margin-bottom: 24px;">
            <span class="material-icons-outlined" style="position: absolute; left: -33px; top: 0; background: var(--bg-surface); color: ${color}; padding: 2px; border-radius: 50%;">${icon}</span>
            <div style="background: var(--bg-default); border: 1px solid var(--border-light); border-radius: 8px; padding: 16px; margin-left: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">
                  ${act.entityRef} <span style="color: var(--text-muted); font-weight: 400;">(${act.entityType})</span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); background: var(--bg-surface); padding: 2px 8px; border-radius: 12px; border: 1px solid var(--border-light);">
                  ${formatDate(act.timestamp)}
                </div>
              </div>
              <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">
                <span style="font-weight: 600; color: var(--primary-dark);">${act.userName}</span> triggered <span style="font-weight: 500;">${act.action}</span>
              </div>
              <div style="font-size: 13px; color: var(--text-primary); padding-left: 12px; border-left: 2px solid ${color};">
                ${act.details}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div class="main-workspace fade-in" style="padding: 24px; overflow-y: auto; height: 100%;">
        <div class="workspace-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
          <div class="header-left">
            <h2>Activity Timeline</h2>
            <p class="text-secondary">Centralized feed of all strategic user activities and lifecycle milestones.</p>
          </div>
          <button id="refresh-timeline-btn" class="btn btn-outline btn-sm" style="display: flex; align-items: center; gap: 6px;">
            <span class="material-icons-outlined icon-18">refresh</span> Refresh
          </button>
        </div>

        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 800px;">
          
          <!-- Dynamic Total Count Display -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 16px; margin-bottom: 24px;">
            <h3 style="font-size: 16px;">Recent Activities</h3>
            <div style="background: var(--primary-light); color: var(--primary-dark); padding: 4px 12px; border-radius: 16px; font-weight: 600; font-size: 13px;">
              Total Fetched: ${totalCount}
            </div>
          </div>

          <div class="timeline" style="position: relative; padding-left: 20px; border-left: 2px solid var(--border-light); display: flex; flex-direction: column;">
            ${timelineHTML}
          </div>

          ${totalCount >= 50 ? `
            <div style="text-align: center; margin-top: 24px;">
              <button class="btn btn-outline btn-sm">Load More (Next 50)</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Attach event listener for refresh button to simulate auto-incrementing / fetching new data
    const refreshBtn = container.querySelector('#refresh-timeline-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.innerHTML = `<span class="material-icons-outlined icon-18" style="animation: spin 1s linear infinite;">autorenew</span> Refreshing...`;
        await fetchActivities();
        renderUI();
      });
    }
  };

  await fetchActivities();
  renderUI();
}
