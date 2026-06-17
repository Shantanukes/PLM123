import { showToast, showModal, navigateTo } from '../main.js';
import { authFetch } from '../api/client.js';
import { getVehicleModels, createVehicleModel, updateVehicleModel, deleteVehicleModel } from '../api/vehicles.js';
import { openCreateBomModal } from './bom.js';

export function renderModels(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Product Models & Variant Configuration</h1>
        <p>Manage the full Kinetic Green portfolio — vehicle platforms, variant matrices, and production configurations.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline btn-sm" id="mdl-configurator">
          <span class="material-icons-outlined" style="font-size:16px">tune</span>Configurator
        </button>
        <button class="btn btn-primary btn-sm" id="mdl-add">
          <span class="material-icons-outlined" style="font-size:16px">add_circle</span>Add Model
        </button>
      </div>
    </div>

    </div>

    <div id="mdl-content" style="margin-top: 16px;"></div>
  `;


  container.querySelector('#mdl-add')?.addEventListener('click', () => {

    showModal('Register New Vehicle Model',
      `<div class="grid-2" style="gap:16px;max-height:60vh;overflow-y:auto;padding-right:8px;">
        <div class="form-group"><label class="form-label">Model Name <span style="color:#DC2626">*</span></label><input class="form-input" id="mdl-name" placeholder="e.g. Storm X1" /></div>
        <div class="form-group"><label class="form-label">Model Code <span style="color:#DC2626">*</span></label><input class="form-input" id="mdl-code" placeholder="e.g. GH1" /></div>
        <div class="form-group"><label class="form-label">Category Code</label><input class="form-input" id="mdl-catcode" placeholder="e.g. G" value="G" /></div>
        <div class="form-group"><label class="form-label">Variant</label><input class="form-input" id="mdl-variant" placeholder="e.g. Go" /></div>
        <div class="form-group"><label class="form-label">Color</label><input class="form-input" id="mdl-colorhex" placeholder="e.g. Blue" value="Blue" /></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Description / Notes</label><textarea class="form-input" id="mdl-desc" rows="2" placeholder="Notes..." style="resize:vertical"></textarea></div>
      </div>`,
      `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
       <button class="btn btn-primary" id="mdl-save">Register Model</button>`
    );
    setTimeout(() => {
      document.getElementById('mdl-save')?.addEventListener('click', async (e) => {
        const name = document.getElementById('mdl-name')?.value;
        const code = document.getElementById('mdl-code')?.value;
        if (!name || !code) return showToast('Model name and code are required', 'error');

        const btn = e.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Saving...';
        btn.disabled = true;

        const payload = {
          name: name,
          modelCode: code,
          categoryCode: document.getElementById('mdl-catcode')?.value || 'G',
          colorHex: document.getElementById('mdl-colorhex')?.value || 'Blue',
          description: document.getElementById('mdl-desc')?.value || '',
          variant: document.getElementById('mdl-variant')?.value || ''
        };

        try {
          console.log('[ADD MODEL] Sending payload:', JSON.stringify(payload, null, 2));
          await createVehicleModel(payload);
          document.querySelector('.modal-overlay')?.remove();
          showToast(`Model "${name}" successfully registered!`, 'success');
          // Re-render the catalogue to fetch new models
          renderCatalogue(container.querySelector('#mdl-content'));
        } catch (err) {
          console.error(err);
          showToast('Failed to create model', 'error');
          btn.innerHTML = originalText;
          btn.disabled = false;
        }
      });
    }, 50);
  });

  container.querySelector('#mdl-configurator')?.addEventListener('click', () => {
    showModal('Variant Configurator',
      `<p style="margin-bottom:16px">Select a base model and configure variant dimensions interactively.</p>
       <div class="form-group"><label class="form-label">Base Model</label>
        <select class="form-select" id="cfg-base"><option>E-Luna Go (GA1)</option><option>E-Luna Pro (GG1)</option><option>Zulu (GF1)</option><option>Safar Smart (BA1)</option><option>K-Star DX (BD1)</option></select></div>
       <div class="grid-2" style="gap:12px">
        <div class="form-group"><label class="form-label">Battery Option</label><select class="form-select"><option>1.5 kWh Swappable</option><option>2.0 kWh Fixed</option><option>2.4 kWh Fixed</option><option>3.0 kWh Fixed</option><option>Twin 3.0 kWh</option></select></div>
        <div class="form-group"><label class="form-label">Motor Option</label><select class="form-select"><option>250W Hub Motor</option><option>350W Hub Motor</option><option>500W Hub Motor</option><option>1.5kW Mid-Drive</option></select></div>
        <div class="form-group"><label class="form-label">Display Cluster</label><select class="form-select"><option>Basic Analog</option><option>Digital LCD</option><option>TFT 4.3" Colour</option><option>TFT 7" Smart Cluster</option></select></div>
        <div class="form-group"><label class="form-label">Connectivity</label><select class="form-select"><option>None (Base)</option><option>Bluetooth App</option><option>GPS + IoT Telematics</option><option>Full Fleet Suite + OTA</option></select></div>
       </div>
       <div style="background:var(--bg-muted);border-radius:var(--radius-md);padding:14px 18px;margin-top:12px">
        <div style="display:flex;justify-content:space-between"><span class="text-sm text-secondary">Estimated BOM Delta</span><span class="font-bold">₹ +8,450</span></div>
        <div style="display:flex;justify-content:space-between;margin-top:6px"><span class="text-sm text-secondary">Unique Parts Added</span><span class="font-bold">7</span></div>
       </div>`,
      `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
       <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove();window._showToast('Variant configuration saved as draft.','success')">Save Configuration</button>`
    );
    window._showToast = showToast;
  });

  renderCatalogue(container.querySelector('#mdl-content'));
}

