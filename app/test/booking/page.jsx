import TestBooking from "@/components/booking/TestBooking";
import { getLiveUnits } from "@/lib/getLiveUnits";

export const metadata = {
  title: "Reserve · The Oasis",
  description: "Demo reservation payment for The Oasis residences.",
};

export default async function TestBookingPage() {
  const liveUnits = await getLiveUnits();
  return <TestBooking liveUnits={liveUnits} />;
}
