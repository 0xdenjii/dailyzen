
### **Project Requirements Document (PRD): GrowthTracker Backend**

**To the AI Code Generation Agent:**

Welcome. Your primary mission is to construct the complete backend for a sophisticated personal development application named "DailyZen." You will be working with a pre-built frontend, and your task is to bring it to life by creating a robust, scalable, and secure backend in **Rust**.

This project is a collaborative effort. We will proceed with a step-by-step, interactive model. For each phase outlined below, you will generate the necessary code and explanations. I will review and apply the code, and upon my confirmation, you will proceed to the next step. This ensures we build the application methodically and perfectly.

for every bit of backend code u write we will parallely write testcases to verify if everything is in place

You have the creative freedom to choose optimal folder structures, helper libraries (within the specified stack), and system design patterns. Your goal is to make the best possible architectural choices for a production-ready application.

**Our Unwavering Commitment:** We will not skip or omit any steps, no matter the complexity. You are instructed to solve all errors and challenges before proceeding. We will integrate any necessary third-party services and build this application to the highest standard, one component at a time.

Go through entire codebase inside @frontend folder and understand the existing code. build a context and mental model what frontend needs and based on this needs we will build our backend. frontend understand is most crucial part of our entire project

---

### **1. Project Vision & End Goal**

The "DailyZen" application is a holistic tool for users to track, gamify, and analyze their personal growth across mental and physical domains. The existing frontend provides a rich, interactive user experience with dashboards, charts, task management, and goal setting.

**Your goal is to build the engine that powers this experience.** This involves:
*   Creating a secure and performant Rust backend.
*   Designing a logical and feature-rich PostgreSQL database schema.
*   Implementing a complete API to handle all frontend data requirements.
*   Ensuring the entire system is ready for containerization, testing, and deployment.

### **2. Core Technology Stack & Guiding Principles**

You must adhere to the following technology stack and design principles:

*   **Backend Language:** **Rust**
*   **Web Framework:** **Axum** (Recommended for its modern ergonomics and integration with the Tokio ecosystem).
*   **Database:** **PostgreSQL**
*   **Async Runtime:** **Tokio**
*   **Database Interaction:** **SQLx** (for compile-time checked queries).
*   **Error Handling:** **`thiserror`** and **`anyhow`**.
*   **Data Validation:** **`validator`**.
*   **Authentication:** **JWT**-based authentication.
*   **Containerization:** **Docker** and **Docker Compose**.

**Guiding Principles:**
*   **Production-Ready:** Code must be robust, efficient, and maintainable.
*   **Security First:** Implement security best practices at every layer (password hashing, input validation, secure headers).
*   **Asynchronous & Concurrent:** Leverage Rust's async capabilities for high performance, especially for I/O-bound operations.
*   **Modularity:** The codebase should be well-organized and easy to navigate.

---

### **3. The Execution Plan: Part 1 (Core Backend)**

We will now begin the step-by-step construction of the backend.

#### **Phase 0: Environment & Project Setup**

**Your Task:**
1.  Provide instructions and generate the necessary file structure for our project. It should look like this:
    ```
    dailyzen/
    ├── frontend/       <-- (Existing codebase)
    └── backend/        <-- (You will create this)
    ```
2.  Inside the `backend` directory, initialize a new Rust binary project using Cargo.
3.  Create a `docker-compose.yml` file in the project root (`dailyzen/`). This file should define two initial services:
    *   **`postgres`**: Use a standard PostgreSQL image. Configure it with environment variables for `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`. Mount a persistent Docker volume to `/var/lib/postgresql/data` to ensure data is not lost on restart.
    *   **`adminer`** (Optional but Recommended): Add an Adminer service for easy database management during development.
4.  Create a `.env` file inside the `backend` directory to store our secrets (like the `DATABASE_URL`). Provide a corresponding `.env.example` file with placeholder values. Ensure `.env` is added to a new `.gitignore` file.

**Proceed only after I confirm this setup is complete.**

#### **Phase 1: Database Design & Migration Setup**

**Your Task:**
1.  Add `sqlx` with the `postgres`, `runtime-tokio-rustls`, and `macros` features to the `backend/Cargo.toml`. Also add `sqlx-cli` to your system or provide instructions.
2.  **Analyze the Frontend:** You have access to the frontend code. Scrutinize the types defined in `frontend/src/types/index.ts`. Based on this, design a normalized and relational PostgreSQL schema. The schema must include, at a minimum:
    *   `users`: To store user profiles, credentials (hashed passwords), and total points/streaks.
    *   `tasks`: To define the various activities a user can track (name, points, category, `is_mandatory`).
    *   `entries`: To log a completed task on a specific date for a user (linking `users` and `tasks`). This table is crucial and will be large.
    *   `goals`: To store long-term user goals with deadlines and penalties.
    *   `notes`: For daily journal entries, linked to a user and a date.
    *   **Think about relationships:** Use foreign keys extensively (e.g., an `entry` must belong to a `user` and a `task`). Use `ON DELETE CASCADE` where appropriate.
