<template>
  <div class="view-container">
    <div class="settings-header">
      <div class="header-info">
        <h2>
          <span class="icon-title" v-html="icons.settings"></span>
          Enterprise System Configuration
        </h2>
        <span class="settings-subtitle">HushHawk Real Estate Intelligence Infrastructure</span>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="testIntegrations">
          <span v-html="icons.refresh"></span>
          Test API Handshakes
        </button>
        <button class="btn btn-primary" @click="saveAllSettings">
          <span v-html="icons.check"></span>
          Save System Changes
        </button>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="tabs-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: currentTab === tab.id }"
        @click="currentTab = tab.id"
      >
        <span v-html="icons[tab.icon]"></span>
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab 1: General Organization & Wholesale Parameters -->
    <div v-if="currentTab === 'general'" class="settings-grid">
      <div class="settings-card">
        <h3>Organization &amp; Entity Profile</h3>
        <p class="card-desc">Default legal entity names applied to Purchase and Sale Agreements (PSA) and Title Escrow instructions.</p>
        <div class="form-grid">
          <div class="form-group full">
            <label>Operating Entity Name</label>
            <input v-model="general.entityName" type="text" />
          </div>
          <div class="form-group">
            <label>Primary Escrow / Title Partner</label>
            <input v-model="general.titleCompany" type="text" />
          </div>
          <div class="form-group">
            <label>Title Officer Email</label>
            <input v-model="general.titleEmail" type="email" />
          </div>
          <div class="form-group">
            <label>CrownKey Default County</label>
            <select v-model="general.primaryCounty">
              <option value="Duval County (Jacksonville)">Duval County (Jacksonville)</option>
              <option value="Clay County (Orange Park / Green Cove)">Clay County</option>
              <option value="St. Johns County (St. Augustine)">St. Johns County</option>
            </select>
          </div>
          <div class="form-group">
            <label>Tax ID / EIN</label>
            <input v-model="general.ein" type="text" class="font-mono" />
          </div>
        </div>
      </div>

      <div class="settings-card">
        <h3>Wholesale Deal &amp; Underwriting Defaults</h3>
        <p class="card-desc">Default parameters loaded into the Deal Analyzer and Acquisitions underwriting engine.</p>
        <div class="form-grid">
          <div class="form-group">
            <label>Default MAO Discount Factor (%)</label>
            <input v-model.number="underwriting.maoDiscount" type="number" />
          </div>
          <div class="form-group">
            <label>Minimum Target Spread ($)</label>
            <input v-model.number="underwriting.minSpread" type="number" />
          </div>
          <div class="form-group">
            <label>Standard Earnest Money Deposit ($)</label>
            <input v-model.number="underwriting.defaultEmd" type="number" />
          </div>
          <div class="form-group">
            <label>Default Inspection Period (Days)</label>
            <input v-model.number="underwriting.inspectionDays" type="number" />
          </div>
          <div class="form-group full">
            <label class="checkbox-label">
              <input v-model="underwriting.requireProofOfFunds" type="checkbox" />
              <span>Mandate VIP Cash Buyer Proof of Funds (POF) verification prior to sending dispo packets</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2: Integrations & API Connections -->
    <div v-if="currentTab === 'integrations'" class="integrations-list">
      <div v-for="item in integrations" :key="item.name" class="integration-item">
        <div class="integration-meta">
          <div class="integration-icon" :class="item.status">
            <span v-html="icons[item.icon]"></span>
          </div>
          <div class="integration-info">
            <div class="int-title-row">
              <h4>{{ item.name }}</h4>
              <span class="status-chip" :class="item.status">{{ item.statusText }}</span>
            </div>
            <p>{{ item.description }}</p>
            <div class="int-endpoint font-mono">{{ item.endpoint }}</div>
          </div>
        </div>
        <div class="integration-controls">
          <label class="toggle-switch">
            <input v-model="item.enabled" type="checkbox" />
            <span class="toggle-slider"></span>
          </label>
          <button class="btn btn-secondary btn-sm" @click="testSingleIntegration(item)">
            <span v-html="icons.refresh"></span>
            Ping
          </button>
        </div>
      </div>
    </div>

    <!-- Tab 3: Security & Storage (read from the server; nothing here is preset) -->
    <div v-if="currentTab === 'security'" class="settings-grid">
      <div class="settings-card">
        <h3>Private File Storage</h3>
        <p class="card-desc">Where property photos and documents are stored.</p>
        <div class="session-details-box">
          <div class="session-detail-item">
            <span class="detail-label">Status:</span>
            <strong class="detail-value">{{ security.s3Status || 'Not reported' }}</strong>
          </div>
          <div class="session-detail-item">
            <span class="detail-label">Bucket:</span>
            <code class="detail-code">{{ security.s3Bucket || 'Not configured' }}</code>
          </div>
          <div class="session-detail-item">
            <span class="detail-label">Region:</span>
            <code class="detail-code">{{ security.s3Region || 'Not configured' }}</code>
          </div>
          <div class="session-detail-item">
            <span class="detail-label">Encryption:</span>
            <code class="detail-code">{{ security.s3Encryption || 'Not reported' }}</code>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <div class="session-header-row">
          <div>
            <h3>Current Session</h3>
            <p class="card-desc">The account you are signed in with.</p>
          </div>
          <span class="session-badge-active">ACTIVE SESSION</span>
        </div>
        <div class="session-details-box">
          <div class="session-detail-item">
            <span class="detail-label">Name:</span>
            <strong class="detail-value text-gold">{{ sessionUser.name || 'Unknown' }}</strong>
          </div>
          <div class="session-detail-item">
            <span class="detail-label">Email:</span>
            <code class="detail-code">{{ sessionUser.email || 'Unknown' }}</code>
          </div>
          <div class="session-detail-item">
            <span class="detail-label">Role:</span>
            <span class="detail-value">{{ sessionUser.roleName || sessionUser.role || 'Unknown' }}</span>
          </div>
        </div>
        <div class="session-actions">
          <button type="button" class="btn btn-danger btn-logout-action" @click="handleLogout">
            <span>Log Out &amp; Terminate Session</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Tab 4: CrownKey control (review queue, events, imports, dictionary, graph sync) -->
    <div v-if="currentTab === 'crownkey'" class="settings-card">
      <CrownKeyControl />
    </div>

    <!-- Success Toast Notification -->
    <div v-if="toastMessage" class="toast-popup">
      <span v-html="icons.check"></span>
      {{ toastMessage }}
    </div>
  </div>
