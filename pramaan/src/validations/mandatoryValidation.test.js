import {
    MANDATORY_FIELDS_CONFIG,
    isForm1007Detected,
    isMandatoryField,
    checkMandatoryField,
    validateAllMandatoryFields,
    fieldMatchesConfig
} from './mandatoryValidation';

describe('Mandatory Validation Rules - Frontend Suite', () => {

    describe('Field Name Matching & False-Positive Prevention', () => {
        test('"City" matches City aliases but DOES NOT falsely match "Electricity"', () => {
            expect(isMandatoryField('City')).toBe(true);
            expect(isMandatoryField('Subject City')).toBe(true);
            expect(isMandatoryField('Electricity')).toBe(false);
            expect(isMandatoryField('Electricity Detail')).toBe(false);
        });

        test('Appraiser Fee aliases match', () => {
            expect(isMandatoryField('Appraiser Fee')).toBe(true);
            expect(isMandatoryField("Appraiser's Fee")).toBe(true);
            expect(isMandatoryField('Appraisal Fee')).toBe(true);
        });

        test('Zip Code aliases match', () => {
            expect(isMandatoryField('Zip Code')).toBe(true);
            expect(isMandatoryField('Postal Code')).toBe(true);
            expect(isMandatoryField('ZipCode')).toBe(true);
        });
    });

    describe('General & Neighborhood Details Validation', () => {
        test('City cannot be blank', () => {
            const res = checkMandatoryField('City', '');
            expect(res.isError).toBe(true);
            expect(res.message).toContain("'City' is mandatory and cannot be blank.");

            const validRes = checkMandatoryField('City', 'Austin');
            expect(validRes.isMatch).toBe(true);
        });

        test('Appraiser Fee cannot be blank', () => {
            const res = checkMandatoryField('Appraiser Fee', '');
            expect(res.isError).toBe(true);
            expect(res.message).toContain("'Appraiser Fee' is mandatory and cannot be blank.");

            const validRes = checkMandatoryField('Appraiser Fee', '$550');
            expect(validRes.isMatch).toBe(true);
        });

        test('Zip Code cannot be blank', () => {
            const res = checkMandatoryField('Zip Code', '');
            expect(res.isError).toBe(true);
            expect(res.message).toContain("'Zip Code' is mandatory and cannot be blank.");

            const validRes = checkMandatoryField('Zip Code', '78701');
            expect(validRes.isMatch).toBe(true);
        });

        describe('Utilities & Off-Site Improvements', () => {
            const field = 'Are the utilities and off-site improvements typical for the market area?';

            test('Errors when blank', () => {
                const res = checkMandatoryField(field, '');
                expect(res.isError).toBe(true);
                expect(res.message).toContain('Selection is required');
            });

            test('Errors when not Yes or No', () => {
                const res = checkMandatoryField(field, 'Unknown');
                expect(res.isError).toBe(true);
                expect(res.message).toContain("must be answered 'Yes' or 'No'");
            });

            test('Errors when No without description', () => {
                const res = checkMandatoryField(field, 'No');
                expect(res.isError).toBe(true);
                expect(res.message).toContain("requires a description when answered 'No'");
            });

            test('Passes when Yes or No with description', () => {
                const yesRes = checkMandatoryField(field, 'Yes');
                expect(yesRes.isMatch).toBe(true);

                const noRes = checkMandatoryField(field, 'No, well and septic in area');
                expect(noRes.isMatch).toBe(true);
            });
        });

        describe('Active Listings Text Block', () => {
            const field = 'There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from $___ to $___';

            test('Errors when unfilled with blanks or empty', () => {
                const res1 = checkMandatoryField(field, '');
                expect(res1.isError).toBe(true);

                const res2 = checkMandatoryField(field, 'There are ___ comparable properties currently offered for sale in the subject neighborhood ranging in price from $___ to $___');
                expect(res2.isError).toBe(true);
                expect(res2.message).toContain('all three blanks');
            });

            test('Errors when missing 3 numbers', () => {
                const res = checkMandatoryField(field, 'There are 5 comparable properties ranging in price from $300,000');
                expect(res.isError).toBe(true);
                expect(res.message).toContain('three values (count, low price, and high price) are compulsory');
            });

            test('Errors when low price > high price', () => {
                const res = checkMandatoryField(field, 'There are 5 comparable properties ranging in price from $450,000 to $350,000');
                expect(res.isError).toBe(true);
                expect(res.message).toContain('low price must be <= high price');
            });

            test('Passes when filled with 3 valid numbers in ascending price order', () => {
                const res = checkMandatoryField(field, 'There are 4 comparable properties currently offered for sale in the subject neighborhood ranging in price from $350,000 to $500,000');
                expect(res.isMatch).toBe(true);
            });
        });

        describe('Past 12 Months Sales Text Block', () => {
            const field = 'There are ___ comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $___ to $____';

            test('Errors when unfilled or missing numbers', () => {
                const res1 = checkMandatoryField(field, '');
                expect(res1.isError).toBe(true);

                const res2 = checkMandatoryField(field, 'There are ___ comparable sales ranging in price from $___ to $___');
                expect(res2.isError).toBe(true);
                expect(res2.message).toContain('all three blanks');
            });

            test('Properly parses 3 values despite the word "twelve"', () => {
                const res = checkMandatoryField(field, 'There are 8 comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $320,000 to $480,000');
                expect(res.isMatch).toBe(true);
            });

            test('Errors when low price > high price', () => {
                const res = checkMandatoryField(field, 'There are 8 comparable sales within the past 12 months ranging in sale price from $500,000 to $400,000');
                expect(res.isError).toBe(true);
                expect(res.message).toContain('low price must be <= high price');
            });
        });
    });

    describe('Cost Approach Section Validation', () => {
        const costFields = [
            ['ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW', 'ESTIMATED COST NEW TYPE'],
            ['Source of cost data', 'Source of Cost Data'],
            ['Effective date of cost data ', 'Effective Date'],
            ['Estimated Remaining Economic Life (HUD and VA only)', 'Remaining Economic Life'],
            ['OPINION OF SITE VALUE = $ ................................................', 'OPINION OF SITE VALUE'],
            ['Indicated Value By Cost Approach......................................................=$', 'INDICATED VALUE BY COST APPROACH']
        ];

        test.each(costFields)('Errors when blank: %s (%s)', (alias, label) => {
            const res = checkMandatoryField(alias, '', {}, ['COST_APPROACH', alias]);
            expect(res.isError).toBe(true);
            expect(res.message).toContain('is mandatory and cannot be blank');

            const validRes = checkMandatoryField(alias, 'Valid Value', {}, ['COST_APPROACH', alias]);
            expect(validRes.isMatch).toBe(true);
        });
    });

    describe('Income Approach Section (Conditional on Form 1007)', () => {
        const rentField = 'Estimated Monthly Market Rent $';
        const grmField = 'X Gross Rent Multiplier  = $';
        const indicatedField = 'Indicated Value by Income Approach';

        test('Not mandatory when Form 1007 is NOT detected', () => {
            const regularData = { formType: '1004' };
            expect(isForm1007Detected(regularData, '1004')).toBe(false);

            expect(isMandatoryField(rentField, regularData, '1004')).toBe(false);
            expect(checkMandatoryField(rentField, '', regularData, null, null, '1004')).toBeNull();
            expect(checkMandatoryField(grmField, '', regularData, null, null, '1004')).toBeNull();
            expect(checkMandatoryField(indicatedField, '', regularData, null, null, '1004')).toBeNull();
        });

        test('Sales comparison comps (COMPARABLE NO. 1, 2, 3) DO NOT trigger Form 1007 detection', () => {
            const data1004WithSalesComps = {
                formType: '1004',
                'COMPARABLE NO. 1': { 'Sale Price': '$450,000', 'Address': '123 Main St' },
                'COMPARABLE NO. 2': { 'Sale Price': '$460,000', 'Address': '456 Oak St' },
                'COMPARABLE NO. 3': { 'Sale Price': '$440,000', 'Address': '789 Pine St' }
            };
            expect(isForm1007Detected(data1004WithSalesComps, '1004')).toBe(false);
            expect(isMandatoryField(rentField, data1004WithSalesComps, '1004')).toBe(false);
            expect(checkMandatoryField(rentField, '', data1004WithSalesComps, null, null, '1004')).toBeNull();
            expect(checkMandatoryField(grmField, '', data1004WithSalesComps, null, null, '1004')).toBeNull();
            expect(checkMandatoryField(indicatedField, '', data1004WithSalesComps, null, null, '1004')).toBeNull();

            // Full report validation must NOT require Income Approach fields
            const result = validateAllMandatoryFields(data1004WithSalesComps, '1004');
            expect(result.missingCount).toBe(12);
            expect(result.errors.some(e => e.section === 'Income Approach Section')).toBe(false);
        });

        test('Mandatory when Form 1007 is detected via formType', () => {
            const data1007 = { formType: '1004 + 1007' };
            expect(isForm1007Detected(data1007, '1004 + 1007')).toBe(true);

            expect(isMandatoryField(rentField, data1007, '1004 + 1007')).toBe(true);

            const rentRes = checkMandatoryField(rentField, '', data1007, null, null, '1004 + 1007');
            expect(rentRes.isError).toBe(true);
            expect(rentRes.message).toContain('Estimated Monthly Market Rent');

            const grmRes = checkMandatoryField(grmField, '', data1007, null, null, '1004 + 1007');
            expect(grmRes.isError).toBe(true);
            expect(grmRes.message).toContain('Gross Rent Multiplier');

            const indRes = checkMandatoryField(indicatedField, '', data1007, null, null, '1004 + 1007');
            expect(indRes.isError).toBe(true);
            expect(indRes.message).toContain('Indicated Value by Income Approach');
        });

        test('Mandatory when Form 1007 is detected via comparable rental data', () => {
            const dataWithRentals = {
                formType: '1004',
                'COMPARABLE Rental No #1': { 'Rental Price': '$2,400' }
            };
            expect(isForm1007Detected(dataWithRentals, '1004')).toBe(true);

            const rentRes = checkMandatoryField(rentField, '', dataWithRentals, null, null, '1004');
            expect(rentRes.isError).toBe(true);
        });
    });

    describe('validateAllMandatoryFields Full Report Validation', () => {
        test('Reports all missing mandatory fields for an empty report', () => {
            const result = validateAllMandatoryFields({}, '1004');
            expect(result.isValid).toBe(false);
            // 6 General + 6 Cost = 12 missing (Income approach is conditional and 1007 not detected)
            expect(result.missingCount).toBe(12);
        });

        test('Reports 15 missing mandatory fields when Form 1007 is detected', () => {
            const result = validateAllMandatoryFields({ formType: '1007' }, '1007');
            expect(result.isValid).toBe(false);
            // 6 General + 6 Cost + 3 Income = 15 missing
            expect(result.missingCount).toBe(15);
        });

        test('Passes validation when all mandatory fields are correctly filled', () => {
            const validData = {
                formType: '1004',
                Subject: {
                    'City': 'Dallas',
                    'Appraiser Fee': '$600',
                    'Zip Code': '75001'
                },
                SITE: {
                    'Are the utilities and off-site improvements typical for the market area?': 'Yes'
                },
                NEIGHBORHOOD: {
                    'There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from $___ to $___':
                        'There are 6 comparable properties currently offered for sale in the subject neighborhood ranging in price from $250,000 to $400,000',
                    'There are ___ comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $___ to $____':
                        'There are 10 comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $260,000 to $420,000'
                },
                COST_APPROACH: {
                    'ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW': 'Replacement',
                    'Source of cost data': 'Marshall & Swift',
                    'Effective date of cost data ': '01/2026',
                    'Estimated Remaining Economic Life (HUD and VA only)': '50 Years',
                    'OPINION OF SITE VALUE = $ ................................................': '$85,000',
                    'Indicated Value By Cost Approach......................................................=$': '$380,000'
                }
            };

            const result = validateAllMandatoryFields(validData, '1004');
            expect(result.isValid).toBe(true);
            expect(result.missingCount).toBe(0);
            expect(result.errors).toHaveLength(0);
        });
    });
});