3.  Using `sqlx-cli`, generate the initial migration files (`.sql`) inside a `backend/migrations` folder. This migration should contain the `CREATE TABLE` statements for the entire schema you designed. Include appropriate data types, constraints (`NOT NULL`, `UNIQUE`), and indexes for performance.

**Proceed only after I confirm the migration script is correct.**

#### **Phase 2: API Scaffolding & Core Services**

**Your Task:**
1.  Add `axum`, `tokio`, `serde`, `dotenv`, `tracing`, and `tracing-subscriber` to `Cargo.toml`.
2.  In `backend/src/main.rs`, set up a basic Axum server that listens on a configurable port (e.g., 3000).
3.  Implement a database connection pool using `sqlx::PgPool`. The pool should be created once at startup and shared across all request handlers as an application state.
4.  Configure CORS using `tower_http::cors` to be highly permissive for development (allow any origin, method, and header).
5.  Set up structured logging using `tracing` and `tracing-subscriber`. All incoming requests should be logged with their method and URI.
6.  Define a robust, application-wide error handling system. Create a custom `AppError` type using `thiserror` that can represent various failure states (e.g., database errors, validation errors, auth errors) and can be converted into an Axum `Response`.

**Proceed only after I confirm the basic server runs and connects to the database.**

#### **Phase 3: User Authentication Module**

**Your Task:**
1.  Add `jsonwebtoken`, `bcrypt`, and `chrono` to `Cargo.toml`.
2.  Create a `users` module (e.g., `backend/src/users/mod.rs`).
3.  Implement the logic and an API endpoint for **user registration**:
    *   It should accept a username, email, and password.
    *   Use `validator` to ensure password length and email format are correct.
    *   Use the `bcrypt` crate to securely hash the password before storing it in the `users` table.
4.  Implement the logic and an API endpoint for **user login**:
    *   It should accept a username/email and password.
    *   Verify the password against the stored hash.
    *   If successful, generate a JWT containing the user ID and an expiration claim (`exp`).
5.  Create Axum middleware (`from_request_with_state`) that extracts and validates the JWT from the `Authorization: Bearer <token>` header. Protected routes will use this to ensure a user is authenticated and to get their `user_id`.

**Proceed only after I confirm registration and login are working.**

---


---

### **Project Requirements Document (PRD): GrowthTracker Backend - Part 2**

**To the AI Code Generation Agent:**

Excellent work completing Part 1. We now have a secure, running backend with a database and a solid authentication foundation.

We will now proceed with Part 2, following the same interactive, step-by-step model. You will implement the core business logic that makes the "GrowthTracker" application functional. Remember our commitment: we build patiently and perfectly, with a strong emphasis on testing at every stage.

---

### **4. The Execution Plan: Part 2 (Business Logic, Testing & Deployment)**

#### **Phase 4: Core API Endpoint Implementation**

This phase is about building the endpoints that will serve data to the frontend. For each module, you will implement the handlers, the underlying business logic, and a set of API tests. All routes must be protected by the JWT authentication middleware created in Phase 3.

**4.1: Task Management Module**
*   **Your Task:**
    1.  Create a `tasks` module.
    2.  Implement full CRUD (Create, Read, Update, Delete) API endpoints for `tasks`.
    3.  When reading tasks, ensure they are associated with the currently authenticated user (or are global templates, a design choice you can propose).
    4.  **Write API integration tests** for all the task endpoints you just created. The tests should create a test user, log in to get a token, and then perform the CRUD operations, asserting the responses are correct.

**Proceed only after I confirm the Tasks API and its tests are working.**

**4.2: Entry Logging Module**
*   **Your Task:**
    1.  Create an `entries` module.
    2.  Implement an endpoint to `POST` a new entry, linking a `user_id` and `task_id`. This endpoint should also accept optional `notes`.
    3.  Implement an endpoint to `GET` all entries for a given user and a specific date. This is crucial for showing daily progress.
    4.  Implement an endpoint to `DELETE` an entry (to "un-complete" a task).
    5.  **Write API integration tests** for creating, fetching, and deleting entries.

