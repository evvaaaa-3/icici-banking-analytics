"""Run the SQL companion using only Python's standard library."""
import csv, sqlite3, json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
db=sqlite3.connect(':memory:')
for name in ['loans','customers']:
    rows=list(csv.DictReader((root/f'data/{name}.csv').open()))
    cols=list(rows[0]);quoted=lambda x:'"'+x.replace('"','""')+'"'
    db.execute(f'CREATE TABLE {name} ({",".join(quoted(c) for c in cols)})')
    db.executemany(f'INSERT INTO {name} VALUES ({",".join("?" for _ in cols)})',[[r[c] for c in cols] for r in rows])
db.execute('CREATE TABLE customer_products (customerId TEXT, product TEXT, PRIMARY KEY(customerId,product))')
for row in db.execute('SELECT customerId, products FROM customers').fetchall():
    for p in row[1].split(' | ') if row[1] else []:db.execute('INSERT INTO customer_products VALUES (?,?)',(row[0],p))
sql='\n'.join(line for line in (root/'analysis/portfolio.sql').read_text().splitlines() if not line.lstrip().startswith('--'))
results=[]
for stmt in sql.split(';'):
    if not stmt.strip():continue
    cursor=db.execute(stmt)
    if cursor.description:
        fields=[c[0] for c in cursor.description]
        results.append([dict(zip(fields,r)) for r in cursor.fetchall()])
print(json.dumps({'loan_product_metrics':results[0],'pair_rules':results[1]},indent=2))
