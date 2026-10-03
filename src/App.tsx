import { useEffect } from 'react';
import { SceneSurface } from './ui/SceneSurface';
import { TopBar } from './ui/TopBar';
import { CatalogPanel } from './ui/CatalogPanel';
import { Inspector } from './ui/Inspector';
import { Dashboard } from './ui/Dashboard';
import { YearScrubber } from './ui/YearScrubber';
import { SceneControls } from './ui/SceneControls';
import { useView } from './state/view';
import { useStore } from './state/store';
import { useStory } from './state/story';
import { StoryExperience, StoryStage } from './ui/StoryExperience';

export default function App() {
  const focus = useView((s) => s.focus);
  const mobilePanel = useView((s) => s.mobilePanel);
  const storyActive = useStory(s => s.active && !s.exploring);
  const mapMode = useView(s => s.mapMode);
  const renderScene = useView(s => s.renderScene);

  useEffect(() => useStore.subscribe((state, prev) => {
    if ((state.animationNonce !== prev.animationNonce || (state.placing && !prev.placing)) && window.matchMedia('(max-width: 900px)').matches) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }), []);

  return (
    <div className={`app${focus ? ' focus-mode' : ''}${storyActive ? ' story-mode' : ''}`} data-mobile-panel={mobilePanel}>
      <TopBar />
      <main className="scene-stage" aria-label="Interactive Earth">
        <SceneSurface />
        {storyActive ? (mapMode === 'globe' || !renderScene ? <StoryStage /> : null) : mapMode === 'globe' ? <SceneControls /> : null}
      </main>
      {storyActive ? <StoryExperience /> : <>
      <nav className="mobile-nav" aria-label="Simulator panels">
        {(['catalog', 'params', 'results'] as const).map((panel) => (
          <button key={panel} aria-pressed={mobilePanel === panel} onClick={() => useView.setState({ mobilePanel: panel })}>
            {panel === 'catalog' ? 'Explore events' : panel === 'params' ? 'Explore scenario' : 'Consequences'}
          </button>
        ))}
      </nav>
      <CatalogPanel />
      <Inspector />
      <div className="bottom-stack">
        <YearScrubber />
        <Dashboard />
      </div>
      </>}
    </div>
  );
}
