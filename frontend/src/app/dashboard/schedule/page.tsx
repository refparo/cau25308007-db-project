'use client'
import { useRouter } from "next/navigation"
import { Fragment, useEffect } from "react"
import useSWR from "swr"

import { fetcher } from "@/utils"

import { useAccountInfo } from "../layout"
import { usePopup } from "@/app/layout-client"

interface Course {
  id: string
  name: string
  teacher?: string
}

interface Lecture extends Course {
  week: string
  location: string
}

interface Schedule {
  scheduled: {
    [key: number]: {
      [key: number]: Lecture[]
    }
  }
  unscheduled: Course[]
}

export default function Schedule() {
  const router = useRouter()
  const popup = usePopup()
  const { role } = useAccountInfo()
  const resp = useSWR<Schedule>(role != "admin" ? "/schedule" : null, fetcher, {
    onError(err) {
      popup.setContent(<>
        <h1 className="text-3xl">网络错误</h1>
        <div>{`${err}`}</div>
      </>)
    }
  })
  useEffect(() => {
    if (role == "admin") router.push('/dashboard')
  }, [role])
  return <>
    <h1 className="text-3xl">课程表</h1>
    {resp.data
    ? <ScheduleTable role={role} schedule={resp.data}></ScheduleTable>
    : <div>加载中……</div>}
  </>
}

function ScheduleTable({ role, schedule }: { role: string, schedule: Schedule }) {
  return <>
    <div className="grid grid-flow-col text-xs
        grid-rows-[repeat(7,max-content)] grid-cols-[min-content_repeat(7,1fr)]">
      <div className="p-0.5 font-bold">节次</div>
      {Array(6).fill(0).map((_, i) =>
        <div className="p-0.5 font-bold
            flex justify-center items-center text-center
            border-t border-cyan-700">
          第 {i + 1} 大节
        </div>)}
      {["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
        .map((weekday, i) => <Fragment key={i}>
          <div className="p-0.5 font-bold
            flex justify-center items-center
            border-l border-cyan-700">{weekday}</div>
          {Array(6).fill(0).map((_, j) => <Fragment key={j}>
            <div className="p-0.5 border-l border-t border-cyan-700">
              {(schedule.scheduled[i]?.[j] ?? []).map((lecture, idx) => <Fragment key={lecture.id}>
                {idx != 0 ? <hr className="border-cyan-700 border-dashed"></hr> : <></>}
                <div className="text-center
                    px-2 py-1 rounded-md bg-cyan-200
                    flex flex-col items-center">
                  <span>{lecture.name}</span>
                  <span>{lecture.id}</span>
                  {role == "student" ? <span>{lecture.teacher}</span> : <></>}
                  <span>{lecture.week} 周</span>
                  <span>{lecture.location}</span>
                </div>
              </Fragment>)}
            </div>
          </Fragment>)}
        </Fragment>)}
    </div>
    <div className="flex flex-col gap-4">
      <div className="font-bold">课表外课程</div>
      <div className="grid grid-cols-[repeat(3,max-content)] text-sm">
        <div className="px-1 py-0.5 font-bold text-center">课程号</div>
        <div className="px-1 py-0.5 font-bold text-center border-l border-cyan-700">课程名</div>
        <div className="px-1 py-0.5 font-bold text-center border-l border-cyan-700">教师</div>
        {schedule.unscheduled.map(course => <Fragment key={course.id}>
          <div className="px-1 py-0.5 text-center border-t border-cyan-700">{course.id}</div>
          <div className="px-1 py-0.5 text-center border-t border-l border-cyan-700">{course.name}</div>
          <div className="px-1 py-0.5 text-center border-t border-l border-cyan-700">{course.teacher}</div>
        </Fragment>)}
      </div>
    </div>
  </>
}
