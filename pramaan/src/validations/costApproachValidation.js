export const checkCostNew = (field, text) => {
    const costNewFields = [
        'ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW',
        'ESTIMATED COST NEW TYPE',
        'Estimated',
        'Cost Type'
    ];
    if (!costNewFields.includes(field)) return null;

    const value = String(text || '').trim().toLowerCase();
    if (!value) {
        return { isError: true, skipBlankFilter: true, isMandatoryBlank: true, message: "'ESTIMATED COST NEW TYPE' cannot be blank. One option must be selected." };
    }

    const hasReproduction = value.includes('reproduction');
    const hasReplacement = value.includes('replacement');

    if (hasReproduction && hasReplacement) {
        return { isError: true, skipBlankFilter: true, message: "Only one of 'Reproduction' or 'Replacement' can be selected." };
    }

    if (!hasReproduction && !hasReplacement) {
        return { isError: true, skipBlankFilter: true, message: "Either 'Reproduction' or 'Replacement' must be selected." };
    }

    return { isMatch: true };
};

export const checkSourceOfCostData = (field, text) => {
    const sourceFields = ['Source of cost data', 'Source of Cost Data', 'Cost Data Source'];
    if (!sourceFields.includes(field)) return null;
    if (!text || String(text).trim() === '') {
        return { isError: true, skipBlankFilter: true, isMandatoryBlank: true, message: "'Source of Cost Data' cannot be blank." };
    }
    return { isMatch: true };
};

export const checkIndicatedValueByCostApproach = (field, text, data) => {
    const indFields = [
        'Indicated Value By Cost Approach......................................................=$',
        'Indicated Value by Cost Approach',
        'Cost Approach Indicated Value',
        'INDICATED VALUE BY COST APPROACH'
    ];
    if (!indFields.includes(field)) return null;

    const value = String(text || '').trim();
    if (!value || value === '0') {
        return { isError: true, skipBlankFilter: true, isMandatoryBlank: true, message: "'INDICATED VALUE BY COST APPROACH' is mandatory and cannot be blank." };
    }
    return { isMatch: true };
};

export const checkCostApproachFieldsNotBlank = (field, text) => {
    const mandatoryCostFields = [
        "Estimated", "Cost Type", "ESTIMATED COST NEW TYPE", "ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW",
        "Source of cost data", "Source of Cost Data", "Cost Data Source",
        "Effective date of cost data ", "Effective date of cost data", "Effective Date", "Effective Date of Cost Data",
        "Estimated Remaining Economic Life (HUD and VA only)", "Remaining Economic Life",
        "OPINION OF SITE VALUE = $ ................................................", "Opinion of Site Value", "OPINION OF SITE VALUE",
        "Indicated Value By Cost Approach......................................................=$", "Indicated Value by Cost Approach", "Cost Approach Indicated Value", "INDICATED VALUE BY COST APPROACH"
    ];

    const fieldsToCheck = [
        ...mandatoryCostFields,
        "Quality rating from cost service ",
        "Comments on Cost Approach (gross living area calculations, depreciation, etc.)",
        "Dwelling", "Garage/Carport ",
        " Total Estimate of Cost-New  = $ ...................", "Total Estimate of Cost-New = $ ...................", "Depreciation ",
        "Depreciated Cost of Improvements......................................................=$ ",
        "“As-is” Value of Site Improvements......................................................=$",
        "Depreciated Cost of Dwellings",
        "As Is Value of Site Improvements",
        "Above Grade Finished Area",
        "Cost Per Square Foot",
        "Depreciated Cost",
        "Physical Depreciation",
        "Functional Depreciation",
        "External Depreciation",
        "Total Depreciation",
        "Effective Age",
        "Site Improvement Description",
        "Site Improvement Amount",
        "Primary Site Valuation Method",
        "Land Comparable Number",
        "Land Comparable Address",
        "Land Comparable County",
        "Land Comparable Data Source",
        "Land Comparable Assessor Parcel Number (APN)",
        "Land Comparable Site Size",
        "Land Comparable Sale Date",
        "Land Comparable Sale Price",
        "Commentary on Remaining Economic Life",
        "Commentary on Effective Age",
        "Reconciliation of Site Value",
        "General Description",
        "Quality Rating",
        "Cost Method",
        "Depreciation Method",
        "Cost Approach Commentary",
        "Cost Approach Exhibits"
    ];
    if (fieldsToCheck.includes(field) && (!text || String(text).trim() === '')) {
        const isMandatory = mandatoryCostFields.includes(field);
        return { isError: true, skipBlankFilter: true, isMandatoryBlank: isMandatory, message: `'${field}' ${isMandatory ? 'is mandatory and ' : ''}should not be blank.` };
    }
    return null;
};
