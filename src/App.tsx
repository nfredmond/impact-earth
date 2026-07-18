import { useEffect, useRef } from 'react';
import { GlobeView } from './scene/GlobeView';
import { TopBar } from './ui/TopBar';
import { CatalogPanel } from './ui/CatalogPanel';
import { ParamsPanel } from './ui/ParamsPanel';
import { Dashboard } from './ui/Dashboard';
import { YearScrubber } from './ui/YearScrubber';

export default function App() {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep the side panels clear of the bottom stack, whose height changes with
  // banners, notes, the compare table, and the expandable city list.
  useEffect(() => {
    const el = bottomRef.current!;
    const apply = () =>
      document.documentElement.style.setProperty('--bottom-h', `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="app">
      <GlobeView />
      <TopBar />
      <CatalogPanel />
      <ParamsPanel />
      <div className="bottom-stack" ref={bottomRef}>
        <YearScrubber />
        <Dashboard />
      </div>
    </div>
  );
}
