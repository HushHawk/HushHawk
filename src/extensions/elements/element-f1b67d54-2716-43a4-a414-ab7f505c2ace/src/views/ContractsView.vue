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
                    <small>Jacksonville, FL {{ c.zip }}</small>
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
              <button class="btn btn-xs" @click="downloadDoc(d.name)">View</button>
            </div>
          </div>
        </div>

        <div class="drawer-footer">
          <button class="btn btn-primary btn-block" @click="openModal('upload')">
            <span v-html="icons.download"></span>
            Upload Title Commitment
          </button>
        </div>
      </aside>
    </div>

    <!-- Modals -->
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
          <div class="upload-dropzone">
            <span v-html="icons.file"></span>
            <p>Upload PDF document</p>
          </div>
          <div v-if="uploadNotice" class="alert-success">{{ uploadNotice }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button class="btn btn-primary" @click="confirmUpload">
            Save to Escrow File
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { icons } from '../icons.js';

export default {
  name: 'ContractsView',
  setup() {
    const metrics = [
      { label: 'Executed Purchase PSA', value: '28', change: '+27%', icon: 'file' },
      { label: 'Assigned to Buyers', value: '18', change: '+22%', icon: 'handshake' },
      { label: 'In Title / Escrow', value: '14', change: '+18%', icon: 'shield' },
      { label: 'EMD Verified', value: '16', change: '+14%', icon: 'check' },
      { label: 'Clear to Close', value: '10', change: '+42%', icon: 'crown' }
    ];

    
    const API_BASE = '/api/v1';

    async function loadContracts() {
      try {
        const res = await fetch(API_BASE + '/contracts');
        const data = await res.json();
        if (data.contracts && data.contracts.length > 0) {
          contracts.value = data.contracts;
          if (!selectedContract.value) selectedContract.value = data.contracts[0];
        }
      } catch (err) {
        console.warn('[Contracts] Using local cache:', err.message);
      }
    }

    onMounted(() => {
      loadContracts();
    });

    const contracts = ref([
      {
        id: 'c1',
        code: 'PSA-2026-084',
        address: '4531 Lenox Ave',
        zip: '32210',
        type: 'PSA',
        seller: 'Thomas Richards',
        buyer: 'Mike Williams Capital LLC',
        buyPrice: 125000,
        fee: 40000,
        titleAgency: 'First American Title Jax',
        fileNumber: 'FAT-2026-9921',
        closingDate: '2026-05-08',
        status: 'Clear to Close',
        statusClass: 'status-clear',
        milestones: [
          { name: 'Purchase & Sale Executed', detail: 'Executed on Apr 18', completed: true },
          { name: 'Seller EMD Verified', detail: '$2,500 deposited in escrow', completed: true },
          { name: 'Title Commitment & Municipal Lien Search', detail: 'Issued clean schedule B', completed: true },
          { name: 'Assignment of Contract Executed', detail: 'Signed with $40K fee locked', completed: true },
          { name: 'Buyer EMD ($5,000) Received', detail: 'Held in escrow', completed: true },
          { name: 'Final Settlement Statement Approved', detail: 'ALTA signed by parties', completed: true }
        ],
        docs: [
          { name: 'Executed_PSA_4531Lenox.pdf' },
          { name: 'Title_Commitment_FAT.pdf' },
          { name: 'Assignment_Agreement_Signed.pdf' }
        ]
      },
      {
        id: 'c2',
        code: 'PSA-2026-085',
        address: '7810 Moncrief Rd',
        zip: '32209',
        type: 'PSA',
        seller: 'Estate of Dorothy Jenkins',
        buyer: '',
        buyPrice: 92000,
        fee: 33000,
        titleAgency: 'Florida Crown Title',
        fileNumber: 'FCT-8812',
        closingDate: '2026-05-14',
        status: 'In Escrow',
        statusClass: 'status-escrow',
        milestones: [
          { name: 'Purchase & Sale Executed', detail: 'Executed on Apr 21', completed: true },
          { name: 'Seller EMD Verified', detail: '$2,000 deposited', completed: true },
          { name: 'Title Commitment & Municipal Lien Search', detail: 'Title exam in progress', completed: false },
          { name: 'Assignment of Contract Executed', detail: 'In dispo to buyers', completed: false },
          { name: 'Buyer EMD Received', detail: 'Pending assignment', completed: false }
        ],
        docs: [
          { name: 'Executed_PSA_7810Moncrief.pdf' },
          { name: 'Probate_Letters_Administration.pdf' }
        ]
      },
      {
        id: 'c3',
        code: 'ASN-2026-039',
        address: '2834 W 21st St',
        zip: '32209',
        type: 'Assignment',
        seller: 'Robert L. Henderson',
        buyer: 'Mitchell Investments LLC',
        buyPrice: 65000,
        fee: 30000,
        titleAgency: 'Landmark Title Jax',
        fileNumber: 'LT-2026-4412',
        closingDate: '2026-05-02',
        status: 'Clear to Close',
        statusClass: 'status-clear',
        milestones: [
          { name: 'Purchase & Sale Executed', detail: 'Signed', completed: true },
          { name: 'Seller EMD Verified', detail: 'Held in escrow', completed: true },
          { name: 'Title Commitment Clear', detail: 'Clean title', completed: true },
          { name: 'Assignment Signed', detail: 'Mitchell Inv verified', completed: true },
          { name: 'Buyer EMD ($5,000) Deposited', detail: 'Confirmed', completed: true },
          { name: 'Clear to Close', detail: 'Funding scheduled', completed: true }
        ],
        docs: [
          { name: 'PSA_2834W21st.pdf' },
          { name: 'Assignment_MitchellInvestments.pdf' },
          { name: 'Wire_Instructions_Landmark.pdf' }
        ]
      },
      {
        id: 'c4',
        code: 'PSA-2026-086',
        address: '6243 Winton Dr',
        zip: '32208',
        type: 'PSA',
        seller: 'Marcus Washington',
        buyer: 'Chen Capital Group',
        buyPrice: 85000,
        fee: 25000,
        titleAgency: 'First American Title Jax',
        fileNumber: 'FAT-2026-9988',
        closingDate: '2026-05-20',
        status: 'In Escrow',
        statusClass: 'status-escrow',
        milestones: [
          { name: 'Purchase & Sale Executed', detail: 'Signed Apr 24', completed: true },
          { name: 'Seller EMD Verified', detail: 'Deposited', completed: true },
          { name: 'Title Commitment & Municipal Lien Search', detail: 'In progress', completed: false },
          { name: 'Assignment of Contract Executed', detail: 'Drafted', completed: true }
        ],
        docs: [
          { name: 'Executed_PSA_6243Winton.pdf' }
        ]
      }
    ]);

    const searchQuery = ref('');
    const typeFilter = ref('');
    const milestoneFilter = ref('');
    const sortBy = ref('closingAsc');
    const selectedContract = ref(contracts.value[0]);
    const modalType = ref('');
    const uploadNotice = ref('');
    const newForm = ref({ type: 'PSA', address: '', seller: '', buyPrice: 90000, titleAgency: 'First American Title Jax', closingDate: '' });

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
      if (!newForm.value.address) return;
      contracts.value.unshift({
        id: 'c-' + Date.now(),
        code: `${newForm.value.type}-2026-0${Math.floor(87 + Math.random() * 20)}`,
        address: newForm.value.address,
        zip: '32208',
        type: newForm.value.type,
        seller: newForm.value.seller || 'Seller of Record',
        buyer: '',
        buyPrice: Number(newForm.value.buyPrice) || 90000,
        fee: 28000,
        titleAgency: newForm.value.titleAgency || 'First American Title Jax',
        fileNumber: 'FAT-2026-' + Math.floor(1000 + Math.random() * 9000),
        closingDate: newForm.value.closingDate || '2026-05-25',
        status: 'In Escrow',
        statusClass: 'status-escrow',
        milestones: [
          { name: 'Purchase & Sale Executed', detail: 'Signed', completed: true },
          { name: 'Seller EMD Verified', detail: 'Held in escrow', completed: true },
          { name: 'Title Commitment & Municipal Lien Search', detail: 'In progress', completed: false },
          { name: 'Assignment of Contract Executed', detail: 'Pending', completed: false }
        ],
        docs: [{ name: 'Drafted_Contract.pdf' }]
      });
      selectedContract.value = contracts.value[0];
      closeModal();
    }

    function confirmUpload() {
      uploadNotice.value = 'Document verified and attached to Title file!';
      setTimeout(() => {
        closeModal();
      }, 1200);
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

    function formatCurrency(val) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
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
      formatCurrency
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
</style>
