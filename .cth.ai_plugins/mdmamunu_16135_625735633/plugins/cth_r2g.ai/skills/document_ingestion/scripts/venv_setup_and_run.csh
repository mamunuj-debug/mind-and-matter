#!/usr/intel/bin/tcsh

# Get the script directory and project root
set SCRIPT_DIR = `dirname $0`
set PROJECT_ROOT = `cd $SCRIPT_DIR/../../../.. && pwd`

# Change to project root
cd $PROJECT_ROOT

# Check if virtual environment exists and activate it
if ( -f .venv/bin/activate.csh ) then
    echo "Activating virtual environment..."
    source .venv/bin/activate.csh
else
    echo "Virtual environment not found. Please run install.csh first."
    exit 1
endif

# Run the Python script with all arguments passed through
echo "Running document ingestion..."
python $SCRIPT_DIR/ingest_documents.py $argv
