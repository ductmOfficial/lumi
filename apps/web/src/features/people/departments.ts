import type { MessageKey } from "@lumi/i18n";
import type { TFunction } from "@/i18n/useT";

const DEPT: Record<string, MessageKey> = {
  Acting: "dept.acting",
  Directing: "dept.directing",
  Writing: "dept.writing",
  Production: "dept.production",
  Sound: "dept.sound",
  Camera: "dept.camera",
  Editing: "dept.editing",
  Art: "dept.art",
  "Costume & Make-Up": "dept.costume",
  "Visual Effects": "dept.vfx",
  Crew: "dept.crew",
  Lighting: "dept.lighting",
};

export const departmentLabel = (dept: string, t: TFunction) => (DEPT[dept] ? t(DEPT[dept]) : dept);
