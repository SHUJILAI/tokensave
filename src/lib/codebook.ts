// ==== SMC4 Shared Codebook v4.0 ====
export const CODEBOOK = `SMC4
Slash-delimited templates. Numbers INLINE (no N: table). E: for entity dedup only.

C/id/A/B/s/e/v = Contract id: A<->B, s to e, value v
S/m/t = SLA: m>=t
ST/r/d = SLA tier: m in r, fee -d
U/a/p = Uptime: a in p
P/m/a/t = Perf: m was a vs target t
F/a/p = Fee: a per p
FF/r/rt/u = Flex fee: rt/u for r
FC/a/p/w = Fee cap: a/p, excess by w
PY/d/l = Pay due d, late l/day
IN/b/pd/o/t = Invoice: billed b paid pd owed o terms t
I/d/dur/c/loc = Incident d dur long cause c at loc
FX/a = Fix: a (+separated)
BR/n/cap = Breach: notify n, cap cap
TM/n/cs/pen = Term: n notice causes cs penalty pen
RN/dl/p/cap = Renew dl before exp, p period, price<=cap
EN/m = Encrypt: m
AC/m = Access: m
DL/l/r = Data: l restrict r
AU/w/tp/d/r = Audit w(tp) d result r
MG/w/dst/dl = Migrate w->dst by dl
UG/s/v/w/i = Upgrade s->v w impact i
MS/n/dl = Milestone n by dl
CS/m/pct = Save pct via m
PR/svc/mo/1x/tl/sp = Propose svc mo/mo+1x once tl specs sp
D/pct/cond = Discount pct for cond
PE/n/ti/o = Person n=ti@o
A/ow/tk/dl = Action ow:tk by dl
NM/d/t = Next mtg d re t
X/c = Fact: c
DP/l/ct = Dispute law l court ct

FMT:
- Slots: / delim. Multi-val: + within slot
- Nums INLINE: k=1e3 M=1e6 B=1e9. Money: 4.2M Pct: 99.95% Dates: YYMMDD
- E: entities A=short,B=short (dedup only, NO N: table)
- ; chains on one line. X/ only if no template fits.`;

const ABBREVS = 'db=database srv=server net=network mig=migration app=application inf=infra cert=certification opt=optimization res=resource util=utilization perf=performance comp=compliance int=integration auto=automated mon=monitoring sec=security enc=encryption rep=replication dc=datacenter fn=failover bkp=backup rec=recovery dr=disaster_recovery upg=upgrade dn=downtime lat=latency rsp=response';

const ULTRA_CODES = 'dbfn=DB failover nwp=net partition 3xrep=triple rep autofn=auto-failover hlthchk=health checks vidstr=video stream resutil=res util legapp=legacy apps drcert=DR cert perfopt=perf opt telemed=telemedicine k8s=Kubernetes SOC2=SOC2-II';

const FULL_ABBREVS = 'db=database srv=server net=network mig=migration app=application inf=infrastructure cert=certification opt=optimization res=resource util=utilization perf=performance comp=compliance int=integration auto=automated mon=monitoring sec=security enc=encryption rep=replication dc=datacenter fn=failover bkp=backup rec=recovery dr=disaster_recovery sla=SLA upg=upgrade dn=downtime lat=latency rsp=response dbfn=DB failover nwp=network partition 3xrep=triple replication autofn=auto-failover hlthchk=health checks vidstr=video streaming resutil=resource utilization legapp=legacy apps drcert=DR certification perfopt=performance optimization telemed=telemedicine k8s=Kubernetes SOC2=SOC2 Type II';

