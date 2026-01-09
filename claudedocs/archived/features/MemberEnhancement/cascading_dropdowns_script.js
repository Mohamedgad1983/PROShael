/**
 * ==========================================
 * CASCADING DROPDOWN FUNCTIONS
 * Ready to integrate into your JavaScript
 * ==========================================
 */

// ===== CONFIGURATION =====
const CascadeConfig = {
    // Loading delay (simulated API call)
    loadingDelay: 500,
    
    // API base URL (update with your actual API)
    apiBaseUrl: '/api',
    
    // Enable console logging for debugging
    debug: true
};

// ===== UTILITY FUNCTIONS =====

/**
 * Show loading spinner for a select element
 * @param {string} selectId - ID of the select element
 */
function showLoading(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const loading = select.parentElement.querySelector('.select-loading');
    if (loading) {
        loading.classList.add('active');
    }
    select.disabled = true;
    
    if (CascadeConfig.debug) {
        console.log(`Loading started for: ${selectId}`);
    }
}

/**
 * Hide loading spinner for a select element
 * @param {string} selectId - ID of the select element
 */
function hideLoading(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const loading = select.parentElement.querySelector('.select-loading');
    if (loading) {
        loading.classList.remove('active');
    }
    select.disabled = false;
    
    if (CascadeConfig.debug) {
        console.log(`Loading finished for: ${selectId}`);
    }
}

/**
 * Update helper text for a form group
 * @param {string} selectId - ID of the select element
 * @param {string} message - New helper message
 */
function updateHelperText(selectId, message) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const formGroup = select.closest('.form-group');
    if (!formGroup) return;
    
    const helperText = formGroup.querySelector('.helper-text span:last-child');
    if (helperText) {
        helperText.textContent = message;
    }
}

/**
 * Clear and populate a select element with options
 * @param {string} selectId - ID of the select element
 * @param {Array} options - Array of {value, text} objects
 * @param {string} placeholderText - Placeholder option text
 */
function populateSelect(selectId, options, placeholderText = '-- اختر --') {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Clear existing options
    select.innerHTML = `<option value="">${placeholderText}</option>`;
    
    // Add new options
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text || option.name || option.label;
        
        // Add any additional attributes
        if (option.attributes) {
            Object.keys(option.attributes).forEach(key => {
                optionElement.setAttribute(key, option.attributes[key]);
            });
        }
        
        select.appendChild(optionElement);
    });
    
    if (CascadeConfig.debug) {
        console.log(`Populated ${selectId} with ${options.length} options`);
    }
}

/**
 * Reset a dependent select to disabled state
 * @param {string} selectId - ID of the select element
 * @param {string} message - Message to show in placeholder
 */
function resetDependentSelect(selectId, message = '-- اختر الحقل السابق أولاً --') {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = `<option value="">${message}</option>`;
    select.disabled = true;
    select.value = '';
}

// ===== MAIN CASCADE FUNCTION =====

/**
 * Generic cascading dropdown handler
 * @param {Object} config - Configuration object
 * @param {string} config.parentId - ID of parent select
 * @param {string} config.childId - ID of child select
 * @param {string} config.apiEndpoint - API endpoint (optional if using dataSource)
 * @param {Object} config.dataSource - Local data source (optional if using API)
 * @param {Function} config.onSuccess - Callback on success
 * @param {Function} config.onError - Callback on error
 */
