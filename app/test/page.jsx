import TestExplorer from "@/components/TestExplorer";
import { getLiveUnits } from "@/lib/getLiveUnits";

export const metadata = {
  title: "The Oasis · Premium Experience",
  description: "Private 360 walkthrough for premium members.",
};

export default async function TestPage() {
  const liveUnits = await getLiveUnits();
  return <TestExplorer liveUnits={liveUnits} />;
}
