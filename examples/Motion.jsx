import {useEffect,useRef} from 'react';
import {createMotion} from '../lib/motion.js';
import '../lib/motion.css';

// Memoize options in the parent to avoid replaying on unrelated renders.
// Use text-only children with kind=words/scrub. For rich markup, animate wrappers.
export function Motion({preset,options,children,as:Tag='div'}){
  const ref=useRef(null);
  useEffect(()=>{
    const controller=createMotion(ref.current,preset,options);
    return()=>controller.destroy(); // React StrictMode safe setup / cleanup
  },[preset,options]);
  return <Tag ref={ref}>{children}</Tag>;
}

// Usage (manifest imported by your bundler):
// <Motion preset={manifest.presets.find(p=>p.id==='word-rise')} as="h2">Sua próxima ideia.</Motion>
// SPA route entry: remount/key this component by route, or call controller.play() after navigation.