async function setupCascade(config) {
    const {
        parentId,
        childId,
        apiEndpoint,
        dataSource,
        childPlaceholder = '-- اختر --',
        emptyMessage = '-- اختر الحقل السابق أولاً --',
        onSuccess,
        onError
    } = config;
    
    const parentSelect = document.getElementById(parentId);
    const childSelect = document.getElementById(childId);
    
    if (!parentSelect || !childSelect) {
        console.error('Parent or child select not found');
        return;
    }
    
    // Initially disable child
    resetDependentSelect(childId, emptyMessage);
    
    // Add change event listener to parent
    parentSelect.addEventListener('change', async function() {
        const parentValue = this.value;
        
        // Reset child if no parent value
        if (!parentValue) {
            resetDependentSelect(childId, emptyMessage);
            if (onError) onError('No parent value selected');
            return;
        }
        
        // Show loading
        showLoading(childId);
        
        try {
            let options = [];
            
            // Get data from API or local source
            if (apiEndpoint) {
                // Fetch from API
                const url = apiEndpoint.replace('{parentId}', parentValue);
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                options = data.data || data.items || data;
                
            } else if (dataSource) {
                // Use local data source
                options = dataSource[parentValue] || [];
                
                // Simulate API delay
                await new Promise(resolve => setTimeout(resolve, CascadeConfig.loadingDelay));
            }
            
            // Populate child select
            populateSelect(childId, options, childPlaceholder);
            
            // Update helper text
            updateHelperText(childId, `تم تحميل ${options.length} خيار متاح`);
            
            // Enable child select
            hideLoading(childId);
            
            // Success callback
            if (onSuccess) onSuccess(options);
            
        } catch (error) {
            console.error('Error loading cascading data:', error);
            
            // Show error state
            hideLoading(childId);
            resetDependentSelect(childId, 'حدث خطأ في التحميل');
            updateHelperText(childId, 'فشل تحميل البيانات. حاول مرة أخرى');
            
            // Error callback
            if (onError) onError(error);
        }
    });
    
    if (CascadeConfig.debug) {
        console.log(`Cascade setup complete: ${parentId} → ${childId}`);
    }
}

// ===== EXAMPLE IMPLEMENTATIONS =====

/**
 * Example 1: Branch → Sub-Branch (using local data)
 */
function setupBranchCascade() {
    const branchData = {
        'branch1': [
            { value: 'sub1_1', text: 'الفرع الأول' },
            { value: 'sub1_2', text: 'الفرع الثاني' }
        ],
        'branch2': [
            { value: 'sub2_1', text: 'الفرع الأول' },
            { value: 'sub2_2', text: 'الفرع الثاني' }
        ]
    };
    
    setupCascade({
        parentId: 'mainBranch',
        childId: 'subBranch',
        dataSource: branchData,
        childPlaceholder: '-- اختر الفرع الفرعي --',
        emptyMessage: '-- اختر الفخذ الرئيسي أولاً --',
        onSuccess: (options) => {
            console.log('Sub-branches loaded:', options);
        }
    });
}

/**
 * Example 2: Country → City (using API)
 */
function setupCountryCityCascade() {
    setupCascade({
        parentId: 'country',
        childId: 'city',
        apiEndpoint: '/api/countries/{parentId}/cities',
        childPlaceholder: '-- اختر المدينة --',
        emptyMessage: '-- اختر الدولة أولاً --',
        onSuccess: (cities) => {
            console.log('Cities loaded:', cities);
        },
        onError: (error) => {
            console.error('Failed to load cities:', error);
        }
    });
}

/**
 * Example 3: Subscription Type → Plan (using local data)
 */
function setupSubscriptionCascade() {
    const subscriptionPlans = {
        'individual': [
            { value: 'basic', text: 'خطة أساسية - 100 ريال' },
            { value: 'premium', text: 'خطة مميزة - 200 ريال' }
        ],
        'family': [
            { value: 'family_basic', text: 'عائلية - 300 ريال' },
            { value: 'family_premium', text: 'عائلية مميزة - 500 ريال' }
        ]
    };
    
    setupCascade({
        parentId: 'subscriptionType',
        childId: 'subscriptionPlan',
        dataSource: subscriptionPlans,
        childPlaceholder: '-- اختر خطة الاشتراك --',
        emptyMessage: '-- اختر نوع الاشتراك أولاً --'
    });
}

// ===== MULTI-LEVEL CASCADE =====

