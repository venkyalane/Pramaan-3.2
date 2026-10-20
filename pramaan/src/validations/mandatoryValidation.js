/**
 * Strict mandatory form field validations for Appraisal Form Application.
 * Enforces that critical fields cannot be left blank before submission or export:
 * 
 * 1. General & Neighborhood Details:
 *    - City
 *    - Appraiser Fee
 *    - Zip Code
 *    - "Are the utilities and off-site improvements typical for the market area?" (Selection required)
 *    - Active listings text block fields (All blanks mandatory)
 *    - Past 12 months sales text block fields (All blanks mandatory)
 * 
 * 2. Cost Approach Section:
 *    - ESTIMATED COST NEW TYPE
 *    - Source of Cost Data
 *    - Effective Date
 *    - Remaining Economic Life
 *    - OPINION OF SITE VALUE
 *    - INDICATED VALUE BY COST APPROACH
 * 
 * 3. Income Approach Section (Conditional - only mandatory if Form 1007 Rentals are detected):
 *    - Estimated Monthly Market Rent $
 *    - Gross Rent Multiplier (GRM)
 *    - Indicated Value by Income Approach
 */

export const isForm1007Detected = (data, formType) => {
    if (!data && !formType) return false;

    const ft = String(
        formType
        || data?.formType
        || data?.['From Type']
        || data?.['Form Type']
        || data?.selectedFormType
        || ''
    ).toLowerCase();

    if (ft.includes('1007') || ft.includes('1025')) {
        return true;
    }

    if (data?.has_1007 === true || data?.is_1007 === true) {
        return true;
    }

    // Check for Form 1007 sections with content
    const rentalSections = ['COMPARABLE_RENTAL_DATA', 'SUBJECT_RENT_SCHEDULE', 'RENT_SCHEDULE_GRID', 'RENT_SCHEDULE'];
    for (const key of rentalSections) {
        const val = data?.[key];
        if (val && typeof val === 'object') {
            if (Array.isArray(val) && val.length > 0) return true;
            if (!Array.isArray(val) && Object.values(val).some(v => v !== '' && v !== null && v !== undefined)) {
                return true;
            }
        }
    }

    // Check comparable rent sections (only rental comps, never sales comps like "COMPARABLE NO. 1")
    const compRentKeys = [
        "COMPARABLE Rental No #1", "COMPARABLE Rental No #2", "COMPARABLE Rental No #3",
        "COMPARABLE Rental No #4", "COMPARABLE Rental No #5", "COMPARABLE Rental No #6",
        "COMPARABLE Rental No #7", "COMPARABLE Rental No #8", "COMPARABLE Rental No #9"
    ];
    for (const rk of compRentKeys) {
        const sec = data?.[rk];
        if (sec && typeof sec === 'object' && Object.values(sec).some(v => v !== '' && v !== null && v !== undefined)) {
            return true;
        }
    }

    return false;
};

const normalizeStr = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const countNumbers = (str) => {
    if (!str) return [];
    const cleaned = String(str)
        .replace(/\b12\s*[-\s]*months?\b/gi, '')
        .replace(/\btwelve\s*[-\s]*months?\b/gi, '');
    const matches = cleaned.match(/\d+(?:,\d+)*(?:\.\d+)?/g) || [];
    return matches.map(m => parseFloat(m.replace(/,/g, ''))).filter(n => !isNaN(n));
};

const getFieldValue = (data, section, keys) => {
    if (!data) return '';
    const sources = [];
    if (section && data[section] && typeof data[section] === 'object') {
        sources.push(data[section]);
    }
    if (section) {
        const altSecs = [section.toUpperCase(), section.toLowerCase(), section.charAt(0).toUpperCase() + section.slice(1)];
        for (const alt of altSecs) {
            if (data[alt] && typeof data[alt] === 'object' && !sources.includes(data[alt])) {
                sources.push(data[alt]);
            }
        }
    }
    sources.push(data);

    for (const src of sources) {
        for (const k of keys) {
            if (src[k] !== undefined && src[k] !== null) {
                let v = src[k];
                if (typeof v === 'object' && v !== null) {
                    v = v.value !== undefined ? v.value : (v.choice !== undefined ? v.choice : '');
                }
                const vStr = String(v).trim();
                if (vStr !== '') return vStr;
            }
        }
    }
    return '';
};

