import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Activity as ActivityType } from '../../types';
import './homepage_original.css';

export const HomePage: React.FC = () => {
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);

  // Exact fallback activities matching the database and reference screenshot
  const defaultActivities: ActivityType[] = [
    {
      id: '50ece253-5c1f-4912-805d-a34f5dfe24f4',
      title: 'ONE HEALTH WEEK',
      description: '',
      image_url:
        'https://tuujlqrfyuazvbvoribz.supabase.co/storage/v1/object/public/activity_images/activity_1792260764937.jpg',
      created_at: '2026-10-17T18:12:48.308926+00',
    },
    {
      id: '54638d43-4ba2-4e5f-834d-11eaa23abc36',
      title: 'Brigada Eskwela',
      description: '',
      image_url:
        'https://tuujlqrfyuazvbvoribz.supabase.co/storage/v1/object/public/activity_images/activity_1792260419676.jpg',
      created_at: '2026-10-17T18:07:03.855723+00',
    },
    {
      id: 'd1d6490d-2c0b-4711-8a31-bb1064e49c89',
      title: 'Sport Fest',
      description: 'SportFest 2026',
      image_url:
        'https://tuujlqrfyuazvbvoribz.supabase.co/storage/v1/object/public/activity_images/activity_1792258803055.jpg',
      created_at: '2026-10-17T17:40:06.808383+00',
    },
  ];

  useEffect(() => {
    async function loadActivities() {
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6);

        if (!error && data && data.length > 0) {
          setActivities(data);
        } else {
          setActivities(defaultActivities);
        }
      } catch (err) {
        console.warn('Could not fetch activities from Supabase:', err);
        setActivities(defaultActivities);
      }
    }

    loadActivities();
  }, []);

  const formatActivityDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${month}/${day}/${year}`;
    } catch {
      return '10/18/2026';
    }
  };

  const displayActivities = activities.length > 0 ? activities : defaultActivities;

  return (
    <div className="original-homepage-container">
      {/* 1. HERO SECTION */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="matatag-hero-badge">
            <i className="fas fa-graduation-cap"></i> DEPED MATATAG · BANSANG MAKABATA, BATANG MAKABANSA
          </div>
          <h1 className="hero-title">
            Welcome to <br />
            <span>Placido L. Señor National <br /> High School</span>
          </h1>
          <p className="hero-sub">
            Your seamless gateway to academic enrollment and management
          </p>
          <div className="hero-buttons">
            <Link to="/enroll" className="btn-enroll">
              <i className="fas fa-pen-fancy"></i> Enroll Now
            </Link>
          </div>
        </div>
      </section>

      {/* 2. LATEST ACTIVITIES SECTION */}
      <section className="activities-section" id="activities">
        <div className="container">
          <div className="features-header-box">
            <span className="features-eyebrow">
              <i className="fas fa-images"></i> School Highlights
            </span>
            <h2 className="section-title">
              Latest <span className="highlight-gold">Activities</span>
            </h2>
            <p className="section-subtitle">
              Explore the recent events, programs, and achievements at Placido L. Señor National High School.
            </p>
          </div>

          <div className="activities-grid">
            {displayActivities.slice(0, 3).map((act) => (
              <div
                key={act.id}
                onClick={() => setSelectedActivity(act)}
                className="activity-home-card"
                style={{ cursor: 'pointer' }}
              >
                <div style={{ height: '320px', position: 'relative', background: '#0d112d', overflow: 'hidden' }}>
                  {/* Activity Image */}
                  <img
                    src={act.image_url}
                    alt={act.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                    className="hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/pictures/logo sa skwelahan.png';
                    }}
                  />

                  {/* Dark Gradient Overlay (Top-Right for Title with bottom-left rounded corner) */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      padding: '1.25rem 1.5rem',
                      background: 'linear-gradient(to bottom left, rgba(13, 17, 50, 0.9) 0%, rgba(13, 17, 50, 0.3) 60%, transparent 100%)',
                      borderBottomLeftRadius: '30px',
                      pointerEvents: 'none',
                      zIndex: 2,
                      maxWidth: '80%',
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        color: '#ffffff',
                        lineHeight: 1.2,
                        textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                        textAlign: 'right',
                        wordWrap: 'break-word',
                        fontFamily: 'Inter, system-ui, sans-serif',
                      }}
                    >
                      {act.title}
                    </h3>
                  </div>

                  {/* Dark Gradient Overlay (Bottom for Description) */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '1.25rem 1.5rem',
                      background: 'linear-gradient(to top, rgba(13, 17, 50, 0.95) 0%, rgba(13, 17, 50, 0.5) 60%, transparent 100%)',
                      pointerEvents: 'none',
                      zIndex: 2,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.85rem',
                        color: '#e2e8f0',
                        lineHeight: 1.4,
                        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {act.description && act.description.trim().length > 0
                        ? act.description
                        : 'No description provided.'}
                    </p>
                  </div>

                  {/* Date Badge (Top Left) */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backdropFilter: 'blur(4px)',
                      zIndex: 2,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <i className="far fa-calendar"></i> {formatActivityDate(act.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. WHY CHOOSE PLSNHS SECTION */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="features-header-box">
            <span className="features-eyebrow">
              <i className="fas fa-sparkles"></i> Excellence in Education
            </span>
            <h2 className="section-title">
              Why Choose <span className="highlight-gold">PLSNHS</span>
            </h2>
            <p className="section-subtitle">
              Placido L. Señor National High School · Delivering streamlined
              enrollment, academic excellence, and trusted digital governance.
            </p>
          </div>
          <div className="features-row">
            {/* Feature 1 */}
            <div className="feature-card" data-feature="enrollment">
              <div className="feature-icon-wrapper icon-blue">
                <i className="fas fa-file-signature"></i>
              </div>
              <h3>Easy Enrollment</h3>
              <p>Streamlined online enrollment process for students and parents with instant validation.</p>
              <span className="feature-badge"><i className="fas fa-bolt"></i> Fast & 100% Online</span>
            </div>

            {/* Feature 2 */}
            <div className="feature-card" data-feature="tracking">
              <div className="feature-icon-wrapper icon-amber">
                <i className="fas fa-chart-line"></i>
              </div>
              <h3>Real-time Tracking</h3>
              <p>Monitor admission status, document verification, and academic progress seamlessly.</p>
              <span className="feature-badge"><i className="fas fa-sync-alt"></i> Live Status Updates</span>
            </div>

            {/* Feature 3 */}
            <div className="feature-card" data-feature="security">
              <div className="feature-icon-wrapper icon-emerald">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3>Secure System</h3>
              <p>Your personal records and credentials are protected with industry-standard data security.</p>
              <span className="feature-badge"><i className="fas fa-shield-check"></i> DepEd Compliant</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ABOUT SECTION */}
      <section className="about-section" id="about">
        <div className="container">
          <div className="about-stats-wrap">
            <div className="about-text">
              <h2>About PLSNHS</h2>
              <p>
                PLSNHS, Integrated Development of an Educational Management System For Placido L.
                Señor National High School is a modern online enrollment system. We streamline
                the admission process, making it easier for students, parents, and administrators to manage enrollments efficiently.
              </p>
              <ul className="about-list">
                <li><i className="fas fa-check-circle"></i> Paperless enrollment process</li>
                <li><i className="fas fa-check-circle"></i> Automated status notifications</li>
                <li><i className="fas fa-check-circle"></i> Integrated document tracking</li>
                <li><i className="fas fa-check-circle"></i> 24/7 accessibility</li>
              </ul>
            </div>
            <div className="stats-group">
              <div className="stat-item">
                <span className="stat-number">500+</span>
                <span className="stat-label">Students Enrolled</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">50+</span>
                <span className="stat-label">Staff Members</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">98%</span>
                <span className="stat-label">Satisfaction Rate</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ACTIVITY DETAIL MODAL */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl border border-white/15 bg-[#16214a] p-6 shadow-2xl text-white">
            <button
              onClick={() => setSelectedActivity(null)}
              className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-slate-300 hover:bg-white/20 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="overflow-hidden rounded-2xl border border-white/10 mb-4 max-h-96">
              <img
                src={selectedActivity.image_url}
                alt={selectedActivity.title}
                className="w-full h-auto object-cover max-h-96"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/pictures/logo sa skwelahan.png';
                }}
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold mb-2">
              <Calendar className="h-4 w-4" />
              <span>{formatActivityDate(selectedActivity.created_at)}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight mb-3">
              {selectedActivity.title}
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed">
              {selectedActivity.description && selectedActivity.description.trim().length > 0
                ? selectedActivity.description
                : 'No additional details provided for this activity.'}
            </p>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedActivity(null)}
                className="rounded-full bg-white/10 hover:bg-white/20 px-6 py-2 text-xs font-bold text-white transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