/**
 * Setup multi-level cascade (e.g., Country → Region → City)
 * @param {Array} cascadeLevels - Array of cascade configurations
 */
function setupMultiLevelCascade(cascadeLevels) {
    cascadeLevels.forEach(level => {
        setupCascade(level);
    });
}

// Example: Country → Region → City
function setupLocationCascade() {
    setupMultiLevelCascade([
        {
            parentId: 'country',
            childId: 'region',
            apiEndpoint: '/api/countries/{parentId}/regions',
            childPlaceholder: '-- اختر المنطقة --'
        },
        {
            parentId: 'region',
            childId: 'city',
            apiEndpoint: '/api/regions/{parentId}/cities',
            childPlaceholder: '-- اختر المدينة --'
        }
    ]);
}

// ===== FORM RESET HANDLER =====

/**
 * Reset all cascading dropdowns on form reset
 * @param {string} formId - ID of the form
 * @param {Array} childIds - Array of child select IDs to reset
 */
function setupCascadeReset(formId, childIds) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.addEventListener('reset', function() {
        setTimeout(() => {
            childIds.forEach(childId => {
                resetDependentSelect(childId);
            });
        }, 10);
    });
}

// ===== INITIALIZATION =====

/**
 * Initialize all cascading dropdowns when DOM is ready
 */
function initializeCascades() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAllCascades);
    } else {
        setupAllCascades();
    }
}

/**
 * Setup all cascades - CUSTOMIZE THIS FUNCTION
 */
function setupAllCascades() {
    // Example: Setup your specific cascades here
    
    // 1. Branch cascades
    // setupBranchCascade();
    
    // 2. Location cascades
    // setupCountryCityCascade();
    
    // 3. Subscription cascades
    // setupSubscriptionCascade();
    
    // 4. Setup form reset
    // setupCascadeReset('memberForm', ['subBranch', 'city', 'subscriptionPlan']);
    
    console.log('All cascading dropdowns initialized');
}

// ===== AUTO-INITIALIZE (OPTIONAL) =====
// Uncomment to auto-initialize on page load
// initializeCascades();

// ===== EXPORT FOR MODULE USAGE =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        setupCascade,
        setupMultiLevelCascade,
        setupCascadeReset,
        showLoading,
        hideLoading,
        populateSelect,
        resetDependentSelect,
        updateHelperText,
        initializeCascades
    };
}

/**
 * ==========================================
 * USAGE INSTRUCTIONS
 * ==========================================
 * 
 * 1. Include this file in your HTML:
 *    <script src="cascading-dropdowns.js"></script>
 * 
 * 2. Setup your cascades:
 * 
 *    <script>
 *      // Using local data
 *      setupCascade({
 *        parentId: 'mainBranch',
 *        childId: 'subBranch',
 *        dataSource: {
 *          'branch1': [
 *            { value: '1', text: 'Sub Branch 1' }
 *          ]
 *        }
 *      });
 *      
 *      // Using API
 *      setupCascade({
 *        parentId: 'country',
 *        childId: 'city',
 *        apiEndpoint: '/api/countries/{parentId}/cities'
 *      });
 *    </script>
 * 
 * 3. Your HTML should have the proper structure:
 * 
 *    <div class="form-group">
 *      <div class="select-wrapper">
 *        <select id="mainBranch" class="custom-select">
 *          <option value="">Select Branch</option>
 *        </select>
 *        <span class="select-arrow">▼</span>
 *      </div>
 *    </div>
 *    
 *    <div class="form-group cascade-connection">
 *      <div class="select-wrapper">
 *        <select id="subBranch" class="custom-select" disabled>
 *          <option value="">Select Main Branch First</option>
 *        </select>
 *        <span class="select-arrow">▼</span>
 *        <div class="select-loading">
 *          <div class="spinner"></div>
 *        </div>
 *      </div>
 *    </div>
 * 
 * ==========================================
 */