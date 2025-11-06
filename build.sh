#!/bin/bash
# Build script for production deployment (e.g., Render)

echo "Building NoteSpace for production..."

# Build frontend
echo "Building React frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Build complete! Frontend build is in frontend/build/"
echo "You can now deploy the backend, which will serve the frontend."

