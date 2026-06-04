import React from 'react';
import { MapPin } from 'lucide-react';

export default function JobCard({ job, user, onApply, isApplied }) {
  const userKeywords = user.profile.keywords.map(k => k.toLowerCase());
  const matchedKeywords = job.keywords.filter(jk => userKeywords.includes(jk.toLowerCase()));
  const matchPercentage = Math.round((matchedKeywords.length / Math.max(job.keywords.length, 1)) * 100);

  return (
    <div style={{
      background: '#2a3f4d',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #3a5060',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start',
      color: '#e8eef7'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '700', margin: 0, color: '#e8eef7', marginBottom: '4px' }}>{job.title}</h3>
          <p style={{ fontSize: '13px', color: '#9db3c4', margin: 0 }}>
            Posted {new Date(job.postedDate).toLocaleDateString()}
          </p>
        </div>

        <p style={{ fontSize: '13px', color: '#9db3c4', margin: '12px 0', lineHeight: '1.5' }}>{job.description}</p>

        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#9db3c4', marginBottom: '12px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}><MapPin size={14} /> {job.location}</span>
          <span>{job.salary}</span>
          {job.workMode && <span style={{ textTransform: 'capitalize' }}>• {job.workMode}</span>}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {job.keywords.map((kw, i) => {
            const isMatched = userKeywords.includes(kw.toLowerCase());
            return (
              <span key={i} style={{
                background: isMatched ? '#1a5a4a' : '#3a5060',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: '600',
                color: isMatched ? '#5cecc4' : '#7ec9d9'
              }}>
                {kw}
              </span>
            );
          })}
        </div>
      </div>

      <div style={{ marginLeft: '20px', textAlign: 'right', minWidth: '100px' }}>
        <div style={{ fontSize: '28px', fontWeight: '700', color: matchPercentage >= 50 ? '#0d7377' : '#7ec9d9' }}>
          {matchPercentage}%
        </div>
        <p style={{ fontSize: '12px', color: '#9db3c4', margin: '4px 0' }}>Match</p>
        {onApply && (
          <button
            onClick={() => onApply(job.id)}
            disabled={isApplied}
            style={{
              width: '100%',
              padding: '8px 12px',
              marginTop: '8px',
              background: isApplied ? '#3a5060' : '#0d7377',
              color: isApplied ? '#9db3c4' : 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isApplied ? 'default' : 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            {isApplied ? '✓ Applied' : 'Apply Now'}
          </button>
        )}
      </div>
    </div>
  );
}
