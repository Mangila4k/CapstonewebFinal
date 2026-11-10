import os
import subprocess
import shutil

def generate_clean_monochrome_5_tables():
    # Crisp, spacious canvas with zero color (100% Monochrome Black & White)
    W = 1040
    H = 1080

    # Layout coordinates:
    # Left column: x = 50, width = 340
    # Right column: x = 580, width = 410
    # Center corridor: 340 + 50 = 390 to 580 (190px clean space)

    # Tables:
    # Top-Left: enrollment (y = 40, h = 275)
    # Bottom-Left: students (y = 460, h = 425)

    # Top-Right: users (y = 40, h = 305)
    # Center-Right: sections (y = 400, h = 245)
    # Bottom-Right: documents (y = 710, h = 215)

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: {W}px;
    height: {H}px;
    background: #ffffff;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    color: #000000;
    position: relative;
    -webkit-font-smoothing: antialiased;
  }}

  /* Pure Monochrome ERD Tables */
  .erd-table {{
    position: absolute;
    background: #ffffff;
    border: 1.5px solid #000000;
    border-collapse: collapse;
    font-size: 13px;
    z-index: 5;
  }}

  .erd-table th.table-title {{
    background: #ffffff;
    color: #000000;
    font-size: 16px;
    font-weight: bold;
    text-align: center;
    padding: 8px 12px;
    border-bottom: 1.5px solid #000000;
    letter-spacing: 0.5px;
  }}

  .erd-table td {{
    padding: 5px 8px;
    border-top: 1px solid #000000;
    border-right: 1px solid #000000;
    height: 26px;
    vertical-align: middle;
    color: #000000;
  }}
  .erd-table tr td:last-child {{
    border-right: none;
  }}

  .col-key {{
    width: 65px;
    text-align: center;
    font-size: 12px;
  }}
  .col-name {{
    text-align: left;
    padding-left: 12px !important;
    font-size: 13px;
  }}
  .col-type {{
    width: 85px;
    text-align: center;
    font-size: 12px;
  }}
  .bold {{
    font-weight: bold;
  }}

  svg.overlay {{
    position: absolute;
    top: 0;
    left: 0;
    width: {W}px;
    height: {H}px;
    pointer-events: none;
    z-index: 10;
  }}
