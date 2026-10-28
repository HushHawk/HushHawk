<template>
  <div class="view-container">
    <!-- Top Metrics -->
    <div class="metrics-grid">
      <div v-for="(m, i) in metrics" :key="m.label" class="metric-card">
        <div class="metric-icon-wrap" :class="{ gold: i === 3, cyan: i === 0, green: i === 1, purple: i === 2 }">
          <span v-html="icons[m.icon]"></span>
        </div>
        <div class="metric-info">
          <span class="metric-label">{{ m.label }}</span>
          <strong class="metric-val">{{ m.value }}</strong>
          <span class="metric-change" :class="{ positive: m.change.includes('+') }">
            {{ m.change }}
          </span>
        </div>
      </div>
    </div>

    <!-- Main Workspace -->
    <div class="content-split" :class="{ 'has-drawer': selectedLead }">
      <div class="main-panel">
        <div class="panel-header">
          <div class="header-left">
            <h2>
              <span class="icon-title" v-html="icons.facebook"></span>
              Meta Paid Social Distressed Seller Queue
            </h2>
            <span class="badge-count">{{ filteredLeads.length }} inbound leads</span>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary" @click="syncMetaWebhook">
              <span v-html="icons.refresh"></span>
              Sync Meta Webhook
            </button>
            <button class="btn btn-primary" @click="pushAllQualified">
              <span v-html="icons.zap"></span>
              Auto-Route Hot Leads
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
              placeholder="Search lead name, address, campaign, or phone..."
            />
            <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
              <span v-html="icons.close"></span>
            </button>
          </div>

          <div class="filter-group">
            <label>Campaign:</label>
            <select v-model="campaignFilter">
              <option value="">All Campaigns</option>
              <option value="Duval Inherited & Probate">Duval Inherited &amp; Probate</option>
              <option value="Pre-Foreclosure Fast Cash">Pre-Foreclosure Fast Cash</option>
              <option value="Fixer-Upper Tired Landlord">Fixer-Upper Tired Landlord</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Score:</label>
            <select v-model="scoreFilter">
              <option value="">All Scores</option>
              <option value="hot">Hot (80-100)</option>
              <option value="warm">Warm (50-79)</option>
              <option value="cold">Nurture (&lt;50)</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Stage:</label>
            <select v-model="stageFilter">
              <option value="">All Stages</option>
              <option value="New Ingestion">New Ingestion</option>
              <option value="Contacted">Contacted</option>
              <option value="Pushed to Pipeline">Pushed to Pipeline</option>
            </select>
          </div>

          <button v-if="hasActiveFilters" class="btn btn-subtle" @click="resetFilters">
            <span v-html="icons.refresh"></span>
            Reset
          </button>
        </div>

        <!-- Leads Table -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Lead Score</th>
                <th>Seller &amp; Property</th>
                <th>Campaign Attribution</th>
                <th>Timeframe</th>
                <th>Repair Estimate</th>
                <th>Mortgage Status</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="l in filteredLeads"
                :key="l.id"
                :class="{ selected: selectedLead && selectedLead.id === l.id }"
                @click="selectLead(l)"
              >
                <td>
                  <div class="score-chip" :class="getScoreClass(l.score)">
                    <strong>{{ l.score }}</strong>
                    <span>/100</span>
                  </div>
                </td>
                <td>
                  <div class="lead-cell">
                    <strong class="lead-name">{{ l.name }}</strong>
                    <span class="lead-addr">
                      <span v-html="icons.pin" class="tiny-icon"></span>
                      {{ l.address }}
                    </span>
                    <span class="font-mono text-muted">{{ l.phone }}</span>
                  </div>
                </td>
                <td>
                  <span class="camp-pill">{{ l.campaign }}</span>
                  <span class="ad-id font-mono">Ad #{{ l.adSet }}</span>
                </td>
                <td>
                  <span class="tf-badge" :class="l.timeframe.toLowerCase().includes('immediate') ? 'urgent' : ''">
                    {{ l.timeframe }}
                  </span>
                </td>
                <td>
                  <span class="repair-val text-gold">${{ l.repairs.toLocaleString() }}</span>
                  <span class="occupancy-sub">{{ l.occupancy }}</span>
                </td>
                <td>
                  <div class="mortgage-col">
                    <span>{{ l.mortgage ? '$' + l.mortgage.toLocaleString() : 'Free & Clear' }}</span>
                    <span class="sub-equity text-green" v-if="l.equity">{{ l.equity }}% Equity</span>
                  </div>
                </td>
                <td>
                  <span class="status-chip" :class="l.stage.toLowerCase().replace(/\s+/g, '-')">
                    {{ l.stage }}
                  </span>
                </td>
                <td @click.stop>
                  <div class="row-actions">
                    <button class="btn btn-primary btn-sm" title="Push to Acquisitions Pipeline" @click="pushToPipeline(l)">
                      <span v-html="icons.arrowUpRight"></span>
                      Push
                    </button>
                    <button class="action-btn call" title="Call Lead" @click="quickCall(l)">
                      <span v-html="icons.phone"></span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredLeads.length === 0">
                <td colspan="8" class="empty-state">
                  <div class="empty-box">
                    <span class="empty-icon" v-html="icons.facebook"></span>
                    <p>No Meta leads match your filter parameters.</p>
                    <button class="btn btn-secondary" @click="resetFilters">Reset Filters</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detail Slide-out Drawer -->
      <div v-if="selectedLead" class="detail-drawer">
        <div class="drawer-header">
          <div class="drawer-title">
            <div class="score-chip" :class="getScoreClass(selectedLead.score)">
              Score: {{ selectedLead.score }}/100
            </div>
            <h3>{{ selectedLead.name }}</h3>
            <span class="drawer-sub">{{ selectedLead.address }}</span>
          </div>
          <button class="close-btn" @click="selectedLead = null">
            <span v-html="icons.close"></span>
          </button>
        </div>

        <div class="drawer-body">
          <div class="drawer-action-strip">
            <button class="btn btn-primary" @click="pushToPipeline(selectedLead)">
              <span v-html="icons.arrowUpRight"></span>
              Push to Pipeline
            </button>
            <button class="btn btn-secondary" @click="quickCall(selectedLead)">
              <span v-html="icons.phone"></span>
              Call Seller
            </button>
          </div>

          <div class="info-card">
            <h4>Meta Lead Form Questionnaire</h4>
            <div class="info-row">
              <span class="k">Why are you selling?</span>
              <span class="v">{{ selectedLead.reason }}</span>
            </div>
            <div class="info-row">
              <span class="k">Timeline to Close:</span>
              <span class="v font-bold">{{ selectedLead.timeframe }}</span>
            </div>
            <div class="info-row">
              <span class="k">Self-Reported Repairs:</span>
              <span class="v text-gold">${{ selectedLead.repairs.toLocaleString() }} ({{ selectedLead.repairDetails }})</span>
            </div>
            <div class="info-row">
              <span class="k">Current Occupancy:</span>
              <span class="v">{{ selectedLead.occupancy }}</span>
            </div>
            <div class="info-row">
              <span class="k">Mortgage Balance:</span>
              <span class="v">{{ selectedLead.mortgage ? '$' + selectedLead.mortgage.toLocaleString() : 'Paid Off / Free & Clear' }}</span>
            </div>
          </div>

          <div class="info-card">
            <h4>CrownKey Parcel &amp; Valuation</h4>
            <div class="info-row">
              <span class="k">Parcel ID:</span>
              <span class="v font-mono text-gold">{{ selectedLead.parcelId }}</span>
            </div>
            <div class="info-row">
              <span class="k">Estimated ARV:</span>
              <span class="v">${{ selectedLead.arv.toLocaleString() }}</span>
            </div>
            <div class="info-row">
              <span class="k">Calculated MAO (70%):</span>
              <span class="v">${{ Math.round(selectedLead.arv * 0.7 - selectedLead.repairs - 15000).toLocaleString() }}</span>
            </div>
          </div>

          <div class="info-card">
            <h4>Contact Info</h4>
            <div class="info-row">
              <span class="k">Phone:</span>
              <span class="v font-mono">{{ selectedLead.phone }}</span>
            </div>
            <div class="info-row">
              <span class="k">Email:</span>
              <span class="v font-mono">{{ selectedLead.email }}</span>
            </div>
            <div class="info-row">
              <span class="k">Form Submitted:</span>
              <span class="v text-muted">{{ selectedLead.submitted }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { icons } from '../icons.js';

export default {
  name: 'FacebookLeadsView',
  props: {
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      icons,
      searchQuery: '',
      campaignFilter: '',
      scoreFilter: '',
      stageFilter: '',
      selectedLead: null,
      metrics: [
        { label: 'Leads Ingested (30d)', value: '114', change: '+28 vs last mo', icon: 'facebook' },
        { label: 'Avg Cost Per Lead (CPL)', value: '$35.96', change: '-$4.20 efficiency', icon: 'dollar' },
        { label: 'Qualified Motivation Rate', value: '62%', change: '71 Hot/Warm', icon: 'trendingUp' },
        { label: 'Contracts Executed', value: '6 Deals', change: '$148k projected', icon: 'badgeDollar' }
      ],
      leads: [
        {
          id: 1,
          name: 'Travis Holloway',
          phone: '(904) 555-7741',
          email: 't.holloway@gmail.com',
          address: '5318 Moncrief Rd W, Jacksonville, FL 32209',
          parcelId: 'DUV-091823-0092',
          campaign: 'Duval Inherited & Probate',
          adSet: 'Meta-JAX-Inherited-V3',
          score: 94,
          timeframe: 'Immediate (< 14 days)',
          repairs: 28000,
          repairDetails: 'Needs roof replacement & cosmetic update',
          occupancy: 'Vacant (Key in lockbox)',
          mortgage: 0,
          equity: 100,
          arv: 215000,
          stage: 'New Ingestion',
          reason: 'Inherited from grandmother. Living in Orlando and cannot manage Jacksonville maintenance.',
          submitted: '32 mins ago'
        },
        {
          id: 2,
          name: 'Deanne Walker',
          phone: '(904) 555-4819',
          email: 'deanne.walker@yahoo.com',
          address: '1724 W 14th St, Jacksonville, FL 32209',
          parcelId: 'DUV-084721-0199',
          campaign: 'Pre-Foreclosure Fast Cash',
          adSet: 'Meta-PreForeclosure-Auction-V1',
          score: 88,
          timeframe: '30 Days',
          repairs: 15000,
          repairDetails: 'AC compressor down, interior paint',
          occupancy: 'Owner Occupied',
          mortgage: 62000,
          equity: 68,
          arv: 195000,
          stage: 'Contacted',
          reason: 'Behind 3 months on mortgage. Received notice of default from lender.',
          submitted: '3 hrs ago'
        },
        {
          id: 3,
          name: 'Carlos Mendez',
          phone: '(904) 555-8930',
          email: 'cmendez904@gmail.com',
          address: '7412 103rd St, Jacksonville, FL 32210',
          parcelId: 'DUV-041920-0834',
          campaign: 'Fixer-Upper Tired Landlord',
          adSet: 'Meta-TiredLandlord-Duplex',
          score: 76,
          timeframe: '30-60 Days',
          repairs: 35000,
          repairDetails: 'Tenants stopped paying, plumbing damage',
          occupancy: 'Tenant Occupied (Eviction in progress)',
          mortgage: 85000,
          equity: 63,
          arv: 230000,
          stage: 'New Ingestion',
          reason: 'Tired of managing bad tenants. Wants clean cash exit.',
          submitted: 'Yesterday'
        },
        {
          id: 4,
          name: 'Mildred Vance',
          phone: '(904) 555-1129',
          email: 'mvance@comcast.net',
          address: '3819 University Blvd N, Jacksonville, FL 32211',
          parcelId: 'DUV-072319-0412',
          campaign: 'Duval Inherited & Probate',
          adSet: 'Meta-JAX-Inherited-V3',
          score: 91,
          timeframe: 'Immediate (< 14 days)',
          repairs: 20000,
          repairDetails: 'Original 1972 kitchen and bathrooms',
          occupancy: 'Vacant',
          mortgage: 0,
          equity: 100,
          arv: 240000,
          stage: 'Pushed to Pipeline',
          reason: 'Moving into assisted living facility in St. Johns County.',
          submitted: '2 days ago'
        }
      ]
    };
  },
  computed: {
    hasActiveFilters() {
      return Boolean(this.searchQuery || this.campaignFilter || this.scoreFilter || this.stageFilter);
    },
    filteredLeads() {
      return this.leads.filter(l => {
        if (this.campaignFilter && l.campaign !== this.campaignFilter) return false;
        if (this.stageFilter && l.stage !== this.stageFilter) return false;
        if (this.scoreFilter === 'hot' && l.score < 80) return false;
        if (this.scoreFilter === 'warm' && (l.score < 50 || l.score >= 80)) return false;
        if (this.scoreFilter === 'cold' && l.score >= 50) return false;
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase();
          return (
            l.name.toLowerCase().includes(q) ||
            l.address.toLowerCase().includes(q) ||
            l.phone.includes(q) ||
            l.campaign.toLowerCase().includes(q)
          );
        }
        return true;
      });
    }
  },
  methods: {
    getScoreClass(score) {
      if (score >= 85) return 'hot';
      if (score >= 70) return 'warm';
      return 'cold';
    },
    selectLead(l) {
      this.selectedLead = l;
    },
    showToast(title, message, type = 'info') {
      if (typeof window !== 'undefined') {
        if (window.showHushHawkToast) {
          window.showHushHawkToast(title, message, type);
        } else {
          window.dispatchEvent(new CustomEvent('hushhawk-toast', { detail: { title, message, type } }));
        }
      }
    },
    quickCall(l) {
      this.showToast('Twilio Voice Call', `Connecting outbound bridge to ${l.name} (${l.phone})...`, 'success');
    },
    pushToPipeline(l) {
      l.stage = 'Pushed to Pipeline';
      this.showToast('Acquisitions Pipeline', `Lead ${l.name} pushed directly to Acquisitions Pipeline with MAO preset.`, 'success');
    },
    pushAllQualified() {
      let count = 0;
      this.leads.forEach(l => {
        if (l.score >= 80 && l.stage !== 'Pushed to Pipeline') {
          l.stage = 'Pushed to Pipeline';
          count++;
        }
      });
      this.showToast('Batch Push Complete', `Pushed ${count} hot qualified leads to Acquisitions team.`, 'success');
    },
    syncMetaWebhook() {
      this.showToast('Meta Graph API', 'Webhook polled: 0 new leads since 10:00 AM.', 'info');
    },
    resetFilters() {
      this.searchQuery = '';
      this.campaignFilter = '';
      this.scoreFilter = '';
      this.stageFilter = '';
    }
  }
};
</script>

