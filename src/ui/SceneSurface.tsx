import { Component, type ReactNode } from 'react';
import { GlobeView } from '../scene/GlobeView';
import { useView } from '../state/view';
import { RegionalMap } from './RegionalMap';

class GraphicsBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {
    useView.setState({ graphicsError: 'The 3D view could not start. Use the local map, or retry with low detail.', mapMode: 'local' });
  }
  render() { return this.state.failed ? null : this.props.children; }
}
export function SceneSurface() {
  const mode = useView(s => s.mapMode), quality = useView(s => s.quality);
  const error = useView(s => s.graphicsError), epoch = useView(s => s.graphicsEpoch);
  return <>
    {mode === 'local' ? <RegionalMap /> : <GraphicsBoundary key={`${epoch}-${quality}`}><GlobeView /></GraphicsBoundary>}
    <div className="map-toolbar" aria-label="Map display">
      <div className="seg"><button className="seg-btn" aria-pressed={mode === 'globe'} onClick={() => useView.setState({ mapMode: 'globe', graphicsEpoch: epoch + 1, graphicsError: null })}>3D globe</button><button className="seg-btn" aria-pressed={mode === 'local'} onClick={() => useView.setState({ mapMode: 'local' })}>Local map</button></div>
      <label>Detail<select aria-label="Graphics detail" value={quality} onChange={e => useView.setState({ quality: e.target.value as 'standard' | 'low' })}><option value="standard">Standard</option><option value="low">Low</option></select></label>
    </div>
    {error && <div className="graphics-notice" role="alert"><p>{error}</p><button className="btn" onClick={() => useView.setState({ graphicsError: null, graphicsEpoch: epoch + 1, quality: 'low', mapMode: 'globe' })}>Retry 3D in low detail</button><button className="text-button" onClick={() => useView.setState({ graphicsError: null })}>Keep using local map</button></div>}
  </>;
}
