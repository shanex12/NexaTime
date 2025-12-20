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
  const teachers = data.teachers || [];
  const subjects = data.subjects || [];
  const daysCount = data.settings?.days || 5;
  const slotsCount = data.settings?.timeslots_per_day || 12;

  /* 🔑 FIX 2: ดึงตรง ๆ ด้วย name */
  const assignments = all[selectedGroup] || [];

  // ดึงชื่ออาจารย์ที่ปรึกษา
  const currentClassGroup = classGroups.find(c => c.name === selectedGroup);
  const advisorName = currentClassGroup?.advisor || "-";
  const studentCount = currentClassGroup?.studentCount || "-";

  // ===== SUBJECT SUMMARY (ADD ONLY) =====
  const subjectSummary = (() => {
    if (!assignments.length) return [];

    const map = {};
    assignments.forEach(a => {
      if (!map[a.course_id]) {
        const subj = subjects.find(
          s => s.code === a.course_id || s.subject_code === a.course_id || s.id === a.course_id
        );

        map[a.course_id] = {
          code: a.course_id,
          name: a.course_name,
          credit: subj?.credit || subj?.unit || "-",
          theory: subj?.theory || 0,
          practice: subj?.practice || 0,
          room_type: subj?.room_type || "-"
        };
      }
    });

    return Object.values(map);
  })();

  // คำนวณรวมหน่วยกิต
  const totalCredits = subjectSummary.reduce((sum, s) => {
    const creditVal = typeof s.credit === 'number' ? s.credit : 0;
    return sum + creditVal;
  }, 0);

  /* เตรียม sessionsByDay */
  const sessionsByDay = {};
  for (const s of assignments) {
    if (!sessionsByDay[s.day]) sessionsByDay[s.day] = {};
    sessionsByDay[s.day][s.slot] = s;
  }

/* ================= EXPORT FUNCTIONS ================= */

