<template>
<section class="elite-maps">
  <div class="map-intro"><div><span class="eyebrow">NORTHEAST FLORIDA</span><h3>{{ content?.title || 'Explore your markets' }}</h3><p>Hover over a ZIP area to highlight it. Click or tap to keep it selected.</p></div><span class="coverage">2 county maps</span></div>
  <div class="county-grid">
    <article v-for="county in counties" :key="county.code" class="county-card" :class="county.name.toLowerCase()">
      <header><div><span class="eyebrow">NORTHEAST FLORIDA</span><h4>{{county.name}} County</h4></div><span class="count">{{county.regions.length || '—'}} ZIP areas</span></header>
      <div v-if="county.loading" class="map-state" role="status">Loading {{county.name}} ZIP boundaries…</div>
      <div v-else-if="county.error" class="map-state"><strong>Map could not load</strong><p>{{county.error}}</p><button type="button" @click="loadCounty(county)">Retry map</button></div>
      <template v-else>
        <div class="toolbar"><label>Find ZIP <input :aria-label="'Find ZIP in '+county.name" v-model="county.search" placeholder="Enter ZIP" inputmode="numeric" maxlength="5" /></label><button type="button" @click="reset(county)">Reset view</button><button type="button" :disabled="!activeRegion(county)" @click="zoomTo(county)">Zoom to ZIP</button></div>
        <div class="map-canvas">
          <svg :viewBox="county.viewBox" :aria-label="county.name+' County interactive ZIP map'" role="group">
            <path :d="county.outline" class="county-outline" fill-rule="evenodd"/>
            <g v-for="region in county.regions" :key="region.zip">
              <path :d="region.path" class="zip-region" :style="{'--region-color':region.color}" :class="{highlighted:activeZip(county)===region.zip,dimmed:county.search&&!region.zip.includes(county.search)}"
                fill-rule="evenodd" tabindex="0" role="button" :aria-label="county.name+' County ZIP '+region.zip" :aria-pressed="county.selected===region.zip"
                @mouseenter="hover(county,region.zip)" @mouseleave="hover(county,'')" @focus="hover(county,region.zip)" @blur="hover(county,'')" @click="select(county,region.zip)" @keydown.enter.prevent="select(county,region.zip)" @keydown.space.prevent="select(county,region.zip)">
                <title>{{region.zip}} · {{county.name}} County</title>
              </path>
            </g>
            <path v-if="activeRegion(county)" :d="activeRegion(county).path" class="active-boundary" fill-rule="evenodd" aria-hidden="true"/>
            <text v-for="region in county.regions" :key="'label-'+region.zip" :x="region.label[0]" :y="region.label[1]" class="zip-label" :class="{bright:activeZip(county)===region.zip}" text-anchor="middle" dominant-baseline="central">{{region.zip}}</text>
          </svg>
          <span class="north">N ↑</span>
        </div>
        <div class="selected" aria-live="polite"><div><span class="eyebrow">{{county.hovered ? 'HIGHLIGHTED ZIP AREA' : county.selected ? 'SELECTED ZIP AREA' : 'EXPLORE ZIP AREAS'}}</span><strong>{{activeZip(county) || 'Hover or choose a ZIP'}}</strong></div><span>{{county.name}} County, FL</span></div>
        <div class="zip-list" :aria-label="county.name+' ZIP codes'"><button v-for="region in matching(county)" :key="region.zip" type="button" :class="{active:activeZip(county)===region.zip}" :aria-pressed="county.selected===region.zip" @mouseenter="hover(county,region.zip)" @mouseleave="hover(county,'')" @focus="hover(county,region.zip)" @blur="hover(county,'')" @click="select(county,region.zip)">{{region.zip}}</button><p v-if="!matching(county).length">No matching ZIP in this county.</p></div>
      </template>
    </article>
  </div>
  <footer><span class="legend"><i></i> ZIP area <i class="gold"></i> Hover / selected</span><p>Source: <a href="https://tigerweb.geo.census.gov/tigerweb/" target="_blank" rel="noopener noreferrer">U.S. Census Bureau TIGERweb</a> · 2020 ZIP Code Tabulation Areas clipped to 2026 county boundaries. PO-box-only ZIPs have no mapped area. Colors identify areas, not lead scores.</p></footer>
