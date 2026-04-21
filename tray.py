import subprocess
import sys
import os
import threading
import time
import webbrowser
from PIL import Image, ImageDraw
import pystray

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

backend_process = None
frontend_process = None


def create_icon():
    img = Image.new("RGB", (64, 64), color="#1565c0")
    draw = ImageDraw.Draw(img)
    draw.ellipse([8, 8, 56, 56], fill="white")
    draw.text((22, 18), "FA", fill="#1565c0")
    return img


def start_services():
    global backend_process, frontend_process

    venv_python = os.path.join(BACKEND_DIR, "venv", "Scripts", "python.exe")

    backend_process = subprocess.Popen(
        [
            venv_python,
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ],
        cwd=BACKEND_DIR,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )

    frontend_process = subprocess.Popen(
        ["npm.cmd", "start"],
        cwd=FRONTEND_DIR,
        creationflags=subprocess.CREATE_NO_WINDOW,
        env={**os.environ, "BROWSER": "none"},
    )

    time.sleep(4)
    webbrowser.open("http://localhost:3000")


def stop_services():
    global backend_process, frontend_process
    if backend_process:
        backend_process.kill()
        backend_process = None
    if frontend_process:
        # Zabij cały drzewa procesów
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(frontend_process.pid)],
            creationflags=subprocess.CREATE_NO_WINDOW,
            capture_output=True,
        )
        frontend_process = None


def open_browser(icon, item):
    webbrowser.open("http://localhost:3000")


def quit_app(icon, item):
    stop_services()
    icon.stop()


def main():
    threading.Thread(target=start_services, daemon=True).start()

    menu = pystray.Menu(
        pystray.MenuItem("Financial Analyzer", lambda: None, enabled=False),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Otwórz w przeglądarce", open_browser),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Wyłącz", quit_app),
    )

    icon = pystray.Icon("financial_analyzer", create_icon(), "Financial Analyzer", menu)

    icon.run()


if __name__ == "__main__":
    main()
