<template>
<section class="command">
  <div class="topbar">
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
          <a href="/properties" @click="guard">
            <span class="qa-icon" v-html="icons.building || icons.users"></span> View Properties &amp; Photos
          </a>
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
 <header class="hero" :style="heroStyle"><div class="hero-copy"><span class="eyebrow">PRECISION. MOMENTUM. RESULTS.</span><h1>HushHawk <em>Command Center</em></h1><h2>Your wholesale operations. One powerful view.</h2><p>Find leads. Lock contracts. Move properties. Build generational wealth.</p><div class="principles"><span><span class="p-icon" v-html="icons.user"></span> PEOPLE</span><span><span class="p-icon" v-html="icons.house"></span> PROPERTIES</span><span><span class="p-icon" v-html="icons.trendingUp"></span> PROSPERITY</span></div></div><div class="city"><strong>Jacksonville</strong><span>DUVAL + CLAY · FLORIDA</span></div></header>
 <div class="demo-line"><span><i></i> CRM PREVIEW · Sample figures · Podio &amp; messaging not connected</span><span>{{clock}} ET</span></div>
 <div class="metrics"><a v-for="m in metrics" :key="m.label" :href="m.href" @click="guard" class="metric"><span class="metric-icon" v-html="icons[m.iconKey] || icons.house"></span><div><span class="metric-label">{{m.label}}</span><strong>{{m.value}}</strong><small>↑ {{m.change}} <span>sample</span></small></div></a></div>
 <div class="primary-grid">
  <article class="panel map-panel"><CountyMap :uid="uid+'-market-map'" :content="{}" @trigger-event="onZip"/></article>
  <article class="panel inbox"><div class="panel-title"><h3><span class="panel-title-icon" v-html="icons.mail"></span> Email Inbox</h3><a href="/communications" @click="guard">View all ↗</a></div><div class="mail-list"><button v-for="(mail,i) in emails" :key="mail.name" :class="{selected:activeEmail===i}" @click="chooseEmail(i)"><span class="mail-dot"></span><div><strong>{{mail.name}}</strong><b>{{mail.subject}}</b><p>{{mail.body}}</p></div><time>{{mail.time}}</time></button></div><div v-if="activeEmail!==null" class="email-preview"><b>{{emails[activeEmail].subject}}</b><p>{{emails[activeEmail].body}}</p><a href="/communications" @click="guard">Open communications →</a></div><div v-else class="panel-note">Choose a sample email to read it.</div></article>
  <article class="panel chat"><div class="panel-title"><h3><span class="panel-title-icon" v-html="icons.text"></span> Text Messages</h3><a href="/communications" @click="guard">View all ↗</a></div><div class="contact"><span class="avatar">SM</span><div><strong>Sarah M. <small>(Seller)</small></strong><p>Sample conversation</p></div></div><div class="bubbles"><p>Hey, I want to buy your home at 4521 Lenox Ave. Are you interested in selling?</p><p class="outgoing">Yes, I am. What kind of offer are you thinking?</p><p>I can make a cash offer of $72,000 and close in 2 weeks. Does that work for you?</p><p class="outgoing">That sounds good. When can we get started?</p><p>Great! I’ll prepare the next steps.</p></div><form @submit.prevent="saveDraft"><input v-model="draft" :disabled="isEditing" aria-label="Sample message draft" placeholder="Write a draft…"/><button :disabled="!draft.trim()||isEditing">Keep draft</button></form><p class="panel-note" role="status">{{draftStatus||'Draft only · nothing will be sent'}}</p></article>
  <div class="right-stack"><article class="panel priorities"><div class="panel-title"><h3><span class="panel-title-icon" v-html="icons.check"></span> Today’s Priorities</h3><a href="/tasks" @click="guard">View all ↗</a></div><label v-for="(task,i) in tasks" :key="task"><input type="checkbox" v-model="checked" :value="i" :disabled="isEditing"/><span :class="{done:checked.includes(i)}">{{task}}</span></label><small class="panel-note">{{checked.length}} / {{tasks.length}} complete · session preview</small></article><article class="panel imports"><div class="panel-title"><h3><span class="panel-title-icon" v-html="icons.database"></span> County Intelligence</h3></div><div v-for="r in imports" :key="r.name"><span class="check"><span class="tiny-svg" v-html="icons.check"></span></span><strong>{{r.name}}</strong><span>{{r.count}} <small>sample records</small></span></div><a href="/county-data" @click="guard">Review county data →</a></article></div>
 </div>
 <div class="secondary-grid">
  <article class="panel pipeline"><div class="panel-title"><h3><span class="panel-title-icon" v-html="icons.zap"></span> Lead → Funded</h3><span>12 milestones</span></div><div class="stage-grid"><a v-for="(stage,i) in stages" :key="stage" :href="i<4?'/acquisitions':i<8?'/contracts':'/dispositions'" @click="guard" :style="{'--stage':stageColors[i]}" :title="stage"><strong>{{String(i+1).padStart(2,'0')}}</strong><span>{{stage}}</span></a></div><div class="pipeline-footer">BUILD MOMENTUM <span>12 · CLOSED + FUNDED</span></div></article>
  <article class="panel leads"><div class="panel-title"><h3><span class="panel-title-icon" v-html="icons.users"></span> Recent Seller Leads</h3><a href="/seller-leads" @click="guard">View all ↗</a></div><table><thead><tr><th>Name</th><th>Property</th><th>ZIP</th><th>Status</th></tr></thead><tbody><tr v-for="r in filteredLeads" :key="r.name"><td>{{r.name}}</td><td><a href="/seller-leads" @click="guard">{{r.address}}</a></td><td>{{r.zip}}</td><td><span :class="'status '+r.status">{{r.status}}</span></td></tr></tbody></table><p v-if="!filteredLeads.length" class="panel-note">No matching sample leads.</p><button v-if="zip" class="clear-filter" @click="clearZip">ZIP {{zip}} × Clear</button></article>
  <article class="panel sources"><div class="panel-title"><h3><span class="panel-title-icon" v-html="icons.pieChart"></span> Lead Source Mix</h3><span>Sample</span></div><div class="source-body"><div class="donut"><div><strong>1,247</strong><small>Total leads</small></div></div><ul><li v-for="s in sources" :key="s.name"><i :style="{background:s.color}"></i><span>{{s.name}}</span><b>{{s.value}}%</b></li></ul></div></article>
  <article class="panel analyzer"><div class="panel-title"><h3><span class="panel-title-icon" v-html="icons.calculator"></span> Deal Snapshot</h3><a href="/deal-analyzer" @click="guard">Analyze ↗</a></div><strong class="property">4521 Lenox Ave <span>SAMPLE</span></strong><p>Jacksonville, FL 32208</p><dl><div><dt>After-repair value</dt><dd>$198,000</dd></div><div><dt>Estimated repairs</dt><dd>$35,000</dd></div><div><dt>Purchase price</dt><dd>$72,000</dd></div></dl><div class="profit"><span>Illustrative spread*</span><strong>$91,000</strong></div><small>*ARV − purchase − repairs; before fees &amp; costs.</small></article>
 </div>
 <section class="pulse"><div class="pulse-heading"><strong><i></i> CAPITAL DESK</strong><div class="feed-tabs"><button :class="{active:feedMode==='deals'}" @click="!isEditing&&(feedMode='deals')">Deal Pulse</button><button :class="{active:feedMode==='markets'}" @click="!isEditing&&(feedMode='markets')">Market Watch</button></div><span v-if="feedMode==='deals'">SAMPLE CRM SIGNALS</span><button v-if="feedMode==='deals'" @click="!isEditing&&(paused=!paused)" :aria-pressed="paused">{{paused?'Resume':'Pause'}}</button></div><div class="tape-window" v-show="feedMode==='deals'"><div class="tape" :class="{paused}"><span v-for="(item,i) in [...signals,...signals]" :key="i" :aria-hidden="i>=signals.length"><b>{{item.code}}</b> {{item.label}} <strong>{{item.value}}</strong><em>▲ {{item.change}}</em></span></div></div></section>
 <section class="market-tape" v-show="feedMode==='markets'"><div class="market-label"><b>MARKET WATCH</b><span>External quotes · timing varies by exchange</span><a href="https://www.tradingview.com/markets/" target="_blank" rel="noopener noreferrer">TradingView ↗</a></div><div ref="marketHost" class="tradingview-widget-container"><div class="market-placeholder">{{marketError?'Market feed unavailable. Open TradingView ↗':'Loading market quotes…'}}</div></div></section>
 <footer class="footer"><span>HUSHHAWK PROPERTY INTELLIGENCE</span><span>EXECUTE WITH PRECISION. CLOSE WITH CONFIDENCE.</span><span>JACKSONVILLE, FL</span></footer>