<style scoped>
.view-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #07192d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  min-width: 0;
  box-sizing: border-box;
}

.metric-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

.metric-icon-wrap.gold {
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
}

.metric-icon-wrap.cyan {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.metric-icon-wrap.green {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.metric-icon-wrap.purple {
  background: rgba(192, 132, 252, 0.15);
  color: #c084fc;
}

.metric-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.metric-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-val {
  font-size: 1.45rem;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-change {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-change.positive {
  color: #4ade80;
}

.content-split {
  display: flex;
  gap: 1.25rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.main-panel {
  flex: 1;
  background: #07192d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left h2 {
  font-size: 1.15rem;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.icon-title {
  color: #38bdf8;
  display: flex;
}

.badge-count {
  font-size: 0.75rem;
  padding: 0.2rem 0.55rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  color: #94a3b8;
}

.filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  flex: 1;
  min-width: 220px;
}

.search-box input {
  background: transparent;
  border: none;
  outline: none;
  color: #f8fafc;
  font-size: 0.85rem;
  width: 100%;
}

.clear-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.filter-group label {
  font-size: 0.75rem;
  color: #94a3b8;
}

.filter-group select {
  background: #04182d;
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
  outline: none;
}

.table-container {
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  text-align: left;
}

.data-table th {
  background: rgba(255, 255, 255, 0.03);
  color: #94a3b8;
  padding: 0.75rem 0.9rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.data-table td {
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
}

.data-table tr:hover {
  background: rgba(237, 207, 124, 0.04);
  cursor: pointer;
}

.data-table tr.selected {
  background: rgba(237, 207, 124, 0.08);
  border-left: 3px solid #edcf7c;
}

.score-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 0.15rem;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.score-chip strong {
  font-weight: 700;
}

.score-chip span {
  font-size: 0.65rem;
  opacity: 0.7;
}

.score-chip.hot {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.4);
}

.score-chip.warm {
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
}

.score-chip.cold {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}

.lead-cell {
  display: flex;
  flex-direction: column;
}

.lead-name {
  color: #f8fafc;
}

.lead-addr {
  font-size: 0.75rem;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.camp-pill {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.75rem;
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
}

.ad-id {
  display: block;
  font-size: 0.65rem;
  color: #64748b;
  margin-top: 2px;
}

.tf-badge {
  font-size: 0.75rem;
  color: #cbd5e1;
}

.tf-badge.urgent {
  color: #f87171;
  font-weight: 600;
}

.repair-val {
  font-weight: 600;
}

.occupancy-sub {
  display: block;
  font-size: 0.7rem;
  color: #94a3b8;
}

.mortgage-col {
  display: flex;
  flex-direction: column;
  font-size: 0.8rem;
}

.sub-equity {
  font-size: 0.7rem;
}

.status-chip {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.status-chip.new-ingestion {
  background: rgba(237, 207, 124, 0.2);
  color: #edcf7c;
}

.status-chip.contacted {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.status-chip.pushed-to-pipeline {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.row-actions {
  display: flex;
  gap: 0.35rem;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.detail-drawer {
  width: 340px;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  background: #07192d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.75rem;
}

.drawer-title h3 {
  font-size: 1.1rem;
  color: #f8fafc;
  margin: 0.35rem 0 0.15rem 0;
}

.drawer-sub {
  font-size: 0.75rem;
  color: #94a3b8;
}

.drawer-action-strip {
  display: flex;
  gap: 0.5rem;
}

.info-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.info-card h4 {
  font-size: 0.8rem;
  color: #edcf7c;
  margin: 0 0 0.4rem 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.info-row .k {
  color: #94a3b8;
}

.info-row .v {
  color: #f8fafc;
}

.font-mono {
  font-family: monospace;
}

.text-gold {
  color: #edcf7c;
}

.text-green {
  color: #4ade80;
}

.text-muted {
  color: #64748b;
}

.tiny-icon {
  display: inline-flex;
  width: 14px;
  height: 14px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: #edcf7c;
  color: #04182d;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.btn-subtle {
  background: transparent;
  color: #94a3b8;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

@media (max-width: 1280px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .content-split {
    flex-direction: column;
  }
  .detail-drawer {
    width: 100%;
  }
}
</style>
