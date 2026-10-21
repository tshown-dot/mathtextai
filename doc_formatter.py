import re
import docx
from docx.shared import Inches, Pt
from docx.enum.table import WD_ROW_HEIGHT_RULE
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls, qn


def clean_markdown_input(text: str) -> str:
    """
    Pre-processes markdown input before Pandoc conversion:
      - Removes <br> tags inside table rows so cells don't get unwanted blank lines
      - Ensures markdown tables have dashed separator rows (| :--- | :--- |) if omitted
    """
    lines = text.strip().split("\n")
    processed = []
    i = 0
    while i < len(lines):
        raw_line = lines[i]
        stripped = raw_line.strip()

        # Clean <br> tags inside table rows
        if stripped.startswith("|") and stripped.endswith("|"):
            cleaned_row = re.sub(r"(\s*<br\s*/?>\s*)+", " ", stripped, flags=re.IGNORECASE)
            processed.append(cleaned_row)

            # If this is a header row (Problem | Steps) and next line is not a separator, insert one
            if ("problem" in cleaned_row.lower() or "steps" in cleaned_row.lower()):
                if i + 1 < len(lines) and not re.match(r"^\|(\s*:?-+:?\s*\|)+$", lines[i + 1].strip()):
                    cols = len([c for c in cleaned_row.split("|")[1:-1]])
                    sep = "| " + " | ".join([":---"] * cols) + " |"
                    processed.append(sep)
        else:
            processed.append(raw_line)
        i += 1
    return "\n".join(processed)


