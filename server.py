#!/usr/bin/env python3
"""
Simple HTTP server for serving the referral tracking HTML application.
Configured for Replit environment with proper host binding and CORS headers.
"""

import http.server
import socketserver
import os
import socket
from urllib.parse import urlparse

class ReplitHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler with CORS headers and proper caching for development."""
    
    def end_headers(self):
        # Add CORS headers for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        # Disable caching for development to ensure updates are visible
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        """Handle GET requests, serving the main HTML file for root path."""
        if self.path == '/' or self.path == '':
            self.path = '/referral_tracking.html'
        return super().do_GET()

    def log_message(self, format, *args):
        """Custom logging to show server activity."""
        print(f"[SERVER] {format % args}")

def run_server():
    """Start the HTTP server on port 5000."""
    PORT = 5000
    HOST = "0.0.0.0"  # Bind to all interfaces for Replit
    
    # Change to the directory containing the HTML file
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Allow socket reuse to handle restarts properly
    class ReusableTCPServer(socketserver.TCPServer):
        allow_reuse_address = True
        
    with ReusableTCPServer((HOST, PORT), ReplitHTTPRequestHandler) as httpd:
        print(f"[SERVER] Starting server at http://{HOST}:{PORT}")
        print(f"[SERVER] Serving files from: {os.getcwd()}")
        print(f"[SERVER] Main app available at: http://{HOST}:{PORT}/")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print(f"\n[SERVER] Shutting down server...")

if __name__ == "__main__":
    run_server()