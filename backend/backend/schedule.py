import MySQLdb
from flask import jsonify

from .app import app
from .config import current_term
from .my_account import check_login
from .utils import week_to_str


@app.get("/schedule")
def get_schedule():
  """课程表"""
  db, account_id, role = check_login(expected_role=["student", "teacher"])
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    if role == "student":
      c.execute(
        "SELECT class_id, course.name, teacher.name"
        " FROM registration, class, course, teacher"
        " WHERE student_id = %s AND `status` = 'studying' AND term_id = %s AND"
        "  registration.class_id = class.id AND"
        "  class.course_id = course.id AND"
        "  class.teacher_id = teacher.id",
        (account_id, current_term))
    else:
      c.execute(
        "SELECT class.id, course.name"
        " FROM class, course"
        " WHERE teacher_id = %s AND term_id = %s AND"
        "  class.course_id = course.id",
        (account_id, current_term))
    classes = c.fetchall()

  schedule = {weekday: {period: [] for period in range(6)} for weekday in range(7)}
  unscheduled = []

  for class_tup in classes:
    if role == "student":
      (class_id, course_name, teacher_name) = class_tup
    else:
      (class_id, course_name) = class_tup
      teacher_name = None

    with db.cursor() as c:
      c.execute(
        "SELECT week, weekday, period, classroom.location"
        " FROM lecture, classroom"
        " WHERE class_id = %s AND"
        "  lecture.classroom_id = classroom.id",
        (class_id,))
      lectures = c.fetchall()

    if len(lectures) == 0:
      unscheduled.append({
        "id": class_id,
        "name": course_name,
        "teacher": teacher_name,
      })
    else:
      for lecture in lectures:
        (week, weekday, period, location) = lecture
        schedule[weekday][period].append({
          "id": class_id,
          "name": course_name,
          "teacher": teacher_name,
          "location": location,
          "week": week_to_str(week),
        })

  return jsonify({
    "scheduled": schedule,
    "unscheduled": unscheduled,
  })
