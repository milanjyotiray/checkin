"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TerminalWindowProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "radar" | "error";
}

export function TerminalWindow({ title, children, className, variant = "default" }: TerminalWindowProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border border-slate-800 bg-[#0a0a0a] rounded-sm overflow-hidden flex flex-col",
        variant === "radar" && "border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]",
        variant === "error" && "border-red-500/30",
        className
      )}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            variant === "default" && "bg-slate-700",
            variant === "radar" && "bg-amber-500 animate-pulse",
            variant === "error" && "bg-red-500"
          )} />
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest truncate max-w-[200px]">
            {title}
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
          <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
        </div>
      </div>

      {/* Terminal Body */}
      <div className="p-6 relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent opacity-50" />
        {children}
      </div>
    </motion.div>
  );
}
