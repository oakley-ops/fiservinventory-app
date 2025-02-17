#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting deployment to Fly.io...${NC}"

# Deploy backend
echo -e "${YELLOW}Deploying backend...${NC}"
cd backend
/Users/isaacrodriguez/.fly/bin/flyctl deploy
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend deployment failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend deployed successfully${NC}"

# Deploy frontend
echo -e "${YELLOW}Deploying frontend...${NC}"
cd ../frontend
/Users/isaacrodriguez/.fly/bin/flyctl deploy
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend deployment failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend deployed successfully${NC}"

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
