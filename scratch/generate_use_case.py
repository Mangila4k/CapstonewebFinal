import os
import subprocess
import shutil

# Precise UML Use Case Diagram matching the user's uploaded layout

def render_svg_use_case():
    W = 1050
    H = 1500

    # System Boundary Box
    sb_x = 180
    sb_y = 25
    sb_w = 690
    sb_h = 1450

    # Title Box
    tb_w = 420
    tb_h = 36
    tb_x = sb_x + (sb_w - tb_w) / 2
    tb_y = sb_y + 20

    # Central Use Cases (16 vertical ovals)
    uc_cx = sb_x + sb_w / 2  # 525
    uc_rx = 95
    uc_ry = 22

    use_cases = [
        {"id": "register", "text": "Register", "cy": 115},
        {"id": "login", "text": "Login", "cy": 198},
        {"id": "manage_profile", "text": "Manage Profile", "cy": 281},
        {"id": "enroll_strand", "text": "Enroll in Strand", "cy": 364},
        {"id": "view_enrollment", "text": "View Enrollment", "cy": 447},
        {"id": "approve_enrollment", "text": "Approve Enrollment", "cy": 530},
        {"id": "manage_schedule", "text": "Manage Schedule", "cy": 613},
        {"id": "manage_subjects", "text": "Manage Subjects", "cy": 696},
        {"id": "manage_users", "text": "Manage User & Roles", "cy": 779},
        {"id": "generate_reports", "text": "Generate Reports", "cy": 862},
        {"id": "chat_ai", "text": "Chat with AI Assistant", "cy": 945},
        {"id": "view_schedule", "text": "View Class Schedule", "cy": 1028},
        {"id": "view_records", "text": "View Student Records", "cy": 1111},
        {"id": "view_notification", "text": "View Notification", "cy": 1194},
        {"id": "view_violation", "text": "View Violation", "cy": 1277},
        {"id": "logout", "text": "Logout", "cy": 1360},
    ]
    uc_map = {u["id"]: u for u in use_cases}

    # Secondary Sub-Use Cases
    sub_use_cases = [
        {"id": "fill_form", "text": "Fill Out<tspan x='760' dy='14'>Enrollment Form</tspan>", "cx": 760, "cy": 115, "rx": 58, "ry": 24},
        {"id": "select_strand", "text": "Select Strand", "cx": 760, "cy": 190, "rx": 52, "ry": 20},
        {"id": "receive_notif", "text": "Receive<tspan x='740' dy='14'>Notification</tspan>", "cx": 740, "cy": 320, "rx": 56, "ry": 24},
        {"id": "get_info", "text": "Get Information", "cx": 650, "cy": 910, "rx": 52, "ry": 20},
    ]
    sub_map = {s["id"]: s for s in sub_use_cases}

    # Actors: Stick figures
    actors = {
        "admin": {
            "name": "Admin",
            "x": 80,
            "y": 160,
            "color": "#dc2626", # Red
            "connect_point": (105, 175),
            "side": "left"
        },
        "student": {
            "name": "Student",
            "x": 80,
            "y": 620,
            "color": "#152e69", # PLSNHS Navy (No violet!)
            "connect_point": (105, 635),
            "side": "left"
        },
        "parent": {
            "name": "Parent",
            "x": 80,
            "y": 1120,
            "color": "#2563eb", # Blue
            "connect_point": (105, 1135),
            "side": "left"
        },
        "registrar": {
            "name": "Registrar",
            "x": 970,
            "y": 300,
            "color": "#16a34a", # Green
            "connect_point": (945, 315),
            "side": "right"
        },
        "teacher": {
            "name": "Teacher",
            "x": 970,
            "y": 850,
            "color": "#d97706", # Amber / Orange
            "connect_point": (945, 865),
            "side": "right"
        },
        "guidance": {
            "name": "Guidance",
            "x": 970,
            "y": 1160,
            "color": "#831843", # Deep Burgundy / Maroon
            "connect_point": (945, 1175),
            "side": "right"
        },
    }

    # Association lines: (actor_id, use_case_id)
    associations = [
        # Admin
        ("admin", "login"),
        ("admin", "manage_profile"),
        ("admin", "manage_schedule"),
        ("admin", "manage_subjects"),
        ("admin", "manage_users"),
        ("admin", "generate_reports"),
        ("admin", "chat_ai"),
        ("admin", "logout"),

        # Student
        ("student", "register"),
        ("student", "login"),
        ("student", "manage_profile"),
        ("student", "enroll_strand"),
        ("student", "view_enrollment"),
        ("student", "chat_ai"),
        ("student", "view_schedule"),
        ("student", "view_notification"),
        ("student", "view_violation"),
        ("student", "logout"),

        # Parent
        ("parent", "login"),
        ("parent", "manage_profile"),
        ("parent", "view_enrollment"),
        ("parent", "view_schedule"),
        ("parent", "view_records"),
        ("parent", "view_notification"),
        ("parent", "view_violation"),
        ("parent", "logout"),

        # Registrar
        ("registrar", "login"),
        ("registrar", "manage_profile"),
        ("registrar", "view_enrollment"),
        ("registrar", "approve_enrollment"),
        ("registrar", "manage_schedule"),
        ("registrar", "manage_subjects"),
        ("registrar", "generate_reports"),
        ("registrar", "chat_ai"),
        ("registrar", "view_records"),
        ("registrar", "logout"),

        # Teacher
        ("teacher", "login"),
        ("teacher", "manage_profile"),
        ("teacher", "manage_schedule"),
        ("teacher", "manage_subjects"),
        ("teacher", "generate_reports"),
        ("teacher", "chat_ai"),
        ("teacher", "view_schedule"),
        ("teacher", "view_records"),
        ("teacher", "view_notification"),
        ("teacher", "logout"),

        # Guidance
        ("guidance", "login"),
        ("guidance", "manage_profile"),
        ("guidance", "generate_reports"),
        ("guidance", "chat_ai"),
        ("guidance", "view_records"),
        ("guidance", "view_notification"),
        ("guidance", "view_violation"),
        ("guidance", "logout"),
    ]

    # Special extra association: Registrar -> receive_notif
    extra_associations = [
        (actors["registrar"]["connect_point"], (sub_map["receive_notif"]["cx"] + sub_map["receive_notif"]["rx"], sub_map["receive_notif"]["cy"]))
    ]

    # Include relationships (from_uc, to_sub_uc, label)
    include_rels = [
        {"from": (uc_cx + uc_rx, uc_map["enroll_strand"]["cy"]), "to": (sub_map["fill_form"]["cx"] - sub_map["fill_form"]["rx"] + 10, sub_map["fill_form"]["cy"] + 15), "label": "include", "lx": 670, "ly": 220},
        {"from": (sub_map["fill_form"]["cx"] + 10, sub_map["fill_form"]["cy"] + sub_map["fill_form"]["ry"]), "to": (sub_map["select_strand"]["cx"] + 10, sub_map["select_strand"]["cy"] - sub_map["select_strand"]["ry"]), "label": "", "lx": 0, "ly": 0},
        {"from": (uc_cx + uc_rx, uc_map["view_enrollment"]["cy"]), "to": (sub_map["receive_notif"]["cx"] - sub_map["receive_notif"]["rx"] + 10, sub_map["receive_notif"]["cy"] + 10), "label": "include", "lx": 655, "ly": 375},
        {"from": (uc_cx + uc_rx, uc_map["chat_ai"]["cy"]), "to": (sub_map["get_info"]["cx"] + 10, sub_map["get_info"]["cy"] + sub_map["get_info"]["ry"]), "label": "include", "lx": 575, "ly": 930},
    ]

    svg_lines = []

    # Draw Association Lines
    for act_id, uc_id in associations:
        act = actors[act_id]
        uc = uc_map[uc_id]
        x1, y1 = act["connect_point"]
        if act["side"] == "left":
            x2 = uc_cx - uc_rx
            y2 = uc["cy"]
        else:
            x2 = uc_cx + uc_rx
            y2 = uc["cy"]
        svg_lines.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#334155" stroke-width="1.2"/>')

    # Draw extra associations
    for p1, p2 in extra_associations:
        svg_lines.append(f'<line x1="{p1[0]}" y1="{p1[1]}" x2="{p2[0]}" y2="{p2[1]}" stroke="#334155" stroke-width="1.2"/>')

    # Draw include dashed arrows
    for inc in include_rels:
        p1 = inc["from"]
        p2 = inc["to"]
        svg_lines.append(f'<line x1="{p1[0]}" y1="{p1[1]}" x2="{p2[0]}" y2="{p2[1]}" stroke="#334155" stroke-width="1.2" stroke-dasharray="3,3" marker-end="url(#arrow)"/>')
        if inc["label"]:
            svg_lines.append(f'<text x="{inc["lx"]}" y="{inc["ly"]}" font-family="Arial, sans-serif" font-size="9" fill="#334155" font-style="italic">&laquo;include&raquo;</text>')

    # Draw Stick Figures
    def draw_actor(act):
        ax = act["x"]
        ay = act["y"]
        col = act["color"]
        name = act["name"]
        return f"""
        <!-- Actor: {name} -->
        <g>
            <!-- Head -->
            <circle cx="{ax}" cy="{ay}" r="11" fill="{col}" stroke="#1e293b" stroke-width="1.5"/>
            <!-- Body -->
            <line x1="{ax}" y1="{ay+11}" x2="{ax}" y2="{ay+42}" stroke="#1e293b" stroke-width="1.8"/>
            <!-- Arms -->
            <line x1="{ax-16}" y1="{ay+22}" x2="{ax+16}" y2="{ay+22}" stroke="#1e293b" stroke-width="1.8"/>
            <!-- Left Leg -->
            <line x1="{ax}" y1="{ay+42}" x2="{ax-14}" y2="{ay+72}" stroke="#1e293b" stroke-width="1.8"/>
            <!-- Right Leg -->
            <line x1="{ax}" y1="{ay+42}" x2="{ax+14}" y2="{ay+72}" stroke="#1e293b" stroke-width="1.8"/>
            <!-- Name Label -->
            <text x="{ax}" y="{ay+88}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">{name}</text>
        </g>
        """

    actors_svg = [draw_actor(act) for act in actors.values()]

    # Draw Central Use Cases
    use_cases_svg = []
    for uc in use_cases:
        use_cases_svg.append(f"""
        <g>
            <ellipse cx="{uc_cx}" cy="{uc["cy"]}" rx="{uc_rx}" ry="{uc_ry}" fill="#ffffff" stroke="#0f172a" stroke-width="1.4"/>
            <text x="{uc_cx}" y="{uc["cy"]+4}" font-family="Arial, sans-serif" font-size="10.5" font-weight="600" fill="#0f172a" text-anchor="middle">{uc["text"]}</text>
        </g>
        """)

    # Draw Sub-Use Cases
    sub_cases_svg = []
    for s in sub_use_cases:
        sub_cases_svg.append(f"""
        <g>
            <ellipse cx="{s["cx"]}" cy="{s["cy"]}" rx="{s["rx"]}" ry="{s["ry"]}" fill="#ffffff" stroke="#0f172a" stroke-width="1.3"/>
            <text x="{s["cx"]}" y="{s["cy"]-3 if '<tspan' in s["text"] else s["cy"]+3.5}" font-family="Arial, sans-serif" font-size="9.5" font-weight="600" fill="#0f172a" text-anchor="middle">{s["text"]}</text>
        </g>
        """)

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Placido L. Señor NHS - UML Use Case Model</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            background: #ffffff;
            width: {W}px;
            height: {H}px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }}
    </style>
