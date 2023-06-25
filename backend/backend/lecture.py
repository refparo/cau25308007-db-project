from typing import Any, Literal

import MySQLdb
from flask import jsonify, request

from .app import app
from .my_account import check_login
from .utils import error, str_to_week, week_to_str


@app.get("/lecture")
def get_lecture():
  """获取某教学班的所有课堂"""
  class_id = request.args.get("class-id", type=str)
  if class_id is None:
    error("请求格式不正确！")

  db, _ = check_login()
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    c.execute(
      "SELECT id FROM class WHERE id = %s",
      (class_id,))
    result = c.fetchone()
    if result is None:
      error("教学班不存在！")

  with db.cursor() as c:
    c.execute(
      "SELECT week, weekday, period, classroom_id, location FROM lecture, classroom"
      " WHERE class_id = %s AND lecture.classroom_id = classroom.id",
      (class_id,))
    lectures = c.fetchall()
  
  return jsonify([
    {
      "week": week_to_str(week),
      "weekday": weekday,
      "period": period,
      "classroom_id": classroom_id,
      "classroom": classroom
    }
    for (week, weekday, period, classroom_id, classroom) in lectures
  ])


@app.put("/lecture")
def put_lecture():
  """
  请求内容：JSON，结构同 get_lecture
  1. 检查身份
  2. 检查是否和已有课堂重复
  2. 清除已有的所有课堂
  3. 插入课堂
  """
  class_id = request.args.get("class-id")
  lectures = request.json  # type: ignore # 数组，结构同 get_lecture
  if class_id is None or not isinstance(lectures, list):
    error("请求格式不正确！")
  for lecture in lectures:
    if not isinstance(lecture, dict):
      error("请求格式不正确！")
    if (
      not isinstance(lecture["week"], str) or
      not isinstance(lecture["weekday"], int) or
      not isinstance(lecture["period"], int) or
      not isinstance(lecture["classroom_id"], str)
    ):
      error("请求格式不正确！")
    try:
      lecture["week"] = str_to_week(lecture["week"])
    except(ValueError):
      error("星期格式不正确！")
  lectures: list[dict[
    Literal["week"] | Literal["weekday"] | Literal["period"] | Literal["classroom_id"],
    Any
  ]]

  conflict_msgs = list[str]()
  for i in range(1, len(lectures)):
    lecture2 = lectures[i]
    for lecture1 in lectures[:i]:
      if (
        (lecture2["week"] & lecture1["week"]) != 0 and
        lecture2["weekday"] == lecture1["weekday"] and
        lecture2["period"] == lecture1["period"]
      ):
        conflict_msgs.append(
          "* "
          f"第 {week_to_str(lecture1['week'])} 周、"
          f"星期 {lecture1['weekday'] + 1}、"
          f"第 {lecture1['period'] + 1} 大节的课堂与"
          f"第 {week_to_str(lecture2['week'])} 周、"
          f"星期 {lecture2['weekday'] + 1}、"
          f"第 {lecture2['period'] + 1} 大节的课堂冲突")
  if len(conflict_msgs) > 0:
    error("设置的课堂中存在以下冲突：\n" + "\n".join(conflict_msgs))

  db, _ = check_login(expected_role="admin")
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    c.execute(
      "SELECT teacher_id FROM class WHERE id = %s",
      (class_id,))
    result = c.fetchone()
    if result is None:
      error("教学班不存在！")
    (teacher_id,) = result

  conflict_msgs = list[str]()
  for lecture in lectures:
    with db.cursor() as c:
      c.execute(
        "SELECT class_id, week FROM lecture WHERE class_id <> %s AND"
        " (week & %s) <> 0 AND weekday = %s AND period = %s AND classroom_id = %s",
        (class_id, lecture["week"], lecture["weekday"], lecture["period"], lecture["classroom_id"]))
      conflicts_due_to_classroom = c.fetchall()
    with db.cursor() as c:
      c.execute(
        "SELECT class_id, week FROM class, lecture"
        " WHERE class.id = lecture.class_id AND class_id <> %s AND"
        " (week & %s) <> 0 AND weekday = %s AND period = %s AND teacher_id = %s",
        (class_id, lecture["week"], lecture["weekday"], lecture["period"], teacher_id))
      conflicts_due_to_teacher = c.fetchall()
    if len(conflicts_due_to_classroom) > 0 or len(conflicts_due_to_teacher) > 0:
      conflict_msgs.append(
        f"第 {week_to_str(lecture['week'])} 周、"
        f"星期 {lecture['weekday']+1}、"
        f"第 {lecture['period']} 大节的课堂与已有的课堂存在以下冲突：")
      for (class_id, week) in conflicts_due_to_classroom:
        conflict_msgs.append(
          f"* 与课程号为 {class_id} 的课程在第 {week_to_str(week)} 周的课堂占用了同一个教室")
      for (class_id, week) in conflicts_due_to_teacher:
        conflict_msgs.append(
          f"* 与课程号为 {class_id} 的课程在第 {week_to_str(week)} 周的课堂需要同一个教师授课")
  if len(conflict_msgs) > 0:
    error("设置的课堂中存在以下冲突：\n" + "\n".join(conflict_msgs))

  with db.cursor() as c:
    c.execute("DELETE FROM lecture WHERE class_id = %s", (class_id,))
    c.executemany(
      "INSERT INTO lecture VALUES (%s, %s, %s, %s, %s)",
      [
        (
          class_id,
          lecture["week"],
          lecture["weekday"],
          lecture["period"],
          lecture["classroom_id"]
        )
        for lecture in lectures
      ])
    db.commit()

  return ""
