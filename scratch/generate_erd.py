import os
import subprocess
import shutil

# Compact, zero-waste table layout
# Canvas width: 1740px, Canvas height: 1480px

TABLES = {
    "students": {
        "x": 40,
        "y": 80,
        "width": 330,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("AK", "lrn", "text NOT NULL"),
            ("", "last_name", "text NOT NULL"),
            ("", "first_name", "text NOT NULL"),
            ("", "middle_name", "text"),
            ("", "suffix", "text"),
            ("", "date_of_birth", "date NOT NULL"),
            ("", "age", "int4"),
            ("", "gender", "text"),
            ("", "civil_status", "text"),
            ("", "nationality", "text"),
            ("", "religion", "text"),
            ("", "contact_number", "text NOT NULL"),
            ("", "email", "text NOT NULL"),
            ("FK", "parent_id", "uuid"),
            ("FK", "section_id", "uuid"),
            ("", "created_at", "timestamptz"),
            ("", "updated_at", "timestamptz"),
            ("", "form_138_url", "text"),
            ("", "psa_birth_url", "text"),
            ("", "good_moral_url", "text"),
            ("", "documents_status", "text"),
            ("", "address", "text"),
            ("", "parent_name", "text"),
            ("", "parent_contact", "text"),
            ("", "birth_date", "text"),
            ("FK", "enrollment_id", "uuid"),
            ("", "grade_level", "text"),
            ("", "strand", "text"),
            ("", "student_type", "text"),
        ],
    },
    "sections": {
        "x": 40,
        "y": 680,
        "width": 330,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("", "name", "text NOT NULL"),
            ("", "grade_level", "text NOT NULL"),
            ("", "strand", "text"),
            ("FK", "adviser_id", "uuid"),
            ("", "room", "text"),
            ("", "created_at", "timestamptz"),
            ("", "updated_at", "timestamptz"),
            ("", "adviser_name", "text"),
        ],
    },
    "compliance_reports": {
        "x": 40,
        "y": 905,
        "width": 330,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("", "report_type", "text NOT NULL"),
            ("", "period", "text"),
            ("", "due_date", "date"),
            ("", "status", "text"),
            ("", "submitted_date", "date"),
            ("", "notes", "text"),
            ("", "created_at", "timestamptz"),
        ],
    },
    "grades": {
        "x": 40,
        "y": 1110,
        "width": 330,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("FK", "student_id", "uuid NOT NULL"),
            ("FK", "subject_id", "uuid NOT NULL"),
            ("FK", "section_id", "uuid"),
            ("FK", "teacher_id", "uuid"),
            ("", "school_year", "text NOT NULL"),
            ("", "semester", "text"),
            ("", "quarter", "int4"),
            ("", "grade", "numeric"),
            ("", "remarks", "text"),
            ("", "created_at", "timestamptz"),
            ("", "updated_at", "timestamptz"),
        ],
    },
    "users": {
        "x": 405,
        "y": 80,
        "width": 290,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("", "last_name", "text NOT NULL"),
            ("", "first_name", "text"),
            ("AK", "email", "text"),
            ("", "password", "text NOT NULL"),
            ("", "role", "text NOT NULL"),
            ("FK", "student_id", "uuid"),
            ("FK", "parent_id", "uuid"),
            ("", "created_at", "timestamptz"),
            ("", "updated_at", "timestamptz"),
            ("", "contact_number", "text"),
            ("", "address", "text"),
        ],
    },
    "guidance": {
        "x": 405,
        "y": 360,
        "width": 290,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("FK", "student_id", "uuid"),
            ("", "student_name", "text NOT NULL"),
            ("", "lrn", "text"),
            ("", "grade_level", "text"),
            ("", "section", "text"),
            ("", "counselor_name", "text"),
            ("", "session_type", "text"),
            ("", "purpose", "text"),
            ("", "notes", "text"),
            ("", "action_plan", "text"),
            ("", "status", "text"),
            ("", "session_date", "date"),
            ("", "session_time", "text"),
            ("", "created_at", "timestamptz"),
            ("", "updated_at", "timestamptz"),
        ],
    },
    "teachers": {
        "x": 405,
        "y": 710,
        "width": 290,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("FK", "user_id", "uuid"),
            ("AK", "employee_id", "text NOT NULL"),
            ("", "specialization", "text"),
            ("", "phone", "text"),
            ("", "address", "text"),
            ("", "created_at", "timestamptz"),
            ("", "updated_at", "timestamptz"),
        ],
    },
    "activity_logs": {
        "x": 405,
        "y": 915,
        "width": 290,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("FK", "user_id", "uuid"),
            ("", "role", "text"),
            ("", "action", "text NOT NULL"),
            ("", "details", "text"),
            ("", "timestamp", "timestamptz"),
        ],
    },
    "transferees": {
        "x": 405,
        "y": 1085,
        "width": 290,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("FK", "student_id", "uuid"),
            ("", "type", "text"),
            ("", "from_school", "text"),
            ("", "to_school", "text"),
            ("", "reason", "text"),
            ("", "status", "text"),
            ("", "requested_date", "timestamptz"),
            ("", "created_at", "timestamptz"),
        ],
    },
    "teacher_faces": {
        "x": 405,
        "y": 1310,
        "width": 290,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("FK,AK", "teacher_id", "uuid NOT NULL"),
            ("", "face_fingerprint", "text NOT NULL"),
            ("", "face_preview", "text"),
            ("", "registered_at", "timestamptz"),
        ],
    },
    "teacher_attendance": {
        "x": 730,
        "y": 80,
        "width": 330,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("FK", "teacher_id", "uuid NOT NULL"),
            ("", "date", "date NOT NULL"),
            ("", "time_in", "timestamptz"),
            ("", "time_out", "timestamptz"),
            ("", "in_status", "text"),
            ("", "out_status", "text"),
            ("", "created_at", "timestamptz"),
            ("", "in_latitude", "float8"),
            ("", "in_longitude", "float8"),
            ("", "in_distance_m", "float8"),
            ("", "out_latitude", "float8"),
            ("", "out_longitude", "float8"),
            ("", "out_distance_m", "float8"),
        ],
    },
    "enrollments": {
        "x": 730,
        "y": 395,
        "width": 330,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("FK", "student_id", "uuid"),
            ("", "grade_level", "text NOT NULL"),
            ("", "strand", "text"),
            ("", "previous_school", "text NOT NULL"),
            ("", "previous_grade", "text NOT NULL"),
            ("", "last_school_year", "text NOT NULL"),
            ("", "general_average", "numeric"),
            ("", "status", "text"),
            ("", "created_at", "timestamptz"),
            ("", "updated_at", "timestamptz"),
            ("", "email", "text"),
            ("", "first_name", "text"),
            ("", "last_name", "text"),
            ("", "middle_name", "text"),
            ("", "dob", "text"),
            ("", "date_of_birth", "date"),
            ("", "age", "int4"),
            ("", "birthplace", "text"),
            ("", "gender", "text"),
            ("", "nationality", "text"),
            ("", "religion", "text"),
            ("", "address", "text"),
            ("", "contact_number", "text"),
            ("", "mother_name", "text"),
            ("", "mother_occupation", "text"),
            ("", "father_name", "text"),
            ("", "father_occupation", "text"),
            ("", "guardian_name", "text"),
            ("", "guardian_relationship", "text"),
            ("", "guardian_contact", "text"),
            ("", "guardian_email", "text"),
            ("", "guardian_address", "text"),
            ("", "student_type", "text"),
            ("", "applicant_id", "uuid"),
            ("", "school_year", "text"),
            ("", "enrolled_date", "timestamptz"),
        ],
    },
    "documents": {
        "x": 730,
        "y": 1125,
        "width": 330,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("FK", "enrollment_id", "uuid"),
            ("", "birth_certificate", "text"),
            ("", "report_card", "text"),
            ("", "good_moral", "text"),
            ("", "photo", "text"),
            ("", "created_at", "timestamptz"),
        ],
    },
    "notifications": {
        "x": 1095,
        "y": 80,
        "width": 290,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("FK", "user_id", "uuid"),
            ("", "role", "text"),
            ("", "title", "text NOT NULL"),
            ("", "message", "text NOT NULL"),
            ("", "type", "text"),
            ("", "read", "bool"),
            ("", "created_at", "timestamptz"),
            ("FK", "enrollment_id", "uuid"),
            ("", "is_read", "bool"),
        ],
    },
    "schedules": {
        "x": 1095,
        "y": 325,
        "width": 290,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("FK", "section_id", "uuid"),
            ("FK", "teacher_id", "uuid"),
            ("", "day", "text NOT NULL"),
            ("", "start_time", "time NOT NULL"),
            ("", "end_time", "time NOT NULL"),
            ("", "room", "text"),
            ("", "created_at", "timestamptz"),
            ("FK", "subject_id", "uuid"),
        ],
    },
    "attendance": {
        "x": 1095,
        "y": 550,
        "width": 290,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("FK", "student_id", "uuid"),
            ("FK", "teacher_id", "uuid"),
            ("", "date", "date NOT NULL"),
            ("", "status", "text"),
            ("", "time_in", "time"),
            ("", "time_out", "time"),
            ("", "created_at", "timestamptz"),
            ("FK", "subject_id", "uuid"),
            ("", "remarks", "text"),
        ],
    },
    "student_documents": {
        "x": 1095,
        "y": 795,
        "width": 290,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("FK", "student_id", "uuid"),
            ("", "document_type", "text NOT NULL"),
            ("", "file_url", "text NOT NULL"),
            ("", "file_name", "text"),
            ("", "file_size", "int4"),
            ("", "uploaded_at", "timestamptz"),
            ("", "verified", "bool"),
            ("", "verified_at", "timestamptz"),
            ("", "remarks", "text"),
        ],
    },
    "attendance_locations": {
        "x": 1420,
        "y": 550,
        "width": 280,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("", "name", "text NOT NULL"),
            ("", "latitude", "float8 NOT NULL"),
            ("", "longitude", "float8 NOT NULL"),
            ("", "radius_meters", "int4 NOT NULL"),
            ("", "is_active", "bool NOT NULL"),
            ("", "created_at", "timestamptz NOT NULL"),
            ("", "updated_at", "timestamptz NOT NULL"),
        ],
    },
    "subjects": {
        "x": 1420,
        "y": 760,
        "width": 280,
        "columns": [
            ("PK", "id", "uuid NOT NULL"),
            ("", "name", "text NOT NULL"),
            ("", "code", "text NOT NULL"),
            ("", "grade_level", "text NOT NULL"),
            ("", "strand", "text"),
            ("", "semester", "text"),
            ("", "quarter", "text"),
            ("", "subject_type", "text"),
            ("", "description", "text"),
            ("", "created_at", "timestamptz"),
            ("", "updated_at", "timestamptz"),
            ("", "hours", "int4"),
        ],
    },
}

