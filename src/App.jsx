import React, { useState, useEffect } from 'react';
import { isFirebaseConfigured, getStoredConfig } from './firebase';
import { subscribeToAuth, loadSettings, subscribeToThrows, mockSignIn } from './db';
import { exportChallengeToZip } from './utils/exporter';

import Onboarding from './components/Onboarding';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import LogThrow from './components/LogThrow';
import History from './components/History';
import Settings from './components/Settings';

import { 
  LayoutDashboard, Flame, History as HistoryIcon, Settings as SettingsIcon, 
  Sun, Moon, Download, LogOut, Loader2, PlusCircle 
} from 'lucide-react';

export default function App() {
  const [dbConfigured, setDbConfigured] = useState(isFirebaseConfigured());
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [settings, setSettings] = useState(null);
  const [throws, setThrows] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'log' | 'history' | 'settings'
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('throwing_log_theme') === 'dark';
  });
  const [exporting, setExporting] = useState(false);

  // Apply dark mode theme
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('throwing_log_theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('throwing_log_theme', 'light');
    }
  }, [darkMode]);

  // Auth Subscription
  useEffect(() => {
    if (!dbConfigured) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = subscribeToAuth(async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        setLoadingData(true);
        try {
          // Load settings with inline try/catch fallback
          let userSettings = null;
          try {
            userSettings = await loadSettings(currentUser.uid);
          } catch (e) {
            console.error("Failed to load settings from Firestore, using default:", e);
          }

          if (!userSettings) {
            userSettings = {
              userId: currentUser.uid,
              targetCylinders: 200,
              hasTimeLimit: false,
              startDate: new Date().toISOString().split('T')[0],
              endDate: "",
              scheduleType: "none",
              cadenceFrequency: 3,
              cadencePeriod: "week",
              weightCategories: [
                { id: "1lb", name: "1 lb Cylinder", weight: 1, unit: "lb", targetCount: 100 },
                { id: "2lb", name: "2 lb Cylinder", weight: 2, unit: "lb", targetCount: 50 },
                { id: "3lb", name: "3 lb Cylinder", weight: 3, unit: "lb", targetCount: 30 },
                { id: "5lb", name: "5 lb Cylinder", weight: 5, unit: "lb", targetCount: 20 }
              ]
            };
          }
          setSettings(userSettings);

          // Subscribe to throws with error handler
          const unsubscribeThrows = subscribeToThrows(
            currentUser.uid,
            (updatedThrows) => {
              setThrows(updatedThrows);
              setLoadingData(false);
            },
            (error) => {
              console.error("Failed to subscribe to throws:", error);
              setThrows([]);
              setLoadingData(false);
            }
          );

          return () => {
            if (typeof unsubscribeThrows === 'function') unsubscribeThrows();
          };
        } catch (err) {
          console.error("Error loading user data:", err);
          setLoadingData(false);
        }
      } else {
        setSettings(null);
        setThrows([]);
        setLoadingData(false);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [dbConfigured]);

  const handleExport = async () => {
    if (exporting || throws.length === 0) return;
    setExporting(true);
    try {
      await exportChallengeToZip(throws, settings);
    } catch (err) {
      console.error(err);
      alert("Failed to export logs. Ensure you have photos uploaded properly.");
    } finally {
      setExporting(false);
    }
  };

  // If Firebase config is missing, show onboarding configuration screen
  if (!dbConfigured) {
    return <Onboarding />;
  }

  // Show loading indicator during Auth validation
  if (authLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--terracotta)', animation: 'spin 1.5s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Firing up the Kiln...</p>
      </div>
    );
  }

  // If user is not authenticated, show sign-in form
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
        {localStorage.getItem("throwing_log_use_mock_db") === "true" && (
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <span style={{ background: 'var(--ochre-light)', color: 'var(--ochre)', padding: '0.4rem 1rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 600 }}>
              Running in local sandbox mode
            </span>
            <button 
              onClick={() => mockSignIn()} 
              className="btn btn-secondary" 
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', marginLeft: '0.5rem', borderRadius: '8px' }}
            >
              Sign In to Demo Sandbox
            </button>
          </div>
        )}
        <Auth />
      </div>
    );
  }

  // Show loading during user settings & logs fetch
  if (loadingData || !settings) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--terracotta)', animation: 'spin 1.5s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Centering Clay...</p>
      </div>
    );
  }

  // Render view
  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard throws={throws} settings={settings} user={user} />;
      case 'log':
        return <LogThrow settings={settings} user={user} onNavigateToHistory={() => setCurrentView('history')} />;
      case 'history':
        return <History throws={throws} settings={settings} user={user} />;
      case 'settings':
        return <Settings settings={settings} user={user} onSettingsUpdate={setSettings} />;
      default:
        return <Dashboard throws={throws} settings={settings} user={user} />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar - Desktop Navigation */}
      <aside className="glass" style={{
        position: 'fixed',
        left: 0, top: 0, bottom: 0,
        width: '5.5rem',
        display: 'none',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem 0',
        zIndex: 100,
        borderRadius: '0 24px 24px 0',
        borderLeft: 'none'
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--terracotta)',
          color: 'white',
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          marginBottom: '3rem'
        }}>
          <Flame size={20} />
        </div>

        {/* Tab Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
          {[
            { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
            { id: 'log', icon: <PlusCircle size={20} />, label: 'Log Throw' },
            { id: 'history', icon: <HistoryIcon size={20} />, label: 'History' },
            { id: 'settings', icon: <SettingsIcon size={20} />, label: 'Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id)}
              style={{
                background: currentView === tab.id ? 'var(--terracotta-light)' : 'none',
                color: currentView === tab.id ? 'var(--terracotta)' : 'var(--text-secondary)',
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0',
                transition: 'var(--transition-smooth)'
              }}
              title={tab.label}
            >
              {tab.icon}
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', alignItems: 'center' }}>
          {/* Export Zip */}
          <button
            onClick={handleExport}
            disabled={exporting || throws.length === 0}
            style={{
              background: 'none',
              border: 'none',
              cursor: throws.length === 0 ? 'not-allowed' : 'pointer',
              color: 'var(--text-secondary)',
              opacity: throws.length === 0 ? 0.4 : 1,
              padding: '0'
            }}
            title="Export ZIP log"
          >
            {exporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0' }}
            title="Toggle theme"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </aside>

      {/* Top Navbar - Mobile View */}
      <header className="glass" style={{
        position: 'sticky',
        top: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1.25rem',
        zIndex: 90,
        borderWidth: '0 0 1px 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Flame size={18} style={{ color: 'var(--terracotta)' }} />
          <span className="serif-title" style={{ fontWeight: 700, fontSize: '1.15rem' }}>Centrd</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Export Zip */}
          <button
            onClick={handleExport}
            disabled={exporting || throws.length === 0}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '0.25rem',
              opacity: throws.length === 0 ? 0.4 : 1
            }}
            title="Export ZIP log"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={18} />}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem' }}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="content-area">
        {renderActiveView()}
      </main>

      {/* Bottom Nav Bar - Mobile View */}
      <nav className="glass" style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: '4.5rem',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 95,
        borderRadius: '24px 24px 0 0',
        borderWidth: '1px 0 0 0'
      }}>
        {[
          { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Stats' },
          { id: 'log', icon: <PlusCircle size={20} />, label: 'Log' },
          { id: 'history', icon: <HistoryIcon size={20} />, label: 'History' },
          { id: 'settings', icon: <SettingsIcon size={20} />, label: 'Settings' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setCurrentView(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              color: currentView === tab.id ? 'var(--terracotta)' : 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: currentView === tab.id ? 700 : 500,
              gap: '0.2rem',
              flex: 1,
              height: '100%',
              padding: '0',
              cursor: 'pointer'
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Additional media query for responsive sidebar toggling */}
      <style>{`
        @media (min-width: 768px) {
          aside { display: flex !important; }
          header { display: none !important; }
          nav.glass { display: none !important; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
