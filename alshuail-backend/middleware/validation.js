const Joi = require('joi');

// Custom Joi extensions for Gulf region (Saudi Arabia & Kuwait)
const customJoi = Joi.extend({
    type: 'string',
    base: Joi.string(),
    messages: {
        'string.arabicOnly': 'يجب أن يحتوي على أحرف عربية فقط',
        'string.englishOnly': 'Must contain English characters only',
        'string.saudiPhone': 'رقم الجوال السعودي غير صحيح',
        'string.kuwaitPhone': 'رقم الجوال الكويتي غير صحيح',
        'string.gulfPhone': 'رقم الجوال غير صحيح (يجب أن يكون رقم سعودي أو كويتي)'
    },
    rules: {
        arabicOnly: {
            validate(value, helpers) {
                if (!/^[\u0600-\u06FF\s]+$/.test(value)) {
                    return helpers.error('string.arabicOnly');
                }
                return value;
            }
        },
        englishOnly: {
            validate(value, helpers) {
                if (!/^[a-zA-Z\s]+$/.test(value)) {
                    return helpers.error('string.englishOnly');
                }
                return value;
            }
        },
        saudiPhone: {
            validate(value, helpers) {
                const cleanPhone = value.replace(/\s/g, '');
                // Saudi Arabia: +966 5XXXXXXXX or 05XXXXXXXX (9 digits after 5)
                if (!/^(\+966|966)?0?5[0-9]{8}$/.test(cleanPhone)) {
                    return helpers.error('string.saudiPhone');
                }
                return value;
            }
        },
        kuwaitPhone: {
            validate(value, helpers) {
                // Kuwait: +965 XXXXXXXX (8 digits starting with 2,4,5,9)
                const cleanPhone = value.replace(/\s/g, '');
                if (!/^(\+965|965)?[2459][0-9]{7}$/.test(cleanPhone)) {
                    return helpers.error('string.kuwaitPhone');
                }
                return value;
            }
        },
        gulfPhone: {
            validate(value, helpers) {
                const cleanPhone = value.replace(/\s/g, '');

                // Saudi Arabia: +966 5XXXXXXXX or 05XXXXXXXX or 5XXXXXXXX (with leading 0)
                const saudiPattern = /^(\+966|966)?0?5[0-9]{8}$/;

                // Kuwait: +965 XXXXXXXX (starting with 2,4,5,9)
                const kuwaitPattern = /^(\+965|965)?[2459][0-9]{7}$/;

                // Also allow local Kuwait format without country code
                const kuwaitLocalPattern = /^[2459][0-9]{7}$/;

                if (!saudiPattern.test(cleanPhone) && !kuwaitPattern.test(cleanPhone) && !kuwaitLocalPattern.test(cleanPhone)) {
                    return helpers.error('string.gulfPhone');
                }
                return value;
            }
        }
    }
});

// ============================================================
// Activity Validation Schemas
// ============================================================

const activitySchema = Joi.object({
    title_ar: Joi.string()
        .min(3)
        .max(200)
        .required()
        .messages({
            'string.empty': 'عنوان النشاط بالعربية مطلوب',
            'string.min': 'عنوان النشاط يجب أن يكون 3 أحرف على الأقل',
            'string.max': 'عنوان النشاط يجب أن لا يتجاوز 200 حرف',
            'any.required': 'عنوان النشاط بالعربية مطلوب'
        }),

    title_en: Joi.string()
        .min(3)
        .max(200)
        .required()
        .messages({
            'string.empty': 'Activity title in English is required',
            'string.min': 'Activity title must be at least 3 characters',
            'string.max': 'Activity title must not exceed 200 characters',
            'any.required': 'Activity title in English is required'
        }),

    description_ar: Joi.string()
        .min(10)
        .max(2000)
        .required()
        .messages({
            'string.empty': 'وصف النشاط بالعربية مطلوب',
            'string.min': 'وصف النشاط يجب أن يكون 10 أحرف على الأقل',
            'string.max': 'وصف النشاط يجب أن لا يتجاوز 2000 حرف',
            'any.required': 'وصف النشاط بالعربية مطلوب'
        }),

    description_en: Joi.string()
        .min(10)
        .max(2000)
        .required()
        .messages({
            'string.empty': 'Activity description in English is required',
            'string.min': 'Activity description must be at least 10 characters',
            'string.max': 'Activity description must not exceed 2000 characters',
            'any.required': 'Activity description in English is required'
        }),

    category_id: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.guid': 'معرف الفئة غير صحيح',
            'any.required': 'فئة النشاط مطلوبة'
        }),

    activity_type: Joi.string()
        .valid('charity', 'social', 'educational', 'sports', 'cultural', 'religious', 'volunteer', 'other')
        .required()
        .messages({
            'any.only': 'نوع النشاط غير صحيح',
            'any.required': 'نوع النشاط مطلوب'
        }),

    activity_date: Joi.date()
        .min('now')
        .required()
        .messages({
            'date.min': 'تاريخ النشاط يجب أن يكون في المستقبل',
            'any.required': 'تاريخ النشاط مطلوب'
        }),

    location: Joi.string()
        .min(3)
        .max(500)
        .required()
        .messages({
            'string.empty': 'موقع النشاط مطلوب',
            'string.min': 'موقع النشاط يجب أن يكون 3 أحرف على الأقل',
            'string.max': 'موقع النشاط يجب أن لا يتجاوز 500 حرف',
            'any.required': 'موقع النشاط مطلوب'
        }),

    target_amount: Joi.number()
        .min(0)
        .max(10000000)
        .optional()
        .messages({
            'number.min': 'المبلغ المستهدف يجب أن يكون صفر أو أكثر',
            'number.max': 'المبلغ المستهدف كبير جداً'
        }),

    organizer_id: Joi.string()
        .uuid()
        .optional()
        .messages({
            'string.guid': 'معرف المنظم غير صحيح'
        }),

    is_featured: Joi.boolean()
        .optional()
        .default(false),

    max_participants: Joi.number()
        .integer()
        .min(1)
        .max(10000)
        .optional()
        .messages({
            'number.min': 'عدد المشاركين يجب أن يكون 1 على الأقل',
            'number.max': 'عدد المشاركين كبير جداً'
        }),

    registration_deadline: Joi.date()
        .min('now')
        .optional()
        .messages({
            'date.min': 'تاريخ انتهاء التسجيل يجب أن يكون في المستقبل'
        }),

    requirements: Joi.object()
        .optional()
});

