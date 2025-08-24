# Use Node.js 20-alpine to match Vercel's latest environment
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies with clean install (similar to Vercel)
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Run linting and type checking (like Vercel does)
RUN npm run lint

# Build the application (same as Vercel's process)
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the production server
CMD ["npm", "start"]