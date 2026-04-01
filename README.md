# \# Financial Analyzer 📊

# 

# A web application for calculating and comparing financial indicators of stock market companies.

# 

# \*\*Live Demo:\*\* \[financial-analyzer-eight.vercel.app](https://financial-analyzer-eight.vercel.app)

# 

# \---

# 

# \## Features

# 

# \- \*\*Multi-company comparison\*\* – select multiple companies and compare their indicators side by side

# \- \*\*Custom indicators\*\* – define your own financial formulas using variable names

# \- \*\*Flexible data input\*\* – enter financial data manually or import from CSV/Excel files

# \- \*\*Interactive charts\*\* – visualize indicators with line or bar charts

# \- \*\*Export to Excel\*\* – download results as .xlsx file

# \- \*\*Variable management\*\* – customize default financial variables

# \- \*\*Responsive UI\*\* – clean interface built with Material UI

# 

# \## Tech Stack

# 

# \*\*Frontend\*\*

# \- React + TypeScript

# \- Material UI (MUI)

# \- Recharts

# \- Axios

# 

# \*\*Backend\*\*

# \- Python + FastAPI

# \- SQLAlchemy + SQLite

# \- Pandas (CSV/Excel import)

# 

# \*\*Deployment\*\*

# \- Frontend: Vercel

# \- Backend: Render

# 

# \---

# 

# \## Getting Started

# 

# \### Prerequisites

# \- Python 3.10+

# \- Node.js 18+

# 

# \### Run locally

# 

# \*\*1. Clone the repository\*\*

# ```bash

# git clone https://github.com/TWOJA\_NAZWA/financial-analyzer.git

# cd financial-analyzer

# ```

# 

# \*\*2. Start the backend\*\*

# ```bash

# cd backend

# python -m venv venv

# venv\\Scripts\\activate        # Windows

# source venv/bin/activate     # Mac/Linux

# pip install -r requirements.txt

# uvicorn main:app --reload

# ```

# 

# \*\*3. Start the frontend\*\*

# ```bash

# cd frontend

# npm install

# npm start

# ```

# 

# \*\*Or use the included scripts (Windows):\*\*

# ```bash

# \# Start both services

# .\\start.ps1

# 

# \# Stop both services

# .\\stop.ps1

# ```

# 

# The app will be available at `http://localhost:3000`  

# API documentation at `http://localhost:8000/docs`

# 

# \---

# 

# \## How It Works

# 

# \### 1. Add companies

# Navigate to the \*\*Companies\*\* tab and add stock market companies with their ticker symbols.

# 

# \### 2. Enter financial data

# Click the table icon next to a company to enter financial data (revenue, net income, etc.) manually or import from a CSV/Excel file.

# 

# CSV format example:

# | year | revenue | net\_income | equity |

# |------|---------|------------|--------|

# | 2022 | 278887  | 13955      | 62744  |

# | 2023 | 241100  | 10609      | 71300  |

# 

# \### 3. Define indicators

# Navigate to the \*\*Indicators\*\* tab to define financial formulas, for example:

# \- `ROE = net\_income / equity`

# \- `Net Margin = net\_income / revenue`

# \- `Current Ratio = current\_assets / current\_liabilities`

# 

# \### 4. Calculate \& compare

# Go to the \*\*Calculator\*\* tab, select companies, years, and indicators, then click \*\*Calculate\*\*.

# 

# \---

# 

# \## Project Structure

# ```

# financial-analyzer/

# ├── backend/

# │   ├── app/

# │   │   ├── models/        # SQLAlchemy models

# │   │   ├── routers/       # API endpoints

# │   │   └── services/      # Business logic (calculator)

# │   ├── main.py            # FastAPI app entry point

# │   ├── seed.py            # Sample data

# │   └── requirements.txt

# ├── frontend/

# │   └── src/

# │       ├── components/    # Reusable UI components

# │       ├── pages/         # Main views

# │       └── services/      # API client

# ├── start.ps1              # Start script (Windows)

# └── stop.ps1               # Stop script (Windows)

# ```

# 

# \---

# 

# \## Future Plans

# 

# \- \[ ] PDF export

# \- \[ ] Dark mode

# \- \[ ] Historical data import from external APIs (GPW, Yahoo Finance)

# \- \[ ] User authentication

# \- \[ ] PostgreSQL support for production

# 

# \---

# 

# \## License

# 

# MIT

