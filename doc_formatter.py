import os
import re
import docx
from docx.shared import Inches, Pt
from docx.enum.table import WD_ROW_HEIGHT_RULE
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls, qn

def format_math_document(docx_path: str) -> None:
    """
    Applies comprehensive, automated layout and styling to math documents:
      1. Dynamic 2-page pagination:
         - 3 Tools: Page 1 = Part 1 (Tools 1, 2, 3); Page 2 = Part 2 (Fix the Mistake) + Part 3 (CYU)
         - 2 Tools: Page 1 = Part 1 (Tools 1, 2) + Part 2; Page 2 = Part 3 (CYU)
      2. Table proportions:
         - Tool tables: compact 5.0" width (Problem 3.2", Steps 1.8")
         - Fix the Mistake table: full 6.5" width (Problem 4.0", Correct Steps 2.5")
      3. Crisp dark grey borders (#555555) and soft grey header shading (#E8EDF2)
      4. Generous cell padding and controlled minimum row heights for student work
      5. Dynamic spacing for Check Your Understanding questions to balance Page 2
    """
    try:
        doc = docx.Document(docx_path)
    except Exception as e:
        print(f"Warning: Could not open document for formatting: {e}")
        return

    w_ns = nsdecls("w")
    BORDER_COLOR = "555555"
    HEADER_BG = "E8EDF2"

    # -------------------------------------------------------------
    # 1. ANALYZE DOCUMENT CONTENT (COUNT TOOLS & FIND SECTIONS)
    # -------------------------------------------------------------
    tool_paragraphs = []
    p_part1 = None
    p_part2 = None
    p_part3 = None
    cyu_paragraphs = []

    current_section = None

    for p in doc.paragraphs:
        text = p.text.strip()
        text_upper = text.upper()

        if "PART 1" in text_upper:
            p_part1 = p
            current_section = "PART1"
        elif "PART 2" in text_upper:
            p_part2 = p
            current_section = "PART2"
        elif "PART 3" in text_upper or "CHECK YOUR UNDERSTANDING" in text_upper:
            p_part3 = p
            current_section = "PART3"
        elif current_section == "PART1" and re.match(r"^Tool\s*\d+", text, re.IGNORECASE):
            tool_paragraphs.append(p)
        elif current_section == "PART3" and text:
            cyu_paragraphs.append(p)

    tool_count = len(tool_paragraphs)
    # If no tool paragraphs matched by regex, count tables before Part 2
    if tool_count == 0:
        tool_count = min(3, len(doc.tables))

    # -------------------------------------------------------------
    # 2. DYNAMIC PAGE BREAK RULES
    # -------------------------------------------------------------
    if tool_count >= 3:
        # Case A: 3 Tools -> Page break before Part 2
        if p_part2 is not None:
            p_part2.paragraph_format.page_break_before = True
        if p_part3 is not None:
            p_part3.paragraph_format.page_break_before = False
        cyu_spacing_after = Pt(16)
        cyu_spacing_before = Pt(4)
    else:
        # Case B: 2 Tools -> Part 2 stays on Page 1, Page break before Part 3 (CYU)
        if p_part2 is not None:
            p_part2.paragraph_format.page_break_before = False
        if p_part3 is not None:
            p_part3.paragraph_format.page_break_before = True
        cyu_spacing_after = Pt(30)  # Generous space to fill Page 2
        cyu_spacing_before = Pt(6)

    # -------------------------------------------------------------
    # 3. FORMAT TABLES (WIDTHS, BORDERS, SHADING, PADDING, ROW HEIGHT)
    # -------------------------------------------------------------
    borders_xml = (
        f'<w:tblBorders {w_ns}>'
        f'<w:top w:val="single" w:sz="8" w:space="0" w:color="{BORDER_COLOR}"/>'
        f'<w:left w:val="single" w:sz="8" w:space="0" w:color="{BORDER_COLOR}"/>'
        f'<w:bottom w:val="single" w:sz="8" w:space="0" w:color="{BORDER_COLOR}"/>'
        f'<w:right w:val="single" w:sz="8" w:space="0" w:color="{BORDER_COLOR}"/>'
        f'<w:insideH w:val="single" w:sz="6" w:space="0" w:color="{BORDER_COLOR}"/>'
        f'<w:insideV w:val="single" w:sz="6" w:space="0" w:color="{BORDER_COLOR}"/>'
        f'</w:tblBorders>'
    )

    cell_mar_xml = (
        f'<w:tblCellMar {w_ns}>'
        f'<w:top w:w="140" w:type="dxa"/>'
        f'<w:bottom w:w="140" w:type="dxa"/>'
        f'<w:left w:w="180" w:type="dxa"/>'
        f'<w:right w:w="180" w:type="dxa"/>'
        f'</w:tblCellMar>'
    )

    cant_split_xml = f'<w:cantSplit {w_ns}/>'
    tbl_header_xml = f'<w:tblHeader {w_ns}/>'
    valign_center_xml = f'<w:vAlign {w_ns} w:val="center"/>'
    shd_header_xml = f'<w:shd {w_ns} w:fill="{HEADER_BG}"/>'
    jc_left_xml = f'<w:jc {w_ns} w:val="left"/>'

    for table in doc.tables:
        table.autofit = False
        tblPr = table._tbl.tblPr

        # Apply borders
        existing_borders = tblPr.find(qn("w:tblBorders"))
        if existing_borders is not None:
            tblPr.remove(existing_borders)
        tblPr.append(parse_xml(borders_xml))

        # Apply cell margins
        existing_mar = tblPr.find(qn("w:tblCellMar"))
        if existing_mar is not None:
            tblPr.remove(existing_mar)
        tblPr.append(parse_xml(cell_mar_xml))

        # Left alignment
        existing_jc = tblPr.find(qn("w:jc"))
        if existing_jc is not None:
            tblPr.remove(existing_jc)
        tblPr.append(parse_xml(jc_left_xml))

        # Determine table column widths
        first_row_text = " ".join([c.text.lower() for c in table.rows[0].cells])
        is_fix_mistake = ("correct" in first_row_text or "mistake" in first_row_text)

        if len(table.columns) == 2:
            if is_fix_mistake:
                col_widths = [4.0, 2.5]       # 6.5" total
                min_body_height = Inches(0.85)
            else:
                col_widths = [3.2, 1.8]       # 5.0" compact Tool width
                min_body_height = Inches(0.95)
        else:
            col_widths = [6.5 / len(table.columns)] * len(table.columns)
            min_body_height = Inches(0.7)

        total_width_dxa = int(sum(col_widths) * 1440)
        tblW_xml = f'<w:tblW {w_ns} w:w="{total_width_dxa}" w:type="dxa"/>'
        existing_tblW = tblPr.find(qn("w:tblW"))
        if existing_tblW is not None:
            tblPr.remove(existing_tblW)
        tblPr.append(parse_xml(tblW_xml))

        # Format rows and cells
        for r_idx, row in enumerate(table.rows):
            trPr = row._tr.get_or_add_trPr()
            trPr.append(parse_xml(cant_split_xml))

            is_header = (r_idx == 0)
            if is_header:
                trPr.append(parse_xml(tbl_header_xml))
            else:
                row.height_rule = WD_ROW_HEIGHT_RULE.AT_LEAST
                row.height = min_body_height

            for c_idx, width_in in enumerate(col_widths):
                if c_idx < len(row.cells):
                    cell = row.cells[c_idx]
                    cell.width = Inches(width_in)
                    tcPr = cell._tc.get_or_add_tcPr()

                    # Set explicit cell width
                    cell_width_dxa = int(width_in * 1440)
                    tcW_xml = f'<w:tcW {w_ns} w:w="{cell_width_dxa}" w:type="dxa"/>'
                    existing_tcW = tcPr.find(qn("w:tcW"))
                    if existing_tcW is not None:
                        tcPr.remove(existing_tcW)
                    tcPr.append(parse_xml(tcW_xml))

                    # Vertical alignment center
                    tcPr.append(parse_xml(valign_center_xml))

                    if is_header:
                        existing_shd = tcPr.find(qn("w:shd"))
                        if existing_shd is not None:
                            tcPr.remove(existing_shd)
                        tcPr.append(parse_xml(shd_header_xml))

                        for p in cell.paragraphs:
                            p.paragraph_format.space_before = Pt(4)
                            p.paragraph_format.space_after = Pt(4)
                            for run in p.runs:
                                run.bold = True
                    else:
                        for p in cell.paragraphs:
                            if p.paragraph_format.space_before is None or p.paragraph_format.space_before < Pt(2):
                                p.paragraph_format.space_before = Pt(3)
                            if p.paragraph_format.space_after is None or p.paragraph_format.space_after < Pt(2):
                                p.paragraph_format.space_after = Pt(3)

    # -------------------------------------------------------------
    # 4. FORMAT HEADINGS & SECTION SPACING
    # -------------------------------------------------------------
    for p in doc.paragraphs:
        text = p.text.strip()
        text_upper = text.upper()

        if p == doc.paragraphs[0]:
            # Title
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(4)
        elif "PART 1" in text_upper or "PART 2" in text_upper or "PART 3" in text_upper:
            # Main Section Banners
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(4)
        elif re.match(r"^Tool\s*\d+", text, re.IGNORECASE):
            # Tool headings (close to its table)
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(2)
        elif "identify the mistake" in text.lower():
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(6)
        elif p in cyu_paragraphs:
            # Questions in Check Your Understanding
            p.paragraph_format.space_before = cyu_spacing_before
            p.paragraph_format.space_after = cyu_spacing_after

    try:
        doc.save(docx_path)
        print(f"Document formatted successfully with {tool_count} tools detected.")
    except Exception as e:
        print(f"Warning: Could not save formatted document: {e}")
