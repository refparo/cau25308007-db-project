'use client'
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import useSWR from "swr"

import { API_BASE } from "@/config"
import { fetcher } from "@/utils"

import { usePopup } from "../../layout-client"
import { useAccountInfo } from "../layout"

export interface Account {
  id: string,
  role: string,
  name: string
}

export interface Accounts {
  total: number,
  accounts: Account[]
}

export default function AccountManagement() {
  const router = useRouter()
  const { role } = useAccountInfo()
  const [pageLen, setPageLen] = useState(10)
  const [page, setPage] = useState(0)
  const switchPage = (page: number) => {
    setPage(page)
    window.scrollTo({
      behavior: "smooth",
      top: 0
    })
  }
  const accounts = useSWR<Accounts>(
    role == "admin" ? `/account?offset=${page * pageLen}&length=${pageLen}` : null,
    fetcher)
  const totalPage = Math.ceil((accounts.data?.total ?? 0) / pageLen)
  useEffect(() => {
    if (role != "admin") router.push('/dashboard')
  }, [role])
  return <>
    <h1 className="text-3xl">账号管理</h1>
    <div>
      <div className="py-1 border-b border-cyan-700 bg-gray-50 sticky top-0 z-20
          flex items-center justify-between">
        {/* 查询账号 */}
        <div className="flex items-center gap-4">
          <form className="flex items-center gap-4"
              onSubmit={e => {
                e.preventDefault()
                const data = new FormData(e.currentTarget)
                setPageLen(data.get("page-length") as unknown as number)
                switchPage(0)
              }}>
            <div className="flex gap-2 items-center">
              <label htmlFor="page-length" className="font-bold">每页显示</label>
              <input type="number" name="page-length" id="page-length"
                defaultValue={pageLen} min={5} max={100} required
                className="w-16 outline-none border-b border-b-cyan-700"/>
            </div>
            <input type="submit" value="检索" className="button" />
          </form>
        </div>
        {/* 页面切换 */}
        <div className="flex gap-4">
          <div className="flex shadow-lg">
            <button disabled={page == 0} onClick={() => switchPage(0)}
                className="button shadow-none rounded-r-none border-r
                  border-cyan-800 disabled:border-gray-500">
              ««</button>
            <button disabled={page == 0} onClick={() => switchPage(page - 1)}
                className="button shadow-none rounded-none border-r
                  border-cyan-800 disabled:border-gray-500">«</button>
            <button disabled={(page + 1) >= totalPage} onClick={() => switchPage(page + 1)}
                className="button shadow-none rounded-none border-r
                  border-cyan-800 disabled:border-gray-500">»</button>
            <button disabled={(page + 1) >= totalPage}
                onClick={() => switchPage(totalPage - 1)}
                className="button shadow-none rounded-l-none">»»</button>
          </div>
          <form className="flex gap-2 items-center"
              onSubmit={e => {
                e.preventDefault()
                const data = new FormData(e.currentTarget)
                switchPage(data.get("page") as unknown as number - 1)
                ;(e.currentTarget.querySelector("input[type=number]")! as HTMLInputElement).value = ""
              }}>
            <div>
              <span>第 </span>
              <input type="number" name="page" min={1} max={totalPage} required
                placeholder={`${page + 1}`}
                className="w-8 outline-none border-b border-b-cyan-700 appearance-textfield" />
              <span>/{totalPage} 页</span>
            </div>
            <input type="submit" value="跳转" className="button" />
          </form>
        </div>
      </div>
      <div className="border-b border-cyan-700
          grid grid-cols-[repeat(4,max-content)_1fr]">
        <div className="px-4 py-0.5 font-bold text-center">用户名</div>
        <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">姓名</div>
        <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">身份</div>
        <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">密码</div>
        <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">操作</div>
        {accounts.data ? accounts.data.accounts.map(account =>
          <AccountRow key={account.id} account={account} mutate={accounts.mutate}></AccountRow>
        ) : <></>}
        <AccountRow isNew mutate={accounts.mutate}></AccountRow>
      </div>
    </div>
  </>
}

function AccountRow({ account, isNew, mutate }: {
  account?: Account
  isNew?: true
  mutate(): void
}) {
  const popup = usePopup()
  const [newId, setNewId] = useState("")
  const [name, setName] = useState(account?.name ?? "")
  const [newRole, setNewRole] = useState("student")
  const [password, setPassword] = useState("")
  const [modified, setModified] = useState(false)
  return <>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-cyan-700">
      {isNew
      ? <input type="text"
          value={newId} required
          onChange={e => {
            setNewId(e.currentTarget.value)
            setModified(true)
          }}
          placeholder="新建"
          className="w-16 outline-none border-b border-b-cyan-700" />
      : account!.id}
    </div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">
      <input type="text"
        value={name} required
        onChange={e => {
          setName(e.currentTarget.value)
          setModified(true)
        }}
        className="outline-none border-b border-b-cyan-700" />
    </div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">
      {isNew ? <select value={newRole} onChange={e => {
        setNewRole(e.currentTarget.value)
        setModified(true)
      }}>
        <option value="student">学生</option>
        <option value="teacher">教师</option>
        <option value="admin">管理员</option>
      </select> : {
        "student": "学生",
        "teacher": "教师",
        "admin": "管理员"
      }[account!.role]}
    </div>
    <div className="px-1 py-0.5 flex items-center border-t border-l border-cyan-700">
      <input type="password"
        placeholder={isNew ? "初始密码" : "修改密码"}
        value={password} required={isNew}
        onChange={e => {
          setPassword(e.currentTarget.value)
          setModified(true)
        }}
        className="outline-none border-b border-b-cyan-700" />
    </div>
    <div className="px-1 py-0.5 border-t border-l border-cyan-700 flex gap-1">
      <button disabled={(isNew ? newId == "" || password == "" : !modified) || name == ""}
        className="button"
        onClick={async () => {
          try {
            const resp = await fetch(
              new URL(
                isNew
                ? `/account?id=${newId}&name=${name}&role=${newRole}&password=${password}`
                : `/account?id=${account!.id}${
                  name != account!.name ? `&name=${name}` : ""
                }${
                  password != "" ? `&password=${password}` : ""
                }`, API_BASE),
              {
                method: isNew ? 'PUT' : 'POST',
                credentials: 'include'
              })
            if (!resp.ok) throw new Error(
              await resp.json()
                .then(json => json.info)
                .catch(() => resp.statusText))
          } catch (e) {
            popup.setContent(<>
              <h1 className="text-3xl">错误</h1>
              <div className="whitespace-pre-wrap">{`${e}`}</div>
            </>)
            popup.setVisible(true)
            return
          }
          setModified(false)
          mutate()
        }}>{isNew ? "新建" : "保存"}</button>
      {!isNew ?
        <button disabled={!modified} className="button"
          onClick={() => {
            setName(account!.name)
            setPassword("")
            setModified(false)
          }}>取消</button>
      : <></>}
    </div>
  </>
}
