import MySQLdb
from flask import jsonify, request

from .app import app
from .my_account import check_login
from .utils import error


@app.get("/teacher")
def get_teacher():
  """获取名字中包含 keyword 的所有教师，最多 50 个"""
  keyword = request.args.get("keyword")
  if keyword is None:
    error("查询格式不正确！")

  db, _ = check_login()
  c: MySQLdb.cursors.Cursor

  vague_name = "%" + keyword + "%"
  with db.cursor() as c:
    c.execute("SELECT id, name FROM teacher WHERE name LIKE %s", (vague_name,))
    teachers = c.fetchall()

  return jsonify([
    {
      "id": id,
      "name": name
    }
    for (id, name) in teachers
  ])
