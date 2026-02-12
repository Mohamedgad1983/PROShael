import { supabase } from './src/config/database.js';

async function debugStats() {
  try {
    console.log('Debugging statistics queries...');

    // Test each query individually
    console.log('1. Testing total members count...');
    const { count: totalMembers, error: totalError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('Total members error:', totalError);
    } else {
      console.log('✅ Total members:', totalMembers);
    }

    console.log('2. Testing active members count...');
    const { count: activeMembers, error: activeError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (activeError) {
      console.error('Active members error:', activeError);
    } else {
      console.log('✅ Active members:', activeMembers);
    }

    console.log('3. Testing completed profiles count...');
    const { count: completedProfiles, error: completedError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('profile_completed', true);

    if (completedError) {
      console.error('Completed profiles error:', completedError);
    } else {
      console.log('✅ Completed profiles:', completedProfiles);
    }

    console.log('4. Testing social security beneficiaries...');
    const { count: socialSecurityBeneficiaries, error: socialSecurityError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('social_security_beneficiary', true)
      .eq('profile_completed', true);

    if (socialSecurityError) {
      console.error('Social security error:', socialSecurityError);
    } else {
      console.log('✅ Social security beneficiaries:', socialSecurityBeneficiaries);
    }

    console.log('5. Testing recent imports...');
    const { data: recentImports, error: importsError } = await supabase
      .from('excel_import_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (importsError) {
      console.error('Recent imports error:', importsError);
    } else {
      console.log('✅ Recent imports:', recentImports?.length || 0);
    }

  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugStats();