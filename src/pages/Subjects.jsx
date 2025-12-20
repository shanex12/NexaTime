// src/pages/Subjects.jsx

import React, { useState, useEffect } from "react";
import { loadData, saveData, uid } from "../utils";
import { parseCSV } from "../csv";
import Papa from "papaparse";

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);

  // ✅ room_type ที่มีอยู่จริงทั้งหมด (จาก CSV + ที่แก้ใน UI)
  const roomTypes = Array.from(
    new Set(
      subjects
        .map((s) => String(s.room_type || "").trim())
        .filter(Boolean)
    )
  );

  const emptyForm = {
    id: "",
    subject_id: "",
    isHomeroom: true,
    name: "",
    periods: 0,
    theory: 0,
    practice: 0,
    credit: 0,
    room_type: "",
    room_tag: "",
    color: "#0ea5e9",
    teachers: [],
    periods_per_session: 1,
    isGeneral: false,
    departments: []
  };

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const d = loadData();
    if (d) {
      setSubjects(
        (d.subjects || []).map((s) => ({
          theory: s.theory || 0,
          practice: s.practice || 0,
          credit: s.credit || 0,
          subject_id: s.subject_id || s.id || "",
          ...s
        }))
      );
      setAllTeachers(d.teachers || []);
      setDepartments(d.departments || []);
    }
  }, []);

  function persist(list) {
    const d = loadData();
    d.subjects = list;
    saveData(d);
  }

  function handleAdd() {
    if (!form.name) return alert("กรุณากรอกชื่อวิชา");
    if (!form.periods_per_session || form.periods_per_session < 1)
      return alert("คาบต่อครั้งอย่างน้อย 1 คาบ");

    const dup = subjects.find(
      (s) => s.name.trim() === form.name.trim() && s.id !== form.id
    );
    // if (dup) return alert("ชื่อวิชานี้มีอยู่แล้ว!");

    // if (!form.isGeneral && form.departments.length === 0)
    //   return alert("กรุณาเลือกแผนกที่เปิดสอน");

    const id = form.id || form.subject_id || uid("s");

    const item = {
      ...form,
      id,
      subject_id: form.subject_id || id
    };
    console.log("New subjects item:", item);
    

    const newList = [...subjects.filter((s) => s.id !== item.id), item];
    setSubjects(newList);
    persist(newList);

    setForm(emptyForm);
    setEditing(false);
  }

  function handleEdit(s) {
    setForm({
      ...s,
      subject_id: s.subject_id || s.id,
      teachers: s.teachers || [],
      departments: s.departments || [],
      isGeneral: s.isGeneral || false,
      room_tag: s.room_tag || "",
      theory: s.theory || 0,
      practice: s.practice || 0,
      credit: s.credit || 0,
      periods_per_session: s.periods_per_session || 1
    });
    setEditing(true);
  }

  function handleDelete(id) {
    if (!confirm("ลบวิชานี้หรือไม่?")) return;
    const newList = subjects.filter((s) => s.id !== id);
    setSubjects(newList);
    persist(newList);
  }

  function toggleTeacher(tid) {
    setForm((prev) => {
      const list = prev.teachers || [];
      if (list.includes(tid))
        return { ...prev, teachers: list.filter((x) => x !== tid) };
      return { ...prev, teachers: [...list, tid] };
    });
  }

  function toggleDepartment(depId) {
    setForm((prev) => {
      if (prev.departments.includes(depId)) {
        return {
          ...prev,
          departments: prev.departments.filter((d) => d !== depId)
        };
      }
      return {
        ...prev,
        departments: [...prev.departments, depId]
      };
    });
  }

  /**
 * ลบรายวิชาทั้งหมดออกจากระบบ
 */
function clearAllSubjects() {
  const ok = window.confirm(
    "⚠️ ต้องการลบรายวิชาทั้งหมดหรือไม่?\n" +
    "รายวิชาจะถูกลบทั้งหมด และไม่สามารถกู้คืนได้"
  );
  if (!ok) return;

  const d = loadData();

  // ลบ subjects
  d.subjects = [];

  // // ล้างตารางเรียนด้วย (ป้องกัน dangling subject)
  // d.allTimetables = {};
  // d.lastResult = null;

  // // คงข้อมูลพื้นฐานอื่นไว้
  // d.classGroups = classGroups;
  // d.departments = departments;
  // d.rooms = rooms;
  // d.teachers = teachers;
  // d.settings = settings;

  saveData(d);

  // อัปเดต UI
  setSubjects([]);        // ถ้า subjects เป็น state
  setForm(emptyForm);
  setEditing(false);

  console.warn("All subjects have been cleared");
}


  // ✅ นำเข้า subject.csv ตาม pdf:
  // subject_id, subject_name, theory, practice, credit
