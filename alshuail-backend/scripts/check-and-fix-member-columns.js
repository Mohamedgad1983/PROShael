import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFixMemberColumns() {
  console.log('🔍 Checking member table columns...\n');

  try {
    // Step 1: Get a sample of members to check current data
    console.log('📊 Step 1: Fetching sample members to check current values...');
    const { data: sampleMembers, error: fetchError } = await supabase
      .from('members')
      .select('id, full_name, gender, tribal_section')
      .limit(10);

    if (fetchError) {
      console.error('❌ Error fetching members:', fetchError);
      return;
    }

    console.log(`✅ Found ${sampleMembers.length} members`);
    console.log('\n📋 Sample of current data:');
    console.log('================================');
    sampleMembers.forEach(member => {
      console.log(`ID: ${member.id}`);
      console.log(`Name: ${member.full_name}`);
      console.log(`Gender: ${member.gender || 'NULL/EMPTY'}`);
      console.log(`Tribal Section: ${member.tribal_section || 'NULL/EMPTY'}`);
      console.log('--------------------------------');
    });

    // Step 2: Count members with NULL or empty values
    console.log('\n📊 Step 2: Counting members with NULL/empty values...');

    const { count: nullGenderCount } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .or('gender.is.null,gender.eq.');

    const { count: nullTribalCount } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .or('tribal_section.is.null,tribal_section.eq.');

    console.log(`\n📈 Statistics:`);
    console.log(`- Members with NULL/empty gender: ${nullGenderCount || 0}`);
    console.log(`- Members with NULL/empty tribal_section: ${nullTribalCount || 0}`);

    // Step 3: Ask user if they want to update NULL values
    if (nullGenderCount > 0 || nullTribalCount > 0) {
      console.log('\n⚠️  Found members with missing data!');
      console.log('Would you like to update them with default values?');
      console.log('Default values:');
      console.log('  - Gender: "male" (ذكر)');
      console.log('  - Tribal Section: "الدغيش"');

      // For automated script, we'll proceed with updates
      console.log('\n🔄 Proceeding with updates...');

      // Step 4: Update NULL gender values
      if (nullGenderCount > 0) {
        console.log('\n📝 Updating NULL gender values to "male"...');
        const { data: updatedGender, error: genderError } = await supabase
          .from('members')
          .update({ gender: 'male' })
          .or('gender.is.null,gender.eq.')
          .select();

        if (genderError) {
          console.error('❌ Error updating gender:', genderError);
        } else {
          console.log(`✅ Updated gender for ${updatedGender.length} members`);
        }
      }

      // Step 5: Update NULL tribal_section values
      if (nullTribalCount > 0) {
        console.log('\n📝 Updating NULL tribal_section values to "الدغيش"...');
        const { data: updatedTribal, error: tribalError } = await supabase
          .from('members')
          .update({ tribal_section: 'الدغيش' })
          .or('tribal_section.is.null,tribal_section.eq.')
          .select();

        if (tribalError) {
          console.error('❌ Error updating tribal_section:', tribalError);
        } else {
          console.log(`✅ Updated tribal_section for ${updatedTribal.length} members`);
        }
      }

      // Step 6: Verify the updates
      console.log('\n🔍 Verifying updates...');
      const { data: verifyMembers } = await supabase
        .from('members')
        .select('id, full_name, gender, tribal_section')
        .limit(10);

      console.log('\n📋 Sample after updates:');
      console.log('================================');
      verifyMembers.forEach(member => {
        console.log(`ID: ${member.id}`);
        console.log(`Name: ${member.full_name}`);
        console.log(`Gender: ${member.gender || 'STILL NULL'}`);
        console.log(`Tribal Section: ${member.tribal_section || 'STILL NULL'}`);
        console.log('--------------------------------');
      });
    } else {
      console.log('\n✅ All members have gender and tribal_section values!');
    }

    // Step 7: Show available values for dropdowns
    console.log('\n📋 Valid values for dropdowns:');
    console.log('\nGender options:');
    console.log('  - "male" = ذكر');
    console.log('  - "female" = أنثى');

    console.log('\nTribal Section options:');
    const tribalSections = ['الدغيش', 'الرشيد', 'الشبيعان', 'العيد', 'المسعود', 'رشود', 'رشيد', 'عقاب'];
    tribalSections.forEach(section => {
      console.log(`  - "${section}"`);
    });

    // Step 8: Check for any invalid values
    console.log('\n🔍 Checking for invalid values...');
    const { data: allMembers } = await supabase
      .from('members')
      .select('gender, tribal_section');

    const invalidGenders = new Set();
    const invalidTribal = new Set();

    allMembers.forEach(member => {
      if (member.gender && member.gender !== 'male' && member.gender !== 'female') {
        invalidGenders.add(member.gender);
      }
      if (member.tribal_section && !tribalSections.includes(member.tribal_section)) {
        invalidTribal.add(member.tribal_section);
      }
    });

    if (invalidGenders.size > 0) {
      console.log('\n⚠️  Found invalid gender values:', Array.from(invalidGenders));
    }
    if (invalidTribal.size > 0) {
      console.log('\n⚠️  Found invalid tribal_section values:', Array.from(invalidTribal));
    }

    if (invalidGenders.size === 0 && invalidTribal.size === 0) {
      console.log('\n✅ All values are valid!');
    }

    console.log('\n✨ Database check and fix completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
checkAndFixMemberColumns();