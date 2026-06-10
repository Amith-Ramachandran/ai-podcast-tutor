import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type DocumentDTO } from '../lib/api';

const ACCEPT = '.pdf,.txt,.md,application/pdf,text/plain,text/markdown';

export function UploadPage() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        const doc = await api.upload<DocumentDTO>('/documents/upload', form);
        navigate(`/documents/${doc.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'upload failed');
        setUploading(false);
      }
    },
    [navigate],
  );

  return (
    <section>
      <h2>Upload a document</h2>
      <p className="muted">PDF, plain text, or markdown — up to 20 MB.</p>

      <label
        className={`dropzone ${dragging ? 'dragging' : ''} ${uploading ? 'busy' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
      >
        <input
          type="file"
          accept={ACCEPT}
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          style={{ display: 'none' }}
        />
        {uploading ? <p>Uploading…</p> : <p>Drop a file here, or click to choose</p>}
      </label>

      {error && <p className="error">Error: {error}</p>}
    </section>
  );
}
