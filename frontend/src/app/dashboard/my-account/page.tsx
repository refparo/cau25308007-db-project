'use client'
import { API_BASE } from "@/config"

import { usePopup } from "../../layout-client"
import { useAccountInfo } from "../layout"

export default function Account() {
  const { id, role, name } = useAccountInfo()
  const popup = usePopup()
  const changePassword = async (data: FormData) => {
    try {
      const resp = await fetch(new URL("/my-account", API_BASE), {
        method: 'POST',
        credentials: 'include',
        body: data
      })
      if (!resp.ok) throw new Error(
        await resp.json()
          .then(json => json.info)
          .catch(() => resp.statusText))
      popup.setContent(<>
        <h1 className="text-2xl">密码修改成功</h1>
      </>)
      popup.setVisible(true)
    } catch (e) {
      popup.setContent(<>
        <h1 className="text-2xl">错误</h1>
        <div>{`${e}`}</div>
      </>)
      popup.setVisible(true)
    }
  }
  return <>
    <h1 className="text-3xl">账号信息</h1>
    <div className="grid grid-cols-[repeat(2,max-content)] gap-4">
      <div className="font-bold">用户名</div><div>{id}</div>
      <div className="font-bold">姓名</div><div>{name}</div>
      <div className="font-bold">身份</div>
      <div>{({ "student": "学生", "teacher": "教师", "admin": "管理员" })[role]}</div>
    </div>
    <form className="grid grid-cols-[repeat(2,max-content)] gap-4 justify-items-start"
        onSubmit={e => {
          e.preventDefault()
          changePassword(new FormData(e.currentTarget))
          e.currentTarget.reset()
        }}>
      <div className="col-span-2 font-bold">修改密码</div>
      <label htmlFor="old-password">旧密码</label>
      <input type="password" name="old-password" id="old-password" required
        className="outline-none border-b border-b-cyan-700" />
      <label htmlFor="new-password">新密码</label>
      <input type="password" name="new-password" id="new-password" required
        className="outline-none border-b border-b-cyan-700" />
      <label htmlFor="repeat-new-password">重复新密码</label>
      <input type="password" name="repeat-new-password" id="repeat-new-password" required
        className="outline-none border-b border-b-cyan-700" />
      <input type="submit" value="确认" className="button col-span-2" />
    </form>
  </>
}
