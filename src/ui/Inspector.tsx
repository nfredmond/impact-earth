import { useView } from '../state/view';
import { useEffect, useRef } from 'react';
import { ParamsPanel } from './ParamsPanel';
import { ObserverPanel } from './ObserverPanel';
import { ScalePanel } from './ScalePanel';

export function Inspector() {
  const active = useView((s) => s.inspector);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => { if (content.current) content.current.scrollTop = 0; }, [active]);
  return <aside className="panel inspector" aria-label="Explore the scenario">
    <nav className="inspector-tabs" aria-label="Scenario tools">
      {(['scenario', 'observer', 'scale'] as const).map((tab) => <button key={tab} aria-pressed={active === tab} onClick={() => {
        useView.setState({ inspector: tab });
        if (window.matchMedia('(max-width: 900px)').matches) {
          const top = document.querySelector('.inspector')!.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: top - 48, behavior: 'instant' });
        }
      }}>{tab === 'scenario' ? 'Scenario' : tab === 'observer' ? 'Observer' : 'Scale lab'}</button>)}
    </nav>
    <div className="inspector-content" ref={content}>{active === 'scenario' ? <ParamsPanel /> : active === 'observer' ? <ObserverPanel /> : <ScalePanel />}</div>
  </aside>;
}