const activityUpdateSchema = Joi.object({
    title_ar: Joi.string()
        .min(3)
        .max(200)
        .optional()
        .messages({
            'string.min': 'عنوان النشاط يجب أن يكون 3 أحرف على الأقل',
            'string.max': 'عنوان النشاط يجب أن لا يتجاوز 200 حرف'
        }),

    title_en: Joi.string()
        .min(3)
        .max(200)
        .optional()
        .messages({
            'string.min': 'Activity title must be at least 3 characters',
            'string.max': 'Activity title must not exceed 200 characters'
        }),

    description_ar: Joi.string()
        .min(10)
        .max(2000)
        .optional()
        .messages({
            'string.min': 'وصف النشاط يجب أن يكون 10 أحرف على الأقل',
            'string.max': 'وصف النشاط يجب أن لا يتجاوز 2000 حرف'
        }),

    description_en: Joi.string()
        .min(10)
        .max(2000)
        .optional()
        .messages({
            'string.min': 'Activity description must be at least 10 characters',
            'string.max': 'Activity description must not exceed 2000 characters'
        }),

    activity_date: Joi.date()
        .optional()
        .messages({
            'date.base': 'تاريخ النشاط غير صحيح'
        }),

    location: Joi.string()
        .min(3)
        .max(500)
        .optional()
        .messages({
            'string.min': 'موقع النشاط يجب أن يكون 3 أحرف على الأقل',
            'string.max': 'موقع النشاط يجب أن لا يتجاوز 500 حرف'
        }),

    target_amount: Joi.number()
        .min(0)
        .max(10000000)
        .optional()
        .messages({
            'number.min': 'المبلغ المستهدف يجب أن يكون صفر أو أكثر',
            'number.max': 'المبلغ المستهدف كبير جداً'
        }),

    is_featured: Joi.boolean()
        .optional(),

    is_active: Joi.boolean()
        .optional(),

    max_participants: Joi.number()
        .integer()
        .min(1)
        .max(10000)
        .optional()
        .messages({
            'number.min': 'عدد المشاركين يجب أن يكون 1 على الأقل',
            'number.max': 'عدد المشاركين كبير جداً'
        }),

    registration_deadline: Joi.date()
        .optional()
        .messages({
            'date.base': 'تاريخ انتهاء التسجيل غير صحيح'
        }),

    requirements: Joi.object()
        .optional()
}).min(1).messages({
    'object.min': 'يجب تحديد حقل واحد على الأقل للتحديث'
});

const searchSchema = Joi.object({
    q: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.empty': 'كلمة البحث مطلوبة',
            'string.min': 'كلمة البحث يجب أن تكون حرفين على الأقل',
            'string.max': 'كلمة البحث طويلة جداً',
            'any.required': 'كلمة البحث مطلوبة'
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .messages({
            'number.min': 'الحد الأدنى للنتائج هو 1',
            'number.max': 'الحد الأقصى للنتائج هو 50'
        })
});

