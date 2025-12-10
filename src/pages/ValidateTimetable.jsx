import React, { useMemo, useState } from "react";
import { loadData } from "../utils";

export default function ValidateTimetable() {
  const data = loadData();

  const departments = data.departments || [];
  const classGroups = data.classGroups || [];
  const rooms = data.rooms || [];
  const teachers = data.teachers || [];
  const allTimetables = data.allTimetables || {};

  const [selectedDept, setSelectedDept] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // ALL | ROOM | TEACHER | CLASS | CAPACITY

  // แผนที่ช่วยหา name จาก id ให้แสดงผลสวย ๆ
  const roomMap = useMemo(() => {
    const m = new Map();
    rooms.forEach(r => m.set(r.id, r));
    return m;
  }, [rooms]);

  const teacherMap = useMemo(() => {
    const m = new Map();
    teachers.forEach(t => m.set(t.id, t));
    return m;
  }, [teachers]);

  const classGroupMap = useMemo(() => {
    const m = new Map();
    classGroups.forEach(c => m.set(c.name, c));
    return m;
  }, [classGroups]);

  const deptMap = useMemo(() => {
    const m = new Map();
    departments.forEach(d => m.set(d.id, d));
    return m;
  }, [departments]);

  const dayNames = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

  // -------------------------------
  // รวมทุกคาบจาก allTimetables เป็น array ใหญ่
  const allAssignments = useMemo(() => {
    const arr = [];
    for (const groupName in allTimetables) {
      const items = allTimetables[groupName] || [];
      items.forEach(a => arr.push(a));
    }
    return arr;
  }, [allTimetables]);

  // -------------------------------
  // ฟิลเตอร์ตามแผนก / กลุ่มเรียน
  const filteredAssignments = useMemo(() => {
    return allAssignments.filter(a => {
      if (selectedGroup && a.class_group !== selectedGroup) return false;
      if (selectedDept) {
        const cg = classGroupMap.get(a.class_group);
        if (!cg || cg.department_id !== selectedDept) return false;
      }
      return true;
    });
  }, [allAssignments, selectedDept, selectedGroup, classGroupMap]);

  // -------------------------------
  // ฟังก์ชันช่วยเช็กว่าเวลา overlap หรือไม่
  function isOverlap(a, b) {
    if (a.day !== b.day) return false;
    const startA = a.slot;
    const endA = a.slot + a.duration - 1;
    const startB = b.slot;
    const endB = b.slot + b.duration - 1;
    return !(endA < startB || endB < startA);
  }

  // -------------------------------
  // หา conflicts ทุกประเภท
  const conflicts = useMemo(() => {
    const list = [];

    const N = filteredAssignments.length;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const x = filteredAssignments[i];
        const y = filteredAssignments[j];

        if (!isOverlap(x, y)) continue;

        // ห้องชนกัน
        if (x.room_id && y.room_id && x.room_id === y.room_id) {
          list.push({
            type: "ROOM",
            a: x,
            b: y,
          });
        }

        // ครูชนกัน
        if (x.teacher_id && y.teacher_id && x.teacher_id === y.teacher_id) {
          list.push({
            type: "TEACHER",
            a: x,
            b: y,
          });
        }

        // กลุ่มเรียนชนกัน
        if (x.class_group === y.class_group) {
          list.push({
            type: "CLASS",
            a: x,
            b: y,
          });
        }
      }
    }

    // ตรวจ capacity (ไม่ต้องคู่)
    filteredAssignments.forEach(a => {
      const cg = classGroupMap.get(a.class_group);
      const room = roomMap.get(a.room_id);
      const groupSize = cg?.studentCount || 0;
      const cap = Number(room?.capacity || 0);

      if (groupSize > 0 && cap > 0 && groupSize > cap) {
        list.push({
          type: "CAPACITY",
          a,
          b: null,
          extra: { groupSize, cap }
        });
      }
    });

    return list;
  }, [filteredAssignments, classGroupMap, roomMap]);

  // ฟิลเตอร์ตามประเภท conflict
  const visibleConflicts = useMemo(() => {
    if (filterType === "ALL") return conflicts;
    return conflicts.filter(c => c.type === filterType);
  }, [conflicts, filterType]);

  // -------------------------------
  // ตัวเลขสรุป
  const summary = useMemo(() => {
    const total = filteredAssignments.length;

    const byType = { ROOM: 0, TEACHER: 0, CLASS: 0, CAPACITY: 0 };
    conflicts.forEach(c => {
      if (byType[c.type] !== undefined) byType[c.type]++;
    });

    return { total, byType };
  }, [filteredAssignments, conflicts]);

  // -------------------------------
  // Helper แสดงข้อความ
  function renderSlotRange(a) {
    const s = (a.slot ?? 0) + 1;
    const e = (a.slot ?? 0) + (a.duration ?? 1);
    return `คาบ ${s}–${e}`;
  }

  function renderOneSide(label, a) {
    const room = roomMap.get(a.room_id);
    const teacher = teacherMap.get(a.teacher_id);
    const cg = classGroupMap.get(a.class_group);
    const dept = cg ? deptMap.get(cg.department_id) : null;

    return (
      <div className="text-xs text-gray-700">
        <div className="font-semibold">{label}</div>
        <div>กลุ่ม: {a.class_group}</div>
        {dept && <div>แผนก: {dept.name}</div>}
        <div>วิชา: {a.course_name}</div>
        <div>ครู: {teacher?.name || a.teacher_name || "-"}</div>
        <div>ห้อง: {room?.name || a.room_name || "-"}</div>
      </div>
    );
  }

  function badgeForType(t) {
    const map = {
      ROOM: { label: "ห้องเรียนชนกัน", color: "bg-red-100 text-red-700" },
      TEACHER: { label: "ครูชนคาบ", color: "bg-orange-100 text-orange-700" },
      CLASS: { label: "กลุ่มเรียนชนคาบ", color: "bg-blue-100 text-blue-700" },
      CAPACITY: { label: "ความจุห้องไม่พอ", color: "bg-purple-100 text-purple-700" },
    };
    const item = map[t] || { label: t, color: "bg-gray-100 text-gray-700" };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.color}`}>
        {item.label}
      </span>
    );
  }

  // -------------------------------
  // UI
  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-2">
        ตรวจสอบความถูกต้องของตารางเรียน (Validation)
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        หน้านี้ใช้ตรวจว่าตารางเรียนที่สร้างขึ้นมีปัญหาอะไรบ้าง เช่น ห้องชนกัน ครูชนคาบ
        กลุ่มเรียนได้สองวิชาในเวลาเดียวกัน หรือจำนวนผู้เรียนเกินความจุห้อง
      </p>

      {/* ตัวกรองด้านบน */}
      <div className="card p-4 mb-4 grid md:grid-cols-4 gap-3 text-sm">
        <div>
          <div className="font-medium mb-1">เลือกแผนก</div>
          <select
            className="w-full p-2 border rounded"
            value={selectedDept}
            onChange={e => {
              setSelectedDept(e.target.value);
              setSelectedGroup("");
            }}
          >
            <option value="">— ทุกแผนก —</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="font-medium mb-1">เลือกกลุ่มเรียน</div>
          <select
            className="w-full p-2 border rounded"
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
          >
            <option value="">— ทุกกลุ่ม —</option>
            {classGroups
              .filter(c => !selectedDept || c.department_id === selectedDept)
              .map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
          </select>
        </div>

        <div>
          <div className="font-medium mb-1">ประเภทปัญหา</div>
          <select
            className="w-full p-2 border rounded"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="ALL">ทุกประเภท</option>
            <option value="ROOM">ห้องเรียนชนกัน</option>
            <option value="TEACHER">ครูชนคาบ</option>
            <option value="CLASS">กลุ่มเรียนชนคาบ</option>
            <option value="CAPACITY">ความจุห้องไม่พอ</option>
          </select>
        </div>

        {/* สรุปสั้น ๆ */}
        <div className="border rounded p-2 bg-slate-50 flex flex-col justify-center">
          <div className="text-xs text-gray-500">ภาพรวมข้อมูลในมุมมองนี้</div>
          <div className="text-sm">
            คาบทั้งหมด: <span className="font-semibold">{summary.total}</span>
          </div>
          <div className="text-sm">
            ปัญหาที่พบ:{" "}
            <span className="font-semibold">{conflicts.length}</span>{" "}
            เคส
          </div>
        </div>
      </div>

      {/* การ์ดสรุปชนแต่ละประเภท */}
      <div className="grid md:grid-cols-4 gap-3 mb-4 text-xs">
        <div className="card p-3">
          <div className="font-semibold mb-1">ห้องเรียนชนกัน</div>
          <div>{summary.byType.ROOM} เคส</div>
        </div>
        <div className="card p-3">
          <div className="font-semibold mb-1">ครูชนคาบ</div>
          <div>{summary.byType.TEACHER} เคส</div>
        </div>
        <div className="card p-3">
          <div className="font-semibold mb-1">กลุ่มเรียนชนคาบ</div>
          <div>{summary.byType.CLASS} เคส</div>
        </div>
        <div className="card p-3">
          <div className="font-semibold mb-1">ความจุห้องไม่พอ</div>
          <div>{summary.byType.CAPACITY} เคส</div>
        </div>
      </div>

      {/* รายการปัญหา */}
      <div className="card p-4">
        <h3 className="font-semibold mb-2 text-sm">
          รายการปัญหาที่ตรวจพบ ({visibleConflicts.length} เคส)
        </h3>

        {visibleConflicts.length === 0 && (
          <div className="text-sm text-emerald-700">
            ✅ ในมุมมองที่เลือก ขณะนี้ยังไม่พบปัญหาที่เข้าเงื่อนไข
          </div>
        )}

        <div className="space-y-3 max-h-[420px] overflow-auto">
          {visibleConflicts.map((c, idx) => {
            const a = c.a;
            const b = c.b;
            const dayName = dayNames[a.day] || `วัน ${a.day + 1}`;

            if (c.type === "CAPACITY") {
              const room = roomMap.get(a.room_id);
              const cg = classGroupMap.get(a.class_group);
              const dept = cg ? deptMap.get(cg.department_id) : null;

              return (
                <div
                  key={idx}
                  className="border rounded p-3 bg-purple-50 text-xs flex flex-col gap-1"
                >
                  <div className="flex justify-between items-center">
                    {badgeForType(c.type)}
                    <div>
                      {dayName} • {renderSlotRange(a)}
                    </div>
                  </div>
                  <div className="mt-1">
                    กลุ่ม: <span className="font-semibold">{a.class_group}</span>{" "}
                    ({cg?.studentCount || 0} คน) / ห้อง:{" "}
                    <span className="font-semibold">{room?.name || a.room_name}</span>{" "}
                    (จุได้ {c.extra?.cap ?? room?.capacity ?? "-"} คน)
                  </div>
                  {dept && (
                    <div>แผนก: {dept.name}</div>
                  )}
                  <div>วิชา: {a.course_name}</div>
                  <div className="text-red-700">
                    จำนวนผู้เรียนมากกว่าความจุห้อง → แนะนำให้เปลี่ยนห้องหรือแบ่งกลุ่ม
                  </div>
                </div>
              );
            }

            // ROOM / TEACHER / CLASS
            return (
              <div
                key={idx}
                className="border rounded p-3 bg-slate-50 text-xs flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  {badgeForType(c.type)}
                  <div>
                    {dayName} • {renderSlotRange(a)}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-2 mt-1">
                  {renderOneSide("คาบที่ 1", a)}
                  {b && renderOneSide("คาบที่ 2", b)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
