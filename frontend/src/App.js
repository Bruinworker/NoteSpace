/**
 * Main application component for NoteSpace.
 * 
 * Handles authentication state, navigation, and coordinates
 * between different views (upload, list, meta-documents).
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api, { API_BASE_URL } from './utils/api';
import { VIEW_TYPES, STATUS_MESSAGES } from './utils/constants';

function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [topics, setTopics] = useState([]);
  const [notes, setNotes] = useState([]);
  const [metaDocuments, setMetaDocuments] = useState([]);
  const [currentView, setCurrentView] = useState(VIEW_TYPES.UPLOAD);
  const [selectedFile, setSelectedFile] = useState(null); // Currently viewed file for file viewer

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

  const handleOpenFile = (note) => {
    setSelectedFile(note);
    setCurrentView('file-viewer');
  };

  const handleCloseFileViewer = () => {
    setSelectedFile(null);
    setCurrentView('list');
  };

  const handleUpvote = async (noteId) => {
    try {
      const response = await api.post(`/upload/${noteId}/upvote`);
      const { upvote_count, already_upvoted } = response.data;

      // Update the note's upvote count in state
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId ? { ...n, upvote_count } : n
        )
      );

      if (already_upvoted) {
        console.log('You already upvoted this note');
      }
    } catch (error) {
      console.error('Error upvoting note:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Upvote failed: ${errorMsg}`);
    }
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
        <button
          style={{...styles.navButton, ...(currentView === 'meta-documents' ? styles.activeNavButton : {})}}
          onClick={() => {
            setCurrentView('meta-documents');
            fetchMetaDocuments();
          }}
        >
          Meta Documents
        </button>
        {selectedFile && (
          <button
            style={{...styles.navButton, ...(currentView === 'file-viewer' ? styles.activeNavButton : {}), marginLeft: 'auto'}}
            onClick={() => setCurrentView('file-viewer')}
          >
            📄 {selectedFile.original_filename}
            <span 
              onClick={(e) => { e.stopPropagation(); handleCloseFileViewer(); }}
              style={styles.closeTabButton}
            >
              ✕
            </span>
          </button>
        )}
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
          <FileListView notes={notes} topics={topics} onUpvote={handleUpvote} onOpenFile={handleOpenFile} />
        )}
        {currentView === 'file-viewer' && selectedFile && (
          <FileViewer file={selectedFile} onClose={handleCloseFileViewer} />
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

/**
 * FileListView Component
 * 
 * Displays uploaded files in a table with the following features:
 * - Search: Filter files by filename, topic, or uploader name
 * - Sort: Toggle ascending/descending order by upload date
 * - Filter: Filter by topic (cycles through all topics)
 * - Upvote: Allow authenticated users to upvote files
 * - View: Click filename to open file in viewer
 * 
 * @param {Array} notes - Array of note objects to display
 * @param {Array} topics - Array of available topics for filtering
 * @param {Function} onUpvote - Callback when upvote button is clicked
 * @param {Function} onOpenFile - Callback when filename is clicked
 */
