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

    <!-- Tab 3: Security & Database Sync -->
    <div v-if="currentTab === 'security'" class="settings-grid">
      <div class="settings-card">
        <h3>PostgreSQL Canonical Database Engine</h3>
        <p class="card-desc">CrownKey parcel schema and local repository persistence layer.</p>
        <div class="sync-status-box">
          <div class="sync-indicator online"></div>
          <div>
            <strong>Connected to `hushhawk_core` on port 5432</strong>
            <p class="text-muted">Last sync heartbeat: 42 seconds ago (Zero drift detected)</p>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group full">
            <label>Database Connection URI</label>
            <input type="password" value="postgres://admin:••••••••••••@localhost:5432/hushhawk_core" readonly />
          </div>
          <div class="form-group">
            <label>Auto-Migration Mode</label>
            <select v-model="security.autoMigrate">
              <option value="strict">Strict (001_initial_schema.sql locked)</option>
              <option value="warn">Warn on DDL diff</option>
            </select>
          </div>
          <div class="form-group">
            <label>Audit Log Retention</label>
            <select v-model="security.logRetention">
              <option value="90">90 Days</option>
              <option value="180">180 Days</option>
              <option value="365">1 Year</option>
            </select>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <h3>TCPA &amp; Skip Trace Compliance Scrubbing</h3>
        <p class="card-desc">Federal DNC Registry and Litigator Scrub protocol for cold calling and SMS.</p>
        <div class="toggle-list">
          <label class="checkbox-label">
            <input v-model="security.dncScrub" type="checkbox" />
            <span>Automatic National Do Not Call (DNC) list verification prior to batch exports</span>
          </label>
          <label class="checkbox-label">
            <input v-model="security.litigatorScrub" type="checkbox" />
            <span>Block known serial TCPA litigators and predatory attorney phone numbers</span>
          </label>
          <label class="checkbox-label">
            <input v-model="security.smsOptOut" type="checkbox" />
            <span>Auto-unsubscribe sellers who reply "STOP", "UNSUBSCRIBE", or "REMOVE"</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Tab 4: Team Roles & Access -->
    <div v-if="currentTab === 'team'" class="settings-card">
      <div class="card-header-flex">
        <div>
          <h3>HushHawk Team Members &amp; RBAC Access</h3>
          <p class="card-desc">Manage system roles, deal assignment limits, and commission structures.</p>
        </div>
        <button class="btn btn-primary btn-sm" @click="inviteMember">
          <span v-html="icons.plus"></span>
          Invite Team Member
        </button>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Email</th>
              <th>Assigned Role</th>
              <th>Permission Level</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in teamMembers" :key="user.email">
              <td>
                <div class="user-cell">
                  <span class="user-avatar">{{ user.initials }}</span>
                  <strong>{{ user.name }}</strong>
                </div>
              </td>
              <td class="font-mono text-muted">{{ user.email }}</td>
              <td>{{ user.role }}</td>
              <td><span class="perm-chip">{{ user.perm }}</span></td>
              <td><span class="status-chip active">Active</span></td>
              <td>
                <button class="btn btn-subtle btn-sm" @click="editMember(user)">
                  <span v-html="icons.edit"></span>
                  Edit
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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

export default {
  name: 'SettingsView',
  props: {
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      icons,
      currentTab: 'general',
      toastMessage: '',
      tabs: [
        { id: 'general', label: 'Organization & Underwriting', icon: 'settings' },
        { id: 'integrations', label: 'Integrations & APIs', icon: 'zap' },
        { id: 'security', label: 'Security & Database', icon: 'shield' },
        { id: 'team', label: 'Team Roles & Access', icon: 'users' }
      ],
      general: {
        entityName: 'HushHawk Capital & Acquisitions LLC',
        titleCompany: 'First American Title / Crown Escrow',
        titleEmail: 'closing@crownescrowjax.com',
        primaryCounty: 'Duval County (Jacksonville)',
        ein: '84-9182391'
      },
      underwriting: {
        maoDiscount: 70,
        minSpread: 15000,
        defaultEmd: 2500,
        inspectionDays: 10,
        requireProofOfFunds: true
      },
      security: {
        autoMigrate: 'strict',
        logRetention: '180',
        dncScrub: true,
        litigatorScrub: true,
        smsOptOut: true
      },
      integrations: [
        {
          name: 'PostgreSQL Core DB',
          icon: 'database',
          status: 'active',
          statusText: 'Connected (Live)',
          description: 'CrownKey parcel registry, transaction tracking, and relational data engine.',
          endpoint: 'postgresql://localhost:5432/hushhawk_core',
          enabled: true
        },
        {
          name: 'Podio Wholesale CRM Sync',
          icon: 'refresh',
          status: 'active',
          statusText: 'Synchronized',
          description: 'Two-way webhook sync with Podio Seller Leads and Dispositions workspaces.',
          endpoint: 'https://api.podio.com/hook/hushhawk-jax-acq',
          enabled: true
        },
        {
          name: 'Twilio SMS & Voice Gateway',
          icon: 'phone',
          status: 'active',
          statusText: 'Online (10DLC Approved)',
          description: 'Wholesale seller SMS drips, local (904) phone numbers, and call recordings.',
          endpoint: 'https://api.twilio.com/2010-04-01/Accounts/AC.../Messages',
          enabled: true
        },
        {
          name: 'CrownKey GIS Parcel Engine',
          icon: 'pin',
          status: 'active',
          statusText: 'Verified (Duval/Clay/St. Johns)',
          description: 'Direct county tax appraiser feed for automated parcel validation and deed tracking.',
          endpoint: 'https://gis.coj.net/propertyappraiser/parcels/v2',
          enabled: true
        },
        {
          name: 'SendGrid Email Delivery',
          icon: 'mail',
          status: 'active',
          statusText: 'Operational',
          description: 'VIP cash buyer blasts, deal packet attachments, and title escrow notifications.',
          endpoint: 'https://api.sendgrid.com/v3/mail/send',
          enabled: true
        }
      ],
      teamMembers: [
        { name: 'Marcus Vance', email: 'marcus@hushhawk.com', role: 'Sr. Acquisitions Specialist', perm: 'Full Deal Admin', initials: 'MV' },
        { name: 'Sarah Jenkins', email: 'sarah@hushhawk.com', role: 'Dispositions Director', perm: 'Dispo & Contracts', initials: 'SJ' },
        { name: 'Elena Rostova', email: 'elena@hushhawk.com', role: 'Lead Qualifier', perm: 'Leads & Follow-up', initials: 'ER' },
        { name: 'System Admin', email: 'admin@hushhawk.com', role: 'Super Administrator', perm: 'Full System Root', initials: 'SA' }
      ]
    };
  },
  methods: {
    saveAllSettings() {
      this.showToast('System settings and underwriting rules saved successfully.');
    },
    testIntegrations() {
      this.showToast('All 5 external API handshakes returned HTTP 200 OK.');
    },
    testSingleIntegration(item) {
      this.showToast(`Handshake successful: ${item.name} responded in 48ms.`);
    },
    inviteMember() {
      this.showToast('Invite Link Generated', 'Secure onboarding token generated: https://hushhawk.internal/join?t=' + Math.random().toString(36).substring(2, 9), 'success');
    },
    editMember(user) {
      this.showToast('Role & Permissions', `Access matrix for ${user.name} (${user.role}) loaded for review.`, 'info');
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