</head>
<body>
    <svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5" fill="none" stroke="#334155" stroke-width="1.5" stroke-linecap="round"/>
            </marker>
        </defs>

        <!-- System Boundary Box -->
        <rect x="{sb_x}" y="{sb_y}" width="{sb_w}" height="{sb_h}" fill="#ffffff" stroke="#0f172a" stroke-width="1.8"/>

        <!-- Title Box at top of System Boundary -->
        <rect x="{tb_x}" y="{tb_y}" width="{tb_w}" height="{tb_h}" fill="#ffffff" stroke="#0f172a" stroke-width="1.4"/>
        <text x="{tb_x + tb_w/2}" y="{tb_y + 22}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">
            Cross-Platform Enrollment and Scheduling System with Chatbot Support
        </text>

        <!-- Association & Include Lines -->
        {''.join(svg_lines)}

        <!-- Central Use Cases -->
        {''.join(use_cases_svg)}

        <!-- Sub Use Cases -->
        {''.join(sub_cases_svg)}

        <!-- Actors -->
        {''.join(actors_svg)}
    </svg>
</body>
</html>
"""
    return html_content

def main():
    html_str = render_svg_use_case()
    html_path = os.path.abspath("scratch/use_case.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_str)
    print(f"Generated {html_path}")

    temp_png = "C:/Users/mylen/AppData/Local/Temp/use_case_diagram.png"
    public_png = os.path.abspath("public/use_case_diagram.png")
    artifact_png = "C:/Users/mylen/.gemini/antigravity/brain/dc7aecf0-c3d2-4549-97e7-544cdb56c808/use_case_diagram.png"

    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    file_url = "file:///" + html_path.replace("\\", "/")

    cmd = [
        chrome_path,
        "--headless=new",
        "--disable-gpu",
        "--force-device-scale-factor=2",
        f"--screenshot={temp_png}",
        "--window-size=1050,1500",
        "--hide-scrollbars",
        file_url
    ]

    print("Running headless chrome capture for EXACT UML Use-Case diagram (Retina 2x)...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("Chrome exit code:", res.returncode)
    if os.path.exists(temp_png):
        shutil.copyfile(temp_png, public_png)
        shutil.copyfile(temp_png, artifact_png)
        size_kb = os.path.getsize(public_png) // 1024
        print(f"SUCCESS: Saved {public_png} ({size_kb} KB)")
        print(f"SUCCESS: Saved {artifact_png} ({size_kb} KB)")
    else:
        print("ERROR: temp_png was not generated. stderr:", res.stderr)

if __name__ == "__main__":
    main()
