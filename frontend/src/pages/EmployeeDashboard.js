import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LogOut, Search, User, Check, MapPin, Mail, Phone, X } from 'lucide-react';
import JobCard from '../components/JobCard';
import SmartSearch from '../components/SmartSearch';

export default function EmployeeDashboard({ user, onLogout, apiUrl }) {
  const [activeTab, setActiveTab] = useState('recommendations');
  const [allJobs, setAllJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [lockedKeywords, setLockedKeywords] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedWorkModes, setSelectedWorkModes] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchAppliedJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${apiUrl}/jobs`);
      setAllJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchAppliedJobs = async () => {
    try {
      const response = await axios.get(`${apiUrl}/applications/employee/${user.id}`);
      const jobs = response.data.map(app => app.job);
      setAppliedJobs(jobs);
    } catch (error) {
      console.error('Error fetching applied jobs:', error);
    }
  };

  // Get all unique keywords from all jobs for autocomplete
  const getAllKeywords = () => {
    const keywordSet = new Set();
    allJobs.forEach(job => {
      job.keywords.forEach(kw => keywordSet.add(kw));
    });
    return Array.from(keywordSet).sort();
  };

  // Handle search input and show suggestions
  const handleSearchInput = (value) => {
    setSearchInput(value);
    
    if (value.length >= 2) {
      const allKeywords = getAllKeywords();
      const filtered = allKeywords.filter(kw => 
        kw.toLowerCase().includes(value.toLowerCase()) &&
        !lockedKeywords.includes(kw)
      );
      setSuggestions(filtered.slice(0, 8));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Lock a keyword
  const lockKeyword = (keyword) => {
    if (!lockedKeywords.includes(keyword)) {
      setLockedKeywords([...lockedKeywords, keyword]);
    }
    setSearchInput('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Remove locked keyword
  const removeKeyword = (keyword) => {
    setLockedKeywords(lockedKeywords.filter(kw => kw !== keyword));
  };

  // Toggle work mode filter
  const toggleWorkMode = (mode) => {
    if (selectedWorkModes.includes(mode)) {
      setSelectedWorkModes(selectedWorkModes.filter(m => m !== mode));
    } else {
      setSelectedWorkModes([...selectedWorkModes, mode]);
    }
  };

  // Calculate keyword match
  const calculateMatch = (jobKeywords) => {
    const userKeywords = user.profile.keywords.map(k => k.toLowerCase());
    const matchedKeywords = jobKeywords.filter(jk => userKeywords.includes(jk.toLowerCase()));
    return {
      count: matchedKeywords.length,
      percentage: Math.round((matchedKeywords.length / Math.max(jobKeywords.length, 1)) * 100),
      matched: matchedKeywords
    };
  };

  // Filter jobs based on locked keywords and work mode
  const filterJobs = (jobsToFilter) => {
    return jobsToFilter.filter(job => {
      if (lockedKeywords.length > 0) {
        const jobKeywords = job.keywords.map(k => k.toLowerCase());
        const hasAllKeywords = lockedKeywords.every(kw =>
          jobKeywords.includes(kw.toLowerCase())
        );
        if (!hasAllKeywords) return false;
      }

      if (selectedWorkModes.length > 0) {
        if (!selectedWorkModes.includes(job.workMode)) return false;
      }

      return true;
    });
  };

  // Get recommended jobs
  const recommendedJobs = allJobs
    .map(job => ({ ...job, match: calculateMatch(job.keywords) }))
    .sort((a, b) => b.match.count - a.match.count)
    .filter(job => job.match.count > 0);

  const membershipLimitedRecommendations = user.hasMembership 
    ? recommendedJobs 
    : recommendedJobs.slice(0, 7);

  // Get filtered search results
  const filteredSearchJobs = filterJobs(allJobs)
    .map(job => ({ ...job, match: calculateMatch(job.keywords) }));

  const handleApply = async (jobId) => {
    try {
      await axios.post(`${apiUrl}/applications`, {
        employeeId: user.id,
        jobId
      });
      fetchAppliedJobs();
    } catch (error) {
      console.error('Error applying to job:', error);
    }
  };

  const toggleMembership = async () => {
    try {
      const response = await axios.put(`${apiUrl}/users/${user.id}`, {
        hasMembership: !user.hasMembership
      });
      if (response.data.success) {
        // Update local user state
        user.hasMembership = !user.hasMembership;
        setShowProfileModal(false);
        // Refresh recommendations to show the limit change
        fetchJobs();
      }
    } catch (error) {
      console.error('Error updating membership:', error);
    }
  };

  const isApplied = (jobId) => appliedJobs.some(j => j.id === jobId);

  return (
    <div style={{ minHeight: '100vh', background: '#f0f0f0' }}>
      <div style={{ background: '#1a252f', color: '#e8eef7', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Beetroot</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.8 }}>Welcome, {user.profile.name}</p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button onClick={() => setShowProfileModal(true)} style={{ background: '#2a3f4d', color: '#e8eef7', border: '1px solid #3a5060', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <User size={16} /> Profile
          </button>
          <button onClick={onLogout} style={{ background: '#2a3f4d', color: '#e8eef7', border: '1px solid #3a5060', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid #e0e0e0' }}>
          {['recommendations', 'search', 'applied'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: activeTab === tab ? '#0d7377' : 'transparent',
                color: activeTab === tab ? 'white' : '#9db3c4',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                borderRadius: '8px 8px 0 0'
              }}
            >
              {tab === 'recommendations' && '⭐ Recommended'}
              {tab === 'search' && '🔍 Search'}
              {tab === 'applied' && '✓ Applied'}
            </button>
          ))}
        </div>

        {activeTab === 'recommendations' && (
          <div>
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Jobs For You</h2>
              {!user.hasMembership && (
                <span style={{ background: '#ffe8e8', color: '#c41c3b', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                  📦 Limited to 7 (upgrade for unlimited)
                </span>
              )}
            </div>
            {membershipLimitedRecommendations.length > 0 ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {membershipLimitedRecommendations.map(job => (
                  <JobCard key={job.id} job={job} user={user} onApply={handleApply} isApplied={isApplied(job.id)} />
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', background: '#2a3f4d', borderRadius: '12px', border: '1px solid #3a5060', color: '#e8eef7' }}>
                <p style={{ fontSize: '15px' }}>No matching jobs found. Update your profile keywords to see recommendations.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <div style={{ background: '#2a3f4d', border: '1px solid #3a5060', borderRadius: '8px', padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-start', minHeight: '45px' }}>
                  {lockedKeywords.map(kw => (
                    <div key={kw} style={{ background: '#0d7377', color: 'white', padding: '6px 10px', borderRadius: '16px', fontSize: '13px', fontWeight: '600', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {kw} <X size={14} style={{ cursor: 'pointer' }} onClick={() => removeKeyword(kw)} />
                    </div>
                  ))}

                  <input
                    type="text"
                    placeholder="Type 2+ characters to search keywords..."
                    value={searchInput}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onFocus={() => searchInput.length >= 2 && setShowSuggestions(true)}
                    style={{
                      flex: 1,
                      minWidth: '150px',
                      border: 'none',
                      background: 'transparent',
                      color: '#e8eef7',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                {showSuggestions && suggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#2a3f4d', border: '1px solid #3a5060', borderTop: 'none', borderRadius: '0 0 8px 8px', maxHeight: '250px', overflow: 'auto', zIndex: 100 }}>
                    {suggestions.map((suggestion, i) => (
                      <div
                        key={i}
                        onClick={() => lockKeyword(suggestion)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: i < suggestions.length - 1 ? '1px solid #3a5060' : 'none',
                          cursor: 'pointer',
                          color: '#7ec9d9',
                          fontSize: '14px'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#1a252f'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      >
                        {suggestion} ✓
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ background: '#2a3f4d', border: '1px solid #3a5060', borderRadius: '8px', padding: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#7ec9d9', marginBottom: '12px', textTransform: 'uppercase' }}>Work Mode Filter</p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {['full-time', 'part-time', 'hybrid', 'casual'].map(mode => (
                    <label key={mode} style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '14px', color: '#e8eef7' }}>
                      <input
                        type="checkbox"
                        checked={selectedWorkModes.includes(mode)}
                        onChange={() => toggleWorkMode(mode)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ textTransform: 'capitalize' }}>{mode}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {lockedKeywords.length > 0 || selectedWorkModes.length > 0 ? (
              <div>
                <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                  Found {filteredSearchJobs.length} job{filteredSearchJobs.length !== 1 ? 's' : ''}
                </p>
                {filteredSearchJobs.length > 0 ? (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {filteredSearchJobs.map(job => (
                      <JobCard key={job.id} job={job} user={user} onApply={handleApply} isApplied={isApplied(job.id)} />
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', background: '#2a3f4d', borderRadius: '12px', border: '1px solid #3a5060', color: '#e8eef7' }}>
                    <p style={{ fontSize: '15px' }}>No jobs match your search criteria.</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', background: '#2a3f4d', borderRadius: '12px', border: '1px solid #3a5060', color: '#e8eef7' }}>
                <p style={{ fontSize: '15px' }}>Lock keywords and/or select work modes to search for jobs...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'applied' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: '#1a1a1a' }}>Your Applications</h2>
            {appliedJobs.length > 0 ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {appliedJobs.map(job => (
                  <div key={job.id} style={{ background: '#2a3f4d', padding: '20px', borderRadius: '12px', border: '1px solid #3a5060' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: '700', margin: 0, color: '#e8eef7' }}>{job.title}</h3>
                        <p style={{ fontSize: '13px', color: '#9db3c4', margin: '4px 0' }}>Applied {new Date(job.postedDate).toLocaleDateString()}</p>
                      </div>
                      <Check size={20} style={{ color: '#5cecc4' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#9db3c4' }}>
                      <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}><MapPin size={14} /> {job.location}</span>
                      <span>{job.salary}</span>
                      <span style={{ textTransform: 'capitalize' }}>({job.workMode})</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', background: '#2a3f4d', borderRadius: '12px', border: '1px solid #3a5060', color: '#e8eef7' }}>
                <p style={{ fontSize: '15px' }}>You haven't applied to any jobs yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showProfileModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#2a3f4d', borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '100%', maxHeight: '80vh', overflow: 'auto', color: '#e8eef7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Your Profile</h2>
              <button onClick={() => setShowProfileModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e8eef7' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: '20px', padding: '12px', background: user.hasMembership ? '#1a5a4a' : '#3a2a2a', borderRadius: '8px', border: `1px solid ${user.hasMembership ? '#5cecc4' : '#7a6a6a'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '12px', color: user.hasMembership ? '#5cecc4' : '#c9b0b0', fontWeight: '600', textTransform: 'uppercase', margin: 0 }}>Membership Status</p>
                  <p style={{ fontSize: '15px', fontWeight: '700', margin: '4px 0 0 0' }}>{user.hasMembership ? '✓ Premium Member' : '○ Free Member'}</p>
                </div>
                <button
                  onClick={toggleMembership}
                  style={{
                    padding: '8px 16px',
                    background: user.hasMembership ? '#c41c3b' : '#0d7377',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {user.hasMembership ? 'Downgrade' : 'Upgrade'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#9db3c4', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Name</p>
              <p style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>{user.profile.name}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#9db3c4', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Title</p>
              <p style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>{user.profile.title}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#9db3c4', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Work Experience</p>
              <p style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>{user.profile.workExperience || 'Not specified'}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#9db3c4', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Preferred Work Mode</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(user.profile.preferredWorkMode || []).map((mode, i) => (
                  <span key={i} style={{ background: '#0d7377', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: '600', color: 'white', textTransform: 'capitalize' }}>
                    {mode}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#9db3c4', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Skills</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {user.profile.keywords.map((kw, i) => (
                  <span key={i} style={{ background: '#3a5060', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', color: '#7ec9d9' }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#9db3c4', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Contact</p>
              <p style={{ fontSize: '13px', margin: '4px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Phone size={14} /> {user.profile.phone}
              </p>
              <p style={{ fontSize: '13px', margin: '4px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Mail size={14} /> {user.email}
              </p>
              <p style={{ fontSize: '13px', margin: '4px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <MapPin size={14} /> {user.profile.location}
              </p>
            </div>

            <button onClick={() => setShowProfileModal(false)} style={{ width: '100%', padding: '12px', background: '#0d7377', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
