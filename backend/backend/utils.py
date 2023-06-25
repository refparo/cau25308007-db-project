from typing import NoReturn
import MySQLdb
from flask import abort, jsonify

from .config import db_database, db_host, db_password, db_port, db_user


def connect_db() -> MySQLdb.Connection:
  return MySQLdb.connect(
    host=db_host,
    user=db_user,
    password=db_password,
    database=db_database,
    port=db_port)


def error(msg: str) -> NoReturn:
  resp = jsonify({"info": msg})
  resp.status_code = 400
  abort(resp)


def week_to_str(bits: int):
  def make_range(start: int, end: int):
    if start == end:
      return f"{start}"
    else:
      return f"{start}-{end}"
  week_ranges = list[str]()
  begin = 0
  in_range = False
  i = 0
  while bits > 0:
    if bits & 1:
      if not in_range:
        begin = i
        in_range = True
    else:
      if in_range:
        week_ranges.append(make_range(begin + 1, i))
        in_range = False
    i += 1
    bits >>= 1
  if in_range:
    week_ranges.append(make_range(begin + 1, i))
  return ", ".join(week_ranges)


def str_to_week(week: str):
  bits = 0
  for interval in week.strip().split(","):
    if interval.strip() == "": continue
    match interval.strip().split('-'):
      case (x, ):
        bits |= 1 << (int(x) - 1)
      case (begin, end):
        for i in range(int(begin) - 1, int(end)):
          bits |= 1 << i
      case _:
        raise ValueError("格式错误！")
  return bits
