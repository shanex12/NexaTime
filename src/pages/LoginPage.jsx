import React, { useState, useEffect } from "react";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // ทำให้ body โปร่งใสเฉพาะหน้า Login
  useEffect(() => {
    document.body.classList.add("no-bg");
    return () => document.body.classList.remove("no-bg");
  }, []);

  function handleSubmit() {
    if (!username || !password) return alert("กรุณากรอกข้อมูลให้ครบ");
    if (username === "admin" && password === "1234") {
      onLogin("admin");
    } else {
      onLogin("student");
    }
  }

  return (
    <div
      className="w-screen h-screen flex items-center justify-center font-sans"
      style={{
        backgroundImage:
          `linear-gradient(135deg, rgba(10,108,255,0.75), rgba(174,120,249,0.75)), url('/image/5816231.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        position: "absolute",
        inset: 0,
        margin: 0,
        padding: 0,
      }}
    >
      <div className="pt-4 pb-8 px-8 flex flex-col items-center">

        {/* LOGO */}
        <img
          src="/image/Nexatimelogo.png"
          alt="logo"
          className="w-72 mb-1 mt-0 drop-shadow-md"
        />

        {/* Title */}
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold text-white tracking-wide drop-shadow">
            NexaTime
          </div>
          <div className="text-sm text-blue-100 mt-1 drop-shadow">
            ระบบจัดตารางเรียนอัตโนมัติ
          </div>
        </div>

        {/* Username */}
        <div className="w-full flex items-center rounded-lg mb-4 px-3 py-2 bg-white/90 shadow-sm">
          <img src="/image/user.png" className="w-5 opacity-60 mr-2" />
          <input
            type="text"
            placeholder="username"
            className="flex-1 outline-none text-gray-700 bg-transparent"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        {/* Password */}
        <div className="w-full flex items-center rounded-lg mb-6 px-3 py-2 bg-white/90 shadow-sm">
          <img src="/image/padlock.png" className="w-5 opacity-60 mr-2" />
          <input
            type="password"
            placeholder="password"
            className="flex-1 outline-none text-gray-700 bg-transparent"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Login Button */}
        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold shadow-md transition-all"
        >
          LOG IN
        </button>

      </div>
    </div>
  );
}
