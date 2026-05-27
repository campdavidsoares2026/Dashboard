"""
Vercel serverless entry point for the CPEE Dashboard FastAPI backend.
This wraps the FastAPI app to run as a Vercel Python serverless function.
"""
import sys
import os

# Add parent directory to path so 'app' module can be found
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
