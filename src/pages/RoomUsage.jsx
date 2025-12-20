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

export default function RoomUsage() {
  const ref = useRef();

  const [data, setData] = useState({});
  const [roomSelected, setRoomSelected] = useState("");

  useEffect(() => {
    const d = loadData();
    setData(d);
    if (d.rooms?.length) setRoomSelected(d.rooms[0].id);
  }, []);

  const rooms = data.rooms || [];
  const all = data.allTimetables || {};
  const settings = data.settings || {};
  const classGroups = data.classGroups || [];
  const departments = data.departments || [];

  const daysCount = settings.days || 5;
  const slotsCount = settings.timeslots_per_day || 6;

  // รวมข้อมูลจาก allTimetables ทุกกลุ่มเรียน
  let allAssignments = [];
  for (const groupName in all) {
    allAssignments = allAssignments.concat(all[groupName]);
  }

  // filter สำหรับห้องที่เลือก
  const assignments = allAssignments.filter((a) => a.room_id === roomSelected);

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
      const subject = data.subjects?.find((s) => s.id === a.course_id);
      const teacher = data.teachers?.find((t) => t.id === a.teacher_id);
      const room = rooms.find((r) => r.id === a.room_id);
      const groupName = a.class_group;
      const info = getGroupInfo(groupName);

      return {
        ห้อง: room?.name || "-",
        วิชา: subject?.name || a.course_id,
        กลุ่มเรียน: groupName,
        แผนก: info.departmentName,
        จำนวนนักเรียน: info.studentCount ?? "",
        วัน: dayNames[a.day],
        คาบ: a.slot + 1,
        ระยะคาบ: a.duration,
        เวลา: getTimeRange(a.slot, a.duration),
        ครู: teacher?.name || a.teacher_id
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ใช้ห้อง");
    XLSX.writeFile(wb, "room_usage.xlsx");
  }

  // Export PNG
  async function exportPNG() {
    const canvas = await html2canvas(ref.current, { scale: 2 });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "room_usage.png";
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
    pdf.save("room_usage.pdf");
  }

  // Export CSV
  function exportCSV() {
    if (!assignments.length) return;

    const rows = assignments.map((a) => {
      const subject = data.subjects?.find((s) => s.id === a.course_id);
      const teacher = data.teachers?.find((t) => t.id === a.teacher_id);
      const room = rooms.find((r) => r.id === a.room_id);
      const groupName = a.class_group;
      const info = getGroupInfo(groupName);

      return {
        ห้อง: room?.name || "-",
        วิชา: subject?.name || a.course_id,
        กลุ่มเรียน: groupName,
        แผนก: info.departmentName,
        จำนวนนักเรียน: info.studentCount ?? "",
        วัน: dayNames[a.day],
        คาบ: a.slot + 1,
        ระยะคาบ: a.duration,
        เวลา: getTimeRange(a.slot, a.duration),
        ครู: teacher?.name || a.teacher_id
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "room_usage.csv";
    link.click();
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">ตารางการใช้งานห้องเรียน</h2>

      <div className="mb-6">
        <label className="font-semibold text-gray-700 block mb-2">เลือกห้องเรียน: </label>
        <select
          className="border-2 border-orange-300 p-2 rounded-lg bg-white hover:border-orange-500 transition-colors cursor-pointer"
          value={roomSelected}
          onChange={(e) => setRoomSelected(e.target.value)}
        >
          {rooms.map((r, i) => (
            <option key={`${r.id}-${i}`} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 flex gap-3">
        <button className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200" onClick={exportPDF}>📄 Export PDF</button>
        <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200" onClick={exportPNG}>🖼️ Export PNG</button>
        <button className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200" onClick={exportExcel}>📊 Export Excel</button>
        <button className="px-6 py-2 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200" onClick={exportCSV}>📋 Export CSV</button>
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
                      const subject = data.subjects?.find((x) => x.id === s.course_id);
                      const teacher = data.teachers?.find((t) => t.id === s.teacher_id);
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
                            <div className="text-sm">ครู: {teacher?.name}</div>
                            <div className="text-sm">
                              กลุ่มเรียน: {groupName}
                              {info.studentCount != null &&
                                ` (จำนวนนักเรียน ${info.studentCount} คน)`}
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
