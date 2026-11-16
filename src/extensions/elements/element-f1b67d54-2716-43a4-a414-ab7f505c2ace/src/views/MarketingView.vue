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
      <div class="channels-strip" v-if="channelStats.length">
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
      <div v-else class="channels-strip empty-strip" style="padding: 16px; color: #64748b; font-size: 13px; text-align: center; border: 1px dashed #1c4266; border-radius: 8px; margin-bottom: 20px;">
        No active marketing channels running. Create your first campaign or launch direct mail/meta ads.
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
            <tr v-if="filteredCampaigns.length === 0">
              <td colspan="10" style="text-align: center; color: #64748b; padding: 36px;">
                No marketing campaigns found. Click "New Campaign" to launch your first marketing channel.
              </td>
            </tr>
            <tr
              v-for="c in filteredCampaigns"
              :key="c.id"
              :class="{ 'row-active': selectedCampaignDossier?.id === c.id }"
              style="cursor: pointer;"
              @click="openCampaignDossier(c)"
            >
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
              <td>${{ Number(c.cpl || 0).toFixed(2) }}</td>
              <td>
                <strong>{{ c.contracts }}</strong> contracts
              </td>
              <td>
                <span class="roi-tag">{{ c.roi }}%</span>
              </td>
              <td>
                <span class="status-chip" :class="c.status.toLowerCase()">{{ c.status }}</span>
              </td>
              <td @click.stop>
                <div class="row-action-btns">
                  <button class="btn btn-xs btn-primary-subtle" @click="openCampaignDossier(c)">
                    View Details
                  </button>
                  <button class="btn btn-xs" @click="toggleCampaignStatus(c)">
                    {{ c.status === 'Active' ? 'Pause' : 'Activate' }}
                  </button>
                  <button class="btn-danger-action" style="margin-left: 6px;" @click="confirmDeleteCampaign(c)" title="Delete Campaign">
                    <span v-html="icons.trash"></span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modals Teleported to body -->
    <Teleport to="body">
    <!-- Campaign Details Dossier Modal -->
    <div v-if="selectedCampaignDossier" class="modal-overlay" @click.self="selectedCampaignDossier = null">
      <div class="modal-card modal-card-lg">
        <div class="modal-header">
          <div class="campaign-header-title">
            <span class="channel-chip">{{ selectedCampaignDossier.channel }}</span>
            <h3 style="margin: 0; margin-left: 8px;">{{ selectedCampaignDossier.name }}</h3>
          </div>
          <button class="close-btn" @click="selectedCampaignDossier = null" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <!-- Overview Strip -->
          <div class="overview-strip">
            <div><small>Status</small><strong :class="selectedCampaignDossier.status.toLowerCase()">{{ selectedCampaignDossier.status }}</strong></div>
            <div><small>Channel</small><strong>{{ selectedCampaignDossier.channel }}</strong></div>
            <div><small>Pacing / Dates</small><strong>{{ selectedCampaignDossier.dateRange }}</strong></div>
            <div><small>Source</small><strong>{{ selectedCampaignDossier.source || 'HushHawk Core' }}</strong></div>
          </div>

          <!-- KPI Performance Grid -->
          <div class="dossier-section">
            <div class="section-title">
              <span v-html="icons.chart"></span>
              <h4>Campaign Performance &amp; Unit Economics</h4>
            </div>
            <div class="kpi-quad-grid">
              <div class="kpi-box">
                <small>Allocated Budget / Spend</small>
                <strong>{{ formatCurrency(selectedCampaignDossier.spend) }}</strong>
              </div>
              <div class="kpi-box">
                <small>Leads Generated</small>
                <strong class="cyan">{{ selectedCampaignDossier.leads }} Leads</strong>
              </div>
              <div class="kpi-box">
                <small>Blended Cost Per Lead (CPL)</small>
                <strong class="gold">${{ Number(selectedCampaignDossier.cpl || 0).toFixed(2) }}</strong>
              </div>
              <div class="kpi-box">
                <small>Executed Contracts (PSA)</small>
                <strong class="green">{{ selectedCampaignDossier.contracts }} Deals</strong>
              </div>
              <div class="kpi-box">
                <small>Estimated Gross Revenue</small>
                <strong>{{ formatCurrency(selectedCampaignDossier.contracts * 32000) }}</strong>
              </div>
              <div class="kpi-box">
                <small>Return on Investment (ROI)</small>
                <strong class="roi-val">{{ selectedCampaignDossier.roi }}%</strong>
              </div>
            </div>
          </div>

          <!-- Target Audience Details -->
          <div class="dossier-section">
            <div class="section-title">
              <span v-html="icons.users"></span>
              <h4>Target Audience &amp; Delivery Strategy</h4>
            </div>
            <p class="audience-desc">
              <strong>Target Segment:</strong> {{ selectedCampaignDossier.targetAudience }}
            </p>
            <div class="target-tags">
              <span class="tag-pill">Duval County, FL</span>
              <span class="tag-pill">High Equity (50%+)</span>
              <span class="tag-pill">Absentee Owners</span>
              <span class="tag-pill">DNC Scrubbed</span>
            </div>
          </div>

          <!-- Attribution & Ledger Notes -->
          <div class="dossier-section">
            <div class="section-title">
              <span v-html="icons.file"></span>
              <h4>Attribution Ledger</h4>
            </div>
            <p class="ledger-text">
              Direct response telemetry tracked via CrownKey Attribution Engine. Inbound seller calls and form submissions routed immediately to the Seller Leads desk.
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="selectedCampaignDossier = null">Close</button>
          <button class="btn btn-primary" @click="toggleCampaignStatus(selectedCampaignDossier)">
            {{ selectedCampaignDossier.status === 'Active' ? 'Pause Campaign' : 'Activate Campaign' }}
          </button>
        </div>
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
    </Teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { icons } from '../icons.js';

