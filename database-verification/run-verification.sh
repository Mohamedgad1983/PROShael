#!/bin/bash

echo "========================================"
echo "Supabase Data Verification Tool"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo ""
    echo "Please create a .env file with your Supabase credentials:"
    echo "SUPABASE_URL=your_supabase_url"
    echo "SUPABASE_ANON_KEY=your_supabase_anon_key"
    echo ""
    exit 1
fi

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements
echo "Checking requirements..."
pip install -q -r requirements.txt

# Run the verification
echo "Starting verification..."
echo ""
python verify_supabase_data.py "$@"

# Check exit code
if [ $? -ne 0 ]; then
    echo ""
    echo "========================================"
    echo "VERIFICATION FAILED - Issues detected!"
    echo "========================================"
    echo ""
    echo "To fix the issues:"
    echo "1. Review the report above"
    echo "2. Run SQL correction scripts in Supabase"
    echo "3. Run this verification again"
    echo ""
else
    echo ""
    echo "========================================"
    echo "VERIFICATION PASSED - All checks OK!"
    echo "========================================"
    echo ""
fi

# Deactivate virtual environment
deactivate