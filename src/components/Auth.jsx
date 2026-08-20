import React, { useState, useEffect } from 'react';
import { getProfiles, createProfile, deleteProfile, signInProfile, wipeApplicationData } from '../db';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import AppLogo from './AppLogo';

const AVATARS = ["🍯", "🏺", "🍵", "🧱", "🎨", "⚱️", "🌻", "🌊", "🌿", "☕", "🕯️", "🪵"];

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
      signInProfile(newProfile);
    } catch (err) {
      console.error(err);
      setError('Failed to create profile.');
    }
  };

  const handleDelete = async (e, profileId, profileName) => {
    e.stopPropagation();
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
            Set up a local profile on this browser to start logging your pottery forms.
          </p>

          {error && (
            <div style={{
              background: 'rgba(184, 76, 54, 0.1)',
              color: 'var(--collapse)',
              padding: '0.6rem 1rem',
              borderRadius: '12px',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', textAlign: 'left', marginBottom: '0.4rem' }}>
                Potter Avatar
              </label>
              
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '3.5rem',
                  height: '3.5rem',
                  borderRadius: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  background: 'var(--bg-secondary)',
                  border: '2px solid var(--terracotta)',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
                  flexShrink: 0
                }}>
                  {avatar}
                </div>

                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
                  {AVATARS.map((emoji) => {
                    const active = avatar === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setAvatar(emoji)}
                        style={{
                          fontSize: '1.2rem',
                          padding: '0.3rem 0.5rem',
                          borderRadius: '12px',
                          border: active ? '2px solid var(--terracotta)' : '1px solid var(--border-color)',
                          background: active ? 'var(--terracotta-light)' : 'var(--bg-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              <input
                type="text"
                placeholder="Or type/paste any custom emoji..."
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                title="Type or paste any custom emoji from your keyboard"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', textAlign: 'left', marginBottom: '0.4rem' }}>
                Potter Name
              </label>
              <input 
                type="text" 
                placeholder="e.g. Clara"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', textAlign: 'left', marginBottom: '0.4rem' }}>
                Studio Name (Optional)
              </label>
              <input 
                type="text" 
                placeholder="e.g. Muddy Paws Ceramics"
                value={studio}
                onChange={(e) => setStudio(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%' }}>
              Create & Get Started
            </button>
          </form>
        </div>
      </div>
    );
  }

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
        maxWidth: '560px',
        padding: '2.5rem',
        borderRadius: '24px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <AppLogo size={56} />
          </div>

          <h1 className="serif-title" style={{ fontSize: '2.2rem', marginBottom: '0.4rem', fontWeight: 700 }}>
            Who is throwing today?
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Select your potter profile to access your logs and challenge goals.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(184, 76, 54, 0.1)',
            color: 'var(--collapse)',
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.2rem',
          marginBottom: '1rem'
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

        <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <button
            type="button"
            onClick={async () => {
              if (window.confirm("Are you sure you want to WIPE all profiles, throwing logs, settings, and photos? This action is permanent and cannot be undone.")) {
                try {
                  await wipeApplicationData();
                  window.location.reload();
                } catch (err) {
                  console.error(err);
                  alert("Failed to reset application data: " + (err.message || 'Unknown error'));
                }
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              opacity: 0.7
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--collapse)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
          >
            Reset Server & Wipe Application Data
          </button>
        </div>

      </div>
    </div>
  );
}
