import os
import unittest
from unittest.mock import AsyncMock, patch
import tempfile
from pathlib import Path

from api.utils import send_email

class SendEmailTests(unittest.IsolatedAsyncioTestCase):
    @patch('api.utils.aiosmtplib')
    async def test_send_email_attachment_limits(self, mock_aiosmtplib):
        mock_aiosmtplib.send = AsyncMock()
        
        with tempfile.TemporaryDirectory() as tmpdir:
            file_small = Path(tmpdir) / "small.txt"
            file_small.write_text("small file content")
            
            file_large = Path(tmpdir) / "large.pdf"
            with open(file_large, "wb") as f:
                f.write(b"x" * (19 * 1024 * 1024))
                
            attachments = [str(file_small), str(file_large)]
            
            with patch.dict(os.environ, {"EMAIL_PASS": "test_pass", "EMAIL_USER": "test@gmail.com"}):
                await send_email(
                    subject="Test Subject",
                    body_text="Initial body text.",
                    attachment_paths=attachments,
                )
                
                self.assertTrue(mock_aiosmtplib.send.called)
                sent_msg = mock_aiosmtplib.send.call_args[0][0]
                
                body_content = ""
                for part in sent_msg.walk():
                    if part.get_content_type() == "text/plain":
                        body_content = part.get_content()
                        break
                body_content = body_content.strip()
                self.assertIn("Initial body text.", body_content)
                self.assertIn("⚠️ Note: The following attachment(s) were omitted", body_content)
                self.assertIn("large.pdf", body_content)
                
                attachments_list = list(sent_msg.iter_attachments())
                self.assertEqual(len(attachments_list), 1)
                self.assertEqual(attachments_list[0].get_filename(), "small.txt")


class FastAppFilterTests(unittest.TestCase):
    def test_parse_datetime_various_formats(self):
        from api.automation_fastapp import parse_datetime
        from datetime import datetime
        
        self.assertEqual(parse_datetime("2026-07-10T15:04:03"), datetime(2026, 7, 10, 15, 4, 3))
        self.assertEqual(parse_datetime("2026-07-10T15:04"), datetime(2026, 7, 10, 15, 4))
        self.assertEqual(parse_datetime("2026-07-10"), datetime(2026, 7, 10))
        
        self.assertEqual(parse_datetime("07/10/2026 03:04:03 PM"), datetime(2026, 7, 10, 15, 4, 3))
        self.assertEqual(parse_datetime("07/10/2026 3:04 PM"), datetime(2026, 7, 10, 15, 4))
        self.assertEqual(parse_datetime("7/10/26 3:04 PM"), datetime(2026, 7, 10, 15, 4))
        
        self.assertIsNone(parse_datetime(""))
        self.assertIsNone(parse_datetime(None))
        self.assertIsNone(parse_datetime("invalid date"))

    def test_find_date_column_index_from_headers(self):
        from api.automation_fastapp import find_date_column_index
        
        headers = ["order id", "appraiser", "date submitted", "status"]
        self.assertEqual(find_date_column_index(headers, None), 2)
        
        headers2 = ["order id", "received time", "status"]
        self.assertEqual(find_date_column_index(headers2, None), 1)

    def test_find_date_column_index_from_rows_fallback(self):
        from api.automation_fastapp import find_date_column_index
        from unittest.mock import MagicMock
        
        mock_rows = MagicMock()
        mock_rows.count.return_value = 3
        
        mock_row1 = MagicMock()
        mock_row1.count.return_value = 3
        mock_col1_0 = MagicMock()
        mock_col1_0.inner_text.return_value = "001-2345"
        mock_col1_1 = MagicMock()
        mock_col1_1.inner_text.return_value = "File in review"
        mock_col1_2 = MagicMock()
        mock_col1_2.inner_text.return_value = "07/10/2026 03:04 PM"
        
        def nth_col(idx):
            return [mock_col1_0, mock_col1_1, mock_col1_2][idx]
            
        mock_row1.locator.return_value.nth = nth_col
        mock_row1.locator.return_value.count.return_value = 3
        
        mock_row2 = MagicMock()
        mock_row2.count.return_value = 3
        mock_col2_0 = MagicMock()
        mock_col2_0.inner_text.return_value = "001-2346"
        mock_col2_1 = MagicMock()
        mock_col2_1.inner_text.return_value = "File in review"
        mock_col2_2 = MagicMock()
        mock_col2_2.inner_text.return_value = "07/09/2026 01:15 AM"
        
        def nth_col2(idx):
            return [mock_col2_0, mock_col2_1, mock_col2_2][idx]
            
        mock_row2.locator.return_value.nth = nth_col2
        mock_row2.locator.return_value.count.return_value = 3
        
        def nth_row(idx):
            return [None, mock_row1, mock_row2][idx]
            
        mock_rows.nth = nth_row
        
        self.assertEqual(find_date_column_index([], mock_rows), 2)


