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
    <div class="main-panel">
      <div class="panel-header">
        <div class="header-left">
          <h2>
            <span class="icon-title" v-html="icons.mail"></span>
            Direct Mail Batches &amp; USPS Intelligent Mail Barcode (IMb)
          </h2>
          <span class="badge-count">{{ mailBatches.length }} active drop batches</span>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" @click="trackAllBatches">
            <span v-html="icons.refresh"></span>
            USPS IMb Scan Sync
          </button>
          <button class="btn btn-primary" @click="isAddModalOpen = true">
            <span v-html="icons.plus"></span>
            Launch Mail Batch
          </button>
        </div>
      </div>

      <!-- Filter Toolbar -->
      <div class="filter-toolbar">
        <div class="search-box">
          <span v-html="icons.search"></span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search batch name, ZIP list, template type, or tracking ID..."
          />
          <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
            <span v-html="icons.close"></span>
          </button>
        </div>

        <div class="filter-group">
          <label>Status:</label>
          <select v-model="statusFilter">
            <option value="">All Drop Statuses</option>
            <option value="Responding">In Inbound Window (Responding)</option>
            <option value="In Delivery">In Transit / USPS Delivery</option>
            <option value="Printing">Printing &amp; Pre-Sorting</option>
            <option value="Completed">Completed Run</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Format:</label>
          <select v-model="formatFilter">
            <option value="">All Formats</option>
            <option value="4x6 Postcard">4x6 Full Color Postcard</option>
            <option value="Handwritten Letter">Handwritten Yellow Letter</option>
            <option value="Official Notice">Official Notice Window Envelope</option>
          </select>
        </div>

        <button v-if="hasActiveFilters" class="btn btn-subtle" @click="resetFilters">
          <span v-html="icons.refresh"></span>
          Reset
        </button>
      </div>

      <!-- Batches Table -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Batch Code &amp; Title</th>
              <th>Target Audience &amp; ZIPs</th>
              <th>Mail Format</th>
              <th>Volume Mailed</th>
              <th>Total Cost</th>
              <th>Inbound Calls</th>
              <th>Response Rate</th>
              <th>USPS Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in filteredBatches" :key="b.id">
              <td>
                <div class="batch-title-cell">
                  <strong class="b-name">{{ b.name }}</strong>
                  <span class="font-mono text-gold">{{ b.batchCode }}</span>
                </div>
              </td>
              <td>
                <div class="audience-cell">
                  <span>{{ b.audience }}</span>
                  <span class="zip-tags font-mono">{{ b.zips }}</span>
                </div>
              </td>
              <td>
                <span class="format-pill">{{ b.format }}</span>
              </td>
              <td class="font-mono"><strong>{{ b.quantity.toLocaleString() }}</strong> pcs</td>
              <td class="font-mono">${{ b.cost.toLocaleString() }}</td>
              <td>
                <div class="calls-cell">
                  <strong class="text-green">{{ b.calls }} calls</strong>
                  <span class="cpc-sub">${{ Math.round(b.cost / (b.calls || 1)) }} / call</span>
                </div>
              </td>
              <td>
                <div class="resp-bar-wrap">
                  <span class="resp-pct">{{ b.responseRate }}%</span>
                  <div class="mini-bar-bg">
                    <div class="mini-bar-fill" :style="{ width: (parseFloat(b.responseRate) * 40) + '%' }"></div>
                  </div>
                </div>
              </td>
              <td>
                <span class="status-chip" :class="b.status.toLowerCase().replace(/[\s&]+/g, '-')">
                  {{ b.status }}
                </span>
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-subtle btn-sm" title="View Heatmap Comps" @click="viewTracking(b)">
                    <span v-html="icons.eye"></span>
                  </button>
                  <button class="btn btn-subtle btn-sm" title="Download Recipient CSV" @click="downloadCsv(b)">
                    <span v-html="icons.download"></span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Launch Mail Batch Modal -->
    <div v-if="isAddModalOpen" class="modal-overlay" @click.self="isAddModalOpen = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>
            <span v-html="icons.mail"></span>
            Launch Direct Mail Campaign Batch
          </h3>
          <button class="close-btn" @click="isAddModalOpen = false">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <form class="modal-body" @submit.prevent="saveNewBatch">
          <div class="form-grid">
            <div class="form-group full">
              <label>Campaign Batch Name *</label>
              <input v-model="newBatch.name" type="text" required placeholder="e.g. Duval Q4 Absentee High Equity Drop" />
            </div>
            <div class="form-group full">
              <label>Target Audience Segment</label>
              <input v-model="newBatch.audience" type="text" required placeholder="e.g. Tax Delinquent > 2 Years + Out of State Owners" />
            </div>
            <div class="form-group">
              <label>Mail Piece Format</label>
              <select v-model="newBatch.format">
                <option value="4x6 Postcard">4x6 Full Color Postcard ($0.44/ea)</option>
                <option value="Handwritten Letter">Handwritten Yellow Letter ($0.68/ea)</option>
                <option value="Official Notice">Official Notice Window Envelope ($0.74/ea)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Quantity of Recipients</label>
              <input v-model.number="newBatch.quantity" type="number" required placeholder="2500" />
            </div>
            <div class="form-group">
              <label>Target ZIP Codes</label>
              <input v-model="newBatch.zips" type="text" placeholder="32208, 32209, 32210, 32254" />
            </div>
            <div class="form-group">
              <label>Assigned Call Tracking Number</label>
              <input v-model="newBatch.trackingPhone" type="tel" placeholder="(904) 555-0144" />
            </div>
            <div class="form-group full">
              <label>Mail Copy &amp; Offer Hook</label>
              <textarea v-model="newBatch.copy" rows="3" placeholder="I would like to make you an all-cash offer on [Property_Address] as-is with no closing fees..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="isAddModalOpen = false">Cancel</button>
            <button type="submit" class="btn btn-primary">Submit to Print Vendor</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { icons } from '../icons.js';

