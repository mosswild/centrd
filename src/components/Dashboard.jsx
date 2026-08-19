import React from 'react';
import { Flame, Trophy, Calendar, Compass, Target, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Dashboard({ throws, settings, user }) {
  const totalThrows = throws.length;
  const targetCylinders = settings.targetCylinders || 200;
  
  // Calculate completion percentage
  const overallPercent = Math.min(100, Math.round((totalThrows / targetCylinders) * 100));

  const statusCounts = throws.reduce((acc, t) => {
    let status = t.status || 'Successful';
    // Map legacy statuses
    if (status === 'Collapsed' || status === 'Discarded') status = 'Failed';
    if (status === 'Trimmed') status = 'Flawed';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, { Successful: 0, Failed: 0, Flawed: 0 });

  // Calculate category stats
  const categoryStats = settings.weightCategories.map(cat => {
    const catThrows = throws.filter(t => t.weightClass === cat.id);
    const count = catThrows.length;
    const target = cat.targetCount || 0;
    const percent = target > 0 ? Math.min(100, Math.round((count / target) * 100)) : 0;
    
    const catSuccess = catThrows.filter(t => t.status === 'Successful').length;
    
    return {
      ...cat,
      count,
      target,
      percent,
      successCount: catSuccess
    };
  });

  // Schedule type backward compatibility check
  const scheduleType = settings.scheduleType || (settings.hasTimeLimit ? 'deadline' : 'none');

  // 1. Calculate Pacing for Deadline
  let daysRemaining = null;
  let requiredPace = null;
  let deadlinePassed = false;

  if (scheduleType === 'deadline' && settings.endDate) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const end = new Date(settings.endDate + 'T00:00:00');
    
    const timeDiff = end.getTime() - today.getTime();
    daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    const throwsLeft = Math.max(0, targetCylinders - totalThrows);
    if (daysRemaining > 0 && throwsLeft > 0) {
      requiredPace = (throwsLeft / daysRemaining).toFixed(1);
    } else if (throwsLeft === 0) {
      requiredPace = 0;
    } else {
      requiredPace = 0;
      deadlinePassed = true;
    }
  }

  // 2. Calculate Pacing & Status for Cadence
  let cadenceCount = 0;
  let cadenceTarget = settings.cadenceFrequency || 3;
  let cadencePeriod = settings.cadencePeriod || 'week';
  let cadenceGoalMet = false;
  let cadenceRemaining = 0;

  if (scheduleType === 'cadence') {
    const now = new Date();
    const todayLocalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (cadencePeriod === 'day') {
      // Throws done today
      cadenceCount = throws.filter(t => t.dateThrown === todayLocalStr).length;
    } else if (cadencePeriod === 'week') {
      // Find Monday and Sunday date bounds
      const currentDay = now.getDay();
      const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - distanceToMonday);
      monday.setHours(0,0,0,0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23,59,59,999);

      cadenceCount = throws.filter(t => {
        if (!t.dateThrown) return false;
        const throwDate = new Date(t.dateThrown + 'T00:00:00');
        return throwDate >= monday && throwDate <= sunday;
      }).length;
    } else if (cadencePeriod === 'month') {
      // Throws done this calendar month
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-11
      
      cadenceCount = throws.filter(t => {
        if (!t.dateThrown) return false;
        const throwDate = new Date(t.dateThrown + 'T00:00:00');
        return throwDate.getFullYear() === currentYear && throwDate.getMonth() === currentMonth;
      }).length;
    }

    cadenceGoalMet = cadenceCount >= cadenceTarget;
    cadenceRemaining = Math.max(0, cadenceTarget - cadenceCount);
  }

  // Circular progress ring math
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallPercent / 100) * circumference;

  return (
    <div className="dashboard-view animate-fade-in">
      {/* Welcome Header */}
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          {/* Avatar Icon Badge with rounded square border */}
          <div
            className="glass"
            style={{
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              background: 'var(--bg-secondary)',
              border: '1.5px solid var(--border-color)',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.06)',
              flexShrink: 0
            }}
          >
            {user.avatar || '🍯'}
          </div>

          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--terracotta)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Centrd: A Throwing Diary
            </span>
            <h1 className="serif-title" style={{ fontSize: '2.2rem', fontWeight: 700, marginTop: '0.1rem', lineHeight: '1.2' }}>
              Welcome back, {user.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
              "Find your center. Challenge your limits. Log your growth."{user.studio && ` — ${user.studio}`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="glass" style={{ padding: '0.5rem 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <Flame size={16} style={{ color: 'var(--terracotta)' }} />
            <span><strong>{totalThrows}</strong> / {targetCylinders} Thrown</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Circle progress card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '2rem',
        marginBottom: '2.5rem'
      }}>
        {/* Large Circle Progress Card */}
        <div className="glass" style={{
          padding: '2.5rem',
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle clay background glow */}
          <div style={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'var(--glow)',
            filter: 'blur(80px)',
            zIndex: 0,
            top: '-50px',
            left: 'calc(50% - 150px)',
            opacity: 0.5
          }}></div>

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width="200" height="200" className="progress-ring">
              <circle
                stroke="var(--border-color)"
                fill="transparent"
                strokeWidth="12"
                r={radius}
                cx="100"
                cy="100"
              />
              <circle
                className="progress-ring-circle"
                stroke="var(--terracotta)"
                fill="transparent"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                r={radius}
                cx="100"
                cy="100"
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <span className="serif-title" style={{ fontSize: '2.5rem', fontWeight: 700, display: 'block', color: 'var(--text-primary)', lineHeight: '1' }}>
                {overallPercent}%
              </span>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Completed
              </span>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', zIndex: 1 }}>
            <h2 className="serif-title" style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>
              {totalThrows >= targetCylinders ? "Challenge Accomplished! 🎉" : "Cylinder Challenge Progress"}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '360px' }}>
              You've logged <strong>{totalThrows}</strong> cylinders out of your <strong>{targetCylinders}</strong> target.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary & Deadline/Cadence Pacing Card Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
        marginBottom: '2.5rem'
      }}>
        {/* Status Breakdown Card */}
        <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
          <h3 className="serif-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Compass size={20} style={{ color: 'var(--terracotta)' }} />
            Quality & Yield Stats
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.entries(statusCounts).map(([status, count]) => {
              const rate = totalThrows > 0 ? Math.round((count / totalThrows) * 100) : 0;
              let color = 'var(--text-secondary)';
              if (status === 'Successful') color = 'var(--success)';
              if (status === 'Failed') color = 'var(--collapse)';
              if (status === 'Flawed') color = 'var(--ochre)';

              return (
                <div key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }}></span>
                      {status}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{count} ({rate}%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '100px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      background: color,
                      borderRadius: '100px',
                      width: `${rate}%`,
                      transition: 'width 0.6s ease'
                    }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Studio Timeline / Cadence Pace Card */}
        <div className="glass" style={{ padding: '2rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 className="serif-title" style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} style={{ color: 'var(--terracotta)' }} />
              Pacing Goal
            </h3>

            {/* Render End Date Deadline Target */}
            {scheduleType === 'deadline' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Deadline:</span>
                  <span style={{ fontWeight: 600 }}>{new Date(settings.endDate + 'T00:00:00').toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Days Remaining:</span>
                  <span style={{ fontWeight: 600, color: daysRemaining <= 5 ? 'var(--collapse)' : 'var(--text-primary)' }}>
                    {deadlinePassed ? 'Deadline Passed' : `${daysRemaining} days`}
                  </span>
                </div>
                {!deadlinePassed && requiredPace !== null && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', marginTop: '0.5rem' }}>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Pace Required
                    </span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--terracotta)' }}>
                      {requiredPace}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>
                      cylinders / day
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Render Cadence Goal Target */}
            {scheduleType === 'cadence' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Cadence Target:</span>
                  <span style={{ fontWeight: 600 }}>{cadenceTarget} cylinders per {cadencePeriod}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Logged this {cadencePeriod}:</span>
                  <span style={{ fontWeight: 600 }}>{cadenceCount} cylinders</span>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', marginTop: '0.5rem', textAlign: 'center' }}>
                  {cadenceGoalMet ? (
                    <div style={{ color: 'var(--success)' }}>
                      <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem auto' }} />
                      <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 700 }}>Goal Met! 🎉</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>You've reached your cadence target for this period!</span>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--terracotta)' }}>
                      <Target size={32} style={{ margin: '0 auto 0.5rem auto', color: 'var(--text-secondary)' }} />
                      <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800 }}>{cadenceRemaining} More</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        cylinder{cadenceRemaining > 1 ? 's' : ''} needed to hit your target.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Render No Time Limit */}
            {scheduleType === 'none' && (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
                <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem', fontWeight: 600 }}>Craftsmanship Mode</p>
                <p style={{ fontSize: '0.85rem' }}>No time limit or cadence constraints active. Throw at your own pace to master the craft.</p>
              </div>
            )}

          </div>
          {scheduleType === 'deadline' && deadlinePassed && (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px dashed var(--collapse)',
              color: 'var(--collapse)',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              fontSize: '0.85rem',
              marginTop: '1rem'
            }}>
              The schedule deadline has passed. Consider editing settings to extend the time.
            </div>
          )}
        </div>
      </div>

      {/* Target Category Breakdown Section */}
      <h3 className="serif-title" style={{ fontSize: '1.6rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Trophy size={24} style={{ color: 'var(--terracotta)' }} />
        Weight Breakdown Progress
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem'
      }}>
        {categoryStats.map((cat) => {
          const isDone = cat.count >= cat.target;
          return (
            <div key={cat.id} className="glass" style={{
              padding: '1.5rem',
              borderRadius: '20px',
              border: isDone ? '1px solid var(--celadon)' : '1px solid var(--glass-border)',
              boxShadow: isDone ? '0 8px 24px rgba(112, 147, 125, 0.15)' : 'var(--card-shadow)',
              transition: 'var(--transition-smooth)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{cat.name}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Weight: {cat.weight} {cat.unit}
                  </span>
                </div>
                {isDone ? (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--celadon)',
                    background: 'var(--celadon-light)',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '100px',
                    textTransform: 'uppercase'
                  }}>
                    Completed
                  </span>
                ) : (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--terracotta)',
                    background: 'var(--terracotta-light)',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '100px',
                    textTransform: 'uppercase'
                  }}>
                    {cat.percent}%
                  </span>
                )}
              </div>

              {/* Progress Numbers */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Thrown:</span>
                <span style={{ fontWeight: 600 }}>{cat.count} / {cat.target}</span>
              </div>

              {/* Success Ratio */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
                <span>Success Ratio:</span>
                <span>{cat.count > 0 ? Math.round((cat.successCount / cat.count) * 100) : 0}% ({cat.successCount} success)</span>
              </div>

              {/* Slider Progress Bar */}
              <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: isDone ? 'var(--celadon)' : 'var(--terracotta)',
                  borderRadius: '100px',
                  width: `${cat.percent}%`,
                  transition: 'width 0.6s ease'
                }}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
