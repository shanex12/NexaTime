import React, {useState, useEffect, useRef} from "react";
import { loadData } from "../utils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

const START_HOUR = 8;
const SLOT_MINUTES = 60;

function timeForSlotStart(slot){
  return new Date(0,0,0, START_HOUR, SLOT_MINUTES * slot);
}

function fmt(d){
  return d.getHours().toString().padStart(2,'0') + ":" +
         d.getMinutes().toString().padStart(2,'0');
}

function slotRange(slot, dur){
  const a = timeForSlotStart(slot);
  const b = timeForSlotStart(slot + dur);
  return `${fmt(a)} - ${fmt(b)}`;
}

const dayNames = ["จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์"];

export default function StudentTimetablePage({ className }) {
  const ref = useRef();
  const [data, setData] = useState({});
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    const d = loadData();
    setData(d);

    const all = d.allTimetables || {};
    setAssignments(all[className] || []);
  }, [className]);

  const days = data.settings?.days || 5;
  const slots = data.settings?.timeslots_per_day || 6;

  const rooms = data.rooms || [];

  // แยก session ตามวัน-คาบ
  const sessionsByDay = {};
  for (const s of assignments) {
    if (!sessionsByDay[s.day]) sessionsByDay[s.day] = {};
    sessionsByDay[s.day][s.slot] = s;
  }

  async function exportPNG(){
    const canvas = await html2canvas(ref.current,{scale:2});
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `timetable_${className}.png`;
    a.click();
  }

  function exportExcel(){
    const rows = assignments.map(a => ({
      วิชา: data.subjects?.find(s => s.id === a.course_id)?.name || a.course_id,
      วัน: dayNames[a.day],
      คาบ: a.slot + 1,
      ระยะคาบ: a.duration,
      เวลา: slotRange(a.slot, a.duration),
      ครู: data.teachers?.find(t => t.id === a.teacher_id)?.name || a.teacher_id,
      ห้องเรียน: rooms.find(r => r.id === a.room_id)?.name || "-"
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ตารางเรียน");
    XLSX.writeFile(wb, `ตารางเรียน_${className}.xlsx`);
  }

  async function exportPDF(){
    const canvas = await html2canvas(ref.current,{scale:2});
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("landscape","pt","a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(img,"PNG",0,0,w,h);
    pdf.save(`ตารางเรียน_${className}.pdf`);

  }

function exportCSV() {
  const data = loadData();
  const all = data.allTimetables || {};

  const rows = [];

  Object.entries(all).forEach(([groupId, sessions]) => {
    sessions.forEach(s => {
      rows.push({
        group_id: groupId,
        day: s.day,
        period: s.slot + 1,
        subject_id: s.course_id,
        teacher_id: s.teacher_id,
        room_id: s.room_id
      });
    });
  });

  if (!rows.length) {
    alert("ไม่มีข้อมูลตารางเรียน");
    return;
  }

  const header = "group_id,day,period,subject_id,teacher_id,room_id\n";
  const body = rows
    .map(r =>
      [
        r.group_id,
        r.day,
        r.period,
        r.subject_id,
        r.teacher_id,
        r.room_id
      ].join(",")
    )
    .join("\n");

  const csv = header + body;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "timetable_export.csv";
  a.click();

  URL.revokeObjectURL(url);
}


  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">
        ตารางเรียนห้อง {className}
      </h2>

      <div className="mb-4 flex gap-2">
        <button className="btn bg-green-600" onClick={exportExcel}>Excel</button>
        <button className="btn bg-rose-600" onClick={exportPDF}>PDF</button>
        <button className="btn bg-sky-500" onClick={exportPNG}>PNG</button>
        <button className="btn bg-purple-600" onClick={exportCSV}>CSV</button>
      </div>

      <div ref={ref} className="p-4 bg-white shadow rounded overflow-auto">
        <table className="border-collapse border border-slate-400 w-full text-center">
          <thead>
            <tr>
              <th className="border p-2 bg-slate-100 w-36">วัน / คาบ</th>
              {Array.from({ length: slots }).map((_, i) => (
                <th key={i} className="border p-2 bg-blue-50">
                  คาบ {i + 1}
                  <div className="text-xs text-slate-600">
                    {fmt(timeForSlotStart(i))} - {fmt(timeForSlotStart(i+1))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: days }).map((_, day) => (
              <tr key={day}>
                <td className="border p-2 font-semibold bg-blue-50">
                  {dayNames[day]}
                </td>

                {(() => {
                  const cells = [];
                  let slot = 0;

                  while (slot < slots) {
                    const s = sessionsByDay[day]?.[slot];

                    if (s) {
                      const dur = s.duration;
                      const subject = data.subjects?.find(x => x.id === s.course_id);
                      const teacher = data.teachers?.find(t => t.id === s.teacher_id);
                      const room = rooms.find(r => r.id === s.room_id);

                      cells.push(
                        <td key={slot} className="border p-2" colSpan={dur}>
                          <div
                            className="p-2 text-white rounded"
                            style={{ background: subject?.color || "#60a5fa" }}
                          >
                            <div className="text-xs mb-1">
                              {slotRange(s.slot, s.duration)}
                            </div>
                            <div className="font-bold">{subject?.name}</div>
                            <div className="text-sm">ครู: {teacher?.name}</div>
                            <div className="text-sm">ห้อง: {room?.name || "-"}</div>
                          </div>
                        </td>
                      );

                      slot += dur;
                    } else {
                      cells.push(
                        <td
                          key={slot}
                          className="border p-2 h-20"
                        ></td>
                      );
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
