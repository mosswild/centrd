import React, { useState } from 'react';
import { StickyNote, Plus, Layers, Edit3, Trash2, X, Check, Calendar, Camera } from 'lucide-react';
import { getNotesArray, getPostItColor, getMatchingStagePhotos, isSameStage, getAvailableStages } from '../utils/noteUtils';
import ImageLightboxModal from './ImageLightboxModal';

export default function PostItNotesStack({ throwItem, onUpdateNotes, activeStage = 'all', readOnly = false, settings = null }) {
  const allNotes = getNotesArray(throwItem);
  const photos = throwItem.photos || [];
  const availableStages = getAvailableStages(throwItem, [], settings);

  // Filter notes if a specific stage filter tab is active
  const notes = activeStage === 'all' 
    ? allNotes 
    : allNotes.filter(n => isSameStage(n.stage, activeStage));

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'view', 'edit', 'add', or null
  const [selectedNote, setSelectedNote] = useState(null);
  const [formText, setFormText] = useState('');
  const [formStage, setFormStage] = useState(activeStage !== 'all' ? activeStage : 'Wet Clay');
  const [customStage, setCustomStage] = useState('');
  
  // Image Lightbox Modal state
  const [lightboxState, setLightboxState] = useState({ isOpen: false, photos: [], index: 0 });

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) return;
    try {
      const updatedPhotos = (photos || []).filter(p => p.id !== photoId);
      await updateThrowLog(throwItem.id, { photos: updatedPhotos });
      setLightboxState(prev => {
        if (!prev.isOpen) return prev;
        const newPhotos = (prev.photos || []).filter(p => p.id !== photoId);
        if (newPhotos.length === 0) return { isOpen: false, photos: [], index: 0 };
        const newIndex = Math.min(prev.index, newPhotos.length - 1);
        return { ...prev, photos: newPhotos, index: newIndex };
      });
    } catch (err) {
      console.error(err);
      alert("Failed to delete photo: " + err.message);
    }
  };

  const handleUpdatePhotoStage = async (photoId, newStage) => {
    try {
      const updatedPhotos = (photos || []).map(p => {
        if (p.id === photoId) {
          return { ...p, stage: newStage };
        }
        return p;
      });
      await updateThrowLog(throwItem.id, { photos: updatedPhotos });
      setLightboxState(prev => {
        if (!prev.isOpen) return prev;
        const newPhotos = (prev.photos || []).map(p => {
          if (p.id === photoId) return { ...p, stage: newStage };
          return p;
        });
        return { ...prev, photos: newPhotos };
      });
    } catch (err) {
      console.error(err);
      alert("Failed to update photo stage: " + err.message);
    }
  };

  // Fixed set of subtle rotations for organic post-it look
  const angles = [-2.5, 2, -1.8, 3.2, -3, 1.5, -2, 2.8];

  const handleOpenAddModal = (e) => {
    if (e) e.stopPropagation();
    setFormText('');
    setFormStage(activeStage !== 'all' ? activeStage : 'Wet Clay');
    setCustomStage('');
    setActiveModal('add');
  };

  const handleOpenViewModal = (note, e) => {
    if (e) e.stopPropagation();
    setSelectedNote(note);
    setFormText(note.text);
    setFormStage(availableStages.includes(note.stage) ? note.stage : 'Other');
    setCustomStage(availableStages.includes(note.stage) ? '' : note.stage);
    setActiveModal('view');
  };

  const handleSaveNewNote = async (e) => {
    e.preventDefault();
    if (!formText.trim()) return;

    const finalStage = formStage === 'Other' ? (customStage.trim() || 'General') : formStage;
    const newNoteObj = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      text: formText.trim(),
      stage: finalStage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedNotesArray = [...allNotes, newNoteObj];
    await onUpdateNotes(throwItem.id, updatedNotesArray);

    setActiveModal(null);
    setFormText('');
  };

  const handleSaveEditedNote = async (e) => {
    e.preventDefault();
    if (!selectedNote || !formText.trim()) return;

    const finalStage = formStage === 'Other' ? (customStage.trim() || 'General') : formStage;
    const updatedNotesArray = allNotes.map(n => {
      if (n.id === selectedNote.id) {
        return {
          ...n,
          text: formText.trim(),
          stage: finalStage,
          updatedAt: new Date().toISOString()
        };
      }
      return n;
    });

    await onUpdateNotes(throwItem.id, updatedNotesArray);
    setActiveModal(null);
    setSelectedNote(null);
  };

  const handleDeleteNote = async (noteId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this sticky note?')) return;

    const updatedNotesArray = allNotes.filter(n => n.id !== noteId);
    await onUpdateNotes(throwItem.id, updatedNotesArray);
    if (selectedNote && selectedNote.id === noteId) {
      setActiveModal(null);
      setSelectedNote(null);
    }
  };

  return (
    <div className="postit-stack-wrapper">
      {/* Header Bar */}
      <div className="postit-stack-header">
        <div className="postit-stack-title">
          <StickyNote size={15} style={{ color: 'var(--terracotta)' }} />
          <span>Notes ({notes.length}{activeStage !== 'all' ? ` in ${activeStage}` : ''})</span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {notes.length > 1 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderRadius: '8px' }}
              title={isExpanded ? "Collapse into stack" : "Expand all notes"}
            >
              <Layers size={13} />
              {isExpanded ? 'Stack' : 'Fan Out'}
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="btn btn-celadon"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderRadius: '8px' }}
            >
              <Plus size={13} />
              Add Note
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {notes.length === 0 ? (
        <div
          onClick={readOnly ? undefined : handleOpenAddModal}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px dashed var(--border-color)',
            borderRadius: '12px',
            padding: '0.85rem',
            textAlign: 'center',
            cursor: readOnly ? 'default' : 'pointer',
            transition: 'var(--transition-smooth)'
          }}
          className={readOnly ? "" : "glass-interactive"}
        >
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <em>No notes for {activeStage === 'all' ? 'this cylinder' : activeStage}. {readOnly ? '' : 'Click to add one!'}</em>
          </p>
        </div>
      ) : isExpanded ? (
        /* Expanded Deck (Fan Out Grid View) */
        <div className="postit-expanded-deck">
          {notes.map((note, idx) => {
            const palette = getPostItColor(idx, note.stage);
            const rot = angles[idx % angles.length];
            const matchingPhotos = getMatchingStagePhotos(photos, note.stage);

            return (
              <div
                key={note.id || idx}
                className="postit-card"
                style={{
                  backgroundColor: palette.bg,
                  color: palette.text,
                  transform: `rotate(${rot}deg)`
                }}
                onClick={(e) => handleOpenViewModal(note, e)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span className="postit-stage-badge" style={{ backgroundColor: palette.tagBg }}>
                    {note.stage || 'Wet Clay'}
                  </span>
                  {matchingPhotos.length > 0 && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px', opacity: 0.8 }}>
                      <Camera size={11} /> {matchingPhotos.length}
                    </span>
                  )}
                </div>
                <p className="postit-note-text">{note.text}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem', opacity: 0.7, fontSize: '0.7rem' }}>
                  <span>{new Date(note.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <Edit3 size={12} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Stacked Deck View */
        <div className="postit-stacked-deck" style={{ minHeight: `${Math.max(110, 110 + Math.min(notes.length - 1, 4) * 8)}px` }}>
          {notes.map((note, idx) => {
            const palette = getPostItColor(idx, note.stage);
            const rot = angles[idx % angles.length];
            const topOffset = idx * 6;
            const leftOffset = idx * 4;
            const zIndex = notes.length - idx;
            const matchingPhotos = getMatchingStagePhotos(photos, note.stage);

            return (
              <div
                key={note.id || idx}
                className="postit-card"
                style={{
                  backgroundColor: palette.bg,
                  color: palette.text,
                  top: `${topOffset}px`,
                  left: `${leftOffset}px`,
                  transform: `rotate(${rot}deg)`,
                  zIndex: zIndex
                }}
                onClick={(e) => handleOpenViewModal(note, e)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span className="postit-stage-badge" style={{ backgroundColor: palette.tagBg }}>
                    {note.stage || 'Wet Clay'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {matchingPhotos.length > 0 && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px', opacity: 0.8 }} title={`${matchingPhotos.length} photo(s) for ${note.stage}`}>
                        <Camera size={11} /> {matchingPhotos.length}
                      </span>
                    )}
                    {idx === 0 && notes.length > 1 && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.6 }}>
                        1 of {notes.length}
                      </span>
                    )}
                  </div>
                </div>
                <p className="postit-note-text" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {note.text}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODAL OVERLAYS (View/Edit & Add) --- */}

      {/* View & Edit Modal */}
      {(activeModal === 'view' || activeModal === 'edit') && selectedNote && (
        <div className="postit-modal-backdrop" onClick={() => setActiveModal(null)}>
          {(() => {
            const idx = allNotes.findIndex(n => n.id === selectedNote.id);
            const palette = getPostItColor(idx >= 0 ? idx : 0, selectedNote.stage);
            const stagePhotos = getMatchingStagePhotos(photos, selectedNote.stage);
            
            return (
              <div
                className="postit-modal-content"
                style={{ backgroundColor: palette.bg, color: palette.text }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="postit-stage-badge" style={{ backgroundColor: palette.tagBg, fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                      {selectedNote.stage || 'Wet Clay'}
                    </span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                      <Calendar size={12} style={{ display: 'inline', marginRight: '3px' }} />
                      {new Date(selectedNote.createdAt || Date.now()).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    style={{ background: 'none', border: 'none', color: palette.text, cursor: 'pointer', opacity: 0.7 }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Cross-linked Stage Photos Preview */}
                {stagePhotos.length > 0 && (
                  <div style={{ marginBottom: '1rem', background: 'rgba(0,0,0,0.06)', borderRadius: '10px', padding: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.4rem', opacity: 0.8 }}>
                      <Camera size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      Photos logged for {selectedNote.stage}:
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
                      {stagePhotos.map((p, pI) => (
                        <img
                          key={p.id || pI}
                          src={p.url}
                          alt={`${selectedNote.stage} photo`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxState({ isOpen: true, photos: stagePhotos, index: pI });
                          }}
                          style={{
                            width: '80px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid rgba(0,0,0,0.15)',
                            cursor: 'pointer'
                          }}
                          title="Click to view expanded image"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Form or View Mode */}
                {activeModal === 'edit' ? (
                  <form onSubmit={handleSaveEditedNote}>
                    <label style={{ color: palette.text, marginBottom: '0.3rem', fontSize: '0.75rem' }}>
                      Pottery Stage:
                    </label>
                    <select
                      value={formStage}
                      onChange={(e) => setFormStage(e.target.value)}
                      style={{
                        marginBottom: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.7)',
                        color: '#2c2826',
                        border: '1px solid rgba(0,0,0,0.15)'
                      }}
                    >
                      {availableStages.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                      <option value="Other">Custom Label...</option>
                    </select>

                    {formStage === 'Other' && (
                      <input
                        type="text"
                        placeholder="e.g. Underglaze details"
                        value={customStage}
                        onChange={(e) => setCustomStage(e.target.value)}
                        style={{
                          marginBottom: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.7)',
                          color: '#2c2826',
                          border: '1px solid rgba(0,0,0,0.15)'
                        }}
                      />
                    )}

                    <label style={{ color: palette.text, marginBottom: '0.3rem', fontSize: '0.75rem' }}>
                      Sticky Note Text:
                    </label>
                    <textarea
                      rows={5}
                      value={formText}
                      onChange={(e) => setFormText(e.target.value)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.85)',
                        color: '#2c2826',
                        border: '1px solid rgba(0,0,0,0.15)',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        lineHeight: '1.4'
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setActiveModal('view')}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                      >
                        <Check size={14} /> Save Note
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div style={{
                      fontSize: '1rem',
                      lineHeight: '1.55',
                      marginBottom: '1.5rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      minHeight: '80px'
                    }}>
                      {selectedNote.text}
                    </div>

                    {!readOnly && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '0.8rem' }}>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNote(selectedNote.id, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#c05c46',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}
                        >
                          <Trash2 size={15} /> Delete
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveModal('edit')}
                          className="btn btn-secondary"
                          style={{
                            background: 'rgba(255,255,255,0.7)',
                            borderColor: 'rgba(0,0,0,0.2)',
                            padding: '0.4rem 1rem',
                            fontSize: '0.85rem'
                          }}
                        >
                          <Edit3 size={14} /> Edit Note
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Add New Note Modal */}
      {activeModal === 'add' && (
        <div className="postit-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div
            className="postit-modal-content"
            style={{ backgroundColor: '#fff59d', color: '#3e2723' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                <StickyNote size={18} style={{ color: '#c96f53' }} />
                <span>Attach New Sticky Note</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', color: '#3e2723', cursor: 'pointer', opacity: 0.7 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNewNote}>
              <label style={{ color: '#3e2723', marginBottom: '0.3rem', fontSize: '0.75rem' }}>
                Pottery Stage:
              </label>
              <select
                value={formStage}
                onChange={(e) => setFormStage(e.target.value)}
                style={{
                  marginBottom: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.85)',
                  color: '#2c2826',
                  border: '1px solid rgba(0,0,0,0.15)'
                }}
              >
                {availableStages.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
                <option value="Other">Custom Label...</option>
              </select>

              {formStage === 'Other' && (
                <input
                  type="text"
                  placeholder="e.g. Underglaze application"
                  value={customStage}
                  onChange={(e) => setCustomStage(e.target.value)}
                  style={{
                    marginBottom: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.85)',
                    color: '#2c2826',
                    border: '1px solid rgba(0,0,0,0.15)'
                  }}
                />
              )}

              <label style={{ color: '#3e2723', marginBottom: '0.3rem', fontSize: '0.75rem' }}>
                Note Details:
              </label>
              <textarea
                rows={5}
                placeholder="Record thickness, rim compression, wall pull details, glaze recipes, kiln results..."
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: '#2c2826',
                  border: '1px solid rgba(0,0,0,0.15)',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  lineHeight: '1.4'
                }}
                autoFocus
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                  disabled={!formText.trim()}
                >
                  <Plus size={14} /> Attach Sticky Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Expanded Image Viewer Modal */}
      {lightboxState.isOpen && (
        <ImageLightboxModal
          photos={lightboxState.photos}
          initialIndex={lightboxState.index}
          onClose={() => setLightboxState({ isOpen: false, photos: [], index: 0 })}
          onDeletePhoto={(photo) => handleDeletePhoto(photo.id)}
          availableStages={settings?.potteryStages || ['Wet Clay', 'Trimmed', 'Glaze Application', 'Fired']}
          onUpdatePhotoStage={(photo, newStage) => handleUpdatePhotoStage(photo.id, newStage)}
        />
      )}
    </div>
  );
}
