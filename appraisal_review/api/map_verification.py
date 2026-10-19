r"""
Map Address Verification Module for Pramaan Appraisal Review.

Verifies:
1. Subject Property Address from Sales Comparison Section against Location Map and Aerial Map.
2. Comparable Property Addresses & Proximity (Distance & Direction) from Sales Comparison Section
   against Location Map and Aerial Map pins.

Logic Reference:
C:\Victor\Unified-Appraisal-Map-Extractor (Computer vision color-box segmentation,
red callout boxes for Subject, blue callout boxes for Comparables, fallback OCR engines).
"""

import os
import re
import sys
import base64
import difflib
import warnings
from io import BytesIO
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

# Suppress PyTorch/EasyOCR internal deprecation and dataloader warnings
warnings.filterwarnings("ignore", category=UserWarning, module="torch.*")
warnings.filterwarnings("ignore", message=".*quantized tensor creation functions.*")
warnings.filterwarnings("ignore", message=".*pin_memory.*")

import cv2
import numpy as np
from PIL import Image

# Multi-engine PDF handler (pypdfium2, PyMuPDF, pypdf)
try:
    import pypdfium2 as pdfium
except ImportError:
    pdfium = None

try:
    import pymupdf as fitz
except Exception:
    try:
        import fitz
    except Exception:
        fitz = None

try:
    import pypdf
except ImportError:
    pypdf = None


# ---------------------------------------------------------------------------
# Regex Patterns
# ---------------------------------------------------------------------------
STREET_ADDRESS_REGEX = re.compile(
    r"\b(\d{1,5}\s+[A-Za-z0-9\.\'\-]+(?:\s+[A-Za-z0-9\.\'\-]+){0,4}\s+(?:Rd|Road|Blvd|Boulevard|Ct|Court|Ln|Lane|Ave|Avenue|St|Street|Dr|Drive|Way|Cir|Circle|Hwy|Highway|Pkwy|Parkway|Pl|Place|Terr|Terrace|Loop|Trl|Trail|Ter|Pike|Cswy|Causeway)(?:\s+(?:[NSEW]|NE|NW|SE|SW|North|South|East|West)\b)?)\b",
    re.IGNORECASE,
)

PIN_DISTANCE_REGEX = re.compile(
    r"(\d+(?:[\.,]\d+)?)\s*(?:miles?|mi)\s*([NSEW]{1,2}|North|South|East|West)?",
    re.IGNORECASE,
)

COMP_LABEL_REGEX = re.compile(
    r"(?:COMPARABLE|Comparable Sale|COMP)\s*(?:No|Sale)?[\.,:\s#]*(\d+)",
    re.IGNORECASE,
)

SUBJECT_REGEX = re.compile(
    r"SUBJECT(?:\s+PROPERTY)?[:\s]+([^\n\r]+)",
    re.IGNORECASE,
)

# Standard street suffix mappings
STREET_SUFFIX_MAP = {
    "rd": "road", "road": "road",
    "st": "street", "street": "street", "str": "street",
    "ct": "court", "court": "court",
    "dr": "drive", "drive": "drive",
    "ave": "avenue", "avenue": "avenue", "av": "avenue",
    "blvd": "boulevard", "boulevard": "boulevard",
    "ln": "lane", "lane": "lane",
    "cir": "circle", "circle": "circle",
    "pkwy": "parkway", "parkway": "parkway",
    "pl": "place", "place": "place",
    "ter": "terrace", "terr": "terrace", "terrace": "terrace",
    "hwy": "highway", "highway": "highway",
    "trl": "trail", "trail": "trail",
    "way": "way",
    "loop": "loop",
    "pike": "pike"
}

DIRECTION_MAP = {
    "n": "N", "north": "N",
    "s": "S", "south": "S",
    "e": "E", "east": "E",
    "w": "W", "west": "W",
    "ne": "NE", "northeast": "NE",
    "nw": "NW", "northwest": "NW",
    "se": "SE", "southeast": "SE",
    "sw": "SW", "southwest": "SW"
}


# ---------------------------------------------------------------------------
# Text & Address Cleaning Utilities
# ---------------------------------------------------------------------------
def clean_ocr_line(line: str) -> str:
    """Removes non-printable and leading/trailing OCR artifacts from a line."""
    if not line:
        return ""
    line = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", line)
    line = re.sub(r"^[\|\~\[\]\(\)\{\}\<\>\-\=\:\;\.\,\'\s\+\*\?\!\\]+", "", line)
    line = re.sub(r"[\|\~\[\]\(\)\{\}\<\>\-\=\:\;\.\,\'\s\+\*\?\!\\]+$", "", line)
    return line.strip()


def clean_address(addr: str) -> str:
    """Cleans up raw extracted address text."""
    if not addr:
        return ""
    addr = re.sub(r"^[^\w\d]+", "", str(addr))
    addr = re.sub(r"\s+", " ", addr)
    return addr.strip()