// ---- Encoder prompts by mode ----
export const ENC_PROMPTS: Record<string, string> = {
  balanced: `SMC4 ENCODER. Text -> ultra-compact template calls. NO N: table -- inline all numbers.

${CODEBOOK}

Output:
E:A=short,B=short
---
Template calls one/line. ; to chain. Use E refs in slots. Numbers INLINE (4.2M not $a).
Every fact->template. Drop filler. Deduplicate. Be complete.
Numbers: ALWAYS use k/M suffixes. 4200000->4.2M 150000->150k`,

  max: `SMC4 MAX encoder. Critical facts only, NO N: table.

${CODEBOOK}

Output:
E:A=short,B=short
---
Chained calls with ;. Numbers INLINE.

ONLY: numbers/deadlines/costs/metrics/decisions/obligations.
DROP: people/discussion/context/background.
Merge aggressively. Use k/M. Max density.`,

  extreme: `SMC4 EXTREME encoder. Absolute minimum tokens. NO N: table.

${CODEBOOK}

ABBREV: ${ABBREVS}

Output:
E:A=x,B=y (1-3 char entities)
---
ALL calls on MIN lines. ; chain. Abbrevs. Numbers INLINE with k/M.

- MAX 15 calls total
- Shortest slot values. dbfn not db-failover
- People in A/: use E: refs (SC,LP)
- Chain 3-4 actions on one line
- Drop non-critical facts. NO X/ calls.
- Target: <120 tokens`,

  ultra: `SMC4 ULTRA encoder. Minimum tokens. NO N: table.

${CODEBOOK}

ULTRA RULES:
1. E: ONE line. 2-char names. NO N: line -- all numbers inline.
2. After --- encode critical facts. Inline 4.2M not $a.
3. Max 3 words per slot. Codes: ${ULTRA_CODES}
4. A/ref/2words/YYMMDD -- max 5 tok/action
5. ; chain everything. 5-8 lines after ---
6. NO X/ calls.
7. Target: <80 tokens

E:A=TF,B=MH
---
(dense chained calls)`,

  ultraplus: `SMC4 ULTRA+ encoder. Like ULTRA but even denser. NO N: table.

${CODEBOOK}

ULTRA+ vs ULTRA differences:
1. E: ONE line, 2-char names. NO N: line.
2. Drop ALL PE/ (people) and NM/ (next meeting) calls entirely.
3. Merge ALL A/ actions into 1 line: A/ref/task;A/ref/task (drop deadlines if not critical)
4. Max 1 word per slot. Abbreviate: cert=certification mig=migration comp=compliance
5. Chain EVERYTHING possible. Target 4-5 lines after ---.
6. KEEP all: C/ IN/ F/ S/ U/ P/ I/ FX/ AU/ DL/ MG/ MS/ UG/ CS/ PR/ D/
7. Target: <80 tokens total

E:A=TF,B=MH
---
(4-5 dense lines)`,

  hyper: `SMC4 HYPER encoder. ABSOLUTE MINIMUM tokens. NO N: table.

${CODEBOOK}

HYPER RULES:
1. E: ONE line, 1-2 char names.
2. MAX 10 calls, chain ALL on 3-4 lines.
3. Max 1 word per slot. Abbreviate everything.
4. MUST KEEP: C/ IN/ S/ I/ FX/ PR/ D/ MS/ CS/ UG/ (these contain answerable facts)
5. DROP: PE/ A/ NM/ AU/ DL/ X/ (not essential)
6. Target: <60 tokens after E: line

E:A=TF,B=MH
---
(3-4 lines, hyper-dense)`,

  apex: `SMC4 APEX encoder. Maximum theoretical compression. 1-char template IDs, dot separators, pipe chains. NO N: table.

APEX TEMPLATE KEY (1-char ID, . slot separator, | call separator):
C.id.A.B.start.end.value = Contract
V.billed.paid.owed.terms = Invoice
S.actual.target = SLA
P.actual.target = Performance metric
U.actual.target = Uptime
I.date.duration.cause.location = Incident
F.fixes = Fixes (+separated)
R.service.monthly.onetime.timeline = Proposal
D.pct.condition = Discount
M.items = Milestones (+separated: name.deadline)
W.pct.method = Cost saving
G.system.version.when = Upgrade
B.notify.cap = Breach response
T.notice.causes.penalty = Termination
N.deadline.period.cap = Renewal
E.methods = Encryption
K.method = Access control
L.locations.restriction = Data location
A.auditor.date.type.result = Audit

OUTPUT FORMAT:
E:X,Y (1-char entity names)
---
(one or two lines of pipe-separated calls)

RULES:
1. Entity names: 1 char each.
2. Dates: MMYY (0324=Mar2024). No leading-zero month: 124=Jan2024.
3. Numbers: no $ sign. 4.2M not $4.2M. k/M always.
4. ALL numbers/dates/metrics MUST be preserved.
5. Max 1-2 words per slot. Abbreviate EVERYTHING.
6. Drop people/actions/meetings. Keep all quantitative facts.
7. Milestones: M.name1.MMYY+name2.MMYY
8. Cost savings: W.pct.method+pct2.method2
9. Target: <50 tokens after E: line`,
};

// ---- Decoder prompts ----
export const DEC_PROMPT = `SMC4 DECODER. Numbers are INLINE (no N: table).

${CODEBOOK}

ABBREVS: ${FULL_ABBREVS}

Input: E: entities, --- then slash-delimited template calls with inline numbers.
Decode: 1)Parse E: 2)Match each call to template, slots are /-separated 3)Expand entity refs+abbrevs->full values 4)Answer from ALL decoded facts.
MUST: process ; chains, expand ALL entity refs and abbrevs, answer in question language, give specific numbers. k=thousand M=million.`;

