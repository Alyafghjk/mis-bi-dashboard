# MIS Business Intelligence (BI) Dashboard

A premium, glassmorphic Management Information System (MIS) and Business Intelligence (BI) dashboard featuring real-time transaction processing, interactive analytical charts, and database auditing tools.

Built from scratch using vanilla CSS and JavaScript, this application delivers a highly responsive, modern interface with a native theme-switching engine (dark mode by default).

---

## 🌟 Key Features

1. **Analytical KPIs**:
   - **Total Revenue**: Aggregates all completed sales.
   - **Transaction Count**: Live count of current transaction queries.
   - **Average Order Value (AOV)**: Reflects purchase sizing of completed transactions.
   - **Transaction Success Rate**: Measures success ratio against overall attempts.
2. **Interactive Visualizations**:
   - **Revenue History**: A customized area chart displaying revenue fluctuations over time.
   - **Category Allocation**: A doughnut chart outlining department-level sales share.
   - **Payment Channels**: A mini horizontal frequency bar chart showing payment method popularity.
3. **Robust Data Controller**:
   - Live query searches targeting customer name or transaction ID.
   - Dual-faceted filters (Category, Order Status, Timeframe range).
   - Interactive table header sorting (amount, dates, customers, IDs) in ascending or descending directions.
   - Live paginated dataset controls.
4. **Data Portability**:
   - Instant export of currently filtered transaction subsets to standard CSV format.
5. **Dynamic Design System**:
   - Glassmorphic backdrop-blur card containers.
   - Ambient purple and cyan light blobs with custom pulse-glow animations.
   - Native dark mode and light mode toggles (preserved via browser local storage).

---

## 📁 Repository Directory Structure

```text
mis-bi-dashboard/
├── index.html              # Main dashboard HTML structure
├── README.md               # Project documentation (this file)
├── assets/
│   ├── css/
│   │   └── style.css       # Core stylesheets and dark/light themes
│   ├── js/
│   │   └── dashboard.js    # Data fetching, pipeline, chart engine, and event handlers
│   └── images/             # Image resources
└── data/
    └── transactions.json   # Mock transaction database
```

---

## 🚀 How to Run the Project Locally

Because the dashboard fetches data from a local JSON database file (`data/transactions.json`), modern browsers will trigger CORS policy security errors if you open the `index.html` file directly (via `file://` protocol).

You **MUST** run the project using a local web server:

### Option A: VS Code Live Server (Recommended)
1. Open the project folder in VS Code.
2. Install the **Live Server** extension by Ritwick Dey.
3. Click the **Go Live** button in the bottom right corner of the editor.

### Option B: Python Local Server
If you have Python installed, open your terminal/command prompt, navigate to the `mis-bi-dashboard` directory, and run:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```
Then open your browser and navigate to `http://localhost:8000`.

### Option C: Node.js (http-server)
Run the following commands using npm:
```bash
# Install globally
npm install -g http-server

# Run inside directory
http-server -p 8000
```
Then open your browser and navigate to `http://localhost:8000`.

---

## 🛠️ Built With
- **HTML5** & **Vanilla CSS3** (Custom properties & Flexbox/Grid)
- **Vanilla JavaScript** (ES6+ features)
- [Chart.js](https://www.chartjs.org/) - Modern canvas chart visualizations
- [Lucide Icons](https://lucide.dev/) - Clean, open-source vector icon pack
- Google Fonts - **Outfit** & **Inter**
