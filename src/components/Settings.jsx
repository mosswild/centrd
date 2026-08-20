import React, { useState } from 'react';
import { saveSettings, signOutUser, remapThrowStages, updateProfile, deleteProfile, renameChallengeInThrows } from '../db';
import { Settings as SettingsIcon, LogOut, Download, Upload, Plus, Trash2, Loader2, ArrowUp, ArrowDown, Edit2, Check, X, Target } from 'lucide-react';
import { importChallengeFromZip } from '../utils/importer';
import { getSavedChallenges, switchActiveChallengeInSettings, deleteChallengeFromSettings, renameChallengeInSettings } from '../utils/challengeUtils';

const AVATAR_OPTIONS = ["🍯", "🏺", "🍵", "🧱", "🎨", "⚱️", "🌻", "🌊", "🌿", "☕", "🕯️", "🪵"];

export default function Settings({ settings, throws = [], user, onSettingsUpdate }) {
  const savedChallenges = getSavedChallenges(settings);
  const availableChallengeNames = Array.from(
    new Set(savedChallenges.map(c => c.name).filter(Boolean))
  );
  // Potter Profile State
  const [profileName, setProfileName] = useState(user.name || '');
  const [profileStudio, setProfileStudio] = useState(user.studio || '');
  const [profileAvatar, setProfileAvatar] = useState(user.avatar || '🍯');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [enableChallenge, setEnableChallenge] = useState(settings.enableChallenge !== false);
  const [challengeName, setChallengeName] = useState(settings.challengeName || '200 Cylinder Challenge');
  const [targetCylinders, setTargetCylinders] = useState(settings.targetCylinders || 200);
  const [scheduleType, setScheduleType] = useState(settings.scheduleType || (settings.hasTimeLimit ? 'deadline' : 'none'));
  const [startDate, setStartDate] = useState(settings.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(settings.endDate || '');
  const [cadenceFrequency, setCadenceFrequency] = useState(settings.cadenceFrequency || 3);
  const [cadencePeriod, setCadencePeriod] = useState(settings.cadencePeriod || 'week');
  const [weightCategories, setWeightCategories] = useState(settings.weightCategories || []);
  const [globalUnit, setGlobalUnit] = useState(settings.globalUnit || 'lb');

  // Pottery Stages State
  const [potteryStages, setPotteryStages] = useState(
    settings.potteryStages || ['Wet Clay', 'Trimmed', 'Glaze Application', 'Fired']
  );
  const [newStageInput, setNewStageInput] = useState('');
  const [editingStageIdx, setEditingStageIdx] = useState(null);
  const [editingStageValue, setEditingStageValue] = useState('');

  // Remap / Delete Modal State
  const [deleteModalStage, setDeleteModalStage] = useState(null);
  const [remapTarget, setRemapTarget] = useState('');
  const [remapping, setRemapping] = useState(false);

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [importingZip, setImportingZip] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Inline Challenge Rename & Create State
  const [challengeMode, setChallengeMode] = useState('view'); // 'view' | 'rename' | 'create'
  const [challengeInput, setChallengeInput] = useState('');
  const [challengeActionLoading, setChallengeActionLoading] = useState(false);

  const handleConfirmRename = async () => {
    const newName = challengeInput.trim();
    if (!newName) return;
    if (newName.toLowerCase() === challengeName.toLowerCase()) {
      setChallengeMode('view');
      return;
    }
    setChallengeActionLoading(true);
    try {
      let updatedSettings = renameChallengeInSettings(settings, challengeName, newName);
      await renameChallengeInThrows(user.id, challengeName, newName, throws);

      const computedTarget = weightCategories.reduce((sum, cat) => sum + (Number(cat.targetCount) || 0), 0);
      updatedSettings = {
        ...updatedSettings,
        challengeName: newName,
        targetCylinders: computedTarget,
        hasTimeLimit: scheduleType === 'deadline',
        scheduleType,
        startDate,
        endDate: scheduleType === 'deadline' ? endDate : '',
        cadenceFrequency: Number(cadenceFrequency),
        cadencePeriod,
        weightCategories,
        globalUnit,
        potteryStages
      };

      await saveSettings(user.id, updatedSettings);
      setChallengeName(newName);
      if (onSettingsUpdate) onSettingsUpdate(updatedSettings);
      setChallengeMode('view');
    } catch (err) {
      console.error(err);
      alert("Failed to rename challenge: " + err.message);
    } finally {
      setChallengeActionLoading(false);
    }
  };

  const handleConfirmCreate = async () => {
    const newName = challengeInput.trim();
    if (!newName) return;
    setChallengeActionLoading(true);
    try {
      const currentSettingsSnapshot = {
        ...settings,
        enableChallenge,
        challengeName,
        targetCylinders: weightCategories.reduce((sum, cat) => sum + (Number(cat.targetCount) || 0), 0),
        scheduleType,
        hasTimeLimit: scheduleType === 'deadline',
        startDate,
        endDate,
        cadenceFrequency: Number(cadenceFrequency) || 3,
        cadencePeriod,
        weightCategories,
        globalUnit,
        potteryStages
      };

      const merged = switchActiveChallengeInSettings(currentSettingsSnapshot, newName);
      setChallengeName(merged.challengeName);
      setTargetCylinders(merged.targetCylinders);
      setScheduleType(merged.scheduleType);
      setStartDate(merged.startDate);
      setEndDate(merged.endDate);
      setCadenceFrequency(merged.cadenceFrequency);
      setCadencePeriod(merged.cadencePeriod);
      setWeightCategories(merged.weightCategories);

      await saveSettings(user.id, merged);
      if (onSettingsUpdate) onSettingsUpdate(merged);
      setChallengeMode('view');
    } catch (err) {
      console.error(err);
      alert("Failed to create challenge: " + err.message);
    } finally {
      setChallengeActionLoading(false);
    }
  };

  const handleGlobalUnitChange = (newUnit) => {
    setGlobalUnit(newUnit);
    const updated = weightCategories.map(cat => ({
      ...cat,
      unit: newUnit
    }));
    setWeightCategories(updated);
  };

  const handleCategoryChange = (index, field, value) => {
    const updated = [...weightCategories];
    updated[index] = {
      ...updated[index],
      [field]: field === 'weight' || field === 'targetCount' ? Number(value) : value
    };
    setWeightCategories(updated);
    
    // Auto-calculate sum for total cylinder target
    const newSum = updated.reduce((sum, cat) => sum + (cat.targetCount || 0), 0);
    setTargetCylinders(newSum);
  };

  const handleAddCategory = () => {
    const newId = 'cat_' + Math.random().toString(36).substr(2, 5);
    const newCat = {
      id: newId,
      name: 'New Weight Class',
      weight: 1,
      unit: globalUnit,
      targetCount: 10
    };
    const updated = [...weightCategories, newCat];
    setWeightCategories(updated);
    setTargetCylinders(updated.reduce((sum, cat) => sum + (cat.targetCount || 0), 0));
  };

  const handleRemoveCategory = (index) => {
    const updated = weightCategories.filter((_, i) => i !== index);
    setWeightCategories(updated);
    setTargetCylinders(updated.reduce((sum, cat) => sum + (cat.targetCount || 0), 0));
  };

  // --- Pottery Stage Operations ---
  const handleMoveStage = (idx, direction) => {
    const updated = [...potteryStages];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= updated.length) return;
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setPotteryStages(updated);
  };

  const handleAddStage = () => {
    const val = newStageInput.trim();
    if (!val) return;
    if (potteryStages.some(s => s.toLowerCase() === val.toLowerCase())) {
      alert('This stage name already exists!');
      return;
    }
    setPotteryStages([...potteryStages, val]);
    setNewStageInput('');
  };

  const handleStartEditStage = (idx) => {
    setEditingStageIdx(idx);
    setEditingStageValue(potteryStages[idx]);
  };

  const handleSaveEditStage = async (idx) => {
    const oldStage = potteryStages[idx];
    const newStage = editingStageValue.trim();
    if (!newStage) {
      setEditingStageIdx(null);
      return;
    }

    if (oldStage !== newStage) {
      try {
        setRemapping(true);
        // Batch remap existing photos & notes across throws
        await remapThrowStages(user.id, oldStage, newStage, throws);
        const updated = [...potteryStages];
        updated[idx] = newStage;
        setPotteryStages(updated);
      } catch (err) {
        console.error(err);
        alert('Failed to remap existing throw logs for this stage.');
      } finally {
        setRemapping(false);
      }
    }
    setEditingStageIdx(null);
  };

  const handleOpenDeleteStageModal = (st) => {
    const remaining = potteryStages.filter(s => s !== st);
    if (remaining.length === 0) {
      alert('You must keep at least one pottery stage!');
      return;
    }
    setDeleteModalStage(st);
    setRemapTarget(remaining[0]);
  };

  const handleConfirmDeleteStage = async () => {
    if (!deleteModalStage || !remapTarget) return;

    try {
      setRemapping(true);
      // Batch remap existing entries to selected remapTarget
      await remapThrowStages(user.id, deleteModalStage, remapTarget, throws);

      const updated = potteryStages.filter(s => s !== deleteModalStage);
      setPotteryStages(updated);

      // Auto-save settings
      const updatedSettings = {
        userId: user.id,
        enableChallenge,
        challengeName,
        targetCylinders,
        hasTimeLimit: scheduleType === 'deadline',
        scheduleType,
        startDate,
        endDate: scheduleType === 'deadline' ? endDate : '',
        cadenceFrequency: Number(cadenceFrequency),
        cadencePeriod,
        weightCategories,
        globalUnit,
        potteryStages: updated,
        challengeStartDate
      };
      await saveSettings(user.id, updatedSettings);
      if (onSettingsUpdate) onSettingsUpdate(updatedSettings);

      setDeleteModalStage(null);
    } catch (err) {
      console.error(err);
      alert('Failed to remap and remove stage.');
    } finally {
      setRemapping(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccess(false);
    setError('');

    if (enableChallenge && scheduleType === 'deadline' && !endDate) {
      setError('Please select a target end date.');
      return;
    }

    try {
      const previousActiveName = settings.challengeName || '200 Piece Challenge';
      const currentActiveName = challengeName.trim() || '200 Piece Challenge';

      let workingSettings = settings;

      // If challenge was renamed, rename in savedChallenges AND remap throw log tags!
      if (previousActiveName.toLowerCase().trim() !== currentActiveName.toLowerCase().trim()) {
        workingSettings = renameChallengeInSettings(workingSettings, previousActiveName, currentActiveName);
        await renameChallengeInThrows(user.id, previousActiveName, currentActiveName, throws);
      }

      const computedTarget = weightCategories.reduce((sum, cat) => sum + (Number(cat.targetCount) || 0), 0);
      const currentChallenges = getSavedChallenges(workingSettings);

      const activeSnapshot = {
        id: currentActiveName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name: currentActiveName,
        targetCylinders: computedTarget,
        hasTimeLimit: scheduleType === 'deadline',
        scheduleType,
        startDate,
        endDate: scheduleType === 'deadline' ? endDate : '',
        cadenceFrequency: Number(cadenceFrequency),
        cadencePeriod,
        weightCategories: weightCategories.map(cat => ({
          ...cat,
          weight: Math.round(Number(cat.weight)) || 1,
          unit: globalUnit
        }))
      };

      let updatedSavedChallenges = [...currentChallenges];
      const existingIdx = updatedSavedChallenges.findIndex(
        c => c.name.toLowerCase().trim() === currentActiveName.toLowerCase().trim()
      );
      if (existingIdx >= 0) {
        updatedSavedChallenges[existingIdx] = { ...updatedSavedChallenges[existingIdx], ...activeSnapshot };
      } else {
        updatedSavedChallenges.push(activeSnapshot);
      }

      const updatedSettings = {
        ...workingSettings,
        userId: user.id,
        enableChallenge,
        challengeName: currentActiveName,
        targetCylinders: computedTarget,
        hasTimeLimit: scheduleType === 'deadline',
        scheduleType,
        startDate,
        endDate: scheduleType === 'deadline' ? endDate : '',
        cadenceFrequency: Number(cadenceFrequency),
        cadencePeriod,
        weightCategories: activeSnapshot.weightCategories,
        globalUnit,
        potteryStages,
        savedChallenges: updatedSavedChallenges
      };

      await saveSettings(user.id, updatedSettings);
      if (onSettingsUpdate) {
        onSettingsUpdate(updatedSettings);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save settings.');
    }
  };

  const handleExportJSON = () => {
    const settingsData = {
      enableChallenge,
      challengeName,
      targetCylinders,
      scheduleType,
      hasTimeLimit: scheduleType === 'deadline',
      startDate,
      endDate,
      cadenceFrequency,
      cadencePeriod,
      globalUnit,
      potteryStages,
      weightCategories: weightCategories.map(cat => ({
        ...cat,
        weight: Math.round(Number(cat.weight)) || 1,
        unit: globalUnit
      }))
    };

    const blob = new Blob([JSON.stringify(settingsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `throwing_challenge_settings.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.targetCylinders && Array.isArray(parsed.weightCategories)) {
          setEnableChallenge(parsed.enableChallenge !== false);
          setChallengeName(parsed.challengeName || '200 Piece Challenge');
          setTargetCylinders(parsed.targetCylinders);
          setScheduleType(parsed.scheduleType || (parsed.hasTimeLimit ? 'deadline' : 'none'));
          setStartDate(parsed.startDate || new Date().toISOString().split('T')[0]);
          setEndDate(parsed.endDate || '');
          setCadenceFrequency(parsed.cadenceFrequency || 3);
          setCadencePeriod(parsed.cadencePeriod || 'week');
          setWeightCategories(parsed.weightCategories);
          if (parsed.globalUnit) setGlobalUnit(parsed.globalUnit);
          if (Array.isArray(parsed.potteryStages)) setPotteryStages(parsed.potteryStages);
          setError('');

          const updatedSettings = {
            userId: user.id,
            enableChallenge: parsed.enableChallenge !== false,
            challengeName: parsed.challengeName || '200 Piece Challenge',
            targetCylinders: parsed.targetCylinders,
            hasTimeLimit: parsed.scheduleType === 'deadline' || parsed.hasTimeLimit,
            scheduleType: parsed.scheduleType || (parsed.hasTimeLimit ? 'deadline' : 'none'),
            startDate: parsed.startDate || new Date().toISOString().split('T')[0],
            endDate: parsed.endDate || '',
            cadenceFrequency: Number(parsed.cadenceFrequency || 3),
            cadencePeriod: parsed.cadencePeriod || 'week',
            weightCategories: parsed.weightCategories,
            globalUnit: parsed.globalUnit || 'lb',
            potteryStages: Array.isArray(parsed.potteryStages) ? parsed.potteryStages : potteryStages
          };

          await saveSettings(user.id, updatedSettings);
          if (onSettingsUpdate) onSettingsUpdate(updatedSettings);

          alert('Challenge settings imported and applied!');
        } else {
          setError('Invalid settings schema. Check JSON parameters.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to parse settings JSON file.');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleImportZipFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("Importing this ZIP log will merge it into your active profile. Settings will be updated and throw logs will be loaded. Do you want to proceed?")) {
      e.target.value = '';
      return;
    }

    setImportingZip(true);
    setImportProgress({ current: 0, total: 0 });

    try {
      const result = await importChallengeFromZip(file, user.id, (current, total) => {
        setImportProgress({ current, total });
      });
      alert(`Success! Successfully imported ${result.importedCount} throw logs into your profile.`);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(`Import Failed: ${err.message}`);
    } finally {
      setImportingZip(false);
      e.target.value = '';
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(false);
    try {
      await updateProfile(user.id, {
        name: profileName.trim(),
        studio: profileStudio.trim(),
        avatar: profileAvatar
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile: ' + err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="settings-view animate-fade-in" style={{ maxWidth: '720px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--terracotta)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            App Setup
          </span>
          <h1 className="serif-title" style={{ fontSize: '2.2rem', fontWeight: 700, marginTop: '0.2rem' }}>
            Settings & Goals
          </h1>
        </div>
        <button onClick={signOutUser} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      {/* Potter Profile & Avatar Card */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: '20px', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--terracotta)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Potter Profile
          </span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.1rem' }}>
            Avatar & Profile Info
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Change your potter avatar stamp, name, and studio details.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Avatar Selector Grid */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Select Avatar Stamp
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {/* Active Avatar Badge Preview */}
              <div
                style={{
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
                }}
              >
                {profileAvatar}
              </div>

              {/* Emoji Options & Custom Input */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
                {AVATAR_OPTIONS.map((emoji) => {
                  const active = profileAvatar === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setProfileAvatar(emoji)}
                      style={{
                        fontSize: '1.3rem',
                        padding: '0.35rem 0.55rem',
                        borderRadius: '12px',
                        border: active ? '2px solid var(--terracotta)' : '1px solid var(--border-color)',
                        background: active ? 'var(--terracotta-light)' : 'var(--bg-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {emoji}
                    </button>
                  );
                })}
                <input
                  type="text"
                  placeholder="Or type/paste any emoji..."
                  value={profileAvatar}
                  onChange={(e) => setProfileAvatar(e.target.value)}
                  style={{
                    width: '170px',
                    fontSize: '0.8rem',
                    padding: '0.35rem 0.6rem',
                    borderRadius: '12px'
                  }}
                  title="Type or paste any custom emoji from your keyboard"
                />
              </div>
            </div>
          </div>

          {/* Name & Studio Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Potter Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. Clara"
                required
                style={{ marginTop: '0.25rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Studio Name (Optional)</label>
              <input
                type="text"
                value={profileStudio}
                onChange={(e) => setProfileStudio(e.target.value)}
                placeholder="e.g. Muddy Paws Ceramics"
                style={{ marginTop: '0.25rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '1rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
              disabled={profileSaving || !profileName.trim()}
            >
              {profileSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Save Profile & Avatar
            </button>
            {profileSuccess && (
              <span style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Check size={14} /> Profile updated!
              </span>
            )}
          </div>
        </form>
      </div>

      {success && (
        <div 
          className="animate-pop-in"
          style={{
            position: 'fixed',
            bottom: '6.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--celadon)',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '16px',
            boxShadow: '0 8px 30px rgba(112, 147, 125, 0.4)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontWeight: 600,
            fontSize: '0.95rem',
            pointerEvents: 'none'
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>🎉</span>
          Settings Saved Successfully!
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(184, 76, 54, 0.1)',
          border: '1px dashed var(--collapse)',
          color: 'var(--collapse)',
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          fontSize: '0.9rem',
          marginBottom: '1.5rem'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Core Challenge Targets */}
        <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
          <h3 className="serif-title" style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SettingsIcon size={20} style={{ color: 'var(--terracotta)' }} />
            Challenge Targets
          </h3>
          
          {/* Enable / Disable Challenge Mode Toggle */}
          <div style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            padding: '1rem 1.25rem',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            marginBottom: '1.5rem'
          }}>
            <div>
              <h4 style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Target size={17} style={{ color: 'var(--terracotta)' }} />
                Enable Challenge Mode
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {enableChallenge ? 'Track target progress, percentages, and challenge deadlines.' : 'Use Centrd as a pure studio logbook without target counts or deadlines.'}
              </p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={enableChallenge}
                onChange={(e) => setEnableChallenge(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          {enableChallenge ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label>Active Challenge</label>
                {challengeMode === 'view' && (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      value={availableChallengeNames.includes(challengeName) ? challengeName : '__CUSTOM__'}
                      onChange={async (e) => {
                        const targetName = e.target.value;
                        if (targetName === '__CREATE_NEW__') {
                          setChallengeInput('');
                          setChallengeMode('create');
                          return;
                        } else if (targetName === '__CUSTOM__') {
                          return;
                        }

                        // Snapshot current state into settings object before switching
                        const currentSettingsSnapshot = {
                          ...settings,
                          enableChallenge,
                          challengeName,
                          targetCylinders: weightCategories.reduce((sum, cat) => sum + (Number(cat.targetCount) || 0), 0),
                          scheduleType,
                          hasTimeLimit: scheduleType === 'deadline',
                          startDate,
                          endDate,
                          cadenceFrequency: Number(cadenceFrequency) || 3,
                          cadencePeriod,
                          weightCategories,
                          globalUnit,
                          potteryStages
                        };

                        const merged = switchActiveChallengeInSettings(currentSettingsSnapshot, targetName);
                        setChallengeName(merged.challengeName);
                        setTargetCylinders(merged.targetCylinders);
                        setScheduleType(merged.scheduleType);
                        setStartDate(merged.startDate);
                        setEndDate(merged.endDate);
                        setCadenceFrequency(merged.cadenceFrequency);
                        setCadencePeriod(merged.cadencePeriod);
                        setWeightCategories(merged.weightCategories);

                        try {
                          await saveSettings(user.id, merged);
                          if (onSettingsUpdate) onSettingsUpdate(merged);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      style={{ flex: 1, minWidth: '200px', fontWeight: 700 }}
                    >
                      {availableChallengeNames.map(cName => (
                        <option key={cName} value={cName}>🏷️ {cName}</option>
                      ))}
                      {!availableChallengeNames.includes(challengeName) && (
                        <option value="__CUSTOM__">🏷️ {challengeName}</option>
                      )}
                      <option value="__CREATE_NEW__">+ Create New Challenge...</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setChallengeInput(challengeName);
                        setChallengeMode('rename');
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}
                      title="Rename this challenge"
                    >
                      <Edit2 size={14} /> Rename
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm(`Are you sure you want to delete the challenge "${challengeName}"?`)) {
                          const updatedSettings = deleteChallengeFromSettings(settings, challengeName);
                          setChallengeName(updatedSettings.challengeName);
                          setTargetCylinders(updatedSettings.targetCylinders);
                          setScheduleType(updatedSettings.scheduleType);
                          setStartDate(updatedSettings.startDate);
                          setEndDate(updatedSettings.endDate);
                          setCadenceFrequency(updatedSettings.cadenceFrequency);
                          setCadencePeriod(updatedSettings.cadencePeriod);
                          setWeightCategories(updatedSettings.weightCategories);

                          try {
                            await saveSettings(user.id, updatedSettings);
                            if (onSettingsUpdate) onSettingsUpdate(updatedSettings);
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ color: 'var(--collapse)', borderColor: 'var(--collapse)', padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}
                      title="Delete this challenge"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}

                {challengeMode === 'rename' && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }} className="animate-pop-in">
                    <input
                      type="text"
                      value={challengeInput}
                      onChange={(e) => setChallengeInput(e.target.value)}
                      placeholder="New challenge name"
                      style={{ flex: 1, minWidth: '200px', fontWeight: 600 }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleConfirmRename();
                        } else if (e.key === 'Escape') {
                          setChallengeMode('view');
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleConfirmRename}
                      disabled={challengeActionLoading}
                      className="btn btn-primary"
                      style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}
                    >
                      {challengeActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setChallengeMode('view')}
                      disabled={challengeActionLoading}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                )}

                {challengeMode === 'create' && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }} className="animate-pop-in">
                    <input
                      type="text"
                      value={challengeInput}
                      onChange={(e) => setChallengeInput(e.target.value)}
                      placeholder="e.g. Fall 100 Speedrun"
                      style={{ flex: 1, minWidth: '200px', fontWeight: 600 }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleConfirmCreate();
                        } else if (e.key === 'Escape') {
                          setChallengeMode('view');
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleConfirmCreate}
                      disabled={challengeActionLoading}
                      className="btn btn-primary"
                      style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}
                    >
                      {challengeActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create Challenge
                    </button>
                    <button
                      type="button"
                      onClick={() => setChallengeMode('view')}
                      disabled={challengeActionLoading}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                )}

                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.35rem' }}>
                  {challengeMode === 'create'
                    ? 'Type a title for your new challenge and click Create.'
                    : challengeMode === 'rename'
                    ? 'Type a new title to rename your active challenge.'
                    : 'Select from configured challenges, click Rename to customize the title, or choose + Create New Challenge.'}
                </span>
              </div>

              <div>
                <label>Total Challenge Target</label>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  color: 'var(--terracotta)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Target size={18} />
                  {weightCategories.reduce((sum, cat) => sum + (Number(cat.targetCount) || 0), 0)} Pieces Total
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                  Automatically calculated as the sum of all weight category target counts below.
                </span>
              </div>

            <div>
              <label htmlFor="globalUnit">Global Weight Unit</label>
              <select
                id="globalUnit"
                value={globalUnit}
                onChange={(e) => handleGlobalUnitChange(e.target.value)}
              >
                <option value="lb">Pounds (lb)</option>
                <option value="kg">Kilograms (kg)</option>
              </select>
            </div>

            {/* Pacing selection tabs */}
            <div>
              <label>Pacing & Schedule Strategy</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '0.8rem',
                marginTop: '0.4rem'
              }}>
                {[
                  { id: 'none', label: 'No Time Limit', desc: 'Throw at your own pace' },
                  { id: 'deadline', label: 'End Date Target', desc: 'Complete by a final deadline' },
                  { id: 'cadence', label: 'Periodic Cadence', desc: 'X throws per day/week/month' }
                ].map(item => {
                  const active = scheduleType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setScheduleType(item.id)}
                      style={{
                        background: active ? 'var(--terracotta)' : 'var(--bg-secondary)',
                        color: active ? '#fff' : 'var(--text-primary)',
                        border: '1px solid',
                        borderColor: active ? 'var(--terracotta)' : 'var(--border-color)',
                        padding: '0.75rem 0.5rem',
                        flexDirection: 'column',
                        borderRadius: '16px',
                        height: '74px',
                        lineHeight: '1.2'
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{item.label}</span>
                      <span style={{ fontSize: '0.7rem', opacity: active ? 0.95 : 0.6, fontWeight: 400, marginTop: '0.15rem' }}>{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Strategy Options Details */}
            {scheduleType === 'deadline' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }} className="animate-pop-in">
                <div>
                  <label htmlFor="startDate">Start Date</label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="endDate">End Date / Deadline</label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {scheduleType === 'cadence' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }} className="animate-pop-in">
                <div>
                  <label htmlFor="cadenceFrequency">Target Quantity</label>
                  <input
                    id="cadenceFrequency"
                    type="number"
                    min="1"
                    value={cadenceFrequency}
                    onChange={(e) => setCadenceFrequency(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label htmlFor="cadencePeriod">Time Period</label>
                  <select
                    id="cadencePeriod"
                    value={cadencePeriod}
                    onChange={(e) => setCadencePeriod(e.target.value)}
                  >
                    <option value="day">per Day</option>
                    <option value="week">per Week</option>
                    <option value="month">per Month</option>
                  </select>
                </div>
              </div>
            )}

            {/* Weight Classes Section Inside Challenge Targets */}
            <div style={{ marginTop: '2rem', paddingTop: '1.75rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h4 style={{ fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plus size={18} style={{ color: 'var(--terracotta)' }} />
                  Weight Classes
                </h4>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px' }}
                >
                  Add Class
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {weightCategories.map((cat, idx) => (
                  <div key={cat.id || idx} className="weight-class-row">
                    <div className="weight-class-name-col">
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                        Class Name
                      </label>
                      <input
                        type="text"
                        placeholder="Name"
                        value={cat.name}
                        onChange={(e) => handleCategoryChange(idx, 'name', e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      />
                    </div>

                    <div className="weight-class-weight-col">
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                        Weight
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          placeholder="Weight"
                          value={cat.weight}
                          onChange={(e) => handleCategoryChange(idx, 'weight', e.target.value === '' ? '' : Math.round(Number(e.target.value)))}
                          style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem', flex: 1 }}
                        />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                          {globalUnit}
                        </span>
                      </div>
                    </div>

                    <div className="weight-class-count-col">
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                        Target Count
                      </label>
                      <input
                        type="number"
                        placeholder="Count"
                        value={cat.targetCount}
                        onChange={(e) => handleCategoryChange(idx, 'targetCount', e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      />
                    </div>

                    <div className="weight-class-delete-col" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.4rem',
                          marginTop: '0.8rem'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--collapse)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                        title="Remove Weight Class"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {weightCategories.length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                    No weight categories defined. Please add at least one category.
                  </p>
                )}
              </div>
            </div>

            {/* Challenge Settings Import / Export Section Inside Challenge Targets */}
            <div style={{
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--terracotta)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Challenge Backup
                </span>
                <h4 style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: '0.15rem' }}>
                  Challenge Configuration JSON
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Export or import your throwing challenge goals, weight classes, and schedule targets as a JSON file.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                >
                  <Download size={15} />
                  Export Challenge Settings
                </button>
                <label
                  className="btn btn-secondary"
                  style={{
                    margin: 0,
                    padding: '0.5rem 1rem',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Upload size={15} />
                  Import Challenge Settings
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          </div>
          ) : (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.25rem',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.88rem'
            }}>
              🌿 <strong>Challenge Mode is currently disabled.</strong> Your throwing entries will be recorded in your studio log without target goals or deadlines.
            </div>
          )}

          {/* Save Button for Challenge Targets & Goals */}
          <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontWeight: 700 }}>
              Save Challenge Configuration
            </button>
          </div>
        </div>

        {/* Pottery Stages Manager Card */}
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '20px', marginBottom: '1rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--terracotta)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Lifecycle Config
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.1rem' }}>
              Pottery Stages Manager
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Customize, reorder, or remove pottery stages. When deleting or renaming a stage, existing notes and photos are automatically remapped!
            </p>
          </div>

          {/* Add New Stage Bar */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <input
              type="text"
              placeholder="e.g. Underglaze, Carving, Sanded..."
              value={newStageInput}
              onChange={(e) => setNewStageInput(e.target.value)}
              style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem 0.8rem' }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStage(); } }}
            />
            <button
              type="button"
              onClick={handleAddStage}
              className="btn btn-celadon"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              disabled={!newStageInput.trim()}
            >
              <Plus size={15} /> Add Stage
            </button>
          </div>

          {/* List of Configured Stages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {potteryStages.map((st, idx) => (
              <div
                key={st + '_' + idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  background: 'var(--bg-secondary)',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)'
                }}
              >
                {/* Move buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    type="button"
                    onClick={() => handleMoveStage(idx, -1)}
                    disabled={idx === 0}
                    style={{ background: 'none', border: 'none', padding: 0, opacity: idx === 0 ? 0.3 : 0.7, cursor: idx === 0 ? 'default' : 'pointer' }}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveStage(idx, 1)}
                    disabled={idx === potteryStages.length - 1}
                    style={{ background: 'none', border: 'none', padding: 0, opacity: idx === potteryStages.length - 1 ? 0.3 : 0.7, cursor: idx === potteryStages.length - 1 ? 'default' : 'pointer' }}
                  >
                    <ArrowDown size={13} />
                  </button>
                </div>

                {/* Stage Name / Inline Edit */}
                {editingStageIdx === idx ? (
                  <div style={{ display: 'flex', gap: '0.4rem', flex: 1, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={editingStageValue}
                      onChange={(e) => setEditingStageValue(e.target.value)}
                      style={{ fontSize: '0.85rem', padding: '0.35rem 0.6rem', flex: 1 }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEditStage(idx)}
                      className="btn btn-primary"
                      style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                      disabled={remapping}
                    >
                      {remapping ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStageIdx(null)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {st}
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleStartEditStage(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}
                        title="Rename Stage"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteStageModal(st)}
                        style={{ background: 'none', border: 'none', color: 'var(--collapse)', cursor: 'pointer', padding: '0.2rem' }}
                        title="Remove Stage"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Remap Stage Modal on Delete */}
        {deleteModalStage && (
          <div className="postit-modal-backdrop" onClick={() => setDeleteModalStage(null)}>
            <div
              className="glass"
              style={{
                width: '100%',
                maxWidth: '460px',
                borderRadius: '20px',
                padding: '1.75rem',
                boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
                background: 'var(--bg-primary)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--collapse)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Trash2 size={18} />
                  Remove Stage: "{deleteModalStage}"
                </h3>
                <button
                  type="button"
                  onClick={() => setDeleteModalStage(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.45' }}>
                Removing this stage requires remapping any existing photos and sticky notes associated with <strong>"{deleteModalStage}"</strong>. Select the stage to move them to:
              </p>

              <label style={{ marginBottom: '0.4rem' }}>Target Remap Stage:</label>
              <select
                value={remapTarget}
                onChange={(e) => setRemapTarget(e.target.value)}
                style={{ marginBottom: '1.5rem' }}
              >
                {potteryStages.filter(s => s !== deleteModalStage).map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setDeleteModalStage(null)}
                  className="btn btn-secondary"
                  disabled={remapping}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteStage}
                  className="btn btn-primary"
                  style={{ background: 'var(--collapse)' }}
                  disabled={remapping}
                >
                  {remapping ? <Loader2 size={16} className="animate-spin" /> : 'Remap & Remove Stage'}
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Backup & Restore ZIP Log */}
        <div className="glass" style={{
          marginTop: '0.25rem',
          padding: '1.5rem',
          borderRadius: '20px',
          border: '1px dashed var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Restore Journal</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Restore settings, throw history, and clay stage photos from a previously exported Centrd ZIP log.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {importingZip ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <Loader2 size={16} className="animate-spin" />
                <span>Importing ({importProgress.current}/{importProgress.total})...</span>
              </div>
            ) : (
              <label className="btn btn-secondary" style={{
                color: 'var(--text-primary)',
                background: 'none',
                fontSize: '0.8rem',
                padding: '0.5rem 1rem',
                margin: 0,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: 'var(--border-color)'
              }}>
                <Upload size={14} style={{ marginRight: '0.35rem' }} />
                Import ZIP Log
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleImportZipFile}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>
        </div>

        {/* Delete Current Potter Profile */}
        <div className="glass" style={{
          marginTop: '2rem',
          padding: '1.5rem',
          borderRadius: '20px',
          border: '1px dashed var(--collapse)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h4 style={{ fontWeight: 700, color: 'var(--collapse)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Trash2 size={16} />
              Delete Potter Profile
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Permanently delete your potter profile, settings, throwing logs, and photos. Other potter profiles will remain safe.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const confirmMsg = `Are you sure you want to delete profile "${user.name}"?\n\nAll your settings, throwing logs, notes, and photos will be permanently deleted. Other potter profiles will remain safe. This cannot be undone.`;
              if (window.confirm(confirmMsg)) {
                try {
                  await deleteProfile(user.id);
                  await signOutUser();
                  window.location.reload();
                } catch (err) {
                  console.error(err);
                  alert("Failed to delete potter profile: " + (err.message || 'Unknown error'));
                }
              }
            }}
            className="btn btn-secondary"
            style={{
              color: 'var(--collapse)',
              borderColor: 'rgba(184, 76, 54, 0.4)',
              background: 'rgba(184, 76, 54, 0.08)',
              fontSize: '0.8rem',
              padding: '0.5rem 1rem'
            }}
          >
            Delete Profile
          </button>
        </div>

      </form>
    </div>
  );
}
