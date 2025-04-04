# 🚀 SpaceStorage Manager

**SpaceStorage Manager** is a containerized full-stack web application designed to manage and optimize storage systems. It includes a React-based frontend and a Python backend with MongoDB as the database. The entire setup is Dockerized for easy deployment and scalability.

spacestorage-manager/

├── backend/               # Python Backend Flask
│   └── Dockerfile
│
├── frontend/              # React frontend
│   └── Dockerfile
│
├── docker-compose.yml     # Compose file to run frontend + backend
└── README.md              # Project documentation


---

## 📦 Backend API Access (Standalone)

If you want to use just the backend API without running the full application, you can pull the Docker image directly:

### 🔹 Pull the image from Docker Hub

```bash
docker pull aravind0217/spacestorage_api:latest

docker run -d -p 8000:8000 --name backend_container aravind0217/spacestorage_api:latest

```

If you want to run whole application then you can run the docker compose file with following commands:

```bash
