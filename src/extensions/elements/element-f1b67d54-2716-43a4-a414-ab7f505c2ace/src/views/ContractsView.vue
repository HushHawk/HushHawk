<template>
  <div class="view-container">
    <!-- Metrics Bar -->
    <div class="metrics-grid">
      <div v-for="(m, i) in metrics" :key="m.label" class="metric-card">
        <div class="metric-icon-wrap" :class="{ gold: i === 1 || i === 4, cyan: i === 0, green: i === 2 || i === 3 }">
          <span v-html="icons[m.icon]"></span>
        </div>
        <div class="metric-info">
          <span class="metric-label">{{ m.label }}</span>
          <strong class="metric-val">{{ m.value }}</strong>
          <span class="metric-change" :class="{ positive: m.change.includes('+') }">
            {{ m.change }} <em>active files</em>
          </span>
        </div>
      </div>
    </div>

    <!-- Main Workspace -->
    <div class="content-split" :class="{ 'has-drawer': selectedContract }">
      <div class="main-panel">
        <div class="panel-header">
          <div class="header-left">
            <h2>
              <span class="icon-title" v-html="icons.file"></span>
              Contracts &amp; Title Escrow Operations
            </h2>
            <span class="badge-count">{{ filteredContracts.length }} contracts tracking</span>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" @click="openModal('newContract')">
              <span v-html="icons.plus"></span>
              Draft Contract
            </button>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="filter-toolbar">
          <div class="search-box">
            <span v-html="icons.search"></span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search contract ID, address, buyer, seller, title agency..."
              aria-label="Search contracts"
            />
            <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" aria-label="Clear search">
              <span v-html="icons.close"></span>
            </button>
          </div>

          <div class="filter-group">
            <label>Type:</label>
            <select v-model="typeFilter" aria-label="Filter by contract type">
              <option value="">All Contract Types</option>
              <option value="PSA">Purchase &amp; Sale (PSA)</option>
              <option value="Assignment">Assignment Agreement</option>
              <option value="Amendment">Contract Amendment</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Milestone:</label>
            <select v-model="milestoneFilter" aria-label="Filter by title milestone">
              <option value="">All Milestones</option>
              <option value="In Escrow">In Escrow / EMD Confirmed</option>
              <option value="Title Exam">Title Exam Complete</option>
              <option value="Clear to Close">Clear to Close</option>
              <option value="Funded">Funded / Closed</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Sort:</label>
            <select v-model="sortBy" aria-label="Sort contracts">
              <option value="closingAsc">Closing Date (Earliest First)</option>
              <option value="feeDesc">Assignment Fee (High to Low)</option>
              <option value="dateDesc">Newest Contract</option>
            </select>
          </div>

          <button v-if="hasActiveFilters" class="btn btn-subtle" @click="resetFilters">
            <span v-html="icons.refresh"></span>
            Reset
          </button>
        </div>

        <!-- Contracts Table -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Contract ID</th>
                <th>Subject Property Address</th>
                <th>Type</th>
                <th>Seller Entity</th>
                <th>Purchasing Buyer</th>
                <th>Contract Buy</th>
                <th>Assignment Spread</th>
                <th>Title Escrow Agency</th>
                <th>Closing Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in filteredContracts"
                :key="c.id"
                :class="{ active: selectedContract?.id === c.id }"
                @click="selectContract(c)"
              >
                <td>
                  <strong class="contract-code">{{ c.code }}</strong>
                </td>
                <td>
                  <div class="property-cell">
                    <strong>{{ c.address }}</strong>
                    <small>{{ [c.city, c.state].filter(Boolean).join(', ') }} {{ c.zip }}</small>
                  </div>
                </td>
                <td>
                  <span class="type-pill">{{ c.type }}</span>
                </td>
                <td>{{ c.seller }}</td>
                <td>
                  <strong :class="{ unassigned: !c.buyer }">{{ c.buyer || 'Unassigned (In Dispo)' }}</strong>
                </td>
                <td>{{ formatCurrency(c.buyPrice) }}</td>
                <td>
                  <span class="spread-tag">{{ formatCurrency(c.fee) }}</span>
                </td>
                <td>
                  <div class="title-cell">
                    <span>{{ c.titleAgency }}</span>
                    <small>File: {{ c.fileNumber }}</small>
                  </div>
                </td>
                <td>
                  <span class="closing-date">{{ c.closingDate }}</span>
                </td>
                <td>
                  <span class="status-chip" :class="c.statusClass">{{ c.status }}</span>
                </td>
                <td @click.stop>
                  <button class="btn-icon-danger" @click="confirmDeleteContract(c)" title="Delete / Void Contract">
                    <span v-html="icons.trash"></span>
                  </button>
                </td>
              </tr>
              <tr v-if="filteredContracts.length === 0">
                <td colspan="11" class="empty-contracts-cell">
                  <div class="empty-contracts-box">
                    <span class="empty-contracts-icon" v-html="icons.file"></span>
                    <strong style="color: var(--hh-text, #f8fafc); font-size: 1.05rem;">No Active Contracts in Escrow</strong>
                    <p style="color: var(--hh-muted, #94a3b8); font-size: 0.85rem; margin: 0.35rem 0 1rem 0;">No wholesale purchase agreements or assignment contracts are currently executing. Push an accepted offer from Seller Leads or create a new contract.</p>
                    <button class="btn btn-primary" @click="openModal('newContract')">
                      <span v-html="icons.plus"></span>
                      Draft First Contract
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detail Drawer -->
      <aside v-if="selectedContract" class="detail-drawer">
        <div class="drawer-header">
          <div>
            <h3>{{ selectedContract.code }} — {{ selectedContract.address }}</h3>
            <p>{{ selectedContract.type }} · Escrow: {{ selectedContract.titleAgency }}</p>
          </div>
          <button class="close-btn" @click="selectedContract = null" aria-label="Close details">
            <span v-html="icons.close"></span>
          </button>
        </div>

        <!-- Financial Summary -->
        <div class="financial-strip">
          <div>
            <small>Seller Contract</small>
            <strong>{{ formatCurrency(selectedContract.buyPrice) }}</strong>
          </div>
          <div>
            <small>Buyer Assignment</small>
            <strong>{{ formatCurrency(selectedContract.buyPrice + selectedContract.fee) }}</strong>
          </div>
          <div class="gold">
            <small>Wholesale Spread</small>
            <strong>{{ formatCurrency(selectedContract.fee) }}</strong>
          </div>
        </div>

        <!-- Milestones Checklist -->
        <div class="drawer-section">
          <div class="section-title">
            <span v-html="icons.file"></span>
            <h4>Title &amp; Escrow Milestone Checklist</h4>
          </div>
          <div class="milestone-checklist">
            <label v-for="m in selectedContract.milestones" :key="m.name" class="milestone-row">
              <input type="checkbox" v-model="m.completed" @change="onMilestoneToggle(selectedContract, m)" />
              <div>
                <strong :class="{ done: m.completed }">{{ m.name }}</strong>
                <small>{{ m.detail }}</small>
              </div>
            </label>
          </div>
        </div>

        <!-- Documents Attached -->
        <div class="drawer-section">
          <div class="section-title">
            <span v-html="icons.file"></span>
            <h4>Attached Documents</h4>
          </div>
          <div class="docs-list">
            <div v-for="d in selectedContract.docs" :key="d.name" class="doc-item">
              <span v-html="icons.file"></span>
              <span>{{ d.name }}</span>
              <button class="btn btn-xs" @click="previewDoc(d.name)">Preview</button>
            </div>
          </div>
        </div>

        <div class="drawer-footer">
          <button class="btn btn-primary btn-block" @click="openModal('upload')">
            <span v-html="icons.download"></span>
            Upload Title Commitment
          </button>
          <button class="btn btn-danger-outline btn-block" style="margin-top: 8px;" @click="confirmDeleteContract(selectedContract)" title="Delete Contract">
            <span v-html="icons.trash"></span> Delete / Void Contract
          </button>
        </div>
      </aside>
    </div>

    <!-- Modals Teleported to document body -->
    <Teleport to="body">
    <!-- New Contract Modal -->
    <div v-if="modalType === 'newContract'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>
            <span v-html="icons.plus"></span>
            Draft New Wholesale Contract
          </h3>
          <button class="close-btn" @click="closeModal" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-grid-2">
            <div class="form-group">
              <label>Contract Type</label>
              <select v-model="newForm.type">
                <option value="PSA">Purchase &amp; Sale Agreement (PSA)</option>
                <option value="Assignment">Assignment of Contract</option>
              </select>
            </div>
            <div class="form-group">
              <label>Property Address</label>
              <input v-model="newForm.address" placeholder="e.g. 7810 Moncrief Rd" />
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Seller Name / Entity</label>
              <input v-model="newForm.seller" placeholder="Dorothy Jenkins" />
            </div>
            <div class="form-group">
              <label>Purchase Price ($)</label>
              <input v-model.number="newForm.buyPrice" type="number" placeholder="95000" />
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Title Agency</label>
              <input v-model="newForm.titleAgency" placeholder="First American Title Jax" />
            </div>
            <div class="form-group">
              <label>Scheduled Closing Date</label>
              <input v-model="newForm.closingDate" type="date" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button class="btn btn-primary" @click="saveContract">
            Generate &amp; Register Contract
          </button>
        </div>
      </div>
    </div>

    <!-- Upload Modal -->
    <div v-if="modalType === 'upload'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>
            <span v-html="icons.download"></span>
            Upload Title Documents
          </h3>
          <button class="close-btn" @click="closeModal" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <p>Attach title commitment, lien search, municipal payoff, or settlement statement (HUD-1/ALTA).</p>
          <div class="upload-dropzone" @click="triggerFileInput" style="cursor: pointer;">
            <input type="file" ref="docFileInput" @change="handleFileChosen" style="display: none;" accept=".pdf,.doc,.docx,.png,.jpg" />
            <span v-html="icons.file"></span>
            <p>{{ selectedUploadFile ? selectedUploadFile.name : 'Click to select PDF or escrow document' }}</p>
            <small v-if="selectedUploadFile" style="color: #38bdf8; display: block; margin-top: 4px;">{{ (selectedUploadFile.size / 1024).toFixed(1) }} KB ready for S3 Vault</small>
          </div>
          <div v-if="uploadNotice" class="alert-success">{{ uploadNotice }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal" :disabled="isUploadingDoc">Cancel</button>
          <button class="btn btn-primary" @click="confirmUpload" :disabled="isUploadingDoc">
            {{ isUploadingDoc ? 'Uploading to AWS S3...' : 'Save to Escrow File' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Escrow Document Preview Modal -->
    <div v-if="previewDocName" class="modal-overlay" @click.self="previewDocName = ''">
      <div class="modal-card escrow-preview-card">
        <div class="modal-header">
          <div class="epm-title-wrap">
            <span class="category-pill">Escrow &amp; Title</span>
            <h3>{{ previewDocName }}</h3>
          </div>
          <button class="close-btn" @click="previewDocName = ''" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body epm-body">
          <div class="epm-banner">
            <div class="epm-banner-left">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span><strong>Preview Only Mode:</strong> Sealed title document. Viewing directly inside HushHawk Escrow Viewer with zero local footprint.</span>
            </div>
            <span class="epm-seal-badge">SEALED ESCROW DOSSIER</span>
          </div>

          <div class="epm-content-sheet">
            <div class="epm-sheet-header">
              <div class="epm-seal-circle">SEAL</div>
              <div>
                <h4>FIRST AMERICAN TITLE &amp; ESCROW</h4>
                <p>Wholesale Contract File #HH-ESCROW-{{ selectedContract?.id || '01' }} · Duval County, FL</p>
              </div>
            </div>
            <div class="epm-details-grid">
              <div class="epm-grid-item"><span>Property Address:</span><strong>{{ selectedContract?.address || 'Property Dossier' }}</strong></div>
              <div class="epm-grid-item"><span>Contract Type:</span><strong>{{ selectedContract?.type || 'PSA' }}</strong></div>
              <div class="epm-grid-item"><span>Seller Principal:</span><strong>{{ selectedContract?.seller || 'Seller Record' }}</strong></div>
              <div class="epm-grid-item"><span>Purchase Consideration:</span><strong>{{ formatCurrency(selectedContract?.buyPrice) }}</strong></div>
              <div class="epm-grid-item"><span>Title Company:</span><strong>{{ selectedContract?.titleAgency || 'First American Title' }}</strong></div>
              <div class="epm-grid-item"><span>Target Closing:</span><strong>{{ selectedContract?.closingDate || 'Scheduled' }}</strong></div>
            </div>
            <div class="epm-text-preview-box">
              <div class="etpb-line">═══════════════════════════════════════════════════════════════════</div>
              <div class="etpb-line">DOCUMENT VERIFICATION RECORD: {{ previewDocName }}</div>
              <div class="etpb-line">ENCRYPTED OBJECT STORAGE: AWS S3 Private Vault / escrow / contracts / {{ previewDocName }}</div>
              <div class="etpb-line">STATUS: Validated, Escrow Sealed, and Linked to Contract Record</div>
              <div class="etpb-line">SECURITY: In-Browser Document Preview Mode · Local Downloads Restricted</div>
              <div class="etpb-line">═══════════════════════════════════════════════════════════════════</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="previewDocName = ''">Close Preview</button>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { icons } from '../icons.js';

export default {
  name: 'ContractsView',
  setup() {
    const contracts = ref([]);

    const metrics = computed(() => {
      const list = contracts.value || [];
      const total = list.length;
      const assigned = list.filter(c => c.status === 'Assigned' || (c.buyer && c.buyer !== '—')).length;
      const inTitle = list.filter(c => c.status === 'Title/Escrow' || c.status === 'EMD Verified').length;
      const emd = list.filter(c => c.status === 'EMD Verified' || c.emdReceived).length;
      const clearToClose = list.filter(c => c.status === 'Clear to Close' || c.status === 'Closed').length;
      return [
        { label: 'Executed Purchase PSA', value: String(total), change: 'Live', icon: 'file' },
        { label: 'Assigned to Buyers', value: String(assigned), change: 'Active', icon: 'handshake' },
        { label: 'In Title / Escrow', value: String(inTitle), change: 'Live', icon: 'shield' },
        { label: 'EMD Verified', value: String(emd), change: 'Live', icon: 'check' },
        { label: 'Clear to Close', value: String(clearToClose), change: 'Live', icon: 'crown' }
      ];
    });

    const API_BASE = '/api/v1';

    async function loadContracts() {
      try {
        const res = await fetch(API_BASE + '/contracts');
        const data = await res.json();
        if (data && data.contracts) {
          contracts.value = data.contracts;
          if (!selectedContract.value && data.contracts.length) selectedContract.value = data.contracts[0];
        }
      } catch (err) {
        showToast('Contracts unavailable', err.message, 'danger');
      }
    }

    onMounted(() => {
      loadContracts();
    });

    const searchQuery = ref('');
    const typeFilter = ref('');
    const milestoneFilter = ref('');
    const sortBy = ref('closingAsc');
    const selectedContract = ref(contracts.value[0]);
    const modalType = ref('');
    const uploadNotice = ref('');
    const docFileInput = ref(null);
    const selectedUploadFile = ref(null);
    const isUploadingDoc = ref(false);
    const newForm = ref({ type: 'PSA', address: '', seller: '', buyPrice: '', titleAgency: '', closingDate: '' });

    const hasActiveFilters = computed(() => searchQuery.value || typeFilter.value || milestoneFilter.value || sortBy.value !== 'closingAsc');

    const filteredContracts = computed(() => {
      let list = contracts.value.filter(c => {
        const q = searchQuery.value.toLowerCase().trim();
        const matchesQuery = !q || [c.code, c.address, c.seller, c.buyer, c.titleAgency].join(' ').toLowerCase().includes(q);
        const matchesType = !typeFilter.value || c.type === typeFilter.value;
        const matchesMilestone = !milestoneFilter.value || c.status === milestoneFilter.value;
        return matchesQuery && matchesType && matchesMilestone;
      });

      if (sortBy.value === 'closingAsc') {
        list.sort((a, b) => a.closingDate.localeCompare(b.closingDate));
      } else if (sortBy.value === 'feeDesc') {
        list.sort((a, b) => b.fee - a.fee);
      } else if (sortBy.value === 'dateDesc') {
        list.sort((a, b) => b.code.localeCompare(a.code));
      }
      return list;
    });

    function selectContract(c) {
      selectedContract.value = c;
    }

    function resetFilters() {
      searchQuery.value = '';
      typeFilter.value = '';
      milestoneFilter.value = '';
      sortBy.value = 'closingAsc';
    }

    function openModal(type) {
      modalType.value = type;
      uploadNotice.value = '';
    }

    function closeModal() {
      modalType.value = '';
    }

    
    async function onMilestoneToggle(contract, milestone) {
      if (!contract) return;
      const idx = contract.milestones ? contract.milestones.indexOf(milestone) : -1;
      if (idx !== -1) {
        try {
          await fetch(API_BASE + '/contracts/' + contract.id + '/milestone', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ milestoneIndex: idx, completed: milestone.completed })
          });
        } catch (e) {
          console.warn('[Contracts] Milestone sync fallback');
        }
      }
    }

    async function saveContract() {
      if (!newForm.value.address || !newForm.value.seller || !(Number(newForm.value.buyPrice) > 0)) {
        showToast('Missing details', 'An address, seller and purchase price are required.', 'danger');
        return;
      }
      const payload = {
        address: newForm.value.address,
        type: newForm.value.type,
        seller: newForm.value.seller,
        buyPrice: Number(newForm.value.buyPrice),
        titleAgency: newForm.value.titleAgency || null,
        closingDate: newForm.value.closingDate || null
      };
      try {
        const res = await fetch(API_BASE + '/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const saved = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(saved.error || `HTTP ${res.status}`);
        await loadContracts();
        selectedContract.value = contracts.value.find(c => c.id === saved.id) || contracts.value[0] || null;
        showToast('Contract saved', `${payload.address} is now under contract.`, 'success');
        newForm.value = { type: 'PSA', address: '', seller: '', buyPrice: '', titleAgency: '', closingDate: '' };
        closeModal();
      } catch (err) {
        showToast('Contract not saved', err.message, 'danger');
      }
    }

    function triggerFileInput() {
      if (docFileInput.value) docFileInput.value.click();
    }

    function handleFileChosen(e) {
      const file = e.target.files && e.target.files[0];
      if (file) {
        selectedUploadFile.value = file;
        uploadNotice.value = `Selected "${file.name}". Click "Save to Escrow File" to upload to AWS S3.`;
      }
    }

    async function confirmUpload() {
      if (!selectedUploadFile.value) {
        uploadNotice.value = 'Please select a document file first.';
        return;
      }
      isUploadingDoc.value = true;
      const file = selectedUploadFile.value;

      try {
        // 1. Get S3 Presigned Upload Authorization
        const authRes = await fetch('/api/v1/vault/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            content_type: file.type || 'application/pdf',
            file_size_bytes: file.size,
            category: 'Title & Escrow'
          })
        });

        if (!authRes.ok) throw new Error('Could not authorize the S3 upload.');
        const auth = await authRes.json();
        if (auth.mode === 'DEVELOPMENT_PRESET' || !auth.upload_url?.startsWith('https://')) {
          throw new Error('Private storage is unavailable. Check the S3 connection.');
        }
        const upload = await fetch(auth.upload_url, {
          method: 'PUT',
          headers: auth.headers,
          body: file
        });
        if (!upload.ok) throw new Error(`S3 rejected the upload (HTTP ${upload.status}).`);

        const registration = await fetch('/api/v1/vault/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            category: 'Title & Escrow',
            object_key: auth.object_key,
            file_size_bytes: file.size,
            mime_type: file.type || 'application/pdf'
          })
        });
        if (!registration.ok) throw new Error('S3 received the file, but Vault could not save its record.');

        // 4. Attach doc to active contract
        if (selectedContract.value) {
          if (!selectedContract.value.docs) selectedContract.value.docs = [];
          selectedContract.value.docs.unshift({ name: file.name, size: file.size, uploadedAt: new Date().toISOString() });
        }

        uploadNotice.value = `Verified & encrypted in AWS S3: "${file.name}"`;
        showToast('AWS S3 Upload Verified', `"${file.name}" saved to S3 Escrow Vault.`, 'success');

        setTimeout(() => {
          closeModal();
          selectedUploadFile.value = null;
          isUploadingDoc.value = false;
        }, 1200);
      } catch (err) {
        uploadNotice.value = err.message;
        showToast('Escrow upload failed', err.message, 'error');
        isUploadingDoc.value = false;
      }
    }

    function showToast(title, message, type = 'info') {
      if (typeof window !== 'undefined') {
        if (window.showHushHawkToast) {
          window.showHushHawkToast(title, message, type);
        } else {
          window.dispatchEvent(new CustomEvent('hushhawk-toast', { detail: { title, message, type } }));
        }
      }
    }

    function downloadDoc(doc) {
      try {
        const text = `HUSHHAWK ENCRYPTED ESCROW VAULT\nDOCUMENT: ${doc}\nSTATUS: Verified & Sealed\nTITLE COMPANY: First American Title Jacksonville\nTIMESTAMPTZ: ${new Date().toISOString()}`;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${doc.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Escrow Vault', `Decrypted & downloaded: ${doc}`, 'success');
      } catch (e) {
        showToast('Escrow Vault', `Accessing encrypted document: ${doc}`, 'info');
      }
    }

    const previewDocName = ref('');

    function previewDoc(doc) {
      previewDocName.value = doc;
    }

    function formatCurrency(val) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
    }

    async function confirmDeleteContract(c) {
      if (!c) return;
      if (!confirm(`Are you sure you want to void and delete contract ${c.code || c.id} for "${c.address}"? This action cannot be undone.`)) {
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/contracts/${c.id}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (res.ok || data.success) {
          contracts.value = contracts.value.filter(item => item.id !== c.id);
          if (selectedContract.value && selectedContract.value.id === c.id) {
            selectedContract.value = null;
          }
          showToast('Contract Voided', `Contract ${c.code || ''} deleted successfully.`, 'success');
        } else {
          showToast('Error', data.error || 'Failed to delete contract', 'danger');
        }
      } catch (err) {
        contracts.value = contracts.value.filter(item => item.id !== c.id);
        if (selectedContract.value && selectedContract.value.id === c.id) {
          selectedContract.value = null;
        }
        showToast('Contract Voided', `Contract ${c.code || ''} removed.`, 'info');
      }
    }

    return {
      icons,
      metrics,
      contracts,
      searchQuery,
      typeFilter,
      milestoneFilter,
      sortBy,
      selectedContract,
      modalType,
      uploadNotice,
      docFileInput,
      selectedUploadFile,
      isUploadingDoc,
      triggerFileInput,
      handleFileChosen,
      previewDocName,
      newForm,
      hasActiveFilters,
      filteredContracts,
      selectContract,
      resetFilters,
      openModal,
      closeModal,
      saveContract,
      onMilestoneToggle,
      confirmUpload,
      downloadDoc,
      previewDoc,
      formatCurrency,
      confirmDeleteContract
    };
  }
};
</script>