// Key configurations for all mandatory fields
export const MANDATORY_FIELDS_CONFIG = {
    // 1. General & Neighborhood Details
    CITY: {
        id: 'city',
        label: 'City',
        section: 'General & Neighborhood Details',
        dataSection: 'Subject',
        aliases: ['City', 'Subject City'],
        path: ['Subject', 'City']
    },
    APPRAISER_FEE: {
        id: 'appraiser_fee',
        label: 'Appraiser Fee',
        section: 'General & Neighborhood Details',
        dataSection: 'Subject',
        aliases: ["Appraiser Fee", "Appraiser's Fee", "Appraisal Fee", "Total Fee", "Fee"],
        path: ['Subject', "Appraiser Fee"]
    },
    ZIP_CODE: {
        id: 'zip_code',
        label: 'Zip Code',
        section: 'General & Neighborhood Details',
        dataSection: 'Subject',
        aliases: ['Zip Code', 'Postal Code'],
        path: ['Subject', 'Zip Code']
    },
    UTILITIES_TYPICAL: {
        id: 'utilities_typical',
        label: 'Are the utilities and off-site improvements typical for the market area?',
        section: 'General & Neighborhood Details',
        dataSection: 'SITE',
        aliases: [
            'Are the utilities and off-site improvements typical for the market area?',
            'Are the utilities and off-site improvements typical for the market area? If No, describe'
        ],
        path: ['SITE', 'Are the utilities and off-site improvements typical for the market area?']
    },
    ACTIVE_LISTINGS_TEXT: {
        id: 'active_listings_text',
        label: 'There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from $___ to $___',
        section: 'General & Neighborhood Details',
        dataSection: 'NEIGHBORHOOD',
        aliases: [
            'There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from$ ___to $___',
            'There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from $___ to $___',
            'THERE ARE ____ COMPARABLE PROPERTIES CURRENTLY OFFERED FOR SALE IN THE SUBJECT NEIGHBORHOOD RANGING IN PRICE FROM $ ___ TO $ ___',
            'Comparable Properties Currently Offered for Sale'
        ],
        path: ['NEIGHBORHOOD', 'There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from $___ to $___']
    },
    PAST_12_MONTHS_SALES_TEXT: {
        id: 'past_12_months_sales_text',
        label: 'There are ___ comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $___ to $____',
        section: 'General & Neighborhood Details',
        dataSection: 'NEIGHBORHOOD',
        aliases: [
            'There are ___comparable sales in the subject neighborhoodwithin the past twelvemonths ranging in sale price from$___ to $____',
            'There are ___ comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $___ to $____',
            'THERE ARE ___ COMPARABLE SALES IN THE SUBJECT NEIGHBORHOOD WITHIN THE PAST TWELVE MONTHS RANGING IN SALE PRICE FROM $ ___ TO $ ___',
            'Comparable Sales in Subject Neighborhood Past 12 Months'
        ],
        path: ['NEIGHBORHOOD', 'There are ___ comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $___ to $____']
    },

    // 2. Cost Approach Section
    ESTIMATED_COST_NEW_TYPE: {
        id: 'estimated_cost_new_type',
        label: 'ESTIMATED COST NEW TYPE',
        section: 'Cost Approach Section',
        dataSection: 'COST_APPROACH',
        aliases: [
            'ESTIMATED COST NEW TYPE',
            'ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW',
            'Estimated',
            'Cost Type',
            'Total Estimate of Cost-New = $ ...................',
            'Total Estimate of Cost-New  = $ ...................'
        ],
        path: ['COST_APPROACH', 'ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW']
    },
    SOURCE_OF_COST_DATA: {
        id: 'source_of_cost_data',
        label: 'Source of Cost Data',
        section: 'Cost Approach Section',
        dataSection: 'COST_APPROACH',
        aliases: [
            'Source of Cost Data',
            'Source of cost data',
            'Cost Data Source'
        ],
        path: ['COST_APPROACH', 'Source of cost data']
    },
    EFFECTIVE_DATE: {
        id: 'effective_date',
        label: 'Effective Date',
        section: 'Cost Approach Section',
        dataSection: 'COST_APPROACH',
        aliases: [
            'Effective Date',
            'Effective date of cost data ',
            'Effective date of cost data',
            'Effective Date of Cost Data'
        ],
        path: ['COST_APPROACH', 'Effective date of cost data ']
    },
    REMAINING_ECONOMIC_LIFE: {
        id: 'remaining_economic_life',
        label: 'Remaining Economic Life',
        section: 'Cost Approach Section',
        dataSection: 'COST_APPROACH',
        aliases: [
            'Remaining Economic Life',
            'Estimated Remaining Economic Life (HUD and VA only)',
            'Commentary on Remaining Economic Life'
        ],
        path: ['COST_APPROACH', 'Estimated Remaining Economic Life (HUD and VA only)']
    },
    OPINION_OF_SITE_VALUE: {
        id: 'opinion_of_site_value',
        label: 'OPINION OF SITE VALUE',
        section: 'Cost Approach Section',
        dataSection: 'COST_APPROACH',
        aliases: [
            'OPINION OF SITE VALUE',
            'OPINION OF SITE VALUE = $ ................................................',
            'Opinion of Site Value',
            'Reconciliation of Site Value'
        ],
        path: ['COST_APPROACH', 'OPINION OF SITE VALUE = $ ................................................']
    },
    INDICATED_VALUE_BY_COST_APPROACH: {
        id: 'indicated_value_by_cost_approach',
        label: 'INDICATED VALUE BY COST APPROACH',
        section: 'Cost Approach Section',
        dataSection: 'COST_APPROACH',
        aliases: [
            'INDICATED VALUE BY COST APPROACH',
            'Indicated Value By Cost Approach......................................................=$',
            'Indicated Value by Cost Approach',
            'Cost Approach Indicated Value'
        ],
        path: ['COST_APPROACH', 'Indicated Value By Cost Approach......................................................=$']
    },

    // 3. Income Approach Section (Conditional on Form 1007)
    ESTIMATED_MONTHLY_MARKET_RENT: {
        id: 'estimated_monthly_market_rent',
        label: 'Estimated Monthly Market Rent $',
        section: 'Income Approach Section',
        dataSection: 'INCOME_APPROACH',
        isConditional1007: true,
        aliases: [
            'Estimated Monthly Market Rent $',
            'Estimated Monthly Market Rent',
            'Market Rent'
        ],
        path: ['INCOME_APPROACH', 'Estimated Monthly Market Rent $']
    },
    GROSS_RENT_MULTIPLIER: {
        id: 'gross_rent_multiplier',
        label: 'Gross Rent Multiplier (GRM)',
        section: 'Income Approach Section',
        dataSection: 'INCOME_APPROACH',
        isConditional1007: true,
        aliases: [
            'Gross Rent Multiplier (GRM)',
            'Gross Rent Multiplier',
            'X Gross Rent Multiplier  = $',
            'X Gross Rent Multiplier = $',
            'X GROSS RENT MULTIPLIER = $',
            'GRM'
        ],
        path: ['INCOME_APPROACH', 'X Gross Rent Multiplier  = $']
    },
    INDICATED_VALUE_BY_INCOME_APPROACH: {
        id: 'indicated_value_by_income_approach',
        label: 'Indicated Value by Income Approach',
        section: 'Income Approach Section',
        dataSection: 'INCOME_APPROACH',
        isConditional1007: true,
        aliases: [
            'Indicated Value by Income Approach',
            'Indicated Value by Income Approach $',
            'Income Approach Indicated Value'
        ],
        path: ['INCOME_APPROACH', 'Indicated Value by Income Approach']
    }
};

