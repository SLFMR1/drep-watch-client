FROM --platform=linux/amd64 node:18-slim

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true" \
    PUPPETEER_EXECUTABLE_PATH="/opt/google/chrome/chrome" \
    NODE_ENV="production" \
    PNPM_HOME="/pnpm" \
    PATH="$PNPM_HOME:$PATH" \
    NODE_VERSION="18" \
    DEBIAN_FRONTEND="noninteractive"

# Install necessary dependencies for Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg2 \
    apt-transport-https \
    ca-certificates \
    procps \
    libxss1 \
    libxtst6 \
    libxrandr2 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrender1 \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    xvfb \
    xauth \
    --no-install-recommends && \
    # Clean up apt lists immediately after installing dependencies
    rm -rf /var/lib/apt/lists/*

# Download and Install Chrome
RUN wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    apt-get update && apt-get install -y ./google-chrome-stable_current_amd64.deb --no-install-recommends && \
    rm google-chrome-stable_current_amd64.deb && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify Chrome installation and print version
RUN /opt/google/chrome/chrome --version

# Create Chrome user and group with proper permissions
RUN groupadd -r chrome && useradd -r -g chrome -G audio,video chrome \
    && mkdir -p /home/chrome \
    && chown -R chrome:chrome /home/chrome

# Create and set working directory
WORKDIR /app

# Install pnpm with exact version from package.json
RUN corepack enable && corepack prepare pnpm@8.7.6 --activate

# Copy package files with lockfile
COPY --chown=chrome:chrome package.json pnpm-lock.yaml ./

# Install dependencies with specific pnpm version
RUN pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --prod --shamefully-hoist

# Copy the rest of the application
COPY --chown=chrome:chrome . .

# Build the application
RUN pnpm run build

# Switch to Chrome user
USER chrome

# Expose the port the app runs on
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD wget -q --spider http://localhost:8080/api/health || exit 1

# Start the application with production settings
CMD ["pnpm", "start"] 