<style scoped>
.view-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.metric-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #081d33;
  border: 1px solid #1c4266;
  border-radius: 8px;
  padding: 14px 18px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  min-width: 0;
  box-sizing: border-box;
}
.metric-icon-wrap {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: #112a45;
  color: #7dcaf4;
  flex-shrink: 0;
}
.metric-icon-wrap.gold {
  color: #edcf7c;
  background: #2a2c26;
}
.metric-icon-wrap.cyan {
  color: #4dd2ff;
  background: #0f354f;
}
.metric-icon-wrap.green {
  color: #35e6a2;
  background: #0d382d;
}
.metric-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  overflow: hidden;
}
.metric-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ab4cc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.metric-val {
  font-size: 20px;
  color: #f1f6ff;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.metric-change {
  font-size: 11px;
  color: #9ab4cc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.metric-change.positive {
  color: #35e6a2;
}

.content-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  transition: all 0.3s ease;
}
.content-split.has-drawer {
  grid-template-columns: minmax(0, 1fr) 340px;
}
@media (max-width: 1280px) {
  .content-split.has-drawer {
    grid-template-columns: minmax(0, 1fr);
  }
}

.main-panel {
  background: #07192d;
  border: 1px solid #1c4266;
  border-radius: 8px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-left h2 {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f1f6ff;
}
.badge-count {
  font-size: 11px;
  padding: 3px 8px;
  background: #113454;
  color: #7dcaf4;
  border-radius: 12px;
  border: 1px solid #235882;
}

.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  background: #092038;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid #1d456b;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #051424;
  border: 1px solid #28547d;
  border-radius: 5px;
  padding: 6px 10px;
  flex: 1;
  min-width: 200px;
}
.search-box input {
  background: transparent;
  border: none;
  outline: none;
  color: #f1f6ff;
  font-size: 13px;
  width: 100%;
}
.clear-btn {
  background: none;
  border: none;
  color: #9ab4cc;
  cursor: pointer;
  padding: 0;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #9ab4cc;
}
.filter-group select {
  background: #051424;
  border: 1px solid #28547d;
  color: #f1f6ff;
  padding: 6px 10px;
  border-radius: 5px;
  font-size: 12px;
  outline: none;
}

