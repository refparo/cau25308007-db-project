import MySQLdb
from flask import jsonify, request

from .app import app
from .my_account import check_login
from .utils import error


@app.get("/classroom")
def get_classroom():
  """
  获取从第 offset 个开始的 length 个满足以下条件的教室
  1. 地点中包含 keyword
  2. 至少能提供 facility 设施
  3. 至少能容纳 capacity 人
  """
  offset = request.args.get("offset", type=int)
  length = request.args.get("length", type=int)
  keyword = request.args.get("keyword", default="")
  capacity = request.args.get("capacity", default=0, type=int)
  facility = request.args.get("facility", default=0, type=int)
  if offset is None or length is None:
    error("请求格式不正确！")

  db, _ = check_login()
  c: MySQLdb.cursors.Cursor

  vague_keyword: str = "%" + keyword + "%"

  with db.cursor() as c:
    c.execute("SELECT COUNT(*) FROM classroom")
    (total,) = c.fetchone()

  with db.cursor() as c:
    c.execute(
      "SELECT id, location, capacity, facility FROM classroom"
      " WHERE location LIKE %s AND (facility & %s) = %s AND capacity >= %s"
      " LIMIT %s OFFSET %s",
      (vague_keyword, facility, facility, capacity, length, offset))
    classrooms = c.fetchall()

  resp = jsonify({
    "total": total,
    "classroom": {
      id: {
        "location": location,
        "capacity": capacity,
        "facility": facility,
      }
      for (id, location, capacity, facility) in classrooms
    }
  })

  return resp

@app.put("/classroom")
def add_classroom():
  id = request.args.get("id")
  location = request.form.get("location")
  capacity = request.form.get("capacity", 0, type=int)
  facility = request.form.get("facility", 0, type=int)
  if id is None or location is None:
    error("请求格式不正确！")
  
  db, _ = check_login(expected_role="admin")
  c: MySQLdb.cursors.Cursor
  
  with db.cursor() as c:
    c.execute(
      "INSERT INTO classroom VALUES (%s, %s, %s, %s)",
      (id, location, capacity, facility))
    db.commit()
  
  return ""

@app.post("/classroom")
def modify_classroom():
  id = request.args.get("id")
  location = request.form.get("location")
  capacity = request.form.get("capacity", 0, type=int)
  facility = request.form.get("facility", 0, type=int)
  if id is None or location is None:
    error("请求格式不正确！")
  
  db, _ = check_login(expected_role="admin")
  c: MySQLdb.cursors.Cursor
  
  with db.cursor() as c:
    c.execute("SELECT id FROM classroom WHERE id = %s", (id,))
    if c.fetchone() is None:
      error("教室不存在！")
  
  with db.cursor() as c:
    c.execute(
      "UPDATE classroom SET location = %s, capacity = %s, facility = %s WHERE id = %s",
      (location, capacity, facility, id))
    db.commit()
  
  return ""

@app.delete("/classroom")
def delete_classroom():
  id = request.args.get("id")
  if id is None:
    error("请求格式不正确！")
  
  db, _ = check_login(expected_role="admin")
  c: MySQLdb.cursors.Cursor
  
  with db.cursor() as c:
    c.execute("SELECT id FROM classroom WHERE id = %s", (id,))
    if c.fetchone() is None:
      error("教室不存在！")
  
  with db.cursor() as c:
    c.execute(
      "DELETE FROM classroom WHERE id = %s",
      (id,))
    db.commit()
  
  return ""