def normalize_address_for_comparison(addr: str) -> str:
    """
    Normalizes street address for high-accuracy comparison:
    - Lowercase, strip punctuation and extra spaces
    - Standardizes road types ('st' -> 'street', 'rd' -> 'road', etc.)
    - Standardizes directional words ('n' -> 'n', 'north' -> 'n', etc.)
    """
    if not addr:
        return ""
    
    # Strip state, zip code if attached at end (e.g., ", Yaphank, NY 11980")
    # Keep only street portion for street comparison
    s = re.split(r",\s*[A-Za-z\s]+,\s*[A-Z]{2}\b", str(addr))[0]
    s = re.split(r",\s*[A-Z]{2}\s*\d{5}", s)[0]
    
    s = s.lower()
    s = re.sub(r"[^\w\s]", " ", s)
    tokens = s.split()
    normalized_tokens = []
    
    for t in tokens:
        if t in STREET_SUFFIX_MAP:
            normalized_tokens.append(STREET_SUFFIX_MAP[t])
        elif t in DIRECTION_MAP:
            normalized_tokens.append(DIRECTION_MAP[t].lower())
        else:
            normalized_tokens.append(t)
            
    return " ".join(normalized_tokens).strip()


def extract_proximity_numbers(prox_str: str) -> Tuple[Optional[float], Optional[str]]:
    """
    Extracts numeric distance (in miles) and directional abbreviation from proximity string.
    e.g. '0.29 miles S' -> (0.29, 'S')
         '4.41 miles W' -> (4.41, 'W')
         '1.5 mi NE'    -> (1.5, 'NE')
    """
    if not prox_str:
        return None, None
    m = re.search(r"(\d+(?:[\.,]\d+)?)\s*(?:miles?|mi\b)?\s*([NSEW]{1,2}|North|South|East|West)?", str(prox_str), re.IGNORECASE)
    if not m:
        return None, None
    try:
        val = float(m.group(1).replace(",", "."))
    except (ValueError, TypeError):
        val = None
    
    raw_dir = (m.group(2) or "").strip().lower()
    norm_dir = DIRECTION_MAP.get(raw_dir, raw_dir.upper() if raw_dir else None)
    return val, norm_dir


def compare_addresses(addr1: str, addr2: str) -> Tuple[str, float]:
    """
    Compares two addresses and returns (match_status, confidence_score).
    match_status: 'MATCH' | 'PARTIAL_MATCH' | 'MISMATCH' | 'NOT_FOUND'
    """
    if not addr1 or not addr2:
        return "NOT_FOUND", 0.0
    
    norm1 = normalize_address_for_comparison(addr1)
    norm2 = normalize_address_for_comparison(addr2)
    
    if not norm1 or not norm2:
        return "NOT_FOUND", 0.0
    
    if norm1 == norm2:
        return "MATCH", 1.0
    
    # Check street numbers
    num1 = re.match(r"^(\d+[A-Za-z]?)", norm1)
    num2 = re.match(r"^(\d+[A-Za-z]?)", norm2)
    
    if num1 and num2:
        val1 = num1.group(1).upper()
        val2 = num2.group(1).upper()
        # Handle 'B' vs '8' common OCR substitution (e.g. 236B vs 2368)
        val1_norm = val1.replace('B', '8')
        val2_norm = val2.replace('B', '8')
        if val1_norm != val2_norm:
            # Different street numbers (e.g. 4 vs 49, 187 vs 189) -> Definitive mismatch
            return "MISMATCH", 0.0
        num_match = True
    elif (num1 and not num2) or (num2 and not num1):
        num_match = False
    else:
        num_match = True
    
    similarity = difflib.SequenceMatcher(None, norm1, norm2).ratio()
    
    # Substring containment (e.g. '187 Hockhockson Rd' in '187 Hockhockson Rd, Colts Neck, NJ')
    if norm1 in norm2 or norm2 in norm1:
        return "MATCH", max(similarity, 0.95)
    
    if num_match and similarity >= 0.75:
        return "MATCH", max(similarity, 0.90)
    elif similarity >= 0.88:
        return "MATCH", similarity
    elif similarity >= 0.70 and num_match:
        return "PARTIAL_MATCH", similarity
    else:
        return "MISMATCH", similarity


# ---------------------------------------------------------------------------
# OCR Engine Management (pytesseract or cached easyocr)
# ---------------------------------------------------------------------------
_easyocr_reader = None

def get_easyocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                import easyocr
                # Disable GPU check and verbose logging for clean server logs
                _easyocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        except Exception:
            _easyocr_reader = None
    return _easyocr_reader


def ocr_cropped_image(crop_bgr: np.ndarray) -> List[str]:
    """Runs OCR on cropped callout box using pytesseract (fast) or easyocr."""
    if crop_bgr is None or crop_bgr.size == 0:
        return []
    
    # 1. Try pytesseract first (very fast C++ library)
    try:
        import pytesseract
        txt = pytesseract.image_to_string(crop_bgr, config="--psm 6").strip()
        lines = [clean_ocr_line(l) for l in txt.splitlines() if clean_ocr_line(l)]
        if lines:
            return lines
    except Exception:
        pass
    
    # 2. EasyOCR
    reader = get_easyocr_reader()
    if reader is not None:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                results = reader.readtext(crop_bgr, detail=0)
            lines = [clean_ocr_line(l) for l in results if clean_ocr_line(l)]
            if lines:
                return lines
        except Exception:
            pass
            
    return []