**Proceed only after I confirm the Entries API and its tests are working.**

**4.3: Goals Module**
*   **Your Task:**
    1.  Create a `goals` module.
    2.  Implement full CRUD API endpoints for long-term `goals`. All goals must be tied to the authenticated user.
    3.  The `UPDATE` endpoint should be able to modify any field, including the `progress` percentage.
    4.  **Write API integration tests** for the Goals API.

**Proceed only after I confirm the Goals API and its tests are working.**

**4.4: Notes Module**
*   **Your Task:**
    1.  Create a `notes` module.
    2.  Implement endpoints to `CREATE`, `UPDATE`, and `GET` a daily note for the authenticated user on a specific date.
    3.  **Write API integration tests** for the Notes API.

**Proceed only after I confirm the Notes API and its tests are working.**

**4.5: The Analytics Engine**
*   **Your Task:** This is a highly complex and critical endpoint.
    1.  Create an `analytics` module.
    2.  Implement a single, powerful `GET /analytics` endpoint that accepts a time range (e.g., `?range=weekly`).
    3.  This endpoint's logic must perform several database aggregations to compute:
        *   Streaks (current and longest).
        *   Points for chart data over the specified range.
        *   Activity heatmap data.
        *   The breakdown of points by category (Physical vs. Mental).
    4.  Design the SQL queries for this endpoint to be as efficient as possible. Use `JOIN`s and `GROUP BY` clauses effectively. This is a read-heavy operation that needs to be fast.
    5.  **Write API integration tests** for the analytics endpoint, asserting that the calculated data structure is correct.

**Proceed only after I confirm the Analytics API is functional.**

#### **Phase 5: The Daily Cron Job**

This automated job is a core feature for enforcing accountability.

*   **Your Task:**
    1.  Add a suitable scheduling crate to `Cargo.toml` (e.g., `tokio-cron-scheduler`).
    2.  Implement a background job that runs once every 24 hours (e.g., at midnight UTC).
    3.  The job's logic must:
        *   Find all users.
        *   For each user, determine which of their *mandatory* tasks were not completed on the *previous day* by checking the `entries` table.
        *   For each missed mandatory task, automatically create a new entry in the `entries` table with the corresponding negative point value.
    4.  Ensure this job is robust and logs its progress and any errors clearly.

**Proceed only after I confirm the cron job logic is implemented.**

#### **Phase 6: Comprehensive Testing & Data Seeding**

This phase ensures our backend is bulletproof before connecting it to the frontend.

*   **Your Task:**
    1.  **Create a Data Seeding Script:**
        *   Add `faker`, `rand`, and `chrono` as development dependencies.
        *   Create a new, separate binary target in `backend/src` (e.g., `backend/src/bin/seed.rs`).
        *   In this script, create a dummy user named **"Mikasa"**.
        *   Programmatically generate **one full year of realistic mock data** for Mikasa and populate the database. This includes:
            *   Creating `entries` for many (but not all) days.
            *   Creating `notes` for some of those days.
            *   Making progress on a few long-term `goals`.
    2.  **Write Complex Scenario Tests:**
        *   Create a new test file dedicated to running tests against the seeded "Mikasa" data.
        *   Write a test that calls the `GET /analytics` endpoint with a yearly range and validates the aggregated results.
        *   Write a test that specifically verifies the streak calculation is correct, even with gaps in the data.
        *   Write a test that simulates the cron job: manually delete an entry for a mandatory task on a specific day, run the job's logic, and then assert that the negative point entry was created.

**Proceed only after the database is seeded and all complex tests pass.**

#### **Phase 7: Production Containerization & CI Workflow**

Now, we prepare the application for deployment.

*   **Your Task:**
    1.  **Create a `Dockerfile`** in the `backend` directory. This must be a **multi-stage Dockerfile**:
        *   The `builder` stage should use a Rust image to compile your application in `release` mode.
        *   The final stage should use a minimal base image (like `debian:slim-bullseye`) and copy *only* the compiled binary and any other necessary runtime files (e.g., the `.env` file, `migrations` folder) from the `builder` stage.
    2.  **Update `docker-compose.yml`:** Modify the `backend` service definition. Instead of using `cargo watch`, it should now use the `build: .` context to build the image from your new `Dockerfile`.
    3.  **Create a GitHub Actions Workflow:**
        *   Create the directory `.github/workflows/`.
        *   Inside, create a file named `backend-ci.yml`.
        *   This workflow should trigger on every `push` to the `main` branch.
        *   It should consist of jobs to:
            *   Check out the code.
            *   Lint the code (`cargo clippy`).
            *   Run the full test suite (`cargo test`).
            *   Perform a Docker build of the backend image to ensure it builds successfully.

