
import React, { useState, useEffect } from "react";
import { loadData } from "../utils";

export default function StudentDashboard({ onBack, onNavigate }) {
  const [summary, setSummary] = useState({
    groupCount: 0,
    studentCount: 0,
    subjectCount: 0,
    roomCount: 0
  });
  const [classGroups, setClassGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [groupInfo, setGroupInfo] = useState({ studentCount: 0, subjectCount: 0 });
  // For direct group_id/subject_id mapping
  const [groupSubjectMap, setGroupSubjectMap] = useState([]);

  useEffect(() => {
    const d = loadData();
    const classGroups = d.classGroups || [];
    const subjects = d.subjects || [];
    const rooms = d.rooms || [];
    // Try to load group-subject mapping from d.groupSubjects or d.groupSubjectMap
    const groupSubjectMap = d.groupSubjects || d.groupSubjectMap || [];

    // รวมจำนวนนักเรียนทุกกลุ่ม
    let totalStudents = 0;
    for (const g of classGroups) {
      totalStudents += Number(g.studentCount) || 0;
    }

    setSummary({
      groupCount: classGroups.length,
      studentCount: totalStudents,
      subjectCount: subjects.length,
      roomCount: rooms.length
    });
    setClassGroups(classGroups);
    setSubjects(subjects);
    setGroupSubjectMap(groupSubjectMap);
  }, []);

  // Find group info and subjects for selected group
  const [groupSubjects, setGroupSubjects] = useState([]);
  useEffect(() => {
    if (!selectedGroup) {
      setGroupInfo({ studentCount: 0, subjectCount: 0 });
      setGroupSubjects([]);
      return;
    }
    // Find group info
    let group = classGroups.find(g => g.name === selectedGroup || g === selectedGroup);
    let studentCount = 0;
    let groupId = group?.id || selectedGroup;
    if (group && group.studentCount) studentCount = Number(group.studentCount) || 0;
    // Subjects registered for this group (by group_id/subject_id mapping)
    let groupSubjects = [];
    if (groupSubjectMap.length > 0 && groupId) {
      // groupSubjectMap: [{ group_id, subject_id }]
      const subjectIds = groupSubjectMap.filter(row => String(row.group_id) === String(groupId)).map(row => row.subject_id);
      groupSubjects = subjects.filter(s => subjectIds.includes(s.subject_id) || subjectIds.includes(s.id));
    }
    setGroupInfo({ studentCount, subjectCount: groupSubjects.length });
    setGroupSubjects(groupSubjects);
  }, [selectedGroup, classGroups, subjects, groupSubjectMap]);

  return (
    <div className="h-full flex flex-col">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          <img src="/image/student.png" alt="profile" className="h-8" />
          <span className="font-semibold">Student</span>
        </div>
      </div>

      {/* ===== Select Class Group (top, like teacher) ===== */}
      <div className="px-6 pb-2 flex items-center gap-2">
        <label className="font-semibold">เลือกกลุ่มเรียน:</label>
        <select
          className="rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring focus:border-blue-400"
          value={selectedGroup}
          onChange={e => setSelectedGroup(e.target.value)}
        >
          <option value="">-- เลือกกลุ่มเรียน --</option>
          {classGroups.map(g => (
            <option key={g.id || g.name || g} value={g.name || g}>{g.name || g}</option>
          ))}
        </select>
      </div>

      {/* ===== Scrollable Content ===== */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Show group info if selected, else show summary */}
        {selectedGroup ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">{groupInfo.studentCount}</div>
                <div className="text-gray-700 font-semibold">นักเรียนในกลุ่มนี้</div>
              </div>
              <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
                <div className="text-3xl font-bold text-green-600 mb-1">{groupInfo.subjectCount}</div>
                <div className="text-gray-700 font-semibold">รายวิชาที่กลุ่มนี้ลงทะเบียน</div>
              </div>
            </div>
            {/* รายวิชาที่กลุ่มนี้ลงทะเบียน */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">รายวิชาที่กลุ่มนี้ลงทะเบียน</h4>
              {groupSubjects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {groupSubjects.map((s) => (
                    <span key={s.id} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                      {s.name}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 text-sm">กลุ่มนี้ยังไม่ได้ลงทะเบียนรายวิชา</div>
              )}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">{summary.studentCount}</div>
              <div className="text-gray-700 font-semibold">นักเรียนทั้งหมด</div>
            </div>
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
              <div className="text-3xl font-bold text-green-600 mb-1">{summary.subjectCount}</div>
              <div className="text-gray-700 font-semibold">รายวิชาทั้งหมด</div>
            </div>
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">{summary.roomCount}</div>
              <div className="text-gray-700 font-semibold">ห้องเรียนทั้งหมด</div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow p-6 flex flex-col items-center transition-all"
            onClick={() => onNavigate && onNavigate("studentTimetable")}
          >
            <span className="text-2xl mb-2">📅</span>
            <span className="font-bold">ดูตารางเรียนของฉัน</span>
            <span className="text-sm text-blue-100 mt-1">คลิกเพื่อดูตารางเรียน</span>
          </button>
          <button
            className="bg-green-500 hover:bg-green-600 text-white rounded-xl shadow p-6 flex flex-col items-center transition-all"
            onClick={() => onNavigate && onNavigate("studentRoomUsage")}
          >
            <span className="text-2xl mb-2">🏫</span>
            <span className="font-bold">ดูตารางการใช้ห้อง</span>
            <span className="text-sm text-green-100 mt-1">คลิกเพื่อดูตารางห้องเรียน</span>
          </button>
        </div>

        {/* Announcements */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-xl shadow mb-6">
          <div className="font-bold text-yellow-700 mb-1">📢 ข่าวประกาศ</div>
          <ul className="list-disc ml-6 text-yellow-900 text-sm">
            <li>เปิดภาคเรียนใหม่วันที่ 8 มกราคม 2026</li>
            <li>ตรวจสอบตารางเรียนและห้องเรียนก่อนเปิดเทอม</li>
            <li>หากพบปัญหาในการใช้งาน ติดต่อครูที่ปรึกษา</li>
          </ul>
        </div>

        {/* Welcome Banner */}
        <div className="bg-white rounded-xl shadow p-6 flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">ยินดีต้อนรับ!</h1>
            <p className="text-gray-600 max-w-xl">
              ตรวจสอบตารางเรียน ตารางห้องเรียน และข้อมูลที่เกี่ยวข้องได้ง่าย
              ผ่านเมนูทางด้านซ้าย
            </p>
          </div>
          <img
            src="/image/NexaTimeRVc.png"
            alt="banner"
            className="h-40 hidden md:block"
          />
        </div>

        {/* Help & Contact */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <div className="font-bold text-lg mb-1">📖 คู่มือการใช้งาน</div>
            <a href="https://docs.google.com/document/d/1nexaTimeManual" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">เปิดคู่มือการใช้งาน</a>
          </div>
          <div>
            <div className="font-bold text-lg mb-1">📞 ติดต่อครูที่ปรึกษา</div>
            <div className="text-gray-700 text-sm">หากมีปัญหาเกี่ยวกับตารางเรียน กรุณาติดต่อครูที่ปรึกษาของคุณ</div>
          </div>
        </div>
      </div>
      {/* Footer: Creator Credit (no border, no bg, always bottom) */}
      <div style={{width:'100%',textAlign:'center',fontSize:'12px',color:'#aaa',position:'fixed',left:0,bottom:0,zIndex:50,background:'none',padding:'8px 0',pointerEvents:'none'}}>
        สร้างและพัฒนาโดย NexaTime Team © 2025
      </div>
    </div>
  );
}
