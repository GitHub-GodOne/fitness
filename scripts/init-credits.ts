/**
 * Credits Configuration Initialization Script
 *
 * This script initializes the credits configuration for new users.
 * It sets up automatic credit grants for newly registered users.
 *
 * Usage:
 *   npx tsx scripts/init-credits.ts
 */

import { db } from '@/core/db';
import { config } from '@/config/db/schema';

async function initializeCredits() {
    console.log('🚀 Initializing credits configuration...\n');

    try {
        // Configure initial credits for new users
        const creditsConfig = [
            {
                name: 'initial_credits_enabled',
                value: 'true',
            },
            {
                name: 'initial_credits_amount',
                value: '3',
            },
            {
                name: 'initial_credits_valid_days',
                value: '365',
            },
            {
                name: 'initial_credits_description',
                value: 'Welcome bonus - Create your first Bible videos!',
            },
        ];

        console.log('📝 Saving credits configuration to database...');
        console.log('Config:', {
            enabled: 'true',
            amount: '3',
            validDays: '365',
            description: 'Welcome bonus - Create your first Bible videos!',
        });

        // Insert or update each config
        for (const cfg of creditsConfig) {
            await db()
                .insert(config)
                .values(cfg)
                .onConflictDoUpdate({
                    target: config.name,
                    set: { value: cfg.value },
                });
        }

        console.log('\n✅ Credits configuration initialized successfully!');
        console.log('\n📋 Summary:');
        console.log('   • New users will receive: 3 credits');
        console.log('   • Credits valid for: 365 days');
        console.log('   • Auto-grant: Enabled');
        console.log('\n💡 New users will automatically receive 3 credits upon registration.');

    } catch (error) {
        console.error('\n❌ Error initializing credits configuration:', error);
        process.exit(1);
    }
}

// Run the initialization
initializeCredits()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    });
