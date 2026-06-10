"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CyberButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "warning" | "radar" | "ghost";
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const CyberButton = React.forwardRef<HTMLButtonElement, CyberButtonProps>(
  ({ className, variant = "primary", children, icon, ...props }, ref) => {
    const baseStyles =
      "relative inline-flex items-center justify-center px-6 py-3 font-mono text-sm font-bold tracking-wider uppercase transition-all duration-300 overflow-hidden group";

    const variants = {
      primary:
        "bg-slate-800/80 text-white border border-slate-600 hover:border-slate-400 hover:bg-slate-700/80 shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]",
      warning:
        "bg-red-950/40 text-red-500 border border-red-500/50 hover:bg-red-900/60 hover:text-red-400 hover:border-red-400 shadow-[0_0_15px_rgba(255,51,51,0.2)] hover:shadow-[0_0_20px_rgba(255,51,51,0.4)]",
      radar:
        "bg-green-950/40 text-green-500 border border-green-500/50 hover:bg-green-900/60 hover:text-green-400 hover:border-green-400 shadow-[0_0_15px_rgba(0,255,65,0.2)] hover:shadow-[0_0_20px_rgba(0,255,65,0.4)]",
      ghost:
        "bg-transparent text-slate-400 hover:text-white border border-transparent hover:border-slate-700",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        <span className="absolute inset-0 w-full h-full -ml-10 bg-white/10 skew-x-[45deg] transition-all duration-700 ease-out translate-x-[-150%] group-hover:translate-x-[250%]" />
        
        {/* Corner Accents */}
        <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-current opacity-50" />
        <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-current opacity-50" />
        
        <span className="relative z-10 flex items-center gap-2">
          {icon && <span className="opacity-80">{icon}</span>}
          {children}
        </span>
      </motion.button>
    );
  }
);

CyberButton.displayName = "CyberButton";
