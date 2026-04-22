# BlaiseAI

BlaiseAI is a business solution for companies that collect supplier quotes in PDF format. It digitizes these quotes into an integrated database, enabling:

1. **Quote Comparison**: Compare quotes from different suppliers.
2. **Online Benchmarking**: Compare quotes against typical online ranges.
3. **Data Transformation**: Convert PDF data into a Python-built database for manipulation and accurate product cost baselines.
4. **Supplier Insights**: Analyze supplier geographies, companies, materials, and currencies.
5. **Hedge Import and FX Risk**: Enable a proactive approach for hedging currency and tariff risk (based on PaxAI and WorldMonitor interfaces)
6. **Risk Hedging**: Account for tariffs and exchange rate fluctuations from supplier countries.
7. **AutoCAD Export**: Export blueprints to AutoCAD format.
8. **Excel Export**: Access data via Excel for non-technical teams.
9. **GitHub Integration**: Connect to codespaces for data accessibility.

## Features

- Minimalistic web interface for uploading PDF quotes.
- Automated data extraction and database integration.
- Comparative analysis tools.
- Export capabilities to Excel and AutoCAD.
- Integration with external APIs for tariffs and exchange rates.

## Tech Stack

- **Backend**: Python with FastAPI
- **Frontend**: React
- **Database**: PostgreSQL (or SQLite for development)
- **PDF Processing**: PyMuPDF, pdfplumber
- **Data Analysis**: Pandas, NumPy
- **Export**: openpyxl for Excel, ezdxf for AutoCAD

## Setup

### Prerequisites

- Python 3.8+
- Node.js 14+
- PostgreSQL (optional, SQLite for local dev)

### Installation

1. Clone the repository.
2. Set up backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
3. Set up frontend:
   ```bash
   cd frontend
   npm install
   ```
4. Run the application:
   - Backend: `uvicorn app.main:app --reload`
   - Frontend: `npm start`

## Usage

Upload PDF quotes via the web interface. The system will extract data, store it in the database, and provide comparison and export options.

## API Endpoints

- POST /api/v1/upload: Upload a PDF quote
- GET /api/v1/quotes: Get all quotes
- POST /api/v1/compare: Compare quotes
- GET /api/v1/export/excel: Export quotes to Excel
- GET /api/v1/export/autocad/{quote_id}: Export to AutoCAD (not implemented)
