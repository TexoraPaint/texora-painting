#!/usr/bin/env python3
"""Minimal static file server — never calls os.getcwd()"""
import socket, threading, sys, os, mimetypes

ROOT = "/Users/illiafominykh/Downloads/Texora Painting/texora-painting"
PORT = int(os.environ.get('PORT', 4500))

MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.webp': 'image/webp',
    '.ico':  'image/x-icon',
    '.svg':  'image/svg+xml',
    '.woff2':'font/woff2',
    '.woff': 'font/woff',
    '.xml':  'application/xml',
    '.txt':  'text/plain',
}

def get_mime(path):
    ext = os.path.splitext(path)[1].lower()
    return MIME.get(ext, 'application/octet-stream')

def handle(conn):
    try:
        data = b''
        while b'\r\n\r\n' not in data:
            chunk = conn.recv(4096)
            if not chunk: break
            data += chunk
        line = data.split(b'\r\n')[0].decode('utf-8', errors='replace')
        parts = line.split(' ')
        if len(parts) < 2:
            conn.close(); return
        method, path = parts[0], parts[1]
        path = path.split('?')[0]
        if path == '/': path = '/index.html'
        filepath = ROOT + path
        if not os.path.isfile(filepath):
            body = b'<h1>404 Not Found</h1>'
            conn.sendall(f'HTTP/1.1 404 Not Found\r\nContent-Type: text/html\r\nContent-Length: {len(body)}\r\n\r\n'.encode() + body)
            conn.close(); return
        with open(filepath, 'rb') as f:
            body = f.read()
        mime = get_mime(filepath)
        headers = (
            f'HTTP/1.1 200 OK\r\n'
            f'Content-Type: {mime}\r\n'
            f'Content-Length: {len(body)}\r\n'
            f'Cache-Control: no-cache\r\n'
            f'\r\n'
        )
        conn.sendall(headers.encode() + body)
        print(f'200 {path}', flush=True)
    except Exception as e:
        print(f'ERR {e}', flush=True)
    finally:
        conn.close()

srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(('127.0.0.1', PORT))
srv.listen(32)
print(f'Serving {ROOT} on http://127.0.0.1:{PORT}', flush=True)
while True:
    conn, _ = srv.accept()
    threading.Thread(target=handle, args=(conn,), daemon=True).start()