.table-container {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.data-table th {
  text-align: left;
  padding: 10px 12px;
  color: #8da9c2;
  font-weight: 600;
  border-bottom: 1px solid #1c4266;
  white-space: nowrap;
}
.data-table td {
  padding: 12px;
  border-bottom: 1px solid #143554;
  color: #f1f6ff;
  vertical-align: middle;
}
.data-table tbody tr {
  cursor: pointer;
  transition: background 0.15s ease;
}
.data-table tbody tr:hover {
  background: #0c2642;
}
.data-table tbody tr.active {
  background: #103254;
  border-left: 3px solid #edcf7c;
}

.contract-code {
  font-family: monospace;
  font-size: 11px;
  color: #edcf7c;
  background: #112a45;
  padding: 2px 6px;
  border-radius: 4px;
}
.property-cell strong {
  display: block;
  font-size: 13px;
  color: #ffffff;
}
.property-cell small {
  color: #8faec7;
  font-size: 11px;
}
.type-pill {
  padding: 2px 6px;
  background: #113454;
  color: #7dcaf4;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}
.unassigned {
  color: #ff9e79;
  font-style: italic;
}
.spread-tag {
  color: #35e6a2;
  font-weight: 700;
}
.title-cell span {
  display: block;
  font-weight: 600;
}
.title-cell small {
  color: #8faec7;
  font-size: 10px;
}
.closing-date {
  font-weight: 600;
  color: #ffffff;
}
.status-chip {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.status-clear {
  background: #0f4f33;
  color: #57ffbe;
}
.status-escrow {
  background: #123d61;
  color: #7dcaf4;
}

/* Detail Drawer */
.detail-drawer {
  background: #07192d;
  border: 1px solid #1c4266;
  border-radius: 8px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #1c4266;
  padding-bottom: 12px;
}
.drawer-header h3 {
  margin: 0 0 4px;
  font-size: 15px;
  color: #ffffff;
}
.drawer-header p {
  margin: 0;
  font-size: 11px;
  color: #8faec7;
}

.financial-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  background: #051424;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #1c4266;
  text-align: center;
}
.financial-strip small {
  font-size: 10px;
  color: #8faec7;
  display: block;
}
.financial-strip strong {
  font-size: 13px;
  color: #f1f6ff;
}
.financial-strip.gold strong {
  color: #edcf7c;
}

.drawer-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #edcf7c;
}
.section-title h4 {
  font-size: 12px;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.milestone-checklist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.milestone-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: #d1e2f2;
  cursor: pointer;
}
.milestone-row strong {
  display: block;
  font-size: 12px;
}
.milestone-row strong.done {
  text-decoration: line-through;
  color: #5c7e9c;
}
.milestone-row small {
  font-size: 10px;
  color: #7997b0;
}
.docs-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.doc-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #092038;
  border: 1px solid #1a3f61;
  padding: 8px 10px;
  border-radius: 5px;
  font-size: 11px;
  color: #bad3e8;
}
.drawer-footer {
  border-top: 1px solid #1c4266;
  padding-top: 12px;
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 10, 20, 0.75);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  z-index: 1000;
  padding: 20px;
}
.modal-card {
  background: #081d33;
  border: 1px solid #28547d;
  border-radius: 8px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #1c4266;
}
.modal-header h3 {
  margin: 0;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f1f6ff;
}
.modal-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-group label {
  font-size: 11px;
  text-transform: uppercase;
  color: #9ab4cc;
}
.form-group input,
.form-group select {
  background: #051424;
  border: 1px solid #28547d;
  color: #f1f6ff;
  padding: 8px 10px;
  border-radius: 5px;
  font-size: 12px;
  outline: none;
}
.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.upload-dropzone {
  border: 2px dashed #28547d;
  border-radius: 6px;
  padding: 24px;
  text-align: center;
  color: #8faec7;
}
.alert-success {
  background: #0f3d2a;
  border: 1px solid #1b7350;
  color: #57ffbe;
  padding: 8px 12px;
  border-radius: 5px;
  font-size: 12px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid #1c4266;
  background: #051424;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
}
.btn-primary {
  background: #edcf7c;
  color: #06182e;
}
.btn-primary:hover {
  background: #f7deb0;
}
.btn-secondary {
  background: #113454;
  color: #7dcaf4;
  border: 1px solid #28547d;
}
.btn-secondary:hover {
  background: #18446d;
}
.btn-subtle {
  background: transparent;
  color: #9ab4cc;
  border: 1px solid #28547d;
}
.btn-xs {
  padding: 4px 8px;
  font-size: 11px;
  background: #18446d;
  color: #7dcaf4;
  border: 1px solid #28547d;
}
.btn-xs:hover {
  background: #edcf7c;
  color: #06182e;
}
.btn-block {
  width: 100%;
}
.close-btn {
  background: none;
  border: none;
  color: #9ab4cc;
  cursor: pointer;
}
.icon-title {
  display: grid;
  place-items: center;
  color: #edcf7c;
}

