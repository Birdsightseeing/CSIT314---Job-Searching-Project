import React, { useState } from 'react';

export default function AuthPage({ onLogin, onRegister, loading }) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    keywords: '',
    phone: '',
    location: '',
    company: '',
    description: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const result = await onLogin(email, password);
    if (!result.success) {
      setError(result.error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    const registerData = {
      email,
      password,
      role,
      ...formData
    };

    const result = await onRegister(registerData);
    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Outfit", system-ui, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        background: '#2a3f4d',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '450px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        color: '#e8eef7'
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '10px', color: '#e8eef7' }}>
          {isLogin ? 'Welcome Back' : 'Join Us'}
        </h1>
        <p style={{ color: '#9db3c4', marginBottom: '30px' }}>
          {isLogin ? 'Sign in to your account' : 'Create a new account'}
        </p>

        <form onSubmit={isLogin ? handleLogin : handleRegister}>
          {!isLogin && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#e8eef7' }}>I am a</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['employee', 'employer'].map(r => (
                    <label key={r} style={{ flex: 1, cursor: 'pointer' }}>
                      <input type="radio" value={r} checked={role === r} onChange={(e) => setRole(e.target.value)} style={{ marginRight: '8px' }} />
                      <span style={{ textTransform: 'capitalize', color: role === r ? '#0d7377' : '#9db3c4' }}>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {role === 'employee' ? (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <input type="text" placeholder="Full Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="form-input" required />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <input type="text" placeholder="Job Title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="form-input" required />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <input type="text" placeholder="Keywords (comma-separated)" value={formData.keywords} onChange={(e) => setFormData({...formData, keywords: e.target.value})} className="form-input" required />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <input type="text" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="form-input" required />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <input type="text" placeholder="Location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="form-input" required />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <input type="text" placeholder="Company Name" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} className="form-input" required />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <input type="text" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="form-input" required />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <input type="text" placeholder="Location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="form-input" required />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <textarea placeholder="Company Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="form-input" required></textarea>
                  </div>
                </>
              )}
            </>
          )}

          <div style={{ marginBottom: '16px' }}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" required />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" required />
          </div>

          {error && <p style={{ color: '#ff6b6b', marginBottom: '16px', fontSize: '14px' }}>{error}</p>}

          <button type="submit" disabled={loading} style={{
            width: '100%',
            padding: '12px',
            background: loading ? '#4a5f6f' : '#0d7377',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '16px'
          }}>
            {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>

          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} style={{
            width: '100%',
            padding: '12px',
            background: '#3a5060',
            color: '#0d7377',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
        </form>

        <div style={{ marginTop: '24px', padding: '16px', background: '#1a252f', borderRadius: '8px', fontSize: '12px', color: '#9db3c4', border: '1px solid #3a5060' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Demo Accounts:</p>
          <p style={{ margin: '4px 0' }}>👤 Employee: john@example.com / pass123</p>
          <p style={{ margin: '4px 0' }}>🏢 Employer: hr@company.com / pass123</p>
        </div>
      </div>
    </div>
  );
}
