# --- Stage 1: The Builder ---
# We start with a stable base image that includes `rustup`.
FROM rust:1.80-bookworm AS builder

# Install necessary OS-level dependencies.
RUN apt-get update && apt-get install -y build-essential pkg-config libssl-dev

# --- THIS IS THE DEFINITIVE FIX ---
# Use rustup to install the nightly toolchain and set it as the default.
# The nightly version of `cargo` understands the `edition2024` feature flag.
RUN rustup install nightly && rustup default nightly

# Now, install our tools using the working nightly cargo. We pin the version for stability.
RUN cargo install sqlx-cli --version 0.7.4 --locked

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

# Use the globally installed `sqlx` command.
RUN sqlx prepare

# Build the final release binary. This still uses the nightly compiler, but
# the output binary is self-contained and does not require nightly to run.
RUN cargo build --release

# --- Stage 2: The Runner ---
# The final image is based on stable Debian, NOT nightly. It's small and secure.
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