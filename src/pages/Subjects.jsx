import React, { useState, useEffect } from "react";
import { loadData, saveData, uid } from "../utils";
import { parseCSV } from "../csv";

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const emptyForm = {
    id: "",
    name: "",
    periods: 1,
    room_type: "theory",
    room_tag: "",              // ⭐ เพิ่ม tag ห้อง
    color: "#0ea5e9",
    teachers: [],
    periods_per_session: 1,
    isGeneral: false,
    departments: []
  };

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);

  // โหลดข้อมูลเริ่มต้น
  useEffect(() => {
    const d = loadData();
    if (d) {
      setSubjects(d.subjects || []);
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
    if (dup) return alert("ชื่อวิชานี้มีอยู่แล้ว!");

    if (!form.isGeneral && form.departments.length === 0)
      return alert("กรุณาเลือกแผนกที่เปิดสอน");

    const item = {
      ...form,
      id: form.id || uid("s")
    };

    const newList = [...subjects.filter((s) => s.id !== item.id), item];
    setSubjects(newList);
    persist(newList);

    setForm(emptyForm);
    setEditing(false);
  }

  function handleEdit(s) {
    setForm({
      ...s,
      teachers: s.teachers || [],
      departments: s.departments || [],
      isGeneral: s.isGeneral || false,
      room_tag: s.room_tag || ""   // ⭐ โหลด room_tag
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

function handleImportCSV(e) {
  const file = e.target.files[0];
  if (!file) return;

  parseCSV(file, (rows) => {
    const imported = rows.map(r => ({
      id: uid("s"),
      name: r.subject_name || "",
      periods: Number(r.periods || 1),
      room_type: "theory",
      room_tag: r.room_tag || "",
      color: "#0ea5e9",
      teachers: [],
      periods_per_session: 1,
      departments: [],
      isGeneral: false
    }));

    const newList = [...subjects, ...imported];
    setSubjects(newList);
    persist(newList);

    alert("นำเข้าวิชาเรียบร้อย");
  });
}


  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">
        จัดการวิชา
      </h2>

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

          <input
            type="number"
            className="w-full p-2 border mb-2"
            placeholder="จำนวนคาบต่อสัปดาห์"
            value={form.periods}
            onChange={(e) =>
              setForm({ ...form, periods: Number(e.target.value) })
            }
          />

          {/* ประเภทห้องเรียน */}
          <select
            className="w-full p-2 border mb-2"
            value={form.room_type}
            onChange={(e) => setForm({ ...form, room_type: e.target.value })}
          >
            <option value="theory">ห้องเรียนปกติ</option>
            <option value="lab">ห้องปฏิบัติการ</option>
          </select>

          {/* ⭐ เพิ่ม Room Tag */}
          <input
            className="w-full p-2 border mb-2"
            placeholder="Room Tag (เช่น computer, network, science)"
            value={form.room_tag}
            onChange={(e) => setForm({ ...form, room_tag: e.target.value })}
          />

          <label className="text-sm">คาบต่อครั้ง</label>
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
                  {t.name} ({t.short})
                </label>
              ))}

              {allTeachers.length === 0 && (
                <div className="text-sm text-slate-500">ยังไม่มีครู</div>
              )}
            </div>
          </div>

          {/* แผนก */}
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
          <div className="flex gap-2">
            <button className="btn bg-blue-600" onClick={handleAdd}>
              {editing ? "บันทึก" : "เพิ่ม"}
            </button>

            <button
              className="btn bg-gray-400"
              onClick={() => {
                setForm(emptyForm);
                setEditing(false);
              }}
            >
              ยกเลิก
            </button>
          </div>
          <label className="btn bg-green-600 mb-2 cursor-pointer">
  📂 นำเข้าไฟล์ CSV
  <input type="file" hidden accept=".csv" onChange={handleImportCSV} />
</label>
        </div>

        {/* รายการวิชา */}
        <div className="card p-4">
          <h3 className="font-semibold mb-2">รายการวิชา</h3>

          <div className="space-y-2 max-h-96 overflow-auto">
            {subjects.map((s) => (
              <div
                key={s.id}
                className="p-2 border rounded flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold">{s.name}</div>

                  <div className="text-sm text-slate-500">
                    คาบ/สัปดาห์: {s.periods} | ต่อครั้ง:{" "}
                    {s.periods_per_session} | ห้อง: {s.room_type}
                  </div>

                  {/* ⭐ แสดง Room Tag */}
                  {s.room_tag && (
                    <div className="text-xs text-blue-600">
                      ห้องที่ต้องการ: {s.room_tag}
                    </div>
                  )}

                  <div className="text-xs text-slate-500">
                    {s.isGeneral
                      ? "วิชาสามัญ (ทุกแผนก)"
                      : `แผนก: ${
                          (s.departments || [])
                            .map((id) => {
                              const dep = departments.find((d) => d.id === id);
                              return dep ? dep.name : "";
                            })
                            .join(", ")
                        }`}
                  </div>
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
              <div className="text-sm text-slate-500">
                ยังไม่มีข้อมูลวิชา
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
