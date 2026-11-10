import os
import sys
import xml.etree.ElementTree as ET
import xml.sax.saxutils as saxutils

# Import table schema and relationships from generate_erd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_erd as erd

def escape_xml(s):
    return saxutils.escape(s)

def build_drawio_xml():
    canvas_w = 1740
    canvas_h = 1480

    mxfile = ET.Element("mxfile", {
        "host": "app.diagrams.net",
        "modified": "2026-11-10T17:25:00.000Z",
        "agent": "Antigravity",
        "version": "21.0.0",
        "type": "device"
    })

    diagram = ET.SubElement(mxfile, "diagram", {
        "id": "plscnhs-database-erd",
        "name": "Database ERD"
    })

    model = ET.SubElement(diagram, "mxGraphModel", {
        "dx": "1740",
        "dy": "1480",
        "grid": "1",
        "gridSize": "10",
        "guides": "1",
        "tooltips": "1",
        "connect": "1",
        "arrows": "1",
        "fold": "1",
        "page": "1",
        "pageScale": "1",
        "pageWidth": str(canvas_w),
        "pageHeight": str(canvas_h),
        "background": "#ffffff"
    })

    root = ET.SubElement(model, "root")

    # Cell 0 & 1 required by draw.io
    ET.SubElement(root, "mxCell", {"id": "0"})
    ET.SubElement(root, "mxCell", {"id": "1", "parent": "0"})

    # 1. Header Banner
    header_val = (
        "<b>REPUBLIC OF THE PHILIPPINES · DEPARTMENT OF EDUCATION · REGION VII</b><br>"
        "<b style=\"font-size: 13px;\">PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL — DATABASE ENTITY RELATIONSHIP DIAGRAM (ERD)</b>"
    )
    header_cell = ET.SubElement(root, "mxCell", {
        "id": "header_banner",
        "value": header_val,
        "style": "rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#cbd5e1;fontColor=#1e293b;align=left;spacingLeft=16;fontSize=10;fontFamily=Helvetica;",
        "vertex": "1",
        "parent": "1"
    })
    ET.SubElement(header_cell, "mxGeometry", {
        "x": "40",
        "y": "16",
        "width": "1660",
        "height": "48",
        "as": "geometry"
    })

    # Legend inside header banner
    legend_val = (
        "<b>PK</b> Primary Key &nbsp;&nbsp; "
        "<b>FK</b> Foreign Key &nbsp;&nbsp; "
        "<b>AK</b> Alternate/Unique &nbsp;&nbsp; "
        "<b>||—||</b> One-to-One &nbsp;&nbsp; "
        "<b>||—&lt;</b> One-to-Many"
    )
    legend_cell = ET.SubElement(root, "mxCell", {
        "id": "legend_box",
        "value": legend_val,
        "style": "text;html=1;strokeColor=none;fillColor=none;align=right;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=10;fontColor=#475569;fontFamily=Helvetica;",
        "vertex": "1",
        "parent": "1"
    })
    ET.SubElement(legend_cell, "mxGeometry", {
        "x": "1150",
        "y": "24",
        "width": "530",
        "height": "32",
        "as": "geometry"
    })

    # 2. Add Tables
    for tname, tdata in erd.TABLES.items():
        x = tdata["x"]
        y = tdata["y"]
        w = tdata["width"]
        cols = tdata["columns"]
        header_h = 26
        row_h = 18
        table_h = header_h + len(cols) * row_h

        # Table Swimlane
        t_cell = ET.SubElement(root, "mxCell", {
            "id": f"table_{tname}",
            "value": tname,
            "style": (
                "swimlane;fontStyle=1;childLayout=stackLayout;horizontal=1;startSize=26;"
                "fillColor=#ffffff;strokeColor=#475569;fontColor=#0f172a;horizontalStack=0;"
                "resizeParent=0;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;"
                "align=center;fontSize=12;fontFamily=Helvetica;"
            ),
            "vertex": "1",
            "parent": "1"
        })
        ET.SubElement(t_cell, "mxGeometry", {
            "x": str(x),
            "y": str(y),
            "width": str(w),
            "height": str(table_h),
            "as": "geometry"
        })

        # Columns
        for idx, (ktype, cname, ctype) in enumerate(cols):
            row_y = header_h + idx * row_h

            if "PK" in ktype and "FK" in ktype:
                badge = "<b>PK,FK</b>"
            elif "PK" in ktype:
                badge = "<b>PK</b>"
            elif "FK" in ktype:
                badge = "<font color=\"#0369a1\"><b>FK</b></font>"
            elif "AK" in ktype:
                badge = "<font color=\"#b45309\"><b>AK</b></font>"
            else:
                badge = "&nbsp;&nbsp;&nbsp;&nbsp;"

            # Format row HTML string
            row_text = f"{badge} &nbsp; {cname} &nbsp; <font color=\"#64748b\">{ctype}</font>"

            r_cell = ET.SubElement(root, "mxCell", {
                "id": f"{tname}_{cname}_{idx}",
                "value": row_text,
                "style": (
                    "text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;"
                    "spacingLeft=8;spacingRight=8;overflow=hidden;rotatable=0;"
                    "points=[[0,0.5],[1,0.5]];portConstraint=eastwest;"
                    "fontColor=#1e293b;fontSize=10;fontFamily=Helvetica;html=1;"
                ),
                "vertex": "1",
                "parent": f"table_{tname}"
            })
            ET.SubElement(r_cell, "mxGeometry", {
                "y": str(row_y),
                "width": str(w),
                "height": str(row_h),
                "as": "geometry"
            })

    # 3. Add Relationships
    for r_idx, rel in enumerate(erd.RELATIONSHIPS):
        pts = rel["pts"]
        start_pt = pts[0]
        end_pt = pts[-1]
        inter_pts = pts[1:-1]

        # Arrow styles
        start_arrow = "startArrow=ERmandOne;startFill=0;" if rel["from_card"] == "one" else "startArrow=ERmany;startFill=0;"
        end_arrow = "endArrow=ERmany;endFill=0;" if rel["to_card"] == "many" else "endArrow=ERmandOne;endFill=0;"

        edge_style = (
            f"edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"
            f"strokeColor=#475569;strokeWidth=1.3;{start_arrow}{end_arrow}"
        )

        edge_cell = ET.SubElement(root, "mxCell", {
            "id": f"rel_edge_{r_idx}",
            "value": "",
            "style": edge_style,
            "edge": "1",
            "parent": "1"
        })

        geom = ET.SubElement(edge_cell, "mxGeometry", {
            "relative": "1",
            "as": "geometry"
        })
        ET.SubElement(geom, "mxPoint", {
            "x": str(start_pt[0]),
            "y": str(start_pt[1]),
            "as": "sourcePoint"
        })
        ET.SubElement(geom, "mxPoint", {
            "x": str(end_pt[0]),
            "y": str(end_pt[1]),
            "as": "targetPoint"
        })

        if inter_pts:
            array = ET.SubElement(geom, "Array", {"as": "points"})
            for pt in inter_pts:
                ET.SubElement(array, "mxPoint", {
                    "x": str(pt[0]),
                    "y": str(pt[1])
                })

    # Write output to public and artifact folders
    out_drawio = os.path.abspath("public/erd_database_diagram.drawio")
    artifact_drawio = "C:/Users/mylen/.gemini/antigravity/brain/dc7aecf0-c3d2-4549-97e7-544cdb56c808/erd_database_diagram.drawio"

    tree = ET.ElementTree(mxfile)
    ET.indent(tree, space="  ", level=0)
    tree.write(out_drawio, encoding="utf-8", xml_declaration=True)
    tree.write(artifact_drawio, encoding="utf-8", xml_declaration=True)

    print(f"SUCCESS: Generated {out_drawio} ({os.path.getsize(out_drawio)} bytes)")
    print(f"SUCCESS: Generated {artifact_drawio} ({os.path.getsize(artifact_drawio)} bytes)")

if __name__ == "__main__":
    build_drawio_xml()