</section>
</template>
<script>
import { computed, reactive, onMounted, onBeforeUnmount } from 'vue';
import polygonClipping from 'polygon-clipping';
import polylabel from 'polylabel';
const BASE='https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/';
const multi = geometry => geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
const allPoints = polygons => polygons.flat(2);
function bounds(points) {
  return points.reduce((a,p)=>[Math.min(a[0],p[0]),Math.min(a[1],p[1]),Math.max(a[2],p[0]),Math.max(a[3],p[1])],[Infinity,Infinity,-Infinity,-Infinity]);
}
function pathOf(polys) {return polys.map(p=>p.map(r=>r.map((v,i)=>(i?'L':'M')+v[0].toFixed(2)+','+v[1].toFixed(2)).join('')+'Z').join('')).join('');}
function ringArea(r){return Math.abs(r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2);}
export default {
 props:{uid:{type:String,required:true},content:{type:Object,required:true},
},
 emits:['trigger-event'],
 setup(props,{emit}){
  const isEditing=computed(()=>{return false;});
  const counties=reactive([{name:'Duval',code:'031'},{name:'Clay',code:'019'}].map(c=>({...c,regions:[],outline:'',loading:true,error:'',selected:'',hovered:'',search:'',viewBox:'0 0 600 470'})));
  const controllers=new Set();let disposed=false;
  const {setValue:setSelected}=wwLib.wwVariable.useComponentVariable({uid:props.uid,name:'selectedZip',type:'string',defaultValue:''});
  const {setValue:setCounty}=wwLib.wwVariable.useComponentVariable({uid:props.uid,name:'selectedCounty',type:'string',defaultValue:''});
  let lastZip='',lastCounty='';
  async function query(layer,params){
    const control=new AbortController();controllers.add(control);
    const timer=setTimeout(()=>control.abort(),45000);
    try {
      const url=BASE+layer+'/query?'+new URLSearchParams({f:'geojson',outFields:'*',returnGeometry:'true',outSR:'4326',geometryPrecision:'5',maxAllowableOffset:'0.00003',...params});
      const response=await wwLib.getFrontWindow().fetch(url,{signal:control.signal});
      if(!response.ok)throw Error('Boundary service unavailable. Please retry.');
      const data=await response.json();
      if(data.error||!Array.isArray(data.features)||data.exceededTransferLimit)throw Error('Boundary service returned incomplete data. Please retry.');
      return data.features;
    }finally{clearTimeout(timer);controllers.delete(control);}
  }
  async function loadCounty(c){
    if(disposed)return;c.loading=true;c.error='';
    try{
      const countyFeatures=await query('State_County/MapServer/1',{where:"STATE='12' AND COUNTY='"+c.code+"'"});
      if(countyFeatures.length!==1)throw Error('County boundary is unavailable.');
      const countyPolys=multi(countyFeatures[0].geometry);
      const bbox=bounds(allPoints(countyPolys));
      const regions=await query('PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1',{where:'1=1',geometry:JSON.stringify({xmin:bbox[0],ymin:bbox[1],xmax:bbox[2],ymax:bbox[3],spatialReference:{wkid:4326}}),geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects'});
      const cosine=Math.cos((bbox[1]+bbox[3])/2*Math.PI/180);
      const width=(bbox[2]-bbox[0])*cosine,height=bbox[3]-bbox[1];
      const scale=Math.min(552/width,422/height);
      const ox=(600-width*scale)/2,oy=(470-height*scale)/2;
      const project=p=>[ox+(p[0]-bbox[0])*cosine*scale,oy+(bbox[3]-p[1])*scale];
      const projectPolys=p=>p.map(poly=>poly.map(r=>r.map(project)));
      const result=[];
      for(const feature of regions){
        const zip=String(feature.properties?.ZCTA5||feature.properties?.GEOID||'');
        if(!/^\d{5}$/.test(zip))continue;
        const clipped=polygonClipping.intersection(multi(feature.geometry),countyPolys);
        if(!clipped.length)continue;
        const projected=projectPolys(clipped);
        const largest=projected.reduce((a,p)=>ringArea(p[0])>ringArea(a[0])?p:a,projected[0]);
        if(!largest||ringArea(largest[0])<0.01)continue;
        result.push({zip,color:['#2563EB','#0891B2','#4F46E5','#0D9488'][Number(zip)%4],path:pathOf(projected),label:polylabel(largest,0.25),bounds:bounds(allPoints(projected))});
      }
      if(!result.length)throw Error('No ZIP areas were returned. Please retry.');
      if(disposed)return;
      c.outline=pathOf(projectPolys(countyPolys));c.regions=result.sort((a,b)=>a.zip.localeCompare(b.zip));c.viewBox='0 0 600 470';
    }catch(error){if(!disposed)c.error=error.name==='AbortError'?'The boundary service took too long. Please retry.':error.message||'Check your connection and retry.';}
    finally{if(!disposed)c.loading=false;}
  }
  function hover(c,zip){if(isEditing.value)return;c.hovered=zip;}
  function select(c,zip){if(isEditing.value)return;c.selected=zip;if(lastZip!==zip){lastZip=zip;setSelected(zip);}if(lastCounty!==c.name){lastCounty=c.name;setCounty(c.name);}emit('trigger-event',{name:'zipSelect',event:{zip,county:c.name}});}
  const activeZip=c=>c.hovered||c.selected;
  const activeRegion=c=>c.regions.find(r=>r.zip===activeZip(c));
  const matching=c=>c.regions.filter(r=>r.zip.includes(c.search.trim()));
  function reset(c){if(isEditing.value)return;c.viewBox='0 0 600 470';c.search='';}
  function zoomTo(c){if(isEditing.value)return;const r=activeRegion(c);if(!r)return;const b=r.bounds;let w=Math.max(b[2]-b[0]+36,110),h=Math.max(b[3]-b[1]+36,86);if(w/h<600/470)w=h*600/470;else h=w*470/600;c.viewBox=[(b[0]+b[2]-w)/2,(b[1]+b[3]-h)/2,w,h].join(' ');}
  onMounted(()=>{counties.forEach(loadCounty);});
  onBeforeUnmount(()=>{disposed=true;controllers.forEach(c=>c.abort());});
  return {counties,loadCounty,hover,select,activeZip,activeRegion,matching,reset,zoomTo};
 }
};
</script>
<style scoped>
.elite-maps{--navy:var(--702de9b1-4d57-47c9-8102-295901b861fa,#0A1128);--blue:var(--17e69283-d00e-40b2-8a7e-1f2bcc91e18a,#1D4ED8);--gold:var(--614c2430-bcf4-4252-b7c2-725a94661f7a,#CA8A04);font-family:'Plus Jakarta Sans',sans-serif;color:var(--22b58d82-aeea-4274-b3f1-02d7adf016f5,#0F172A);container-type:inline-size}
.map-intro{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:1.2px;color:var(--5068cb3b-48bc-4dc8-a46f-eb6e0a8d2984,#64748B)}h3{font-size:24px;margin:5px 0 8px}h4{font-size:22px;margin:5px 0 0}p{font-size:14px;line-height:1.6;margin:0}.coverage,.count{font-size:12px;border-radius:24px;padding:8px 12px;white-space:nowrap;background:var(--44be636a-d119-460b-b86b-28551f7a6167,#EFF6FF);color:var(--blue);font-weight:700}
.county-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.county-card{min-width:0;background:var(--71e24801-0356-4fdb-ac9c-9484bc84ef7c,#FFFFFF);border:1px solid var(--e588e755-a402-48d1-9d28-822854fbe1ce,#E2E8F0);border-radius:16px;overflow:hidden;box-shadow:0 8px 28px #0a112812}.county-card header{display:flex;justify-content:space-between;align-items:center;padding:20px;gap:12px}
.toolbar{display:flex;gap:8px;align-items:center;padding:0 16px 14px;flex-wrap:wrap}.toolbar label{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;flex:1}.toolbar input{width:100%;min-width:85px;max-width:130px;border:1px solid #94a3b8;border-radius:7px;padding:8px;font:inherit;font-size:14px;background:#fff;color:#0f172a}button{cursor:pointer;font:inherit;border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:7px;padding:8px 10px;font-size:12px;font-weight:700}button:disabled{opacity:.45;cursor:default}button:focus-visible,input:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
.map-canvas{position:relative;background:var(--navy);overflow:hidden}.map-canvas svg{display:block;width:100%;aspect-ratio:600/470}.county-outline{fill:#172b47;stroke:#94a3b8;stroke-width:1.5;vector-effect:non-scaling-stroke}.zip-region{fill:var(--blue);fill-opacity:.78;stroke:#b7d5ff;stroke-width:1;vector-effect:non-scaling-stroke;cursor:pointer;transition:fill 160ms,fill-opacity 160ms}.zip-region.highlighted,.zip-region:focus-visible{fill:var(--gold);fill-opacity:1;stroke:#fff;stroke-width:2;outline:none}.zip-region.dimmed{fill-opacity:.18}.zip-label{font-size:11px;font-weight:800;fill:#fff;paint-order:stroke;stroke:#0a1128;stroke-width:2.8px;pointer-events:none}.zip-label.bright{fill:#fff;stroke:#583800}.north{position:absolute;top:16px;right:16px;color:white;font-size:12px;font-weight:800}
.selected{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 20px;border-bottom:1px solid #e2e8f0}.selected strong{display:block;font-size:21px;margin-top:4px}.selected>span{font-size:12px;color:#64748b}.zip-list{display:flex;gap:6px;flex-wrap:wrap;padding:16px;max-height:164px;overflow:auto}.zip-list button.active{background:var(--gold);color:#fff;border-color:var(--gold)}.map-state{min-height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;background:var(--navy);color:#fff}.map-state p{max-width:330px}
footer{display:flex;gap:20px;justify-content:space-between;align-items:flex-start;margin-top:16px;color:var(--5068cb3b-48bc-4dc8-a46f-eb6e0a8d2984,#64748B)}footer p{font-size:12px;max-width:700px}footer a{color:var(--blue);text-decoration:underline}.legend{white-space:nowrap;font-size:12px;display:flex;align-items:center;gap:8px}.legend i{display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--blue)}.legend i.gold{background:var(--gold);margin-left:8px}
@container(max-width:800px){.county-grid{grid-template-columns:1fr}.map-intro{align-items:flex-start}.coverage{display:none}footer{flex-direction:column}}
@media(prefers-reduced-motion:reduce){.zip-region{transition:none}}

/* Geographic highlights follow the same computed polygon paths as hit targets. */
.county-card{border-radius:20px;box-shadow:0 16px 40px rgba(10,17,40,.15);border-color:#cbd5e1}
.county-card header{background:linear-gradient(120deg,#0a1128 0%,#123c83 100%);color:#fff;padding:22px 24px;border-top:4px solid #3b82f6}
.county-card.clay header{background:linear-gradient(120deg,#0a1128 0%,#086d78 100%);border-top-color:#22d3ee}
.county-card header .eyebrow{color:#bdd9ff}
.county-card header .count{background:#ffffff17;border:1px solid #ffffff38;color:#fff}
.county-card h4{font-size:25px;font-weight:800;letter-spacing:-.5px}
.toolbar{padding:16px;background:linear-gradient(180deg,#f8fafc,#fff)}
.toolbar button:not(:disabled):hover{border-color:#2563eb;background:#eff6ff}
.map-canvas{background:radial-gradient(ellipse at 40% 35%,#183660 0%,#0b1932 55%,#060e20 100%);border-top:1px solid #223b60;border-bottom:1px solid #223b60}
.county-outline{fill:#162840;stroke:#c9e2ff;stroke-width:2;filter:drop-shadow(0 4px 10px #0008)}
.zip-region{fill:var(--region-color,var(--blue));fill-opacity:.94;stroke:#e3f1ff;stroke-width:1.15;transition:fill 150ms ease,fill-opacity 150ms ease}
.zip-region.highlighted,.zip-region:focus-visible{fill:#fbbf24;fill-opacity:1;stroke:#fff4c2;stroke-width:2.8}
.zip-region.dimmed:not(.highlighted){fill-opacity:.22}
.active-boundary{fill:#fbbf24;fill-opacity:.18;stroke:#fff4b3;stroke-width:3;vector-effect:non-scaling-stroke;pointer-events:none;filter:drop-shadow(0 0 5px #fbbf24cc)}
.zip-label{font-size:12px;letter-spacing:.2px;stroke-width:3.2px}
.zip-label.bright{fill:#fff;stroke:#593709;font-weight:900}
.north{background:#071226c9;border:1px solid #47638b;border-radius:8px;padding:8px 10px;pointer-events:none}
.selected{background:linear-gradient(110deg,#eff6ff,#fff);border-left:4px solid #2563eb}
.clay .selected{background:linear-gradient(110deg,#ecfeff,#fff);border-left-color:#0891b2}
.selected strong{font-size:24px;font-weight:800;letter-spacing:.3px}
.zip-list{padding:18px;gap:8px;max-height:190px}
.zip-list button{font-size:13px;min-height:36px;border-radius:8px;transition:background 150ms,color 150ms,box-shadow 150ms}
.zip-list button:hover,.zip-list button.active{background:#fbbf24;color:#172033;border-color:#e8a608;box-shadow:0 2px 8px #ca8a042b}
.legend i.gold{background:#fbbf24}
@media(prefers-reduced-motion:reduce){.zip-region,.zip-list button{transition:none}}

</style>