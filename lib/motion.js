/** Independent implementation. No source animation code or media from reference site. */
export const defaults=Object.freeze({duration:700,delay:0,easing:'cubic-bezier(0.22, 1, 0.36, 1)',translate:[0,30],scale:1,opacity:0,stagger:65,trigger:'manual',once:true,threshold:0.15,responsive:{mobile:{maxWidth:640,translate:[0,18],duration:500},tablet:{maxWidth:960,translate:[0,24]}}});
export function resolveOptions(preset={},overrides={},width=1024){
  const o={...defaults,...preset,...overrides,responsive:{...defaults.responsive,...preset.responsive,...overrides.responsive}};
  const rules=Object.values(o.responsive).filter(r=>width<=r.maxWidth).sort((a,b)=>a.maxWidth-b.maxWidth);
  const result={...o,...(rules[0]||{})};
  for(const k of ['duration','delay','stagger']) if(!Number.isFinite(result[k])||result[k]<0)throw new TypeError(k+' deve ser número >= 0');
  if(!Array.isArray(result.translate)||result.translate.length!==2||!result.translate.every(Number.isFinite))throw new TypeError('translate deve ser [x,y] em px');
  if(!Number.isFinite(result.scale)||result.scale<=0)throw new TypeError('scale deve ser > 0');
  if(!Number.isFinite(result.opacity)||result.opacity<0||result.opacity>1)throw new TypeError('opacity deve estar entre 0 e 1');
  if(!['manual','load','scroll','hover'].includes(result.trigger))throw new TypeError('trigger inválido');
  if(!Number.isFinite(result.threshold)||result.threshold<0||result.threshold>1)throw new TypeError('threshold deve estar entre 0 e 1');
  if(typeof result.easing!=='string'||!result.easing.trim())throw new TypeError('easing deve ser uma curva CSS');
  return result;
}
export function keyframes(kind,o){
  const from={opacity:o.opacity,transform:`translate(${o.translate[0]}px, ${o.translate[1]}px) scale(${o.scale})`};
  const to={opacity:1,transform:'translate(0px, 0px) scale(1)'};
  if(kind==='mask')return [{...from,clipPath:'inset(100% 0 0 0)'},{...to,clipPath:'inset(0% 0 0 0)'}];
  if(kind==='outline')return [{...from,clipPath:'inset(0 100% 0 0)'},{...to,clipPath:'inset(0 0% 0 0)'}];
  if(kind==='drift')return [{...from,opacity:1},{...to,transform:`translate(${-o.translate[0]}px, ${-o.translate[1]}px) scale(${o.scale})`}];
  return [from,to];
}
export const progress=(top,height,viewport)=>Math.max(0,Math.min(1,(viewport-top)/(viewport+height)));
export function createMotion(element,preset,overrides={}){
  if(!element?.ownerDocument)throw new TypeError('Elemento DOM necessário');
  const win=element.ownerDocument.defaultView;
  const kind=preset.kind||'reveal';
  if(!['reveal','words','scrub','swap','mask','drift','outline'].includes(kind))throw new TypeError('kind não suportado');
  let dead=false,animations=[],observer,raf=0,played=false,unlisten=[],wordOriginal=null;
  let base=resolveOptions(preset.options,overrides,win.innerWidth), o=base;
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  let targets=[element];
  const saved=new Map();
  const remember=e=>{if(!saved.has(e))saved.set(e,e.getAttribute('style'));};
  remember(element);
  if(kind==='words'||kind==='scrub'){
    // Text-only targets: preserve original nodes for cleanup, and a single accessible copy.
    wordOriginal=[...element.childNodes];
    const text=element.textContent;
    element.replaceChildren();
    const sr=element.ownerDocument.createElement('span');sr.className='wml-sr';sr.textContent=text;element.append(sr);
    const visual=element.ownerDocument.createElement('span');visual.setAttribute('aria-hidden','true');element.append(visual);
    targets=text.split(/(\s+)/).filter(Boolean).map(word=>{const s=element.ownerDocument.createElement('span');s.textContent=word;s.className='wml-word';visual.append(s);return s;});
    targets.forEach(remember);
  }
  if(kind==='swap'){
    targets=[element.querySelector('.wml-button-label'),element.querySelector('.wml-button-arrow')];
    if(targets.some(t=>!t))throw new TypeError('swap requer .wml-button-label e .wml-button-arrow');
    targets.forEach(remember);
  }
  const listen=(target,event,fn,opts)=>{target.addEventListener(event,fn,opts);unlisten.push(()=>target.removeEventListener(event,fn,opts));};
  const cancel=()=>{animations.forEach(a=>a.cancel());animations=[];};
  const effective=()=>({...base,...(reduced.matches||overrides.reducedMotion?{duration:0,delay:0,stagger:0,translate:[0,0],opacity:1,scale:1}:{})});
  const frames=(target,i)=>{
    if(kind==='swap'){
      const distance=targets[1].getBoundingClientRect().width;
      const labelWidth=targets[0].getBoundingClientRect().width;
      return [{transform:'translateX(0px)'},{transform:`translateX(${i===0?distance:-labelWidth}px)`}];
    }
    if(kind==='scrub')return [{opacity:o.opacity},{opacity:1}];
    return keyframes(kind,o);
  };
  function play(){if(dead)return Promise.resolve();cancel();o=effective();played=true;
    animations=targets.map((target,i)=>target.animate(frames(target,i),{duration:o.duration,delay:o.delay+i*(kind==='words'?o.stagger:0),easing:o.easing,fill:'both'}));
    return Promise.all(animations.map(a=>a.finished.catch(()=>{})));
  }
  function reset(){cancel();played=false;saved.forEach((style,e)=>style===null?e.removeAttribute('style'):e.setAttribute('style',style));}
  function leave(){if(dead)return;cancel();o=effective();animations=targets.map((target,i)=>target.animate([...frames(target,i)].reverse(),{duration:o.duration, easing:o.easing,fill:'both'}));}
  function updateScroll(){raf=0;if(dead)return;o=effective();const r=element.getBoundingClientRect();const p=progress(r.top,r.height,win.innerHeight);
    if(reduced.matches||overrides.reducedMotion){targets.forEach(t=>{t.style.opacity='1';t.style.transform='none';});return;}
    if(kind==='scrub')targets.forEach((t,i)=>{const local=Math.max(0,Math.min(1,p*(1+targets.length*0.045)-i*0.045));t.style.opacity=String(o.opacity+(1-o.opacity)*local);});
    else element.style.transform=`translate(${o.translate[0]*(1-2*p)}px, ${o.translate[1]*(1-2*p)}px) scale(${o.scale})`;
  }
  const queue=()=>{if(!raf)raf=win.requestAnimationFrame(updateScroll);};
  if(o.trigger==='hover'){listen(element,'pointerenter',play);listen(element,'pointerleave',leave);listen(element,'focusin',play);listen(element,'focusout',leave);}
  else if(o.trigger==='scroll'&&(kind==='scrub'||kind==='drift')){listen(win,'scroll',queue,{passive:true});updateScroll();}
  else if(o.trigger==='scroll'&&win.IntersectionObserver){observer=new win.IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting&&(!played||!base.once))play();else if(!entry.isIntersecting&&!base.once)reset();}),{threshold:o.threshold});observer.observe(element);}
  else if(o.trigger!=='manual')play();
  const preferenceChange=()=>{base=resolveOptions(preset.options,overrides,win.innerWidth);o=effective();if(o.trigger==='scroll'&&(kind==='scrub'||kind==='drift'))queue();else if(played)play();};
  listen(win,'resize',preferenceChange);listen(reduced,'change',preferenceChange);
  return {play,reset,leave,get options(){return effective();},get activeAnimations(){return animations;},destroy(){if(dead)return;dead=true;cancel();observer?.disconnect();win.cancelAnimationFrame(raf);unlisten.forEach(fn=>fn());saved.forEach((style,e)=>style===null?e.removeAttribute('style'):e.setAttribute('style',style));if(wordOriginal)element.replaceChildren(...wordOriginal);}};
}
export function registerPreset(manifest,preset){if(!preset.id||manifest.presets.some(p=>p.id===preset.id))throw new Error('id ausente ou duplicado');resolveOptions(preset.options);manifest.presets.push(preset);return preset;}
export function mount(root,manifest){const controllers=[...root.querySelectorAll('[data-motion]')].map(el=>{const p=manifest.presets.find(p=>p.id===el.dataset.motion);if(!p)throw new Error('Preset desconhecido: '+el.dataset.motion);return createMotion(el,p,{trigger:el.dataset.trigger||p.options.trigger});});return()=>controllers.forEach(c=>c.destroy());}