</style>
</head>
<body>

  <!-- ============================================== -->
  <!-- TABLE 1: ENROLLMENT (Top-Left) -->
  <!-- ============================================== -->
  <table id="tbl-enrollment" class="erd-table" style="top: 40px; left: 50px; width: 330px;">
    <thead>
      <tr><th colspan="3" class="table-title">enrollment</th></tr>
    </thead>
    <tbody>
      <tr><td class="col-key bold">PK</td><td class="col-name bold">id</td><td class="col-type">uuid</td></tr>
      <tr><td class="col-key bold">FK</td><td class="col-name bold">student_id</td><td class="col-type">uuid</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">grade_level</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">strand</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">school_type</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">school_year</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">numeric</td><td class="col-name">general_average</td><td class="col-type">numeric</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">status</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">timestamp</td><td class="col-name">created_at</td><td class="col-type">timestamptz</td></tr>
    </tbody>
  </table>

  <!-- ============================================== -->
  <!-- TABLE 2: USERS (Top-Right) -->
  <!-- ============================================== -->
  <table id="tbl-users" class="erd-table" style="top: 40px; left: 580px; width: 410px;">
    <thead>
      <tr><th colspan="3" class="table-title">users</th></tr>
    </thead>
    <tbody>
      <tr><td class="col-key bold">PK</td><td class="col-name bold">id</td><td class="col-type">uuid</td></tr>
      <tr><td class="col-key bold">AK</td><td class="col-name bold">email</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">password</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">first_name</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">last_name</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">phone</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">address</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name bold">role</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">status</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">timestamp</td><td class="col-name">created_at</td><td class="col-type">timestamptz</td></tr>
    </tbody>
  </table>

  <!-- ============================================== -->
  <!-- TABLE 3: SECTIONS (Center-Right) -->
  <!-- ============================================== -->
  <table id="tbl-sections" class="erd-table" style="top: 400px; left: 580px; width: 410px;">
    <thead>
      <tr><th colspan="3" class="table-title">sections</th></tr>
    </thead>
    <tbody>
      <tr><td class="col-key bold">PK</td><td class="col-name bold">id</td><td class="col-type">uuid</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">section_name</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">grade_level</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">strand</td><td class="col-type">text</td></tr>
      <tr><td class="col-key bold">FK</td><td class="col-name bold">adviser_id</td><td class="col-type">uuid</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">room</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">status</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">timestamp</td><td class="col-name">created_at</td><td class="col-type">timestamptz</td></tr>
    </tbody>
  </table>

  <!-- ============================================== -->
  <!-- TABLE 4: STUDENTS (Bottom-Left) -->
  <!-- ============================================== -->
  <table id="tbl-students" class="erd-table" style="top: 470px; left: 50px; width: 380px;">
    <thead>
      <tr><th colspan="3" class="table-title">students</th></tr>
    </thead>
    <tbody>
      <tr><td class="col-key bold">PK</td><td class="col-name bold">id</td><td class="col-type">uuid</td></tr>
      <tr><td class="col-key bold">AK</td><td class="col-name bold">lrn</td><td class="col-type">text</td></tr>
      <tr><td class="col-key bold">FK</td><td class="col-name bold">user_id</td><td class="col-type">uuid</td></tr>
      <tr><td class="col-key bold">FK</td><td class="col-name bold">section_id</td><td class="col-type">uuid</td></tr>
      <tr><td class="col-key bold">FK</td><td class="col-name bold">parent_id</td><td class="col-type">uuid</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">first_name</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">last_name</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">gender</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">date</td><td class="col-name">birthdate</td><td class="col-type">date</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">address</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">contact_number</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">email</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">status</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">timestamp</td><td class="col-name">created_at</td><td class="col-type">timestamptz</td></tr>
    </tbody>
  </table>

  <!-- ============================================== -->
  <!-- TABLE 5: DOCUMENTS (Bottom-Right) -->
  <!-- ============================================== -->
  <table id="tbl-documents" class="erd-table" style="top: 715px; left: 580px; width: 410px;">
    <thead>
      <tr><th colspan="3" class="table-title">documents</th></tr>
    </thead>
    <tbody>
      <tr><td class="col-key bold">PK</td><td class="col-name bold">id</td><td class="col-type">uuid</td></tr>
      <tr><td class="col-key bold">FK</td><td class="col-name bold">student_id</td><td class="col-type">uuid</td></tr>
      <tr><td class="col-key bold">FK</td><td class="col-name bold">enrollment_id</td><td class="col-type">uuid</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">document_type</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">file_path</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">string</td><td class="col-name">verification_status</td><td class="col-type">text</td></tr>
      <tr><td class="col-key">timestamp</td><td class="col-name">uploaded_at</td><td class="col-type">timestamptz</td></tr>
    </tbody>
  </table>

  <!-- ============================================== -->
  <!-- SVG RELATIONSHIP LINES (PURE MONOCHROME) -->
  <!-- ============================================== -->
  <svg class="overlay" viewBox="0 0 {W} {H}">

    <!-- 1. students (1) -> enrollment (Many) -->
    <!-- Perfectly straight vertical line at x = 215 -->
    <!-- From students top (y = 470) to enrollment bottom (y = 315) -->
    <path d="M 215 470 L 215 315" fill="none" stroke="#000000" stroke-width="1.3"/>
    <!-- Exactly-one double bar at students (y=470) -->
    <line x1="209" y1="460" x2="221" y2="460" stroke="#000000" stroke-width="1.3"/>
    <line x1="209" y1="454" x2="221" y2="454" stroke="#000000" stroke-width="1.3"/>
    <!-- Crow's foot at enrollment (y=315) -->
    <line x1="208" y1="315" x2="215" y2="328" stroke="#000000" stroke-width="1.3"/>
    <line x1="222" y1="315" x2="215" y2="328" stroke="#000000" stroke-width="1.3"/>
    <line x1="209" y1="332" x2="221" y2="332" stroke="#000000" stroke-width="1.3"/>


    <!-- 2. users (1) -> sections (Many) via adviser_id -->
    <!-- Perfectly straight vertical line at x = 785 -->
    <!-- From users bottom (y = 345) to sections top (y = 400) -->
    <path d="M 785 345 L 785 400" fill="none" stroke="#000000" stroke-width="1.3"/>
    <!-- Exactly-one double bar at users (y=345) -->
    <line x1="779" y1="355" x2="791" y2="355" stroke="#000000" stroke-width="1.3"/>
    <line x1="779" y1="361" x2="791" y2="361" stroke="#000000" stroke-width="1.3"/>
    <!-- Crow's foot at sections (y=400) -->
    <line x1="778" y1="400" x2="785" y2="387" stroke="#000000" stroke-width="1.3"/>
    <line x1="792" y1="400" x2="785" y2="387" stroke="#000000" stroke-width="1.3"/>
    <line x1="779" y1="383" x2="791" y2="383" stroke="#000000" stroke-width="1.3"/>


    <!-- 3. users (1) -> students (1) via user_id -->
    <!-- From users left (x=580, y=78) -> left to x=480 -> down to students user_id (y=555) -> left into students (x=430) -->
    <path d="M 580 78 L 470 78 L 470 555 L 430 555" fill="none" stroke="#000000" stroke-width="1.3"/>
    <!-- Exactly-one double bar at users (x=580) -->
    <line x1="570" y1="72" x2="570" y2="84" stroke="#000000" stroke-width="1.3"/>
    <line x1="564" y1="72" x2="564" y2="84" stroke="#000000" stroke-width="1.3"/>
    <!-- One / optional bar at students (x=430) -->
    <line x1="440" y1="549" x2="440" y2="561" stroke="#000000" stroke-width="1.3"/>
    <line x1="446" y1="549" x2="446" y2="561" stroke="#000000" stroke-width="1.3"/>


    <!-- 4. sections (1) -> students (Many) via section_id -->
    <!-- From sections left (x=580, y=435) -> left to x=510 -> down to students section_id (y=580) -> left into students (x=430) -->
    <path d="M 580 435 L 510 435 L 510 580 L 430 580" fill="none" stroke="#000000" stroke-width="1.3"/>
    <!-- Exactly-one double bar at sections (x=580) -->
    <line x1="570" y1="429" x2="570" y2="441" stroke="#000000" stroke-width="1.3"/>
    <line x1="564" y1="429" x2="564" y2="441" stroke="#000000" stroke-width="1.3"/>
    <!-- Crow's foot at students (x=430, y=580) -->
    <line x1="430" y1="580" x2="443" y2="574" stroke="#000000" stroke-width="1.3"/>
    <line x1="430" y1="580" x2="443" y2="586" stroke="#000000" stroke-width="1.3"/>
    <line x1="447" y1="574" x2="447" y2="586" stroke="#000000" stroke-width="1.3"/>


    <!-- 5. students (1) -> documents (Many) via student_id -->
    <!-- Clean orthogonal connection from students right (x=430, y=750) straight to documents left (x=580, y=750) -->
    <path d="M 430 750 L 580 750" fill="none" stroke="#000000" stroke-width="1.3"/>
    <!-- Exactly-one double bar at students (x=430) -->
    <line x1="440" y1="744" x2="440" y2="756" stroke="#000000" stroke-width="1.3"/>
    <line x1="446" y1="744" x2="446" y2="756" stroke="#000000" stroke-width="1.3"/>
    <!-- Crow's foot at documents (x=580) -->
    <line x1="580" y1="750" x2="567" y2="744" stroke="#000000" stroke-width="1.3"/>
    <line x1="580" y1="750" x2="567" y2="756" stroke="#000000" stroke-width="1.3"/>
    <line x1="563" y1="744" x2="563" y2="756" stroke="#000000" stroke-width="1.3"/>

  </svg>
