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
RUN npm install -g typescript
RUN npm install @vendure/common@3.3.3 @vendure/common

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

# Copy email templates from the builder stage
COPY --from=builder /usr/src/app/static/email ./static/email

# Ensure all required email template directories exist
RUN mkdir -p ./static/email/templates/partials ./static/email/templates/email-verification ./static/email/templates/password-reset ./static/email/templates/email-address-change ./static/email/templates/order-confirmation ./static/email/test-emails

# Create basic template files if they don't exist
RUN [ -f ./static/email/templates/partials/header.hbs ] || echo "<header>Email Header</header>" > ./static/email/templates/partials/header.hbs
RUN [ -f ./static/email/templates/partials/footer.hbs ] || echo "<footer>Email Footer</footer>" > ./static/email/templates/partials/footer.hbs

# Create basic templates for each email type if they don't exist
RUN for dir in email-verification password-reset email-address-change order-confirmation; do \
    [ -f ./static/email/templates/$dir/body.hbs ] || echo "<!DOCTYPE html><html><body>{{> header }}\n<h1>${dir}</h1>\n<p>{{ body }}</p>\n{{> footer }}</body></html>" > ./static/email/templates/$dir/body.hbs; \
  done

# Set environment variables
ENV PORT=3000

# Expose the port the app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD curl -f http://localhost:$PORT/health || exit 1

# Start the application
CMD ["node", "./dist/index.js"]
