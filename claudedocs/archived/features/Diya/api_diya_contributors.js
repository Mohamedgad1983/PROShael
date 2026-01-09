// ============================================================================
// API ENDPOINT: /api/diya/[id]/contributors
// ============================================================================
// Fetches contributors ONLY for a specific Diya case (filtered by activity_id)
// Place this in: pages/api/diya/[id]/contributors.js (Pages Router)
//           or: app/api/diya/[id]/contributors/route.js (App Router)
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
  const { id } = req.query; // Get activity_id from URL parameter

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!id) {
    return res.status(400).json({ error: 'Activity ID is required' });
  }

  try {
    // Fetch ONLY contributors for THIS specific diya case
    const { data: contributions, error } = await supabase
      .from('financial_contributions')
      .select(`
        id,
        amount,
        contribution_date,
        payment_method,
        status,
        notes,
        contributor_id,
        created_at,
        members!financial_contributions_contributor_id_fkey (
          id,
          full_name,
          membership_number,
          tribal_section,
          phone,
          email,
          national_id
        )
      `)
      .eq('activity_id', id) // ← CRITICAL: Filter by activity_id
      .order('contribution_date', { ascending: false });

    if (error) {
      console.error('Error fetching contributors:', error);
      throw error;
    }

    // Format the response for frontend consumption
    const formattedContributors = contributions.map(contribution => ({
      id: contribution.id,
      member_id: contribution.contributor_id,
      member_name: contribution.members?.full_name || 'غير معروف',
      membership_number: contribution.members?.membership_number || 'N/A',
      tribal_section: contribution.members?.tribal_section || 'غير محدد',
      phone: contribution.members?.phone,
      email: contribution.members?.email,
      national_id: contribution.members?.national_id,
      amount: parseFloat(contribution.amount) || 0,
      contribution_date: contribution.contribution_date,
      payment_method: contribution.payment_method || 'نقدي',
      status: contribution.status,
      notes: contribution.notes,
      created_at: contribution.created_at
    }));

    // Calculate summary statistics for this diya
    const totalAmount = formattedContributors.reduce(
      (sum, c) => sum + c.amount, 
      0
    );
    const averageAmount = formattedContributors.length > 0
      ? totalAmount / formattedContributors.length
      : 0;

    res.status(200).json({
      contributors: formattedContributors,
      summary: {
        total_contributors: formattedContributors.length,
        total_amount: totalAmount,
        average_amount: averageAmount
      }
    });
  } catch (error) {
    console.error('Error in contributors API:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to fetch contributors for this diya case'
    });
  }
}

// ============================================================================
// NEXT.JS APP ROUTER VERSION
// ============================================================================
// Uncomment this if using App Router:
/*
export async function GET(request, { params }) {
  const { id } = params;

  if (!id) {
    return Response.json(
      { error: 'Activity ID is required' },
      { status: 400 }
    );
  }

  try {
    const { data: contributions, error } = await supabase
      .from('financial_contributions')
      .select(`
        id,
        amount,
        contribution_date,
        payment_method,
        status,
        notes,
        contributor_id,
        members!financial_contributions_contributor_id_fkey (
          id,
          full_name,
          membership_number,
          tribal_section,
          phone,
          email
        )
      `)
      .eq('activity_id', id)
      .order('contribution_date', { ascending: false });

    if (error) throw error;

    const formattedContributors = contributions.map(contribution => ({
      id: contribution.id,
      member_id: contribution.contributor_id,
      member_name: contribution.members?.full_name || 'غير معروف',
      membership_number: contribution.members?.membership_number || 'N/A',
      tribal_section: contribution.members?.tribal_section || 'غير محدد',
      phone: contribution.members?.phone,
      email: contribution.members?.email,
      amount: parseFloat(contribution.amount) || 0,
      contribution_date: contribution.contribution_date,
      payment_method: contribution.payment_method || 'نقدي',
      status: contribution.status,
      notes: contribution.notes
    }));

    const totalAmount = formattedContributors.reduce(
      (sum, c) => sum + c.amount, 
      0
    );
    const averageAmount = formattedContributors.length > 0
      ? totalAmount / formattedContributors.length
      : 0;

    return Response.json({
      contributors: formattedContributors,
      summary: {
        total_contributors: formattedContributors.length,
        total_amount: totalAmount,
        average_amount: averageAmount
      }
    });
  } catch (error) {
    console.error('Error in contributors API:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
*/

// ============================================================================
// ALTERNATIVE: Direct Supabase RPC Function Call
// ============================================================================
// If you created the get_diya_contributors function in the database,
// you can use it directly:
/*
export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const { data, error } = await supabase
      .rpc('get_diya_contributors', { 
        p_activity_id: id 
      });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
*/
