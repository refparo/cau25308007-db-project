'use client'
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import useSWR, { SWRResponse } from "swr"

import { API_BASE } from "@/config"
import { fetcher } from "@/utils"

import { usePopup } from "../../layout-client"
import { useAccountInfo, useTermInfo } from "../layout"
import ClassManagement from "./ClassManagement"

export interface Course {
  id: string
  name: string
  type: string
  credit: number
  total_hour: number
  weekly_hour: number
  week: number
  facility: number
  note: string
}

export interface Courses {
  total: number
  courses: Course[]
}

export default function CourseManagement() {
  const router = useRouter()
  const popup = usePopup()
  const { role, id: accountId } = useAccountInfo()
  const terms = useTermInfo()
  const [term, setTerm] = useState(terms.current)
  const [pageLen, setPageLen] = useState(10)
  const [page, setPage] = useState(0)
  const switchPage = (page: number) => {
    setPage(page)
    window.scrollTo({
      behavior: "smooth",
      top: 0
    })
  }
  const [showNew, setShowNew] = useState(false)
  useEffect(() => {
    if (showNew) window.scroll({
      behavior: "smooth",
      top: document.body.scrollHeight
    })
  }, [showNew])
  const courses = useSWR<Courses>(
    role == "admin" ? `/course?term=${term}&offset=${page * pageLen}&length=${pageLen}`
    : role == "teacher" ? `/course?term=${term}&teacher-id=${accountId}&offset=${page * pageLen}&length=${pageLen}`
    : null,
    fetcher)
  const totalPage = Math.ceil((courses.data?.total ?? 0) / pageLen)
  useEffect(() => {
    if (role != "admin" && role != "teacher") router.push('/dashboard')
  }, [role])
  return <>
    <h1 className="text-3xl">课程管理</h1>
    <div>
      <div> {/* 浮动顶栏+课程表格 */}
        <div className="py-1 border-b border-cyan-700 bg-gray-50 sticky top-0 z-20
            flex items-center justify-between">
          {/* 查询课程 */}
          <div className="flex items-center gap-4">
            <form className="flex items-center gap-4"
                onSubmit={e => {
                  e.preventDefault()
                  const data = new FormData(e.currentTarget)
                  setPageLen(data.get("page-length") as unknown as number)
                  switchPage(0)
                }}>
              {role == "admin" ?
                <div className="flex gap-2 items-center">
                  <label htmlFor="term" className="font-bold">学期</label>
                  <select name="term" id="term" className="px-2 py-1"
                      onChange={e => setTerm(e.currentTarget.value)}>
                    {Object.entries(terms.terms as { [id: string]: string } ?? {})
                      .map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                </div>
              : <></>}
              <div className="flex gap-2 items-center">
                <label htmlFor="page-length" className="font-bold">每页显示</label>
                <input type="number" name="page-length" id="page-length"
                  defaultValue={pageLen} min={5} max={100} required
                  className="w-16 outline-none border-b border-b-cyan-700"/>
              </div>
              <input type="submit" value="检索" className="button" />
            </form>
            {role == "admin" ? <button disabled={showNew} className="button"
              onClick={() => {
                setPage(totalPage - 1)
                setShowNew(true)
              }}>新建</button> : <></>}
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
        {/* 课程表格 */}
        <div className="border-b border-cyan-700
            grid grid-cols-[repeat(7,max-content)_1fr]">
          <div className="px-4 py-0.5 font-bold text-center">课程号</div>
          <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">课程名</div>
          <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">课程类型</div>
          <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">学分</div>
          <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">总学时</div>
          <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">周学时</div>
          <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">周数</div>
          <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">操作</div>
          {(courses.data?.courses ?? []).map(course =>
            <CourseRow key={course.id}
              course={course} term={term} mutate={courses.mutate}></CourseRow>)}
        </div>
      </div>
      {/* 新建课程 */}
      {showNew ? <div className="col-span-8 border-b border-cyan-700 p-2 flex flex-col gap-2">
          <div className="text-xl">新建课程</div>
          <CourseEditor
            onSubmit={async (data) => {
              try {
                const resp = await fetch(new URL("/course", API_BASE), {
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
              if (pageLen * totalPage == courses.data!.total) {
                setPage(totalPage)
              } else {
                setPage(totalPage - 1)
              }
              await courses.mutate()
            }}
            onReset={() => {
              setShowNew(false)
            }}></CourseEditor>
        </div> : <></>}
    </div>
  </>
}

function CourseRow({ course, term, mutate }: {
  course: Course,
  term: string,
  mutate: SWRResponse['mutate']
}) {
  const popup = usePopup()
  const { role } = useAccountInfo()
  const [edit, setEdit] = useState(false)
  const [showClasses, setShowClasses] = useState(false)
  return <>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-cyan-700">{course.id}</div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">{course.name}</div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">
      {({ "required": "必修", "optional": "专业选修", "public": "校选" })[course.type]}
    </div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">{course.credit}</div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">{course.total_hour}</div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">{course.weekly_hour}</div>
    <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">{course.week}</div>
    <div className="px-1 py-0.5 border-t border-l border-cyan-700 flex gap-1">
      {role == "admin" ?
        <button disabled={edit} className="button"
          onClick={() => setEdit(true)}>编辑</button>
      : <></>}
      <button aria-expanded={showClasses} className="button"
        onClick={() => setShowClasses(!showClasses)}>管理教学班</button>
    </div>
    {edit ? <div className="col-span-8 border-t border-cyan-700 p-2 flex flex-col gap-2">
      <div className="text-xl">编辑课程</div>
      <CourseEditor course={course}
        onSubmit={async (data) => {
          try {
            const resp = await fetch(new URL("/course", API_BASE), {
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
        onReset={() => setEdit(false)}></CourseEditor>
    </div> : <></>}
    {showClasses ? <div className="col-span-8 border-t border-cyan-700 p-2 flex flex-col gap-2">
      <ClassManagement course={course} term={term}></ClassManagement>
    </div> : <></>}
  </>
}

function CourseEditor({ course, onSubmit, onReset }: {
  course?: Course,
  onSubmit?(data: FormData): void,
  onReset?(): void
}) {
  const popup = usePopup()
  const [modified, setModified] = useState(false)
  return <form className="grid grid-cols-[repeat(8,max-content)] gap-x-4 gap-y-2"
      onSubmit={e => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        if (typeof course != "undefined") data.set("id", course.id)
        data.set("facility", `${
          (data.get("multimedia") ? 1 : 0) |
          (data.get("experiment") ? 2 : 0) |
          (data.get("computer") ? 4 : 0)
        }`)
        data.delete("multimedia")
        data.delete("experiment")
        data.delete("computer")
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
    <label htmlFor={`id-${course?.id ?? "new"}`} className="font-bold">课程号</label>
    <input type="text" name="id" id={`id-${course?.id ?? "new"}`}
      disabled={typeof course != "undefined"}
      defaultValue={course?.id} required
      className="outline-none border-b border-b-cyan-700
        disabled:border-none disabled:bg-gray-50"/>
    <label htmlFor={`name-${course?.id ?? "new"}`} className="font-bold">课程名</label>
    <input type="text" name="name" id={`name-${course?.id ?? "new"}`}
      defaultValue={course?.name} required
      className="col-span-3 outline-none border-b border-b-cyan-700" />
    <label htmlFor={`type-${course?.id ?? "new"}`} className="font-bold">课程类型</label>
    <select name="type" id={`type-${course?.id ?? "new"}`}>
      <option value="required">必修</option>
      <option value="optional">专业选修</option>
      <option value="public">校选</option>
    </select>
    <label htmlFor={`credit-${course?.id ?? "new"}`} className="font-bold">学分</label>
    <input type="number" name="credit" id={`credit-${course?.id ?? "new"}`}
      min={0} step={0.5} defaultValue={course?.credit ?? 0} required
      className="w-16 outline-none border-b border-b-cyan-700"/>
    <label htmlFor={`total-hour-${course?.id ?? "new"}`} className="font-bold">总学时</label>
    <input type="number" name="total-hour" id={`total-hour-${course?.id ?? "new"}`}
      min={0} defaultValue={course?.total_hour ?? 0} required
      className="w-16 outline-none border-b border-b-cyan-700" />
    <label htmlFor={`weekly-hour-${course?.id ?? "new"}`} className="font-bold">周学时</label>
    <input type="number" name="weekly-hour" id={`weekly-hour-${course?.id ?? "new"}`}
      min={0} defaultValue={course?.weekly_hour ?? 0} required
      className="w-16 outline-none border-b border-b-cyan-700" />
    <label htmlFor={`week-${course?.id ?? "new"}`} className="font-bold">总周数</label>
    <input type="number" name="week" id={`week-${course?.id ?? "new"}`}
      min={0} defaultValue={course?.week ?? 0} required
      className="w-16 outline-none border-b border-b-cyan-700" />
    <label htmlFor={`facility-${course?.id ?? "new"}`} className="font-bold">设施需求</label>
    <div id={`facility-${course?.id ?? "new"}`} className="col-span-7 flex gap-4 items-center">
      <div className="flex gap-1 items-center">
        <input type="checkbox" name="multimedia" id={`multimedia-${course?.id ?? "new"}`}
          defaultChecked={((course?.facility ?? 0) & 1) > 0} />
        <label htmlFor={`multimedia-${course?.id ?? "new"}`}>多媒体设备</label>
      </div>
      <div className="flex gap-1 items-center">
        <input type="checkbox" name="experiment" id={`experiment-${course?.id ?? "new"}`}
          defaultChecked={((course?.facility ?? 0) & 2) > 0}/>
        <label htmlFor={`experiment-${course?.id ?? "new"}`}>实验设施</label>
      </div>
      <div className="flex gap-1 items-center">
        <input type="checkbox" name="computer" id={`computer-${course?.id ?? "new"}`}
          defaultChecked={((course?.facility ?? 0) & 4) > 0}/>
        <label htmlFor={`computer-${course?.id ?? "new"}`}>学生上机</label>
      </div>
    </div>
    <label htmlFor={`note-${course?.id ?? "new"}`} className="font-bold">课程说明</label>
    <textarea name="note" id={`note-${course?.id ?? "new"}`} rows={2} defaultValue={course?.note}
      className="col-span-7 outline-none border border-cyan-700"></textarea>
    <div className="col-span-8 flex gap-2">
      <input disabled={!modified} type="submit" value="提交" className="button" />
      <input type="reset" value="取消" className="button hover:bg-red-600" />
    </div>
  </form>
}
