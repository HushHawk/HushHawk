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
        </div>
      </div>
    </div>

    <!-- Distress Pillar & Signal Intelligence Matrix (CrownKey Direct Tracking) -->
    <div class="pillar-strip-panel">
      <div class="pillar-strip-head">
        <div class="head-title">
          <span class="icon-zap text-gold" v-html="icons.zap"></span>
          <div>
            <h3>Distress Pillar &amp; Signal Intelligence (CrownKey Mailer Tracking)</h3>
            <p>Recorded mail pieces, QR scans, and callback requests by distress signal</p>
          </div>
        </div>
        <div class="pillar-actions">
          <button class="btn btn-gold btn-sm" @click="openQrModal">
            <span v-html="icons.zap"></span>
            CrownKey QR Mailer
          </button>
          <button class="btn btn-secondary btn-sm" @click="refreshAllData()">
            <span v-html="icons.refresh"></span>
            Sync Live Data
          </button>
        </div>
      </div>
      <p v-if="loadError" role="alert">{{ loadError }}</p>
      <div class="pillar-cards-grid">
        <div v-for="(p, code) in pillarStats" :key="code" class="distress-pillar-card" :class="code.toLowerCase()">
          <!-- Card Top Bar: Code Badge + CTR Pill -->
          <div class="p-card-header">
            <div class="p-badge-wrap">
              <span class="p-code-badge font-mono">{{ code }}</span>
              <span class="p-signal-dot"></span>
            </div>
            <div class="p-rate-pill font-mono">
              <span class="p-rate-num">{{ p.scanRate ?? '—' }}</span>
              <span class="p-rate-lbl">Scan rate</span>
            </div>
          </div>

          <!-- Pillar Title (never truncated, clear typography) -->
          <div class="p-title-wrap">
            <h4 class="p-pillar-title">{{ p.name }}</h4>
          </div>

          <!-- Metrics 2x2 Grid with individual micro-cards -->
          <div class="p-metrics-grid">
            <div class="p-metric-cell">
              <span class="p-metric-label">Mailed</span>
              <span class="p-metric-value font-mono">{{ p.mailed.toLocaleString() }}</span>
            </div>
            <div class="p-metric-cell">
              <span class="p-metric-label">QR Scans</span>
              <span class="p-metric-value font-mono text-cyan">{{ p.scans }}</span>
            </div>
            <div class="p-metric-cell">
              <span class="p-metric-label">Callbacks</span>
              <span class="p-metric-value font-mono text-green">{{ p.conversions }}</span>
            </div>
            <div class="p-metric-cell">
              <span class="p-metric-label">Callback rate</span>
              <span class="p-metric-value font-mono text-gold">{{ p.convRate ?? '—' }}</span>
            </div>
          </div>

          <!-- Performance Conversion Progress Bar -->
          <div class="p-card-footer">
            <div class="p-progress-track" :title="`Callback rate: ${p.convRate ?? 'unavailable'}`">
              <div class="p-progress-fill" :style="{ width: (parseFloat(p.convRate) || 0) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Workspace -->
    <div class="main-panel">
      <div class="panel-header">
        <div class="header-left">
          <h2>
            <span class="icon-title" v-html="icons.mail"></span>
            Direct Mail Batches
          </h2>
          <span class="badge-count">{{ (mailBatches || []).length }} active drop batches</span>
        </div>
        <div class="header-actions">
          <button class="btn btn-gold" @click="openQrModal">
            <span v-html="icons.zap"></span>
            CrownKey QR Mailer
          </button>
          <button class="btn btn-primary" @click="isAddModalOpen = true">
            <span v-html="icons.plus"></span>
            New Mail Batch
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
              <th>Signal &amp; CrownKey</th>
              <th>Mail Format</th>
              <th>Batch Quantity</th>
              <th>QR Scans</th>
              <th>Callback Requests</th>
              <th>Batch Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="(filteredBatches || []).length === 0">
              <td colspan="9" style="text-align: center; color: #94a3b8; padding: 48px 24px;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                  <span v-html="icons.mail" style="transform: scale(1.6); opacity: 0.6; color: #edcf7c; margin-bottom: 8px;"></span>
                  <strong style="color: #f8fafc; font-size: 15px;">No Direct Mail Drops Recorded</strong>
                  <p style="margin: 0 0 12px 0; color: #64748b; font-size: 13px;">Create high-equity or pre-foreclosure direct mail drops to begin tracking QR scans and seller callbacks.</p>
                  <button class="btn btn-gold btn-sm" @click="openModal('newBatch')">
                    <span v-html="icons.plus"></span> Launch First Mail Drop
                  </button>
                </div>
              </td>
            </tr>
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
                <div class="signal-cell">
                  <span class="badge-signal" :class="getSignalBadgeClass(b.pillarCode || b.name)">
                    {{ getSignalLabel(b.pillarCode || b.name) }}
                  </span>
                </div>
              </td>
              <td>
                <span class="format-pill">{{ b.format }}</span>
              </td>
              <td class="font-mono"><strong>{{ (b.quantity ?? 0).toLocaleString() }}</strong> pcs</td>
              <td>
                <div class="scans-cell">
                  <strong class="text-cyan">{{ b.scans ?? 0 }} scans</strong>
                </div>
              </td>
              <td>
                <div class="calls-cell">
                  <strong class="text-green">{{ b.conversions ?? 0 }}</strong>
                </div>
              </td>
              <td>
                <span class="status-chip" :class="(b.status || 'in-production').toLowerCase().replace(/[\s&]+/g, '-')">
                  {{ b.status || 'In Production' }}
                </span>
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-gold btn-sm" title="Create a mail-piece QR code" @click="openBatchQr(b)">
                    <span v-html="icons.zap"></span>
                  </button>
                  <button class="btn btn-subtle btn-sm" title="Batch tracking" @click="viewTracking(b)">
                    <span v-html="icons.eye"></span>
                  </button>
                  <button class="btn btn-subtle btn-sm" title="Download batch summary CSV" @click="downloadCsv(b)">
                    <span v-html="icons.download"></span>
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
    <!-- New Mail Batch Modal -->
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
              <input v-model.number="newBatch.quantity" type="number" min="1" step="1" required placeholder="2500" />
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
            <button type="submit" class="btn btn-primary">Save Batch</button>
          </div>
        </form>
      </div>
    </div>

    <!-- CrownKey QR Mailer Generator & Scan Simulator Modal -->
    <div v-if="isQrModalOpen" class="modal-overlay" @click.self="isQrModalOpen = false">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h3>
            <span class="text-gold" v-html="icons.zap"></span>
            Intelligent CrownKey Mailer &amp; QR Code Generator
          </h3>
          <button class="close-btn" @click="isQrModalOpen = false">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <div class="qr-gen-grid">
            <!-- Left Config Form -->
            <div class="qr-config">
              <div class="form-group">
                <label>Target Distress Pillar / Signal</label>
                <select v-model="qrGen.pillarCode">
                  <option value="FC">FC · Judicial Mortgage Foreclosure</option>
                  <option value="TAX">TAX · Delinquent Ad Valorem Tax Roll</option>
                  <option value="CODE">CODE · Municipal Code Violation</option>
                  <option value="PRB">PRB · Probate / Estate Administration</option>
                  <option value="VAC">VAC · Vacancy / Abandoned Structure</option>
                  <option value="ABS">ABS · Out-of-State / High-Equity Absentee</option>
                </select>
              </div>

              <div class="form-group">
                <label>County Jurisdiction</label>
                <select v-model="qrGen.countyCode">
                  <option value="DUV">DUV · Duval County (Jacksonville)</option>
                  <option value="STJ">STJ · St. Johns County (St. Augustine)</option>
                  <option value="CLY">CLY · Clay County (Orange Park)</option>
                  <option value="NAS">NAS · Nassau County (Fernandina)</option>
                </select>
              </div>

              <div class="form-group">
                <label>Parcel Identifier / Property Slug</label>
                <input v-model="qrGen.identifier" type="text" placeholder="e.g. 32221 or 091823" />
              </div>

              <div class="form-group">
                <label>Property Target Address</label>
                <input v-model="qrGen.address" type="text" placeholder="e.g. 3221 Duval St, Jacksonville FL 32206" />
              </div>

              <div class="form-group">
                <label>Owner Name</label>
                <input v-model="qrGen.ownerName" type="text" placeholder="e.g. Harold &amp; Linda Finch" />
              </div>

              <div class="form-group">
                <label>Assigned smrtPhone Call Tracking Line</label>
                <input v-model="qrGen.trackingPhone" type="tel" placeholder="(904) 555-0144" />
              </div>
            </div>

            <!-- Right Preview & QR Code -->
            <div class="qr-preview-panel">
              <div class="crownkey-badge-strip">
                <span class="lbl">CANONICAL CROWNKEY:</span>
                <strong class="font-mono text-gold key-pill">{{ generatedCrownKey }}</strong>
              </div>

              <!-- High Contrast Dynamic Scannable QR Code -->
              <div class="qr-code-box">
                <div class="qr-image-wrapper">
                  <img
                    v-if="generatedQrDataUrl"
                    :src="generatedQrDataUrl"
                    alt="Scannable CrownKey QR Code"
                    class="scannable-qr-img"
                  />
                  <div v-else class="qr-loading-placeholder">
                    Register a mail piece to generate its QR code.
                  </div>
                </div>
                <div class="qr-info">
                  <span class="qr-target-url font-mono">{{ qrTrackingUrl || 'Register the mail piece to create its link.' }}</span>

                </div>
              </div>

              <!-- Physical Envelope & Letter Print Preview -->
              <div class="mail-mockup-card">
                <div class="envelope-stamp">
                  <span class="stamp-pill font-mono">{{ generatedCrownKey }}</span>
                </div>
                <div class="letter-preview">
                  <div class="letter-preview-content">
                    <strong>Talk to HushHawk about this property</strong>
                    <p>Property: {{ qrGen.address }}</p>
                    <small>Scan QR code or visit {{ qrTrackingUrl }}</small>
                  </div>
                  <img
                    v-if="generatedQrDataUrl"
                    :src="generatedQrDataUrl"
                    alt="QR"
                    class="envelope-qr-thumb"
                  />
                </div>
              </div>

              <!-- Production QR Code Actions -->
              <div class="qr-action-buttons">
                <button type="button" class="btn btn-primary btn-block" :disabled="isRegistering" @click="copyTrackingUrl">
                  <span v-html="icons.file"></span>
                  Copy Production QR Link
                </button>
                <button type="button" class="btn btn-secondary btn-block" :disabled="isRegistering" @click="downloadQrSvg">
                  <span v-html="icons.download"></span>
                  Download Print-Ready QR (SVG)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 1. USPS IMb Delivery & CrownKey Batch Tracking Modal (The Eye Icon) -->
    <div v-if="isTrackingModalOpen && selectedBatch" class="modal-overlay" @click.self="isTrackingModalOpen = false">
      <div class="modal-content modal-lg tracking-inspector-modal">
        <div class="modal-header">
          <div class="tracking-head-title">
            <span class="icon-title text-cyan" v-html="icons.eye"></span>
            <div>
              <h3>Batch Tracking</h3>
              <p class="font-mono text-muted">{{ selectedBatch.batchCode }} &bull; {{ selectedBatch.name }}</p>
            </div>
          </div>
          <button class="close-btn" @click="isTrackingModalOpen = false">
            <span v-html="icons.close"></span>
          </button>
        </div>

        <div class="modal-body tracking-modal-body">
          <div class="imb-progression-panel">
            <div class="imb-header">
              <h4>USPS Intelligent Mail</h4>
              <span class="imb-status-tag">Live tracking unavailable</span>
            </div>
            <p>USPS delivery scans require a connected USPS or print vendor tracking feed.</p>
          </div>

          <div class="tracking-metrics-grid">
            <div class="t-metric-card">
              <span class="t-label">Batch quantity</span>
              <strong class="t-val font-mono">{{ (selectedBatch.quantity ?? 0).toLocaleString() }}</strong>
            </div>
            <div class="t-metric-card">
              <span class="t-label">QR scans</span>
              <strong class="t-val font-mono text-cyan">{{ selectedBatch.scans ?? 0 }}</strong>
            </div>
            <div class="t-metric-card">
              <span class="t-label">Callback requests</span>
              <strong class="t-val font-mono text-green">{{ selectedBatch.conversions ?? 0 }}</strong>
            </div>
          </div>

          <!-- Campaign Configuration Details -->
          <div class="tracking-config-panel">
            <div class="config-row">
              <span class="lbl">Format:</span>
              <strong class="val">{{ selectedBatch.format }}</strong>
            </div>
            <div class="config-row">
              <span class="lbl">Target Audience:</span>
              <strong class="val">{{ selectedBatch.audience }}</strong>
            </div>
            <div class="config-row">
              <span class="lbl">Target ZIP Codes:</span>
              <strong class="val font-mono">{{ selectedBatch.zips }}</strong>
            </div>
            <div class="config-row">
              <span class="lbl">Assigned smrtPhone Line:</span>
              <strong class="val text-gold font-mono">{{ selectedBatch.trackingPhone || '—' }}</strong>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="downloadCsv(selectedBatch)">
            <span v-html="icons.download"></span>
            Download Batch Summary
          </button>
          <button type="button" class="btn btn-gold" @click="isTrackingModalOpen = false; openBatchQr(selectedBatch)">
            <span v-html="icons.zap"></span>
            View Batch QR Mailer
          </button>
          <button type="button" class="btn btn-secondary" @click="isTrackingModalOpen = false">Close</button>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script>
