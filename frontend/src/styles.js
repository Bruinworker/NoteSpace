/**
 * Shared style definitions for the application.
 * 
 * Centralizes all inline styles for consistency and maintainability.
 */

export const commonStyles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  title: {
    margin: 0,
    color: '#333',
    fontSize: '1.5rem'
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: '1.5rem',
    color: '#333'
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
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem'
  }
};

export const authStyles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  authContainer: {
    maxWidth: '400px',
    margin: '5rem auto',
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  title: {
    margin: 0,
    color: '#333',
    fontSize: '1.5rem'
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
  }
};

export const layoutStyles = {
  header: {
    backgroundColor: '#fff',
    padding: '1rem 2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
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
  }
};

export const uploadStyles = {
  uploadContainer: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
  }
};

export const listStyles = {
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
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '0.75rem',
    borderBottom: '1px solid #e0e0e0',
    color: '#666'
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
  }
};

