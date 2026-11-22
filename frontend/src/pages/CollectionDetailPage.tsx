import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { soundManager } from '../utils/sound';
import type { Collection, StudyDocument } from '../types';

export const CollectionDetailPage: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const navigate = useNavigate();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [recreating, setRecreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const [isDropzoneHovered, setIsDropzoneHovered] = useState(false);
  const dragCounterRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cachedTitle = collectionId ? localStorage.getItem(`recall_coll_title_${collectionId}`) : null;

  const handleRecreateCollection = async () => {
    const titleToUse = collection?.title || cachedTitle || 'Study Collection';
    const descToUse = collection?.description || '';
    try {
      setRecreating(true);
      const newColl = await api.createCollection(titleToUse, descToUse);
      if (newColl?.id) {
        localStorage.setItem(`recall_coll_title_${newColl.id}`, newColl.title);
      }
      setError(null);
      navigate(`/collections/${newColl.id}`, { replace: true });
    } catch (err: any) {
      alert(err.message || 'Failed to re-register collection');
    } finally {
      setRecreating(false);
    }
  };

  const fetchData = async () => {
    if (!collectionId) return;
    try {
      setLoading(true);
      const [collData, docData] = await Promise.all([
        api.getCollection(collectionId),
        api.listDocuments(collectionId)
      ]);
      setCollection(collData);
      if (collData?.title) {
        localStorage.setItem(`recall_coll_title_${collectionId}`, collData.title);
      }
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

  const uploadFilesList = async (files: File[]) => {
    if (!collectionId || files.length === 0) return;
    const validExtensions = ['.pdf', '.docx', '.pptx', '.txt'];
    const validFiles = files.filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return validExtensions.includes(ext);
    });

    if (validFiles.length === 0) {
      setError("Please drop or select supported files (.pdf, .docx, .pptx, or .txt).");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const newDocs: StudyDocument[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgress({ current: i + 1, total: validFiles.length, fileName: file.name });
        try {
          const doc = await api.uploadDocument(collectionId, file);
          newDocs.push(doc);
          soundManager.playCorrect();
        } catch (err: any) {
          console.error(`Upload error for ${file.name}:`, err);
          setError(`Failed to process ${file.name}: ${err?.message || 'Upload error'}`);
        }
      }

      if (newDocs.length > 0) {
        setDocuments(prev => [...newDocs, ...prev]);
        soundManager.playVictory();
      }
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      uploadFilesList(Array.from(fileList));
    }
  };

  // Full-window drag-and-drop listener
  useEffect(() => {
    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types?.includes('Files')) {
        dragCounterRef.current += 1;
        setIsWindowDragging(true);
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsWindowDragging(false);
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsWindowDragging(false);
      setIsDropzoneHovered(false);
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        uploadFilesList(files);
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [collectionId]);

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
            {collection?.title || cachedTitle || 'Collection'}
          </h1>
          {collection?.description && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.925rem', marginTop: '0.25rem' }}>
              {collection.description}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn-3d btn-3d-purple"
            onClick={() => {
              soundManager.playTick();
              window.dispatchEvent(new CustomEvent('recall:open-study-chat', {
                detail: {
                  collectionId,
                  topic: `Collection: ${collection?.title || 'Study Collection'}`
                }
              }));
            }}
            title="Chat with your companion grounded in this collection"
          >
            💬 Ask Companion
          </button>
          {documents.length > 0 && (
            <>
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
            </>
          )}
        </div>
      </div>

      {error && (
        <div
          className="card"
          style={{
            borderLeft: '4px solid var(--color-error)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'var(--color-surface)'
          }}
        >
          <div>
            <p style={{ color: 'var(--color-error-dark)', fontWeight: 700, margin: 0 }}>{error}</p>
            {error.includes('not found') && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.35rem 0 0 0' }}>
                Cloud container woke up from sleep or session rotated. Click Re-create to restore this collection instantly.
              </p>
            )}
          </div>
          {error.includes('not found') && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn-3d btn-3d-green"
                onClick={handleRecreateCollection}
                disabled={recreating}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.825rem' }}
              >
                {recreating ? 'Restoring...' : `🔄 Re-create "${collection?.title || 'Collection'}"`}
              </button>
              <button
                className="btn-3d btn-3d-white"
                onClick={() => navigate('/')}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.825rem' }}
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      )}

      {!collection && !loading && error ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📁</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Collection Unavailable</h2>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '440px', margin: '0 auto 1.5rem auto', fontSize: '0.925rem' }}>
            {error.includes('not found')
              ? 'This collection may have been created in a previous session or was reset during a server deploy. Head back to your dashboard to create or open an active collection.'
              : error}
          </p>
          <button className="btn-3d btn-3d-green" onClick={() => navigate('/')}>
            ← Back to Collections Dashboard
          </button>
        </div>
      ) : (
        <>
      {/* Full Window Drag Overlay */}
      {isWindowDragging && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28, 176, 246, 0.22)',
          backdropFilter: 'blur(8px)',
          border: '4px dashed var(--color-blue)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          animation: 'fadeIn 0.15s ease-out'
        }}>
          <div className="card" style={{
            padding: '2.5rem 3.5rem',
            textAlign: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            border: '2px solid var(--color-blue)',
            background: 'var(--color-surface)',
            transform: 'scale(1.05)',
            transition: 'transform 0.2s ease'
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>📥</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-blue)', margin: 0 }}>
              Drop Files to Add to {collection?.title || 'Collection'}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', margin: '0.5rem 0 0 0' }}>
              Release to upload PDF, DOCX, PPTX, or TXT (batch multiple files supported)
            </p>
          </div>
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        className="card"
        style={{
          border: isDropzoneHovered
            ? '3px dashed var(--color-blue)'
            : '2px dashed var(--color-border-strong)',
          textAlign: 'center',
          padding: '2.5rem 1.5rem',
          cursor: uploading ? 'wait' : 'pointer',
          background: isDropzoneHovered ? 'rgba(28, 176, 246, 0.08)' : 'var(--color-surface)',
          transform: isDropzoneHovered ? 'scale(1.01)' : 'none',
          boxShadow: isDropzoneHovered ? '0 12px 32px rgba(28, 176, 246, 0.18)' : 'none',
          transition: 'all 0.2s ease'
        }}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDropzoneHovered(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDropzoneHovered(false); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDropzoneHovered(false);
          const droppedFiles = Array.from(e.dataTransfer.files || []);
          if (droppedFiles.length > 0) uploadFilesList(droppedFiles);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.pptx,.txt"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
          disabled={uploading}
        />
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          {isDropzoneHovered ? '✨' : uploading ? '⚙️' : '📄'}
        </div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.35rem' }}>
          {uploading
            ? (uploadProgress
                ? `Uploading ${uploadProgress.current} of ${uploadProgress.total}: ${uploadProgress.fileName}...`
                : 'Extracting text and analyzing sections...')
            : isDropzoneHovered
              ? 'Release to upload your documents!'
              : 'Drag & Drop Study Documents Here'}
        </h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Supports <strong>PDF</strong>, <strong>DOCX</strong>, <strong>PPTX</strong>, or <strong>TXT</strong> • Multi-file drop enabled
        </p>
        <button
          type="button"
          className="btn-3d btn-3d-blue"
          disabled={uploading}
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
        >
          {uploading ? 'Processing Documents...' : 'Browse / Select Files 📁'}
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
      </>
      )}
    </div>
  );
};
