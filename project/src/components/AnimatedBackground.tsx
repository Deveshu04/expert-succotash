import React from "react";
import { Boxes } from "./ui/background-boxes";

const AnimatedBackground: React.FC = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-900">
    <Boxes />
    <div className="absolute inset-0 w-full h-full bg-slate-900 z-20 [mask-image:radial-gradient(transparent,white)]" />
  </div>
);

export default AnimatedBackground; 