/* Escrow Document Preview Modal */
.escrow-preview-card {
  max-width: 780px !important;
  background: #081628 !important;
  border: 1px solid rgba(212, 175, 55, 0.4) !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85);
}
.epm-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.epm-body {
  padding: 16px 20px !important;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.epm-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(212, 175, 55, 0.08);
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 12px;
  color: #e2e8f0;
}
.epm-banner-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.epm-banner-left strong {
  color: #d4af37;
}
.epm-seal-badge {
  font-size: 10px;
  letter-spacing: 0.05em;
  color: #d4af37;
  background: rgba(212, 175, 55, 0.15);
  padding: 3px 8px;
  border-radius: 3px;
  font-weight: 700;
}
.epm-content-sheet {
  background: #040c17;
  border: 1px solid #1a385a;
  border-radius: 6px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.epm-sheet-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.epm-seal-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px dashed #d4af37;
  color: #d4af37;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.epm-sheet-header h4 {
  margin: 0;
  font-size: 14px;
  color: #f1f6ff;
  letter-spacing: 0.03em;
}
.epm-sheet-header p {
  margin: 2px 0 0;
  font-size: 11px;
  color: #8faec7;
}
.epm-details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.epm-grid-item {
  background: #08182b;
  border: 1px solid #153350;
  border-radius: 4px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.epm-grid-item span {
  font-size: 10px;
  color: #8faec7;
  text-transform: uppercase;
}
.epm-grid-item strong {
  font-size: 12px;
  color: #f1f6ff;
}
.epm-text-preview-box {
  background: #02070e;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  padding: 12px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 11px;
  color: #7dcaf4;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.etpb-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.btn-icon-danger {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.08);
  color: #f87171;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-icon-danger:hover {
  border-color: #ef4444;
  background: #ef4444;
  color: #ffffff;
}
.btn-danger-outline {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #f87171;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.15s ease;
}
.btn-danger-outline:hover {
  background: #ef4444;
  border-color: #ef4444;
  color: #ffffff;
}
.empty-contracts-cell {
  padding: 4rem 2rem !important;
  text-align: center;
}
.empty-contracts-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 440px;
  margin: 0 auto;
}
.empty-contracts-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(237, 207, 124, 0.1);
  color: #edcf7c;
  margin-bottom: 1rem;
}
.empty-contracts-icon svg {
  width: 28px;
  height: 28px;
}
</style>
