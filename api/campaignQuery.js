/*
RELATIONSHIP DIAGRAM:

Campaign (1) ──┐
               ├── (1:M) ── Donations
Donor (1) ─────┘
               │
               ├── (1:M) ── Seasons
               │
               └── (1:M) ── Cycles

Season (M) ────┐
               ├── (M:1) ── Campaign
Cycle (M) ─────┘

Donation (M) ──┬── (1:1) ── Campaign
               ├── (1:1) ── Donor
               ├── (1:1) ── Season (context)
               └── (1:1) ── Cycle (context)
*/


class CampaignQueries {
    // Get campaign progress
    static async getCampaignProgress(campaignId) {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) return null;

        return {
            season: {
                number: campaign.current_season,
                progress: campaign.season_progress,
                total: campaign.season_total,
                goal: campaign.season_goal,
                remaining: campaign.season_remaining
            },
            cycle: {
                number: campaign.current_cycle,
                progress: campaign.cycle_progress,
                total: campaign.cycle_total,
                goal: campaign.cycle_goal,
                remaining: campaign.cycle_remaining
            },
            allTimeTotal: campaign.all_time_total
        };
    }

    // Get top donors for a campaign
    static async getTopDonors(campaignId, limit = 10) {
        return await Donation.aggregate([
            { $match: { campaign_id: mongoose.Types.ObjectId(campaignId) } },
            { $group: {
                _id: '$donor_id',
                total_donated: { $sum: '$amount' },
                donation_count: { $sum: 1 },
                last_donation: { $max: '$createdAt' }
            }},
            { $sort: { total_donated: -1 } },
            { $limit: limit },
            { $lookup: {
                from: 'donors',
                localField: '_id',
                foreignField: '_id',
                as: 'donor_info'
            }},
            { $unwind: '$donor_info' },
            { $project: {
                donor_id: '$_id',
                name: { $concat: ['$donor_info.first_name', ' ', '$donor_info.last_name'] },
                email: '$donor_info.email',
                total_donated: 1,
                donation_count: 1,
                last_donation: 1,
                anonymous: '$donor_info.preferences.anonymous_donation'
            }}
        ]);
    }

    // Get donation statistics by time period
    static async getDonationStats(campaignId, startDate, endDate) {
        return await Donation.aggregate([
            {
                $match: {
                    campaign_id: mongoose.Types.ObjectId(campaignId),
                    createdAt: { $gte: startDate, $lte: endDate },
                    payment_status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    total_amount: { $sum: '$amount' },
                    donation_count: { $sum: 1 },
                    average_donation: { $avg: '$amount' },
                    largest_donation: { $max: '$amount' },
                    smallest_donation: { $min: '$amount' },
                    unique_donors: { $addToSet: '$donor_id' }
                }
            },
            {
                $project: {
                    total_amount: 1,
                    donation_count: 1,
                    average_donation: { $round: ['$average_donation', 2] },
                    largest_donation: 1,
                    smallest_donation: 1,
                    unique_donor_count: { $size: '$unique_donors' }
                }
            }
        ]);
    }
}