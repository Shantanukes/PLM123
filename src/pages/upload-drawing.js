import { showToast } from '../main.js';
import { uploadDocument } from '../api/documents.js';
import { getPartByNumber } from '../api/parts.js';

// Called with a pre-filled part number when navigating from Parts page
export function renderUploadDrawing(container, prefillPartNumber = '') {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Upload Drawing</h1>
        <p>Upload engineering drawings and documents linked to a specific part number.</p>
      </div>
    </div>

    <div class="card" style="max-width:740px;margin:0 auto;">
      <div class="card-header">
        <div class="card-title">
          <span class="material-icons-outlined">upload_file</span>New Drawing Upload
        </div>
      </div>
      <div class="card-body">

        <!-- Part Number lookup -->
        <div style="background:var(--brand-primary-lighter);border:1px solid var(--brand-primary);border-radius:var(--radius-md);padding:14px 18px;margin-bottom:24px;">
          <div style="font-weight:600;color:var(--brand-primary);margin-bottom:8px;display:flex;align-items:center;gap:6px;">
            <span class="material-icons-outlined" style="font-size:16px;">search</span>Search by Part Number
          </div>
          <div style="display:flex;gap:8px;">
            <input class="form-input" id="ud-part-search" placeholder="e.g. BH1531590AX" style="flex:1;" value="${prefillPartNumber}" />
            <button class="btn btn-primary btn-sm" id="ud-part-lookup">
              <span class="material-icons-outlined" style="font-size:16px;">search</span>Fetch Part
            </button>
          </div>
        </div>

        <!-- Part Info Banner -->
        <div id="ud-part-info" style="display:none;background:var(--bg-card);border:1px solid var(--brand-primary);border-radius:var(--radius-md);padding:12px 16px;margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="material-icons-outlined" style="color:var(--brand-primary);font-size:20px;">check_circle</span>
            <div>
              <div style="font-weight:600;" id="ud-part-name-display">—</div>
              <div style="font-size:0.786rem;color:var(--text-secondary);" id="ud-part-num-display">—</div>
            </div>
          </div>
        </div>

        <!-- Drop Zone -->
        <div style="border:2px dashed var(--brand-primary);border-radius:var(--radius-md);padding:36px;text-align:center;cursor:pointer;margin-bottom:20px;background:var(--brand-primary-lighter);transition:background 0.2s;" id="ud-drop-zone">
          <span class="material-icons-outlined" style="font-size:44px;color:var(--brand-primary)">cloud_upload</span>
          <div style="font-weight:600;color:var(--brand-primary);margin-top:10px;font-size:1rem;" id="ud-drop-text">Click to select file or drag &amp; drop</div>
          <div style="font-size:0.786rem;color:var(--text-secondary);margin-top:4px;">PDF, DXF, DWG, STEP, SLDPRT, BIN — max 100 MB</div>
        </div>
        <input type="file" id="ud-file-input" style="display:none;" />

        <!-- Form Fields -->
        <div class="detail-grid" style="gap:16px;">
          <div class="form-group">
            <label class="form-label">Drawing Number <span style="color:#DC2626">*</span></label>
            <input class="form-input" id="ud-drwNum" placeholder="e.g. DRW-BH1531590AX" />
          </div>
          <div class="form-group">
            <label class="form-label">Name <span style="color:#DC2626">*</span></label>
            <input class="form-input" id="ud-name" placeholder="e.g. Assembly Drawing" />
          </div>
          <div class="form-group">
            <label class="form-label">Type</label>
            <select class="form-select" id="ud-type">
              <option value="0">Drawing</option>
              <option value="1">Specifications</option>
              <option value="2">Test Report</option>
              <option value="3">Manual</option>
              <option value="4">Other</option>
              <option value="5">Homologation</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">PartNumber</label>
            <input class="form-input" id="ud-partNumber" placeholder="Auto-filled after Fetch" readonly
              style="background:var(--bg-muted);cursor:not-allowed;" />
          </div>
          <div class="form-group">
            <label class="form-label">Revision</label>
            <input class="form-input" id="ud-rev" placeholder="e.g. A01" />
          </div>
        </div>

        <!-- Actions -->
        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:24px;padding-top:16px;border-top:1px solid var(--border-color);">
          <button class="btn btn-outline" id="ud-reset">Reset</button>
          <button class="btn btn-primary" id="ud-submit">
            <span class="material-icons-outlined" style="font-size:16px;">upload_file</span>Upload Drawing
          </button>
        </div>
      </div>
    </div>`;

  // ── File picker ──
  const fileInput = container.querySelector('#ud-file-input');
  const dropZone = container.querySelector('#ud-drop-zone');
  const dropText = container.querySelector('#ud-drop-text');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.background = 'var(--brand-primary-light)'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.background = 'var(--brand-primary-lighter)'; });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.background = 'var(--brand-primary-lighter)';
    if (e.dataTransfer.files?.length) {
      fileInput.files = e.dataTransfer.files;
      dropText.textContent = e.dataTransfer.files[0].name;
    }
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files?.length) dropText.textContent = e.target.files[0].name;
  });

  // ── Part fetch helper ──
  async function fetchPart(pn) {
    const btn = container.querySelector('#ud-part-lookup');
    btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;animation:spin 0.6s linear infinite">autorenew</span>';
    btn.disabled = true;
    try {
      const part = await getPartByNumber(pn);
      const partNum = part.partNumber || pn;
      const partName = part.name || '';
      const partRev = (part.revisionLetter || 'A') + (part.revisionDigits || '');

      container.querySelector('#ud-part-info').style.display = '';
      container.querySelector('#ud-part-name-display').textContent = partName || '—';
      container.querySelector('#ud-part-num-display').textContent = `Part Number: ${partNum}`;
      container.querySelector('#ud-drwNum').value = `DRW-${partNum}`;
      container.querySelector('#ud-name').value = partName ? `${partName} Drawing` : '';
      container.querySelector('#ud-partNumber').value = partNum;
      container.querySelector('#ud-rev').value = partRev;
      showToast(`Part "${partNum}" loaded.`, 'success');
    } catch (err) {
      showToast(err.message || 'Part not found.', 'error');
    } finally {
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">search</span>Fetch Part';
      btn.disabled = false;
    }
  }

  // Auto-fetch if navigated from Parts page
  if (prefillPartNumber) {
    fetchPart(prefillPartNumber);
  }

  container.querySelector('#ud-part-lookup').addEventListener('click', () => {
    const pn = container.querySelector('#ud-part-search').value.trim();
    if (!pn) { showToast('Enter a part number first.', 'warning'); return; }
    fetchPart(pn);
  });

  container.querySelector('#ud-part-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') container.querySelector('#ud-part-lookup').click();
  });

  // ── Reset ──
  container.querySelector('#ud-reset').addEventListener('click', () => {
    container.querySelector('#ud-part-search').value = '';
    container.querySelector('#ud-part-info').style.display = 'none';
    ['#ud-drwNum', '#ud-name', '#ud-partNumber', '#ud-rev'].forEach(id => { container.querySelector(id).value = ''; });
    container.querySelector('#ud-type').value = '0';
    dropText.textContent = 'Click to select file or drag & drop';
    fileInput.value = '';
  });

  // ── Submit ──
  container.querySelector('#ud-submit').addEventListener('click', async () => {
    const drawingNumber = container.querySelector('#ud-drwNum').value.trim();
    const name = container.querySelector('#ud-name').value.trim();
    const type = container.querySelector('#ud-type').value;
    const partNumber = container.querySelector('#ud-partNumber').value.trim();
    const revision = container.querySelector('#ud-rev').value.trim();

    if (!drawingNumber || !name) {
      showToast('Drawing Number and Name are required.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('DrawingNumber', drawingNumber);
    formData.append('Name', name);
    formData.append('Type', type);
    if (partNumber) formData.append('PartNumber', partNumber);
    if (revision) formData.append('Revision', revision);
    if (fileInput.files?.length) formData.append('file', fileInput.files[0]);
 

    const btn = container.querySelector('#ud-submit');
    try {
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;animation:spin 0.6s linear infinite">autorenew</span> Uploading…';
      btn.disabled = true;
      showToast('Uploading document…', 'info');
      await uploadDocument(formData);
      showToast('Document uploaded successfully!', 'success');
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">check_circle</span> Uploaded!';
      setTimeout(() => {
        btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">upload_file</span>Upload Drawing';
        btn.disabled = false;
      }, 2500);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Upload failed.', 'error');
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">upload_file</span>Upload Drawing';
      btn.disabled = false;
    }
  });
}

