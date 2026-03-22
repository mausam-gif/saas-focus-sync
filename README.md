# Employee Monitoring & Project Management System

## Prerequisites
- **Python 3.9+**
- **Node.js 18+**

## Starting the Backend (FastAPI)

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the server (Uses local SQLite database automatically):
   ```bash
   uvicorn main:app --reload --port 8000
   ```
The API documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

## Starting the Frontend (Next.js)

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies (if you haven't already):
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

You can navigate to the different dashboards using the sidebar or by going to:
- `/admin/dashboard`
- `/manager/dashboard`
- `/employee/dashboard`

to fill frontend port 
kill -9 11675
kill -9 $(lsof -t -i:8000)


git add . && git commit -m "User updates" && git push


