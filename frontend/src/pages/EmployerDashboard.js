import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LogOut, Plus, Briefcase, X, MapPin, Phone, Mail } from 'lucide-react';

export default function EmployerDashboard({ user, onLogout, apiUrl }) {
  const [activeTab, setActiveTab] = useState('listings');
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [showCandidateProfile, setShowCandidateProfile] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState({});
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [recommendedCandidates, setRecommendedCandidates] = useState({});
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    keywords: '',
    salary: '',
    location: ''
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${apiUrl}/jobs/employer/${user.id}`);
      setJobs(response.data);
      
      // Fetch applications for each job
      for (const job of response.data) {
        const appResponse = await axios.get(`${apiUrl}/applications/job/${job.id}`);
        setApplications(prev => ({ ...prev, [job.id]: appResponse.data }));
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${apiUrl}/jobs`, {
        employerId: user.id,
        ...newJob
      });
      setNewJob({ title: '', description: '', keywords: '', salary: '', location: '' });
      setShowNewJobModal(false);
      fetchJobs();
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      await axios.delete(`${apiUrl}/jobs/${jobId}`);
      fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const fetchRecommendedCandidates = async (jobId) => {
    try {
      const response = await axios.get(`${apiUrl}/recommendations/candidates/${jobId}`);
      setRecommendedCandidates(prev => ({ ...prev, [jobId]: response.data }));
    } catch (error) {
      console.error('Error fetching recommended candidates:', error);
    }
  };

  const toggleMembership = async () => {
    try {
      const response = await axios.put(`${apiUrl}/users/${user.id}`, {
        hasMembership: !user.hasMembership
      });
      if (response.data.success) {
        user.hasMembership = !user.hasMembership;
      }
    } catch (error) {
      console.error('Error updating membership:', error);
    }
  };

  const openCandidatesModal = async (job) => {
    setSelectedJob(job);
    await fetchRecommendedCandidates(job.id);
    setShowCandidatesModal(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f0f0' }}>
      {/* Header */}
      <div style={{ background: '#1a252f', color: '#e8eef7', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>JobMatch Employer</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>{user.company}</p>
          <button 
            onClick={toggleMembership}
            style={{
              marginTop: '8px',
              padding: '6px 12px',
              background: user.hasMembership ? '#1a5a4a' : '#3a2a2a',
              color: user.hasMembership ? '#5cecc4' : '#c9b0b0',
              border: `1px solid ${user.hasMembership ? '#5cecc4' : '#7a6a6a'}`,
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {user.hasMembership ? '✓ Premium Member' : '○ Free Member'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button onClick={() => setShowNewJobModal(true)} style={{ background: '#2a3f4d', color: '#e8eef7', border: '1px solid #3a5060', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Plus size={16} /> New Job
          </button>
          <button onClick={onLogout} style={{ background: '#2a3f4d', color: '#e8eef7', border: '1px solid #3a5060', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid #e0e0e0' }}>
          {['listings', 'recommendations'].map(tab => (
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
              {tab === 'listings' && '📋 Job Listings'}
              {tab === 'recommendations' && '⭐ Top Candidates'}
            </button>
          ))}
        </div>

        {/* Job Listings */}
        {activeTab === 'listings' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: '#1a1a1a' }}>Your Job Listings</h2>
            {jobs.length > 0 ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {jobs.map(job => {
                  const jobApps = applications[job.id] || [];
                  return (
                    <div key={job.id} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e0e0e0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <div>
                          <h3 style={{ fontSize: '17px', fontWeight: '700', margin: 0, color: '#1a1a1a' }}>{job.title}</h3>
                          <p style={{ fontSize: '13px', color: '#999', margin: '4px 0' }}>Posted {new Date(job.postedDate).toLocaleDateString()}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => openCandidatesModal(job)}
                            style={{ background: '#667eea', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                            {jobApps.length} Applicant{jobApps.length !== 1 ? 's' : ''}
                          </button>
                          <button 
                            onClick={() => handleDeleteJob(job.id)}
                            style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                            Delete
                          </button>
                        </div>
                      </div>
                      <p style={{ fontSize: '13px', color: '#666', margin: '12px 0', lineHeight: '1.5' }}>{job.description}</p>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                        <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}><MapPin size={14} /> {job.location}</span>
                        <span>{job.salary}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {job.keywords.map((kw, i) => (
                          <span key={i} style={{ background: '#f0f0f0', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: '600', color: '#667eea' }}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px' }}>
                <Briefcase size={40} style={{ margin: '0 auto 16px', color: '#ccc' }} />
                <p style={{ color: '#999', fontSize: '15px' }}>No job listings yet. Create your first job posting!</p>
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {activeTab === 'recommendations' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: '#1a1a1a' }}>Top Candidates For Your Jobs</h2>
            {jobs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px' }}>
                <p style={{ color: '#999', fontSize: '15px' }}>Create a job listing to see recommended candidates.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '24px' }}>
                {jobs.map(job => {
                  const candidates = recommendedCandidates[job.id] || [];
                  return (
                    <div key={job.id}>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#1a1a1a' }}>
                        {job.title} ({candidates.length} match{candidates.length !== 1 ? 'es' : ''})
                      </h3>
                      {candidates.length > 0 ? (
                        <div style={{ display: 'grid', gap: '12px' }}>
                          {candidates.slice(0, 5).map(candidate => (
                            <div key={candidate.id} style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <h4 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#1a1a1a' }}>{candidate.profile.name}</h4>
                                <p style={{ fontSize: '13px', color: '#666', margin: '4px 0' }}>{candidate.profile.title}</p>
                                <div style={{ fontSize: '12px', color: '#999', marginTop: '8px', display: 'flex', gap: '12px' }}>
                                  <span>{candidate.profile.location}</span>
                                  <span>{candidate.profile.phone}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                                  {candidate.match.matched.map((kw, i) => (
                                    <span key={i} style={{ background: '#d1fae5', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', color: '#059669' }}>
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>{candidate.match.percentage}%</div>
                                <p style={{ fontSize: '12px', color: '#999', margin: '4px 0' }}>Match</p>
                                <button 
                                  onClick={() => { setSelectedCandidate(candidate); setShowCandidateProfile(true); }}
                                  style={{ background: '#667eea', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', marginTop: '8px' }}>
                                  View Profile
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '13px', color: '#999' }}>No matching candidates yet.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Job Modal */}
      {showNewJobModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '100%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Create New Job Listing</h2>
              <button onClick={() => setShowNewJobModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateJob}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>Job Title</label>
                <input type="text" value={newJob.title} onChange={(e) => setNewJob({...newJob, title: e.target.value})} className="form-input" style={{ width: '100%', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} required />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>Description</label>
                <textarea value={newJob.description} onChange={(e) => setNewJob({...newJob, description: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', minHeight: '100px', fontFamily: 'inherit' }} required />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>Keywords (comma-separated)</label>
                <input type="text" value={newJob.keywords} onChange={(e) => setNewJob({...newJob, keywords: e.target.value})} placeholder="e.g., React, Node.js, JavaScript" style={{ width: '100%', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} required />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>Salary Range</label>
                <input type="text" value={newJob.salary} onChange={(e) => setNewJob({...newJob, salary: e.target.value})} placeholder="e.g., $100k - $150k" style={{ width: '100%', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} required />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>Location</label>
                <input type="text" value={newJob.location} onChange={(e) => setNewJob({...newJob, location: e.target.value})} placeholder="e.g., San Francisco, CA" style={{ width: '100%', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} required />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" style={{ flex: 1, padding: '12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                  Create Job
                </button>
                <button type="button" onClick={() => setShowNewJobModal(false)} style={{ flex: 1, padding: '12px', background: '#f5f5f5', color: '#666', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidates Modal */}
      {showCandidatesModal && selectedJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '30px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Applicants</h2>
                <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>{selectedJob.title}</p>
              </div>
              <button onClick={() => setShowCandidatesModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            {(applications[selectedJob.id] || []).length > 0 ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                {(applications[selectedJob.id] || []).map(app => (
                  <div key={app.id} style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#1a1a1a' }}>{app.employee.profile.name}</h4>
                      <p style={{ fontSize: '13px', color: '#666', margin: '4px 0' }}>{app.employee.profile.title}</p>
                      <p style={{ fontSize: '12px', color: '#999', margin: '4px 0' }}>Applied {new Date(app.appliedDate).toLocaleDateString()}</p>
                    </div>
                    <button 
                      onClick={() => { setSelectedCandidate(app.employee); setShowCandidateProfile(true); }}
                      style={{ background: '#667eea', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                      View Profile
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#999' }}>No applications yet.</p>
            )}

            <button onClick={() => setShowCandidatesModal(false)} style={{ width: '100%', marginTop: '24px', padding: '12px', background: '#f5f5f5', color: '#666', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Candidate Profile Modal */}
      {showCandidateProfile && selectedCandidate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '100%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Candidate Profile</h2>
              <button onClick={() => setShowCandidateProfile(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#999', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Name</p>
              <p style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>{selectedCandidate.profile.name}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#999', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Title</p>
              <p style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>{selectedCandidate.profile.title}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#999', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Skills</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedCandidate.profile.keywords.map((kw, i) => (
                  <span key={i} style={{ background: '#f0f0f0', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', color: '#667eea' }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#999', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Contact</p>
              <p style={{ fontSize: '13px', margin: '4px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Phone size={14} /> {selectedCandidate.profile.phone}
              </p>
              <p style={{ fontSize: '13px', margin: '4px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Mail size={14} /> {selectedCandidate.email}
              </p>
              <p style={{ fontSize: '13px', margin: '4px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <MapPin size={14} /> {selectedCandidate.profile.location}
              </p>
            </div>

            <button onClick={() => setShowCandidateProfile(false)} style={{ width: '100%', padding: '12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