</section>
</template>
<script>
import {computed,ref,onMounted,onBeforeUnmount} from 'vue';
import CountyMap from './components/CountyMap.vue';
import { icons } from '../../element-f1b67d54-2716-43a4-a414-ab7f505c2ace/src/icons.js';
export default {components:{CountyMap},props:{uid:{type:String,required:true},content:{type:Object,required:true},},setup(props){
const uid=computed(()=>props.uid||'dashboard');
const isEditing=computed(()=>{return false;});
const heroStyle=computed(()=>({backgroundImage:'linear-gradient(90deg,#06182ef5 0%,#06182ede 36%,#06182e20 76%),url("'+(props.content?.skyline||'')+'")'}));
const feedMode=ref('markets');const query=ref(''),zip=ref(''),checked=ref([]),draft=ref(''),draftStatus=ref(''),paused=ref(false),activeEmail=ref(null),clock=ref(''),marketHost=ref(null),marketError=ref(false);let timer,marketTimer;
const isQuickAddOpen=ref(false),isNotifOpen=ref(false),currentTime=ref('09:42 AM');
let clickOutsideHandler=null;
const metrics=[['users','Total Seller Leads','1,247','12%','seller-leads'],['phone','Contact Rate','68%','5%','communications'],['calendar','Appointments Set','214','18%','calendar'],['file','Offers Pending','48','18%','acquisitions'],['handshake','Under Contract','28','27%','contracts'],['badgeDollar','Assignment Revenue','$286,400','42%','analytics'],['calculator','Avg. MAO','$72,500','16%','deal-analyzer'],['house','Avg. ARV','$198,000','11%','deal-analyzer'],['users','Cash Buyer Matches','412','25%','cash-buyers'],['dollar','Dispo Opportunities','36','29%','dispositions']].map(x=>({iconKey:x[0],label:x[1],value:x[2],change:x[3],href:'/'+x[4]}));
const emails=[{name:'Tom Richards',subject:'Re: Property at 4521 Lenox Ave',body:'Thanks for the info. Can you send over the contract for review?',time:'8:24 AM'},{name:'Cash Buyers Network',subject:'Cash Offer Inquiry · 32211',body:'We have a buyer looking in 32211. Please send details.',time:'7:41 AM'},{name:'Podio Notifications',subject:'New Buyer Request',body:'Sample notification: a buyer requested three properties in Duval County.',time:'6:12 AM'},{name:'County Data',subject:'County list import complete',body:'Sample import: 1,247 records are ready for review.',time:'5:36 AM'},{name:'Dispo Team',subject:'Dispo deal follow-up',body:'Following up on 1234 W 6th St. Buyer is still interested.',time:'Yesterday'}];
const tasks=['Call 15 new seller leads','Follow up with 8 hot leads','Review contracts (3)','Review new county data','Dispo follow-up with buyers','Check on 4521 Lenox Ave'];
const imports=[{name:'Duval County',count:'1,247'},{name:'Clay County',count:'892'}];
const leads=[{name:'Michael D.',address:'4521 Lenox Ave',zip:'32208',status:'New'},{name:'Tanya R.',address:'2834 W 21st St',zip:'32209',status:'Contacted'},{name:'Robert L.',address:'1910 Edgewood Ave',zip:'32210',status:'Appointment'},{name:'Lisa K.',address:'6234 Moncrief Rd',zip:'32209',status:'New'},{name:'James B.',address:'7801 Merrill Rd',zip:'32277',status:'Contacted'}];
const filteredLeads=computed(()=>leads.filter(r=>(!zip.value||r.zip===zip.value)&&[r.name,r.address,r.zip,r.status].join(' ').toLowerCase().includes(query.value.toLowerCase().trim())));
const stages=['Lead received','Contact made','Appointment','Offer sent','Signed','Sent to title','EMD confirmed','Title cleared','Dispo launched','Buyer chosen','Assignment','Closed + funded'];
const stageColors=['#187ed4','#268dc7','#3b77d0','#7b63d1','#9a57c0','#b55b94','#bc7770','#c99339','#d2a93c','#78b854','#3ca962','#0fa85a'];
const sources=[{name:'PropStream',value:32,color:'#249bff'},{name:'Direct Mail',value:24,color:'#f64a68'},{name:'Driving for $',value:18,color:'#f3c34e'},{name:'County Data',value:14,color:'#16c798'},{name:'Website',value:8,color:'#a273ed'},{name:'Other',value:4,color:'#8199b3'}];
const signals=[{code:'DUVAL',label:'Lead flow',value:'1,247',change:'12%'},{code:'CLAY',label:'Buyer matches',value:'142',change:'8%'},{code:'CLOSE',label:'Under contract',value:'28',change:'27%'},{code:'YIELD',label:'Assignment revenue',value:'$286.4K',change:'42%'},{code:'DEMAND',label:'Cash buyers',value:'412',change:'25%'}];
function guard(e){if(isEditing.value)e.preventDefault();}
function chooseEmail(i){if(!isEditing.value)activeEmail.value=activeEmail.value===i?null:i;}
function saveDraft(){if(isEditing.value||!draft.value.trim())return;try{wwLib.getFrontWindow().sessionStorage.setItem('elite-dashboard-draft',draft.value);draftStatus.value='Draft saved in this browser session · not sent';}catch(e){draftStatus.value='Draft kept on this page · not sent';}}
function onZip(event){zip.value=event.event?.zip||'';}
function clearZip(){if(!isEditing.value)zip.value='';}
onMounted(()=>{
  const tick=()=>{
    const now=new Date();
    clock.value=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit'}).format(now);
    currentTime.value=now.toLocaleTimeString('en-US',{
      timeZone:'America/New_York',
      hour:'2-digit',
      minute:'2-digit',
      hour12:true
    });
  };
  tick();
  timer=setInterval(tick,30000);
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
  try{draft.value=wwLib.getFrontWindow().sessionStorage.getItem('elite-dashboard-draft')||'';}catch(e){}
if(isEditing.value)return;
const doc=wwLib.getFrontDocument(),host=marketHost.value;if(!host)return;
const widget=doc.createElement('div');widget.className='tradingview-widget-container__widget';host.appendChild(widget);
const script=doc.createElement('script');script.type='text/javascript';script.src='https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';script.async=true;
script.textContent=JSON.stringify({symbols:[{proName:'NASDAQ:NVDA',title:'NVIDIA'},{proName:'NASDAQ:AAPL',title:'Apple'},{proName:'NASDAQ:MSFT',title:'Microsoft'},{proName:'NASDAQ:TSLA',title:'Tesla'},{proName:'AMEX:SPY',title:'S&P 500 ETF'},{proName:'AMEX:VNQ',title:'Real Estate ETF'},{proName:'BITSTAMP:BTCUSD',title:'Bitcoin'}],colorTheme:'dark',locale:'en',isTransparent:true,showSymbolLogo:true,displayMode:'adaptive'});
script.onerror=()=>marketError.value=true;host.appendChild(script);
marketTimer=setTimeout(()=>{if(!host.querySelector('iframe'))marketError.value=true;},15000);
});
onBeforeUnmount(()=>{
  clearInterval(timer);
  clearTimeout(marketTimer);
  if(typeof document!=='undefined'&&clickOutsideHandler){
    document.removeEventListener('click',clickOutsideHandler);
  }
  if(marketHost.value)marketHost.value.innerHTML='';
});
return{icons,uid,feedMode,isEditing,heroStyle,metrics,query,zip,checked,tasks,imports,filteredLeads,stages,stageColors,sources,emails,activeEmail,chooseEmail,draft,draftStatus,saveDraft,paused,signals,clock,marketHost,marketError,onZip,clearZip,guard,isQuickAddOpen,isNotifOpen,currentTime};
}};
</script>
<style scoped>
.command{--navy:var(--702de9b1-4d57-47c9-8102-295901b861fa,#0A1128);--white:var(--1a7bb57f-a485-47e0-8fed-98ad7f553b6c,#fff);background:radial-gradient(ellipse at 40% 0%,#103862 0%,#051a30 55%,#041427 100%);color:var(--white);font-family:'Plus Jakarta Sans',Arial,sans-serif;width:100%;min-width:0;container-type:inline-size;padding:0 10px 7px;box-sizing:border-box}
.command *{box-sizing:border-box}.command a{text-decoration:none;color:#65c9ff}.command button,.command input{font:inherit}.command button,.command a{cursor:pointer}.command button:focus-visible,.command a:focus-visible,.command input:focus-visible{outline:2px solid #f5cf72;outline-offset:2px}.command button:disabled{cursor:default;opacity:.5}
.command :deep(svg), .command :deep(.svg-icon){display:block;width:100%;height:100%}
.demo-line i, .pulse-heading i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#28dca1;margin-right:5px;box-shadow:0 0 8px #28dca188}

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
  margin: 0 -10px 0 -10px;
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
.hero{min-height:122px;background-position:center 54%;background-size:cover;display:flex;align-items:center;justify-content:space-between;padding:13px 16px 9px;margin:0 -10px;position:relative;overflow:hidden}.eyebrow{color:#d4bb81;font-size:8px;letter-spacing:2px}.hero h1{font-size:clamp(22px,2.8cqw,37px);line-height:1.2;letter-spacing:-.8px;margin:4px 0;font-weight:800}.hero h1 em{font-style:normal;color:#f3d68c}.hero h2{font-size:15px;margin:0 0 6px;font-weight:650}.hero p{font-size:11px;color:#becddd;margin:0}.principles{display:flex;align-items:center;gap:20px;margin-top:13px;font-size:8.5px;letter-spacing:1.4px;color:#e3cd95}.principles span{display:inline-flex;align-items:center;gap:5px}.p-icon{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;min-width:13px;min-height:13px;flex-shrink:0;color:#e3cd95}.city{text-align:center;margin-right:8%;transform:rotate(-5deg)}.city strong{display:block;font:italic 42px Georgia,serif;color:#f9dc90;text-shadow:0 3px 10px #001025}.city span{font-size:8px;letter-spacing:2px}
.demo-line{display:flex;justify-content:space-between;gap:10px;font-size:8px;padding:4px 0;color:#a6bed2}.demo-line i{background:#eac56b;box-shadow:none;width:4px;height:4px}
.metrics{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:5px;margin-bottom:8px}
.metric{display:flex;align-items:center;gap:6px;min-height:72px;padding:8px 6px;background:linear-gradient(135deg,#113658,#051b35 70%);border:1px solid #21578c;border-radius:5px;box-shadow:inset 0 1px #ffffff10,0 2px 7px #0003;min-width:0;overflow:hidden}
.metric:hover{border-color:#69c7fd;transform:translateY(-1px)}
.metric>div{min-width:0;flex:1;overflow:hidden}
.metric-icon{display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;min-width:17px;min-height:17px;flex-shrink:0;color:#5dcbff}
.metric:nth-child(6) .metric-icon{color:#f1cf75}
.metric:last-child .metric-icon{color:#fa5d73}
.metric-label{font-size:7.5px;color:#c7d8e8;line-height:1.2;display:block;min-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.metric strong{font-size:clamp(11px,0.92cqw,14.5px);color:white;display:block;letter-spacing:-.5px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.metric small{font-size:8px;color:#24e4a0;font-weight:700;white-space:nowrap;display:block;overflow:hidden;text-overflow:ellipsis}
.metric small span{font-size:7px;color:#7c9ab5;font-weight:400}
.primary-grid{display:grid;grid-template-columns:2.03fr 1fr 1.04fr 1.08fr;gap:7px;align-items:stretch}.panel{min-width:0;border:1px solid #245482;border-radius:7px;overflow:hidden;background:linear-gradient(135deg,#102c47,#041a2d 80%);box-shadow:inset 0 1px #ffffff12,0 4px 14px #0002}.panel-title{height:32px;padding:7px 9px;display:flex;align-items:center;justify-content:space-between;gap:5px;border-bottom:1px solid #285071;background:linear-gradient(180deg,#17395880,#0b243750)}.panel-title h3{display:inline-flex;align-items:center;gap:6px;font-size:11px;margin:0;white-space:nowrap;font-weight:750;color:#fff}.panel-title-icon{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;min-width:14px;min-height:14px;flex-shrink:0;color:#73bcdf}.panel-title a,.panel-title>span{font-size:8px;white-space:nowrap;color:#73bcdf}.inbox,.chat{display:flex;flex-direction:column}
.mail-list button{display:flex;position:relative;gap:6px;text-align:left;width:100%;background:none;color:#eaf4ff;border:0;border-bottom:1px solid #264762;padding:12px 8px;min-height:62px}.mail-list button:hover,.mail-list button.selected{background:#22609555}.mail-dot{width:6px;height:6px;background:#f83c60;border-radius:50%;margin-top:4px;flex-shrink:0}.mail-list button>div{min-width:0;flex:1}.mail-list strong{font-size:9px;display:block;padding-right:40px}.mail-list b{font-size:9px;display:block;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mail-list p{margin:3px 0 0;font-size:8px;color:#91adc7;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.mail-list time{position:absolute;top:12px;right:8px;font-size:7px;color:#a6c0d6}.email-preview{padding:9px;font-size:9px;background:#183950}.email-preview p{line-height:1.5}.email-preview b{font-size:10px}.panel-note{font-size:8px;color:#8caac3;margin:0;padding:6px 8px}.inbox>.panel-note{margin-top:auto}
.contact{display:flex;align-items:center;gap:7px;padding:8px;border-bottom:1px solid #24465f}.avatar{width:30px;height:30px;border-radius:50%;background:linear-gradient(140deg,#1ca4d1,#273a6b);display:grid;place-items:center;font-size:10px;font-weight:bold}.contact strong{font-size:11px}.contact small{font-size:8px;color:#a9bdd1}.contact p{font-size:8px;margin:3px 0;color:#8dadc7}.bubbles{padding:7px 8px;display:flex;flex-direction:column;gap:7px;flex:1}.bubbles p{margin:0;padding:7px 8px;background:#23415e;font-size:9px;line-height:1.4;border-radius:7px 7px 7px 0;max-width:92%;align-self:flex-start}.bubbles .outgoing{background:#0878ea;align-self:flex-end;border-radius:7px 7px 0 7px}.chat form{display:flex;gap:4px;padding:0 7px}.chat form input{width:0;flex:1;padding:7px;background:#102b42;border:1px solid #385a78;border-radius:4px;color:white;font-size:9px}.chat form button{background:#147fe8;color:white;border:0;border-radius:4px;font-size:8px;padding:5px}
.right-stack{display:flex;flex-direction:column;gap:7px}.priorities{flex:1}.priorities label{display:flex;align-items:center;gap:6px;padding:7px 9px;font-size:9px;border-bottom:1px solid #183a54}.priorities input{accent-color:#19ca91;width:12px;height:12px;margin:0}.done{text-decoration:line-through;color:#7a9eb7}.imports>div:not(.panel-title){display:flex;align-items:center;gap:7px;margin:0 9px;padding:11px 0;border-bottom:1px solid #23465f;font-size:9px}.imports strong{font-weight:500}.imports>div>span:last-child{margin-left:auto;text-align:right;color:#80b5d8;font-size:9px}.imports small{display:block;font-size:7px}.check{width:16px;height:16px;border-radius:50%;background:#0b985e;display:grid;place-items:center;color:#b7ffdc}.tiny-svg{display:inline-flex;align-items:center;justify-content:center;width:10px;height:10px;min-width:10px;min-height:10px;flex-shrink:0}.imports>a{font-size:8px;display:block;text-align:right;padding:8px}
.secondary-grid{display:grid;grid-template-columns:1.45fr 1.4fr 1fr 1.18fr;gap:7px;margin-top:7px}.stage-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px;padding:7px}.stage-grid a{aspect-ratio:1.15;background:linear-gradient(145deg,color-mix(in srgb,var(--stage) 75%,#0b1c32),#08233a);border:1px solid var(--stage);border-radius:4px;padding:4px;color:#fff;display:flex;flex-direction:column;justify-content:space-between}.stage-grid a:hover{box-shadow:0 0 9px var(--stage)}.stage-grid strong{font-size:13px}.stage-grid span{font-size:7px;line-height:1.15}.stage-grid a:last-child{background:#0ba65a;border-color:#67ffae;box-shadow:0 0 12px #15d37c45}.pipeline-footer{padding:0 7px 6px;color:#a0bbcf;font-size:7px;display:flex;justify-content:space-between}.pipeline-footer span{color:#57ecaa}
table{width:100%;border-collapse:collapse;font-size:8px}th{text-align:left;color:#91aec9;font-weight:500;padding:5px 6px}td{padding:6px;border-top:1px solid #25415b;white-space:nowrap}td a{color:#deecf8!important}.status{font-size:7px;padding:2px 4px;border-radius:3px;background:#178ae0}.status.Contacted{background:#0a916c}.status.Appointment{background:#cfa43f;color:#162233}.clear-filter{margin:2px 5px 5px;background:#244963;color:white;border:1px solid #5cc5fe;border-radius:4px;font-size:8px}
.source-body{display:flex;align-items:center;gap:10px;padding:12px 8px}.donut{flex-shrink:0;width:90px;height:90px;border-radius:50%;background:conic-gradient(#249bff 0 32%,#f64a68 32% 56%,#f3c34e 56% 74%,#16c798 74% 88%,#a273ed 88% 96%,#8199b3 96%);display:grid;place-items:center}.donut>div{width:59px;height:59px;border-radius:50%;background:#082039;display:flex;align-items:center;justify-content:center;flex-direction:column}.donut strong{font-size:16px}.donut small{font-size:7px;color:#a4c1d7}.sources ul{list-style:none;padding:0;margin:0;flex:1;min-width:0}.sources li{display:flex;align-items:center;gap:4px;font-size:7px;margin:7px 0}.sources li i{width:6px;height:6px;border-radius:50%;flex-shrink:0}.sources li b{margin-left:auto}.sources li span{white-space:nowrap}
.property{font-size:10px;display:block;padding:8px 8px 0}.property span{float:right;color:#f18c9b;font-size:7px}.analyzer>p{font-size:8px;color:#9fbad0;margin:3px 8px}.analyzer dl{margin:5px 8px;font-size:8px}.analyzer dl div{display:flex;justify-content:space-between;border-bottom:1px solid #26435a;padding:3px 0}.analyzer dt{color:#a6bed3}.analyzer dd{margin:0}.profit{display:flex;justify-content:space-between;align-items:center;margin:5px 7px;padding:5px;border:1px solid #0c9c68;border-radius:4px;color:#35e6a2;font-size:8px}.profit strong{font-size:15px}.analyzer>small{font-size:6.5px;color:#92aebf;display:block;padding:0 8px 6px}
.pulse{margin-top:7px;border:1px solid #27608c;border-radius:6px;background:#041526;overflow:hidden}.pulse-heading{display:flex;align-items:center;gap:12px;padding:5px 9px;border-bottom:1px solid #143954;font-size:8px}.pulse-heading>strong{color:#edcf81;font-size:9px;letter-spacing:1px}.pulse-heading>span{color:#7d9db8;font-size:7px;letter-spacing:.7px}.pulse-heading button{margin-left:auto;background:transparent;border:0;color:#7fcaf4;font-size:8px}.pulse-heading i{background:#dfbb61;box-shadow:0 0 8px #dfbb6190}.tape-window{overflow:hidden}.tape{display:flex;width:max-content;animation:tapeMove 45s linear infinite}.tape.paused,.tape:hover{animation-play-state:paused}.tape>span{padding:8px 18px;border-right:1px solid #264c64;display:flex;gap:8px;align-items:center;font-size:9px;color:#9bb5cd}.tape b{color:#e5d295;letter-spacing:1px}.tape strong{color:#eef7ff;font-variant-numeric:tabular-nums}.tape em{color:#2ee29c;font-style:normal;font-size:8px}
.market-tape{margin-top:7px;border-top:1px solid #28527a}.market-label{display:flex;align-items:center;gap:10px;padding:5px 4px;font-size:7px;color:#8faec7}.market-label b{color:#85d2ff;letter-spacing:1px;font-size:8px}.market-label a{margin-left:auto}.tradingview-widget-container{min-height:48px}.market-placeholder{font-size:10px;color:#7e9fba;padding:10px}.footer{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #274560;padding-top:7px;margin-top:5px;font-size:6px;letter-spacing:1px;color:#83a3ba}
@keyframes tapeMove{to{transform:translateX(-50%)}}
@container(max-width:1200px){.city{margin-right:4%}.city strong{font-size:32px}.source-body{gap:6px}.donut{width:70px;height:70px}.donut>div{width:47px;height:47px}.donut strong{font-size:12px}.primary-grid{grid-template-columns:1.75fr 1fr 1fr 1.1fr}.panel-title{padding:6px}.panel-title h3{font-size:10px}.stage-grid a{aspect-ratio:1}.source-body{padding:10px 5px}}
@container(max-width:900px){.primary-grid{grid-template-columns:1.4fr 1fr}.secondary-grid{grid-template-columns:1fr 1fr}.metrics{grid-template-columns:repeat(5,1fr)}.metric{min-height:66px;justify-content:flex-start}.metric-icon{display:block}.metric-label{min-height:0}.metric strong{font-size:20px}.city{display:none}.inbox .panel-note{padding:14px}.hero h1{font-size:30px}.stage-grid a{aspect-ratio:1.3}.metric small span{display:none}.bubbles{min-height:220px}}
@container(max-width:560px){.primary-grid,.secondary-grid{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}.metric:last-child:nth-child(odd){grid-column:1/-1}.terminal-badge{display:none}.topbar{gap:5px}.gold-button{padding:6px;font-size:9px}.search input{font-size:10px}.hero h1{font-size:24px}.hero h2{font-size:12px}.hero p{max-width:280px;line-height:1.5}.hero{padding:15px 10px}.demo-line>span:last-child{display:none}.pulse-heading>span{display:none}.footer span:nth-child(2){display:none}.metrics .metric{min-height:70px}.market-label>span{display:none}.stage-grid a{aspect-ratio:1}}
@media(prefers-reduced-motion:reduce){.tape{animation:none;width:100%;overflow:auto}.tape>span[aria-hidden="true"]{display:none}.metric{transform:none!important}}
.search{min-width:0}.tradingview-widget-container:has(iframe) .market-placeholder{display:none}.market-tape{margin-top:0;border-top:0}.feed-tabs{display:flex;gap:5px}.feed-tabs button{border:1px solid #345a75;padding:3px 7px;border-radius:3px;margin:0;color:#93b7d4}.feed-tabs button.active{color:#f3d78f;border-color:#d4b86c;background:#d4b86c14}.metrics{gap:5px}.metric{min-height:68px;padding:7px}.hero{min-height:110px}.principles{margin-top:9px}.hero h1{font-size:clamp(22px,2.6cqw,35px)}

/* Consistent HushHawk spacing and keyboard clarity */
.command{line-height:1.4}
.command .topbar{min-height:50px;gap:12px}
.command .hero{min-height:137px}
.command .panel-head,.command .panel-heading{min-width:0;gap:8px}
.command .panel-head h2,.command .panel-heading h2{min-width:0;line-height:1.3}
.command table td,.command table th{vertical-align:middle}
.command button:hover:not(:disabled){filter:brightness(1.1)}
.command button:focus-visible,.command a:focus-visible,.command summary:focus-visible{outline:2px solid #f0d17c;outline-offset:2px}
.command button:disabled{cursor:not-allowed}
.command .more-workspaces{margin:5px 0;border-top:1px solid #245173;padding-top:5px}
.command .more-workspaces summary{cursor:pointer;font-size:10px;color:#d9c47c;padding:9px 12px}
.command .more-workspaces a{font-size:10px!important;min-height:32px!important}
@media(max-width:700px){.command .topbar{gap:8px}.command .hero{padding-top:14px;padding-bottom:14px}}
</style>