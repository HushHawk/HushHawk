<template>
  <section class="ihm">
    <header class="ihm-head">
      <div>
        <span class="ihm-eyebrow">Mailer intelligence · in-house</span>
        <h2>Signal to letter. Every touch accounted.</h2>
        <p>We print and pack our own mail. Upload the letter and its matching envelope for each touch, check the audience, then take the print files to the packing machine.</p>
      </div>
      <div class="ihm-touches" role="tablist" aria-label="Touch">
        <button v-for="t in touches" :key="t.n" role="tab" :aria-selected="touch === t.n" class="ihm-touch" :class="{ on: touch === t.n }" @click="selectTouch(t.n)">
          <b>T0{{ t.n }}</b><span>{{ t.name }}</span>
          <i class="ihm-dot" :class="templatesReady(t.n) ? 'ok' : 'wait'" :title="templatesReady(t.n) ? 'Letter and envelope uploaded' : 'Letter or envelope missing'"></i>
        </button>
      </div>
    </header>

    <nav class="ihm-steps" aria-label="Steps">
      <div class="ihm-line"><div class="ihm-line-fill" :style="{ width: ((step - 1) / 3 * 100) + '%' }"></div></div>
      <button v-for="s in steps" :key="s.n" class="ihm-step" :class="{ on: step === s.n, done: step > s.n }" @click="goStep(s.n)">
        <span class="ihm-step-n">{{ step > s.n ? '✓' : '0' + s.n }}</span><span class="ihm-step-l">{{ s.label }}</span>
      </button>
    </nav>

    <p v-if="error" class="ihm-error" role="alert">{{ error }}</p>

    <transition name="ihm-slide" mode="out-in">
      <!-- 1. VERIFY -->
      <div v-if="step === 1" key="s1" class="ihm-panel">
        <h3>Verify the person, the parcel and the delivery address</h3>
        <div class="ihm-filters">
          <div class="ihm-chips">
            <span class="ihm-label">Pillars</span>
            <button v-for="(n, code) in audience.byPillar || {}" :key="code" class="ihm-chip" :class="{ on: pillarPick.includes(code) }" @click="togglePillar(code)">{{ code }} · {{ n }}</button>
            <span v-if="!Object.keys(audience.byPillar || {}).length" class="ihm-muted">None eligible yet</span>
          </div>
          <label v-if="touch > 1" class="ihm-field">Days after previous touch <input type="number" min="0" max="365" v-model.number="gapDays" @change="loadAudience" /></label>
          <label class="ihm-check"><input type="checkbox" v-model="includePossible" @change="loadAudience" /> Include unconfirmed (possible) signals</label>
          <button class="ihm-btn" :disabled="loading" @click="loadAudience">{{ loading ? 'Checking…' : 'Re-check' }}</button>
        </div>
        <div class="ihm-checks">
          <div v-for="(c, i) in audience.checks || []" :key="c.key" class="ihm-check-row" :style="{ animationDelay: (i * 120) + 'ms' }">
            <span class="ihm-num">0{{ i + 1 }}</span>
            <div><b>{{ c.label }}</b><small>{{ c.detail }}</small></div>
            <span class="ihm-badge" :class="c.failed ? 'warn' : 'ok'">{{ c.key === 'suppression' ? (c.failed ? c.failed + ' held back' : 'Clear') : (c.failed ? (c.total - c.failed) + ' of ' + c.total + ' ready' : 'All matched') }}</span>
          </div>
        </div>
        <div class="ihm-big">
          <div><span class="ihm-big-n">{{ shownEligible }}</span><span class="ihm-big-l">ready for {{ touchName }}</span></div>
          <div class="ihm-reasons" v-if="Object.keys(audience.reasons || {}).length">
            <b>Left out</b>
            <ul><li v-for="(n, why) in audience.reasons" :key="why"><em>{{ n }}</em> {{ why }}</li></ul>
          </div>
        </div>
        <div v-if="(audience.sample || []).length" class="ihm-table-wrap">
          <table class="ihm-table">
            <thead><tr><th>CrownKey</th><th>Pillar</th><th>Owner</th><th>Mailing address</th></tr></thead>
            <tbody><tr v-for="r in audience.sample" :key="r.propertyId"><td class="mono">{{ r.crownKey }}</td><td>{{ r.pillarName }}</td><td>{{ r.ownerName }}</td><td>{{ r.mailing }}</td></tr></tbody>
          </table>
          <p class="ihm-muted" v-if="audience.eligibleCount > audience.sample.length">Showing the first {{ audience.sample.length }} of {{ audience.eligibleCount }}.</p>
        </div>
        <p v-else-if="!loading" class="ihm-muted">Nobody is eligible for this touch right now.</p>
        <div class="ihm-actions"><button class="ihm-btn gold" @click="goStep(2)">Next: letter and envelope →</button></div>
      </div>

      <!-- 2. TEMPLATES -->
      <div v-else-if="step === 2" key="s2" class="ihm-panel">
        <h3>T0{{ touch }} · {{ touchName }}: letter and matching envelope</h3>
        <p class="ihm-muted">Upload a PDF, PNG or JPG (up to 12 MB). Each touch has its own letter and its own envelope, so they always match. A new upload replaces the old one for future runs; earlier runs keep theirs.</p>
        <div class="ihm-slots">
          <div v-for="kind in ['letter', 'envelope']" :key="kind" class="ihm-slot" :class="{ filled: slot(kind) }">
            <div class="ihm-slot-head"><b>{{ kind === 'letter' ? 'Letter' : 'Envelope' }}</b><span class="ihm-badge" :class="slot(kind) ? 'ok' : 'warn'">{{ slot(kind) ? 'Uploaded' : 'Needed' }}</span></div>
            <template v-if="slot(kind)">
              <p class="ihm-file">{{ slot(kind).filename }} <small>· {{ slot(kind).pages }} page{{ slot(kind).pages === 1 ? '' : 's' }}</small></p>
              <div class="ihm-place">
                <template v-if="kind === 'envelope'">
                  <label>Address from left (in) <input type="number" step="0.05" min="0" v-model.number="place.envelope.addressXIn" placeholder="auto" /></label>
                  <label>Address from top (in) <input type="number" step="0.05" min="0" v-model.number="place.envelope.addressYIn" placeholder="auto" /></label>
                  <label>Text size (pt) <input type="number" min="7" max="16" v-model.number="place.envelope.fontPt" /></label>
                </template>
                <template v-else>
                  <label class="ihm-check"><input type="checkbox" v-model="place.letter.printName" /> Print owner name and property address on the letter</label>
                  <template v-if="place.letter.printName">
                    <label>From left (in) <input type="number" step="0.05" min="0" v-model.number="place.letter.nameXIn" /></label>
                    <label>From top (in) <input type="number" step="0.05" min="0" v-model.number="place.letter.nameYIn" /></label>
                    <label>Text size (pt) <input type="number" min="7" max="16" v-model.number="place.letter.fontPt" /></label>
                  </template>
                  <label class="ihm-check"><input type="checkbox" v-model="place.letter.qr" /> Add the response QR code and token in the bottom margin</label>
                </template>
              </div>
              <div class="ihm-row">
                <button class="ihm-btn" @click="savePlacement(kind)">Save placement</button>
                <button class="ihm-btn" @click="preview(kind)">Preview</button>
              </div>
            </template>
            <p v-else class="ihm-muted">Nothing uploaded for this touch yet.</p>
            <label class="ihm-upload" :class="{ busy: uploading === kind }">
              <input type="file" accept="application/pdf,image/png,image/jpeg" @change="upload(kind, $event)" :disabled="!!uploading" />
              {{ uploading === kind ? 'Uploading…' : (slot(kind) ? 'Replace file' : 'Choose file') }}
            </label>
          </div>
        </div>
        <p v-if="notice" class="ihm-ok">{{ notice }}</p>
        <div class="ihm-actions"><button class="ihm-btn" @click="goStep(1)">← Back</button><button class="ihm-btn gold" :disabled="!templatesReady(touch)" @click="goStep(3)">Next: produce →</button></div>
      </div>

      <!-- 3. PRODUCE -->
      <div v-else-if="step === 3" key="s3" class="ihm-panel">
        <h3>T0{{ touch }} · {{ touchName }}: produce the mailing</h3>
        <div class="ihm-produce">
          <div class="ihm-sum">
            <span class="ihm-big-n">{{ audience.eligibleCount ?? 0 }}</span><span class="ihm-big-l">pieces</span>
            <small>Each gets a unique mailpiece ID and a response token. Letters, envelopes and the list share one order (by pillar, then CrownKey).</small>
            <label class="ihm-field">Name for this run (optional) <input type="text" maxlength="120" v-model="runLabel" placeholder="e.g. Absentee owners, week 47" /></label>
            <button class="ihm-btn gold big" :disabled="building || !audience.eligibleCount || !templatesReady(touch)" @click="build">{{ building ? 'Building…' : 'Build mailing package' }}</button>
            <p v-if="!templatesReady(touch)" class="ihm-muted">Upload this touch's letter and envelope first.</p>
          </div>
          <ol class="ihm-stages" :class="{ run: building, done: !!lastRun }">
            <li v-for="(s, i) in stages" :key="s" :class="{ on: building && stageIdx === i, past: (building && stageIdx > i) || lastRun }"><i></i>{{ s }}</li>
          </ol>
        </div>
        <transition name="ihm-pop">
          <div v-if="lastRun" class="ihm-ready">
            <div class="ihm-check-anim">✓</div>
            <div class="ihm-ready-body">
              <b>{{ lastRun.runCode }} is ready · {{ lastRun.pieceCount }} pieces</b>
              <div class="ihm-row">
                <button class="ihm-btn gold" @click="getFile(lastRun.runId, 'package.zip')">Download everything (ZIP)</button>
                <button class="ihm-btn" @click="getFile(lastRun.runId, 'mailing_list.csv')">Spreadsheet (CSV)</button>
                <button class="ihm-btn" @click="getFile(lastRun.runId, 'letters.pdf', true)">Open letters to print</button>
                <button class="ihm-btn" @click="getFile(lastRun.runId, 'envelopes.pdf', true)">Open envelopes to print</button>
              </div>
              <small>After the pieces are mailed, mark the run as mailed below so the next touch can be planned.</small>
            </div>
          </div>
        </transition>
        <h4>Runs</h4>
        <div v-if="runs.length" class="ihm-table-wrap">
          <table class="ihm-table">
            <thead><tr><th>Run</th><th>Touch</th><th>Pieces</th><th>Status</th><th>Created</th><th>Files</th><th></th></tr></thead>
            <tbody>
              <tr v-for="r in runs" :key="r.run_id">
                <td class="mono">{{ r.run_code }}<small v-if="r.label"> · {{ r.label }}</small></td><td>T0{{ r.touch }}</td><td>{{ r.piece_count }}</td>
                <td><span class="ihm-badge" :class="r.status === 'MAILED' ? 'ok' : 'warn'">{{ r.status === 'MAILED' ? 'Mailed' : 'Ready to print' }}</span></td>
                <td>{{ fmtDate(r.created_at) }}</td>
                <td class="ihm-links"><a href="#" @click.prevent="getFile(r.run_id, 'package.zip')">ZIP</a><a href="#" @click.prevent="getFile(r.run_id, 'mailing_list.csv')">CSV</a><a href="#" @click.prevent="getFile(r.run_id, 'letters.pdf', true)">Letters</a><a href="#" @click.prevent="getFile(r.run_id, 'envelopes.pdf', true)">Envelopes</a></td>
                <td><button v-if="r.status !== 'MAILED'" class="ihm-btn sm" @click="markMailed(r)">Mark as mailed</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="ihm-muted">No runs yet.</p>
        <div class="ihm-actions"><button class="ihm-btn" @click="goStep(2)">← Back</button><button class="ihm-btn gold" @click="goStep(4)">Next: track →</button></div>
      </div>

      <!-- 4. TRACK -->
      <div v-else key="s4" class="ihm-panel">
        <h3>Count every touch, reconcile every piece</h3>
        <div class="ihm-cards">
          <div v-for="t in tracking.touches || []" :key="t.touch" class="ihm-card">
            <span class="ihm-label">T0{{ t.touch }} · {{ t.name }}</span>
            <span class="ihm-big-n sm">{{ t.pieces }}</span>
            <small>{{ t.mailed }} mailed · {{ t.scans }} QR scans · {{ t.responses }} callbacks<template v-if="t.problems"> · {{ t.problems }} returned/opted out</template></small>
          </div>
          <div class="ihm-card total"><span class="ihm-label">Total pieces</span><span class="ihm-big-n sm gold">{{ tracking.totalPieces ?? 0 }}</span><small>One property can get up to three separate touches.</small></div>
        </div>
        <div class="ihm-bars">
          <div v-for="t in tracking.touches || []" :key="'b' + t.touch" class="ihm-bar-row">
            <span>T0{{ t.touch }} {{ t.name }}</span>
            <div class="ihm-bar"><div class="ihm-bar-fill" :style="{ width: barWidth(t.pieces) + '%' }"></div></div>
            <b>{{ t.pieces }}</b>
          </div>
          <p class="ihm-muted">Eligible for the next touches after a fresh check (responses, opt-outs and returned mail removed): follow-up <b>{{ tracking.eligibleAfterFreshCheck?.[2] ?? 0 }}</b>, final courtesy <b>{{ tracking.eligibleAfterFreshCheck?.[3] ?? 0 }}</b>.</p>
        </div>
        <div v-if="(tracking.pillars || []).length" class="ihm-table-wrap">
          <table class="ihm-table"><thead><tr><th>Pillar</th><th>Touch</th><th>Pieces</th></tr></thead>
            <tbody><tr v-for="p in tracking.pillars" :key="p.pillar_code + p.touch"><td>{{ p.pillar_code }} · {{ p.pillarName }}</td><td>T0{{ p.touch }}</td><td>{{ p.pieces }}</td></tr></tbody></table>
        </div>
        <div class="ihm-return">
          <b>Mail came back, or the owner asked to stop?</b>
          <div class="ihm-row">
            <input type="text" v-model.trim="returnId" placeholder="Mailpiece ID, e.g. HH-000000012" />
            <button class="ihm-btn" :disabled="!returnId" @click="setStatus('RETURNED')">Returned mail</button>
            <button class="ihm-btn" :disabled="!returnId" @click="setStatus('OPTED_OUT')">Asked to stop</button>
          </div>
          <p v-if="notice" class="ihm-ok">{{ notice }}</p>
        </div>
        <div class="ihm-actions"><button class="ihm-btn" @click="goStep(3)">← Back</button><button class="ihm-btn" @click="loadTracking">Refresh</button></div>
      </div>
    </transition>
  </section>
