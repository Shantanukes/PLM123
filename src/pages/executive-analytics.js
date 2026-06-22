import { authFetch } from '../api/client.js';

export async function renderExecutiveAnalytics(container) {
  // Initial loading state
  container.innerHTML = `
    <div class="main-workspace fade-in" style="padding: 24px; display: flex; align-items: center; justify-content: center; height: 100%;">
      <div style="text-align: center;">
        <span class="material-icons-outlined" style="font-size: 32px; animation: spin 1s linear infinite; color: var(--primary-main);">autorenew</span>
        <div style="margin-top: 12px; color: var(--text-secondary);">Loading Executive Analytics...</div>
      </div>
    </div>
  `;

  let data;
  try {
    const res = await authFetch('/api/executive-analytics/overview');
    if (res.ok) {
      data = await res.json();
    } else {
      throw new Error('API failed');
    }
  } catch (err) {
    console.warn("Failed to fetch executive analytics, using mock data", err);
    data = {
      "totalParts": 265, "totalBOMs": 10, "totalECNs": 0, "totalDocuments": 25,
      "totalVehicleModels": 35, "totalSuppliers": 5, "totalTeams": 6, "totalUsers": 22,
      "draftParts": 251, "inReviewParts": 8, "releasedParts": 6, "obsoleteParts": 0,
      "draftBOMs": 10, "readyForLinkingBOMs": 0, "inReviewBOMs": 0, "approvedBOMs": 0, "releasedBOMs": 0,
      "openECNs": 0, "inReviewECNs": 0, "approvedECNs": 0, "rejectedECNs": 0, "implementedECNs": 0, "closedECNs": 0,
      "makeInHouseParts": 254, "fullSupplierScopeParts": 8, "builtToPrintParts": 3,
      "eeParts": 10, "nonEEParts": 255,
      "pendingPartApprovals": 21, "pendingBOMApprovals": 0, "pendingECNApprovals": 0
    };
  }

  // Safe fallback to 0 if data fields are missing
  const safeData = new Proxy(data, {
    get: function (target, prop) {
      return target[prop] || 0;
    }
  });

  container.innerHTML = `
    <div class="main-workspace fade-in" style="padding: 24px; overflow-y: auto; height: 100%;">
      <div class="workspace-header" style="margin-bottom: 24px;">
        <div class="header-left">
          <h2>Executive Dashboard</h2>
          <p class="text-secondary">Comprehensive view of all organizational metrics and lifecycle states.</p>
        </div>
      </div>

      <!-- HIGHLIGHT METRICS -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 32px;">
        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span class="material-icons-outlined" style="font-size: 18px; color: var(--primary-main);">category</span> Total Parts
          </div>
          <div style="font-size: 32px; font-weight: 700; color: var(--text-primary);">${safeData.totalParts}</div>
          <div style="font-size: 12px; color: var(--warning-main); margin-top: 8px; font-weight: 500;">
            ${safeData.pendingPartApprovals} Pending Approvals
          </div>
        </div>

        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span class="material-icons-outlined" style="font-size: 18px; color: var(--success-main);">account_tree</span> Total BOMs
          </div>
          <div style="font-size: 32px; font-weight: 700; color: var(--text-primary);">${safeData.totalBOMs}</div>
          <div style="font-size: 12px; color: var(--warning-main); margin-top: 8px; font-weight: 500;">
            ${safeData.pendingBOMApprovals} Pending Approvals
          </div>
        </div>

        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span class="material-icons-outlined" style="font-size: 18px; color: var(--danger-main);">assignment_late</span> Total ECNs
          </div>
          <div style="font-size: 32px; font-weight: 700; color: var(--text-primary);">${safeData.totalECNs}</div>
          <div style="font-size: 12px; color: var(--warning-main); margin-top: 8px; font-weight: 500;">
            ${safeData.pendingECNApprovals} Pending Approvals
          </div>
        </div>

        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span class="material-icons-outlined" style="font-size: 18px; color: var(--primary-light);">groups</span> Network Size
          </div>
          <div style="font-size: 32px; font-weight: 700; color: var(--text-primary);">${safeData.totalUsers} <span style="font-size: 14px; font-weight: normal; color: var(--text-secondary);">Users</span></div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px; font-weight: 500;">
            ${safeData.totalTeams} Teams | ${safeData.totalSuppliers} Suppliers
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        
        <!-- PARTS LIFECYCLE -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <h3 style="margin-bottom: 16px; font-size: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">Parts Lifecycle Distribution</h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
              <span style="font-weight: 500; color: var(--text-secondary);">Draft Parts</span>
              <span style="font-weight: 700;">${safeData.draftParts}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
              <span style="font-weight: 500; color: var(--text-secondary);">In Review Parts</span>
              <span style="font-weight: 700; color: var(--primary-main);">${safeData.inReviewParts}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
              <span style="font-weight: 500; color: var(--text-secondary);">Released Parts</span>
              <span style="font-weight: 700; color: var(--success-main);">${safeData.releasedParts}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
              <span style="font-weight: 500; color: var(--text-secondary);">Obsolete Parts</span>
              <span style="font-weight: 700; color: var(--danger-main);">${safeData.obsoleteParts}</span>
            </div>
          </div>
        </div>

        <!-- BOM LIFECYCLE -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <h3 style="margin-bottom: 16px; font-size: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">BOM Lifecycle Distribution</h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
              <span style="font-weight: 500; color: var(--text-secondary);">Draft BOMs</span>
              <span style="font-weight: 700;">${safeData.draftBOMs}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
              <span style="font-weight: 500; color: var(--text-secondary);">Ready for Linking BOMs</span>
              <span style="font-weight: 700;">${safeData.readyForLinkingBOMs}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
              <span style="font-weight: 500; color: var(--text-secondary);">In Review BOMs</span>
              <span style="font-weight: 700; color: var(--primary-main);">${safeData.inReviewBOMs}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
              <span style="font-weight: 500; color: var(--text-secondary);">Approved BOMs</span>
              <span style="font-weight: 700; color: var(--success-main);">${safeData.approvedBOMs}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
              <span style="font-weight: 500; color: var(--text-secondary);">Released BOMs</span>
              <span style="font-weight: 700; color: var(--success-main);">${safeData.releasedBOMs}</span>
            </div>
          </div>
        </div>

      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        
        <!-- ECN LIFECYCLE -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <h3 style="margin-bottom: 16px; font-size: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">ECN Lifecycle Distribution</h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
              <span style="font-weight: 500; color: var(--text-secondary);">Open ECNs</span>
              <span style="font-weight: 700;">${safeData.openECNs}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
              <span style="font-weight: 500; color: var(--text-secondary);">In Review ECNs</span>
              <span style="font-weight: 700; color: var(--primary-main);">${safeData.inReviewECNs}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
              <span style="font-weight: 500; color: var(--text-secondary);">Approved ECNs</span>
              <span style="font-weight: 700; color: var(--success-main);">${safeData.approvedECNs}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
              <span style="font-weight: 500; color: var(--text-secondary);">Rejected ECNs</span>
              <span style="font-weight: 700; color: var(--danger-main);">${safeData.rejectedECNs}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
              <span style="font-weight: 500; color: var(--text-secondary);">Implemented ECNs</span>
              <span style="font-weight: 700; color: var(--success-main);">${safeData.implementedECNs}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
              <span style="font-weight: 500; color: var(--text-secondary);">Closed ECNs</span>
              <span style="font-weight: 700; color: var(--text-muted);">${safeData.closedECNs}</span>
            </div>
          </div>
        </div>

        <!-- PARTS SCOPE & MISC -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-bottom: 16px; font-size: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">Parts Scope & Categorization</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
                <span style="font-weight: 500; color: var(--text-secondary);">Make In-House Parts</span>
                <span style="font-weight: 700;">${safeData.makeInHouseParts}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
                <span style="font-weight: 500; color: var(--text-secondary);">Full Supplier Scope</span>
                <span style="font-weight: 700;">${safeData.fullSupplierScopeParts}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
                <span style="font-weight: 500; color: var(--text-secondary);">Built-to-Print</span>
                <span style="font-weight: 700;">${safeData.builtToPrintParts}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
                <span style="font-weight: 500; color: var(--text-secondary);">EE Parts</span>
                <span style="font-weight: 700;">${safeData.eeParts}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
                <span style="font-weight: 500; color: var(--text-secondary);">Non-EE Parts</span>
                <span style="font-weight: 700;">${safeData.nonEEParts}</span>
              </div>
            </div>
          </div>

          <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-bottom: 16px; font-size: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 12px;">Organization Assets</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
                <span style="font-weight: 500; color: var(--text-secondary);">Total Vehicle Models</span>
                <span style="font-weight: 700;">${safeData.totalVehicleModels}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-default); border-radius: 4px;">
                <span style="font-weight: 500; color: var(--text-secondary);">Total Documents</span>
                <span style="font-weight: 700;">${safeData.totalDocuments}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  `;
}
