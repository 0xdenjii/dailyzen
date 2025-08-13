# --- Stage 1: The Builder ---
# THIS IS THE KEY CHANGE: Use the `bookworm` variant, which has a newer, compatible toolchain.
FROM rust:1.80-slim-bookworm AS builder

# Install build tools and sqlx-cli in a single, efficient layer.
# We pin the version for stable, repeatable builds.
RUN apt-get update && apt-get install -y build-essential pkg-config libssl-dev && \
    cargo install sqlx-cli --version 0.7.4 --locked

WORKDIR /app

# This build argument is passed from our `publish.yml` workflow.
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# --- Dependency Caching Layer ---
COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src target/release/deps/backend*

# --- Application Build Layer ---
COPY backend/ .

# Now we use the globally installed `sqlx` command.
RUN sqlx prepare

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