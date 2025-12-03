import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiUploadCloud, FiList, FiFileText } from 'react-icons/fi';

// Use relative URL for same-domain deployment, or absolute URL if specified
const API_BASE_URL = process.env.REACT_APP_API_URL || (window.location.origin + '/api');
const BACKEND_BASE_URL =
  process.env.REACT_APP_BACKEND_BASE_URL || 'http://localhost:5001';

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
  const [metaDocuments, setMetaDocuments] = useState([]);
  const [currentView, setCurrentView] = useState('upload'); // 'upload', 'list', or 'meta-documents'

  useEffect(() => {
    // Always fetch topics (no auth required)
    fetchTopics();
    
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser();
      fetchNotes();
      fetchMetaDocuments();
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

  const fetchMetaDocuments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/meta-documents/list`);
      setMetaDocuments(response.data.meta_documents || []);
    } catch (error) {
      console.error('Error fetching meta documents:', error);
    }
  };

  const handleOpenNote = async (note) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/upload/${note.id}`);
      const updatedNote = response.data.note;

      setNotes((prev) =>
        prev.map((n) =>
          n.id === updatedNote.id ? { ...n, view_count: updatedNote.view_count } : n
        )
      );

      // Open the file in the same tab from Flask backend
      window.location.href = `${BACKEND_BASE_URL}${updatedNote.file_url}`;
    } catch (error) {
      console.error('Error opening note:', error);
    }
  };



  const handleUpvote = async (noteId) => {
    try {
      // use api (has Authorization header from interceptor)
      const response = await api.post(`/upload/${noteId}/upvote`);
      const { upvote_count, already_upvoted } = response.data;

      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId ? { ...n, upvote_count } : n
        )
      );

      if (already_upvoted) {
        console.log('User already upvoted this note');
        // optional: show a toast / alert here
      }
    } catch (error) {
      console.error('Error upvoting note:', error);
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
          title="Upload new files"
        >
          Upload
        </button>

        <button
          style={{...styles.navButton, ...(currentView === 'list' ? styles.activeNavButton : {})}}
          onClick={() => setCurrentView('list')}
          title="View all uploaded files"
        >
          File List
        </button>

        <button
          style={{...styles.navButton, ...(currentView === 'meta-documents' ? styles.activeNavButton : {})}}
          onClick={() => {
            setCurrentView('meta-documents');
            fetchMetaDocuments();
          }}
          title="Generate or view meta documents"
        >
          Meta Documents
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
          <FileListView
            notes={notes}
            onOpenNote={handleOpenNote}
            onUpvote={handleUpvote}
          />
        )}
        {currentView === 'meta-documents' && (
          <MetaDocumentsView 
            topics={topics} 
            metaDocuments={metaDocuments}
            onRefresh={fetchMetaDocuments}
          />
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
    if (e.type === 'dragenter' || e.type === 'dragleave' || e.type === 'dragover') {
      setDragActive(e.type !== 'dragleave');
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

    setUploading(true);
    setUploadStatus('Uploading...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('topic_id', selectedTopic);

    try {
      await axios.post(`${API_BASE_URL}/upload/`, formData, {
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
        <div style={{ marginBottom: '0.5rem' }}>
          <label style={styles.label}>Select Topic:</label>
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
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Drop file here</div>
              <div style={{ fontSize: '0.85rem' }}>We’ll start uploading right away</div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Click to upload or drag a file</div>
              <div style={{ fontSize: '0.85rem' }}>PDFs, slides, docs — any file type is accepted</div>
            </div>
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

      <button
        type="button"
        onClick={() => setShowTopicForm(!showTopicForm)}
        style={styles.fabButton}
      >
        {showTopicForm ? 'Close' : '+ New Topic'}
      </button>
    </div>
  );
}

function FileListView({ notes, onOpenNote, onUpvote }) {
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
        <table style={styles.table} className="file-table">
          <thead>
            <tr>
              <th style={styles.th}>Filename</th>
              <th style={styles.th}>Topic</th>
              <th style={styles.th}>Uploader</th>
              <th style={styles.th}>Size</th>
              <th style={styles.th}>Uploaded At</th>
              <th style={styles.th}>Views</th>
              <th style={styles.th}>Upvotes</th>
            </tr>
          </thead>
          <tbody>
            {notes.map(note => (
              <tr
                key={note.id}
                onClick={() => onOpenNote(note)}
                className="file-row"
                style={{ cursor: 'pointer' }}
              >
                <td style={styles.td}>{note.original_filename}</td>
                <td style={styles.td}>{note.topic_name || `Topic #${note.topic_id}`}</td>
                <td style={styles.td}>{note.uploader_name || 'Unknown'}</td>
                <td style={styles.td}>{formatFileSize(note.file_size)}</td>
                <td style={styles.td}>{formatDate(note.uploaded_at)}</td>
                <td style={styles.td}>{note.view_count ?? 0}</td>
                <td
                  style={styles.td}
                  onClick={(e) => e.stopPropagation()} // prevent triggering onOpenNote
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpvote(note.id);
                    }}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '999px',
                      border: `1px solid ${theme.colors.border}`,
                      backgroundColor: '#f9fafb',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    ⬆ {note.upvote_count ?? 0}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function MetaDocumentsView({ topics, metaDocuments, onRefresh }) {
  const [processingTopics, setProcessingTopics] = useState({});
  const [expandedDoc, setExpandedDoc] = useState(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleProcessTopic = async (topicId) => {
    setProcessingTopics({ ...processingTopics, [topicId]: true });
    try {
      await axios.post(`${API_BASE_URL}/meta-documents/process/topic/${topicId}`);
      alert('Processing started! This may take a few moments. Check back in a bit.');
      setTimeout(() => {
        onRefresh();
        setProcessingTopics((prev) => ({ ...prev, [topicId]: false }));
      }, 2000);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to start processing');
      setProcessingTopics((prev) => ({ ...prev, [topicId]: false }));
    }
  };

  const handleDownload = async (metaDocId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/meta-documents/${metaDocId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `meta_document_${metaDocId}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to download document');
    }
  };

  const getMetaDocForTopic = (topicId) => {
    return metaDocuments.find(doc => doc.topic_id === topicId && doc.processing_status === 'completed');
  };

  const getProcessingStatus = (topicId) => {
    const doc = metaDocuments.find(doc => doc.topic_id === topicId);
    return doc ? doc.processing_status : null;
  };

  return (
    <div style={styles.listContainer}>
      <h2 style={styles.sectionTitle}>Meta Documents</h2>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Process uploaded files to generate synthesized meta documents using AI.
      </p>
      
      {topics.length === 0 ? (
        <p style={styles.emptyMessage}>No topics available. Create a topic first.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {topics.map(topic => {
            const metaDoc = getMetaDocForTopic(topic.id);
            const status = getProcessingStatus(topic.id);
            const isProcessing = processingTopics[topic.id] || status === 'processing';
            
            return (
              <div key={topic.id} style={styles.metaDocCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: '#333' }}>{topic.name}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {status === 'completed' && metaDoc && (
                      <button
                        onClick={() => handleDownload(metaDoc.id)}
                        style={styles.downloadButton}
                      >
                        Download
                      </button>
                    )}
                    {status !== 'processing' && (
                      <button
                        onClick={() => handleProcessTopic(topic.id)}
                        disabled={isProcessing}
                        style={{
                          ...styles.processButton,
                          ...(isProcessing ? styles.disabledButton : {})
                        }}
                      >
                        {isProcessing ? 'Processing...' : 'Process Files'}
                      </button>
                    )}
                  </div>
                </div>
                
                {status === 'processing' && (
                  <div style={styles.statusMessage}>
                    <span style={{ color: '#007bff' }}>⏳ Processing files...</span>
                  </div>
                )}
                
                {status === 'failed' && (
                  <div style={{ ...styles.statusMessage, backgroundColor: '#f8d7da', color: '#721c24', padding: '0.75rem', borderRadius: '4px' }}>
                    <strong>Processing failed:</strong> {metaDocuments.find(doc => doc.topic_id === topic.id)?.error_message || 'Unknown error'}
                  </div>
                )}
                
                {status === 'completed' && metaDoc && (
                  <div>
                    <div style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                      <strong>Created:</strong> {formatDate(metaDoc.created_at)} • 
                      <strong> Chunks:</strong> {metaDoc.chunk_count} • 
                      <strong> Tokens:</strong> {metaDoc.token_count}
                    </div>
                    <div style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                      <strong>Source files:</strong> {JSON.parse(metaDoc.source_filenames || '[]').join(', ')}
                    </div>
                    <div style={styles.metaDocContent}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <strong>Synthesized Content:</strong>
                        <button
                          onClick={() => setExpandedDoc(expandedDoc === metaDoc.id ? null : metaDoc.id)}
                          style={styles.toggleButton}
                        >
                          {expandedDoc === metaDoc.id ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                      <div style={{
                        maxHeight: expandedDoc === metaDoc.id ? 'none' : '200px',
                        overflow: expandedDoc === metaDoc.id ? 'visible' : 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: expandedDoc === metaDoc.id ? 'pre-wrap' : 'pre-line',
                        lineHeight: '1.6',
                        color: '#333'
                      }}>
                        {metaDoc.synthesized_content}
                      </div>
                    </div>
                  </div>
                )}
                
                {!status && (
                  <div style={styles.statusMessage}>
                    <span style={{ color: '#666' }}>No meta document yet. Click "Process Files" to generate one.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const theme = {
  colors: {
    bg: '#0f172a',
    page: '#f3f4f6',
    surface: '#ffffff',
    accent: '#4f46e5',
    accentSoft: 'rgba(79, 70, 229, 0.08)',
    danger: '#dc2626',
    textMain: '#111827',
    textSubtle: '#6b7280',
    border: '#e5e7eb'
  },
  radii: {
    lg: '16px',
    md: '10px',
    pill: '999px'
  },
  shadows: {
    soft: '0 18px 45px rgba(15,23,42,0.08)',
    light: '0 4px 12px rgba(15,23,42,0.06)'
  }
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: theme.colors.page,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    background: `linear-gradient(90deg, ${theme.colors.bg}, #020617)`,
    padding: '1rem 2.5rem',
    boxShadow: theme.shadows.soft,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 20
  },
  title: {
    margin: 0,
    color: '#e5e7eb',
    fontSize: '1.35rem',
    letterSpacing: '0.04em',
    fontWeight: 600
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  userName: {
    color: '#e5e7eb',
    fontSize: '0.9rem'
  },
  logoutButton: {
    padding: '0.45rem 1rem',
    backgroundColor: theme.colors.danger,
    color: 'white',
    border: 'none',
    borderRadius: theme.radii.pill,
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 500,
    boxShadow: theme.shadows.light
  },
  nav: {
    paddingTop: '0.75rem',
    paddingInline: '2.5rem',
    display: 'flex',
    justifyContent: 'center'
  },
  navInner: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.pill,
    boxShadow: theme.shadows.light,
    padding: '0.25rem',
    display: 'inline-flex',
    gap: '0.25rem'
  },
  navButton: {
    padding: '0.55rem 1.35rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: theme.radii.pill,
    cursor: 'pointer',
    fontSize: '0.95rem',
    color: theme.colors.textSubtle,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'background 0.15s ease, color 0.15s ease, transform 0.05s ease'
  },
  activeNavButton: {
    backgroundColor: theme.colors.accentSoft,
    color: theme.colors.accent,
    transform: 'translateY(-1px)'
  },
  main: {
    maxWidth: '1200px',
    margin: '2.5rem auto',
    padding: '0 2.5rem 3rem'
  },
  authContainer: {
    maxWidth: '420px',
    margin: '5rem auto',
    backgroundColor: theme.colors.surface,
    padding: '2.25rem',
    borderRadius: theme.radii.lg,
    boxShadow: theme.shadows.soft
  },
  tabs: {
    display: 'flex',
    marginBottom: '1.5rem',
    backgroundColor: '#f9fafb',
    borderRadius: theme.radii.pill,
    padding: '0.15rem'
  },
  tab: {
    flex: 1,
    padding: '0.55rem 0.75rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: theme.radii.pill,
    cursor: 'pointer',
    fontSize: '0.95rem',
    color: theme.colors.textSubtle
  },
  activeTab: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.accent,
    boxShadow: theme.shadows.light
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  input: {
    padding: '0.75rem',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radii.md,
    fontSize: '1rem',
    outline: 'none'
  },
  button: {
    padding: '0.75rem',
    backgroundColor: theme.colors.accent,
    color: 'white',
    border: 'none',
    borderRadius: theme.radii.md,
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    boxShadow: theme.shadows.light
  },
  uploadContainer: {
    backgroundColor: theme.colors.surface,
    padding: '2rem',
    borderRadius: theme.radii.lg,
    boxShadow: theme.shadows.soft,
    position: 'relative',
    paddingBottom: '3.5rem'
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: '1.25rem',
    color: theme.colors.textMain,
    fontSize: '1.25rem'
  },
  formGroup: {
    marginBottom: '1.75rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    color: theme.colors.textMain,
    fontWeight: '500'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radii.md,
    fontSize: '1rem'
  },
  dropZone: {
    border: `2px dashed ${theme.colors.border}`,
    borderRadius: theme.radii.lg,
    padding: '3rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#f9fafb'
  },
  dropZoneActive: {
    borderColor: theme.colors.accent,
    backgroundColor: '#eef2ff'
  },
  dropZoneLabel: {
    cursor: 'pointer',
    color: theme.colors.textSubtle,
    fontSize: '0.95rem'
  },
  statusMessage: {
    marginTop: '1rem',
    padding: '0.75rem',
    borderRadius: theme.radii.md,
    textAlign: 'center',
    fontSize: '0.9rem'
  },
  successMessage: {
    backgroundColor: '#dcfce7',
    color: '#166534'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c'
  },
  createTopicButton: {
    padding: '0.4rem 0.9rem',
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    borderRadius: theme.radii.pill,
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 500
  },
  fabButton: {
    position: 'absolute',
    right: '1.75rem',
    bottom: '1.5rem',
    padding: '0.65rem 1.2rem',
    borderRadius: theme.radii.pill,
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    boxShadow: theme.shadows.light,
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 500
  },
  listContainer: {
    backgroundColor: theme.colors.surface,
    padding: '2rem',
    borderRadius: theme.radii.lg,
    boxShadow: theme.shadows.soft
  },
  emptyMessage: {
    textAlign: 'center',
    color: theme.colors.textSubtle,
    padding: '2rem'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '0.5rem'
  },
  th: {
    padding: '0.9rem 0.75rem',
    textAlign: 'left',
    borderBottom: `2px solid ${theme.colors.border}`,
    color: theme.colors.textMain,
    fontWeight: 600,
    fontSize: '0.9rem'
  },
  td: {
    padding: '0.8rem 0.75rem',
    borderBottom: `1px solid ${theme.colors.border}`,
    color: theme.colors.textSubtle,
    fontSize: '0.9rem'
  },
  metaDocCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: '1.25rem',
    boxShadow: theme.shadows.light,
    border: `1px solid ${theme.colors.border}`
  },
  downloadButton: {
    padding: '0.35rem 0.8rem',
    borderRadius: theme.radii.pill,
    border: 'none',
    backgroundColor: theme.colors.accent,
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.85rem'
  },
  processButton: {
    padding: '0.35rem 0.8rem',
    borderRadius: theme.radii.pill,
    border: 'none',
    backgroundColor: '#22c55e',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.85rem'
  },
  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  metaDocContent: {
    marginTop: '0.75rem',
    padding: '0.75rem',
    borderRadius: theme.radii.md,
    backgroundColor: '#f9fafb'
  },
  toggleButton: {
    padding: '0.25rem 0.6rem',
    borderRadius: theme.radii.pill,
    border: `1px solid ${theme.colors.border}`,
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '0.8rem'
  }
};

export default App;