function FileListView({ notes, topics, onUpvote, onOpenFile }) {
  // State for sorting order: 'asc' (oldest first) or 'desc' (newest first)
  const [sortOrder, setSortOrder] = useState('desc');
  
  // State for topic filter: 'all' shows all topics, or specific topic_id
  const [topicFilter, setTopicFilter] = useState('all');
  
  // State for search query: filters by filename, topic name, or uploader
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Format a date string into a human-readable locale string.
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  /**
   * Convert bytes to human-readable file size.
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size (e.g., "1.5 MB")
   */
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Get available topics for the filter dropdown
  const availableTopics = topics || [];

  /**
   * Apply search filter to notes.
   * Searches across filename, topic name, and uploader name (case-insensitive).
   */
  const searchFilteredNotes = notes.filter(note => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const filename = (note.original_filename || '').toLowerCase();
    const topicName = (note.topic_name || '').toLowerCase();
    const uploaderName = (note.uploader_name || '').toLowerCase();
    
    return filename.includes(query) || 
           topicName.includes(query) || 
           uploaderName.includes(query);
  });

  // Apply topic filter on top of search results
  const filteredNotes = topicFilter === 'all' 
    ? searchFilteredNotes 
    : searchFilteredNotes.filter(note => note.topic_id.toString() === topicFilter);

  // Sort filtered notes by uploaded_at based on sortOrder
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    const dateA = new Date(a.uploaded_at);
    const dateB = new Date(b.uploaded_at);
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Cycle through topic filters: all -> topic1 -> topic2 -> ... -> all
  const cycleTopicFilter = () => {
    if (topicFilter === 'all') {
      // Go to first topic if available
      if (availableTopics.length > 0) {
        setTopicFilter(availableTopics[0].id.toString());
      }
    } else {
      // Find current index and go to next, or back to 'all'
      const currentIndex = availableTopics.findIndex(t => t.id.toString() === topicFilter);
      if (currentIndex < availableTopics.length - 1) {
        setTopicFilter(availableTopics[currentIndex + 1].id.toString());
      } else {
        setTopicFilter('all');
      }
    }
  };

  // Get current filter display name
  const getTopicFilterDisplay = () => {
    if (topicFilter === 'all') return 'All Topics';
    const topic = availableTopics.find(t => t.id.toString() === topicFilter);
    return topic ? topic.name : 'All Topics';
  };

  return (
    <div style={styles.listContainer}>
      <h2 style={styles.sectionTitle}>Uploaded Files</h2>
      
      {/* Search Bar - allows users to search through files */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="🔍 Search by filename, topic, or uploader..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            style={styles.clearSearchButton}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      
      {/* Results count indicator */}
      {searchQuery && (
        <p style={styles.searchResults}>
          Found {sortedNotes.length} {sortedNotes.length === 1 ? 'file' : 'files'} 
          {topicFilter !== 'all' && ` in "${getTopicFilterDisplay()}"`}
        </p>
      )}
      
      {notes.length === 0 ? (
        <p style={styles.emptyMessage}>No files uploaded yet.</p>
      ) : sortedNotes.length === 0 ? (
        <p style={styles.emptyMessage}>No files match your search criteria.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Filename</th>
              <th 
                style={{...styles.th, ...styles.sortableHeader}} 
                onClick={cycleTopicFilter}
              >
                Topic: {getTopicFilterDisplay()} ⟳
              </th>
              <th style={styles.th}>Uploader</th>
              <th style={styles.th}>Size</th>
              <th 
                style={{...styles.th, ...styles.sortableHeader}} 
                onClick={toggleSortOrder}
              >
                Uploaded At {sortOrder === 'asc' ? '↑' : '↓'}
              </th>
              <th style={styles.th}>Upvotes</th>
            </tr>
          </thead>
          <tbody>
            {sortedNotes.map(note => (
              <tr key={note.id}>
                <td style={styles.td}>
                  <span
                    onClick={() => onOpenFile(note)}
                    style={styles.fileLink}
                  >
                    {note.original_filename}
                  </span>
                </td>
                <td style={styles.td}>{note.topic_name || `Topic #${note.topic_id}`}</td>
                <td style={styles.td}>{note.uploader_name || 'Unknown'}</td>
                <td style={styles.td}>{formatFileSize(note.file_size)}</td>
                <td style={styles.td}>{formatDate(note.uploaded_at)}</td>
                <td style={styles.td}>
                  <button
                    onClick={() => onUpvote(note.id)}
                    style={styles.upvoteButton}
                  >
                    ⬆ {note.upvote_count || 0}
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

function FileViewer({ file, onClose }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fileUrl = `${API_BASE_URL}${file.file_url.replace('/api', '')}`;
  const fileExtension = file.original_filename.split('.').pop().toLowerCase();

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        // For text-based files, fetch and display content
        if (['txt', 'md', 'json', 'js', 'py', 'html', 'css', 'csv'].includes(fileExtension)) {
          const response = await axios.get(fileUrl, { responseType: 'text' });
          setContent(response.data);
        } else {
          // For other files, we'll show them in an iframe or as download
          setContent(null);
        }
      } catch (err) {
        setError('Failed to load file content');
        console.error('Error loading file:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [file, fileUrl, fileExtension]);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const isPreviewable = ['txt', 'md', 'json', 'js', 'py', 'html', 'css', 'csv', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExtension);
  const isTextFile = ['txt', 'md', 'json', 'js', 'py', 'html', 'css', 'csv'].includes(fileExtension);
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExtension);
  const isPdf = fileExtension === 'pdf';

  return (
    <div style={styles.fileViewerContainer}>
      <div style={styles.fileViewerHeader}>
        <div>
          <h2 style={styles.fileViewerTitle}>{file.original_filename}</h2>
          <div style={styles.fileViewerMeta}>
            <span>Topic: {file.topic_name || 'Unknown'}</span>
            <span style={{ margin: '0 1rem' }}>•</span>
            <span>Uploaded by: {file.uploader_name || 'Anonymous'}</span>
            <span style={{ margin: '0 1rem' }}>•</span>
            <span>Size: {formatFileSize(file.file_size)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a
            href={fileUrl}
            download={file.original_filename}
            style={styles.downloadButton}
          >
            ⬇ Download
          </a>
          <button onClick={onClose} style={styles.closeButton}>
            ✕ Close
          </button>
        </div>
      </div>

      <div style={styles.fileViewerContent}>
        {loading ? (
          <div style={styles.fileViewerLoading}>Loading file...</div>
        ) : error ? (
          <div style={styles.fileViewerError}>{error}</div>
        ) : isTextFile && content ? (
          <pre style={styles.fileViewerText}>{content}</pre>
        ) : isImage ? (
          <img src={fileUrl} alt={file.original_filename} style={styles.fileViewerImage} />
        ) : isPdf ? (
          <iframe
            src={fileUrl}
            title={file.original_filename}
            style={styles.fileViewerIframe}
          />
        ) : (
          <div style={styles.fileViewerNotSupported}>
            <p>Preview not available for this file type (.{fileExtension})</p>
            <p>Click "Download" to view this file.</p>
          </div>
        )}
      </div>
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
      const response = await axios.post(`${API_BASE_URL}/meta-documents/process/topic/${topicId}`);
      alert('Processing started! This may take a few moments. Check back in a bit.');
      // Poll for status updates
      setTimeout(() => {
        onRefresh();
        setProcessingTopics({ ...processingTopics, [topicId]: false });
      }, 2000);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to start processing');
      setProcessingTopics({ ...processingTopics, [topicId]: false });
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
  sortableHeader: {
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#f0f0f0'
    }
  },
  upvoteButton: {
    padding: '0.35rem 0.75rem',
    borderRadius: '999px',
    border: '1px solid #e0e0e0',
    backgroundColor: '#f9fafb',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  fileLink: {
    color: '#007bff',
    textDecoration: 'none',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'color 0.15s ease'
  },
  closeTabButton: {
    marginLeft: '0.5rem',
    padding: '0.1rem 0.4rem',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '0.75rem',
    lineHeight: '1'
  },
  fileViewerContainer: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 200px)'
  },
  fileViewerHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb'
  },
  fileViewerTitle: {
    margin: 0,
    fontSize: '1.25rem',
    color: '#333'
  },
  fileViewerMeta: {
    marginTop: '0.5rem',
    fontSize: '0.85rem',
    color: '#666'
  },
  fileViewerContent: {
    flex: 1,
    overflow: 'auto',
    padding: '1rem',
    backgroundColor: '#fafafa'
  },
  fileViewerText: {
    margin: 0,
    padding: '1rem',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    fontSize: '0.9rem',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: 'monospace',
    overflow: 'auto'
  },
  fileViewerImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    display: 'block',
    margin: '0 auto'
  },
  fileViewerIframe: {
    width: '100%',
    height: '100%',
    border: 'none'
  },
  fileViewerLoading: {
    textAlign: 'center',
    padding: '3rem',
    color: '#666'
  },
  fileViewerError: {
    textAlign: 'center',
    padding: '3rem',
    color: '#dc3545'
  },
  fileViewerNotSupported: {
    textAlign: 'center',
    padding: '3rem',
    color: '#666'
  },
  closeButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  downloadButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    textDecoration: 'none',
    display: 'inline-block'
  },
  td: {
    padding: '0.75rem',
    borderBottom: '1px solid #e0e0e0',
    color: '#666'
  },
  // Search functionality styles
  searchContainer: {
    position: 'relative',
    marginBottom: '1.5rem'
  },
  searchInput: {
    width: '100%',
    padding: '0.875rem 2.5rem 0.875rem 1rem',
    fontSize: '1rem',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box'
  },
  clearSearchButton: {
    position: 'absolute',
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    fontSize: '1rem',
    color: '#999',
    cursor: 'pointer',
    padding: '0.25rem',
    borderRadius: '50%'
  },
  searchResults: {
    color: '#666',
    fontSize: '0.9rem',
    marginBottom: '1rem',
    marginTop: '-0.5rem'
  }
};

export default App;

