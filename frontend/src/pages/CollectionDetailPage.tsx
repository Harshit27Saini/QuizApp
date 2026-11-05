import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Collection, StudyDocument } from '../types';

export const CollectionDetailPage: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const navigate = useNavigate();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!collectionId) return;
    try {
      setLoading(true);
      const [collData, docData] = await Promise.all([
        api.getCollection(collectionId),
        api.listDocuments(collectionId)
      ]);
      setCollection(collData);
      setDocuments(docData);
    } catch (err: any) {
      setError(err.message || 'Failed to load collection details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [collectionId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !collectionId) return;

    try {
      setUploading(true);
      setError(null);
      const newDoc = await api.uploadDocument(collectionId, file);
      setDocuments(prev => [newDoc, ...prev]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!collectionId || !collection) return;
    if (window.confirm(`Are you sure you want to delete "${collection.title}" and all its documents?`)) {
      try {
        await api.deleteCollection(collectionId);
        navigate('/');
      } catch (err: any) {
        alert(err.message || 'Failed to delete collection');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/" style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              ← Back to Collections
            </Link>
            <button
              onClick={handleDeleteCollection}
              className="btn-3d btn-3d-white"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-red)' }}
              title="Delete this collection"
            >
              🗑️ Delete Collection
            </button>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
            {collection?.title || 'Collection'}
          </h1>
          {collection?.description && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.925rem', marginTop: '0.25rem' }}>
              {collection.description}
            </p>
          )}
        </div>

        {documents.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn-3d btn-3d-white"
              onClick={() => navigate(`/collections/${collectionId}/cards`)}
            >
              🗂️ Study Cards
            </button>
            <button
              className="btn-3d btn-3d-gold"
              onClick={() => navigate(`/documents/${documents[0].id}/path`)}
            >
              🗺️ Learning Path
            </button>
            <button
              className="btn-3d btn-3d-green"
              onClick={() => navigate(`/collections/${collectionId}/quiz-setup`)}
            >
              ⚡ Generate Quiz
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--color-error)' }}>
          <p style={{ color: 'var(--color-error-dark)', fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        className="card"
        style={{
          border: '2px dashed var(--color-border-strong)',
          textAlign: 'center',
          padding: '2.5rem 1.5rem',
          cursor: uploading ? 'wait' : 'pointer',
          background: 'var(--color-surface)'
        }}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.pptx,.txt"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          {uploading ? 'Extracting text and analyzing sections...' : 'Upload Study Document'}
        </h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Supports <strong>PDF</strong>, <strong>DOCX</strong>, <strong>PPTX</strong>, or <strong>TXT</strong> (up to 25MB)
        </p>
        <button type="button" className="btn btn-secondary" disabled={uploading}>
          {uploading ? 'Processing Document...' : 'Select File'}
        </button>
      </div>

      {/* Documents List */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
          Uploaded Materials ({documents.length})
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
            No documents uploaded yet. Upload a lecture PDF or slides above to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {documents.map(doc => (
              <div
                key={doc.id}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{
                    padding: '0.375rem 0.625rem',
                    background: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase'
                  }}>
                    {doc.file_type}
                  </span>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{doc.filename}</h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {doc.total_pages} {doc.total_pages === 1 ? 'page/slide' : 'pages/slides'} • {(doc.file_size_bytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                  <Link
                    to={`/documents/${doc.id}/path`}
                    className="btn-3d btn-3d-gold"
                    style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem' }}
                  >
                    🗺️ Learning Path
                  </Link>
                  <Link
                    to={`/documents/${doc.id}/preview`}
                    className="btn-3d btn-3d-white"
                    style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem' }}
                  >
                    🔍 Text Preview
                  </Link>
                  <button
                    className="btn-3d btn-3d-blue"
                    style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem' }}
                    onClick={() => navigate(`/collections/${collectionId}/quiz-setup?doc=${doc.id}`)}
                  >
                    ⚡ Quiz
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
