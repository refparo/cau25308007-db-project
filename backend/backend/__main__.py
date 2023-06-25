from . import (app, account, classes, classroom, course, lecture, my_account,
               registration, schedule, session, student, teacher, term)

if __name__ == '__main__':
  app.app.run(host="0.0.0.0", debug=True)
