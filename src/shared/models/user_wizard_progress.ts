import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/core/db';
import { userWizardProgress } from '@/config/db/schema';

export interface WizardProgressData {
  voiceGender?: 'male' | 'female';
  ageGroup?: 'young' | 'middle' | 'senior';
  difficulty?: 'easy' | 'medium' | 'hard';
  referenceImages?: string[];
  selectedBodyParts?: string[];
  currentStep?: number;
  aspectRatio?: string;
  duration?: number;
  generateAudio?: boolean;
}

export class UserWizardProgress {
  /**
   * Get user's wizard progress
   */
  static async getByUserId(userId: string) {
    const database = await db();
    const [progress] = await database
      .select()
      .from(userWizardProgress)
      .where(eq(userWizardProgress.userId, userId))
      .limit(1);

    if (!progress) return null;

    // Parse JSON fields
    return {
      ...progress,
      referenceImages: progress.referenceImages
        ? JSON.parse(progress.referenceImages)
        : [],
      selectedBodyParts: progress.selectedBodyParts
        ? JSON.parse(progress.selectedBodyParts)
        : [],
    };
  }

  /**
   * Create or update user's wizard progress
   */
  static async upsert(userId: string, data: WizardProgressData) {
    const database = await db();
    const existing = await database
      .select()
      .from(userWizardProgress)
      .where(eq(userWizardProgress.userId, userId))
      .limit(1);

    const progressData = {
      voiceGender: data.voiceGender,
      ageGroup: data.ageGroup,
      difficulty: data.difficulty,
      referenceImages: data.referenceImages
        ? JSON.stringify(data.referenceImages)
        : undefined,
      selectedBodyParts: data.selectedBodyParts
        ? JSON.stringify(data.selectedBodyParts)
        : undefined,
      currentStep: data.currentStep,
      aspectRatio: data.aspectRatio,
      duration: data.duration,
      generateAudio: data.generateAudio,
    };

    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(progressData).filter(([_, v]) => v !== undefined)
    );

    if (existing.length > 0) {
      // Update existing
      await database
        .update(userWizardProgress)
        .set(cleanData)
        .where(eq(userWizardProgress.userId, userId));

      return this.getByUserId(userId);
    } else {
      // Create new
      const [newProgress] = await database
        .insert(userWizardProgress)
        .values({
          id: nanoid(),
          userId,
          ...cleanData,
        })
        .returning();

      return this.getByUserId(userId);
    }
  }

  /**
   * Update only the current step
   */
  static async updateStep(userId: string, step: number) {
    return this.upsert(userId, { currentStep: step });
  }

  /**
   * Clear user's wizard progress
   */
  static async clear(userId: string) {
    const database = await db();
    await database
      .delete(userWizardProgress)
      .where(eq(userWizardProgress.userId, userId));
  }
}
