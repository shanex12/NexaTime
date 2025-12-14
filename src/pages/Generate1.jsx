import React, { useState, useEffect } from 'react';
import { loadData, saveData } from '../utils';

export default function Generate() {

  const [running, setRunning] = useState(false);
  const [log, setLog] = useState('');
  const [result, setResult] = useState(null);

  const data = loadData();

  const departments = data.departments || [];
  const classGroups = data.classGroups || [];
  const rooms = data.rooms || [];
  const subjects = data.subjects || [];
  const teachers = data.teachers || [];

  const settings = data.settings || {};

  // ตั้งค่าพื้นฐานจากหน้า "ตั้งค่า AI"
  const days = settings.days || 5;
  const slots = settings.timeslots_per_day || 8;

  const avoidLunch = settings.avoidLunch ?? true;
  const lunchSlot = settings.lunchSlot ?? 4;        // index (0-based) → คาบที่ 5
  const spreadDays = settings.spreadDays ?? true;
  const strictRoomTag = settings.strictRoomTag ?? true;
  const balanceTeachers = settings.balanceTeachers ?? true;

  const [selectedDept, setSelectedDept] = useState("");
  const [group, setGroup] = useState("");

  // -------------------------------
  // ฟิลเตอร์กลุ่มเรียนตามแผนก
  const filteredGroups = classGroups.filter(c =>
    selectedDept ? c.department_id === selectedDept : true
  );

  useEffect(() => {
    if (data && data.lastResult) setResult(data.lastResult);
  }, []);

  // -------------------------------
  // ฟิลเตอร์รายวิชาตามแผนกสำหรับโหมด "กลุ่มเดียว"
  const filteredSubjects = subjects.filter(s => {
    if (s.isGeneral) return true;
    if (Array.isArray(s.departments)) {
      return s.departments.includes(selectedDept);
    }
    return false;
  });

  // -------------------------------
  // ฟังก์ชันช่วย: เช็กครู "ไม่ว่าง"
  function isTeacherUnavailable(teacher, day, startSlot, duration) {
    if (!teacher) return false;
    const dur = duration || 1;
    const endSlot = startSlot + dur - 1;

    function overlap(s1, e1, s2, e2) {
      return !(e1 < s2 || e2 < s1);
    }

    // กรณีเก็บเป็น array ของ object: { day, slot, duration? }
    function checkArray(arr) {
      if (!Array.isArray(arr)) return false;
      return arr.some(u => {
        if (typeof u.day !== "number" || typeof u.slot !== "number") return false;
        if (u.day !== day) return false;
        const uDur = u.duration || 1;
        const uEnd = u.slot + uDur - 1;
        return overlap(startSlot, endSlot, u.slot, uEnd);
      });
    }

    if (checkArray(teacher.unavailableSlots)) return true;
    if (checkArray(teacher.unavailable)) return true;

    // กรณีเก็บเป็น matrix: unavailableMatrix[day][slot] = true
    const matrices = [teacher.unavailableMatrix, teacher.busyMatrix, teacher.busySlots];
    for (const m of matrices) {
      if (!Array.isArray(m)) continue;
      const row = m[day];
      if (!Array.isArray(row)) continue;
      for (let s = startSlot; s <= endSlot; s++) {
        if (row[s]) return true;
      }
    }

    // กรณีเก็บเป็น object: busyDays[day] = [slot, slot, ...]
    const busyDays = teacher.busyDays || teacher.unavailableByDay;
    if (busyDays && Array.isArray(busyDays[day])) {
      const arr = busyDays[day];
      for (let s = startSlot; s <= endSlot; s++) {
        if (arr.includes(s)) return true;
      }
    }

    return false;
  }

  // -------------------------------
  // ฟังก์ชันช่วย: นับโหลดสอนของครู (ใช้กับ balanceTeachers)
  function getTeacherLoad(teacherId, assignments, globalAssignments) {
    if (!teacherId) return 0;
    const all = [...(globalAssignments || []), ...(assignments || [])];
    let load = 0;
    all.forEach(a => {
      if (a.teacher_id === teacherId) {
        load += a.duration || 1;
      }
    });
    return load;
  }

  function chooseTeacher(possibleTeachers, assignments, globalAssignments) {
    if (!possibleTeachers.length) return null;

    // ถ้าไม่เปิด balanceTeachers → random ธรรมดา
    if (!balanceTeachers) {
      return possibleTeachers[Math.floor(Math.random() * possibleTeachers.length)];
    }

    // ถ้าเปิด balanceTeachers → หาครูที่มีโหลดน้อยสุด
    let best = [];
    let bestLoad = Infinity;
    possibleTeachers.forEach(t => {
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

  // -------------------------------
  // ฟังก์ชันช่วย: โหลดคาบต่อวันของกลุ่ม (ใช้กับ spreadDays)
  function buildDayLoadForGroup(groupName, assignments, globalAssignments) {
    const counts = new Array(days).fill(0);
    const all = [...(globalAssignments || []), ...(assignments || [])];

    all.forEach(a => {
      if (a.class_group !== groupName) return;
      if (typeof a.day !== "number") return;
      if (a.day < 0 || a.day >= days) return;
      counts[a.day] += a.duration || 1;
    });

    return counts;
  }

  function pickDayForGroup(groupName, assignments, globalAssignments) {
    // ถ้าไม่เปิด spreadDays → random day ตรง ๆ
    if (!spreadDays) {
      return Math.floor(Math.random() * days);
    }

    const loads = buildDayLoadForGroup(groupName, assignments, globalAssignments);
    const indices = [...Array(days).keys()];
    indices.sort((a, b) => loads[a] - loads[b]); // วันคาบน้อยจะอยู่หน้าสุด

    // เลือกจาก "วันคาบน้อยสุด" 2–3 วันแรก เพื่อให้กระจาย แต่ยังมีความสุ่มอยู่
    const pickCount = Math.min(3, days);
    const chosenIdx = Math.floor(Math.random() * pickCount);
    return indices[chosenIdx];
  }

  // -------------------------------
  // จับคู่ห้องตาม TAG / room_type (ปรับให้สอดคล้อง strictRoomTag)
  function matchRooms(subj) {
    const hasTag = subj.room_tag && subj.room_tag.trim() !== "";

    if (hasTag) {
      const tag = subj.room_tag.trim().toLowerCase();

      const tagged = rooms.filter(r =>
        r.room_tag &&
        r.room_tag.trim().toLowerCase() === tag
      );

      if (tagged.length > 0) {
        // มีห้อง tag ตรง → ใช้ห้องเหล่านี้ก่อน
        return tagged;
      }

      // ไม่มีห้อง tag ตรง
      if (strictRoomTag) {
        // โหมดเข้มงวด → ไม่ยอม fallback
        setLog(prev =>
          prev +
          `\n⚠ วิชา ${subj.name} มี room_tag="${subj.room_tag}" แต่ไม่มีห้องที่ room_tag ตรงกัน`
        );
        return [];
      }
      // ถ้าไม่ได้ strict → ปล่อยให้ไปลอง room_type ต่อไป
    }

    let result = [];

    if (subj.room_type && subj.room_type.trim() !== "") {
      result = rooms.filter(r => r.room_type === subj.room_type);
    }

    if (result.length === 0) {
      result = rooms;
    }

    return result;
  }

  // -------------------------------
  // ปุ่มเคลียร์ตารางทั้งหมด
  function clearAllTables() {
    if (!window.confirm("ต้องการลบตารางเรียนทั้งหมดของทุกกลุ่มเรียนหรือไม่?")) {
      return;
    }

    const d = loadData();
    d.allTimetables = {};  // ล้างทั้งหมด
    saveData(d);

    setResult(null);
    setLog("✔ เคลียร์ตารางทั้งหมดเรียบร้อยแล้ว!");
  }

  // -------------------------------
  // ตัวช่วย: จัดลำดับวิชา (Heuristic เบา ๆ)
  // เน้นวางวิชาที่ยากก่อน = คาบยาว, ครูน้อย, ห้องน้อย
  function sortSessionsWithHeuristic(subjectSessions, groupSize) {
    return [...subjectSessions].sort((a, b) => {
      const durA = a.periods_per_session || 1;
      const durB = b.periods_per_session || 1;

      const teacherChoicesA = a.teachers?.length || teachers.length;
      const teacherChoicesB = b.teachers?.length || teachers.length;

      const roomsA = matchRooms(a).filter(r =>
        groupSize > 0 ? Number(r.capacity || 0) >= groupSize : true
      ).length || 999;

      const roomsB = matchRooms(b).filter(r =>
        groupSize > 0 ? Number(r.capacity || 0) >= groupSize : true
      ).length || 999;

      const scoreA = durA * 100 - teacherChoicesA * 5 - roomsA;
      const scoreB = durB * 100 - teacherChoicesB * 5 - roomsB;

      return scoreB - scoreA;
    });
  }

  // -------------------------------
  // ฟังก์ชันสร้างตารางของ "กลุ่มเดียว"
  async function runLocalSolver() {

    if (!selectedDept) return alert("กรุณาเลือกแผนก");
    if (!group) return alert("กรุณาเลือกกลุ่มเรียน");

    const currentClassGroup = classGroups.find(c => c.name === group);
    const groupSize = currentClassGroup?.studentCount || 0;

    const deptObj = departments.find(d => d.id === selectedDept);
    const deptName = deptObj?.name || selectedDept;

    const start = performance.now();

    // โหลดข้อมูลตารางเดิมทั้งหมด
    const d0 = loadData();
    const allTables = d0.allTimetables || {};

    // รวมคาบของ "ทุกกลุ่มอื่น" ไว้กันชน (ครู/ห้อง) ข้ามกลุ่ม
    const globalAssignments = [];
    for (const gName in allTables) {
      if (gName === group) continue; // ข้ามกลุ่มที่กำลังจะจัดใหม่
      const arr = allTables[gName] || [];
      globalAssignments.push(...arr);
    }

    setRunning(true);
    setLog(
      `เริ่มสร้างตารางให้แผนก: ${deptName} | กลุ่ม: ${group} ` +
      `(นักเรียน: ${groupSize || "ไม่ระบุ"})`
    );

    const assignments = [];
    const subjectSessions = [];

    // เตรียม sessions จากวิชาในแผนกที่เลือก
    filteredSubjects.forEach(s => {
      const total = s.periods || 1;
      const per = s.periods_per_session || 1;
      const count = Math.ceil(total / per);
      for (let i = 0; i < count; i++) {
        subjectSessions.push({ ...s });
      }
    });

    const orderedSessions = sortSessionsWithHeuristic(subjectSessions, groupSize);

    for (const subj of orderedSessions) {

      let placed = false;
      const duration = subj.periods_per_session || 1;

      const baseRooms = matchRooms(subj);

      if (baseRooms.length === 0) {
        setLog(prev => prev + `\n⚠ ไม่มีห้อง (ตาม TAG/ประเภท) สำหรับวิชา ${subj.name}`);
        continue;
      }

      let possibleRooms = baseRooms;

      if (groupSize > 0) {
        possibleRooms = baseRooms.filter(r => Number(r.capacity || 0) >= groupSize);

        if (possibleRooms.length === 0) {
          setLog(prev =>
            prev +
            `\n⚠ วิชา ${subj.name} กลุ่ม ${group} มีนักเรียน ${groupSize} คน แต่ไม่มีห้องที่รองรับได้`
          );
          continue;
        }
      }

      const possibleTeachers = subj.teachers?.length
        ? teachers.filter(t => subj.teachers.includes(t.id))
        : teachers;

      if (!possibleTeachers.length) {
        setLog(prev => prev + `\n⚠ วิชา ${subj.name} ไม่มีครู`);
        continue;
      }

      // โหลดคาบต่อวันของกลุ่มนี้ (ใช้กับ spreadDays)
      const dayLoad = buildDayLoadForGroup(group, assignments, globalAssignments);

      // 🔁 สองรอบ: รอบแรกห้ามคาบพักกลางวัน, รอบสองค่อยยอม
      for (let pass = 0; pass < 2 && !placed; pass++) {
        const allowLunchThisPass = (pass === 1) || !avoidLunch;

        for (let attempt = 0; attempt < 500 && !placed; attempt++) {

          const day = pickDayForGroup(group, assignments, globalAssignments);

          let startSlot = Math.floor(Math.random() * (slots - duration + 1));

          // รอบแรก: ห้ามใช้คาบพักกลางวันเด็ดขาด
          if (!allowLunchThisPass && avoidLunch && startSlot === lunchSlot) {
            continue;
          }

          const teacher = chooseTeacher(possibleTeachers, assignments, globalAssignments);
          if (!teacher) continue;

          // เช็กครู "ไม่ว่าง"
          if (isTeacherUnavailable(teacher, day, startSlot, duration)) {
            continue;
          }

          // ครูชนกับคาบอื่น?
          const teacherBusy =
            globalAssignments.some(a =>
              a.teacher_id === teacher.id &&
              a.day === day &&
              (
                (startSlot >= a.slot && startSlot < a.slot + a.duration) ||
                (a.slot >= startSlot && a.slot < startSlot + duration)
              )
            ) ||
            assignments.some(a =>
              a.teacher_id === teacher.id &&
              a.day === day &&
              (
                (startSlot >= a.slot && startSlot < a.slot + a.duration) ||
                (a.slot >= startSlot && a.slot < startSlot + duration)
              )
            );
          if (teacherBusy) continue;

          // กลุ่มนี้ชนตัวเองไหม
          const classBusy = assignments.some(a =>
            a.class_group === group && a.day === day &&
            (
              (startSlot >= a.slot && startSlot < a.slot + a.duration) ||
              (a.slot >= startSlot && a.slot < startSlot + duration)
            )
          );
          if (classBusy) continue;

          for (const room of possibleRooms) {

            // ห้องชนกับคาบอื่น?
            const roomBusy =
              globalAssignments.some(a =>
                a.room_id === room.id &&
                a.day === day &&
                (
                  (startSlot >= a.slot && startSlot < a.slot + a.duration) ||
                  (a.slot >= startSlot && a.slot < startSlot + duration)
                )
              ) ||
              assignments.some(a =>
                a.room_id === room.id &&
                a.day === day &&
                (
                  (startSlot >= a.slot && startSlot < a.slot + a.duration) ||
                  (a.slot >= startSlot && a.slot < startSlot + duration)
                )
              );
            if (roomBusy) continue;

            // วางได้แล้ว
            assignments.push({
              course_id: subj.id,
              course_name: subj.name,
              teacher_id: teacher.id,
              teacher_name: teacher.name,
              room_id: room.id,
              room_name: room.name,
              class_group: group,
              day,
              slot: startSlot,
              duration,
              color: subj.color
            });

            dayLoad[day] += duration;

            placed = true;
            break;
          }
        }
      }

      if (!placed) {
        setLog(prev => prev + `\n❌ วางวิชา ${subj.name} ไม่สำเร็จ (อาจติดครู/ห้อง/เวลาครูไม่ว่าง)`);
      }
    }

    // บันทึกลง allTimetables
    const d = loadData();
    if (!d.allTimetables) d.allTimetables = {};
    d.allTimetables[group] = assignments;
    saveData(d);

    setResult({ group, assignments });

    const end = performance.now();
    const sec = ((end - start) / 1000).toFixed(2);

    setRunning(false);
    setLog(prev =>
      prev +
      `\n✔ สร้างตารางเสร็จแล้ว! แผนก: ${deptName} | กลุ่ม: ${group} (ใช้เวลา ${sec} วินาที)`
    );
  }

  // -------------------------------
  // สร้างตารางทุกกลุ่มเรียน "ในแผนกที่เลือก"
  async function generateAll() {

    if (!selectedDept) {
      alert("กรุณาเลือกแผนกก่อนสร้างตารางทั้งหมดในแผนกนี้");
      return;
    }

    const deptObj = departments.find(d => d.id === selectedDept);
    const deptName = deptObj?.name || selectedDept;

    const globalStart = performance.now();

    setRunning(true);
    setLog(`เริ่มสร้างตารางทั้งหมดสำหรับแผนก: ${deptName}\n`);

    // โหลดข้อมูลตารางเดิมทั้งหมด
    const d0 = loadData();
    const allTables = d0.allTimetables || {};

    // mapping: groupName → department_id
    const groupDeptMap = new Map(classGroups.map(g => [g.name, g.department_id]));

    // ดึงคาบของ "ทุกแผนกอื่น" มาถือว่าเป็นตารางล็อกอยู่แล้ว ห้ามชน
    const globalAssignments = [];
    for (const gName in allTables) {
      const grpDeptId = groupDeptMap.get(gName);
      if (!grpDeptId) continue;
      if (grpDeptId === selectedDept) continue; // ข้ามแผนกที่เรากำลังจะจัดใหม่
      const arr = allTables[gName] || [];
      globalAssignments.push(...arr);
    }

    const d = loadData();
    if (!d.allTimetables) d.allTimetables = {};

    // เลือกเฉพาะกลุ่มเรียนของแผนกนี้
    const targetGroups = classGroups.filter(g => g.department_id === selectedDept);

    for (const grp of targetGroups) {

      const grpName = grp.name;
      const dept = grp.department_id;
      const groupSize = grp.studentCount || 0;

      setLog(prev =>
        prev + `\n▶ กำลังสร้างตารางให้กลุ่ม ${grpName} (แผนก: ${deptName}, นักเรียน: ${groupSize || "ไม่ระบุ"})`
      );

      const groupSubjects = subjects.filter(s => {
        if (s.isGeneral) return true;
        if (Array.isArray(s.departments)) {
          return s.departments.includes(dept);
        }
        return false;
      });

      const subjectSessions = [];
      groupSubjects.forEach(s => {
        const total = s.periods || 1;
        const per = s.periods_per_session || 1;
        const count = Math.ceil(total / per);
        for (let i = 0; i < count; i++) {
          subjectSessions.push({ ...s });
        }
      });

      const orderedSessions = sortSessionsWithHeuristic(subjectSessions, groupSize);
      const assignments = [];

      for (const subj of orderedSessions) {

        let placed = false;
        const duration = subj.periods_per_session || 1;

        const baseRooms = matchRooms(subj);
        if (baseRooms.length === 0) {
          setLog(prev => prev + `\n⚠ กลุ่ม ${grpName}: ไม่มีห้องสำหรับวิชา ${subj.name}`);
          continue;
        }

        let possibleRooms = baseRooms.filter(r => Number(r.capacity || 0) >= groupSize);
        if (possibleRooms.length === 0) {
          possibleRooms = baseRooms;
          setLog(prev =>
            prev + `\n⚠ กลุ่ม ${grpName}: ห้องความจุไม่พอสำหรับ ${subj.name} แต่จะลองจัดให้ใกล้เคียง`
          );
        }

        const possibleTeachers = subj.teachers?.length
          ? teachers.filter(t => subj.teachers.includes(t.id))
          : teachers;

        if (!possibleTeachers.length) {
          setLog(prev => prev + `\n⚠ กลุ่ม ${grpName}: วิชา ${subj.name} ไม่มีครู`);
          continue;
        }

        // โหลดคาบต่อวันของกลุ่มนี้ในระดับแผนก
        const dayLoad = buildDayLoadForGroup(grpName, assignments, globalAssignments);

        // 🔁 สองรอบ: รอบแรกห้ามคาบพักกลางวัน, รอบสองค่อยยอม
        for (let pass = 0; pass < 2 && !placed; pass++) {
          const allowLunchThisPass = (pass === 1) || !avoidLunch;

          for (let attempt = 0; attempt < 500 && !placed; attempt++) {

            const day = pickDayForGroup(grpName, assignments, globalAssignments);

            let startSlot = Math.floor(Math.random() * (slots - duration + 1));
            if (!allowLunchThisPass && avoidLunch && startSlot === lunchSlot) {
              continue;
            }

            const teacher = chooseTeacher(possibleTeachers, assignments, globalAssignments);
            if (!teacher) continue;

            if (isTeacherUnavailable(teacher, day, startSlot, duration)) {
              continue;
            }

            // ครูชน? (ห้ามชนกับ: แผนกอื่นที่ล็อกไว้ + กลุ่มก่อนหน้าในแผนกนี้)
            const teacherBusy =
              globalAssignments.some(a =>
                a.teacher_id === teacher.id &&
                a.day === day &&
                (
                  (startSlot >= a.slot && startSlot < a.slot + a.duration) ||
                  (a.slot >= startSlot && a.slot < startSlot + duration)
                )
              ) ||
              assignments.some(a =>
                a.teacher_id === teacher.id &&
                a.day === day &&
                (
                  (startSlot >= a.slot && startSlot < a.slot + a.duration) ||
                  (a.slot >= startSlot && a.slot < startSlot + duration)
                )
              );
            if (teacherBusy) continue;

            // กลุ่มเดียวกันในแผนกนี้
            const classBusy = assignments.some(a =>
              a.class_group === grpName &&
              a.day === day &&
              (
                (startSlot >= a.slot && startSlot < a.slot + a.duration) ||
                (a.slot >= startSlot && a.slot < startSlot + duration)
              )
            );
            if (classBusy) continue;

            for (const room of possibleRooms) {

              // ห้องชน? (ห้ามชนกับ: แผนกอื่นที่ล็อกไว้ + กลุ่มก่อนหน้าในแผนกนี้)
              const roomBusy =
                globalAssignments.some(a =>
                  a.room_id === room.id &&
                  a.day === day &&
                  (
                    (startSlot >= a.slot && startSlot < a.slot + a.duration) ||
                    (a.slot >= startSlot && a.slot < startSlot + duration)
                  )
                ) ||
                assignments.some(a =>
                  a.room_id === room.id &&
                  a.day === day &&
                  (
                    (startSlot >= a.slot && startSlot < a.slot + a.duration) ||
                    (a.slot >= startSlot && a.slot < startSlot + duration)
                  )
                );
              if (roomBusy) continue;

              const assignment = {
                course_id: subj.id,
                course_name: subj.name,
                teacher_id: teacher.id,
                teacher_name: teacher.name,
                room_id: room.id,
                room_name: room.name,
                class_group: grpName,
                day,
                slot: startSlot,
                duration,
                color: subj.color
              };

              assignments.push(assignment);
              globalAssignments.push(assignment); // กันชนกับกลุ่มถัดไป

              dayLoad[day] += duration;

              placed = true;
              break;
            }
          }
        }

        if (!placed) {
          setLog(prev => prev + `\n❌ กลุ่ม ${grpName}: วางวิชา ${subj.name} ไม่สำเร็จ`);
        }
      }

      d.allTimetables[grpName] = assignments;
      saveData(d);

      setLog(prev =>
        prev + `\n✔ เสร็จสิ้นการสร้างตาราง: แผนก ${deptName} | กลุ่ม ${grpName}`
      );
    }

    const globalEnd = performance.now();
    const secAll = ((globalEnd - globalStart) / 1000).toFixed(2);

    setRunning(false);
    setLog(prev =>
      prev +
      `\n\n🎉 สร้างตารางทั้งหมดสำหรับแผนก ${deptName} เรียบร้อยแล้ว! (ใช้เวลา ${secAll} วินาที)`
    );
  }

  // -------------------------------
  // สร้างตารางทั้งหมด "ทุกแผนก ทุกกลุ่ม"
  async function generateAllGlobal() {

    if (!window.confirm("ต้องการสร้างตารางใหม่สำหรับทุกแผนก ทุกกลุ่มเรียน หรือไม่? (ตารางเดิมจะถูกเขียนทับ)")) {
      return;
    }

    const globalStart = performance.now();

    setRunning(true);
    setLog("เริ่มสร้างตารางทั้งหมดสำหรับทุกแผนก ทุกกลุ่มเรียน...\n");

    // เคลียร์ตารางเดิมทั้งหมดก่อน
    const d = loadData();
    d.allTimetables = {};
    saveData(d);

    const allGroups = classGroups;

    // globalAssignments เก็บคาบของทุกกลุ่มที่สร้างไปแล้ว เพื่อกันชนทั้งวิทยาลัย
    const globalAssignments = [];

    for (const grp of allGroups) {

      const grpName = grp.name;
      const deptId = grp.department_id;
      const deptObj = departments.find(dpt => dpt.id === deptId);
      const deptName = deptObj?.name || deptId;
      const groupSize = grp.studentCount || 0;

      setLog(prev =>
        prev +
        `\n▶ กำลังสร้างตารางให้กลุ่ม ${grpName} (แผนก: ${deptName}, นักเรียน: ${groupSize || "ไม่ระบุ"})`
      );

      const groupSubjects = subjects.filter(s => {
        if (s.isGeneral) return true;
        if (Array.isArray(s.departments)) {
          return s.departments.includes(deptId);
        }
        return false;
      });

      const subjectSessions = [];
      groupSubjects.forEach(s => {
        const total = s.periods || 1;
        const per = s.periods_per_session || 1;
        const count = Math.ceil(total / per);
        for (let i = 0; i < count; i++) {
          subjectSessions.push({ ...s });
        }
      });

      const orderedSessions = sortSessionsWithHeuristic(subjectSessions, groupSize);
      const assignments = [];

      for (const subj of orderedSessions) {

        let placed = false;
        const duration = subj.periods_per_session || 1;

        const baseRooms = matchRooms(subj);
        if (baseRooms.length === 0) {
          setLog(prev => prev + `\n⚠ กลุ่ม ${grpName}: ไม่มีห้องสำหรับวิชา ${subj.name}`);
          continue;
        }

        let possibleRooms = baseRooms.filter(r => Number(r.capacity || 0) >= groupSize);
        if (possibleRooms.length === 0) {
          possibleRooms = baseRooms;
          setLog(prev =>
            prev + `\n⚠ กลุ่ม ${grpName}: ห้องความจุไม่พอสำหรับ ${subj.name} แต่จะลองจัดให้ใกล้เคียง`
          );
        }

        const possibleTeachers = subj.teachers?.length
          ? teachers.filter(t => subj.teachers.includes(t.id))
          : teachers;

        if (!possibleTeachers.length) {
          setLog(prev => prev + `\n⚠ กลุ่ม ${grpName}: วิชา ${subj.name} ไม่มีครู`);
          continue;
        }

        // โหลดคาบต่อวันของกลุ่มนี้ในระดับทั้งวิทยาลัย
        const dayLoad = buildDayLoadForGroup(grpName, assignments, globalAssignments);

        // 🔁 สองรอบ: รอบแรกห้ามคาบพักกลางวัน, รอบสองค่อยยอม
        for (let pass = 0; pass < 2 && !placed; pass++) {
          const allowLunchThisPass = (pass === 1) || !avoidLunch;

          for (let attempt = 0; attempt < 500 && !placed; attempt++) {

            const day = pickDayForGroup(grpName, assignments, globalAssignments);

            let startSlot = Math.floor(Math.random() * (slots - duration + 1));
            if (!allowLunchThisPass && avoidLunch && startSlot === lunchSlot) {
              continue;
            }

            const teacher = chooseTeacher(possibleTeachers, assignments, globalAssignments);
            if (!teacher) continue;

            if (isTeacherUnavailable(teacher, day, startSlot, duration)) {
              continue;
            }

            // ครูชน? (เช็กกับ globalAssignments + assignments ของกลุ่มนี้)
            const teacherBusy =
              globalAssignments.some(a =>
                a.teacher_id === teacher.id &&
                a.day === day &&
                (
                  (startSlot >= a.slot && startSlot < a.slot + a.duration) ||
                  (a.slot >= startSlot && a.slot < startSlot + duration)
                )
              ) ||
              assignments.some(a =>
                a.teacher_id === teacher.id &&
                a.day === day &&
                (
                  (startSlot >= a.slot && startSlot < a.slot + a.duration) ||
                  (a.slot >= startSlot && a.slot < startSlot + duration)
                )
              );
            if (teacherBusy) continue;

            // กลุ่มเดียวกัน
            const classBusy = assignments.some(a =>
              a.class_group === grpName &&
              a.day === day &&
              (
                (startSlot >= a.slot && startSlot < a.slot + a.duration) ||
                (a.slot >= startSlot && a.slot < startSlot + duration)
              )
            );
            if (classBusy) continue;

            for (const room of possibleRooms) {

              // ห้องชน? (เช็กกับ globalAssignments + assignments ของกลุ่มนี้)
              const roomBusy =
                globalAssignments.some(a =>
                  a.room_id === room.id &&
                  a.day === day &&
                  (
                    (startSlot >= a.slot && startSlot < a.slot + a.duration) ||
                    (a.slot >= startSlot && a.slot < startSlot + duration)
                  )
                ) ||
                assignments.some(a =>
                  a.room_id === room.id &&
                  a.day === day &&
                  (
                    (startSlot >= a.slot && startSlot < a.slot + a.duration) ||
                    (a.slot >= startSlot && a.slot < startSlot + duration)
                  )
                );
              if (roomBusy) continue;

              const assignment = {
                course_id: subj.id,
                course_name: subj.name,
                teacher_id: teacher.id,
                teacher_name: teacher.name,
                room_id: room.id,
                room_name: room.name,
                class_group: grpName,
                day,
                slot: startSlot,
                duration,
                color: subj.color
              };

              assignments.push(assignment);
              globalAssignments.push(assignment); // ใช้กันชนกับกลุ่มอื่นต่อไป

              dayLoad[day] += duration;

              placed = true;
              break;
            }
          }
        }

        if (!placed) {
          setLog(prev => prev + `\n❌ กลุ่ม ${grpName}: วางวิชา ${subj.name} ไม่สำเร็จ`);
        }
      }

      // บันทึกของกลุ่มนี้ลง allTimetables
      const dNow = loadData();
      if (!dNow.allTimetables) dNow.allTimetables = {};
      dNow.allTimetables[grpName] = assignments;
      saveData(dNow);

      setLog(prev =>
        prev + `\n✔ เสร็จสิ้นการสร้างตาราง: แผนก ${deptName} | กลุ่ม ${grpName}`
      );
    }

    const globalEnd = performance.now();
    const secAll = ((globalEnd - globalStart) / 1000).toFixed(2);

    setRunning(false);
    setLog(prev =>
      prev +
      `\n\n🎉 สร้างตารางทั้งหมดสำหรับทุกแผนก ทุกกลุ่มเรียน เรียบร้อยแล้ว! (ใช้เวลา ${secAll} วินาที)`
    );
  }

  // -------------------------------
  // UI
  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">สร้างตารางเรียน</h2>

      <div className="card p-4 space-y-4">

        <select
          className="border p-3 rounded-lg"
          value={selectedDept}
          onChange={e => {
            setSelectedDept(e.target.value);
            setGroup("");
          }}
        >
          <option value="">-- เลือกแผนก --</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select
          className="border p-3 rounded-lg"
          value={group}
          onChange={e => setGroup(e.target.value)}
        >
          <option value="">-- เลือกกลุ่มเรียน --</option>
          {filteredGroups.map(g => (
            <option key={g.id} value={g.name}>{g.name}</option>
          ))}
        </select>

        {/* สร้างตารางเฉพาะกลุ่ม */}
        <button
          className="btn bg-blue-600 w-full"
          disabled={running}
          onClick={runLocalSolver}
        >
          {running ? "กำลังสร้าง..." : "สร้างตาราง (เฉพาะกลุ่มนี้)"}
        </button>

        {/* สร้างตารางทั้งหมดในแผนกที่เลือก */}
        <button
          className="btn bg-green-600 w-full"
          disabled={running}
          onClick={generateAll}
        >
          {running ? "กำลังสร้างทั้งหมด..." : "สร้างตารางทั้งหมดในแผนกนี้"}
        </button>

        {/* สร้างตารางทั้งหมดทุกแผนก */}
        <button
          className="btn bg-emerald-600 w-full"
          disabled={running}
          onClick={generateAllGlobal}
        >
          {running ? "กำลังสร้างทั้งหมด..." : "สร้างตารางทั้งหมด (ทุกแผนก)"}
        </button>

        {/* เคลียร์ตารางทั้งหมด */}
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
