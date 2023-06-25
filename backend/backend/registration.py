import MySQLdb
from flask import jsonify, request

from .app import app
from .config import current_term
from .my_account import check_login
from .utils import error


@app.get("/registration")
def get_registration():
  """
  获取自己选的本学期的所有课
  可以在 config.py 里加一个变量表示本学期
  如果提供了 class_id 参数，则获取教学班的所有选课，并且要求用户是教师或管理员
  """
  class_id = request.args.get("class-id")

  if class_id is None:  # 获取自己选的本学期的所有课
    db, account_id = check_login(expected_role="student")
    c: MySQLdb.cursors.Cursor

    with db.cursor() as c:
      c.execute(
        "SELECT class_id, course.name, teacher.name, `status`, credit, type, score, `rank`"
        " FROM registration, class, course, teacher"
        " WHERE registration.student_id = %s AND class.term_id = %s AND"
        "  registration.class_id = class.id AND"
        "  class.course_id = course.id AND"
        "  class.teacher_id = teacher.id",
        (account_id, current_term))
      registrations = c.fetchall()
    
    return jsonify([
      {
        "class_id": class_id,
        "name": course_name,
        "teacher": teacher,
        "status": status,
        "credit": credit,
        "type": course_type,
        "score": score,
        "rank": rank
      }
      for (class_id, course_name, teacher, status, credit, course_type, score, rank)
      in registrations
    ])
  else:  # 教学班的所有选课，并且要求用户是教室或管理员
    db, account_id, role = check_login(expected_role=["teacher", "admin"])
    c: MySQLdb.cursors.Cursor

    with db.cursor() as c:
      c.execute("SELECT id FROM class WHERE id = %s", (class_id,))
      if c.fetchone() is None:
        error("教学班不存在！")

    if role == "teacher":
      with db.cursor() as c:
        c.execute(
          "SELECT id FROM class WHERE id = %s AND class.teacher_id = %s",
          (class_id, account_id))
        if c.fetchone() is None:
          error("您不是该教学班的授课教师！")

    with db.cursor() as c:
      c.execute(
        "SELECT student_id, student.name, `status`, score, `rank`"
        " FROM registration, student"
        " WHERE class_id = %s AND"
        "  registration.student_id = student.id",
        (class_id,))
      registrations = c.fetchall()

    return jsonify([
      {
        "student_id": student_id,
        "student": student_name,
        "status": status,
        "score": score,
        "rank": rank
      }
      for (student_id, student_name, status, score, rank)
      in registrations
    ])


@app.put("/registration")
def put_registration():
  """
  选课
  1. 检查是否冲突选课
  2. 插入数据库
  """
  class_id = request.args.get("class-id")
  student_id = request.args.get("student-id")
  confirm = request.args.get("confirm", False, type=bool)
  if class_id is None:
    error("请求格式不正确！")

  c: MySQLdb.cursors.Cursor
  if student_id is None: # 学生选课
    db, student_id = check_login(expected_role="student")
    role = "student"
  else: # 管理员置入课
    db, _ = check_login(expected_role="admin")
    role = "admin"
    with db.cursor() as c:
      c.execute("SELECT id FROM student WHERE id = %s", (student_id,))
      if c.fetchone() is None:
        error("学生不存在！")

  with db.cursor() as c:
    c.execute(
      "SELECT student_count, max_student_count FROM class WHERE id = %s",
      (class_id,))
    result = c.fetchone()
    if result is None:
      error("教学班不存在！")
  (student_count, max_student_count) = result

  with db.cursor() as c:
    c.execute(
      "SELECT course_id INTO @course_id FROM class WHERE id = %s;"
      "SELECT class_id FROM registration, class"
      " WHERE student_id = %s AND course_id = @course_id AND"
      "  status = 'studying' AND"
      "  registration.class_id = class.id",
      (class_id, student_id))
    if c.fetchone() is not None:
      error("不允许学生同时选择一门课程的多个教学班！")

  with db.cursor() as c:
    c.execute("SELECT week, weekday, period FROM lecture WHERE class_id = %s",
      (class_id,))
    lectures = c.fetchall()

  if not (role == "admin" and confirm):
    if student_count >= max_student_count:
      error("教学班已满！")
    
    conflicts = []
    for (week, weekday, period) in lectures:
      with db.cursor() as c:
        c.execute(
          "SELECT course.name FROM registration, lecture, class, course"
          " WHERE registration.class_id = class.id AND"
          "  lecture.class_id = class.id AND"
          "  class.course_id = course.id AND"
          "  student_id = %s AND status = 'studying' AND"
          "  (lecture.week & %s) <> 0 AND weekday = %s AND period = %s",
          (student_id, week, weekday, period))
        conflicts.extend(course_name for (course_name,) in c.fetchall())
    if len(conflicts) > 0:
      error(f"该课程与学生已选的以下课程冲突：" + "、".join(conflicts))

  with db.cursor() as c:
    c.execute(
      "INSERT INTO registration VALUES (%s, %s, 'studying', NULL, NULL)",
      (student_id, class_id))
    db.commit()

  return ""


@app.delete("/registration")
def delete_registration():
  """退选"""
  class_id = request.args.get("class-id")
  student_id = request.args.get("student-id")
  if class_id is None:
    error("请求格式不正确！")

  c: MySQLdb.cursors.Cursor
  if student_id is None: # 学生选课
    db, student_id = check_login(expected_role="student")
  else: # 管理员置入课
    db, _ = check_login(expected_role="admin")
    with db.cursor() as c:
      c.execute("SELECT id FROM student WHERE id = %s", (student_id,))
      if c.fetchone() is None:
        error("学生不存在！")
  
  with db.cursor() as c:
    c.execute(
      "DELETE FROM registration WHERE class_id = %s AND student_id = %s",
      (class_id, student_id))
    db.commit()

  return ""


@app.post("/registration")
def modify_registration():
  """
  请求内容：表单 { status, score, rank }
  1. 检测用户是教师或管理员
  2. 检测要修改的选课条目是否存在
  2. 修改数据库
  """
  class_id = request.args.get("class-id")
  student_id = request.args.get("student-id")
  status = request.form.get("status")
  score = request.form.get("score", type=float)
  rank = request.form.get("rank")
  if (
    class_id is None or
    student_id is None or
    status is None
  ):
    error("请求格式不正确！")
  
  db, account_id, role = check_login(expected_role=["teacher", "admin"])
  c: MySQLdb.cursors.Cursor
  
  with db.cursor() as c:
    c.execute("SELECT id FROM class WHERE id = %s", (class_id,))
    if c.fetchone() is None:
      error("教学班不存在！")
  
  if role == "teacher":
    with db.cursor() as c:
      c.execute(
        "SELECT id FROM class WHERE id = %s AND class.teacher_id = %s",
        (class_id, account_id))
      if c.fetchone() is None:
        error("您不是该教学班的授课教师！")
  
  with db.cursor() as c:
    c.execute(
      "SELECT class_id FROM registration WHERE class_id = %s AND student_id = %s",
      (class_id, student_id))
    if c.fetchone() is None:
      error("教学班内不存在该学生！")
  
  with db.cursor() as c:
    c.execute(
      "UPDATE registration SET `status` = %s, score = %s, `rank` = %s"
      " WHERE class_id = %s AND student_id = %s",
      (status, score, rank, class_id, student_id))
    db.commit()
  
  return ""
