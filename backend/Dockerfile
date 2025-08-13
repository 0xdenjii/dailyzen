# --- Stage 1: The Builder ---
# We still use a recent stable version as the base
FROM rust:1.80-slim-bullseye AS builder

# Install build tools and the postgresql client for the pg_isready check
RUN apt-get update && apt-get install -y build-essential pkg-config libssl-dev postgresql-client && rm -rf /var/lib/apt/lists/*

# MODIFIED: Switch to the nightly toolchain and install the latest sqlx-cli
# This permanently solves the "edition2024" feature error.
RUN rustup default nightly && \
    cargo install sqlx-cli --force

WORKDIR /app

# This build argument is passed from our `publish.yml` workflow.
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# --- Dependency Caching Layer ---
# This part remains the same. It caches your project's dependencies.
COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src target/release/deps/backend*

# --- Application Build Layer ---
# Copy the rest of the application source code.
COPY backend/ .

# Ensure the database is ready before running prepare.
# Note the use of the service hostname 'postgres'.
RUN until pg_isready --host=postgres --username=user --dbname=dailyzen; do echo "Waiting for database..."; sleep 2; done && \
    cargo sqlx prepare

# Build the final release binary.
RUN cargo build --release

# --- Stage 2: The Runner ---
FROM debian:bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home appuser
USER appuser
WORKDIR /home/appuser

COPY --from=builder /app/target/release/backend .
COPY --from=builder /app/config.toml .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8000
CMD ["./backend"]