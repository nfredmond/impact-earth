import { useStore } from '../state/store';
import { eventById } from '../data/events';
import { formatYear } from '../casualties/eras';
import { useView } from '../state/view';
import { useStory } from '../state/story';
import { StoryNotebook } from './StoryNotebook';

export function TopBar() {
  const scenario = useStore((s) => s.scenario);
  const storyActive = useStory(s => s.active);
  const exploring = useStory(s => s.exploring);

  const exportReport = async () => {
    const { downloadReport } = await import('../report/exportHtml');
    const s = useStore.getState();
    downloadReport({
      scenario: s.scenario,
      result: s.result,
      impact: s.impact,
      compareImpacts: s.compareImpacts,
      event: s.eventId ? (eventById(s.eventId) ?? null) : null,
      observer: useView.getState().observer,
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
        <StoryNotebook />
        {storyActive ? <>{exploring && <button className="btn observer-btn" onClick={() => useStory.getState().resume()}>Resume story</button>}<button className="btn" onClick={() => useStory.getState().close()}>Exit story</button></> : <button className="btn" onClick={exportReport}>
          Export report
        </button>}
      </div>
    </header>
  );
}
