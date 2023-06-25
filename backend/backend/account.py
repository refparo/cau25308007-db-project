import MySQLdb
from flask import jsonify, request

from .app import app
from .my_account import check_login
from .utils import error

@app.get("/account")
def get_account():
  offset = request.args.get("offset", type=int)
  length = request.args.get("length", type=int)
  if offset is None or length is None:
    error("请求格式不正确！")

  db, _ = check_login(expected_role="admin")
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    c.execute("SELECT COUNT(*) FROM account", ())
    (total,) = c.fetchone()

  with db.cursor() as c:
    c.execute(
      "SELECT id, role, name FROM account LIMIT %s OFFSET %s",
      (length, offset))
    accounts = c.fetchall()
  
  return jsonify({
    "total": total,
    "accounts": [
      {
        "id": id,
        "role": role,
        "name": name
      }
      for (id, role, name) in accounts
    ]
  })


@app.put("/account")
def add_account():
  id = request.args.get("id")
  role = request.args.get("role")
  name = request.args.get("name")
  password = request.args.get("password")
  if (
    id is None or
    role is None or
    role not in ["student", "teacher", "admin"] or
    name is None or
    password is None
  ):
    error("请求格式不正确！")

  db, _ = check_login(expected_role="admin")
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    c.execute("SELECT id FROM account WHERE id = %s", (id,))
    if c.fetchone() is not None:
      error("用户名已存在！")

  with db.cursor() as c:
    c.execute(
      "INSERT INTO account(id, role, name, password) VALUES (%s, %s, %s, %s)",
      (id, role, name, password))
    db.commit()

  return ""


@app.post("/account")
def modify_account():
  id = request.args.get("id")
  name = request.args.get("name")
  password = request.args.get("password")
  if id is None:
    error("请求格式不正确！")

  db, _ = check_login(expected_role="admin")
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    c.execute("SELECT id FROM account WHERE id = %s", (id,))
    if c.fetchone() is None:
      error("用户名不存在！")

  with db.cursor() as c:
    if name is not None:
      c.execute("UPDATE account SET name = %s WHERE id = %s", (name, id))
    if password is not None:
      c.execute("UPDATE account SET password = %s WHERE id = %s", (password, id))
      c.execute("DELETE FROM session WHERE account_id = %s", (id,))
    db.commit()

  return ""
