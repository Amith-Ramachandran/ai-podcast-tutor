import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type DocumentDTO } from '../lib/api';

const POLL_MS = 1500;

export function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const next = await api.get<DocumentDTO>(`/documents/${id}`);
        if (cancelled) return;
        setDoc(next);
        if (next.status === 'uploaded' || next.status === 'processing') {
          timer = setTimeout(tick, POLL_MS);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'fetch failed');
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  if (error) return <section><h2>Document</h2><p className="error">{error}</p></section>;
  if (!doc) return <section><h2>Document</h2><p className="muted">Loading…</p></section>;

  const isWorking = doc.status === 'uploaded' || doc.status === 'processing';

  return (
    <section>
      <h2>{doc.title}</h2>
      <p className="muted">
        {doc.mimeType} · {(doc.sizeBytes / 1024).toFixed(1)} KB ·{' '}
        <span className={`status status-${doc.status}`}>{doc.status}</span>
        {isWorking && ' (polling…)'}
      </p>

      {doc.status === 'failed' && doc.errorMessage && (
        <p className="error">Extraction failed: {doc.errorMessage}</p>
      )}

      {doc.status === 'ready' && (
        <>
          <p className="muted">{doc.charCount?.toLocaleString()} characters extracted</p>
          <pre className="extracted-text">{doc.extractedText}</pre>
        </>
      )}
    </section>
  );
}
