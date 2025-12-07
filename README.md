# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


# ⚡ Socket Chat Application

A real-time chat platform built with **Spring Boot**, **WebSockets (STOMP)**, and **JWT authentication**, featuring both a **public chat room** and **private direct messages (DMs)**.  
This project was created as a learning exercise to explore **Spring Boot**, **socket-based communication**, **backend–frontend integration**, and **structuring larger applications**.

---
## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
* **Java Development Kit (JDK) 19**
* **Java version: 17**
---

## 🧩 Tech Stack

### Backend
- **Spring Boot** (WebSocket + STOMP)
- **Spring Security** (JWT Authentication)
- **Spring Data JPA** (Persistence layer)
- **MySQL** (Database; H2 can be used for testing)
- **Maven** (Build system)

### Frontend
- **React + Vite**
- **TailwindCSS**
- Optional: simple HTML client for testing WebSocket connections

---

## 🚀 Features

- **Public Chat Room** – all connected users can send and receive messages in real time.  
- **Private Direct Messages (DMs)** – one-to-one conversations handled over secure user queues.  
- **JWT Authentication** – secure identification of connected users via token validation.  
- **Message Persistence** – messages are stored in a relational database (MySQL/H2).  
- **Online User Tracking** – optional `OnlineUserRegistry` keeps track of active sessions.  
- **Layered Architecture** – clean separation between API, Application, Domain, and Infrastructure layers.

---

## 🧠 Learning Goals

This project was created to gain practical experience with:
- WebSocket communication (STOMP protocol)
- Spring Boot configuration and modular design
- JWT security integration
- Building and structuring larger, multi-layered applications
- Connecting a React frontend to a WebSocket backend

---

frontend/
- ├── src/ # React + Vite source
- ├── index.html
- └── package.json

## 🧪 Running the Project

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/socket-chat-application.git
cd socket-chat-application
```

### 2. **Backend setup**
- Create and add your own token
- Generate key in Git Bash:

```bash
openssl rand -base64 32
```
- Add the key in the .env file


- **Run the backend**
```bash
cd backend
mvn spring-boot:run
```

---

## 🏗️ Architecture & Code Structure

This project follows a **Layered Architecture** with a lean implementation of **Domain-Driven Design (DDD)** principles. The backend is structured to separate the "Web" layer (Controllers) from the "Business" layer (Services) and the "Persistence" layer (Repositories).

### 📂 Backend Package Breakdown

The backend is organized into three primary modules within `com.message_app.demo`:

#### 1. `auth` (Security & Identity)
Handles the stateless authentication mechanism.
* **`api`**: Contains the `AuthController` for HTTP-based login.
* **`infrastructure.security`**:
    * `JwtService`: Responsible for signing and parsing JSON Web Tokens (HS256).
    * `HttpSecurityConfig`: Configures Spring Security to allow public access to auth endpoints while securing the rest.

#### 2. `chat` (Core Domain)
The heart of the messaging logic.
* **`api`**: 
   * **dto**
      * `ChatMessage`: DTO that carries the content of a message and the its sender.
      * `MessageDto`: Dto that carries info about the messages that are sent.
* `DmWebSocketController`: The primary STOMP endpoint. It handles sending/receiving DMs and "opening" conversations using a Request-Reply pattern.
* `ChatController`: Handles legacy global chat broadcasts.
* **`application`**:
    * `DmService`: Encapsulates business logic, such as ensuring a user exists and generating unique "Conversation Keys" (e.g., `alice:bob`) to prevent duplicate chats.
* **`domain`**:
    * **Entities**: `Conversation`, `ConversationMember`, and `Message`.
    * **Logic**: The `Conversation` entity uses a canonical key strategy (alphabetical sorting of usernames) to ensure uniqueness at the database level.
* **`infrastructure`**:
    * `ws`: Contains the `StompAuthChannelInterceptor`. This is a critical component that intercepts the initial WebSocket **CONNECT** frame to validate the JWT header before a session is established.
    * `persistence`: Spring Data JPA repositories.

#### 3. `realtime` (State Management)
* Manages ephemeral state, such as tracking which users are currently online via `WebSocketEvents` (Connect/Disconnect listeners).

---

### 📡 The Communication Protocol (STOMP over WebSockets)

Unlike standard REST APIs, this application relies on a persistent, bi-directional connection.

1.  **The Handshake:** The client connects via SockJS to `/chat`. The JWT is passed in the STOMP `CONNECT` headers.
2.  **The Interceptor:** The backend `StompAuthChannelInterceptor` intercepts this frame, decodes the JWT, and assigns a Spring Security `Principal` to the WebSocket session.
3.  **The Flow:**
    * **Inbound (Client → Server):** Messages are sent to `/app/dm/...`.
    * **Processing:** The controller persists the message to the H2 database.
    * **Outbound (Server → Client):** The server pushes the message to specific user queues: `/user/queue/dm/{conversationId}`.

---

### 💾 Database Schema Design

The application uses a relational model optimized for lookup speed:

| Entity | Description |
| :--- | :--- |
| **Conversation** | The root entity. Contains a unique `dmKey` (e.g., `"alice:bob"`) to ensure only one DM thread exists per pair of users. |
| **ConversationMember** | A join table linking Users (by string username) to Conversations. Indexed to quickly find "All chats for Alice". |
| **Message** | Stores the content, sender, and timestamp. Linked to a Conversation. |

---

### ⚛️ Frontend Architecture (React)

The frontend uses a **Hybrid Data Loading** strategy to ensure performance:

1.  **Initialization:** Uses `@stomp/stompjs` to establish the connection using the JWT from local storage.
2.  **Opening a Chat:**
    * Uses a **Request/Reply** pattern over WebSockets to ask the server for a `conversationId` based on a username.
    * Once the ID is returned, it performs a standard **REST GET** request to fetch historical messages (pagination ready).
3.  **Real-time Updates:** Subscribes to `/user/queue/dm/{id}` to receive new messages instantly without polling.

---

### 💡 Key Design Decisions

* **Canonical Keys:** Instead of complex queries to check if a DM exists between two users, we generate a deterministic key (`userA:userB` sorted alphabetically). This allows us to rely on database unique constraints to prevent duplicates.
* **Map vs Array:** The frontend uses React `Map` state for conversation storage. This provides O(1) access time when updating a specific conversation thread, regardless of how many active chats are open.
* **Security at the Gate:** Security is handled at the *Channel Interceptor* level, meaning unauthenticated users cannot even subscribe to a topic, let alone send a message.
