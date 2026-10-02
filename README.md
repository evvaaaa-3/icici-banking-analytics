# ICICI Banking Intelligence

An independent banking analytics portfolio project combining **loan portfolio analysis** with **customer product basket analysis**. All records are synthetic. This project is not affiliated with ICICI Bank and does not use real bank or customer data.

## Start here

- **Instant preview:** open `preview.html` in your browser. This self-contained file includes the entire demo dataset and requires no server.
- **Vercel deployment:** follow the short instructions below. A compiled static build is included.
- **Source development:** the React dashboard lives in `src/content/dashboard/DashboardContent.jsx`; analytics are in `banking-data.js` in the same folder.

## What the project does

### Loan portfolio

- Applications, total disbursements, active outstanding principal, and 90+ days-past-due exposure.
- Monthly origination-cohort disbursement trend, loan-type exposure, delinquency buckets, regional overdue share, and cumulative application progression.
- Approval rate, cumulative collection ratio, outstanding-weighted interest rate, and written off principal.
- Searchable and sortable application ledger, source inspection, and source-data export.
- Region, segment, loan-type, and application-date filters.

### Product basket analysis

- Customer baskets, average product depth, qualifying association rules, and a deduplicated potential-customer pool.
- Product ownership prevalence and strongest associations ranked by lift.
- Apriori frequent itemsets up to size three, with one- or two-product antecedents and a singleton consequent.
- Interactive minimum support, confidence, and lift controls, with a minimum of 20 joint holders.
- Select an association to inspect its exact counts and customers who hold its starting products but lack the target product.
- Region and customer-segment filters. Loan cohort filters do not affect product ownership because baskets are a separate snapshot.

### Data & methodology

Dataset inventory, metric definitions, calculation scope, generation approach, and limitations are available within the app. Both dashboards use a responsive shared component system, light/dark themes, source inspection, table search/sort/pagination, and editable presentation.

## Deploy to Vercel

1. Extract this ZIP. Upload the contents of the `icici-insights` folder into a new GitHub repository. **Include `dist/`.**
2. In Vercel, choose **Add New → Project** and import that repository.
3. Keep the project root as the repository root. The included `vercel.json` specifies:
   - Framework preset: **Other** (`framework: null`).
   - Build command: empty (skip building).
   - Install command: empty (skip installation).
   - Output directory: **dist**.
4. Deploy. The complete dashboard and snapshot are already compiled into `dist/`.

No backend, database, API keys, environment variables, or bank credentials are needed. This delivery is prepared for Vercel; no deployment has been made to a Vercel account.

Configuration reference: https://vercel.com/docs/project-configuration/vercel-json

### Local HTTP preview

```bash
python3 -m http.server 4173 --directory dist
```

Open `http://localhost:4173`. The offline `preview.html` is another option.

### Source development and rebuilding

Node 22.12+ and Python 3.10+ are recommended. The source includes its dependency manifest and lockfile.

```bash
npm install
npm run dev
# Rebuild after editing the React/CSS or data snapshot:
npm run build
```

The normal Vite source build writes a self-contained `dist/index.html`. The shipped build uses a separate, content-addressed snapshot; keep all shipped `dist/` files together. The no-build Vercel setup serves whichever current build you commit. Always rebuild and commit `dist/` after source changes; otherwise Vercel will keep serving the prior build.

The authoring environment also supports its installed Data build tool; that tool is not required for the shipped static deployment or a normal npm rebuild.

## Reproduce the data and analysis

```bash
python3 analysis/generate_demo.py
node --test tests-project/metrics.test.mjs
python3 analysis/run_sql.py
```

The generator uses random seed **271828**. It writes the same fictional records to `data/loans.csv`, `data/customers.csv`, and `src/data.json`; generation timestamps reflect the actual execution time. Rebuild after regenerating. The SQL companion runs using Python's standard-library SQLite and independently reproduces loan-product metrics and directed product-pair rules.

## Data model

| Dataset | Grain | Size | Period |
|---|---|---:|---|
| Loans | One application per loanId | 2,800 | 1 Apr 2025–31 Mar 2026 |
| Customers | One customer and product basket per customerId | 1,800 | 31 Mar 2026 snapshot |

Loans link to customers by `customerId`. Active funded loan products are included in customer holdings. Currency values are stored as INR; crore and lakh are display units only. Synthetic customer IDs are the only identifiers.

`products` stores unique product names separated by ` | `. Empty baskets are retained in the population. Product co-ownership is a cross-sectional basket, not a history of purchases.

## Metric definitions

| Metric | Calculation / interpretation |
|---|---|
| Approval rate | Approved + Active + Closed + Written off application count / all applications, including Pending |
| Disbursements | Funded principal within the selected application cohort, including subsequently closed/written off loans |
| Outstanding | Active principal remaining at the cutoff within that cohort |
| 90+ DPD exposure | Active outstanding principal >=90 days overdue / active outstanding principal; not an official regulatory NPA measure |
| Collection ratio | Cumulative payments received / cumulative payments scheduled as at cutoff, for funded loans in the cohort |
| Weighted interest rate | Sum of active outstanding × annual interest rate / sum of active outstanding |
| Support | Joint antecedent-and-consequent holders / all selected customers |
| Confidence | Joint holders / antecedent holders |
| Lift | Confidence / consequent ownership prevalence |
| Potential customers | Antecedent holders who do not hold the consequent |
| Potential customer pool | Deduplicated union across qualifying rules; never sum overlapping rule pools |

A zero denominator displays as unavailable rather than a fabricated zero rate. Filtered counts and weighted ratios are recalculated from original rows.

## Important interpretation limits

- All findings describe the simulated dataset. Correlations are deliberately introduced by the generator and are not claims about ICICI customers.
- Loans originated before April 2025 are absent. This cannot describe the bank's entire loan book or actual business performance.
- The monthly trend is grouped by **application month**, not cash disbursement month.
- Product ownership percentages overlap and do not sum to 100%.
- Lift identifies sample association, not causality, individual propensity, purchase probability, or a suitable financial recommendation.
- Potential customers are an exploratory pool, not approved leads. Simulated consent is shown separately. No credit decision, expected-revenue forecast, or causal uplift is claimed.
- The static dashboard uses a fixed snapshot. Refreshing updates the dataset and build; it does not connect to live bank systems. Presentation preferences remain local to a browser.

Association-rule definitions: https://docs.oracle.com/en/database/oracle/oracle-database/18/dmcon/apriori.html

## Verification completed

- Production build and authored-content integrity checks passed.
- Five analytics tests passed: keys and relationships, weighted formulas, breakdown reconciliation, Apriori versus exhaustive enumeration, and threshold/candidate/empty-population behavior.
- Independent SQLite outputs reconciled to JavaScript for all four loan types and qualifying singleton-antecedent pair rules.
- Build manifest and static snapshot integrity were checked.
- **Browser rendering, mobile layout, and UI interactions were not verified:** the browser preview timed out in this environment. Review those in the included preview before treating the project as fully visually checked.


