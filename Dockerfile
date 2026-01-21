# Use Node.js 22 LTS
FROM node:22-slim

# Install system dependencies for native modules and Expo
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose ports:
# 8081: Metro Bundler
# 19000: Expo packager
# 19001: Expo manifest
# 19002: Expo debugger
# 19006: Expo web
EXPOSE 8081 19000 19001 19002 19006

# Start the application in web mode since Docker is best for web/metro serving
CMD ["npx", "expo", "start", "--web", "--host", "lan"]
