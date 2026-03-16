# ScriptSea EPT

**ScriptSea EPT (Expense Tracker)** is a web application designed to manage and track shared expenses for group activities, primarily **KKN (Kuliah Kerja Nyata)**.

In group activities like KKN, members often share expenses for logistics, transportation, food, and project materials. ScriptSea EPT helps groups **record expenses, track contributions, and maintain transparent financial records**, allowing every member to see how group funds are used.

---

## Features

* Record and manage shared expenses
* Track member contributions
* View group expense history
* Transparent financial tracking for group activities
* Designed for collaborative group environments

---

## Architecture

ScriptSea EPT is built using a **microservice architecture** to keep services modular, scalable, and maintainable.

### Frontend

* Built with **Next.js**
* Communicates with the backend through an **API Gateway**

### Backend

The backend is written in **Go** and organized into several main components.

#### API Gateway

The **API Gateway** acts as the main entry point for client requests.

Responsibilities:

* Expose REST API for the frontend
* Route requests to internal services
* Handle middleware (authentication, logging, etc.)
* Communicate with backend services using **gRPC**

#### Services

Business logic is separated into independent microservices.
Each service is responsible for a specific domain of the system.

Examples of services include:

* **Auth Service** -> authentication and authorization
* **User Service** -> user management
* **Expense Service** –> expense tracking
* **Wallet Service** –> group fund management

Services communicate internally using **gRPC**.

#### Proto (Service Contracts)

The `proto` directory contains **shared Protocol Buffers definitions** used for gRPC communication between the API Gateway and services.

These files define:

* gRPC services
* request and response messages
* the communication contract between components

Using a shared proto directory ensures that both the gateway and services use the **same API definitions**.

#### Infrastructure (Infra)

The `infra` directory contains infrastructure-related configuration such as:

* Docker configuration
* environment setup
* service orchestration
* deployment configuration

---

## Project Structure

```
scriptsea-ept
│
├── frontend/            # Next.js application
│
└── backend/
    │
    ├── gateway/         # API Gateway (REST → gRPC)
    │
    ├── services/        # Microservices
    │   ├── auth-service/
    │   ├── user-service/
    │   ├── expense-service/
    │   └── wallet-service/
    │
    ├── proto/           # Shared gRPC service definitions
    │
    └── infra/           # Infrastructure configuration (Docker, deployment, etc.)
```

---

## Technology Stack

### Frontend

* Next.js

### Backend

* Go
* gRPC
* Gin (API Gateway)

### Infrastructure

* Docker

---

## Development Status

This project is currently under development as part of a **final thesis project**.

---


##### SEMANGAT GAMATU 👉👈
