# NoteSpace

A collaborative note-sharing platform for uploading, organizing, and discovering course notes. Built with React (frontend) and Flask (backend).

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Manual Setup](#manual-setup)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Testing](#testing)

---

## ✨ Features

### Core Features
- **User Authentication**: Secure registration and login with JWT tokens
- **File Upload**: Upload notes (PDF, DOCX, TXT, and more) to organized topics
- **File Management**: View, download, and preview uploaded files
- **Topic Organization**: Create and manage topics/courses for organizing notes

### Advanced Features
- **🔍 Search**: Search files by filename, topic, or uploader name
- **📊 Sorting**: Sort files by upload date (ascending/descending)
- **🏷️ Filtering**: Filter files by topic
- **⬆️ Upvoting**: Upvote helpful notes (requires authentication)
- **👁️ File Viewer**: Preview files directly in the browser (text, images, PDFs)
- **🤖 Meta Documents**: AI-generated summaries of uploaded notes

---

## 🏗️ Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         React Frontend                               │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐│   │
│  │  │  Auth    │  │  Upload  │  │ File List│  │   File Viewer        ││   │
│  │  │  Forms   │  │  Page    │  │  View    │  │   Component          ││   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘│   │
│  │       │              │             │                   │            │   │
│  │       └──────────────┴─────────────┴───────────────────┘            │   │
│  │                              │                                       │   │
│  │                    ┌─────────┴─────────┐                            │   │
│  │                    │   Axios API       │                            │   │
│  │                    │   (with JWT)      │                            │   │
│  │                    └─────────┬─────────┘                            │   │
│  └──────────────────────────────┼──────────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │ HTTP/HTTPS
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVER (Flask Backend)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Flask Application                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│  │  │ Auth Routes  │  │ Topic Routes │  │    Upload Routes         │  │   │
│  │  │ /api/auth/*  │  │ /api/topics/*│  │    /api/upload/*         │  │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────────┘  │   │
│  │         │                 │                      │                  │   │
│  │         └─────────────────┴──────────────────────┘                  │   │
│  │                           │                                          │   │
│  │              ┌────────────┴────────────┐                            │   │
│  │              │   SQLAlchemy ORM        │                            │   │
│  │              └────────────┬────────────┘                            │   │
│  └───────────────────────────┼──────────────────────────────────────────┘   │
│                              │                                              │
│  ┌───────────────────────────┴───────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │   ┌─────────────────┐                    ┌─────────────────────┐      │ │
│  │   │   SQLite DB     │                    │   File Storage      │      │ │
│  │   │  notespace.db   │                    │   /uploads/         │      │ │
│  │   └─────────────────┘                    └─────────────────────┘      │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Entity-Relationship (ER) Diagram

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      USERS       │       │      NOTES       │       │     TOPICS       │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ PK id            │       │ PK id            │       │ PK id            │
│    name          │       │ FK user_id ──────┼───────│    name          │
│    email (unique)│◄──────┼────────────────┐ │       │    deadline      │
│    password_hash │       │ FK topic_id ────┼───────►│    created_at    │
│    created_at    │       │    file_url     │       └──────────────────┘
└────────┬─────────┘       │    original_    │
         │                 │      filename   │
         │                 │    file_size    │
         │                 │    upvote_count │
         │                 │    uploaded_at  │
         │                 └────────┬────────┘
         │                          │
         │    ┌──────────────────┐  │
         │    │     UPVOTES      │  │
         │    ├──────────────────┤  │
         │    │ PK id            │  │
         └────┤ FK user_id       │  │
              │ FK note_id ──────┼──┘
              │    created_at    │
              │                  │
              │ UNIQUE(user_id,  │
              │        note_id)  │
              └──────────────────┘

┌──────────────────┐
│  META_DOCUMENTS  │
├──────────────────┤
│ PK id            │
│ FK topic_id      │───────► TOPICS
│ FK note_id       │───────► NOTES (optional)
│    synthesized_  │
│      content     │
│    source_       │
│      filenames   │
│    chunk_count   │
│    token_count   │
│    processing_   │
│      status      │
│    error_message │
│    created_at    │
│    updated_at    │
└──────────────────┘
```

### Data Flow

1. **Authentication Flow**:
   - User registers/logs in → Backend validates → JWT token returned → Token stored in localStorage
   - Subsequent requests include JWT in Authorization header

2. **File Upload Flow**:
   - User selects file + topic → File sent to `/api/upload/` → File saved to `/uploads/` folder
   - Metadata stored in SQLite → Note ID returned to frontend

3. **File Viewing Flow**:
   - User clicks filename → Frontend requests file from `/api/upload/files/{filename}`
   - File served inline for browser preview (text, image, PDF)

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **Git** for version control

### Option 1: Using npm scripts (Recommended)

```bash
# Clone the repository
git clone https://github.com/Bruinworker/NoteSpace.git
cd NoteSpace

# Install all dependencies
npm install
npm run install-all

# Start both servers (backend + frontend)
npm start
```

### Option 2: Using the startup script (macOS/Linux)

```bash
# Make script executable (first time only)
chmod +x start.sh

# Run both backend and frontend
./start.sh
```

---

## 🔧 Manual Setup

### Backend Setup

1. **Create and activate a virtual environment** (recommended):

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

2. **Install Python dependencies**:

```bash
pip install -r requirements.txt
```

3. **Run the Flask backend**:

```bash
# Option A: From project root (recommended)
# Windows PowerShell:
$env:PYTHONPATH = "."
python backend/app.py

# macOS/Linux:
PYTHONPATH=. python backend/app.py

# Option B: Using Python module
python -m backend.app
```

The backend will run on `http://localhost:5001`

### Frontend Setup

1. **Navigate to frontend directory**:

```bash
cd frontend
```

2. **Install Node.js dependencies**:

```bash
npm install
```

3. **Start the React development server**:

```bash
npm start
```

The frontend will run on `http://localhost:3000`

### Accessing the Application

- **Frontend**: http://localhost:3000 (development)
- **Backend API**: http://localhost:5001/api

**Note**: When running manually, you need **two terminal windows** - one for the backend and one for the frontend.

---

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Login and get JWT token | No |
| POST | `/api/auth/logout` | Logout (client-side) | Yes |
| GET | `/api/auth/me` | Get current user info | Yes |

### Topic Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/topics/` | List all topics | No |
| POST | `/api/topics/` | Create a new topic | No |
| GET | `/api/topics/<id>` | Get topic details | No |

### Upload Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/upload/` | Upload a file | No* |
| GET | `/api/upload/list` | List all uploaded files | No |
| GET | `/api/upload/<id>` | Get note details | No |
| GET | `/api/upload/files/<filename>` | View/download a file | No |
| POST | `/api/upload/<id>/upvote` | Upvote a note | Yes |

*Authentication is optional for uploads but recommended to track uploader.

### Request/Response Examples

**Register a User:**
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "password": "password123"}'
```

**Upload a File:**
```bash
curl -X POST http://localhost:5001/api/upload/ \
  -F "file=@notes.pdf" \
  -F "topic_id=1"
```

---

## 🗄️ Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts with hashed passwords |
| `topics` | Course topics for organizing notes |
| `notes` | Uploaded file metadata |
| `upvotes` | User upvotes on notes |
| `meta_documents` | AI-generated note summaries |

### Key Relationships

- **User → Notes**: One-to-many (user uploads many notes)
- **Topic → Notes**: One-to-many (topic contains many notes)
- **User ↔ Notes (via Upvotes)**: Many-to-many (users can upvote many notes)
- **Topic → MetaDocuments**: One-to-many (topic can have summaries)

---

## 📁 Project Structure

```
NoteSpace/
├── backend/                    # Flask backend
│   ├── app.py                 # Application factory & configuration
│   ├── database.py            # SQLAlchemy database setup
│   ├── models.py              # Database models (User, Topic, Note, etc.)
│   ├── constants.py           # Configuration constants
│   ├── auth_routes.py         # Authentication endpoints
│   ├── topic_routes.py        # Topic management endpoints
│   ├── upload_routes.py       # File upload/download endpoints
│   └── meta_document_routes.py # AI summary endpoints
│
├── frontend/                   # React frontend
│   ├── public/                # Static files
│   ├── src/
│   │   ├── App.js            # Main application component
│   │   └── utils/
│   │       ├── api.js        # Axios API configuration
│   │       └── constants.js  # Frontend constants
│   ├── cypress/              # E2E tests
│   │   ├── e2e/
│   │   │   ├── auth.cy.js    # Authentication tests
│   │   │   ├── upload.cy.js  # Upload tests
│   │   │   └── filelist.cy.js # File list tests
│   │   └── support/
│   │       └── e2e.js        # Cypress custom commands
│   └── cypress.config.js     # Cypress configuration
│
├── uploads/                   # Uploaded files storage
├── notespace.db              # SQLite database
├── requirements.txt          # Python dependencies
├── package.json              # Root package.json for npm scripts
└── README.md                 # This file
```

---

## 🧪 Testing

### End-to-End Tests (Cypress)

The project includes 27 automated E2E tests covering:

- **Authentication** (7 tests): Register, login, logout, error handling
- **File Upload** (6 tests): Topic selection, file uploads, validation
- **File List** (14 tests): Search, sort, filter, upvote, file viewer

#### Running Tests

```bash
cd frontend

# Interactive mode (opens Cypress UI)
npm run cypress:open

# Headless mode (CI/CD)
npm run test:e2e
```

**Note**: Both backend (port 5001) and frontend (port 3000) must be running before running tests.

---

## 🔐 Security Features

- **Password Hashing**: Passwords are hashed using Werkzeug's `generate_password_hash`
- **JWT Authentication**: Stateless authentication with configurable expiry
- **CORS Protection**: Cross-Origin Resource Sharing properly configured
- **Input Validation**: All user inputs are validated and sanitized
- **Secure File Storage**: Files stored with UUID filenames to prevent path traversal

---

## 📝 Configuration

Key configuration values are defined in:

- **Backend**: `backend/constants.py`
  - `MAX_FILE_SIZE_BYTES`: Maximum upload size (default: 16MB)
  - `JWT_ACCESS_TOKEN_EXPIRY_HOURS`: Token expiry (default: 24 hours)
  - `MIN_PASSWORD_LENGTH`: Minimum password length (default: 6)

- **Frontend**: `frontend/src/utils/constants.js`
  - `API_BASE_URL`: Backend API URL

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.
