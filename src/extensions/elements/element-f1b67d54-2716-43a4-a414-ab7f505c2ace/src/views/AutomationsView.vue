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
          <span class="metric-change" :class="{ positive: m.change.includes('+') || m.change.includes('Live') }">
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
          <span class="badge-count">{{ activeRulesCount }} active / {{ automations.length }} total rules</span>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" :disabled="isLoading || isRunning" @click="testActiveTrigger">
            <span v-html="icons.refresh"></span>
            {{ isRunning ? 'Evaluating...' : 'Test Trigger' }}
          </button>
          <button class="btn btn-primary" @click="isAddModalOpen = true">
            <span v-html="icons.plus"></span>
            Create Automation
          </button>
        </div>
      </div>

      <!-- Automations Rules List -->
      <div v-if="!automations.length" style="text-align: center; padding: 48px 20px; background: var(--hh-inset, rgba(0,0,0,0.2)); border-radius: 12px; border: 1px dashed var(--hh-border, rgba(255,255,255,0.1)); margin-bottom: 1.5rem;">
        <h3 style="color: var(--hh-text, #f8fafc); font-size: 1.1rem; margin-bottom: 0.5rem;">No active automation rules</h3>
        <p style="color: var(--hh-muted, #94a3b8); font-size: 0.85rem; margin-bottom: 1rem;">Create an event trigger backed by PostgreSQL to automate alerts and follow-up tasks on live lead ingestion.</p>
        <button class="btn btn-primary" @click="isAddModalOpen = true">
          <span v-html="icons.plus"></span>
          Create First Automation
        </button>
      </div>
      <div v-else class="automations-grid">
        <div
          v-for="rule in automations"
          :key="rule.rule_id"
          class="rule-card"
          :class="{ inactive: !rule.enabled }"
        >
          <div class="rule-top">
            <div class="rule-icon-box" :class="getRuleCategoryClass(rule.trigger_code)">
              <span v-html="icons[getRuleIcon(rule.trigger_code)]"></span>
            </div>
            <div class="rule-title-box">
              <div class="rule-name-row">
                <h4>{{ rule.name }}</h4>
                <span class="rule-category">{{ getRuleCategoryLabel(rule.trigger_code) }}</span>
              </div>
              <p class="rule-desc">{{ rule.description || 'Automated wholesale pipeline rule.' }}</p>
            </div>
            <div class="rule-toggle">
              <label class="toggle-switch">
                <input v-model="rule.enabled" type="checkbox" @change="toggleAutomation(rule)" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div class="rule-flow">
            <div class="flow-step trigger">
              <span class="step-badge">TRIGGER</span>
              <span class="step-text">{{ triggers[rule.trigger_code] || rule.trigger_code }}</span>
            </div>
            <div class="flow-arrow">
              <span v-html="icons.arrowUpRight"></span>
            </div>
            <div class="flow-step action">
              <span class="step-badge">ACTION</span>
              <span class="step-text"><strong>{{ actions[rule.action_code] || rule.action_code }}</strong>: {{ rule.action_text }}</span>
            </div>
          </div>

          <div class="rule-footer">
            <div class="rule-stats">
              <span>Runs: <strong>{{ rule.runs_count || 0 }}</strong></span>
              <span>Success: <strong class="text-green">{{ getSuccessRate(rule) }}</strong></span>
              <span>Last: <span class="text-muted">{{ formatTimestamp(rule.last_run) }}</span></span>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-subtle btn-sm" :disabled="isRunning || !rule.enabled" @click="runManual(rule)">
                <span v-html="icons.zap"></span>
                Trigger Now
              </button>
              <button class="btn btn-subtle btn-sm" style="color: #ef4444; border-color: rgba(239,68,68,0.3);" @click="deleteAutomation(rule.rule_id)" title="Archive Rule">
                ✕ Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Real-time Audit Log Section -->
      <div class="audit-section">
        <div class="audit-header">
          <h3>
            <span v-html="icons.database"></span>
            Recent Execution Audit Stream (PostgreSQL ops.automation_runs)
          </h3>
          <span class="badge-sub">Live Event Bus</span>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Workflow Rule</th>
                <th>Target Asset / Contact</th>
                <th>Latency</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!auditRuns.length">
                <td colspan="6" style="text-align: center; color: var(--hh-muted, #64748b); padding: 28px;">
                  No automation events executed yet. Trigger a workflow rule to record live execution logs in PostgreSQL.
                </td>
              </tr>
              <tr v-for="run in auditRuns" :key="run.run_id">
                <td class="font-mono text-muted">#{{ (run.run_id || '').slice(0, 8) }}</td>
                <td><strong>{{ run.rule_name }}</strong></td>
                <td>{{ run.target || 'Live Pipeline Bus' }}</td>
                <td class="font-mono">{{ run.duration_ms }}ms</td>
                <td>
                  <span v-if="run.status === 'succeeded'" class="status-chip success">
                    <span v-html="icons.check" class="tiny-icon"></span>
                    Succeeded
                  </span>
                  <span v-else class="status-chip error" :title="run.error || 'Execution failed'">
                    ✕ Failed
                  </span>
                </td>
                <td class="font-mono text-muted">{{ formatTimestamp(run.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create Automation Modal -->
    <Teleport to="body">
    <div v-if="isAddModalOpen" class="modal-overlay" @click.self="isAddModalOpen = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>
            <span v-html="icons.zap"></span>
            Configure New Real-time Automation Rule
          </h3>
          <button class="close-btn" @click="isAddModalOpen = false">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <form class="modal-body" @submit.prevent="saveNewAutomation">
          <div class="form-grid">
            <div class="form-group full">
              <label>Workflow Name * (Max 100 characters)</label>
              <input v-model="newRule.name" type="text" required maxlength="100" placeholder="e.g. BatchLeads Inbound Dispo Review" />
            </div>
            <div class="form-group">
              <label>Supported Trigger Event *</label>
              <select v-model="newRule.trigger_code" required>
                <option value="batchleads_lead">BatchLeads lead saved (Webhook)</option>
                <option value="podio_lead">Podio lead saved (Live Sync)</option>
                <option value="manual">Manual only (On-demand Trigger)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Supported Backend Action *</label>
              <select v-model="newRule.action_code" required>
                <option value="notification">Create an in-app alert (ops.notifications)</option>
                <option value="task">Create a follow-up task (core.tasks)</option>
              </select>
            </div>
            <div class="form-group full">
              <label>Action Text / Payload * (Max 180 characters)</label>
              <input v-model="newRule.action_text" type="text" required maxlength="180" placeholder="e.g. High-equity distressed seller lead ready for underwriting review" />
            </div>
            <div class="form-group full">
              <label>Description &amp; Operational Notes (Optional)</label>
              <textarea v-model="newRule.description" rows="3" maxlength="500" placeholder="Operational purpose of this rule in the Jacksonville wholesale funnel..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="isAddModalOpen = false">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="isSaving">
              {{ isSaving ? 'Saving...' : 'Save & Activate Rule' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    </Teleport>
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
      isLoading: false,
      isRunning: false,
      isSaving: false,
      isAddModalOpen: false,
      triggers: {
        manual: 'Manual only',
        batchleads_lead: 'BatchLeads lead saved',
        podio_lead: 'Podio lead saved'
      },
      actions: {
        notification: 'Create an in-app alert',
        task: 'Create a follow-up task'
      },
      metrics: [
        { label: 'Active Rules', value: '0 Rules', change: 'Live PostgreSQL', icon: 'zap' },
        { label: 'Executions (24h)', value: '0', change: 'Realtime', icon: 'trendingUp' },
        { label: 'Success Rate', value: '100%', change: 'Live Event Bus', icon: 'check' },
        { label: 'Avg Latency', value: '0 ms', change: 'Zero Drift', icon: 'clock' }
      ],
      newRule: {
        name: '',
        description: '',
        trigger_code: 'batchleads_lead',
        action_code: 'notification',
        action_text: '',
        enabled: true
      },
      automations: [],
      auditRuns: []
    };
  },
  computed: {
    activeRulesCount() {
      return this.automations.filter(r => r.enabled).length;
    }
  },
  mounted() {
    this.loadAutomations();
  },
  methods: {
    getAuthHeaders() {
      const headers = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const token = window.localStorage.getItem('hushhawk_auth_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const session = window.sessionStorage.getItem('hushhawk_session') || window.localStorage.getItem('hushhawk_session');
        if (session) headers['x-hushhawk-session'] = encodeURIComponent(session);
      }
      return headers;
    },
    async loadAutomations() {
      this.isLoading = true;
      try {
        const res = await fetch('/api/v1/automations', {
          headers: this.getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          this.automations = data.automations || [];
          this.auditRuns = data.runs || [];
          if (data.triggers) this.triggers = data.triggers;
          if (data.actions) this.actions = data.actions;
          this.updateMetrics(data.metrics);
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn('[Automations API Error]:', errData.error || res.statusText);
        }
      } catch (err) {
        console.warn('[Automations Load Exception]:', err.message);
      } finally {
        this.isLoading = false;
      }
    },
    updateMetrics(summary) {
      const totalRules = this.automations.length;
      const activeRules = this.automations.filter(a => a.enabled).length;
      const totalExecutions = summary?.executions ?? this.auditRuns.length;
      const succeeded = summary?.succeeded ?? this.auditRuns.filter(r => r.status === 'succeeded').length;
      const avgDuration = summary?.avg_duration ?? (this.auditRuns.length ? Math.round(this.auditRuns.reduce((acc, r) => acc + (r.duration_ms || 0), 0) / this.auditRuns.length) : 0);
      const successRate = totalExecutions > 0 ? Math.round((succeeded / totalExecutions) * 100) + '%' : '100%';

      this.metrics[0].value = `${activeRules} of ${totalRules}`;
      this.metrics[0].change = `${totalRules} Registered`;
      this.metrics[1].value = String(totalExecutions);
      this.metrics[1].change = `${succeeded} Succeeded`;
      this.metrics[2].value = successRate;
      this.metrics[3].value = `${avgDuration || 0} ms`;
    },
    getSuccessRate(rule) {
      if (!rule.runs_count || rule.runs_count === 0) return '100%';
      const rate = Math.round(((rule.succeeded_count || 0) / rule.runs_count) * 100);
      return `${rate}%`;
    },
    getRuleCategoryLabel(triggerCode) {
      switch (triggerCode) {
        case 'batchleads_lead': return 'BatchLeads Webhook';
        case 'podio_lead': return 'Podio Sync';
        case 'manual': return 'On-Demand Manual';
        default: return 'System Event';
      }
    },
    getRuleCategoryClass(triggerCode) {
      switch (triggerCode) {
        case 'batchleads_lead': return 'cyan';
        case 'podio_lead': return 'green';
        case 'manual': return 'gold';
        default: return 'purple';
      }
    },
    getRuleIcon(triggerCode) {
      switch (triggerCode) {
        case 'batchleads_lead': return 'database';
        case 'podio_lead': return 'handshake';
        case 'manual': return 'zap';
        default: return 'zap';
      }
    },
    formatTimestamp(iso) {
      if (!iso) return 'Never';
      try {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
               d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } catch (_) {
        return String(iso);
      }
    },
    async deleteAutomation(ruleId) {
      if (!confirm('Archive this automation rule?')) return;
      try {
        const res = await fetch(`/api/v1/automations/${ruleId}`, {
          method: 'DELETE',
          headers: this.getAuthHeaders()
        });
        if (res.ok) {
          this.showToast('Rule Archived', 'Automation rule removed from active pipeline.', 'info');
          await this.loadAutomations();
        } else {
          const errData = await res.json().catch(() => ({}));
          this.showToast('Archive Failed', errData.error || 'Could not archive rule.', 'error');
        }
      } catch (e) {
        this.showToast('Error', e.message, 'error');
      }
    },
    async toggleAutomation(rule) {
      try {
        const res = await fetch(`/api/v1/automations/${rule.rule_id}`, {
          method: 'PATCH',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ enabled: rule.enabled })
        });
        if (res.ok) {
          this.showToast('Rule Updated', `Rule "${rule.name}" is now ${rule.enabled ? 'Active' : 'Disabled'}.`, 'info');
          this.updateMetrics();
        } else {
          const errData = await res.json().catch(() => ({}));
          rule.enabled = !rule.enabled;
          this.showToast('Update Failed', errData.error || 'Could not update rule status.', 'error');
        }
      } catch (err) {
        rule.enabled = !rule.enabled;
        this.showToast('Network Error', err.message, 'error');
      }
    },
    async runManual(rule) {
      this.isRunning = true;
      try {
        const res = await fetch(`/api/v1/automations/${rule.rule_id}/execute`, {
          method: 'POST',
          headers: this.getAuthHeaders()
        });
        const result = await res.json().catch(() => ({}));

        if (res.ok && result.status === 'succeeded') {
          this.showToast('Automation Succeeded', `Triggered "${rule.name}" (${result.duration_ms}ms). Action executed live in PostgreSQL.`, 'success');
        } else {
          const errMsg = result.error || (result.status === 'failed' ? 'Recorded as failed in PostgreSQL ops.automation_runs' : 'Execution failed.');
          this.showToast('Execution Failed', errMsg, 'error');
        }
        await this.loadAutomations();
      } catch (err) {
        this.showToast('Execution Error', err.message, 'error');
      } finally {
        this.isRunning = false;
      }
    },
    async testActiveTrigger() {
      const active = this.automations.find(a => a.enabled && a.trigger_code === 'manual') || this.automations.find(a => a.enabled);
      if (!active) {
        this.showToast('No Active Rules', 'Enable at least one automation rule before testing.', 'info');
        return;
      }
      await this.runManual(active);
    },
    async saveNewAutomation() {
      if (!this.newRule.name || !this.newRule.name.trim()) return;
      if (!this.newRule.action_text || !this.newRule.action_text.trim()) return;

      this.isSaving = true;
      try {
        const payload = {
          name: this.newRule.name.trim(),
          description: (this.newRule.description || '').trim(),
          trigger_code: this.newRule.trigger_code,
          action_code: this.newRule.action_code,
          action_text: this.newRule.action_text.trim(),
          enabled: true
        };

        const res = await fetch('/api/v1/automations', {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const created = await res.json();
          this.showToast('Automation Rule Created', `Rule "${created.name}" is now live and evaluating events.`, 'success');
          this.isAddModalOpen = false;
          this.newRule = {
            name: '',
            description: '',
            trigger_code: 'batchleads_lead',
            action_code: 'notification',
            action_text: '',
            enabled: true
          };
          await this.loadAutomations();
        } else {
          const errData = await res.json().catch(() => ({}));
          this.showToast('Creation Failed', errData.error || 'Failed to create automation rule in PostgreSQL.', 'error');
        }
      } catch (err) {
        this.showToast('Error', err.message, 'error');
      } finally {
        this.isSaving = false;
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
  background: var(--hh-control, rgba(0, 0, 0, 0.25));
  border: 1px solid var(--hh-border, rgba(255, 255, 255, 0.06));
  border-radius: 10px;
  padding: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  transition: all 0.2s ease;
}

.rule-card:hover {
  border-color: rgba(237, 207, 124, 0.35);
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

.rule-icon-box.cyan {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.rule-icon-box.green {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.rule-icon-box.gold {
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
}

.rule-icon-box.purple {
  background: rgba(192, 132, 252, 0.15);
  color: #c084fc;
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
  color: var(--hh-text, #f8fafc);
  margin: 0;
}

.rule-category {
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background: var(--hh-inset, rgba(255, 255, 255, 0.06));
  color: var(--hh-muted, #94a3b8);
  border: 1px solid var(--hh-border, transparent);
}

.rule-desc {
  font-size: 0.8rem;
  color: var(--hh-muted, #94a3b8);
  margin: 0.25rem 0 0 0;
  line-height: 1.35;
}

.rule-flow {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--hh-inset, rgba(0, 0, 0, 0.3));
  padding: 0.65rem 0.85rem;
  border-radius: 6px;
  border: 1px solid var(--hh-border, rgba(255, 255, 255, 0.04));
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
  color: var(--hh-text, #cbd5e1);
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
  background: var(--hh-panel-header, rgba(255, 255, 255, 0.03));
  color: var(--hh-muted, #94a3b8);
  padding: 0.65rem 0.75rem;
  font-weight: 600;
  border-bottom: 1px solid var(--hh-border, rgba(255, 255, 255, 0.08));
}

.data-table td {
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid var(--hh-border, rgba(255, 255, 255, 0.04));
  color: var(--hh-text, #e2e8f0);
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

.status-chip.error {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
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
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #edcf7c;
  color: #04182d;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
}

.btn-subtle {
  background: transparent;
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-subtle:hover:not(:disabled) {
  color: #f8fafc;
  border-color: rgba(255, 255, 255, 0.25);
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
  max-width: 560px;
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

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #edcf7c;
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
