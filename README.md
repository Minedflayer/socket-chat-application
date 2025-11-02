# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


# ⚡ Socket Chat Application

A real-time chat platform built with **Spring Boot**, **WebSockets (STOMP)**, and **JWT authentication**, featuring both a **public chat room** and **private direct messages (DMs)**.  
This project was created as a learning exercise to explore **socket-based communication**, **backend–frontend integration**, and **structuring larger applications**.

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

## ⚙️ Project Structure

backend/
- ├── src/main/java/com/message_app/demo/
- │ ├── chat/api/ # Controllers (WebSocket endpoints)
- │ ├── chat/application/ # Services (business logic)
- │ ├── chat/domain/ # JPA entities (Conversation, Message, etc.)
- │ └── chat/infrastructure/ # Repository interfaces
- └── resources/
- └── application.yml # Spring Boot configuration

frontend/
├── src/ # React + Vite source
├── index.html
└── package.json

## 🧪 Running the Project

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/socket-chat-application.git
cd socket-chat-application