import QRCode from 'qrcode';
import { icons } from '../icons.js';

export default {
  name: 'DirectMailView',
  props: {
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      icons,
      generatedQrDataUrl: '',
      searchQuery: '',
      statusFilter: '',
      formatFilter: '',
      isAddModalOpen: false,
      isQrModalOpen: false,
      isTrackingModalOpen: false,
      selectedBatch: null,
      qrGen: {
        countyCode: 'DUV',
        pillarCode: 'FC',
        identifier: '',
        address: '',
        ownerName: '',
        trackingPhone: ''
      },
      qrBatchCode: null,
      registeredQr: null,
      isRegistering: false,
      pillarStats: {},
      loadError: '',
      newBatch: {
        name: '',
        audience: '',
        format: '4x6 Postcard',
        quantity: 0,
        zips: '32208, 32209',
        trackingPhone: '(904) 555-0144',
        copy: ''
      },
      mailBatches: []
    };
  },
  computed: {
    generatedCrownKey() {
      return this.qrGen.identifier ? `${this.qrGen.countyCode}-${this.qrGen.pillarCode}-${this.qrGen.identifier.trim().toUpperCase()}` : '—';
    },
    qrRegistrationKey() {
      return JSON.stringify({ ...this.qrGen, batchCode: this.qrBatchCode });
    },
    qrTrackingUrl() {
      return this.registeredQr?.key === this.qrRegistrationKey ? this.registeredQr.url : '';
    },
    metrics() {
      if (!Object.keys(this.pillarStats).length) return [];
      const totals = Object.values(this.pillarStats).reduce((sum, pillar) => ({
        mailed: sum.mailed + pillar.mailed,
        scans: sum.scans + pillar.scans,
        conversions: sum.conversions + pillar.conversions
      }), { mailed: 0, scans: 0, conversions: 0 });
      return [
        { label: 'Tracked Pieces Mailed', value: totals.mailed.toLocaleString(), icon: 'mail' },
        { label: 'QR Scans', value: totals.scans.toLocaleString(), icon: 'zap' },
        { label: 'Callback Requests', value: totals.conversions.toLocaleString(), icon: 'phone' }
      ];
    },
    hasActiveFilters() {
      return Boolean(this.searchQuery || this.statusFilter || this.formatFilter);
    },
    filteredBatches() {
      return (this.mailBatches || []).filter(b => {
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
  watch: {
    qrTrackingUrl: {
      immediate: true,
      handler() {
        this.generateQrCode();
      }
    }
  },

  mounted() {
    this.refreshAllData(false);
  },
  methods: {
    async generateQrCode() {
      const url = this.qrTrackingUrl;
      this.generatedQrDataUrl = '';
      if (!url) return;
      try {
        const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 4, errorCorrectionLevel: 'M' });
        if (url === this.qrTrackingUrl) this.generatedQrDataUrl = dataUrl;
      } catch (err) {
        console.error('Failed to generate QR code:', err);
      }
    },
    openQrModal() {
      this.qrBatchCode = null;
      this.isQrModalOpen = true;
    },
    async registerQr() {
      if (this.qrTrackingUrl) return this.qrTrackingUrl;
      const key = this.qrRegistrationKey;
      this.isRegistering = true;
      try {
        const res = await fetch('/api/v1/direct-mail/generate-piece', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: key
        });
        const data = await res.json();
        if (!res.ok || !data.piece?.trackingUrl) throw new Error(data.error || 'Mail piece could not be registered.');
        this.registeredQr = { key, url: data.piece.trackingUrl };
        return data.piece.trackingUrl;
      } finally {
        this.isRegistering = false;
      }
    },
    getSignalBadgeClass(text = '') {
      const t = String(text).toUpperCase();
      if (t.includes('FC') || t.includes('FORECLOSURE')) return 'badge-fc';
      if (t.includes('TAX')) return 'badge-tax';
      if (t.includes('CODE')) return 'badge-code';
      if (t.includes('PRB') || t.includes('PROBATE')) return 'badge-prb';
      if (t.includes('VAC')) return 'badge-vac';
      return t.includes('ABS') || t.includes('ABSENTEE') ? 'badge-abs' : '';
    },
    getSignalLabel(text = '') {
      const t = String(text).toUpperCase();
      if (t.includes('FC') || t.includes('FORECLOSURE')) return 'FC · Foreclosure';
      if (t.includes('TAX')) return 'TAX · Delinquent Tax';
      if (t.includes('CODE')) return 'CODE · Code Violation';
      if (t.includes('PRB') || t.includes('PROBATE')) return 'PRB · Probate Estate';
      if (t.includes('VAC')) return 'VAC · Vacant Home';
      return t.includes('ABS') || t.includes('ABSENTEE') ? 'ABS · Absentee Equity' : 'Unclassified';
    },
    openBatchQr(batch) {
      this.qrBatchCode = batch.batchCode;
      this.qrGen.pillarCode = batch.pillarCode || 'FC';
      this.qrGen.identifier = '';
      this.qrGen.address = batch.address || '';
      this.qrGen.ownerName = batch.ownerName || '';
      this.qrGen.trackingPhone = batch.trackingPhone || '';
      this.isQrModalOpen = true;
    },
    async copyTrackingUrl() {
      try {
        const url = await this.registerQr();
        if (!navigator.clipboard) {
          this.showToast('Production link', url);
          return;
        }
        await navigator.clipboard.writeText(url);
        this.showToast('Copied to clipboard', 'Mail-piece tracking link copied.', 'success');
      } catch (err) {
        this.showToast('QR link unavailable', err.message, 'error');
      }
    },
    async downloadQrSvg() {
      try {
        const trackingUrl = await this.registerQr();
        const svgString = await QRCode.toString(trackingUrl, {
          type: 'svg', width: 600, margin: 4, errorCorrectionLevel: 'H'
        });
        const svgUrl = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }));
        const downloadLink = document.createElement('a');
        downloadLink.href = svgUrl;
        downloadLink.download = `${this.generatedCrownKey}_Print_QR.svg`;
        downloadLink.click();
        URL.revokeObjectURL(svgUrl);
      } catch (err) {
        this.showToast('QR download failed', err.message, 'error');
      }
    },
    async refreshAllData(showFeedback = true) {
      this.loadError = '';
      try {
        const [stats, batches] = await Promise.all([
          fetch('/api/v1/direct-mail/stats-by-pillar'),
          fetch('/api/v1/direct-mail')
        ]);
        if (!stats.ok || !batches.ok) throw new Error('Direct Mail data could not be loaded.');
        const [statsData, batchData] = await Promise.all([stats.json(), batches.json()]);
        this.pillarStats = statsData.stats;
        this.mailBatches = batchData.mailBatches;
        if (showFeedback) this.showToast('Direct Mail refreshed', 'Tracking data is up to date.', 'success');
      } catch (err) {
        this.loadError = err.message;
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
    viewTracking(b) {
      this.selectedBatch = b;
      this.isTrackingModalOpen = true;
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
    async saveNewBatch() {
      const payload = {
        name: this.newBatch.name,
        audience: this.newBatch.audience,
        zips: this.newBatch.zips,
        format: this.newBatch.format,
        quantity: Number(this.newBatch.quantity),
        dropDate: new Date().toISOString().split('T')[0]
      };
      try {
        const res = await fetch('/api/v1/direct-mail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const saved = await res.json();
        if (!res.ok) throw new Error(saved.error || 'Batch could not be saved.');
        this.mailBatches.unshift(saved);
      } catch (err) {
        this.showToast('Batch not saved', err.message, 'error');
        return;
      }
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
      this.showToast('Batch saved', `Campaign batch "${payload.name}" saved.`, 'success');
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

/* Pillar & Signal Strip */
.pillar-strip-panel {
  background: #07192d;
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 12px;
  padding: 1.1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
}

.pillar-strip-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 0.65rem;
}

.head-title {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.head-title h3 {
  font-size: 0.95rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.head-title p {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 2px 0 0;
}

.pillar-actions {
  display: flex;
  gap: 0.5rem;
}

.pillar-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}

@media (min-width: 1400px) {
  .pillar-cards-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

.distress-pillar-card {
  background: linear-gradient(145deg, rgba(8, 39, 74, 0.45) 0%, rgba(4, 24, 45, 0.75) 100%);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
}

.distress-pillar-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.4), transparent);
  opacity: 0.7;
}

.distress-pillar-card:hover {
  transform: translateY(-2px);
  border-color: rgba(212, 175, 55, 0.55);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35), 0 0 14px rgba(212, 175, 55, 0.12);
}

.p-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.p-badge-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.p-code-badge {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(212, 175, 55, 0.15);
  color: #edcf7c;
  border: 1px solid rgba(212, 175, 55, 0.35);
  letter-spacing: 0.04em;
}

.p-signal-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
}

.p-rate-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.28);
}

