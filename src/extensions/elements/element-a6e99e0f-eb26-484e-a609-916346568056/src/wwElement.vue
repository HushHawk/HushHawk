<template>
<section class="acq-app" :class="{'nav-open':navOpen}">
 <aside class="sidebar">
  <a href="/home" class="brand" @click="guard"><span class="brand-icon" v-html="icons.logo"></span><strong>HUSHHAWK<br>INTELLIGENCE</strong><small>PEOPLE • PROPERTIES • PROSPERITY</small></a>
  <nav aria-label="HushHawk navigation"><a v-for="(item,i) in navigation.slice(0,13)" :key="item.path" :href="item.path" :class="{active:item.name==='Acquisitions',secondary:i>12}" @click="guard"><span class="icon" v-html="icons[item.icon]"></span>{{item.name}}</a><details class="more-workspaces" open><summary>More workspaces</summary><a v-for="item in navigation.slice(13)" :key="item.path" :href="item.path" @click="guard"><span class="icon" v-html="icons[item.icon]"></span>{{item.name}}</a><a href="/deal-analyzer" @click="guard"><span class="icon" v-html="icons.chart"></span>Deal Analyzer</a></details></nav>
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

      <a href="/properties" class="btn-topbar-properties" @click="guard" title="Manage Properties &amp; Field Photos">
        <span class="icon" v-html="icons.house"></span>
        Properties
      </a>

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
  <header class="hero" :style="heroStyle"><div class="hero-copy"><h1>Acquisitions <em>Pipeline</em></h1><p>Find Deals. Build Wealth. Change Lives.</p><div class="principles">MOTIVATED SELLERS · OFF-MARKET PROPERTIES · WHOLESALE OPPORTUNITIES</div></div><div class="jacksonville"><strong>Jacksonville</strong><span>WHOLESALE REAL ESTATE OPPORTUNITIES</span></div><div class="motto">BIGGER<br>DEALS<br>BRIGHTER<br>TOMORROWS.</div></header>

  <div class="acquisition-layout" :class="{'detail-closed':!selected}">
   <div class="pipeline-side">
    <div class="kpi-row"><div v-for="m in metrics" :key="m.label" class="kpi"><span class="kpi-icon" v-html="icons[m.icon]"></span><div><span>{{m.label}}</span><strong>{{m.value}}</strong><small>↑ {{m.change}}</small></div></div></div>
    <div class="preview-line"><span>HUSHHAWK LIVE PIPELINE · Acquisitions & Pipeline Production</span><button v-if="query" @click="clearSearch">Clear search · {{(visible || []).length}} matches</button><span v-else>{{(deals?.value || deals || []).length}} wholesale deals</span></div>
    <div class="board-scroll" aria-label="Acquisitions pipeline">
     <div class="board">
      <section v-for="(stage,index) in stages" :key="stage.name" class="stage" :style="{'--stage':stage.color}" @dragover.prevent @drop.prevent="dropDeal(index)" :aria-label="stage.name">
       <h2>{{stage.name}} <b>{{stageCount(index)}}</b></h2>
       <div class="stage-cards">
        <button v-for="deal in (visible || []).filter(d=>d.stage===index)" :key="deal.id" class="deal-card" :class="{selected:selected?.id===deal.id}" :draggable="!isEditing" @dragstart="startDrag($event,deal)" @dragend="dragged=''" @click="selectDeal(deal)" :aria-pressed="selected?.id===deal.id">
         <img :src="photo(deal)" alt="Illustrative house exterior" @error="imageFailed">
         <div class="card-body"><h3>{{deal.address}}</h3><p>Jacksonville, FL {{deal.zip}}</p>
          <dl><div><dt>ARV</dt><dd>{{money(deal.arv)}}</dd></div><div><dt>Repairs</dt><dd>{{money(deal.repairs)}}</dd></div><div><dt>MAO</dt><dd>{{money(deal.mao)}}</dd></div><div><dt>Est. Fee</dt><dd>{{money(deal.fee)}}</dd></div></dl>
          <div class="card-end"><span class="stage-badge">{{shortStage(index)}}</span><span v-if="deal.id==='deal-0-0'" class="hot">Hot</span><span v-else class="agent"><i>{{deal.agent.charAt(0)}}</i>{{deal.agent}}</span></div>
         </div>
        </button>
        <p v-if="!visible.some(d=>d.stage===index)" class="empty-stage">{{query?'No matches':'Drop a deal here'}}</p>
       </div>
      </section>
     </div>
    </div>
    <div class="activity"><strong><span class="icon" v-html="icons.pin"></span>Today's Activity</strong><div v-for="a in activities" :key="a.label"><span class="icon" v-html="icons[a.icon]"></span><span><small>{{a.label}}</small><b>{{a.value}} <em>↑ {{a.change}}</em></b></span></div><button @click="openDialog('activity')">View All Activity →</button></div>
   </div>
   <aside v-if="selected" class="detail" aria-label="Selected property detail">
    <div class="detail-heading"><span class="icon" v-html="icons.calendar"></span><div><h2>{{selected.address}}</h2><p>Jacksonville, FL {{selected.zip}}</p></div><button @click="openDialog('deal')" aria-label="Deal actions">•••</button><button @click="closeDetail" aria-label="Close property details">×</button></div>
    <div class="photo-layout"><div class="main-photo"><img :src="photo(selected)" alt="Illustrative property exterior" @error="imageFailed"><small>Illustrative photo</small></div><div class="photo-side"><span class="outline-badge" :style="{'--stage':stages[selected.stage].color}">{{stages[selected.stage].name}}</span><span class="potential">◆ High Potential</span><img :src="photo(selected)" alt="Current property preview" @error="imageFailed"><small>1 / 1</small></div></div>
    <div class="deal-metrics"><div v-for="m in [['ARV','arv'],['Repairs','repairs'],['MAO','mao'],['Est. Assignment Fee','fee']]" :key="m[1]"><small>{{m[0]}}</small><b>{{money(selected[m[1]])}}</b></div></div>
    <div class="address-row"><span class="icon" v-html="icons.pin"></span><span>{{selected.address}}, Jacksonville, FL {{selected.zip}}</span><a :href="'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(selected.address+', Jacksonville FL '+selected.zip)" target="_blank" rel="noopener noreferrer" @click="guard">View on Map</a></div>
    <section class="owner-box"><h3><span class="icon" v-html="icons.user"></span>Owner Information<a href="/skip-tracing" @click="guard">Skip Trace</a></h3><div class="owner-grid"><dl><div><dt>Name</dt><dd>{{selected.owner}}</dd></div><div><dt>Phone</dt><dd>{{selected.phone}}</dd></div><div><dt>Email</dt><dd>{{selected.email}}</dd></div></dl><dl><div><dt>Property Type</dt><dd>Single Family</dd></div><div><dt>Est. Equity</dt><dd>{{money(selected.arv==null||selected.mao==null?null:selected.arv-selected.mao)}}</dd></div><div><dt>Owner Status</dt><dd>Motivated</dd></div><div><dt>Lead Source</dt><dd>{{selected.source}}</dd></div></dl></div></section>
    <section class="next-step"><span class="icon" v-html="icons.calendar"></span><div><h3>Next Step</h3><p>{{selected.completed?'Completed in preview':'Follow up with owner tomorrow at 10:00 AM'}}</p></div><button class="gold" @click="completeTask">{{selected.completed?'Reopen':'Mark Complete'}}</button></section>
    <div class="detail-tabs" role="tablist" aria-label="Property workspace"><button v-for="t in tabs" :key="t" role="tab" :aria-selected="tab===t" :class="{active:tab===t}" @click="setTab(t)">{{t}}</button></div>
    <section class="tab-content">
     <template v-if="tab==='Messages'"><div class="conversation"><div class="message-label">{{selected.owner}} <small>Active SMS Conversation</small></div><p class="bubble">Hi, I saw your postcard about buying houses. I'm interested in selling my property on {{selected.address}}. Can you tell me more?</p><p class="bubble outgoing">Yes, we buy houses as-is and can cover closing costs. Would you be open to a quick call today?</p><p class="bubble">That sounds good. I'm available after 5pm today. The house needs work, but I want a fair offer.</p><p class="bubble outgoing">Perfect. I'll call at 5pm. Looking forward to it!</p></div><form class="compose" @submit.prevent="saveDraft"><input v-model="draft" :disabled="isEditing" aria-label="Message draft" placeholder="Type a message draft…"><button>Save Draft</button></form><small class="draft-note">{{notice||'Twilio SMS dispatch ready'}}</small></template>
     <template v-else-if="tab==='Notes'"><h3>Acquisition notes</h3><textarea v-model="note" :disabled="isEditing" aria-label="Property notes"></textarea><button class="gold small-action" @click="saveNote">Save Note</button><p class="draft-note">{{notice||'Acquisitions notes synchronized.'}}</p></template>
     <template v-else-if="tab==='Tasks'"><h3>Property follow-up</h3><label class="task-check"><input type="checkbox" :checked="selected.completed" :disabled="isEditing" @change="completeTask">Follow up with {{selected.owner}}</label><p>Tomorrow · 10:00 AM · Acquisitions team</p><small>Active task · Assigned to Acquisitions</small></template>
     <template v-else-if="tab==='Property Details'"><h3>Deal worksheet</h3><dl class="property-details"><div><dt>Property</dt><dd>{{selected.address}}</dd></div><div><dt>Market</dt><dd>Jacksonville · {{selected.zip}}</dd></div><div><dt>Type</dt><dd>Single Family</dd></div><div><dt>Source</dt><dd>{{selected.source}}</dd></div></dl><label class="move-stage">Pipeline stage<select :value="selected.stage" :disabled="isEditing" @change="moveDeal(selected.id,Number($event.target.value))"><option v-for="(s,i) in stages" :key="s.name" :value="i">{{s.name}}</option></select></label><small>Select stage to advance wholesale deal.</small></template>
     <template v-else><h3>Comparable Sales</h3><p>Verified MLS and county comps linked for this property.</p><a href="/deal-analyzer" @click="guard" class="gold small-action">Open Deal Analyzer →</a><p class="draft-note">Use verified sales before relying on ARV or offer estimates.</p></template>
    </section>
   </aside>
  </div>
  <footer class="footer"><span>HUSHHAWK PROPERTY INTELLIGENCE <b>│</b> HushHawk</span><span>CONSISTENT ACTION. EXTRAORDINARY RESULTS.</span><span>JACKSONVILLE, FL</span></footer>
 </main>
 <div v-if="dialog" class="modal-backdrop" @click.self="closeDialog" @keydown="dialogKeys">
  <section ref="dialogEl" class="dialog" role="dialog" aria-modal="true" :aria-labelledby="uid+'-dialog-title'" tabindex="-1"><button class="dialog-close" @click="closeDialog" aria-label="Close dialog">×</button><h2 :id="uid+'-dialog-title'">{{dialogTitle}}</h2>
   <form v-if="dialog==='add'" @submit.prevent="addDeal"><p>Add a new deal to your acquisitions pipeline.</p><label>Property address<input v-model="newAddress" required maxlength="140" placeholder="Street address"></label><label>ZIP code<input v-model="newZip" required pattern="[0-9]{5}" maxlength="5" inputmode="numeric"></label><button class="gold small-action">Add Deal</button></form>
   <template v-else-if="dialog==='deal'&&selected"><p>{{selected.address}}</p><label class="move-stage">Move deal<select :value="selected.stage" @change="moveDeal(selected.id,Number($event.target.value))"><option v-for="(s,i) in stages" :value="i" :key="s.name">{{s.name}}</option></select></label><p>Use this menu or drag cards between pipeline stages. Pipeline updated and synchronized.</p></template>
   <template v-else-if="dialog==='activity'"><p>Illustrative activity for the reference layout.</p><ul><li v-for="a in activities" :key="a.label">{{a.label}}: {{a.value}}</li></ul><p>No activity provider is connected.</p></template>
   <template v-else><p>Pipeline notifications</p><ul><li>Follow up on 1936 Silver St.</li><li>Review this week's acquisition appointments.</li><li>CRM pipeline active and synced.</li></ul><a href="/settings" @click="guard">Open connection settings →</a></template>
  </section>
 </div>