# ---------------------------------------------------------------------------
# Map Data Extraction (Color-box segmentation from Unified Map Extractor)
# ---------------------------------------------------------------------------
def extract_map_data_from_image(pil_img: Image.Image) -> Dict[str, Any]:
    """
    Unified Appraisal Map Extractor logic:
    - Segments Light Red callout boxes -> Extracts Subject Property Address
    - Segments Light Blue callout boxes -> Extracts Comparable Pins (comp_num, address, distance, direction)
    - Fallback: OCR on whole image for provider detection and grayscale maps
    """
    cv_img = cv2.cvtColor(np.array(pil_img.convert("RGB")), cv2.COLOR_RGB2BGR)
    h, w, _ = cv_img.shape
    
    # Provider Detection
    provider = "Unknown"
    # Quick header/footer scan for provider watermark
    footer_crop = cv_img[int(h * 0.85):, :]
    footer_lines = ocr_cropped_image(footer_crop)
    footer_text = " ".join(footer_lines).lower()
    if "google" in footer_text:
        provider = "Google Maps"
    elif "bing" in footer_text or "microsoft" in footer_text:
        provider = "Bing Maps"
    elif "apple" in footer_text:
        provider = "Apple Maps"

    hsv = cv2.cvtColor(cv_img, cv2.COLOR_BGR2HSV)
    b, g, r = cv2.split(cv_img)

    # A. Blue mask (Light Blue / Blue Callout Boxes for Comparables)
    lower_blue = np.array([85, 40, 40])
    upper_blue = np.array([135, 255, 255])
    mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)
    rgb_blue = (b > r.astype(int) + 20) & (b > g.astype(int) + 10) & (b > 50)
    mask_blue = mask_blue | (rgb_blue.astype(np.uint8) * 255)

    # B. Red mask (Light Red / Red Callout Boxes for Subject)
    lower_red1 = np.array([0, 30, 30])
    upper_red1 = np.array([15, 255, 255])
    lower_red2 = np.array([165, 30, 30])
    upper_red2 = np.array([180, 255, 255])
    mask_red = cv2.inRange(hsv, lower_red1, upper_red1) | cv2.inRange(hsv, lower_red2, upper_red2)
    rgb_red = (r > b.astype(int) + 20) & (r > g.astype(int) + 15) & (r > 50)
    mask_red = mask_red | (rgb_red.astype(np.uint8) * 255)

    cnts_red, _ = cv2.findContours(mask_red, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts_blue, _ = cv2.findContours(mask_blue, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    subject_address = None
    red_box_coords = None

    # 1. Extract Subject from Red Box
    for c in cnts_red:
        x, y, bw, bh = cv2.boundingRect(c)
        area = cv2.contourArea(c)
        if 80 <= bw <= 450 and 35 <= bh <= 250 and area > 1000 and y > 10 and y + bh < h - 10:
            crop = cv_img[y:y+bh, x:x+bw]
            crop_up = cv2.resize(crop, (0, 0), fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
            lines = ocr_cropped_image(crop_up)
            
            # Check for Subject header
            subj_idx = -1
            for i, l in enumerate(lines):
                if any(k in l.upper() for k in ["SUBJECT", "SUBJECL", "SUBJ"]):
                    subj_idx = i
                    break
            
            addr_candidates = []
            start_j = subj_idx + 1 if subj_idx >= 0 else 0
            for j in range(start_j, min(start_j + 4, len(lines))):
                l = lines[j]
                if any(w in l.upper() for w in ["MILES", "COMPARABLE", "MAP DATA", "GOOGLE", "BING", "APPLE"]):
                    break
                m = STREET_ADDRESS_REGEX.search(l)
                if m:
                    addr_candidates.append(m.group(1).strip())
                elif re.search(r"\d{1,5}\s+[A-Za-z]", l):
                    addr_candidates.append(l)
            
            if not addr_candidates and len(lines) > start_j:
                addr_candidates.append(lines[start_j])
            
            candidate_str = clean_address(", ".join(addr_candidates))
            if candidate_str:
                subject_address = candidate_str
                red_box_coords = [x, y, bw, bh]
                break

    # 2. Extract Comparables from Blue Boxes
    comparables = []
    seen_addresses = set()

    for c in cnts_blue:
        x, y, bw, bh = cv2.boundingRect(c)
        area = cv2.contourArea(c)
        if 80 <= bw <= 450 and 35 <= bh <= 300 and area > 1500 and y > 10 and y + bh < h - 10:
            crop = cv_img[y:y+bh, x:x+bw]
            crop_up = cv2.resize(crop, (0, 0), fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
            lines = ocr_cropped_image(crop_up)

            comp_num = None
            comp_dist = ""
            comp_dir = ""
            comp_addr = ""

            for l in lines:
                m_lbl = COMP_LABEL_REGEX.search(l)
                if m_lbl and comp_num is None:
                    try:
                        comp_num = int(m_lbl.group(1))
                    except ValueError:
                        pass
                
                m_dist = PIN_DISTANCE_REGEX.search(l)
                if m_dist and not comp_dist:
                    d_val = m_dist.group(1).replace(",", ".")
                    comp_dist = f"{d_val} miles"
                    raw_dir = (m_dist.group(2) or "").strip().upper()
                    comp_dir = DIRECTION_MAP.get(raw_dir.lower(), raw_dir)

                m_addr = STREET_ADDRESS_REGEX.search(l)
                if m_addr and not comp_addr:
                    comp_addr = m_addr.group(1).strip()

            # Fallback if strict street regex didn't trigger
            if not comp_addr:
                for l in lines:
                    if not PIN_DISTANCE_REGEX.search(l) and not COMP_LABEL_REGEX.search(l) and re.search(r"\d{1,5}\s+[A-Za-z]{2,}", l):
                        comp_addr = l
                        break

            comp_addr = clean_address(comp_addr)
            norm_addr = comp_addr.lower()
            if norm_addr and norm_addr not in seen_addresses:
                seen_addresses.add(norm_addr)
                comparables.append({
                    "comp_num": comp_num or (len(comparables) + 1),
                    "label": f"Comparable {comp_num}" if comp_num else f"Comparable {len(comparables)+1}",
                    "address": comp_addr,
                    "distance": comp_dist,
                    "direction": comp_dir,
                    "box": [x, y, bw, bh]
                })

    comparables.sort(key=lambda x: x["comp_num"])

    return {
        "provider": provider,
        "subject_address": subject_address,
        "subject_box": red_box_coords,
        "comparables": comparables,
        "blue_boxes_count": len(comparables)
    }


# ---------------------------------------------------------------------------
# PDF/XML Document Loader & Map Extractor
# ---------------------------------------------------------------------------
def extract_maps_from_document(doc_path_or_bytes: Any) -> List[Dict[str, Any]]:
    """
    Extracts Location Map and Aerial Map pages and map images from PDF or XML file.
    Returns list of extracted maps with map_type, page, image, and extracted pins/callouts.
    """
    extracted_maps = []
    pdf_bytes = None

    if isinstance(doc_path_or_bytes, (str, Path)):
        p = Path(doc_path_or_bytes)
        if not p.exists():
            return extracted_maps
        
        # Check XML
        if p.suffix.lower() == ".xml":
            with open(p, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            m = re.search(r"<DOCUMENT>(.*?)</DOCUMENT>", content, re.DOTALL)
            if not m:
                m = re.search(r"<EMBEDDED_FILE>(.*?)</EMBEDDED_FILE>", content, re.DOTALL)
            if m:
                clean_b64 = re.sub(r"\s+", "", m.group(1))
                try:
                    pdf_bytes = base64.b64decode(clean_b64)
                except Exception:
                    pass
        else:
            with open(p, "rb") as f:
                pdf_bytes = f.read()
    elif isinstance(doc_path_or_bytes, bytes):
        pdf_bytes = doc_path_or_bytes

    if not pdf_bytes or not pdf_bytes.startswith(b"%PDF"):
        return extracted_maps

    # 1. Use pypdfium2 if available (primary Windows engine)
    if pdfium is not None:
        try:
            pdf = pdfium.PdfDocument(pdf_bytes)
            for page_idx, page in enumerate(pdf):
                page_num = page_idx + 1
                textpage = page.get_textpage()
                text_lower = textpage.get_text_range().lower()

                is_loc = any(k in text_lower for k in ["location map", "map.loc"]) or ("location map" in text_lower[:300])
                is_aer = any(k in text_lower for k in ["aerial map", "map.aerial", "map.aer", "satellite map"]) or ("aerial map" in text_lower[:300])

                if not (is_loc or is_aer):
                    continue

                map_type = "Location Map" if is_loc else "Aerial Map"

                # Extract map image object if present
                images = [obj for obj in page.get_objects() if obj.type == pdfium.raw.FPDF_PAGEOBJ_IMAGE]
                pil_img = None

                if images:
                    best_img = None
                    max_dim = 0
                    for img_obj in images:
                        try:
                            bm = img_obj.get_bitmap()
                            w, h = bm.width, bm.height
                            if w * h > max_dim:
                                max_dim = w * h
                                best_img = bm.to_pil()
                        except Exception:
                            pass
                    if best_img and (best_img.width >= 400 or best_img.height >= 400):
                        pil_img = best_img

                # Fallback: render page viewport at 150 DPI
                if pil_img is None:
                    bm = page.render(scale=2.0)
                    pil_img = bm.to_pil()

                # Run callout box segmentation
                map_data = extract_map_data_from_image(pil_img)

                # Thumbnail preview in base64
                buf = BytesIO()
                pil_img.save(buf, format="JPEG", quality=75)
                b64_preview = f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('ascii')}"

                extracted_maps.append({
                    "map_type": map_type,
                    "page": page_num,
                    "provider": map_data["provider"],
                    "width": pil_img.width,
                    "height": pil_img.height,
                    "subject_address": map_data["subject_address"],
                    "comparables": map_data["comparables"],
                    "image_preview": b64_preview,
                    "raw_image": pil_img
                })
            if extracted_maps:
                return extracted_maps
        except Exception:
            pass

    # 2. PyMuPDF fallback
    if fitz is not None:
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            for page_idx, page in enumerate(doc):
                page_num = page_idx + 1
                text_lower = (page.get_text() or "").lower()

                is_loc = any(k in text_lower for k in ["location map", "map.loc"])
                is_aer = any(k in text_lower for k in ["aerial map", "map.aerial", "map.aer", "satellite map"])

                if not (is_loc or is_aer):
                    continue

                map_type = "Location Map" if is_loc else "Aerial Map"

                # Get primary image
                pil_img = None
                img_infos = page.get_image_info(xrefs=True)
                best_xref = None
                max_area = 0
                for info in img_infos:
                    bbox = info.get("bbox", (0, 0, 0, 0))
                    area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
                    if area > max_area and info.get("xref"):
                        max_area = area
                        best_xref = info["xref"]

                if best_xref:
                    extracted = doc.extract_image(best_xref)
                    img_bytes = extracted["image"]
                    w, h = extracted.get("width", 0), extracted.get("height", 0)
                    if w >= 400 or h >= 400:
                        pil_img = Image.open(BytesIO(img_bytes)).convert("RGB")

                if pil_img is None:
                    pix = page.get_pixmap(dpi=150)
                    pil_img = Image.open(BytesIO(pix.tobytes("jpeg"))).convert("RGB")

                map_data = extract_map_data_from_image(pil_img)

                buf = BytesIO()
                pil_img.save(buf, format="JPEG", quality=75)
                b64_preview = f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('ascii')}"

                extracted_maps.append({
                    "map_type": map_type,
                    "page": page_num,
                    "provider": map_data["provider"],
                    "width": pil_img.width,
                    "height": pil_img.height,
                    "subject_address": map_data["subject_address"],
                    "comparables": map_data["comparables"],
                    "image_preview": b64_preview,
                    "raw_image": pil_img
                })
        except Exception:
            pass

    return extracted_maps


# ---------------------------------------------------------------------------
# Sales Comparison Section Data Parser
# ---------------------------------------------------------------------------
def parse_sales_comparison_data(doc_path: str, extracted_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Extracts Subject Address and Comparable properties (Address, Proximity)
    from extracted_data dict or directly from XML/PDF.
    Guarantees strict deduplication: exactly one entry per comp_num.
    """
    subject_info = {"address": "", "city": "", "state": "", "zip": ""}
    comps_by_num: Dict[int, Dict[str, Any]] = {}

    def _add_or_update_comp(num: int, addr: str, prox: str):
        if not num or num <= 0:
            return
        addr_clean = clean_address(addr)
        prox_clean = clean_address(prox)
        if num not in comps_by_num:
            comps_by_num[num] = {
                "comp_id": f"Comparable #{num}",
                "comp_num": num,
                "address": addr_clean,
                "proximity": prox_clean
            }
        else:
            if not comps_by_num[num]["address"] and addr_clean:
                comps_by_num[num]["address"] = addr_clean
            if not comps_by_num[num]["proximity"] and prox_clean:
                comps_by_num[num]["proximity"] = prox_clean

    # 1. Parse from extracted_data if provided
    if extracted_data and isinstance(extracted_data, dict):
        # Subject extraction
        subj_dict = extracted_data.get("SUBJECT") or extracted_data.get("Subject") or {}
        if isinstance(subj_dict, dict):
            subject_info["address"] = clean_address(
                subj_dict.get("Property Address")
                or subj_dict.get("Address")
                or subj_dict.get("Street Address")
                or ""
            )
            subject_info["city"] = clean_address(subj_dict.get("City") or "")
            subject_info["state"] = clean_address(subj_dict.get("State") or "")
            subject_info["zip"] = clean_address(subj_dict.get("Zip Code") or subj_dict.get("Zip") or "")

        # Sales Grid comps
        grid = extracted_data.get("SALES_GRID") or extracted_data.get("sales_grid") or {}
        if isinstance(grid, dict):
            if not subject_info["address"] and "Subject" in grid and isinstance(grid["Subject"], dict):
                subject_info["address"] = clean_address(grid["Subject"].get("Address") or "")

            for k, v in grid.items():
                if not isinstance(v, dict) or "subject" in k.lower():
                    continue
                m_c = re.search(r"(\d+)", k)
                if not m_c:
                    continue
                c_num = int(m_c.group(1))
                c_addr = v.get("Address") or ""
                c_prox = v.get("Proximity to Subject") or v.get("Proximity") or ""
                _add_or_update_comp(c_num, c_addr, c_prox)

        # Also check top-level keys in extracted_data (e.g. "Comparable #1", "COMPARABLE SALE #1")
        for k, v in extracted_data.items():
            if not isinstance(v, dict) or "comparable" not in k.lower():
                continue
            m_c = re.search(r"(\d+)", k)
            if not m_c:
                continue
            c_num = int(m_c.group(1))
            c_addr = v.get("Address") or ""
            c_prox = v.get("Proximity to Subject") or v.get("Proximity") or ""
            _add_or_update_comp(c_num, c_addr, c_prox)

    # 2. Check XML for MISMO 2.6 / 3.4 elements if file is XML
    if doc_path and os.path.exists(doc_path) and doc_path.lower().endswith(".xml"):
        try:
            from xml.etree import ElementTree as ET
            tree = ET.parse(doc_path)
            root = tree.getroot()

            # Find Subject in <PROPERTY> or <SUBJECT>
            if not subject_info["address"]:
                for elem in root.iter():
                    if elem.tag.endswith("PROPERTY"):
                        addr = elem.attrib.get("_StreetAddress") or elem.attrib.get("StreetAddress")
                        if addr:
                            subject_info["address"] = clean_address(addr)
                            subject_info["city"] = clean_address(elem.attrib.get("_City") or "")
                            subject_info["state"] = clean_address(elem.attrib.get("_State") or "")
                            subject_info["zip"] = clean_address(elem.attrib.get("_PostalCode") or "")
                            break

            # Find Subject in <COMPARABLE_SALE PropertySequenceIdentifier="0">
            if not subject_info["address"]:
                for elem in root.iter():
                    if elem.tag.endswith("COMPARABLE_SALE") and elem.attrib.get("PropertySequenceIdentifier") == "0":
                        for child in elem:
                            if child.tag.endswith("LOCATION"):
                                subject_info["address"] = clean_address(child.attrib.get("PropertyStreetAddress", ""))
                                subject_info["city"] = clean_address(child.attrib.get("PropertyCity", ""))
                                subject_info["state"] = clean_address(child.attrib.get("PropertyState", ""))
                                subject_info["zip"] = clean_address(child.attrib.get("PropertyPostalCode", ""))
                                break

            # Find Comparable Sales in XML
            for elem in root.iter():
                if elem.tag.endswith("COMPARABLE_SALE"):
                    seq_str = elem.attrib.get("PropertySequenceIdentifier")
                    try:
                        seq_num = int(seq_str) if seq_str is not None else None
                    except (ValueError, TypeError):
                        seq_num = None

                    loc = None
                    for child in elem:
                        if child.tag.endswith("LOCATION"):
                            loc = child.attrib
                            break
                    if not loc:
                        continue

                    c_addr = loc.get("PropertyStreetAddress", "")
                    c_prox = loc.get("ProximityToSubjectDescription", "")

                    if seq_num == 0:
                        if not subject_info["address"]:
                            subject_info["address"] = clean_address(c_addr)
                        continue

                    if seq_num and seq_num > 0:
                        _add_or_update_comp(seq_num, c_addr, c_prox)
        except Exception:
            pass

    comps = [comps_by_num[n] for n in sorted(comps_by_num.keys())]
    return {
        "subject": subject_info,
        "comparables": comps
    }


# ---------------------------------------------------------------------------
# Core Map Address Verification Engine
# ---------------------------------------------------------------------------
def verify_sales_comparison_to_maps(
    doc_path: str,
    extracted_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Main verification pipeline:
    1. Extracts Subject Address & Comps from Sales Comparison Section.
    2. Extracts Location Map and Aerial Map pages & callouts.
    3. Performs bidirectional cross-verification for Subject and all Comps:
       - Street address matching (normalized exact, fuzzy, or mismatch).
       - Proximity distance matching (miles) and direction matching (NE, SW, etc.).
    4. Produces structured audit report conforming to Pramaan check schema.
    """
    # 1. Parse Sales Comparison Data
    sales_data = parse_sales_comparison_data(doc_path, extracted_data)
    sales_subject = sales_data["subject"]
    sales_comps = sales_data["comparables"]

    # 2. Extract Maps
    maps = extract_maps_from_document(doc_path)
    loc_maps = [m for m in maps if m["map_type"] == "Location Map"]
    aer_maps = [m for m in maps if m["map_type"] == "Aerial Map"]

    primary_loc_map = loc_maps[0] if loc_maps else None
    primary_aer_map = aer_maps[0] if aer_maps else None

    # Fallback to XML ground-truth locations if maps had no visible text/grayscale
    # but map pages were present
    map_pins = []
    map_subject_addr = None

    if primary_loc_map:
        if primary_loc_map.get("subject_address"):
            map_subject_addr = primary_loc_map["subject_address"]
        map_pins.extend(primary_loc_map.get("comparables", []))

    if primary_aer_map:
        if not map_subject_addr and primary_aer_map.get("subject_address"):
            map_subject_addr = primary_aer_map["subject_address"]
        for ac in primary_aer_map.get("comparables", []):
            if not any(compare_addresses(ac["address"], mc["address"])[0] == "MATCH" for mc in map_pins):
                map_pins.append(ac)

    # -------------------------------------------------------------
    # Step 3: Verify Subject Address
    # -------------------------------------------------------------
    subj_sales_addr = sales_subject.get("address", "").strip()
    subj_loc_addr = primary_loc_map.get("subject_address") if primary_loc_map else None
    subj_aer_addr = primary_aer_map.get("subject_address") if primary_aer_map else None

    subj_best_map_addr = subj_loc_addr or subj_aer_addr

    if subj_sales_addr and subj_best_map_addr:
        s_status, s_conf = compare_addresses(subj_sales_addr, subj_best_map_addr)
        if s_status in ["MATCH", "PARTIAL_MATCH"]:
            subj_verif_status = "MATCH"
            subj_comment = f"Subject address '{subj_sales_addr}' verified on map callout ('{subj_best_map_addr}')."
            subj_rule_status = "Fulfilled"
        else:
            subj_verif_status = "MISMATCH"
            subj_comment = f"Discrepancy: Sales Comparison shows '{subj_sales_addr}', but map callout displays '{subj_best_map_addr}'."
            subj_rule_status = "Not Fulfilled"
    elif subj_sales_addr and not subj_best_map_addr:
        if primary_loc_map or primary_aer_map:
            # Map page was found, but callout box was not parsed
            subj_verif_status = "NEEDS_REVIEW"
            subj_comment = f"Subject address '{subj_sales_addr}' found in report; map exhibit present on page {primary_loc_map['page'] if primary_loc_map else primary_aer_map['page']}."
            subj_rule_status = "Needs Review"
        else:
            subj_verif_status = "NOT_FOUND"
            subj_comment = f"Subject address '{subj_sales_addr}' found in report, but no Location Map or Aerial Map exhibit detected."
            subj_rule_status = "Not Fulfilled"
    else:
        subj_verif_status = "NOT_APPLICABLE"
        subj_comment = "Subject property address not detected in report."
        subj_rule_status = "Not Applicable"

    subject_verification = {
        "property": "Subject Property",
        "sales_comparison_address": subj_sales_addr,
        "location_map_address": subj_loc_addr,
        "aerial_map_address": subj_aer_addr,
        "status": subj_verif_status,
        "details": subj_comment
    }

    # -------------------------------------------------------------
    # Step 4: Verify Comparables
    # -------------------------------------------------------------
    comparables_verification = []
    matched_comps_count = 0
    mismatch_comps_count = 0
    missing_comps_count = 0

    req_details = []
    # Add subject check to requirements list
    req_details.append({
        "requirement": "Subject Property Address Verification (Sales Comparison vs Maps)",
        "status": subj_rule_status,
        "value_or_comment": subj_comment
    })

    claimed_pin_indices = set()
    comp_matches: Dict[int, Dict[str, Any]] = {}

    # Pass 1: Address and Proximity matching across all comparables
    for comp in sales_comps:
        c_num = comp["comp_num"]
        c_sales_addr = comp["address"].strip()
        c_sales_prox = comp["proximity"].strip()
        c_sales_dist, c_sales_dir = extract_proximity_numbers(c_sales_prox)

        best_pin = None
        best_pin_idx = None
        best_conf = 0.0

        for idx, pin in enumerate(map_pins):
            if idx in claimed_pin_indices:
                continue
            p_addr = pin["address"]
            m_status, m_conf = compare_addresses(c_sales_addr, p_addr)

            # Check distance reinforcement
            p_dist, p_dir = extract_proximity_numbers(pin.get("distance", ""))
            dist_matched = False
            if c_sales_dist is not None and p_dist is not None:
                if abs(c_sales_dist - p_dist) <= 0.06:
                    dist_matched = True

            if dist_matched and m_conf > 0.6:
                m_conf = max(m_conf, 0.95)
                m_status = "MATCH"

            # Comp number label match reinforcement
            if pin.get("comp_num") == c_num and m_conf > 0.6:
                m_conf = max(m_conf, 0.95)
                m_status = "MATCH"

            if m_status in ["MATCH", "PARTIAL_MATCH"] and m_conf > best_conf:
                best_conf = m_conf
                best_pin = pin
                best_pin_idx = idx

        if best_pin is not None and best_pin_idx is not None:
            claimed_pin_indices.add(best_pin_idx)
            comp_matches[c_num] = {
                "comp": comp,
                "pin": best_pin,
                "status": "MATCH",
                "conf": best_conf
            }

    # Pass 2: For any comp not matched by address, check remaining unclaimed pins for explicit label match/mismatch
    for comp in sales_comps:
        c_num = comp["comp_num"]
        if c_num in comp_matches:
            continue

        best_pin = None
        best_pin_idx = None
        for idx, pin in enumerate(map_pins):
            if idx in claimed_pin_indices:
                continue
            if pin.get("comp_num") == c_num:
                best_pin = pin
                best_pin_idx = idx
                break

        if best_pin is not None and best_pin_idx is not None:
            claimed_pin_indices.add(best_pin_idx)
            comp_matches[c_num] = {
                "comp": comp,
                "pin": best_pin,
                "status": "MISMATCH",
                "conf": 0.0
            }
        else:
            comp_matches[c_num] = {
                "comp": comp,
                "pin": None,
                "status": "NOT_FOUND",
                "conf": 0.0
            }

    # Format output for each unique comparable in sequence
    for comp in sales_comps:
        c_num = comp["comp_num"]
        c_id = comp["comp_id"]
        c_sales_addr = comp["address"].strip()
        c_sales_prox = comp["proximity"].strip()
        c_sales_dist, c_sales_dir = extract_proximity_numbers(c_sales_prox)

        match_info = comp_matches.get(c_num, {})
        m_status = match_info.get("status", "NOT_FOUND")
        best_pin = match_info.get("pin")

        if m_status == "MATCH" and best_pin:
            matched_comps_count += 1
            item_status = "MATCH"
            rule_status = "Fulfilled"

            # Verify proximity/distance
            p_dist, p_dir = extract_proximity_numbers(best_pin.get("distance", ""))
            prox_notes = []
            if c_sales_dist is not None and p_dist is not None:
                if abs(c_sales_dist - p_dist) <= 0.05:
                    prox_notes.append(f"Distance verified ({c_sales_dist} mi)")
                else:
                    prox_notes.append(f"Distance variance: grid={c_sales_dist} mi vs map={p_dist} mi")
            if c_sales_dir and p_dir:
                if c_sales_dir == p_dir:
                    prox_notes.append(f"Direction verified ({c_sales_dir})")
                else:
                    prox_notes.append(f"Direction: grid={c_sales_dir} vs map={p_dir}")

            prox_comment = f" ({'; '.join(prox_notes)})" if prox_notes else ""
            c_comment = f"{c_id} address '{c_sales_addr}' verified on map pin ('{best_pin['address']}'){prox_comment}."
            map_addr = best_pin.get("address")
            map_prox = f"{best_pin.get('distance', '')} {best_pin.get('direction', '')}".strip()
            map_lbl = best_pin.get("label")
        elif m_status == "MISMATCH" and best_pin:
            mismatch_comps_count += 1
            item_status = "MISMATCH"
            rule_status = "Not Fulfilled"
            c_comment = f"Discrepancy: {c_id} in Sales Grid shows '{c_sales_addr}', but map pin #{best_pin.get('comp_num')} shows '{best_pin['address']}'."
            map_addr = best_pin.get("address")
            map_prox = f"{best_pin.get('distance', '')} {best_pin.get('direction', '')}".strip()
            map_lbl = best_pin.get("label")
        else:
            missing_comps_count += 1
            item_status = "NOT_FOUND"
            map_addr = None
            map_prox = None
            map_lbl = None
            if len(maps) > 0:
                rule_status = "Needs Review"
                prox_part = f" ({c_sales_prox})" if c_sales_prox else ""
                c_comment = f"{c_id} '{c_sales_addr}'{prox_part} present in Sales Grid; map pin callout not detected."
            else:
                rule_status = "Not Fulfilled"
                c_comment = f"{c_id} '{c_sales_addr}' found in Sales Grid, but no map exhibits were detected in report."

        req_details.append({
            "requirement": f"{c_id} Address & Proximity Verification",
            "status": rule_status,
            "value_or_comment": c_comment
        })

        comparables_verification.append({
            "comp_id": c_id,
            "comp_num": c_num,
            "sales_comparison_address": c_sales_addr,
            "sales_comparison_proximity": c_sales_prox,
            "map_address": map_addr,
            "map_proximity": map_prox,
            "map_label": map_lbl,
            "status": item_status,
            "details": c_comment
        })

    # Summary calculations
    total_props = 1 + len(sales_comps)
    fulfilled_count = sum(1 for r in req_details if r["status"] == "Fulfilled")
    
    if mismatch_comps_count > 0 or subj_verif_status == "MISMATCH":
        overall_status = "FAIL"
    elif fulfilled_count == total_props:
        overall_status = "PASS"
    elif fulfilled_count > 0:
        overall_status = "WARNING"
    else:
        overall_status = "NEEDS_REVIEW"

    summary_text = (
        f"Map address verification completed: {fulfilled_count} of {total_props} properties verified "
        f"against Location and Aerial map callouts."
    )

    # Clean maps list for JSON serialization (remove PIL images)
    serializable_maps = []
    for m in maps:
        serializable_maps.append({
            "map_type": m["map_type"],
            "page": m["page"],
            "provider": m["provider"],
            "width": m["width"],
            "height": m["height"],
            "subject_address": m.get("subject_address"),
            "comparables_count": len(m.get("comparables", [])),
            "image_preview": m.get("image_preview")
        })

    return {
        "summary": summary_text,
        "fulfilled_count": fulfilled_count,
        "total_count": total_props,
        "overall_status": overall_status,
        "details": req_details,
        "verification_data": {
            "overall_status": overall_status,
            "maps_detected": serializable_maps,
            "maps_count": len(serializable_maps),
            "subject_verification": subject_verification,
            "comparables_verification": comparables_verification,
            "summary_metrics": {
                "total_properties": total_props,
                "verified_count": fulfilled_count,
                "matched_count": matched_comps_count + (1 if subj_verif_status == "MATCH" else 0),
                "mismatch_count": mismatch_comps_count + (1 if subj_verif_status == "MISMATCH" else 0),
                "missing_count": missing_comps_count
            }
        }
    }
