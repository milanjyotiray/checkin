"use client";

import React, { useState, useEffect } from "react";
import { RadarBackground } from "@/components/ui/RadarBackground";
import { TerminalWindow } from "@/components/ui/TerminalWindow";
import { CyberButton } from "@/components/ui/CyberButton";
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  ArrowLeft, 
  RefreshCw, 
  Mail, 
  HelpCircle,
  ShieldCheck,
  PlaneTakeoff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Chakra_Petch } from "next/font/google";

const font = Chakra_Petch({ weight: "700", subsets: ["latin"] });

type ScreenState = "form" | "checking" | "success" | "already_checked_in" | "error";

interface Stats {
  checked_in: number;
  total_registered: number;
}

export default function CheckInPage() {
  const [email, setEmail] = useState("");
  const [screenState, setScreenState] = useState<ScreenState>("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [investigatorName, setInvestigatorName] = useState("");
  const [checkInTime, setCheckInTime] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Fetch live attendance count
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/checkin");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats({
            checked_in: data.checked_in,
            total_registered: data.total_registered,
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch check-in stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg("Email address is required.");
      return;
    }

    if (!trimmedEmail.includes("@") || trimmedEmail.length < 5) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setScreenState("checking");

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setInvestigatorName(data.name || "Investigator");
        setCheckInTime(data.timestamp || new Date().toLocaleString());
        
        if (data.status === "ALREADY_CHECKED_IN") {
          setScreenState("already_checked_in");
        } else {
          setScreenState("success");
        }
        fetchStats();
      } else {
        // Fall back to registration not found state (Red error card) for all backend errors
        setScreenState("error");
      }
    } catch (err) {
      console.error("Check-in request failed:", err);
      setErrorMsg("Failed to connect to verification server. Please check your network.");
      setScreenState("form");
    }
  };

  const handleReset = () => {
    setEmail("");
    setErrorMsg("");
    setScreenState("form");
  };

  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden select-none">
      <RadarBackground />

      <div className="w-full max-w-lg z-10 my-8">
        <AnimatePresence mode="wait">
          {/* STATE: ENTRY FORM */}
          {screenState === "form" && (
            <motion.div
              key="form-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <TerminalWindow title="CHECK-IN TERMINAL // ACTIVE_STANDBY" variant="radar" className="w-full border-amber-500/30">
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 rounded-sm bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                      <PlaneTakeoff className="w-6 h-6 animate-pulse" />
                    </div>
                  </div>
                  <h1 className={`${font.className} text-3xl font-black tracking-tight text-white uppercase`}>
                    CRASHLAB CHECK-IN
                  </h1>
                  <p className="text-amber-500 font-mono text-xs tracking-[0.3em] uppercase mt-1">
                    PARADOX&apos;26 | IIT MADRAS
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="email-input" className="block text-slate-400 font-mono text-[10px] tracking-widest uppercase">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-500/50">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="email-input"
                        type="email"
                        required
                        placeholder="investigator@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-black/60 border border-slate-800 rounded-sm py-3 pl-10 pr-4 text-slate-200 placeholder-slate-600 font-mono text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all uppercase"
                      />
                    </div>
                    {errorMsg && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1.5 text-red-500 font-mono text-[10px] uppercase mt-1.5"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errorMsg}</span>
                      </motion.div>
                    )}
                  </div>

                  <CyberButton
                    type="submit"
                    variant="primary"
                    className="w-full py-4 text-amber-500 border-amber-500/40 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 font-bold"
                  >
                    VERIFY REGISTRATION
                  </CyberButton>
                </form>

                {/* Live Stats display inside the form */}
                <div className="mt-8 pt-6 border-t border-slate-900 flex items-center justify-between font-mono text-[10px]">
                  <div className="flex items-center gap-2 text-slate-500 uppercase tracking-widest">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500/50" />
                    <span>Venue Terminal</span>
                  </div>
                  
                  {stats ? (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 uppercase">Live Count:</span>
                      <span className="text-amber-500 font-bold">
                        {stats.checked_in} / {stats.total_registered}
                      </span>
                      <button 
                        onClick={fetchStats} 
                        disabled={loadingStats}
                        className="p-1 hover:text-white transition-colors"
                        title="Refresh counts"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingStats ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-slate-600 uppercase">Fetching stats...</div>
                  )}
                </div>
              </TerminalWindow>
            </motion.div>
          )}

          {/* STATE: CHECKING (LOADING) */}
          {screenState === "checking" && (
            <motion.div
              key="checking-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <TerminalWindow title="DECRYPTING VERIFICATION TOKEN..." variant="radar" className="w-full">
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 border-2 border-amber-500/20 rounded-full" />
                    <div className="absolute inset-0 border-t-2 border-amber-500 rounded-full animate-spin" />
                  </div>
                  <div className="space-y-2">
                    <h2 className={`${font.className} text-xl text-white tracking-widest uppercase`}>
                      Checking Registration...
                    </h2>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] max-w-[280px]">
                      Querying CrashLab secure node registry. Please wait.
                    </p>
                  </div>
                </div>
              </TerminalWindow>
            </motion.div>
          )}

          {/* STATE: SUCCESS SCREEN (GREEN) */}
          {screenState === "success" && (
            <motion.div
              key="success-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <TerminalWindow title="REGISTRATION VERIFIED // ENTRY_GRANTED" className="w-full border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.05)]">
                <div className="text-center space-y-6 py-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className={`${font.className} text-2xl text-green-500 font-black tracking-tight uppercase`}>
                      Registration Verified
                    </h2>
                    <p className="text-slate-300 font-mono text-md font-bold uppercase tracking-wider">
                      Welcome, {investigatorName}
                    </p>
                    <p className="text-slate-400 font-mono text-xs uppercase tracking-wide">
                      Attendance Marked Successfully
                    </p>
                  </div>

                  <div className="bg-green-950/20 border border-green-500/20 p-4 rounded-sm space-y-1.5 font-mono text-left text-xs text-green-400">
                    <div className="flex justify-between">
                      <span className="opacity-60 uppercase">CREDENTIALS:</span>
                      <span className="font-bold uppercase">SECURE_PASS</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60 uppercase">TIMESTAMP:</span>
                      <span>{checkInTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60 uppercase">CLEARANCE:</span>
                      <span className="font-bold">INVESTIGATOR</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-3">
                    <CyberButton
                      onClick={handleReset}
                      variant="radar"
                      className="w-full py-4 bg-green-500/5 border-green-500/40 text-green-500 hover:border-green-500 hover:bg-green-500/10"
                    >
                      DONE & RETURN
                    </CyberButton>
                  </div>
                </div>
              </TerminalWindow>
            </motion.div>
          )}

          {/* STATE: ALREADY CHECKED-IN (BLUE) */}
          {screenState === "already_checked_in" && (
            <motion.div
              key="already-checked-in"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <TerminalWindow title="RECORD FOUND // REGISTRATION_ACTIVE" className="w-full border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.05)]">
                <div className="text-center space-y-6 py-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                      <Info className="w-8 h-8" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className={`${font.className} text-2xl text-blue-400 font-black tracking-tight uppercase`}>
                      Attendance Already Recorded
                    </h2>
                    <p className="text-slate-300 font-mono text-md font-bold uppercase tracking-wider">
                      Welcome Back, {investigatorName}
                    </p>
                    <p className="text-slate-400 font-mono text-xs uppercase tracking-wide">
                      Your attendance has already been logged.
                    </p>
                  </div>

                  <div className="bg-blue-950/20 border border-blue-500/20 p-4 rounded-sm space-y-1.5 font-mono text-left text-xs text-blue-400">
                    <div className="flex justify-between">
                      <span className="opacity-60 uppercase">CREDENTIALS:</span>
                      <span className="font-bold uppercase">DUPLICATE_BLOCK</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60 uppercase">STATUS:</span>
                      <span className="font-bold">PRESENT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60 uppercase">RECORD_TIME:</span>
                      <span>{checkInTime}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-3">
                    <CyberButton
                      onClick={handleReset}
                      className="w-full py-4 bg-blue-500/5 border-blue-500/40 text-blue-400 hover:border-blue-500 hover:bg-blue-500/10"
                    >
                      RETURN TO HOME
                    </CyberButton>
                  </div>
                </div>
              </TerminalWindow>
            </motion.div>
          )}

          {/* STATE: FAILURE SCREEN (RED) */}
          {screenState === "error" && (
            <motion.div
              key="error-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <TerminalWindow title="REGISTRATION FAILURE // ACCESS_DENIED" variant="error" className="w-full">
                <div className="text-center space-y-6 py-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                      <AlertCircle className="w-8 h-8 font-black" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className={`${font.className} text-2xl text-red-500 font-black tracking-tight`}>
                      You are not REGISTERED
                    </h2>
                    <p className="text-slate-400 font-mono text-xs uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                      Please contact the Help Desk.
                    </p>
                  </div>

                  <div className="bg-red-950/20 border border-red-500/20 p-4 rounded-sm font-mono text-[11px] text-red-400/90 text-left space-y-2">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>The email address you entered is not registered in our investigator database. Please verify your ticket details.</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-3">
                    <CyberButton
                      onClick={handleReset}
                      variant="warning"
                      className="w-full py-4"
                      icon={<ArrowLeft className="w-4 h-4" />}
                    >
                      TRY REGISTERED EMAIL AGAIN
                    </CyberButton>
                  </div>
                </div>
              </TerminalWindow>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
