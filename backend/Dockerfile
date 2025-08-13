# --- Stage 1: The Builder ---
FROM rust:1.78-slim-bullseye AS builder

# Install necessary build dependencies
RUN apt-get update && apt-get install -y build-essential pkg-config libssl-dev

WORKDIR /app

# Install sqlx-cli for the `prepare` step
RUN cargo install sqlx-cli

# This build argument is CRITICAL. It will be passed in from our `publish.yml` workflow.
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Create a dummy project to cache dependencies, speeding up builds.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src target/release/deps/backend*

# Copy the actual source code, migrations, and config
COPY . .

# Generate the `.sqlx` directory. This uses the DATABASE_URL to connect
# to the temporary database in the CI runner. This step allows the final
# build to succeed without a live database connection.
RUN cargo sqlx prepare

# Build the final release binary.
RUN cargo build --release

# --- Stage 2: The Runner ---
# This stage creates the final, small, and secure image.
FROM debian:bookworm-slim AS runner

# Install only the required runtime dependencies.
RUN apt-get update && apt-get install -y --no-install-recommends libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security.
RUN useradd --create-home appuser
USER appuser
WORKDIR /home/appuser

# Copy the compiled binary from the builder stage.
COPY --from=builder /app/target/release/backend .

# Copy the configuration and migration files needed at runtime.
COPY config.toml .
COPY migrations ./migrations

# Expose the application port.
EXPOSE 8000

# The command to run the application.
CMD ["./backend"]