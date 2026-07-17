import React, { useState, useRef } from 'react';
import { updateThrowLog, uploadThrowPhoto, deleteThrowLog } from '../db';
import { Calendar, Trash2, Tag, Camera, Plus, Filter, Search, Image as ImageIcon, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function History({ throws, settings, user }) {
  const [selectedWeight, setSelectedWeight] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Gallery upload states
  const [targetThrowId, setTargetThrowId] = useState(null);
  const [stageLabel, setStageLabel] = useState('Leather Hard');
  const [customLabel, setCustomLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

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

  const handleAddPhotoClick = (throwId) => {
    setTargetThrowId(throwId);
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
      const photoObj = await uploadThrowPhoto(user.uid, targetThrowId, compressed, finalLabel);

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
    if (window.confirm("Are you sure you want to delete this cylinder log? This cannot be undone.")) {
      try {
        await deleteThrowLog(throwId);
      } catch (err) {
        console.error(err);
        alert("Failed to delete log.");
      }
    }
  };

  // Filter logic
  const filteredThrows = throws.filter(t => {
    const matchesWeight = selectedWeight === 'all' || t.weightClass === selectedWeight;
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
    const matchesSearch = searchQuery === '' || 
      (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.weightClass && t.weightClass.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.status && t.status.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesWeight && matchesStatus && matchesSearch;
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
          Swipe or browse your past cylinders. Update them with bisqued or glazed photos as they progress.
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
          <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No cylinders matched your filters.</p>
          <p style={{ fontSize: '0.9rem' }}>Go log a throw or adjust your search filters!</p>
        </div>
      ) : (
        <div>
          {/* Mobile Swipe Container (CSS Scroll Snap) */}
          <div className="swipe-container">
            {filteredThrows.map((item) => {
              const category = settings.weightCategories.find(c => c.id === item.weightClass) || { name: item.weightClass };
              
              let statusColor = 'var(--text-secondary)';
              if (item.status === 'Successful') statusColor = 'var(--success)';
              if (item.status === 'Failed' || item.status === 'Collapsed' || item.status === 'Discarded') statusColor = 'var(--collapse)';
              if (item.status === 'Flawed' || item.status === 'Trimmed') statusColor = 'var(--ochre)';

              return (
                <div key={item.id} className="swipe-card glass flex-col" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '480px' }}>
                  <div>
                    {/* Top Row: Category and Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
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
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={12} />
                        {new Date(item.dateThrown + 'T00:00:00').toLocaleDateString(undefined, { dateStyle: 'short' })}
                      </span>
                    </div>

                    {/* Photos Gallery */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      {item.photos && item.photos.length > 0 ? (
                        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
                          {item.photos.map((photo, pIdx) => (
                            <div key={photo.id || pIdx} style={{ position: 'relative', flex: '0 0 120px', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                              <img src={photo.url} alt={`Stage ${photo.stage}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <span style={{
                                position: 'absolute',
                                bottom: '4px', left: '4px',
                                background: 'rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(2px)',
                                color: 'white',
                                fontSize: '0.65rem',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                fontWeight: 600
                              }}>
                                {photo.stage}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{
                          height: '120px',
                          borderRadius: '12px',
                          background: 'var(--bg-secondary)',
                          border: '1px dashed var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-secondary)',
                          fontSize: '0.85rem'
                        }}>
                          No photo uploaded
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
                        Add Firing/Glaze Stage:
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          value={targetThrowId === item.id ? stageLabel : 'Leather Hard'}
                          onChange={(e) => {
                            setTargetThrowId(item.id);
                            setStageLabel(e.target.value);
                          }}
                          style={{ padding: '0.35rem', fontSize: '0.8rem', borderRadius: '8px', flex: 1 }}
                        >
                          <option value="Wet Clay">Wet Clay</option>
                          <option value="Leather Hard">Leather Hard</option>
                          <option value="Bone Dry">Bone Dry</option>
                          <option value="Bisqueware">Bisqueware</option>
                          <option value="Glazed">Glazed (Unfired)</option>
                          <option value="Finished">Finished Glaze</option>
                          <option value="Other">Custom Label...</option>
                        </select>
                        
                        <button
                          type="button"
                          onClick={() => handleAddPhotoClick(item.id)}
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

                    {/* Notes */}
                    <p style={{
                      fontSize: '0.9rem',
                      lineHeight: '1.4',
                      color: 'var(--text-secondary)',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      borderLeft: '3px solid var(--terracotta)',
                      maxHeight: '100px',
                      overflowY: 'auto'
                    }}>
                      {item.notes || <em>No notes recorded.</em>}
                    </p>
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
    </div>
  );
}