</template>

<script>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';

const API = '/api/v1/direct-mail/inhouse';

export default {
  name: 'InHouseMailing',
  setup() {
    const touches = [{ n: 1, name: 'First outreach' }, { n: 2, name: 'Follow-up' }, { n: 3, name: 'Final courtesy' }];
    const steps = [{ n: 1, label: 'Verify' }, { n: 2, label: 'Letter & envelope' }, { n: 3, label: 'Produce' }, { n: 4, label: 'Track' }];
    const stages = ['Checking who can receive it', 'Giving every piece its own ID', 'Setting the letters', 'Matching the envelopes', 'Packaging the files'];
    const step = ref(1);
    const touch = ref(1);
    const gapDays = ref(14);
    const includePossible = ref(false);
    const pillarPick = ref([]);
    const audience = ref({});
    const status = ref({ touches: [] });
    const runs = ref([]);
    const tracking = ref({});
    const loading = ref(false);
    const building = ref(false);
    const uploading = ref('');
    const error = ref('');
    const notice = ref('');
    const lastRun = ref(null);
    const runLabel = ref('');
    const returnId = ref('');
    const stageIdx = ref(0);
    const shownEligible = ref(0);
    const place = reactive({ envelope: { addressXIn: null, addressYIn: null, fontPt: 11 }, letter: { printName: false, nameXIn: 1, nameYIn: 2, fontPt: 11, qr: true } });
    let stageTimer = null, countTimer = null;

    const touchName = computed(() => touches.find(t => t.n === touch.value)?.name || '');
    const fmtDate = d => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
    // The sign-in travels with each request the page makes (not as a cookie), so files are fetched here and then saved or opened;
    // a plain link to the address would be refused with "Sign in again".
    async function fetchBlob(url, fallbackName) {
      const res = await fetch(url);
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `The file could not be created (${res.status}).`); }
      const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || fallbackName;
      return { blob: await res.blob(), name };
    }
    async function getFile(id, what, openIt) {
      error.value = '';
      const win = openIt ? window.open('', '_blank') : null; // opened first so the browser allows it
      try {
        const { blob, name } = await fetchBlob(`${API}/runs/${id}/download/${what}${openIt ? '?inline=1' : ''}`, what);
        const objectUrl = URL.createObjectURL(blob);
        if (openIt) { if (win) win.location.href = objectUrl; else window.open(objectUrl, '_blank'); }
        else { const a = document.createElement('a'); a.href = objectUrl; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
        setTimeout(() => URL.revokeObjectURL(objectUrl), 120000);
      } catch (e) { if (win) win.close(); error.value = e.message; }
    }

    async function api(path, options = {}) {
      const res = await fetch(API + path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `The request failed (${res.status}).`);
      return data;
    }
    const guard = async work => { error.value = ''; try { return await work(); } catch (e) { error.value = e.message; } };

    function templatesFor(n) { return status.value.touches.find(t => t.touch === n) || {}; }
    const templatesReady = n => Boolean(templatesFor(n).letter && templatesFor(n).envelope);
    const slot = kind => templatesFor(touch.value)[kind] || null;

    function syncPlacement() {
      const e = slot('envelope'), l = slot('letter');
      Object.assign(place.envelope, { addressXIn: null, addressYIn: null, fontPt: 11 }, e ? e.placement : {});
      Object.assign(place.letter, { printName: false, nameXIn: 1, nameYIn: 2, fontPt: 11, qr: true }, l ? l.placement : {});
    }
    async function loadStatus() { await guard(async () => { status.value = await api('/status'); syncPlacement(); }); }

    function countUp(to) {
      clearInterval(countTimer);
      const from = shownEligible.value; const start = performance.now();
      countTimer = setInterval(() => {
        const k = Math.min(1, (performance.now() - start) / 600);
        shownEligible.value = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
        if (k >= 1) clearInterval(countTimer);
      }, 30);
    }
    async function loadAudience() {
      loading.value = true;
      await guard(async () => {
        const q = new URLSearchParams({ touch: touch.value, gapDays: gapDays.value || 0, includePossible: includePossible.value ? '1' : '0' });
        if (pillarPick.value.length) q.set('pillars', pillarPick.value.join(','));
        audience.value = await api('/audience?' + q);
        countUp(audience.value.eligibleCount || 0);
      });
      loading.value = false;
    }
    async function loadRuns() { await guard(async () => { runs.value = (await api('/runs')).runs; }); }
    async function loadTracking() { await guard(async () => { tracking.value = await api('/tracking'); }); }

    function selectTouch(n) { touch.value = n; pillarPick.value = []; lastRun.value = null; notice.value = ''; syncPlacement(); loadAudience(); }
    function goStep(n) {
      step.value = n; notice.value = ''; error.value = '';
      if (n === 1) loadAudience();
      if (n === 3) { loadAudience(); loadRuns(); }
      if (n === 4) loadTracking();
    }
    function togglePillar(code) {
      pillarPick.value = pillarPick.value.includes(code) ? pillarPick.value.filter(c => c !== code) : [...pillarPick.value, code];
      loadAudience();
    }

    async function upload(kind, event) {
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      if (!file) return;
      uploading.value = kind; notice.value = '';
      await guard(async () => {
        const type = file.type || '';
        const signed = await api('/templates/upload-url', { method: 'POST', body: JSON.stringify({ touch: touch.value, kind: kind.toUpperCase(), filename: file.name, contentType: type, size: file.size }) });
        const put = await fetch(signed.upload_url, { method: 'PUT', headers: signed.headers, body: file });
        if (!put.ok) throw new Error('The file could not be uploaded. Please try again.');
        await api('/templates', { method: 'POST', body: JSON.stringify({ touch: touch.value, kind: kind.toUpperCase(), objectKey: signed.object_key, filename: file.name, size: file.size }) });
        notice.value = `${kind === 'letter' ? 'Letter' : 'Envelope'} uploaded for ${touchName.value}.`;
        await loadStatus();
      });
      uploading.value = '';
    }
    async function savePlacement(kind) {
      const row = slot(kind); if (!row) return;
      await guard(async () => {
        await api(`/templates/${row.template_id}/placement`, { method: 'PUT', body: JSON.stringify(place[kind]) });
        notice.value = 'Placement saved. Use Preview to check it.';
        await loadStatus();
      });
    }
    async function preview(kind) {
      error.value = '';
      const win = window.open('', '_blank');
      try {
        const { blob } = await fetchBlob(`${API}/preview?touch=${touch.value}&kind=${kind.toUpperCase()}`, 'preview.pdf');
        const objectUrl = URL.createObjectURL(blob);
        if (win) win.location.href = objectUrl; else window.open(objectUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(objectUrl), 120000);
      } catch (e) { if (win) win.close(); error.value = e.message; }
    }

    async function build() {
      building.value = true; lastRun.value = null; stageIdx.value = 0;
      stageTimer = setInterval(() => { if (stageIdx.value < stages.length - 1) stageIdx.value++; }, 700);
      await guard(async () => {
        const result = await api('/runs', { method: 'POST', body: JSON.stringify({ touch: touch.value, pillars: pillarPick.value, gapDays: gapDays.value || 0, includePossible: includePossible.value, label: runLabel.value }) });
        stageIdx.value = stages.length;
        lastRun.value = result.run;
        runLabel.value = '';
        await Promise.all([loadRuns(), loadAudience()]);
      });
      clearInterval(stageTimer); building.value = false;
    }
    async function markMailed(run) {
      if (!window.confirm(`Mark ${run.run_code} (${run.piece_count} pieces) as mailed? The follow-up touch is planned from this date.`)) return;
      await guard(async () => { await api(`/runs/${run.run_id}/mailed`, { method: 'POST' }); await loadRuns(); });
    }
    async function setStatus(st) {
      await guard(async () => {
        await api('/pieces/status', { method: 'POST', body: JSON.stringify({ mailpieceId: returnId.value, status: st }) });
        notice.value = `${returnId.value.toUpperCase()} is marked ${st === 'RETURNED' ? 'returned' : 'asked to stop'} and will not be mailed again.`;
        returnId.value = '';
        await loadTracking();
      });
    }
    const barWidth = n => { const max = Math.max(1, ...(tracking.value.touches || []).map(t => t.pieces)); return Math.round((n / max) * 100); };

    onMounted(async () => { await loadStatus(); await loadAudience(); });
    onBeforeUnmount(() => { clearInterval(stageTimer); clearInterval(countTimer); });

    return { touches, steps, stages, step, touch, touchName, gapDays, includePossible, pillarPick, audience, runs, tracking, loading, building, uploading, error, notice, lastRun, runLabel, returnId, stageIdx,
      shownEligible, place, fmtDate, getFile, templatesReady, slot, selectTouch, goStep, togglePillar, loadAudience, loadTracking, upload, savePlacement, preview, build, markMailed, setStatus, barWidth };
  }
};
</script>

