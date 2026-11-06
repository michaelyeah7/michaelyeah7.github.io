'use strict';
const el=id=>document.getElementById(id);
const svgNS='http://www.w3.org/2000/svg';
function svg(tag,attrs={},parent){const item=document.createElementNS(svgNS,tag);for(const [k,v] of Object.entries(attrs))item.setAttribute(k,v);if(parent)parent.append(item);return item;}
function line(points){return points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
const validUrl=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}};
async function loadData(file){
  const embedded=el('embedded-data');
  if(embedded){
    const payload=JSON.parse(embedded.textContent);
    if(!Object.prototype.hasOwnProperty.call(payload,file))throw Error('Missing embedded data');
    return payload[file];
  }
  const response=await fetch(file);
  if(!response.ok)throw Error('Unable to read '+file);
  return response.json();
}
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
// Three circular tiers share a projected axis; the edges show a conceptual adapter topology.
const positions=[{angle:0,r:0,layer:0}];
for(const [count,r,layer,shift] of [[6,1.02,1,.18],[13,1.91,2,.02]]) for(let i=0;i<count;i++)positions.push({angle:i*2*Math.PI/count+shift,r,layer});
const edges=[];for(let i=1;i<=6;i++){edges.push([0,i],[i,i%6+1]);}for(let i=7;i<20;i++){edges.push([i,7+(i-6)%13],[i,1+Math.round((i-7)*6/13)%6]);}
const scene=el('scene'),grid=svg('g',{},scene),nets=svg('g',{},scene),dots=svg('g',{},scene);
const rings=[.55,1.02,1.5,1.91,2.22].map(r=>[r,svg('path',{fill:'none',stroke:'#719aa0','stroke-opacity':r===1.91?.46:.28,'stroke-dasharray':r===1.91?'0':'3 5'},grid)]);
const spokes=Array.from({length:12},()=>svg('path',{fill:'none',stroke:'#6a989e','stroke-opacity':'.2','stroke-dasharray':'2 5'},grid));
const edgePaths=edges.map(()=>svg('path',{fill:'none'},nets));
const packets=Array.from({length:8},()=>svg('circle',{r:2.15,fill:'#99f3c6','pointer-events':'none'},nets));
const plansByAward=new Map();
let selected=0,phase=.2,elapsed=0,playing=!reduceMotion.matches,last=0,inView=true,roster=null;
const controls=positions.map((p,id)=>{const group=svg('g',{'class':'orbit-node',role:'button',tabindex:id===0?0:-1,'aria-label':id===0?'DREAM reference node':`Prospective network position ${id+1}`},dots);svg('circle',{r:12,fill:'transparent'},group);const halo=svg('circle',{r:id===0?12:9,fill:'none',stroke:'#7bedbc','stroke-width':1.2},group);const dot=svg('circle',{r:id===0?6:4.1,'class':'dot'},group);const lab=svg('text',{x:id===0?11:8,y:id===0?-14:-7,'font-size':id===0?11:8,'font-family':'monospace','pointer-events':'none'},group);lab.textContent=id===0?'DREAM':String(id+1).padStart(2,'0');group.addEventListener('click',()=>pick(id));group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(id)}else if(['ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();pick((id+(e.key==='ArrowRight'?1:19))%20);controls[selected].group.focus()}});return {group,dot,halo,lab}});
function projected(r,a,lift=0){return [300+r*107*Math.cos(a+phase),212+r*52*Math.sin(a+phase)-lift]}
function pos(p){return projected(p.r,p.angle,p.layer===0?40:p.layer===1?18:3)}
function drawAtlas(){const points=positions.map(pos);rings.forEach(([r,path])=>path.setAttribute('d',line(Array.from({length:89},(_,j)=>projected(r,j*2*Math.PI/88)))+'Z'));spokes.forEach((p,i)=>p.setAttribute('d',line([projected(.25,i*Math.PI/6),projected(2.22,i*Math.PI/6)])));edges.forEach(([a,b],i)=>{const path=edgePaths[i],on=a===selected||b===selected;path.setAttribute('d',line([points[a],points[b]]));path.setAttribute('stroke',on?'#7be6b7':'#638c98');path.setAttribute('stroke-opacity',on?'.7':'.37');path.setAttribute('stroke-width',on?1.5:1)});packets.forEach((p,i)=>{const t=elapsed*.25+i*.77,edge=edges[(i*7+Math.floor(t))%edges.length],f=t%1;const a=points[edge[0]],b=points[edge[1]];p.setAttribute('cx',a[0]+(b[0]-a[0])*f);p.setAttribute('cy',a[1]+(b[1]-a[1])*f)});controls.forEach(({group,dot,halo,lab},i)=>{const on=i===selected;group.setAttribute('transform',`translate(${points[i][0]} ${points[i][1]})`);dot.setAttribute('fill',on||i===0?'#a1f5ca':'#77a4ab');dot.setAttribute('stroke',on?'#effff5':'#19343a');halo.setAttribute('opacity',on?'.98':i===0?'.4':'0');lab.setAttribute('fill',on||i===0?'#d4ffe4':'#a0b9bb');});}
function pick(i){selected=i;const row=roster?.[i];showValidation(row);el('node-label').textContent=row?.institution||(i===0?'DREAM · Northwestern':`Prospective position ${String(i+1).padStart(2,'0')}`);el('node-detail').textContent=(row?[row.name,row.domain].filter(Boolean).join(' · '):'')||(i===0?'Reference node for the proposed network':'Node-specific assets await partner validation');const note=el('node-note');if(note){note.replaceChildren();note.hidden=!row;if(row){const heading=document.createElement('small');heading.textContent='ILLUSTRATIVE TASK IDEA';const text=document.createElement('span');text.textContent=row.task||row.domain;note.append(heading,text);if(row.rubric){const rubric=document.createElement('span');rubric.className='rubric';rubric.textContent='Proposed scoring · '+row.rubric;note.append(rubric)}if(validUrl(row.source)){const a=document.createElement('a');a.href=validUrl(row.source);a.textContent='Team source ↗';note.append(a)}}}controls.forEach(({group},n)=>{group.setAttribute('tabindex',n===i?'0':'-1');group.setAttribute('aria-pressed',n===i?'true':'false')});drawAtlas()}
el('prev').onclick=()=>pick((selected+19)%20);el('next').onclick=()=>pick((selected+1)%20);
function motionLabel(){el('motion').textContent=playing?'Ⅱ':'▷';el('motion').setAttribute('aria-label',playing?'Pause diagram animation':'Play diagram animation')}
el('motion').onclick=()=>{playing=!playing;motionLabel()};reduceMotion.addEventListener('change',()=>{playing=!reduceMotion.matches;motionLabel()});
if('IntersectionObserver'in window)new IntersectionObserver(([entry])=>inView=entry.isIntersecting).observe(el('network'));
let lastDraw=0;function frame(now){const dt=last?Math.min((now-last)/1000,.1):0;last=now;if(playing&&inView&&!document.hidden){elapsed+=dt;phase+=dt*.045;if(now-lastDraw>40){drawAtlas();lastDraw=now}}requestAnimationFrame(frame)}pick(0);motionLabel();requestAnimationFrame(frame);
// Node details are optional; the atlas remains interactive with the bundled schematic alone.
loadData('data/nodes.json').then(rows=>{if(!Array.isArray(rows)||rows.length!==20)return;const dreamIndex=rows.findIndex(r=>/northwestern|\bDREAM\b/i.test(`${r.institution} ${r.name}`));if(dreamIndex<0)return;roster=[rows[dreamIndex],...rows.filter((_,i)=>i!==dreamIndex)];controls.forEach(({group},i)=>group.setAttribute('aria-label',roster[i].institution||`Network position ${i+1}`));pick(selected)}).catch(()=>{});
// This intentionally small teaching trace is separate from the downloadable scored simulator.
const states={discover:['Discover the instrument','Read the plate reader’s capabilities and supported detection modes.','tools.list_capabilities()','configure'],configure:['Configure the read','Select the fluorescence channel and reserve blank and reference wells.','reader.configure(mode="fluorescence")','acquire'],acquire:['Acquire fluorescence','Read the prepared plate. A simulated optical fault can interrupt this step.','reader.measure(plate="P01")','qc'],fault:['Inspect the fault','Acquisition stopped after the optical head lost its reference. The partial read is unusable.','reader.status() → optical_reference_lost','reset'],reset:['Restore the instrument','Reset the head, restore the configuration and acquire the plate again.','reader.reset_and_reacquire()','qc'],qc:['Verify the controls','Compare the blank and reference wells with their expected ranges before interpreting the samples.','controls.verify(blank, reference)','report'],report:['Report the result','The controls passed. Record blank-corrected sample signals and attach the action trace.','analysis.report(corrected_signals)','done'],done:['Trial complete','The illustrative episode includes a quality-checked acquisition and a trace of every action.','trace.export()','']};
const wells=[];for(let a=0;a<4;a++)for(let b=0;b<8;b++)wells.push(svg('ellipse',{cx:160+a*13+b*11,cy:158+a*5.35-b*4.5,rx:3.6,ry:1.8,stroke:'#7fc9b8','stroke-width':.6},el('wells')));
let current='discover',history=['discover'];function showState(){const [title,description,tool,next]=states[current];el('state-index').textContent=`EVENT ${String(history.length).padStart(2,'0')} / ${current==='fault'?'ACQUISITION FAULT':current==='done'?'COMPLETE':'PLATE FLUORESCENCE'}`;el('state-title').textContent=title;el('state-text').textContent=description;el('tool-call').textContent=tool;el('advance').textContent=current==='done'?'Replay trial ↻':'Next step →';el('fault').disabled=current!=='acquire';el('fault').title=current==='acquire'?'Interrupt acquisition with a recoverable optical error':'Available during acquisition';el('reset').disabled=history.length===1;el('trace').replaceChildren(...history.map(name=>{const s=document.createElement('span');s.textContent=name;return s}));el('announcer').textContent=title+'. '+description;const fault=current==='fault',active=['acquire','qc','report','done'].includes(current);el('beam').setAttribute('opacity',active?1:fault?.3:.1);el('beam').setAttribute('fill',fault?'#ffac84':'#65efba');wells.forEach((w,i)=>w.setAttribute('fill',active?`hsl(${151+i%11} 50% ${35+((i*7)%36)}%)`:'#2a4650'));const pts=Array.from({length:61},(_,i)=>[i*3.33,active?26-14*Math.exp(-((i-31)**2)/65)+Math.sin(i*1.3)*1.9:fault?(i<33?21+Math.sin(i*3)*7:32):30+Math.sin(i*.6)*.6]);el('wave').setAttribute('d',line(pts));el('wave').setAttribute('stroke',fault?'#ffac84':'#77f7c1')}
function move(to){current=to;history.push(to);showState()}function restart(){current='discover';history=['discover'];showState()}el('advance').onclick=()=>states[current][3]?move(states[current][3]):restart();el('fault').onclick=()=>{if(current==='acquire')move('fault')};el('reset').onclick=restart;showState();
let papers=[],limit=6;function renderCatalog(){const q=el('search').value.toLowerCase().trim(),category=el('category').value;const found=papers.filter(p=>(!category||p.category===category)&&[p.title,p.authors,p.category,p.scope,p.adaptation,p.year].join(' ').toLowerCase().includes(q));el('found').textContent=found.length?`${found.length} source${found.length===1?'':'s'} · showing ${Math.min(found.length,limit)}`:'No matching sources.';el('catalog').replaceChildren(...found.slice(0,limit).map(p=>{const d=document.createElement('details'),s=document.createElement('summary'),year=document.createElement('small'),title=document.createElement('strong'),body=document.createElement('div');year.textContent=p.year||'—';title.textContent=p.title;s.append(year,title);const para=t=>{const e=document.createElement('p');e.textContent=t;body.append(e)};para([p.authors,p.category].filter(Boolean).join(' · '));if(p.scope)para(p.scope);if(p.adaptation)para(`Benchmark adaptation — ${p.adaptation}`);if(validUrl(p.url)){const a=document.createElement('a');a.href=validUrl(p.url);a.textContent='Primary source ↗';body.append(a)}d.id='work-'+p.key;d.append(s,body);return d}));el('more').hidden=found.length<=limit}
for(const id of ['search','category'])el(id).addEventListener(id==='search'?'input':'change',()=>{limit=6;renderCatalog()});el('more').onclick=()=>{limit+=12;renderCatalog()};loadData('data/catalog.json').then(rows=>{papers=rows;for(const c of [...new Set(rows.map(p=>p.category).filter(Boolean))].sort()){const opt=document.createElement('option');opt.value=opt.textContent=c;el('category').append(opt)}renderCatalog()}).catch(()=>{el('found').textContent='The catalog is available in the downloadable research package.'});
const policyNames={'reference':'Reference','no-recovery':'No recovery','shortcut-analysis':'Shortcut analysis'};
function renderControls(rows){const task=el('result-task').value,subset=rows.filter(x=>task==='all'||x.task===task);el('result-rows').replaceChildren(...Object.entries(policyNames).map(([key,label])=>{const tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=label;tr.append(th);for(const c of ['clean','fault']){const groups=subset.filter(x=>x.condition===c&&x.policy===key);const [ok,n]=groups.reduce(([a,b],x)=>[a+x.successes,b+x.episodes],[0,0]);const td=document.createElement('td'),bar=document.createElement('i');td.className=ok?'pass':'fail';const v=document.createElement('span');v.textContent=`${ok} / ${n}`;bar.style.setProperty('--rate',`${n?100*ok/n:0}%`);td.append(v,bar);tr.append(td)}return tr}));el('result-count').textContent=`${subset.reduce((a,b)=>a+b.episodes,0)} recorded episodes · 20 seeds per family, policy and condition.`}
loadData('data/controls.json').then(({rows})=>{renderControls(rows);el('result-task').onchange=()=>renderControls(rows)}).catch(()=>{el('result-count').textContent='Open the downloadable results file to inspect the controls.'});

function showValidation(row){
  const panel=el('validation-plan');
  const details=el('validation-body');
  const plan=plansByAward.get(row?.award_id);
  details.replaceChildren();
  panel.hidden=!plan;
  if(!plan)return;
  function section(label,body){
    const heading=document.createElement('h3');
    heading.textContent=label;
    const paragraph=document.createElement('p');
    paragraph.textContent=body;
    details.append(heading,paragraph);
  }
  section('Adapt the task',plan.adaptation);
  section('Minimum data to request',plan.minimum_evidence_request);
  section('Held-out diagnostic',plan.diagnostic_holdout);
  const heading=document.createElement('h3');
  heading.textContent='Methods to reuse';
  const list=document.createElement('ul');
  for(const source of plan.sources){
    const item=document.createElement('li');
    const link=document.createElement('a');
    link.href='#work-'+source.key;
    link.textContent=source.title;
    link.addEventListener('click',event=>{
      const paper=papers.find(p=>p.key===source.key);
      if(!paper)return;
      event.preventDefault();
      el('search').value=paper.title;
      el('category').value='';
      limit=6;
      renderCatalog();
      const entry=el('work-'+paper.key);
      if(!entry)return;
      entry.open=true;
      entry.querySelector('summary').focus();
      entry.scrollIntoView({block:'start'});
    });
    const retained=document.createElement('p');
    retained.textContent=source.retain;
    item.append(link,retained);
    list.append(item);
  }
  details.append(heading,list);
}
loadData('data/adaptation-map.json').then(plans=>{
  for(const plan of plans)plansByAward.set(plan.award_id,plan);
  showValidation(roster?.[selected]);
}).catch(()=>{el('validation-plan').hidden=true});
if(!el('embedded-data')&&location.hostname==='michaelyeah7.github.io'&&location.pathname.startsWith('/autonomous-lab-bench/')){
  const repo=el('published-repo');
  repo.href='https://github.com/michaelyeah7/autonomous-lab-bench';
  repo.hidden=false;
}
function renderReplay(rows){
  const selectedCase=el('replay-case').value;
  const selectedRows=rows.filter(row=>selectedCase==='all'||String(row.case)===selectedCase);
  const chart=el('replay-bars');
  chart.replaceChildren();
  for(const [policy,label] of [['random','Random'],['local-greedy','Local greedy']]){
    const group=selectedRows.filter(row=>row.policy===policy);
    const campaigns=group.reduce((total,row)=>total+row.campaigns,0);
    const mean=group.reduce((total,row)=>total+row.campaigns*row.mean_simple_regret_pp,0)/campaigns;
    const line=document.createElement('div');
    line.className='replay-row '+policy;
    const heading=document.createElement('span');
    heading.textContent=label;
    const track=document.createElement('div');
    track.className='replay-track';
    track.setAttribute('aria-hidden','true');
    const bar=document.createElement('i');
    bar.style.width=(100*mean/15)+'%';
    track.append(bar);
    const value=document.createElement('strong');
    value.textContent=mean.toFixed(2)+' pp';
    line.append(heading,track,value);
    chart.append(line);
  }
  const uniqueCases=selectedRows.filter(row=>row.policy==='random');
  const sum=field=>uniqueCases.reduce((total,row)=>total+row[field],0);
  const runs=selectedRows.reduce((total,row)=>total+row.campaigns,0);
  let summary=sum('source_records')+' measured rows · '+sum('candidate_settings')+' distinct settings · '+runs+' campaigns · 20 paired seeds per case.';
  if(selectedCase==='4')summary+=' The policies differ by 0.02 percentage points in this case.';
  el('replay-metrics').textContent=summary;
}
loadData('data/summit-replay.json').then(({rows})=>{
  renderReplay(rows);
  el('replay-case').onchange=()=>renderReplay(rows);
}).catch(()=>{el('replay-metrics').textContent='Open the replay results file for the per-case comparison.'});
const filmNames={all:'All clips',cell:'Full cycle',machines:'Machines',routes:'Routes',robots:'Robots',robust:'Robustness',speed:'Speed',method:'Method',mobile:'Mobile'};
loadData('data/clips.json').then(({clips,readouts})=>{
  const grid=el('film-grid'),filters=el('film-filters'),player=el('film-player');
  if(!grid||!clips||!clips.length)return;
  el('film-readouts').replaceChildren(...(readouts||[]).map(r=>{
    const d=document.createElement('div'),v=document.createElement('strong'),lab=document.createElement('span');
    v.textContent=r.value;
    if(r.unit){const u=document.createElement('em');u.textContent=r.unit;v.append(u)}
    lab.textContent=String(r.label||'').toUpperCase();d.append(v,lab);
    if(r.note){const n=document.createElement('small');n.textContent=r.note;d.append(n)}
    return d}));

  let active='all',current=null,previewing=null,hoverTimer=null;
  function stopPreview(card){
    if(!card)return;
    card.classList.remove('previewing');
    const v=card.querySelector('video'),bar=card.querySelector('.bar');
    if(bar)bar.style.width='0';
    if(v){try{v.pause()}catch(e){}
      if(v.getAttribute('src')){v.removeAttribute('src');try{v.load()}catch(e){}}}
    if(previewing===card)previewing=null;
  }
  function startPreview(card){
    if(reduceMotion.matches||card===previewing)return;
    if(previewing)stopPreview(previewing);
    const v=card.querySelector('video');if(!v)return;
    if(!v.getAttribute('src'))v.setAttribute('src','media/'+card.dataset.id+'.mp4');
    previewing=card;
    const go=v.play();
    if(go&&go.then)go.then(()=>{if(previewing===card)card.classList.add('previewing')}).catch(()=>{});
    else card.classList.add('previewing');
  }
  function show(c,autoplay){
    current=c.id;
    el('film-id').textContent=c.id;
    el('film-title').textContent=c.title;
    el('film-dur').textContent=c.seconds?c.seconds.toFixed(1)+' S':'';
    el('film-caption').textContent=c.caption||'';
    const chips=[];
    if(c.robot)chips.push(['',c.robot]);
    if(c.route)chips.push(['','route: '+c.route]);
    for(const d of c.dr||[])chips.push(['dr','randomised: '+d]);
    el('film-chips').replaceChildren(...chips.map(([cls,t])=>{const s=document.createElement('span');if(cls)s.className=cls;s.textContent=t;return s}));
    player.poster='media/'+c.id+'.jpg';
    player.setAttribute('aria-label',c.title+' - rendered simulation clip');
    player.src='media/'+c.id+'.mp4';
    for(const b of grid.children)b.setAttribute('aria-current',b.dataset.id===c.id?'true':'false');
    if(autoplay)player.play().catch(()=>{});
  }
  function card(c){
    const b=document.createElement('button');b.type='button';b.className='filmcard';b.dataset.id=c.id;
    b.setAttribute('aria-current',c.id===current?'true':'false');
    const shot=document.createElement('span');shot.className='shot';
    const img=document.createElement('img');img.src='media/'+c.id+'.jpg';img.loading='lazy';img.decoding='async';img.alt='';img.width=320;img.height=180;
    const v=document.createElement('video');v.muted=true;v.loop=true;v.playsInline=true;v.preload='none';v.setAttribute('aria-hidden','true');v.tabIndex=-1;
    const bar=document.createElement('span');bar.className='bar';
    shot.append(img,v,bar);
    const tag=document.createElement('span');tag.className='tag';tag.textContent=c.id;
    const play=document.createElement('span');play.className='play';play.setAttribute('aria-hidden','true');
    const meta=document.createElement('span');meta.className='meta';
    const t=document.createElement('b');t.textContent=c.title;
    const sub=document.createElement('span');
    sub.textContent=[c.seconds?Math.round(c.seconds)+'s':'',filmNames[c.section]||c.section].filter(Boolean).join(' · ');
    meta.append(t,sub);b.append(shot,tag,play,meta);
    v.addEventListener('timeupdate',()=>{if(v.duration)bar.style.width=(100*v.currentTime/v.duration)+'%'});
    b.addEventListener('pointerenter',e=>{
      if(e.pointerType==='touch')return;
      clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>startPreview(b),110)});
    b.addEventListener('pointerleave',()=>{clearTimeout(hoverTimer);stopPreview(b)});
    b.addEventListener('focus',()=>startPreview(b));
    b.addEventListener('blur',()=>stopPreview(b));
    b.addEventListener('click',()=>{stopPreview(b);show(c,true);
      el('film-player').scrollIntoView({block:'center',behavior:reduceMotion.matches?'auto':'smooth'})});
    return b;
  }
  function render(){
    if(previewing)stopPreview(previewing);
    const list=clips.filter(c=>active==='all'||c.section===active);
    el('film-count').textContent=list.length+' clip'+(list.length===1?'':'s')+(active==='all'?' in eight groups · hover to preview':' · '+(filmNames[active]||active));
    grid.replaceChildren(...list.map(card));
  }
  const groups=['all',...[...new Set(clips.map(c=>c.section))].sort((a,b)=>a.localeCompare(b))];
  filters.replaceChildren(...groups.map(g=>{
    const btn=document.createElement('button');btn.type='button';btn.textContent=filmNames[g]||g;
    btn.setAttribute('aria-pressed',g===active?'true':'false');
    btn.addEventListener('click',()=>{active=g;for(const x of filters.children)x.setAttribute('aria-pressed',x===btn?'true':'false');render()});
    return btn}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&previewing)stopPreview(previewing)});
  show(clips.find(c=>c.id==='A1')||clips[0],false);
  render();
}).catch(()=>{const g=el('film-count');if(g)g.textContent='Clip index unavailable.'});
