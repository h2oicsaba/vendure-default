# Build stage
FROM node:20-alpine AS builder

# Set build arguments
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV APP_ENV=prod

WORKDIR /usr/src/app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /usr/src/app

# Install curl for healthcheck
RUN apk --no-cache add curl

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies based on the environment
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV APP_ENV=prod

# Install production dependencies
RUN npm ci --production

# Copy built files from builder
COPY --from=builder /usr/src/app/dist ./dist

# Create static directories for email templates and add basic template files
RUN mkdir -p ./static/email/templates ./static/email/test-emails

# Create a basic template file to ensure the directory exists
RUN echo "<!DOCTYPE html><html><body><h1>Default Email Template</h1><p>{{ body }}</p></body></html>" > ./static/email/templates/default.hbs

# Set environment variables
ENV PORT=3000

# Expose the port the app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD curl -f http://localhost:$PORT/health || exit 1

# Start the application
CMD ["node", "./dist/index.js"]
