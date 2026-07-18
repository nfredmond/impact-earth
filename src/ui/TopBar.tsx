import { useStore } from '../state/store';
import { eventById } from '../data/events';
import { formatYear } from '../casualties/eras';
import { downloadReport } from '../report/exportHtml';

export function TopBar() {
  const scenario = useStore((s) => s.scenario);

  const exportReport = () => {
    const s = useStore.getState();
    downloadReport({
      scenario: s.scenario,
      result: s.result,
      impact: s.impact,
      compareImpacts: s.compareImpacts,
      event: s.eventId ? (eventById(s.eventId) ?? null) : null,
    });
  };

  return (
    <header className="topbar">
      <div className="wordmark">
        <span className="wordmark-main">IMPACT EARTH</span>
        <span className="wordmark-sub">asteroids · airbursts · calderas · consequences</span>
      </div>
      <div className="topbar-right">
        <span className="context-readout">
          {scenario.placeName} · {formatYear(scenario.year)}
        </span>
        <button className="btn" onClick={exportReport}>
          Export report
        </button>
      </div>
    </header>
  );
}
