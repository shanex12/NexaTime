import React, { useState, useEffect, useRef } from "react";
import { loadData } from "../utils";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const START_HOUR = 8;
const START_MINUTE = 0;
const SLOT_MINUTES = 60;

function timeForSlotStart(slot) {
  return new Date(0, 0, 0, START_HOUR, START_MINUTE + SLOT_MINUTES * slot);
}

function fmtTime(d) {
  return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
}

function getTimeRange(startSlot, duration) {
  const start = timeForSlotStart(startSlot);
  const end = timeForSlotStart(startSlot + duration);
  return `${fmtTime(start)} - ${fmtTime(end)}`;
}

const dayNames = ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์"];

export default function TeacherTimetable() {
  const ref = useRef();

  const [data, setData] = useState({});
  const [teacherSelected, setTeacherSelected] = useState("");

  useEffect(() => {
    const d = loadData();
    setData(d);
    if (d.teachers?.length) setTeacherSelected(d.teachers[0].id);
  }, []);

  const teachers = data.teachers || [];
  const rooms = data.rooms || [];
  const all = data.allTimetables || {};
  const settings = data.settings || {};
  const classGroups = data.classGroups || [];
  const departments = data.departments || [];
  const subjects = data.subjects || [];

  const daysCount = settings.days || 5;
  const slotsCount = settings.timeslots_per_day || 6;

  // รวมข้อมูลจาก allTimetables ทุกกลุ่มเรียน
  let allAssignments = [];
  for (const groupName in all) {
    allAssignments = allAssignments.concat(all[groupName]);
  }

  // filter ตามครูที่เลือก
  const assignments = allAssignments.filter((a) => a.teacher_id === teacherSelected);

  // แยกตามวัน/คาบ
  const sessionsByDay = {};
  for (const s of assignments) {
    if (!sessionsByDay[s.day]) sessionsByDay[s.day] = {};
    sessionsByDay[s.day][s.slot] = s;
  }

  // helper: หาแผนก + จำนวนนักเรียน จากชื่อกลุ่ม
  function getGroupInfo(groupName) {
    const cg = classGroups.find((c) => c.name === groupName);
    if (!cg) return { departmentName: "-", studentCount: null };

    const dep = departments.find((d) => d.id === cg.department_id);
    return {
      departmentName: dep?.name || "-",
      studentCount: cg.studentCount ?? null
    };
  }

  // Export Excel
  function exportExcel() {
    const rows = assignments.map((a) => {
      const subject = subjects.find((s) => s.id === a.course_id);
      const teacher = teachers.find((t) => t.id === a.teacher_id);
      const room = rooms.find((r) => r.id === a.room_id);
      const groupName = a.class_group;
      const info = getGroupInfo(groupName);

      return {
        ครู: teacher?.name || a.teacher_id,
        วิชา: subject?.name || a.course_id,
        กลุ่มเรียน: groupName,
        แผนก: info.departmentName,
        จำนวนนักเรียน: info.studentCount ?? "",
        ห้อง: room?.name || "-",
        วัน: dayNames[a.day],
        คาบ: a.slot + 1,
        ระยะคาบ: a.duration,
        เวลา: getTimeRange(a.slot, a.duration)
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ตารางสอนครู");
    XLSX.writeFile(wb, "teacher_timetable.xlsx");
  }

  // Export PNG
  async function exportPNG() {
    const canvas = await html2canvas(ref.current, { scale: 2 });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "teacher_timetable.png";
    a.click();
  }

  // Export PDF
  async function exportPDF() {
    const canvas = await html2canvas(ref.current, { scale: 2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("landscape", "pt", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save("teacher_timetable.pdf");
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">ตารางสอนรายครู</h2>

      <div className="mb-4">
        <label className="font-semibold">เลือกครู: </label>
        <select
          className="border p-2 rounded ml-2"
          value={teacherSelected}
          onChange={(e) => setTeacherSelected(e.target.value)}
        >
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex gap-2">
        <button className="btn bg-green-600" onClick={exportExcel}>Excel</button>
        <button className="btn bg-rose-600" onClick={exportPDF}>PDF</button>
        <button className="btn bg-sky-500" onClick={exportPNG}>PNG</button>
      </div>

      <div ref={ref} className="p-4 bg-white shadow rounded overflow-auto">
        <table className="border-collapse border border-slate-400 w-full text-center">
          <thead>
            <tr>
              <th className="border p-2 bg-slate-100 w-36">วัน / คาบ</th>
              {Array.from({ length: slotsCount }).map((_, slot) => (
                <th key={slot} className="border p-2 bg-blue-50">
                  คาบ {slot + 1}
                  <div className="text-xs text-slate-600">
                    {fmtTime(timeForSlotStart(slot))} - {fmtTime(timeForSlotStart(slot + 1))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: daysCount }).map((_, day) => (
              <tr key={day}>
                <td className="border p-2 font-semibold bg-blue-50">
                  {dayNames[day] || `วัน ${day + 1}`}
                </td>

                {(() => {
                  const cells = [];
                  let slot = 0;

                  while (slot < slotsCount) {
                    const s = sessionsByDay[day]?.[slot];

                    if (s) {
                      const dur = s.duration;
                      const subject = subjects.find((x) => x.id === s.course_id);
                      const teacher = teachers.find((t) => t.id === s.teacher_id);
                      const room = rooms.find((r) => r.id === s.room_id);
                      const groupName = s.class_group;
                      const info = getGroupInfo(groupName);

                      cells.push(
                        <td key={slot} className="border p-2" colSpan={dur}>
                          <div
                            className="p-2 text-white rounded"
                            style={{ background: subject?.color || "#60a5fa" }}
                          >
                            <div className="text-xs mb-1">
                              {getTimeRange(s.slot, s.duration)}
                            </div>
                            <div className="font-bold">{subject?.name}</div>
                            <div className="text-sm">
                              ห้อง: {room?.name || "-"}
                            </div>
                            <div className="text-sm">
                              กลุ่มเรียน: {groupName}
                            </div>
                            <div className="text-xs">
                              แผนก: {info.departmentName}
                            </div>                            
                          </div>
                        </td>
                      );
                      slot += dur;
                    } else {
                      cells.push(<td key={slot} className="border p-2 h-20"></td>);
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
    </div>
  );
}
