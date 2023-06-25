import MySQLdb
from flask import jsonify, request

from .app import app
from .config import current_term
from .my_account import check_login
from .utils import error


@app.get("/class")
def get_class():
  """获取某课程在某个学期的所有教学班"""
  course_id = request.args.get("course-id")
  term_id = request.args.get("term-id", current_term)
  # 若提供了 teacher_id，则只返回由该教师授课的课程
  teacher_id = request.args.get("teacher-id", None)
  if course_id is None:
    error("请求格式不正确！")

  db, _ = check_login()
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    if teacher_id is None:
      c.execute(
        "SELECT class.id, teacher_id, teacher.name, student_count, max_student_count"
        " FROM class, teacher"
        " WHERE course_id = %s AND term_id = %s AND class.teacher_id = teacher.id",
        (course_id, term_id))
    else:
      c.execute(
        "SELECT class.id, teacher_id, teacher.name, student_count, max_student_count"
        " FROM class, teacher"
        " WHERE course_id = %s AND term_id = %s AND teacher.id = %s AND"
        "  class.teacher_id = teacher.id",
        (course_id, term_id, teacher_id))
    classes = c.fetchall()

  return jsonify([
    {
      "id": id,
      "teacher_id": teacher_id,
      "teacher": teacher,
      "student_count": student_count,
      "max_student_count": max_student_count
    }
    for (id, teacher_id, teacher, student_count, max_student_count)
    in classes
  ])


@app.put("/class")
def put_class():
  """
  请求内容：表单 { id, teacher_id, max_student_count }
  添加新教学班
  """
  course_id = request.args.get("course-id")
  term_id = request.args.get("term-id")
  class_id = request.form.get("id")
  teacher_id = request.form.get("teacher-id")
  max_student_count = request.form.get("max-student-count", type=int)
  if (
    course_id is None or
    term_id is None or
    class_id is None or
    teacher_id is None or
    max_student_count is None
  ):
    error("请求格式不正确！")

  db, _ = check_login(expected_role="admin")
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    c.execute(
      "SELECT * FROM class WHERE id = %s",
      (class_id,))
    if c.fetchone() is not None:
      error(f"课程班号已存在！")

  with db.cursor() as c:
    c.execute(
      "INSERT INTO class VALUES (%s, %s, %s, %s, 0, %s)",
      (class_id, course_id, term_id, teacher_id, max_student_count))
    db.commit()

  return ""


@app.post("/class")
def modify_class():
  """
  请求内容：表单 { id, teacher_id, max_student_count }
  修改新教学班
  """
  course_id = request.args.get("course-id")
  term_id = request.args.get("term-id")
  class_id = request.form.get("id")
  teacher_id = request.form.get("teacher-id")
  max_student_count = request.form.get("max-student-count", type=int)
  if (
    course_id is None or
    term_id is None or
    class_id is None or
    teacher_id is None or
    max_student_count is None
  ):
    error("请求格式不正确！")

  db, _ = check_login(expected_role="admin")
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    c.execute(
      "SELECT * FROM class WHERE id = %s",
      (class_id,))
    if c.fetchone() is None:
      error("教学班号不存在！")

  with db.cursor() as c:
    c.execute(
      "UPDATE class"
      " SET course_id = %s, term_id = %s, teacher_id = %s, max_student_count = %s"
      " WHERE id = %s",
      (course_id, term_id, teacher_id, max_student_count, class_id))
    db.commit()

  return ""