class MandatoryValidationTests(unittest.TestCase):
    def get_valid_data(self):
        return {
            "Subject": {
                "City": "Los Angeles",
                "Appraiser Fee": "$450",
                "Zip Code": "90001",
            },
            "SITE": {
                "Are the utilities and off-site improvements typical for the market area?": "Yes"
            },
            "NEIGHBORHOOD": {
                "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from $___ to $___":
                    "There are 5 comparable properties currently offered for sale in the subject neighborhood ranging in price from $400,000 to $550,000",
                "There are ___ comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $___ to $____":
                    "There are 12 comparable sales in the subject neighborhood within the past twelve months ranging in sale price from $380,000 to $560,000"
            },
            "COST_APPROACH": {
                "ESTIMATED COST NEW TYPE": "Replacement",
                "Source of Cost Data": "Marshall & Swift",
                "Effective Date": "10/2026",
                "Remaining Economic Life": "55 years",
                "OPINION OF SITE VALUE": "$150,000",
                "INDICATED VALUE BY COST APPROACH": "$520,000"
            }
        }

    def test_valid_data_passes(self):
        from api.mandatory_validation import validate_appraisal_mandatory_fields
        data = self.get_valid_data()
        errors = validate_appraisal_mandatory_fields(data)
        self.assertEqual(len(errors), 0)

    def test_missing_general_fields_fails(self):
        from api.mandatory_validation import validate_appraisal_mandatory_fields
        data = self.get_valid_data()
        data["Subject"]["City"] = ""
        data["Subject"]["Appraiser Fee"] = ""
        data["Subject"]["Zip Code"] = ""
        data["SITE"]["Are the utilities and off-site improvements typical for the market area?"] = ""

        errors = validate_appraisal_mandatory_fields(data)
        fields_with_errors = [e["field"] for e in errors]
        self.assertIn("City", fields_with_errors)
        self.assertIn("Appraiser Fee", fields_with_errors)
        self.assertIn("Zip Code", fields_with_errors)
        self.assertIn("Are the utilities and off-site improvements typical for the market area?", fields_with_errors)

    def test_text_block_fields_incomplete_fails(self):
        from api.mandatory_validation import validate_appraisal_mandatory_fields
        data = self.get_valid_data()
        data["NEIGHBORHOOD"]["There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from $___ to $___"] = \
            "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from $400,000 to $___"

        errors = validate_appraisal_mandatory_fields(data)
        fields_with_errors = [e["field"] for e in errors]
        self.assertIn("There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from $___ to $___", fields_with_errors)

    def test_missing_cost_approach_fields_fails(self):
        from api.mandatory_validation import validate_appraisal_mandatory_fields
        data = self.get_valid_data()
        data["COST_APPROACH"] = {}

        errors = validate_appraisal_mandatory_fields(data)
        fields_with_errors = [e["field"] for e in errors]
        self.assertIn("ESTIMATED COST NEW TYPE", fields_with_errors)
        self.assertIn("Source of Cost Data", fields_with_errors)
        self.assertIn("Effective Date", fields_with_errors)
        self.assertIn("Remaining Economic Life", fields_with_errors)
        self.assertIn("OPINION OF SITE VALUE", fields_with_errors)
        self.assertIn("INDICATED VALUE BY COST APPROACH", fields_with_errors)

    def test_conditional_income_approach_required_when_1007_present(self):
        from api.mandatory_validation import validate_appraisal_mandatory_fields
        data = self.get_valid_data()
        data["form_type"] = "1004 + 1007"
        # No income approach data provided yet
        errors = validate_appraisal_mandatory_fields(data)
        fields_with_errors = [e["field"] for e in errors]
        self.assertIn("Estimated Monthly Market Rent $", fields_with_errors)
        self.assertIn("Gross Rent Multiplier (GRM)", fields_with_errors)
        self.assertIn("Indicated Value by Income Approach", fields_with_errors)

        # Now supply income approach fields
        data["INCOME_APPROACH"] = {
            "Estimated Monthly Market Rent $": "$2,800",
            "Gross Rent Multiplier (GRM)": "180",
            "Indicated Value by Income Approach": "$504,000"
        }
        errors2 = validate_appraisal_mandatory_fields(data)
        self.assertEqual(len(errors2), 0)

    def test_income_approach_not_required_when_no_1007(self):
        from api.mandatory_validation import validate_appraisal_mandatory_fields
        data = self.get_valid_data()
        data["form_type"] = "1004"
        errors = validate_appraisal_mandatory_fields(data)
        self.assertEqual(len(errors), 0)

    def test_model_clean_raises_validation_error(self):
        from django.core.exceptions import ValidationError
        from api.models import AppraisalReport
        bad_data = {"Subject": {}}
        report = AppraisalReport(report_data=bad_data)
        with self.assertRaises(ValidationError):
            report.clean()


class Form1004And1007ExtractionTests(unittest.TestCase):
    def test_xml_extract_1004_1007_all_sections(self):
        from api.xml_extractor import extract_fields_from_xml
        sample_path = r"c:\Victor\Pramaan-3.5-regex-1\2.6\1004+1007\210963 1004-1007.XML"
        if not os.path.exists(sample_path):
            self.skipTest("Sample XML file not found.")

        result = extract_fields_from_xml(sample_path, extract_images=False, original_filename="210963 1004-1007.XML")
        self.assertEqual(result.get("status"), "success")
        self.assertEqual(result.get("form_type"), "1004 + 1007")
        self.assertTrue(result.get("has_1007"))

        fields = result.get("fields", {})
        # Verify 1004 Sections
        self.assertIn("Subject", fields)
        self.assertIn("CONTRACT", fields)
        self.assertIn("NEIGHBORHOOD", fields)
        self.assertIn("SITE", fields)
        self.assertIn("IMPROVEMENTS", fields)
        self.assertIn("SALES_GRID", fields)
        self.assertIn("INFO_OF_SALES", fields)
        self.assertIn("RECONCILIATION", fields)
        self.assertIn("INCOME_APPROACH", fields)
        self.assertIn("CERTIFICATION", fields)

        # Verify 1007 Rental Sections
        self.assertIn("COMPARABLE NO. 1", fields)
        self.assertIn("COMPARABLE NO. 2", fields)
        self.assertIn("COMPARABLE NO. 3", fields)
        self.assertIn("RENT_SCHEDULE_RECONCILIATION", fields)
        self.assertIn("TO BE $", fields)
        self.assertTrue(bool(fields["TO BE $"]))




