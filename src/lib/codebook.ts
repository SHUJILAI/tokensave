// ==== TokenSave Universal Compression v2.0 ====
// Template-free: works for ANY document type

// ---- Encoder prompt ----
export const ENC_PROMPTS: Record<string, string> = {
  apex: `You are a lossless text compressor. Compress the input into the shortest possible notation that preserves ALL facts, numbers, dates, percentages, names, and relationships.

RULES:
1. NO fixed templates. Invent your own shorthand freely.
2. PRESERVE every number, date, percentage, currency amount, metric, name, and quantitative fact exactly.
3. Use these conventions:
   - k=thousand M=million B=billion T=trillion
   - Dates: compact form (Q4'24, Mar2024, 250315=2025-03-15)
   - Drop filler words (the, a, an, is, was, were, that, which, etc.)
   - Abbreviate common words (mgmt=management, dev=development, infra=infrastructure, perf=performance, etc.)
   - Use symbols: ->=leads to, <=from, @=at, &=and, /=or/per, ^=increase, v=decrease
   - Use ;  to separate facts, | to separate sections
4. Start with a 1-line KEY of any entity abbreviations you use (e.g. "K:NB=NovaBio,LH=Lighthouse")
5. Then "---" separator
6. Then the compressed content
7. Drop: greetings, transitions, filler sentences, discussion that adds no facts
8. Keep: every data point, every metric, every deadline, every financial figure, every percentage, every name of entity/product/place
9. For structured data (tables, lists), use compact notation: item1:val1,item2:val2
10. Target: maximum compression while losing ZERO factual information`,
};

// ---- Decoder prompt (for future use) ----
export const DEC_PROMPT = `You are a text decompressor. The input is ultra-compressed notation.

CONVENTIONS:
- K: line defines abbreviations (e.g. K:NB=NovaBio,LH=Lighthouse)
- --- separates key from content
- k=thousand M=million B=billion T=trillion
- Symbols: ->=leads to, <=from, @=at, &=and, /=or/per, ^=increase, v=decrease
- ; separates facts, | separates sections
- Dates in compact form (Q4'24, Mar2024, etc.)

DECODE: Expand all abbreviations, restore full sentences, answer questions using ALL decoded facts. Give specific numbers. Answer in the same language as the question.`;

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