def format_math_document(docx_path: str) -> None:
    """
    Formats the Pandoc-generated Word document to match the exact target layout:
      1. Full 7.5" table width (5.15" Problem [~2/3], 2.35" Steps [~1/3]) with updated <w:tblGrid>
      2. Tool table data rows set to 1.75" tall (top-aligned text) so Tools 1-3 fill Page 1
      3. Fix the Mistake table data row set to 0.65" tall (top-aligned text)
      4. Slate Silver (#CBD5E1) header shading, bold header text, and dark grey (#555555) borders
      5. Dynamic page break:
         - 3 Tools -> Page break before Part 2 (Page 1: Tools 1-3; Page 2: Part 2 + Part 3)
         - 2 Tools -> Page break before Part 3 (Page 1: Tools 1-2 + Part 2; Page 2: Part 3)
      6. Generous CYU question spacing (48pt / 64pt with contextualSpacing disabled) to fill Page 2
      7. Preserves native Title, Heading 1, and Heading 2 styles from custom_template.docx
    """
    try:
        doc = docx.Document(docx_path)
    except Exception as e:
        print(f"Warning: Could not open document for formatting: {e}")
        return

    w_ns = nsdecls("w")
    BORDER_COLOR = "555555"
    HEADER_BG = "CBD5E1"  # Option A: Slate Silver

    # -------------------------------------------------------------
    # 1. COUNT TOOLS IN PART 1
    # -------------------------------------------------------------
    tool_count = 0
    for p in doc.paragraphs:
        text = p.text.strip()
        if re.match(r"^Tool\s*\d+", text, re.IGNORECASE):
            tool_count += 1

    if tool_count == 0:
        tool_count = max(1, min(3, len(doc.tables) - 1))

    break_before_part2 = (tool_count >= 3)
    tool_row_height = Inches(1.75) if break_before_part2 else Inches(1.55)
    cyu_space_after = Pt(48) if break_before_part2 else Pt(64)
    cyu_space_before = Pt(6)

    # -------------------------------------------------------------
    # 2. FORMAT PARAGRAPHS, PAGE BREAKS, AND CYU SPACING
    # -------------------------------------------------------------
    current_section = "INTRO"

    for p in doc.paragraphs:
        text = p.text.strip()
        text_upper = text.upper()

        if "PART 1" in text_upper:
            current_section = "PART1"
            p.paragraph_format.page_break_before = False
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(6)

        elif "PART 2" in text_upper:
            current_section = "PART2"
            p.paragraph_format.page_break_before = break_before_part2
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(6)

        elif "PART 3" in text_upper or "CHECK YOUR UNDERSTANDING" in text_upper:
            current_section = "PART3"
            p.paragraph_format.page_break_before = (not break_before_part2)
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(8)

        elif re.match(r"^Tool\s*\d+", text, re.IGNORECASE):
            p.paragraph_format.space_before = Pt(10)
            p.paragraph_format.space_after = Pt(4)

        elif "identify the mistake" in text.lower():
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(14)

        elif current_section == "PART3" and text:
            p.paragraph_format.space_before = cyu_space_before
            p.paragraph_format.space_after = cyu_space_after
            # Disable contextualSpacing so Word never collapses space between list items
            pPr = p._element.get_or_add_pPr()
            existing_cs = pPr.find(qn("w:contextualSpacing"))
            if existing_cs is not None:
                pPr.remove(existing_cs)
            pPr.append(parse_xml(f'<w:contextualSpacing {w_ns} w:val="0"/>'))

    # -------------------------------------------------------------
    # 3. FORMAT TABLES (7.5" FULL WIDTH: 5.15" & 2.35", HEIGHTS, BORDERS)
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
        f'<w:top w:w="120" w:type="dxa"/>'
        f'<w:bottom w:w="120" w:type="dxa"/>'
        f'<w:left w:w="144" w:type="dxa"/>'
        f'<w:right w:w="144" w:type="dxa"/>'
        f'</w:tblCellMar>'
    )

    for table in doc.tables:
        table.autofit = False
        tbl = table._tbl
        tblPr = tbl.tblPr

        # Fixed table layout so Word strictly obeys column widths
        existing_layout = tblPr.find(qn("w:tblLayout"))
        if existing_layout is not None:
            tblPr.remove(existing_layout)
        tblPr.append(parse_xml(f'<w:tblLayout {w_ns} w:type="fixed"/>'))

        # Borders
        existing_borders = tblPr.find(qn("w:tblBorders"))
        if existing_borders is not None:
            tblPr.remove(existing_borders)
        tblPr.append(parse_xml(borders_xml))

        # Cell padding
        existing_mar = tblPr.find(qn("w:tblCellMar"))
        if existing_mar is not None:
            tblPr.remove(existing_mar)
        tblPr.append(parse_xml(cell_mar_xml))

        # Left alignment
        existing_jc = tblPr.find(qn("w:jc"))
        if existing_jc is not None:
            tblPr.remove(existing_jc)
        tblPr.append(parse_xml(f'<w:jc {w_ns} w:val="left"/>'))

        # Determine if this is a Tool table or Fix the Mistake table
        first_row_text = " ".join([c.text.lower() for c in table.rows[0].cells])
        is_fix_mistake = ("correct" in first_row_text or "mistake" in first_row_text)

        if len(table.columns) == 2:
            # Full 7.5" width (5.15" Problem [~2/3], 2.35" Steps [~1/3])
            col_widths = [5.15, 2.35]
            body_height = Inches(0.65) if is_fix_mistake else tool_row_height
        else:
            col_widths = [7.5 / len(table.columns)] * len(table.columns)
            body_height = Inches(0.75)

        col_dxa = [int(round(w * 1440)) for w in col_widths]
        total_width_dxa = sum(col_dxa)

        # Set total table width (<w:tblW>)
        existing_tblW = tblPr.find(qn("w:tblW"))
        if existing_tblW is not None:
            tblPr.remove(existing_tblW)
        tblPr.append(parse_xml(f'<w:tblW {w_ns} w:w="{total_width_dxa}" w:type="dxa"/>'))

        # Overwrite <w:tblGrid> so Word strictly uses our 2/3 & 1/3 column widths
        grid_cols_xml = "".join([f'<w:gridCol {w_ns} w:w="{dxa}"/>' for dxa in col_dxa])
        new_grid = parse_xml(f'<w:tblGrid {w_ns}>{grid_cols_xml}</w:tblGrid>')
        existing_grid = tbl.find(qn("w:tblGrid"))
        if existing_grid is not None:
            tbl.replace(existing_grid, new_grid)
        else:
            tbl.insert(tbl.index(tblPr) + 1, new_grid)

        # Format rows and cells
        for r_idx, row in enumerate(table.rows):
            trPr = row._tr.get_or_add_trPr()
            if trPr.find(qn("w:cantSplit")) is None:
                trPr.append(parse_xml(f'<w:cantSplit {w_ns}/>'))

            is_header = (r_idx == 0)
            if is_header:
                row.height_rule = WD_ROW_HEIGHT_RULE.AT_LEAST
                row.height = Inches(0.38)
            else:
                row.height_rule = WD_ROW_HEIGHT_RULE.AT_LEAST
                row.height = body_height

            for c_idx, dxa in enumerate(col_dxa):
                if c_idx < len(row.cells):
                    cell = row.cells[c_idx]
                    cell.width = Inches(col_widths[c_idx])
                    tcPr = cell._tc.get_or_add_tcPr()

                    # Cell width
                    existing_tcW = tcPr.find(qn("w:tcW"))
                    if existing_tcW is not None:
                        tcPr.remove(existing_tcW)
                    tcPr.append(parse_xml(f'<w:tcW {w_ns} w:w="{dxa}" w:type="dxa"/>'))

                    # Vertical alignment: center for header, top for problem/steps row
                    existing_vAlign = tcPr.find(qn("w:vAlign"))
                    if existing_vAlign is not None:
                        tcPr.remove(existing_vAlign)
                    valign_val = "center" if is_header else "top"
                    tcPr.append(parse_xml(f'<w:vAlign {w_ns} w:val="{valign_val}"/>'))

                    if is_header:
                        existing_shd = tcPr.find(qn("w:shd"))
                        if existing_shd is not None:
                            tcPr.remove(existing_shd)
                        tcPr.append(parse_xml(f'<w:shd {w_ns} w:fill="{HEADER_BG}"/>'))

                        for p in cell.paragraphs:
                            p.paragraph_format.space_before = Pt(2)
                            p.paragraph_format.space_after = Pt(2)
                            for run in p.runs:
                                run.bold = True
                    else:
                        for p in cell.paragraphs:
                            p.paragraph_format.space_before = Pt(2)
                            p.paragraph_format.space_after = Pt(2)

    try:
        doc.save(docx_path)
        print(f"Document formatted successfully with {tool_count} tools detected.")
    except Exception as e:
        print(f"Warning: Could not save formatted document: {e}")
