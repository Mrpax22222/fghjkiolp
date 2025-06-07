import os
import sys
import subprocess
import time
import re
import http.server
import socketserver
import threading
import webbrowser

# Configuration
PORT = 8000
PROJECT_DIR = os.getcwd()

# Define the handler for our simple HTTP server
class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super().end_headers()
        
    def log_message(self, format, *args):
        # Suppress log messages
        return

def start_http_server():
    """Start a simple HTTP server in a separate thread."""
    print(f"Starting HTTP server on port {PORT}...")
    
    # Start the server in a separate thread
    def run_server():
        with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
            print(f"Server started at http://localhost:{PORT}")
            httpd.serve_forever()
    
    server_thread = threading.Thread(target=run_server)
    server_thread.daemon = True
    server_thread.start()
    
    # Wait a moment for the server to start
    time.sleep(4)
    print("HTTP server is running...")

def start_cloudflare_tunnel():
    """Start a Cloudflare Tunnel to expose the HTTP server."""
    cloudflared_path = r"C:\Users\Razavi\Downloads\cloudflared.exe"
    
    # Check if cloudflared exists
    if not os.path.exists(cloudflared_path):
        print("Cloudflared not found. Please make sure it's downloaded.")
        return None
    
    print("Starting Cloudflare Tunnel...")
    cmd = [cloudflared_path, "tunnel", "--url", f"http://localhost:{PORT}"]
    
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Wait for the tunnel URL to be printed
        tunnel_url = None
        pattern = r'https://[a-zA-Z0-9-]+\.trycloudflare\.com'
        
        print("Waiting for tunnel to be established...")
        for line in process.stdout:
            print(line.strip())
            match = re.search(pattern, line)
            if match:
                tunnel_url = match.group(0)
                break
        
        if tunnel_url:
            print(f"\n✅ Your project is now live at: {tunnel_url}\n")
            return tunnel_url
        else:
            print("Failed to establish tunnel")
            return None
    except Exception as e:
        print(f"Error starting Cloudflare Tunnel: {e}")
        return None

def main():
    """Main entry point for the script."""
    print("\n🚀 Starting deployment to Cloudflare Tunnel\n")
    
    # Step 1: Start HTTP server
    start_http_server()
    
    # Step 2: Start Cloudflare Tunnel
    tunnel_url = start_cloudflare_tunnel()
    
    if tunnel_url:
        # Open the tunnel URL in the default browser
        print("Opening tunnel URL in browser...")
        try:
            webbrowser.open(tunnel_url)
        except Exception as e:
            print(f"Error opening browser: {e}")
        
        print("\n⚠️ Press Ctrl+C to stop the server and tunnel\n")
        
        # Keep the script running
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down...")
    
if __name__ == "__main__":
    main()
