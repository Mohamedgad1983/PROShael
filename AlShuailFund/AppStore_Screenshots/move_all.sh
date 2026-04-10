#!/bin/bash
# Move App Store screenshots to correct folders after downloading from Claude
# Run: bash /Users/it/Projects/AlShuailFund/AppStore_Screenshots/move_all.sh

BASE="/Users/it/Projects/AlShuailFund/AppStore_Screenshots"
DOWNLOADS="$HOME/Downloads"

echo "📱 Moving iPhone 6.7\" screenshots (1290 x 2796)..."
for f in "$DOWNLOADS"/iPhone_*.png; do
  [ -f "$f" ] && cp "$f" "$BASE/iPhone_6.7_inch/" && echo "  ✅ $(basename "$f")"
done

echo ""
echo "📱 Moving iPad 13\" screenshots (2064 x 2752)..."
for f in "$DOWNLOADS"/iPad_*.png; do
  [ -f "$f" ] && cp "$f" "$BASE/iPad_13_inch/" && echo "  ✅ $(basename "$f")"
done

echo ""
echo "📊 Summary:"
echo "  iPhone: $(ls "$BASE/iPhone_6.7_inch/"*.png 2>/dev/null | wc -l) screenshots"
echo "  iPad:   $(ls "$BASE/iPad_13_inch/"*.png 2>/dev/null | wc -l) screenshots"
echo ""
echo "✅ Done! Upload from these folders to App Store Connect"
