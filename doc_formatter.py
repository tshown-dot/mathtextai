import docx
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls, qn
from docx.shared import Pt, Inches

def format_math_document(docx_path: str, border_color: str = "555555", header_bg: str = "E2E8F0") -> None:
    """
    Applies clean, professional formatting to tables and headings in a generated Word document:
      - Dark grey visible borders (inside and outside)
      - Soft grey background shading for table headers
      - Bold formatting for table header text
      - Comfortable cell padding (margins) so text never touches borders
      - Prevents table rows from breaking awkwardly across pages (cantSplit)
      - Repeats headers if tables span multiple pages (tblHeader)
      - Clean spacing before and after headings and tables
    """
    try:
        doc = docx.Document(docx_path)
    except Exception as e:
        print(f"Warning: Could not open document for formatting: {e}")
        return

    w_ns = nsdecls("w")

    # Table Borders XML: Clean, crisp dark grey borders
    borders_xml = (
        f'<w:tblBorders {w_ns}>'
        f'<w:top w:val="single" w:sz="8" w:space="0" w:color="{border_color}"/>'
        f'<w:left w:val="single" w:sz="8" w:space="0" w:color="{border_color}"/>'
        f'<w:bottom w:val="single" w:sz="8" w:space="0" w:color="{border_color}"/>'
        f'<w:right w:val="single" w:sz="8" w:space="0" w:color="{border_color}"/>'
        f'<w:insideH w:val="single" w:sz="6" w:space="0" w:color="{border_color}"/>'
        f'<w:insideV w:val="single" w:sz="6" w:space="0" w:color="{border_color}"/>'
        f'</w:tblBorders>'
    )

    # Table Cell Padding XML: 8pt top/bottom, 10pt left/right (in dxa: 20 dxa = 1 pt)
    cell_mar_xml = (
        f'<w:tblCellMar {w_ns}>'
        f'<w:top w:w="160" w:type="dxa"/>'
        f'<w:bottom w:w="160" w:type="dxa"/>'
        f'<w:left w:w="200" w:type="dxa"/>'
        f'<w:right w:w="200" w:type="dxa"/>'
        f'</w:tblCellMar>'
    )

    cant_split_xml = f'<w:cantSplit {w_ns}/>'
    tbl_header_xml = f'<w:tblHeader {w_ns}/>'
    valign_center_xml = f'<w:vAlign {w_ns} w:val="center"/>'
    shd_header_xml = f'<w:shd {w_ns} w:fill="{header_bg}"/>'

    # Format each table
    for table in doc.tables:
        tblPr = table._tbl.tblPr

        # Apply borders
        existing_borders = tblPr.find(qn("w:tblBorders"))
        if existing_borders is not None:
            tblPr.remove(existing_borders)
        tblPr.append(parse_xml(borders_xml))

        # Apply cell padding / margins
        existing_mar = tblPr.find(qn("w:tblCellMar"))
        if existing_mar is not None:
            tblPr.remove(existing_mar)
        tblPr.append(parse_xml(cell_mar_xml))

        # Format rows and cells
        for r_idx, row in enumerate(table.rows):
            trPr = row._tr.get_or_add_trPr()
            trPr.append(parse_xml(cant_split_xml))

            is_header = (r_idx == 0)
            if is_header:
                trPr.append(parse_xml(tbl_header_xml))

            for cell in row.cells:
                tcPr = cell._tc.get_or_add_tcPr()
                tcPr.append(parse_xml(valign_center_xml))

                if is_header:
                    # Apply header shading
                    existing_shd = tcPr.find(qn("w:shd"))
                    if existing_shd is not None:
                        tcPr.remove(existing_shd)
                    tcPr.append(parse_xml(shd_header_xml))

                    # Bold header text & add padding
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

    # Format document heading spacing
    for p in doc.paragraphs:
        if p.style and p.style.name:
            style_lower = p.style.name.lower()
            if "heading 1" in style_lower or "title" in style_lower:
                p.paragraph_format.space_before = Pt(16)
                p.paragraph_format.space_after = Pt(6)
            elif "heading 2" in style_lower:
                p.paragraph_format.space_before = Pt(12)
                p.paragraph_format.space_after = Pt(4)
            elif "heading 3" in style_lower:
                p.paragraph_format.space_before = Pt(8)
                p.paragraph_format.space_after = Pt(2)

    try:
        doc.save(docx_path)
    except Exception as e:
        print(f"Warning: Could not save formatted document: {e}")