// ============================================================
// Financial Contribution Validation Schemas
// ============================================================

const contributionSchema = Joi.object({
    activity_id: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.guid': 'معرف النشاط غير صحيح',
            'any.required': 'معرف النشاط مطلوب'
        }),

    amount: Joi.number()
        .min(1)
        .max(1000000)
        .required()
        .messages({
            'number.min': 'المبلغ يجب أن يكون 1 ريال على الأقل',
            'number.max': 'المبلغ كبير جداً',
            'any.required': 'المبلغ مطلوب'
        }),

    payment_method: Joi.string()
        .valid('cash', 'bank_transfer', 'credit_card', 'mobile_payment')
        .required()
        .messages({
            'any.only': 'طريقة الدفع غير صحيحة',
            'any.required': 'طريقة الدفع مطلوبة'
        }),

    notes: Joi.string()
        .max(500)
        .optional()
        .allow('')
        .messages({
            'string.max': 'الملاحظات طويلة جداً'
        })
});

// ============================================================
// Member Validation Schemas
// ============================================================

const memberSchema = Joi.object({
    full_name: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
            'string.empty': 'الاسم الكامل مطلوب',
            'string.min': 'الاسم يجب أن يكون 3 أحرف على الأقل',
            'string.max': 'الاسم طويل جداً',
            'any.required': 'الاسم الكامل مطلوب'
        }),

    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'البريد الإلكتروني غير صحيح',
            'any.required': 'البريد الإلكتروني مطلوب'
        }),

    phone: customJoi.string()
        .gulfPhone()
        .required()
        .messages({
            'any.required': 'رقم الجوال مطلوب'
        }),

    membership_number: Joi.string()
        .pattern(/^MEM[0-9]{6}$/)
        .optional()
        .messages({
            'string.pattern.base': 'رقم العضوية غير صحيح'
        }),

    role: Joi.string()
        .valid('member', 'volunteer', 'organizer', 'admin', 'super_admin')
        .optional()
        .default('member')
        .messages({
            'any.only': 'الدور غير صحيح'
        })
});

// ============================================================
// Validation Middleware Functions
// ============================================================

const validateActivity = (req, res, next) => {
    const { error, value } = activitySchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        }));

        return res.status(400).json({
            success: false,
            message: 'خطأ في البيانات المدخلة',
            message_en: 'Validation error',
            errors
        });
    }

    req.body = value;
    next();
};

const validateActivityUpdate = (req, res, next) => {
    const { error, value } = activityUpdateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        }));

        return res.status(400).json({
            success: false,
            message: 'خطأ في البيانات المدخلة',
            message_en: 'Validation error',
            errors
        });
    }

    req.body = value;
    next();
};

const validateSearch = (req, res, next) => {
    const { error, value } = searchSchema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        }));

        return res.status(400).json({
            success: false,
            message: 'خطأ في معاملات البحث',
            message_en: 'Search validation error',
            errors
        });
    }

    req.query = value;
    next();
};

const validateContribution = (req, res, next) => {
    const { error, value } = contributionSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        }));

        return res.status(400).json({
            success: false,
            message: 'خطأ في بيانات المساهمة',
            message_en: 'Contribution validation error',
            errors
        });
    }

    req.body = value;
    next();
};

const validateMember = (req, res, next) => {
    const { error, value } = memberSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        }));

        return res.status(400).json({
            success: false,
            message: 'خطأ في بيانات العضو',
            message_en: 'Member validation error',
            errors
        });
    }

    req.body = value;
    next();
};

// Generic validation middleware factory
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                message: 'خطأ في البيانات المدخلة',
                message_en: 'Validation error',
                errors
            });
        }

        req.body = value;
        next();
    };
};

// Pagination validation middleware
const validatePagination = (req, res, next) => {
    const schema = Joi.object({
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .optional()
            .default(20),
        offset: Joi.number()
            .integer()
            .min(0)
            .optional()
            .default(0),
        page: Joi.number()
            .integer()
            .min(1)
            .optional()
    });

    const { error, value } = schema.validate(req.query, {
        stripUnknown: false
    });

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'خطأ في معاملات الصفحات',
            message_en: 'Pagination validation error',
            errors: error.details
        });
    }

    // Convert page to offset if provided
    if (value.page) {
        value.offset = (value.page - 1) * value.limit;
        delete value.page;
    }

    req.query = { ...req.query, ...value };
    next();
};

module.exports = {
    // Schemas
    activitySchema,
    activityUpdateSchema,
    searchSchema,
    contributionSchema,
    memberSchema,

    // Middleware functions
    validateActivity,
    validateActivityUpdate,
    validateSearch,
    validateContribution,
    validateMember,
    validatePagination,
    validate,

    // Custom Joi instance
    customJoi
};