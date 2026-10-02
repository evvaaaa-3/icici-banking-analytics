import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loanSummary,groupLoans,monthlyLoans,delinquencyBuckets,mineBaskets,productsOf} from '../src/content/dashboard/banking-data.js';
const {queries}=JSON.parse(readFileSync(new URL('../src/data.json',import.meta.url)));
const loans=queries.loans.rows,customers=queries.customers.rows;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('Primary keys, amounts, customer relationships and exact grain',()=>{
 assert.equal(new Set(loans.map(r=>r.loanId)).size,2800);assert.equal(new Set(customers.map(r=>r.customerId)).size,1800);
 const byId=new Map(customers.map(c=>[c.customerId,c]));
 for(const r of loans){assert.ok(byId.has(r.customerId));assert.equal(r.region,byId.get(r.customerId).region);assert.ok(r.outstandingAmount>=0&&r.outstandingAmount<=r.disbursedAmount);assert.ok(r.receivedPayment<=r.scheduledPayment);assert.ok(r.applicationDate>='2025-04-01'&&r.applicationDate<='2026-03-31');if(r.status==='Active')assert.ok(productsOf(byId.get(r.customerId)).includes(r.loanType));}
 for(const c of customers){assert.equal(c.productCount,productsOf(c).length);assert.equal(new Set(productsOf(c)).size,c.productCount);}
});
test('Weighted portfolio ratios are calculated from exact numerators',()=>{
 const s=loanSummary(loans),active=loans.filter(r=>r.status==='Active');
 const outstanding=active.reduce((n,r)=>n+r.outstandingAmount,0),overdue=active.filter(r=>r.daysPastDue>=90).reduce((n,r)=>n+r.outstandingAmount,0);
 assert.equal(s.outstanding,outstanding);assert.equal(s.delinquent,overdue);
 close(s.approvalRate,loans.filter(r=>!['Pending','Rejected'].includes(r.status)).length/loans.length);
 close(s.collectionRate,loans.reduce((n,r)=>n+r.receivedPayment,0)/loans.reduce((n,r)=>n+r.scheduledPayment,0));
 close(s.interestRate,active.reduce((n,r)=>n+r.outstandingAmount*r.annualInterestRate,0)/outstanding);
});
test('Regions, products, months and DPD buckets reconcile after filtering',()=>{
 for(const rows of [loans,loans.filter(r=>r.region==='South'),loans.filter(r=>r.segment==='Salaried'&&r.loanType==='Home loan')]){
 const s=loanSummary(rows);
 for(const field of ['region','loanType']){const g=groupLoans(rows,field);assert.equal(g.reduce((n,r)=>n+r.applications,0),s.applications);assert.equal(g.reduce((n,r)=>n+r.outstanding,0),s.outstanding);assert.equal(g.reduce((n,r)=>n+r.disbursed,0),s.disbursed);}
 close(monthlyLoans(rows).reduce((n,r)=>n+r.disbursedCr,0),s.disbursed/1e7);
 close(delinquencyBuckets(rows).reduce((n,r)=>n+r.outstandingCr,0),s.outstanding/1e7);
 }
});
test('Apriori matches brute-force enumeration for all one/two antecedent rules',()=>{
 const baskets=[['A','B','C'],['A','B','C'],['A','B'],['A','C'],['B','C'],['A'],[]].map((p,i)=>({customerId:`C${i}`,products:p.join(' | '),contactConsent:true}));
 const opts={minSupport:.1,minConfidence:.1,minLift:0,minJoint:1},m=mineBaskets(baskets,opts);
 const countSet=items=>baskets.filter(c=>items.every(p=>productsOf(c).includes(p))).length;
 const expected=[];
 for(const consequent of ['A','B','C']){const others=['A','B','C'].filter(p=>p!==consequent);for(const ant of [[others[0]],[others[1]],others]){
 const joint=countSet([...ant,consequent]),a=countSet(ant),b=countSet([consequent]);if(joint&&joint/7>=opts.minSupport&&joint/a>=opts.minConfidence)expected.push({consequent,ant,support:joint/7,confidence:joint/a,lift:(joint/a)/(b/7)});
 }}
 assert.equal(m.rules.length,expected.length);
 for(const e of expected){const r=m.rules.find(r=>r.consequent===e.consequent&&[...r.antecedent].sort().join()===e.ant.sort().join());assert.ok(r);close(r.support,e.support);close(r.confidence,e.confidence);close(r.lift,e.lift);assert.equal(r.potentialCustomers,countSet(e.ant)-countSet([...e.ant,e.consequent]));}
});
test('Demo rules, candidate cohorts, thresholds and empty customer baskets',()=>{
 for(const scope of [customers,customers.filter(c=>c.region==='East')]){const m=mineBaskets(scope);assert.ok(m.rules.length>0);for(const r of m.rules){assert.ok(r.support>=.02&&r.confidence>=.35&&r.lift>=1.05&&r.jointCustomers>=20);for(const id of r.customerIds){const c=scope.find(c=>c.customerId===id);assert.ok(r.antecedent.every(p=>productsOf(c).includes(p)));assert.ok(!productsOf(c).includes(r.consequent));}assert.equal(r.potentialCustomers,r.customerIds.length);}}
 assert.deepEqual(mineBaskets([]).rules,[]);assert.equal(loanSummary([]).approvalRate,null);assert.equal(loanSummary([]).collectionRate,null);
 assert.equal(mineBaskets(customers,{minSupport:.9}).rules.length,0);
});