</template>

<script>
import { icons } from '../icons.js';
import CrownKeyControl from './CrownKeyControl.vue';

export default {
  name: 'SettingsView',
  components: { CrownKeyControl },
  props: {
    content: { type: Object, default: () => ({}) }
  },
  computed: {
    sessionUser() {
      try {
        const raw = window.sessionStorage.getItem('hushhawk_session') || window.localStorage.getItem('hushhawk_session');
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed.user || parsed;
      } catch (e) {
        return {};
      }
    }
  },
  data() {
    return {
      icons,
      currentTab: 'general',
      toastMessage: '',
      tabs: [
        { id: 'general', label: 'Organization & Underwriting', icon: 'settings' },
        { id: 'integrations', label: 'Integrations & APIs', icon: 'zap' },
        { id: 'security', label: 'Security & Storage', icon: 'shield' },
        { id: 'crownkey', label: 'CrownKey Control', icon: 'database' }
      ],
      general: { entityName: '', titleCompany: '', titleEmail: '', primaryCounty: '', ein: '' },
      underwriting: { maoDiscount: null, minSpread: null, defaultEmd: null, inspectionDays: null, requireProofOfFunds: false },
      security: { s3Bucket: '', s3Region: '', s3Encryption: '', s3Status: '' },
      integrations: [],
    };
  },
  mounted() {
    this.loadSettings();
  },
  methods: {
    async loadSettings() {
      try {
        const res = await fetch('/api/v1/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.general) Object.assign(this.general, data.general);
          if (data.underwriting) Object.assign(this.underwriting, data.underwriting);
          if (data.security) Object.assign(this.security, data.security);
          if (data.integrations && data.integrations.length) {
            this.integrations = data.integrations;
          }
        }
      } catch (err) {
        this.showToast('Settings could not be loaded: ' + err.message, 'error');
      }
    },
    async saveAllSettings() {
      try {
        const payload = {
          general: this.general,
          underwriting: this.underwriting
        };
        const res = await fetch('/api/v1/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          this.showToast('System settings and underwriting rules saved successfully to canonical database.', 'success');
        } else {
          this.showToast('Failed to save settings to server.', 'error');
        }
      } catch (err) {
        this.showToast('Error saving settings: ' + err.message, 'error');
      }
    },
    async testIntegrations() {
      this.showToast('Running live diagnostics on all enterprise integrations...', 'info');
      try {
        const res = await fetch('/api/v1/integrations/test-all', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          const failed = (data.results || []).filter(r => !r.ok);
          this.integrations = this.integrations.map(item => {
            const hit = (data.results || []).find(r => item.name.toLowerCase().includes(r.key) || r.name === item.name);
            return hit ? { ...item, status: hit.ok ? 'active' : 'error', statusText: hit.statusText } : item;
          });
          this.showToast('Diagnostics complete', failed.length ? `${failed.length} integration(s) need attention.` : 'Every integration responded.', failed.length ? 'error' : 'success');
        } else {
          this.showToast('Diagnostics Error', 'Server returned error status.', 'error');
        }
      } catch (e) {
        this.showToast('Diagnostics Error', e.message, 'error');
      }
    },
    async testSingleIntegration(item) {
      this.showToast(`Pinging ${item.name}...`, 'info');
      try {
        const res = await fetch('/api/v1/integrations/test/' + encodeURIComponent(item.name), { method: 'POST' });
        const data = await res.json();
        item.statusText = data.message;
        item.status = data.ok ? 'active' : 'error';
        this.showToast(`Handshake Live (${data.latencyMs}ms)`, data.message, data.ok ? 'success' : 'error');
      } catch (e) {
        this.showToast('Test Error', e.message, 'error');
      }
    },
    showToast(title, msg, type = 'info') {
      this.toastMessage = msg || title;
      if (typeof window !== 'undefined') {
        if (window.showHushHawkToast) {
          window.showHushHawkToast(title, msg || title, type);
        } else {
          window.dispatchEvent(new CustomEvent('hushhawk-toast', { detail: { title, message: msg || title, type } }));
        }
      }
      setTimeout(() => {
        this.toastMessage = '';
      }, 3500);
    },
    handleLogout() {
      if (typeof window !== 'undefined') {
        if (typeof window.hushhawkLogout === 'function') {
          window.hushhawkLogout();
          return;
        }
        try {
          window.sessionStorage.removeItem('hushhawk_session');
          window.localStorage.removeItem('hushhawk_session');
          window.localStorage.removeItem('ww-auth-session');
          window.localStorage.removeItem('hushhawk_auth_token');
        } catch (e) {
          console.error('Logout error:', e);
        }
        window.location.href = '/login';
      }
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

.settings-header {
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
  flex-wrap: wrap;
  gap: 1rem;
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

.settings-subtitle {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 0.2rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.tabs-nav {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.5rem;
  overflow-x: auto;
  max-width: 100%;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.tab-btn:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.04);
}

.tab-btn.active {
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
}

.settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1.25rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.settings-card {
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

.settings-card h3 {
  font-size: 1.05rem;
  color: #f8fafc;
  margin: 0;
}

.card-desc {
  font-size: 0.8rem;
  color: #94a3b8;
  margin: -0.5rem 0 0.5rem 0;
  line-height: 1.4;
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

.form-group input,
.form-group select {
  background: #04182d;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 0.45rem 0.65rem;
  color: #f8fafc;
  font-size: 0.825rem;
  outline: none;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #cbd5e1;
  cursor: pointer;
}

.integrations-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.integration-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #07192d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 1.15rem 1.25rem;
}

.integration-meta {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  flex: 1;
}

.integration-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
  flex-shrink: 0;
}

.integration-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.int-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.int-title-row h4 {
  font-size: 0.95rem;
  color: #f8fafc;
  margin: 0;
}

.status-chip {
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-weight: 600;
}

.status-chip.active {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.integration-info p {
  font-size: 0.8rem;
  color: #94a3b8;
  margin: 0;
}

.int-endpoint {
  font-size: 0.7rem;
  color: #64748b;
}

.integration-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 22px;
  transition: 0.2s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.2s;
}

input:checked + .toggle-slider {
  background-color: #edcf7c;
}

input:checked + .toggle-slider:before {
  transform: translateX(18px);
  background-color: #04182d;
}

.sync-status-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.8rem;
  color: #f8fafc;
}

.sync-indicator.online {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 8px #4ade80;
}

.security-session-card {
  border: 1px solid rgba(239, 68, 68, 0.3) !important;
  background: rgba(15, 23, 42, 0.75) !important;
}

.session-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 1rem;
}

.session-badge-active {
  font-size: 10px;
  font-weight: 800;
  color: #34d399;
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.3);
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.session-details-box {
  background: rgba(6, 23, 44, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 1.25rem;
}

.session-detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.detail-label {
  color: #94a3b8;
  font-size: 12px;
}

.detail-value {
  font-weight: 600;
}

.text-gold {
  color: #f5cf72 !important;
}

.text-emerald {
  color: #34d399 !important;
}

.detail-code {
  font-family: monospace;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 8px;
  border-radius: 4px;
  color: #e2e8f0;
}

.session-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-logout-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #dc2626 !important;
  color: #ffffff !important;
  border: 1px solid #ef4444 !important;
  padding: 8px 16px !important;
  border-radius: 6px !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

.btn-logout-action:hover {
  background: #b91c1c !important;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35) !important;
}

.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.825rem;
  text-align: left;
}

.data-table th {
  background: rgba(255, 255, 255, 0.03);
  color: #94a3b8;
  padding: 0.65rem 0.75rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.data-table td {
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
}

.perm-chip {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  color: #cbd5e1;
}

.toast-popup {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: #04182d;
  border: 1px solid #edcf7c;
  color: #edcf7c;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  z-index: 2000;
}

.font-mono {
  font-family: monospace;
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

@media (max-width: 1200px) {
  .settings-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
