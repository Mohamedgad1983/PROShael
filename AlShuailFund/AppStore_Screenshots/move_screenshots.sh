#!/bin/bash
# Run this script after downloading all screenshots from Claude
# It will move them to the correct folder

DEST="/Users/it/Projects/AlShuailFund/AppStore_Screenshots/6.5_inch"
DOWNLOADS="$HOME/Downloads"

echo "Moving App Store screenshots to $DEST ..."

for i in $(seq -w 1 14); do
  for f in "$DOWNLOADS"/${i}_*.png; do
    if [ -f "$f" ]; then
      cp "$f" "$DEST/"
      echo "  ✅ $(basename "$f")"
    fi
  done
done

echo ""
echo "Done! Files in $DEST:"
ls -la "$DEST"/*.png 2>/dev/null | awk '{print "  " $NF}' 
echo ""
echo "Total: $(ls "$DEST"/*.png 2>/dev/null | wc -l) screenshots"
