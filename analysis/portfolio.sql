-- SQLite companion. run_sql.py loads the CSV datasets and normalizes products.
-- Amounts are INR. Loan filters use application cohorts; balances are at cutoff.
SELECT loanType,
       COUNT(*) AS applications,
       SUM(disbursedAmount) AS disbursed,
       SUM(outstandingAmount) AS outstanding,
       1.0 * SUM(CASE WHEN status NOT IN ('Rejected','Pending') THEN 1 ELSE 0 END)
            / NULLIF(COUNT(*),0) AS approvalRate,
       1.0 * SUM(CASE WHEN status='Active' AND CAST(daysPastDue AS INTEGER)>=90
                      THEN outstandingAmount ELSE 0 END)
            / NULLIF(SUM(outstandingAmount),0) AS delinquencyRate,
       1.0 * SUM(receivedPayment) / NULLIF(SUM(scheduledPayment),0) AS collectionRate
FROM loans
GROUP BY loanType;

-- Directed pair association rules. Dashboard also supports 2-item antecedents.
WITH population AS (SELECT COUNT(*) AS n FROM customers),
     prevalence AS (SELECT product, COUNT(*) AS holders FROM customer_products GROUP BY product),
     pairs AS (
       SELECT a.product AS antecedent, b.product AS consequent, COUNT(*) AS joint
       FROM customer_products a JOIN customer_products b
       ON a.customerId=b.customerId AND a.product<>b.product
       GROUP BY a.product,b.product
     )
SELECT p.antecedent,p.consequent,p.joint,
       1.0*p.joint/pop.n AS support,
       1.0*p.joint/a.holders AS confidence,
       (1.0*p.joint/a.holders)/(1.0*b.holders/pop.n) AS lift,
       a.holders-p.joint AS potentialCustomers
FROM pairs p JOIN prevalence a ON p.antecedent=a.product
JOIN prevalence b ON p.consequent=b.product CROSS JOIN population pop
WHERE p.joint>=20 AND 1.0*p.joint/pop.n>=0.02
  AND 1.0*p.joint/a.holders>=0.35
  AND (1.0*p.joint/a.holders)/(1.0*b.holders/pop.n)>=1.05
ORDER BY lift DESC,joint DESC;
