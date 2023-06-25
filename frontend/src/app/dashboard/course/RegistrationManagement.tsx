import { useState } from 'react'
import useSWR, { SWRResponse } from 'swr'

import SearchSelect from '@/app/components/SearchSelect'
import { API_BASE } from '@/config'
import { fetcher } from '@/utils'

import { usePopup } from '../../layout-client'
import { useAccountInfo } from '../layout'

interface Registration {
  student_id: string
  student: string
  status: string
  score: number
  rank: string
}

export default function RegistrationManagement({ classId }: {
  classId: string
}) {
  const popup = usePopup()
  const { role } = useAccountInfo()
  const registrations = useSWR<Registration[]>(`/registration?class-id=${classId}`, fetcher)
  const [newStudentId, setNewStudentId] = useState("")
  async function addStudent(confirm: boolean) {
    try {
      const resp = await fetch(
        new URL(`/registration?class-id=${classId}&student-id=${newStudentId}${confirm ? '&confirm=true' : ''}`, API_BASE),
        {
          method: 'PUT',
          credentials: 'include'
        })
      if (!resp.ok) {
        if (!confirm) {
          const { info }: { info: string } = await resp.json()
          if (!info.match(/^(教学班已满|该课程与学生已选的以下课程冲突)/)) {
            throw new Error(info)
          }
          popup.setContent(<>
            <h1 className="text-3xl">错误</h1>
            <div className="whitespace-pre-wrap">{info}{'\n'}确定要添加该学生吗？</div>
            <div className="flex gap-2">
              <button className="button hover:bg-red-600"
                onClick={() => {
                  addStudent(true)
                  popup.setVisible(false)
                }}>确定</button>
              <button className="button"
                onClick={() => popup.setVisible(false)}>取消</button>
            </div>
          </>)
          popup.setVisible(true)
          return
        } else {
          throw new Error(
            await resp.json()
              .then(json => json.info)
              .catch(() => resp.statusText))
        }
      }
    } catch (e) {
      popup.setContent(<>
        <h1 className="text-3xl">错误</h1>
        <div className="whitespace-pre-wrap">{`${e}`}</div>
      </>)
      popup.setVisible(true)
      return
    }
    registrations.mutate()
  }
  return <>
    <div className="text-xl">学生管理</div>
    <div className="border-t border-b border-cyan-700
        grid grid-cols-[repeat(5,max-content)_1fr]">
      <div className="px-4 py-0.5 font-bold text-center">学号</div>
      <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">姓名</div>
      <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">修读状态</div>
      <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">分数</div>
      <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">评级</div>
      <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">操作</div>
      {registrations.data ? registrations.data.map(reg =>
        <RegistrationRow key={reg.student_id} classId={classId} reg={reg} mutate={registrations.mutate}></RegistrationRow>)
      : <>加载中……</>}
      {role == "admin" ? <>
        <div className="px-1 py-0.5 flex justify-center items-center border-t border-cyan-700">{newStudentId}</div>
        <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">
          <SearchSelect id="" name=""
            api={keyword => `/student?keyword=${keyword}`}
            transform={data => data}
            defaultName="添加学生" defaultId=""
            onChange={value => setNewStudentId(value)}></SearchSelect>
        </div>
        <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">修读中</div>
        <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700"></div>
        <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">未定</div>
        <div className="px-1 py-0.5 border-t border-l border-cyan-700 flex gap-1">
          <button disabled={newStudentId == ""} className="button"
            onClick={() => addStudent(false)}>添加</button>
        </div>
      </> : <></>}
    </div>
  </>
}

function RegistrationRow({ classId, reg, mutate }: {
  classId: string,
  reg: Registration,
  mutate: SWRResponse["mutate"]
}) {
  const popup = usePopup()
  const { role } = useAccountInfo()
  const [status, setStatus] = useState(reg.status)
  const [score, setScore] = useState<number | undefined>(reg.score)
  const [rank, setRank] = useState<string | undefined>(reg.rank)
  const [modified, setModified] = useState(false)
  return <>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-cyan-700">{reg.student_id}</div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">{reg.student}</div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">
      <select className="px-2 py-1"
          value={status}
          onChange={e => {
            setStatus(e.currentTarget.value)
            setModified(true)
          }}>
        <option value="studying">修读中</option>
        <option value="passed">已通过</option>
        <option value="failed">不及格</option>
        <option value="deferred">已缓考</option>
      </select>
    </div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">
      <input type="number"
        className="w-16 outline-none border-b border-b-cyan-700"
        min="0" max="100"
        value={score ?? ""} onChange={e => {
          if (e.currentTarget.value == "") {
            setScore(undefined)
          } else {
            setScore(e.currentTarget.valueAsNumber)
          }
          setModified(true)
        }} />
    </div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">
      <select className="px-2 py-1"
          value={rank ?? "?"}
          onChange={e => {
            if (e.currentTarget.value == "?") {
              setRank(undefined)
            } else {
              setRank(e.currentTarget.value)
            }
            setModified(true)
          }}>
        <option value="?">未定</option>
        <option>A+</option>
        <option>A</option>
        <option>A-</option>
        <option>B+</option>
        <option>B</option>
        <option>B-</option>
        <option>C+</option>
        <option>C</option>
        <option>D+</option>
        <option>D</option>
        <option>F</option>
        <option>P</option>
        <option>N</option>
      </select>
    </div>
    <div className="px-1 py-0.5 border-t border-l border-cyan-700 flex gap-1">
      <button disabled={!modified} className="button"
        onClick={async () => {
          const data = new FormData()
          data.set("status", status)
          typeof score == 'number' && data.set("score", score.toString())
          typeof rank == 'string' && data.set("rank", rank)
          try {
            const resp = await fetch(
              new URL(`/registration?class-id=${classId}&student-id=${reg.student_id}`, API_BASE),
              {
                method: 'POST',
                credentials: 'include',
                body: data
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
        }}>保存</button>
      <button disabled={!modified} className="button"
        onClick={() => {
          setStatus(reg.status)
          setScore(reg.score)
          setRank(reg.rank)
          setModified(false)
        }}>取消</button>
      {role == "admin" ?
        <button className="button hover:bg-red-600"
          onClick={async () => {
            try {
              const resp = await fetch(
                new URL(`/registration?class-id=${classId}&student-id=${reg.student_id}`, API_BASE),
                {
                  method: 'DELETE',
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
            mutate()
          }}>删除</button>
      : <></>}
    </div>
  </>
}
