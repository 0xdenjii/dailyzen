# --- Stage 1: The Builder ---
FROM rust:1.80-bookworm AS builder

# Install build tools and the postgresql server.
RUN apt-get update && apt-get install -y build-essential pkg-config libssl-dev postgresql && \
    rm -rf /var/lib/apt/lists/*

# Use rustup to switch to nightly to handle modern crate manifests.
RUN rustup install nightly && rustup default nightly

# Install the pinned version of sqlx-cli.
RUN cargo install sqlx-cli --version 0.7.4 --locked

WORKDIR /app

# --- Dependency Caching Layer ---
COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src target/release/deps/backend*

# --- Application Build Layer ---
COPY backend/ .

# --- THIS IS THE DEFINITIVE FIX ---
# This single RUN command creates a self-contained environment for `sqlx prepare`.
RUN \
    # Start a temporary, local PostgreSQL server.
    service postgresql start && \
    # Create a user and database using `psql -c` as the postgres user.
    # We use a non-reserved keyword `appuser` to avoid SQL syntax errors.
    su - postgres -c "psql -c \"CREATE USER appuser WITH PASSWORD 'password';\"" && \
    su - postgres -c "psql -c \"CREATE DATABASE dailyzen OWNER appuser;\"" && \
    # Set the DATABASE_URL with the new, safe username.
    export DATABASE_URL="postgres://appuser:password@localhost:5432/dailyzen" && \
    # Run migrations and prepare.
    sqlx migrate run && \
    cargo sqlx prepare && \
    # Stop the temporary server.
    service postgresql stop

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