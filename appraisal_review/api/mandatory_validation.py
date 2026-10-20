"""
Mandatory field validation module for Appraisal Reports.
Enforces that critical appraisal form fields cannot be left blank before submission or export.
"""

import re
from typing import Dict, Any, List, Optional, Tuple


def is_form_1007_detected(report_data: Dict[str, Any], form_type: Optional[str] = None) -> bool:
    """
    Checks if Form 1007 Rentals are detected in the appraisal report data.
    """
    if not isinstance(report_data, dict):
        return False

    ft = str(
        form_type
        or report_data.get('form_type')
        or report_data.get('Form Type')
        or report_data.get('From Type')
        or report_data.get('selectedFormType')
        or ''
    ).lower()

    if '1007' in ft or '1025' in ft:
        return True

    if report_data.get('has_1007') is True:
        return True

    # Check for presence of Form 1007 rental data structures
    for key in ['COMPARABLE_RENTAL_DATA', 'SUBJECT_RENT_SCHEDULE', 'RENT_SCHEDULE_GRID', 'RENT_SCHEDULE']:
        val = report_data.get(key)
        if isinstance(val, dict) and len(val) > 0:
            # Verify it has at least one non-empty value
            if any(v for v in val.values() if v not in (None, '', {}, [])):
                return True
        elif isinstance(val, list) and len(val) > 0:
            return True

    # Check for comparable rent sections (only rental comps, never sales comps like "COMPARABLE NO. 1")
    rent_comp_keys = [
        "COMPARABLE Rental No #1", "COMPARABLE Rental No #2", "COMPARABLE Rental No #3",
        "COMPARABLE Rental No #4", "COMPARABLE Rental No #5", "COMPARABLE Rental No #6",
        "COMPARABLE Rental No #7", "COMPARABLE Rental No #8", "COMPARABLE Rental No #9"
    ]
    for rk in rent_comp_keys:
        sec = report_data.get(rk)
        if isinstance(sec, dict) and any(v for v in sec.values() if v not in (None, '', {}, [])):
            return True

    return False


def _get_val(data: Dict[str, Any], section: Optional[str], keys: List[str]) -> str:
    """Helper to extract a non-blank string value from section or root data across multiple alias keys."""
    if not isinstance(data, dict):
        return ""

    sources = []
    if section:
        sec_obj = data.get(section)
        if isinstance(sec_obj, dict):
            sources.append(sec_obj)
        # Also check uppercase/lowercase/titlecase variations of section name
        for alt_sec in [section.upper(), section.lower(), section.title()]:
            alt_obj = data.get(alt_sec)
            if isinstance(alt_obj, dict) and alt_obj not in sources:
                sources.append(alt_obj)

    sources.append(data)

    for src in sources:
        for k in keys:
            if k in src:
                val = src[k]
                if isinstance(val, dict):
                    val = val.get('value', val.get('choice', ''))
                val_str = str(val or '').strip()
                if val_str:
                    return val_str

    return ""


def _count_numbers(val: str) -> List[float]:
    """Extracts numbers from string, ignoring 12-month indicators."""
    cleaned = re.sub(r'\b12\s*[-\s]*months?\b', '', val, flags=re.IGNORECASE)
    cleaned = re.sub(r'\btwelve\s*[-\s]*months?\b', '', cleaned, flags=re.IGNORECASE)
    matches = re.findall(r'\d+(?:,\d+)*(?:\.\d+)?', cleaned)
    nums = []
    for m in matches:
        try:
            nums.append(float(m.replace(',', '')))
        except ValueError:
            pass
    return nums


