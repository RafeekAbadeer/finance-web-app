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
def get_transactions(skip: int = 0, limit: int = 100):
    """Get transactions with pagination support"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # First get total count
        cursor.execute("""
            SELECT COUNT(DISTINCT t.id)
            FROM transactions t
            JOIN transaction_lines tl ON t.id = tl.transaction_id
        """)
        total_count = cursor.fetchone()[0]
        
        # Then get paginated data
        cursor.execute("""
            SELECT 
                t.id, 
                t.description, 
                c.name as currency_name,
                MIN(tl.date) as date,
                SUM(COALESCE(tl.debit, 0)) as total_debit,
                SUM(COALESCE(tl.credit, 0)) as total_credit,
                COUNT(tl.id) as line_count,
                GROUP_CONCAT(DISTINCT a.name) as accounts
            FROM transactions t
            JOIN transaction_lines tl ON t.id = tl.transaction_id
            LEFT JOIN currency c ON t.currency_id = c.id
            LEFT JOIN accounts a ON tl.account_id = a.id
            GROUP BY t.id, t.description, c.name
            ORDER BY date DESC
            LIMIT ? OFFSET ?
        """, (limit, skip))
        
        transactions = []
        for row in cursor.fetchall():
            total_debit = float(row[4]) if row[4] else 0.0
            total_credit = float(row[5]) if row[5] else 0.0
            line_count = row[6]
            
            display_amount = total_debit if total_debit > 0 else total_credit
            
            transactions.append({
                "id": row[0],
                "description": row[1],
                "currency_name": row[2] or "USD",
                "date": row[3],
                "amount": display_amount,
                "accounts": row[7] or "Unknown",
                "total_debit": total_debit,
                "total_credit": total_credit,
                "line_count": line_count
            })
        
        conn.close()
        return {
            "transactions": transactions, 
            "total": total_count,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/transactions/{transaction_id}/lines")
def get_transaction_lines(transaction_id: int):
    """Get all lines for a specific transaction"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                tl.id,
                tl.transaction_id,
                a.name as account_name,
                tl.debit,
                tl.credit,
                tl.date,
                c.name as classification_name
            FROM transaction_lines tl
            JOIN accounts a ON tl.account_id = a.id
            LEFT JOIN classifications c ON tl.classification_id = c.id
            WHERE tl.transaction_id = ?
            ORDER BY tl.id
        """, (transaction_id,))
        
        lines = []
        for row in cursor.fetchall():
            lines.append({
                "id": row[0],
                "transaction_id": row[1],
                "account_name": row[2],
                "debit": float(row[3]) if row[3] else None,
                "credit": float(row[4]) if row[4] else None,
                "date": row[5],
                "classification_name": row[6]
            })
        
        conn.close()
        return {"lines": lines, "total": len(lines)}
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

@app.post("/api/transactions")
def create_transaction(transaction_data: dict):
    """Create a new transaction with its lines"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert transaction
        cursor.execute("""
            INSERT INTO transactions (description, currency_id)
            VALUES (?, ?)
        """, (transaction_data['description'], transaction_data['currency_id']))
        
        transaction_id = cursor.lastrowid
        
        # Insert transaction lines
        for line in transaction_data['lines']:
            cursor.execute("""
                INSERT INTO transaction_lines (transaction_id, account_id, debit, credit, date, classification_id)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (transaction_id, line['account_id'], line.get('debit'), line.get('credit'), 
                  line['date'], line.get('classification_id')))
        
        conn.commit()
        conn.close()
        return {"message": "Transaction created successfully", "id": transaction_id}
    except Exception as e:
        return {"error": str(e)}

@app.put("/api/transactions/{transaction_id}")
def update_transaction(transaction_id: int, transaction_data: dict):
    """Update an existing transaction"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update transaction
        cursor.execute("""
            UPDATE transactions 
            SET description = ?, currency_id = ?
            WHERE id = ?
        """, (transaction_data['description'], transaction_data['currency_id'], transaction_id))
        
        # Delete existing lines
        cursor.execute("DELETE FROM transaction_lines WHERE transaction_id = ?", (transaction_id,))
        
        # Insert new lines
        for line in transaction_data['lines']:
            cursor.execute("""
                INSERT INTO transaction_lines (transaction_id, account_id, debit, credit, date, classification_id)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (transaction_id, line['account_id'], line.get('debit'), line.get('credit'), 
                  line['date'], line.get('classification_id')))
        
        conn.commit()
        conn.close()
        return {"message": "Transaction updated successfully"}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(transaction_id: int):
    """Delete a transaction and its lines"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Delete transaction lines first (foreign key constraint)
        cursor.execute("DELETE FROM transaction_lines WHERE transaction_id = ?", (transaction_id,))
        
        # Delete transaction
        cursor.execute("DELETE FROM transactions WHERE id = ?", (transaction_id,))
        
        conn.commit()
        conn.close()
        return {"message": "Transaction deleted successfully"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/currencies")
def get_currencies():
    """Get all currencies"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, exchange_rate FROM currency")
        
        currencies = []
        for row in cursor.fetchall():
            currencies.append({
                "id": row[0],
                "name": row[1],
                "exchange_rate": float(row[2]) if row[2] else 1.0
            })
        
        conn.close()
        return {"currencies": currencies}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/classifications")
def get_classifications():
    """Get all classifications"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM classifications")
        
        classifications = []
        for row in cursor.fetchall():
            classifications.append({
                "id": row[0],
                "name": row[1]
            })
        
        conn.close()
        return {"classifications": classifications}
    except Exception as e:
        return {"error": str(e)}