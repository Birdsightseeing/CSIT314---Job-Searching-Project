const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const users = db.getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, role, name, title, keywords, phone, location, company, description } = req.body;
  
  const users = db.getUsers();
  
  // Check if email already exists
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }
  
  const newUser = {
    id: uuidv4(),
    email,
    password,
    role
  };
  
  if (role === 'employee') {
    newUser.profile = {
      name,
      title,
      keywords: keywords ? keywords.split(',').map(k => k.trim()).filter(k => k) : [],
      phone,
      location,
      bio: ''
    };
  } else {
    newUser.company = company;
    newUser.profile = {
      phone,
      location,
      description
    };
  }
  
  users.push(newUser);
  db.saveUsers(users);
  
  res.json({ success: true, user: newUser });
});

// ==================== JOB ROUTES ====================

// Get all jobs
app.get('/api/jobs', (req, res) => {
  const jobs = db.getJobs();
  res.json(jobs);
});

// Get jobs by employer
app.get('/api/jobs/employer/:employerId', (req, res) => {
  const { employerId } = req.params;
  const jobs = db.getJobs();
  const employerJobs = jobs.filter(j => j.employerId === employerId);
  res.json(employerJobs);
});

// Create job
app.post('/api/jobs', (req, res) => {
  const { employerId, title, description, keywords, salary, location } = req.body;
  
  const jobs = db.getJobs();
  
  const newJob = {
    id: uuidv4(),
    employerId,
    title,
    description,
    keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
    salary,
    location,
    postedDate: new Date().toISOString()
  };
  
  jobs.push(newJob);
  db.saveJobs(jobs);
  
  res.json({ success: true, job: newJob });
});

// Update job
app.put('/api/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const { title, description, keywords, salary, location } = req.body;
  
  const jobs = db.getJobs();
  const jobIndex = jobs.findIndex(j => j.id === jobId);
  
  if (jobIndex === -1) {
    return res.status(404).json({ success: false, message: 'Job not found' });
  }
  
  jobs[jobIndex] = {
    ...jobs[jobIndex],
    title,
    description,
    keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
    salary,
    location
  };
  
  db.saveJobs(jobs);
  res.json({ success: true, job: jobs[jobIndex] });
});

// Delete job
app.delete('/api/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  const jobs = db.getJobs();
  const filteredJobs = jobs.filter(j => j.id !== jobId);
  
  db.saveJobs(filteredJobs);
  
  res.json({ success: true });
});

// ==================== APPLICATION ROUTES ====================

// Get applications for a job
app.get('/api/applications/job/:jobId', (req, res) => {
  const { jobId } = req.params;
  const applications = db.getApplications();
  const users = db.getUsers();
  
  const jobApplications = applications
    .filter(a => a.jobId === jobId)
    .map(app => ({
      ...app,
      employee: users.find(u => u.id === app.employeeId)
    }));
  
  res.json(jobApplications);
});

// Get applications by employee
app.get('/api/applications/employee/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  const applications = db.getApplications();
  const jobs = db.getJobs();
  
  const employeeApplications = applications
    .filter(a => a.employeeId === employeeId)
    .map(app => ({
      ...app,
      job: jobs.find(j => j.id === app.jobId)
    }));
  
  res.json(employeeApplications);
});

// Apply for a job
app.post('/api/applications', (req, res) => {
  const { employeeId, jobId } = req.body;
  
  const applications = db.getApplications();
  
  // Check if already applied
  if (applications.find(a => a.employeeId === employeeId && a.jobId === jobId)) {
    return res.status(400).json({ success: false, message: 'Already applied to this job' });
  }
  
  const newApplication = {
    id: uuidv4(),
    employeeId,
    jobId,
    appliedDate: new Date().toISOString()
  };
  
  applications.push(newApplication);
  db.saveApplications(applications);
  
  res.json({ success: true, application: newApplication });
});

// ==================== USER ROUTES ====================

// Get user by ID
app.get('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  const users = db.getUsers();
  const user = users.find(u => u.id === userId);
  
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

// Update user profile or membership
app.put('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  const { hasMembership, ...profileData } = req.body;
  
  const users = db.getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  // Update membership if provided
  if (hasMembership !== undefined) {
    users[userIndex].hasMembership = hasMembership;
  }
  
  // Update profile data if provided
  if (Object.keys(profileData).length > 0) {
    users[userIndex].profile = {
      ...users[userIndex].profile,
      ...profileData
    };
  }
  
  db.saveUsers(users);
  res.json({ success: true, user: users[userIndex] });
});

// Get all employees (for recommendations)
app.get('/api/employees', (req, res) => {
  const users = db.getUsers();
  const employees = users.filter(u => u.role === 'employee');
  res.json(employees);
});

// ==================== MATCHING ENGINE ====================

// Calculate keyword match between job and employee
const calculateMatch = (employeeKeywords, jobKeywords) => {
  const empKeywords = employeeKeywords.map(k => k.toLowerCase());
  const matched = jobKeywords.filter(jk => empKeywords.includes(jk.toLowerCase()));
  return {
    count: matched.length,
    percentage: Math.round((matched.length / Math.max(jobKeywords.length, 1)) * 100),
    matched
  };
};

// Get recommended candidates for a job
app.get('/api/recommendations/candidates/:jobId', (req, res) => {
  const { jobId } = req.params;
  const { employerId } = req.query;
  
  const jobs = db.getJobs();
  const job = jobs.find(j => j.id === jobId);
  
  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found' });
  }
  
  const users = db.getUsers();
  const employees = users.filter(u => u.role === 'employee');
  
  let recommended = employees
    .map(emp => ({
      ...emp,
      match: calculateMatch(emp.profile.keywords, job.keywords)
    }))
    .filter(emp => emp.match.count > 0)
    .sort((a, b) => b.match.count - a.match.count);
  
  // Apply membership limit: max 7 candidates for free employers
  if (employerId) {
    const employer = users.find(u => u.id === employerId);
    if (employer && !employer.hasMembership) {
      recommended = recommended.slice(0, 7);
    } else {
      recommended = recommended.slice(0, 10);
    }
  } else {
    recommended = recommended.slice(0, 10);
  }
  
  res.json(recommended);
});

// Get recommended jobs for an employee
app.get('/api/recommendations/jobs/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  
  const users = db.getUsers();
  const user = users.find(u => u.id === employeeId);
  
  if (!user || user.role !== 'employee') {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }
  
  const jobs = db.getJobs();
  let recommended = jobs
    .map(job => ({
      ...job,
      match: calculateMatch(user.profile.keywords, job.keywords)
    }))
    .filter(job => job.match.count > 0)
    .sort((a, b) => b.match.count - a.match.count);
  
  // Apply membership limit: non-members get max 7 recommendations
  const limit = user.hasMembership ? recommended.length : 7;
  recommended = recommended.slice(0, limit);
  
  res.json(recommended);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
