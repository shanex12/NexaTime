// src/pages/Rooms.jsx

import React, { useState, useEffect } from "react";
import { loadData, saveData, uid } from "../utils";
import { parseCSV } from "../csv";
import Papa from "papaparse";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [editing, setEditing] = useState(false);

  // 🔑 room_type ที่มีอยู่จริงทั้งหมด (จาก CSV + ที่เคยบันทึก)
  const roomTypes = Array.from(
    new Set(
      rooms
        .map((r) => String(r.room_type || "").trim())
        .filter(Boolean)
    )
  );


  const emptyForm = {
    id: "",
    room_id: "",
    name: "",
    capacity: 0,
    room_type: "",
    room_tag: ""
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const d = loadData();
    setRooms(d.rooms || []);
  }, []);

  function persist(list) {
    const d = loadData();
    d.rooms = list;
    saveData(d);
  }

  function handleSave() {
    if (!form.name) return alert("กรุณากรอกชื่อห้องเรียน");

    const id = form.id || form.room_id || uid("room");

    const item = {
      ...form,
      id,
      room_id: form.room_id || id
    };

    const newList = [...rooms.filter((r) => r.id !== item.id), item];
    setRooms(newList);
    persist(newList);
    setForm(emptyForm);
    setEditing(false);
  }

  function handleEdit(room) {
    setForm({
      room_id: room.room_id || room.id,
      ...room
    });
    setEditing(true);
  }

  function handleDelete(id) {
    if (!confirm("ต้องการลบห้องเรียนนี้หรือไม่?")) return;
    const newList = rooms.filter((r) => r.id !== id);
    setRooms(newList);
    persist(newList);
  }

  // ✅ นำเข้า room.csv ตาม pdf: room_id, room_name
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
          console.log("Import room.csv rows (Papa):", data);

          const imported = data
            .map((r) => {
              const name = String(r.room_name || "").trim();
              if (!name) return null;

              const room_id = String(r.room_id || uid("room")).trim();

              const csvRoomType = String(
                r.room_type ?? r.roomtype ?? ""
              ).trim();

              return {
                id: room_id,
                room_id,
                name,
                capacity: 0,
                room_type: csvRoomType, // 🔑 มาจาก CSV จริง
                room_tag: ""
              };
            })
            .filter(Boolean);

          const merged = [...rooms];

          for (const r of imported) {
            const exists = merged.find(
              (x) =>
                (x.room_id && x.room_id === r.room_id) ||
                x.name.trim() === r.name.trim()
            );
            if (!exists) merged.push(r);
          }

          setRooms(merged);
          persist(merged);

          alert("นำเข้าห้องเรียนเรียบร้อย");
          input.value = "";
        }
      });
    };

    reader.readAsText(file, "utf-8");
  }


  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-700 mb-4">จัดการห้องเรียน</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* form */}
        <div className="card p-4">
          <h3 className="font-semibold mb-3">
            {editing ? "แก้ไขห้องเรียน" : "เพิ่มห้องเรียนใหม่"}
          </h3>

          {/* ชื่อห้อง */}
          <div className="mb-3">
            <label className="block mb-1 font-medium">ชื่อห้องเรียน</label>
            <input
              className="w-full p-2 border rounded"
              placeholder="เช่น 421, ห้องคอม 1, ห้องวิทย์ 2"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value
                })
              }
            />
            <label className="block mb-1 font-medium">รหัสห้อง</label>
            <input
              className="w-full p-2 border rounded"
              placeholder="เช่น R5301"
              value={form.room_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  room_id: e.target.value
                })
              }
            />
          </div>

          {/* ความจุ
          <div className="mb-3">
            <label className="block mb-1 font-medium">
              ความจุห้อง (จำนวนคน)
            </label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              placeholder="เช่น 40"
              value={form.capacity}
              onChange={(e) =>
                setForm({
                  ...form,
                  capacity: Number(e.target.value)
                })
              }
            />
          </div> */}

          <label className="text-sm">ประเภทห้อง (จาก CSV)</label>
          <input
            className="w-full p-2 border bg-gray-100 text-slate-600 mb-2"
            value={form.room_type || ""}
            readOnly
          />


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

          <div className="flex gap-2 mt-2">
            <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex-1" onClick={handleSave}>
              {editing ? "✅ บันทึก" : "➕ เพิ่มห้อง"}
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

          <div className="mt-3">
            <label className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer">
              📂 นำเข้า room.csv
              <input
                type="file"
                hidden
                accept=".csv"
                onChange={handleImportCSV}
              />
            </label>
          </div>
        </div>

        {/* list */}
        <div className="card p-4">
          <h3 className="font-semibold mb-3">รายการห้องเรียน</h3>

          <div className="space-y-2 max-h-96 overflow-auto text-sm">
            {rooms.map((r) => (
              <div
                key={r.id}
                className="p-2 border rounded flex justify-between items-start"
              >
                <div>
                  <div className="font-semibold text-base">{r.name}</div>
                  {r.room_id && (
                    <div className="text-xs text-slate-500">
                      รหัสห้อง: {r.room_id}
                    </div>
                  )}
                  {r.room_type ? (
                    <div className="text-xs text-slate-500">
                      ประเภทห้องเรียน: {r.room_type}
                    </div>
                  ) : (
                    <div className="text-xs text-red-500">
                      ⚠ ยังไม่ได้กำหนดประเภทห้อง
                    </div>
                  )}
                  {r.room_tag !== undefined && (
                    <div className="text-xs text-slate-500">
                      Tag ห้องเรียน: {r.room_tag}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    className="px-2 py-1 bg-yellow-500 text-white rounded"
                    onClick={() => handleEdit(r)}
                  >
                    แก้ไข
                  </button>
                  <button
                    className="px-2 py-1 bg-red-500 text-white rounded"
                    onClick={() => handleDelete(r.id)}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}

            {rooms.length === 0 && (
              <div className="text-slate-500 text-sm">
                ยังไม่มีห้องเรียนในระบบ
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
