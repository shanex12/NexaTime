import React, { useState, useEffect } from "react";
import { loadData, saveData } from "../utils";

/**
 * =========================================================
 *  Generate.jsx
 * ---------------------------------------------------------
 *  หน้าสร้างตารางเรียน (Scheduling Engine)
 *
 *  ความสามารถ:
 *   - สร้างตารางเฉพาะ 1 กลุ่มเรียน
 *   - สร้างตารางทุกกลุ่มเรียนทั้งวิทยาลัย
 *   - เคลียร์ตารางเรียนทั้งหมด
 *
 *  แนวคิดหลัก:
 *   - ใช้ Heuristic Scheduling
 *   - แตกวิชาเป็น session
 *   - วาง session ทีละอัน
 *   - กันชน ครู / ห้อง / กลุ่ม / คาบพัก
 * =========================================================
 */

export default function Generate() {

  /* ======================================================
   *  STATE (React)
   * ====================================================== */

  // กำลังประมวลผลอยู่หรือไม่ (ป้องกันกดซ้ำ)
  const [running, setRunning] = useState(false);

  // log แสดงขั้นตอนการทำงาน (สำหรับครู / กรรมการดู)
  const [log, setLog] = useState("");

  // ผลลัพธ์ตารางล่าสุด
  const [result, setResult] = useState(null);

  // กลุ่มเรียนที่เลือกจาก dropdown
  const [group, setGroup] = useState("");

  /* ======================================================
   *  LOAD DATA จาก localStorage
   * ====================================================== */

  const data = loadData();

  console.log("DEBUG: loadData()", data);

  const classGroups = data.classGroups || [];
  const departments = data.departments || [];
  const rooms = data.rooms || [];
  const subjects = data.subjects || [];
  const teachers = data.teachers || [];
  const settings = data.settings || {};

  /* ======================================================
   *  SETTINGS (จากหน้า AI Settings)
   * ====================================================== */

  const days = settings.days || 5;
  const slots = settings.timeslots_per_day || 8;

  const strictAvoidLunch = settings.strictAvoidLunch ?? false;
  const avoidLunch = settings.avoidLunch ?? true;
  const lunchSlot = settings.lunchSlot ?? 4; // 0-based
  const spreadDays = settings.spreadDays ?? true;
  const balanceTeachers = settings.balanceTeachers ?? true;

  console.log("DEBUG: settings", {
    days,
    slots,
    strictAvoidLunch,
    avoidLunch,
    lunchSlot,
    spreadDays,
    balanceTeachers
  });

  const filteredGroups = classGroups;

  /* ======================================================
   *  โหลดผลลัพธ์ล่าสุด (ถ้ามี)
   * ====================================================== */

  useEffect(() => {
    if (data?.lastResult) {
      console.log("DEBUG: load lastResult", data.lastResult);
      setResult(data.lastResult);
    }
  }, []);

  /* ======================================================
   *  SUBJECT FILTER
   * ====================================================== */

  /**
   * กรองรายวิชาที่ "กลุ่มเรียนนี้ลงทะเบียน"
   * ใช้ mapping groupSubjects (group_id <-> subject_id)
   */
  function filterSubjectsForGroup(groupName) {
    console.log("DEBUG: filterSubjectsForGroup()", groupName);

    if (!groupName) return subjects;

    const reg = Array.isArray(data.groupSubjects)
      ? data.groupSubjects
      : [];

    if (!reg.length) {
      console.warn("DEBUG: no groupSubjects mapping");
      return [];
    }

    const classGroup = classGroups.find(cg => cg.name === groupName);
    if (!classGroup) {
      console.warn("DEBUG: classGroup not found", groupName);
      return [];
    }

    const result = subjects.filter(s =>
      reg.some(r =>
        r.group_id === classGroup.group_id &&
        r.subject_id === s.subject_id
      )
    );

    console.log("DEBUG: filtered subjects", result);
    return result;
  }

  /* ======================================================
   *  HEURISTIC SORT
   * ====================================================== */

  /**
   * เรียง session จาก "ยาก → ง่าย"
   * เพื่อเพิ่มโอกาสวางสำเร็จ
   */
  function sortSessionsWithHeuristic(sessions) {
    console.log("DEBUG: sortSessionsWithHeuristic()", sessions);

    return sessions
      .map(s => {
        const duration = s.periods_per_session || 1;
        const teacherCount = s.teachers?.length ?? teachers.length;
        const roomCount = matchRooms(s).length || 999;

        const score = duration * 100 - teacherCount * 5 - roomCount;

        return { ...s, __score: score };
      })
      .sort((a, b) => b.__score - a.__score)
      .map(({ __score, ...rest }) => rest);
  }

  /* ======================================================
   *  TEACHER HELPERS
   * ====================================================== */

  function isTeacherUnavailable(teacher, day, startSlot, duration) {
    if (!teacher) return false;

    const endSlot = startSlot + duration - 1;

    return Array.isArray(teacher.unavailable) &&
      teacher.unavailable.some(u =>
        u.day === day &&
        !(endSlot < u.slot || u.slot + (u.duration || 1) - 1 < startSlot)
      );
  }

  function getTeacherLoad(teacherId, assignments, globalAssignments) {
    return [...globalAssignments, ...assignments]
      .filter(a => a.teacher_id === teacherId)
      .reduce((sum, a) => sum + (a.duration || 1), 0);
  }

  function chooseTeacher(possible, assignments, globalAssignments) {
    if (!possible.length) return null;

    if (!balanceTeachers) {
      return possible[Math.floor(Math.random() * possible.length)];
    }

    let bestLoad = Infinity;
    let best = [];

    possible.forEach(t => {
      const load = getTeacherLoad(t.id, assignments, globalAssignments);
      if (load < bestLoad) {
        bestLoad = load;
        best = [t];
      } else if (load === bestLoad) {
        best.push(t);
      }
    });

    return best[Math.floor(Math.random() * best.length)];
  }

  /* ======================================================
   *  DAY PICKER
   * ====================================================== */

  function buildDayLoadForGroup(groupName, assignments, globalAssignments) {
    const load = new Array(days).fill(0);

    [...globalAssignments, ...assignments].forEach(a => {
      if (a.class_group === groupName) {
        load[a.day] += a.duration || 1;
      }
    });

    console.log("DEBUG: dayLoad", groupName, load);
    return load;
  }

  function pickDayForGroup(groupName, assignments, globalAssignments) {
    if (!spreadDays) {
      return Math.floor(Math.random() * days);
    }

    const loads = buildDayLoadForGroup(groupName, assignments, globalAssignments);
    const indices = [...Array(days).keys()].sort((a, b) => loads[a] - loads[b]);

    const pickCount = Math.max(1, Math.ceil(days / 2));
    const chosen = indices[Math.floor(Math.random() * pickCount)];

    console.log("DEBUG: pickDay", { groupName, loads, chosen });
    return chosen;
  }
  
  //คำนวณจำนวนคาบที่ใช้ไปแล้วของกลุ่มในวันนั้น
  function getUsedSlotsForDay(groupName, day, assignments, globalAssignments) {
    const all = [...(globalAssignments || []), ...(assignments || [])];

    return all
      .filter(a => a.class_group === groupName && a.day === day)
      .reduce((sum, a) => sum + (a.duration || 1), 0);
  }


  /* ======================================================
   *  ROOM MATCHING
   * ====================================================== */

  function matchRooms(subj) {
    console.log("DEBUG: matchRooms()", subj.name);
    // ปรับปรุงภายหลังตามประเภทห้อง / ขนาดห้อง / tag  -> ใส่โค้ดที่นี่
    return rooms;
  }

  /* ======================================================
   *  CORE ENGINE
   * ====================================================== */

  function prepareGroupContext(grp) {
    const dept = departments.find(d => d.id === grp.department_id);

    const ctx = {
      groupName: grp.name,
      deptName: dept?.name || "",
      groupSize: grp.studentCount || 0
    };

    console.log("DEBUG: prepareGroupContext()", ctx);
    return ctx;
  }

  function buildSubjectSessionsForGroup(groupName) {
    const subs = filterSubjectsForGroup(groupName);
    const sessions = [];

    subs.forEach(s => {
      const total = s.periods || 1;
      const per = s.periods_per_session || 1;
      const count = Math.ceil(total / per);

      for (let i = 0; i < count; i++) {
        sessions.push({ ...s });
      }
    });

    console.log("DEBUG: subjectSessions", groupName, sessions);
    return sortSessionsWithHeuristic(sessions);
  }

  /**
   * ------------------------------------------------------
   * ENGINE หลัก: สร้างตารางให้ 1 กลุ่มเรียน
   * ------------------------------------------------------
   */
  function generateScheduleForOneGroup(ctx, sessions, globalAssignments) {
    console.log("DEBUG: generateScheduleForOneGroup()", ctx);

    const assignments = [];

    for (const subj of sessions) {
      const duration = subj.periods_per_session || 1;
      let placed = false;

      for (let pass = 0; pass < 2 && !placed; pass++) {
        const allowLunch = pass === 1 || !avoidLunch;

        for (let attempt = 0; attempt < 500 && !placed; attempt++) {
          const day = pickDayForGroup(ctx.groupName, assignments, globalAssignments);

          // 🔹 ตรวจจำนวนคาบรวมของวันนั้น
          const usedSlots = getUsedSlotsForDay(
            ctx.groupName,
            day,
            assignments,
            globalAssignments
          );

          // ❌ ถ้าลงเพิ่มแล้วเกิน slots → ข้าม attempt นี้
          if (usedSlots + duration > slots) {
            console.log(
              "DEBUG: exceed daily slots",
              ctx.groupName,
              day,
              usedSlots,
              "+",
              duration,
              ">",
              slots
            );
            continue;
          }


          const startSlot = Math.floor(Math.random() * (slots - duration + 1));

          // ตรวจสอบว่าคาบในรายวิชานี้ชนกับคาบพักกลางวันหรือไม่
          const hitsLunch =
            startSlot <= lunchSlot &&
            startSlot + duration > lunchSlot;

          // บังคับห้ามชนคาบพักกลางวันโดยเด็ดขาด
          if (strictAvoidLunch && hitsLunch) {
            console.log("DEBUG: blocked by strictAvoidLunch", {
              subj: subj.name,
              day,
              startSlot,
              duration
            });
            continue;
          }

          // พยายามเลี่ยงคาบพักกลางวัน
          if (!allowLunch && avoidLunch && hitsLunch) {
            console.log("DEBUG: blocked by avoidLunch", {
              subj: subj.name,
              day,
              startSlot,
              duration
            });
            continue;
          }

          const selectedTeachers = subj.teachers?.length
              ? teachers.filter(t => subj.teachers.includes(t.id))
              : teachers;
          console.log("DEBUG: selectedTeachers", selectedTeachers);

          const teacher = chooseTeacher(
            selectedTeachers,
            assignments,
            globalAssignments
          );

          if (!teacher) continue;
          if (isTeacherUnavailable(teacher, day, startSlot, duration)) continue;

          const room = rooms[Math.floor(Math.random() * rooms.length)];

          assignments.push({
            course_id: subj.id,
            course_name: subj.name,
            teacher_id: teacher.id,
            teacher_name: teacher.name,
            room_id: room.id,
            room_name: room.name,
            class_group: ctx.groupName,
            day,
            slot: startSlot,
            duration,
            color: subj.color
          });

          globalAssignments.push(assignments[assignments.length - 1]);
          placed = true;

          console.log("DEBUG: placed", subj.name, assignments[assignments.length - 1]);
        }
      }

      if (!placed) {
        const msg =
          `❌ กลุ่ม ${ctx.groupName}: ไม่สามารถลงวิชา "${subj.name}" ได้ ` +
          `(คาบเรียนต่อวันเกินค่าที่ตั้งไว้ ${slots} คาบ)`;

        console.warn(msg);
        setLog(prev => prev + "\n" + msg);

      }

    }

    return assignments;
  }

  /* ======================================================
   *  CLEAR / GENERATE
   * ====================================================== */

  function clearAllTables() {
    if (!window.confirm("ต้องการลบตารางเรียนทั้งหมดหรือไม่?")) return;

    const d = loadData();
    d.allTimetables = {};
    d.lastResult = null;
    saveData(d);

    setResult(null);
    setLog("✔ เคลียร์ตารางทั้งหมดเรียบร้อย");
  }

  async function generateOneClassGroup() {
    if (!group) return alert("กรุณาเลือกกลุ่มเรียน");

    setRunning(true);
    setLog(`▶ เริ่มสร้างตารางให้ ${group}`);

    const d = loadData();
    const globalAssignments = [];

    Object.entries(d.allTimetables || {}).forEach(([g, arr]) => {
      if (g !== group) globalAssignments.push(...arr);
    });

    const grp = classGroups.find(c => c.name === group);
    const ctx = prepareGroupContext(grp);

    const sessions = buildSubjectSessionsForGroup(ctx.groupName);
    const assignments = generateScheduleForOneGroup(ctx, sessions, globalAssignments);

    d.allTimetables = d.allTimetables || {};
    d.allTimetables[ctx.groupName] = assignments;
    d.lastResult = { group: ctx.groupName, assignments };

    saveData(d);

    setResult(d.lastResult);
    setRunning(false);
  }

  async function generateAllClassGroup() {
    if (!window.confirm("ต้องการสร้างตารางทุกกลุ่มหรือไม่?")) return;

    setRunning(true);
    setLog("▶ เริ่มสร้างตารางทุกกลุ่ม\n");

    const d = loadData();
    d.allTimetables = {};
    const globalAssignments = [];

    for (const grp of classGroups) {
      const ctx = prepareGroupContext(grp);
      const sessions = buildSubjectSessionsForGroup(ctx.groupName);
      const assignments = generateScheduleForOneGroup(ctx, sessions, globalAssignments);
      d.allTimetables[ctx.groupName] = assignments;
    }

    saveData(d);
    setRunning(false);
    setLog(p => p + `\n✔ สร้างตารางครบทุกกลุ่มแล้ว`);
  }

  /* ======================================================
   *  UI
   * ====================================================== */

  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">
        สร้างตารางเรียน
      </h2>

      <div className="card p-4 space-y-4">
        <select
          className="border p-3 rounded-lg"
          value={group}
          onChange={e => setGroup(e.target.value)}
        >
          <option value="">-- เลือกกลุ่มเรียน --</option>
          {filteredGroups.map(g => (
            <option key={g.id || g.name} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>

        <button
          className="btn bg-blue-600 w-full"
          disabled={running}
          onClick={generateOneClassGroup}
        >
          สร้างตาราง (เฉพาะกลุ่ม)
        </button>

        <button
          className="btn bg-emerald-600 w-full"
          disabled={running}
          onClick={generateAllClassGroup}
        >
          สร้างตารางทั้งหมด
        </button>

        <button
          className="btn bg-red-600 w-full"
          onClick={clearAllTables}
        >
          เคลียร์ตารางทั้งหมด
        </button>

        <pre className="bg-gray-100 p-2 rounded h-40 overflow-auto text-sm whitespace-pre-wrap">
          {log}
        </pre>
      </div>
    </div>
  );
}
