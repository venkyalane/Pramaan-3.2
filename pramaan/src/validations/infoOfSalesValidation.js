const normalizeField = (f) => String(f || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const checkInfoOfSalesFieldsNotBlank = (field, text) => {
    const norm = normalizeField(field);
    const isActiveListings = norm.includes('comparablepropertiescurrentlyofferedforsale');
    const isPastSales = norm.includes('comparablesales') && (norm.includes('pasttwelvemonths') || norm.includes('past12months'));

    if (!isActiveListings && !isPastSales) {
        return null;
    }

    if (!text || String(text).trim() === '' || String(text).includes('___')) {
        return {
            isError: true,
            skipBlankFilter: true,
            isMandatoryBlank: true,
            message: `'${field}' cannot be blank. All three blanks (count, low price, and high price) are mandatory.`
        };
    }

    const cleanAndValidateNumber = (val) => {
        if (!val) return false;
        const cleaned = val.replace(/[$,\s]/g, '').replace(/[.,]+$/, '');
        if (cleaned === '' || cleaned.includes('_')) return false;
        const num = Number(cleaned);
        return !isNaN(num);
    };

    const getNumericValue = (val) => {
        if (!val) return NaN;
        const cleaned = val.replace(/[$,\s]/g, '').replace(/[.,]+$/, '');
        return Number(cleaned);
    };

    const countNumbers = (str) => {
        const cleanedStr = str
            .replace(/\b12\s*[-\s]*\s*months?\b/gi, '')
            .replace(/\btwelve\s*[-\s]*\s*months?\b/gi, '');
        const matches = cleanedStr.match(/\d+(?:,\d+)*(?:\.\d+)?/g);
        return matches ? matches.length : 0;
    };

    if (isActiveListings) {
        if (countNumbers(text) !== 3) {
            return {
                isError: true,
                skipBlankFilter: true,
                isMandatoryBlank: true,
                message: "For 'comparable properties currently offered for sale', three values (count, low price, and high price) are compulsory and must be in number format."
            };
        }
        let match = String(text).match(/(?:There are\s*)?(\S+?)\s*comparable properties[\s\S]*?ranging in price from\s*\$?\s*(\S+?)\s*to\s*\$?\s*(\S+)/i);
        if (!match) {
            match = String(text).match(/^\s*\$?\s*([\d,._]+)\s*[:/,-]?\s*(?:to\s*)?\$?\s*([\d,._]+)\s*(?:to\s*|[,/-\s]\s*)\$?\s*([\d,._]+)\s*$/i);
        }
        let val1, val2, val3;
        if (match) {
            val1 = match[1];
            val2 = match[2];
            val3 = match[3];
        } else {
            const matches = String(text).match(/\d+(?:,\d+)*(?:\.\d+)?/g);
            if (matches && matches.length === 3) {
                val1 = matches[0];
                val2 = matches[1];
                val3 = matches[2];
            } else {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    isMandatoryBlank: true,
                    message: "For 'comparable properties currently offered for sale', three values (count, low price, and high price) are compulsory and must be in number format."
                };
            }
        }
        if (!cleanAndValidateNumber(val1) || !cleanAndValidateNumber(val2) || !cleanAndValidateNumber(val3)) {
            return {
                isError: true,
                skipBlankFilter: true,
                isMandatoryBlank: true,
                message: "For 'comparable properties currently offered for sale', three values (count, low price, and high price) are compulsory and must be in number format."
            };
        }
        const num2 = getNumericValue(val2);
        const num3 = getNumericValue(val3);
        if (!isNaN(num2) && !isNaN(num3) && num2 > num3) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "For 'comparable properties currently offered for sale', the price range should be low to high (the second value should be less than or equal to the third value)."
            };
        }
    }

    if (isPastSales) {
        if (countNumbers(text) !== 3) {
            return {
                isError: true,
                skipBlankFilter: true,
                isMandatoryBlank: true,
                message: "For 'comparable sales in the subject neighborhood within the past twelve months', three values (count, low price, and high price) are compulsory and must be in number format."
            };
        }
        let match = String(text).match(/(?:There are\s*)?(\S+?)\s*comparable sales[\s\S]*?ranging in sale price from\s*\$?\s*(\S+?)\s*to\s*\$?\s*(\S+)/i);
        if (!match) {
            match = String(text).match(/^\s*\$?\s*([\d,._]+)\s*[:/,-]?\s*(?:to\s*)?\$?\s*([\d,._]+)\s*(?:to\s*|[,/-\s]\s*)\$?\s*([\d,._]+)\s*$/i);
        }
        let val1, val2, val3;
        if (match) {
            val1 = match[1];
            val2 = match[2];
            val3 = match[3];
        } else {
            const cleanedStr = String(text)
                .replace(/\b12\s*[-\s]*\s*months?\b/gi, '')
                .replace(/\btwelve\s*[-\s]*\s*months?\b/gi, '');
            const matches = cleanedStr.match(/\d+(?:,\d+)*(?:\.\d+)?/g);
            if (matches && matches.length === 3) {
                val1 = matches[0];
                val2 = matches[1];
                val3 = matches[2];
            } else {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    isMandatoryBlank: true,
                    message: "For 'comparable sales in the subject neighborhood within the past twelve months', three values (count, low price, and high price) are compulsory and must be in number format."
                };
            }
        }
        if (!cleanAndValidateNumber(val1) || !cleanAndValidateNumber(val2) || !cleanAndValidateNumber(val3)) {
            return {
                isError: true,
                skipBlankFilter: true,
                isMandatoryBlank: true,
                message: "For 'comparable sales in the subject neighborhood within the past twelve months', three values (count, low price, and high price) are compulsory and must be in number format."
            };
        }
        const num2 = getNumericValue(val2);
        const num3 = getNumericValue(val3);
        if (!isNaN(num2) && !isNaN(num3) && num2 > num3) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "For 'comparable sales in the subject neighborhood within the past twelve months', the sale price range should be low to high (the second value should be less than or equal to the third value)."
            };
        }
    }

    return null;
};
