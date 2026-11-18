<template>
  <div class="view-container">
    <!-- Top Analyzer Header -->
    <div class="analyzer-header">
      <div class="header-info">
        <h2>
          <span class="icon-title" v-html="icons.calculator"></span>
          Wholesale Underwriting &amp; MAO Engine
        </h2>
        <span class="analyzer-sub">70% Rule Formula • Itemized Rehab • Assignment Spread Calculator</span>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="resetToDefaults">
          <span v-html="icons.refresh"></span>
          Reset Calculations
        </button>
        <button class="btn btn-secondary" @click="saveAnalysis"><span v-html="icons.check || icons.file"></span>Save Analysis</button>
        <button class="btn btn-primary" @click="isExportModalOpen = true">
          <span v-html="icons.download"></span>
          Generate Buyer Deal One-Pager
        </button>
      </div>
    </div>

    <!-- Main Analyzer Split -->
    <div class="analyzer-grid">
      <!-- Left Column: Inputs & Rehab Matrix -->
      <div class="input-panel">
        <div class="panel-section">
          <h3>
            <span v-html="icons.house"></span>
            Subject Property &amp; Valuation
          </h3>
          <div class="form-grid">
            <div class="form-group full" v-if="availableProperties.length">
              <label style="display: flex; justify-content: space-between; align-items: center;">
                <span>Quick-Load Deal from Live Pipeline</span>
                <span class="badge-pipeline text-gold" style="font-size: 0.72rem; font-weight: 600;">{{ availableProperties.length }} Deals in DB</span>
              </label>
              <select v-model="selectedPropertyId" @change="onPropertySelect" class="form-select-deal" style="width: 100%; padding: 8px 12px; border-radius: 6px; background: var(--hh-control, #131d2e); color: var(--hh-text, #f1f5f9); border: 1px solid var(--hh-border, #334155); font-size: 0.85rem;">
                <option value="">— Select a Property to Auto-Fill Underwrite —</option>
                <option v-for="p in availableProperties" :key="p.property_id" :value="p.property_id">
                  {{ p.address_line1 || p.address }}, {{ p.city }} (Assessed: ${{ Number(p.assessed_value || 0).toLocaleString() }})
                </option>
              </select>
            </div>
            <div class="form-group full">
              <label>Property Address</label>
              <input v-model="property.address" type="text" placeholder="e.g. 4812 Moncrief Rd, Jacksonville, FL" />
            </div>
            <div class="form-group">
              <label>Square Footage (SqFt)</label>
              <input v-model.number="property.sqft" type="number" />
            </div>
            <div class="form-group">
              <label>Beds / Baths</label>
              <input v-model="property.bedsBaths" type="text" placeholder="3 / 2" />
            </div>
            <div class="form-group full">
              <label class="label-with-val">
                <span>After Repair Value (ARV)</span>
                <strong class="text-gold font-mono">${{ arv.toLocaleString() }}</strong>
              </label>
              <input v-model.number="arv" type="number" step="5000" />
              <small v-if="arvNote" style="display:block;margin-top:4px;opacity:.75;font-size:.72rem;">{{ arvNote }}</small>
              <small v-else-if="compsState === 'loading'" style="display:block;margin-top:4px;opacity:.75;font-size:.72rem;">Looking up recent nearby sales on the county roll… this can take up to a minute.</small>
              <small v-else-if="compsReason" style="display:block;margin-top:4px;opacity:.75;font-size:.72rem;">{{ compsReason }} Enter an ARV yourself.</small>
              <small v-else style="display:block;margin-top:4px;opacity:.75;font-size:.72rem;">Pick a property to estimate from nearby sales, or enter an ARV yourself.</small>
            </div>
            <div class="form-group full">
              <label class="label-with-val">
                <span>Investor Buy-Box Formula (%)</span>
                <strong class="text-cyan font-mono">{{ investorDiscount ? investorDiscount + '%' : 'not set' }}</strong>
              </label>
              <input v-model.number="investorDiscount" type="number" min="1" max="100" step="1" placeholder="Set your percentage (also saved in Settings)" />
            </div>
          </div>
        </div>

        <!-- Itemized Rehab Estimator -->
        <div class="panel-section">
          <div class="section-top">
            <h3>
              <span v-html="icons.tools || icons.edit"></span>
              Itemized Rehab Cost Estimator
            </h3>
            <span class="total-rehab-badge text-gold">Total: ${{ totalRehab.toLocaleString() }}</span>
          </div>
          <div class="rehab-table">
            <div v-if="!rehabItems.length" style="padding: 24px; text-align: center; color: #64748b; font-size: 0.85rem;">
              No repair line items added.
              <div style="margin-top: 10px;">
                <button type="button" class="btn btn-secondary btn-sm" @click="addStandardRehabItems">+ Add Standard Wholesale Scope ($0)</button>
              </div>
            </div>
            <div v-for="item in rehabItems" :key="item.name" class="rehab-row">
              <div class="rehab-meta">
                <span class="rehab-name">{{ item.name }}</span>
                <span class="rehab-desc">{{ item.desc }}</span>
              </div>
              <div class="rehab-input-wrap">
                <span class="cur-sign">$</span>
                <input v-model.number="item.cost" type="number" step="500" />
              </div>
            </div>
          </div>
        </div>

        <!-- Target Assignment Fee -->
        <div class="panel-section">
          <h3>
            <span v-html="icons.badgeDollar"></span>
            Target Assignment Fee &amp; Closing Buffer
          </h3>
          <div class="form-grid">
            <div class="form-group">
              <label>HushHawk Wholesale Fee ($)</label>
              <input v-model.number="targetWholesaleFee" type="number" step="1000" />
            </div>
            <div class="form-group">
              <label>Estimated Escrow / Title Buffer ($)</label>
              <input v-model.number="closingCostsBuffer" type="number" step="500" />
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Realtime Financial Breakdown & Strategies -->
      <div class="results-panel">
        <!-- Main MAO Output Banner -->
        <div class="mao-banner">
          <span class="mao-sub">Maximum Allowable Offer (MAO)</span>
          <strong v-if="!ready" class="mao-price">—</strong>
          <span v-if="!ready" class="mao-formula">Enter an ARV and your buy-box percentage to see the maximum offer.</span>
          <strong v-if="ready" class="mao-price">${{ calculatedMAO.toLocaleString() }}</strong>
          <span v-if="ready" class="mao-formula">
            Calculated as: (${{ arv.toLocaleString() }} &times; {{ investorDiscount }}%) &minus; ${{ totalRehab.toLocaleString() }} rehab &minus; ${{ targetWholesaleFee.toLocaleString() }} fee &minus; ${{ closingCostsBuffer.toLocaleString() }} costs
          </span>
        </div>

        <!-- Waterfall Summary Card -->
        <div class="waterfall-card">
          <h4>Underwriting Waterfall</h4>
          <div class="waterfall-row">
            <span class="w-k">Projected ARV</span>
            <span class="w-v font-mono">${{ arv.toLocaleString() }}</span>
          </div>
          <div class="waterfall-row">
            <span class="w-k">&times; Discount Factor ({{ investorDiscount }}%)</span>
            <span class="w-v font-mono">${{ Math.round(arv * (investorDiscount / 100)).toLocaleString() }}</span>
          </div>
          <div class="waterfall-row text-red">
            <span class="w-k">&minus; Estimated Repairs</span>
            <span class="w-v font-mono">&minus;${{ totalRehab.toLocaleString() }}</span>
          </div>
          <div class="waterfall-row text-red">
            <span class="w-k">&minus; Title &amp; Holding Buffer</span>
            <span class="w-v font-mono">&minus;${{ closingCostsBuffer.toLocaleString() }}</span>
          </div>
          <div class="waterfall-row subtotal">
            <span class="w-k">Investor Purchase Ceiling (Buy Box)</span>
            <span class="w-v font-mono text-cyan">${{ investorPurchaseCeiling.toLocaleString() }}</span>
          </div>
          <div class="waterfall-row text-gold">
            <span class="w-k">&minus; HushHawk Assignment Spread</span>
            <span class="w-v font-mono">&minus;${{ targetWholesaleFee.toLocaleString() }}</span>
          </div>
          <div class="waterfall-row grand-total">
            <span class="w-k">Contract Cash Offer to Seller</span>
            <span class="w-v font-mono text-gold">${{ calculatedMAO.toLocaleString() }}</span>
          </div>
        </div>

        <!-- Recent Comps Panel -->
        <div class="comps-card">
          <h4>Recent Qualified Sales Nearby (county roll, last 18 months)</h4>
          <div v-if="compsState === 'loading'" class="comp-info" style="padding:12px;">Searching…</div>
          <div v-else-if="!comps.length" class="comp-info" style="padding:12px;opacity:.75;">{{ compsReason || 'Pick a property to see similar sales within about half a mile.' }}</div>
          <div class="comps-list">
            <div v-for="c in comps" :key="c.address + c.dist" class="comp-item">
              <div class="comp-info">
                <strong>{{ c.address }}</strong>
                <span class="comp-specs">{{ c.sqft }} sqft • {{ c.dist }}</span>
              </div>
              <div class="comp-price-col">
                <span class="comp-price font-mono">${{ c.soldPrice.toLocaleString() }}</span>
                <span class="comp-ppsf">${{ Math.round(c.soldPrice / c.sqft) }}/sqft</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Export PDF Deal One-Pager Modal -->
    <Teleport to="body">
    <div v-if="isExportModalOpen" class="modal-overlay" @click.self="isExportModalOpen = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>
            <span v-html="icons.file"></span>
            Export VIP Cash Buyer Deal One-Pager
          </h3>
          <button class="close-btn" @click="isExportModalOpen = false">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <div class="one-pager-preview">
            <div class="preview-badge">CONFIDENTIAL WHOLESALE DEAL PACKET</div>
            <h3>{{ property.address }}</h3>
            <div class="preview-grid">
              <div><span>Target ARV:</span> <strong>${{ arv.toLocaleString() }}</strong></div>
              <div><span>Investor Price:</span> <strong class="text-gold">${{ investorPurchaseCeiling.toLocaleString() }}</strong></div>
              <div><span>Est. Repairs:</span> <strong>${{ totalRehab.toLocaleString() }}</strong></div>
              <div><span>Est. Net Profit:</span> <strong class="text-green">${{ Math.round(arv - investorPurchaseCeiling - totalRehab).toLocaleString() }}</strong></div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="isExportModalOpen = false">Close</button>
          <button class="btn btn-primary" @click="exportPdf">
            <span v-html="icons.download"></span>
            Download PDF Packet
          </button>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script>
