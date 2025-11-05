# NoteSpace

A collaborative note-taking platform for uploading and managing course notes.

## Milestone 1: Core Upload System & Data Handling

### Features
- User Account System (Register, Login, Logout)
- JWT-based Authentication
- Topic/Course Management
- File Upload API (PDF, DOCX, TXT)
- File List View with uploader information

### Quick Start (Recommended)

**Option 1: Use the startup script (easiest)**
```bash
# Make script executable (first time only)
chmod +x start.sh

# Run both backend and frontend
./start.sh
```

**Option 2: Use npm scripts**
```bash
# Install root dependencies (first time only)
npm install

# Install all dependencies
npm run install-all

# Start both servers
npm start
```

### Manual Setup

**Backend Setup:**

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Run the Flask backend:
```bash
cd backend
python app.py
```

The backend will run on `http://localhost:5001`

**Frontend Setup:**

1. Install Node.js dependencies:
```bash
cd frontend
npm install
```

2. Start the React development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

**Note:** When running manually, you'll need **two terminal windows** - one for the backend and one for the frontend.

### Database Tables

- **users**: id, name, email, password_hash
- **topics**: id, name, deadline
- **notes**: id, user_id, topic_id, file_url, uploaded_at

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

#### Topics
- `GET /api/topics/` - List all topics
- `POST /api/topics/` - Create a new topic
- `GET /api/topics/<id>` - Get topic details

#### Upload
- `POST /api/upload/` - Upload a file
- `GET /api/upload/list` - List all uploaded files
- `GET /api/upload/<id>` - Get note details
- `GET /api/upload/files/<filename>` - Download a file

### Notes

- Files are stored locally in the `uploads/` folder
- Maximum file size: 16MB
- Supported file types: PDF, DOCX, TXT
- All API endpoints (except register/login) require JWT authentication
