import { useId } from 'react';
import type { SimulationResult } from '../types';
import { fmtEnergy, fmtKm } from './fmt';

/** Height is quantitative. Object glyphs, trail, glow, and ground are illustrative. */
export function AtmosphereDiagram({ result, label, ceiling = 30 }: { result: SimulationResult; label: string; ceiling?: number }) {
  const id = useId();
  const altitude = result.airburst ? result.burstAltitudeKm ?? 0 : 0;
  const y = 330 - altitude / ceiling * 250;
  return <figure className="atmosphere-figure">
    <svg viewBox="0 0 440 400" role="img" aria-label={`${label}: ${result.airburst ? `airburst at ${fmtKm(altitude)} altitude` : 'surface impact'}. ${fmtEnergy(result.energyMt)} TNT equivalent.`}>
      <defs>
        <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="#081321"/><stop offset=".75" stopColor="#163649"/><stop offset="1" stopColor="#395e68"/></linearGradient>
        <radialGradient id={`${id}-glow`}><stop stopColor="#ffe7c0" stopOpacity=".8"/><stop offset=".2" stopColor="#ffc67e" stopOpacity=".35"/><stop offset="1" stopColor="#ffb975" stopOpacity="0"/></radialGradient>
        <linearGradient id={`${id}-trail`} x2="1" y2="1"><stop stopColor="#ffd4a2" stopOpacity="0"/><stop offset="1" stopColor="#fff3d4"/></linearGradient>
      </defs>
      <rect x="0" y="15" width="440" height="340" rx="10" fill={`url(#${id}-sky)`}/>
      {[10, 20, 30].filter(k => k <= ceiling).map(k => <g key={k}><path d={`M56 ${330-k/ceiling*250}H422`} stroke="#aacfd0" strokeOpacity=".15" strokeDasharray="3 6"/><text x="10" y={335-k/ceiling*250}>{k} km</text></g>)}
      <text x="10" y="37">Altitude</text>
      <path d={`M115 48 L267 ${y}`} stroke={`url(#${id}-trail)`} strokeWidth="5"/>
      <path d={`M101 30 L267 ${y}`} stroke="#bdd3cd" strokeOpacity=".4" strokeDasharray="3 7"/>
      <circle cx="267" cy={y} r="74" fill={`url(#${id}-glow)`}/>
      <circle cx="267" cy={y} r="9" fill="#fff1ce"/>
      <circle cx="267" cy={y} r="24" fill="none" stroke="#ffcf95" strokeOpacity=".6"/>
      <path d={`M287 ${y} H405 M399 ${y} V330 M393 330 H405`} fill="none" stroke="#ffc38d" strokeDasharray="4 3"/>
      <path d="M0 334 Q40 318 80 334 T160 332 T240 334 T320 330 T440 334 V355 H0Z" fill="#192e2d"/>
      {Array.from({ length: 17 }, (_, i) => <path key={i} d={`M${i*27} 334 v-16 m-6 9 l6-15 6 15Z`} fill="#37554c"/>)}
      <text x="10" y="378">{result.airburst ? 'Energy released above the surface' : 'Object reaches the surface'}</text>
      <text className="diagram-altitude" x="410" y={Math.max(64,y-15)} textAnchor="end">{result.airburst ? fmtKm(altitude) : 'Ground'}</text>
    </svg>
    <figcaption>{label}<strong>{result.airburst ? 'Airburst' : 'Surface impact'}</strong><span>{fmtEnergy(result.energyMt)} TNT equivalent</span></figcaption>
  </figure>;
}
