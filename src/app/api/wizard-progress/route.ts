import { NextRequest, NextResponse } from 'next/server';

import { getAuth } from '@/core/auth';
import { UserWizardProgress } from '@/shared/models/user_wizard_progress';

/**
 * GET /api/wizard-progress
 * Get user's wizard progress
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const progress = await UserWizardProgress.getByUserId(session.user.id);

    return NextResponse.json({
      success: true,
      data: progress || {
        currentStep: 1,
        voiceGender: null,
        ageGroup: null,
        difficulty: null,
        referenceImages: [],
        selectedBodyParts: [],
        aspectRatio: 'adaptive',
        duration: 12,
        generateAudio: true,
      },
    });
  } catch (error) {
    console.error('Error fetching wizard progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wizard-progress
 * Save user's wizard progress
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const progress = await UserWizardProgress.upsert(session.user.id, body);

    return NextResponse.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error('Error saving wizard progress:', error);
    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wizard-progress
 * Clear user's wizard progress
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await UserWizardProgress.clear(session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Progress cleared',
    });
  } catch (error) {
    console.error('Error clearing wizard progress:', error);
    return NextResponse.json(
      { error: 'Failed to clear progress' },
      { status: 500 }
    );
  }
}
