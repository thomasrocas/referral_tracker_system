#!/usr/bin/env python3
"""
Simple HTTP server using Python's built-in server module.
Configured for Replit environment to serve the referral tracking app.
"""

import http.server
import socketserver
import os
import sys

def main():
    # Set the port and host - use PORT env var for deployment
    PORT = int(os.getenv("PORT", 5000))
    HOST = "0.0.0.0"
    
    # Change to the directory containing the HTML file
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Custom handler to serve the main HTML file at root
    class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
        def end_headers(self):
            # Add CORS headers for API integration
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            # Add cache control for development
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
            super().end_headers()
            
        def do_OPTIONS(self):
            # Handle CORS preflight requests
            self.send_response(200)
            self.end_headers()
            
        def do_GET(self):
            if self.path == '/' or self.path == '':
                self.path = '/referral_tracking.html'
            return super().do_GET()
    
    # Create server with socket reuse
    class ReuseAddressTCPServer(socketserver.TCPServer):
        allow_reuse_address = True
    
    print(f"Starting server on {HOST}:{PORT}")
    print(f"Serving from: {os.getcwd()}")
    
    try:
        with ReuseAddressTCPServer((HOST, PORT), CustomHTTPRequestHandler) as httpd:
            print(f"Server running at http://{HOST}:{PORT}/")
            httpd.serve_forever()
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"Error: Port {PORT} is already in use. Please wait a moment and try again.")
            sys.exit(1)
        else:
            raise

if __name__ == "__main__":
    main()