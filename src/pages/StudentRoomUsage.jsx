import React, { useState, useEffect, useRef } from "react";
import { loadData } from "../utils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

const START_HOUR = 8;
const SLOT_MINUTES = 60;
const dayNames = ["จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์"];

function timeStart(slot){
  return new Date(0,0,0, START_HOUR, SLOT_MINUTES * slot);
}
function fmt(t){
  return t.getHours().toString().padStart(2,"0")+":"+
         t.getMinutes().toString().padStart(2,"0");
}
function range(slot,dur){
  return `${fmt(timeStart(slot))} - ${fmt(timeStart(slot+dur))}`;
}

export default function StudentRoomUsage(){
  const ref = useRef();
  const [data, setData] = useState({});
  const [roomSelected, setRoomSelected] = useState("");
  const [sessions, setSessions] = useState([]);

  useEffect(()=>{
    const d = loadData();
    setData(d);

    if(d.rooms?.length){
      setRoomSelected(d.rooms[0].id);
    }
  },[]);

  useEffect(()=>{
    if(!roomSelected) return;
    loadRoomUsage();
  },[roomSelected]);

  function loadRoomUsage(){
    const d = loadData();
    let records = [];

    for(const className in d.allTimetables){
      const list = d.allTimetables[className];
      list.forEach(s=>{
        if(s.room_id === roomSelected){
          records.push({
            ...s,
            className
          });
        }
      });
    }
    setSessions(records);
  }

  const days = data.settings?.days || 5;
  const slots = data.settings?.timeslots_per_day || 6;

  const sessionsByDay = {};
  for(const s of sessions){
    if(!sessionsByDay[s.day]) sessionsByDay[s.day]={};
    sessionsByDay[s.day][s.slot]=s;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">
        ตารางการใช้ห้องเรียน (ดูแบบนักเรียน)
      </h2>

      {/* เลือกห้อง */}
      <div className="mb-4">
        <label className="font-semibold">เลือกห้อง: </label>
        <select
          className="border p-2 rounded ml-2"
          value={roomSelected}
          onChange={e=>setRoomSelected(e.target.value)}
        >
          {data.rooms?.map(r=>(
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <div ref={ref} className="p-4 bg-white shadow rounded overflow-auto">
        <table className="border-collapse border border-slate-400 w-full text-center">
          <thead>
            <tr>
              <th className="border p-2 bg-slate-100 w-36">วัน / คาบ</th>
              {Array.from({length:slots}).map((_,i)=>(
                <th key={i} className="border p-2 bg-blue-50">
                  คาบ {i+1}
                  <div className="text-xs text-slate-600">
                    {fmt(timeStart(i))} - {fmt(timeStart(i+1))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({length:days}).map((_,day)=>(
              <tr key={day}>
                <td className="border p-2 bg-blue-50 font-semibold">
                  {dayNames[day]}
                </td>

                {(() => {
                  const cells = [];
                  let slot = 0;
                  while(slot < slots){
                    const s = sessionsByDay[day]?.[slot];
                    if(s){
                      const subj = data.subjects?.find(x=>x.id===s.course_id);
                      const teacher = data.teachers?.find(t=>t.id===s.teacher_id);
                      const bg = subj?.color || "#60a5fa";

                      cells.push(
                        <td key={slot} className="border p-2" colSpan={s.duration}>
                          <div className="p-2 text-white rounded" style={{background:bg}}>
                            <div className="text-xs mb-1">{range(s.slot,s.duration)}</div>
                            <div className="font-bold">{subj?.name}</div>
                            <div className="text-sm">ครู: {teacher?.name}</div>
                            <div className="text-sm">กลุ่ม: {s.className}</div>
                          </div>
                        </td>
                      );
                      slot += s.duration;
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
