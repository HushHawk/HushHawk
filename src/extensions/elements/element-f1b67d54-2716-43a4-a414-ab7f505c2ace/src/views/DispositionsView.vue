<template>
  <div class="view-container">
    <!-- Metrics Bar -->
    <div class="metrics-grid">
      <div v-for="(m, i) in metrics" :key="m.label" class="metric-card">
        <div class="metric-icon-wrap" :class="{ gold: i === 1 || i === 4, cyan: i === 0, green: i === 3 }">
          <span v-html="icons[m.icon]"></span>
        </div>
        <div class="metric-info">
          <span class="metric-label">{{ m.label }}</span>
          <strong class="metric-val">{{ m.value }}</strong>
          <span class="metric-change" :class="{ positive: m.change.includes('+') }">
            {{ m.change }} <em>vs last mo</em>
          </span>
        </div>
      </div>
    </div>

    <!-- Main Workspace Layout -->
    <div class="content-split" :class="{ 'has-drawer': selectedContract }">
      <!-- Left / Main Panel -->
      <div class="main-panel">
        <div class="panel-header">
          <div class="header-left">
            <h2>
              <span class="icon-title" v-html="icons.badgeDollar"></span>
              Contract Inventory &amp; Dispo Pipeline
            </h2>
            <span class="badge-count">{{ filteredContracts.length }} properties in dispo</span>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary" @click="openModal('blast')">
              <span v-html="icons.send"></span>
              Blast Deal to Buyers
            </button>
            <button class="btn btn-primary" @click="openModal('addContract')">
              <span v-html="icons.plus"></span>
              Add Contract
            </button>
          </div>
        </div>

        <!-- Filter & Search Controls -->
        <div class="filter-toolbar">
          <div class="search-box">
            <span v-html="icons.search"></span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search address, ZIP, buyer, or title company..."
              aria-label="Search contracts"
            />
            <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" aria-label="Clear search">
              <span v-html="icons.close"></span>
            </button>
          </div>

          <div class="filter-group">
            <label>Status:</label>
            <select v-model="statusFilter" aria-label="Filter by status">
              <option value="">All Statuses</option>
              <option value="Under Contract">Under Contract</option>
              <option value="Marketing">Marketing to Buyers</option>
              <option value="Packet Sent">Packet Sent</option>
              <option value="Buyer Selected">Buyer Selected</option>
              <option value="In Escrow">In Escrow / Title</option>
              <option value="Closed">Closed &amp; Funded</option>
            </select>
          </div>

          <div class="filter-group">
            <label>ZIP:</label>
            <select v-model="zipFilter" aria-label="Filter by ZIP">
              <option value="">All Jacksonville ZIPs</option>
              <option v-for="z in uniqueZips" :key="z" :value="z">{{ z }}</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Sort:</label>
            <select v-model="sortBy" aria-label="Sort contracts">
              <option value="spreadDesc">Spread (High to Low)</option>
              <option value="askingAsc">Asking Price (Low to High)</option>
              <option value="daysLeft">Days to Closing</option>
              <option value="address">Address A-Z</option>
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
                <th>Property Address</th>
                <th>Contract Price</th>
                <th>Asking Price</th>
                <th>Assignment Spread</th>
                <th>Escrow / Title</th>
                <th>Inspection End</th>
                <th>Buyer Matches</th>
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
                  <div class="property-cell">
                    <strong>{{ c.address }}</strong>
                    <small>Jacksonville, FL {{ c.zip }} · {{ c.beds }}b/{{ c.baths }}ba · {{ c.sqft }} sqft</small>
                  </div>
                </td>
                <td>{{ formatCurrency(c.contractPrice) }}</td>
                <td>{{ formatCurrency(c.askingPrice) }}</td>
                <td>
                  <span class="spread-tag">{{ formatCurrency(c.askingPrice - c.contractPrice) }}</span>
                </td>
                <td>
                  <div class="title-cell">
                    <span>{{ c.titleCompany }}</span>
                    <small>EMD: {{ c.emdStatus }}</small>
                  </div>
                </td>
                <td>
                  <span class="days-pill" :class="{ urgent: c.daysLeft <= 5 }">
                    {{ c.daysLeft }} days left
                  </span>
                </td>
                <td>
                  <span class="matches-chip">
                    <span v-html="icons.users"></span>
                    {{ c.matchedBuyersCount }} VIPs
                  </span>
                </td>
                <td>
                  <span class="status-chip" :class="c.statusClass">{{ c.status }}</span>
                </td>
                <td>
                  <button class="btn btn-xs" @click.stop="openAssignModal(c)" title="Assign Contract">
                    Assign
                  </button>
                </td>
              </tr>
              <tr v-if="filteredContracts.length === 0">
                <td colspan="9" class="empty-row">
                  No contracts match the current search filters.
                  <button class="btn btn-link" @click="resetFilters">Reset Filters</button>
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
            <h3>{{ selectedContract.address }}</h3>
            <p>Jacksonville, FL {{ selectedContract.zip }} · CrownKey: {{ selectedContract.crownKey }}</p>
          </div>
          <button class="close-btn" @click="selectedContract = null" aria-label="Close details">
            <span v-html="icons.close"></span>
          </button>
        </div>

        <!-- Deal Numbers Strip -->
        <div class="drawer-stats">
          <div class="stat-box">
            <small>Contract Buy</small>
            <strong>{{ formatCurrency(selectedContract.contractPrice) }}</strong>
          </div>
          <div class="stat-box">
            <small>Target Dispo</small>
            <strong>{{ formatCurrency(selectedContract.askingPrice) }}</strong>
          </div>
          <div class="stat-box gold">
            <small>Est. Net Spread</small>
            <strong>{{ formatCurrency(selectedContract.askingPrice - selectedContract.contractPrice) }}</strong>
          </div>
        </div>

        <!-- Top Buyer Matches for this Contract -->
        <div class="drawer-section">
          <div class="section-title">
            <span v-html="icons.users"></span>
            <h4>Top Buyer Matches for {{ selectedContract.zip }}</h4>
          </div>
          <div class="buyer-match-list">
            <div v-for="b in topBuyerMatches" :key="b.id" class="buyer-match-card">
              <div class="buyer-match-info">
                <strong>{{ b.name }} ({{ b.company }})</strong>
                <small>Budget: {{ formatCurrency(b.max) }} · Buy Box: {{ b.types }}</small>
              </div>
              <div class="buyer-match-action">
                <span class="match-score">{{ b.matchScore }}% Match</span>
                <button class="btn btn-xs btn-primary" @click="assignToBuyer(b)">Select</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Escrow & Closing Milestones -->
        <div class="drawer-section">
          <div class="section-title">
            <span v-html="icons.file"></span>
            <h4>Title &amp; Escrow Checklist</h4>
          </div>
          <div class="milestones-list">
            <label v-for="(m, i) in selectedContract.milestones" :key="m.title" class="milestone-item">
              <input type="checkbox" v-model="m.done" />
              <span :class="{ done: m.done }">{{ m.title }}</span>
              <small>{{ m.detail }}</small>
            </label>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="drawer-footer">
          <button class="btn btn-primary btn-block" @click="openAssignModal(selectedContract)">
            <span v-html="icons.handshake"></span>
            Assign Contract to Buyer
          </button>
          <button class="btn btn-secondary btn-block" @click="openModal('blast')">
            <span v-html="icons.send"></span>
            Blast Packet to Buyers
          </button>
        </div>
      </aside>
    </div>

    <!-- Modals -->
    <!-- Blast Deal Modal -->
    <div v-if="modalType === 'blast'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>
            <span v-html="icons.send"></span>
            Broadcast Deal to Cash Buyers
          </h3>
          <button class="close-btn" @click="closeModal" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <p>Instantly send formatted deal packet to buyers looking in Jacksonville.</p>
          <div class="form-group">
            <label>Select Property in Inventory</label>
            <select v-model="blastPropertyId">
              <option v-for="c in contracts" :key="c.id" :value="c.id">
                {{ c.address }} ({{ c.zip }}) — Asking {{ formatCurrency(c.askingPrice) }} (Spread: {{ formatCurrency(c.askingPrice - c.contractPrice) }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Target Audience</label>
            <select v-model="blastAudience">
              <option value="matching">VIP Buyers matching this ZIP code ({{ topBuyerMatches.length }} buyers)</option>
              <option value="all">Entire Jacksonville Cash Buyer Network (142 buyers)</option>
              <option value="tier1">Tier 1 Fast-Close VIPs Only (24 buyers)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Broadcast Message Preview</label>
            <textarea
              v-model="blastMessage"
              rows="4"
              class="form-control"
            ></textarea>
          </div>
          <div v-if="blastNotice" class="alert-success">{{ blastNotice }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button class="btn btn-primary" @click="executeBlast">
            <span v-html="icons.send"></span>
            Send Broadcast
          </button>
        </div>
      </div>
    </div>

    <!-- Add Contract Modal -->
    <div v-if="modalType === 'addContract'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>
            <span v-html="icons.plus"></span>
            Add Executed Contract to Dispositions
          </h3>
          <button class="close-btn" @click="closeModal" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-grid-2">
            <div class="form-group">
              <label>Property Address</label>
              <input v-model="newContract.address" placeholder="e.g. 5124 Moncrief Rd" />
            </div>
            <div class="form-group">
              <label>ZIP Code</label>
              <input v-model="newContract.zip" placeholder="32209" maxlength="5" />
            </div>
            <div class="form-group">
              <label>Contract Purchase Price ($)</label>
              <input v-model.number="newContract.contractPrice" type="number" placeholder="95000" />
            </div>
            <div class="form-group">
              <label>Target Asking Price ($)</label>
              <input v-model.number="newContract.askingPrice" type="number" placeholder="125000" />
            </div>
            <div class="form-group">
              <label>Title &amp; Escrow Company</label>
              <input v-model="newContract.titleCompany" placeholder="First American Title Jax" />
            </div>
            <div class="form-group">
              <label>Inspection Days Remaining</label>
              <input v-model.number="newContract.daysLeft" type="number" placeholder="10" />
            </div>
          </div>
          <div class="spread-preview" v-if="newContract.askingPrice > newContract.contractPrice">
            Estimated Assignment Spread:
            <strong>{{ formatCurrency(newContract.askingPrice - newContract.contractPrice) }}</strong>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button class="btn btn-primary" @click="saveNewContract">
            Save Contract
          </button>
        </div>
      </div>
    </div>

    <!-- Assign Modal -->
    <div v-if="modalType === 'assign'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>
            <span v-html="icons.handshake"></span>
            Assign Contract: {{ activeAssignContract?.address }}
          </h3>
          <button class="close-btn" @click="closeModal" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Select Purchasing Buyer Entity</label>
            <select v-model="assignForm.buyerId">
              <option v-for="b in topBuyerMatches" :key="b.id" :value="b.id">
                {{ b.name }} — {{ b.company }} (Capacity: {{ formatCurrency(b.max) }})
              </option>
            </select>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Assignment Fee ($)</label>
              <input v-model.number="assignForm.fee" type="number" />
            </div>
            <div class="form-group">
              <label>Buyer Non-Refundable EMD ($)</label>
              <input v-model.number="assignForm.emd" type="number" />
            </div>
          </div>
          <div class="form-group">
            <label>Closing Attorney / Title File #</label>
            <input v-model="assignForm.fileNumber" placeholder="FAT-JAX-2026-8819" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button class="btn btn-primary" @click="confirmAssignment">
            Finalize Assignment Agreement
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { icons } from '../icons.js';

export default {
  name: 'DispositionsView',
  setup() {
    const metrics = [
      { label: 'Contracts in Dispo', value: '36', change: '+29%', icon: 'file' },
      { label: 'Avg. Assignment Fee', value: '$28,400', change: '+18%', icon: 'badgeDollar' },
      { label: 'Active Buyer Matches', value: '142', change: '+25%', icon: 'users' },
      { label: 'Clear to Close', value: '14', change: '+16%', icon: 'check' },
      { label: 'Total Spread Pending', value: '$642,000', change: '+34%', icon: 'crown' }
    ];

    const contracts = ref([
      {
        id: 'c1',
        address: '4531 Lenox Ave',
        zip: '32210',
        crownKey: 'DUV-091823-0000',
        beds: 3,
        baths: 2,
        sqft: 1420,
        contractPrice: 125000,
        askingPrice: 165000,
        titleCompany: 'First American Title Jax',
        emdStatus: 'Verified ($2,500)',
        daysLeft: 8,
        matchedBuyersCount: 12,
        status: 'Under Contract',
        statusClass: 'status-contract',
        milestones: [
          { title: 'Executed Purchase Agreement', detail: 'Signed by seller 3 days ago', done: true },
          { title: 'EMD Deposited with Escrow', detail: 'Escrow receipt FAT-9921', done: true },
          { title: 'Title Search & Lien Exam', detail: 'Clean title commitment issued', done: true },
          { title: 'Assignment Agreement Executed', detail: 'Buyer signature pending', done: false },
          { title: 'Clear to Close & Funded', detail: 'Scheduled for next Thursday', done: false }
        ]
      },
      {
        id: 'c2',
        address: '7810 Moncrief Rd',
        zip: '32209',
        crownKey: 'DUV-041829-0010',
        beds: 4,
        baths: 2,
        sqft: 1840,
        contractPrice: 92000,
        askingPrice: 125000,
        titleCompany: 'Florida Crown Title',
        emdStatus: 'Verified ($2,000)',
        daysLeft: 4,
        matchedBuyersCount: 16,
        status: 'Marketing',
        statusClass: 'status-marketing',
        milestones: [
          { title: 'Executed Purchase Agreement', detail: 'Signed by seller', done: true },
          { title: 'EMD Deposited with Escrow', detail: 'Florida Crown confirmation #882', done: true },
          { title: 'Title Search & Lien Exam', detail: 'Exam in progress', done: false },
          { title: 'Assignment Agreement Executed', detail: 'Open to VIP cash buyers', done: false },
          { title: 'Clear to Close & Funded', detail: 'Estimated closing in 12 days', done: false }
        ]
      },
      {
        id: 'c3',
        address: '2834 W 21st St',
        zip: '32209',
        crownKey: 'DUV-083102-0000',
        beds: 3,
        baths: 1,
        sqft: 1150,
        contractPrice: 65000,
        askingPrice: 95000,
        titleCompany: 'Landmark Title Jax',
        emdStatus: 'Verified ($1,500)',
        daysLeft: 12,
        matchedBuyersCount: 9,
        status: 'Buyer Selected',
        statusClass: 'status-buyer',
        milestones: [
          { title: 'Executed Purchase Agreement', detail: 'Signed', done: true },
          { title: 'EMD Deposited with Escrow', detail: 'Receipt on file', done: true },
          { title: 'Title Search & Lien Exam', detail: 'Clear title', done: true },
          { title: 'Assignment Agreement Executed', detail: 'Mike Williams Capital signed', done: true },
          { title: 'Clear to Close & Funded', detail: 'Closing Friday 10:00 AM', done: false }
        ]
      },
      {
        id: 'c4',
        address: '6243 Winton Dr',
        zip: '32208',
        crownKey: 'DUV-019824-0040',
        beds: 3,
        baths: 2,
        sqft: 1380,
        contractPrice: 85000,
        askingPrice: 110000,
        titleCompany: 'First American Title Jax',
        emdStatus: 'Verified ($2,000)',
        daysLeft: 15,
        matchedBuyersCount: 14,
        status: 'In Escrow',
        statusClass: 'status-escrow',
        milestones: [
          { title: 'Executed Purchase Agreement', detail: 'Signed', done: true },
          { title: 'EMD Deposited with Escrow', detail: 'Deposit confirmed', done: true },
          { title: 'Title Search & Lien Exam', detail: 'Lien search completed', done: true },
          { title: 'Assignment Agreement Executed', detail: 'Mitchell Investments assigned', done: true },
          { title: 'Clear to Close & Funded', detail: 'Wire instruction sent', done: false }
        ]
      },
      {
        id: 'c5',
        address: '3227 Cleveland Rd',
        zip: '32254',
        crownKey: 'DUV-071923-0010',
        beds: 4,
        baths: 2,
        sqft: 1650,
        contractPrice: 110000,
        askingPrice: 150000,
        titleCompany: 'Landmark Title Jax',
        emdStatus: 'Verified ($3,000)',
        daysLeft: 3,
        matchedBuyersCount: 8,
        status: 'Closed',
        statusClass: 'status-closed',
        milestones: [
          { title: 'Executed Purchase Agreement', detail: 'Executed', done: true },
          { title: 'EMD Deposited with Escrow', detail: 'Verified', done: true },
          { title: 'Title Search & Lien Exam', detail: 'Clear', done: true },
          { title: 'Assignment Agreement Executed', detail: 'Executed', done: true },
          { title: 'Clear to Close & Funded', detail: 'Funded! $40,000 fee received', done: true }
        ]
      }
    ]);

    const topBuyerMatches = [
      { id: 'b1', name: 'Mike Williams', company: 'Mike Williams Capital', max: 300000, types: 'SFR, Cash, Fast Close', matchScore: 98 },
      { id: 'b2', name: 'Sarah Mitchell', company: 'Mitchell Investments', max: 500000, types: 'SFR, Light Reno', matchScore: 94 },
      { id: 'b3', name: 'David Chen', company: 'Chen Capital Group', max: 750000, types: 'SFR, Multi, Value-Add', matchScore: 91 }
    ];

    const searchQuery = ref('');
    const statusFilter = ref('');
    const zipFilter = ref('');
    const sortBy = ref('spreadDesc');
    const selectedContract = ref(contracts.value[0]);
    const modalType = ref('');
    const blastPropertyId = ref(contracts.value[0].id);
    const blastAudience = ref('matching');
    const blastMessage = ref('OFF-MARKET WHOLESALE DEAL: 4531 Lenox Ave, Jacksonville FL 32210. 3b/2ba, 1,420 sqft. Asking $165K (ARV $285K). Light rehab. Clean title in escrow. Reply for walkthrough access & packet!');
    const blastNotice = ref('');
    const activeAssignContract = ref(null);
    const assignForm = ref({ buyerId: 'b1', fee: 35000, emd: 5000, fileNumber: 'FAT-JAX-2026-8819' });
    const newContract = ref({ address: '', zip: '32208', contractPrice: 80000, askingPrice: 110000, titleCompany: 'First American Title Jax', daysLeft: 10 });

    const uniqueZips = computed(() => [...new Set(contracts.value.map(c => c.zip))]);

    const hasActiveFilters = computed(() => searchQuery.value || statusFilter.value || zipFilter.value || sortBy.value !== 'spreadDesc');

    const filteredContracts = computed(() => {
      let list = contracts.value.filter(c => {
        const q = searchQuery.value.toLowerCase().trim();
        const matchesQuery = !q || [c.address, c.zip, c.titleCompany, c.status].join(' ').toLowerCase().includes(q);
        const matchesStatus = !statusFilter.value || c.status.toLowerCase().includes(statusFilter.value.toLowerCase());
        const matchesZip = !zipFilter.value || c.zip === zipFilter.value;
        return matchesQuery && matchesStatus && matchesZip;
      });

      if (sortBy.value === 'spreadDesc') {
        list.sort((a, b) => (b.askingPrice - b.contractPrice) - (a.askingPrice - a.contractPrice));
      } else if (sortBy.value === 'askingAsc') {
        list.sort((a, b) => a.askingPrice - b.askingPrice);
      } else if (sortBy.value === 'daysLeft') {
        list.sort((a, b) => a.daysLeft - b.daysLeft);
      } else if (sortBy.value === 'address') {
        list.sort((a, b) => a.address.localeCompare(b.address));
      }
      return list;
    });

    function selectContract(c) {
      selectedContract.value = c;
    }

    function resetFilters() {
      searchQuery.value = '';
      statusFilter.value = '';
      zipFilter.value = '';
      sortBy.value = 'spreadDesc';
    }

    function openModal(type) {
      modalType.value = type;
      blastNotice.value = '';
    }

    function closeModal() {
      modalType.value = '';
    }

    function executeBlast() {
      blastNotice.value = 'Deal broadcast successfully dispatched to 142 VIP cash buyers via Email & SMS!';
      if (typeof window.showHushHawkToast === 'function') {
        window.showHushHawkToast('Deal Broadcast Sent', 'Blast sent to 142 VIP cash buyers matching Duval buy boxes.', 'success');
      }
      setTimeout(() => {
        closeModal();
      }, 1500);
    }

    function openAssignModal(contract) {
      activeAssignContract.value = contract;
      assignForm.value.fee = contract.askingPrice - contract.contractPrice;
      modalType.value = 'assign';
    }

    function confirmAssignment() {
      if (activeAssignContract.value) {
        activeAssignContract.value.status = 'Buyer Selected';
        activeAssignContract.value.statusClass = 'status-buyer';
        if (typeof window.showHushHawkToast === 'function') {
          window.showHushHawkToast('Contract Assigned', `Assigned ${activeAssignContract.value.address} to ${assignForm.value.buyer}. Fee: $${Number(assignForm.value.fee || 0).toLocaleString()}.`, 'success');
        }
      }
      closeModal();
    }

    function assignToBuyer(buyer) {
      if (selectedContract.value) {
        selectedContract.value.status = 'Buyer Selected';
        selectedContract.value.statusClass = 'status-buyer';
        if (typeof window.showHushHawkToast === 'function') {
          window.showHushHawkToast('Buyer Matched', `${buyer.name} selected as primary assignee for ${selectedContract.value.address}.`, 'success');
        }
      }
    }

    function saveNewContract() {
      if (!newContract.value.address) return;
      const addr = newContract.value.address;
      contracts.value.unshift({
        id: 'c-' + Date.now(),
        address: newContract.value.address,
        zip: newContract.value.zip || '32208',
        crownKey: 'DUV-' + Math.floor(100000 + Math.random() * 900000) + '-0000',
        beds: 3,
        baths: 2,
        sqft: 1350,
        contractPrice: Number(newContract.value.contractPrice),
        askingPrice: Number(newContract.value.askingPrice),
        titleCompany: newContract.value.titleCompany || 'First American Title Jax',
        emdStatus: 'Verified ($2,000)',
        daysLeft: Number(newContract.value.daysLeft) || 10,
        matchedBuyersCount: 11,
        status: 'Under Contract',
        statusClass: 'status-contract',
        milestones: [
          { title: 'Executed Purchase Agreement', detail: 'Signed', done: true },
          { title: 'EMD Deposited with Escrow', detail: 'Receipt on file', done: true },
          { title: 'Title Search & Lien Exam', detail: 'Opened', done: false },
          { title: 'Assignment Agreement Executed', detail: 'Pending', done: false },
          { title: 'Clear to Close & Funded', detail: 'Pending', done: false }
        ]
      });
      selectedContract.value = contracts.value[0];
      closeModal();
      if (typeof window.showHushHawkToast === 'function') {
        window.showHushHawkToast('Contract Added', `${addr} placed into active dispo inventory.`, 'success');
      }
    }

    function formatCurrency(val) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
    }

    return {
      icons,
      metrics,
      contracts,
      topBuyerMatches,
      searchQuery,
      statusFilter,
      zipFilter,
      sortBy,
      uniqueZips,
      hasActiveFilters,
      filteredContracts,
      selectedContract,
      modalType,
      blastPropertyId,
      blastAudience,
      blastMessage,
      blastNotice,
      activeAssignContract,
      assignForm,
      newContract,
      selectContract,
      resetFilters,
      openModal,
      closeModal,
      executeBlast,
      openAssignModal,
      confirmAssignment,
      assignToBuyer,
      saveNewContract,
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
.header-actions {
  display: flex;
  gap: 10px;
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
.property-cell strong {
  display: block;
  font-size: 13px;
  color: #ffffff;
}
.property-cell small {
  color: #8faec7;
  font-size: 11px;
}
.spread-tag {
  color: #35e6a2;
  font-weight: 700;
  font-size: 13px;
}
.title-cell span {
  display: block;
  font-weight: 600;
}
.title-cell small {
  color: #8faec7;
  font-size: 10px;
}
.days-pill {
  padding: 2px 7px;
  border-radius: 4px;
  background: #113454;
  font-size: 11px;
  color: #7dcaf4;
}
.days-pill.urgent {
  background: #4a1c1d;
  color: #ff8585;
  border: 1px solid #8f2b2d;
}
.matches-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  background: #1c3628;
  color: #35e6a2;
  border-radius: 12px;
  font-size: 11px;
}
.status-chip {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.status-contract {
  background: #123d61;
  color: #5cc5fe;
}
.status-marketing {
  background: #3b2c14;
  color: #f3d78f;
}
.status-buyer {
  background: #234226;
  color: #35e6a2;
}
.status-escrow {
  background: #2b1f47;
  color: #c9a7ff;
}
.status-closed {
  background: #0f4f33;
  color: #57ffbe;
}
.empty-row {
  text-align: center;
  padding: 24px;
  color: #8faec7;
}

.detail-drawer {
  background: #07192d;
  border: 1px solid #1c4266;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #1c4266;
  padding-bottom: 12px;
  min-width: 0;
}
.drawer-header h3 {
  margin: 0 0 4px;
  font-size: 15px;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.drawer-header p {
  margin: 0;
  font-size: 11px;
  color: #8faec7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.drawer-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  background: #051424;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #1c4266;
  text-align: center;
  min-width: 0;
}
.stat-box {
  min-width: 0;
  overflow: hidden;
}
.stat-box small {
  font-size: 10px;
  color: #8faec7;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat-box strong {
  font-size: 13px;
  color: #f1f6ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.stat-box.gold strong {
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
.buyer-match-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.buyer-match-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #092038;
  border: 1px solid #1a3f61;
  padding: 8px 10px;
  border-radius: 6px;
}
.buyer-match-info strong {
  font-size: 12px;
  color: #ffffff;
  display: block;
}
.buyer-match-info small {
  font-size: 10px;
  color: #8faec7;
}
.buyer-match-action {
  display: flex;
  align-items: center;
  gap: 8px;
}
.match-score {
  font-size: 11px;
  font-weight: 700;
  color: #35e6a2;
}

.milestones-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.milestone-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: #d1e2f2;
  cursor: pointer;
}
.milestone-item span.done {
  text-decoration: line-through;
  color: #64829e;
}
.milestone-item small {
  display: block;
  font-size: 10px;
  color: #7997b0;
}
.drawer-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  max-width: 540px;
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
.form-group select,
.form-group textarea {
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
.spread-preview {
  background: #0f354f;
  border: 1px solid #205c87;
  padding: 10px;
  border-radius: 5px;
  color: #7dcaf4;
  font-size: 12px;
}
.spread-preview strong {
  color: #35e6a2;
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

/* Button Utilities */
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
.btn-link {
  background: none;
  border: none;
  color: #edcf7c;
  text-decoration: underline;
  cursor: pointer;
  padding: 0 4px;
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
