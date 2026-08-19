import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Camera } from 'lucide-react';

export default function ImageLightboxModal({ photos = [], initialIndex = 0, onClose }) {
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

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(10px)',
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
            {currentPhoto.stage || 'Photo'}
          </span>

          <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.75)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Camera size={14} />
            Image {currentIndex + 1} of {photos.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            border: 'none',
            color: '#ffffff',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
          title="Close (Esc)"
        >
          <X size={22} />
        </button>
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
              left: '0.5rem',
              zIndex: 10002,
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'}
            title="Previous Image (Left Arrow)"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        {/* Expanded Image */}
        <img
          src={currentPhoto.url}
          alt={`Stage ${currentPhoto.stage}`}
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
              right: '0.5rem',
              zIndex: 10002,
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'}
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
            return (
              <img
                key={p.id || idx}
                src={p.url}
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
