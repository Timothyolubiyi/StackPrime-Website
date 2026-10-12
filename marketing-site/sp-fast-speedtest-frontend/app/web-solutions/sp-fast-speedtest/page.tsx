import type { Metadata } from "next";
import SpeedTestClient from "./SpeedTestClient";

export const metadata: Metadata = {
  title: "SP Fast Speed Test | StackPrime Consulting",
  description:
    "Measure your internet download speed, upload speed and latency with SP Fast Speed Test by StackPrime Consulting.",
};

export default function SPFastSpeedTestPage() {
  return <SpeedTestClient />;
}
