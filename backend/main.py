from fastapi import FastAPI, HTTPException
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
        
        # Check if transaction exists
        cursor.execute("SELECT id FROM transactions WHERE id = ?", (transaction_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Delete transaction lines first (foreign key constraint)
        cursor.execute("DELETE FROM transaction_lines WHERE transaction_id = ?", (transaction_id,))
        
        # Delete transaction
        cursor.execute("DELETE FROM transactions WHERE id = ?", (transaction_id,))
        
        conn.commit()
        conn.close()
        return {"message": "Transaction deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    
# Enhanced Accounts endpoint with full details
@app.get("/api/accounts/detailed")
def get_accounts_detailed():
    """Get all accounts with full details including credit card info and classifications"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all accounts with category and currency names
        cursor.execute("""
            SELECT 
                a.id, a.name, c.name as category_name, cu.name as currency_name, 
                a.nature, a.term
            FROM accounts a
            JOIN cat c ON a.cat_id = c.id
            LEFT JOIN currency cu ON a.default_currency_id = cu.id
            ORDER BY a.name
        """)
        
        accounts = []
        for row in cursor.fetchall():
            account_id = row[0]
            
            # Check if it's a credit card
            cursor.execute("SELECT credit_limit, close_day, due_day FROM ccards WHERE account_id = ?", (account_id,))
            credit_card_data = cursor.fetchone()
            
            # Get classifications for this account
            cursor.execute("""
                SELECT c.name 
                FROM classifications c
                JOIN account_classifications ac ON c.id = ac.classification_id
                WHERE ac.account_id = ?
            """, (account_id,))
            classifications = [cls[0] for cls in cursor.fetchall()]
            
            account = {
                "id": row[0],
                "name": row[1],
                "category_name": row[2],
                "currency_name": row[3] or "USD",
                "nature": row[4] or "both",
                "term": row[5] or "undefined",
                "is_credit_card": credit_card_data is not None,
                "classifications": classifications
            }
            
            # Add credit card details if applicable
            if credit_card_data:
                account.update({
                    "credit_limit": float(credit_card_data[0]),
                    "close_day": credit_card_data[1],
                    "due_day": credit_card_data[2]
                })
            
            accounts.append(account)
        
        conn.close()
        return {"accounts": accounts}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/accounts")
def create_account(account_data: dict):
    """Create a new account"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert account
        cursor.execute("""
            INSERT INTO accounts (name, cat_id, default_currency_id, nature, term)
            VALUES (?, ?, ?, ?, ?)
        """, (
            account_data['name'],
            account_data['category_id'],
            account_data['currency_id'],
            account_data['nature'],
            account_data['term']
        ))
        
        account_id = cursor.lastrowid
        
        # If it's a credit card, add credit card details
        if account_data.get('is_credit_card', False):
            cursor.execute("""
                INSERT INTO ccards (account_id, credit_limit, close_day, due_day)
                VALUES (?, ?, ?, ?)
            """, (
                account_id,
                account_data['credit_limit'],
                account_data['close_day'],
                account_data['due_day']
            ))
        
        conn.commit()
        
        # Get the created account with full details
        cursor.execute("""
            SELECT a.id, a.name, c.name as category_name, cu.name as currency_name, 
                   a.nature, a.term
            FROM accounts a
            JOIN cat c ON a.cat_id = c.id
            LEFT JOIN currency cu ON a.default_currency_id = cu.id
            WHERE a.id = ?
        """, (account_id,))
        
        row = cursor.fetchone()
        account = {
            "id": row[0],
            "name": row[1],
            "category_name": row[2],
            "currency_name": row[3] or "USD",
            "nature": row[4] or "both",
            "term": row[5] or "undefined",
            "is_credit_card": account_data.get('is_credit_card', False),
            "classifications": []
        }
        
        if account_data.get('is_credit_card', False):
            account.update({
                "credit_limit": float(account_data['credit_limit']),
                "close_day": account_data['close_day'],
                "due_day": account_data['due_day']
            })
        
        conn.close()
        return {"account": account}
    except Exception as e:
        return {"error": str(e)}

@app.put("/api/accounts/{account_id}")
def update_account(account_id: int, account_data: dict):
    """Update an existing account"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update account basic info
        cursor.execute("""
            UPDATE accounts 
            SET name = ?, cat_id = ?, default_currency_id = ?, nature = ?, term = ?
            WHERE id = ?
        """, (
            account_data['name'],
            account_data['category_id'],
            account_data['currency_id'],
            account_data['nature'],
            account_data['term'],
            account_id
        ))
        
        # Handle credit card status
        cursor.execute("SELECT COUNT(*) FROM ccards WHERE account_id = ?", (account_id,))
        is_currently_credit_card = cursor.fetchone()[0] > 0
        
        if account_data.get('is_credit_card', False) and not is_currently_credit_card:
            # Add credit card details
            cursor.execute("""
                INSERT INTO ccards (account_id, credit_limit, close_day, due_day)
                VALUES (?, ?, ?, ?)
            """, (
                account_id,
                account_data['credit_limit'],
                account_data['close_day'],
                account_data['due_day']
            ))
        elif account_data.get('is_credit_card', False) and is_currently_credit_card:
            # Update existing credit card details
            cursor.execute("""
                UPDATE ccards 
                SET credit_limit = ?, close_day = ?, due_day = ?
                WHERE account_id = ?
            """, (
                account_data['credit_limit'],
                account_data['close_day'],
                account_data['due_day'],
                account_id
            ))
        elif not account_data.get('is_credit_card', False) and is_currently_credit_card:
            # Remove credit card details
            cursor.execute("DELETE FROM ccards WHERE account_id = ?", (account_id,))
        
        conn.commit()
        
        # Return updated account
        cursor.execute("""
            SELECT a.id, a.name, c.name as category_name, cu.name as currency_name, 
                   a.nature, a.term
            FROM accounts a
            JOIN cat c ON a.cat_id = c.id
            LEFT JOIN currency cu ON a.default_currency_id = cu.id
            WHERE a.id = ?
        """, (account_id,))
        
        row = cursor.fetchone()
        account = {
            "id": row[0],
            "name": row[1],
            "category_name": row[2],
            "currency_name": row[3] or "USD",
            "nature": row[4] or "both",
            "term": row[5] or "undefined",
            "is_credit_card": account_data.get('is_credit_card', False),
            "classifications": []
        }
        
        if account_data.get('is_credit_card', False):
            cursor.execute("SELECT credit_limit, close_day, due_day FROM ccards WHERE account_id = ?", (account_id,))
            cc_data = cursor.fetchone()
            if cc_data:
                account.update({
                    "credit_limit": float(cc_data[0]),
                    "close_day": cc_data[1],
                    "due_day": cc_data[2]
                })
        
        conn.close()
        return {"account": account}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/api/accounts/{account_id}")
def delete_account(account_id: int):
    """Delete an account"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if account has transactions
        cursor.execute("SELECT COUNT(*) FROM transaction_lines WHERE account_id = ?", (account_id,))
        has_transactions = cursor.fetchone()[0] > 0
        
        if has_transactions:
            raise HTTPException(status_code=400, detail="Cannot delete account with existing transactions")
        
        # Delete credit card record if exists
        cursor.execute("DELETE FROM ccards WHERE account_id = ?", (account_id,))
        
        # Delete account classifications
        cursor.execute("DELETE FROM account_classifications WHERE account_id = ?", (account_id,))
        
        # Delete account
        cursor.execute("DELETE FROM accounts WHERE id = ?", (account_id,))
        
        conn.commit()
        conn.close()
        return {"message": "Account deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Category CRUD endpoints
@app.get("/api/categories")
def get_categories():
    """Get all categories"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM cat ORDER BY name")
        
        categories = []
        for row in cursor.fetchall():
            categories.append({
                "id": row[0],
                "name": row[1]
            })
        
        conn.close()
        return {"categories": categories}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/categories")
def create_category(category_data: dict):
    """Create a new category"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("INSERT INTO cat (name) VALUES (?)", (category_data['name'],))
        category_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        return {"category": {"id": category_id, "name": category_data['name']}}
    except Exception as e:
        return {"error": str(e)}

@app.put("/api/categories/{category_id}")
def update_category(category_id: int, category_data: dict):
    """Update an existing category"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if category exists
        cursor.execute("SELECT id FROM cat WHERE id = ?", (category_id,))
        if not cursor.fetchone():
            return {"error": "Category not found"}
        
        cursor.execute("UPDATE cat SET name = ? WHERE id = ?", (category_data['name'], category_id))
        
        conn.commit()
        conn.close()
        return {"category": {"id": category_id, "name": category_data['name']}}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/api/categories/{category_id}")
def delete_category(category_id: int):
    """Delete a category"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if category exists
        cursor.execute("SELECT id FROM cat WHERE id = ?", (category_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Check if category is used by any accounts
        cursor.execute("SELECT COUNT(*) FROM accounts WHERE cat_id = ?", (category_id,))
        accounts_count = cursor.fetchone()[0]
        
        if accounts_count > 0:
            raise HTTPException(status_code=400, detail=f"Cannot delete category. It is used by {accounts_count} account(s)")
        
        cursor.execute("DELETE FROM cat WHERE id = ?", (category_id,))
        
        conn.commit()
        conn.close()
        return {"message": "Category deleted successfully"}
    except HTTPException:
        raise  # Re-raise HTTPException
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Enhanced Currencies endpoint
@app.get("/api/currencies/detailed")
def get_currencies_detailed():
    """Get all currencies with full details"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, exchange_rate FROM currency ORDER BY name")
        
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

@app.post("/api/currencies")
def create_currency(currency_data: dict):
    """Create a new currency"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("INSERT INTO currency (name, exchange_rate) VALUES (?, ?)", 
                      (currency_data['name'], currency_data['exchange_rate']))
        currency_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        return {"currency": {
            "id": currency_id, 
            "name": currency_data['name'],
            "exchange_rate": float(currency_data['exchange_rate'])
        }}
    except Exception as e:
        return {"error": str(e)}

@app.put("/api/currencies/{currency_id}")
def update_currency(currency_id: int, currency_data: dict):
    """Update an existing currency"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if currency exists
        cursor.execute("SELECT id FROM currency WHERE id = ?", (currency_id,))
        if not cursor.fetchone():
            return {"error": "Currency not found"}
        
        cursor.execute("UPDATE currency SET name = ?, exchange_rate = ? WHERE id = ?", 
                      (currency_data['name'], currency_data['exchange_rate'], currency_id))
        
        conn.commit()
        conn.close()
        return {"currency": {
            "id": currency_id, 
            "name": currency_data['name'],
            "exchange_rate": float(currency_data['exchange_rate'])
        }}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/api/currencies/{currency_id}")
def delete_currency(currency_id: int):
    """Delete a currency"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if currency exists
        cursor.execute("SELECT id FROM currency WHERE id = ?", (currency_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Currency not found")
        
        # Check if currency is used by any accounts or transactions
        cursor.execute("SELECT COUNT(*) FROM accounts WHERE default_currency_id = ?", (currency_id,))
        accounts_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM transactions WHERE currency_id = ?", (currency_id,))
        transactions_count = cursor.fetchone()[0]
        
        if accounts_count > 0 or transactions_count > 0:
            raise HTTPException(status_code=400, detail=f"Cannot delete currency. It is used by {accounts_count} account(s) and {transactions_count} transaction(s)")
        
        cursor.execute("DELETE FROM currency WHERE id = ?", (currency_id,))
        
        conn.commit()
        conn.close()
        return {"message": "Currency deleted successfully"}
    except HTTPException:
        raise  # Re-raise HTTPException to let FastAPI handle it properly
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# Enhanced Classifications endpoint
@app.get("/api/classifications/detailed")
def get_classifications_detailed():
    """Get all classifications with full details"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM classifications ORDER BY name")
        
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

@app.post("/api/classifications")
def create_classification(classification_data: dict):
    """Create a new classification"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("INSERT INTO classifications (name) VALUES (?)", (classification_data['name'],))
        classification_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        return {"classification": {"id": classification_id, "name": classification_data['name']}}
    except Exception as e:
        return {"error": str(e)}

@app.put("/api/classifications/{classification_id}")
def update_classification(classification_id: int, classification_data: dict):
    """Update an existing classification"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if classification exists
        cursor.execute("SELECT id FROM classifications WHERE id = ?", (classification_id,))
        if not cursor.fetchone():
            return {"error": "Classification not found"}
        
        cursor.execute("UPDATE classifications SET name = ? WHERE id = ?", 
                      (classification_data['name'], classification_id))
        
        conn.commit()
        conn.close()
        return {"classification": {"id": classification_id, "name": classification_data['name']}}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/api/classifications/{classification_id}")
def delete_classification(classification_id: int):
    """Delete a classification"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if classification exists
        cursor.execute("SELECT id FROM classifications WHERE id = ?", (classification_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Classification not found")
        
        # Check if classification is used by any transaction lines or account classifications
        cursor.execute("SELECT COUNT(*) FROM transaction_lines WHERE classification_id = ?", (classification_id,))
        transaction_lines_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM account_classifications WHERE classification_id = ?", (classification_id,))
        account_links_count = cursor.fetchone()[0]
        
        if transaction_lines_count > 0 or account_links_count > 0:
            raise HTTPException(status_code=400, detail=f"Cannot delete classification. It is used by {transaction_lines_count} transaction line(s) and linked to {account_links_count} account(s)")
        
        cursor.execute("DELETE FROM classifications WHERE id = ?", (classification_id,))
        
        conn.commit()
        conn.close()
        return {"message": "Classification deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Account-Classification linking endpoints
@app.get("/api/accounts/{account_id}/classifications")
def get_account_classifications(account_id: int):
    """Get classifications linked to a specific account"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if account exists
        cursor.execute("SELECT id FROM accounts WHERE id = ?", (account_id,))
        if not cursor.fetchone():
            return {"error": "Account not found"}
        
        cursor.execute("""
            SELECT c.id, c.name
            FROM classifications c
            JOIN account_classifications ac ON c.id = ac.classification_id
            WHERE ac.account_id = ?
            ORDER BY c.name
        """, (account_id,))
        
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

@app.post("/api/accounts/{account_id}/classifications/{classification_id}")
def link_account_classification(account_id: int, classification_id: int):
    """Link a classification to an account"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if account exists
        cursor.execute("SELECT id FROM accounts WHERE id = ?", (account_id,))
        if not cursor.fetchone():
            return {"error": "Account not found"}
        
        # Check if classification exists
        cursor.execute("SELECT id FROM classifications WHERE id = ?", (classification_id,))
        if not cursor.fetchone():
            return {"error": "Classification not found"}
        
        # Check if link already exists
        cursor.execute("SELECT id FROM account_classifications WHERE account_id = ? AND classification_id = ?", 
                      (account_id, classification_id))
        if cursor.fetchone():
            return {"error": "Classification is already linked to this account"}
        
        cursor.execute("INSERT INTO account_classifications (account_id, classification_id) VALUES (?, ?)", 
                      (account_id, classification_id))
        
        conn.commit()
        conn.close()
        return {"message": "Classification linked successfully"}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/api/accounts/{account_id}/classifications/{classification_id}")
def unlink_account_classification(account_id: int, classification_id: int):
    """Unlink a classification from an account"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if account exists
        cursor.execute("SELECT id FROM accounts WHERE id = ?", (account_id,))
        if not cursor.fetchone():
            return {"error": "Account not found"}
        
        # Check if link exists
        cursor.execute("SELECT id FROM account_classifications WHERE account_id = ? AND classification_id = ?", 
                      (account_id, classification_id))
        if not cursor.fetchone():
            return {"error": "Classification is not linked to this account"}
        
        cursor.execute("DELETE FROM account_classifications WHERE account_id = ? AND classification_id = ?", 
                      (account_id, classification_id))
        
        conn.commit()
        conn.close()
        return {"message": "Classification unlinked successfully"}
    except Exception as e:
        return {"error": str(e)}