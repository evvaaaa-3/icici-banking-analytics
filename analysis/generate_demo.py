"""Reproducible fictional banking portfolio. Run from the project root."""
import random, json, csv
from pathlib import Path
from datetime import date, timedelta, datetime, timezone
rng=random.Random(271828)
ROOT=Path(__file__).resolve().parents[1]
cutoff=date(2026,3,31)
generated_at=datetime.now(timezone.utc).isoformat()
regions=['North','South','West','East']
customers=[]
for i in range(1800):
    segment=rng.choices(['Salaried','Self-employed','Business'],[.58,.27,.15])[0]
    income=round(rng.uniform(360000,2400000)/1000)*1000
    investor=rng.random()<(.42 if income>1200000 else .17)
    saver=rng.random()<.82
    products=[]
    if saver: products.append('Savings account')
    if rng.random()<(.55 if segment=='Business' else .06):products.append('Current account')
    if rng.random()<(.51 if saver and segment=='Salaried' else .16):products.append('Credit card')
    if rng.random()<(.42 if saver else .11):products.append('Fixed deposit')
    if rng.random()<(.88 if investor else .06):products.append('Demat account')
    if rng.random()<(.79 if investor else .08):products.append('Mutual fund')
    customers.append(dict(customerId=f'DEMO-C{i+1:05}',region=rng.choices(regions,[.29,.28,.30,.13])[0],segment=segment,annualIncome=income,creditScore=rng.randint(560,850),contactConsent=rng.random()<.76,products=products))
loans=[]
types=['Home loan','Personal loan','Auto loan','Business loan']
for i in range(2800):
    c=rng.choice(customers)
    day=date(2025,4,1)+timedelta(days=rng.randrange(365))
    typ=rng.choices(types,[.27,.40,.22,.11])[0]
    amt=round(rng.uniform(*{'Home loan':(1500000,9000000),'Personal loan':(100000,1200000),'Auto loan':(300000,1800000),'Business loan':(500000,4000000)}[typ])/10000)*10000
    approved=rng.random()<(.90 if c['creditScore']>=720 else .55 if c['creditScore']>=640 else .20)
    status='Pending' if (cutoff-day).days<10 and rng.random()<.30 else ('Approved' if rng.random()<.055 else rng.choices(['Active','Closed','Written off'],[.92,.06,.02])[0]) if approved else 'Rejected'
    funded=status in ['Active','Closed','Written off']
    disdate=min(day+timedelta(days=rng.randint(2,9)),cutoff) if funded else None
    dpd=rng.choices([0,15,45,75,105,150],[.79,.08,.055,.03,.025,.02])[0] if status=='Active' else 0
    age=(cutoff-disdate).days if disdate else 0
    balance=round(amt*max(.2,1-age/1700)) if status=='Active' else 0
    rate=round(rng.uniform(*{'Home loan':(8.4,10.8),'Personal loan':(11.0,19.0),'Auto loan':(8.8,13.0),'Business loan':(10.5,17.0)}[typ]),2)
    due=round(amt*(rate/1200+.012)*(age//30)) if funded else 0
    received=round(due*(rng.uniform(.96,1) if dpd==0 else rng.uniform(.70,.92) if dpd<90 else rng.uniform(.35,.69))) if status!='Written off' else round(due*.35)
    dti=round(rng.uniform(.12,.57),3)
    loans.append(dict(loanId=f'DEMO-L{i+1:05}',customerId=c['customerId'],applicationDate=day.isoformat(),disbursementDate=disdate.isoformat() if disdate else None,region=c['region'],segment=c['segment'],loanType=typ,status=status,requestedAmount=amt,approvedAmount=amt if status not in ['Rejected','Pending'] else 0,disbursedAmount=amt if funded else 0,outstandingAmount=balance,daysPastDue=dpd,annualInterestRate=rate,debtToIncome=dti,scheduledPayment=due,receivedPayment=received,creditScore=c['creditScore'],writeOffAmount=round(amt*.70) if status=='Written off' else 0))
    if status=='Active' and typ not in c['products']:c['products'].append(typ)
for c in customers:
    if 'Home loan' in c['products'] and rng.random()<.65:c['products'].append('Term insurance')
    elif rng.random()<.12:c['products'].append('Term insurance')
    c['products']=' | '.join(sorted(set(c['products'])))
    c['productCount']=len(c['products'].split(' | ')) if c['products'] else 0
    c['snapshotDate']='2026-03-31'
old=json.loads((ROOT/'src/data.json').read_text())
source={'provider':'Synthetic demonstration','classification':'synthetic','executedAt':generated_at,'timezone':'Asia/Kolkata','files':['analysis/generate_demo.py'],'tables':[], 'evidenceFlow':[{'title':'Deterministic generator','detail':'Python random seed 271828; 1,800 fictional customers and 2,800 application records; no ICICI data. Run python3 analysis/generate_demo.py.'}], 'caveats':['Independent portfolio project; not affiliated with ICICI Bank. Values and correlations are deliberately simulated.','Loans are application cohorts for FY2025–26, with balances and payment totals as at 31 March 2026. No opening loan book is supplied.','90+ DPD exposure is an analytical delinquency indicator, not an official regulatory NPA measure.','Product ownership is a single customer snapshot, not purchase-event transactions; association does not establish causality or suitability.'], 'metricDefinitions':[{'label':'Approval rate','definition':'Approved, Active, Closed, and Written off application count / all applications, including Pending.'},{'label':'Disbursements','definition':'Sum of disbursedAmount for funded applications in the selected application cohort; monthly trend is bucketed by application month, not cash-flow month. Units: INR.'},{'label':'90+ DPD exposure','definition':'Active outstanding balance with daysPastDue >= 90 / all active outstanding balance.'},{'label':'Collection ratio','definition':'Sum of cumulative receivedPayment / sum of cumulative scheduledPayment, to the snapshot date, for funded loans in the selected application cohort. Not monthly cash flow.'},{'label':'Support','definition':'Customer baskets containing antecedent AND consequent / all scoped customer baskets, including empty baskets.'},{'label':'Confidence','definition':'Customer baskets containing antecedent AND consequent / baskets containing antecedent.'},{'label':'Lift','definition':'Confidence / consequent ownership prevalence. >1 indicates positive association in this sample.'},{'label':'Potential customers','definition':'Customers holding every antecedent product and not holding the consequent; not validated leads or credit eligibility.'}]}
old.update(title='ICICI · Banking intelligence',status='fixture',generatedAt=generated_at,filters=[{'id':'region','label':'Region','field':'region','defaultValue':'all','queryIds':['loans','customers']},{'id':'segment','label':'Customer segment','field':'segment','defaultValue':'all','queryIds':['loans','customers']},{'id':'loanType','label':'Loan type','field':'loanType','defaultValue':'all','queryIds':['loans']},{'id':'applicationDate','label':'Application date','field':'applicationDate','mode':'range','defaultValue':'all','queryIds':['loans']}],queries={'loans':{'rows':loans,'source':dict(source,title='Fictional loan application ledger',grain='One application per loanId',period='1 Apr 2025 – 31 Mar 2026',units='Amounts: INR; interest: percent; DTI: fraction')},'customers':{'rows':customers,'source':dict(source,title='Fictional customer product ownership',grain='One basket per customerId',period='31 Mar 2026 snapshot',units='Product ownership and distinct customers')}})
(ROOT/'src/data.json').write_text(json.dumps(old,indent=2)+'\n')
for name, rows in [('loans',loans),('customers',customers)]:
    with (ROOT/f'data/{name}.csv').open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
print(f'Generated {len(loans)} loans and {len(customers)} customers.')
