import HomeExplorer from "@/components/HomeExplorer";

// Live unit status/price comes from DynamoDB via a Lambda Function URL.
// Set UNITS_API_URL in your environment (Vercel project env var). If it's
// unset or the fetch fails, the explorer falls back to the static data in
// data/building.js, so the site never breaks.
async function getLiveUnits() {
  const url = process.env.UNITS_API_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const liveUnits = await getLiveUnits();
  return <HomeExplorer liveUnits={liveUnits} />;
}
