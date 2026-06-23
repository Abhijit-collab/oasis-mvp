import HomeExplorer from "@/components/HomeExplorer";
import { getLiveUnits } from "@/lib/getLiveUnits";

export default async function Home() {
  const liveUnits = await getLiveUnits();
  return <HomeExplorer liveUnits={liveUnits} />;
}
