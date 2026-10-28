<template>
  <div class="view-container">
    <!-- Top Metrics -->
    <div class="metrics-grid">
      <div v-for="(m, i) in metrics" :key="m.label" class="metric-card">
        <div class="metric-icon-wrap" :class="{ gold: i === 1, cyan: i === 0, green: i === 2, purple: i === 3 }">
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
            <span class="icon-title" v-html="icons.zap"></span>
            Event-Driven Wholesale Automations &amp; Webhooks
          </h2>
          <span class="badge-count">{{ automations.length }} active rules</span>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" @click="testAllWorkflows">
            <span v-html="icons.refresh"></span>
            Test Triggers
          </button>
          <button class="btn btn-primary" @click="isAddModalOpen = true">
            <span v-html="icons.plus"></span>
            Create Automation
          </button>
        </div>
      </div>

      <!-- Automations Rules List -->
      <div class="automations-grid">
        <div
          v-for="rule in automations"
          :key="rule.id"
          class="rule-card"
          :class="{ inactive: !rule.enabled }"
        >
          <div class="rule-top">
            <div class="rule-icon-box" :class="rule.category.toLowerCase()">
              <span v-html="icons[rule.icon]"></span>
            </div>
            <div class="rule-title-box">
              <div class="rule-name-row">
                <h4>{{ rule.name }}</h4>
                <span class="rule-category">{{ rule.category }}</span>
              </div>
              <p class="rule-desc">{{ rule.description }}</p>
            </div>
            <div class="rule-toggle">
              <label class="toggle-switch">
                <input v-model="rule.enabled" type="checkbox" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div class="rule-flow">
            <div class="flow-step trigger">
              <span class="step-badge">TRIGGER</span>
              <span class="step-text">{{ rule.trigger }}</span>
            </div>
            <div class="flow-arrow">
              <span v-html="icons.arrowUpRight"></span>
            </div>
            <div class="flow-step action">
              <span class="step-badge">ACTION</span>
              <span class="step-text">{{ rule.action }}</span>
            </div>
          </div>

          <div class="rule-footer">
            <div class="rule-stats">
              <span>Runs: <strong>{{ rule.runsCount }}</strong></span>
              <span>Success: <strong class="text-green">{{ rule.successRate }}</strong></span>
              <span>Last: <span class="text-muted">{{ rule.lastRun }}</span></span>
            </div>
            <button class="btn btn-subtle btn-sm" @click="runManual(rule)">
              <span v-html="icons.zap"></span>
              Trigger Now
            </button>
          </div>
        </div>
      </div>

      <!-- Real-time Audit Log Section -->
      <div class="audit-section">
        <div class="audit-header">
          <h3>
            <span v-html="icons.database"></span>
            Recent Execution Audit Stream
          </h3>
          <span class="badge-sub">Live Event Bus</span>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Execution ID</th>
                <th>Workflow Rule</th>
                <th>Target Asset / Contact</th>
                <th>Latency</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in auditLogs" :key="log.id">
                <td class="font-mono text-muted">#{{ log.id }}</td>
                <td><strong>{{ log.workflow }}</strong></td>
                <td>{{ log.target }}</td>
                <td class="font-mono">{{ log.latency }}</td>
                <td>
                  <span class="status-chip success">
                    <span v-html="icons.check" class="tiny-icon"></span>
                    {{ log.status }}
                  </span>
                </td>
                <td class="font-mono text-muted">{{ log.time }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create Automation Modal -->
    <div v-if="isAddModalOpen" class="modal-overlay" @click.self="isAddModalOpen = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>
            <span v-html="icons.zap"></span>
            Configure New Automation Workflow
          </h3>
          <button class="close-btn" @click="isAddModalOpen = false">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <form class="modal-body" @submit.prevent="saveNewAutomation">
          <div class="form-grid">
            <div class="form-group full">
              <label>Workflow Name *</label>
              <input v-model="newRule.name" type="text" required placeholder="e.g. Under Contract Title Escrow Dispatch" />
            </div>
            <div class="form-group">
              <label>Category</label>
              <select v-model="newRule.category">
                <option value="Lead Ingestion">Lead Ingestion</option>
                <option value="Title Escrow">Title Escrow</option>
                <option value="Buyer Dispo">Buyer Dispo</option>
                <option value="Skip Tracing">Skip Tracing</option>
              </select>
            </div>
            <div class="form-group">
              <label>Trigger Event</label>
              <select v-model="newRule.trigger">
                <option value="New Lead Webhook Received">New Lead Webhook Received</option>
                <option value="PSA Executed in DocuSign">PSA Executed in DocuSign</option>
                <option value="Tax Delinquent Flag Detected">Tax Delinquent Flag Detected</option>
                <option value="Cash Buyer Buy Box Matched">Cash Buyer Buy Box Matched</option>
              </select>
            </div>
            <div class="form-group full">
              <label>Action to Execute</label>
              <input v-model="newRule.action" type="text" required placeholder="e.g. Dispatch Twilio 10DLC SMS with Cash Offer acknowledgement" />
            </div>
            <div class="form-group full">
              <label>Description &amp; Logic Notes</label>
              <textarea v-model="newRule.description" rows="3" placeholder="Fires immediately upon webhook ingestion, sanitizes phone number..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="isAddModalOpen = false">Cancel</button>
            <button type="submit" class="btn btn-primary">Enable Workflow</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { icons } from '../icons.js';

export default {
  name: 'AutomationsView',
  props: {
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      icons,
      isAddModalOpen: false,
      metrics: [
        { label: 'Automations Active', value: '7 Rules', change: '100% operational', icon: 'zap' },
        { label: 'Executions (24h)', value: '312', change: '+44 vs avg', icon: 'trendingUp' },
        { label: 'Success Rate', value: '99.7%', change: 'Zero failed webhooks', icon: 'check' },
        { label: 'Avg Latency', value: '84 ms', change: 'Sub-second', icon: 'clock' }
      ],
      newRule: {
        name: '',
        category: 'Lead Ingestion',
        trigger: 'New Lead Webhook Received',
        action: '',
        description: ''
      },
      automations: [
        {
          id: 1,
          name: 'Instant Seller Lead SMS Auto-Responder',
          category: 'Lead Ingestion',
          icon: 'text',
          description: 'Instantly fires customized SMS acknowledgement to incoming Facebook, Direct Mail, or Web sellers.',
          trigger: 'Inbound Webhook from Meta Ad / Web Form',
          action: 'Send Twilio SMS with personalized address & property questions',
          enabled: true,
          runsCount: 142,
          successRate: '100%',
          lastRun: '12 mins ago'
        },
        {
          id: 2,
          name: 'CrownKey Tax Delinquency Skip Trace Trigger',
          category: 'Skip Tracing',
          icon: 'search',
          description: 'Detects new Duval County tax certificates > $2,500 and immediately runs Tier 1 phone lookup.',
          trigger: 'Duval County tax lien flag update in PostgreSQL',
          action: 'Call Skip Trace API -> Enrich phone -> Queue for Marcus Vance',
          enabled: true,
          runsCount: 88,
          successRate: '98.8%',
          lastRun: '1 hr ago'
        },
        {
          id: 3,
          name: 'PSA Executed -> Title Escrow File Generation',
          category: 'Title Escrow',
          icon: 'file',
          description: 'DocuSign completed webhook initiates escrow file with First American Title.',
          trigger: 'DocuSign PSA completed envelope webhook',
          action: 'Email title escrow packet + wire instructions to closing officer',
          enabled: true,
          runsCount: 19,
          successRate: '100%',
          lastRun: 'Yesterday'
        },
        {
          id: 4,
          name: 'VIP Cash Buyer Buy-Box Auto-Blast',
          category: 'Buyer Dispo',
          icon: 'send',
          description: 'Matches newly assigned properties with VIP buyers based on ZIP code and target discount margin.',
          trigger: 'Property stage moved to "Dispo Marketing"',
          action: 'Dispatch encrypted deal packet to filtered VIP buyer list',
          enabled: true,
          runsCount: 34,
          successRate: '100%',
          lastRun: '3 hrs ago'
        },
        {
          id: 5,
          name: 'No-Response Cadence Escalation',
          category: 'Lead Ingestion',
          icon: 'clock',
          description: 'If seller does not respond to offer within 48 hours, automatically transitions lead into Day 3 SMS sequence.',
          trigger: 'Lead unchanged in "Offer Sent" > 48 hours',
          action: 'Schedule Day 3 follow-up task & trigger follow-up SMS',
          enabled: true,
          runsCount: 29,
          successRate: '100%',
          lastRun: '4 hrs ago'
        }
      ],
      auditLogs: [
        { id: '8910', workflow: 'Instant Seller Lead SMS Auto-Responder', target: 'Ronald Campbell (4812 Moncrief)', latency: '62ms', status: 'Delivered', time: '10:14 AM' },
        { id: '8909', workflow: 'CrownKey Tax Delinquency Skip Trace', target: 'DUV-091823-0001 (Duval Records)', latency: '140ms', status: 'Enriched', time: '9:48 AM' },
        { id: '8908', workflow: 'VIP Cash Buyer Buy-Box Auto-Blast', target: 'Apex Jacksonville Holdings', latency: '95ms', status: 'Sent', time: '8:45 AM' },
        { id: '8907', workflow: 'PSA Executed Title Escrow File', target: 'First American Title #CR-2026-90', latency: '112ms', status: 'Completed', time: 'Yesterday' }
      ]
    };
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
    testAllWorkflows() {
      this.showToast('Workflow Simulation', 'Pinged all workflow triggers: 5/5 triggers responded 200 OK (Average latency 74ms).', 'success');
    },
    runManual(rule) {
      rule.runsCount += 1;
      rule.lastRun = 'Just now';
      this.executionLogs.unshift({
        id: String(Math.floor(9000 + Math.random() * 1000)),
        workflow: rule.name,
        target: 'Manual Test Trigger',
        latency: '68ms',
        status: 'Completed',
        time: 'Just now'
      });
      this.showToast('Workflow Executed', `Triggered manual execution of "${rule.name}". Run logged.`, 'success');
    },
    saveNewAutomation() {
      const id = Date.now();
      this.automations.unshift({
        id,
        name: this.newRule.name,
        category: this.newRule.category,
        icon: 'zap',
        description: this.newRule.description,
        trigger: this.newRule.trigger,
        action: this.newRule.action,
        enabled: true,
        runsCount: 0,
        successRate: '100%',
        lastRun: 'Never'
      });
      this.isAddModalOpen = false;
      this.newRule = {
        name: '',
        category: 'Lead Ingestion',
        trigger: 'New Lead Webhook Received',
        action: '',
        description: ''
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
  gap: 1.25rem;
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

.automations-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rule-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  transition: all 0.2s ease;
}

.rule-card:hover {
  border-color: rgba(237, 207, 124, 0.25);
}

.rule-card.inactive {
  opacity: 0.5;
}

.rule-top {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.rule-icon-box {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
  flex-shrink: 0;
}

.rule-title-box {
  flex: 1;
}

.rule-name-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.rule-name-row h4 {
  font-size: 0.95rem;
  color: #f8fafc;
  margin: 0;
}

.rule-category {
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
}

.rule-desc {
  font-size: 0.8rem;
  color: #94a3b8;
  margin: 0.25rem 0 0 0;
  line-height: 1.35;
}

.rule-flow {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.65rem 0.85rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.flow-step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.step-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.flow-step.trigger .step-badge {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}

.flow-step.action .step-badge {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.step-text {
  font-size: 0.8rem;
  color: #cbd5e1;
}

.flow-arrow {
  color: #64748b;
  display: flex;
}

.rule-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.rule-stats {
  display: flex;
  gap: 1.25rem;
  color: #94a3b8;
}

.text-green {
  color: #4ade80;
}

.text-muted {
  color: #64748b;
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

/* Audit Section */
.audit-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 1.25rem;
}

.audit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.audit-header h3 {
  font-size: 0.95rem;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.badge-sub {
  font-size: 0.75rem;
  color: #94a3b8;
}

.table-container {
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
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

.status-chip.success {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.7rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.font-mono {
  font-family: monospace;
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

.btn-subtle:hover {
  color: #f8fafc;
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