export const DEC_APEX_PROMPT = `SMC4 APEX DECODER. 1-char template IDs, dot separators, pipe chains.

TEMPLATE KEY:
C.id.entityA.entityB.start.end.value = Contract id: A<->B, start to end, total value
V.billed.paid.owed.terms = Invoice: billed, paid, outstanding owed, terms
S.actual.target = SLA: actual% vs target%
P.actual.target = Performance: actual vs target
U.actual.target = Uptime: actual vs target
I.date.duration.cause.location = Incident: date, lasted duration, cause at location
F.fixes = Fixes (+separated)
R.service.monthly.onetime.timeline = Proposal: service at monthly/mo + onetime one-time, timeline
D.pct.condition = Discount: pct% for condition
M.items = Milestones (+separated: name.deadline). IMPORTANT: milestones are project goals/deadlines.
W.pct.method = Cost saving: reduce costs by pct% through method. IMPORTANT: this IS a milestone/goal too.
G.system.version.when = Upgrade system to version, when
B.notify.cap = Breach: notify within time, penalty capped
T.notice.causes.penalty = Termination terms
N.deadline.period.cap = Auto-renewal terms
E.methods = Encryption methods
K.method = Access control
L.locations.restriction = Data locations
A.auditor.date.type.result = Audit info

ABBREVIATIONS: dbpart/dbfn=database partition/failover 3xrep=triple replication 30shc=30-second health checks 15sfn=15-second auto-failover tele=telemedicine addmod=additional modules resutil=resource utilization drcert=DR certification k8s=Kubernetes k8s129=Kubernetes 1.29 n30=Net-30 perfopt=performance optimization

DATES: MMYY format (0324=March 2024, 0925=September 2025)
MONEY: k=thousand M=million. No $ prefix in encoding.

DECODE: Parse E: entities. Split --- content by |. For each call, first char=template ID, rest=.separated slots. Expand ALL abbreviations. Answer using ALL decoded facts including W/ cost savings as milestones/goals. Give specific numbers.`;

export const JUDGE_PROMPT = `Fact-checker. Given QUESTION, FACTS, and ANSWER, score each fact: 1=present(format-flexible), 0=missing/wrong.
Output ONLY a JSON array like [1,0,1]. No explanation.`;

// ---- Eval question sets ----
export const EVAL_EN = [
  { q: 'What is the total contract value and payment terms?', facts: ['Total contract value $4.2 million', 'Payment terms Net-30'] },
  { q: 'What was the platform uptime in Q4 and what is the SLA requirement?', facts: ['Q4 uptime 99.97%', 'SLA requirement 99.95%'] },
  { q: 'Describe the November incident: what happened, how long, and what was done to fix it?', facts: ['Service disruption on November 12', 'Lasted 47 minutes', 'Database failover issue in Virginia', 'Added third replica in Oregon', 'Automated failover within 15 seconds'] },
  { q: 'What is the proposed cost for the telemedicine integration?', facts: ['$45,000 per month or $38,250 with 15% discount', 'One-time migration fee $120,000', '8 to 10 weeks timeline'] },
  { q: 'What are the Q1 2025 milestones?', facts: ['Complete migration of 15 legacy apps by end of February', 'Disaster recovery certification by mid-March', 'Performance optimization to reduce costs by 20%', 'Kubernetes 1.29 upgrade in March'] },
];

export const EVAL_ZH = [
  { q: '合同基本信息？', facts: ['合同编号FT-2024-0892', '期限2024年4月1日至2026年3月31日'] },
  { q: '费用结构？', facts: ['基础费每月128000元', 'GPU 2.8元/卡小时', '年度上限500000元'] },
  { q: '数据泄露条款？', facts: ['24小时内通知甲方', '赔偿上限年度已付费200%'] },
  { q: '严重违约后果？', facts: ['甲方可立即终止', '违约金500000元', '连续3个月SLA未达标或数据泄露或停止服务'] },
  { q: 'SLA低于95%时？', facts: ['减免50%', '甲方可终止'] },
];

