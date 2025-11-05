#!/bin/bash

# NoteSpace Startup Script
# Runs both backend and frontend servers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}NoteSpace - Starting Application${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        echo -e "${GREEN}✓ Backend stopped${NC}"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        echo -e "${GREEN}✓ Frontend stopped${NC}"
    fi
    exit 0
}

# Set up trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python 3 is not installed${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi

# Check if backend dependencies are installed
if [ ! -d "backend" ]; then
    echo -e "${RED}✗ Backend directory not found${NC}"
    exit 1
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠ Frontend dependencies not installed. Installing...${NC}"
    cd frontend
    npm install
    cd ..
fi

# Check if Python dependencies are installed (basic check)
if ! python3 -c "import flask" 2>/dev/null; then
    echo -e "${YELLOW}⚠ Backend dependencies not installed. Installing...${NC}"
    pip install -r requirements.txt
fi

# Start backend (run from project root so Python can find 'backend' module)
echo -e "${GREEN}Starting backend server...${NC}"
cd "$SCRIPT_DIR"

# Kill any existing processes on port 5001
EXISTING_PID=$(lsof -ti :5001 2>/dev/null)
if [ ! -z "$EXISTING_PID" ]; then
    echo -e "${YELLOW}⚠ Killing existing process on port 5001 (PID: $EXISTING_PID)${NC}"
    kill -9 $EXISTING_PID 2>/dev/null || true
    sleep 1
fi

PYTHONPATH="$SCRIPT_DIR" python3 backend/app.py > backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Check if backend started successfully
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Backend running (PID: $BACKEND_PID) on http://localhost:5001${NC}"
else
    echo -e "${RED}✗ Backend failed to start. Check backend.log for details${NC}"
    exit 1
fi

# Start frontend
echo -e "${GREEN}Starting frontend server...${NC}"
cd "$SCRIPT_DIR/frontend"
npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

# Wait a moment for frontend to start
sleep 3

# Check if frontend started successfully
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Frontend running (PID: $FRONTEND_PID) on http://localhost:3000${NC}"
else
    echo -e "${RED}✗ Frontend failed to start. Check frontend.log for details${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Both servers are running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Backend:  ${GREEN}http://localhost:5001${NC}"
echo -e "Frontend: ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Wait for processes
wait

