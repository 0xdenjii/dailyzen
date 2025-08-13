# --- Stage 1: The Builder ---
# Use a stable, recent Rust version as our base.
FROM rust:1.80-slim-bullseye AS builder

# MODIFICATION: Install tools needed for downloading and extracting.
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    postgresql-client \
    curl \
    tar \
    && rm -rf /var/lib/apt/lists/*

# --- THE FIX: Download the pre-compiled binary for sqlx-cli ---
# We specify the exact version and architecture for a reproducible build.
# The 'musl' version is statically linked and perfect for Docker.
RUN curl -L "https://github.com/launchbadge/sqlx/releases/download/v0.7.4/sqlx-cli-v0.7.4-x86_64-unknown-linux-musl.tar.gz" \
    | tar xz -C /usr/local/bin

WORKDIR /app

# This build argument is passed from our `publish.yml` workflow.
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# --- Dependency Caching Layer ---
# This remains the same. It builds and caches your project's dependencies.
COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src target/release/deps/backend*

# --- Application Build Layer ---
# Copy the rest of the application source code.
COPY backend/ .

# Ensure the database service is ready before running prepare.
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