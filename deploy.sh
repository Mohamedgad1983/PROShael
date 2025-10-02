#!/bin/bash
# Al-Shuail Quick Deploy Script
# Commits and pushes changes to GitHub, triggering Cloudflare Pages deployment

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}    Al-Shuail Quick Deploy Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

# Check if we're in the right directory
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Not in a git repository!${NC}"
    echo "Please run this script from D:\PROShael directory"
    exit 1
fi

# Get commit message from argument or prompt
COMMIT_MESSAGE="$1"

if [ -z "$COMMIT_MESSAGE" ]; then
    echo -e "${YELLOW}Enter commit message:${NC}"
    read -r COMMIT_MESSAGE
fi

if [ -z "$COMMIT_MESSAGE" ]; then
    echo -e "${YELLOW}❌ Commit message cannot be empty${NC}"
    exit 1
fi

# Show current status
echo -e "\n${BLUE}📋 Git Status:${NC}"
git status --short

# Confirm
echo -e "\n${YELLOW}Commit message: ${COMMIT_MESSAGE}${NC}"
echo -e "${YELLOW}Ready to deploy? (y/n)${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Add all changes
echo -e "\n${BLUE}📦 Adding changes...${NC}"
git add .

# Commit
echo -e "${BLUE}💾 Committing...${NC}"
git commit -m "$COMMIT_MESSAGE"

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Nothing to commit or commit failed${NC}"
    exit 1
fi

# Push
echo -e "\n${BLUE}🚀 Pushing to GitHub...${NC}"
git push origin main

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Deployment initiated successfully!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}\n"

    echo -e "${BLUE}📊 Deployment will be available at:${NC}"
    echo -e "   Frontend: https://alshuail-admin.pages.dev"
    echo -e "   Backend:  https://proshael.onrender.com"

    echo -e "\n${BLUE}⏱️  Estimated deployment time: 2-5 minutes${NC}\n"

    echo -e "${BLUE}🔍 Monitor deployment:${NC}"
    echo -e "   GitHub Actions: https://github.com/YOUR_USERNAME/PROShael/actions"
    echo -e "   Cloudflare:     https://dash.cloudflare.com/\n"
else
    echo -e "\n${YELLOW}❌ Push failed!${NC}"
    echo -e "Check your git configuration and network connection"
    exit 1
fi
