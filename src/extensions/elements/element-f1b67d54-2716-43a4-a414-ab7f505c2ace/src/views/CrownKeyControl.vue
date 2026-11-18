<template>
  <div class="ck-panel">
    <div class="ck-tabs">
      <button v-for="t in tabs" :key="t.id" class="ck-tab" :class="{ active: tab === t.id }" @click="select(t.id)">
        {{ t.label }}<span v-if="t.id === 'review' && pending" class="ck-badge">{{ pending }}</span>
      </button>
    </div>

    <p v-if="error" class="ck-error">{{ error }}</p>
    <p v-else-if="loading" class="ck-muted">Loading…</p>

    <!-- Review queue -->
    <section v-if="tab === 'review' && !loading">
      <p class="ck-muted">Possible duplicate records. Nothing merges automatically; every decision needs a reason and is audited.</p>
      <p v-if="!queue.length" class="ck-empty">No identity cases are waiting for review.</p>
      <article v-for="c in queue" :key="c.candidate_id" class="ck-card">
        <header>
          <strong>{{ c.entity_type }}</strong>
          <span class="ck-pill" :class="c.status.toLowerCase()">{{ c.status }}</span>
          <span class="ck-muted">confidence {{ c.confidence }} · rung {{ c.ladder_rung }}</span>
        </header>
        <div class="ck-pair">
          <div><h5>Record A</h5><pre>{{ brief(c.entity_a_data) }}</pre></div>
          <div><h5>Record B</h5><pre>{{ brief(c.entity_b_data) }}</pre></div>
        </div>
        <div v-if="c.status === 'PENDING' || c.status === 'DEFERRED' || c.status === 'ESCALATED'" class="ck-actions">
          <input v-model="reasons[c.candidate_id]" placeholder="Reason for the decision (required)" />
          <button v-for="d in decisions" :key="d.value" class="btn btn-secondary btn-sm" @click="decide(c, d.value)">{{ d.label }}</button>
        </div>
        <ul v-if="c.history.length" class="ck-history">
          <li v-for="h in c.history" :key="h.decision_id">
            {{ h.decision }} by {{ h.reviewer }} · {{ when(h.created_at) }} — {{ h.reason }}
            <em v-if="h.reversal_status === 'REVERSED'"> (reversed by {{ h.reversed_by }}: {{ h.reversal_reason }})</em>
            <button v-if="isAdmin && h.reversal_status !== 'REVERSED'" class="ck-link" @click="reverse(h)">Reverse</button>
          </li>
        </ul>
      </article>
    </section>

    <!-- Events and evidence -->
    <section v-if="tab === 'events' && !loading">
      <p class="ck-muted">Every pillar event with its verification and operational status. An event cannot be confirmed without evidence.</p>
      <table class="ck-table">
        <thead><tr><th>CrownKey</th><th>Pillar</th><th>Case</th><th>Status</th><th>Verification</th><th>Evidence</th><th></th></tr></thead>
        <tbody>
          <tr v-for="e in events" :key="e.event_id">
            <td class="mono">{{ e.county_code }}-{{ e.parcel_raw }}-{{ e.pillar_code }}-{{ String(e.event_number).padStart(3, '0') }}</td>
            <td>{{ e.pillar_code }}</td>
            <td>{{ e.case_reference || e.external_event_id || '—' }}</td>
            <td>{{ e.event_status }}</td>
            <td><span class="ck-pill" :class="e.verification_status.toLowerCase()">{{ e.verification_status }}</span></td>
            <td>{{ e.evidence_count }}</td>
            <td>
              <button v-if="e.event_status === 'OPEN'" class="ck-link" @click="resolveEvent(e)">Mark resolved</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!events.length" class="ck-empty">No events recorded yet.</p>
    </section>

    <!-- Imports and connectors -->
    <section v-if="tab === 'imports' && !loading">
      <h4>Connectors</h4>
      <p v-if="!connectors.length" class="ck-empty">No connectors configured. Add a county or provider feed through the API (POST /api/v1/connectors) and approve it here.</p>
      <table v-else class="ck-table">
        <thead><tr><th>Name</th><th>County</th><th>Schedule</th><th>Last run</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="c in connectors" :key="c.connector_id">
            <td>{{ c.name }}</td><td>{{ c.county_code }}</td>
            <td>{{ c.schedule_minutes ? `every ${c.schedule_minutes} min` : 'manual' }}</td>
            <td>{{ c.last_run_at ? when(c.last_run_at) : 'never' }} <span v-if="c.last_error" class="ck-error">{{ c.last_error }}</span></td>
            <td>{{ c.approval_status }}{{ c.enabled ? ' · enabled' : '' }}</td>
            <td v-if="isAdmin">
              <button class="ck-link" @click="approveConnector(c, c.approval_status !== 'APPROVED')">{{ c.approval_status === 'APPROVED' ? 'Disable' : 'Approve & enable' }}</button>
              <button v-if="c.enabled" class="ck-link" @click="runConnector(c)">Run now</button>
            </td>
          </tr>
        </tbody>
      </table>
      <h4>Import history</h4>
      <table class="ck-table">
        <thead><tr><th>Source</th><th>Type</th><th>Created</th><th>Updated</th><th>Unchanged</th><th>Rejected</th><th>Started</th></tr></thead>
        <tbody>
          <tr v-for="j in imports" :key="j.import_job_id">
            <td>{{ j.source_system }}</td><td>{{ j.import_type }}</td><td>{{ j.created_count }}</td><td>{{ j.updated_count }}</td>
            <td>{{ j.unchanged_count }}</td><td>{{ j.rejected_count }}</td><td>{{ when(j.started_at) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!imports.length" class="ck-empty">No imports yet.</p>
    </section>

    <!-- Dictionary governance -->
    <section v-if="tab === 'dictionary' && !loading">
      <p class="ck-muted">A pillar can create events only when it is APPROVED and enabled. Changes are recorded in the audit log.</p>
      <table class="ck-table">
        <thead><tr><th>Code</th><th>Name</th><th>Review status</th><th>Live</th><th></th></tr></thead>
        <tbody>
          <tr v-for="p in pillars" :key="p.pillar_code">
            <td class="mono">{{ p.pillar_code }}</td><td>{{ p.pillar_name }}</td><td>{{ p.review_status }}</td>
            <td>{{ p.production_enabled ? 'Yes' : 'No' }}</td>
            <td v-if="isAdmin">
              <button v-if="!p.production_enabled" class="ck-link" @click="setPillar(p, { review_status: 'APPROVED', production_enabled: true })">Approve & enable</button>
              <button v-else class="ck-link" @click="setPillar(p, { production_enabled: false })">Disable</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Relationship graph / sync -->
    <section v-if="tab === 'graph' && !loading">
      <div class="ck-grid">
        <div class="ck-card"><h5>Postgres</h5><p>{{ graph.sql.properties }} properties · {{ graph.sql.events }} events · {{ graph.sql.leads }} leads</p></div>
        <div class="ck-card"><h5>Neo4j</h5><p v-if="graph.graph">{{ graph.graph.properties }} properties · {{ graph.graph.events }} events · {{ graph.graph.leads }} leads</p><p v-else class="ck-muted">{{ graph.configured ? (graph.error || 'No data yet') : 'Not configured (set NEO4J_HTTP_URL, NEO4J_USER, NEO4J_PASSWORD).' }}</p></div>
        <div class="ck-card"><h5>Outbox</h5><p>{{ graph.outbox.pending }} pending · {{ graph.outbox.dead }} failed · oldest {{ graph.outbox.oldest_pending_seconds }}s</p></div>
        <div class="ck-card"><h5>Status</h5><p><strong>{{ graph.status }}</strong></p></div>
      </div>
      <button v-if="isAdmin && graph.configured" class="btn btn-secondary btn-sm" @click="syncGraph">Sync now</button>
    </section>
  </div>
</template>

<script>
export default {
  name: 'CrownKeyControl',
  data() {
    return {
      tab: 'review', loading: false, error: '', reasons: {},
      tabs: [
        { id: 'review', label: 'Review queue' }, { id: 'events', label: 'Events & evidence' }, { id: 'imports', label: 'Imports & connectors' },
        { id: 'dictionary', label: 'Dictionary' }, { id: 'graph', label: 'Graph sync' }
      ],
      decisions: [
        { value: 'CONFIRM', label: 'Confirm match' }, { value: 'REJECT', label: 'Reject' }, { value: 'LINK_ONLY', label: 'Link only' },
        { value: 'DEFER', label: 'Defer' }, { value: 'ESCALATE', label: 'Escalate' }
      ],
      queue: [], events: [], imports: [], connectors: [], pillars: [],
      graph: { configured: false, sql: { properties: 0, events: 0, leads: 0 }, outbox: { pending: 0, dead: 0, oldest_pending_seconds: 0 }, graph: null, status: '' }
    };
  },
  computed: {
    pending() { return this.queue.filter(c => c.status === 'PENDING').length; },
    isAdmin() {
      try {
        const raw = window.sessionStorage.getItem('hushhawk_session') || window.localStorage.getItem('hushhawk_session');
        const parsed = raw ? JSON.parse(raw) : {};
        return Boolean((parsed.user || parsed).isAdmin);
      } catch (e) { return false; }
    }
  },
  mounted() { this.select('review'); },
  methods: {
    when(v) { return v ? new Date(v).toLocaleString() : ''; },
    brief(o) {
      if (!o) return 'Record not found';
      const keep = ['full_name', 'primary_phone', 'primary_email', 'mailing_address', 'county_code', 'parcel_raw', 'address_line1', 'city', 'postal_code', 'verification_level'];
      return keep.filter(k => o[k]).map(k => `${k}: ${o[k]}`).join('\n') || JSON.stringify(o, null, 1);
    },
    async api(path, options = {}) {
      const res = await fetch('/api/v1' + path, { headers: { 'Content-Type': 'application/json' }, ...options });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    },
    async select(id) {
      this.tab = id; this.error = ''; this.loading = true;
      try {
        if (id === 'review') this.queue = (await this.api('/review/queue')).queue;
        if (id === 'events') this.events = (await this.api('/events?limit=200')).events;
        if (id === 'imports') { this.connectors = (await this.api('/connectors')).connectors; this.imports = (await this.api('/imports')).imports; }
        if (id === 'dictionary') this.pillars = (await this.api('/admin/pillars')).pillars;
        if (id === 'graph') this.graph = await this.api('/graph/reconciliation');
        if (id !== 'review' && !this.queue.length) this.api('/review/queue').then(r => { this.queue = r.queue; }).catch(() => {});
      } catch (e) { this.error = e.message; } finally { this.loading = false; }
    },
    async act(fn) {
      try { this.error = ''; await fn(); await this.select(this.tab); } catch (e) { this.error = e.message; }
    },
    decide(c, decision) {
      const reason = (this.reasons[c.candidate_id] || '').trim();
      if (!reason) { this.error = 'A reason is required for every decision.'; return; }
      return this.act(() => this.api('/review/decision', { method: 'POST', body: JSON.stringify({ candidateId: c.candidate_id, decision, reason }) }));
    },
    reverse(h) {
      const reversalReason = window.prompt('Why is this decision being reversed?');
      if (!reversalReason) return;
      return this.act(() => this.api('/review/reverse', { method: 'POST', body: JSON.stringify({ decisionId: h.decision_id, reversalReason }) }));
    },
    resolveEvent(e) {
      const reason = window.prompt('Reason for marking this event resolved (for the audit trail):');
      if (!reason) return;
      return this.act(() => this.api(`/events/${e.event_id}/status`, { method: 'PATCH', body: JSON.stringify({ eventStatus: 'RESOLVED', reason }) }));
    },
    approveConnector(c, approved) { return this.act(() => this.api(`/connectors/${c.connector_id}/approval`, { method: 'POST', body: JSON.stringify({ approved, enabled: approved }) })); },
    runConnector(c) { return this.act(() => this.api(`/connectors/${c.connector_id}/run`, { method: 'POST' })); },
    setPillar(p, body) { return this.act(() => this.api(`/admin/pillars/${p.pillar_code}`, { method: 'PATCH', body: JSON.stringify(body) })); },
    syncGraph() { return this.act(() => this.api('/graph/sync', { method: 'POST' })); }
  }
};
</script>

<style scoped>
.ck-panel { display: grid; gap: 14px; }
.ck-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.ck-tab { background: transparent; border: 1px solid var(--border-color, rgba(148,163,184,.35)); color: inherit; padding: 6px 12px; border-radius: 999px; cursor: pointer; }
.ck-tab.active { background: rgba(237,207,124,.16); border-color: #edcf7c; }
.ck-badge { margin-left: 6px; background: #c2410c; color: #fff; border-radius: 999px; padding: 0 7px; font-size: 12px; }
.ck-card { border: 1px solid var(--border-color, rgba(148,163,184,.3)); border-radius: 10px; padding: 12px; display: grid; gap: 10px; }
.ck-card header { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.ck-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
.ck-pair pre, .mono { font-family: ui-monospace, Menlo, monospace; font-size: 12px; white-space: pre-wrap; }
.ck-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.ck-actions input { flex: 1 1 260px; padding: 6px 8px; }
.ck-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ck-table th, .ck-table td { text-align: left; padding: 6px 8px; border-bottom: 1px solid rgba(148,163,184,.2); }
.ck-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 12px; }
.ck-pill { padding: 1px 8px; border-radius: 999px; font-size: 12px; background: rgba(148,163,184,.25); }
.ck-pill.confirmed, .ck-pill.linked_only { background: rgba(34,197,94,.25); }
.ck-pill.rejected { background: rgba(239,68,68,.25); }
.ck-pill.pending, .ck-pill.needs_review, .ck-pill.possible { background: rgba(245,158,11,.25); }
.ck-muted { opacity: .75; font-size: 13px; }
.ck-empty { opacity: .7; padding: 18px 0; }
.ck-error { color: #f87171; }
.ck-history { margin: 0; padding-left: 18px; font-size: 12px; }
.ck-link { background: none; border: none; color: #edcf7c; cursor: pointer; padding: 0 6px; text-decoration: underline; }
</style>
