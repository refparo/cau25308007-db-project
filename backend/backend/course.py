import MySQLdb
from flask import jsonify, request

from .app import app
from .config import current_term
from .my_account import check_login
from .utils import error


@app.get("/course")
def get_course():
  """获取 term_id 学期从第 offset 个开始的 length 个课程"""
  term_id = request.args.get("term-id", current_term)
  offset = request.args.get("offset", type=int)
  length = request.args.get("length", type=int)
  # 若提供了 teacher_id，则只返回由该教师授课的课程
  teacher_id = request.args.get("teacher-id")
  if offset is None or length is None:
    error("请求格式不正确！")

  db, _, role = check_login(expected_role=["student", "teacher", "admin"])
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    if teacher_id is None:
      c.execute("SELECT COUNT(*) FROM course")
    else:
      c.execute(
        "SELECT COUNT(DISTINCT course.id) FROM course, class"
        " WHERE class.teacher_id = %s AND course.id = class.course_id",
        (teacher_id,))
    (total,) = c.fetchone()

  with db.cursor() as c:
    if teacher_id is None:
      if role == "admin":
        c.execute(
          "SELECT * FROM course LIMIT %s OFFSET %s",
          (length, offset))
      else:
        c.execute(
          "SELECT DISTINCT course.* FROM course, class"
          " WHERE class.term_id = %s"
          "  AND course.id = class.course_id"
          " LIMIT %s OFFSET %s",
          (term_id, length, offset))
    else:
      c.execute(
        "SELECT DISTINCT course.* FROM course, class"
        " WHERE class.term_id = %s AND class.teacher_id = %s AND"
        "  course.id = class.course_id"
        " LIMIT %s OFFSET %s",
        (term_id, teacher_id, length, offset))
    courses = c.fetchall()

  return jsonify({
    "total": total,
    "courses": [
      {
        "id": id,
        "name": name,
        "type": type,
        "credit": credit,
        "total_hour": total_hour,
        "weekly_hour": weekly_hour,
        "week": week,
        "facility": facility,
        "note": note,
      }
      for (id, name, type, credit, total_hour, weekly_hour, week, facility, note)
      in courses
    ]
  })


@app.put("/course")
def put_course():
  course_id = request.form.get("id")
  course_name = request.form.get("name")
  course_type = request.form.get("type")
  credit = request.form.get("credit", type=float)
  total_hour = request.form.get("total-hour", type=int)
  weekly_hour = request.form.get("weekly-hour", type=int)
  week = request.form.get("week", type=int)
  facility = request.form.get("facility", type=int)
  note = request.form.get("note")
  if (
    course_id is None or
    course_name is None or
    course_type is None or
    credit is None or
    total_hour is None or
    weekly_hour is None or
    week is None or
    facility is None
  ):
    error("请求格式不正确！")

  db, _ = check_login(expected_role="admin")
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    c.execute("SELECT * FROM course WHERE id = %s", (course_id,))
    if c.fetchone() is not None:
      error("课程号已存在！")

  with db.cursor() as c:
    c.execute(
      "INSERT INTO course VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
      (course_id, course_name, course_type, credit, total_hour, weekly_hour, week, facility, note))
    db.commit()

  return ""


@app.post("/course")
def modify_course():
  course_id = request.form.get("id")
  course_name = request.form.get("name")
  course_type = request.form.get("type")
  credit = request.form.get("credit", type=float)
  total_hour = request.form.get("total-hour", type=int)
  weekly_hour = request.form.get("weekly-hour", type=int)
  week = request.form.get("week", type=int)
  facility = request.form.get("facility", type=int)
  note = request.form.get("note")
  if (
    course_id is None or
    course_name is None or
    course_type is None or
    credit is None or
    total_hour is None or
    weekly_hour is None or
    week is None or
    facility is None
  ):
    error("请求格式不正确！")

  db, _ = check_login(expected_role="admin")
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    c.execute("SELECT * FROM course WHERE id = %s", (course_id,))
    if c.fetchone() is None:
      error("课程号不存在！")

  with db.cursor() as c:
    c.execute(
      "UPDATE course"
      " SET name = %s, type = %s, credit = %s, total_hour = %s,"
      "     weekly_hour = %s, week = %s, facility = %s, note = %s"
      " WHERE id = %s",
      (course_name, course_type, credit, total_hour, weekly_hour, week, facility, note, course_id))
    db.commit()
  return ""
