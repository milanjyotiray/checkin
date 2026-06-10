"use client";

import React from "react";
import { motion } from "framer-motion";

export function RadarBackground() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#050505]">
      {/* Dynamic Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: `linear-gradient(#eab308 1px, transparent 1px), linear-gradient(90deg, #eab308 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} 
      />

      {/* Radar Pulse */}
      <motion.div
        initial={{ scale: 0, opacity: 0.5 }}
        animate={{ scale: 4, opacity: 0 }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-amber-500/30 rounded-full"
      />
      <motion.div
        initial={{ scale: 0, opacity: 0.3 }}
        animate={{ scale: 4, opacity: 0 }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeOut", delay: 2 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-amber-500/20 rounded-full"
      />

      {/* Scanning Line */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2000px] h-[2000px] origin-center"
      >
        <div className="w-1/2 h-full bg-gradient-to-r from-amber-500/10 to-transparent" style={{ clipPath: 'polygon(100% 50%, 100% 0, 0 0)' }} />
      </motion.div>

      {/* Floating Telemetry Labels */}
      <div className="absolute top-10 left-10 text-[10px] font-mono text-amber-500/40 space-y-1 hidden md:block">
        <p>LAT: 28.6139° N</p>
        <p>LNG: 77.2090° E</p>
        <p>ALT: 32,000 FT</p>
        <p>HDG: 271°</p>
      </div>

      <div className="absolute bottom-10 right-10 text-[10px] font-mono text-amber-500/40 space-y-1 text-right hidden md:block">
        <p>SIGNAL: STABLE</p>
        <p>DOPPLER: ACTIVE</p>
        <p>ASTRA_LINK: VERIFIED</p>
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_90%)]" />
    </div>
  );
}
