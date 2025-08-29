# istSOS4 Grafana Plugin – Development Setup Guide

This guide provides three different approaches for setting up the development environment for the **istSOS4 Grafana Plugin**.

---

## 📋 Prerequisites

- **Node.js**: Version 18.x or higher  
- **npm**: Version 8.x or higher  
- **Docker**: Required for Method 2 & 3  
- **Grafana (Local Installation)**: Required for Method 1 only  

---

## 🛠️ Development Setup Methods

### Method 1: Existing Grafana Instance

**Use this when**: You want to develop the plugin and use it with your **existing Grafana installation**.  
Note: You still need to install Node.js dependencies in your environment.

> ⚠️ Grafana must already be installed and running locally.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MostafaMagdyy/istSOS4-GrafanaPlugin.git
   cd istSOS4-GrafanaPlugin/istsos4-istsos4grafana-datasource
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the plugin**:
   ```bash
   npm run build
   ```

4. **Run in development mode** (watches for changes and rebuilds automatically):
   ```bash
   npm run dev
   ```

5. **Install the plugin in your local Grafana**:
   - Copy the `dist/` folder to your Grafana plugins directory
   - Restart your Grafana instance
   - The plugin will auto-reload when you make changes

---

### Method 2: Complete Development Environment (`npm run server`)

**Use this when**: You want a complete, isolated development environment with **Grafana + Plugin**.

1. **Clone and navigate to the project**:
   ```bash
   git clone https://github.com/MostafaMagdyy/istSOS4-GrafanaPlugin.git
   cd istSOS4-GrafanaPlugin/istsos4-istsos4grafana-datasource
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the complete development environment**:
   ```bash
   npm run server
   ```

   This will:
   - Build a Docker container with Grafana + your plugin
   - Start Grafana at `http://localhost:3000`
   - Automatically load the plugin (unsigned plugins enabled)
   - Mount your source code for live development

4. **Access Grafana**:
   - Open `http://localhost:3000` in your browser
   - Default credentials: `admin / admin`
   - The istSOS4 plugin will be available in **Data Sources**

5. **Development workflow**:
   In another terminal, run:
   ```bash
   npm run dev
   ```
   
   This watches for changes and rebuilds the plugin automatically.

---

### Method 3: Advanced Development with Live Reload (`docker compose`)

**Use this when**: You want the most advanced development experience with **live reload and hot module replacement**, with no prerequisites required in your local environment.

This method uses `docker-compose.dev.yaml`, which provides:
- **Live Reload**: Automatic browser refresh on code changes
- **Hot Module Replacement**: Instant updates without full reload
- **Full Development Toolchain** inside the container

1. **Clone and navigate to the project**:
   ```bash
   git clone https://github.com/MostafaMagdyy/istSOS4-GrafanaPlugin.git
   cd istSOS4-GrafanaPlugin/istsos4-istsos4grafana-datasource
   ```

2. **Start the advanced development environment**:
   ```bash
   docker compose -f docker-compose.dev.yaml up --build
   ```

3. **Access Grafana**:
   - Open `http://localhost:3000` in your browser
   - Default credentials: `admin / admin`