// ---- Sample texts ----
export const SAMPLE_EN = `QUARTERLY BUSINESS REVIEW - Q4 2024
TechFlow Solutions Inc. & Meridian Healthcare Group
Date: January 15, 2025 | Location: Virtual Meeting via Zoom

ATTENDEES:
- Sarah Chen, VP of Engineering, TechFlow Solutions
- James Rodriguez, CTO, TechFlow Solutions
- Dr. Patricia Williams, Chief Digital Officer, Meridian Healthcare
- Michael Chang, Director of IT Infrastructure, Meridian Healthcare
- Lisa Park, Project Manager, TechFlow Solutions
- David Kim, Account Director, TechFlow Solutions

MEETING TRANSCRIPT:

David Kim: Good morning everyone. Thank you all for joining today's quarterly business review. I'd like to start by going through our Q4 performance metrics and then discuss our roadmap for Q1 2025. Sarah, would you like to kick things off with the technical update?

Sarah Chen: Absolutely, David. Thank you. So, looking at our Q4 numbers, I'm really pleased to report that we've made significant progress on the Meridian Healthcare Platform migration project. As you all know, we began the migration from Meridian's legacy on-premise systems to our cloud infrastructure back in March of last year. The original timeline was 18 months, and I'm happy to say we are currently on track to complete the migration by September 2025, which is actually one month ahead of the original schedule.

In terms of specific metrics for Q4, our platform uptime was 99.97%, which exceeds the contractual SLA requirement of 99.95%. We processed approximately 2.3 million patient records during the quarter without any data integrity issues. The average API response time came in at 145 milliseconds, which is well below our target of 200 milliseconds.

We did have one notable incident during Q4. On November 12th, there was a brief service disruption that lasted approximately 47 minutes. This was caused by a database failover issue in our primary data center in Virginia. The root cause was identified as a network partition between the primary and secondary database clusters. We implemented a fix within the 47-minute window, and we've since added additional monitoring and automated failover procedures to prevent similar issues in the future.

James Rodriguez: If I may add to what Sarah mentioned about the incident - we've actually completed a comprehensive post-mortem analysis, and we've identified three key improvements that we've already implemented. First, we added a third database replica in our Oregon data center, so we now have triple redundancy. Second, we implemented automated health checks that run every 30 seconds instead of every 5 minutes. Third, we've set up automatic failover that can switch to the backup cluster within 15 seconds, compared to the previous manual process that took several minutes.

Dr. Patricia Williams: Thank you, James and Sarah. I have to say, we were obviously concerned when the November incident occurred, but I want to acknowledge that TechFlow's response time and communication throughout the incident were excellent. Your team had us informed within 10 minutes of the issue being detected, and the resolution time of 47 minutes was well within the 4-hour SLA for Priority 1 incidents. The improvements you've described give us confidence moving forward.

I do want to raise a question about data sovereignty, though. As you know, Meridian operates in 12 states, and we have patients whose data falls under various state-level privacy regulations in addition to HIPAA. We need to ensure that all patient data remains within US borders and that we have clear documentation showing compliance with each state's specific requirements.

Sarah Chen: That's a great point, Dr. Williams. I can confirm that all patient data is stored exclusively in our US-based data centers - specifically in Virginia and Oregon. We do not replicate or transfer any patient data outside of the United States. We actually underwent a third-party compliance audit in November, conducted by Deloitte, and we received a clean SOC 2 Type II report. I can share that report with your compliance team this week.

Michael Chang: I'd like to follow up on the infrastructure topic. We've been discussing internally the possibility of expanding our use of TechFlow's platform to include our new telemedicine application. Currently, we're running telemedicine on a separate vendor's infrastructure, and it's been causing some integration headaches. What would it look like to bring telemedicine onto the TechFlow platform?

Lisa Park: Michael, that's actually something we've been thinking about as well. Based on our preliminary assessment, we believe we could onboard the telemedicine workload within approximately 8 to 10 weeks. The estimated additional cost would be around $45,000 per month for the compute and storage resources needed, plus a one-time migration fee of $120,000. This would include dedicated video streaming infrastructure with guaranteed sub-100ms latency for real-time consultations.

David Kim: I should mention that for existing clients like Meridian, we offer a 15% discount on additional service modules. So the monthly cost would come down to approximately $38,250, and we could negotiate on the migration fee as well.

Dr. Patricia Williams: That's helpful to know. I think we should schedule a separate deep-dive session to explore the telemedicine integration in more detail. Can we aim for the first week of February for that discussion?

David Kim: Absolutely. Lisa, can you coordinate with Michael's team to set that up?

Lisa Park: Will do. I'll send out a meeting invite by end of this week.

David Kim: Great. Now let's move on to the financial summary for Q4. The total contract value for the current engagement is $4.2 million over the 18-month migration period. As of the end of Q4, Meridian has been invoiced $2.8 million, with $2.65 million received and $150,000 currently outstanding with a net-30 payment term. The current monthly run rate is approximately $280,000, which is within 3% of our original budget estimate.

Looking ahead to Q1 2025, we have three major milestones planned. First, completing the migration of the remaining 15 legacy applications by the end of February. Second, achieving full disaster recovery certification by mid-March. Third, beginning the performance optimization phase, where we expect to reduce overall infrastructure costs by 20% through better resource utilization.

James Rodriguez: I also want to highlight that we're planning to upgrade the entire platform to Kubernetes 1.29 during Q1. This will give us better auto-scaling capabilities and should reduce our compute costs by approximately 12%. We'll be doing this as a rolling upgrade with zero downtime, scheduled for the last two weeks of March.

Dr. Patricia Williams: That all sounds very promising. From Meridian's perspective, we're very satisfied with the progress so far. Our internal stakeholders have reported a noticeable improvement in system performance and reliability since the migration began. I think the key priority for us in Q1 is ensuring a smooth completion of the remaining application migrations without any disruption to our clinical operations.

David Kim: Understood completely, Dr. Williams. That's our top priority as well. Unless there are any other items to discuss, I'd like to wrap up with a summary of action items.

ACTION ITEMS:
1. Sarah Chen to share SOC 2 Type II audit report with Meridian compliance team by January 22, 2025.
2. Lisa Park to schedule telemedicine integration deep-dive meeting for first week of February 2025.
3. TechFlow engineering team to complete migration of remaining 15 legacy applications by February 28, 2025.
4. James Rodriguez to provide disaster recovery certification timeline and plan by January 31, 2025.
5. David Kim to prepare telemedicine pricing proposal with volume discount for Meridian review.
6. Michael Chang to provide telemedicine application technical specifications to TechFlow by January 24, 2025.

NEXT MEETING: April 16, 2025 (Q1 2025 Review)

Contract Reference: MSA-2024-0847
Effective Date: March 1, 2024
Total Contract Value: $4,200,000
Payment Terms: Net-30
SLA: 99.95% uptime, 4-hour P1 response, 200ms API latency target`;

