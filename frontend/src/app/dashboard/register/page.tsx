'use client'
import { useRouter } from "next/navigation"
import { Fragment, useEffect, useState } from "react"
import useSWR, { SWRResponse } from "swr"

import { fetcher } from "@/utils"

import { usePopup } from "../../layout-client"
import { Class } from "../course/ClassManagement"
import { Course, Courses } from "../course/page"
import { useAccountInfo } from "../layout"
import { API_BASE } from "@/config"

interface Registration {
  class_id: string
  name: string
  type: string
  teacher: string
  credit: number
  status: string
  score: number
  rank: string
}

export default function Register() {
  const router = useRouter()
  const { role } = useAccountInfo()
  const popup = usePopup()
  const [pageLen, setPageLen] = useState(10)
  const [page, setPage] = useState(0)
  const switchPage = (page: number) => {
    setPage(page)
    window.scrollTo({
      behavior: "smooth",
      top: 0
    })
  }
  const courses = useSWR<Courses>(
    role == "student"
    ? `/course?offset=${page * pageLen}&length=${pageLen}&current-term=true`
    : null,
    fetcher)
  const totalPage = Math.ceil((courses.data?.total ?? 0) / pageLen)
  const [warningFired, setWarningFired] = useState(false)
  const selected = useSWR<Registration[]>(role == "student" ? "/registration" : null, fetcher, {
    onSuccess(data, key, config) {
      if (warningFired) return
      setWarningFired(true)
      let messages: string[] = []
      if (data.reduce((sum, reg) => sum + Number(reg.credit), 0) < 15) {
        messages.push("总学分不足 15 分")
      }
      if (!data.map(reg => reg.type).includes("optional")) {
        messages.push("未选择专业选修课")
      }
      if (messages.length == 0) return
      popup.setContent(<>
        <h1 className="text-3xl">警告</h1>
        <div>你本学期的选课，{messages.join("，")}，请尽快选课！</div>
      </>)
      popup.setVisible(true)
    },
  })
  useEffect(() => {
    if (role != "student") router.push('/dashboard')
  }, [role])
  return <>
    <h1 className="text-3xl">选课</h1>
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
            <CourseRow key={course.id} course={course} selected={selected.data ?? []}
              mutate={selected.mutate}></CourseRow>)}
        </div>
      </div>
    </div>
    <div className="flex flex-col gap-4">
      <div className="text-xl">已选中课程</div>
      <div className="grid grid-cols-[repeat(4,max-content)_1fr]">
        <div className="px-4 py-0.5 font-bold text-center">教学班号</div>
        <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">课程名</div>
        <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">类型</div>
        <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">教师</div>
        <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">操作</div>
        {(selected.data ?? []).map(reg => <Fragment key={reg.class_id}>
          <div className="px-1 py-0.5 flex justify-center items-center border-t border-cyan-700">{reg.class_id}</div>
          <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">{reg.name}</div>
          <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">
            {({ "required": "必修", "optional": "专业选修", "public": "校选" })[reg.type]}
          </div>
          <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">{reg.teacher}</div>
          <div className="px-1 py-0.5 border-t border-l border-cyan-700">
            <button className="button hover:bg-red-600"
              onClick={async () => {
                try {
                  const resp = await fetch(new URL(`/registration?class-id=${reg.class_id}`, API_BASE), {
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
                selected.mutate()
              }}>退选</button>
          </div>
        </Fragment>)}
      </div>
    </div>
  </>
}

function CourseRow({ course, selected, mutate }: {
  course: Course,
  selected: Registration[],
  mutate: SWRResponse["mutate"]
}) {
  const popup = usePopup()
  const [showClasses, setShowClasses] = useState(false)
  const classes = useSWR<Class[]>(`/class?course-id=${course.id}`, fetcher)
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
      <button aria-expanded={showClasses} className="button"
        onClick={() => setShowClasses(!showClasses)}>选课</button>
    </div>
    {showClasses ? <div className="col-span-8 border-t border-cyan-700 p-2 flex flex-col gap-2">
      <div className="flex gap-4">
        <div className="text-xl">选择教学班</div>
      </div>
      <div className="border-t border-b border-cyan-700
          grid grid-cols-[repeat(4,max-content)_1fr]">
        <div className="px-4 py-0.5 font-bold text-center">教学班号</div>
        <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">教师</div>
        <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">最大人数</div>
        <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">选课人数</div>
        <div className="px-4 py-0.5 font-bold text-center border-l border-cyan-700">操作</div>
        {(classes.data ?? []).map(cls => <Fragment key={cls.id}>
          <div className="px-1 py-0.5 flex justify-center items-center border-t border-cyan-700">{cls.id}</div>
          <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">{cls.teacher}</div>
          <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">{cls.max_student_count}</div>
          <div className="px-1 py-0.5 flex justify-center items-center border-t border-l border-cyan-700">{cls.student_count}</div>
          <div className="px-1 py-0.5 border-t border-l border-cyan-700 flex gap-1">
            <button disabled={selected.map(reg => reg.class_id).includes(cls.id)} className="button"
              onClick={async (e) => {
                try {
                  const resp = await fetch(new URL(`/registration?class-id=${cls.id}`, API_BASE), {
                    method: 'PUT',
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
              }}>选课</button>
          </div>
        </Fragment>)}
      </div>
    </div> : <></>}
  </>
}
