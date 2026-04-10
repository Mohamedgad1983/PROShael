#!/bin/bash
# =====================================================
# Capture ALL 10 iPad Screenshots - One by One
# =====================================================
# Steps:
#   1. Open Xcode → Run app on "iPad Pro (12.9-inch) (6th generation)"
#   2. Run this script
#   3. It will pause at each step - navigate to the right screen
#      then press Enter to capture
# =====================================================

DEST="/Users/it/Projects/AlShuailFund/AppStore_Screenshots/iPad_Simulator"
mkdir -p "$DEST"

SCREENS=(
    "01_Login:شاشة تسجيل الدخول"
    "02_Home:الرئيسية (الصفحة الرئيسية)"
    "03_MyAccount:حسابي (القائمة الكاملة)"
    "04_MemberCard:البطاقة التعريفية"
    "05_EditProfile:تعديل الملف الشخصي"
    "06_FamilyTree:شجرة عائلتي"
    "07_Subscriptions:اشتراكاتي"
    "08_AccountStatement:كشف الحساب"
    "09_Contacts:جهات التواصل"
    "10_ChangePassword:تغيير كلمة المرور"
)

echo "📱 iPad Screenshot Capture Tool"
echo "================================"
echo "Make sure iPad Pro 12.9\" simulator is running!"
echo ""

for entry in "${SCREENS[@]}"; do
    NAME="${entry%%:*}"
    DESC="${entry##*:}"
    
    echo "📸 Next: $NAME ($DESC)"
    echo "   Navigate to this screen in the simulator, then press Enter..."
    read -r
    
    xcrun simctl io booted screenshot --type=png "$DEST/${NAME}.png" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        DIMS=$(sips -g pixelWidth -g pixelHeight "$DEST/${NAME}.png" 2>/dev/null | tail -2 | awk '{print $2}' | tr '\n' 'x' | sed 's/x$//')
        echo "   ✅ Saved! ($DIMS)"
    else
        echo "   ❌ Failed! Is the simulator running?"
    fi
    echo ""
done

echo "🎯 Done! All screenshots saved to:"
echo "   $DEST"
echo ""
echo "Files:"
ls -la "$DEST"/*.png 2>/dev/null | awk '{print "   " $NF}'
echo ""

# Verify dimensions
echo "📐 Dimensions check:"
for f in "$DEST"/*.png; do
    [ -f "$f" ] || continue
    DIMS=$(sips -g pixelWidth -g pixelHeight "$f" 2>/dev/null | tail -2 | awk '{print $2}' | tr '\n' 'x' | sed 's/x$//')
    echo "   $(basename "$f"): $DIMS"
done