def validate_appraisal_mandatory_fields(report_data: Dict[str, Any], form_type: Optional[str] = None) -> List[Dict[str, str]]:
    """
    Validates that all mandatory fields are present and non-blank.
    Returns a list of error dictionaries: [{"field": ..., "section": ..., "message": ...}].
    """
    errors: List[Dict[str, str]] = []

    if not isinstance(report_data, dict):
        return [{"field": "report_data", "section": "Root", "message": "Report data must be a valid JSON object."}]

    # 1. General & Neighborhood Details
    # 1.1 City
    city_val = _get_val(report_data, 'Subject', ['City'])
    if not city_val:
        errors.append({
            "field": "City",
            "section": "General & Neighborhood Details",
            "message": "'City' is mandatory and cannot be blank."
        })

    # 1.2 Appraiser Fee
    fee_val = _get_val(report_data, 'Subject', [
        "Appraiser Fee", "Appraiser's Fee", "Appraisal Fee", "Total Fee", "Fee"
    ]) or _get_val(report_data, 'CERTIFICATION', [
        "Appraiser Fee", "Appraiser's Fee", "Appraisal Fee", "Total Fee", "Fee"
    ])
    if not fee_val:
        errors.append({
            "field": "Appraiser Fee",
            "section": "General & Neighborhood Details",
            "message": "'Appraiser Fee' is mandatory and cannot be blank."
        })

    # 1.3 Zip Code
    zip_val = _get_val(report_data, 'Subject', ['Zip Code', 'Postal Code'])
    if not zip_val:
        errors.append({
            "field": "Zip Code",
            "section": "General & Neighborhood Details",
            "message": "'Zip Code' is mandatory and cannot be blank."
        })

    # 1.4 "Are the utilities and off-site improvements typical for the market area?" (Selection required)
    util_val = _get_val(report_data, 'SITE', [
        "Are the utilities and off-site improvements typical for the market area?",
        "Are the utilities and off-site improvements typical for the market area? If No, describe"
    ])
    if not util_val:
        errors.append({
            "field": "Are the utilities and off-site improvements typical for the market area?",
            "section": "General & Neighborhood Details",
            "message": "'Are the utilities and off-site improvements typical for the market area?' cannot be blank. Selection is required."
        })
    else:
        util_lower = util_val.lower()
        if not (util_lower.startswith('yes') or util_lower.startswith('no')):
            errors.append({
                "field": "Are the utilities and off-site improvements typical for the market area?",
                "section": "General & Neighborhood Details",
                "message": "'Are the utilities and off-site improvements typical for the market area?' must be answered 'Yes' or 'No'."
            })
        elif util_lower.startswith('no'):
            desc = re.sub(r'^no\b', '', util_val, flags=re.IGNORECASE).strip(' :;,-./')
            if not desc:
                errors.append({
                    "field": "Are the utilities and off-site improvements typical for the market area?",
                    "section": "General & Neighborhood Details",
                    "message": "'Are the utilities and off-site improvements typical for the market area?' requires a description when answered 'No'."
                })

    # 1.5 Active listings text block fields:
    # "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from $___ to $___" (All blanks mandatory)
    active_listings_val = _get_val(report_data, 'NEIGHBORHOOD', [
        "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from$ ___to $___",
        "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from $___ to $___",
        "THERE ARE ____ COMPARABLE PROPERTIES CURRENTLY OFFERED FOR SALE IN THE SUBJECT NEIGHBORHOOD RANGING IN PRICE FROM $ ___ TO $ ___",
        "Comparable Properties Currently Offered for Sale"
    ]) or _get_val(report_data, 'INFO_OF_SALES', [
        "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from$ ___to $___",
        "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from $___ to $___",
        "THERE ARE ____ COMPARABLE PROPERTIES CURRENTLY OFFERED FOR SALE IN THE SUBJECT NEIGHBORHOOD RANGING IN PRICE FROM $ ___ TO $ ___",
        "Comparable Properties Currently Offered for Sale"
    ])

    if not active_listings_val or '___' in active_listings_val:
        errors.append({
            "field": "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from $___ to $___",
            "section": "General & Neighborhood Details",
            "message": "For 'comparable properties currently offered for sale', all three blanks (count, low price, and high price) are mandatory and cannot be left blank."
        })
    else:
        nums = _count_numbers(active_listings_val)
        if len(nums) < 3:
            errors.append({
                "field": "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from $___ to $___",
                "section": "General & Neighborhood Details",
                "message": "For 'comparable properties currently offered for sale', all three values (count, low price, and high price) are mandatory and must be in number format."
            })
        elif nums[1] > nums[2]:
            errors.append({
                "field": "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from $___ to $___",
                "section": "General & Neighborhood Details",
                "message": "For 'comparable properties currently offered for sale', the price range should be low to high (low price must be <= high price)."
            })

    # 1.6 Past 12 months sales text block fields:
    # "There are ___ comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $___ to $____" (All blanks mandatory)
    past_sales_val = _get_val(report_data, 'NEIGHBORHOOD', [
        "There are ___comparable sales in the subject neighborhoodwithin the past twelvemonths ranging in sale price from$___ to $____",
        "There are ___ comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $___ to $____",
        "THERE ARE ___ COMPARABLE SALES IN THE SUBJECT NEIGHBORHOOD WITHIN THE PAST TWELVE MONTHS RANGING IN SALE PRICE FROM $ ___ TO $ ___",
        "Comparable Sales in Subject Neighborhood Past 12 Months"
    ]) or _get_val(report_data, 'INFO_OF_SALES', [
        "There are ___comparable sales in the subject neighborhoodwithin the past twelvemonths ranging in sale price from$___ to $____",
        "There are ___ comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $___ to $____",
        "THERE ARE ___ COMPARABLE SALES IN THE SUBJECT NEIGHBORHOOD WITHIN THE PAST TWELVE MONTHS RANGING IN SALE PRICE FROM $ ___ TO $ ___",
        "Comparable Sales in Subject Neighborhood Past 12 Months"
    ])

    if not past_sales_val or '___' in past_sales_val:
        errors.append({
            "field": "There are ___ comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $___ to $____",
            "section": "General & Neighborhood Details",
            "message": "For 'comparable sales in the subject neighborhood within the past twelve months', all three blanks (count, low price, and high price) are mandatory and cannot be left blank."
        })
    else:
        nums = _count_numbers(past_sales_val)
        if len(nums) < 3:
            errors.append({
                "field": "There are ___ comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $___ to $____",
                "section": "General & Neighborhood Details",
                "message": "For 'comparable sales in the subject neighborhood within the past twelve months', all three values (count, low price, and high price) are mandatory and must be in number format."
            })
        elif nums[1] > nums[2]:
            errors.append({
                "field": "There are ___ comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $___ to $____",
                "section": "General & Neighborhood Details",
                "message": "For 'comparable sales in the subject neighborhood within the past twelve months', the sale price range should be low to high (low price must be <= high price)."
            })

    # 2. Cost Approach Section
    # 2.1 ESTIMATED COST NEW TYPE
    cost_new_type = _get_val(report_data, 'COST_APPROACH', [
        "ESTIMATED COST NEW TYPE", "ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW",
        "Estimated", "Cost Type", "Total Estimate of Cost-New = $ ...................", "Total Estimate of Cost-New  = $ ..................."
    ])
    if not cost_new_type:
        errors.append({
            "field": "ESTIMATED COST NEW TYPE",
            "section": "Cost Approach Section",
            "message": "'ESTIMATED COST NEW TYPE' is mandatory and cannot be blank."
        })

    # 2.2 Source of Cost Data
    cost_source = _get_val(report_data, 'COST_APPROACH', [
        "Source of Cost Data", "Source of cost data", "Cost Data Source"
    ])
    if not cost_source:
        errors.append({
            "field": "Source of Cost Data",
            "section": "Cost Approach Section",
            "message": "'Source of Cost Data' is mandatory and cannot be blank."
        })

    # 2.3 Effective Date
    cost_eff_date = _get_val(report_data, 'COST_APPROACH', [
        "Effective Date", "Effective date of cost data ", "Effective date of cost data", "Effective Date of Cost Data"
    ])
    if not cost_eff_date:
        errors.append({
            "field": "Effective Date",
            "section": "Cost Approach Section",
            "message": "'Effective Date' in Cost Approach is mandatory and cannot be blank."
        })

    # 2.4 Remaining Economic Life
    rel_val = _get_val(report_data, 'COST_APPROACH', [
        "Remaining Economic Life", "Estimated Remaining Economic Life (HUD and VA only)", "Commentary on Remaining Economic Life"
    ])
    if not rel_val:
        errors.append({
            "field": "Remaining Economic Life",
            "section": "Cost Approach Section",
            "message": "'Remaining Economic Life' is mandatory and cannot be blank."
        })

    # 2.5 OPINION OF SITE VALUE
    site_val = _get_val(report_data, 'COST_APPROACH', [
        "OPINION OF SITE VALUE", "OPINION OF SITE VALUE = $ ................................................",
        "Opinion of Site Value", "Reconciliation of Site Value"
    ])
    if not site_val:
        errors.append({
            "field": "OPINION OF SITE VALUE",
            "section": "Cost Approach Section",
            "message": "'OPINION OF SITE VALUE' is mandatory and cannot be blank."
        })

    # 2.6 INDICATED VALUE BY COST APPROACH
    cost_ind_val = _get_val(report_data, 'COST_APPROACH', [
        "INDICATED VALUE BY COST APPROACH", "Indicated Value By Cost Approach......................................................=$",
        "Indicated Value by Cost Approach", "Cost Approach Indicated Value"
    ])
    if not cost_ind_val:
        errors.append({
            "field": "INDICATED VALUE BY COST APPROACH",
            "section": "Cost Approach Section",
            "message": "'INDICATED VALUE BY COST APPROACH' is mandatory and cannot be blank."
        })

    # 3. Income Approach Section (Conditional - only mandatory if Form 1007 Rentals are detected)
    has_1007 = is_form_1007_detected(report_data, form_type)
    if has_1007:
        # 3.1 Estimated Monthly Market Rent $
        market_rent = _get_val(report_data, 'INCOME_APPROACH', [
            "Estimated Monthly Market Rent $", "Estimated Monthly Market Rent", "Market Rent"
        ])
        if not market_rent:
            errors.append({
                "field": "Estimated Monthly Market Rent $",
                "section": "Income Approach Section",
                "message": "'Estimated Monthly Market Rent $' is mandatory when Form 1007 Rentals are detected."
            })

        # 3.2 Gross Rent Multiplier (GRM)
        grm_val = _get_val(report_data, 'INCOME_APPROACH', [
            "Gross Rent Multiplier (GRM)", "Gross Rent Multiplier", "X Gross Rent Multiplier  = $",
            "X Gross Rent Multiplier = $", "X GROSS RENT MULTIPLIER = $", "GRM"
        ])
        if not grm_val:
            errors.append({
                "field": "Gross Rent Multiplier (GRM)",
                "section": "Income Approach Section",
                "message": "'Gross Rent Multiplier (GRM)' is mandatory when Form 1007 Rentals are detected."
            })

        # 3.3 Indicated Value by Income Approach
        inc_ind_val = _get_val(report_data, 'INCOME_APPROACH', [
            "Indicated Value by Income Approach", "Indicated Value by Income Approach $", "Income Approach Indicated Value"
        ])
        if not inc_ind_val:
            errors.append({
                "field": "Indicated Value by Income Approach",
                "section": "Income Approach Section",
                "message": "'Indicated Value by Income Approach' is mandatory when Form 1007 Rentals are detected."
            })

    return errors