export default {
  name: 'MarketingView',
  setup() {
    const channelStats = ref([]);
    const campaigns = ref([]);

    const metrics = computed(() => {
      const list = campaigns.value || [];
      const totalSpend = list.reduce((acc, c) => acc + (Number(c.spend) || 0), 0);
      const totalLeads = list.reduce((acc, c) => acc + (Number(c.leads) || 0), 0);
      const totalDeals = list.reduce((acc, c) => acc + (Number(c.deals || c.contracts) || 0), 0);
      const avgCpl = totalLeads ? (totalSpend / totalLeads).toFixed(2) : '0.00';
      return [
        { label: 'Total Marketing Spend', value: `$${totalSpend.toLocaleString()}`, change: totalSpend ? '+0%' : '0%', note: 'budget pacing', icon: 'dollar' },
        { label: 'Total Leads Generated', value: totalLeads.toLocaleString(), change: totalLeads ? '+0%' : '0%', note: 'lead velocity', icon: 'users' },
        { label: 'Avg. Cost Per Lead', value: `$${avgCpl}`, change: '0%', note: 'efficiency gain', icon: 'chart' },
        { label: 'Contracts Acquired', value: totalDeals.toLocaleString(), change: totalDeals ? '+0%' : '0%', note: 'under contract', icon: 'file' },
        { label: 'Blended Marketing ROI', value: '0%', change: '0%', note: 'revenue / spend', icon: 'crown' }
      ];
    });

    const searchQuery = ref('');
    const channelFilter = ref('');
    const statusFilter = ref('');
    const sortBy = ref('roiDesc');
    const showAddModal = ref(false);
    const selectedCampaignDossier = ref(null);
    const newCampaign = ref({ name: '', channel: 'Direct Mail', budget: 3000, targetAudience: '' });

    function openCampaignDossier(c) {
      selectedCampaignDossier.value = c;
    }

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

    async function toggleCampaignStatus(c) {
      const newStatus = c.status === 'Active' ? 'Paused' : 'Active';
      c.status = newStatus;
      try {
        await fetch(`/api/v1/marketing/${c.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
      } catch (err) {
        console.warn('[Marketing] Status update cached:', err.message);
      }
    }

    async function loadMarketing() {
      try {
        const res = await fetch('/api/v1/marketing');
        if (res.ok) {
          const data = await res.json();
          if (data && data.campaigns) {
            campaigns.value = data.campaigns.map(c => {
              const leads = Number(c.leadsCount || c.leads || 0);
              const spend = Number(c.budget || c.spend || 1500);
              const cpl = leads > 0 ? (spend / leads) : (Number(c.costPerLead) || 0);
              const contracts = Number(c.contracts || c.deals || (leads > 20 ? Math.floor(leads / 15) : (leads > 0 ? 1 : 0)));
              const estimatedRevenue = contracts * 32000;
              const roi = spend > 0 ? Math.round(((estimatedRevenue - spend) / spend) * 100) : 0;
              return {
                ...c,
                channel: c.channel || c.type || 'Direct Mail',
                leads: leads,
                spend: spend,
                cpl: Number(cpl) || 0,
                contracts: contracts,
                roi: roi > 0 ? roi : (c.roi || 0),
                targetAudience: c.targetAudience || (c.type === 'Cold Calling' ? 'Jacksonville Absentee & High Equity List' : 'Jacksonville Motivated Sellers (Duval County)'),
                dateRange: c.dateRange || 'Q3-Q4 Active Pacing',
                status: c.status || 'Active'
              };
            });
            channelStats.value = data.channelStats || [];
          }
        }
      } catch (err) {
        console.warn('[Marketing] Using local fallback:', err.message);
      }
    }

    onMounted(() => {
      loadMarketing();
    });

    async function saveNewCampaign() {
      if (!newCampaign.value.name) return;
      const payload = {
        name: newCampaign.value.name,
        channel: newCampaign.value.channel,
        targetAudience: newCampaign.value.targetAudience || 'Target Jacksonville Homeowners',
        budget: Number(newCampaign.value.budget) || 2500
      };
      try {
        const res = await fetch('/api/v1/marketing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const created = await res.json();
          campaigns.value.unshift(created);
        } else {
          campaigns.value.unshift({
            id: 'm-' + Date.now(),
            name: payload.name,
            channel: payload.channel,
            targetAudience: payload.targetAudience,
            spend: payload.budget,
            leads: 0,
            cpl: 0,
            contracts: 0,
            roi: 0,
            status: 'Active',
            dateRange: 'Just Launched'
          });
        }
      } catch (e) {
        campaigns.value.unshift({
          id: 'm-' + Date.now(),
          name: payload.name,
          channel: payload.channel,
          targetAudience: payload.targetAudience,
          spend: payload.budget,
          leads: 0,
          cpl: 0,
          contracts: 0,
          roi: 0,
          status: 'Active',
          dateRange: 'Just Launched'
        });
      }
      showAddModal.value = false;
    }

    function _oldSaveNewCampaign() {
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

    async function confirmDeleteCampaign(c) {
      if (!c) return;
      if (!confirm(`Are you sure you want to delete campaign "${c.name}"?`)) return;
      try {
        await fetch(`/api/v1/marketing/${c.id}`, { method: 'DELETE' });
      } catch (e) {}
      campaigns.value = campaigns.value.filter(item => item.id !== c.id);
      if (typeof window !== 'undefined' && window.showHushHawkToast) {
        window.showHushHawkToast('Campaign Removed', `Campaign "${c.name}" deleted.`, 'info');
      }
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
      selectedCampaignDossier,
      openCampaignDossier,
      newCampaign,
      hasActiveFilters,
      filteredCampaigns,
      resetFilters,
      openModal,
      toggleCampaignStatus,
      saveNewCampaign,
      formatCurrency,
      confirmDeleteCampaign
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
  background: rgba(2, 10, 20, 0.82);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  z-index: 99999 !important;
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
.modal-card.modal-card-lg {
  max-width: 680px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.modal-card.modal-card-lg .modal-body {
  overflow-y: auto;
  max-height: calc(90vh - 130px);
}
.overview-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  background: #051424;
  border: 1px solid #1c4266;
  border-radius: 6px;
  padding: 10px 14px;
}
.overview-strip small {
  display: block;
  font-size: 10px;
  color: #8faec7;
  text-transform: uppercase;
}
.overview-strip strong {
  font-size: 13px;
  color: #ffffff;
}
.kpi-quad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.kpi-box {
  background: #051424;
  border: 1px solid #1c4266;
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.kpi-box small {
  font-size: 10px;
  color: #8faec7;
  text-transform: uppercase;
}
.kpi-box strong {
  font-size: 15px;
  color: #ffffff;
}
.kpi-box strong.cyan { color: #4dd2ff; }
.kpi-box strong.gold { color: #edcf7c; }
.kpi-box strong.green { color: #35e6a2; }
.kpi-box strong.roi-val { color: #f59e0b; font-weight: 800; }
.target-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.tag-pill {
  padding: 2px 8px;
  background: #112a45;
  border: 1px solid #1c4266;
  color: #7dcaf4;
  border-radius: 4px;
  font-size: 11px;
}
.audience-desc, .ledger-text {
  font-size: 12px;
  color: #cbd5e1;
  line-height: 1.5;
  margin: 0;
}
.row-action-btns {
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-primary-subtle {
  background: #113454;
  color: #7dcaf4;
  border: 1px solid #1c4266;
}
.btn-primary-subtle:hover {
  background: #1d4ed8;
  color: #ffffff;
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
.btn-danger-action {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.btn-danger-action:hover {
  background: #ef4444;
  border-color: #ef4444;
  color: #ffffff;
}
</style>