export const SAMPLE_ZH = `甲方：北京未来科技有限公司\n乙方：上海星辰数据有限公司\n合同编号：FT-2024-0892\n签订日期：2024年3月15日\n合同期限：2024年4月1日至2026年3月31日（共24个月）\n\n第一条 服务内容\n乙方为甲方提供云计算平台服务：计算资源（CPU/GPU）、存储、网络、数据库。\nSLA：可用性不低于99.95%，低于时按附件一减免。\n数据中心：北京亦庄（主）、上海嘉定（备）。\n\n第二条 费用\n基础费：128,000元/月。弹性费：CPU 0.12元/核时，GPU 2.8元/卡时，存储 0.08元/GB月。\n每月5日前支付，逾期按0.05%/日违约金。年度弹性上限500,000元。\n\n第三条 安全\n加密：TLS 1.3（传输）、AES-256（存储）、RBAC（访问）。\n未经同意不得用于他用或披露。终止后30工作日内迁移或删除。\n数据泄露：24小时内通知，赔偿上限年度已付费200%。\n\n第四条 终止与续约\n提前90天通知终止。乙方严重违约（SLA连续3月未达标/泄露/停服）甲方可立即终止，退费+违约金500,000元。\n到期前60天无异议自动续约12月，涨幅≤5%。\n\n第五条 争议\n适用中国法律，北京海淀区法院管辖。\n\n附件一SLA赔偿：99.9-99.95%减5%，99-99.9%减15%，95-99%减30%，<95%减50%+可终止`;

// ---- Mode metadata ----
export type Mode = 'balanced' | 'max' | 'extreme' | 'ultra' | 'ultraplus' | 'hyper' | 'apex';

export const MODES: { id: Mode; label: string; desc: string; color?: string }[] = [
  { id: 'balanced', label: 'BALANCED', desc: 'Full coverage, moderate compression' },
  { id: 'max', label: 'MAXIMUM', desc: 'Critical facts only' },
  { id: 'extreme', label: 'EXTREME', desc: 'Abbreviated, <15 calls' },
  { id: 'ultra', label: 'ULTRA', desc: 'Dense codes, <80 tokens' },
  { id: 'ultraplus', label: 'ULTRA+', desc: 'Merged actions, <80 tokens' },
  { id: 'hyper', label: 'HYPER', desc: 'Max density, <60 tokens' },
  { id: 'apex', label: 'APEX', desc: '1-char IDs, pipe chains', color: '#ff79c6' },
];