</body>
</html>
"""
    os.makedirs("scratch", exist_ok=True)
    html_path = os.path.abspath("scratch/clean_monochrome_5_tables.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)

    # Render PNG using Chrome
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    out_png = os.path.abspath("public/clean_monochrome_5_tables.png")
    brain_png = os.path.abspath(r"C:\Users\mylen\.gemini\antigravity\brain\dc7aecf0-c3d2-4549-97e7-544cdb56c808\clean_monochrome_5_tables.png")

    file_url = "file:///" + html_path.replace("\\", "/")
    cmd = [
        chrome_path,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        f"--window-size={W},{H}",
        f"--screenshot={out_png}",
        file_url
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0 and os.path.exists(out_png):
        shutil.copy2(out_png, brain_png)
        # Also overwrite correct_5_tables_erd.png with this clean monochrome version
        shutil.copy2(out_png, "public/correct_5_tables_erd.png")
        shutil.copy2(out_png, r"C:\Users\mylen\.gemini\antigravity\brain\dc7aecf0-c3d2-4549-97e7-544cdb56c808\correct_5_tables_erd.png")
        print(f"SUCCESS: Saved {out_png}")
        print(f"SUCCESS: Saved {brain_png}")
    else:
        print(f"Chrome error: {res.stderr}")

if __name__ == "__main__":
    generate_clean_monochrome_5_tables()
