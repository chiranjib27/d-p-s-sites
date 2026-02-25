import http.server
import socketserver
import os
import json
import shutil
from pathlib import Path
from werkzeug.formparser import parse_form_data

PORT = 3000
UPLOAD_DIR = 'uploads'
DB_FILE = 'database.json'

# Ensure upload directory and db file exist
Path(UPLOAD_DIR).mkdir(exist_ok=True)
if not os.path.exists(DB_FILE):
    with open(DB_FILE, 'w') as f:
        json.dump([], f)

class WeddingRequestHandler(http.server.SimpleHTTPRequestHandler):
    
    def end_headers(self):
        # Allow CORS for development if needed
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/videos':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            with open(DB_FILE, 'r') as f:
                videos = json.load(f)
            self.wfile.write(json.dumps(videos).encode())
            return
            
        # Default behavior: Serve static files
        super().do_GET()

    def do_POST(self):
        if self.path == '/api/videos':
            content_type = self.headers.get('Content-Type')
            if not content_type or 'multipart/form-data' not in content_type:
                self.send_error(400, "Expected multipart/form-data")
                return

            try:
                # Werkzeug parsing setup
                environ = {
                    'wsgi.input': self.rfile,
                    'CONTENT_LENGTH': self.headers.get('Content-Length', '0'),
                    'CONTENT_TYPE': self.headers.get('Content-Type'),
                    'REQUEST_METHOD': 'POST',
                }

                stream, form, files = parse_form_data(environ)
                
                if 'video' not in files:
                    self.send_error(400, "No 'video' field found")
                    return
                    
                file_item = files['video']
                if not file_item.filename:
                    self.send_error(400, "No file uploaded")
                    return
                    
                filename = os.path.basename(file_item.filename)
                
                # Make filename safe
                filename = "".join([c for c in filename if c.isalpha() or c.isdigit() or c in ' .-_']).rstrip()
                
                # Ensure unique filename
                base_name, ext = os.path.splitext(filename)
                counter = 1
                new_filename = filename
                filepath = os.path.join(UPLOAD_DIR, new_filename)
                while os.path.exists(filepath):
                    new_filename = f"{base_name}_{counter}{ext}"
                    filepath = os.path.join(UPLOAD_DIR, new_filename)
                    counter += 1
                
                # Save physical file
                file_item.save(filepath)
                
                # Update Database
                video_url = f"/{UPLOAD_DIR}/{new_filename}"
                with open(DB_FILE, 'r') as f:
                    videos = json.load(f)
                
                videos.append({'url': video_url, 'filename': new_filename})
                
                with open(DB_FILE, 'w') as f:
                    json.dump(videos, f)
                
                # Respond
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "url": video_url}).encode())
                
            except Exception as e:
                print(f"Server Error: {str(e)}")
                self.send_error(500, f"Server Error: {str(e)}")
            return
            
        self.send_error(404, "Not Found")

    def do_DELETE(self):
        if self.path.startswith('/api/videos/'):
            filename = self.path.split('/')[-1]
            if not filename:
                self.send_error(400, "Filename required")
                return
                
            # Remove from DB
            try:
                with open(DB_FILE, 'r') as f:
                    videos = json.load(f)
                
                # Filter out the deleted video
                new_videos = [v for v in videos if v['filename'] != filename]
                
                if len(new_videos) == len(videos):
                    self.send_error(404, "Video not found in database")
                    return
                    
                with open(DB_FILE, 'w') as f:
                    json.dump(new_videos, f)
                    
                # Delete physical file
                filepath = os.path.join(UPLOAD_DIR, filename)
                if os.path.exists(filepath):
                    os.remove(filepath)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode())
                
            except Exception as e:
                self.send_error(500, f"Server Error: {str(e)}")
            return
            
        self.send_error(404, "Not Found")

# Ensure old server process is not blocking port
Handler = WeddingRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at port {PORT}")
    print("API Endpoints:")
    print("  GET /api/videos - Get list of videos")
    print("  POST /api/videos - Upload a new video in 'video' field")
    print("  DELETE /api/videos/<filename> - Delete a video")
    httpd.serve_forever()
