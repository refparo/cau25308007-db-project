from flask import Flask, Response, make_response, request

from .config import web_origin

app = Flask(__name__)

# %%
@app.before_request
def handle_preflight():
  if request.method == 'OPTIONS':
    resp = make_response()
    resp.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    resp.headers.set('Access-Control-Allow-Origin', web_origin)
    resp.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    resp.headers.set('Access-Control-Allow-Credentials', 'true')
    resp.headers.set('Access-Control-Max-Age', '86400')
    return resp


@app.after_request
def allow_cors(resp: Response):
  resp.headers.set('Access-Control-Allow-Origin', web_origin)
  resp.headers.set('Access-Control-Allow-Credentials', 'true')
  return resp
