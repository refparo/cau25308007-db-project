import secrets
from datetime import datetime, timedelta

import MySQLdb
from flask import jsonify, make_response, request

from .app import app
from .utils import connect_db, error


@app.post("/session")
def create_session():
  username = request.form.get("username")
  password = request.form.get("password")
  auto_login = request.form.get("auto-login", False, type=bool)
  if username is None or password is None:
    error("请求格式不正确！")

  db = connect_db()
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    c.execute(
      "SELECT id FROM account WHERE id = %s AND password = %s;",
      (username, password))
    if c.fetchone() is None:
      error("账号或密码错误！")

  session = secrets.token_hex(16)
  if auto_login:
    expires_at = datetime.now() + timedelta(days=30)
  else:
    expires_at = datetime.now() + timedelta(hours=2)

  with db.cursor() as c:
    c.execute(
      "INSERT INTO session(id, account_id, expires_at) VALUES (%s, %s, %s)",
      (session, username, expires_at.isoformat(' ')))
    db.commit()

  resp = make_response()
  resp.set_cookie("session", session, httponly=True, expires=expires_at)
  return resp


@app.delete("/session")
def end_session():
  """
  删除当前 session，也就是注销
  """
  session = request.cookies.get(key="session")
  if session is None:
    return ""
  
  db = connect_db()
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    c.execute("DELETE FROM session WHERE id = %s", (session,))
    db.commit()

  resp = make_response()
  resp.delete_cookie("session")
  return resp
