// ============================================================================
// API ENDPOINT: /api/diya/dashboard
// ============================================================================
// Fetches all Diya cases with real-time statistics from database
// Place this in: pages/api/diya/dashboard.js (Next.js Pages Router)
//           or: app/api/diya/dashboard/route.js (Next.js App Router)
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// NEXT.JS PAGES ROUTER VERSION
// ============================================================================
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Step 1: Get all activities that are diya cases
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        title_ar,
        title_en,
        description_ar,
        description_en,
        beneficiary_name_ar,
        beneficiary_name_en,
        target_amount,
        current_amount,
        collection_status,
        status,
        collection_start_date,
        collection_end_date,
        event_date,
        created_at,
        updated_at
      `)
      .or('title_ar.ilike.%دية%,title_en.ilike.%diya%')
      .order('created_at', { ascending: false });

    if (activitiesError) throw activitiesError;

    // Step 2: For each activity, get real contribution statistics
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        // Get all contributions for this specific diya
        const { data: contributions, error: contribError } = await supabase
          .from('financial_contributions')
          .select('contributor_id, amount')
          .eq('activity_id', activity.id)
          .eq('status', 'approved'); // Only count approved contributions

        if (contribError) {
          console.error('Error fetching contributions:', contribError);
          return {
            ...activity,
            total_contributors: 0,
            total_collected: 0,
            average_contribution: 0,
            remaining_amount: activity.target_amount || 0,
            collection_percentage: 0
          };
        }

        // Calculate statistics
        const uniqueContributors = new Set(
          contributions?.map(c => c.contributor_id) || []
        );

        const totalCollected = contributions?.reduce(
          (sum, c) => sum + (parseFloat(c.amount) || 0), 
          0
        ) || 0;

        const totalContributors = uniqueContributors.size;
        
        const averageContribution = totalContributors > 0 
          ? totalCollected / totalContributors 
          : 0;

        const targetAmount = parseFloat(activity.target_amount) || 0;
        const remainingAmount = Math.max(0, targetAmount - totalCollected);
        
        const collectionPercentage = targetAmount > 0 
          ? Math.min(100, (totalCollected / targetAmount) * 100)
          : 0;

        return {
          ...activity,
          total_contributors: totalContributors,
          total_collected: totalCollected,
          average_contribution: averageContribution,
          remaining_amount: remainingAmount,
          collection_percentage: collectionPercentage
        };
      })
    );

    res.status(200).json(enrichedActivities);
  } catch (error) {
    console.error('Error in diya dashboard API:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to fetch diya dashboard data'
    });
  }
}

// ============================================================================
// NEXT.JS APP ROUTER VERSION (Export as route handler)
// ============================================================================
// Uncomment this if using App Router:
/*
export async function GET(request) {
  try {
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        title_ar,
        title_en,
        description_ar,
        beneficiary_name_ar,
        target_amount,
        current_amount,
        collection_status,
        status,
        collection_start_date,
        collection_end_date,
        created_at,
        updated_at
      `)
      .or('title_ar.ilike.%دية%,title_en.ilike.%diya%')
      .order('created_at', { ascending: false });

    if (activitiesError) throw activitiesError;

    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        const { data: contributions } = await supabase
          .from('financial_contributions')
          .select('contributor_id, amount')
          .eq('activity_id', activity.id)
          .eq('status', 'approved');

        const uniqueContributors = new Set(
          contributions?.map(c => c.contributor_id) || []
        );

        const totalCollected = contributions?.reduce(
          (sum, c) => sum + (parseFloat(c.amount) || 0), 
          0
        ) || 0;

        const totalContributors = uniqueContributors.size;
        const averageContribution = totalContributors > 0 
          ? totalCollected / totalContributors 
          : 0;

        const targetAmount = parseFloat(activity.target_amount) || 0;
        const remainingAmount = Math.max(0, targetAmount - totalCollected);
        const collectionPercentage = targetAmount > 0 
          ? Math.min(100, (totalCollected / targetAmount) * 100)
          : 0;

        return {
          ...activity,
          total_contributors: totalContributors,
          total_collected: totalCollected,
          average_contribution: averageContribution,
          remaining_amount: remainingAmount,
          collection_percentage: collectionPercentage
        };
      })
    );

    return Response.json(enrichedActivities);
  } catch (error) {
    console.error('Error in diya dashboard API:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
*/
