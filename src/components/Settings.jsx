import React, { useState } from 'react';
import { saveSettings, signOutUser } from '../db';
import { clearFirebaseConfig } from '../firebase';
import { Settings as SettingsIcon, LogOut, Download, Upload, Plus, Trash2 } from 'lucide-react';

export default function Settings({ settings, user, onSettingsUpdate }) {
  const [targetCylinders, setTargetCylinders] = useState(settings.targetCylinders || 200);
  const [scheduleType, setScheduleType] = useState(settings.scheduleType || (settings.hasTimeLimit ? 'deadline' : 'none'));
  const [startDate, setStartDate] = useState(settings.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(settings.endDate || '');
  const [cadenceFrequency, setCadenceFrequency] = useState(settings.cadenceFrequency || 3);
  const [cadencePeriod, setCadencePeriod] = useState(settings.cadencePeriod || 'week');
  const [weightCategories, setWeightCategories] = useState(settings.weightCategories || []);
  const [globalUnit, setGlobalUnit] = useState(settings.globalUnit || 'lb');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccess(false);
    setError('');

    if (scheduleType === 'deadline' && !endDate) {
      setError('Please select a target end date.');
      return;
    }

    try {
      const updatedSettings = {
        userId: user.uid,
        targetCylinders,
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
        })),
        globalUnit
      };

      await saveSettings(user.uid, updatedSettings);
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
      targetCylinders,
      scheduleType,
      hasTimeLimit: scheduleType === 'deadline',
      startDate,
      endDate,
      cadenceFrequency,
      cadencePeriod,
      weightCategories: weightCategories.map(cat => ({
        ...cat,
        weight: Math.round(Number(cat.weight)) || 1,
        unit: globalUnit
      })),
      globalUnit
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
          setTargetCylinders(parsed.targetCylinders);
          setScheduleType(parsed.scheduleType || (parsed.hasTimeLimit ? 'deadline' : 'none'));
          setStartDate(parsed.startDate || new Date().toISOString().split('T')[0]);
          setEndDate(parsed.endDate || '');
          setCadenceFrequency(parsed.cadenceFrequency || 3);
          setCadencePeriod(parsed.cadencePeriod || 'week');
          setWeightCategories(parsed.weightCategories);
          setError('');
          alert('Challenge settings imported! Click "Save Configuration" to commit these settings.');
        } else {
          setError('Invalid settings schema. Check JSON parameters.');
        }
      } catch (err) {
        setError('Failed to parse settings JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetConnection = () => {
    if (window.confirm("Are you sure you want to disconnect from this database? This will clear the local configuration and reload the app.")) {
      clearFirebaseConfig();
      localStorage.removeItem("throwing_log_use_mock_db");
      localStorage.removeItem("throwing_log_mock_user");
      window.location.reload();
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
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label htmlFor="targetCylinders">Total Challenge Cylinder Target</label>
              <input
                id="targetCylinders"
                type="number"
                disabled
                value={targetCylinders}
                style={{ opacity: 0.8, background: 'var(--bg-primary)', fontWeight: 700 }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                Note: This is automatically calculated as the sum of all weight targets.
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

          </div>
        </div>

        {/* Weights Categories Breakdown */}
        <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="serif-title" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} style={{ color: 'var(--terracotta)' }} />
              Weight Classes
            </h3>
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
              <div key={cat.id || idx} style={{
                display: 'grid',
                gridTemplateColumns: '2.5fr 1.2fr 40px 1.5fr 30px',
                gap: '0.75rem',
                alignItems: 'center',
                background: 'var(--bg-secondary)',
                padding: '0.75rem',
                borderRadius: '16px',
                border: '1px solid var(--border-color)'
              }}>
                <div>
                  <input
                    type="text"
                    placeholder="Name"
                    value={cat.name}
                    onChange={(e) => handleCategoryChange(idx, 'name', e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                  />
                </div>

                <div>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Weight"
                    value={cat.weight}
                    onChange={(e) => handleCategoryChange(idx, 'weight', e.target.value === '' ? '' : Math.round(Number(e.target.value)))}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                  />
                </div>

                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, paddingLeft: '0.25rem' }}>
                  {globalUnit}
                </div>

                <div>
                  <input
                    type="number"
                    placeholder="Target Count"
                    value={cat.targetCount}
                    onChange={(e) => handleCategoryChange(idx, 'targetCount', e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                  />
                </div>

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
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--collapse)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {weightCategories.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                No weight categories defined. Please add at least one category.
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.9rem' }}>
            Save Configuration
          </button>
          
          <button type="button" onClick={handleExportJSON} className="btn btn-secondary" style={{ padding: '0.9rem' }}>
            <Download size={18} />
            Export settings
          </button>
          
          <label className="btn btn-secondary" style={{ margin: 0, padding: '0.9rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={18} />
            Import settings
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Database Connection Reset */}
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
            <h4 style={{ fontWeight: 700, color: 'var(--collapse)', fontSize: '0.95rem' }}>Database Management</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Disconnect credentials or reset the database connection setup to link a new Firebase project.
            </p>
          </div>
          <button type="button" onClick={handleResetConnection} className="btn btn-secondary" style={{
            color: 'var(--collapse)',
            borderColor: 'rgba(184, 76, 54, 0.3)',
            background: 'none',
            fontSize: '0.8rem',
            padding: '0.5rem 1rem'
          }}>
            Disconnect Database
          </button>
        </div>

      </form>
    </div>
  );
}
