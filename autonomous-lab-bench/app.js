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
// Twenty PCL nodes on an Albers USA projection; geometry is baked into data/usmap.json.
const scene=el('scene'),geo=svg('g',{},scene),link=svg('g',{},scene),dots=svg('g',{},scene);
const nationShape=svg('path',{fill:'#15323a','fill-opacity':'.82',stroke:'#63949d','stroke-width':'1.2','stroke-linejoin':'round'},geo);
const stateLines=svg('path',{fill:'none',stroke:'#4e777f','stroke-opacity':'.45','stroke-width':'.7'},geo);
const beam=svg('path',{fill:'none',stroke:'#7be6b7','stroke-opacity':'.5','stroke-width':'1.4','stroke-dasharray':'5 5','pointer-events':'none'},link);
const plansByAward=new Map();
let selected=0,elapsed=0,playing=!reduceMotion.matches,last=0,inView=true,roster=null,places=[],controls=[];
function spread(nodes){
  // Geography stays exact in the data; this only nudges markers that would collide
  // on screen (College Park and Baltimore sit ~45 km apart) so each stays clickable.
  const p=nodes.map(n=>({...n})),MIN=19;
  for(let pass=0;pass<80;pass++){
    let moved=false;
    for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){
      let dx=p[j].x-p[i].x,dy=p[j].y-p[i].y;const d=Math.hypot(dx,dy);
      if(d>=MIN||d===0)continue;
      const push=(MIN-d)/2/d;dx*=push;dy*=push;
      p[i].x-=dx;p[i].y-=dy;p[j].x+=dx;p[j].y+=dy;moved=true;
    }
    if(!moved)break;
  }
  return p;
}
function buildMap(m){
  if(!m||!m.nation||!Array.isArray(m.nodes))return;
  nationShape.setAttribute('d',m.nation);
  stateLines.setAttribute('d',m.states||'');
  places=spread(m.nodes);
  controls=places.map((p,id)=>{
    const group=svg('g',{'class':'orbit-node',role:'button',tabindex:id===0?0:-1,
      'aria-label':p.name+' — '+p.institution+', '+p.city,transform:'translate('+p.x+' '+p.y+')'},dots);
    svg('circle',{r:21,fill:'transparent'},group);
    if(id===0)svg('circle',{r:17,fill:'none',stroke:'#7af2bd','stroke-opacity':'.4','stroke-width':'1','stroke-dasharray':'3 4'},group);
    const halo=svg('circle',{r:12,fill:'none',stroke:'#7bedbc','stroke-width':'1.3'},group);
    const dot=svg('circle',{r:id===0?8.4:6,'class':'dot'},group);
    const lab=svg('text',{y:id===0?-22:-20,'font-size':id===0?13:12,'font-family':'monospace','text-anchor':'middle','pointer-events':'none'},group);
    lab.textContent=p.name;
    group.addEventListener('click',()=>pick(id));
    group.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(id)}
      else if(['ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();
        pick((id+(e.key==='ArrowRight'?1:places.length-1))%places.length);controls[selected].group.focus()}});
    return {group,dot,halo,lab}});
  pick(selected);
}
function drawAtlas(){
  if(!controls.length)return;
  controls.forEach(({dot,halo,lab},i)=>{
    const on=i===selected,home=i===0,pulse=playing?1+.14*Math.sin(elapsed*2.1+i*.6):1;
    dot.setAttribute('fill',on?'#b6ffd9':home?'#8ff0c0':'#7fb0b8');
    dot.setAttribute('stroke',on?'#effff5':home?'#9ff0c8':'#0f272d');
    dot.setAttribute('stroke-width',on?'2':home?'1.6':'1.1');
    halo.setAttribute('r',((on?17:home?13.5:12)*(on?pulse:1)).toFixed(2));
    halo.setAttribute('opacity',on?'.95':home?'.5':'0');
    lab.setAttribute('opacity',on||home?'1':'0');
    lab.setAttribute('fill',on?'#eafff3':'#9fe4c4')});
  const a=places[0],b=places[selected];
  beam.setAttribute('d',(a&&b&&selected!==0)?'M'+a.x+','+a.y+'L'+b.x+','+b.y:'');
}
function pick(i){
  selected=i;const p=places[i]||null,row=roster?.[i];showValidation(row);
  el('node-label').textContent=row?.institution||p?.institution||'DREAM · Northwestern';
  el('node-detail').textContent=[row?.name||p?.name,p?.city,row?.domain||p?.domain].filter(Boolean).join(' · ')||'Reference node for the proposed network';
  const note=el('node-note');
  if(note){note.replaceChildren();note.hidden=!row;
    if(row){const heading=document.createElement('small');heading.textContent='ILLUSTRATIVE TASK IDEA';
      const text=document.createElement('span');text.textContent=row.task||row.domain;note.append(heading,text);
      if(row.rubric){const rubric=document.createElement('span');rubric.className='rubric';rubric.textContent='Proposed scoring · '+row.rubric;note.append(rubric)}
      if(validUrl(row.source)){const a=document.createElement('a');a.href=validUrl(row.source);a.textContent='Team source ↗';note.append(a)}}}
  controls.forEach(({group},n)=>{group.setAttribute('tabindex',n===i?'0':'-1');group.setAttribute('aria-pressed',n===i?'true':'false')});
  drawAtlas();
}
el('prev').onclick=()=>pick((selected+(places.length||1)-1)%(places.length||1));
el('next').onclick=()=>pick((selected+1)%(places.length||1));
function motionLabel(){el('motion').textContent=playing?'Ⅱ':'▷';el('motion').setAttribute('aria-label',playing?'Pause node pulse':'Play node pulse')}
el('motion').onclick=()=>{playing=!playing;motionLabel();drawAtlas()};
reduceMotion.addEventListener('change',()=>{playing=!reduceMotion.matches;motionLabel();drawAtlas()});
if('IntersectionObserver'in window)new IntersectionObserver(([entry])=>inView=entry.isIntersecting).observe(el('network'));
let lastDraw=0;function frame(now){const dt=last?Math.min((now-last)/1000,.1):0;last=now;
  if(playing&&inView&&!document.hidden){elapsed+=dt;if(now-lastDraw>60){drawAtlas();lastDraw=now}}
  requestAnimationFrame(frame)}
