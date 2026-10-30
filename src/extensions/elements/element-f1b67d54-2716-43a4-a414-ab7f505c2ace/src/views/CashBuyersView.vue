<template>
  <div class="view-container">
    <!-- Metrics Bar -->
    <div class="metrics-grid">
      <div v-for="(m, i) in metrics" :key="m.label" class="metric-card">
        <div class="metric-icon-wrap" :class="{ gold: i === 2 || i === 4, cyan: i === 0, green: i === 3 }">
          <span v-html="icons[m.icon]"></span>
        </div>
        <div class="metric-info">
          <span class="metric-label">{{ m.label }}</span>
          <strong class="metric-val">{{ m.value }}</strong>
          <span class="metric-change" :class="{ positive: m.change.includes('+') }">
            {{ m.change }} <em>network growth</em>
          </span>
        </div>
      </div>
    </div>

    <!-- Main Workspace Layout -->
    <div class="content-split" :class="{ 'has-drawer': selectedBuyer }">
      <div class="main-panel">
        <div class="panel-header">
          <div class="header-left">
            <h2>
              <span class="icon-title" v-html="icons.users"></span>
              VIP Cash Buyers Registry
            </h2>
            <span class="badge-count">{{ filteredBuyers.length }} buyers loaded</span>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary" @click="openModal('export')">
              <span v-html="icons.download"></span>
              Export List
            </button>
            <button class="btn btn-primary" @click="openModal('addBuyer')">
              <span v-html="icons.plus"></span>
              Add Cash Buyer
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
              placeholder="Search buyer name, company, ZIP codes, tags..."
              aria-label="Search cash buyers"
            />
            <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" aria-label="Clear search">
              <span v-html="icons.close"></span>
            </button>
          </div>

          <div class="filter-group">
            <label>Status:</label>
            <select v-model="statusFilter" aria-label="Filter by buyer status">
              <option value="">All Statuses</option>
              <option value="Active">Active Buyers</option>
              <option value="VIP">VIP Tier 1</option>
              <option value="Verified POF">Verified POF Only</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Buy Box:</label>
            <select v-model="typeFilter" aria-label="Filter by property type">
              <option value="">All Property Types</option>
              <option value="SFR">Single Family (SFR)</option>
              <option value="Multi">Multifamily</option>
              <option value="Commercial">Commercial / Land</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Sort:</label>
            <select v-model="sortBy" aria-label="Sort cash buyers">
              <option value="capacityDesc">Budget Capacity (High to Low)</option>
              <option value="responseDesc">Response Rate (High to Low)</option>
              <option value="dealsDesc">Deals Closed</option>
              <option value="nameAsc">Name A-Z</option>
            </select>
          </div>

          <button v-if="hasActiveFilters" class="btn btn-subtle" @click="resetFilters">
            <span v-html="icons.refresh"></span>
            Reset
          </button>
        </div>

        <!-- Buyers Table -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Buyer Name / Company</th>
                <th>Target ZIP Codes</th>
                <th>Price Range</th>
                <th>Property Types</th>
                <th>POF Status</th>
                <th>Response</th>
                <th>Deals Closed</th>
                <th>Tier</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="b in filteredBuyers"
                :key="b.id"
                :class="{ active: selectedBuyer?.id === b.id }"
                @click="selectBuyer(b)"
              >
                <td>
                  <div class="buyer-cell">
                    <strong>{{ b.name }}</strong>
                    <small>{{ b.company }} · {{ b.phone }}</small>
                  </div>
                </td>
                <td>
                  <div class="zip-tags">
                    <span v-for="z in b.zips.slice(0, 3)" :key="z" class="zip-chip">{{ z }}</span>
                    <span v-if="b.zips.length > 3" class="zip-chip extra">+{{ b.zips.length - 3 }}</span>
                  </div>
                </td>
                <td>
                  <span class="budget-tag">{{ formatCurrency(b.min) }} – {{ formatCurrency(b.max) }}</span>
                </td>
                <td>{{ b.types }}</td>
                <td>
                  <span class="pof-chip" :class="{ verified: b.pofVerified }">
                    <span v-html="b.pofVerified ? icons.check : icons.clock"></span>
                    {{ b.pofVerified ? 'Verified' : 'Pending' }}
                  </span>
                </td>
                <td>
                  <span class="response-rate" :class="{ high: b.response >= 80 }">
                    {{ b.response }}%
                  </span>
                </td>
                <td>
                  <strong>{{ b.dealsClosed }}</strong> deals
                </td>
                <td>
                  <span class="tier-badge" :class="b.tierClass">{{ b.tier }}</span>
                </td>
                <td>
                  <button class="btn btn-xs" @click.stop="openSendDealModal(b)">
                    Send Deal
                  </button>
                </td>
              </tr>
              <tr v-if="filteredBuyers.length === 0">
                <td colspan="9" class="empty-row">
                  No cash buyers match the current filters.
                  <button class="btn btn-link" @click="resetFilters">Reset Filters</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detail Drawer -->
      <aside v-if="selectedBuyer" class="detail-drawer">
        <div class="drawer-header">
          <div class="buyer-profile-top">
            <div class="avatar">{{ getInitials(selectedBuyer.name) }}</div>
            <div>
              <h3>{{ selectedBuyer.name }}</h3>
              <p>{{ selectedBuyer.company }} · <span class="tier-tag">{{ selectedBuyer.tier }}</span></p>
            </div>
          </div>
          <button class="close-btn" @click="selectedBuyer = null" aria-label="Close details">
            <span v-html="icons.close"></span>
          </button>
        </div>

        <!-- Contact Strip -->
        <div class="contact-details-box">
          <div><span v-html="icons.phone"></span> {{ selectedBuyer.phone }}</div>
          <div><span v-html="icons.mail"></span> {{ selectedBuyer.email }}</div>
          <div><span v-html="icons.pin"></span> Focus: {{ selectedBuyer.location }}</div>
        </div>

        <!-- Buy Box Matrix -->
        <div class="drawer-section">
          <div class="section-title">
            <span v-html="icons.badgeDollar"></span>
            <h4>Buy Box Criteria</h4>
          </div>
          <div class="buybox-grid">
            <div class="buybox-item">
              <small>Price Range</small>
              <strong>{{ formatCurrency(selectedBuyer.min) }} – {{ formatCurrency(selectedBuyer.max) }}</strong>
            </div>
            <div class="buybox-item">
              <small>Preferred ZIPs</small>
              <strong>{{ selectedBuyer.zips.join(', ') }}</strong>
            </div>
            <div class="buybox-item">
              <small>Condition</small>
              <strong>As-Is, Light to Heavy Rehab</strong>
            </div>
            <div class="buybox-item">
              <small>Closing Speed</small>
              <strong>7–14 Days Cash</strong>
            </div>
          </div>
        </div>

        <!-- Matched Active Inventory -->
        <div class="drawer-section">
          <div class="section-title">
            <span v-html="icons.house"></span>
            <h4>Matched Inventory for this Buyer</h4>
          </div>
          <div class="matched-inventory-list">
            <div v-for="item in matchedDeals" :key="item.address" class="inventory-card">
              <div>
                <strong>{{ item.address }}</strong>
                <small>{{ item.zip }} · Asking: {{ formatCurrency(item.price) }} · ARV: {{ formatCurrency(item.arv) }}</small>
              </div>
              <button class="btn btn-xs btn-primary" @click="sendSelectedDeal(item)">
                Send Packet
              </button>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="drawer-section">
          <div class="section-title">
            <span v-html="icons.file"></span>
            <h4>Buyer Dossier &amp; Notes</h4>
          </div>
          <p class="buyer-notes-text">{{ selectedBuyer.notes }}</p>
        </div>

        <div class="drawer-footer">
          <button class="btn btn-primary btn-block" @click="openSendDealModal(selectedBuyer)">
            <span v-html="icons.send"></span>
            Send Deal to {{ selectedBuyer.name.split(' ')[0] }}
          </button>
        </div>
      </aside>
    </div>

    <!-- Modals -->
    <!-- Add Buyer Modal -->
    <div v-if="modalType === 'addBuyer'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>
            <span v-html="icons.plus"></span>
            Add New Cash Buyer to Registry
          </h3>
          <button class="close-btn" @click="closeModal" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-grid-2">
            <div class="form-group">
              <label>Full Name</label>
              <input v-model="newBuyer.name" placeholder="e.g. Jason Brooks" />
            </div>
            <div class="form-group">
              <label>Company / LLC</label>
              <input v-model="newBuyer.company" placeholder="Brooks Asset Management LLC" />
            </div>
            <div class="form-group">
              <label>Phone Number</label>
              <input v-model="newBuyer.phone" placeholder="(904) 555-4921" />
            </div>
            <div class="form-group">
              <label>Email Address</label>
              <input v-model="newBuyer.email" placeholder="jason@brooksassets.com" />
            </div>
            <div class="form-group">
              <label>Min Budget ($)</label>
              <input v-model.number="newBuyer.min" type="number" placeholder="50000" />
            </div>
            <div class="form-group">
              <label>Max Budget ($)</label>
              <input v-model.number="newBuyer.max" type="number" placeholder="400000" />
            </div>
          </div>
          <div class="form-group">
            <label>Target Jacksonville ZIP Codes (comma-separated)</label>
            <input v-model="newBuyer.zips" placeholder="32208, 32209, 32210, 32254" />
          </div>
          <div class="form-group">
            <label>Property Types &amp; Buy Box Notes</label>
            <textarea v-model="newBuyer.notes" rows="3" placeholder="Single Family, Duplex, Turnkey or light rehab. Can close with hard money or cash within 10 days."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button class="btn btn-primary" @click="saveNewBuyer">
            Save Buyer Profile
          </button>
        </div>
      </div>
    </div>

    <!-- Send Deal Modal -->
    <div v-if="modalType === 'sendDeal'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>
            <span v-html="icons.send"></span>
            Send Deal to {{ targetBuyer?.name }}
          </h3>
          <button class="close-btn" @click="closeModal" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Select Property Deal</label>
            <select v-model="sendDealId">
              <option v-for="d in propertyInventory" :key="d.address" :value="d.address">
                {{ d.address }} ({{ d.zip }}) — Asking {{ formatCurrency(d.price) }} · ARV: {{ formatCurrency(d.arv) }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Delivery Method</label>
            <div class="radio-row">
              <label><input type="radio" value="sms" v-model="deliveryChannel" /> Direct SMS</label>
              <label><input type="radio" value="email" v-model="deliveryChannel" /> Email Packet</label>
            </div>
          </div>
          <div class="form-group">
            <label>Personalized Message</label>
            <textarea v-model="sendDealMessage" rows="4"></textarea>
          </div>
          <div v-if="sendNotice" class="alert-success">{{ sendNotice }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button class="btn btn-primary" @click="confirmSendDeal">
            <span v-html="icons.send"></span>
            Send to Buyer
          </button>
        </div>
      </div>
    </div>

    <!-- Export Modal -->
    <div v-if="modalType === 'export'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>
            <span v-html="icons.download"></span>
            Export Cash Buyers List
          </h3>
          <button class="close-btn" @click="closeModal" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <p>Export {{ filteredBuyers.length }} cash buyer records formatted for Mailchimp, Podio, or Google Sheets.</p>
          <div class="export-summary">
            <div><strong>{{ filteredBuyers.length }}</strong> Total Records</div>
            <div><strong>{{ filteredBuyers.filter(b => b.pofVerified).length }}</strong> Verified POF</div>
            <div><strong>$18.4M+</strong> Combined Capacity</div>
          </div>
          <div v-if="exportNotice" class="alert-success">{{ exportNotice }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button class="btn btn-primary" @click="downloadCsv">
            <span v-html="icons.download"></span>
            Download CSV
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
  name: 'CashBuyersView',
  setup() {
    const metrics = [
      { label: 'Total Cash Buyers', value: '142', change: '+12%', icon: 'users' },
      { label: 'Active VIP Buyers', value: '98', change: '+8%', icon: 'phone' },
      { label: 'Tier 1 Buyers', value: '24', change: '+15%', icon: 'crown' },
      { label: 'Avg. Response Rate', value: '74%', change: '+9%', icon: 'chart' },
      { label: 'Buying Capacity', value: '$18.4M', change: '+22%', icon: 'badgeDollar' }
    ];

    
    const API_BASE = '/api/v1';

    async function loadBuyers() {
      try {
        const res = await fetch(API_BASE + '/buyers');
        const data = await res.json();
        if (data.buyers && data.buyers.length > 0) {
          buyers.value = data.buyers;
          if (!selectedBuyer.value) selectedBuyer.value = data.buyers[0];
        }
      } catch (err) {
        console.warn('[CashBuyers] Using local cache:', err.message);
      }
    }

    onMounted(() => {
      loadBuyers();
    });

    const buyers = ref([
      {
        id: 'b1',
        name: 'Mike Williams',
        company: 'Mike Williams Capital',
        phone: '(904) 555-2187',
        email: 'mike@mwcapitaljax.com',
        location: 'Jacksonville, FL',
        zips: ['32204', '32210', '32218', '32209', '32254'],
        min: 50000,
        max: 350000,
        types: 'SFR, Duplex, Cash',
        pofVerified: true,
        response: 92,
        dealsClosed: 8,
        tier: 'VIP Tier 1',
        tierClass: 'tier-gold',
        notes: 'Top tier cash buyer in Westside and Northside Jacksonville. Closes in 7-10 days with clean title. Has $500K cash escrow ready.'
      },
      {
        id: 'b2',
        name: 'Sarah Mitchell',
        company: 'Mitchell Investments',
        phone: '(904) 555-2288',
        email: 'sarah@mitchellinv.com',
        location: 'Jacksonville, FL',
        zips: ['32073', '32225', '32226', '32211'],
        min: 75000,
        max: 500000,
        types: 'SFR, Multifamily',
        pofVerified: true,
        response: 84,
        dealsClosed: 5,
        tier: 'VIP Tier 1',
        tierClass: 'tier-gold',
        notes: 'Loves turnkey or light cosmetic rehab in Arlington and East Jax. Never asks for inspection concessions if repair numbers match.'
      },
      {
        id: 'b3',
        name: 'David Chen',
        company: 'Chen Capital Group',
        phone: '(904) 555-2389',
        email: 'david@chencapital.net',
        location: 'Jacksonville, FL',
        zips: ['32207', '32256', '32257'],
        min: 100000,
        max: 750000,
        types: 'SFR, Multi, Value-Add',
        pofVerified: true,
        response: 88,
        dealsClosed: 6,
        tier: 'VIP Tier 1',
        tierClass: 'tier-gold',
        notes: 'Focus on Southside and San Marco. Prefers off-market properties with heavy equity spread.'
      },
      {
        id: 'b4',
        name: 'Tasha Brown',
        company: 'Brown Family Homes LLC',
        phone: '(904) 555-2490',
        email: 'tasha@brownfamilyhomes.com',
        location: 'Jacksonville, FL',
        zips: ['32208', '32209', '32254'],
        min: 40000,
        max: 250000,
        types: 'SFR, As-Is',
        pofVerified: true,
        response: 76,
        dealsClosed: 3,
        tier: 'Active VIP',
        tierClass: 'tier-blue',
        notes: 'Buy and hold landlord specializing in Northside rentals. Fast decision maker once photos are provided.'
      },
      {
        id: 'b5',
        name: 'Marcus Hill',
        company: 'Hill Property Solutions',
        phone: '(904) 555-2591',
        email: 'marcus@hillprops.com',
        location: 'Jacksonville, FL',
        zips: ['32216', '32211', '32246'],
        min: 60000,
        max: 420000,
        types: 'SFR, Duplex, Fix & Flip',
        pofVerified: false,
        response: 68,
        dealsClosed: 2,
        tier: 'Active VIP',
        tierClass: 'tier-blue',
        notes: 'General contractor and flipper looking for distressed single families in 32211 and 32216.'
      },
      {
        id: 'b6',
        name: 'Kevin Patel',
        company: 'Patel Holdings LLC',
        phone: '(904) 555-2692',
        email: 'kevin@patelholdings.com',
        location: 'St. Johns / Duval',
        zips: ['32068', '32081', '32259'],
        min: 150000,
        max: 1200000,
        types: 'Multifamily, New Build',
        pofVerified: true,
        response: 82,
        dealsClosed: 4,
        tier: 'VIP Tier 1',
        tierClass: 'tier-gold',
        notes: 'High net worth investor with proof of funds on file for $1.5M. Looking for 4-plexes or land assemblies.'
      }
    ]);

    const propertyInventory = [
      { address: '4531 Lenox Ave', zip: '32210', price: 165000, arv: 285000 },
      { address: '7810 Moncrief Rd', zip: '32209', price: 125000, arv: 220000 },
      { address: '6243 Winton Dr', zip: '32208', price: 110000, arv: 195000 }
    ];

    const searchQuery = ref('');
    const statusFilter = ref('');
    const typeFilter = ref('');
    const sortBy = ref('capacityDesc');
    const selectedBuyer = ref(buyers.value[0]);
    const modalType = ref('');
    const targetBuyer = ref(null);
    const sendDealId = ref(propertyInventory[0].address);
    const deliveryChannel = ref('sms');
    const sendDealMessage = ref('Hi Mike, got an off-market property in 32210 (4531 Lenox Ave). Asking $165K with $285K ARV. Can close in 10 days. Let me know if you want the photos & lockbox access!');
    const sendNotice = ref('');
    const exportNotice = ref('');
    const newBuyer = ref({ name: '', company: '', phone: '', email: '', min: 50000, max: 350000, zips: '32208, 32209', notes: '' });

    const hasActiveFilters = computed(() => searchQuery.value || statusFilter.value || typeFilter.value || sortBy.value !== 'capacityDesc');

    const filteredBuyers = computed(() => {
      let list = buyers.value.filter(b => {
        const q = searchQuery.value.toLowerCase().trim();
        const matchesQuery = !q || [b.name, b.company, b.phone, ...b.zips, b.types].join(' ').toLowerCase().includes(q);
        let matchesStatus = true;
        if (statusFilter.value === 'Active') matchesStatus = true;
        else if (statusFilter.value === 'VIP') matchesStatus = b.tier.includes('VIP Tier 1');
        else if (statusFilter.value === 'Verified POF') matchesStatus = b.pofVerified;
        else if (statusFilter.value === 'Inactive') matchesStatus = false;

        const matchesType = !typeFilter.value || b.types.includes(typeFilter.value);
        return matchesQuery && matchesStatus && matchesType;
      });

      if (sortBy.value === 'capacityDesc') {
        list.sort((a, b) => b.max - a.max);
      } else if (sortBy.value === 'responseDesc') {
        list.sort((a, b) => b.response - a.response);
      } else if (sortBy.value === 'dealsDesc') {
        list.sort((a, b) => b.dealsClosed - a.dealsClosed);
      } else if (sortBy.value === 'nameAsc') {
        list.sort((a, b) => a.name.localeCompare(b.name));
      }
      return list;
    });

    const matchedDeals = computed(() => {
      if (!selectedBuyer.value) return propertyInventory;
      return propertyInventory.filter(d => selectedBuyer.value.zips.includes(d.zip) || d.price <= selectedBuyer.value.max);
    });

    function selectBuyer(b) {
      selectedBuyer.value = b;
    }

    function resetFilters() {
      searchQuery.value = '';
      statusFilter.value = '';
      typeFilter.value = '';
      sortBy.value = 'capacityDesc';
    }

    function openModal(type) {
      modalType.value = type;
      sendNotice.value = '';
      exportNotice.value = '';
    }

    function closeModal() {
      modalType.value = '';
    }

    function openSendDealModal(b) {
      targetBuyer.value = b;
      sendDealMessage.value = `Hi ${b.name.split(' ')[0]}, sharing off-market inventory in Jacksonville matching your buy box. Clean title, quick close. Review details inside.`;
      modalType.value = 'sendDeal';
    }

    function confirmSendDeal() {
      sendNotice.value = `Deal packet successfully delivered to ${targetBuyer.value?.name} via ${deliveryChannel.value.toUpperCase()}!`;
      if (typeof window.showHushHawkToast === 'function') {
        window.showHushHawkToast('Deal Packet Delivered', `Matched deal packet sent to ${targetBuyer.value?.name} (${deliveryChannel.value.toUpperCase()}).`, 'success');
      }
      setTimeout(() => {
        closeModal();
      }, 1500);
    }

    function sendSelectedDeal(deal) {
      sendDealId.value = deal.address;
      openSendDealModal(selectedBuyer.value);
    }

    async function saveNewBuyer() {
      if (!newBuyer.value.name) return;
      const bName = newBuyer.value.name;
      const payload = {
        name: newBuyer.value.name,
        company: newBuyer.value.company || 'Private Investor',
        phone: newBuyer.value.phone || '(904) 555-0000',
        email: newBuyer.value.email || 'investor@example.com',
        location: 'Jacksonville, FL',
        zips: newBuyer.value.zips ? newBuyer.value.zips.split(',').map(s => s.trim()) : ['32204'],
        min: Number(newBuyer.value.min) || 50000,
        max: Number(newBuyer.value.max) || 300000,
        types: 'SFR, Cash Buyer',
        pofVerified: true,
        notes: newBuyer.value.notes || 'Added from Cash Buyers command center.'
      };

      try {
        const res = await fetch(API_BASE + '/buyers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const saved = await res.json();
          buyers.value.unshift(saved);
          selectedBuyer.value = saved;
        } else {
          buyers.value.unshift({ id: 'b-' + Date.now(), ...payload, tier: 'Active VIP', tierClass: 'tier-blue', response: 85, dealsClosed: 0 });
          selectedBuyer.value = buyers.value[0];
        }
      } catch (e) {
        buyers.value.unshift({ id: 'b-' + Date.now(), ...payload, tier: 'Active VIP', tierClass: 'tier-blue', response: 85, dealsClosed: 0 });
        selectedBuyer.value = buyers.value[0];
      }

      closeModal();
      if (typeof window.showHushHawkToast === 'function') {
        window.showHushHawkToast('Cash Buyer Added', `${bName} added to VIP Investor network.`, 'success');
      }
    }

    function downloadCsv() {
      const headers = ['ID', 'Name', 'Company', 'Phone', 'Email', 'Min Price', 'Max Price', 'Target ZIPs', 'Deals Closed', 'Tier'];
      const rows = buyers.value.map(b => [
        b.id,
        b.name,
        b.company,
        b.phone,
        b.email,
        b.min,
        b.max,
        b.zips.join('; '),
        b.dealsClosed,
        b.tier
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cash_buyers_jacksonville_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      exportNotice.value = 'Export generated: cash_buyers_jacksonville.csv downloaded successfully.';
      if (typeof window.showHushHawkToast === 'function') {
        window.showHushHawkToast('Buyer List Exported', `Downloaded CSV roster for ${buyers.value.length} cash buyers.`, 'success');
      }
      setTimeout(() => {
        closeModal();
      }, 1500);
    }

    function formatCurrency(val) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
    }

    function getInitials(name) {
      return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'CB';
    }

    return {
      icons,
      metrics,
      buyers,
      propertyInventory,
      searchQuery,
      statusFilter,
      typeFilter,
      sortBy,
      selectedBuyer,
      modalType,
      targetBuyer,
      sendDealId,
      deliveryChannel,
      sendDealMessage,
      sendNotice,
      exportNotice,
      newBuyer,
      hasActiveFilters,
      filteredBuyers,
      matchedDeals,
      selectBuyer,
      resetFilters,
      openModal,
      closeModal,
      openSendDealModal,
      confirmSendDeal,
      sendSelectedDeal,
      saveNewBuyer,
      downloadCsv,
      formatCurrency,
      getInitials
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
.buyer-cell strong {
  display: block;
  font-size: 13px;
  color: #ffffff;
}
.buyer-cell small {
  color: #8faec7;
  font-size: 11px;
}
.zip-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.zip-chip {
  padding: 2px 6px;
  border-radius: 3px;
  background: #113454;
  font-size: 11px;
  color: #7dcaf4;
}
.zip-chip.extra {
  background: #1a4266;
  color: #bed7ec;
}
.budget-tag {
  color: #edcf7c;
  font-weight: 600;
}
.pof-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 12px;
  font-size: 11px;
  background: #2a2c26;
  color: #e5c365;
}
.pof-chip.verified {
  background: #0e3d29;
  color: #35e6a2;
}
.response-rate {
  font-weight: 600;
  color: #9ab4cc;
}
.response-rate.high {
  color: #35e6a2;
}
.tier-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.tier-gold {
  background: #383116;
  color: #edcf7c;
  border: 1px solid #755f1f;
}
.tier-blue {
  background: #123d61;
  color: #7dcaf4;
  border: 1px solid #1f5f94;
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
.buyer-profile-top {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1d4ed8, #0a1128);
  border: 2px solid #edcf7c;
  display: grid;
  place-items: center;
  color: #ffffff;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}
.buyer-profile-top h3 {
  margin: 0 0 2px;
  font-size: 15px;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.buyer-profile-top p {
  margin: 0;
  font-size: 11px;
  color: #8faec7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tier-tag {
  color: #edcf7c;
  font-weight: 600;
}
.contact-details-box {
  background: #051424;
  border: 1px solid #1c4266;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #d1e2f2;
  min-width: 0;
  overflow: hidden;
}
.contact-details-box div {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #edcf7c;
  min-width: 0;
}
.section-title h4 {
  font-size: 12px;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.buybox-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
}
.buybox-item {
  background: #092038;
  border: 1px solid #1a3f61;
  padding: 8px;
  border-radius: 5px;
  min-width: 0;
  overflow: hidden;
}
.buybox-item small {
  display: block;
  font-size: 10px;
  color: #8faec7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.buybox-item strong {
  font-size: 12px;
  color: #ffffff;
  display: block;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.matched-inventory-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.inventory-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  background: #092038;
  border: 1px solid #1a3f61;
  padding: 8px 10px;
  border-radius: 6px;
  min-width: 0;
}
.inventory-card > div {
  min-width: 0;
  overflow: hidden;
}
.inventory-card strong {
  display: block;
  font-size: 12px;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inventory-card small {
  font-size: 10px;
  color: #8faec7;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.buyer-notes-text {
  font-size: 12px;
  line-height: 1.5;
  color: #bad3e8;
  background: #051424;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #1c4266;
  margin: 0;
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
.radio-row {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #d1e2f2;
}
.export-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  background: #051424;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #1c4266;
  text-align: center;
}
.export-summary strong {
  display: block;
  font-size: 16px;
  color: #edcf7c;
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
