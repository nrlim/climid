FROM mcr.microsoft.com/playwright:v1.44.0-focal

WORKDIR /app

# Switch to root to install some base tools if needed, but Playwright image has mostly everything
USER root

# Copy package descriptors
COPY package*.json ./

# Install exact node modules (use npm ci if package-lock is solid, else install)
# Install just prod if possible, but we need @playwright/test in devDependencies
RUN npm install

# Copy application code
COPY . .

# Environment Defaults overridable by docker-compose
ENV NODE_ENV=production
ENV API_PORT=3000

# Expose the API port
EXPOSE 3000

# Default command starts the robust worker (which also hosts the Telegram Bot)
# Can be overridden via docker-compose to run `start:producer` or `start:dispatch`
CMD ["npm", "run", "start:worker"]
