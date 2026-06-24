import { showToast } from '../main.js';
import { uploadDocument } from '../api/documents.js';
import { getPartByNumber } from '../api/parts.js';

export function renderHomologation(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Homologation</h1>
        <p>Manage compliance certificates exclusively for Homologation.</p>
      </div>
    </div>

    <div id="homologation-content"></div>
  `;

  renderHomologationTab(container.querySelector('#homologation-content'));
}

function renderHomologationTab(container) {
  container.innerHTML = `
    <div class="card" style="max-width:740px;margin:0 auto 20px auto;">
      <div class="card-header">
        <div class="card-title">
          <span class="material-icons-outlined">upload_file</span>Upload BOM Compliance Certificate
        </div>
      </div>
      <div class="card-body">

        <!-- Part Number lookup -->
        <div style="background:var(--brand-primary-lighter);border:1px solid var(--brand-primary);border-radius:var(--radius-md);padding:14px 18px;margin-bottom:24px;">
          <div style="font-weight:600;color:var(--brand-primary);margin-bottom:8px;display:flex;align-items:center;gap:6px;">
            <span class="material-icons-outlined" style="font-size:16px;">search</span>Search by Part Number
          </div>
          <div style="display:flex;gap:8px;">
            <input class="form-input" id="hl-part-search" placeholder="e.g. BH1531590AX" style="flex:1;" />
            <button class="btn btn-primary btn-sm" id="hl-part-lookup">
              <span class="material-icons-outlined" style="font-size:16px;">search</span>Fetch Part
            </button>
          </div>
        </div>

        <!-- Part Info Banner -->
        <div id="hl-part-info" style="display:none;background:var(--bg-card);border:1px solid var(--brand-primary);border-radius:var(--radius-md);padding:12px 16px;margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="material-icons-outlined" style="color:var(--brand-primary);font-size:20px;">check_circle</span>
            <div>
              <div style="font-weight:600;" id="hl-part-name-display">—</div>
              <div style="font-size:0.786rem;color:var(--text-secondary);" id="hl-part-num-display">—</div>
            </div>
          </div>
        </div>

        <!-- Drop Zone -->
        <div style="border:2px dashed var(--brand-primary);border-radius:var(--radius-md);padding:36px;text-align:center;cursor:pointer;margin-bottom:20px;background:var(--brand-primary-lighter);transition:background 0.2s;" id="hl-drop-zone">
          <span class="material-icons-outlined" style="font-size:44px;color:var(--brand-primary)">cloud_upload</span>
          <div style="font-weight:600;color:var(--brand-primary);margin-top:10px;font-size:1rem;" id="hl-drop-text">Click to select file or drag &amp; drop</div>
          <div style="font-size:0.786rem;color:var(--text-secondary);margin-top:4px;">PDF, DXF, DWG, STEP, SLDPRT, BIN, JPG, PNG — max 100 MB</div>
        </div>
        <input type="file" id="hl-file-input" style="display:none;" />

        <!-- Form Fields -->
        <div class="detail-grid" style="gap:16px;">
          <div class="form-group">
            <label class="form-label">Drawing Number <span style="color:#DC2626">*</span></label>
            <input class="form-input" id="hl-drwNum" placeholder="e.g. DRW-BH1531590AX" />
          </div>
          <div class="form-group">
            <label class="form-label">Name <span style="color:#DC2626">*</span></label>
            <input class="form-input" id="hl-name" placeholder="e.g. Compliance Certificate" />
          </div>
          
          <div class="form-group">
            <label class="form-label">PartNumber</label>
            <input class="form-input" id="hl-partNumber" placeholder="Auto-filled after Fetch" readonly
              style="background:var(--bg-muted);cursor:not-allowed;" />
          </div>
          <div class="form-group">
            <label class="form-label">Revision</label>
            <input class="form-input" id="hl-rev" placeholder="e.g. A01" />
          </div>
          <div class="form-group">
            <label class="form-label">Issue Date <span style="color:#DC2626">*</span></label>
            <input type="date" class="form-input" id="hl-issueDate" />
          </div>
          <div class="form-group">
            <label class="form-label">Expiry Date <span style="color:#DC2626">*</span></label>
            <input type="date" class="form-input" id="hl-expiryDate" />
          </div>
          <div class="form-group">
            <label class="form-label">Invoice Number <span style="color:#DC2626">*</span></label>
            <input type="text" class="form-input" id="hl-invoiceNum" placeholder="Enter invoice number" />
          </div>
          <div class="form-group" style="display:none;">
            <label class="form-label">Type</label>
            <input type="hidden" id="hl-type" value="5" />
          </div>
        </div>

        <!-- Actions -->
        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:24px;padding-top:16px;border-top:1px solid var(--border-color);">
          <button class="btn btn-outline" id="hl-reset">Reset</button>
          <button class="btn btn-primary" id="hl-submit">
            <span class="material-icons-outlined" style="font-size:16px;">upload_file</span>Upload Certificate
          </button>
        </div>
      </div>
    </div>
    
    <div class="card" style="max-width:740px;margin:0 auto;">
      <div class="card-header">
        <div class="card-title">BOM Compliance Certificates</div>
      </div>
      <div class="card-body">
        <p class="text-secondary" style="font-size: 0.9rem;">No BOM certificates uploaded yet. Recently added compliance records will be listed here.</p>
      </div>
    </div>
  `;

  // ── File picker ──
  const fileInput = container.querySelector('#hl-file-input');
  const dropZone = container.querySelector('#hl-drop-zone');
  const dropText = container.querySelector('#hl-drop-text');

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
    const btn = container.querySelector('#hl-part-lookup');
    btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;animation:spin 0.6s linear infinite">autorenew</span>';
    btn.disabled = true;
    try {
      const part = await getPartByNumber(pn);
      const partNum = part.partNumber || pn;
      const partName = part.name || '';
      const partRev = (part.revisionLetter || 'A') + (part.revisionDigits || '');

      container.querySelector('#hl-part-info').style.display = '';
      container.querySelector('#hl-part-name-display').textContent = partName || '—';
      container.querySelector('#hl-part-num-display').textContent = `Part Number: ${partNum}`;
      container.querySelector('#hl-drwNum').value = `DRW-${partNum}`;
      container.querySelector('#hl-name').value = partName ? `${partName} Compliance Certificate` : '';
      container.querySelector('#hl-partNumber').value = partNum;
      container.querySelector('#hl-rev').value = partRev;
      showToast(`Part "${partNum}" loaded.`, 'success');
    } catch (err) {
      showToast(err.message || 'Part not found.', 'error');
    } finally {
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">search</span>Fetch Part';
      btn.disabled = false;
    }
  }

  container.querySelector('#hl-part-lookup').addEventListener('click', () => {
    const pn = container.querySelector('#hl-part-search').value.trim();
    if (!pn) { showToast('Enter a part number first.', 'warning'); return; }
    fetchPart(pn);
  });

  container.querySelector('#hl-part-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') container.querySelector('#hl-part-lookup').click();
  });

  // ── Reset ──
  container.querySelector('#hl-reset').addEventListener('click', () => {
    container.querySelector('#hl-part-search').value = '';
    container.querySelector('#hl-part-info').style.display = 'none';
    ['#hl-drwNum', '#hl-name', '#hl-partNumber', '#hl-rev', '#hl-issueDate', '#hl-expiryDate', '#hl-invoiceNum'].forEach(id => { container.querySelector(id).value = ''; });
    dropText.textContent = 'Click to select file or drag & drop';
    fileInput.value = '';
  });

  // ── Submit ──
  container.querySelector('#hl-submit').addEventListener('click', async () => {
    const drawingNumber = container.querySelector('#hl-drwNum').value.trim();
    const name = container.querySelector('#hl-name').value.trim();
    const type = container.querySelector('#hl-type').value;
    const partNumber = container.querySelector('#hl-partNumber').value.trim();
    const revision = container.querySelector('#hl-rev').value.trim();
    const issueDate = container.querySelector('#hl-issueDate').value;
    const expiryDate = container.querySelector('#hl-expiryDate').value;
    const invoiceNum = container.querySelector('#hl-invoiceNum').value.trim();

    if (!drawingNumber || !name || !issueDate || !expiryDate || !invoiceNum || !fileInput.files?.length) {
      showToast('Drawing Number, Name, Issue Date, Expiry Date, Invoice Number, and File are mandatory.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('DrawingNumber', drawingNumber);
    formData.append('Name', name);
    formData.append('Type', type);
    if (partNumber) formData.append('PartNumber', partNumber);
    if (revision) formData.append('Revision', revision);
    
    const dtIssue = new Date(issueDate).toISOString();
    const dtExpiry = new Date(expiryDate).toISOString();
    formData.append('IssueDate', dtIssue);
    formData.append('ExpiryDate', dtExpiry);
    
    formData.append('InvoiceNumber', invoiceNum);
    
    formData.append('file', fileInput.files[0]);

    const btn = container.querySelector('#hl-submit');
    try {
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;animation:spin 0.6s linear infinite">autorenew</span> Uploading…';
      btn.disabled = true;
      showToast('Uploading compliance certificate…', 'info');
      await uploadDocument(formData);
      showToast('Certificate uploaded successfully!', 'success');
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">check_circle</span> Uploaded!';
      setTimeout(() => {
        btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">upload_file</span>Upload Certificate';
        btn.disabled = false;
        container.querySelector('#hl-reset').click();
      }, 2500);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Upload failed.', 'error');
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;">upload_file</span>Upload Certificate';
      btn.disabled = false;
    }
  });
}
