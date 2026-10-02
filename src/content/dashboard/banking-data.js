export const sum=(rows,key)=>rows.reduce((n,r)=>n+(Number(r[key])||0),0);
export const ratio=(a,b)=>b ? a/b : null;
export const pct=(v)=>v==null?'—':`${(v*100).toFixed(1)}%`;
export const money=(v)=>v==null?'—':v>=1e7?`₹${(v/1e7).toFixed(2)} Cr`:v>=1e5?`₹${(v/1e5).toFixed(2)} L`:`₹${Math.round(v).toLocaleString('en-IN')}`;
export const count=(v)=>v.toLocaleString('en-IN');
export const productsOf=c=>c.products?c.products.split(' | '):[];
export const isApproved=r=>!['Rejected','Pending'].includes(r.status);
export const isFunded=r=>r.disbursedAmount>0;
export function loanSummary(rows){
  const active=rows.filter(r=>r.status==='Active'), funded=rows.filter(isFunded);
  const outstanding=sum(active,'outstandingAmount');
  return {applications:rows.length, approved:rows.filter(isApproved).length,funded:funded.length,
    disbursed:sum(rows,'disbursedAmount'),outstanding,delinquent:sum(active.filter(r=>r.daysPastDue>=90),'outstandingAmount'),
    approvalRate:ratio(rows.filter(isApproved).length,rows.length),collectionRate:ratio(sum(funded,'receivedPayment'),sum(funded,'scheduledPayment')),
    interestRate:ratio(active.reduce((n,r)=>n+r.outstandingAmount*r.annualInterestRate,0),outstanding),writeOff:sum(rows,'writeOffAmount')};
}
export function groupLoans(rows,field){
 return [...new Set(rows.map(r=>r[field]))].sort().map(label=>{
  const s=loanSummary(rows.filter(r=>r[field]===label));
  return {[field]:label,...s,disbursedCr:s.disbursed/1e7,outstandingCr:s.outstanding/1e7,delinquencyRate:ratio(s.delinquent,s.outstanding)};
 });
}
export function monthlyLoans(rows){
 const grouped=new Map();
 rows.forEach(r=>{const month=r.applicationDate.slice(0,7)+'-01';if(!grouped.has(month))grouped.set(month,[]);grouped.get(month).push(r);});
 return [...grouped].sort(([a],[b])=>a.localeCompare(b)).map(([month,rs])=>{const s=loanSummary(rs);return {month,applications:s.applications,disbursedCr:s.disbursed/1e7,approvalRate:s.approvalRate};});
}
export function delinquencyBuckets(rows){
 return [['Current',0,0],['1–30 days',1,30],['31–60 days',31,60],['61–89 days',61,89],['90+ days',90,Infinity]].map(([bucket,a,b])=>{
 const rs=rows.filter(r=>r.status==='Active'&&r.daysPastDue>=a&&r.daysPastDue<=b);return {bucket,accounts:rs.length,outstandingCr:sum(rs,'outstandingAmount')/1e7};
 });
}
function combinations(a,k){if(k===0)return [[]];return a.flatMap((x,i)=>combinations(a.slice(i+1),k-1).map(xs=>[x,...xs]));}
const key=items=>[...items].sort().join('\u001f');
/** Apriori, bounded to frequent itemsets of size <=3, singleton consequents. */
export function mineBaskets(customers,{minSupport=.02,minConfidence=.35,minLift=1.05,minJoint=20}={}){
 const baskets=customers.map(c=>new Set(productsOf(c))),N=baskets.length;
 if(!N)return {rules:[],adoption:[],itemsets:[],N:0};
 const products=[...new Set(baskets.flatMap(b=>[...b]))].sort();
 const counts=new Map(),frequent=new Map(),itemsets=[];
 const minCount=Math.max(minJoint,Math.ceil(minSupport*N));
 const occurrences=items=>baskets.reduce((n,b)=>n+Number(items.every(x=>b.has(x))),0);
 let previous=[];
 for(let k=1;k<=3;k++){
   const candidates=k===1?products.map(p=>[p]):combinations(previous,k).filter(items=>combinations(items,k-1).every(s=>frequent.has(key(s))));
   const level=[];
   for(const items of candidates){const n=occurrences(items);counts.set(key(items),n);if(n>=minCount){frequent.set(key(items),n);itemsets.push({items,count:n,support:n/N});level.push(items);}}
   previous=[...new Set(level.flat())];if(!level.length)break;
 }
 const adoption=products.map(product=>({product,customers:counts.get(key([product]))||0,ownershipShare:(counts.get(key([product]))||0)/N})).sort((a,b)=>b.customers-a.customers);
 const rules=[];
 for(const set of itemsets.filter(s=>s.items.length>=2))for(const consequent of set.items){
   const antecedent=set.items.filter(x=>x!==consequent),aCount=counts.get(key(antecedent)),bCount=counts.get(key([consequent]));
   const confidence=set.count/aCount,lift=confidence/(bCount/N);
   if(confidence>=minConfidence&&lift>=minLift){
     const candidates=customers.filter(c=>{const b=new Set(productsOf(c));return antecedent.every(x=>b.has(x))&&!b.has(consequent);});
     rules.push({ruleId:key(antecedent)+' => '+consequent,antecedent,consequent,rule:antecedent.join(' + ')+' → '+consequent,support:set.support,confidence,lift,jointCustomers:set.count,antecedentCustomers:aCount,consequentCustomers:bCount,potentialCustomers:candidates.length,consentingCustomers:candidates.filter(c=>c.contactConsent).length,customerIds:candidates.map(c=>c.customerId)});
   }
 }
 rules.sort((a,b)=>b.lift-a.lift||b.jointCustomers-a.jointCustomers||a.rule.localeCompare(b.rule));
 return {rules,adoption,itemsets,N};
}
