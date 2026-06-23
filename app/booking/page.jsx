import BookingWithAuth from "@/components/booking/BookingWithAuth";
import { getLiveUnits } from "@/lib/getLiveUnits";

export const metadata = {
  title: "Reserve · The Oasis",
  description: "Demo reservation payment for The Oasis residences.",
};

export default async function BookingPage() {
  const liveUnits = await getLiveUnits();
  return <BookingWithAuth liveUnits={liveUnits} />;
}
