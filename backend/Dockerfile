# --- Stage 1: The Builder ---
# We can use a specific stable version now without worrying about `cargo` compatibility.
FROM rust:1.79-slim-bullseye AS builder

# Install only the necessary OS-level dependencies.
RUN apt-get update && apt-get install -y build-essential pkg-config libssl-dev

WORKDIR /app

# This build argument is passed from our `publish.yml` workflow.
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# --- Dependency Caching Layer ---
COPY backend/Cargo.toml backend/Cargo.lock ./
# Add the dummy project to build and cache only the dependencies.
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src target/release/deps/backend*

# --- Application Build Layer ---
# Copy the entire backend source code.
COPY backend/ .

# Generate the `.sqlx` directory using the project's locked version of sqlx-cli.
# This is the core of the new, robust strategy.
RUN cargo sqlx prepare

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