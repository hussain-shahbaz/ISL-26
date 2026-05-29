#!/bin/bash

# Exam Grading Service - Complete Startup Script
# This script starts all required services for the async grading system

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Exam Grading Service - Multi-Service Startup           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Redis is running
echo -e "${BLUE}1. Checking Redis connection...${NC}"
redis-cli ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}✗ Redis is not running${NC}"
    echo -e "${YELLOW}  Start Redis with: redis-server${NC}"
    echo ""
fi

# Check if MongoDB is running
echo -e "${BLUE}2. Checking MongoDB connection...${NC}"
mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ MongoDB is running${NC}"
else
    echo -e "${YELLOW}⚠ MongoDB might not be running${NC}"
    echo -e "${YELLOW}  This is optional if using existing data${NC}"
fi

echo ""
echo -e "${BLUE}Starting services...${NC}"
echo ""

# Create a temporary directory for log files
LOGS_DIR="./logs"
mkdir -p $LOGS_DIR

# Start Redis if not running (optional)
# redis-server > $LOGS_DIR/redis.log 2>&1 &
# REDIS_PID=$!

# Start Celery worker in the background
echo -e "${BLUE}Starting Celery worker...${NC}"
celery -A app.celery_app worker --loglevel=info --concurrency=4 > $LOGS_DIR/celery_worker.log 2>&1 &
CELERY_PID=$!
sleep 2
echo -e "${GREEN}✓ Celery worker started (PID: $CELERY_PID)${NC}"

# Start Celery Flower (monitoring UI) in the background
echo -e "${BLUE}Starting Celery Flower (monitoring)...${NC}"
celery -A app.celery_app flower > $LOGS_DIR/celery_flower.log 2>&1 &
FLOWER_PID=$!
sleep 2
echo -e "${GREEN}✓ Celery Flower started on http://localhost:5555 (PID: $FLOWER_PID)${NC}"

# Start Flask application
echo -e "${BLUE}Starting Flask application...${NC}"
python main.py > $LOGS_DIR/flask_app.log 2>&1 &
FLASK_PID=$!
sleep 3

# Verify Flask started
curl -s http://localhost:5000/api/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Flask application started (PID: $FLASK_PID)${NC}"
else
    echo -e "${RED}✗ Flask application failed to start${NC}"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  Services Started Successfully              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${BLUE}API Endpoints:${NC}"
echo -e "  • Health:       ${GREEN}http://localhost:5000/api/health${NC}"
echo -e "  • Root:         ${GREEN}http://localhost:5000/${NC}"
echo ""
echo -e "${BLUE}Monitoring:${NC}"
echo -e "  • Celery Flower: ${GREEN}http://localhost:5555${NC}"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo -e "  • Flask:        ${GREEN}$LOGS_DIR/flask_app.log${NC}"
echo -e "  • Celery:       ${GREEN}$LOGS_DIR/celery_worker.log${NC}"
echo -e "  • Flower:       ${GREEN}$LOGS_DIR/celery_flower.log${NC}"
echo ""
echo -e "${YELLOW}To stop all services, press Ctrl+C${NC}"
echo ""

# Trap Ctrl+C to clean up
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $CELERY_PID 2>/dev/null
    kill $FLOWER_PID 2>/dev/null
    kill $FLASK_PID 2>/dev/null
    # kill $REDIS_PID 2>/dev/null
    echo -e "${GREEN}All services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running
wait