const STATUS_TAG = { production: 'badge-released', pilot: 'badge-review', concept: 'badge-draft' };
const STATUS_LABEL = { production: 'Production', pilot: 'Pilot Build', concept: 'Concept' };

function renderCatalogue(tc) {
  // Show loading skeleton and filter bar
  tc.innerHTML = `
    <div class="filter-bar" style="display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; gap:8px;">
        <div class="filter-chip active" data-cat="">All Products</div>
        <div class="filter-chip" data-cat="2W">2-Wheeler (G)</div>
        <div class="filter-chip" data-cat="3W">3-Wheeler BEV (B)</div>
      </div>
      <div>
        <input type="text" id="model-search" class="form-input" placeholder="Search by model name..." style="min-width:250px; height:32px; font-size:14px;" />
      </div>
    </div>
    <div id="model-cards" class="grid-2">
      ${[1, 2, 3, 4].map(() => `
        <div class="card" style="opacity:0.6;min-height:220px;">
          <div class="card-body" style="display:flex;align-items:center;justify-content:center;height:100%;">
            <span class="material-icons-outlined" style="font-size:32px;color:var(--text-tertiary);animation:spin 1s linear infinite">autorenew</span>
          </div>
        </div>`).join('')}
    </div>`;

  const applyModelFilters = () => {
    const cat = tc.querySelector('.filter-chip.active')?.dataset.cat || '';
    const q = tc.querySelector('#model-search')?.value.toLowerCase() || '';
    tc.querySelectorAll('.model-card').forEach(card => {
      const matchCat = !cat || card.dataset.cat === cat;
      const modelName = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
      const matchSearch = !q || modelName.includes(q);
      card.style.display = (matchCat && matchSearch) ? '' : 'none';
    });
  };

  // Attach filter listeners immediately so they work even while loading or switching tabs
  tc.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      tc.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applyModelFilters();
    });
  });

  tc.querySelector('#model-search')?.addEventListener('input', applyModelFilters);

  // Fetch live data
  getVehicleModels()
    .then(models => buildCatalogueCards(tc, models))
    .catch(err => {
      console.error('[MODELS]', err);
      showToast('Failed to load vehicle models from server.', 'error');
      tc.querySelector('#model-cards').innerHTML =
        `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary)">
          <span class="material-icons-outlined" style="font-size:36px;display:block;margin-bottom:8px">cloud_off</span>
          Could not load models. Check your connection or try again.
        </div>`;
    });
}

