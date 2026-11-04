import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { StudyDocument } from '../types';

export const DocumentPreviewPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<StudyDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;
    setLoading(true);
    api.getDocumentPreview(documentId)
      .then(data => setDocument(data))
      .catch(err => setError(err.message || 'Failed to load document preview'))
      .finally(() => setLoading(false));
  }, [documentId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          {document?.collection_id && (
            <Link to={`/collections/${document.collection_id}`} style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              ← Back to Collection
            </Link>
          )}
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>
            Document Preview: {document?.filename || 'Loading...'}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Verify extracted content and structural sections before quiz generation.
          </p>
        </div>

        {document && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              to={`/documents/${document.id}/path`}
              className="btn btn-primary"
              style={{ backgroundColor: 'var(--color-xp)', borderColor: 'var(--color-xp)' }}
            >
              🗺️ Start Learning Journey
            </Link>
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/collections/${document.collection_id}/quiz-setup?doc=${document.id}`)}
            >
              ⚡ Generate Quiz
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
          Loading extracted document sections...
        </div>
      ) : error ? (
        <div className="card" style={{ borderLeft: '4px solid var(--color-error)' }}>
          <p style={{ color: 'var(--color-error-dark)', fontWeight: 600 }}>{error}</p>
        </div>
      ) : !document || !document.sections || document.sections.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>No text sections were extracted for this document.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ background: 'var(--color-surface)', display: 'flex', gap: '2rem', flexWrap: 'wrap', padding: '1rem 1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', textTransform: 'uppercase', fontWeight: 700 }}>Total Pages</span>
              <p style={{ fontSize: '1.125rem', fontWeight: 800 }}>{document.total_pages}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', textTransform: 'uppercase', fontWeight: 700 }}>Parsed Sections</span>
              <p style={{ fontSize: '1.125rem', fontWeight: 800 }}>{document.sections.length}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', textTransform: 'uppercase', fontWeight: 700 }}>Format</span>
              <p style={{ fontSize: '1.125rem', fontWeight: 800, textTransform: 'uppercase' }}>{document.file_type}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {document.sections.map((section, idx) => (
              <div key={section.id || idx} className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-mode">
                      Section {section.section_index + 1}
                    </span>
                    {section.page_number && (
                      <span className="badge" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-muted)' }}>
                        Page {section.page_number}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
                    ~{section.token_estimate} tokens
                  </span>
                </div>

                {section.heading && (
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-text-main)' }}>
                    {section.heading}
                  </h3>
                )}

                <div style={{
                  fontSize: '0.925rem',
                  color: 'var(--color-text-main)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                  background: 'var(--color-bg)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)'
                }}>
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
