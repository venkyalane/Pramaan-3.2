/**
 * Income Approach Section Validations.
 * Conditional: only mandatory if Form 1007 Rentals are detected.
 * Required fields:
 * - Estimated Monthly Market Rent $
 * - Gross Rent Multiplier (GRM)
 * - Indicated Value by Income Approach
 */

export const isForm1007RentalsDetected = (data, formType) => {
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

    // Check for presence of Form 1007 rental data structures with content
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

export const INCOME_APPROACH_1007_REQUIRED_FIELDS = [
    "Estimated Monthly Market Rent $",
    "Estimated Monthly Market Rent",
    "Market Rent",
    "X Gross Rent Multiplier  = $",
    "X Gross Rent Multiplier = $",
    "Gross Rent Multiplier",
    "Gross Rent Multiplier (GRM)",
    "X GROSS RENT MULTIPLIER = $",
    "GRM",
    "Indicated Value by Income Approach",
    "Indicated Value by Income Approach $",
    "Income Approach Indicated Value"
];

export const checkIncomeApproachFieldsNotBlank = (field, text, allData = null, path = null, saleName = null, formType = null) => {
    const fieldsToCheck = [
        "Estimated Monthly Market Rent $",
        "Estimated Monthly Market Rent",
        "X Gross Rent Multiplier  = $",
        "X Gross Rent Multiplier = $",
        "Gross Rent Multiplier",
        "Gross Rent Multiplier (GRM)",
        "Indicated Value by Income Approach",
        "Summary of Income Approach (including support for market rent and GRM) "
    ];
    if (fieldsToCheck.includes(field)) {
        // Income approach fields are conditional - only mandatory if Form 1007 is detected
        const has1007 = isForm1007RentalsDetected(allData, formType);
        if (!has1007) {
            return null;
        }
        if (!text || String(text).trim() === '') {
            return {
                isError: true,
                skipBlankFilter: true,
                isMandatoryBlank: true,
                message: `'${field}' is mandatory and cannot be blank when Form 1007 Rentals are detected.`
            };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkIncomeApproach1007Required = (field, text, allData, path, saleName, formType) => {
    if (!INCOME_APPROACH_1007_REQUIRED_FIELDS.includes(field)) return null;

    const has1007 = isForm1007RentalsDetected(allData, formType);
    if (!has1007) return null;

    if (!text || String(text).trim() === '') {
        return {
            isError: true,
            skipBlankFilter: true,
            isMandatoryBlank: true,
            message: `'${field}' is mandatory when Form 1007 Rentals are detected.`
        };
    }
    return { isMatch: true };
};
