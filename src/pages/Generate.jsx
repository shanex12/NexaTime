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
  const isMatchRoomType = settings.isMatchRoomType ?? false;
  const checkMaxPeriodsPerDay = settings.checkMaxPeriodsPerDay ?? false;
  const maxPeriodsPerDay = settings.maxPeriodsPerDay ?? 10;

console.log("DEBUG: isMatchRoomType =", isMatchRoomType);
console.log("DEBUG: checkMaxPeriodsPerDay =", checkMaxPeriodsPerDay, "maxPeriodsPerDay =", maxPeriodsPerDay);


  console.log("DEBUG: settings", {
    days,
    slots,
    strictAvoidLunch,
    avoidLunch,
    lunchSlot,
    spreadDays,
    balanceTeachers,
    isMatchRoomType
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
  // ===============================
// 🧭 Display Helpers (GLOBAL SCOPE)
// ===============================
const DAY_NAMES = ["จ.", "อ.", "พ.", "พฤ.", "ศ."];

function slotRange(start, duration) {
  return `คาบ ${start + 1}–${start + duration}`;
}
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
      s.isHomeroom || // ✅ เพิ่มบรรทัดนี้
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
        const duration = s.duration || s.periods_per_session || 1;
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

    // console.log("DEBUG: dayLoad", groupName, load);
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

    // console.log("DEBUG: pickDay", { groupName, loads, chosen });
    return chosen;
  }

  //คำนวณจำนวนคาบที่ใช้ไปแล้วของกลุ่มในวันนั้น
  function getUsedSlotsForDay(groupName, day, assignments, globalAssignments) {
    const all = [...(globalAssignments || []), ...(assignments || [])];

    return all
      .filter(a => a.class_group === groupName && a.day === day)
      .reduce((sum, a) => sum + (a.duration || 1), 0);
  }

    // ===============================
  // 🔍 ตรวจว่าวันนี้ยังมีช่องว่าง "ติดกัน" พอสำหรับคาบยาวหรือไม่
  // ===============================
  function hasContinuousSpace(
    groupName,
    day,
    duration,
    assignments,
    globalAssignments
  ) {
    const used = new Array(slots).fill(false);

    [...assignments, ...globalAssignments]
      .filter(a => a.class_group === groupName && a.day === day)
      .forEach(a => {
        for (let i = a.slot; i < a.slot + a.duration; i++) {
          if (i >= 0 && i < slots) used[i] = true;
        }
      });

    let run = 0;
    for (let i = 0; i < slots; i++) {
      if (!used[i]) {
        run++;
        if (run >= duration) return true; // ✅ มีช่องว่างติดกันพอ
      } else {
        run = 0;
      }
    }

    return false;
  }


  /* ======================================================
   *  ROOM MATCHING
   * ====================================================== */

  function matchRooms(subj) {
    console.log("DEBUG: matchRooms()", subj.name);

    // ❌ ตัดห้อง error / ห้องขยะ ออกก่อน
    const cleanRooms = rooms.filter(r =>
      r &&
      r.id &&
      r.name &&
      !r.name.includes("?") &&
      r.name.trim() !== "" &&
      r.id !== "ORG-ACTIVITY" &&
      r.room_type !== "Practice" // ← ถ้า Practice แบบนี้คือ error
    );

    // 🧠 MODE match room_type
    if (isMatchRoomType && subj.room_type) {
      const matched = cleanRooms.filter(
        r => r.room_type === subj.room_type
      );

      if (matched.length > 0) {
        return matched;
      }
    }

    // 🧱 fallback
    return cleanRooms;
  }


  function generateDurationCandidates(totalPeriods) {
    const result = [];
    let d = totalPeriods;

    while (d >= 1) {
      result.push(d);
      if (d === 1) break;
      d = Math.floor(d / 2);
    }

    return result;
  }

  function validateAssignments(assignments, settings) {
    const errors = [];

    const {
      slots,
      lunchSlot,
      avoidLunch,
      strictAvoidLunch
    } = settings;

    // helper: ตรวจชนช่วงเวลา
    const overlap = (s1, d1, s2, d2) =>
      !(s1 + d1 <= s2 || s2 + d2 <= s1);

    // --- 1. ตรวจ slot + duration ---
    assignments.forEach(a => {
      if (a.slot + a.duration > slots) {
        errors.push({
          type: "OUT_OF_RANGE",
          message: `❌ ${a.course_name} (${a.class_group}) คาบเกินวัน: slot ${a.slot} + duration ${a.duration} > ${slots}`
        });
      }
    });

    // --- 2. ตรวจชนพักกลางวัน ---
    assignments.forEach(a => {
      const hitsLunch =
        a.slot <= lunchSlot &&
        a.slot + a.duration > lunchSlot;

      if (
        hitsLunch &&
        (strictAvoidLunch || avoidLunch)
      ) {
        errors.push({
          type: "LUNCH_CONFLICT",
          message: `⚠️ ${a.course_name} (${a.class_group}) ชนคาบพักกลางวัน`
        });
      }
    });

    // --- 3. ตรวจชนกัน (กลุ่ม / ครู / ห้อง) ---
    for (let i = 0; i < assignments.length; i++) {
      for (let j = i + 1; j < assignments.length; j++) {
        const a = assignments[i];
        const b = assignments[j];

        if (a.day !== b.day) continue;
        if (!overlap(a.slot, a.duration, b.slot, b.duration)) continue;

        if (a.class_group === b.class_group) {
          errors.push({
            type: "CLASS_OVERLAP",
            message: `❌ กลุ่ม ${a.class_group} มีคาบชน: ${a.course_name} ↔ ${b.course_name}`
          });
        }

        if (a.teacher_id === b.teacher_id) {
          errors.push({
            type: "TEACHER_OVERLAP",
            message: `❌ ครู ${a.teacher_name} สอนชนเวลา: ${a.course_name} ↔ ${b.course_name}`
          });
        }

        if (a.room_id === b.room_id) {
          errors.push({
            type: "ROOM_OVERLAP",
            message: `❌ ห้อง ${a.room_name} ถูกใช้ซ้อน: ${a.course_name} ↔ ${b.course_name}`
          });
        }
      }
    }

    return errors;
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

  /**
 * ======================================================
 *  BUILD SESSIONS FROM SUBJECT
 *  - รองรับ 2 โหมด:
 *    1) legacy (periods / periods_per_session)
 *    2) match room type (theory / practice)
 * ======================================================
 */
function autoSplitPracticeSession(subj) {
  // แตกเฉพาะ practice ที่ยาว
  if (
    subj.sessionType !== "practice" ||
    subj.duration <= 2
  ) {
    return [subj];
  }

  const half = Math.floor(subj.duration / 2);

  const s1 = {
    ...subj,
    duration: half,
    __splitFrom: subj.duration
  };

  const s2 = {
    ...subj,
    duration: subj.duration - half,
    __splitFrom: subj.duration
  };

  console.warn(
    `AUTO SPLIT: ${subj.name} practice ${subj.duration} → ${s1.duration}+${s2.duration}`
  );

  return [s1, s2];
}


function buildSessionsFromSubject(subj) {
  const sessions = [];

  // ✅ HOMEROOM
  if (subj.isHomeroom) {
    sessions.push({
      ...subj,
      periods: 1,                 // ✅ สำคัญมาก
      periods_per_session: 1,     // ✅ สำคัญ
      duration: 1,
      sessionType: "homeroom",
      room_type: null
    });
    return sessions;
  }
  // ===============================
  // 🧠 MODE ใหม่: แยก theory / practice
  // ===============================
  if (isMatchRoomType) {

    // --- THEORY ---
    if (Number(subj.theory) > 0) {
      sessions.push({
        ...subj,
        duration: Number(subj.theory),
        sessionType: "theory",
        room_type: "theory"
      });
      console.log(
  "DEBUG: buildSession",
  {
    subject: subj.name,
    sessionType: sessions[sessions.length - 1]?.sessionType,
    duration: sessions[sessions.length - 1]?.duration,
    room_type: sessions[sessions.length - 1]?.room_type
  }
);

    }
  // --- PRACTICE ---
  if (Number(subj.practice) > 0) {
    const practiceSession = {
      ...subj,
      duration: Number(subj.practice),
      sessionType: "practice",
      room_type: "practice"
    };

    const splitted = autoSplitPracticeSession(practiceSession);
    sessions.push(...splitted);
  }

    return sessions;
  }

  // ===============================
  // 🧱 MODE เก่า: legacy
  // ===============================
  const total = subj.periods || 1;
  const per = subj.periods_per_session || total;
  const count = Math.ceil(total / per);

  for (let i = 0; i < count; i++) {
    sessions.push({
      ...subj,
      duration: per,
      sessionType: "mixed",
      room_type: null
    });
  }

  return sessions;
}


  function buildSubjectSessionsForGroup(groupName) {
  const subs = filterSubjectsForGroup(groupName);
  const sessions = [];

  subs.forEach(subj => {

    // ❌ ไม่เอากิจกรรมองค์การเข้า heuristic
    if (
      subj.code === ORG_ACTIVITY_CODE ||
      subj.subject_code === ORG_ACTIVITY_CODE ||
      subj.name?.includes("กิจกรรมองค์การวิชาชีพ")
    ) {
      sessions.push({
        ...subj,
        __fixed: "ORG_ACTIVITY"
      });
      return;
    }

    const builtSessions = buildSessionsFromSubject(subj);
    sessions.push(...builtSessions);
  });


  console.log("DEBUG: subjectSessions", groupName, sessions);
  return sortSessionsWithHeuristic(sessions);
}


  /**
   * ------------------------------------------------------
   * ENGINE หลัก: สร้างตารางให้ 1 กลุ่มเรียน
   * ------------------------------------------------------
   */
  function isTeacherBusy(
    teacherId,
    day,
    startSlot,
    duration,
    localAssignments = [],
    globalAssignments = []
  ) {
    if (!teacherId) return false; // ⭐ HoomRoom ไม่ต้องเช็คครู

    const all = [...localAssignments, ...globalAssignments];

    return all.some(a => {
      if (a.teacher_id !== teacherId) return false;
      if (a.day !== day) return false;

      const aStart = a.slot;
      const aEnd = a.slot + a.duration;
      const bStart = startSlot;
      const bEnd = startSlot + duration;

      return !(bEnd <= aStart || bStart >= aEnd);
    });
  }


  function isRoomBusy(
    roomId,
    day,
    startSlot,
    duration,
    localAssignments = [],
    globalAssignments = []
  ) {
    const all = [...localAssignments, ...globalAssignments];

    return all.some(a => {
      if (a.room_id !== roomId) return false;
      if (a.day !== day) return false;

      const aStart = a.slot;
      const aEnd = a.slot + a.duration;

      const bStart = startSlot;
      const bEnd = startSlot + duration;

      return !(bEnd <= aStart || bStart >= aEnd);
    });
  }

  function isClassBusy(
    groupName,
    day,
    startSlot,
    duration,
    localAssignments = []
  ) {
    return localAssignments.some(a => {
      if (a.class_group !== groupName) return false;
      if (a.day !== day) return false;

      const aStart = a.slot;
      const aEnd = a.slot + a.duration;

      const bStart = startSlot;
      const bEnd = startSlot + duration;

      return !(bEnd <= aStart || bStart >= aEnd);
    });
  }

      // 🔒 LOCK กิจกรรมองค์การวิชาชีพ
      const ORG_ACTIVITY_CODE = "30000-2004";
      const ORG_ACTIVITY_DAY = 2;        // พุธ
      const ORG_ACTIVITY_START = 7;      // 15:00
      const ORG_ACTIVITY_DURATION = 2;   // 15:00–17:00    

      const SESSION_RETRY_LIMIT = 50; // 🔥 วน session ซ้ำสูงสุด - เพิ่มให้วิชา duration ยาว ลงได้

      // ===============================
      // AI Retry Config
      // ===============================
      const SUBJECT_RETRY_LIMIT = 3;   // ให้ AI คิดใหม่กี่รอบต่อ 1 วิชา
      const ATTEMPT_PER_ROUND = 400;   // จำนวน attempt ต่อรอบ (ต่อวิชา)

      
        
function generateScheduleForOneGroup(ctx, sessions, globalAssignments) {
  setLog(p => p + `\n\n▶ เริ่มสร้างตารางกลุ่ม ${ctx.groupName}`);
  const assignments = [];

  /* ===============================
   * STEP 1: ล็อคกิจกรรมองค์การ
   * =============================== */
  sessions
    .filter(s => s.__fixed === "ORG_ACTIVITY")
    .forEach(subj => {
      const a = {
        course_id: subj.id,
        course_code: subj.code || subj.subject_code,
        course_name: subj.name,
        teacher_id: null,
        teacher_name: "กิจกรรม",
        room_id: "ORG-ACTIVITY",
        room_name: "กิจกรรมองค์การ",
        class_group: ctx.groupName,
        day: ORG_ACTIVITY_DAY,
        slot: ORG_ACTIVITY_START,
        duration: ORG_ACTIVITY_DURATION,
        color: "#9333ea",
        sessionType: "activity"
      };
      assignments.push(a);
      globalAssignments.push(a);
    });

  /* ===============================
   * STEP 2: วาง session ทีละอัน
   * =============================== */
  for (const subj of sessions) {
  if (subj.__fixed) continue;

  const duration = subj.duration || 1;
  let placed = false;
  let sessionRetry = 0;

  while (!placed && sessionRetry < SESSION_RETRY_LIMIT) {
    sessionRetry++;

if (sessionRetry === 1 || sessionRetry === SESSION_RETRY_LIMIT) {
  setLog(p =>
    p +
    `\n   🔁 ${subj.sessionType} (${duration} คาบ) : พยายามรอบที่ ${sessionRetry}`
  );
}

    /* ---------- SYSTEMATIC: วันละคาบ ไม่สุ่ม ---------- */
    // 🔀 ถ้า spreadDays เปิด ให้เรียงวันตามจำนวนคาบน้อย → มาก
    const dayOrder = spreadDays
      ? [...Array(days).keys()].sort((a, b) => {
          const loadA = getUsedSlotsForDay(ctx.groupName, a, assignments, globalAssignments);
          const loadB = getUsedSlotsForDay(ctx.groupName, b, assignments, globalAssignments);
          return loadA - loadB;
        })
      : [...Array(days).keys()]; // ถ้าปิด ให้ลำดับปกติ 0, 1, 2, ...

    for (const day of dayOrder) {
      if (placed) break; // ถ้าลงสำเร็จแล้ว ออกจากลูปวัน

      // 🔧 Relax continuous space check สำหรับ retry หลังจากครั้งแรก
      if (
        duration > 1 &&
        sessionRetry <= 3 && // ลูปแรก ให้เข้มงวด
        !hasContinuousSpace(
          ctx.groupName,
          day,
          duration,
          assignments,
          globalAssignments
        )
      ) continue;

      // 🔀 สร้างลำดับช่องคาบ: ลูปแรก sequential, retry ให้พยายามแบบสุ่ม
      let slotArray = [];
      if (sessionRetry <= 3) {
        // ลูปแรก (1-3) ให้ลำดับปกติ
        slotArray = Array.from({ length: slots - duration + 1 }, (_, i) => i);
      } else {
        // Retry (4+) ให้สุ่มช่องลองใจ
        slotArray = Array.from({ length: slots - duration + 1 }, (_, i) => i)
          .sort(() => Math.random() - 0.5);
      }

      for (const startSlot of slotArray) {

        // ✅ ตรวจสอบจำนวนคาบต่อวัน (อนุญาตคาบเช้า แม้รวมทั้งวันเกิน)
        if (checkMaxPeriodsPerDay) {
          const usedSlots = getUsedSlotsForDay(
            ctx.groupName,
            day,
            assignments,
            globalAssignments
          );
          // คาบเช้า (< 4) อนุญาตให้ลง แม้รวมจะเกิน
          // คาบบ่าย (>= 4) เช็คให้เข้มงวด
          const isMorning = startSlot < 4;
          if (!isMorning && usedSlots + duration > maxPeriodsPerDay) {
            continue; // ข้ามไปคาบถัดไป
          }
        }

        // 🚫 ORG
        if (
          day === ORG_ACTIVITY_DAY &&
          startSlot < ORG_ACTIVITY_START + ORG_ACTIVITY_DURATION &&
          startSlot + duration > ORG_ACTIVITY_START
        ) continue;

        // 🚫 lunch
        const hitsLunch =
          startSlot <= lunchSlot &&
          startSlot + duration > lunchSlot;
        if (strictAvoidLunch && hitsLunch) continue;


        // �👨‍🏫 ครู
        let teacher = null;
        if (!subj.isHomeroom) {
          const candidates = subj.teachers?.length
            ? teachers.filter(t => subj.teachers.includes(t.id))
            : teachers;

          // ✅ สุ่มลำดับครูเพื่อหลีกเลี่ยงตารางซ้ำ (แต่เฉพาะเมื่อ retry > 1)
          const orderedCandidates = sessionRetry === 1 
            ? candidates 
            : candidates.sort(() => Math.random() - 0.5);

          teacher = chooseTeacher(
            orderedCandidates,
            assignments,
            globalAssignments
          );
          if (!teacher) continue;

          if (
            isTeacherBusy(
              teacher.id,
              day,
              startSlot,
              duration,
              assignments,
              globalAssignments
            )
          ) continue;
        }

        // 🏫 ห้อง
        const roomsToTry = matchRooms(subj);
        
        // ✅ สุ่มลำดับห้องเพื่อหลีกเลี่ยงตารางซ้ำ (แต่เฉพาะเมื่อ retry > 1)
        const orderedRooms = sessionRetry === 1 
          ? roomsToTry 
          : roomsToTry.sort(() => Math.random() - 0.5);
        
        for (const room of orderedRooms) {

          if (
            isRoomBusy(
              room.id,
              day,
              startSlot,
              duration,
              assignments,
              globalAssignments
            ) ||
            isClassBusy(
              ctx.groupName,
              day,
              startSlot,
              duration,
              assignments
            )
          ) continue;

          // ✅ วางได้จริง
          assignments.push({
            course_id: subj.id,
            course_name: subj.name,
            teacher_id: teacher?.id || null,
            teacher_name: teacher?.name || null,
            room_id: room.id,
            room_name: room.name,
            class_group: ctx.groupName,
            day,
            slot: startSlot,
            duration,
            color: subj.color,
            sessionType: subj.sessionType
          });

          globalAssignments.push(assignments.at(-1));
          placed = true;
          break;
        }
        if (placed) break;
      }
    }
  }

  if (!placed) {
setLog(p =>
  p +
  `\n⛔ วิชา: ${subj.name}\n   ❌ ${subj.sessionType} (${duration} คาบ) ไม่สามารถลงได้หลัง retry ${SESSION_RETRY_LIMIT} รอบ`
);
  } else {
const last = assignments.at(-1);

setLog(p =>
  p +
  `\n   ✔ ${subj.sessionType} (${duration} คาบ) ลงสำเร็จ ` +
  `(${DAY_NAMES[last.day]} ${slotRange(last.slot, last.duration)} ห้อง ${last.room_name})`
);
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
          className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 w-full shadow-sm"
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
          className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-blue-600 shadow-md hover:bg-blue-700 hover:shadow-lg transition duration-200 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed text-lg tracking-wide"
          disabled={running}
          onClick={generateOneClassGroup}
        >
          สร้างตาราง (เฉพาะกลุ่ม)
        </button>

        <button
          className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-emerald-600 shadow-md hover:bg-emerald-700 hover:shadow-lg transition duration-200 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed text-lg tracking-wide"
          disabled={running}
          onClick={generateAllClassGroup}
        >
          สร้างตารางทั้งหมด
        </button>

        <button
          className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-red-600 shadow-md hover:bg-red-700 hover:shadow-lg transition duration-200 ease-in-out text-lg tracking-wide"
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
