// src/Login.jsx
import React, { useState } from 'react';
import api from './api';
import logo from '../Oshen_logo.png';
import './login.css';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.login(username, password);
      console.log('Login successful:', response.data.user);
      onLoginSuccess(response.data.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login_container">
      <div className="login_card">
        <img src={logo} alt="Oshen Logo" className="login_logo" />
        <h2>Oshen Alert System</h2>
        <p className="login_subtitle">Vessel Monitoring & Alert Management</p>

        <form onSubmit={handleLogin} className="login_form">
          <div className="input_group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="input_group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="error_message" style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="login_button">
            {loading ? (
              <>
                <span className="spinner"></span>
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="login_footer">
          <small>Test credentials: admin / emperorpinguoshen</small>
        </div>
      </div>
    </div>
  );
}

export default Login;

//next steps
//1. add login functionality