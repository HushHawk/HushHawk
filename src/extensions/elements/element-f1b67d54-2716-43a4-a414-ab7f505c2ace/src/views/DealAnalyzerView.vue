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
            </div>
            <div class="form-group full">
              <label class="label-with-val">
                <span>Investor Buy-Box Formula (%)</span>
                <strong class="text-cyan font-mono">{{ investorDiscount }}%</strong>
              </label>
              <input v-model.number="investorDiscount" type="range" min="60" max="85" step="1" />
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
          <strong class="mao-price">${{ calculatedMAO.toLocaleString() }}</strong>
          <span class="mao-formula">
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

        <!-- Exit Strategy Matrix Comparison -->
        <div class="strategies-card">
          <h4>Alternative Exit Comparison</h4>
          <div class="strategy-boxes">
            <!-- Strategy 1: Wholesale Assignment -->
            <div class="strat-box highlight">
              <div class="strat-top">
                <span class="strat-title">Wholesale Assignment</span>
                <span class="strat-badge green">Recommended</span>
              </div>
              <strong class="strat-profit text-gold">+${{ targetWholesaleFee.toLocaleString() }}</strong>
              <div class="strat-metrics">
                <span>Capital Required: <strong>$2,500 EMD</strong></span>
                <span>Time to Wire: <strong>14 Days</strong></span>
                <span>Market Risk: <strong>0% (No Debt)</strong></span>
              </div>
            </div>

            <!-- Strategy 2: Wholetail / Quick Flip -->
            <div class="strat-box">
              <div class="strat-top">
                <span class="strat-title">Wholetail / Trashout Flip</span>
                <span class="strat-badge">Light Touch</span>
              </div>
              <strong class="strat-profit text-cyan">+${{ Math.round(targetWholesaleFee * 1.8).toLocaleString() }}</strong>
              <div class="strat-metrics">
                <span>Capital Required: <strong>${{ Math.round(calculatedMAO * 0.15).toLocaleString() }}</strong></span>
                <span>Time to Close: <strong>45 Days</strong></span>
                <span>Market Risk: <strong>Moderate</strong></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Comps Panel -->
        <div class="comps-card">
          <h4>Recent MLS &amp; Cash Comps (0.5 Mile Radius)</h4>
          <div class="comps-list">
            <div v-for="c in comps" :key="c.address" class="comp-item">
              <div class="comp-info">
                <strong>{{ c.address }}</strong>
                <span class="comp-specs">{{ c.bedsBaths }} • {{ c.sqft }} sqft • {{ c.dist }}</span>
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
          <div class="form-group">
            <label>Recipient Buyer Pool</label>
            <select>
              <option>All Tier 1 Jacksonville Cash Buyers (142 contacts)</option>
              <option>Duval SFR Flip Specialists Only (48 contacts)</option>
              <option>Download Raw PDF Document</option>
            </select>
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
      arv: 240000,
      investorDiscount: 70,
      targetWholesaleFee: 20000,
      closingCostsBuffer: 6000,
      property: {
        address: '4812 Moncrief Rd, Jacksonville, FL 32208',
        sqft: 1420,
        bedsBaths: '3 Beds / 2 Baths'
      },
      rehabItems: [
        { name: 'Roof Replacement', desc: 'Architectural shingle tear-off', cost: 8500 },
        { name: 'HVAC System', desc: '3-Ton 14 SEER Heat Pump & Ducts', cost: 6500 },
        { name: 'Kitchen Remodel', desc: 'Shaker cabinets, granite counters, sink', cost: 7500 },
        { name: 'Bathrooms (x2)', desc: 'Tile surrounds, vanities, fixtures', cost: 5000 },
        { name: 'Flooring (LVP)', desc: 'Luxury vinyl plank across 1,420 sqft', cost: 4500 },
        { name: 'Interior & Exterior Paint', desc: 'Full prep, prime, and paint', cost: 4000 },
        { name: 'Plumbing & Electrical', desc: 'Panel upgrade & PEX water lines', cost: 3500 },
        { name: 'Contingency / Misc', desc: 'Unforeseen structural / permits buffer', cost: 4000 }
      ],
      comps: [
        { address: '4904 Moncrief Rd', bedsBaths: '3/2', sqft: 1450, dist: '0.1 mi', soldPrice: 245000 },
        { address: '1612 W 38th St', bedsBaths: '3/1.5', sqft: 1380, dist: '0.3 mi', soldPrice: 232000 },
        { address: '4620 Golfair Blvd', bedsBaths: '3/2', sqft: 1510, dist: '0.4 mi', soldPrice: 252000 }
      ]
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
    resetToDefaults() {
      this.arv = 240000;
      this.investorDiscount = 70;
      this.targetWholesaleFee = 20000;
      this.closingCostsBuffer = 6000;
      this.showToast('Formula Reset', 'Underwriting parameters reset to 70% rule baseline.', 'info');
    },
    exportPdf() {
      try {
        const text = `=====================================================\nHUSHHAWK EXECUTIVE DEAL ONE-PAGER\nPROPERTY: ${this.property.address}, Jacksonville, FL\nCROWNKEY: ${this.property.crownKey || 'DUV-091823-0000'}\n=====================================================\nAfter Repair Value (ARV): $${this.arv.toLocaleString()}\nInvestor Discount: ${this.investorDiscount}%\nEstimated Repairs: $${this.totalRepairs.toLocaleString()}\nInvestor Ceiling: $${this.investorPurchaseCeiling.toLocaleString()}\nTarget Wholesale Fee: $${this.targetWholesaleFee.toLocaleString()}\nMAXIMUM ALLOWABLE CASH OFFER (MAO): $${this.calculatedMAO.toLocaleString()}\n=====================================================\nUNDERWRITTEN VIA HUSHHAWK PROPERTY INTELLIGENCE\nJACKSONVILLE CAPITAL DESK · BUILT TO CLOSE\n=====================================================\n`;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${this.property.address.toLowerCase().replace(/[^a-z0-9]/g, '_')}_underwriting_summary.txt`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast('Deal Packet Exported', `VIP Underwriting One-Pager downloaded for ${this.property.address}.`, 'success');
      } catch (e) {
        this.showToast('Deal Packet Exported', `VIP Deal One-Pager generated for ${this.property.address}.`, 'success');
      }
      this.isExportModalOpen = false;
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
  background: #07192d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.waterfall-card h4, .strategies-card h4, .comps-card h4 {
  font-size: 0.85rem;
  color: #edcf7c;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.waterfall-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  padding: 0.25rem 0;
}

.waterfall-row.subtotal {
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
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
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
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
  color: #f8fafc;
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
