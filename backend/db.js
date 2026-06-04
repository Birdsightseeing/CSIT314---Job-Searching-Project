const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, './data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const readFile = (filename) => {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
};

const writeFile = (filename, data) => {
  try {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing to ${filename}:`, error);
    return false;
  }
};

module.exports = {
  // Users
  getUsers: () => readFile('users.json'),
  saveUsers: (users) => writeFile('users.json', users),
  
  // Jobs
  getJobs: () => readFile('jobs.json'),
  saveJobs: (jobs) => writeFile('jobs.json', jobs),
  
  // Applications
  getApplications: () => readFile('applications.json'),
  saveApplications: (applications) => writeFile('applications.json', applications)
};
