from typing import overload
import MySQLdb
from flask import jsonify, request

from .app import app
from .utils import connect_db, error


@overload
def check_login() -> tuple[MySQLdb.Connection, str]: ...
@overload
def check_login(expected_role: str) -> tuple[MySQLdb.Connection, str]: ...
@overload
def check_login(expected_role: list[str]) -> tuple[MySQLdb.Connection, str, str]: ...
def check_login(expected_role: str | list[str] | None = None):
  db = connect_db()
  c: MySQLdb.cursors.Cursor
  session = request.cookies.get("session")
  if session is None:
    error("请先登录！")
  with db.cursor() as c:
    if expected_role is None:
      c.execute(
        "SELECT account_id FROM session WHERE id = %s",
        (session,))
      result = c.fetchone()
      if result is None:
        error("请先登录！")
      (account_id,) = result
      return db, account_id
    else:
      c.execute(
        "SELECT account_id, role FROM account, session"
        " WHERE session.id = %s AND session.account_id = account.id",
        (session,))
      result = c.fetchone()
      if result is None:
        error("请先登录！")
      (account_id, role) = result
      if isinstance(expected_role, str):
        if role != expected_role:
          error("您无权执行此操作！")
        else:
          return db, account_id
      else:
        if role not in expected_role:
          error("您无权执行此操作！")
        else:
          return db, account_id, role


@app.get("/my-account")
def get_account_info():
  db = connect_db()
  c: MySQLdb.cursors.Cursor
  session = request.cookies.get("session")
  if session is None:
    error("请先登录！")
  with db.cursor() as c:
    c.execute(
      "SELECT account_id, role, name FROM account, session"
      " WHERE session.id = %s AND session.account_id = account.id",
      (session,))
    result = c.fetchone()
    if result is None:
      error("请先登录！")
    (id, role, name) = result
  return jsonify({
    "id": id,
    "role": role,
    "name": name
  })


@app.post("/my-account")
def change_password():
  """
  请求内容：表单 { old-password, new-password, repeat-new-password }
  1. 检查旧密码是否正确，两个新密码是否一致
  2. 修改数据库中的密码
  3. 删除所有跟当前帐号关联的 session
  """
  old_password = request.form.get("old-password")
  new_password = request.form.get("new-password")
  repeat_new_password = request.form.get("repeat-new-password")
  if (
    old_password is None or
    new_password is None or
    repeat_new_password is None
  ):
    error("表单不完整！")

  if old_password == new_password:
    error("新密码与旧密码相同！")

  if new_password != repeat_new_password:
    error("新密码输入不一致！")

  db = connect_db()
  c: MySQLdb.cursors.Cursor

  with db.cursor() as c:
    session = request.cookies.get(key="session")
    c.execute(
      "SELECT account_id FROM session WHERE id = %s",
      (session,))
    result = c.fetchone()
    if result is None:
      error("请先登录！")
  (account_id,) = result

  with db.cursor() as c:
    c.execute(
      "SELECT * FROM account WHERE id = %s AND password = %s",
      (account_id, old_password))
    result = c.fetchone()
    if result is None:
      error("旧密码错误！")

  with db.cursor() as c:
    c.execute("UPDATE account SET password = %s WHERE id = %s",
          (new_password, account_id))
    c.execute("DELETE FROM session WHERE account_id = %s",
          (account_id,))
    db.commit()

  return ""