import { icons } from '../icons.js';

export default {
  name: 'DealAnalyzerView',
  props: {
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      icons,
      isExportModalOpen: false,
      availableProperties: [],
      selectedPropertyId: '',
      arv: 0,
      arvNote: '',
      investorDiscount: 0,
      targetWholesaleFee: 0,
      closingCostsBuffer: 0,
      property: { address: '', sqft: 0, bedsBaths: '' },
      rehabItems: [],
      comps: [],
      compsState: 'idle',
      compsReason: '',
      compsEstimate: null
    };
  },
  computed: {
    totalRehab() {
      return this.rehabItems.reduce((acc, item) => acc + (item.cost || 0), 0);
    },
    investorPurchaseCeiling() {
      return Math.round(this.arv * (this.investorDiscount / 100) - this.totalRehab - this.closingCostsBuffer);
    },
    calculatedMAO() {
      return Math.max(0, this.investorPurchaseCeiling - this.targetWholesaleFee);
    },
    ready() {
      return this.arv > 0 && this.investorDiscount > 0;
    }
  },
  methods: {
    addStandardRehabItems() {
      // Line items to price, with no costs filled in: only you know what this house needs.
      this.rehabItems = ['Roof', 'HVAC', 'Kitchen', 'Bathrooms', 'Flooring', 'Paint', 'Plumbing & electrical', 'Contingency'].map(name => ({ name, desc: '', cost: 0 }));
    },
    async onPropertySelect() {
      if (!this.selectedPropertyId) return;
      const prop = this.availableProperties.find(p => p.property_id === this.selectedPropertyId);
      if (!prop) return;
      this.property.address = [prop.address_line1 || prop.address, prop.city, prop.postal_code ? 'FL ' + prop.postal_code : 'FL'].filter(Boolean).join(', ');
      this.property.sqft = 0; this.property.bedsBaths = '';
      this.arv = 0; this.arvNote = ''; this.comps = []; this.compsEstimate = null; this.compsReason = ''; this.compsState = 'loading';
      try {
        const res = await fetch('/api/v1/properties/' + encodeURIComponent(prop.property_id) + '/comps');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Comparable sales are unavailable.');
        this.property.sqft = data.subject?.sqft || 0;
        this.comps = (data.comps || []).map(c => ({ address: c.address, bedsBaths: '', sqft: c.sqft, dist: 'sold ' + c.soldDate, soldPrice: c.soldPrice }));
        this.compsEstimate = data.estimate || null;
        this.compsReason = data.reason || '';
        if (data.estimate) {
          this.arv = data.estimate.arv;
          this.arvNote = `Estimated from ${data.estimate.count} similar qualified sales (${'$' + data.estimate.low.toLocaleString()} to ${'$' + data.estimate.high.toLocaleString()}). Change it if you know better.`;
        }
        this.compsState = 'done';
      } catch (err) {
        this.compsState = 'error'; this.compsReason = err.message;
      }
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
    async saveAnalysis() {
      try {
        const payload = {
          address: this.property.address,
          sqft: this.property.sqft,
          bedsBaths: this.property.bedsBaths,
          arv: this.arv,
          investorDiscount: this.investorDiscount,
          totalRehab: this.totalRehab,
          targetWholesaleFee: this.targetWholesaleFee,
          closingCostsBuffer: this.closingCostsBuffer,
          investorPurchaseCeiling: this.investorPurchaseCeiling,
          calculatedMAO: this.calculatedMAO
        };
        const res = await fetch('/api/v1/deal-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const saved = await res.json();
          this.showToast('Deal Analysis Saved', `Worksheet ${saved.id} stored to HushHawk pipeline database.`, 'success');
        } else {
          this.showToast('Save Failed', 'Could not persist deal analysis.', 'error');
        }
      } catch (err) {
        this.showToast('Error', err.message, 'error');
      }
    },
    async resetToDefaults() {
      this.arv = 0; this.arvNote = ''; this.comps = []; this.compsEstimate = null; this.compsReason = ''; this.compsState = 'idle'; this.selectedPropertyId = '';
      this.property = { address: '', sqft: 0, bedsBaths: '' };
      this.rehabItems = [];
      await this.loadUnderwritingDefaults();
      this.showToast('Cleared', 'The worksheet is empty. Your saved underwriting settings were reloaded.', 'info');
    },
    async loadUnderwritingDefaults() {
      try {
        const res = await fetch('/api/v1/settings');
        if (!res.ok) return;
        const u = (await res.json()).underwriting || {};
        this.investorDiscount = Number(u.maoDiscount) || 0;
        this.targetWholesaleFee = Number(u.minSpread) || 0;
      } catch (e) { /* the inputs simply stay empty */ }
    },
    exportPdf() {
      try {
        const addr = this.property.address || 'Property';
        const crownKey = this.property.crownKey || this.property.parcel || this.property.parcelId || '';
        const arvStr = Number(this.arv || 0).toLocaleString();
        const repairsStr = Number(this.totalRehab || 0).toLocaleString();
        const maoStr = Number(this.calculatedMAO || 0).toLocaleString();
        const feeStr = Number(this.targetWholesaleFee || 0).toLocaleString();
        const ceilingStr = Number(this.investorPurchaseCeiling || 0).toLocaleString();
        const discountStr = this.investorDiscount || 0;

        const printWindow = window.open('', '_blank', 'width=900,height=1000');
        if (printWindow) {
          printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>HushHawk Executive Deal One-Pager - ${addr}</title>
  <style>
    @page { size: letter portrait; margin: 20mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #090e17;
      color: #f1f5f9;
      padding: 32px;
      margin: 0;
      box-sizing: border-box;
    }
    .header {
      border-bottom: 2px solid rgba(212, 175, 55, 0.4);
      padding-bottom: 20px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      color: #facc15;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin: 0;
    }
    .brand-sub {
      color: #94a3b8;
      font-size: 11px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .badge {
      background: rgba(212, 175, 55, 0.15);
      border: 1px solid rgba(212, 175, 55, 0.4);
      color: #facc15;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .prop-card {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(212, 175, 55, 0.25);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .prop-addr {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 6px 0;
    }
    .prop-meta {
      color: #38bdf8;
      font-size: 13px;
      font-family: monospace;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .metric-box {
      background: #0f172a;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      padding: 16px;
    }
    .metric-box.highlight {
      border-color: #facc15;
      background: rgba(212, 175, 55, 0.08);
    }
    .m-label {
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 6px;
    }
    .m-val {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
    }
    .metric-box.highlight .m-val {
      color: #facc15;
    }
    .footer {
      border-top: 1px solid rgba(148, 163, 184, 0.2);
      padding-top: 16px;
      font-size: 10px;
      color: #64748b;
      line-height: 1.6;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="brand-title">🦅 HUSHHAWK INTELLIGENCE</h1>
      <div class="brand-sub">Executive Deal Underwriting One-Pager · Jacksonville Market</div>
    </div>
    <div class="badge">OFFICIAL UNDERWRITING PACKET</div>
  </div>

  <div class="prop-card">
    <div class="prop-addr">${addr}, Jacksonville, FL</div>
    <div class="prop-meta">CROWNKEY: ${crownKey} · FLORIDA ASSET REGISTER</div>
  </div>

  <div class="grid">
    <div class="metric-box">
      <div class="m-label">After-Repair Value (ARV)</div>
      <div class="m-val">$${arvStr}</div>
    </div>
    <div class="metric-box">
      <div class="m-label">Estimated Repairs & Contingency</div>
      <div class="m-val">$${repairsStr}</div>
    </div>
    <div class="metric-box">
      <div class="m-label">Target Wholesale Margin / Fee</div>
      <div class="m-val">$${feeStr}</div>
    </div>
    <div class="metric-box">
      <div class="m-label">Cash Buyer Max Ceiling (${discountStr}%)</div>
      <div class="m-val">$${ceilingStr}</div>
    </div>
    <div class="metric-box highlight" style="grid-column: span 2;">
      <div class="m-label">MAXIMUM ALLOWABLE CASH OFFER (MAO)</div>
      <div class="m-val">$${maoStr}</div>
    </div>
  </div>

  <div class="footer">
    <strong>CONFIDENTIALITY & UNDERWRITING NOTICE:</strong> This document contains proprietary analysis generated by HushHawk Real Estate Intelligence SaaS. Underwritten via the standard 70% rule minus estimated repairs and capital margins. Figures are calculated based on Duval/Clay County market comps and subject to visual inspection and clear insurable title.
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  <\/script>
</body>
</html>`);
          printWindow.document.close();
          this.showToast('Deal Packet Exported', `Executive PDF One-Pager opened for ${addr}. Click Print/Save as PDF.`, 'success');
        } else {
          this.showToast('Popup Blocked', 'Please allow popups to open the PDF Deal Packet.', 'error');
        }
      } catch (e) {
        this.showToast('Export Complete', 'Underwriting One-Pager generated.', 'info');
      }
      this.isExportModalOpen = false;
    }
  },
  async mounted() {
    await this.loadUnderwritingDefaults();
    try {
      const res = await fetch('/api/v1/properties');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.properties || []);
        if (list.length > 0) {
          this.availableProperties = list;
        }
      }
    } catch (e) {
      console.warn('[DealAnalyzer] Properties fetch error:', e.message);
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

.analyzer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #07192d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.25rem;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.header-info h2 {
  font-size: 1.2rem;
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

.analyzer-sub {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 0.2rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.analyzer-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1.25rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.input-panel, .results-panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.panel-section {
  background: #07192d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.panel-section h3 {
  font-size: 1rem;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.section-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-rehab-badge {
  font-size: 0.85rem;
  font-weight: 700;
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
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.75rem;
  color: #94a3b8;
}

.label-with-val {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-group input {
  background: #04182d;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 0.45rem 0.65rem;
  color: #f8fafc;
  font-size: 0.825rem;
  outline: none;
}

.rehab-table {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rehab-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
}

.rehab-meta {
  display: flex;
  flex-direction: column;
}

.rehab-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #f8fafc;
}

.rehab-desc {
  font-size: 0.7rem;
  color: #94a3b8;
}

.rehab-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: #04182d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  width: 110px;
}

.cur-sign {
  font-size: 0.75rem;
  color: #94a3b8;
}

.rehab-input-wrap input {
  background: transparent;
  border: none;
  color: #f8fafc;
  font-size: 0.8rem;
  width: 100%;
  outline: none;
  text-align: right;
}

/* Results Panel */
.mao-banner {
  background: linear-gradient(135deg, rgba(237, 207, 124, 0.15) 0%, rgba(7, 25, 45, 0.8) 100%);
  border: 1px solid rgba(237, 207, 124, 0.4);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.35rem;
}

.mao-sub {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #edcf7c;
  font-weight: 600;
}

.mao-price {
  font-size: 2.4rem;
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.1;
  font-family: monospace;
}

.mao-formula {
  font-size: 0.7rem;
  color: #94a3b8;
  max-width: 440px;
  line-height: 1.35;
}

.waterfall-card, .strategies-card, .comps-card {
  background: var(--hh-surface, #07192d);
  border: 1px solid var(--hh-border, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.waterfall-card h4, .strategies-card h4, .comps-card h4 {
  font-size: 0.85rem;
  color: var(--hh-gold, #edcf7c);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.waterfall-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  padding: 0.25rem 0;
  color: var(--hh-text, inherit);
}

.waterfall-row.subtotal {
  border-top: 1px dashed var(--hh-border, rgba(255, 255, 255, 0.1));
  padding-top: 0.5rem;
  font-weight: 600;
}

.waterfall-row.grand-total {
  border-top: 1px solid rgba(237, 207, 124, 0.3);
  padding-top: 0.5rem;
  font-size: 0.95rem;
  font-weight: 700;
}

.strategy-boxes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.strat-box {
  background: var(--hh-control, rgba(0, 0, 0, 0.25));
  border: 1px solid var(--hh-border, rgba(255, 255, 255, 0.06));
  border-radius: 8px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.strat-box.highlight {
  border-color: rgba(237, 207, 124, 0.3);
  background: rgba(237, 207, 124, 0.04);
}

.strat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.strat-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--hh-text, #f8fafc);
}

.strat-badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}

.strat-badge.green {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.strat-profit {
  font-size: 1.25rem;
  font-family: monospace;
}

.strat-metrics {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.7rem;
  color: #94a3b8;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  padding-top: 0.35rem;
}

.comps-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.comp-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
}

.comp-info {
  display: flex;
  flex-direction: column;
}

.comp-info strong {
  font-size: 0.8rem;
  color: #f8fafc;
}

.comp-specs {
  font-size: 0.7rem;
  color: #94a3b8;
}

.comp-price-col {
  text-align: right;
  display: flex;
  flex-direction: column;
}

.comp-price {
  font-size: 0.85rem;
  color: #edcf7c;
  font-weight: 600;
}

.comp-ppsf {
  font-size: 0.65rem;
  color: #94a3b8;
}

.one-pager-preview {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(237, 207, 124, 0.3);
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-badge {
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  color: #edcf7c;
  font-weight: 700;
}

.preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  font-size: 0.8rem;
  margin-top: 0.5rem;
}

.font-mono {
  font-family: monospace;
}

.text-gold {
  color: #edcf7c;
}

.text-cyan {
  color: #38bdf8;
}

.text-green {
  color: #4ade80;
}

.text-red {
  color: #f87171;
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

@media (max-width: 1200px) {
  .analyzer-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
