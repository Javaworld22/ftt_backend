const mongoose = require('mongoose');
const { Campaign, Donor, Donation } = require('./models');

async function initializeDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Create indexes
        await Promise.all([
            Campaign.createIndexes(),
            Donor.createIndexes(),
            Donation.createIndexes()
        ]);

        // Check if default campaign exists
        const existingCampaign = await Campaign.findOne({});
        if (!existingCampaign) {
            // Create default campaign
            const defaultCampaign = new Campaign({
                name: "Naira Donation Drive",
                description: "Community funding campaign to support various projects",
                season_goal: 18000000,
                cycle_goal: 180000000,
                min_donation: 100,
                seasons_per_cycle: 10,
                settings: {
                    auto_advance: true,
                    notification_thresholds: [25, 50, 75, 90, 95],
                    allow_anonymous: true
                }
            });

            await defaultCampaign.save();
            console.log('Default campaign created:', defaultCampaign._id);
        }

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}

module.exports = { initializeDatabase };