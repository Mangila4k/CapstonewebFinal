import os
import subprocess
import shutil

def generate_exact_5_tables():
    # Width and Height matching the layout
    W = 1000
    H = 1180

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
    padding: 30px;
    position: relative;
  }}

  /* Table styling matching exact classic ERD look */
  .erd-table {{
    position: absolute;
    background: #ffffff;
    border: 1.5px solid #000000;
    border-collapse: collapse;
    font-size: 13px;
  }}

  .erd-table th.table-title {{
    background: #ffffff;
    color: #000000;
    font-size: 16px;
    font-weight: bold;
    text-align: center;
    padding: 8px 10px;
    border-bottom: 1.5px solid #000000;
    letter-spacing: 0.5px;
  }}

  .erd-table td {{
    padding: 4px 8px;
    border-top: 1px solid #000000;
    border-right: 1px solid #000000;
    height: 25px;
    vertical-align: middle;
  }}
  .erd-table tr td:last-child {{
    border-right: none;
  }}

  .col-key {{
    width: 60px;
    text-align: center;
    font-weight: 500;
  }}
  .col-name {{
    width: 145px;
    text-align: left;
    padding-left: 10px !important;
  }}
  .col-type {{
    width: 75px;
    text-align: center;
    color: #000000;
  }}
  .bold {{
    font-weight: bold;
  }}

  svg.overlay {{
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10;
  }}