function handleImportCSV(e) {
  const input = e.target;
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (ev) => {
    Papa.parse(ev.target.result, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        // 🔹 data = rows จาก CSV จริง (รวม roomtype)
        console.log("Import subject.csv rows (Papa):", data);

        const subjectMap = new Map();
        const importedIds = new Set();

        // ใส่ subjects เดิมเข้า Map ก่อน (ให้ของใหม่ overwrite)
        subjects.forEach((s) => {
          if (s.subject_id) {
            subjectMap.set(s.subject_id, s);
          }
        });

        data.forEach((r, index) => {
          const rawId = String(r.subject_id || "").trim();
          const name = String(r.subject_name || "").trim();

          if (!name) {
            console.warn(`Row ${index + 2}: ไม่มี subject_name → ข้าม`);
            return;
          }

          if (rawId && importedIds.has(rawId)) {
            console.warn(
              `Row ${index + 2}: subject_id ซ้ำในไฟล์ → ข้าม`,
              rawId
            );
            return;
          }

          const subject_id = rawId || uid("s");
          importedIds.add(subject_id);

          const theory = Number(r.theory) || 0;
          const practice = Number(r.practice) || 0;
          const credit = Number(r.credit) || 0;
          const periods = theory + practice || 1;

          // 🔑 ตรงนี้คือหัวใจ: roomtype มาจาก CSV จริง
          const csvRoomType = String(
            r.room_type ?? r.roomtype ?? ""
          ).trim();

          const old = subjectMap.get(subject_id);

          const subj = {
            ...(old || {}),
            id: subject_id,
            subject_id,
            name,
            theory,
            practice,
            credit,
            periods,
            room_type: csvRoomType || old?.room_type || ""
          };

          subjectMap.set(subject_id, subj);
        });

        const merged = Array.from(subjectMap.values());
        console.log("Merged subjects:", merged);

        setSubjects(merged);
        persist(merged);

        alert("นำเข้าวิชาเรียบร้อย (subject_id ไม่ซ้ำ)");
        input.value = "";
      }
    });
  };

  reader.readAsText(file, "utf-8");
}



  
  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">จัดการวิชา</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* ฟอร์มเพิ่ม/แก้ไข */}
        <div className="card p-4">
          <h3 className="font-semibold mb-2">
            {editing ? "แก้ไขวิชา" : "เพิ่มวิชาใหม่"}
          </h3>

          <input
            className="w-full p-2 border mb-2"
            placeholder="ชื่อวิชา"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <label className="text-sm">รหัสวิชา</label>
          <input
            className="w-full p-2 border mb-2"
            placeholder="รหัสวิชา : เช่น 31900-0001"
            value={form.subject_id}
            onChange={(e) =>
              setForm({ ...form, subject_id: (e.target.value) })
            }
          />
          <label className="text-sm">คาบทฤษฎี</label>
          <input
            type="number"
            className="w-full p-2 border mb-2"
            placeholder="จำนวนคาบทฤษฎีต่อสัปดาห์"
            value={form.theory}
            onChange={(e) =>
              setForm({ ...form, theory: Number(e.target.value) })
            }
          />

          <label className="text-sm">คาบปฏิบัติ</label>
          <input
            type="number"
            className="w-full p-2 border mb-2"
            placeholder="จำนวนคาบปฏิบัติต่อสัปดาห์"
            value={form.practice}
            onChange={(e) =>
              setForm({ ...form, practice: Number(e.target.value) })
            }
          />

          {/* {ประเภทห้องเรียน} */}
          <label className="text-sm">ประเภทห้องเรียน</label>

          <select
            className="w-full p-2 border mb-2"
            value={form.room_type}
            onChange={(e) =>
              setForm({ ...form, room_type: e.target.value })
            }
          >
            <option value="">-- ยังไม่กำหนด --</option>

            {/* 🔹 room_type ที่มีอยู่จริงจาก CSV */}
            {roomTypes.map((rt) => (
              <option key={rt} value={rt}>
                {rt}
              </option>
            ))}

            {/* 🔹 ค่ามาตรฐาน */}
            <option value="classroom">ห้องเรียนปกติ</option>
            <option value="lab">ห้องปฏิบัติการ</option>
          </select>
          


          {/* {Room Tag} */}
          <label className="text-sm">ระบุ Tag ห้องเรียน</label>
          <input
            className="w-full p-2 border mb-2"
            placeholder="Room Tag (เช่น computer, network, science)"
            value={form.room_tag}
            onChange={(e) =>
              setForm({ ...form, room_tag: e.target.value })
            }
          /> 

          {/* <label className="text-sm">คาบต่อครั้ง</label>
          <input
            type="number"
            min="1"
            className="w-full p-2 border mb-2"
            value={form.periods_per_session}
            onChange={(e) =>
              setForm({
                ...form,
                periods_per_session: Number(e.target.value)
              })
            }
          /> */}

          <label className="text-sm">หน่วยกิต</label>
          <input
            type="number"
            min="1"
            className="w-full p-2 border mb-2"
            value={form.credit}
            onChange={(e) =>
              setForm({
                ...form,
                credit: Number(e.target.value)
              })
            }
          />

          <label className="text-sm">สีประจำวิชา</label>
          <input
            type="color"
            className="w-full h-10 mb-2"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
          />

          {/* ครู */}
          <div className="mb-2">
            <div className="text-sm mb-1">ครูที่สอน</div>

            <div className="space-y-1 max-h-32 overflow-auto">
              {allTeachers.map((t) => (
                <label key={t.id} className="block">
                  <input
                    type="checkbox"
                    checked={(form.teachers || []).includes(t.id)}
                    onChange={() => toggleTeacher(t.id)}
                  />{" "}
                  {t.name} {t.short ? `(${t.short})` : ""}
                </label>
              ))}

              {allTeachers.length === 0 && (
                <div className="text-sm text-slate-500">ยังไม่มีครู</div>
              )}
            </div>
          </div>
          
          <label>
          <input
            type="checkbox"
            checked={form.isHomeroom}
            onChange={(e) =>
              setForm({ ...form, isHomeroom: e.target.checked })
            }
          />
          กิจกรรมโฮมรูม / พบครูที่ปรึกษา
        </label>
          {/* { แผนกที่เปิดสอน } */}
          <div className="mb-2">
            <div className="text-sm mb-1">แผนกที่เปิดสอน</div>

            <label className="block mb-1">
              <input
                type="checkbox"
                checked={form.isGeneral}
                onChange={(e) =>
                  setForm({ ...form, isGeneral: e.target.checked })
                }
              />{" "}
              วิชาสามัญ (สอนได้ทุกแผนก)
            </label>

            {!form.isGeneral && (
              <div className="space-y-1 max-h-32 overflow-auto border p-2 rounded">
                {departments.map((dep) => (
                  <label key={dep.id} className="block">
                    <input
                      type="checkbox"
                      checked={form.departments.includes(dep.id)}
                      onChange={() => toggleDepartment(dep.id)}
                    />{" "}
                    {dep.name}
                  </label>
                ))}
                {departments.length === 0 && (
                  <div className="text-sm text-slate-500">
                    ยังไม่มีแผนกในระบบ
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ปุ่ม */}
          <div className="flex gap-2 mb-3">
            <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex-1" onClick={handleAdd}>
              {editing ? "✅ บันทึก" : "➕ เพิ่ม"}
            </button>

            <button
              className="px-6 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex-1"
              onClick={() => {
                setForm(emptyForm);
                setEditing(false);
              }}
            >
              ❌ ยกเลิก
            </button>
          </div>

          <label className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 mb-2 cursor-pointer">
            📂 นำเข้า subject.csv
            <input type="file" hidden accept=".csv" onChange={handleImportCSV} />
          </label>
        </div>

        {/* รายการวิชา */}
        <div className="card p-4">
          <h3 className="font-semibold mb-2">รายการวิชา</h3>

          <div className="space-y-2 max-h-96 overflow-auto text-sm">
            {subjects.map((s) => (
              <div
                key={s.id}
                className="p-2 border rounded flex justify-between items-start"
              >
                <div>
                  <div className="font-semibold text-base">{s.name}</div>
                  {s.subject_id && (
                    <div className="text-xs text-slate-500">
                      รหัสวิชา: {s.subject_id}
                    </div>
                  )}
                  {(s.theory || s.practice) && (
                    <div className="text-xs text-slate-500">
                      ทฤษฎี: {s.theory || 0} | ปฏิบัติ: {s.practice || 0}
                    </div>
                  )}
                  {s.credit !== undefined && (
                    <div className="text-xs text-slate-500">
                      หน่วยกิต: {s.credit}
                    </div>
                  )}
                  {String(s.room_type).trim() !== "" ? (
                    <div className="text-xs text-slate-500">
                      ประเภทห้องเรียน: {s.room_type}
                    </div>
                  ) : (
                    <div className="text-xs text-red-500">
                      ⚠ ยังไม่ได้กำหนดประเภทห้อง
                    </div>
                  )}

                  {s.room_tag !== undefined && (
                    <div className="text-xs text-slate-500">
                      Tag ห้องเรียน: {s.room_tag}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    className="px-2 py-1 bg-yellow-500 text-white rounded"
                    onClick={() => handleEdit(s)}
                  >
                    แก้ไข
                  </button>
                  <button
                    className="px-2 py-1 bg-red-500 text-white rounded"
                    onClick={() => handleDelete(s.id)}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}

            {subjects.length === 0 && (
              <div className="text-slate-500 text-sm">
                ยังไม่มีวิชาในระบบ
              </div>
            )}
          </div>
          <br/>
          <button
  className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 w-full"
  onClick={clearAllSubjects}
>
  🗑️ ลบรายวิชาทั้งหมด
</button>
        </div>
        
      </div>
    </div>
  );
}