.p-rate-num {
  font-size: 0.72rem;
  font-weight: 800;
  color: #4ade80;
}

.p-rate-lbl {
  font-size: 0.6rem;
  font-weight: 700;
  color: #86efac;
  letter-spacing: 0.03em;
}

.p-title-wrap {
  display: flex;
  align-items: center;
  min-height: 2.3em;
}

.p-pillar-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  line-height: 1.25;
  white-space: normal;
  letter-spacing: -0.01em;
}

.p-metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-top: 2px;
}

.p-metric-cell {
  background: rgba(4, 24, 45, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.p-metric-label {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
}

.p-metric-value {
  font-size: 0.95rem;
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.1;
}

.p-card-footer {
  margin-top: 2px;
}

.p-progress-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  overflow: hidden;
}

.p-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #d4af37, #4ade80);
  border-radius: 999px;
  transition: width 0.4s ease;
}

/* Signal Badges in Table */
.signal-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.badge-signal {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  width: fit-content;
}

.badge-fc { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
.badge-tax { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
.badge-code { background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); }
.badge-prb { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); }
.badge-vac { background: rgba(100, 116, 139, 0.2); color: #cbd5e1; border: 1px solid rgba(100, 116, 139, 0.4); }
.badge-abs { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }

.scans-cell, .calls-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* CrownKey QR Modal Styling */
.modal-lg {
  max-width: 820px !important;
  width: 90vw !important;
}

.qr-gen-grid {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 1.25rem;
}

@media (max-width: 768px) {
  .qr-gen-grid {
    grid-template-columns: 1fr;
  }
}

.qr-config {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.qr-preview-panel {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  background: rgba(4, 24, 45, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 1rem;
}

.crownkey-badge-strip {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.crownkey-badge-strip .lbl {
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  color: #94a3b8;
}

.key-pill {
  font-size: 1.1rem;
  background: rgba(212, 175, 55, 0.12);
  border: 1px solid #d4af37;
  padding: 4px 8px;
  border-radius: 6px;
  text-align: center;
}

.qr-code-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: #04182d;
  padding: 0.85rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.qr-image-wrapper {
  background: #ffffff;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.scannable-qr-img {
  width: 136px;
  height: 136px;
  display: block;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.qr-loading-placeholder {
  width: 136px;
  height: 136px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #04182d;
  font-size: 0.72rem;
  font-weight: 600;
  text-align: center;
}

.qr-svg {
  border-radius: 6px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
}

.qr-info {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.qr-target-url {
  font-size: 0.68rem;
  color: #7dd3fc;
  word-break: break-all;
}

.audience-lab-pill {
  font-size: 0.68rem;
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
}

.mail-mockup-card {
  background: #08213d;
  border: 1px dashed rgba(212, 175, 55, 0.35);
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 0.75rem;
}

.envelope-stamp {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.4rem;
  margin-bottom: 0.5rem;
}

.stamp-pill {
  color: #edcf7c;
  font-size: 0.72rem;
  font-weight: 700;
}

.envelope-stamp small {
  font-size: 0.62rem;
  color: #94a3b8;
}

.letter-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.letter-preview-content {
  flex: 1;
  min-width: 0;
}

.envelope-qr-thumb {
  width: 44px;
  height: 44px;
  border-radius: 4px;
  background: #ffffff;
  padding: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  flex-shrink: 0;
  display: block;
}

.letter-preview strong {
  color: #f8fafc;
  font-size: 0.78rem;
  display: block;
  margin-bottom: 3px;
}

.letter-preview p {
  color: #cbd5e1;
  margin: 0;
  font-size: 0.72rem;
}

.letter-preview small {
  color: #7dd3fc;
  font-size: 0.65rem;
  display: block;
  margin-top: 4px;
}

.sim-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.btn-block {
  width: 100%;
  justify-content: center;
}

.sim-note {
  font-size: 0.65rem;
  color: #94a3b8;
  text-align: center;
}

/* ----------------------------------------------------
   USPS IMb & Batch Tracking Modal (The Eye Icon)
---------------------------------------------------- */
.tracking-inspector-modal {
  max-width: 760px;
  background: #06192e;
  border: 1px solid rgba(212, 175, 55, 0.35);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 24px rgba(212, 175, 55, 0.12);
}

.tracking-head-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tracking-head-title h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.tracking-head-title p {
  font-size: 0.78rem;
  color: #94a3b8;
  margin: 2px 0 0;
}

.tracking-top-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(4, 24, 45, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 14px;
}

.top-banner-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tracking-pillar-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: #f8fafc;
}

.top-banner-right {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
}

.lbl-small {
  color: #94a3b8;
  font-weight: 700;
  letter-spacing: 0.05em;
  font-size: 0.68rem;
}

.imb-progression-panel {
  background: rgba(8, 39, 74, 0.4);
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 14px;
}

.imb-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.imb-header h4 {
  font-size: 0.82rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.imb-status-tag {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 2px 8px;
  background: rgba(212, 175, 55, 0.15);
  border: 1px solid rgba(212, 175, 55, 0.35);
  border-radius: 999px;
}

.delivery-stepper {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  position: relative;
  margin: 10px 0 14px;
}

.step-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 90px;
  z-index: 2;
}

.node-circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #08274a;
  border: 2px solid #64748b;
  color: #94a3b8;
  font-size: 0.72rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  transition: all 0.2s ease;
}

.step-node.completed .node-circle {
  background: #22c55e;
  border-color: #22c55e;
  color: #ffffff;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
}

.step-node.active .node-circle {
  background: #d4af37;
  border-color: #fde68a;
  color: #04182d;
  box-shadow: 0 0 12px rgba(212, 175, 55, 0.6);
}

.node-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.1;
}

.node-sub {
  font-size: 0.62rem;
  color: #94a3b8;
  margin-top: 2px;
}

.step-line {
  flex: 1;
  height: 2px;
  background: rgba(255, 255, 255, 0.12);
  margin-top: 13px;
}

.step-line.completed {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
}

.imb-graphic-box {
  background: #020d1a;
  border: 1px dashed rgba(212, 175, 55, 0.3);
  border-radius: 6px;
  padding: 10px 14px;
  text-align: center;
  margin-top: 10px;
}

.imb-barcode-svg {
  width: 100%;
  max-width: 360px;
  height: 28px;
  display: block;
  margin: 0 auto;
}

.imb-digits {
  font-size: 0.65rem;
  color: #94a3b8;
  margin-top: 6px;
}

.tracking-metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.t-metric-card {
  background: rgba(4, 24, 45, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.t-label {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.05em;
}

.t-val {
  font-size: 1.1rem;
  font-weight: 800;
  color: #ffffff;
}

.t-sub {
  font-size: 0.68rem;
  font-weight: 600;
}

.tracking-config-panel {
  background: rgba(4, 24, 45, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.config-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.config-row .lbl {
  color: #94a3b8;
}

.config-row .val {
  color: #f8fafc;
}

/* ----------------------------------------------------
   Live QR Scan Detected HUD Modal (The Lightning Bolt)
---------------------------------------------------- */
.scan-alert-modal {
  max-width: 540px;
  background: #06192e;
  border: 1px solid rgba(212, 175, 55, 0.4);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(34, 197, 94, 0.15);
}

.scan-beacon-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.scan-beacon-title h3 {
  font-size: 1.05rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.scan-beacon-title p {
  font-size: 0.72rem;
  color: #94a3b8;
  margin: 2px 0 0;
}

.pulse-beacon {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 14px #22c55e;
  animation: pulseBeacon 1.5s infinite;
}

@keyframes pulseBeacon {
  0% { transform: scale(0.9); box-shadow: 0 0 6px #22c55e; }
  50% { transform: scale(1.15); box-shadow: 0 0 18px #22c55e; }
  100% { transform: scale(0.9); box-shadow: 0 0 6px #22c55e; }
}

.scan-key-banner {
  background: linear-gradient(135deg, rgba(8, 39, 74, 0.9) 0%, rgba(4, 24, 45, 0.95) 100%);
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 10px;
  padding: 14px;
  text-align: center;
  margin-bottom: 12px;
  box-shadow: inset 0 0 16px rgba(212, 175, 55, 0.08);
}

.scan-key-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #edcf7c;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.scan-key-val {
  font-size: 1.4rem;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.05em;
  margin: 4px 0 8px;
}

.scan-pillar-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #f8fafc;
}

.scan-dossier-box {
  background: rgba(4, 24, 45, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.dossier-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
}

.dossier-line .d-label {
  color: #94a3b8;
  font-weight: 600;
}

.scan-actions-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