function buildCatalogueCards(tc, models) {
  const grid = tc.querySelector('#model-cards');
  if (!models || models.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary)">
      <span class="material-icons-outlined" style="font-size:36px;display:block;margin-bottom:8px">inventory_2</span>
      No vehicle models found.
    </div>`;
    return;
  }

  grid.innerHTML = models.map(m => {
    // Robustly determine 2-wheeler vs 3-wheeler for the filter
    const rawCatCode = (m.categoryCode || '').toUpperCase();
    const rawCatLbl = (m.categoryLabel || '').toLowerCase();

    let filterCat = '';
    if (rawCatCode === 'G' || rawCatLbl.includes('2-wheeler') || rawCatLbl.includes('two')) {
      filterCat = '2W';
    } else if (rawCatCode === 'B' || rawCatCode === 'C' || rawCatCode === 'D' || rawCatLbl.includes('3-wheeler') || rawCatLbl.includes('three')) {
      filterCat = '3W';
    }

    const statusKey = (m.status || 'production').toLowerCase();
    const statusTag = STATUS_TAG[statusKey] || 'badge-draft';
    const statusLbl = STATUS_LABEL[statusKey] || m.status || '-';
    const color = m.colorHex || '#2563EB';
    const icon = filterCat === '2W' ? 'two_wheeler' : 'local_shipping';

    return `
    <div class="card model-card" data-cat="${filterCat}" style="cursor:pointer">
      <div class="card-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div class="card-title" style="color:${color}">
            <span class="material-icons-outlined">${icon}</span>${m.name || '-'}
          </div>
          <span class="badge ${statusTag}" style="align-self:flex-start;">${statusLbl}</span>
        </div>
        <button class="btn btn-primary btn-sm create-bom-btn" data-id="${m.id}" data-name="${m.name}" data-code="${m.modelCode || m.code || ''}" data-cat="${m.categoryCode || ''}" style="margin-left:auto;">
          <span class="material-icons-outlined" style="font-size:16px">account_tree</span>Create BOM
        </button>
      </div>
      <div class="card-body">
        <div style="font-size:0.857rem;color:var(--text-secondary);margin-bottom:14px">Created: ${m.createdAt ? new Date(m.createdAt).toLocaleString() : '-'}</div>
        <div class="detail-grid">
          <div class="detail-field"><div class="detail-label">Model Code</div><div class="detail-value" style="font-family:var(--font-mono);font-weight:700">${m.modelCode || m.code || '-'}</div></div>
          <div class="detail-field"><div class="detail-label">Variant</div><div class="detail-value">${m.variant || '-'}</div></div>
          <div class="detail-field"><div class="detail-label">Category Code</div><div class="detail-value">${m.categoryCode || '-'}</div></div>
          <div class="detail-field"><div class="detail-label">Color</div><div class="detail-value">${m.colorHex || '-'}</div></div>
        </div>
        <div class="divider"></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-xs view-bom-btn" data-name="${m.name}">View BOM</button>
          <button class="btn btn-outline btn-xs manage-var-btn" data-name="${m.name}">Manage Variants</button>
          <div style="margin-left:auto;display:flex;gap:4px">
            <button class="btn btn-ghost btn-xs edit-mdl-btn" data-id="${m.id}" title="Edit"><span class="material-icons-outlined" style="font-size:16px">edit</span></button>
            <button class="btn btn-ghost btn-xs delete-mdl-btn" data-id="${m.id}" data-name="${m.name}" title="Delete"><span class="material-icons-outlined" style="font-size:16px;color:#DC2626">delete</span></button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  // Apply the currently active filter to the newly loaded cards immediately
  const activeCat = tc.querySelector('.filter-chip.active')?.dataset.cat || '';
  const searchQ = tc.querySelector('#model-search')?.value.toLowerCase() || '';
  tc.querySelectorAll('.model-card').forEach(card => {
    const matchCat = !activeCat || card.dataset.cat === activeCat;
    const modelName = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
    const matchSearch = !searchQ || modelName.includes(searchQ);
    card.style.display = (matchCat && matchSearch) ? '' : 'none';
  });

  tc.querySelectorAll('.create-bom-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const prefill = {
        categoryCode: btn.dataset.cat || '',
        modelCode: btn.dataset.code || '',
        name: btn.dataset.name || '',
        vehicleModelId: btn.dataset.id || 0
      };
      openCreateBomModal(prefill);
    });
  });

  tc.querySelectorAll('.view-bom-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showToast(`Opening BOM Navigator for ${btn.dataset.name}…`, 'info');
      setTimeout(() => navigateTo('bom'), 800);
    });
  });

  tc.querySelectorAll('.manage-var-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showModal(`Manage Variants — ${btn.dataset.name}`,
        `<p class="text-sm text-secondary" style="margin-bottom:16px">Add, modify, or deactivate variants for this model family.</p>
         <div class="form-group"><label class="form-label">New Variant Name</label><input class="form-input" id="var-name" placeholder="e.g. E-Luna Ultra" /></div>
         <div class="grid-2" style="gap:12px">
           <div class="form-group"><label class="form-label">Battery Config</label><input class="form-input" placeholder="e.g. 4.0 kWh Fixed" /></div>
           <div class="form-group"><label class="form-label">Motor Config</label><input class="form-input" placeholder="e.g. 800W Hub Motor" /></div>
         </div>`,
        `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
         <button class="btn btn-primary" id="add-var-btn">Add Variant</button>`
      );
      setTimeout(() => {
        document.getElementById('add-var-btn')?.addEventListener('click', () => {
          const n = document.getElementById('var-name')?.value;
          if (!n) return showToast('Variant name required', 'error');
          document.querySelector('.modal-overlay')?.remove();
          showToast(`Variant "${n}" added. BOM template generated.`, 'success');
        });
      }, 50);
    });
  });

  tc.querySelectorAll('.edit-mdl-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const model = models.find(m => String(m.id) === btn.dataset.id);
      if (!model) return;

      showModal('Edit Vehicle Model',
        `<div class="grid-2" style="gap:16px;max-height:60vh;overflow-y:auto;padding-right:8px;">
          <div class="form-group"><label class="form-label">Model Name <span style="color:#DC2626">*</span></label><input class="form-input" id="edit-mdl-name" value="${model.name || ''}" /></div>
          <div class="form-group"><label class="form-label">Model Code <span style="color:#DC2626">*</span></label><input class="form-input" id="edit-mdl-code" value="${model.modelCode || model.code || ''}" /></div>
          <div class="form-group"><label class="form-label">Category Code</label><input class="form-input" id="edit-mdl-catcode" value="${model.categoryCode || ''}" /></div>
          <div class="form-group"><label class="form-label">Variant</label><input class="form-input" id="edit-mdl-variant" value="${model.variant || ''}" /></div>
          <div class="form-group"><label class="form-label">Color</label><input class="form-input" id="edit-mdl-colorhex" placeholder="e.g. Blue" value="${model.colorHex || ''}" /></div>
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Description / Notes</label><textarea class="form-input" id="edit-mdl-desc" rows="2" style="resize:vertical">${model.description || ''}</textarea></div>
        </div>`,
        `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
         <button class="btn btn-primary" id="edit-mdl-save">Save Changes</button>`
      );

      setTimeout(() => {
        document.getElementById('edit-mdl-save')?.addEventListener('click', async (btnE) => {
          const name = document.getElementById('edit-mdl-name')?.value;
          const code = document.getElementById('edit-mdl-code')?.value;
          if (!name || !code) return showToast('Model name and code are required', 'error');

          const submitBtn = btnE.currentTarget;
          const originalText = submitBtn.innerHTML;
          submitBtn.innerHTML = 'Saving...';
          submitBtn.disabled = true;

          const payload = {
            name: name,
            modelCode: code,
            categoryCode: document.getElementById('edit-mdl-catcode')?.value || '',
            variant: document.getElementById('edit-mdl-variant')?.value || '',
            colorHex: document.getElementById('edit-mdl-colorhex')?.value || '',
            description: document.getElementById('edit-mdl-desc')?.value || ''
          };

          try {
            await updateVehicleModel(model.id, payload);
            document.querySelector('.modal-overlay')?.remove();
            showToast(`Model "${name}" successfully updated!`, 'success');
            renderCatalogue(tc);
          } catch (err) {
            console.error(err);
            showToast('Failed to update model', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
          }
        });
      }, 50);
    });
  });

  tc.querySelectorAll('.delete-mdl-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const modelId = btn.dataset.id;
      const modelName = btn.dataset.name;
      const model = models.find(m => String(m.id) === String(modelId)) || {};

      showModal('Confirm Deletion',
        `<p>Are you sure you want to delete the model <strong>${modelName}</strong>?</p><p class="text-secondary text-sm">This action cannot be undone.</p>`,
        `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
         <button class="btn btn-primary" style="background:#DC2626;border-color:#DC2626" id="confirm-del-mdl">Delete</button>`
      );

      setTimeout(() => {
        document.getElementById('confirm-del-mdl')?.addEventListener('click', async (delBtnE) => {
          const submitBtn = delBtnE.currentTarget;
          submitBtn.innerHTML = 'Deleting...';
          submitBtn.disabled = true;

          try {
            await deleteVehicleModel(modelId, model);
            document.querySelector('.modal-overlay')?.remove();
            showToast(`Model "${modelName}" deleted.`, 'success');
            renderModelTab(tc, 'catalogue');
          } catch (err) {
            console.error(err);
            showToast('Failed to delete model', 'error');
            submitBtn.innerHTML = 'Delete';
            submitBtn.disabled = false;
          }
        });
      }, 50);
    });
  });
}

