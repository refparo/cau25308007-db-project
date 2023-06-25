import { Fragment, useReducer, useState } from "react"
import useSWR from "swr"

import SearchSelect from "@/app/components/SearchSelect"
import { API_BASE } from "@/config"
import { fetcher } from "@/utils"

import { Class } from "./ClassManagement"
import { Course } from "./page"
import { usePopup } from "../../layout-client"

interface Lecture {
  week: string
  weekday: number
  period: number
  classroom: string
  classroom_id: string
}

interface Lectures {
  [key: number]: Lecture
}

type ReducerAction = {
  type: "add"
} | {
  type: "remove",
  id: number
} | {
  type: "modify",
  id: number,
  value: Partial<Lecture>
} | {
  type: "replace",
  value: Lecture[]
}

export default function LectureManagement({ cls, course, onDone }: {
  cls: Class,
  course: Course,
  onDone?(): void
}) {
  const popup = usePopup()
  const [modified, setModified] = useState(false)
  const [count, setCount] = useState(0)
  const [lectures, update] = useReducer(
    (state: Lectures, action: ReducerAction) => {
      let draft: Lectures = {}
      for (const key in state) {
        draft[key] = {...state[key]}
      }
      switch (action.type) {
        case "add":
          draft[count] = {
            week: "",
            weekday: 0,
            period: 0,
            classroom: "请选择教室",
            classroom_id: ""
          }
          setCount(count + 1)
          break
        case "remove":
          delete draft[action.id]
          break
        case "modify":
          draft[action.id] = {...draft[action.id], ...action.value}
          break
        case "replace":
          draft = Object.fromEntries(
            action.value.map((lecture, i) => [count + i, lecture]))
          setCount(count + action.value.length)
          return draft
      }
      setModified(true)
      return draft
    }, {})
  const initialLectures = useSWR<Lecture[]>(`/lecture?class-id=${cls.id}`, fetcher, {
    onSuccess(data) {
      if (!modified) update({ type: "replace", value: data })
    }
  })
  if (initialLectures.isLoading) return <>
    <div className="flex gap-4">
      <div className="text-xl">课堂管理</div>
      <div>加载中……</div>
    </div>
  </>
  return <>
    <div className="flex gap-4">
      <div className="text-xl">课堂管理</div>
      <button className="button"
        onClick={() => update({ type: "add" })}>新建</button>
      <button disabled={!modified} className="button"
        onClick={async () => {
          try {
            const resp = await fetch(
              new URL(`/lecture?class-id=${cls.id}`, API_BASE),
              {
                method: 'PUT',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(Object.values(lectures))
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
          initialLectures.mutate()
          onDone?.()
        }}>保存</button>
      <button className="button hover:bg-red-600"
        onClick={() => {
          popup.setContent(<>
            <h1 className="text-3xl">真的要放弃修改吗？</h1>
            <div className="flex gap-2">
              <button className="button hover:bg-red-600"
                onClick={() => { onDone?.(); popup.setVisible(false) }}>确定</button>
              <button className="button"
                onClick={() => popup.setVisible(false)}>取消</button>
            </div>
          </>)
          popup.setVisible(true)
          setModified(false)
        }}>取消</button>
    </div>
    <div className="border-t border-b border-cyan-700
        grid grid-cols-[repeat(4,max-content)_1fr]">
      <div className="px-4 py-0.5 font-bold text-center">周次</div>
      <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">星期</div>
      <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">节次</div>
      <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">教室</div>
      <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">操作</div>
      {Object.entries(lectures).map(([id, lecture]: [string, Lecture]) => <Fragment key={id}>
        <div className="px-1 py-0.5 flex justify-center items-center border-t border-cyan-700">
          <input type="text" value={lecture.week} placeholder="格式：1-6, 8, 10-12"
            className="outline-none border-b border-b-cyan-700"
            onChange={e => update({
              type: "modify",
              id: Number.parseInt(id),
              value: { week: e.currentTarget.value }
            })}/>
        </div>
        <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">
          <select value={lecture.weekday}
            onChange={e => update({
              type: "modify",
              id: Number.parseInt(id),
              value: { weekday: Number.parseInt(e.currentTarget.value) }
            })}>
            {["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
              .map((name, i) => <option value={i}>{name}</option>)}
          </select>
        </div>
        <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">
          <select value={lecture.period}
            onChange={e => update({
              type: "modify",
              id: Number.parseInt(id),
              value: { period: Number.parseInt(e.currentTarget.value) }
            })}>
            {Array(6).fill(0).map((_, i) => <option value={i}>第 {i + 1} 大节</option>)}
          </select>
        </div>
        <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">
          <SearchSelect<{ classroom: { [id: string]: { location: string } } }>
            id={`lecture-${cls.id}-${id}`} name=""
            api={keyword => `/classroom?offset=0&length=50` +
              `&keyword=${keyword}` +
              `&capacity=${cls.max_student_count}` +
              `&facility=${course.facility}`}
            transform={data =>
              Object.entries(data.classroom ?? {})
                .map(([id, { location }]) => ({ id, name: location }))}
            defaultName={lecture.classroom}
            defaultId={lecture.classroom_id}
            onChange={value => update({
              type: "modify",
              id: Number.parseInt(id),
              value: { classroom_id: value }
            })}></SearchSelect>
        </div>
        <div className="px-1 py-0.5 border-t border-l border-cyan-700 flex gap-1">
          <button className="button"
            onClick={() => update({ type: "remove", id: Number.parseInt(id) })}>删除</button>
        </div>
      </Fragment>)}
    </div>
  </>
}