ROW_HEIGHT = 18.0
HEADER_HEIGHT = 28

def get_table_height(tbl):
    return HEADER_HEIGHT + len(tbl["columns"]) * ROW_HEIGHT

def get_row_y(tbl, col_index):
    return tbl["y"] + HEADER_HEIGHT + col_index * ROW_HEIGHT + ROW_HEIGHT / 2

def get_col_index(tbl_name, col_name):
    for i, col in enumerate(TABLES[tbl_name]["columns"]):
        if col[1] == col_name:
            return i
    return 0

RELATIONSHIPS = [
    # 0. students.id -> guidance.student_id (Short 35px horizontal bridge!)
    {
        "pts": [
            (TABLES["students"]["x"] + TABLES["students"]["width"], get_row_y(TABLES["students"], 0)),
            (388, get_row_y(TABLES["students"], 0)),
            (388, get_row_y(TABLES["guidance"], get_col_index("guidance", "student_id"))),
            (TABLES["guidance"]["x"], get_row_y(TABLES["guidance"], get_col_index("guidance", "student_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 1. users.id -> teachers.user_id
    {
        "pts": [
            (TABLES["users"]["x"] + TABLES["users"]["width"], get_row_y(TABLES["users"], 0)),
            (712, get_row_y(TABLES["users"], 0)),
            (712, get_row_y(TABLES["teachers"], get_col_index("teachers", "user_id"))),
            (TABLES["teachers"]["x"] + TABLES["teachers"]["width"], get_row_y(TABLES["teachers"], get_col_index("teachers", "user_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 2. students.id -> users.student_id
    {
        "pts": [
            (TABLES["students"]["x"] + TABLES["students"]["width"], get_row_y(TABLES["students"], 0) + 10),
            (388, get_row_y(TABLES["students"], 0) + 10),
            (388, get_row_y(TABLES["users"], get_col_index("users", "student_id"))),
            (TABLES["users"]["x"], get_row_y(TABLES["users"], get_col_index("users", "student_id"))),
        ],
        "from_card": "one",
        "to_card": "one",
    },
    # 3. users.parent_id -> students.parent_id
    {
        "pts": [
            (TABLES["users"]["x"], get_row_y(TABLES["users"], get_col_index("users", "parent_id"))),
            (388, get_row_y(TABLES["users"], get_col_index("users", "parent_id"))),
            (388, get_row_y(TABLES["students"], get_col_index("students", "parent_id"))),
            (TABLES["students"]["x"] + TABLES["students"]["width"], get_row_y(TABLES["students"], get_col_index("students", "parent_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 4. sections.id -> students.section_id
    {
        "pts": [
            (TABLES["sections"]["x"], get_row_y(TABLES["sections"], 0)),
            (20, get_row_y(TABLES["sections"], 0)),
            (20, get_row_y(TABLES["students"], get_col_index("students", "section_id"))),
            (TABLES["students"]["x"], get_row_y(TABLES["students"], get_col_index("students", "section_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 5. students.id -> enrollments.student_id
    {
        "pts": [
            (TABLES["students"]["x"] + TABLES["students"]["width"], get_row_y(TABLES["students"], 0) + 20),
            (388, get_row_y(TABLES["students"], 0) + 20),
            (388, 60),
            (712, 60),
            (712, get_row_y(TABLES["enrollments"], get_col_index("enrollments", "student_id"))),
            (TABLES["enrollments"]["x"], get_row_y(TABLES["enrollments"], get_col_index("enrollments", "student_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 6. enrollments.id -> students.enrollment_id
    {
        "pts": [
            (TABLES["enrollments"]["x"], get_row_y(TABLES["enrollments"], 0)),
            (712, get_row_y(TABLES["enrollments"], 0)),
            (712, 342),
            (388, 342),
            (388, get_row_y(TABLES["students"], get_col_index("students", "enrollment_id"))),
            (TABLES["students"]["x"] + TABLES["students"]["width"], get_row_y(TABLES["students"], get_col_index("students", "enrollment_id"))),
        ],
        "from_card": "one",
        "to_card": "one",
    },
    # 7. enrollments.id -> documents.enrollment_id
    {
        "pts": [
            (TABLES["enrollments"]["x"] + 160, TABLES["enrollments"]["y"] + get_table_height(TABLES["enrollments"])),
            (TABLES["enrollments"]["x"] + 160, TABLES["documents"]["y"]),
        ],
        "from_card": "one",
        "to_card": "one",
    },
    # 8. enrollments.id -> notifications.enrollment_id
    {
        "pts": [
            (TABLES["enrollments"]["x"] + TABLES["enrollments"]["width"], get_row_y(TABLES["enrollments"], 0)),
            (1078, get_row_y(TABLES["enrollments"], 0)),
            (1078, get_row_y(TABLES["notifications"], get_col_index("notifications", "enrollment_id"))),
            (TABLES["notifications"]["x"], get_row_y(TABLES["notifications"], get_col_index("notifications", "enrollment_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 9. users.id -> notifications.user_id
    {
        "pts": [
            (TABLES["users"]["x"] + TABLES["users"]["width"], get_row_y(TABLES["users"], 0)),
            (1078, get_row_y(TABLES["users"], 0)),
            (1078, get_row_y(TABLES["notifications"], get_col_index("notifications", "user_id"))),
            (TABLES["notifications"]["x"], get_row_y(TABLES["notifications"], get_col_index("notifications", "user_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 10. users.id -> activity_logs.user_id
    {
        "pts": [
            (TABLES["users"]["x"] + TABLES["users"]["width"], get_row_y(TABLES["users"], 0) + 12),
            (712, get_row_y(TABLES["users"], 0) + 12),
            (712, get_row_y(TABLES["activity_logs"], get_col_index("activity_logs", "user_id"))),
            (TABLES["activity_logs"]["x"] + TABLES["activity_logs"]["width"], get_row_y(TABLES["activity_logs"], get_col_index("activity_logs", "user_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 11. teachers.id -> teacher_attendance.teacher_id
    {
        "pts": [
            (TABLES["teachers"]["x"] + TABLES["teachers"]["width"], get_row_y(TABLES["teachers"], 0)),
            (712, get_row_y(TABLES["teachers"], 0)),
            (712, get_row_y(TABLES["teacher_attendance"], get_col_index("teacher_attendance", "teacher_id"))),
            (TABLES["teacher_attendance"]["x"], get_row_y(TABLES["teacher_attendance"], get_col_index("teacher_attendance", "teacher_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 12. teachers.id -> teacher_faces.teacher_id
    {
        "pts": [
            (TABLES["teachers"]["x"], get_row_y(TABLES["teachers"], 0) + 10),
            (388, get_row_y(TABLES["teachers"], 0) + 10),
            (388, get_row_y(TABLES["teacher_faces"], get_col_index("teacher_faces", "teacher_id"))),
            (TABLES["teacher_faces"]["x"], get_row_y(TABLES["teacher_faces"], get_col_index("teacher_faces", "teacher_id"))),
        ],
        "from_card": "one",
        "to_card": "one",
    },
    # 13. teachers.id -> sections.adviser_id (Short 35px horizontal line!)
    {
        "pts": [
            (TABLES["teachers"]["x"], get_row_y(TABLES["teachers"], 0)),
            (388, get_row_y(TABLES["teachers"], 0)),
            (388, get_row_y(TABLES["sections"], get_col_index("sections", "adviser_id"))),
            (TABLES["sections"]["x"] + TABLES["sections"]["width"], get_row_y(TABLES["sections"], get_col_index("sections", "adviser_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 14. sections.id -> schedules.section_id
    {
        "pts": [
            (TABLES["sections"]["x"] + TABLES["sections"]["width"], get_row_y(TABLES["sections"], 0) + 10),
            (388, get_row_y(TABLES["sections"], 0) + 10),
            (388, 305),
            (1078, 305),
            (1078, get_row_y(TABLES["schedules"], get_col_index("schedules", "section_id"))),
            (TABLES["schedules"]["x"], get_row_y(TABLES["schedules"], get_col_index("schedules", "section_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 15. teachers.id -> schedules.teacher_id
    {
        "pts": [
            (TABLES["teachers"]["x"] + TABLES["teachers"]["width"], get_row_y(TABLES["teachers"], 0) + 12),
            (1078, get_row_y(TABLES["teachers"], 0) + 12),
            (1078, get_row_y(TABLES["schedules"], get_col_index("schedules", "teacher_id"))),
            (TABLES["schedules"]["x"], get_row_y(TABLES["schedules"], get_col_index("schedules", "teacher_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 16. subjects.id -> schedules.subject_id
    {
        "pts": [
            (TABLES["subjects"]["x"], get_row_y(TABLES["subjects"], 0)),
            (1402, get_row_y(TABLES["subjects"], 0)),
            (1402, get_row_y(TABLES["schedules"], get_col_index("schedules", "subject_id"))),
            (TABLES["schedules"]["x"] + TABLES["schedules"]["width"], get_row_y(TABLES["schedules"], get_col_index("schedules", "subject_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 17. students.id -> attendance.student_id
    {
        "pts": [
            (TABLES["students"]["x"] + TABLES["students"]["width"], get_row_y(TABLES["students"], 0) + 30),
            (388, get_row_y(TABLES["students"], 0) + 30),
            (388, 532),
            (1078, 532),
            (1078, get_row_y(TABLES["attendance"], get_col_index("attendance", "student_id"))),
            (TABLES["attendance"]["x"], get_row_y(TABLES["attendance"], get_col_index("attendance", "student_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 18. teachers.id -> attendance.teacher_id
    {
        "pts": [
            (TABLES["teachers"]["x"] + TABLES["teachers"]["width"], get_row_y(TABLES["teachers"], 0) + 20),
            (1078, get_row_y(TABLES["teachers"], 0) + 20),
            (1078, get_row_y(TABLES["attendance"], get_col_index("attendance", "teacher_id"))),
            (TABLES["attendance"]["x"], get_row_y(TABLES["attendance"], get_col_index("attendance", "teacher_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 19. subjects.id -> attendance.subject_id (Short 35px horizontal bridge!)
    {
        "pts": [
            (TABLES["subjects"]["x"], get_row_y(TABLES["subjects"], 0) + 10),
            (1402, get_row_y(TABLES["subjects"], 0) + 10),
            (1402, get_row_y(TABLES["attendance"], get_col_index("attendance", "subject_id"))),
            (TABLES["attendance"]["x"] + TABLES["attendance"]["width"], get_row_y(TABLES["attendance"], get_col_index("attendance", "subject_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 20. students.id -> transferees.student_id
    {
        "pts": [
            (TABLES["students"]["x"] + TABLES["students"]["width"], get_row_y(TABLES["students"], 0) + 40),
            (388, get_row_y(TABLES["students"], 0) + 40),
            (388, get_row_y(TABLES["transferees"], get_col_index("transferees", "student_id"))),
            (TABLES["transferees"]["x"], get_row_y(TABLES["transferees"], get_col_index("transferees", "student_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 21. students.id -> student_documents.student_id
    {
        "pts": [
            (TABLES["students"]["x"] + TABLES["students"]["width"], get_row_y(TABLES["students"], 0) + 50),
            (388, get_row_y(TABLES["students"], 0) + 50),
            (388, 775),
            (1078, 775),
            (1078, get_row_y(TABLES["student_documents"], get_col_index("student_documents", "student_id"))),
            (TABLES["student_documents"]["x"], get_row_y(TABLES["student_documents"], get_col_index("student_documents", "student_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 22. students.id -> grades.student_id
    {
        "pts": [
            (TABLES["students"]["x"], get_row_y(TABLES["students"], 0)),
            (16, get_row_y(TABLES["students"], 0)),
            (16, get_row_y(TABLES["grades"], get_col_index("grades", "student_id"))),
            (TABLES["grades"]["x"], get_row_y(TABLES["grades"], get_col_index("grades", "student_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 23. sections.id -> grades.section_id
    {
        "pts": [
            (TABLES["sections"]["x"], get_row_y(TABLES["sections"], 0)),
            (24, get_row_y(TABLES["sections"], 0)),
            (24, get_row_y(TABLES["grades"], get_col_index("grades", "section_id"))),
            (TABLES["grades"]["x"], get_row_y(TABLES["grades"], get_col_index("grades", "section_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 24. subjects.id -> grades.subject_id
    {
        "pts": [
            (TABLES["subjects"]["x"] + 100, TABLES["subjects"]["y"] + get_table_height(TABLES["subjects"])),
            (TABLES["subjects"]["x"] + 100, 1400),
            (TABLES["grades"]["x"] + 200, 1400),
            (TABLES["grades"]["x"] + 200, TABLES["grades"]["y"] + get_table_height(TABLES["grades"])),
        ],
        "from_card": "one",
        "to_card": "many",
    },
    # 25. teachers.id -> grades.teacher_id
    {
        "pts": [
            (TABLES["teachers"]["x"], get_row_y(TABLES["teachers"], 0) + 20),
            (388, get_row_y(TABLES["teachers"], 0) + 20),
            (388, get_row_y(TABLES["grades"], get_col_index("grades", "teacher_id"))),
            (TABLES["grades"]["x"] + TABLES["grades"]["width"], get_row_y(TABLES["grades"], get_col_index("grades", "teacher_id"))),
        ],
        "from_card": "one",
        "to_card": "many",
    },
]

def render_html():
    canvas_w = 1740
    canvas_h = 1460

    svg_elements = []

    for rel in RELATIONSHIPS:
        pts = rel["pts"]
        d_str = f"M {pts[0][0]} {pts[0][1]} "
        for p in pts[1:]:
            d_str += f"L {p[0]} {p[1]} "
        
        # Base orthogonal line
        svg_elements.append(f'<path d="{d_str}" fill="none" stroke="#475569" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>')

        # Destination symbol (crow's foot for many, || for one)
        pn, pn_prev = pts[-1], pts[-2]
        if rel["to_card"] == "many":
            dx = pn[0] - pn_prev[0]
            dy = pn[1] - pn_prev[1]
            if dx > 0: # entering from left
                x, y = pn[0], pn[1]
                svg_elements.append(f'<path d="M {x-10} {y-6} L {x} {y} L {x-10} {y+6}" fill="none" stroke="#334155" stroke-width="1.3"/>')
                svg_elements.append(f'<circle cx="{x-13}" cy="{y}" r="2.2" fill="#ffffff" stroke="#334155" stroke-width="1.2"/>')
            elif dx < 0: # entering from right
                x, y = pn[0], pn[1]
                svg_elements.append(f'<path d="M {x+10} {y-6} L {x} {y} L {x+10} {y+6}" fill="none" stroke="#334155" stroke-width="1.3"/>')
                svg_elements.append(f'<circle cx="{x+13}" cy="{y}" r="2.2" fill="#ffffff" stroke="#334155" stroke-width="1.2"/>')
            elif dy > 0: # entering from top
                x, y = pn[0], pn[1]
                svg_elements.append(f'<path d="M {x-6} {y-10} L {x} {y} L {x+6} {y-10}" fill="none" stroke="#334155" stroke-width="1.3"/>')
                svg_elements.append(f'<circle cx="{x}" cy="{y-13}" r="2.2" fill="#ffffff" stroke="#334155" stroke-width="1.2"/>')
            elif dy < 0: # entering from bottom
                x, y = pn[0], pn[1]
                svg_elements.append(f'<path d="M {x-6} {y+10} L {x} {y} L {x+6} {y+10}" fill="none" stroke="#334155" stroke-width="1.3"/>')
                svg_elements.append(f'<circle cx="{x}" cy="{y+13}" r="2.2" fill="#ffffff" stroke="#334155" stroke-width="1.2"/>')
        else:
            dx = pn[0] - pn_prev[0]
            dy = pn[1] - pn_prev[1]
            x, y = pn[0], pn[1]
            if dx != 0:
                dir_x = 1 if dx < 0 else -1
                svg_elements.append(f'<line x1="{x + dir_x*4.5}" y1="{y-4.5}" x2="{x + dir_x*4.5}" y2="{y+4.5}" stroke="#334155" stroke-width="1.3"/>')
                svg_elements.append(f'<line x1="{x + dir_x*8}" y1="{y-4.5}" x2="{x + dir_x*8}" y2="{y+4.5}" stroke="#334155" stroke-width="1.3"/>')
            else:
                dir_y = 1 if dy < 0 else -1
                svg_elements.append(f'<line x1="{x-4.5}" y1="{y + dir_y*4.5}" x2="{x+4.5}" y2="{y + dir_y*4.5}" stroke="#334155" stroke-width="1.3"/>')
                svg_elements.append(f'<line x1="{x-4.5}" y1="{y + dir_y*8}" x2="{x+4.5}" y2="{y + dir_y*8}" stroke="#334155" stroke-width="1.3"/>')

        # Origin symbol (one: ||)
        p0, p1 = pts[0], pts[1]
        dx0 = p1[0] - p0[0]
        dy0 = p1[1] - p0[1]
        x0, y0 = p0[0], p0[1]
        if dx0 != 0:
            dir_x0 = 1 if dx0 > 0 else -1
            svg_elements.append(f'<line x1="{x0 + dir_x0*4.5}" y1="{y0-4.5}" x2="{x0 + dir_x0*4.5}" y2="{y0+4.5}" stroke="#334155" stroke-width="1.3"/>')
            svg_elements.append(f'<line x1="{x0 + dir_x0*8}" y1="{y0-4.5}" x2="{x0 + dir_x0*8}" y2="{y0+4.5}" stroke="#334155" stroke-width="1.3"/>')
        else:
            dir_y0 = 1 if dy0 > 0 else -1
            svg_elements.append(f'<line x1="{x0-4.5}" y1="{y0 + dir_y0*4.5}" x2="{x0+4.5}" y2="{y0 + dir_y0*4.5}" stroke="#334155" stroke-width="1.3"/>')
            svg_elements.append(f'<line x1="{x0-4.5}" y1="{y0 + dir_y0*8}" x2="{x0+4.5}" y2="{y0 + dir_y0*8}" stroke="#334155" stroke-width="1.3"/>')

    # Build HTML for tables
    table_cards = []
    for tname, tdata in TABLES.items():
        w = tdata["width"]
        x = tdata["x"]
        y = tdata["y"]

        rows_html = []
        for key_type, col_name, col_type in tdata["columns"]:
            key_badge = ""
            if "PK" in key_type and "FK" in key_type:
                key_badge = '<span class="key-badge pk-fk">PK,FK</span>'
            elif "PK" in key_type:
                key_badge = '<span class="key-badge pk">PK</span>'
            elif "FK" in key_type:
                key_badge = '<span class="key-badge fk">FK</span>'
            elif "AK" in key_type:
                key_badge = '<span class="key-badge ak">AK</span>'

            rows_html.append(f"""
            <tr class="table-row">
                <td class="col-key">{key_badge}</td>
                <td class="col-name">{col_name}</td>
                <td class="col-type">{col_type}</td>
            </tr>
            """)

        table_cards.append(f"""
        <div class="entity-card" style="left: {x}px; top: {y}px; width: {w}px;">
            <div class="entity-header">
                <span class="entity-title">{tname}</span>
            </div>
            <table class="entity-table">
                <tbody>
                    {''.join(rows_html)}
                </tbody>
            </table>
        </div>
        """)

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Placido L. Señor NHS - Entity Relationship Diagram (ERD)</title>
    <style>
        @page {{
            size: {canvas_w}px {canvas_h}px;
            margin: 0;
        }}
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        body {{
            background-color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1e293b;
            width: {canvas_w}px;
            height: {canvas_h}px;
            position: relative;
            overflow: hidden;
            -webkit-font-smoothing: antialiased;
        }}
        .canvas {{
            width: {canvas_w}px;
            height: {canvas_h}px;
            position: absolute;
            left: 0;
            top: 0;
            background: #ffffff;
        }}
        .diagram-header-banner {{
            position: absolute;
            left: 40px;
            top: 16px;
            right: 40px;
            height: 48px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 5px;
            padding: 6px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 1px 2px rgba(0,0,0,0.03);
            z-index: 30;
        }}
        .brand-title {{
            font-size: 9px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }}
        .main-heading {{
            font-size: 13.5px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 1px;
            letter-spacing: -0.2px;
        }}
        .legend-box {{
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 9.5px;
            font-weight: 700;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 4px 10px;
        }}
        .legend-item {{
            display: flex;
            align-items: center;
            gap: 4px;
        }}
        .badge-pill {{
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: 800;
        }}
        .badge-pill.pk {{
            background: #0f172a;
            color: #ffffff;
        }}
        .badge-pill.fk {{
            background: #e2e8f0;
            color: #334155;
            border: 1px solid #cbd5e1;
        }}
        .badge-pill.ak {{
            background: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
        }}
        svg.connectors {{
            position: absolute;
            left: 0;
            top: 0;
            width: {canvas_w}px;
            height: {canvas_h}px;
            pointer-events: none;
            z-index: 10;
        }}
        .entity-card {{
            position: absolute;
            background: #ffffff;
            border: 1.2px solid #475569;
            border-radius: 4px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.04);
            z-index: 20;
            overflow: hidden;
        }}
        .entity-header {{
            background: #f8fafc;
            border-bottom: 1.2px solid #475569;
            padding: 4px 10px;
            text-align: center;
            height: {HEADER_HEIGHT}px;
            display: flex;
            align-items: center;
            justify-content: center;
        }}
        .entity-title {{
            font-size: 11.5px;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: 0.2px;
        }}
        .entity-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
            line-height: 1.15;
        }}
        .table-row {{
            height: {ROW_HEIGHT}px;
            border-bottom: 1px solid #f1f5f9;
        }}
        .table-row:last-child {{
            border-bottom: none;
        }}
        .col-key {{
            width: 42px;
            padding-left: 6px;
            font-weight: 700;
            font-size: 8px;
            color: #475569;
            white-space: nowrap;
        }}
        .col-name {{
            padding: 0 6px;
            font-weight: 600;
            color: #0f172a;
            white-space: nowrap;
            font-family: Consolas, "SF Mono", "Courier New", monospace;
            font-size: 9.5px;
        }}
        .col-type {{
            padding: 0 8px;
            text-align: right;
            color: #64748b;
            white-space: nowrap;
            font-family: Consolas, "SF Mono", "Courier New", monospace;
            font-size: 8.5px;
        }}
        .key-badge {{
            display: inline-block;
            font-weight: 700;
            font-size: 8px;
        }}
        .key-badge.pk {{
            color: #0f172a;
        }}
        .key-badge.fk {{
            color: #475569;
        }}
        .key-badge.ak {{
            color: #047857;
        }}
        .key-badge.pk-fk {{
            color: #0f172a;
        }}
    </style>
</head>
<body>
    <div class="canvas">
        <div class="diagram-header-banner">
            <div>
                <div class="brand-title">Republic of the Philippines • Department of Education • Region VII</div>
                <div class="main-heading">PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL — DATABASE ENTITY RELATIONSHIP DIAGRAM (ERD)</div>
            </div>
            <div class="legend-box">
                <div class="legend-item"><span class="badge-pill pk">PK</span> Primary Key</div>
                <div class="legend-item"><span class="badge-pill fk">FK</span> Foreign Key</div>
                <div class="legend-item"><span class="badge-pill ak">AK</span> Alternate / Unique</div>
                <div class="legend-item" style="color: #475569;">|| One-to-One · &gt;-o One-to-Many</div>
            </div>
        </div>
        <svg class="connectors" width="{canvas_w}" height="{canvas_h}">
            {''.join(svg_elements)}
        </svg>
        {''.join(table_cards)}
    </div>
</body>
</html>
"""
    return html_content

def main():
    html_str = render_html()
    html_path = os.path.abspath("scratch/erd.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_str)
    print(f"Generated {html_path}")

    temp_png = "C:/Users/mylen/AppData/Local/Temp/erd_database_diagram.png"
    public_png = os.path.abspath("public/erd_database_diagram.png")
    artifact_png = "C:/Users/mylen/.gemini/antigravity/brain/dc7aecf0-c3d2-4549-97e7-544cdb56c808/erd_database_diagram.png"

    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    file_url = "file:///" + html_path.replace("\\", "/")

    cmd = [
        chrome_path,
        "--headless=new",
        "--disable-gpu",
        "--force-device-scale-factor=2",
        f"--screenshot={temp_png}",
        "--window-size=1740,1460",
        "--hide-scrollbars",
        file_url
    ]

    print("Running headless chrome capture (Compact Zero-Gap Retina 2x)...")
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

    # Generate High-Resolution Vector PDF
    public_pdf = os.path.abspath("public/erd_database_diagram.pdf")
    artifact_pdf = "C:/Users/mylen/.gemini/antigravity/brain/dc7aecf0-c3d2-4549-97e7-544cdb56c808/erd_database_diagram.pdf"

    cmd_pdf = [
        chrome_path,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={public_pdf}",
        file_url
    ]
    print("Running headless chrome PDF print...")
    res_pdf = subprocess.run(cmd_pdf, capture_output=True, text=True)
    if os.path.exists(public_pdf):
        shutil.copyfile(public_pdf, artifact_pdf)
        pdf_size_kb = os.path.getsize(public_pdf) // 1024
        print(f"SUCCESS: Saved Vector PDF {public_pdf} ({pdf_size_kb} KB)")
        print(f"SUCCESS: Saved Vector PDF {artifact_pdf} ({pdf_size_kb} KB)")
    else:
        print("ERROR: PDF was not generated. stderr:", res_pdf.stderr)

if __name__ == "__main__":
    main()
