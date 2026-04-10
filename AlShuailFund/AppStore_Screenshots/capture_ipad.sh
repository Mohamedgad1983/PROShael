#!/bin/bash
# =====================================================
# iPad Screenshot Capture Script for App Store
# =====================================================
# Usage:
#   1. Open Xcode and run the app on iPad Pro 12.9" simulator
#   2. Navigate to the screen you want to capture
#   3. Run: bash capture_ipad.sh <screenshot_name>
#   Example: bash capture_ipad.sh 01_Login
# =====================================================

DEST="/Users/it/Projects/AlShuailFund/AppStore_Screenshots/iPad_Simulator"
NAME="${1:-screenshot}"

# Capture from booted simulator
xcrun simctl io booted screenshot --type=png "$DEST/${NAME}.png"

if [ $? -eq 0 ]; then
    # Get dimensions
    DIMS=$(sips -g pixelWidth -g pixelHeight "$DEST/${NAME}.png" 2>/dev/null | tail -2 | awk '{print $2}' | tr '\n' 'x' | sed 's/x$//')
    echo "✅ Saved: $DEST/${NAME}.png ($DIMS)"
else
    echo "❌ Error! Make sure iPad simulator is running"
fi
