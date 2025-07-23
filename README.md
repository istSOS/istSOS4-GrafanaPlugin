# istSOS4 Grafana Plugin

A powerful Grafana data source plugin for connecting to istSOS4 server to create customized dashboards and visualize sensor data in real-time.

## 🚀 Features

- **SensorThings API Integration**: Support for OGC SensorThings API 
- **Advanced Filtering**: Comprehensive filter system supporting:
  - Basic filters (field-based comparisons)
  - Temporal filters (date ranges and temporal functions)
  - Spatial filters (geometric queries)
  - Measurement filters (sensor-specific data filtering)
  - Complex OData expressions
- **Variable Support**: Dashboard template variables for dynamic queries
- **Real-time Data**: Live data visualization with automatic refresh
- **Dynamic Panels & Dashboards**: Ability to create panels and dashboards to visualize:
  - Datastream Observations
  - Locations and Historical Locations of Things

## 📋 Prerequisites

- **Node.js**: Version 18.x or higher  
- **npm**: Version 8.x or higher  
- **Grafana (Local Installation)**: Required for Method 1  
- **Docker**: Required for Method 2 (Complete Development Environment)

## 🛠️ Installation & Setup

### Method 1: Plugin Development Only (npm run dev)

**Use this when**: You want to develop the plugin and use it with your **existing Grafana installation**.

> ⚠️ You must have Grafana installed and running locally.

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

5. **Install plugin in your local Grafana**:
   - Copy the `dist/` folder to your Grafana plugins directory
   - Restart your local Grafana instance
   - The plugin will auto-reload when you make changes

**Note**: This method requires you to have Grafana already installed and running separately.

---

### Method 2: Complete Development Environment (npm run server) – **Recommended**

**Use this when**: You want a complete, isolated development environment with Grafana + Plugin.

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
   
   This command:
   - Builds a Docker container with Grafana + your plugin
   - Starts Grafana on `http://localhost:3000`
   - Automatically loads the plugin (unsigned plugins enabled)
   - Mounts your source code for live development

4. **Access Grafana**:
   - Open your browser and go to `http://localhost:3000`
   - Default credentials: `admin` / `admin`
   - The istSOS4 plugin will be available in the data sources

5. **Development workflow**:
   ```bash
   # In another terminal, watch for changes and rebuild
   npm run dev
   
   # The Docker container will pick up the new build automatically
   # Just refresh your browser to see changes
   ```

---

## 🔧 Configuration

### 1. Add Data Source

1. In Grafana, go to **Configuration** → **Data Sources**
2. Click **Add data source**
3. Search for and select **istSOS4**
4. Configure the connection:
   - **URL**: Your istSOS4 server URL
   - **Token URL**: Your server Token URL
   - **Basic Auth**: Configure your username and password

### 2. Test Connection

Click **Save & Test** to verify the connection to your istSOS4 server.

---

## 📊 Usage

### Creating Queries

1. **Create a new dashboard panel**
2. **Select istSOS4 as the data source**
3. **Configure your query**:
   - **Entity**: Choose from Things, Datastreams, Sensors, etc.
   - **Entity ID**: (Optional) Specify a particular entity
   - **Expand**: Include related entities
   - **Filters**: Add complex filtering logic
   - **Variables**: Use dashboard variables for dynamic queries

### Filter Types

- **Basic**: Simple field comparisons (`name eq 'Temperature'`)
- **Temporal**: Date/time filtering with ranges or functions
- **Spatial**: Geographic queries using geometries
- **Measurement**: Sensor-specific data filtering
- **Complex**: Custom OData expressions

### Template Variables

Create dashboard variables to make your dashboards dynamic:

1. Go to **Dashboard Settings** → **Variables**
2. Add a new variable with istSOS4 data source
3. Use the variable in your queries with `$variableName` syntax

---

## 📄 License

This project is licensed under the Apache-2.0 License.

---

## 🏗️ Built With

- [Grafana Plugin SDK](https://grafana.com/developers/plugin-tools/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [OGC SensorThings API](https://www.ogc.org/standards/sensorthings)
