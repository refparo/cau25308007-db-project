'use client'
import { useEffect, useState } from "react"
import useSWR, { SWRResponse } from "swr"

import SearchSelect from "@/app/components/SearchSelect"
import { API_BASE } from "@/config"
import { fetcher } from "@/utils"

import { usePopup } from "../../layout-client"
import { useAccountInfo } from "../layout"
import LectureManagement from "./LectureManagement"
import { Course } from "./page"
import RegistrationManagement from "./RegistrationManagement"

export interface Class {
  id: string
  teacher_id: string
  teacher: string
  student_count: number
  max_student_count: number
}

export default function ClassManagement({ course, term }: {
  course: Course,
  term: string
}) {
  const popup = usePopup()
  const { role } = useAccountInfo()
  const classes = useSWR<Class[]>(`/class?course-id=${course.id}&term-id=${term}`, fetcher)
  const [showNew, setShowNew] = useState(false)
  useEffect(() => {
    if (showNew) {
      document.querySelector(`#new-class-${course.id}`)!
        .scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [showNew])
  return <>
    <div className="flex gap-4">
      <div className="text-xl">教学班管理</div>
      {role == "admin" ?
        <button disabled={showNew} className="button"
          onClick={() => setShowNew(true)}>新建</button>
      : <></>}
    </div>
    <div className="border-t border-b border-cyan-700
        grid grid-cols-[repeat(4,max-content)_1fr]">
      <div className="px-4 py-0.5 font-bold text-center">教学班号</div>
      <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">教师</div>
      <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">最大人数</div>
      <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">选课人数</div>
      <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">操作</div>
      {(classes.data ?? []).map(cls =>
        <ClassRow key={cls.id}
          cls={cls} course={course} term={term} mutate={classes.mutate}></ClassRow>)}
      {showNew ? <div id={`new-class-${course.id}`}
          className="col-span-5 border-t border-cyan-700 p-2 flex flex-col gap-2">
        <div className="text-xl">新建教学班</div>
        <ClassEditor
          onSubmit={async (data) => {
            try {
              const resp = await fetch(
                new URL(`/class?course-id=${course.id}&term-id=${term}`, API_BASE),
                {
                  method: 'PUT',
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
            setShowNew(false)
            await classes.mutate()
          }}
          onReset={() => {
            setShowNew(false)
          }}></ClassEditor>
      </div> : <></>}
    </div>
  </>
}

function ClassRow({ cls, course, term, mutate }: {
  cls: Class,
  course: Course,
  term: string,
  mutate: SWRResponse["mutate"]
}) {
  const popup = usePopup()
  const { role } = useAccountInfo()
  const [edit, setEdit] = useState(false)
  const [showLectures, setShowLectures] = useState(false)
  const [showRegistrations, setShowRegistrations] = useState(false)
  return <>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-cyan-700">{cls.id}</div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">{cls.teacher}</div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">{cls.max_student_count}</div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">{cls.student_count}</div>
    <div className="px-1 py-0.5 border-t border-l border-cyan-700 flex gap-1">
      {role == "admin" ? <>
        <button disabled={edit} className="button" onClick={() => setEdit(true)}>编辑</button>
        <button disabled={showLectures} className="button"
          onClick={() => setShowLectures(!showLectures)}>管理课堂</button>
      </> : <></>}
      <button aria-expanded={showRegistrations} className="button"
        onClick={() => setShowRegistrations(!showRegistrations)}>管理学生</button>
    </div>
    {edit ? <div className="col-span-5 border-t border-cyan-700 p-2 flex flex-col gap-2">
      <div className="text-xl">编辑教学班</div>
      <ClassEditor cls={cls}
        onSubmit={async (data) => {
          try {
            const resp = await fetch(
              new URL(`/class?course-id=${course.id}&term-id=${term}`, API_BASE),
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
          setEdit(false)
          mutate()
        }}
        onReset={() => setEdit(false)}></ClassEditor>
    </div> : <></>}
    {showLectures ? <div className="col-span-5 border-t border-cyan-700 p-2 flex flex-col gap-2">
      <LectureManagement cls={cls} course={course}
        onDone={() => setShowLectures(false)}></LectureManagement>
    </div> : <></>}
    {showRegistrations ? <div className="col-span-5 border-t border-cyan-700 p-2 flex flex-col gap-2">
      <RegistrationManagement classId={cls.id}></RegistrationManagement>
    </div> : <></>}
  </>
}

function ClassEditor({ cls, onSubmit, onReset }: {
  cls?: Class,
  onSubmit?(data: FormData): void,
  onReset?(): void
}) {
  const popup = usePopup()
  const [modified, setModified] = useState(false)
  return <form className="grid grid-cols-[repeat(6,max-content)] gap-x-4 gap-y-2"
      onSubmit={e => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        if (typeof cls != "undefined") data.set("id", cls.id)
        onSubmit?.(data)
        setModified(false)
      }}
      onReset={() => {
        popup.setContent(<>
          <h1 className="text-3xl">真的要放弃修改吗？</h1>
          <div className="flex gap-2">
            <button className="button hover:bg-red-600"
              onClick={() => { onReset?.(); popup.setVisible(false) }}>确定</button>
            <button className="button"
              onClick={() => popup.setVisible(false)}>取消</button>
          </div>
        </>)
        popup.setVisible(true)
        setModified(false)
      }}
      onChange={() => setModified(true)}>
    <label htmlFor={`id-${cls?.id ?? "new"}`} className="font-bold">教学班号</label>
    <input type="text" name="id" id={`id-${cls?.id ?? "new"}`}
      disabled={typeof cls != "undefined"}
      defaultValue={cls?.id} required
      className="w-32 outline-none border-b border-b-cyan-700
        disabled:border-none disabled:bg-gray-50"/>
    <label htmlFor={`teacher-${cls?.id ?? "new"}`} className="font-bold">教师</label>
    <SearchSelect id={`teacher-${cls?.id ?? "new"}`} name="teacher-id"
      api={keyword => `/teacher?keyword=${keyword}`}
      transform={data => data}
      defaultName={cls?.teacher ?? "请选择教师"}
      defaultId={cls?.teacher_id ?? ""}></SearchSelect>
    <label htmlFor={`max-student-count-${cls?.id ?? "new"}`} className="font-bold">最大人数</label>
    <input type="number" name="max-student-count" id={`max-student-count-${cls?.id ?? "new"}`}
      min={cls?.student_count ?? 0} defaultValue={cls?.max_student_count ?? 0} required
      className="w-16 outline-none border-b border-b-cyan-700" />
    <div className="col-span-6 flex gap-2">
      <input disabled={!modified} type="submit" value="提交" className="button" />
      <input type="reset" value="取消" className="button hover:bg-red-600" />
    </div>
  </form>
}