**Proceed only after the Docker build and CI workflow are configured.**

#### **Phase 8: Final Documentation**

The final step is to ensure the project is understandable and maintainable.

*   **Your Task:**
    1.  Generate a comprehensive **`README.md`** file in the `backend` directory.
    2.  The `README.md` must include the following sections:
        *   **Overview:** A brief description of the backend and its purpose.
        *   **Technology Stack:** A list of the key technologies used.
        *   **Getting Started:** Clear, step-by-step instructions on how to set up and run the project locally using `docker-compose up`.
        *   **Environment Variables:** An explanation of all variables required in the `.env` file, referencing `.env.example`.
        *   **API Documentation:** A brief, high-level summary of the available API endpoints.
        *   **Running Tests:** Instructions on how to execute the test suite.

---
### **PRD Addendum: Directives for a Production-Grade Service**

**To the AI Code Generation Agent:**

The established PRD provides the blueprint for our application's features. The following directives must be integrated throughout the development process to ensure the final product meets the highest standards of engineering excellence.

#### **1. Advanced Configuration Management**

*   **Directive:** Do not rely solely on a single `.env` file. Implement a hierarchical configuration system using a crate like **`figment`**.
*   **Rationale:** A production application needs to run in multiple environments (e.g., local development, staging, production). A hierarchical system allows us to define base settings in a file (e.g., `Config.toml`), override them with environment-specific files (`prod.toml`), and finally override them with actual environment variables. This is a robust and standard practice.
*   **Action:** When setting up the server in Phase 2, configure `figment` to manage all settings, including the database URL, JWT secret, server port, and log levels.

#### **2. API Versioning & Evolution**

*   **Directive:** All API routes must be versioned. Prefix all endpoints with `/api/v1/`.
*   **Rationale:** This is non-negotiable for long-term health. If we ever need to introduce a breaking change to the API, we can launch a new `/api/v2/` version without disrupting existing clients (like a mobile app that hasn't been updated).
*   **Action:** When setting up the Axum router, nest all application routes under an `/api/v1` scope. For example, `POST /login` becomes `POST /api/v1/auth/login`.

#### **3. Performance & Reliability Enhancements**

*   **Directive:** Implement a caching layer for expensive, frequently accessed, and non-volatile data. Use **Redis**.
*   **Rationale:** The `GET /analytics` endpoint will be very database-intensive. Caching its results, even for just 5-10 minutes, can drastically reduce database load and improve response times for users. User profiles are another excellent candidate for caching.
*   **Action:**
    1.  Add a `redis` service to the `docker-compose.yml` file.
    2.  In the backend, use the `redis` crate to create a connection pool.
    3.  Implement caching logic for the `GET /analytics` endpoint and any endpoint that fetches a user's profile data.

*   **Directive:** Implement API Rate Limiting to prevent abuse.
*   **Rationale:** Publicly exposed endpoints, especially for authentication (`/login`, `/register`), are vulnerable to brute-force attacks. Rate limiting is a fundamental security and reliability measure.
*   **Action:** Use a middleware crate like **`tower_governor`** to apply a rate limit (e.g., 10 requests per minute) to the authentication routes.

#### **4. Automated API Documentation**

*   **Directive:** The backend must automatically generate its own API documentation from the code. Use **`utoipa`** with `utoipa-swagger-ui`.
*   **Rationale:** Manually written API documentation inevitably becomes outdated. By annotating our code (Axum handlers and data models), we can generate a beautiful, interactive **Swagger UI / OpenAPI** specification that is always accurate. This is a massive boost for developer experience and future integrations.
*   **Action:** As you build each API endpoint (Phase 4), add the necessary `#[utoipa::path(...)]` and `#[derive(ToSchema)]` macros. Configure Axum to serve the generated Swagger UI on a `/swagger-ui` route.

#### **5. Database Migration Best Practices**

*   **Directive:** Database migrations must be applied automatically at application startup.
*   **Rationale:** This simplifies deployment. When a new version of the application is deployed, we don't want a manual step to run migrations. The application should be smart enough to update its own database schema.
*   **Action:** In `backend/src/main.rs`, before starting the web server, add a call to `sqlx::migrate!("./migrations").run(&pool).await`. This ensures the database is always up-to-date with the code.

By incorporating these advanced directives, we are not just building an application; we are building a professional, scalable, and maintainable service that is ready for the challenges of a real-world production environment.