/**
 * Safely checks if a field name (and optional path) matches a mandatory field config.
 * Avoids false positive substring matches on short field names (e.g. 'electricity' containing 'city').
 */
export const fieldMatchesConfig = (field, config, path = null) => {
    if (!field || !config) return false;
    const cleanField = normalizeStr(field);

    // Path check: if config is in a specific section and path is present, avoid cross-section collisions
    if (path && Array.isArray(path) && path.length > 0 && config.dataSection) {
        const normSection = normalizeStr(path[0]);
        const normTarget = normalizeStr(config.dataSection);
        if (normSection !== normTarget && normSection !== 'subject' && !normSection.includes(normTarget) && !normTarget.includes(normSection)) {
            if (config.section !== 'General & Neighborhood Details') {
                return false;
            }
        }
    }

    // Specific phrase matching for long text blocks
    if (config.id === 'active_listings_text') {
        return cleanField.includes('comparablepropertiescurrentlyofferedforsale') ||
            (cleanField.includes('comparableproperties') && cleanField.includes('offeredforsale'));
    }
    if (config.id === 'past_12_months_sales_text') {
        return cleanField.includes('comparablesalesinthesubjectneighborhood') ||
            (cleanField.includes('comparablesales') && cleanField.includes('twelvemonths'));
    }
    if (config.id === 'utilities_typical') {
        return cleanField.includes('utilitiesandoffsiteimprovementstypical') ||
            cleanField.includes('utilitiesandoffsiteimprovements');
    }

    for (const alias of config.aliases) {
        const cleanAlias = normalizeStr(alias);
        if (cleanField === cleanAlias) return true;
        // For long phrases (> 15 chars), allow prefix matching
        if (cleanAlias.length > 15 && (cleanField.startsWith(cleanAlias) || cleanAlias.startsWith(cleanField))) {
            return true;
        }
    }
    return false;
};

