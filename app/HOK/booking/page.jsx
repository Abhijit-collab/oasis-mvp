import { HOKBooking } from "@/components/hok";
import { getLiveUnits } from "@/lib/getLiveUnits";

export const metadata = {
  title: "Reserve · House of Krishna",
  description: "Reservation payment for House of Krishna residences.",
};

export default async function HOKBookingPage() {
  const liveUnits = await getLiveUnits();
  return <HOKBooking liveUnits={liveUnits} />;
}
