# --- Stage 1: The Builder ---
FROM rust:1.79-slim-bullseye AS builder

WORKDIR /app

# Install necessary build dependencies and sqlx-cli
RUN apt-get update && apt-get install -y build-essential pkg-config libssl-dev && \
    cargo install sqlx-cli --force

# This build argument is passed from our `publish.yml` workflow.
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Create a dummy project to cache dependencies from the backend.
COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src target/release/deps/backend*

# Copy the entire backend source code, migrations, and config
COPY backend/ .

# Generate the `.sqlx` directory. This step allows the final
# build to succeed without a live database connection.
RUN cargo sqlx prepare

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
# These files are now located at the root of the builder's context (`/app`).
COPY --from=builder /app/config.toml .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8000
CMD ["./backend"]