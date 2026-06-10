import { useParams } from 'react-router-dom';

export function PodcastPage() {
  const { id } = useParams();
  return (
    <section>
      <h2>Podcast {id}</h2>
      <p className="muted">Phase 5 will mount an audio player; Phase 6 adds the Ask panel.</p>
      <div className="player-placeholder">audio player goes here</div>
    </section>
  );
}
