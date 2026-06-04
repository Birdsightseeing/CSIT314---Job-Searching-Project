import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const STORAGE_KEY = 'currentUser';
const NON_MEMBER_RECOMMENDATION_LIMIT = 10;
const NON_MEMBER_SEARCH_LIMIT = 10;

const WORKING_MODES = ['Remote', 'On-site', 'Hybrid'];
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Entry-level'];

const DEMO_ACCOUNTS = [
  { label: 'Employee', icon: '👤', email: 'john@example.com', password: 'pass123' },
  { label: 'Employer', icon: '🏢', email: 'tech@company.com', password: 'pass123' },
];

const SYNONYMS = {
  programmer: ['software engineer', 'developer', 'coder'],
  coder: ['programmer', 'developer', 'software engineer'],
  developer: ['software engineer', 'programmer', 'coder'],
  remote: ['work from home', 'wfh'],
  hybrid: ['flexible', 'remote and onsite'],
  onsite: ['on-site', 'office'],
};

function toArray(value) {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function clean(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s.-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function expandQuery(query) {
  const terms = clean(query).split(' ').filter(Boolean);
  const expanded = new Set(terms);
  terms.forEach((term) => (SYNONYMS[term] || []).forEach((item) => clean(item).split(' ').forEach((word) => expanded.add(word))));
  return Array.from(expanded);
}

function levenshtein(a, b) {
  if (!a || !b) return Math.max(a.length, b.length);
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyIncludes(text, query) {
  const haystack = clean(text);
  if (!query || !clean(query)) return true;
  if (haystack.includes(clean(query))) return true;

  const words = haystack.split(' ').filter(Boolean);
  const queryTerms = expandQuery(query);
  return queryTerms.every((term) => words.some((word) => word.includes(term) || levenshtein(word, term) <= Math.max(1, Math.floor(term.length * 0.25))));
}

function parseSalary(value) {
  const text = String(value || '').toLowerCase().replace(/,/g, '');
  const numbers = text.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (numbers.length === 0) return { min: 0, max: Number.MAX_SAFE_INTEGER };
  const normalised = numbers.map((n) => (text.includes('k') && n < 1000 ? n * 1000 : n));
  return { min: Math.min(...normalised), max: Math.max(...normalised) };
}

function getProfile(user) {
  return user?.profile || {};
}

function normaliseUser(rawUser) {
  if (!rawUser) return null;
  const profile = getProfile(rawUser);
  const role = rawUser.role || profile.role || 'employee';
  const membership = rawUser.membership || profile.membership || {};

  return {
    ...rawUser,
    role,
    membership: {
      active: Boolean(rawUser.isMember || rawUser.member || membership.active || membership.status === 'active'),
      plan: membership.plan || rawUser.membershipPlan || 'Standard',
    },
    profile: {
      ...profile,
      name: profile.name || rawUser.name || '',
      company: profile.company || rawUser.company || '',
      title: profile.title || rawUser.title || '',
      phone: profile.phone || rawUser.phone || '',
      location: profile.location || rawUser.location || '',
      preferredLocation: profile.preferredLocation || rawUser.preferredLocation || profile.location || '',
      preferredWorkingMode: profile.preferredWorkingMode || rawUser.preferredWorkingMode || 'Hybrid',
      workExperience: profile.workExperience || rawUser.workExperience || '',
      skills: toArray(profile.skills || rawUser.skills || profile.keywords),
      keywords: toArray(profile.keywords || rawUser.keywords || profile.skills),
      description: profile.description || rawUser.description || '',
      bio: profile.bio || rawUser.bio || profile.description || '',
      industry: profile.industry || rawUser.industry || '',
    },
  };
}

function isMember(user) {
  return Boolean(user?.membership?.active || user?.isMember || user?.member);
}

function recommendationLimit(user) {
  return isMember(user) ? Infinity : NON_MEMBER_RECOMMENDATION_LIMIT;
}

function searchLimit(user) {
  return isMember(user) ? Infinity : NON_MEMBER_SEARCH_LIMIT;
}

function limitResults(items, user, mode = 'search') {
  const limit = mode === 'recommendation' ? recommendationLimit(user) : searchLimit(user);
  return Number.isFinite(limit) ? items.slice(0, limit) : items;
}

function limitNotice(user, type = 'results') {
  return isMember(user) ? `Premium membership: showing all ${type}.` : `Standard Membership: showing top 10 ${type}. Activate premium membership in your profile to view more.`;
}

function jobText(job) {
  return [
    job.title,
    job.company,
    job.description,
    job.location,
    job.salary,
    job.jobType,
    job.type,
    job.workingMode,
    job.workMode,
    job.level,
    ...(toArray(job.keywords)),
    ...(toArray(job.skills)),
  ].join(' ');
}

function candidateText(candidate) {
  const profile = getProfile(candidate);
  return [
    profile.name,
    candidate.email,
    profile.title,
    profile.location,
    profile.preferredLocation,
    profile.preferredWorkingMode,
    profile.workExperience,
    profile.bio,
    profile.description,
    ...(toArray(profile.skills)),
    ...(toArray(profile.keywords)),
  ].join(' ');
}

function matchingTerms(aTerms, bTerms) {
  const left = toArray(aTerms).map(clean);
  const right = toArray(bTerms).map(clean);
  return left.filter((term) => right.some((other) => other === term || other.includes(term) || term.includes(other)));
}

function scoreJobForCandidate(job, user) {
  const profile = getProfile(user);
  const candidateTerms = [...toArray(profile.skills), ...toArray(profile.keywords), profile.title, profile.preferredWorkingMode, profile.preferredLocation].filter(Boolean);
  const jobTerms = [...toArray(job.keywords), ...toArray(job.skills), job.title, job.workingMode || job.workMode, job.location].filter(Boolean);
  const matched = matchingTerms(candidateTerms, jobTerms);
  const locationMatch = fuzzyIncludes(job.location || '', profile.preferredLocation || profile.location || '') ? 1 : 0;
  const modeMatch = clean(job.workingMode || job.workMode).includes(clean(profile.preferredWorkingMode)) ? 1 : 0;
  const score = matched.length * 20 + locationMatch * 15 + modeMatch * 15;
  const percentage = Math.min(100, Math.round(score));
  return { score, percentage, matched: Array.from(new Set(matched)) };
}

function scoreCandidateForJob(candidate, job) {
  const profile = getProfile(candidate);
  const candidateTerms = [...toArray(profile.skills), ...toArray(profile.keywords), profile.title, profile.workExperience, profile.preferredWorkingMode, profile.preferredLocation].filter(Boolean);
  const jobTerms = [...toArray(job.keywords), ...toArray(job.skills), job.title, job.description, job.workingMode || job.workMode, job.location].filter(Boolean);
  const matched = matchingTerms(candidateTerms, jobTerms);
  const locationMatch = fuzzyIncludes(profile.preferredLocation || profile.location || '', job.location || '') ? 1 : 0;
  const modeMatch = clean(profile.preferredWorkingMode).includes(clean(job.workingMode || job.workMode)) ? 1 : 0;
  const score = matched.length * 20 + locationMatch * 15 + modeMatch * 15;
  const percentage = Math.min(100, Math.round(score));
  return { score, percentage, matched: Array.from(new Set(matched)) };
}

function jobMatchesFilters(job, filters) {
  const salary = parseSalary(job.salary);
  const minSalary = Number(filters.minSalary || 0);
  const maxSalary = Number(filters.maxSalary || Number.MAX_SAFE_INTEGER);
  const mode = clean(job.workingMode || job.workMode || '');
  const type = clean(job.jobType || job.type || '');

  return (!filters.location || fuzzyIncludes(job.location, filters.location))
    && (!filters.workingMode || mode.includes(clean(filters.workingMode)))
    && (!filters.jobType || type.includes(clean(filters.jobType)))
    && salary.max >= minSalary
    && salary.min <= maxSalary;
}

function candidateMatchesFilters(candidate, filters) {
  const profile = getProfile(candidate);
  return (!filters.location || fuzzyIncludes(`${profile.location} ${profile.preferredLocation}`, filters.location))
    && (!filters.workingMode || clean(profile.preferredWorkingMode).includes(clean(filters.workingMode)))
    && (!filters.skill || fuzzyIncludes(`${toArray(profile.skills).join(' ')} ${toArray(profile.keywords).join(' ')}`, filters.skill));
}

function AuthScreen({ onLogin, onRegister, loading }) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('employee');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    title: '',
    phone: '',
    location: '',
    preferredLocation: '',
    preferredWorkingMode: 'Hybrid',
    workExperience: '',
    skills: '',
    keywords: '',
    bio: '',
    company: '',
    industry: '',
    description: '',
    membership: false,
  });

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const fillDemoAccount = (account) => {
    setIsLogin(true);
    setError('');
    setForm((prev) => ({ ...prev, email: account.email, password: account.password }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // Keep the register payload compatible with the existing test database/schema.
    // Employee/candidate fields used by the database: name, title, keywords, phone, location, bio.
    // Employer/company fields used by the database: company, phone, location, description.
    // The extra requirement-change fields are still included so matching can use them when available.
    const employeeKeywords = form.keywords || form.skills;
    const employeeBio = form.bio || form.workExperience;

    const registerPayload = {
      ...form,
      email: form.email,
      password: form.password,
      role,
      keywords: employeeKeywords,
      skills: form.skills || employeeKeywords,
      bio: employeeBio,
      isMember: form.membership,
      membership: { active: form.membership, plan: form.membership ? 'Premium' : 'Standard' },
      profile: {
        name: form.name,
        title: form.title,
        phone: form.phone,
        location: form.location,
        bio: employeeBio,
        preferredLocation: form.preferredLocation || form.location,
        preferredWorkingMode: form.preferredWorkingMode,
        workExperience: form.workExperience || employeeBio,
        skills: toArray(form.skills || employeeKeywords),
        keywords: toArray(employeeKeywords),
        company: form.company,
        industry: form.industry,
        description: form.description,
      },
    };

    const result = isLogin
      ? await onLogin(form.email, form.password)
      : await onRegister(registerPayload);

    if (!result.success) setError(result.error || 'Something went wrong. Please try again.');
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#f0f0f0' }}>
      <section className="modal-content" style={{ maxWidth: 620 }}>
        <h1 style={{ marginBottom: 8 }}>{isLogin ? 'Welcome back to JobMatch' : 'Create your JobMatch account'}</h1>
        <p className="card-subtitle" style={{ marginBottom: 24 }}>
          {isLogin ? 'Sign in to continue.' : 'Build a richer profile for more accurate job and candidate matching.'}
        </p>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label">Account type</label>
                <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="employee">Candidate / Employee</option>
                  <option value="employer">Company / Employer</option>
                </select>
              </div>

              {role === 'employee' ? (
                <>
                  <div className="form-group"><label className="form-label">Full name</label><input className="form-input" required placeholder="Jane Smith" value={form.name} onChange={(e) => updateForm('name', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Title</label><input className="form-input" required placeholder="UX Designer" value={form.title} onChange={(e) => updateForm('title', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Keywords</label><input className="form-input" required placeholder="UI Design, Figma, User Research, Prototyping" value={form.keywords} onChange={(e) => updateForm('keywords', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Bio</label><textarea className="form-textarea" required placeholder="Creative designer focused on user-centred solutions" value={form.bio} onChange={(e) => updateForm('bio', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Skills</label><input className="form-input" placeholder="Optional: React, Node.js, SQL" value={form.skills} onChange={(e) => updateForm('skills', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Work experience</label><textarea className="form-textarea" placeholder="Optional: previous jobs, projects or internships." value={form.workExperience} onChange={(e) => updateForm('workExperience', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Preferred working mode</label><select className="form-select" value={form.preferredWorkingMode} onChange={(e) => updateForm('preferredWorkingMode', e.target.value)}>{WORKING_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Preferred location</label><input className="form-input" placeholder="Sydney" value={form.preferredLocation} onChange={(e) => updateForm('preferredLocation', e.target.value)} /></div>
                </>
              ) : (
                <>
                  <div className="form-group"><label className="form-label">Company name</label><input className="form-input" required value={form.company} onChange={(e) => updateForm('company', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Industry</label><input className="form-input" required placeholder="Technology, Finance, Healthcare" value={form.industry} onChange={(e) => updateForm('industry', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Company description</label><textarea className="form-textarea" required value={form.description} onChange={(e) => updateForm('description', e.target.value)} /></div>
                </>
              )}

              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" required value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Location</label><input className="form-input" required value={form.location} onChange={(e) => updateForm('location', e.target.value)} /></div>
              <label className="status-badge status-applied" style={{ cursor: 'pointer', marginBottom: 16 }}>
                <input type="checkbox" checked={form.membership} onChange={(e) => updateForm('membership', e.target.checked)} />
                Premium membership - unlimited recommendations
              </label>
            </>
          )}

          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" required value={form.email} onChange={(e) => updateForm('email', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" required value={form.password} onChange={(e) => updateForm('password', e.target.value)} /></div>

          {error && <p style={{ color: '#fecaca', marginBottom: 16 }}>{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => { setIsLogin((prev) => !prev); setError(''); }} style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
            {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
        </form>

        {isLogin && (
          <aside style={{ marginTop: 24, padding: 16, background: '#1a252f', borderRadius: 8, fontSize: 12, color: '#9db3c4', border: '1px solid #3a5060' }}>
            <p style={{ margin: '0 0 10px 0', fontWeight: 700, color: '#e8eef7' }}>Suggested test login details:</p>
            {DEMO_ACCOUNTS.map((account) => (
              <div key={account.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                <span>{account.icon} {account.label}: {account.email} / {account.password}</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fillDemoAccount(account)}
                  style={{ padding: '6px 10px', fontSize: 12 }}
                >
                  Use details
                </button>
              </div>
            ))}
          </aside>
        )}
      </section>
    </main>
  );
}

function JobCard({ job, match, applied, onApply }) {
  return (
    <article className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h3 className="card-title">{job.title}</h3>
          <p className="card-subtitle">{job.company || 'Company'} • {job.location || 'Location not listed'} • {job.workingMode || job.workMode || 'Flexible'}</p>
          <p style={{ margin: '14px 0', lineHeight: 1.6 }}>{job.description}</p>
          <p className="info-row">Salary: {job.salary || 'Not listed'} {job.jobType || job.type ? `• ${job.jobType || job.type}` : ''}</p>
          <div>{toArray(job.keywords || job.skills).map((kw) => <span key={kw} className={`keyword-badge ${match?.matched?.map(clean).includes(clean(kw)) ? 'matched' : ''}`}>{kw}</span>)}</div>
        </div>
        <div style={{ minWidth: 110, textAlign: 'center' }}>
          <div className="match-score">{match?.percentage || 0}%</div>
          <p className="card-subtitle">Match</p>
          {onApply && <button className={`btn ${applied ? 'btn-disabled' : 'btn-primary'}`} disabled={applied} onClick={() => onApply(job.id)}>{applied ? 'Applied' : 'Apply'}</button>}
        </div>
      </div>
    </article>
  );
}

function CandidateCard({ candidate, match }) {
  const profile = getProfile(candidate);
  return (
    <article className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h3 className="card-title">{profile.name || 'Candidate'}</h3>
          <p className="card-subtitle">{profile.title || 'No title'} • {profile.preferredWorkingMode || 'Flexible'} • {profile.preferredLocation || profile.location || 'Location not listed'}</p>
          <p style={{ margin: '14px 0', lineHeight: 1.6 }}>{profile.workExperience || profile.bio || profile.description || 'No work experience provided.'}</p>
          <div>{[...toArray(profile.skills), ...toArray(profile.keywords)].map((kw) => <span key={kw} className={`keyword-badge ${match?.matched?.map(clean).includes(clean(kw)) ? 'matched' : ''}`}>{kw}</span>)}</div>
          <p className="info-row" style={{ marginTop: 12 }}>{candidate.email || ''} {profile.phone ? `• ${profile.phone}` : ''}</p>
        </div>
        <div style={{ minWidth: 110, textAlign: 'center' }}>
          <div className="match-score">{match?.percentage || 0}%</div>
          <p className="card-subtitle">Match</p>
        </div>
      </div>
    </article>
  );
}

function MembershipPanel({ user, onToggleMembership, audience }) {
  const member = isMember(user);
  return (
    <div className="card" style={{ marginTop: 18, borderColor: member ? '#0d7377' : '#3a5060' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h3 className="card-title">Membership</h3>
          <p className="card-subtitle">
            {member
              ? audience === 'employee'
                ? 'Membership is on. You can view unlimited recommended jobs.'
                : 'Membership is on. You can view unlimited recommended candidates.'
              : audience === 'employee'
                ? 'Membership is off. You can only view the top 10 recommended jobs.'
                : 'Membership is off. You can only view the top 10 recommended candidates.'}
          </p>
        </div>
        <button
          type="button"
          className={`btn ${member ? 'btn-success' : 'btn-primary'}`}
          onClick={() => onToggleMembership(!member)}
        >
          {member ? 'Turn membership off' : 'Turn membership on'}
        </button>
      </div>
    </div>
  );
}


function EmployeeDashboard({ user, onLogout, onToggleMembership }) {
  const [activeTab, setActiveTab] = useState('recommended');
  const [jobs, setJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ location: '', workingMode: '', jobType: '', minSalary: '', maxSalary: '' });
  const profile = getProfile(user);

  useEffect(() => {
    axios.get(`${API_URL}/jobs`).then((res) => setJobs(res.data || [])).catch(() => setJobs([]));
    axios.get(`${API_URL}/applications/employee/${user.id}`).then((res) => setAppliedJobs((res.data || []).map((app) => app.job || app))).catch(() => setAppliedJobs([]));
  }, [user.id]);

  const recommendedJobs = useMemo(() => jobs
    .map((job) => ({ ...job, match: scoreJobForCandidate(job, user) }))
    .filter((job) => job.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, recommendationLimit(user)), [jobs, user]);

  const searchResults = useMemo(() => jobs
    .filter((job) => fuzzyIncludes(jobText(job), query))
    .filter((job) => jobMatchesFilters(job, filters))
    .map((job) => ({ ...job, match: scoreJobForCandidate(job, user) }))
    .sort((a, b) => b.match.score - a.match.score), [jobs, query, filters, user]);

  const visibleSearchResults = useMemo(() => limitResults(searchResults, user, 'search'), [searchResults, user]);

  const appliedIds = new Set(appliedJobs.map((job) => job.id));
  const applyForJob = async (jobId) => {
    await axios.post(`${API_URL}/applications`, { employeeId: user.id, jobId });
    const job = jobs.find((item) => item.id === jobId);
    if (job) setAppliedJobs((prev) => [...prev, job]);
  };

  return (
    <div>
      <header className="header"><div><h1>JobMatch</h1><p className="header-subtitle">Welcome, {profile.name || user.email}</p></div><div className="header-actions"><span className="status-badge status-applied">{isMember(user) ? 'Membership: Premium' : 'Membership: Standard'}</span><button className="btn btn-secondary" onClick={onLogout}>Logout</button></div></header>
      <main className="container">
        <nav className="tabs">{['recommended', 'search', 'applied', 'profile'].map((tab) => <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}</nav>

        {activeTab === 'recommended' && <section><h2>Recommended Jobs</h2><p className="card-subtitle" style={{ margin: '8px 0 20px' }}>Matches use your skills, work experience, preferred working mode and preferred location.</p><div className="grid">{recommendedJobs.length ? recommendedJobs.map((job) => <JobCard key={job.id} job={job} match={job.match} applied={appliedIds.has(job.id)} onApply={applyForJob} />) : <EmptyState text="No recommendations yet. Add more skills or broaden your preferred location." />}</div></section>}

        {activeTab === 'search' && <section><h2>Search Jobs</h2><SearchControls query={query} setQuery={setQuery} filters={filters} setFilters={setFilters} type="jobs" /><p className="card-subtitle" style={{ marginBottom: 8 }}>{visibleSearchResults.length} of {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} shown</p><p className="card-subtitle" style={{ marginBottom: 16 }}>{limitNotice(user, 'job search results')}</p><div className="grid">{visibleSearchResults.map((job) => <JobCard key={job.id} job={job} match={job.match} applied={appliedIds.has(job.id)} onApply={applyForJob} />)}</div></section>}

        {activeTab === 'applied' && <section><h2>Applied Jobs</h2><div className="grid">{appliedJobs.length ? appliedJobs.map((job) => <JobCard key={job.id} job={job} match={scoreJobForCandidate(job, user)} applied />) : <EmptyState text="You have not applied for any jobs yet." />}</div></section>}

        {activeTab === 'profile' && <section><div className="card"><h2>Candidate Profile</h2><p className="info-row">Title: {profile.title || 'Not provided'}</p><p className="info-row">Work experience: {profile.workExperience || profile.bio || 'Not provided'}</p><p className="info-row">Preferred mode: {profile.preferredWorkingMode || 'Not provided'}</p><p className="info-row">Preferred location: {profile.preferredLocation || 'Not provided'}</p><div style={{ marginTop: 12 }}>{[...toArray(profile.skills), ...toArray(profile.keywords)].map((kw) => <span key={kw} className="keyword-badge">{kw}</span>)}</div></div><MembershipPanel user={user} audience="employee" onToggleMembership={onToggleMembership} /></section>}
      </main>
    </div>
  );
}

function EmployerDashboard({ user, onLogout, onToggleMembership }) {
  const [activeTab, setActiveTab] = useState('listings');
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ location: '', workingMode: '', skill: '' });
  const [newJob, setNewJob] = useState({ title: '', description: '', keywords: '', salary: '', location: '', workingMode: 'Hybrid', jobType: 'Full-time' });
  const companyName = getProfile(user).company || user.company || user.email;

  const refreshJobs = () => axios.get(`${API_URL}/jobs/employer/${user.id}`).then((res) => setJobs(res.data || [])).catch(() => setJobs([]));
  const refreshCandidates = async () => {
    const endpoints = [`${API_URL}/users?role=employee`, `${API_URL}/candidates`, `${API_URL}/employees`];
    for (const endpoint of endpoints) {
      try {
        const res = await axios.get(endpoint);
        const data = Array.isArray(res.data) ? res.data : res.data?.users || res.data?.candidates || [];
        if (data.length) {
          setCandidates(data.map(normaliseUser).filter((candidate) => candidate.role === 'employee' || getProfile(candidate).title));
          return;
        }
      } catch (error) {
        // Try the next compatible endpoint.
      }
    }
    setCandidates([]);
  };

  useEffect(() => { refreshJobs(); refreshCandidates(); }, []);
  useEffect(() => { if (!selectedJobId && jobs.length) setSelectedJobId(String(jobs[0].id)); }, [jobs, selectedJobId]);

  const selectedJob = jobs.find((job) => String(job.id) === String(selectedJobId)) || jobs[0];
  const rankedCandidates = useMemo(() => {
    if (!selectedJob) return [];
    const results = candidates
      .filter((candidate) => fuzzyIncludes(candidateText(candidate), query))
      .filter((candidate) => candidateMatchesFilters(candidate, filters))
      .map((candidate) => ({ ...candidate, match: scoreCandidateForJob(candidate, selectedJob) }))
      .filter((candidate) => candidate.match.score > 0 || query || filters.location || filters.workingMode || filters.skill)
      .sort((a, b) => b.match.score - a.match.score);
    return limitResults(results, user, 'search');
  }, [candidates, selectedJob, query, filters, user]);

  const createJob = async (event) => {
    event.preventDefault();
    await axios.post(`${API_URL}/jobs`, { employerId: user.id, company: companyName, ...newJob });
    setNewJob({ title: '', description: '', keywords: '', salary: '', location: '', workingMode: 'Hybrid', jobType: 'Full-time' });
    refreshJobs();
  };

  const deleteJob = async (jobId) => {
    await axios.delete(`${API_URL}/jobs/${jobId}`);
    refreshJobs();
  };

  return (
    <div>
      <header className="header"><div><h1>JobMatch Employer</h1><p className="header-subtitle">{companyName}</p></div><div className="header-actions"><span className="status-badge status-applied">{isMember(user) ? 'Membership: Premium' : 'Membership: Standard'}</span><button className="btn btn-secondary" onClick={onLogout}>Logout</button></div></header>
      <main className="container">
        <nav className="tabs">{['listings', 'candidates', 'create', 'profile'].map((tab) => <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}</nav>

        {activeTab === 'listings' && <section><h2>Your Job Listings</h2><div className="grid" style={{ marginTop: 16 }}>{jobs.length ? jobs.map((job) => <article className="card" key={job.id}><h3 className="card-title">{job.title}</h3><p>{job.description}</p><p className="info-row">{job.location} • {job.salary} • {job.workingMode || job.workMode || 'Flexible'} • {job.jobType || job.type || 'Any type'}</p><div>{toArray(job.keywords).map((kw) => <span key={kw} className="keyword-badge">{kw}</span>)}</div><button className="btn btn-danger" style={{ marginTop: 14 }} onClick={() => deleteJob(job.id)}>Delete</button></article>) : <EmptyState text="No jobs created yet." />}</div></section>}

        {activeTab === 'candidates' && <section><h2>Recommended Candidates</h2>{jobs.length ? <><div className="form-group" style={{ marginTop: 16 }}><label className="form-label">Choose job description to match against</label><select className="form-select" value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></div><SearchControls query={query} setQuery={setQuery} filters={filters} setFilters={setFilters} type="candidates" /><p className="card-subtitle" style={{ marginBottom: 16 }}>{rankedCandidates.length} candidate{rankedCandidates.length !== 1 ? 's' : ''} shown for {selectedJob?.title}</p><div className="grid">{rankedCandidates.map((candidate) => <CandidateCard key={candidate.id || candidate.email} candidate={candidate} match={candidate.match} />)}</div></> : <EmptyState text="Create a job first so candidates can be matched against the job description." />}</section>}

        {activeTab === 'create' && <section className="card"><h2>Create Job Listing</h2><form onSubmit={createJob} style={{ marginTop: 18 }}><div className="form-group"><label className="form-label">Job title</label><input className="form-input" required value={newJob.title} onChange={(e) => setNewJob({ ...newJob, title: e.target.value })} /></div><div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" required value={newJob.description} onChange={(e) => setNewJob({ ...newJob, description: e.target.value })} /></div><div className="form-group"><label className="form-label">Skills / keywords</label><input className="form-input" required placeholder="React, SQL, communication" value={newJob.keywords} onChange={(e) => setNewJob({ ...newJob, keywords: e.target.value })} /></div><div className="form-group"><label className="form-label">Location</label><input className="form-input" required value={newJob.location} onChange={(e) => setNewJob({ ...newJob, location: e.target.value })} /></div><div className="form-group"><label className="form-label">Salary</label><input className="form-input" required placeholder="$80k - $100k" value={newJob.salary} onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })} /></div><div className="form-group"><label className="form-label">Working mode</label><select className="form-select" value={newJob.workingMode} onChange={(e) => setNewJob({ ...newJob, workingMode: e.target.value })}>{WORKING_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></div><div className="form-group"><label className="form-label">Job type</label><select className="form-select" value={newJob.jobType} onChange={(e) => setNewJob({ ...newJob, jobType: e.target.value })}>{JOB_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div><button className="btn btn-primary" type="submit">Create Job</button></form></section>}

        {activeTab === 'profile' && <section><div className="card"><h2>Company Profile</h2><p className="info-row">Company: {companyName}</p><p className="info-row">Location: {getProfile(user).location || user.location || 'Not provided'}</p><p className="info-row">Phone: {getProfile(user).phone || user.phone || 'Not provided'}</p><p style={{ marginTop: 12 }}>{getProfile(user).description || user.description || 'No company description provided.'}</p></div><MembershipPanel user={user} audience="employer" onToggleMembership={onToggleMembership} /></section>}
      </main>
    </div>
  );
}

function SearchControls({ query, setQuery, filters, setFilters, type }) {
  const updateFilter = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));
  return (
    <div className="card" style={{ margin: '16px 0 24px' }}>
      <div className="form-group"><label className="form-label">Keyword or fuzzy search</label><input className="form-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={type === 'jobs' ? 'Try: sofware enginer, programmer, data analyst' : 'Try: react, Sydney, hybrid, coder'} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="form-group"><label className="form-label">Location</label><input className="form-input" value={filters.location || ''} onChange={(e) => updateFilter('location', e.target.value)} placeholder="Sydney" /></div>
        <div className="form-group"><label className="form-label">Working mode</label><select className="form-select" value={filters.workingMode || ''} onChange={(e) => updateFilter('workingMode', e.target.value)}><option value="">Any</option>{WORKING_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></div>
        {type === 'jobs' ? <><div className="form-group"><label className="form-label">Job type</label><select className="form-select" value={filters.jobType || ''} onChange={(e) => updateFilter('jobType', e.target.value)}><option value="">Any</option>{JOB_TYPES.map((jobType) => <option key={jobType}>{jobType}</option>)}</select></div><div className="form-group"><label className="form-label">Minimum salary</label><input className="form-input" type="number" value={filters.minSalary || ''} onChange={(e) => updateFilter('minSalary', e.target.value)} /></div><div className="form-group"><label className="form-label">Maximum salary</label><input className="form-input" type="number" value={filters.maxSalary || ''} onChange={(e) => updateFilter('maxSalary', e.target.value)} /></div></> : <div className="form-group"><label className="form-label">Skill filter</label><input className="form-input" value={filters.skill || ''} onChange={(e) => updateFilter('skill', e.target.value)} placeholder="React" /></div>}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="empty-state"><p>{text}</p></div>;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY);
      if (storedUser) setCurrentUser(normaliseUser(JSON.parse(storedUser)));
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const saveUser = (user) => {
    const normalised = normaliseUser(user);
    setCurrentUser(normalised);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalised));
  };


  const handleToggleMembership = (active) => {
    if (!currentUser) return;
    saveUser({
      ...currentUser,
      isMember: active,
      member: active,
      membership: {
        ...(currentUser.membership || {}),
        active,
        plan: active ? 'Premium' : 'Standard',
      },
    });
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      if (response.data?.success && response.data?.user) {
        saveUser(response.data.user);
        return { success: true };
      }
      return { success: false, error: response.data?.message || 'Login failed' };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Login failed. Check your email and password.' };
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (formData) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/register`, formData);
      if (response.data?.success && response.data?.user) {
        saveUser(response.data.user);
        return { success: true };
      }
      return { success: false, error: response.data?.message || 'Registration failed' };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Registration failed. Please check all required fields.' };
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (!currentUser) return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} loading={loading} />;
  if (currentUser.role === 'employee') return <EmployeeDashboard user={currentUser} onLogout={handleLogout} onToggleMembership={handleToggleMembership} />;
  return <EmployerDashboard user={currentUser} onLogout={handleLogout} onToggleMembership={handleToggleMembership} />;
}