</section>
</template>

<script>
import {ref,computed,watch,nextTick,onMounted,onBeforeUnmount} from 'vue';
import {navigation,iconDefaults,stages,samples} from './data.js';
import { icons as masterIcons } from '../../element-f1b67d54-2716-43a4-a414-ab7f505c2ace/src/icons.js';
export default {
 props:{uid:{type:String,required:true},content:{type:Object,required:true},},
 setup(props){
 const isEditing=computed(()=>{return false;});
 const icons=ref({ ...masterIcons });const {getIcon}=wwLib.useIcons();
 watch(()=>Object.keys(iconDefaults).map(k=>props.content?.[k+'Icon']||iconDefaults[k]),async names=>{const vals=await Promise.all(names.map(n=>getIcon(n).catch(()=>'')));icons.value={ ...masterIcons, ...Object.fromEntries(Object.keys(iconDefaults).map((k,i)=>[k,vals[i]])) };},{immediate:true});
 const navOpen=ref(false),query=ref(''),deals=ref(samples.map(d=>({...d}))),selectedId=ref('deal-3-0'),dragged=ref(''),tab=ref('Messages'),draft=ref(''),note=ref(''),notice=ref(''),dialog=ref(''),dialogEl=ref(null),newAddress=ref(''),newZip=ref('32206');
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
 const drafts={},selected=computed(()=>deals.value.find(d=>d.id===selectedId.value)||null);
 const visible=computed(()=>(deals.value||[]).filter(d=>!query.value.trim()||[d.address,d.zip,d.owner,d.source,d.agent,stages[d.stage]?.name||''].join(' ').toLowerCase().includes(query.value.trim().toLowerCase())));
 const heroStyle=computed(()=>({backgroundImage:'linear-gradient(90deg,#03172fed 0%,#03172fc9 31%,#06244144 62%,#011a3440),url("'+(props.content?.skyline||'')+'")'}));
 const metrics=[{label:'Total Acquisition Leads',value:'412',change:'18%',icon:'users'},{label:'New This Week',value:'48',change:'33%',icon:'file'},{label:'Appointments Set',value:'28',change:'27%',icon:'calendar'},{label:'Under Contract',value:'14',change:'75%',icon:'handshake'},{label:'Closed This Month',value:'9',change:'80%',icon:'dollar'},{label:'Avg Assignment Fee',value:'$18,400',change:'42%',icon:'chart'}];
 const activities=[{label:'Calls Made',value:'48',change:'26%',icon:'phone'},{label:'Texts Sent',value:'112',change:'34%',icon:'text'},{label:'Emails Sent',value:'36',change:'20%',icon:'mail'},{label:'Follow-Ups Due',value:'24',change:'33%',icon:'calendar'}];
 const tabs=['Messages','Notes','Tasks','Property Details','Comps'];
 const dialogTitle=computed(()=>({add:'Add Acquisition',notifications:'Notifications',deal:'Deal Actions',activity:"Today's Activity"}[dialog.value]||''));
 const photo=d=>props.content?.['photo'+(d.photo+1)]||props.content?.photo1||'';
 const money=v=>v==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
 function guard(e){if(isEditing.value)e.preventDefault();}
 function imageFailed(e){e.target.style.visibility='hidden';}
 function shortStage(i){return ['New Lead','Calling','Contacted','Qualified','Appt Set','Offer Sent','Under Contract','Closed'][i];}
 function stageCount(i){return ((stages[i]&&stages[i].count)||0)+(deals.value||[]).filter(d=>d.stage===i).length-(samples||[]).filter(d=>d.stage===i).length;}
 function clearSearch(){if(!isEditing.value)query.value='';}
 function selectDeal(d){if(isEditing.value)return;selectedId.value=d.id;notice.value='';}
 function closeDetail(){if(!isEditing.value)selectedId.value='';}
 watch(selected, d=>{draft.value=drafts[d?.id]||'';note.value=d?.note||'';notice.value='';},{immediate:true});
 function startDrag(e,d){if(isEditing.value){e.preventDefault();return;}dragged.value=d.id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',d.id);}
 function dropDeal(stage){if(dragged.value)moveDeal(dragged.value,stage);dragged.value='';}
 function moveDeal(id,stage){if(isEditing.value||!Number.isInteger(stage)||stage<0||stage>=stages.length)return;const d=deals.value.find(d=>d.id===id);if(d)d.stage=stage;}
 function completeTask(){if(!isEditing.value&&selected.value)selected.value.completed=!selected.value.completed;}
 function setTab(t){if(!isEditing.value){tab.value=t;notice.value='';}}
 function saveDraft(){if(isEditing.value||!selected.value)return;drafts[selected.value.id]=draft.value;notice.value='Draft saved in this page session · Not sent';}
 function saveNote(){if(isEditing.value||!selected.value)return;selected.value.note=note.value;notice.value='Note saved and synced';}
 let previousFocus=null;
 async function openDialog(type){if(isEditing.value)return;previousFocus=wwLib.getFrontDocument()?.activeElement;dialog.value=type;await nextTick();dialogEl.value?.focus();}
 function closeDialog(){dialog.value='';previousFocus?.focus?.();}
 function dialogKeys(e){if(e.key==='Escape'){e.preventDefault();closeDialog();}if(e.key==='Tab'){const nodes=Array.from(dialogEl.value?.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')||[]).filter(n=>!n.disabled);const first=nodes[0],last=nodes[nodes.length-1],active=wwLib.getFrontDocument()?.activeElement;if(e.shiftKey&&(active===first||active===dialogEl.value)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(active===last||active===dialogEl.value)){e.preventDefault();first?.focus();}}}
 function addDeal(){if(isEditing.value||!newAddress.value.trim()||!/^\d{5}$/.test(newZip.value))return;const d={...samples[0],id:'preview-'+Date.now(),address:newAddress.value.trim(),zip:newZip.value,owner:'Owner not entered',phone:'—',email:'—',arv:null,repairs:null,mao:null,fee:null,note:'',agent:'Elite Team',completed:false};deals.value.push(d);query.value='';selectedId.value=d.id;newAddress.value='';closeDialog();}
 return {icons,isEditing,navigation,stages,navOpen,query,selected,visible,heroStyle,metrics,activities,tabs,tab,draft,note,notice,dialog,dialogEl,dialogTitle,newAddress,newZip,dragged,photo,money,guard,imageFailed,shortStage,stageCount,clearSearch,selectDeal,closeDetail,startDrag,dropDeal,moveDeal,completeTask,setTab,saveDraft,saveNote,openDialog,closeDialog,dialogKeys,addDeal,isQuickAddOpen,isNotifOpen,currentTime};
 }
};
</script>
<style scoped>
.acq-app{--navy:var(--702de9b1-4d57-47c9-8102-295901b861fa,#0A1128);--white:var(--1a7bb57f-a485-47e0-8fed-98ad7f553b6c,#fff);--blue:var(--17e69283-d00e-40b2-8a7e-1f2bcc91e18a,#1D4ED8);--edge:#205386;--cyan:#59c9fb;--gold:#edcf7c;display:grid!important;grid-template-columns:200px minmax(0,1fr)!important;width:100%!important;min-width:0!important;background:#04182d;color:var(--white);font-family:'Plus Jakarta Sans',Arial,sans-serif;line-height:1.35;min-height:100vh}
.acq-app *{box-sizing:border-box}.acq-app a{color:#64c7f6;text-decoration:none}.acq-app button,.acq-app input,.acq-app select,.acq-app textarea{font:inherit}.acq-app button,.acq-app a,.acq-app select{cursor:pointer}.acq-app button{color:inherit}.acq-app button:disabled,.acq-app select:disabled{cursor:default;opacity:.55}.acq-app button:focus-visible,.acq-app a:focus-visible,.acq-app input:focus-visible,.acq-app select:focus-visible,.acq-app textarea:focus-visible,.acq-app tr:focus-visible{outline:2px solid #ffe093;outline-offset:2px}
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

.btn-topbar-properties {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #0a1e35;
  border: 1px solid #205789;
  border-radius: 6px;
  color: #edcf7c;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.btn-topbar-properties:hover {
  background: #103862;
  border-color: #edcf7c;
  color: #fff;
  box-shadow: 0 0 10px rgba(237, 207, 124, 0.25);
}
.btn-topbar-properties .icon {
  width: 14px;
  height: 14px;
  display: inline-flex;
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

.hero h1 em{font-style:normal;color:#efd17b}.hero-copy>p{font-size:21px;font-weight:700}.principles{font-size:8px;letter-spacing:1.5px;gap:0;margin-top:10px;color:#d1dbea}.hero{min-height:137px}.hero h1{font-size:40px}.sidebar nav a{min-height:40px;padding:9px 12px}.brand{height:179px;min-height:179px}.brand-bottom{margin-top:auto}.workspace{padding:0 8px 0}.acquisition-layout{display:grid;grid-template-columns:minmax(0,2.53fr) minmax(320px,1fr);gap:7px;align-items:start}.pipeline-side{min-width:0}.kpi-row{display:grid;grid-template-columns:1.14fr 1fr 1.04fr 1.04fr 1fr 1.16fr;gap:5px}.kpi{min-width:0;min-height:76px;display:flex;align-items:center;gap:12px;padding:9px;background:linear-gradient(130deg,#103557,#061b36);border:1px solid #205789;border-radius:5px;box-shadow:inset 0 1px 5px #2d689725}.kpi-icon{display:block;width:32px;height:32px;color:#64cff5;flex-shrink:0}.kpi:nth-child(5) .kpi-icon{color:#efd071}.kpi>div>span{display:block;font-size:8px;color:#c3d1e0;white-space:nowrap}.kpi strong{display:block;font-size:23px;line-height:1.4;white-space:nowrap;letter-spacing:-.8px}.kpi:last-child strong{font-size:20px}.kpi small{font-size:11px;color:#0de791;font-weight:800}.preview-line{display:flex;justify-content:space-between;gap:4px;align-items:center;height:17px;font-size:7px;color:#b6c7da;letter-spacing:.15px}.preview-line button{background:transparent;color:#6ed6ff;border:0;padding:0;font-size:8px}
.board-scroll{overflow-x:auto;scrollbar-color:#3c6e9c #05223e;padding-bottom:3px}.board{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:4px;min-width:870px}.stage{min-width:0;border-radius:4px;background:#06264455}.stage h2{height:36px;font-size:10px;font-weight:750;letter-spacing:-.35px;display:flex;align-items:center;justify-content:space-between;gap:2px;margin:0 0 5px;padding:5px 6px;background:linear-gradient(110deg,color-mix(in srgb,var(--stage) 45%,#061a2e),#091d31);border:1px solid color-mix(in srgb,var(--stage) 65%,#102c48);border-radius:4px;box-shadow:inset 0 1px 4px #ffffff25}.stage h2 b{background:#ffffff16;border-radius:2px;padding:2px 4px;font-size:10px}.stage-cards{display:flex;flex-direction:column;gap:5px}.deal-card{display:block;width:100%;padding:3px;text-align:left;min-width:0;background:linear-gradient(145deg,#11324c,#051c33);border:1px solid #1c4364;border-radius:5px;box-shadow:0 2px 5px #0005;transition:border-color .15s,box-shadow .15s}.deal-card:hover{border-color:#78bff0;box-shadow:0 0 9px #3c9def44}.deal-card.selected{border:2px solid #ddc55d;padding:2px;box-shadow:0 0 9px #ebc44944}.deal-card>img{display:block;width:100%;height:56px;object-fit:cover;border-radius:2px;background:#144360}.card-body{padding:3px 2px 2px}.card-body h3{font-size:9px;font-weight:800;line-height:1.5;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card-body>p{font-size:8px;margin:0 0 5px;color:#d3deeb;white-space:nowrap}.card-body dl{font-size:8px;margin:0;line-height:1.55}.card-body dl>div{display:flex;justify-content:space-between;gap:2px}.card-body dt{color:#aebed0}.card-body dd{margin:0;color:#eaf0f9}.card-end{display:flex;align-items:center;gap:3px;justify-content:space-between;margin-top:5px;min-height:20px}.stage-badge{background:var(--stage);padding:3px 5px;border-radius:4px;font-size:8px;color:white;white-space:nowrap;font-weight:700;box-shadow:inset 0 1px #ffffff30}.stage:nth-child(2) .stage-badge,.stage:nth-child(3) .stage-badge,.stage:nth-child(6) .stage-badge{color:#061829}.agent{font-size:6px;color:#d4dfec;display:flex;align-items:center;gap:3px;white-space:nowrap;overflow:hidden}.agent i{display:inline-flex;width:15px;height:15px;border-radius:50%;background:linear-gradient(140deg,#c49c7a,#274c79);justify-content:center;align-items:center;font-style:normal;font-size:8px;color:white;flex-shrink:0}.hot{background:#e32441;border-radius:4px;padding:3px 7px;font-size:8px}.empty-stage{color:#9bb0c8;font-size:10px;text-align:center;padding:20px 3px;border:1px dashed #28618c;border-radius:4px}
.activity{display:flex;align-items:center;gap:4px;margin-top:5px;border:1px solid #1d4874;border-radius:5px;background:#05182d;min-height:37px}.activity>strong{display:flex;align-items:center;font-size:11px;padding:4px 8px;gap:6px;white-space:nowrap}.activity>strong .icon{color:#ebc761}.activity>div{display:flex;align-items:center;gap:6px;border-left:1px solid #255173;padding:3px 10px;flex:1}.activity small{display:block;font-size:7px;color:#c6d3e0}.activity b{display:block;font-size:12px}.activity em{font-style:normal;font-size:6px;color:#04d888;margin-left:7px}.activity button{font-size:7px;background:transparent;border:0;color:#96c6e6;margin-left:auto;padding:5px}.activity .icon{width:18px;height:18px}
.detail{border:1px solid #1e4f82;border-radius:6px;background:linear-gradient(145deg,#092641,#03182e);padding:7px;box-shadow:0 0 16px #020c1c55;min-width:0}.detail-heading{display:flex;align-items:center;gap:9px;padding:0 0 7px;border-bottom:1px solid #1c4165}.detail-heading>.icon{width:29px;height:29px}.detail-heading h2{margin:0;font-size:17px;line-height:1.3}.detail-heading p{margin:0;font-size:10px;color:#c5d1df;letter-spacing:.3px}.detail-heading>div{flex:1}.detail-heading button{background:none;border:0;padding:1px;font-size:20px;color:#c6d5e7}.photo-layout{display:grid;grid-template-columns:minmax(0,2.6fr) minmax(0,1fr);gap:7px;margin-top:6px}.main-photo{height:132px;position:relative;background:#133c58;border-radius:3px;overflow:hidden}.main-photo img{width:100%;height:100%;object-fit:cover}.main-photo small{position:absolute;bottom:3px;left:4px;background:#00172da8;padding:2px 4px;font-size:7px}.photo-side{display:flex;flex-direction:column;gap:5px;position:relative}.outline-badge{font-size:8px;font-weight:700;border:1px solid var(--stage);background:color-mix(in srgb,var(--stage) 25%,#061b30);padding:4px 5px;border-radius:4px}.potential{font-size:9px;padding:4px 5px;border:1px solid #d44c65;color:#ffe2c4;border-radius:4px;background:#40222c}.photo-side img{width:100%;height:60px;object-fit:cover;border-radius:4px;border:1px solid #356991}.photo-side>small{position:absolute;bottom:3px;left:5px;font-size:8px;background:#031529aa;padding:1px 4px}.deal-metrics{display:grid;grid-template-columns:.85fr .9fr .9fr 1.2fr;margin-top:6px;border-bottom:1px solid #163e66;padding-bottom:6px}.deal-metrics>div{padding:0 7px;border-right:1px solid #345877}.deal-metrics>div:first-child{padding-left:3px}.deal-metrics>div:last-child{border:0}.deal-metrics small{font-size:8px;color:#b7cbe1;display:block;white-space:nowrap}.deal-metrics b{font-size:15px;white-space:nowrap;display:block}.address-row{display:flex;align-items:center;gap:6px;font-size:8px;padding:7px 2px}.address-row>.icon{color:#e9c868;width:14px;height:14px}.address-row>a{margin-left:auto;font-size:8px;white-space:nowrap}.owner-box{border:1px solid #235582;border-radius:5px;padding:5px 7px}.owner-box h3{font-size:11px;display:flex;align-items:center;gap:6px;margin:0 0 5px}.owner-box h3>.icon{width:15px;height:15px}.owner-box h3>a{margin-left:auto;padding:3px 10px;font-size:8px;font-weight:400;border:1px solid #557698;border-radius:4px;color:#d7e1ef}.owner-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.owner-grid dl{margin:0;font-size:8px;line-height:1.7}.owner-grid dl>div{display:flex;gap:7px}.owner-grid dt{color:#b6c7dc;white-space:nowrap}.owner-grid dd{margin:0;overflow-wrap:anywhere}.next-step{display:flex;gap:8px;align-items:center;padding:7px 5px;margin:5px 0;border:1px solid #295482;border-radius:4px}.next-step>div{flex:1}.next-step h3{font-size:11px;margin:0 0 3px}.next-step p{font-size:8px;margin:0}.next-step button{padding:6px 9px;font-size:8px;white-space:nowrap}.detail-tabs{display:flex;align-items:center;border:1px solid #154671;border-radius:4px;overflow:hidden}.detail-tabs button{flex:1;padding:6px 2px;background:#06192d;border:0;border-right:1px solid #284463;font-size:8px;white-space:nowrap}.detail-tabs button.active{background:linear-gradient(#174b7f,#062444);box-shadow:inset 0 -2px #dfc671}.tab-content{min-height:221px;padding-top:5px;font-size:10px}.tab-content h3{font-size:12px;margin:8px 0}.conversation{display:flex;flex-direction:column;gap:5px}.message-label{font-size:8px;padding-left:5px;font-weight:700}.message-label small{margin-left:12px;font-weight:400;color:#94afc9;font-size:6px}.bubble{font-size:8px;line-height:1.35;padding:7px 9px;border-radius:5px;max-width:82%;margin:0;background:#2c425d;align-self:flex-start;position:relative}.bubble.outgoing{align-self:flex-end;background:linear-gradient(135deg,#078cff,#0665ed)}.compose{display:flex;gap:5px;margin-top:7px}.compose input{background:#061c31;border:1px solid #315776;border-radius:4px;padding:5px 7px;font-size:9px;color:white;min-width:0;flex:1}.compose button{background:linear-gradient(#159fff,#0063ed);border:1px solid #237dcc;border-radius:4px;font-size:9px;padding:5px 9px}.draft-note{font-size:7px;color:#b1c5dc;display:block;margin:5px 0 0}.tab-content textarea{min-height:115px;width:100%;color:white;background:#09233c;border:1px solid #356487;padding:8px;border-radius:4px;resize:vertical}.small-action{display:inline-block;padding:7px 12px;font-size:10px;margin-top:9px}.task-check{display:flex;gap:8px;align-items:center}.tab-content>p{line-height:1.65;color:#c8d7e7}.property-details{font-size:10px}.property-details>div{display:flex;justify-content:space-between;margin:7px 0}.property-details dd{margin:0}.move-stage{display:flex;flex-direction:column;gap:7px;font-size:11px;margin:10px 0}.move-stage select{padding:7px;color:#fff;background:#0b2a48;border:1px solid #346697;border-radius:4px}.tab-content>small{color:#a5bbd1;font-size:8px}.detail-closed{grid-template-columns:1fr}.footer{display:flex;justify-content:space-between;gap:10px;font-size:7px;color:#99afc5;padding:7px 5px}.footer b{margin:0 10px;color:#b99d53}.footer>span:nth-child(2){color:#dbc679;letter-spacing:1px;font-size:6px}
.modal-backdrop{position:fixed;inset:0;background:#000a;z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}.dialog{position:relative;width:min(480px,100%);max-height:85vh;overflow:auto;padding:26px;background:linear-gradient(130deg,#103353,#05182d);border:1px solid #49789e;border-radius:10px;box-shadow:0 20px 60px #0009}.dialog h2{font-size:22px;color:#eed383;margin:0 0 16px}.dialog p,.dialog li{font-size:12px;line-height:1.7;color:#c6d6e7}.dialog label{display:flex;flex-direction:column;gap:6px;font-size:12px;margin:13px 0}.dialog input{color:white;padding:9px;background:#061b2f;border:1px solid #366384;border-radius:4px}.dialog-close{position:absolute;right:13px;top:7px;background:transparent;border:0;font-size:28px}.dialog a{font-size:12px}
@media(min-width:1650px){.deal-card>img{height:75px}.card-body h3{font-size:11px}.card-body dl,.card-body>p{font-size:10px}.agent{font-size:8px}.stage-badge{font-size:9px}.bubble{font-size:10px}.tab-content{min-height:240px}.main-photo{height:165px}.photo-side img{height:90px}}
@media(max-width:1250px){.acq-app{grid-template-columns:150px minmax(0,1fr)}.sidebar nav a{font-size:11px;gap:9px}.brand strong{font-size:13px}.acquisition-layout{grid-template-columns:minmax(0,1fr) 330px}.kpi-row{grid-template-columns:repeat(3,minmax(0,1fr))}.kpi{min-height:60px;padding:6px}.kpi strong{font-size:20px}.hero h1{font-size:32px}.hero-copy>p{font-size:16px}.jacksonville{left:52%}.jacksonville strong{font-size:37px}.jacksonville span{font-size:6px}.principles{font-size:6px}.activity{flex-wrap:wrap}.activity>strong{width:100%}.activity>div{padding:3px 6px}.identity small{font-size:8px}.preview-line{height:auto;min-height:22px;flex-wrap:wrap}}
@media(max-width:960px){.acquisition-layout{grid-template-columns:1fr}.detail{max-width:none}.photo-layout{grid-template-columns:3fr 1fr}.main-photo{height:210px}.photo-side img{height:140px}.detail{margin-top:8px}.detail-heading h2{font-size:20px}.owner-grid dl{font-size:11px}.deal-metrics b{font-size:20px}.bubble{font-size:11px;max-width:75%}.tab-content{min-height:0}.identity{display:none}.hero{min-height:130px}.jacksonville{opacity:.65;left:56%}.hero-copy{z-index:2}.motto{display:none}.board{min-width:1000px}.card-body h3{font-size:10px}.card-body dl,.card-body>p{font-size:9px}.deal-card>img{height:75px}.footer{flex-wrap:wrap}}
@media(max-width:650px){.acq-app{grid-template-columns:minmax(0,1fr)}.sidebar{display:none}.nav-open .sidebar{display:flex;position:fixed;left:0;top:0;z-index:90;width:166px;box-shadow:10px 0 30px #0009}.nav-open .workspace{margin-left:166px}.mobile-menu{display:block;background:#143c62;border:1px solid #376e9b;border-radius:4px;padding:6px;font-size:10px}.topbar{gap:8px;padding:0}.global-search{padding:6px}.global-search input{font-size:10px}.global-search .icon{display:none}.add-lead{font-size:10px;padding:5px 8px}.add-lead .icon{display:none}.notification{display:none}.hero{padding:14px 10px;min-height:125px}.hero h1{font-size:29px}.hero-copy>p{font-size:13px}.principles{font-size:5px;letter-spacing:1px}.jacksonville{display:none}.kpi-row{grid-template-columns:repeat(3,minmax(0,1fr))}.kpi{gap:5px}.kpi-icon{width:24px;height:24px}.kpi strong{font-size:18px}.kpi:last-child strong{font-size:15px}.kpi>div>span{font-size:6px;white-space:normal}.kpi small{font-size:9px}.owner-grid{gap:5px}.owner-grid dl{font-size:8px}.deal-metrics b{font-size:15px}.address-row{font-size:7px}.main-photo{height:160px}.photo-side img{height:90px}.activity>div{padding:3px}.activity em{display:none}.footer>span:nth-child(2){display:none}}
@media(prefers-reduced-motion:reduce){.deal-card{transition:none}}

/* Consistent HushHawk spacing and keyboard clarity */
.acq-app{line-height:1.4}
.acq-app .topbar{min-height:50px;gap:12px}
.acq-app .hero{min-height:137px}
.acq-app .panel-head,.acq-app .panel-heading{min-width:0;gap:8px}
.acq-app .panel-head h2,.acq-app .panel-heading h2{min-width:0;line-height:1.3}
.acq-app table td,.acq-app table th{vertical-align:middle}
.acq-app button:hover:not(:disabled){filter:brightness(1.1)}
.acq-app button:focus-visible,.acq-app a:focus-visible,.acq-app summary:focus-visible{outline:2px solid #f0d17c;outline-offset:2px}
.acq-app button:disabled{cursor:not-allowed}
.acq-app .more-workspaces{margin:5px 0;border-top:1px solid #245173;padding-top:5px}
.acq-app .more-workspaces summary{cursor:pointer;font-size:10px;color:#d9c47c;padding:9px 12px}
.acq-app .more-workspaces a{font-size:10px!important;min-height:32px!important}
@media(max-width:700px){.acq-app .topbar{gap:8px}.acq-app .hero{padding-top:14px;padding-bottom:14px}}
</style>