/**
 * Checks if a specific field is a mandatory field (or one of its aliases).
 */
export const isMandatoryField = (field, allData = null, formType = null, path = null) => {
    if (!field) return false;

    for (const key of Object.keys(MANDATORY_FIELDS_CONFIG)) {
        const config = MANDATORY_FIELDS_CONFIG[key];
        if (fieldMatchesConfig(field, config, path)) {
            if (config.isConditional1007) {
                return isForm1007Detected(allData, formType);
            }
            return true;
        }
    }
    return false;
};

/**
 * Validates a single mandatory field value.
 */
export const checkMandatoryField = (field, text, allData = null, path = null, saleName = null, formType = null) => {
    if (!field) return null;
    const valStr = String(text ?? '').trim();

    // Check each mandatory field
    for (const key of Object.keys(MANDATORY_FIELDS_CONFIG)) {
        const config = MANDATORY_FIELDS_CONFIG[key];
        if (fieldMatchesConfig(field, config, path)) {
            // Check conditional requirement
            if (config.isConditional1007 && !isForm1007Detected(allData, formType)) {
                return null;
            }

            // 1. Utilities and off-site improvements
            if (config.id === 'utilities_typical') {
                if (!valStr) {
                    return {
                        isError: true,
                        skipBlankFilter: true,
                        isMandatoryBlank: true,
                        field: config.label,
                        message: `'${config.label}' cannot be blank. Selection is required.`
                    };
                }
                const lower = valStr.toLowerCase();
                if (!lower.startsWith('yes') && !lower.startsWith('no')) {
                    return {
                        isError: true,
                        skipBlankFilter: true,
                        isMandatoryBlank: true,
                        field: config.label,
                        message: `'${config.label}' must be answered 'Yes' or 'No'.`
                    };
                }
                if (lower.startsWith('no')) {
                    const desc = lower.replace(/^no\b/, '').replace(/^[\s;:,\-./]+/, '').trim();
                    if (!desc) {
                        return {
                            isError: true,
                            skipBlankFilter: true,
                            isMandatoryBlank: true,
                            field: config.label,
                            message: `'${config.label}' requires a description when answered 'No'.`
                        };
                    }
                }
                return { isMatch: true };
            }

            // 2. Active listings text block
            if (config.id === 'active_listings_text') {
                if (!valStr || valStr.includes('___')) {
                    return {
                        isError: true,
                        skipBlankFilter: true,
                        isMandatoryBlank: true,
                        field: config.label,
                        message: `For 'comparable properties currently offered for sale', all three blanks (count, low price, and high price) are mandatory and cannot be blank.`
                    };
                }
                const nums = countNumbers(valStr);
                if (nums.length < 3) {
                    return {
                        isError: true,
                        skipBlankFilter: true,
                        isMandatoryBlank: true,
                        field: config.label,
                        message: `For 'comparable properties currently offered for sale', three values (count, low price, and high price) are compulsory and must be numbers.`
                    };
                }
                if (nums[1] > nums[2]) {
                    return {
                        isError: true,
                        skipBlankFilter: true,
                        field: config.label,
                        message: `For 'comparable properties currently offered for sale', the price range should be low to high (low price must be <= high price).`
                    };
                }
                return { isMatch: true };
            }

            // 3. Past 12 months sales text block
            if (config.id === 'past_12_months_sales_text') {
                if (!valStr || valStr.includes('___')) {
                    return {
                        isError: true,
                        skipBlankFilter: true,
                        isMandatoryBlank: true,
                        field: config.label,
                        message: `For 'comparable sales in the subject neighborhood within the past twelve months', all three blanks (count, low price, and high price) are mandatory and cannot be blank.`
                    };
                }
                const nums = countNumbers(valStr);
                if (nums.length < 3) {
                    return {
                        isError: true,
                        skipBlankFilter: true,
                        isMandatoryBlank: true,
                        field: config.label,
                        message: `For 'comparable sales in the subject neighborhood within the past twelve months', three values (count, low price, and high price) are compulsory and must be numbers.`
                    };
                }
                if (nums[1] > nums[2]) {
                    return {
                        isError: true,
                        skipBlankFilter: true,
                        field: config.label,
                        message: `For 'comparable sales in the subject neighborhood within the past twelve months', the sale price range should be low to high (low price must be <= high price).`
                    };
                }
                return { isMatch: true };
            }

            // 4. General blank check for all other mandatory fields
            if (!valStr) {
                const conditionalSuffix = config.isConditional1007 ? ' when Form 1007 Rentals are detected' : '';
                return {
                    isError: true,
                    skipBlankFilter: true,
                    isMandatoryBlank: true,
                    field: config.label,
                    message: `'${config.label}' is mandatory and cannot be blank${conditionalSuffix}.`
                };
            }

            return { isMatch: true };
        }
    }

    return null;
};

/**
 * Validates the entire appraisal dataset against all mandatory field rules.
 * Used before save/submit and export attempts.
 */
export const validateAllMandatoryFields = (data, formType = null) => {
    const errors = [];
    if (!data || typeof data !== 'object') {
        return {
            isValid: false,
            errors: [{ field: 'All Data', label: 'Form Data', section: 'Root', message: 'No report data present.' }],
            missingCount: 1
        };
    }

    const has1007 = isForm1007Detected(data, formType);

    for (const key of Object.keys(MANDATORY_FIELDS_CONFIG)) {
        const config = MANDATORY_FIELDS_CONFIG[key];

        // Skip conditional income approach fields if 1007 is not detected
        if (config.isConditional1007 && !has1007) {
            continue;
        }

        const val = getFieldValue(data, config.dataSection, config.aliases);
        const res = checkMandatoryField(config.aliases[0], val, data, config.path, null, formType);

        if (res && res.isError) {
            errors.push({
                id: config.id,
                field: config.aliases[0],
                label: config.label,
                section: config.section,
                path: config.path,
                message: res.message
            });
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        missingCount: errors.length,
        has1007
    };
};