</style>
</head>
<body>

  <!-- ============================================== -->
  <!-- TABLE 1: ENROLLMENT (Top-Left) -->
  <!-- ============================================== -->
  <table id="tbl-enrollment" class="erd-table" style="top: 30px; left: 40px; width: 280px;">
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
  <table id="tbl-users" class="erd-table" style="top: 40px; left: 520px; width: 380px;">
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
  <table id="tbl-sections" class="erd-table" style="top: 430px; left: 540px; width: 360px;">
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
  <table id="tbl-students" class="erd-table" style="top: 560px; left: 40px; width: 420px;">
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
  <table id="tbl-documents" class="erd-table" style="top: 760px; left: 550px; width: 370px;">
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
  <!-- SVG RELATIONSHIP LINES (CORRECT CARDINALITIES) -->
  <!-- ============================================== -->
  <svg class="overlay" viewBox="0 0 {W} {H}">
    <!-- Marker definitions for Crow's Foot ERD notations -->
    <!-- 1) Exactly One (||) -->
    <!-- 2) Zero or Many (o<) / One or Many (|<) -->

    <!-- LINE 1: students.id (1) -> enrollment.student_id (Many) -->
    <!-- students top at x=200, y=560 UP TO enrollment bottom at x=200, y=310 -->
    <path d="M 200 560 L 200 310" fill="none" stroke="#000000" stroke-width="1.3"/>
    <!-- One-symbol at students (bottom: y=560) -->
    <line x1="194" y1="550" x2="206" y2="550" stroke="#000000" stroke-width="1.3"/>
    <line x1="194" y1="544" x2="206" y2="544" stroke="#000000" stroke-width="1.3"/>
    <!-- Crow's foot at enrollment (top: y=310) -->
    <line x1="193" y1="310" x2="200" y2="322" stroke="#000000" stroke-width="1.3"/>
    <line x1="207" y1="310" x2="200" y2="322" stroke="#000000" stroke-width="1.3"/>
    <line x1="194" y1="326" x2="206" y2="326" stroke="#000000" stroke-width="1.3"/>


    <!-- LINE 2: users.id (1) -> students.user_id (1) -->
    <!-- users left at x=520, y=75 -> route left to x=490 -> down to students user_id at x=460, y=640 -->
    <path d="M 520 75 L 490 75 L 490 640 L 460 640" fill="none" stroke="#000000" stroke-width="1.3"/>
    <!-- One symbol at users (x=520, y=75) -->
    <line x1="510" y1="69" x2="510" y2="81" stroke="#000000" stroke-width="1.3"/>
    <line x1="516" y1="69" x2="516" y2="81" stroke="#000000" stroke-width="1.3"/>
    <!-- One/Optional symbol at students (x=460, y=640) -->
    <line x1="472" y1="634" x2="472" y2="646" stroke="#000000" stroke-width="1.3"/>
    <circle cx="480" cy="640" r="3" fill="#ffffff" stroke="#000000" stroke-width="1.3"/>


    <!-- LINE 3: users.id (1) -> sections.adviser_id (Many) -->
    <!-- users bottom at x=700, y=380 DOWN TO sections top at x=700, y=430 -->
    <path d="M 700 380 L 700 430" fill="none" stroke="#000000" stroke-width="1.3"/>
    <!-- One symbol at users (y=380) -->
    <line x1="694" y1="390" x2="706" y2="390" stroke="#000000" stroke-width="1.3"/>
    <line x1="694" y1="396" x2="706" y2="396" stroke="#000000" stroke-width="1.3"/>
    <!-- Crow's foot at sections (y=430) -->
    <line x1="693" y1="430" x2="700" y2="418" stroke="#000000" stroke-width="1.3"/>
    <line x1="707" y1="430" x2="700" y2="418" stroke="#000000" stroke-width="1.3"/>
    <line x1="694" y1="414" x2="706" y2="414" stroke="#000000" stroke-width="1.3"/>


    <!-- LINE 4: sections.id (1) -> students.section_id (Many) -->
    <!-- sections left at x=540, y=465 -> route left to x=505 -> down to students section_id at x=460, y=665 -->
    <path d="M 540 465 L 505 465 L 505 665 L 460 665" fill="none" stroke="#000000" stroke-width="1.3"/>
    <!-- One symbol at sections (x=540, y=465) -->
    <line x1="530" y1="459" x2="530" y2="471" stroke="#000000" stroke-width="1.3"/>
    <line x1="535" y1="459" x2="535" y2="471" stroke="#000000" stroke-width="1.3"/>
    <!-- Crow's foot at students (x=460, y=665) -->
    <line x1="460" y1="665" x2="472" y2="659" stroke="#000000" stroke-width="1.3"/>
    <line x1="460" y1="665" x2="472" y2="671" stroke="#000000" stroke-width="1.3"/>
    <line x1="476" y1="659" x2="476" y2="671" stroke="#000000" stroke-width="1.3"/>


    <!-- LINE 5: students.id (1) -> documents.student_id (Many) -->
    <!-- students right at x=460, y=820 -> route to documents left at x=550, y=820 -->
    <path d="M 460 820 L 550 820" fill="none" stroke="#000000" stroke-width="1.3"/>
    <!-- One symbol at students (x=460) -->
    <line x1="470" y1="814" x2="470" y2="826" stroke="#000000" stroke-width="1.3"/>
    <line x1="476" y1="814" x2="476" y2="826" stroke="#000000" stroke-width="1.3"/>
    <!-- Crow's foot at documents (x=550) -->
    <line x1="550" y1="820" x2="538" y2="814" stroke="#000000" stroke-width="1.3"/>
    <line x1="550" y1="820" x2="538" y2="826" stroke="#000000" stroke-width="1.3"/>
    <line x1="534" y1="814" x2="534" y2="826" stroke="#000000" stroke-width="1.3"/>

  </svg>
</body>
</html>
"""
    os.makedirs("scratch", exist_ok=True)
    html_path = os.path.abspath("scratch/exact_5_tables.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)

    # Render PNG using Chrome
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    out_png = os.path.abspath("public/correct_5_tables_erd.png")
    brain_png = os.path.abspath(r"C:\Users\mylen\.gemini\antigravity\brain\dc7aecf0-c3d2-4549-97e7-544cdb56c808\correct_5_tables_erd.png")

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
        print(f"SUCCESS: Saved {out_png}")
        print(f"SUCCESS: Saved {brain_png}")
    else:
        print(f"Chrome error: {res.stderr}")

if __name__ == "__main__":
    generate_exact_5_tables()
