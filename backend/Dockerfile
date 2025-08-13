# --- Stage 1: The Builder ---
FROM rust:1.80-slim-bullseye AS builder

# MODIFIED: Install build tools and postgresql-client FIRST, in a clean environment.
RUN apt-get update && apt-get install -y build-essential pkg-config libssl-dev postgresql-client && rm -rf /var/lib/apt/lists/*

# MODIFIED: Install the sqlx-cli tool BEFORE any project code is copied.
# We pin the version for stable, repeatable builds.
RUN cargo install sqlx-cli --version 0.7.4 --force

WORKDIR /app

# This build argument is passed from our `publish.yml` workflow.
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# --- Dependency Caching Layer ---
# Now, copy the Cargo files to cache dependencies.
COPY backend/Cargo.toml backend/Cargo.lock ./
# Create a dummy project to build and cache only the dependencies.
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src target/release/deps/backend*

# --- Application Build Layer ---
# Copy the rest of the application source code.
COPY backend/ .

# Ensure the database is ready before running prepare.
# The postgres service in your workflow needs time to start.
# Note: This requires the `DATABASE_URL` build-arg to be set.
RUN until pg_isready --host=postgres --username=user --dbname=dailyzen; do echo "Waiting for database..."; sleep 2; done && \
    cargo sqlx prepare

# Build the final release binary.
RUN cargo build --release

# --- Stage 2: The Runner ---
FROM debian:bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security.
RUN useradd --create-home appuser
USER appuser
WORKDIR /home/appuser

# Copy the compiled binary from the builder stage.
COPY --from=builder /app/target/release/backend .

# Copy the configuration and migration files needed at runtime.
COPY --from=builder /app/config.toml .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8000
CMD ["./backend"]
