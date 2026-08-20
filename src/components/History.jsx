import React, { useState, useRef } from 'react';
import { updateThrowLog, uploadThrowPhoto, deleteThrowLog } from '../db';
import { Calendar, Trash2, Tag, Camera, Filter, Search, Image as ImageIcon, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import PostItNotesStack from './PostItNotesStack';
import ImageLightboxModal from './ImageLightboxModal';
import { getNotesArray, formatNotesSummary, isSameStage, getAvailableStages } from '../utils/noteUtils';
import { isThrowInChallenge, getThrowChallenges } from '../utils/challengeUtils';

export default function History({ throws, settings, user }) {
  const [selectedWeight, setSelectedWeight] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [challengeFilter, setChallengeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cardStages, setCardStages] = useState({}); // { [throwId]: 'all' | 'Leather Hard' | ... }
  
  // Image Lightbox Modal state
  const [lightboxState, setLightboxState] = useState({ isOpen: false, photos: [], index: 0, throwId: null, allPhotos: [] });

  const firstStage = settings?.potteryStages?.[0] || 'Wet Clay';

  const handleDeletePhoto = async (throwId, photoId, currentPhotos, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this photo?")) return;
    try {
      const updatedPhotos = (currentPhotos || []).filter(p => p.id !== photoId);
      await updateThrowLog(throwId, { photos: updatedPhotos });
      setLightboxState(prev => {
        if (!prev.isOpen) return prev;
        const newPhotos = (prev.photos || []).filter(p => p.id !== photoId);
        if (newPhotos.length === 0) return { isOpen: false, photos: [], index: 0, throwId: null, allPhotos: [] };
        const newIndex = Math.min(prev.index, newPhotos.length - 1);
        return { ...prev, photos: newPhotos, index: newIndex };
      });
    } catch (err) {
      console.error(err);
      alert("Failed to delete photo: " + err.message);
    }
  };

  const handleUpdatePhotoStage = async (throwId, photoId, newStage, currentPhotos, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      const updatedPhotos = (currentPhotos || []).map(p => {
        if (p.id === photoId) {
          return { ...p, stage: newStage };
        }
        return p;
      });
      await updateThrowLog(throwId, { photos: updatedPhotos });
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

  // Gallery upload states
  const [targetThrowId, setTargetThrowId] = useState(null);
  const [stageLabel, setStageLabel] = useState(firstStage);
  const [customLabel, setCustomLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const handleUpdateNotes = async (throwId, newNotesArray) => {
    try {
      const summaryText = formatNotesSummary(newNotesArray);
      await updateThrowLog(throwId, {
        notesArray: newNotesArray,
        notes: summaryText
      });
    } catch (err) {
      console.error("Failed to update notes:", err);
      alert("Failed to save note changes.");
    }
  };

  // Compress image helper using HTML5 Canvas
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_stage.jpg", {
                type: "image/jpeg",
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error("Canvas blob creation failed"));
            }
          }, "image/jpeg", 0.75);
        };
        img.onerror = () => reject(new Error("Image loading error"));
      };
      reader.onerror = () => reject(new Error("File reading error"));
    });
  };

  const handleAddPhotoClick = (throwId, defaultStage = firstStage) => {
    setTargetThrowId(throwId);
    if (targetThrowId !== throwId || !stageLabel) {
      setStageLabel(defaultStage);
    }
    setUploadError('');
    // Wait a frame and click the hidden file input
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 50);
  };

  const handleStagePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !targetThrowId) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.');
      return;
    }

    setLoading(true);
    setUploadError('');

    try {
      // Compress
      const compressed = await compressImage(file);
      
      // Upload
      const finalLabel = stageLabel === 'Other' ? (customLabel.trim() || 'Fired') : stageLabel;
      const photoObj = await uploadThrowPhoto(user.id, targetThrowId, compressed, finalLabel);

      // Find the existing log
      const targetThrow = throws.find(t => t.id === targetThrowId);
      const existingPhotos = targetThrow.photos || [];

      // Append new photo object
      await updateThrowLog(targetThrowId, {
        photos: [...existingPhotos, photoObj]
      });

      // Celebration
      confetti({
        particleCount: 50,
        spread: 30,
        colors: ['#70937d', '#d0944b']
      });

      // Reset
      setTargetThrowId(null);
      setCustomLabel('');
    } catch (err) {
      console.error(err);
      setUploadError('Failed to upload. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteThrow = async (throwId) => {
    if (window.confirm("Are you sure you want to delete this pottery log? This cannot be undone.")) {
      try {
        await deleteThrowLog(throwId);
      } catch (err) {
        console.error(err);
        alert("Failed to delete log.");
      }
    }
  };

  // Manage Challenge Tags Modal state
  const [taggingState, setTaggingState] = useState({
    isOpen: false,
    item: null,
    selectedTags: [],
    customTagInput: ''
  });

  const handleOpenTagModal = (item) => {
    const existing = getThrowChallenges(item);
    setTaggingState({
      isOpen: true,
      item,
      selectedTags: existing,
      customTagInput: ''
    });
  };

  const handleToggleTagInModal = (tagName) => {
    setTaggingState(prev => {
      const exists = prev.selectedTags.includes(tagName);
      const newTags = exists
        ? prev.selectedTags.filter(t => t !== tagName)
        : [...prev.selectedTags, tagName];
      return { ...prev, selectedTags: newTags };
    });
  };

  const handleAddCustomTagInModal = () => {
    const trimmed = taggingState.customTagInput.trim();
    if (!trimmed) return;
    if (!taggingState.selectedTags.includes(trimmed)) {
      setTaggingState(prev => ({
        ...prev,
        selectedTags: [...prev.selectedTags, trimmed],
        customTagInput: ''
      }));
    } else {
      setTaggingState(prev => ({ ...prev, customTagInput: '' }));
    }
  };

  const handleSaveTagsInModal = async () => {
    if (!taggingState.item) return;
    try {
      await updateThrowLog(taggingState.item.id, {
        challengeName: taggingState.selectedTags[0] || '',
        challengeNames: taggingState.selectedTags
      });
      setTaggingState({ isOpen: false, item: null, selectedTags: [], customTagInput: '' });
    } catch (err) {
      console.error(err);
      alert("Failed to update challenge tags.");
    }
  };

  // Unique challenge names present across all logs, settings, and active tag modal selection
  const allAvailableChallengeNames = Array.from(
    new Set([
      settings?.challengeName || '200 Piece Challenge',
      ...throws.flatMap(t => getThrowChallenges(t)),
      ...taggingState.selectedTags
    ].filter(Boolean))
  );

  const uniqueChallengeNames = Array.from(
    new Set(throws.flatMap(t => getThrowChallenges(t)).filter(Boolean))
  );

  // Filter logic
  const filteredThrows = throws.filter(t => {
    let matchesChallenge = true;
    const itemChallenges = getThrowChallenges(t);
    if (challengeFilter === 'current') {
      matchesChallenge = isThrowInChallenge(t, settings?.challengeName);
    } else if (challengeFilter !== 'all') {
      matchesChallenge = itemChallenges.includes(challengeFilter);
    }

    const matchesWeight = selectedWeight === 'all' || t.weightClass === selectedWeight;
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
    const query = searchQuery.toLowerCase();
    
    const notesArr = getNotesArray(t);
    const matchesNotes = query === '' ||
      (t.notes && t.notes.toLowerCase().includes(query)) ||
      notesArr.some(n => (n.text && n.text.toLowerCase().includes(query)) || (n.stage && n.stage.toLowerCase().includes(query)));

    const matchesSearch = query === '' ||
      matchesNotes ||
      (t.challengeName && t.challengeName.toLowerCase().includes(query)) ||
      (t.weightClass && t.weightClass.toLowerCase().includes(query)) ||
      (t.status && t.status.toLowerCase().includes(query));
    
    return matchesChallenge && matchesWeight && matchesStatus && matchesSearch;
  });

  return (
    <div className="history-view animate-fade-in">
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--terracotta)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Challenge Records
        </span>
        <h1 className="serif-title" style={{ fontSize: '2.2rem', fontWeight: 700, marginTop: '0.2rem' }}>
          Throwing Logs
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Swipe or browse your past pottery pieces. Update them with bisqued or glazed photos as they progress.
        </p>
      </div>

      {/* Hidden File Input for stage photo uploading */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleStagePhotoUpload}
        style={{ display: 'none' }}
      />

      {/* Filter and Search Bar */}
      <div className="glass" style={{
        padding: '1.25rem',
        borderRadius: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        {/* Search */}
        <div style={{ flex: '1 1 200px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search notes or weight..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem', paddingRight: '1rem', fontSize: '0.9rem', borderRadius: '10px' }}
          />
        </div>

        {/* Filter Tags */}
        {uniqueChallengeNames.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
              value={challengeFilter}
              onChange={(e) => setChallengeFilter(e.target.value)}
              style={{ padding: '0.5rem 2rem 0.5rem 0.75rem', fontSize: '0.9rem', width: 'auto', borderRadius: '10px' }}
            >
              <option value="all">All Tags ({throws.length})</option>
              <option value="current">Active Challenge Tag ({settings?.challengeName || 'Active'})</option>
              {uniqueChallengeNames.map(cName => (
                <option key={cName} value={cName}>Tag: {cName}</option>
              ))}
            </select>
          </div>
        )}

        {/* Filter Weight */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
          <select
            value={selectedWeight}
            onChange={(e) => setSelectedWeight(e.target.value)}
            style={{ padding: '0.5rem 2rem 0.5rem 0.75rem', fontSize: '0.9rem', width: 'auto', borderRadius: '10px' }}
          >
            <option value="all">All Weights</option>
            {settings.weightCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Filter Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Tag size={14} style={{ color: 'var(--text-secondary)' }} />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '0.5rem 2rem 0.5rem 0.75rem', fontSize: '0.9rem', width: 'auto', borderRadius: '10px' }}
          >
            <option value="all">All Statuses</option>
            <option value="Successful">Successful</option>
            <option value="Failed">Failed</option>
            <option value="Flawed">Flawed</option>
          </select>
        </div>
      </div>

      {uploadError && (
        <div style={{
          background: 'rgba(184, 76, 54, 0.1)',
          border: '1px dashed var(--collapse)',
          color: 'var(--collapse)',
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} />
          {uploadError}
        </div>
      )}

      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '1rem',
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          fontWeight: 600,
          color: 'var(--terracotta)'
        }}>
          Processing and uploading stage photo...
        </div>
      )}

      {/* Swipe View for Mobile / Desktop Grid */}
      {filteredThrows.length === 0 ? (
        <div className="glass" style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '24px', color: 'var(--text-secondary)' }}>
          <ImageIcon size={48} style={{ color: 'var(--border-color)', marginBottom: '1rem' }} />
          <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No pieces matched your filters.</p>
          <p style={{ fontSize: '0.9rem' }}>Go log a throw or adjust your search filters!</p>
        </div>
      ) : (
        <div>
          {/* Mobile Swipe Container (CSS Scroll Snap) */}
          <div className="swipe-container">
            {filteredThrows.map((item) => {
              const category = settings.weightCategories.find(c => c.id === item.weightClass) || { name: item.weightClass };
              const activeStage = cardStages[item.id] || 'all';
              const availableStages = getAvailableStages(item, throws, settings);

              let statusColor = 'var(--text-secondary)';
              if (item.status === 'Successful') statusColor = 'var(--success)';
              if (item.status === 'Failed' || item.status === 'Collapsed' || item.status === 'Discarded') statusColor = 'var(--collapse)';
              if (item.status === 'Flawed' || item.status === 'Trimmed') statusColor = 'var(--ochre)';

              // Filter photos according to selected stage pill on card
              const displayPhotos = activeStage === 'all'
                ? (item.photos || [])
                : (item.photos || []).filter(p => isSameStage(p.stage, activeStage));

              return (
                <div key={item.id} className="swipe-card glass flex-col" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '520px' }}>
                  <div>
                    {/* Top Row: Category and Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <h3 className="serif-title" style={{ fontSize: '1.3rem', fontWeight: 700 }}>{category.name}</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                          Weight: {item.weightValue !== undefined ? item.weightValue : category.weight} {settings.globalUnit || 'lb'}
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: statusColor,
                          border: `1px solid ${statusColor}`,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '100px',
                          display: 'inline-block',
                          marginTop: '0.25rem'
                        }}>
                          {item.status || 'Successful'}
                        </span>
                        {getThrowChallenges(item).map((cTag, cIdx) => (
                          <span
                            key={cIdx}
                            onClick={() => handleOpenTagModal(item)}
                            title="Click to manage challenge tags"
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: 'var(--terracotta)',
                              background: 'var(--terracotta-light)',
                              padding: '0.15rem 0.55rem',
                              borderRadius: '100px',
                              display: 'inline-block',
                              marginTop: '0.25rem',
                              marginLeft: '0.35rem',
                              cursor: 'pointer'
                            }}
                          >
                            🏷️ {cTag}
                          </span>
                        ))}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={12} />
                        {new Date(item.dateThrown + 'T00:00:00').toLocaleDateString(undefined, { dateStyle: 'short' })}
                      </span>
                    </div>

                    {/* Stage Filter Pills Bar for Card */}
                    <div style={{
                      display: 'flex',
                      gap: '0.3rem',
                      overflowX: 'auto',
                      marginBottom: '1rem',
                      paddingBottom: '0.25rem',
                      scrollbarWidth: 'none'
                    }}>
                      {['all', ...availableStages].map(st => {
                        const isSelected = activeStage === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              setCardStages(prev => ({ ...prev, [item.id]: st }));
                              if (st !== 'all') {
                                setTargetThrowId(item.id);
                                setStageLabel(st);
                              }
                            }}
                            style={{
                              padding: '0.2rem 0.55rem',
                              fontSize: '0.7rem',
                              borderRadius: '100px',
                              border: isSelected ? '1px solid var(--terracotta)' : '1px solid var(--border-color)',
                              background: isSelected ? 'var(--terracotta)' : 'var(--bg-secondary)',
                              color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                              fontWeight: isSelected ? 700 : 500,
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {st === 'all' ? 'All Stages' : st}
                          </button>
                        );
                      })}
                    </div>

                    {/* Photos Gallery */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      {displayPhotos && displayPhotos.length > 0 ? (
                        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
                          {displayPhotos.map((photo, pIdx) => (
                            <div
                              key={photo.id || pIdx}
                              onClick={() => setLightboxState({ isOpen: true, photos: displayPhotos, index: pIdx, throwId: item.id, allPhotos: item.photos })}
                              style={{
                                position: 'relative',
                                flex: '0 0 120px',
                                height: '120px',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer'
                              }}
                              title="Click to view expanded image"
                            >
                              <img src={photo.url} alt={`Stage ${photo.stage}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              
                              <span style={{
                                position: 'absolute',
                                bottom: '4px', left: '4px',
                                background: 'rgba(0, 0, 0, 0.65)',
                                backdropFilter: 'blur(3px)',
                                color: '#ffffff',
                                fontSize: '0.65rem',
                                padding: '0.12rem 0.4rem',
                                borderRadius: '4px',
                                fontWeight: 600
                              }}>
                                {photo.stage}
                              </span>

                              <button
                                type="button"
                                onClick={(e) => handleDeletePhoto(item.id, photo.id, item.photos, e)}
                                style={{
                                  position: 'absolute',
                                  top: '4px', right: '4px',
                                  background: 'rgba(184, 76, 54, 0.85)',
                                  backdropFilter: 'blur(2px)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '24px', height: '24px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer',
                                  opacity: 0.85,
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.85'}
                                title="Delete photo"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{
                          height: '100px',
                          borderRadius: '12px',
                          background: 'var(--bg-secondary)',
                          border: '1px dashed var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-secondary)',
                          fontSize: '0.82rem'
                        }}>
                          {activeStage === 'all' ? 'No photos uploaded yet' : `No photos for ${activeStage}`}
                        </div>
                      )}
                    </div>

                    {/* Stage Photo Uploader Panel inside Card */}
                    <div style={{
                      background: 'var(--bg-secondary)',
                      borderRadius: '12px',
                      padding: '0.75rem',
                      marginBottom: '1rem',
                      border: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                        Add Stage Photo:
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          value={targetThrowId === item.id ? stageLabel : (activeStage !== 'all' ? activeStage : firstStage)}
                          onChange={(e) => {
                            setTargetThrowId(item.id);
                            setStageLabel(e.target.value);
                          }}
                          style={{ padding: '0.35rem', fontSize: '0.8rem', borderRadius: '8px', flex: 1 }}
                        >
                          {availableStages.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                          <option value="Other">Custom Label...</option>
                        </select>
                        
                        <button
                          type="button"
                          onClick={() => {
                            const currentDefault = (targetThrowId === item.id && stageLabel) ? stageLabel : (activeStage !== 'all' ? activeStage : firstStage);
                            handleAddPhotoClick(item.id, currentDefault);
                          }}
                          className="btn btn-celadon"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px' }}
                        >
                          <Camera size={14} />
                          Snap
                        </button>
                      </div>
                      {targetThrowId === item.id && stageLabel === 'Other' && (
                        <input
                          type="text"
                          placeholder="e.g. Underglaze"
                          value={customLabel}
                          onChange={(e) => setCustomLabel(e.target.value)}
                          style={{ marginTop: '0.5rem', padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '8px' }}
                        />
                      )}
                    </div>

                    {/* Post-it Notes Stack */}
                    <PostItNotesStack throwItem={item} activeStage={activeStage} settings={settings} onUpdateNotes={handleUpdateNotes} />
                  </div>

                  {/* Delete Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    <button
                      onClick={() => handleDeleteThrow(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.color = 'var(--collapse)'}
                      onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Manage Challenge Tags Modal */}
      {taggingState.isOpen && taggingState.item && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem'
        }} onClick={() => setTaggingState({ isOpen: false, item: null, selectedTags: [], customTagInput: '' })}>
          <div className="glass animate-scale-up" style={{
            background: 'var(--bg-primary)',
            borderRadius: '24px',
            maxWidth: '460px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color)'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 className="serif-title" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Tag size={20} style={{ color: 'var(--terracotta)' }} />
              Manage Entry Tags
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Select tags for this entry (challenges, clay types, or studio notes):
            </p>

            {/* List of Available Existing Challenges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem', maxHeight: '200px', overflowY: 'auto' }}>
              {allAvailableChallengeNames.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  No existing tags found. Create one below!
                </div>
              ) : (
                allAvailableChallengeNames.map((cName) => {
                  const isChecked = taggingState.selectedTags.includes(cName);
                  return (
                    <label
                      key={cName}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'space-between',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '12px',
                        background: isChecked ? 'var(--terracotta-light)' : 'var(--bg-secondary)',
                        border: isChecked ? '1px solid var(--terracotta)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: isChecked ? 'var(--terracotta)' : 'var(--text-primary)' }}>
                        🏷️ {cName}
                      </span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleTagInModal(cName)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--terracotta)', cursor: 'pointer' }}
                      />
                    </label>
                  );
                })
              )}
            </div>

            {/* Inline Input to Add Custom Tag */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                + Add Custom Tag
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="e.g. Winter Mug Sprint"
                  value={taggingState.customTagInput}
                  onChange={(e) => setTaggingState(prev => ({ ...prev, customTagInput: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomTagInModal(); } }}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomTagInModal}
                  disabled={!taggingState.customTagInput.trim()}
                  className="btn btn-secondary"
                  style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem' }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTaggingState({ isOpen: false, item: null, selectedTags: [], customTagInput: '' })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveTagsInModal}
              >
                Save Tags
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Expanded Image Viewer Modal */}
      {lightboxState.isOpen && (
        <ImageLightboxModal
          photos={lightboxState.photos}
          initialIndex={lightboxState.index}
          onClose={() => setLightboxState({ isOpen: false, photos: [], index: 0, throwId: null, allPhotos: [] })}
          onDeletePhoto={(photo) => {
            if (lightboxState.throwId) {
              handleDeletePhoto(lightboxState.throwId, photo.id, lightboxState.allPhotos || lightboxState.photos);
            }
          }}
          availableStages={settings?.potteryStages || ['Wet Clay', 'Trimmed', 'Glaze Application', 'Fired']}
          onUpdatePhotoStage={(photo, newStage) => {
            if (lightboxState.throwId) {
              handleUpdatePhotoStage(lightboxState.throwId, photo.id, newStage, lightboxState.allPhotos || lightboxState.photos);
            }
          }}
        />
      )}
    </div>
  );
}
