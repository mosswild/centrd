import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Camera, Trash2 } from 'lucide-react';

export default function ImageLightboxModal({ photos = [], initialIndex = 0, onClose, onDeletePhoto, availableStages = [], onUpdatePhotoStage }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const handlePrev = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  // Handle keyboard navigation and ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, photos.length, onClose]);

  if (!photos || photos.length === 0) return null;

  const rawPhoto = photos[currentIndex] || photos[0];
  if (!rawPhoto) return null;

  const currentUrl = typeof rawPhoto === 'string' ? rawPhoto : (rawPhoto.url || rawPhoto.photoUrl || rawPhoto.src || '');
  const currentStage = typeof rawPhoto === 'string' ? 'Photo' : (rawPhoto.stage || 'Photo');

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(12px)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      {/* Top Controls Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#ffffff',
          zIndex: 10001
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {availableStages && availableStages.length > 0 && onUpdatePhotoStage ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>Stage:</span>
              <select
                value={currentStage}
                onChange={(e) => onUpdatePhotoStage(rawPhoto, e.target.value, currentIndex)}
                style={{
                  background: 'var(--terracotta)',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.65rem',
                  borderRadius: '100px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  cursor: 'pointer',
                  outline: 'none',
                  letterSpacing: '0.03em'
                }}
                title="Click to change photo stage"
              >
                {availableStages.map(st => (
                  <option key={st} value={st} style={{ background: '#2c2826', color: '#ffffff' }}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span
              style={{
                background: 'var(--terracotta)',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.65rem',
                borderRadius: '100px',
                letterSpacing: '0.03em'
              }}
            >
              {currentStage}
            </span>
          )}

          <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.75)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Camera size={14} />
            Image {currentIndex + 1} of {photos.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {onDeletePhoto && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeletePhoto(rawPhoto, currentIndex);
              }}
              style={{
                background: 'rgba(184, 76, 54, 0.35)',
                border: '1px solid rgba(184, 76, 54, 0.6)',
                color: '#ff9e8b',
                borderRadius: '100px',
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(184, 76, 54, 0.6)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(184, 76, 54, 0.35)'}
              title="Delete Photo"
            >
              <Trash2 size={15} /> Delete Photo
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              padding: 0,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
            title="Close (Esc)"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Main Center Image Display with Navigation Arrows */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '1rem 0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Arrow */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            style={{
              position: 'absolute',
              left: '0.75rem',
              zIndex: 10002,
              background: 'rgba(0, 0, 0, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              padding: 0,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.95)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.75)'}
            title="Previous Image (Left Arrow)"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        {/* Expanded Image */}
        <img
          src={currentUrl}
          alt={`Stage ${currentStage}`}
          style={{
            maxWidth: '90vw',
            maxHeight: '75vh',
            objectFit: 'contain',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        />

        {/* Right Arrow */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            style={{
              position: 'absolute',
              right: '0.75rem',
              zIndex: 10002,
              background: 'rgba(0, 0, 0, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              padding: 0,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.95)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.75)'}
            title="Next Image (Right Arrow)"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Navigation Strip */}
      {photos.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            maxWidth: '90vw',
            padding: '0.5rem 0',
            zIndex: 10001
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((p, idx) => {
            const isSelected = idx === currentIndex;
            const thumbUrl = typeof p === 'string' ? p : (p.url || p.photoUrl || p.src || '');
            return (
              <img
                key={p.id || idx}
                src={thumbUrl}
                alt={`Thumbnail ${idx + 1}`}
                onClick={() => setCurrentIndex(idx)}
                style={{
                  width: '60px',
                  height: '60px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid var(--terracotta)' : '1px solid rgba(255, 255, 255, 0.3)',
                  opacity: isSelected ? 1 : 0.6,
                  transition: 'all 0.2s ease'
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
