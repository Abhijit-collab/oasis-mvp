import { HOKExplorer } from "@/components/hok";
import { getLiveUnits } from "@/lib/getLiveUnits";

export const metadata = {
  title: "House of Krishna · Premium Experience",
  description: "Private 360 walkthrough for House of Krishna.",
};

export default async function HOKPage() {
  const liveUnits = await getLiveUnits();
  return <HOKExplorer liveUnits={liveUnits} />;
}
