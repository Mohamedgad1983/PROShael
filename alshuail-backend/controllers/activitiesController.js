import { supabase } from '../config/database.js';

// Get all activities
const getAllActivities = async (req, res) => {
    try {
        console.log('Fetching all activities...');

        const { data: activities, error } = await supabase
            .from('activities')
            .select(`
                *,
                main_categories(name_ar, name_en, icon, color)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        // Process activities data with default values
        const processedActivities = (activities || []).map(activity => ({
            ...activity,
            current_participants: activity.current_participants || 0,
            max_participants: activity.max_participants || 0,
            cost: activity.cost || 0,
            status: activity.status || 'upcoming'
        }));

        res.json({
            status: 'success',
            message_ar: 'تم جلب الأنشطة بنجاح',
            message_en: 'Activities retrieved successfully',
            data: { activities: processedActivities }
        });

    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({
            status: 'error',
            message_ar: 'خطأ في جلب الأنشطة',
            message_en: 'Error retrieving activities',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get single activity by ID
const getActivityById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: activity, error } = await supabase
            .from('activities')
            .select(`
                *,
                main_categories(name_ar, name_en, icon, color)
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    status: 'error',
                    message_ar: 'النشاط غير موجود',
                    message_en: 'Activity not found'
                });
            }
            throw error;
        }

        res.json({
            status: 'success',
            message_ar: 'تم جلب تفاصيل النشاط بنجاح',
            message_en: 'Activity details retrieved successfully',
            data: activity
        });

    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({
            status: 'error',
            message_ar: 'خطأ في جلب تفاصيل النشاط',
            message_en: 'Error retrieving activity details',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Create new activity
const createActivity = async (req, res) => {
    try {
        const {
            title_ar,
            title_en,
            description_ar,
            description_en,
            category_id,
            event_date,
            location_ar,
            location_en,
            max_participants,
            cost
        } = req.body;

        const { data: activity, error } = await supabase
            .from('activities')
            .insert([{
                title_ar,
                title_en,
                description_ar,
                description_en,
                category_id,
                organizer_id: req.user.id, // From JWT middleware
                event_date,
                location_ar,
                location_en,
                max_participants: max_participants || 0,
                current_participants: 0,
                cost: cost || 0,
                status: 'upcoming',
                is_featured: false
            }])
            .select()
            .single();

        if (error) {
            console.error('Create activity error:', error);
            throw error;
        }

        res.status(201).json({
            status: 'success',
            message_ar: 'تم إنشاء النشاط بنجاح',
            message_en: 'Activity created successfully',
            data: { activity }
        });

    } catch (error) {
        console.error('Create activity error:', error);
        res.status(500).json({
            status: 'error',
            message_ar: 'خطأ في إنشاء النشاط',
            message_en: 'Error creating activity',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Update activity
const updateActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data: activity, error } = await supabase
            .from('activities')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Update activity error:', error);
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    status: 'error',
                    message_ar: 'النشاط غير موجود',
                    message_en: 'Activity not found'
                });
            }
            throw error;
        }

        res.json({
            status: 'success',
            message_ar: 'تم تحديث النشاط بنجاح',
            message_en: 'Activity updated successfully',
            data: { activity }
        });

    } catch (error) {
        console.error('Update activity error:', error);
        res.status(500).json({
            status: 'error',
            message_ar: 'خطأ في تحديث النشاط',
            message_en: 'Error updating activity',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Delete activity (soft delete)
const deleteActivity = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('activities')
            .update({ status: 'cancelled' })
            .eq('id', id);

        if (error) {
            console.error('Delete activity error:', error);
            throw error;
        }

        res.json({
            status: 'success',
            message_ar: 'تم حذف النشاط بنجاح',
            message_en: 'Activity deleted successfully'
        });

    } catch (error) {
        console.error('Delete activity error:', error);
        res.status(500).json({
            status: 'error',
            message_ar: 'خطأ في حذف النشاط',
            message_en: 'Error deleting activity',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get activity statistics (already converted to Supabase)
const getActivityStatistics = async (req, res) => {
    try {
        console.log('Fetching activity statistics...');

        // Get all activities
        const { data: activities, error: activitiesError } = await supabase
            .from('activities')
            .select(`
                *,
                main_categories(name_ar, name_en)
            `);

        if (activitiesError) {
            console.error('Activities query error:', activitiesError);
            throw activitiesError;
        }

        // Get all contributions
        const { data: contributions, error: contributionsError } = await supabase
            .from('financial_contributions')
            .select('*');

        if (contributionsError) {
            console.error('Contributions query error:', contributionsError);
            throw contributionsError;
        }

        // Get categories for breakdown
        const { data: categories, error: categoriesError } = await supabase
            .from('main_categories')
            .select('*');

        if (categoriesError) {
            console.error('Categories query error:', categoriesError);
            throw categoriesError;
        }

        // Calculate overview statistics
        const overview = {
            total_activities: activities?.length || 0,
            upcoming_activities: activities?.filter(a => a.status === 'upcoming').length || 0,
            completed_activities: activities?.filter(a => a.status === 'completed').length || 0,
            cancelled_activities: activities?.filter(a => a.status === 'cancelled').length || 0,
            total_participants: activities?.reduce((sum, a) => sum + (a.current_participants || 0), 0) || 0,
            total_revenue: contributions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0
        };

        // Calculate category breakdown
        const by_category = categories?.map(category => {
            const categoryActivities = activities?.filter(a => a.category_id === category.id) || [];
            return {
                category_name_ar: category.name_ar,
                category_name_en: category.name_en,
                count: categoryActivities.length,
                percentage: overview.total_activities > 0 ?
                    Math.round((categoryActivities.length / overview.total_activities) * 100) : 0
            };
        }) || [];

        // Calculate monthly breakdown (last 12 months)
        const by_month = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

            const monthActivities = activities?.filter(a => {
                const activityDate = new Date(a.created_at);
                return activityDate >= monthStart && activityDate <= monthEnd;
            }) || [];

            by_month.push({
                month: monthStart.toISOString().slice(0, 7), // YYYY-MM format
                activities_count: monthActivities.length,
                participants_count: monthActivities.reduce((sum, a) => sum + (a.current_participants || 0), 0)
            });
        }

        const statistics = {
            overview,
            by_category,
            by_month
        };

        console.log('Statistics calculated successfully:', {
            totalActivities: overview.total_activities,
            totalContributions: contributions?.length || 0
        });

        res.json({
            status: 'success',
            message_ar: 'تم جلب إحصائيات الأنشطة بنجاح',
            message_en: 'Activity statistics retrieved successfully',
            data: statistics,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Statistics endpoint error:', error);
        res.status(500).json({
            status: 'error',
            message_ar: 'خطأ في جلب الإحصائيات',
            message_en: 'Error retrieving statistics',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

export {
    getAllActivities,
    getActivityById,
    createActivity,
    updateActivity,
    deleteActivity,
    getActivityStatistics
};