motionLabel();requestAnimationFrame(frame);
loadData('data/usmap.json').then(buildMap).catch(()=>{});
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
  const grid=el('film-grid'),filters=el('film-filters'),box=el('film-box'),bv=el('lb-player');
  if(!grid||!clips||!clips.length)return;
  el('film-readouts').replaceChildren(...(readouts||[]).map(r=>{
    const d=document.createElement('div'),v=document.createElement('strong'),lab=document.createElement('span');
    v.textContent=r.value;
    if(r.unit){const u=document.createElement('em');u.textContent=r.unit;v.append(u)}
    lab.textContent=String(r.label||'').toUpperCase();d.append(v,lab);
    if(r.note){const n=document.createElement('small');n.textContent=r.note;d.append(n)}
    return d}));

  let active='all',previewing=null,hoverTimer=null,shown=[],at=-1;
  const chipRow=(c,extra)=>{
    const out=[];
    if(c.robot)out.push(['',c.robot]);
    if(c.route)out.push(['','route: '+c.route]);
    if(extra&&c.seconds)out.push(['',c.seconds.toFixed(1)+' s']);
    for(const d of c.dr||[])out.push(['dr','randomised: '+d]);
    return out.map(([cls,t])=>{const s=document.createElement('span');if(cls)s.className=cls;s.textContent=t;return s});
  };
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
    if(reduceMotion.matches||card===previewing||box.open)return;
    if(previewing)stopPreview(previewing);
    const v=card.querySelector('video');if(!v)return;
    if(!v.getAttribute('src'))v.setAttribute('src','media/preview/'+card.dataset.id+'.mp4');
    previewing=card;
    const go=v.play();
    if(go&&go.then)go.then(()=>{if(previewing===card)card.classList.add('previewing')}).catch(()=>{});
    else card.classList.add('previewing');
  }
  function open(c){
    at=shown.findIndex(x=>x.id===c.id);
    el('lb-id').textContent=c.id;
    el('lb-title').textContent=c.title;
    el('lb-caption').textContent=c.caption||'';
    el('lb-chips').replaceChildren(...chipRow(c,true));
    bv.poster='media/'+c.id+'.jpg';
    bv.setAttribute('aria-label',c.title+' - rendered simulation clip');
    bv.src='media/'+c.id+'.mp4';
    if(!box.open){if(box.showModal)box.showModal();else box.setAttribute('open','')}
    bv.play().catch(()=>{});
  }
  function step(d){if(shown.length)open(shown[(at+d+shown.length)%shown.length])}
  function close(){
    try{bv.pause()}catch(e){}
    if(bv.getAttribute('src')){bv.removeAttribute('src');try{bv.load()}catch(e){}}
    if(box.open&&box.close)box.close();
  }
  el('lb-close').onclick=close;
  el('lb-prev').onclick=()=>step(-1);
  el('lb-next').onclick=()=>step(1);
  box.addEventListener('close',close);
  box.addEventListener('click',e=>{if(e.target===box)close()});
  box.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'){e.preventDefault();step(1)}
    else if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}});

  function card(c){
    const b=document.createElement('button');b.type='button';b.className='filmcard';b.dataset.id=c.id;
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
    b.setAttribute('aria-label','Play '+c.title);
    v.addEventListener('timeupdate',()=>{if(v.duration)bar.style.width=(100*v.currentTime/v.duration)+'%'});
    b.addEventListener('pointerenter',e=>{
      if(e.pointerType==='touch')return;
      clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>startPreview(b),40)});
    b.addEventListener('pointerleave',()=>{clearTimeout(hoverTimer);stopPreview(b)});
    b.addEventListener('focus',()=>startPreview(b));
    b.addEventListener('blur',()=>stopPreview(b));
    b.addEventListener('click',()=>{stopPreview(b);open(c)});
    return b;
  }
  function render(){
    if(previewing)stopPreview(previewing);
    shown=clips.filter(c=>active==='all'||c.section===active);
    el('film-count').textContent=shown.length+' clip'+(shown.length===1?'':'s')+(active==='all'?' in eight groups · hover to preview, click to open':' · '+(filmNames[active]||active));
    grid.replaceChildren(...shown.map(card));
  }
  const groups=['all',...[...new Set(clips.map(c=>c.section))].sort((a,b)=>a.localeCompare(b))];
  filters.replaceChildren(...groups.map(g=>{
    const btn=document.createElement('button');btn.type='button';btn.textContent=filmNames[g]||g;
    btn.setAttribute('aria-pressed',g===active?'true':'false');
    btn.addEventListener('click',()=>{active=g;for(const x of filters.children)x.setAttribute('aria-pressed',x===btn?'true':'false');render()});
    return btn}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&previewing)stopPreview(previewing)});
  render();
}).catch(()=>{const g=el('film-count');if(g)g.textContent='Clip index unavailable.'});
