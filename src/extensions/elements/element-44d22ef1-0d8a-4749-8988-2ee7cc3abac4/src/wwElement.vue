<template>
<section class="seller-app" :class="{'nav-open':navOpen}">
 <aside class="sidebar">
  <a href="/home" class="brand" @click="guard"><span class="brand-icon" v-html="icons.logo"></span><strong>HUSHHAWK<br>INTELLIGENCE</strong><small>PEOPLE • PROPERTIES • PROSPERITY</small></a>
  <nav aria-label="HushHawk navigation"><a v-for="(item,i) in navigation.slice(0,13)" :key="item.path" :href="item.path" :class="{active:item.name==='Seller Leads',secondary:i>12}" @click="guard"><span class="icon" v-html="icons[item.icon]"></span>{{item.name}}</a><details class="more-workspaces" open><summary>More workspaces</summary><a v-for="item in navigation.slice(13)" :key="item.path" :href="item.path" @click="guard"><span class="icon" v-html="icons[item.icon]"></span>{{item.name}}</a><a href="/deal-analyzer" @click="guard"><span class="icon" v-html="icons.chart"></span>Deal Analyzer</a></details></nav>
  <div class="brand-bottom"><p>“REAL ESTATE<br>CREATES FREEDOM.”</p><span>HUSHHAWK • BUILT TO CLOSE</span><small>HushHawk Property Intelligence</small></div>
 </aside>
 <main class="workspace">
  <div class="topbar">
    <button class="mobile-menu" @click="!isEditing&&(navOpen=!navOpen)" :aria-expanded="navOpen">
      <span v-html="icons.sliders"></span>
    </button>

    <label class="global-search">
      <span class="icon" v-html="icons.search"></span>
      <input
        v-model="query"
        :disabled="isEditing"
        type="text"
        placeholder="Search parcels, contracts, sellers, buyers, or addresses..."
        aria-label="Global search"
      />
    </label>

    <div class="topbar-right">
      <div class="live-clock">
        <span class="pulse-dot"></span>
        <span class="clock-label">ET (Jacksonville):</span>
        <strong class="font-mono">{{ currentTime }}</strong>
      </div>

      <div class="quick-add-wrap">
        <button class="btn-gold" @click.stop="isQuickAddOpen = !isQuickAddOpen" :aria-expanded="isQuickAddOpen">
          <span class="icon" v-html="icons.plus"></span>
          Add New
          <span class="caret-icon" v-html="icons.chevronDown"></span>
        </button>
        <div v-if="isQuickAddOpen" class="quick-add-menu" @click.stop>
          <a href="/dispositions" @click="guard">
            <span class="qa-icon" v-html="icons.badgeDollar"></span> Add Contract to Dispo
          </a>
          <a href="/cash-buyers" @click="guard">
            <span class="qa-icon" v-html="icons.users"></span> Add Cash Buyer
          </a>
          <a href="/contracts" @click="guard">
            <span class="qa-icon" v-html="icons.file"></span> Create New Contract
          </a>
          <a href="/follow-ups" @click="guard">
            <span class="qa-icon" v-html="icons.clock"></span> Schedule Follow-Up
          </a>
          <a href="/tasks" @click="guard">
            <span class="qa-icon" v-html="icons.tasks"></span> Add Task Milestone
          </a>
          <a href="/deal-analyzer" @click="guard">
            <span class="qa-icon" v-html="icons.calculator"></span> Underwrite New Deal
          </a>
          <a href="/team" @click="guard">
            <span class="qa-icon" v-html="icons.user"></span> Invite Team Member
          </a>
        </div>
      </div>

      <button class="notification-btn" @click.stop="isNotifOpen = !isNotifOpen" aria-label="Notifications">
        <span class="icon" v-html="icons.bell"></span>
        <span class="notif-badge">3</span>
      </button>

      <!-- Notifications Modal / Dropdown -->
      <div v-if="isNotifOpen" class="notif-dropdown" @click.stop>
        <div class="notif-head">
          <strong>Escrow &amp; Pipeline Alerts</strong>
          <span class="badge-sub">3 unread</span>
        </div>
        <div class="notif-item">
          <span class="notif-icon green" v-html="icons.check"></span>
          <div>
            <strong>First American Title: Wire Disbursed</strong>
            <p>$32,500 assignment fee funded for 4812 Moncrief Rd.</p>
            <small>12 mins ago</small>
          </div>
        </div>
        <div class="notif-item">
          <span class="notif-icon gold" v-html="icons.file"></span>
          <div>
            <strong>DocuSign PSA Executed</strong>
            <p>Ronald Campbell signed PSA for $110,000 cash.</p>
            <small>1 hr ago</small>
          </div>
        </div>
        <div class="notif-item">
          <span class="notif-icon cyan" v-html="icons.phone"></span>
          <div>
            <strong>Hot Seller Lead Ingested</strong>
            <p>Travis Holloway (Duval Probate) score 94/100.</p>
            <small>2 hrs ago</small>
          </div>
        </div>
      </div>

      <a href="/settings" class="user-identity" @click="guard" title="HushHawk Acquisitions Command">
        <span class="identity-logo" v-html="icons.logo"></span>
        <div class="identity-text">
          <strong>HushHawk</strong>
          <small>Acquisitions Command</small>
        </div>
        <span class="identity-caret">⌄</span>
      </a>
    </div>
  </div>
  <header class="hero" :style="heroStyle"><div class="hero-copy"><h1>Seller Leads</h1><p>Find Motivated Sellers. Create Opportunities. Change Lives.</p><div class="principles"><span><i class="icon" v-html="icons.handshake"></i> PEOPLE</span><span><i class="icon" v-html="icons.house"></i> PROPERTIES</span><span><i class="icon" v-html="icons.chart"></i> PROSPERITY</span></div></div><div class="jacksonville"><strong>Jacksonville</strong><span>WHOLESALE REAL ESTATE OPPORTUNITIES</span></div><div class="motto">BIGGER<br>DEALS<br>BRIGHTER<br>TOMORROWS.</div></header>
  <div class="kpi-row"><button v-for="(metric,i) in metrics" :key="metric.label" class="kpi" @click="metricAction(i)"><span class="kpi-icon" :class="{golden:i===6}" v-html="icons[metric.icon]"></span><div><span>{{metric.label}}</span><strong>{{metric.value}}</strong><small v-if="mode==='preview'">↑ {{metric.change}}</small><small v-else class="scope">Current loaded page</small></div></button><div class="skyline-tail" :style="heroStyle"></div></div>
  <div class="mode-bar"><span>{{mode==='preview'?'DESIGN PREVIEW · Sample records & figures · Podio not connected':'SAVED LEADS · Read-only records · Filters apply to the loaded page · Podio not connected'}}</span><div><button :class="{active:mode==='preview'}" @click="setMode('preview')">Design preview</button><button :class="{active:mode==='saved'}" @click="setMode('saved')">Saved leads</button></div></div>
  <div class="columns">
   <div class="left-column">
    <section class="panel all-leads">
     <div class="panel-heading"><h2><span class="icon gold-icon" v-html="icons.users"></span>All Seller Leads</h2><span v-if="checked.length" class="selected-count">{{checked.length}} selected</span></div>
     <div class="tabs" role="tablist" aria-label="Lead stage"><button v-for="tab in tabs" :key="tab.key" role="tab" :aria-selected="stage===tab.key" :class="{active:stage===tab.key}" @click="setStage(tab.key)">{{tab.label}} <span>{{number(tab.count)}}</span></button></div>
     <div class="filters"><label class="table-search"><span class="icon" v-html="icons.search"></span><input v-model="query" :disabled="isEditing" placeholder="Search leads by name, address, phone, or source…" aria-label="Filter seller leads"></label><select v-model="statusFilter" :disabled="isEditing" aria-label="Filter by status"><option value="">All Statuses</option><option v-for="s in statuses" :key="s">{{s}}</option></select><select v-model="sourceFilter" :disabled="isEditing" aria-label="Filter by source"><option value="">All Sources</option><option v-for="s in availableSources" :key="s">{{s}}</option></select><select v-model="sortKey" :disabled="isEditing" aria-label="Sort leads"><option value="date">Date Added</option><option value="name">Name A–Z</option><option value="zip">ZIP Code</option><option value="source">Source</option></select><button class="filter-button" @click="!isEditing&&(extraFilters=!extraFilters)" :aria-expanded="extraFilters" aria-label="More filters"><span class="icon" v-html="icons.filter"></span></button></div>
     <div v-if="extraFilters||zipFilter" class="extra-filters"><label>ZIP <input v-model="zipFilter" :disabled="isEditing" inputmode="numeric" maxlength="5" placeholder="All ZIPs"></label><button @click="resetFilters">Clear filters</button><span>{{filtered.length}} matching {{mode==='preview'?'examples':'records'}}</span></div>
     <div class="table-scroll">
      <table><thead><tr><th class="check-cell"><input type="checkbox" :disabled="isEditing||!filtered.length" :checked="allChecked" @change="toggleAll($event.target.checked)" aria-label="Select all visible leads"></th><th v-for="c in columns" :key="c.key" :aria-sort="sortKey===c.key?(sortAscending?'ascending':'descending'):'none'"><button @click="sortBy(c.key)">{{c.label}} <span>↕</span></button></th></tr></thead><tbody><tr v-for="lead in filtered" :key="lead.id" :class="{selected:selected?.id===lead.id}" @click="selectLead(lead)" @keydown.enter="selectLead(lead)" tabindex="0" :aria-label="'Open '+lead.name"><td class="check-cell" @click.stop><input type="checkbox" :disabled="isEditing" :checked="checked.includes(lead.id)" @change="toggleRow(lead.id,$event.target.checked)" :aria-label="'Select '+lead.name"></td><td>{{lead.name}}</td><td>{{lead.address}}</td><td>{{lead.city}}</td><td>{{lead.zip}}</td><td>{{lead.phone||'—'}}</td><td>{{lead.source||'—'}}</td><td><span class="status" :class="statusClass(lead.status)">{{lead.status}}</span></td><td>{{dateLabel(lead.date)}}</td></tr></tbody></table>
      <div v-if="!filtered.length" class="empty">{{mode==='saved'&&content?.loading?'Loading saved leads…':'No leads match these filters.'}} <button @click="resetFilters">Reset</button></div>
     </div>
     <div class="saved-pagination" v-if="(mode==='saved'||isEditing)&&content?.paginationElement?.uid"><wwElement v-bind="content?.paginationElement"/></div>
    </section>
    <div class="lower-left">
     <section class="panel map-panel"><CountyMap :uid="uid+'-seller-map'" :content="{}" @trigger-event="onZip"/></section>
     <section class="panel breakdown"><div class="panel-heading"><h2><span class="icon" v-html="icons.users"></span>Lead Source Breakdown</h2><button @click="openModal('sources')">View All</button></div><div class="source-content"><div class="donut" :style="{background:donutGradient}"><div><strong>{{number(mode==='preview'?1247:rows.length)}}</strong><span>{{mode==='preview'?'Total Leads':'Loaded Leads'}}</span></div></div><div class="legend"><button v-for="s in sourceChart" :key="s.name" @click="chooseSource(s.name)"><i :style="{background:s.color}"></i><span>{{s.name}}</span><b>{{s.percent}}%</b><span>{{number(s.count)}}</span></button></div></div><p class="chart-caption">{{mode==='preview'?'Illustrative source totals · click a source to filter sample rows':'Breakdown of loaded saved records only'}}</p></section>
    </div>
   </div>
   <div class="right-column">
    <section class="panel profile">
     <div class="panel-heading"><h2><span class="icon" v-html="icons.user"></span>Lead Profile</h2><div class="profile-pager"><button @click="stepLead(-1)" :disabled="selectedIndex<=0||isEditing">‹ Previous</button><span>{{selectedIndex>=0?selectedIndex+1:0}} of {{filtered.length}}</span><button @click="stepLead(1)" :disabled="selectedIndex<0||selectedIndex>=filtered.length-1||isEditing">Next ›</button></div></div>
     <template v-if="selected">
      <div class="profile-name"><div><h3>{{selected.name}}</h3><span class="seller-label">Seller Lead</span></div><label class="status-control"><span>Status:</span><select :value="selected.status" @change="changeStatus($event.target.value)" :disabled="isEditing||mode==='saved'" aria-label="Lead status"><option v-for="s in statuses" :key="s">{{s}}</option></select></label></div>
      <div class="profile-address"><span class="icon" v-html="icons.pin"></span>{{selected.address}}{{selected.city&&selected.city!=='—'?', '+selected.city:''}}, FL {{selected.zip}}</div>
      <div class="profile-grid"><button class="property-photo" @click="openModal('photo')" :disabled="mode==='saved'&&!selected.photo"><img v-if="photoUrl&&!photoFailed" :src="photoUrl" alt="Illustrative property exterior" @error="photoFailed=true"><span v-else class="photo-empty"><i class="icon" v-html="icons.house"></i>No property photo</span><span class="photo-count">{{mode==='preview'?'Sample photo · 1/1':'Property photo'}}</span></button><div class="owner card-inset"><h4><span class="icon" v-html="icons.house"></span>Owner Information</h4><dl><div><dt>Name:</dt><dd>{{selected.name}}</dd></div><div><dt>Phone:</dt><dd>{{selected.phone||'—'}}</dd></div><div><dt>Email:</dt><dd>{{selected.email||'—'}}</dd></div><div><dt>Mailing Address:</dt><dd>{{mode==='preview'?'Same as property':'Not provided'}}</dd></div><div><dt>Property Type:</dt><dd>{{selected.type||'—'}}</dd></div></dl></div><div class="estimates card-inset"><h4><span class="icon" v-html="icons.house"></span>Deal Estimates</h4><dl><div><dt>ARV:</dt><dd>{{money(selected.arv)}}</dd></div><div><dt>Repairs:</dt><dd>{{money(selected.repairs)}}</dd></div><div><dt>MAO:</dt><dd>{{money(selected.mao)}}</dd></div><div><dt>Equity:</dt><dd>{{money(selected.equity)}}</dd></div></dl></div><div class="tags card-inset"><strong><span class="icon" v-html="icons.tag"></span>Lead Tags</strong><span v-for="(tag,i) in selected.tags" :key="tag" class="tag" :class="'tag-'+i%3">{{tag}}</span><small v-if="!selected.tags.length">No tags</small><button @click="openModal('tag')" :disabled="mode==='saved'" aria-label="Add preview tag">＋</button></div></div>
      <div class="actions"><button class="call" @click="openModal('call')"><span class="icon" v-html="icons.phone"></span>Call</button><button class="text-action" @click="focusDraft('sms')"><span class="icon" v-html="icons.text"></span>Text</button><button class="email-action" @click="openModal('email')"><span class="icon" v-html="icons.mail"></span>Email</button><button class="gold offer" @click="openModal('offer')"><span class="icon" v-html="icons.file"></span>Create Offer <span>⌄</span></button><button class="more" @click="openModal('details')" aria-label="More lead details"><span class="icon" v-html="icons.more"></span></button></div>
     </template><p v-else class="empty">Select a lead to view its profile.</p>
    </section>
    <div class="messages-grid">
     <section class="panel texts"><div class="panel-heading"><h2><span class="icon" v-html="icons.text"></span>Text Messages</h2><a href="/communications" @click="guard">View All ↗</a></div><template v-if="selected"><div class="message-contact"><span class="avatar">{{initials(selected.name)}}</span><div><strong>{{selected.name}}</strong><span>{{selected.phone||'No phone saved'}}</span></div><small>{{mode==='preview'?'Apr 22, 2024':'Saved record'}}</small></div><div class="bubbles" v-if="mode==='preview'"><div v-for="(msg,i) in messages" :key="i" :class="{outgoing:msg.out}"><p>{{msg.body}}</p><time>{{msg.time}}</time></div></div><div v-else class="empty small-empty">No connected message history for this lead.</div><form class="composer" @submit.prevent="keepDraft"><input ref="smsInput" v-model="smsDraft" :disabled="isEditing" placeholder="Write a draft…" aria-label="SMS draft"><button :disabled="isEditing||!smsDraft.trim()">Keep draft</button></form><p class="draft-note">{{draftNotice||'Draft only · no message is sent'}}</p></template></section>
     <section class="panel email-summary"><div class="panel-heading"><h2><span class="icon" v-html="icons.mail"></span>Email Summary</h2><button @click="openModal('email')">View All</button></div><template v-if="selected"><div class="email-meta"><span class="icon" v-html="icons.mail"></span><div><p>To: {{selected.email||'No email saved'}}</p><p>Subject: Follow Up on {{selected.address}}</p><time>{{mode==='preview'?'Apr 22, 2024 · 9:45 AM':'Draft preview'}}</time></div></div><div class="email-body" v-if="mode==='preview'"><p>Hi {{firstName}},</p><p>Thanks for taking the time to speak with me today. As discussed, I’m a local real estate investor and I’m interested in purchasing your property at {{selected.address}}, {{selected.city}}, FL {{selected.zip}}.</p><p>I’ll be stopping by on Thursday at 10 AM to take a look at the property. If you have any questions in the meantime, feel free to reply to this email or give me a call.</p><p>Best regards,<br>HushHawk Intelligence</p></div><div class="empty small-empty" v-else>No connected email history for this lead.</div><button class="email-draft-button" @click="openModal('email')">Open draft composer →</button></template></section>
    </div>
   </div>
  </div>
  <footer class="page-footer"><span>HUSHHAWK PROPERTY INTELLIGENCE</span><span>PEOPLE • PROPERTIES • PROSPERITY</span><span>JACKSONVILLE, FL</span></footer>
 </main>
 <div v-if="modal" class="modal-backdrop" @click.self="closeModal" @keydown="modalKeys"><section ref="modalBox" class="modal" role="dialog" aria-modal="true" :aria-labelledby="uid+'-modal-title'"><header><h2 :id="uid+'-modal-title'">{{modalTitle}}</h2><button ref="closeButton" @click="closeModal" aria-label="Close dialog">×</button></header>
  <form v-if="modal==='add'" @submit.prevent="addPreview"><p class="modal-notice">Create a sample lead for this design preview. It will not be added to your saved CRM records.</p><label>Name<input v-model="newLead.name" required maxlength="100"></label><label>Property address<input v-model="newLead.address" required maxlength="160"></label><div class="form-two"><label>ZIP code<input v-model="newLead.zip" required pattern="[0-9]{5}" maxlength="5" inputmode="numeric"></label><label>Phone<input v-model="newLead.phone" type="tel"></label></div><label>Source<select v-model="newLead.source"><option v-for="s in sourceNames" :key="s">{{s}}</option></select></label><button class="gold modal-primary">Add preview lead</button></form>
  <template v-else-if="modal==='notifications'"><p class="modal-notice">Sample notifications</p><ul class="notification-list"><li><b>15 new seller leads</b><span>Review today’s acquisition queue.</span></li><li><b>3 contracts to review</b><span>Keep the next closing moving.</span></li><li><b>Duval market map</b><span>Select a ZIP to filter the visible lead list.</span></li></ul></template>
  <template v-else-if="modal==='photo'"><img v-if="photoUrl&&!photoFailed" class="large-photo" :src="photoUrl" alt="Illustrative property exterior"><p class="modal-notice">{{mode==='preview'?'Illustrative stock property image, not a verified photo of this address.':'Property image from saved record.'}}</p></template>
  <form v-else-if="modal==='tag'" @submit.prevent="addTag"><label>New sample tag<input v-model="tagDraft" required maxlength="30"></label><button class="gold modal-primary">Add tag</button></form>
  <template v-else-if="modal==='call'"><p>{{selected?.name}}</p><strong class="phone-number">{{selected?.phone||'No phone number saved'}}</strong><p class="modal-notice" v-if="mode==='preview'">This is a sample contact. Calling is disabled in the design preview.</p><a v-else-if="selected?.phone" class="gold modal-primary" :href="'tel:'+selected.phone.replace(/[^+0-9]/g,'')">Open phone app</a></template>
  <form v-else-if="modal==='email'" @submit.prevent="keepEmail"><p class="modal-notice">Draft only · email delivery is not connected.</p><label>To<input :value="selected?.email||''" readonly></label><label>Subject<input v-model="emailSubject"></label><label>Message<textarea v-model="emailDraft" rows="9"></textarea></label><button class="gold modal-primary">Keep draft</button><p role="status" class="draft-note">{{emailNotice}}</p></form>
  <form v-else-if="modal==='offer'" @submit.prevent="keepOffer"><p class="modal-notice">Offer worksheet · estimates only · no contract is created or sent.</p><div class="form-two"><label>ARV ($)<input v-model.number="offerValues.arv" type="number" min="0" required></label><label>Repair estimate ($)<input v-model.number="offerValues.repairs" type="number" min="0" required></label><label>Purchase factor (%)<input v-model.number="offerValues.factor" type="number" min="0" max="100" step="0.1" required></label><label>Desired assignment fee ($)<input v-model.number="offerValues.fee" type="number" min="0" required></label></div><div class="offer-result"><span>Maximum allowable offer</span><strong>{{money(offerMAO)}}</strong><small>ARV × factor − repairs − assignment fee</small></div><button class="gold modal-primary">Keep worksheet</button><p class="draft-note">{{offerNotice}}</p></form>
  <template v-else-if="modal==='sources'"><p class="modal-notice">{{mode==='preview'?'Illustrative totals from the reference layout':'Current loaded saved-record page'}}</p><div class="source-modal-row" v-for="s in sourceChart" :key="s.name"><i :style="{background:s.color}"></i><b>{{s.name}}</b><span>{{s.percent}}% · {{number(s.count)}} leads</span></div></template>
  <template v-else-if="modal==='details'"><dl class="detail-list"><div><dt>Record</dt><dd>{{selected?.id}}</dd></div><div><dt>Source</dt><dd>{{selected?.source||'—'}}</dd></div><div><dt>Existing lead score</dt><dd>{{selected?.score??'Not supplied'}}</dd></div><div><dt>Assigned to</dt><dd>{{selected?.assignee||'Unassigned'}}</dd></div><div><dt>Notes</dt><dd>{{selected?.notes||'No notes supplied'}}</dd></div></dl><p class="modal-notice">Saved record fields remain unchanged by this preview.</p></template>
 </section></div>
