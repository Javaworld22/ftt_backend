const ProfitSharing = require('./api/profit_sharing/profit.sharing.js');

// Use the specified amount: 493,920,000.00
const totalRaised = 493920000.00;

console.log('='.repeat(80));
console.log('PROFIT SHARING CALCULATION');
console.log('='.repeat(80));
console.log(`Total Raised Amount: $${totalRaised.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log('');

// Calculate the profit
const profitCalculation = ProfitSharing.calculateProfit(totalRaised);

console.log('PROFIT CALCULATION BREAKDOWN:');
console.log('─'.repeat(50));
console.log(`Step 1: ${profitCalculation.calculations.step1.formula} = $${profitCalculation.calculations.step1.result.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`Step 2: ${profitCalculation.calculations.step2.formula} = $${profitCalculation.calculations.step2.result.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`Step 3: ${profitCalculation.calculations.step3.formula} = $${profitCalculation.calculations.step3.result.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`Step 4: ${profitCalculation.calculations.step4.formula} = $${profitCalculation.calculations.step4.result.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`Step 5: ${profitCalculation.calculations.step5.formula} = $${profitCalculation.calculations.step5.result.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log('');
console.log(`🎯 FINAL PROFIT: $${profitCalculation.finalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${profitCalculation.effectiveRate} of total raised)`);

// Calculate vendor distribution
const vendorDistribution = ProfitSharing.distributeToVendors(profitCalculation.finalProfit);

console.log('');
console.log('='.repeat(80));
console.log('VENDOR DISTRIBUTION (50-50 SPLIT)');
console.log('='.repeat(80));

// AGENTS BREAKDOWN
console.log('');
console.log('👥 AGENTS (50% of profit):');
console.log('─'.repeat(50));
console.log(`Total for all agents: $${vendorDistribution.vendors.agents.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log('');

const agents = vendorDistribution.vendors.agents.distribution.breakdown;
console.log('Individual Agent Breakdown:');
console.log(`  • Freelancing Agent (${agents.freelancing.percentage}%): $${agents.freelancing.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`  • Corporate Agent (${agents.corporate.percentage}%): $${agents.corporate.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`  • Major Agent (${agents.major.percentage}%): $${agents.major.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`  • Miscellaneous (${agents.miscellaneous.percentage}%): $${agents.miscellaneous.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

// STAKEHOLDERS BREAKDOWN
console.log('');
console.log('🏢 STAKEHOLDERS (50% of profit):');
console.log('─'.repeat(50));
console.log(`Total for all stakeholders: $${vendorDistribution.vendors.stakeholders.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log('');

const stakeholders = vendorDistribution.vendors.stakeholders.distribution.breakdown;
console.log('Individual Stakeholder Breakdown:');
console.log(`  • R1 (${stakeholders.r1.percentage}%): $${stakeholders.r1.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`  • PB (${stakeholders.pb.percentage}%): $${stakeholders.pb.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`  • SF (${stakeholders.sf.percentage}%): $${stakeholders.sf.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`  • BMG (${stakeholders.bmg.percentage}%): $${stakeholders.bmg.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

// SUMMARY TABLE
console.log('');
console.log('='.repeat(80));
console.log('SUMMARY - ALL RECIPIENTS');
console.log('='.repeat(80));

const summary = vendorDistribution.summary;
console.log('');
console.log('🔥 AGENTS TOTAL:');
console.log(`     Freelancing Agent: $${summary.freelancingAgent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`     Corporate Agent:   $${summary.corporateAgent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`     Major Agent:       $${summary.majorAgent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`     Miscellaneous:     $${summary.miscellaneous.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`     ─────────────────────────────────────────────`);
console.log(`     TOTAL AGENTS:      $${vendorDistribution.vendors.agents.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

console.log('');
console.log('💼 STAKEHOLDERS TOTAL:');
console.log(`     R1:                $${summary.r1.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`     PB:                $${summary.pb.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`     SF:                $${summary.sf.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`     BMG:               $${summary.bmg.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`     ─────────────────────────────────────────────`);
console.log(`     TOTAL STAKEHOLDERS: $${vendorDistribution.vendors.stakeholders.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

console.log('');
console.log('🎯 GRAND TOTAL DISTRIBUTED:');
console.log(`     $${vendorDistribution.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

// Verification
console.log('');
console.log('✅ VERIFICATION:');
console.log(`   Agents total matches: ${vendorDistribution.vendors.agents.distribution.verification.matches}`);
console.log(`   Stakeholders total matches: ${vendorDistribution.vendors.stakeholders.distribution.verification.matches}`);
console.log(`   Overall total matches: ${vendorDistribution.verification.matches}`);

console.log('');
console.log('='.repeat(80));