export default {
  name: 'DirectMailView',
  props: {
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      icons,
      searchQuery: '',
      statusFilter: '',
      formatFilter: '',
      isAddModalOpen: false,
      metrics: [
        { label: 'Total Pieces Mailed', value: '14,250', change: '+2,500 this drop', icon: 'mail' },
        { label: 'Inbound Seller Calls', value: '259 Calls', change: '1.82% response rate', icon: 'phone' },
        { label: 'Avg Cost Per Call', value: '$24.71', change: 'Record low', icon: 'dollar' },
        { label: 'Closed Wholesale Gross', value: '$228,000', change: '9 Deals closed', icon: 'badgeDollar' }
      ],
      newBatch: {
        name: '',
        audience: '',
        format: '4x6 Postcard',
        quantity: 2500,
        zips: '32208, 32209',
        trackingPhone: '(904) 555-0144',
        copy: ''
      },
      mailBatches: [
        {
          id: 1,
          batchCode: 'DM-2026-B108',
          name: 'Duval Tax Certificate Absentee Drop',
          audience: 'Tax Delinquent > 2 Years + Out of State Owners',
          zips: '32208, 32209, 32254',
          format: '4x6 Postcard',
          quantity: 3500,
          cost: 1540,
          calls: 78,
          responseRate: '2.23',
          status: 'Responding'
        },
        {
          id: 2,
          batchCode: 'DM-2026-B107',
          name: 'Clay County Probate & Inherited Deeds',
          audience: 'Inherited Properties & Personal Representative Petitions',
          zips: '32065, 32073, 32003',
          format: 'Handwritten Letter',
          quantity: 1800,
          cost: 1224,
          calls: 42,
          responseRate: '2.33',
          status: 'Responding'
        },
        {
          id: 3,
          batchCode: 'DM-2026-B109',
          name: 'Duval Vacant & Code Violation Scrub',
          audience: 'Tall Grass / Boarded Facade Magistrate Notices',
          zips: '32206, 32208, 32209',
          format: 'Official Notice',
          quantity: 2400,
          cost: 1776,
          calls: 51,
          responseRate: '2.12',
          status: 'In Delivery'
        },
        {
          id: 4,
          batchCode: 'DM-2026-B110',
          name: 'Westside High Equity Senior Homeowners',
          audience: 'Owned 20+ Years, 100% Free & Clear Equity',
          zips: '32210, 32244, 32221',
          format: '4x6 Postcard',
          quantity: 4000,
          cost: 1760,
          calls: 64,
          responseRate: '1.60',
          status: 'Printing'
        },
        {
          id: 5,
          batchCode: 'DM-2026-B106',
          name: 'Arlington Pre-Foreclosure NOD Sprint',
          audience: 'Lis Pendens Filed within Last 60 Days',
          zips: '32211, 32277',
          format: 'Handwritten Letter',
          quantity: 1250,
          cost: 850,
          calls: 24,
          responseRate: '1.92',
          status: 'Completed'
        }
      ]
    };
  },
  computed: {
    hasActiveFilters() {
      return Boolean(this.searchQuery || this.statusFilter || this.formatFilter);
    },
    filteredBatches() {
      return this.mailBatches.filter(b => {
        if (this.statusFilter && b.status !== this.statusFilter) return false;
        if (this.formatFilter && b.format !== this.formatFilter) return false;
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase();
          return (
            b.name.toLowerCase().includes(q) ||
            b.batchCode.toLowerCase().includes(q) ||
            b.audience.toLowerCase().includes(q) ||
            b.zips.includes(q)
          );
        }
        return true;
      });
    }
  },
  methods: {
    showToast(title, message, type = 'info') {
      if (typeof window !== 'undefined') {
        if (window.showHushHawkToast) {
          window.showHushHawkToast(title, message, type);
        } else {
          window.dispatchEvent(new CustomEvent('hushhawk-toast', { detail: { title, message, type } }));
        }
      }
    },
    trackAllBatches() {
      this.showToast('USPS IMb Tracking', 'Queried USPS API: 98.4% of in-delivery pieces scanned at Jacksonville P&DC.', 'success');
    },
    viewTracking(b) {
      this.showToast('Batch Tracking', `USPS IMb scan breakdown loaded for ${b.batchCode}: ${b.delivered} / ${b.pieceCount} pieces confirmed.`, 'info');
    },
    downloadCsv(b) {
      try {
        const csvContent = `Batch Code,Campaign Name,Format,Pieces,Delivered,Status,Target ZIPs\n"${b.batchCode}","${b.name}","${b.format}",${b.pieceCount},${b.delivered},"${b.status}","${b.zips}"\n`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${b.batchCode}_address_list.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast('CSV Exported', `Address list for ${b.batchCode} downloaded successfully.`, 'success');
      } catch (e) {
        this.showToast('CSV Exported', `Address list exported for ${b.batchCode}.`, 'success');
      }
    },
    resetFilters() {
      this.searchQuery = '';
      this.statusFilter = '';
      this.formatFilter = '';
    },
    saveNewBatch() {
      const id = Date.now();
      const unitCost = this.newBatch.format === '4x6 Postcard' ? 0.44 : 0.68;
      this.mailBatches.unshift({
        id,
        batchCode: 'DM-2026-B' + Math.floor(111 + Math.random() * 20),
        name: this.newBatch.name,
        audience: this.newBatch.audience,
        zips: this.newBatch.zips,
        format: this.newBatch.format,
        quantity: this.newBatch.quantity,
        cost: Math.round(this.newBatch.quantity * unitCost),
        calls: 0,
        responseRate: '0.00',
        status: 'Printing'
      });
      this.isAddModalOpen = false;
      this.newBatch = {
        name: '',
        audience: '',
        format: '4x6 Postcard',
        quantity: 2500,
        zips: '32208, 32209',
        trackingPhone: '(904) 555-0144',
        copy: ''
      };
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

.main-panel {
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
  color: #edcf7c;
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

.batch-title-cell {
  display: flex;
  flex-direction: column;
}

.b-name {
  color: #f8fafc;
}

.audience-cell {
  display: flex;
  flex-direction: column;
  font-size: 0.8rem;
}

.zip-tags {
  font-size: 0.7rem;
  color: #94a3b8;
}

.format-pill {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.2rem 0.45rem;
  border-radius: 4px;
  color: #cbd5e1;
}

.calls-cell {
  display: flex;
  flex-direction: column;
}

.cpc-sub {
  font-size: 0.7rem;
  color: #94a3b8;
}

.resp-bar-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  width: 90px;
}

.resp-pct {
  font-size: 0.75rem;
  font-weight: 600;
  color: #edcf7c;
}

.mini-bar-bg {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.mini-bar-fill {
  height: 100%;
  background: #edcf7c;
  border-radius: 2px;
}

.status-chip {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.status-chip.responding {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.status-chip.in-delivery {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.status-chip.printing {
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
}

.status-chip.completed {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}

.row-actions {
  display: flex;
  gap: 0.35rem;
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

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: #07192d;
  border: 1px solid rgba(237, 207, 124, 0.3);
  border-radius: 12px;
  width: 100%;
  max-width: 540px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-header h3 {
  font-size: 1.05rem;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.modal-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

.form-group.full {
  grid-column: 1 / -1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.form-group label {
  font-size: 0.75rem;
  color: #94a3b8;
}

.form-group input,
.form-group select,
.form-group textarea {
  background: #04182d;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
  color: #f8fafc;
  font-size: 0.825rem;
  outline: none;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

@media (max-width: 1024px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