function exportPNG() {
  if (!ref.current) return;
  html2canvas(ref.current, { scale: 2 }).then(canvas => {
    const link = document.createElement("a");
    link.download = `timetable-${selectedGroup}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

function exportPDF() {
  if (!ref.current) return;
  html2canvas(ref.current, { scale: 1.5, useCORS: true, allowTaint: true }).then(canvas => {
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("landscape", "mm", "a4");
    
    const margin = 3; // mm
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - (margin * 2);
    
    // คำนวณสัดส่วนรูปภาพ
    const canvasAspect = canvas.width / canvas.height;
    
    let finalWidth = availableWidth;
    let finalHeight = availableWidth / canvasAspect;
    
    // ถ้าความสูงเกิน ให้ปรับตามความสูงแทน
    if (finalHeight > availableHeight) {
      finalHeight = availableHeight;
      finalWidth = availableHeight * canvasAspect;
    }

    // จัดตรงกลาง
    const xPos = (pageWidth - finalWidth) / 2;
    const yPos = margin;
    
    pdf.addImage(imgData, "PNG", xPos, yPos, finalWidth, finalHeight);
    pdf.save(`timetable-${selectedGroup}.pdf`);
  }).catch(err => console.error("Export PDF error:", err));
}

function exportExcel() {
  const rows = [];

  assignments.forEach(s => {
    rows.push({
      กลุ่มเรียน: selectedGroup,
      วัน: dayNames[s.day],
      คาบเริ่ม: s.slot + 1,
      จำนวนคาบ: s.duration,
      เวลา: getTimeRange(s.slot, s.duration),
      วิชา: s.course_name,
      รหัสวิชา: s.course_id || "",
      ครู: getDisplayTeacherName(s, data.teachers || []),
      ห้อง: rooms.find(r => r.id === s.room_id)?.name || ""
    });
  }); 

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Timetable");
  XLSX.writeFile(wb, `timetable-${selectedGroup}.xlsx`);
}
function exportCSV() {
  if (!assignments.length) return;

  // ✅ เรียงก่อน: วัน → คาบ
  const sorted = [...assignments].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    if (a.slot !== b.slot) return a.slot - b.slot;
    return 0;
  });

  const rows = sorted.map(s => ({
    กลุ่มเรียน: selectedGroup,
    วัน: dayNames[s.day],
    คาบเริ่ม: s.slot + 1,
    จำนวนคาบ: s.duration,
    เวลา: getTimeRange(s.slot, s.duration),
    วิชา: s.course_name,
    รหัสวิชา: s.course_id || "",
    ครู: getDisplayTeacherName(s, data.teachers || []),
    ห้อง: rooms.find(r => r.id === s.room_id)?.name || ""
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `timetable-${selectedGroup}.csv`;
  link.click();
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
          className="border-2 border-blue-300 p-2 rounded-lg ml-2 bg-white hover:border-blue-500 transition-colors cursor-pointer"
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
      {selectedGroup && (
  <div className="mb-6 flex flex-wrap gap-3">
    <button
      className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
      onClick={exportPDF}
    >
      📄 Export PDF
    </button>

    <button
      className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
      onClick={exportPNG}
    >
      🖼️ Export PNG
    </button>

    <button
      className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
      onClick={exportExcel}
    >
      📊 Export Excel
    </button>

    <button
      className="px-6 py-2 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
      onClick={exportCSV}
    >
      📋 Export CSV
    </button>
  </div>
)}


      {/* ตาราง */}
      {selectedGroup ? (
        <div ref={ref} className="p-4 bg-white shadow rounded overflow-auto">
          
          {/* ===== SIMPLE HEADER (Student View Style) ===== */}
          <div className="mb-4 bg-blue-50 p-3 rounded border border-blue-300">
            <h3 className="text-lg font-bold text-blue-900 mb-2">ตารางเรียน {selectedGroup}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-semibold">จำนวนนักเรียน:</span> {studentCount}
              </div>
              <div>
                <span className="font-semibold">อาจารย์ที่ปรึกษา:</span> {advisorName}
              </div>
            </div>
          </div>
          
          {/* ===== FORMAL HEADER (สธ.02 Style) ===== */}
          <div className="mb-4 border-2 border-black p-2">
            {/* Top Section: Logo + School Info */}
            <div className="flex flex-col items-center mb-2 pb-2 border-b border-black">
              
              {/* Logo - Center Top */}
              <div className="mb-1">
                <img src="image/rvc.jpg" alt="RVC LOGO" className="h-8 w-auto" />
              </div>
              
              {/* School Info - Center */}
              <div className="text-center">
                <h1 className="text-base font-bold">ตารางเรียน</h1>
                <p className="text-xs">วิทยาลัยอาชีวศึกษาร้อยเอ็ด</p>
              </div>
              
              {/* Academic Year Info */}
              <div className="text-center text-xs space-y-0.5 mt-1">
                <div><span className="font-bold">ปีการศึกษา:</span> 2567 | <span className="font-bold">ภาคเรียน:</span> 1</div>
              </div>
            </div>

            {/* Class Details Section */}
            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
              <div className="border border-black p-1">
                <div className="font-bold text-xs">กลุ่มเรียน</div>
                <div className="font-bold">{selectedGroup || "-"}</div>
              </div>
              <div className="border border-black p-1">
                <div className="font-bold text-xs">จำนวนนักเรียน</div>
                <div className="font-bold">
                  {studentCount}
                </div>
              </div>
              <div className="border border-black p-1">
                <div className="font-bold text-xs">อาจารย์ที่ปรึกษา</div>
                <div className="font-bold">{advisorName}</div>
              </div>
            </div>

            {/* Subject Summary Table */}
            <div className="mb-2">
              <table className="border-collapse border-2 border-black w-full text-xs">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border-2 border-black p-2 w-8">ลำดับ</th>
                    <th className="border-2 border-black p-2 w-24">รหัสวิชา</th>
                    <th className="border-2 border-black p-2">ชื่อรายวิชา</th>
                    <th className="border-2 border-black p-2 w-12">หน่วยกิต</th>
                    <th className="border-2 border-black p-2 w-12">ทฤษฎี</th>
                    <th className="border-2 border-black p-2 w-12">ปฏิบัติ</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectSummary.map((s, i) => (
                    <tr key={s.code} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border-2 border-black p-2 text-center">{i + 1}</td>
                      <td className="border-2 border-black p-2 text-center font-semibold">{s.code}</td>
                      <td className="border-2 border-black p-2">{s.name}</td>
                      <td className="border-2 border-black p-2 text-center">{s.credit}</td>
                      <td className="border-2 border-black p-2 text-center">{s.theory}</td>
                      <td className="border-2 border-black p-2 text-center">{s.practice}</td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-gray-300 font-bold">
                    <td colSpan="3" className="border-2 border-black p-2 text-right">รวมทั้งสิ้น</td>
                    <td className="border-2 border-black p-2 text-center">{totalCredits}</td>
                    <td className="border-2 border-black p-2 text-center">-</td>
                    <td className="border-2 border-black p-2 text-center">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== TIMETABLE MAIN ===== */}
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
