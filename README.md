# Employee Monitoring & Project Management System

A full-stack application built with **Next.js (Frontend)** and **FastAPI (Backend)**, integrated with **Supabase** for database and storage.

## 📁 Project Structure

- `/src`, `/app`, `/components` - Next.js Frontend (Root)
- `/backend` - FastAPI Backend Logic
- `/api` - Vercel Serverless Entry Point
- `/public` - Frontend Static Assets

---

## 🚀 Local Development

You will need to run two separate terminals for the frontend and the backend.

### 1. Backend (FastAPI)

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Set up a Virtual Environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables**:
   Create a `.env` file in the `backend/` folder:
   ```env
   # Leave empty to use local SQLite (employee_monitoring.db)
   DATABASE_URL=
   
   # Required for file uploads to work on Vercel
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   SUPABASE_BUCKET=uploads
   
   SECRET_KEY=a_random_secret_string
   ```

5. **Run the Backend**:
   ```bash
   uvicorn main:app --reload
   ```
   The API will be available at `http://localhost:8000`.

---

### 2. Frontend (Next.js)

1. **Install Dependencies** (from the root directory):
   ```bash
   npm install
   ```

2. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   The dashboard will be available at `http://localhost:3000`.

---

## 🛠️ Database Management

- **Check Connection**: Run `python backend/check_db.py` to verify your database connection.
- **Reset/Seed Data**: Run `python backend/seed.py` to create initial admin/manager accounts.

## 🌍 Deployment

This project is configured for **Vercel**. 
- Simply push your code to GitHub.
- Link the repository in Vercel.
- The `vercel.json` and `api/index.py` files handle the routing between Next.js and the Python backend automatically.
