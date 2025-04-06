# 🚀 SpaceStorage Manager

**SpaceStorage Manager** is a containerized full-stack web application designed to manage and optimize storage systems. It includes a React-based frontend and a Python backend with MongoDB as the database. The entire setup is Dockerized for easy deployment and scalability.

spacestorage-manager/
```

├── backend/               # Python Backend Flask
│   └── Dockerfile
│
├── frontend/              # React frontend
│   └── Dockerfile
│
├── docker-compose.yml     # Compose file to run frontend + backend
└── README.md              # Project documentation
```


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
git pull https://github.com/ARAVIND2017/cargo.git

docker-compose up -d
```



---

---

## 📡 API Endpoints
```

### 1. `/placement` – POST  
Optimizes placement of cargo items in available containers.

Request
{
  "items": [
    {
      "itemId": "item-1",
      "name": "Food Pack",
      "width": 10,
      "depth": 10,
      "height": 10,
      "mass": 1,
      "priority": 1,
      "preferredZone": "A"
    }
  ],
  "containers": [
    {
      "containerId": "container-1",
      "width": 100,
      "depth": 100,
      "height": 100,
      "maxPayloadMass": 1000,
      "zones": [
        {
          "zoneId": "A",
          "x": 0,
          "y": 0,
          "z": 0,
          "width": 50,
          "depth": 100,
          "height": 100,
          "maxPayloadMass": 500
        }
      ]
    }
  ]
}
```

Response
```
{
  "placements": [
    {
      "itemId": "item-1",
      "containerId": "container-1",
      "zoneId": "A",
      "x": 0,
      "y": 0,
      "z": 0
    }
  ]
}
```


2. /search – POST
Searches for cargo items or containers by ID or name.
```

Request
{
  "query": "item-1"
}

Response
{
  "status": "success",
  "results": [
    {
      "itemId": "item-1",
      "name": "Food Pack",
      "location": {
        "containerId": "container-1",
        "zoneId": "A"
      }
    }
  ]
}
```


3. /simulate – POST
Runs a simulation using built-in mock data.
```

Request
// No payload required
```

Response
```
{
  "status": "success",
  "placements": [
    {
      "itemId": "item-2",
      "containerId": "container-1",
      "zoneId": "B",
      "x": 5,
      "y": 0,
      "z": 0
    }
  ]
}
```


4. /waste – GET
Retrieves unused volume, empty zones, and container stats.
```

Request
{
  "unusedVolume": 5000,
  "unusedZones": [
    {
      "zoneId": "B",
      "volume": 1200
    }
  ],
  "containerStats": [
    {
      "containerId": "container-1",
      "usedVolume": 4800,
      "totalVolume": 10000
    }
  ]
}
```

