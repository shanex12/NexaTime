import React, { useState, useEffect, useRef } from "react";
import { loadData } from "../utils";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const START_HOUR = 8;
const START_MINUTE = 0;
const SLOT_MINUTES = 60;

function timeForSlotStart(slot){
  return new Date(0,0,0, START_HOUR, START_MINUTE + SLOT_MINUTES * slot);
}
function fmtTime(d){
  return d.getHours().toString().padStart(2,'0') + ':' +
         d.getMinutes().toString().padStart(2,'0');
}
function getTimeRange(slot, duration){
  return `${fmtTime(timeForSlotStart(slot))} - ${fmtTime(timeForSlotStart(slot+duration))}`;
}
function getDisplayTeacherName(s, teachers) {
  // 🟨 Homeroom → ใช้ชื่อที่บันทึกมาเลย
  if (s.sessionType === "homeroom") {
    return s.teacher_name || "ครูที่ปรึกษา";
  }

  // 🟦 วิชาปกติ → map จาก id
  const t = teachers.find(t => t.id === s.teacher_id);
  return t?.name || s.teacher_name || "-";
}

const dayNames = ["จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์"];

export default function Timetable(){

  const ref = useRef();
  const [data, setData] = useState(loadData());
  const [selectedGroup, setSelectedGroup] = useState("");

  /* 🔑 FIX 1: sync selectedGroup กับ data ทุกครั้ง */
  useEffect(() => {
    if (data?.lastResult?.group) {
      setSelectedGroup(data.lastResult.group);
    }
  }, [data]);

  /* reload เมื่อ focus */
  useEffect(() => {
    const handleFocus = () => setData(loadData());
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const classGroups = data.classGroups || [];
  const all = data.allTimetables || {};
  const rooms = data.rooms || [];
  const daysCount = data.settings?.days || 5;
  const slotsCount = data.settings?.timeslots_per_day || 12;

  /* 🔑 FIX 2: ดึงตรง ๆ ด้วย name */
  const assignments = all[selectedGroup] || [];

  /* เตรียม sessionsByDay */
  const sessionsByDay = {};
  for (const s of assignments) {
    if (!sessionsByDay[s.day]) sessionsByDay[s.day] = {};
    sessionsByDay[s.day][s.slot] = s;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">
        ตารางเรียน {selectedGroup && `— ${selectedGroup}`}
      </h2>

      {/* 🔑 FIX 3: select ใช้ c.name อย่างเดียว */}
      <div className="mb-6">
        <label className="font-semibold text-gray-700 block mb-2">เลือกกลุ่มเรียน: </label>
        <select
          className="border-2 border-purple-300 p-2 rounded-lg bg-white hover:border-purple-500 transition-colors cursor-pointer"
          value={selectedGroup}
          onChange={e => setSelectedGroup(e.target.value)}
        >
          <option value="">-- เลือกกลุ่มเรียน --</option>
          {classGroups.map(c => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* ตาราง */}
      {selectedGroup ? (
        <div ref={ref} className="p-4 bg-white shadow rounded overflow-auto">
          <table className="border-collapse border border-slate-400 w-full text-center">
            <thead>
              <tr>
                <th className="border p-2 bg-slate-100 w-36">วัน / คาบ</th>
                {Array.from({length:slotsCount}).map((_,slot)=>(
                  <th key={slot} className="border p-2 bg-blue-50">
                    คาบ {slot+1}
                    <div className="text-xs text-slate-600">
                      {fmtTime(timeForSlotStart(slot))} - {fmtTime(timeForSlotStart(slot+1))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {Array.from({length:daysCount}).map((_,day)=>(
                <tr key={day}>
                  <td className="border p-2 font-semibold bg-blue-50">
                    {dayNames[day]}
                  </td>

                  {(() => {
                    const cells = [];
                    let slot = 0;

                    while (slot < slotsCount) {
                      const s = sessionsByDay[day]?.[slot];
                      if (s) {


  console.log("DEBUG TIMETABLE CELL", {
    s,                     // assignment ที่ใช้แสดง
    course_id: s.course_id,
    course_code: s.course_code,
    subjects: data.subjects,
  });
                        const subj = data.subjects?.find(
  x => x.code === s.course_id || x.subject_code === s.course_id
);
                        const subjectCode =
                              s.course_code ||
                              subj?.code ||
                              subj?.subject_code ||
                              "";
                        const teacher = data.teachers?.find(t => t.id === s.teacher_id);
                        const room = rooms.find(r => r.id === s.room_id);

                        cells.push(
                          <td key={slot} colSpan={s.duration} className="border p-2">
                            <div className="p-2 text-white rounded"
                                 style={{background: s.color || subj?.color || "#3b82f6"}}>
                            <div className="font-bold leading-tight">
                              <div className="text-xs font-normal">
                                {s.course_id}
                              </div>
                              <div>
                                {s.course_name}
                              </div>
                            </div>
                              <div className="text-sm">ครู: {getDisplayTeacherName(s, data.teachers || [])}</div>
                              <div className="text-sm">ห้อง: {room?.name || "-"}</div>
                            </div>
                          </td>
                        );
                        slot += s.duration;
                      } else {
                        cells.push(<td key={slot} className="border p-2 h-20" />);
                        slot++;
                      }
                    }
                    return cells;
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-500 mt-6">
          กรุณาเลือกกลุ่มเรียนก่อน
        </div>
      )}
    </div>
  );
}
