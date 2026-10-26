import { useState } from 'react';
import { useStats, useAuthorities, useAssignees } from './hooks/useQueries';
import { DirectivesView } from './components/DirectivesView';
import { ActionItemsView } from './components/ActionItemsView';
import type { StatsOverview } from './types';

type TabId = 'directives' | 'action-items';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('directives');
  const { data: statsData } = useStats();
  const { data: authData } = useAuthorities();
  const { data: assigneeData } = useAssignees();

  const stats = statsData?.data;
  const authorities = authData?.data || [];
  const assignees = assigneeData?.data || [];

  return (
    <div className="app-shell">
      <div className="app-topbar">
        <div className="app-topbar__inner">
          <div className="app-topbar__status">
            <span className="pulse-indicator"></span>
            <span className="app-topbar__text">AI Regulatory Ingestion Engine: <strong>ACTIVE</strong></span>
            <span className="app-topbar__sep">•</span>
            <span className="app-topbar__text">Neon Cloud DB: <strong>CONNECTED</strong></span>
          </div>
          <div className="app-topbar__user">
            <span className="user-badge">
              <span className="user-avatar">SC</span>
              <span>Dr. Sarah Chen • Regulatory Affairs</span>
            </span>
          </div>
        </div>
      </div>

      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__brand">
            <a href="https://www.artixio.com" target="_blank" rel="noreferrer" className="app-header__logo-link">
              <img
                src="https://www.artixio.com/wp-content/uploads/2025/02/Logo-Dark@2x-300x152.png"
                alt="Artixio Regulatory Intelligence"
                className="app-header__logo-img"
              />
            </a>
            <div className="app-header__divider"></div>
            <div className="app-header__title-group">
              <h1 className="app-header__title">Regulatory Intelligence Triage</h1>
              <p className="app-header__subtitle">Hypothesis-to-Insight Decision Layer</p>
            </div>
          </div>

          <nav className="tab-bar">
            <button
              className={`tab-bar__item ${activeTab === 'directives' ? 'tab-bar__item--active' : ''}`}
              onClick={() => setActiveTab('directives')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>Compliance Directives</span>
              {stats && <span className="tab-count">{stats.totalDirectives}</span>}
            </button>
            <button
              className={`tab-bar__item ${activeTab === 'action-items' ? 'tab-bar__item--active' : ''}`}
              onClick={() => setActiveTab('action-items')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <span>Action Items Triage</span>
              {stats && (
                <span className={`tab-count ${stats.pendingActions > 0 ? 'tab-count--pending' : ''}`}>
                  {stats.pendingActions}
                </span>
              )}
            </button>
          </nav>
        </div>

        {stats && <StatsCards stats={stats} />}
      </header>

      <main className="app-main">
        {activeTab === 'directives' ? (
          <DirectivesView authorities={authorities} />
        ) : (
          <ActionItemsView assignees={assignees} />
        )}
      </main>

      <footer className="artixio-footer">
        <div className="artixio-footer__inner">
          <div className="artixio-footer__col-brand">
            <img
              src="https://www.artixio.com/wp-content/uploads/2025/02/Logo-Light@2x-300x152.png"
              alt="Artixio"
              className="artixio-footer__logo"
            />
            <p className="artixio-footer__desc">
              AI-native regulatory intelligence software transforming dense pharmaceutical data
              into decisive compliance actions for life sciences teams worldwide.
            </p>
          </div>

          <div className="artixio-footer__col">
            <h4 className="artixio-footer__heading">Regulatory Feeds</h4>
            <ul className="artixio-footer__links">
              <li><span className="feed-tag">FDA</span> United States (CDER/CBER)</li>
              <li><span className="feed-tag">EMA</span> European Union</li>
              <li><span className="feed-tag">PMDA</span> Japan MHLW</li>
              <li><span className="feed-tag">Health Canada</span> Canada HPFB</li>
              <li><span className="feed-tag">MHRA</span> United Kingdom</li>
            </ul>
          </div>

          <div className="artixio-footer__col">
            <h4 className="artixio-footer__heading">Pipeline Intelligence</h4>
            <div className="artixio-footer__meta-box">
              <div className="meta-row">
                <span className="meta-label">System Architecture:</span>
                <span className="meta-val">Decoupled Monorepo</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Relational Engine:</span>
                <span className="meta-val">PostgreSQL 16 (Neon)</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Data Quality Layer:</span>
                <span className="meta-val">Active Auto-Audit</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">API Latency:</span>
                <span className="meta-val meta-val--fast">~24ms</span>
              </div>
            </div>
          </div>
        </div>

        <div className="artixio-footer__bottom">
          <div className="artixio-footer__copy">
            © {new Date().getFullYear()} Artixio Inc. All rights reserved. Confidential & Proprietary.
          </div>
          <div className="artixio-footer__tagline">
            Accelerating Life Sciences Compliance • Safe & Efficient Drug Delivery
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatsCards({ stats }: { stats: StatsOverview }) {
  return (
    <div className="stats-cards-container">
      <div className="stat-card">
        <div className="stat-card__header">
          <span className="stat-card__title">Total Directives</span>
          <span className="stat-card__icon stat-card__icon--purple">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </span>
        </div>
        <div className="stat-card__body">
          <span className="stat-card__value">{stats.totalDirectives}</span>
          <span className="stat-card__badge stat-card__badge--neutral">Active Global Feeds</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card__header">
          <span className="stat-card__title">Pending Action Items</span>
          <span className="stat-card__icon stat-card__icon--amber">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </span>
        </div>
        <div className="stat-card__body">
          <span className="stat-card__value stat-card__value--amber">{stats.pendingActions}</span>
          <span className="stat-card__badge stat-card__badge--amber">Requires Triage</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card__header">
          <span className="stat-card__title">Critical Directives (P0)</span>
          <span className="stat-card__icon stat-card__icon--red">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </span>
        </div>
        <div className="stat-card__body">
          <span className="stat-card__value stat-card__value--red">{stats.criticalDirectives}</span>
          <span className="stat-card__badge stat-card__badge--red">Immediate Attention</span>
        </div>
      </div>

      <div className="stat-card stat-card--highlight">
        <div className="stat-card__header">
          <span className="stat-card__title">Data Anomalies</span>
          <span className="stat-card__icon stat-card__icon--purple-gradient">⚠️</span>
        </div>
        <div className="stat-card__body">
          <span className="stat-card__value stat-card__value--purple">{stats.totalAnomalies}</span>
          <span className="stat-card__badge stat-card__badge--purple">
            {stats.anomalyDirectives} dir • {stats.anomalyActionItems} items
          </span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card__header">
          <span className="stat-card__title">Overdue Tasks</span>
          <span className="stat-card__icon stat-card__icon--orange">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </span>
        </div>
        <div className="stat-card__body">
          <span className="stat-card__value stat-card__value--orange">{stats.overdueActions}</span>
          <span className="stat-card__badge stat-card__badge--orange">SLA Breached</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card__header">
          <span className="stat-card__title">Resolved Items</span>
          <span className="stat-card__icon stat-card__icon--green">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </span>
        </div>
        <div className="stat-card__body">
          <span className="stat-card__value stat-card__value--green">{stats.resolvedActions}</span>
          <span className="stat-card__badge stat-card__badge--green">Compliance Closed</span>
        </div>
      </div>
    </div>
  );
}
