# Docker Guide for Smart App

This guide explains how to use Docker for both development and production.

## 1. Development Mode (Old Setup)

If you want to run the app in development mode (with hot reloading, just like `npm start`):

**Build:**
```powershell
docker build -f Dockerfile.dev -t smart-app-dev .
```

**Run:**
```powershell
docker-compose -f docker-compose.dev.yml up
```

---

## 2. Production Mode (New Optimized Setup)

This creates a small, fast container serving the static React Native Web app using Nginx.

**Build:**
```powershell
docker build -t metthewtsegay/smart-app:latest .
```

**Run Locally (to test):**
```powershell
docker run -p 8080:80 metthewtsegay/smart-app:latest
```
*Access at http://localhost:8080*

---

## 3. How to Push to Docker Hub

**Prerequisite:** Ensure you are logged in.
```powershell
docker login -u metthewtsegay
```

**Step 1: Build the Image**
```powershell
docker build -t metthewtsegay/smart-app:latest .
```

**Step 2: Push the Image**
```powershell
docker push metthewtsegay/smart-app:latest
```

**Step 3 (Optional): Deploying elsewhere**
On your server (VPS, cloud, etc.), you can now just run:
```powershell
docker run -d -p 80:80 metthewtsegay/smart-app:latest
```
