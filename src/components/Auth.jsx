import React, { useState, useEffect } from 'react';
import { getProfiles, createProfile, deleteProfile, signInProfile } from '../db';
import { Flame, Plus, Trash2, ArrowLeft, Brush } from 'lucide-react';

const AVATARS = ["🍯", "🏺", "🍵", "🧱", "🎨", "⚱️", "🌻", "🌊"];

export default function Auth() {
  const [profiles, setProfiles] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [studio, setStudio] = useState('');
  const [avatar, setAvatar] = useState('🍯');
  const [error, setError] = useState('');

  useEffect(() => {
    getProfiles()
      .then(setProfiles)
      .catch(err => {
        console.error("Failed to load profiles:", err);
        setError("Could not connect to the server.");
      });
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a name for the potter.');
      return;
    }

    try {
      const newProfile = await createProfile(trimmedName, studio.trim(), avatar);
      // Automatically log in to the newly created profile
      signInProfile(newProfile);
    } catch (err) {
      console.error(err);
      setError('Failed to create profile.');
    }
  };

  const handleDelete = async (e, profileId, profileName) => {
    e.stopPropagation(); // prevent signing in when clicking delete
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the profile "${profileName}"? This will permanently wipe all logs and settings for this profile from the server.`
    );
    if (confirmDelete) {
      try {
        await deleteProfile(profileId);
        const list = await getProfiles();
        setProfiles(list);
      } catch (err) {
        console.error(err);
        setError('Failed to delete profile.');
      }
    }
  };

  const handleSelect = (profile) => {
    signInProfile(profile);
  };

  // Show profile creation screen if there are no profiles yet or the user clicked "Add Potter"
  if (profiles.length === 0 || isCreating) {
    return (
      <div className="auth-screen animate-fade-in" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '1rem'
      }}>
        <div className="glass animate-pop-in" style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem',
          borderRadius: '24px',
          textAlign: 'center'
        }}>
          {profiles.length > 0 && (
            <button 
              onClick={() => setIsCreating(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                padding: 0
              }}
            >
              <ArrowLeft size={16} /> Back to profiles
            </button>
          )}

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--terracotta-light)',
            color: 'var(--terracotta)',
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            marginBottom: '1.25rem'
          }}>
            <Flame size={32} strokeWidth={2.5} />
          </div>

          <h2 className="serif-title" style={{ fontSize: '1.8rem', marginBottom: '0.4rem', fontWeight: 700 }}>
            Create Potter Profile
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Set up a local profile on this browser to start logging your clay cylinders.
          </p>

          {error && (
            <div style={{
              background: 'rgba(184, 76, 54, 0.1)',
              border: '1px dashed var(--collapse)',
              color: 'var(--collapse)',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              fontSize: '0.9rem',
              marginBottom: '1.25rem',
              textAlign: 'left'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'left' }}>
            {/* Avatar Selector */}
            <div>
              <label>Select Avatar Stamp</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.5rem',
                marginTop: '0.4rem',
                marginBottom: '0.5rem'
              }}>
                {AVATARS.map(emoji => {
                  const active = avatar === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      style={{
                        fontSize: '1.6rem',
                        padding: '0.5rem',
                        background: active ? 'var(--terracotta-light)' : 'var(--bg-secondary)',
                        border: '1px solid',
                        borderColor: active ? 'var(--terracotta)' : 'var(--border-color)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                placeholder="Or type/paste any emoji..."
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', borderRadius: '12px' }}
                title="Type or paste any custom emoji from your keyboard"
              />
            </div>

            <div>
              <label htmlFor="potterName">Potter Name</label>
              <input
                id="potterName"
                type="text"
                required
                placeholder="e.g. Charlie"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="studioName">Studio Name (Optional)</label>
              <input
                id="studioName"
                type="text"
                placeholder="e.g. Clayworks Studio"
                value={studio}
                onChange={(e) => setStudio(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem' }}>
              Create & Begin Diary
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show profile list/selection screen if profile records exist
  return (
    <div className="auth-screen animate-fade-in" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '1rem'
    }}>
      <div className="glass animate-pop-in" style={{
        width: '100%',
        maxWidth: '540px',
        padding: '2.5rem',
        borderRadius: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--terracotta-light)',
          color: 'var(--terracotta)',
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          marginBottom: '1.25rem'
        }}>
          <Flame size={32} strokeWidth={2.5} />
        </div>

        <h1 className="serif-title" style={{ fontSize: '2.4rem', marginBottom: '0.4rem', fontWeight: 700 }}>
          Centrd
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
          Select a profile or create a new one to open your throwing log.
        </p>

        {/* Profiles Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.2rem',
          marginBottom: '2rem'
        }}>
          {profiles.map(p => (
            <div
              key={p.id}
              onClick={() => handleSelect(p)}
              className="glass-interactive"
              style={{
                padding: '1.5rem',
                borderRadius: '20px',
                cursor: 'pointer',
                textAlign: 'center',
                border: '1px solid var(--border-color)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'var(--bg-secondary)'
              }}
            >
              {/* Delete profile button */}
              <button
                type="button"
                onClick={(e) => handleDelete(e, p.id, p.name)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => e.target.style.color = 'var(--collapse)'}
                onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
                title="Delete Profile"
              >
                <Trash2 size={15} />
              </button>

              <div style={{ fontSize: '3rem', margin: '0.25rem 0' }}>
                {p.avatar || '🍯'}
              </div>

              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  {p.name}
                </h3>
                {p.studio && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.15rem' }}>
                    {p.studio}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Add Profile Card */}
          <div
            onClick={() => {
              setName('');
              setStudio('');
              setAvatar('🍯');
              setError('');
              setIsCreating(true);
            }}
            className="glass-interactive"
            style={{
              padding: '1.5rem',
              borderRadius: '20px',
              cursor: 'pointer',
              textAlign: 'center',
              border: '2px dashed var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '146px',
              background: 'rgba(0, 0, 0, 0.02)',
              gap: '0.5rem',
              color: 'var(--text-secondary)'
            }}
          >
            <Plus size={24} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Add Potter
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
