import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

// Create axios instance with interceptor to add token to each request
const api = axios.create({
  baseURL: API_BASE_URL
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // Ensure token doesn't have extra quotes or whitespace
    const cleanToken = token.trim().replace(/^["']|["']$/g, '');
    config.headers.Authorization = `Bearer ${cleanToken}`;
  } else {
    console.warn('No token found in localStorage');
  }
  return config;
});

// Add response interceptor to handle token errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 422) {
      // Token might be invalid, clear it
      if (error.response?.data?.error?.includes('token')) {
        localStorage.removeItem('token');
        console.error('Token invalid, cleared from storage');
      }
    }
    return Promise.reject(error);
  }
);

function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [topics, setTopics] = useState([]);
  const [notes, setNotes] = useState([]);
  const [currentView, setCurrentView] = useState('upload'); // 'upload' or 'list'

  useEffect(() => {
    // Always fetch topics (no auth required)
    fetchTopics();
    
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser();
      fetchNotes();
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      setIsAuthenticated(true);
    } catch (error) {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    }
  };

  const fetchTopics = async () => {
    try {
      // Topics don't require auth anymore
      const response = await axios.get(`${API_BASE_URL}/topics/`);
      setTopics(response.data.topics);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const fetchNotes = async () => {
    try {
      // Notes list doesn't require auth anymore
      const response = await axios.get(`${API_BASE_URL}/upload/list`);
      setNotes(response.data.notes);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password')
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, data);
      localStorage.setItem('token', response.data.access_token);
      setUser(response.data.user);
      setIsAuthenticated(true);
      fetchTopics();
      fetchNotes();
    } catch (error) {
      alert(error.response?.data?.error || 'Registration failed');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      email: formData.get('email'),
      password: formData.get('password')
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, data);
      localStorage.setItem('token', response.data.access_token);
      setUser(response.data.user);
      setIsAuthenticated(true);
      fetchTopics();
      fetchNotes();
    } catch (error) {
      alert(error.response?.data?.error || 'Login failed');
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    setNotes([]);
    setTopics([]);
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.authContainer}>
          <h1 style={styles.title}>NoteSpace</h1>
          <div style={styles.tabs}>
            <button
              style={{...styles.tab, ...(showLogin ? styles.activeTab : {})}}
              onClick={() => setShowLogin(true)}
            >
              Login
            </button>
            <button
              style={{...styles.tab, ...(!showLogin ? styles.activeTab : {})}}
              onClick={() => setShowLogin(false)}
            >
              Register
            </button>
          </div>
          {showLogin ? (
            <form onSubmit={handleLogin} style={styles.form}>
              <input
                type="email"
                name="email"
                placeholder="Email"
                required
                style={styles.input}
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                required
                style={styles.input}
              />
              <button type="submit" style={styles.button}>Login</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={styles.form}>
              <input
                type="text"
                name="name"
                placeholder="Name"
                required
                style={styles.input}
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                required
                style={styles.input}
              />
              <input
                type="password"
                name="password"
                placeholder="Password (min 6 characters)"
                required
                minLength={6}
                style={styles.input}
              />
              <button type="submit" style={styles.button}>Register</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>NoteSpace</h1>
        <div style={styles.headerRight}>
          <span style={styles.userName}>Welcome, {user?.name}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
        </div>
      </header>

      <nav style={styles.nav}>
        <button
          style={{...styles.navButton, ...(currentView === 'upload' ? styles.activeNavButton : {})}}
          onClick={() => setCurrentView('upload')}
        >
          Upload
        </button>
        <button
          style={{...styles.navButton, ...(currentView === 'list' ? styles.activeNavButton : {})}}
          onClick={() => setCurrentView('list')}
        >
          File List
        </button>
      </nav>

      <main style={styles.main}>
        {currentView === 'upload' && (
          <UploadPage 
            topics={topics} 
            onUpload={fetchNotes} 
            onCreateTopic={(topic) => {
              setTopics([...topics, topic]);
            }}
          />
        )}
        {currentView === 'list' && (
          <FileListView notes={notes} />
        )}
      </main>
    </div>
  );
}

function UploadPage({ topics, onUpload, onCreateTopic }) {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [creatingTopic, setCreatingTopic] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim()) {
      setUploadStatus('Topic name cannot be empty');
      return;
    }

    setCreatingTopic(true);
    try {
      // Topics don't require auth anymore
      const response = await axios.post(`${API_BASE_URL}/topics/`, {
        name: newTopicName.trim()
      });
      onCreateTopic(response.data.topic);
      setNewTopicName('');
      setShowTopicForm(false);
      setSelectedTopic(response.data.topic.id);
      setUploadStatus('Topic created successfully!');
      setTimeout(() => setUploadStatus(''), 2000);
    } catch (error) {
      console.error('Topic creation error:', error.response?.data || error.message);
      setUploadStatus(error.response?.data?.error || 'Failed to create topic');
    } finally {
      setCreatingTopic(false);
    }
  };

  const handleFile = async (file) => {
    if (!selectedTopic) {
      setUploadStatus('Please select a topic first');
      return;
    }

    // No file type restrictions - allow any file type
    setUploading(true);
    setUploadStatus('Uploading...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('topic_id', selectedTopic);

    try {
      // Uploads don't require auth anymore
      const response = await axios.post(`${API_BASE_URL}/upload/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadStatus('Upload successful!');
      setTimeout(() => {
        setUploadStatus('');
        setSelectedTopic('');
      }, 2000);
      onUpload();
    } catch (error) {
      setUploadStatus(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.uploadContainer}>
      <h2 style={styles.sectionTitle}>Upload File</h2>
      
      <div style={styles.formGroup}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label style={styles.label}>Select Topic:</label>
          <button
            type="button"
            onClick={() => setShowTopicForm(!showTopicForm)}
            style={styles.createTopicButton}
          >
            {showTopicForm ? 'Cancel' : '+ New Topic'}
          </button>
        </div>
        {showTopicForm ? (
          <form onSubmit={handleCreateTopic} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="Topic name"
              style={styles.input}
              disabled={creatingTopic}
              required
            />
            <button type="submit" style={styles.button} disabled={creatingTopic}>
              Create
            </button>
          </form>
        ) : (
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            style={styles.select}
            required
          >
            <option value="">-- Select a topic --</option>
            {topics.map(topic => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div
        style={{
          ...styles.dropZone,
          ...(dragActive ? styles.dropZoneActive : {})
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-input"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={uploading}
        />
        <label htmlFor="file-input" style={styles.dropZoneLabel}>
          {dragActive ? (
            <span>Drop file here</span>
          ) : (
            <span>
              <strong>Click to upload</strong> or drag and drop<br />
              Any file type accepted
            </span>
          )}
        </label>
      </div>

      {uploadStatus && (
        <div style={{
          ...styles.statusMessage,
          ...(uploadStatus.includes('success') ? styles.successMessage : styles.errorMessage)
        }}>
          {uploadStatus}
        </div>
      )}
    </div>
  );
}

function FileListView({ notes }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div style={styles.listContainer}>
      <h2 style={styles.sectionTitle}>Uploaded Files</h2>
      {notes.length === 0 ? (
        <p style={styles.emptyMessage}>No files uploaded yet.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Filename</th>
              <th style={styles.th}>Topic</th>
              <th style={styles.th}>Uploader</th>
              <th style={styles.th}>Size</th>
              <th style={styles.th}>Uploaded At</th>
            </tr>
          </thead>
          <tbody>
            {notes.map(note => (
              <tr key={note.id}>
                <td style={styles.td}>{note.original_filename}</td>
                <td style={styles.td}>{note.topic_name || `Topic #${note.topic_id}`}</td>
                <td style={styles.td}>{note.uploader_name || 'Unknown'}</td>
                <td style={styles.td}>{formatFileSize(note.file_size)}</td>
                <td style={styles.td}>{formatDate(note.uploaded_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    backgroundColor: '#fff',
    padding: '1rem 2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    color: '#333',
    fontSize: '1.5rem'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  userName: {
    color: '#666',
    fontSize: '0.9rem'
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  nav: {
    backgroundColor: '#fff',
    padding: '0 2rem',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    gap: '1rem'
  },
  navButton: {
    padding: '1rem 1.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#666',
    transition: 'all 0.2s'
  },
  activeNavButton: {
    color: '#007bff',
    borderBottomColor: '#007bff'
  },
  main: {
    maxWidth: '1200px',
    margin: '2rem auto',
    padding: '0 2rem'
  },
  authContainer: {
    maxWidth: '400px',
    margin: '5rem auto',
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  tabs: {
    display: 'flex',
    marginBottom: '1.5rem',
    borderBottom: '1px solid #e0e0e0'
  },
  tab: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#666'
  },
  activeTab: {
    color: '#007bff',
    borderBottomColor: '#007bff'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem'
  },
  button: {
    padding: '0.75rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500'
  },
  uploadContainer: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: '1.5rem',
    color: '#333'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#333',
    fontWeight: '500'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem'
  },
  dropZone: {
    border: '2px dashed #ddd',
    borderRadius: '8px',
    padding: '3rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#fafafa'
  },
  dropZoneActive: {
    borderColor: '#007bff',
    backgroundColor: '#f0f7ff'
  },
  dropZoneLabel: {
    cursor: 'pointer',
    color: '#666'
  },
  statusMessage: {
    marginTop: '1rem',
    padding: '0.75rem',
    borderRadius: '4px',
    textAlign: 'center'
  },
  successMessage: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },
  errorMessage: {
    backgroundColor: '#f8d7da',
    color: '#721c24'
  },
  createTopicButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  listContainer: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#666',
    padding: '2rem'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '0.75rem',
    textAlign: 'left',
    borderBottom: '2px solid #e0e0e0',
    color: '#333',
    fontWeight: '600'
  },
  td: {
    padding: '0.75rem',
    borderBottom: '1px solid #e0e0e0',
    color: '#666'
  }
};

export default App;

