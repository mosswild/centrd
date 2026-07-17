import React, { useState, useRef } from 'react';
import { addThrowLog, updateThrowLog, uploadThrowPhoto } from '../db';
import { Camera, Upload, AlertCircle, FileText, CheckCircle, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function LogThrow({ settings, user, onNavigateToHistory }) {
  const globalUnit = settings.globalUnit || 'lb';
  const [weightInput, setWeightInput] = useState('1.0');
  const [dateThrown, setDateThrown] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [status, setStatus] = useState('Successful');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
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
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: "image/jpeg",
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error("Canvas blob creation failed"));
            }
          }, "image/jpeg", 0.75); // 0.75 Quality
        };
        img.onerror = () => reject(new Error("Image loading error"));
      };
      reader.onerror = () => reject(new Error("File reading error"));
    });
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      // Create preview of raw image first
      setPhotoPreview(URL.createObjectURL(file));
      
      // Compress
      const compressed = await compressImage(file);
      setPhoto(compressed);
    } catch (err) {
      console.error(err);
      setError('Failed to process image. Try a different file.');
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    const parsedWeight = parseFloat(weightInput);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setError('Please enter a valid weight.');
      setLoading(false);
      return;
    }

    // Find the closest weight category target configured in settings
    let matchedClass = '1lb';
    if (settings.weightCategories && settings.weightCategories.length > 0) {
      let closestCat = settings.weightCategories[0];
      let minDiff = Math.abs(parseFloat(closestCat.weight) - parsedWeight);
      
      for (let i = 1; i < settings.weightCategories.length; i++) {
        const cat = settings.weightCategories[i];
        const diff = Math.abs(parseFloat(cat.weight) - parsedWeight);
        if (diff < minDiff) {
          minDiff = diff;
          closestCat = cat;
        }
      }
      matchedClass = closestCat.id;
    }

    try {
      const throwData = {
        dateThrown,
        weightClass: matchedClass,
        weightValue: parsedWeight,
        status,
        notes: notes.trim(),
        photos: []
      };

      // Add log
      const throwId = await addThrowLog(user.uid, throwData);

      // If photo was selected, upload it
      if (photo) {
        const photoObj = await uploadThrowPhoto(user.uid, throwId, photo, "Wet Clay");
        // Update throw record with the uploaded photo info
        await updateThrowLog(throwId, {
          photos: [photoObj]
        });
      }

      // Celebrations!
      confetti({
        particleCount: 120,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#c96f53', '#e9dfd6', '#70937d', '#d0944b']
      });

      // Clear Form
      setNotes('');
      setPhoto(null);
      setPhotoPreview(null);
      
      if (onNavigateToHistory) {
        onNavigateToHistory();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save cylinder log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="log-throw-view animate-fade-in" style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--terracotta)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Wheel Session
        </span>
        <h1 className="serif-title" style={{ fontSize: '2.2rem', fontWeight: 700, marginTop: '0.2rem' }}>
          Log Thrown Cylinder
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Record your throw metrics and take notes on the shape, walls, or collapse reasons.
        </p>
      </div>

      {error && (
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
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass" style={{ padding: '2rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Row 1: Weight & Date */}
        <div className="responsive-grid-2">
          <div>
            <label htmlFor="weightValue">Weight ({globalUnit})</label>
            <input
              id="weightValue"
              type="number"
              step="any"
              min="0.01"
              placeholder="e.g. 1.5"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="dateThrown">Date Thrown</label>
            <input
              id="dateThrown"
              type="date"
              value={dateThrown}
              onChange={(e) => setDateThrown(e.target.value)}
            />
          </div>
        </div>

        {/* Cylinder Status */}
        <div>
          <label>Cylinder Quality / Status</label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: '0.8rem',
            marginTop: '0.4rem'
          }}>
            {[
              { id: 'Successful', color: 'var(--success)', desc: 'Kept & shaped' },
              { id: 'Failed', color: 'var(--collapse)', desc: 'Collapsed / Failed' },
              { id: 'Flawed', color: 'var(--ochre)', desc: 'Slight errors / Uneven' }
            ].map(item => {
              const active = status === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStatus(item.id)}
                  style={{
                    background: active ? item.color : 'var(--bg-secondary)',
                    color: active ? '#fff' : 'var(--text-primary)',
                    border: '1px solid',
                    borderColor: active ? item.color : 'var(--border-color)',
                    padding: '0.75rem 0.5rem',
                    flexDirection: 'column',
                    borderRadius: '16px',
                    height: '70px',
                    lineHeight: '1.2'
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{item.id}</span>
                  <span style={{ fontSize: '0.7rem', opacity: active ? 0.9 : 0.6, fontWeight: 400 }}>{item.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Camera / Photo Upload */}
        <div>
          <label>Cylinder Image (e.g. Greenware stage)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />

          {!photoPreview ? (
            <div 
              onClick={triggerFileInput}
              className="glass-interactive"
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: '16px',
                padding: '2.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--bg-secondary)'
              }}
            >
              <div style={{ display: 'inline-flex', padding: '0.75rem', background: 'var(--terracotta-light)', color: 'var(--terracotta)', borderRadius: '50%', marginBottom: '0.75rem' }}>
                <Camera size={24} />
              </div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                Tap to Take Photo / Upload
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Supports camera capture and drag & drop
              </p>
            </div>
          ) : (
            <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', height: '220px' }}>
              <img 
                src={photoPreview} 
                alt="Upload Preview" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                top: 0, right: 0, bottom: 0, left: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                padding: '1rem'
              }}>
                <span style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                  Photo Ready (Compressed)
                </span>
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="btn"
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(4px)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.4)'
                  }}
                >
                  Change
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes">Throwing Notes & Improvement Points</label>
          <div style={{ position: 'relative' }}>
            <FileText size={18} style={{
              position: 'absolute',
              left: '14px',
              top: '16px',
              color: 'var(--text-secondary)'
            }} />
            <textarea
              id="notes"
              rows={4}
              placeholder="How did the centering go? Did the walls collapse during the third pull? Keep notes on shape, thickness, rim compression..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ paddingLeft: '2.8rem', paddingTop: '0.85rem' }}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ padding: '0.9rem', width: '100%', marginTop: '0.5rem' }}
        >
          {loading ? 'Working the Clay...' : 'Log Throw'}
        </button>
      </form>
    </div>
  );
}
