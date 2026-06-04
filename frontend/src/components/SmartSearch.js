import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';

export default function SmartSearch({ allJobs, onSearch }) {
  const [searchInput, setSearchInput] = useState('');
  const [lockedKeywords, setLockedKeywords] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedWorkModes, setSelectedWorkModes] = useState([]);

  // Extract all unique keywords from all jobs
  const allKeywords = useMemo(() => {
    const keywords = new Set();
    allJobs.forEach(job => {
      job.keywords.forEach(kw => keywords.add(kw));
    });
    return Array.from(keywords).sort();
  }, [allJobs]);

  // Generate suggestions based on input
  const handleInputChange = (value) => {
    setSearchInput(value);
    
    if (value.length >= 2) {
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
  const addKeyword = (keyword) => {
    if (!lockedKeywords.includes(keyword)) {
      setLockedKeywords([...lockedKeywords, keyword]);
    }
    setSearchInput('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Remove a locked keyword
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

  // Filter jobs based on locked keywords and work modes
  const filteredJobs = useMemo(() => {
    let results = allJobs;

    // Filter by keywords (ALL locked keywords must be present)
    if (lockedKeywords.length > 0) {
      results = results.filter(job => {
        const jobKeywordsLower = job.keywords.map(k => k.toLowerCase());
        return lockedKeywords.every(kw =>
          jobKeywordsLower.includes(kw.toLowerCase())
        );
      });
    }

    // Filter by work modes (at least one selected mode)
    if (selectedWorkModes.length > 0) {
      results = results.filter(job =>
        selectedWorkModes.includes(job.workMode)
      );
    }

    return results;
  }, [lockedKeywords, selectedWorkModes, allJobs]);

  // Call parent callback with filtered results
  React.useEffect(() => {
    onSearch(filteredJobs);
  }, [filteredJobs, onSearch]);

  return (
    <div style={{ marginBottom: '30px' }}>
      {/* Search Input with Autocomplete */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#1a252f',
          border: '1px solid #3a5060',
          borderRadius: '8px',
          padding: '10px 16px',
          position: 'relative'
        }}>
          <Search size={18} style={{ color: '#7ec9d9', marginRight: '12px' }} />
          
          {/* Locked Keywords Display */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginRight: '8px' }}>
            {lockedKeywords.map(kw => (
              <div
                key={kw}
                style={{
                  background: '#0d7377',
                  color: 'white',
                  padding: '6px 10px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {kw}
                <button
                  onClick={() => removeKeyword(kw)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Input Field */}
          <input
            type="text"
            placeholder="Type 2+ chars to search keywords..."
            value={searchInput}
            onChange={(e) => handleInputChange(e.target.value)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#e8eef7',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#2a3f4d',
            border: '1px solid #3a5060',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 100,
            marginTop: '-1px'
          }}>
            {suggestions.map(suggestion => (
              <button
                key={suggestion}
                onClick={() => addKeyword(suggestion)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid #3a5060',
                  textAlign: 'left',
                  color: '#e8eef7',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#3a5060'}
                onMouseOut={(e) => e.target.style.background = 'none'}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Work Mode Filter */}
      <div style={{
        background: '#2a3f4d',
        border: '1px solid #3a5060',
        borderRadius: '8px',
        padding: '12px 16px'
      }}>
        <p style={{ fontSize: '12px', fontWeight: '600', color: '#9db3c4', margin: '0 0 12px 0', textTransform: 'uppercase' }}>
          Work Mode
        </p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {['full-time', 'part-time', 'hybrid', 'casual'].map(mode => (
            <label
              key={mode}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                color: '#e8eef7'
              }}
            >
              <input
                type="checkbox"
                checked={selectedWorkModes.includes(mode)}
                onChange={() => toggleWorkMode(mode)}
                style={{
                  cursor: 'pointer',
                  accentColor: '#0d7377'
                }}
              />
              <span style={{ textTransform: 'capitalize', fontSize: '13px' }}>
                {mode}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <p style={{
        fontSize: '13px',
        color: '#9db3c4',
        marginTop: '12px',
        margin: '12px 0 0 0'
      }}>
        Found {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
        {lockedKeywords.length > 0 && ` with ${lockedKeywords.join(', ')}`}
        {selectedWorkModes.length > 0 && ` • ${selectedWorkModes.join(', ')}`}
      </p>
    </div>
  );
}