<style scoped>
.ihm { margin: 0 0 24px; padding: 20px; border: 1px solid #1c4468; border-radius: 14px; background: linear-gradient(180deg, #071a2e, #04101d); color: #dbe7f5; }
.ihm-head { display: flex; gap: 20px; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; }
.ihm-eyebrow { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #edcf7c; font-weight: 700; }
.ihm h2 { margin: 4px 0; font-size: 22px; color: #fff; font-family: Georgia, 'Times New Roman', serif; }
.ihm h3 { margin: 0 0 12px; font-size: 17px; color: #fff; }
.ihm h4 { margin: 18px 0 8px; color: #edcf7c; font-size: 12px; text-transform: uppercase; letter-spacing: .1em; }
.ihm p { margin: 0 0 10px; font-size: 13px; line-height: 1.5; color: #9fb4cc; max-width: 640px; }
.ihm-touches { display: flex; gap: 8px; flex-wrap: wrap; }
.ihm-touch { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 8px 28px 8px 12px; border: 1px solid #1c4468; border-radius: 10px; background: #0b2038; color: #9fb4cc; cursor: pointer; transition: all .2s; }
.ihm-touch b { font-size: 13px; color: #edcf7c; }
.ihm-touch span { font-size: 11px; }
.ihm-touch.on { border-color: #edcf7c; background: #12304f; color: #fff; box-shadow: 0 0 0 1px rgba(237, 207, 124, .35); }
.ihm-dot { position: absolute; top: 10px; right: 10px; width: 8px; height: 8px; border-radius: 50%; }
.ihm-dot.ok { background: #35c58a; } .ihm-dot.wait { background: #e0a93b; }
.ihm-steps { position: relative; display: flex; justify-content: space-between; margin: 22px 0 18px; }
.ihm-line { position: absolute; left: 24px; right: 24px; top: 17px; height: 2px; background: #1c4468; }
.ihm-line-fill { height: 100%; background: #edcf7c; transition: width .5s ease; }
.ihm-step { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; background: none; border: 0; cursor: pointer; color: #7f97b2; }
.ihm-step-n { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; border: 1px solid #1c4468; background: #071a2e; font-size: 12px; font-weight: 700; transition: all .3s; }
.ihm-step-l { font-size: 11px; font-weight: 600; }
.ihm-step.on { color: #fff; } .ihm-step.on .ihm-step-n { border-color: #edcf7c; color: #edcf7c; transform: scale(1.12); box-shadow: 0 0 14px rgba(237, 207, 124, .35); }
.ihm-step.done .ihm-step-n { background: #edcf7c; color: #04101d; border-color: #edcf7c; }
.ihm-panel { padding: 18px; border: 1px solid #12304f; border-radius: 12px; background: #06182b; }
.ihm-error { padding: 10px 12px; border: 1px solid #a8433f; border-radius: 8px; background: rgba(168, 67, 63, .15); color: #ffb4ae !important; }
.ihm-ok { color: #6fe0ae !important; }
.ihm-muted { color: #7f97b2 !important; font-size: 12px !important; }
.ihm-filters { display: flex; flex-wrap: wrap; gap: 12px 18px; align-items: center; margin-bottom: 14px; }
.ihm-chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.ihm-label { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: #8fa7c2; }
.ihm-chip { padding: 4px 10px; border-radius: 999px; border: 1px solid #1c4468; background: #0b2038; color: #9fb4cc; font-size: 11px; cursor: pointer; }
.ihm-chip.on { border-color: #edcf7c; color: #edcf7c; background: #12304f; }
.ihm-field { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8fa7c2; }
.ihm-field input, .ihm-place input, .ihm-return input[type=text] { padding: 7px 9px; border: 1px solid #1c4468; border-radius: 8px; background: #0b2038; color: #fff; font-size: 13px; width: 100%; box-sizing: border-box; }
.ihm-check { display: flex; gap: 6px; align-items: center; font-size: 12px; color: #9fb4cc; }
.ihm-checks { display: grid; gap: 8px; margin-bottom: 14px; }
.ihm-check-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid #12304f; border-radius: 10px; background: #081f35; animation: ihm-in .45s both; }
.ihm-check-row div { flex: 1; display: flex; flex-direction: column; } .ihm-check-row small { color: #7f97b2; font-size: 11px; }
.ihm-num { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; border: 1px solid #edcf7c; color: #edcf7c; font-size: 11px; font-weight: 700; }
.ihm-badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.ihm-badge.ok { background: rgba(53, 197, 138, .15); color: #6fe0ae; border: 1px solid rgba(53, 197, 138, .4); }
.ihm-badge.warn { background: rgba(224, 169, 59, .13); color: #f0c261; border: 1px solid rgba(224, 169, 59, .4); }
.ihm-big { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; margin: 10px 0 14px; }
.ihm-big-n { display: block; font-size: 46px; line-height: 1; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }
.ihm-big-n.sm { font-size: 30px; margin: 6px 0; } .ihm-big-n.gold { color: #edcf7c; }
.ihm-big-l { display: block; font-size: 12px; color: #8fa7c2; margin-top: 4px; }
.ihm-reasons { font-size: 12px; color: #9fb4cc; } .ihm-reasons ul { margin: 6px 0 0; padding: 0; list-style: none; } .ihm-reasons li { padding: 2px 0; } .ihm-reasons em { font-style: normal; color: #edcf7c; font-weight: 700; margin-right: 6px; }
.ihm-table-wrap { max-height: 320px; overflow: auto; border: 1px solid #12304f; border-radius: 10px; margin-bottom: 12px; }
.ihm-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.ihm-table th { position: sticky; top: 0; background: #0b2038; text-align: left; padding: 8px 10px; color: #8fa7c2; font-weight: 600; }
.ihm-table td { padding: 7px 10px; border-top: 1px solid #0f2a45; color: #dbe7f5; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 11px; }
.ihm-links a { margin-right: 10px; color: #edcf7c; text-decoration: underline; }
.ihm-actions, .ihm-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 12px; }
.ihm-btn { display: inline-block; padding: 8px 14px; border: 1px solid #1c4468; border-radius: 9px; background: #0b2038; color: #dbe7f5; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: none; transition: all .2s; }
.ihm-btn:hover:not(:disabled) { border-color: #edcf7c; color: #fff; }
.ihm-btn:disabled { opacity: .45; cursor: not-allowed; }
.ihm-btn.gold { background: linear-gradient(180deg, #edcf7c, #c9a448); color: #04101d; border-color: #edcf7c; }
.ihm-btn.big { padding: 12px 20px; font-size: 14px; margin-top: 10px; }
.ihm-btn.sm { padding: 4px 10px; font-size: 11px; }
.ihm-slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; margin: 12px 0; }
.ihm-slot { padding: 14px; border: 1px dashed #2a5a85; border-radius: 12px; background: #081f35; transition: border-color .3s; } .ihm-slot.filled { border-style: solid; border-color: #1c4468; }
.ihm-slot-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.ihm-file { color: #fff !important; word-break: break-all; } .ihm-file small { color: #7f97b2; }
.ihm-place { display: grid; gap: 8px; margin: 8px 0; } .ihm-place label { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: #8fa7c2; } .ihm-place label.ihm-check { flex-direction: row; }
.ihm-place input[type=checkbox] { width: auto; }
.ihm-upload { display: inline-block; margin-top: 10px; padding: 8px 14px; border: 1px solid #edcf7c; border-radius: 9px; color: #edcf7c; font-size: 12px; font-weight: 700; cursor: pointer; position: relative; overflow: hidden; }
.ihm-upload input { position: absolute; inset: 0; opacity: 0; cursor: pointer; } .ihm-upload.busy { opacity: .6; animation: ihm-pulse 1s infinite; }
.ihm-produce { display: grid; grid-template-columns: minmax(240px, 1fr) minmax(240px, 1fr); gap: 20px; }
@media (max-width: 720px) { .ihm-produce { grid-template-columns: 1fr; } .ihm-line { display: none; } }
.ihm-sum small { display: block; margin: 8px 0; color: #7f97b2; font-size: 11px; }
.ihm-stages { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; align-content: center; }
.ihm-stages li { display: flex; gap: 10px; align-items: center; font-size: 13px; color: #5f7893; transition: color .3s; }
.ihm-stages li i { width: 12px; height: 12px; border-radius: 50%; border: 2px solid #2a5a85; transition: all .3s; }
.ihm-stages li.on { color: #fff; } .ihm-stages li.on i { border-color: #edcf7c; background: #edcf7c; animation: ihm-pulse .8s infinite; }
.ihm-stages li.past { color: #6fe0ae; } .ihm-stages li.past i { border-color: #35c58a; background: #35c58a; }
.ihm-ready { display: flex; gap: 14px; align-items: flex-start; margin: 16px 0; padding: 14px; border: 1px solid rgba(53, 197, 138, .5); border-radius: 12px; background: rgba(53, 197, 138, .08); }
.ihm-check-anim { width: 40px; height: 40px; flex: none; display: grid; place-items: center; border-radius: 50%; background: #35c58a; color: #04101d; font-size: 22px; font-weight: 800; animation: ihm-bounce .6s; }
.ihm-ready-body { display: flex; flex-direction: column; gap: 8px; } .ihm-ready-body small { color: #9fb4cc; }
.ihm-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-bottom: 14px; }
.ihm-card { padding: 14px; border: 1px solid #12304f; border-radius: 12px; background: #081f35; display: flex; flex-direction: column; gap: 4px; } .ihm-card small { color: #7f97b2; font-size: 11px; line-height: 1.4; }
.ihm-bars { margin-bottom: 14px; } .ihm-bar-row { display: grid; grid-template-columns: 150px 1fr 50px; gap: 10px; align-items: center; margin: 8px 0; font-size: 12px; } .ihm-bar-row b { text-align: right; color: #edcf7c; }
.ihm-bar { height: 8px; border-radius: 999px; background: #0f2a45; overflow: hidden; } .ihm-bar-fill { height: 100%; background: linear-gradient(90deg, #c9a448, #edcf7c); transition: width .7s ease; }
.ihm-return { padding: 14px; border: 1px solid #12304f; border-radius: 12px; background: #081f35; } .ihm-return b { font-size: 13px; } .ihm-return .ihm-row input { max-width: 260px; }
.ihm-slide-enter-active, .ihm-slide-leave-active { transition: all .28s ease; } .ihm-slide-enter-from { opacity: 0; transform: translateX(24px); } .ihm-slide-leave-to { opacity: 0; transform: translateX(-24px); }
.ihm-pop-enter-active { animation: ihm-in .5s both; }
@keyframes ihm-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes ihm-pulse { 50% { opacity: .45; } }
@keyframes ihm-bounce { 0% { transform: scale(.3); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { .ihm *, .ihm *::before { animation: none !important; transition: none !important; } }
</style>
