'use client'
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { API_BASE } from "@/config"

import { usePopup } from "../../layout-client"
import { useAccountInfo, useTermInfo } from "../layout"

export default function TermManagement() {
  const router = useRouter()
  const { role } = useAccountInfo()
  const terms = useTermInfo()
  useEffect(() => {
    if (role != "admin") router.push('/dashboard')
  }, [role])
  return <>
    <h1 className="text-3xl">学期管理</h1>
    <div className="flex flex-row gap-2">
      <div className="font-bold">当前学期</div>
      <div>{terms.terms[terms.current]}（请在配置文件中修改）</div>
    </div>
    <div className="border-t border-b border-cyan-700
        grid grid-cols-[repeat(2,max-content)_1fr]">
      <div className="px-4 py-0.5 font-bold text-center">学期号</div>
      <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">学期名</div>
      <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">操作</div>
      {Object.entries(terms.terms).map(([id, name]) =>
        <TermRow key={id} id={id} name={name} mutate={terms.mutate}></TermRow>
      )}
      <TermRow isNew mutate={terms.mutate}></TermRow>
    </div>
  </>
}

function TermRow({ id, name, isNew, mutate }: {
  id?: string
  name?: string
  isNew?: true
  mutate(): void
}) {
  const popup = usePopup()
  const [newId, setNewId] = useState("")
  const [newName, setNewName] = useState(name ?? "")
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
      : id}
    </div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">
      <input type="text"
        value={newName} required
        onChange={e => {
          setNewName(e.currentTarget.value)
          setModified(true)
        }}
        className="outline-none border-b border-b-cyan-700" />
    </div>
    <div className="px-1 py-0.5 border-t border-l border-cyan-700 flex gap-1">
      <button disabled={(isNew ? newId == "" : !modified) || newName == ""}
        className="button"
        onClick={async () => {
          try {
            const resp = await fetch(
              new URL(`/term?term-id=${isNew ? newId : id}&name=${newName}`, API_BASE),
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
            setNewName(name!)
            setModified(false)
          }}>取消</button>
      : <></>}
    </div>
  </>
}
