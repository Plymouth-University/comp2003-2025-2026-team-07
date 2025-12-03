// src/Login.jsx
import React, { useState } from 'react';
import api from './services/api';
import logo from './Oshen_logo.png';
import './Login.css';

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
            <div className="error_message">
              ⚠️ {error}
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