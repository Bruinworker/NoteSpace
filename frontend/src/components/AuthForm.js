/**
 * Authentication form component for login and registration.
 * 
 * Displays a tabbed interface allowing users to switch between
 * login and registration forms.
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onLogin - Handler for login form submission
 * @param {Function} props.onRegister - Handler for registration form submission
 */
import React, { useState } from 'react';
import { authStyles } from '../styles';

function AuthForm({ onLogin, onRegister }) {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <div style={authStyles.container}>
      <div style={authStyles.authContainer}>
        <h1 style={authStyles.title}>NoteSpace</h1>
        <div style={authStyles.tabs}>
          <button
            style={{...authStyles.tab, ...(showLogin ? authStyles.activeTab : {})}}
            onClick={() => setShowLogin(true)}
          >
            Login
          </button>
          <button
            style={{...authStyles.tab, ...(!showLogin ? authStyles.activeTab : {})}}
            onClick={() => setShowLogin(false)}
          >
            Register
          </button>
        </div>
        {showLogin ? (
          <form onSubmit={onLogin} style={authStyles.form}>
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              style={authStyles.input}
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              style={authStyles.input}
            />
            <button type="submit" style={authStyles.button}>Login</button>
          </form>
        ) : (
          <form onSubmit={onRegister} style={authStyles.form}>
            <input
              type="text"
              name="name"
              placeholder="Name"
              required
              style={authStyles.input}
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              style={authStyles.input}
            />
            <input
              type="password"
              name="password"
              placeholder="Password (min 6 characters)"
              required
              minLength={6}
              style={authStyles.input}
            />
            <button type="submit" style={authStyles.button}>Register</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AuthForm;

