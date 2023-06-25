import MySQLdb
from flask import jsonify, request

from .app import app
from .config import current_term
from .my_account import check_login
from .utils import error


@app.get("/term")
def get_term():
  """获取所有学期"""
  db, _ = check_login()
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    c.execute("SELECT id, name FROM term")
    terms = c.fetchall()

  return jsonify({
    "current": current_term,
    "terms": {
      id: name
      for (id, name) in terms
    }
  })


@app.put("/term")
def add_term():
  id = request.args.get("term-id")
  name = request.args.get("name")
  if id is None or name is None:
    error("请求格式不正确！")

  db, _ = check_login(expected_role="admin")
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    c.execute("SELECT id FROM term WHERE id = %s", (id,))
    if c.fetchone() is not None:
      error("学期号已存在！")

  with db.cursor() as c:
    c.execute("INSERT INTO term(id, name) VALUES (%s, %s)", (id, name))
    db.commit()

  return ""


@app.post("/term")
def modify_term():
  id = request.args.get("term-id")
  name = request.args.get("name")
  if id is None or name is None:
    error("请求格式不正确！")

  db, _ = check_login(expected_role="admin")
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    c.execute("SELECT id FROM term WHERE id = %s", (id,))
    if c.fetchone() is None:
      error("学期号不存在！")

  with db.cursor() as c:
    c.execute("UPDATE term SET name = %s WHERE id = %s", (name, id))
    db.commit()

  return ""

