@echo off
echo Starting Diffution LLM Chat with Backend...
echo.
echo This will start:
echo - Backend server on http://localhost:3001
echo - WebSocket server on ws://localhost:8081  
echo - Frontend on http://localhost:5173
echo.
npm run dev:full
pause
