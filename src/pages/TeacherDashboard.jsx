
import React, { useEffect, useState } from "react";
import { loadData } from "../utils";
import TeacherSidebar from "../components/TeacherSidebar";


export default function TeacherDashboard({ teacherId, onNavigate, active, onLogout }) {
  const [selectedTeacherId, setSelectedTeacherId] = useState(teacherId);
  const [teacher, setTeacher] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [periods, setPeriods] = useState(0);
  const [allTeachers, setAllTeachers] = useState([]);

  useEffect(() => {
    const d = loadData();
    setAllTeachers(d.teachers || []);
    const t = (d.teachers || []).find(t => t.id === selectedTeacherId) || null;
    setTeacher(t);
    // รายวิชาที่สอน
    setSubjects((d.subjects || []).filter(s => (s.teachers || []).includes(selectedTeacherId)));
    // กลุ่มที่รับผิดชอบ (ที่ปรึกษา)
    setGroups((d.classGroups || []).filter(g => g.advisorId === selectedTeacherId || g.advisor === t?.name));
    // คำนวณจำนวนคาบสอน
    let count = 0;
    Object.values(d.allTimetables || {}).forEach(list => {
      list.forEach(a => {
        if (a.teacher_id === selectedTeacherId) count += a.duration || 1;
      });
    });
    setPeriods(count);
  }, [selectedTeacherId]);

  return (
    <div className="flex w-full h-screen overflow-hidden">
      {/* Teacher Sidebar */}
      <TeacherSidebar onNavigate={onNavigate} active={active} onLogout={onLogout} />
      <div className="flex-1 flex flex-col min-h-screen pl-0 md:pl-64">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <img src="https://cdn-icons-png.flaticon.com/512/4140/4140051.png" alt="profile" className="h-8" />
            <select
              className="font-semibold text-lg bg-white text-gray-900 rounded px-2 py-1 border border-gray-300 focus:outline-none focus:ring focus:border-blue-400"
              value={selectedTeacherId}
              onChange={e => setSelectedTeacherId(e.target.value)}
            >
              {allTeachers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">{periods}</div>
              <div className="text-gray-700 font-semibold">คาบสอนของฉัน</div>
            </div>
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
              <div className="text-3xl font-bold text-green-600 mb-1">{subjects.length}</div>
              <div className="text-gray-700 font-semibold">รายวิชาที่สอน</div>
            </div>
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">{groups.length}</div>
              <div className="text-gray-700 font-semibold">กลุ่มที่ปรึกษา</div>
            </div>
          </div>
          {/* รายละเอียดรายวิชาที่สอน */}
          {subjects.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-2">รายวิชาที่สอน</h4>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <span key={s.id} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                    {s.name}{s.subject_id ? ` (${s.subject_id})` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow p-6 flex flex-col items-center transition-all"
              onClick={() => onNavigate && onNavigate("teacherTimetable")}
            >
              <span className="text-2xl mb-2">📅</span>
              <span className="font-bold">ดูตารางสอนของฉัน</span>
              <span className="text-sm text-blue-100 mt-1">คลิกเพื่อดูตารางสอน</span>
            </button>
            <button
              className="bg-green-500 hover:bg-green-600 text-white rounded-xl shadow p-6 flex flex-col items-center transition-all"
              onClick={() => onNavigate && onNavigate("teachers")}
            >
              <span className="text-2xl mb-2">➕</span>
              <span className="font-bold">เพิ่มรายวิชาที่จะสอนและแก้ไขข้อมูลครู</span>
              <span className="text-sm text-green-100 mt-1">คลิกเพื่อเพิ่มรายวิชาที่จะสอน</span>
            </button>
          </div>

          {/* Announcements */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-xl shadow mb-6">
            <div className="font-bold text-yellow-700 mb-1">📢 ข่าวประกาศ</div>
            <ul className="list-disc ml-6 text-yellow-900 text-sm">
              <li>ประชุมครูประจำเดือน 5 ม.ค. 2026 เวลา 13:00 น.</li>
              <li>ตรวจสอบตารางสอนและแจ้งเปลี่ยนแปลงล่วงหน้า</li>
              <li>หากพบปัญหา ติดต่อผู้ดูแลระบบ</li>
            </ul>
          </div>

          {/* Help & Contact */}
          <div className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <div className="font-bold text-lg mb-1">📖 คู่มือการใช้งาน</div>
              <a href="https://docs.google.com/document/d/1nexaTimeManual" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">เปิดคู่มือการใช้งาน</a>
            </div>
            <div>
              <div className="font-bold text-lg mb-1">📞 ติดต่อผู้ดูแลระบบ</div>
              <div className="text-gray-700 text-sm">หากมีปัญหาเกี่ยวกับระบบ กรุณาติดต่อแอดมิน</div>
            </div>
          </div>
        </div>
        {/* Footer: Creator Credit (no border, no bg, always bottom) */}
        <div style={{width:'100%',textAlign:'center',fontSize:'12px',color:'#aaa',position:'fixed',left:0,bottom:0,zIndex:50,background:'none',padding:'8px 0',pointerEvents:'none'}}>
          สร้างและพัฒนาโดย NexaTime Team © 2025
        </div>
      </div>
    </div>
  );
}
