import React, {useState, useEffect, useRef} from 'react';
import { loadData } from '../utils';
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
  return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}
function getTimeRange(slot, duration){
  const start = timeForSlotStart(slot);
  const end = timeForSlotStart(slot + duration);
  return `${fmtTime(start)} - ${fmtTime(end)}`;
}

const dayNames = ["จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์"];

export default function Timetable(){

  const ref = useRef();
  const [data, setData] = useState(loadData());

  const departments = data.departments || [];
  const classGroups = data.classGroups || [];

  const [selectedDept, setSelectedDept] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

  const all = data.allTimetables || {};
  const rooms = data.rooms || [];
  const daysCount = data.settings?.days || 5;
  const slotsCount = data.settings?.timeslots_per_day || 6;

  // กลุ่มเรียนเฉพาะแผนกที่เลือก
  const filteredGroups = classGroups.filter(
    c => !selectedDept || c.department_id === selectedDept
  );

  const assignments = all[selectedGroup] || [];

  // ───────────────────────────────────────────────
  // จัดเตรียมตารางตามวัน
  const sessionsByDay = {};
  for(const s of assignments){
    if(!sessionsByDay[s.day]) sessionsByDay[s.day] = {};
    sessionsByDay[s.day][s.slot] = s;
  }
  // ───────────────────────────────────────────────

  function exportExcel(){
    const rows = assignments.map(a=> ({
      วิชา: data.subjects?.find(s=>s.id===a.course_id)?.name || a.course_id,
      วัน: dayNames[a.day],
      คาบ: a.slot+1,
      ระยะคาบ: a.duration,
      เวลา: getTimeRange(a.slot,a.duration),
      ครู: data.teachers?.find(t=>t.id===a.teacher_id)?.name || a.teacher_id,
      ห้อง: rooms.find(r=>r.id===a.room_id)?.name || "-"
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ตาราง');
    XLSX.writeFile(wb,'timetable.xlsx');
  }

  async function exportPNG(){
    const canvas = await html2canvas(ref.current,{scale:2});
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'timetable.png';
    a.click();
  }

  async function exportPDF(){
    const canvas = await html2canvas(ref.current,{scale:2});
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF('landscape','pt','a4');
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(img,'PNG',0,0,w,h);
    pdf.save('timetable.pdf');
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">
        ตารางเรียน {selectedGroup ? `— ${selectedGroup}` : ""}
      </h2>

      {/* เลือกแผนก */}
      <div className="mb-3">
        <label className="font-semibold">เลือกแผนก: </label>
        <select
          className="border p-2 rounded ml-2"
          value={selectedDept}
          onChange={(e)=>{
            setSelectedDept(e.target.value);
            setSelectedGroup("");
          }}
        >
          <option value="">-- เลือกแผนก --</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* เลือกกลุ่มเรียน */}
      <div className="mb-4">
        <label className="font-semibold">เลือกกลุ่มเรียน: </label>
        <select
          className="border p-2 rounded ml-2"
          value={selectedGroup}
          onChange={e=>setSelectedGroup(e.target.value)}
        >
          <option value="">-- เลือกกลุ่มเรียน --</option>
          {filteredGroups.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* ปุ่มส่งออก */}
      {selectedGroup && (
        <div className="mb-4 flex gap-2">
          <button className="btn bg-green-600" onClick={exportExcel}>Excel</button>
          <button className="btn bg-rose-600" onClick={exportPDF}>PDF</button>
          <button className="btn bg-sky-500" onClick={exportPNG}>PNG</button>
        </div>
      )}

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
                  <td className="border p-2 font-semibold bg-blue-50">{dayNames[day]}</td>

                  {(() => {
                    const cells = [];
                    let slot = 0;
                    while(slot < slotsCount){
                      const s = sessionsByDay[day]?.[slot];
                      if(s){
                        const dur = s.duration;
                        const subj = data.subjects?.find(x => x.id === s.course_id);
                        const teacher = data.teachers?.find(t=>t.id===s.teacher_id);
                        const room = rooms.find(r=>r.id===s.room_id);
                        const bg = subj?.color || "#60a5fa";

                        cells.push(
                          <td key={slot} className="border p-2" colSpan={dur}>
                            <div className="p-2 text-white rounded" style={{ background: bg }}>
                              <div className="text-xs mb-1">{getTimeRange(s.slot,s.duration)}</div>
                              <div className="font-bold">{subj?.name || s.course_id}</div>
                              <div className="text-sm">ครู: {teacher?.name || "-"}</div>
                              <div className="text-sm">ห้อง: {room?.name || "-"}</div>
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
      ) : (
        <div className="text-center text-gray-500 mt-6">
          กรุณาเลือกแผนกและกลุ่มเรียนก่อน
        </div>
      )}
    </div>
  );
}
