<template>
  <div class="view-container">
    <!-- Metrics Bar -->
    <div class="metrics-grid">
      <div v-for="(m, i) in metrics" :key="m.label" class="metric-card">
        <div class="metric-icon-wrap" :class="{ gold: i === 3 || i === 4, cyan: i === 0, green: i === 1 }">
          <span v-html="icons[m.icon]"></span>
        </div>
        <div class="metric-info">
          <span class="metric-label">{{ m.label }}</span>
          <strong class="metric-val">{{ m.value }}</strong>
          <span class="metric-change" :class="{ positive: m.change.includes('+') || m.change.includes('-') }">
            {{ m.change }} <em>{{ m.note }}</em>
          </span>
        </div>
      </div>
    </div>

    <!-- Main Workspace -->
    <div class="main-panel">
      <!-- Panel Header -->
      <div class="panel-header">
        <div class="header-left">
          <h2>
            <span class="icon-title" v-html="icons.megaphone"></span>
            Multi-Channel Marketing Campaigns &amp; ROI
          </h2>
          <span class="badge-count">{{ filteredCampaigns.length }} active campaigns</span>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" @click="openModal('addCampaign')">
            <span v-html="icons.plus"></span>
            New Campaign
          </button>
        </div>
      </div>

      <!-- Channel Attribution Breakdown Cards -->
      <div class="channels-strip">
        <div v-for="ch in channelStats" :key="ch.channel" class="channel-card">
          <div class="channel-top">
            <span class="channel-name">{{ ch.channel }}</span>
            <span class="channel-roi">{{ ch.roi }} ROI</span>
          </div>
          <div class="channel-bar-bg">
            <div class="channel-bar-fill" :style="{ width: ch.percent + '%' }"></div>
          </div>
          <div class="channel-bottom">
            <span>Spend: {{ formatCurrency(ch.spend) }}</span>
            <strong>{{ ch.leads }} leads · {{ ch.deals }} deals</strong>
          </div>
        </div>
      </div>

      <!-- Filter & Search Toolbar -->
      <div class="filter-toolbar">
        <div class="search-box">
          <span v-html="icons.search"></span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search campaign name, channel, target audience..."
            aria-label="Search campaigns"
          />
          <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" aria-label="Clear search">
            <span v-html="icons.close"></span>
          </button>
        </div>

        <div class="filter-group">
          <label>Channel:</label>
          <select v-model="channelFilter" aria-label="Filter by channel">
            <option value="">All Channels</option>
            <option value="Direct Mail">Direct Mail</option>
            <option value="Cold Calling">Cold Calling</option>
            <option value="Facebook Ads">Facebook Meta Ads</option>
            <option value="Google PPC">Google PPC</option>
            <option value="Driving for Dollars">Driving for Dollars</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Status:</label>
          <select v-model="statusFilter" aria-label="Filter by campaign status">
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Paused">Paused</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Sort:</label>
          <select v-model="sortBy" aria-label="Sort campaigns">
            <option value="roiDesc">ROI (High to Low)</option>
            <option value="leadsDesc">Leads Generated</option>
            <option value="cplAsc">Lowest Cost per Lead</option>
            <option value="spendDesc">Highest Spend</option>
          </select>
        </div>

        <button v-if="hasActiveFilters" class="btn btn-subtle" @click="resetFilters">
          <span v-html="icons.refresh"></span>
          Reset
        </button>
      </div>

      <!-- Campaigns Table -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Campaign Name</th>
              <th>Channel</th>
              <th>Target Audience / List</th>
              <th>Spend</th>
              <th>Leads</th>
              <th>Cost / Lead</th>
              <th>Contracts</th>
              <th>ROI</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in filteredCampaigns" :key="c.id">
              <td>
                <div class="campaign-cell">
                  <strong>{{ c.name }}</strong>
                  <small>{{ c.dateRange }}</small>
                </div>
              </td>
              <td>
                <span class="channel-chip">{{ c.channel }}</span>
              </td>
              <td>{{ c.targetAudience }}</td>
              <td>{{ formatCurrency(c.spend) }}</td>
              <td>
                <span class="lead-pill">{{ c.leads }} leads</span>
              </td>
              <td>${{ c.cpl.toFixed(2) }}</td>
              <td>
                <strong>{{ c.contracts }}</strong> contracts
              </td>
              <td>
                <span class="roi-tag">{{ c.roi }}%</span>
              </td>
              <td>
                <span class="status-chip" :class="c.status.toLowerCase()">{{ c.status }}</span>
              </td>
              <td>
                <button class="btn btn-xs" @click="toggleCampaignStatus(c)">
                  {{ c.status === 'Active' ? 'Pause' : 'Activate' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Campaign Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>
            <span v-html="icons.plus"></span>
            Launch New Marketing Campaign
          </h3>
          <button class="close-btn" @click="showAddModal = false" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Campaign Name</label>
            <input v-model="newCampaign.name" placeholder="e.g. Duval County Probate Mail Drop #12" />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Marketing Channel</label>
              <select v-model="newCampaign.channel">
                <option>Direct Mail</option>
                <option>Cold Calling</option>
                <option>Facebook Ads</option>
                <option>Google PPC</option>
                <option>Driving for Dollars</option>
              </select>
            </div>
            <div class="form-group">
              <label>Allocated Budget ($)</label>
              <input v-model.number="newCampaign.budget" type="number" placeholder="2500" />
            </div>
          </div>
          <div class="form-group">
            <label>Target Audience Description</label>
            <input v-model="newCampaign.targetAudience" placeholder="e.g. Absentee Owners with 50%+ equity in 32208, 32209" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAddModal = false">Cancel</button>
          <button class="btn btn-primary" @click="saveNewCampaign">
            Create Campaign
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
  name: 'MarketingView',
  setup() {
    const metrics = [
      { label: 'Total Marketing Spend', value: '$24,800', change: '+14%', note: 'budget pacing', icon: 'dollar' },
      { label: 'Total Leads Generated', value: '1,247', change: '+28%', note: 'lead velocity', icon: 'users' },
      { label: 'Avg. Cost Per Lead', value: '$19.88', change: '-12%', note: 'efficiency gain', icon: 'chart' },
      { label: 'Contracts Acquired', value: '28', change: '+27%', note: 'under contract', icon: 'file' },
      { label: 'Blended Marketing ROI', value: '1,154%', change: '+42%', note: 'revenue / spend', icon: 'crown' }
    ];

    const channelStats = [
      { channel: 'Direct Mail', spend: 9500, leads: 480, deals: 11, roi: '1,240%', percent: 85 },
      { channel: 'Facebook Meta Ads', spend: 6200, leads: 418, deals: 8, roi: '1,120%', percent: 70 },
      { channel: 'Cold Calling', spend: 4800, leads: 215, deals: 5, roi: '980%', percent: 55 },
      { channel: 'Driving for Dollars', spend: 2100, leads: 84, deals: 3, roi: '1,350%', percent: 40 },
      { channel: 'Google Search PPC', spend: 2200, leads: 50, deals: 1, roi: '620%', percent: 30 }
    ];

    const campaigns = ref([
      {
        id: 'm1',
        name: 'Duval High Equity Absentee Postcards #109',
        channel: 'Direct Mail',
        targetAudience: 'Absentee Owners 50%+ Equity (32208, 32209, 32210)',
        spend: 4200,
        leads: 214,
        cpl: 19.62,
        contracts: 5,
        roi: 1380,
        status: 'Active',
        dateRange: 'Apr 1 – Present'
      },
      {
        id: 'm2',
        name: 'Jacksonville Foreclosure & Inheritance Inbound',
        channel: 'Facebook Ads',
        targetAudience: 'Duval County 35-65yo Homeowners in Distress',
        spend: 3400,
        leads: 198,
        cpl: 17.17,
        contracts: 4,
        roi: 1140,
        status: 'Active',
        dateRange: 'Apr 5 – Present'
      },
      {
        id: 'm3',
        name: 'Clay & Duval Tax Delinquent Cold Calling',
        channel: 'Cold Calling',
        targetAudience: '2+ Years Delinquent Property Taxes',
        spend: 2800,
        leads: 124,
        cpl: 22.58,
        contracts: 3,
        roi: 950,
        status: 'Active',
        dateRange: 'Apr 10 – Present'
      },
      {
        id: 'm4',
        name: 'Westside Distressed Driving for Dollars',
        channel: 'Driving for Dollars',
        targetAudience: 'Boarded, Overgrown, Code Violations in 32254',
        spend: 1200,
        leads: 62,
        cpl: 19.35,
        contracts: 2,
        roi: 1420,
        status: 'Active',
        dateRange: 'Apr 12 – Present'
      },
      {
        id: 'm5',
        name: 'We Buy Houses Jacksonville FL Google PPC',
        channel: 'Google PPC',
        targetAudience: 'High Intent Motivated Seller Search Keywords',
        spend: 2200,
        leads: 50,
        cpl: 44.00,
        contracts: 1,
        roi: 620,
        status: 'Paused',
        dateRange: 'Mar 15 – Apr 1'
      }
    ]);

    const searchQuery = ref('');
    const channelFilter = ref('');
    const statusFilter = ref('');
    const sortBy = ref('roiDesc');
    const showAddModal = ref(false);
    const newCampaign = ref({ name: '', channel: 'Direct Mail', budget: 3000, targetAudience: '' });

    const hasActiveFilters = computed(() => searchQuery.value || channelFilter.value || statusFilter.value || sortBy.value !== 'roiDesc');

    const filteredCampaigns = computed(() => {
      let list = campaigns.value.filter(c => {
        const q = searchQuery.value.toLowerCase().trim();
        const matchesQuery = !q || [c.name, c.channel, c.targetAudience].join(' ').toLowerCase().includes(q);
        const matchesChannel = !channelFilter.value || c.channel === channelFilter.value;
        const matchesStatus = !statusFilter.value || c.status === statusFilter.value;
        return matchesQuery && matchesChannel && matchesStatus;
      });

      if (sortBy.value === 'roiDesc') {
        list.sort((a, b) => b.roi - a.roi);
      } else if (sortBy.value === 'leadsDesc') {
        list.sort((a, b) => b.leads - a.leads);
      } else if (sortBy.value === 'cplAsc') {
        list.sort((a, b) => a.cpl - b.cpl);
      } else if (sortBy.value === 'spendDesc') {
        list.sort((a, b) => b.spend - a.spend);
      }
      return list;
    });

    function resetFilters() {
      searchQuery.value = '';
      channelFilter.value = '';
      statusFilter.value = '';
      sortBy.value = 'roiDesc';
    }

    function openModal(type) {
      if (type === 'addCampaign') showAddModal.value = true;
    }

    function toggleCampaignStatus(c) {
      c.status = c.status === 'Active' ? 'Paused' : 'Active';
    }

    function saveNewCampaign() {
      if (!newCampaign.value.name) return;
      campaigns.value.unshift({
        id: 'm-' + Date.now(),
        name: newCampaign.value.name,
        channel: newCampaign.value.channel,
        targetAudience: newCampaign.value.targetAudience || 'Target Jacksonville Homeowners',
        spend: Number(newCampaign.value.budget) || 2500,
        leads: 0,
        cpl: 0,
        contracts: 0,
        roi: 0,
        status: 'Active',
        dateRange: 'Just Launched'
      });
      showAddModal.value = false;
    }

    function formatCurrency(val) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
    }

    return {
      icons,
      metrics,
      channelStats,
      campaigns,
      searchQuery,
      channelFilter,
      statusFilter,
      sortBy,
      showAddModal,
      newCampaign,
      hasActiveFilters,
      filteredCampaigns,
      resetFilters,
      openModal,
      toggleCampaignStatus,
      saveNewCampaign,
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

.channels-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}
.channel-card {
  background: #092038;
  border: 1px solid #1a3f61;
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.channel-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.channel-name {
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
}
.channel-roi {
  font-size: 11px;
  font-weight: 700;
  color: #35e6a2;
}
.channel-bar-bg {
  width: 100%;
  height: 5px;
  background: #051424;
  border-radius: 3px;
  overflow: hidden;
}
.channel-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #1d4ed8, #edcf7c);
  border-radius: 3px;
}
.channel-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: #8da9c2;
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
.campaign-cell strong {
  display: block;
  font-size: 13px;
  color: #ffffff;
}
.campaign-cell small {
  color: #8faec7;
  font-size: 11px;
}
.channel-chip {
  padding: 2px 7px;
  background: #113454;
  color: #7dcaf4;
  border-radius: 4px;
  font-size: 11px;
}
.lead-pill {
  padding: 2px 7px;
  background: #163625;
  color: #35e6a2;
  border-radius: 4px;
  font-weight: 600;
}
.roi-tag {
  color: #edcf7c;
  font-weight: 700;
}
.status-chip {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.status-chip.active {
  background: #0f4f33;
  color: #57ffbe;
}
.status-chip.scheduled {
  background: #123d61;
  color: #7dcaf4;
}
.status-chip.paused {
  background: #382d1c;
  color: #edcf7c;
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
  max-width: 500px;
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
