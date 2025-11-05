# NoteSpace Startup Scripts

This project includes multiple ways to start the application:

## Option 1: Bash Script (start.sh) ✅ Recommended

The simplest way to start both servers:

```bash
./start.sh
```

This script will:
- ✅ Check for required dependencies (Python, Node.js, npm)
- ✅ Install missing dependencies automatically
- ✅ Start backend on http://localhost:5000
- ✅ Start frontend on http://localhost:3000
- ✅ Show colored status messages
- ✅ Handle cleanup on Ctrl+C

**Logs:**
- Backend logs: `backend.log`
- Frontend logs: `frontend.log`

## Option 2: NPM Scripts (package.json)

Using Node.js `concurrently` for better log management:

```bash
# Install root dependencies (first time only)
npm install

# Install all dependencies (Python + Node)
npm run install-all

# Start both servers
npm start
```

This will show both backend and frontend logs in the same terminal with color-coded prefixes.

## Option 3: Manual (Two Terminals)

**Terminal 1 - Backend:**
```bash
pip install -r requirements.txt
cd backend
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm start
```

## Troubleshooting

- **Port already in use**: Make sure ports 5000 and 3000 are available
- **Python dependencies not found**: Run `pip install -r requirements.txt`
- **Node dependencies not found**: Run `cd frontend && npm install`
- **Permission denied**: Run `chmod +x start.sh` for the bash script

