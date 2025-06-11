from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
from typing import List, Dict, Any

app = FastAPI(title="Finance App API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    """Create a new database connection for each request"""
    return sqlite3.connect("finance.db")

@app.get("/")
def read_root():
    return {"message": "Finance App API is running!"}

@app.get("/api/transactions")
def get_transactions():
    """Get all transactions with better formatting"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                t.id, 
                t.description, 
                c.name as currency_name,
                MIN(tl.date) as date,
                SUM(CASE WHEN tl.debit IS NOT NULL THEN tl.debit ELSE -tl.credit END) as amount,
                GROUP_CONCAT(DISTINCT a.name) as accounts
            FROM transactions t
            JOIN transaction_lines tl ON t.id = tl.transaction_id
            LEFT JOIN currency c ON t.currency_id = c.id
            LEFT JOIN accounts a ON tl.account_id = a.id
            GROUP BY t.id, t.description, c.name
            ORDER BY date DESC
            LIMIT 100
        """)
        
        transactions = []
        for row in cursor.fetchall():
            transactions.append({
                "id": row[0],
                "description": row[1],
                "currency_name": row[2] or "USD",
                "date": row[3],
                "amount": float(row[4]) if row[4] else 0.0,
                "accounts": row[5] or "Unknown"
            })
        
        conn.close()
        return {"transactions": transactions, "total": len(transactions)}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/accounts")
def get_accounts():
    """Get all accounts"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT a.id, a.name, c.name as category, cu.name as currency, a.nature, a.term
            FROM accounts a
            JOIN cat c ON a.cat_id = c.id
            LEFT JOIN currency cu ON a.default_currency_id = cu.id
        """)
        
        result = []
        for row in cursor.fetchall():
            result.append({
                "id": row[0],
                "name": row[1],
                "category": row[2],
                "currency": row[3],
                "nature": row[4] if row[4] else "both",
                "term": row[5] if row[5] else "undefined"
            })
        
        conn.close()
        return {"accounts": result}
    except Exception as e:
        return {"error": str(e)}