</section>
</template>
<script>
import {ref,reactive,computed,watch,nextTick,onMounted,onBeforeUnmount} from 'vue';
import CountyMap from './components/CountyMap.vue';
import {sampleLeads,navigation,iconDefaults} from './data.js';
import { icons as masterIcons } from '../../element-f1b67d54-2716-43a4-a414-ab7f505c2ace/src/icons.js';
export default {components:{CountyMap},props:{uid:{type:String,required:true},content:{type:Object,required:true},},setup(props){
const uid=computed(()=>props.uid||'seller-leads');
const isEditing=computed(()=>{return false;});
const {getIcon}=wwLib.useIcons();const icons=ref({ ...masterIcons });let iconVersion=0;
watch(()=>Object.keys(iconDefaults).map(k=>props.content?.['icon_'+k]||iconDefaults[k]),async values=>{const version=++iconVersion;const pairs=await Promise.all(Object.keys(iconDefaults).map(async(k,i)=>{try{return[k,await getIcon(values[i])]}catch(e){return[k,'']}}));if(version===iconVersion)icons.value={ ...masterIcons, ...Object.fromEntries(pairs) };},{immediate:true});
const isQuickAddOpen=ref(false),isNotifOpen=ref(false),currentTime=ref('09:42 AM');
let timeInterval=null,clickOutsideHandler=null;
function updateClock(){
  const now=new Date();
  currentTime.value=now.toLocaleTimeString('en-US',{
    timeZone:'America/New_York',
    hour:'2-digit',
    minute:'2-digit',
    hour12:true
  });
}
onMounted(()=>{
  // Auto-inject Properties nav link into sidebar
  const injectPropertiesNav = () => {
    if (typeof document === 'undefined') return;
    if (document.querySelector('.hh-injected-properties-link')) return;
    const allEls = Array.from(document.querySelectorAll('*'));
    let dashboardEl = null;
    let sellerLeadsEl = null;
    for (const el of allEls) {
      if (el.children.length === 0 || (el.tagName === 'P' && el.textContent.trim())) {
        const text = el.textContent ? el.textContent.trim() : '';
        if (text === 'Dashboard' && !dashboardEl) {
          dashboardEl = el.closest('[data-ww-object]') || el.closest('a') || el.closest('[style*="cursor"]') || el.parentElement;
        }
        if (text === 'Seller Leads' && !sellerLeadsEl) {
          sellerLeadsEl = el.closest('[data-ww-object]') || el.closest('a') || el.closest('[style*="cursor"]') || el.parentElement;
        }
      }
    }
    const target = sellerLeadsEl || dashboardEl;
    if (!target || !target.parentElement) return;

    const a = document.createElement('a');
    a.href = '/properties';
    a.className = 'hh-injected-properties-link';
    const isAct = window.location.pathname.includes('/properties');
    a.style.cssText = `
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      padding: 7px 9px !important;
      margin: 2px 0 !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      text-decoration: none !important;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      font-size: 13px !important;
      font-weight: ${isAct ? '700' : '500'} !important;
      color: ${isAct ? '#070B14' : '#CBD5E1'} !important;
      background: ${isAct ? 'linear-gradient(135deg, #f3d98c, #a47e2d)' : 'transparent'} !important;
      box-shadow: ${isAct ? '0 2px 10px rgba(212,175,55,0.35)' : 'none'} !important;
      transition: background-color 0.2s ease, color 0.2s ease !important;
      order: 1 !important;
      width: 100% !important;
      box-sizing: border-box !important;
    `;
    a.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${isAct ? '#070B14' : '#EDCF7C'}" stroke-width="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
      <span>Properties</span>
    `;
    a.onmouseenter = () => {
      if (!window.location.pathname.includes('/properties')) {
        a.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        a.style.color = '#EDCF7C';
      }
    };
    a.onmouseleave = () => {
      if (!window.location.pathname.includes('/properties')) {
        a.style.backgroundColor = 'transparent';
        a.style.color = '#CBD5E1';
      }
    };

    if (sellerLeadsEl && sellerLeadsEl.parentElement) {
      sellerLeadsEl.parentElement.insertBefore(a, sellerLeadsEl);
    } else if (dashboardEl && dashboardEl.nextSibling) {
      dashboardEl.parentElement.insertBefore(a, dashboardEl.nextSibling);
    } else if (dashboardEl && dashboardEl.parentElement) {
      dashboardEl.parentElement.appendChild(a);
    }
  };

  injectPropertiesNav();
  [150, 400, 800, 1500].forEach(ms => setTimeout(injectPropertiesNav, ms));
  if (typeof MutationObserver !== 'undefined') {
    const obs = new MutationObserver(injectPropertiesNav);
    obs.observe(document.body, { childList: true, subtree: true });
  }

  updateClock();
  timeInterval=setInterval(updateClock,30000);
  clickOutsideHandler=(e)=>{
    if(!e.target.closest('.quick-add-wrap')){
      isQuickAddOpen.value=false;
    }
    if(!e.target.closest('.notif-dropdown')&&!e.target.closest('.notification-btn')){
      isNotifOpen.value=false;
    }
  };
  if(typeof document!=='undefined'){
    document.addEventListener('click',clickOutsideHandler);
  }
});
onBeforeUnmount(()=>{
  if(timeInterval)clearInterval(timeInterval);
  if(typeof document!=='undefined'&&clickOutsideHandler){
    document.removeEventListener('click',clickOutsideHandler);
  }
});
const mode=ref('preview'),previewRows=ref(sampleLeads.map(r=>({...r,tags:[...r.tags]}))),query=ref(''),stage=ref('all'),statusFilter=ref(''),sourceFilter=ref(''),zipFilter=ref(''),sortKey=ref('date'),sortAscending=ref(false),extraFilters=ref(false),checked=ref(['preview-1']),selectedId=ref('preview-1'),navOpen=ref(false),photoFailed=ref(false);
const statuses=['New','Contacted','Appointment','Offer Made','Under Contract','Follow Up','Closed','Lost'];
const columns=[{key:'name',label:'Name'},{key:'address',label:'Address'},{key:'city',label:'City'},{key:'zip',label:'Zip'},{key:'phone',label:'Phone'},{key:'source',label:'Source'},{key:'status',label:'Status'},{key:'date',label:'Date Added'}];
function normalizeStatus(v){const t=String(v||'New').toLowerCase();return({'new lead':'New','new':'New','contacted':'Contacted','qualified':'Contacted','appointment':'Appointment','appointment set':'Appointment','offer sent':'Offer Made','offer made':'Offer Made','under contract':'Under Contract','closed':'Closed','closed won':'Closed','lost':'Lost','follow up':'Follow Up','follow-up':'Follow Up'})[t]||String(v);}
const read=(r,key,fallback)=>wwLib.wwUtils.resolveObjectPropertyPath(r,props.content?.[key+'Property']||fallback);
const savedRows=computed(()=>(Array.isArray(props.content?.records)?props.content?.records:[]).map((r,i)=>({id:String(read(r,'id','id')??'saved-'+i),name:read(r,'name','seller_name')||'Unnamed seller',address:read(r,'address','property_address')||'No address',city:read(r,'city','city')||'—',zip:String(read(r,'zip','zip_code')||''),phone:String(read(r,'phone','phone')||''),email:read(r,'email','email')||'',source:read(r,'source','source')||'Other',status:normalizeStatus(read(r,'status','lead_status')),date:read(r,'date','createdAt'),type:read(r,'type','property_type'),score:read(r,'score','lead_score'),assignee:read(r,'assignee','assigned_to'),notes:read(r,'notes','notes'),photo:read(r,'photo','image_url'),arv:read(r,'arv','arv'),repairs:read(r,'repairs','repairs'),mao:read(r,'mao','mao'),equity:read(r,'equity','equity'),tags:[]})));
const rows=computed(()=>mode.value==='preview'?previewRows.value:savedRows.value);
const tabStatus={new:'New',contacted:'Contacted',appointments:'Appointment',offers:'Offer Made',contract:'Under Contract',closed:'Closed'};
const filtered=computed(()=>{const q=query.value.trim().toLowerCase();return rows.value.filter(r=>(!q||[r.name,r.address,r.city,r.zip,r.phone,r.email,r.source].join(' ').toLowerCase().includes(q))&&(stage.value==='all'||r.status===tabStatus[stage.value])&&(!statusFilter.value||r.status===statusFilter.value)&&(!sourceFilter.value||r.source===sourceFilter.value)&&(!zipFilter.value||r.zip.includes(zipFilter.value))).slice().sort((a,b)=>{const av=String(a[sortKey.value]??''),bv=String(b[sortKey.value]??'');return av.localeCompare(bv,undefined,{numeric:true})*(sortAscending.value?1:-1);});});
const selected=computed(()=>filtered.value.find(r=>r.id===selectedId.value)||null),selectedIndex=computed(()=>filtered.value.findIndex(r=>r.id===selectedId.value));
watch(filtered,r=>{if(!r.some(x=>x.id===selectedId.value))selectedId.value=r[0]?.id||'';checked.value=checked.value.filter(id=>rows.value.some(x=>x.id===id));},{immediate:true});
const photoUrl=computed(()=>mode.value==='preview'?props.content?.propertyPhoto:selected.value?.photo);
watch(photoUrl,()=>photoFailed.value=false);
function countStage(key){if(mode.value==='saved')return key==='all'?rows.value.length:rows.value.filter(r=>r.status===tabStatus[key]).length;const base={all:1247,new:86,contacted:856,appointments:214,offers:48,contract:28,closed:72}[key];if(key==='all')return base+previewRows.value.length-sampleLeads.length;return base+previewRows.value.filter(r=>r.status===tabStatus[key]).length-sampleLeads.filter(r=>r.status===tabStatus[key]).length;}
const tabs=computed(()=>[['all','All Leads'],['new','New'],['contacted','Contacted'],['appointments','Appointments'],['offers','Offers'],['contract','Under Contract'],['closed','Closed']].map(([key,label])=>({key,label,count:countStage(key)})));
const metrics=computed(()=>[{label:'Total Seller Leads',value:number(countStage('all')),icon:'users',change:'+12%'},{label:mode.value==='preview'?'New This Week':'New Leads',value:number(countStage('new')),icon:'plus',change:'+28%'},{label:'Contacted',value:number(countStage('contacted')),icon:'phone',change:'+18%'},{label:'Appointments',value:number(countStage('appointments')),icon:'calendar',change:'+35%'},{label:'Offers Made',value:number(countStage('offers')),icon:'file',change:'+37%'},{label:'Under Contract',value:number(countStage('contract')),icon:'handshake',change:'+27%'},{label:mode.value==='preview'?'Closed (Assigned)':'Closed Leads',value:mode.value==='preview'?'$286,400':number(countStage('closed')),icon:'coins',change:'+42%'}]);
const sourceNames=['Direct Mail','Driving for Dollars','Probate','MLS','Cold Call','Bandit Signs','Website','Other'];const colors=['#f74764','#ffc145','#20d6a0','#8e78ed','#7533d9','#249dff','#f4ce74','#7790ac'];const sourceCounts=[349,224,187,150,125,100,75,37],sourcePercents=[28,18,15,12,10,8,6,3];
const availableSources=computed(()=>[...new Set(rows.value.map(r=>r.source).filter(Boolean))].sort());
const sourceChart=computed(()=>{if(mode.value==='preview')return sourceNames.map((name,i)=>({name,color:colors[i],count:sourceCounts[i],percent:sourcePercents[i]}));const names=availableSources.value;return names.map((name,i)=>{const count=rows.value.filter(r=>r.source===name).length;return{name,color:colors[i%colors.length],count,percent:rows.value.length?Math.round(count/rows.value.length*100):0};});});
const donutGradient=computed(()=>{if(!sourceChart.value.length)return'#243a51';let a=0;return'conic-gradient('+sourceChart.value.map(s=>{const start=a;a+=s.count/sourceChart.value.reduce((sum,r)=>sum+r.count,0)*100;return s.color+' '+start+'% '+a+'%'}).join(',')+')';});
const heroStyle=computed(()=>({backgroundImage:'linear-gradient(90deg,#051a33 0%,#051a33e6 30%,#051a3310 68%,#051a3355),url("'+(props.content?.skyline||'')+'")'}));
const allChecked=computed(()=>filtered.value.length>0&&filtered.value.every(r=>checked.value.includes(r.id)));
function guard(e){if(isEditing.value)e.preventDefault();}
function resetFilters(){if(isEditing.value)return;query.value='';stage.value='all';statusFilter.value='';sourceFilter.value='';zipFilter.value='';}
function setMode(v){if(isEditing.value)return;mode.value=v;checked.value=[];resetFilters();}
function setStage(v){if(isEditing.value)return;stage.value=v;statusFilter.value='';}
function metricAction(i){setStage(['all','new','contacted','appointments','offers','contract','closed'][i]);}
function sortBy(k){if(isEditing.value)return;sortAscending.value=sortKey.value===k?!sortAscending.value:true;sortKey.value=k;}
watch(sortKey,k=>{sortAscending.value=k!=='date';});
function selectLead(r){if(isEditing.value)return;selectedId.value=r.id;}
function stepLead(n){if(isEditing.value)return;const r=filtered.value[selectedIndex.value+n];if(r)selectLead(r);}
function toggleRow(id,v){if(isEditing.value)return;checked.value=v?[...new Set([...checked.value,id])]:checked.value.filter(x=>x!==id);}
function toggleAll(v){if(isEditing.value)return;const ids=filtered.value.map(r=>r.id);checked.value=v?[...new Set([...checked.value,...ids])]:checked.value.filter(x=>!ids.includes(x));}
function changeStatus(v){if(isEditing.value||mode.value!=='preview'||!selected.value)return;const r=previewRows.value.find(r=>r.id===selectedId.value);if(r)r.status=v;}
function onZip(e){if(isEditing.value)return;zipFilter.value=e.event?.zip||'';extraFilters.value=true;}
function chooseSource(name){if(isEditing.value)return;sourceFilter.value=sourceFilter.value===name?'':name;}
function number(v){return new Intl.NumberFormat('en-US').format(v||0);}
function money(v){if(v==null||v===''||!Number.isFinite(Number(v)))return'—';return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(v));}
function dateLabel(v){if(!v)return'—';const d=new Date(String(v).length===10?v+'T12:00:00':v);return Number.isNaN(d.valueOf())?'—':d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
function initials(s){return String(s||'').split(' ').map(p=>p[0]).filter(Boolean).slice(0,2).join('');}
function statusClass(s){return String(s).toLowerCase().replace(/[^a-z]+/g,'-');}
const firstName=computed(()=>selected.value?.name?.split(' ')[0]||'there');
const messages=computed(()=>[{body:'Hey, I want to buy your home. Are you interested in selling?',time:'9:14 AM'},{body:'Yes, I am. What kind of offer are you thinking?',out:true,time:'9:16 AM'},{body:'I’d like to take a look. The house needs some work, but I’m open to a fair offer.',time:'9:21 AM'},{body:'Great! I can schedule a time to come by this week. Does Thursday at 10 AM work for you?',out:true,time:'9:21 AM'},{body:'Yes, that works. See you then.',time:'9:22 AM'}]);
const smsInput=ref(null),smsDraft=ref(''),draftNotice=ref(''),drafts=reactive({});
watch(selectedId,()=>{smsDraft.value=drafts[selectedId.value]||'';draftNotice.value='';});
function focusDraft(){if(isEditing.value)return;smsInput.value?.focus();smsInput.value?.scrollIntoView({behavior:'auto',block:'nearest'});}
function keepDraft(){if(isEditing.value||!selected.value||!smsDraft.value.trim())return;drafts[selectedId.value]=smsDraft.value;draftNotice.value='Draft kept for this lead on this page · not sent';}
const modal=ref(''),modalBox=ref(null),closeButton=ref(null);let previousFocus=null;
const newLead=reactive({name:'',address:'',zip:'',phone:'',source:'Direct Mail'}),tagDraft=ref(''),emailSubject=ref(''),emailDraft=ref(''),emailNotice=ref(''),offerNotice=ref(''),offerValues=reactive({arv:285000,repairs:65000,factor:70,fee:10000});
const modalTitle=computed(()=>({add:'Add Lead',notifications:'Notifications',photo:'Property Photo',tag:'Lead Tags',call:'Call Seller',email:'Email Draft',offer:'Create Offer',sources:'Lead Source Breakdown',details:'Lead Details'})[modal.value]||'');
const offerMAO=computed(()=>{const a=Number(offerValues.arv)||0,r=Number(offerValues.repairs)||0,rawF=Number(offerValues.factor)||70,fee=Number(offerValues.fee)||0;const factor=rawF>1?rawF/100:rawF;return Math.round(a*factor-r-fee);});
async function openModal(v){if(isEditing.value)return;if(!['add','notifications','sources'].includes(v)&&!selected.value)return;previousFocus=wwLib.getFrontDocument().activeElement;modal.value=v;tagDraft.value='';emailNotice.value='';offerNotice.value='';if(v==='email'){const kept=drafts['email-'+selectedId.value];emailSubject.value=kept?.subject||'Follow Up on '+selected.value.address;emailDraft.value=kept?.body||'Hi '+firstName.value+',\n\nThanks for taking the time to speak with me. I’m interested in discussing your property at '+selected.value.address+'. When would be a good time to connect?\n\nBest regards,\nHushHawk Intelligence';}if(v==='offer'){const kept=drafts['offer-'+selectedId.value];Object.assign(offerValues,kept||{arv:selected.value.arv??0,repairs:selected.value.repairs??0,factor:70,fee:10000});}await nextTick();closeButton.value?.focus();}
function closeModal(){modal.value='';nextTick(()=>previousFocus?.focus?.());}
function modalKeys(e){if(e.key==='Escape'){e.preventDefault();closeModal();}if(e.key==='Tab'){const els=[...modalBox.value.querySelectorAll('button:not([disabled]),a[href],input,select,textarea,[tabindex="0"]')];const first=els[0],last=els[els.length-1],active=wwLib.getFrontDocument().activeElement;if(e.shiftKey&&active===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&active===last){e.preventDefault();first?.focus();}}}
function addPreview(){if(isEditing.value||!newLead.name.trim()||!newLead.address.trim()||!/^\d{5}$/.test(newLead.zip))return;const id='preview-'+Date.now();previewRows.value.unshift({id,...newLead,name:newLead.name.trim(),address:newLead.address.trim(),city:'Jacksonville',email:'',status:'New',date:new Date().toISOString(),tags:[],type:'Not supplied'});mode.value='preview';resetFilters();selectedId.value=id;closeModal();Object.assign(newLead,{name:'',address:'',zip:'',phone:'',source:'Direct Mail'});}
function addTag(){if(mode.value!=='preview'||!selected.value||!tagDraft.value.trim())return;const r=previewRows.value.find(r=>r.id===selectedId.value);if(!r.tags.includes(tagDraft.value.trim()))r.tags.push(tagDraft.value.trim());closeModal();}
function keepEmail(){if(isEditing.value)return;drafts['email-'+selectedId.value]={subject:emailSubject.value,body:emailDraft.value};emailNotice.value='Draft kept on this page · not sent';}
function keepOffer(){if(isEditing.value||offerMAO.value==null)return;drafts['offer-'+selectedId.value]={...offerValues,mao:offerMAO.value};offerNotice.value='Worksheet kept on this page · no offer sent';}
return{uid,isEditing,icons,navigation,navOpen,heroStyle,mode,metrics,tabs,columns,statuses,query,stage,statusFilter,sourceFilter,zipFilter,sortKey,sortAscending,extraFilters,checked,filtered,selected,selectedIndex,photoUrl,photoFailed,availableSources,sourceChart,donutGradient,allChecked,number,money,dateLabel,statusClass,initials,guard,resetFilters,setMode,setStage,metricAction,sortBy,selectLead,stepLead,toggleRow,toggleAll,changeStatus,onZip,chooseSource,firstName,messages,smsInput,smsDraft,draftNotice,focusDraft,keepDraft,modal,modalTitle,modalBox,closeButton,openModal,closeModal,modalKeys,newLead,addPreview,sourceNames,tagDraft,addTag,emailSubject,emailDraft,emailNotice,keepEmail,offerValues,offerMAO,offerNotice,keepOffer,rows,isQuickAddOpen,isNotifOpen,currentTime};
}};
</script>
<style scoped>
.seller-app{--navy:var(--702de9b1-4d57-47c9-8102-295901b861fa,#0A1128);--white:var(--1a7bb57f-a485-47e0-8fed-98ad7f553b6c,#fff);--blue:var(--17e69283-d00e-40b2-8a7e-1f2bcc91e18a,#1D4ED8);--edge:#205386;--cyan:#59c9fb;--gold:#edcf7c;display:grid!important;grid-template-columns:200px minmax(0,1fr)!important;width:100%!important;min-width:0!important;background:#04182d;color:var(--white);font-family:'Plus Jakarta Sans',Arial,sans-serif;line-height:1.35;min-height:100vh}
.seller-app *{box-sizing:border-box}.seller-app a{color:#64c7f6;text-decoration:none}.seller-app button,.seller-app input,.seller-app select,.seller-app textarea{font:inherit}.seller-app button,.seller-app a,.seller-app select{cursor:pointer}.seller-app button{color:inherit}.seller-app button:disabled,.seller-app select:disabled{cursor:default;opacity:.55}.seller-app button:focus-visible,.seller-app a:focus-visible,.seller-app input:focus-visible,.seller-app select:focus-visible,.seller-app textarea:focus-visible,.seller-app tr:focus-visible{outline:2px solid #ffe093;outline-offset:2px}
.icon{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;flex-shrink:0}.icon :deep(svg),.kpi-icon :deep(svg),.brand-icon :deep(svg),.identity-logo :deep(svg){display:block;width:100%;height:100%}
.sidebar{width:200px!important;min-width:200px!important;max-width:200px!important;background:radial-gradient(circle at 85% 0%,#075199 0%,transparent 25%),linear-gradient(180deg,#08274a,#041a33 80%);border-right:1px solid #23568a;position:sticky;top:0;height:100vh;display:flex;flex-direction:column;overflow:auto;box-sizing:border-box}
.brand{height:182px;min-height:182px;display:flex;align-items:center;justify-content:center;flex-direction:column;color:white!important;border-bottom:1px solid #1b4a78;padding:15px 8px 12px;text-align:center}.brand-icon{display:block;width:98px;height:92px;filter:drop-shadow(0 3px 6px #001528)}.brand strong{font-size:15px;font-weight:850;line-height:1.04;margin-top:6px}.brand small{font-size:5.5px;letter-spacing:1px;margin-top:7px}
.sidebar nav{padding:5px 4px;flex:1}.sidebar nav a{display:flex;align-items:center;gap:14px;padding:10px 13px;min-height:40px;font-size:12px;color:#eef4fb;white-space:nowrap;border:1px solid transparent;border-radius:5px}.sidebar nav a.active{background:linear-gradient(130deg,#fff0ab22,#d4ac47 55%,#a07d2d);border-color:#edce81;box-shadow:inset 0 0 10px #fff8,0 0 12px #e5c66a30;color:#fff;font-weight:700}.sidebar nav a:hover{background-color:#2b6fa633}.sidebar nav .icon{width:21px;height:21px}.sidebar nav a.secondary{font-size:11px;min-height:34px;padding-top:7px;padding-bottom:7px}.brand-bottom{text-align:center;padding:10px 12px;color:#e4d39b}.brand-bottom p{border-top:2px solid #c8b471;padding-top:14px;font-size:9px;letter-spacing:2px;line-height:1.7;margin:0 0 6px}.brand-bottom>span{font-size:7px;letter-spacing:1px}.brand-bottom small{display:block;font-size:8px;margin-top:30px;color:#adc1d6}
.workspace{min-width:0!important;flex:1 1 0%!important;container-type:inline-size;background:radial-gradient(ellipse at 55% 0%,#123965,#061c34 65%,#04182d);padding:0 9px 8px;overflow-x:hidden}
.gold{background:linear-gradient(135deg,#f8dfa0,#bc9240);border:1px solid #e4c778;border-radius:5px;color:#13202c!important;font-weight:800;box-shadow:inset 0 1px #fff7}

/* Topbar */
.topbar {
  position: relative;
  z-index: 1000;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 5px solid #0066cc;
  padding: 0 1.5rem;
  background: #04182d;
  margin: 0 -9px 0 -9px;
  box-sizing: border-box;
}

.mobile-menu {
  display: none;
  background: transparent;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
}

.global-search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 520px;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
}

.global-search input {
  color: #fff;
  background: transparent;
  border: 0;
  outline: none;
  font-size: 13px;
  width: 100%;
}

.global-search input::placeholder {
  color: #94a3b8;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
  z-index: 1001;
}

.live-clock {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #94a3b8;
  background: rgba(0, 0, 0, 0.25);
  padding: 0.3rem 0.65rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 6px #4ade80;
}

.clock-label {
  color: #64748b;
}

.btn-gold {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #f8dfa0, #bc9240);
  border: 1px solid #e4c778;
  border-radius: 6px;
  color: #04182d;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.4);
}

.caret-icon {
  width: 14px;
  height: 14px;
  display: inline-flex;
}

.quick-add-wrap {
  position: relative;
  z-index: 1002;
}

.quick-add-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #06182c;
  border: 1px solid rgba(237, 207, 124, 0.45);
  border-radius: 8px;
  padding: 0.5rem 0;
  display: flex;
  flex-direction: column;
  min-width: 235px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(237, 207, 124, 0.2);
  z-index: 99999;
}

.quick-add-menu a {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 1.15rem;
  color: #f8fafc;
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.quick-add-menu a:hover {
  background: rgba(237, 207, 124, 0.16);
  color: #edcf7c;
  padding-left: 1.35rem;
}

.qa-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  color: #edcf7c;
  flex-shrink: 0;
}

.notification-btn {
  position: relative;
  background: transparent;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
  padding: 4px;
}

.notif-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #f87171;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 10px;
}

.notif-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #06182c;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  padding: 0.85rem;
  width: 320px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.95);
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.notif-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.4rem;
  font-size: 0.85rem;
}

.badge-sub {
  font-size: 0.7rem;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.notif-item strong {
  font-size: 0.8rem;
  color: #f8fafc;
  display: block;
}

.notif-item p {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0.15rem 0 0 0;
  line-height: 1.3;
}

.notif-item small {
  font-size: 0.65rem;
  color: #64748b;
}

.notif-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.notif-icon.green {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.notif-icon.gold {
  background: rgba(237, 207, 124, 0.2);
  color: #edcf7c;
}

.notif-icon.cyan {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}

.user-identity {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #f8fafc;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.user-identity:hover {
  background: rgba(255, 255, 255, 0.06);
}

.identity-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.identity-text strong {
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.1;
  color: #ffffff;
  display: block;
}

.identity-text small {
  font-size: 10.5px;
  color: #94a3b8;
  font-weight: 500;
  margin-top: 1px;
  display: block;
}

.identity-caret {
  color: #94a3b8;
  font-size: 11px;
  margin-left: 2px;
}
.hero{margin:0 -9px;min-height:139px;padding:13px 24px 12px;display:flex;align-items:center;position:relative;background-size:cover;background-position:center 56%;overflow:hidden}.hero-copy{position:relative;z-index:1}.hero h1{font-size:42px;line-height:1.1;font-weight:800;letter-spacing:-.8px;margin:0 0 6px}.hero-copy>p{font-size:17px;margin:0;color:#e3eaf3}.principles{display:flex;align-items:center;gap:30px;margin-top:17px}.principles>span{display:flex;align-items:center;gap:12px;letter-spacing:1.5px;font-size:8px;color:#f1ead6}.principles .icon{width:26px;height:26px;color:#edc868}.jacksonville{position:absolute;left:41%;top:20px;text-align:center;transform:rotate(-5deg);text-shadow:0 3px 12px #001225}.jacksonville strong{display:block;font:italic 51px Georgia,serif;line-height:1.2;color:#f2d482}.jacksonville span{font-size:9px;letter-spacing:1px;color:#fff}.motto{margin-left:auto;align-self:flex-end;border-top:2px solid #dec675;padding-top:8px;font-size:8px;letter-spacing:2px;line-height:1.7;color:#edf1f5}
.kpi-row{display:grid;grid-template-columns:1.12fr 1fr 1fr 1.08fr 1fr 1.1fr 1.2fr 1.18fr;gap:6px;margin-bottom:3px}.kpi{display:flex;align-items:center;gap:13px;min-width:0;min-height:76px;text-align:left;padding:9px 13px;background:linear-gradient(135deg,#0e3357,#061b34);border:1px solid #245b99;border-radius:5px;box-shadow:inset 0 1px #ffffff12,0 3px 8px #00112660}.kpi:hover{border-color:#71cfff;background:#123953}.kpi-icon{display:block;width:31px;height:31px;flex-shrink:0;color:#60cafa}.kpi-icon.golden{color:#f2cd71}.kpi>div{min-width:0}.kpi>div>span{display:block;font-size:8px;color:#d2deec;white-space:nowrap}.kpi strong{font-size:22px;line-height:1.3;white-space:nowrap;display:block;letter-spacing:-.5px}.kpi small{display:block;color:#13e798;font-size:11px;font-weight:700}.kpi small.scope{color:#95b3cc;font-size:7px;font-weight:400}.skyline-tail{background-size:cover;background-position:right bottom;border:1px solid #174571;border-radius:5px;opacity:.8}
.mode-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:3px 1px 5px;font-size:7px;letter-spacing:.25px;color:#a2b9ce}.mode-bar>div{display:flex;gap:4px}.mode-bar button{border:1px solid #2c5679;border-radius:3px;background:#071e35;font-size:8px;padding:2px 7px;color:#b6cbde}.mode-bar button.active{color:#f4d88f;border-color:#a58d53;background:#cfad5815}
.columns{display:grid;grid-template-columns:minmax(0,1.36fr) minmax(0,1fr);gap:8px;align-items:start}.left-column,.right-column{min-width:0;display:flex;flex-direction:column;gap:8px}.panel{border:1px solid #205589;border-radius:7px;overflow:hidden;background:linear-gradient(130deg,#0a2946,#051b31 85%);box-shadow:inset 0 1px #ffffff0d,0 3px 8px #00102066}.panel-heading{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:7px 10px;min-height:34px;border-bottom:1px solid #173f66;background:linear-gradient(180deg,#193d5a65,#051d36)}.panel-heading h2{display:flex;align-items:center;gap:9px;font-size:15px;line-height:1.2;font-weight:750;margin:0;white-space:nowrap}.panel-heading h2 .icon{width:22px;height:22px}.panel-heading .gold-icon{color:#ebcd74}.panel-heading>a,.panel-heading>button{font-size:9px;color:#50c4ff;white-space:nowrap}.panel-heading>button{background:none;border:0;padding:0}.selected-count{font-size:9px;color:#e6ce85}
.tabs{display:flex;gap:7px;padding:6px 10px 7px;overflow:auto;border-bottom:1px solid #173952}.tabs button{background:#061b31;color:#d7e4f2;border:1px solid #183f68;border-radius:3px;font-size:9px;padding:4px 9px;white-space:nowrap;box-shadow:inset 0 1px #ffffff08}.tabs button span{padding-left:6px}.tabs button.active{background:linear-gradient(130deg,#f0d483,#b48d37);border-color:#e7c778;color:#102238;font-weight:750}.filters{display:flex;gap:7px;padding:7px 10px 9px;align-items:center}.table-search{display:flex;align-items:center;gap:6px;padding:5px 8px;border:1px solid #214c73;border-radius:4px;flex:1;min-width:90px;background:#03162c}.table-search .icon{width:14px;height:14px}.table-search input{border:0;outline:0;background:none;color:#fff;min-width:0;width:100%;font-size:10px}.table-search input::placeholder{color:#8da5bd}.filters select{color:#e4eff8;background:#081d34;border:1px solid #2d547d;border-radius:4px;font-size:9px;padding:6px 5px;max-width:118px;min-width:0}.filter-button{border:1px solid #2a537d;background:#0b2945;border-radius:4px;padding:4px;display:flex}.filter-button .icon{width:17px;height:17px}.extra-filters{display:flex;align-items:center;gap:10px;font-size:9px;padding:4px 10px 8px;color:#b7cada}.extra-filters label{display:flex;align-items:center;gap:5px}.extra-filters input{width:65px;padding:4px;background:#05182d;border:1px solid #30597e;border-radius:3px;color:#fff}.extra-filters button,.table-foot button{background:transparent;color:#72cafe;border:0;font-size:8px}.extra-filters>span{margin-left:auto}
.table-scroll{overflow:auto;min-height:242px;max-height:315px}.all-leads table{border-collapse:collapse;width:100%;font-size:9px;table-layout:auto;white-space:nowrap}.all-leads th{text-align:left;background:#082d53;position:sticky;top:0;z-index:1;height:28px;border-right:1px solid #173f66;font-weight:500;padding:0 6px}.all-leads th button{width:100%;display:flex;align-items:center;gap:4px;justify-content:space-between;background:none;border:0;padding:0;color:#e2ecf8;font-size:9px}.all-leads th button span{color:#92b4d3;font-size:9px}.all-leads td{padding:5px 6px;height:27px;border-bottom:1px solid #163d60;color:#d9e7f3}.all-leads tbody tr{cursor:pointer}.all-leads tbody tr:nth-child(even){background:#ffffff03}.all-leads tbody tr:hover{background:#21689b40}.all-leads tbody tr.selected{background:linear-gradient(90deg,#ae904ecc,#957d3fa8);box-shadow:inset 0 1px #f4dc9633,inset 0 -1px #f4dc9633}.all-leads tbody tr.selected td{color:#fff}.check-cell{width:26px;text-align:center!important}.check-cell input{width:12px;height:12px;accent-color:#ddc272;margin:0;vertical-align:middle}.status{display:inline-block;min-width:61px;text-align:center;padding:3px 5px;border-radius:3px;font-size:8px;line-height:1.2;background:#3286bf;color:#fff;font-weight:650}.status.new{background:linear-gradient(#19c8fc,#059be3)}.status.contacted{background:linear-gradient(#23d691,#05976c)}.status.appointment{background:linear-gradient(#ffb632,#ec7d0b)}.status.offer-made{background:linear-gradient(#a85df5,#6d2add)}.status.follow-up{background:linear-gradient(#ffe67c,#f3c547);color:#172634}.status.under-contract{background:#235dde}.status.closed{background:#08965f}.status.lost{background:#864c60}.table-foot{display:flex;justify-content:space-between;padding:4px 9px;font-size:7px;color:#86a5bd;border-top:1px solid #173a59}.saved-pagination{padding:7px;background:#e7eff7;color:#102841}.empty{padding:24px 14px;text-align:center;font-size:12px;color:#a3bfd7}.empty button{border:0;background:none;color:#70cdff;text-decoration:underline}.small-empty{font-size:11px;line-height:1.6}
.lower-left{display:grid;grid-template-columns:1.025fr 1fr;gap:8px}.map-panel{min-width:0}.breakdown .panel-heading h2{font-size:12px}.source-content{display:flex;align-items:center;gap:15px;padding:15px 13px 12px}.donut{width:134px;height:134px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;box-shadow:0 3px 18px #0002}.donut>div{width:88px;height:88px;border-radius:50%;background:#071e39;display:flex;align-items:center;justify-content:center;flex-direction:column;box-shadow:inset 0 0 12px #0005}.donut strong{font-size:21px;line-height:1.1}.donut span{font-size:8px;margin-top:4px}.legend{flex:1;min-width:0}.legend button{display:flex;align-items:center;gap:7px;width:100%;border:0;background:none;font-size:8px;padding:5px 0;text-align:left;white-space:nowrap;color:#e0eaf5}.legend button:hover{color:#ffdf88}.legend i,.source-modal-row i{display:block;width:11px;height:11px;border-radius:50%;flex-shrink:0}.legend button>span:first-of-type{flex:1;overflow:hidden;text-overflow:ellipsis}.legend b{font-weight:500;width:27px;text-align:right}.legend button>span:last-child{color:#a9c0d3;text-align:right;width:25px}.chart-caption{font-size:8px;color:#86abc7;padding:0 13px;margin:0 0 11px}
.profile .panel-heading{min-height:31px;padding:6px 11px;border-bottom:0}.profile-pager{display:flex;align-items:center;gap:13px;border:1px solid #245886;border-radius:4px;padding:3px 6px;font-size:8px}.profile-pager button{background:none;border:0;color:#80cefa;font-size:8px;padding:0}.profile-pager>span{white-space:nowrap}.profile-name{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:1px 12px 4px}.profile-name>div{display:flex;align-items:center;gap:8px;min-width:0}.profile-name h3{font-size:22px;font-weight:750;margin:0;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.seller-label{background:linear-gradient(#ffe59c,#cda552);color:#1a2330;border-radius:3px;padding:2px 6px;font-size:9px;font-weight:750;white-space:nowrap}.status-control{display:flex;align-items:center;gap:5px;padding:7px 8px;border:1px solid #159c72;border-radius:4px;background:linear-gradient(150deg,#13af7a,#006a50);font-size:10px;white-space:nowrap}.status-control select{border:0;background:transparent;color:#fff;font-size:10px;max-width:92px}.status-control option{background:#083f37}.profile-address{display:flex;align-items:center;gap:7px;padding:0 12px 7px;font-size:12px}.profile-address .icon{width:16px;height:16px}
.profile-grid{display:grid;grid-template-columns:1.02fr 1.13fr .87fr;grid-template-rows:auto auto;gap:6px;padding:0 11px}.property-photo{grid-row:1/3;position:relative;min-height:167px;padding:0;background:#163651;border:1px solid #295879;border-radius:4px;overflow:hidden}.property-photo img{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}.photo-count{position:absolute;right:3px;bottom:4px;background:#000a;border-radius:3px;padding:3px 6px;font-size:8px;color:#fff}.photo-empty{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px;font-size:10px;color:#a8c3d8}.photo-empty .icon{width:35px;height:35px}.card-inset{border:1px solid #214f7d;background:linear-gradient(120deg,#1235556b,#041a326b);border-radius:4px;min-width:0}.card-inset h4{display:flex;align-items:center;gap:5px;font-size:11px;margin:6px 7px 7px;white-space:nowrap}.card-inset h4 .icon{width:16px;height:16px}.card-inset dl{margin:0 7px 7px;font-size:9px}.card-inset dl>div{display:flex;gap:5px;justify-content:space-between;margin:5px 0}.card-inset dt{color:#bdcde0;white-space:nowrap}.card-inset dd{margin:0;overflow-wrap:anywhere;text-align:right}.owner dl>div{justify-content:flex-start}.owner dt{min-width:50px}.owner dd{text-align:left;font-size:8px}.estimates dd{font-size:11px;font-weight:700}.tags{grid-column:2/4;display:flex;align-items:center;gap:6px;padding:5px 6px;flex-wrap:wrap;min-height:31px}.tags>strong{display:flex;align-items:center;gap:5px;font-size:8px;white-space:nowrap}.tags .icon{width:14px;height:14px}.tags small{font-size:8px;color:#a8bed3}.tag{font-size:8px;padding:4px 6px;border-radius:3px;color:white;white-space:nowrap}.tag-0{background:#ec355d}.tag-1{background:#793fd4}.tag-2{background:#235fd5}.tags button{border:1px solid #2d5782;border-radius:3px;line-height:1;padding:3px 5px;background:#0d2a47;font-size:15px}
.actions{display:grid;grid-template-columns:.85fr .85fr .85fr 1.35fr .33fr;gap:7px;padding:8px 11px 9px}.actions button{display:flex;align-items:center;justify-content:center;gap:9px;border:1px solid #265d9e;border-radius:5px;min-height:40px;padding:5px 6px;font-size:12px;white-space:nowrap}.actions .icon{width:20px;height:20px}.call{background:linear-gradient(#12ba80,#008653)!important;border-color:#00a16a!important}.text-action{background:linear-gradient(#168aff,#0756d1)}.email-action{background:linear-gradient(#12519e,#072d68)}.actions .offer{font-size:11px}.actions .more{background:linear-gradient(#154976,#082449)}.actions .offer>span:last-child{margin-left:auto}
.messages-grid{display:grid;grid-template-columns:1.15fr 1fr;gap:8px;align-items:stretch}.messages-grid .panel-heading{min-height:30px;padding:6px 9px}.messages-grid .panel-heading h2{font-size:12px;gap:7px}.messages-grid .panel-heading h2 .icon{width:19px;height:19px}.messages-grid .panel-heading>a,.messages-grid .panel-heading>button{font-size:8px}.message-contact{display:flex;align-items:center;gap:6px;padding:6px 9px}.avatar{width:30px;height:30px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(135deg,#93b8db,#365674);font-size:10px;font-weight:700;flex-shrink:0}.message-contact>div{min-width:0}.message-contact strong{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.message-contact>div>span{font-size:8px;display:block}.message-contact small{margin-left:auto;font-size:7px;color:#97b4ce;white-space:nowrap}.bubbles{padding:0 8px 7px;display:flex;flex-direction:column;gap:5px;min-height:242px}.bubbles>div{max-width:86%;align-self:flex-start}.bubbles p{font-size:10px;line-height:1.3;margin:0;background:#2a4661;padding:6px 8px;border-radius:6px 6px 6px 0}.bubbles .outgoing{align-self:flex-end}.bubbles .outgoing p{background:#087cff;border-radius:6px 6px 0 6px}.bubbles time{display:block;text-align:right;font-size:7px;color:#9bb8d0;margin-top:2px}.composer{display:flex;gap:4px;padding:0 8px}.composer input{width:0;flex:1;min-width:0;color:#fff;background:#102c46;border:1px solid #2e5679;border-radius:4px;padding:7px;font-size:9px}.composer button{border:1px solid #157be9;background:#096dde;color:#fff;border-radius:4px;font-size:8px;padding:5px}.draft-note{font-size:8px;padding:5px 8px;color:#8fabbe;margin:0;line-height:1.5}
.email-meta{display:flex;gap:9px;padding:7px 10px 0}.email-meta>.icon{width:21px;height:21px;margin-top:6px}.email-meta>div{min-width:0}.email-meta p{font-size:8px;margin:2px 0;overflow-wrap:anywhere}.email-meta time{font-size:7px;color:#9bb4ce}.email-body{padding:0 10px;font-size:10px;line-height:1.32}.email-body p{margin:9px 0}.email-draft-button{margin:0 10px 9px;padding:0;background:none;border:0;color:#73cafd!important;font-size:8px}.page-footer{display:flex;justify-content:space-between;font-size:7px;color:#7d9db8;letter-spacing:1px;margin-top:10px;padding-top:7px;border-top:1px solid #214663}
.modal-backdrop{position:fixed;inset:0;background:#000b;backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}.modal{width:min(570px,100%);max-height:90vh;overflow:auto;border:1px solid #3b739f;border-radius:12px;background:linear-gradient(140deg,#123654,#071b30);box-shadow:0 25px 100px #000a;padding:18px;color:#eef5ff}.modal>header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.modal h2{font-size:20px;margin:0}.modal>header button{background:#1b3b56;border:1px solid #45708c;border-radius:5px;width:31px;height:31px;font-size:22px}.modal-notice{font-size:11px;line-height:1.6;color:#bdd0df;margin:8px 0 15px}.modal label{display:flex;flex-direction:column;gap:5px;font-size:12px;margin:10px 0}.modal input,.modal select,.modal textarea{width:100%;border:1px solid #3b6080;border-radius:5px;background:#06182a;color:white;padding:9px;font-size:13px}.form-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.modal-primary{display:inline-block;padding:10px 15px;margin-top:10px;font-size:12px}.large-photo{display:block;width:100%;max-height:55vh;object-fit:contain;border-radius:6px}.notification-list{list-style:none;padding:0}.notification-list li{padding:12px 0;border-bottom:1px solid #244662}.notification-list b{display:block;font-size:13px}.notification-list span{display:block;font-size:11px;color:#a3c0d4;margin-top:5px}.phone-number{font-size:25px}.offer-result{border:1px solid #1c9e73;border-radius:6px;padding:14px;display:flex;flex-direction:column;gap:5px;color:#4ee8b1}.offer-result>span{font-size:12px}.offer-result strong{font-size:28px}.offer-result small{font-size:10px;color:#a3cdbb}.source-modal-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #244663;font-size:12px}.source-modal-row>span{margin-left:auto}.detail-list>div{display:flex;gap:14px;padding:9px 0;border-bottom:1px solid #31516d;font-size:12px}.detail-list dt{min-width:100px;color:#9cb9cd}.detail-list dd{margin:0;overflow-wrap:anywhere}
@container(max-width:1230px){.kpi{padding:8px;gap:8px}.kpi-icon{width:26px;height:26px}.kpi strong{font-size:20px}.kpi-row{grid-template-columns:repeat(7,minmax(0,1fr))}.skyline-tail{display:none}.hero-copy>p{font-size:14px}.jacksonville{left:47%}.jacksonville strong{font-size:43px}.filters{gap:5px}.filters select{max-width:94px;font-size:8px}.tabs{gap:4px}.tabs button{padding:4px 6px;font-size:8px}.profile-name h3{font-size:18px}.seller-label{font-size:8px}.profile-address{font-size:10px}.profile-grid{grid-template-columns:.9fr 1.2fr .85fr;padding:0 8px;gap:4px}.owner dt{min-width:40px}.card-inset h4{font-size:9px;margin:6px 5px}.card-inset dl{font-size:8px;margin:0 5px 6px}.owner dd{font-size:7px}.estimates dd{font-size:10px}.tags{gap:4px;padding:4px}.tag{font-size:7px;padding:3px 4px}.actions{gap:5px;padding:7px 8px}.actions button{font-size:10px;gap:5px;min-height:38px}.actions .offer{font-size:10px}.actions .icon{width:17px;height:17px}.source-content{padding:13px 8px;gap:9px}.donut{width:108px;height:108px}.donut>div{width:72px;height:72px}.donut strong{font-size:19px}.legend button{font-size:7px;gap:4px}.legend i{width:9px;height:9px}.legend button>span:last-child{width:22px}.breakdown .panel-heading h2{font-size:10px}.profile-pager{gap:6px}.messages-grid .panel-heading h2{font-size:11px}}
@container(max-width:1080px){.columns{grid-template-columns:1.18fr 1fr}.kpi-icon{width:23px;height:23px}.kpi>div>span{font-size:7px}.kpi strong{font-size:18px}.global-search{max-width:600px}.identity small{font-size:8px}.hero h1{font-size:37px}.hero-copy>p{max-width:380px}.profile-grid{grid-template-columns:1fr 1.2fr}.property-photo{grid-row:1/3;min-height:190px}.estimates{grid-column:2}.estimates dl{display:grid;grid-template-columns:1fr 1fr;gap:0 8px}.estimates dl>div{margin:3px 0}.tags{grid-column:1/3}.profile-name>div{gap:4px}.seller-label{display:none}.status-control{font-size:8px;padding:5px}.status-control select{font-size:8px;max-width:70px}.lower-left{grid-template-columns:1fr}.source-content{justify-content:center}.legend{max-width:230px}.legend button{font-size:10px}.messages-grid{grid-template-columns:1fr}.email-body{font-size:11px}.table-scroll{max-height:365px}.filters{flex-wrap:wrap}.table-search{flex-basis:100%}.all-leads table{min-width:610px}.panel-heading h2{font-size:13px}}
@container(max-width:760px){.columns{grid-template-columns:1fr}.lower-left{grid-template-columns:1fr 1fr}.messages-grid{grid-template-columns:1fr 1fr}.profile-grid{grid-template-columns:1.02fr 1.13fr .87fr}.property-photo{grid-row:1/3;min-height:175px}.estimates{grid-column:auto}.estimates dl{display:block}.tags{grid-column:2/4}.owner dd{font-size:10px}.card-inset dl{font-size:10px}.card-inset h4{font-size:12px}.profile-name h3{font-size:22px}.profile-address{font-size:12px}.profile-pager{font-size:10px;gap:12px}.profile-pager button{font-size:10px}.seller-label{display:inline-block}.kpi-row{grid-template-columns:repeat(4,1fr)}.kpi{min-height:65px}.kpi>div>span{font-size:9px}.kpi strong{font-size:23px}.kpi-icon{width:30px;height:30px}.identity{display:none}.jacksonville{display:none}.hero{min-height:135px}.hero h1{font-size:40px}.hero-copy>p{max-width:none}.motto{font-size:7px}.source-content{gap:8px}.legend button{font-size:8px}.legend i{width:7px;height:7px}.mode-bar>span{font-size:6px}.mode-bar button{font-size:7px}.filters{flex-wrap:nowrap}.table-search{flex-basis:auto}}
@container(max-width:520px){.topbar{padding:0;gap:7px;height:46px}.notification{display:none}.add-lead{font-size:10px;padding:6px;min-height:31px}.add-lead .icon{width:14px;height:14px}.global-search{padding:6px;gap:4px}.global-search input{font-size:10px}.global-search .icon{width:16px;height:16px}.hero{padding:16px 12px;min-height:143px}.hero h1{font-size:32px}.hero-copy>p{font-size:12px;max-width:280px}.principles{gap:14px}.principles>span{gap:5px;font-size:6px}.principles .icon{width:20px;height:20px}.motto{display:none}.kpi-row{grid-template-columns:repeat(2,1fr)}.kpi:last-of-type{grid-column:1/-1}.mode-bar{align-items:flex-start;flex-direction:column}.mode-bar>span{font-size:7px}.mode-bar button{font-size:9px}.lower-left,.messages-grid{grid-template-columns:1fr}.filters{flex-wrap:wrap}.table-search{flex-basis:100%}.filters select{flex:1;max-width:none;font-size:9px}.profile-name h3{font-size:17px}.profile-name>div{flex-wrap:wrap}.profile-pager{font-size:7px;gap:5px}.profile-pager button{font-size:7px}.profile-grid{grid-template-columns:1fr 1.2fr}.property-photo{grid-row:1/3;min-height:200px}.estimates{grid-column:2}.estimates dl{display:grid;grid-template-columns:1fr 1fr;gap:0 6px}.tags{grid-column:1/3}.owner dd,.owner dl{font-size:8px}.card-inset h4{font-size:10px}.card-inset dl{font-size:8px}.estimates dd{font-size:9px}.actions button{font-size:9px;gap:4px}.actions .icon{width:15px;height:15px}.actions .offer{font-size:9px}.source-content{justify-content:space-evenly}.legend{max-width:210px}.legend button{font-size:9px}.donut{width:125px;height:125px}.donut>div{width:82px;height:82px}.page-footer span:nth-child(2){display:none}.form-two{grid-template-columns:1fr}}
@media(max-width:700px){.seller-app{grid-template-columns:1fr}.sidebar{display:none;position:fixed;left:0;top:0;width:185px;height:100vh;z-index:100;box-shadow:10px 0 40px #0009}.nav-open .sidebar{display:flex}.mobile-menu{display:block;background:#123653;border:1px solid #315e81;border-radius:4px;padding:6px;color:#c7e1f4;font-size:9px}.nav-open .mobile-menu{position:fixed;left:190px;top:9px;z-index:101}.modal-backdrop{padding:10px}.modal{padding:14px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}

/* Consistent HushHawk spacing and keyboard clarity */
.seller-app{line-height:1.4}
.seller-app .topbar{min-height:50px;gap:12px}
.seller-app .hero{min-height:137px}
.seller-app .panel-head,.seller-app .panel-heading{min-width:0;gap:8px}
.seller-app .panel-head h2,.seller-app .panel-heading h2{min-width:0;line-height:1.3}
.seller-app table td,.seller-app table th{vertical-align:middle}
.seller-app button:hover:not(:disabled){filter:brightness(1.1)}
.seller-app button:focus-visible,.seller-app a:focus-visible,.seller-app summary:focus-visible{outline:2px solid #f0d17c;outline-offset:2px}
.seller-app button:disabled{cursor:not-allowed}
.seller-app .more-workspaces{margin:5px 0;border-top:1px solid #245173;padding-top:5px}
.seller-app .more-workspaces summary{cursor:pointer;font-size:10px;color:#d9c47c;padding:9px 12px}
.seller-app .more-workspaces a{font-size:10px!important;min-height:32px!important}
@media(max-width:700px){.seller-app .topbar{gap:8px}.seller-app .hero{padding-top:14px;padding-bottom:14px}}
</style>